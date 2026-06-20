// app/api/v1/chat/route.ts
// ============================================================
// CỔNG AGENT DUY NHẤT — Contract v1 (xem lib/contract/v1.ts)
//
// Phase 0 / Sprint 0.2: AGENT LOOP THẬT.
//   - Validate request theo contract.
//   - Agent tool-use (lap_la_so / tinh_van_han / xem_ngay_tot /
//     tra_cuu_tri_thuc) chạy in-process, engine SERVER-SIDE.
//   - Stream SSE 5-event: status → tool_call → text → done | error.
//   - Vòng cuối stream text trực tiếp từ Anthropic.
//
// Tách biệt /api/lasotuvi đang chạy. Lật ruột client sang đây ở Phase 1.
// ============================================================

import { NextRequest } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import {
  CONTRACT_VERSION,
  sse,
  validateChatRequest,
  type ChatRequestV1,
  type ChatMessage,
} from '@/lib/contract/v1';
import { buildToolDefs, executeTool, newToolContext } from '@/lib/tools/registry';
import { computeLaso, formatLasoContext } from '@/lib/engine/laso';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = 'claude-sonnet-4-6';
const MAX_ROUNDS = 4;
const MAX_TOKENS = 1500;

const SSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
  'X-Contract-Version': CONTRACT_VERSION,
};

const SYSTEM_PROMPT = `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc, nhân hậu. Phụng sự trang Tử Vi Minh Bảo.

NGUYÊN TẮC BẤT DI BẤT DỊCH:
- TUYỆT ĐỐI không bịa số liệu, vị trí sao, điểm số. Mọi con số/sao/cách cục phải đến từ kết quả công cụ (tool). Nếu chưa có dữ liệu, hãy gọi công cụ hoặc hỏi người dùng.
- Để lập lá số cần đủ: ngày/tháng/năm sinh DƯƠNG lịch, giờ sinh (theo địa chi), giới tính. Nếu thiếu, hỏi lại NGẮN GỌN, không đoán bừa.
- Khi đã có lá số, luận giải CHỈ dựa trên dữ liệu lá số trong hội thoại.
- Câu hỏi gắn với một năm cụ thể → dùng công cụ tra vận hạn. Hỏi ngày tốt → dùng công cụ xem ngày tốt.
- Trả lời bằng tiếng Việt, mạch lạc, có chiều sâu nhưng không lan man. Có thể dùng markdown nhẹ.`;

export async function OPTIONS() {
  return options();
}

export async function GET() {
  return new Response(
    JSON.stringify({
      service: 'tuvi-chat-agent',
      contract: CONTRACT_VERSION,
      status: 'live',
      tools: buildToolDefs().map((t) => t.name),
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('bad_request', 'Body không phải JSON hợp lệ', 400);
  }

  const parsed = validateChatRequest(body);
  if (!parsed.ok) return jsonError('bad_request', parsed.error, 400);
  if (!ANTHROPIC_API_KEY) return jsonError('internal', 'Thiếu cấu hình ANTHROPIC_API_KEY', 500);

  const req: ChatRequestV1 = parsed.value;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      try {
        await runAgent(req, send);
      } catch (e) {
        send(sse.error({ code: 'internal', message: e instanceof Error ? e.message : 'Lỗi không xác định' }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}

// ── Agent loop ──────────────────────────────────────────────
async function runAgent(req: ChatRequestV1, send: (s: string) => void): Promise<void> {
  const tools = buildToolDefs();
  const ctx = newToolContext();
  const toolsUsed: string[] = [];

  // Seed lá số nếu client gửi sẵn birth hợp lệ (đỡ phải hỏi lại).
  let system: string = SYSTEM_PROMPT;
  if (req.birth) {
    const res = computeLaso(req.birth);
    if (res.ok && res.ls) {
      ctx.ls = res.ls;
      system += '\n\n=== LÁ SỐ ĐÃ LẬP (luận trên dữ liệu này) ===\n' + formatLasoContext(res.ls);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = (req.messages as ChatMessage[]).slice(-10).map((m) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  send(sse.status({ text: 'Đang suy xét...' }));

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const lastRound = round === MAX_ROUNDS;

    // Vòng cuối: ép trả lời, stream text trực tiếp.
    if (lastRound) {
      await streamFinal(system, convo, tools, send);
      break;
    }

    const data = await callAnthropic(system, convo, tools, false);
    const content = data.content || [];

    if (data.stop_reason === 'tool_use') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolUses = content.filter((b: any) => b.type === 'tool_use');
      convo.push({ role: 'assistant', content });

      const results = [];
      for (const tu of toolUses) {
        toolsUsed.push(tu.name);
        const run = await executeTool(tu.name, tu.input || {}, ctx);
        send(sse.toolCall({ name: tu.name, args: safeArgs(tu.input) }));
        send(sse.status({ text: run.label }));
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: run.content });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }

    // Model trả lời thẳng (không tool) — stream lại cho mượt thay vì
    // dồn một cục: gọi vòng stream cuối với chính ngữ cảnh hiện tại.
    await streamFinal(system, convo, tools, send);
    break;
  }

  send(sse.done({ tools_used: toolsUsed, paywall: { blocked: false } }));
}

// ── Gọi Anthropic (non-stream, để quyết định tool) ──────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callAnthropic(system: string, convo: any[], tools: any[], toolChoiceNone: boolean): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: convo,
  };
  if (tools.length) {
    payload.tools = tools;
    if (toolChoiceNone) payload.tool_choice = { type: 'none' };
  }
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('Anthropic error: ' + (await resp.text()).slice(0, 200));
  return resp.json();
}

// ── Vòng cuối: stream text về client ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamFinal(system: string, convo: any[], tools: any[], send: (s: string) => void): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: convo,
  };
  if (tools.length) {
    payload.tools = tools;
    payload.tool_choice = { type: 'none' };
  }
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    send(sse.error({ code: 'internal', message: 'Anthropic error: ' + (await resp.text()).slice(0, 200) }));
    return;
  }
  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') continue;
      try {
        const evt = JSON.parse(json);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          send(sse.text({ delta: evt.delta.text }));
        }
      } catch {
        /* ignore partial */
      }
    }
  }
}

// ── helpers ──────────────────────────────────────────────────
function jsonError(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Chỉ giữ vài field an toàn để hiển thị nhãn tool_call cho client.
function safeArgs(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const o = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of ['nam', 'thang', 'ngay', 'viec', 'gender', 'year']) {
    if (o[k] != null) out[k] = o[k];
  }
  return out;
}
