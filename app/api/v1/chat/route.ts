// app/api/v1/chat/route.ts
// ============================================================
// CỔNG AGENT DUY NHẤT — Contract v1 (xem lib/contract/v1.ts)
//
// Phase 0 / Sprint 0.3: CONFIG RUNTIME + PAYWALL hợp nhất.
//   - Prompt / model / max_rounds / max_tokens / giá Lượng đọc từ
//     bảng app_config (lib/config/appConfig.ts) — sửa ở DB, không deploy.
//   - Paywall/Lượng gộp về đây (lib/billing/credits.ts): pre-check
//     auth + số dư TRƯỚC khi stream; trừ Lượng SAU khi trả lời xong.
//   - Agent tool-use chạy in-process, engine SERVER-SIDE.
//   - Stream SSE 5-event: status → tool_call → text → done | error.
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
  type DoneEvent,
} from '@/lib/contract/v1';
import { buildToolDefs, executeTool, newToolContext } from '@/lib/tools/registry';
import { computeLaso, formatLasoContext } from '@/lib/engine/laso';
// Template prompt dùng CHUNG với /api/lasotuvi (một bộ não).
import { CHAT_SYSTEM_LASO, CHAT_SYSTEM_GENERAL } from '@/lib/agent/prompts';
import { TOOLS_INSTRUCTION } from '@/lib/agent/tools';
import { getChatConfig, type ChatConfig } from '@/lib/config/appConfig';
import {
  paywallDisabled,
  extractToken,
  getUserFromToken,
  getBalance,
  deductCredits,
  logTransaction,
} from '@/lib/billing/credits';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

const SSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
  'X-Contract-Version': CONTRACT_VERSION,
};

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
  const cfg = await getChatConfig();

  // ── Paywall pre-check (trước khi mở stream) ───────────────────
  // Chỉ tính phí khi paywall bật VÀ giá cấu hình > 0. Trừ Lượng SAU
  // khi trả lời xong (giữ userId ở đây để dùng lại trong stream).
  let chargeUserId: string | null = null;
  const cost = cfg.cost;
  if (!paywallDisabled() && cost > 0) {
    const token = extractToken(request);
    if (!token) return jsonError('unauthorized', 'Cần đăng nhập để dùng tính năng này', 401);
    const user = await getUserFromToken(token);
    if (!user) return jsonError('unauthorized', 'Phiên đăng nhập không hợp lệ', 401);
    const balance = await getBalance(user.id);
    if (balance < cost) {
      return jsonError('paywall', `Không đủ Lượng (cần ${cost}, còn ${balance})`, 402, { balance });
    }
    chargeUserId = user.id;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      try {
        const { toolsUsed } = await runAgent(req, cfg, send);

        // ── Trừ Lượng sau khi trả lời thành công ──────────────────
        let paywall: DoneEvent['paywall'] = { blocked: false };
        if (chargeUserId && cost > 0) {
          const newBal = await deductCredits(chargeUserId, cost);
          if (newBal != null) {
            await logTransaction({
              userId: chargeUserId,
              amount: -cost,
              type: 'chat',
              description: 'Lượt luận giải /api/v1/chat',
            });
            paywall = { blocked: false, balance: newBal };
          }
        }
        send(sse.done({ tools_used: toolsUsed, paywall }));
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
async function runAgent(
  req: ChatRequestV1,
  cfg: ChatConfig,
  send: (s: string) => void,
): Promise<{ toolsUsed: string[] }> {
  const tools = buildToolDefs();
  const ctx = newToolContext();
  const toolsUsed: string[] = [];

  // Seed lá số nếu client gửi sẵn birth hợp lệ (đỡ phải hỏi lại).
  let lasoCtx = '';
  if (req.birth) {
    const res = computeLaso(req.birth);
    if (res.ok && res.ls) {
      ctx.ls = res.ls;
      lasoCtx = formatLasoContext(res.ls);
    }
  }
  const hasLaso = !!ctx.ls;

  // Prompt: ưu tiên OVERRIDE từ app_config (DB); mặc định dùng TEMPLATE
  // chung lib/agent/prompts (một nguồn với /api/lasotuvi — sửa văn phong
  // 1 chỗ). Template tự inject thời gian thực + luật chống tâng bốc.
  let system: string;
  if (cfg.systemPrompt) {
    system = cfg.systemPrompt + '\n\n' + timeContext();
    if (lasoCtx) system += '\n\n=== LÁ SỐ ĐÃ LẬP (luận trên dữ liệu này) ===\n' + lasoCtx;
  } else {
    system = hasLaso ? CHAT_SYSTEM_LASO(lasoCtx) : CHAT_SYSTEM_GENERAL();
  }
  system += TOOLS_INSTRUCTION(hasLaso);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = (req.messages as ChatMessage[]).slice(-10).map((m) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  send(sse.status({ text: 'Đang suy xét...' }));

  for (let round = 0; round <= cfg.maxRounds; round++) {
    const lastRound = round === cfg.maxRounds;

    // Vòng cuối: ép trả lời, stream text trực tiếp.
    if (lastRound) {
      await streamFinal(system, convo, tools, cfg, send);
      break;
    }

    const data = await callAnthropic(system, convo, tools, cfg, false);
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
    await streamFinal(system, convo, tools, cfg, send);
    break;
  }

  return { toolsUsed };
}

// ── Gọi Anthropic (non-stream, để quyết định tool) ──────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callAnthropic(system: string, convo: any[], tools: any[], cfg: ChatConfig, toolChoiceNone: boolean): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
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
async function streamFinal(system: string, convo: any[], tools: any[], cfg: ChatConfig, send: (s: string) => void): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
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

// ── Thời gian thực (múi giờ VN) tiêm vào prompt ──────────────
// Không để trong app_config: prompt DB là text tĩnh, còn ngày phải
// tính mỗi request. LLM dùng đây để hiểu "năm nay / hôm nay".
function timeContext(): string {
  const now = new Date();
  const TZ = 'Asia/Ho_Chi_Minh';
  const dateStr = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(now);
  const year = new Intl.DateTimeFormat('en', { timeZone: TZ, year: 'numeric' }).format(now);
  return (
    `THÔNG TIN THỜI GIAN (server cung cấp, CHÍNH XÁC): Hôm nay là ngày ${dateStr}, năm hiện tại là ${year}. ` +
    `Khi user hỏi "năm nay/hôm nay là năm/ngày mấy" — trả lời thẳng theo đây, KHÔNG nói không biết. ` +
    `Khi user nói "năm nay" hãy hiểu là năm ${year}, "năm sau" là ${Number(year) + 1}; ` +
    `gọi công cụ tra vận hạn với đúng năm đó, không dùng năm mặc định khác.`
  );
}

// ── helpers ──────────────────────────────────────────────────
function jsonError(code: string, message: string, status: number, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ code, message, ...extra }), {
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
