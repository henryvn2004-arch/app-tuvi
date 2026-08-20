// lib/agent/providers/kimi.ts
// ============================================================
// PROVIDER KIMI K3 (Moonshot AI) — PRIMARY của rail chat (chốt Henry
// 2026-08-20: "Kimi K3 primary, back up 1 là opus 5, back up 2 là gemini
// flash"). Endpoint OpenAI-compatible (Chat Completions), model hỗ trợ
// CẢ vision lẫn function-calling native — không cần scenario-eligibility
// gate như Gemini (đường đó bị giới hạn vì Gemini KHÔNG được cấp cho
// laso/vision qua config cũ). Kimi thử TRƯỚC MỌI kịch bản; lỗi ở
// request-time (chưa gửi byte nào) → run.ts tự rơi xuống chuỗi cũ
// (Anthropic/Opus 5 rồi Gemini) — GIỮ NGUYÊN, không đụng.
// ============================================================

import { sse } from '@/lib/contract/v1';
import type { ChatConfig } from '@/lib/config/appConfig';

const KIMI_KEY = process.env.KIMIK3_API_KEY || '';
const KIMI_MODEL = process.env.KIMI_MODEL || 'kimi-k3';
const KIMI_URL = 'https://api.moonshot.ai/v1/chat/completions';

export function kimiConfigured(): boolean {
  return !!KIMI_KEY;
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_TRIES = 3;

// Convo Anthropic ({role, content: string | blocks[{type:'text'|'image',...}]})
// → messages OpenAI/Kimi ({role, content: string | [{type:'text'|'image_url',...}]}).
// System đi kèm làm message ĐẦU (Kimi/OpenAI không có field system riêng như
// Anthropic/Gemini).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toKimiMessages(system: string, convo: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [{ role: 'system', content: system }];
  for (const m of convo) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    if (typeof m.content === 'string') {
      if (m.content) out.push({ role, content: m.content });
      continue;
    }
    if (!Array.isArray(m.content)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];
    for (const b of m.content) {
      if (b?.type === 'text' && b.text) {
        parts.push({ type: 'text', text: b.text });
      } else if (b?.type === 'image' && b.source?.type === 'base64' && b.source.data) {
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${b.source.media_type || 'image/jpeg'};base64,${b.source.data}` },
        });
      }
    }
    if (parts.length) out.push({ role, content: parts });
  }
  return out;
}

/**
 * Gọi Kimi K3, stream text về client theo ĐÚNG hợp đồng SSE (sse.text delta)
 * và tách dòng "SUGGEST: ..." y hệt các provider khác → chip gợi ý khớp.
 *
 * Ném lỗi CHỈ ở request-time (trước khi gửi byte nào) → run.ts fallback sạch
 * xuống Anthropic. Lỗi giữa stream (hiếm) → dừng êm, không ném.
 *
 * @returns mảng suggestions (tối đa 4) để caller làm chip động.
 */
export async function streamKimi(
  system: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convo: any[],
  cfg: ChatConfig,
  send: (s: string) => void,
): Promise<string[]> {
  const messages = toKimiMessages(system, convo);
  if (messages.length <= 1) throw new Error('kimi: convo rỗng');

  const body = {
    model: KIMI_MODEL,
    messages,
    max_tokens: cfg.maxTokens,
    // 🔴 ĐÃ VÁ 2026-08-20 — Kimi K3 (Moonshot) CHỈ nhận temperature=1, mọi giá
    // trị khác (kể cả 0.7 vốn ở đây) bị từ chối NGAY ở request-time với
    // `400 invalid_request_error: "invalid temperature: only 1 is allowed for
    // this model"`. Đây là lý do THẬT khiến Kimi 100% lỗi từ lúc #577 deploy —
    // Moonshot dashboard 0đ không phải vì key/route sai, mà vì MỌI lượt gọi bị
    // chặn ở tầng tham số trước khi kịp tính phí. Xem `lib/llm/complete.ts`
    // (đường standalone) — cùng bệnh, cùng giờ vá.
    temperature: 1,
    stream: true,
    stream_options: { include_usage: true },
  };

  const resp = await kimiFetch(body);

  const MARKER = 'SUGGEST:';
  const GUARD = 24;
  let full = '';
  let sentLen = 0;
  let markerAt = -1;
  const flushSafe = () => {
    if (markerAt >= 0) return;
    const safe = full.length - GUARD;
    if (safe > sentLen) {
      send(sse.text({ delta: full.slice(sentLen, safe) }));
      sentLen = safe;
    }
  };
  const onText = (t: string) => {
    full += t;
    if (markerAt < 0) {
      const i = full.indexOf(MARKER);
      if (i >= 0) {
        markerAt = i;
        let cut = i;
        while (cut > sentLen && /\s/.test(full[cut - 1])) cut--;
        if (cut > sentLen) {
          send(sse.text({ delta: full.slice(sentLen, cut) }));
          sentLen = cut;
        }
      } else {
        flushSafe();
      }
    }
  };

  await pumpKimiSSE(resp, (evt) => {
    const delta = evt?.choices?.[0]?.delta;
    if (typeof delta?.content === 'string' && delta.content) onText(delta.content);
  });

  if (markerAt < 0 && full.length > sentLen) {
    send(sse.text({ delta: full.slice(sentLen) }));
    sentLen = full.length;
  }
  if (sentLen === 0 && full.trim()) {
    send(sse.text({ delta: full }));
    return [];
  }
  if (markerAt < 0) return [];
  return full
    .slice(markerAt + MARKER.length)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

// ============================================================
// FUNCTION-CALLING — Kimi K3 hỗ trợ native (tools/tool_choice kiểu OpenAI),
// dùng cho CẢ luồng lá số ('laso', vốn chỉ Anthropic/Gemini-nếu-flip mới
// chạy được trước đây) lẫn mọi kịch bản có tool khác.
// ============================================================

// Tool Anthropic ([{name,description,input_schema}]) → OpenAI function tools.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toKimiTools(anthropicTools: any[]): any[] {
  if (!anthropicTools?.length) return [];
  return anthropicTools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema || { type: 'object', properties: {} } },
  }));
}

/**
 * Một lượt STREAM Kimi có function-calling. Stream text về client (tách
 * SUGGEST y hệt) + gom tool_calls nếu model gọi tool (deltas OpenAI gộp dần
 * theo `index`, `arguments` là chuỗi JSON build tăng dần). Trả:
 *  - toolCalls: [{id,name,args}] để run.ts chạy tool
 *  - assistantMessage: message OpenAI để push làm lượt 'assistant' (giữ ngữ
 *    cảnh cho vòng sau — PHẢI mang nguyên `tool_calls` thô, không phải args
 *    đã parse, vì lượt sau Kimi cần lại đúng format đó)
 *  - suggestions, sentText (đã stream chữ nào chưa — để quyết fallback)
 * Ném lỗi CHỈ ở request-time (chưa stream gì) → run.ts fallback sạch.
 */
export async function streamKimiTurn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kimiTools: any[] | null,
  cfg: ChatConfig,
  send: (s: string) => void,
): Promise<{
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assistantMessage: any;
  suggestions: string[];
  sentText: boolean;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    model: KIMI_MODEL,
    messages,
    max_tokens: cfg.maxTokens,
    // Xem chú thích ở streamKimi() phía trên — Kimi K3 chỉ nhận temperature=1.
    temperature: 1,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (kimiTools && kimiTools.length) body.tools = kimiTools;

  const resp = await kimiFetch(body);

  const MARKER = 'SUGGEST:';
  const GUARD = 24;
  let full = '';
  let sentLen = 0;
  let markerAt = -1;
  let sentText = false;
  const flushSafe = () => {
    if (markerAt >= 0) return;
    const safe = full.length - GUARD;
    if (safe > sentLen) {
      send(sse.text({ delta: full.slice(sentLen, safe) }));
      sentLen = safe;
      sentText = true;
    }
  };
  const onText = (t: string) => {
    full += t;
    if (markerAt < 0) {
      const i = full.indexOf(MARKER);
      if (i >= 0) {
        markerAt = i;
        let cut = i;
        while (cut > sentLen && /\s/.test(full[cut - 1])) cut--;
        if (cut > sentLen) {
          send(sse.text({ delta: full.slice(sentLen, cut) }));
          sentLen = cut;
          sentText = true;
        }
      } else {
        flushSafe();
      }
    }
  };

  // Tool call deltas gộp theo index (OpenAI streams arguments THEO MẢNH).
  const callsByIdx = new Map<number, { id: string; name: string; args: string }>();

  await pumpKimiSSE(resp, (evt) => {
    const delta = evt?.choices?.[0]?.delta;
    if (typeof delta?.content === 'string' && delta.content) onText(delta.content);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tcs = delta?.tool_calls as any[] | undefined;
    if (Array.isArray(tcs)) {
      for (const tc of tcs) {
        const idx = typeof tc.index === 'number' ? tc.index : 0;
        const cur = callsByIdx.get(idx) || { id: '', name: '', args: '' };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name += tc.function.name;
        if (typeof tc.function?.arguments === 'string') cur.args += tc.function.arguments;
        callsByIdx.set(idx, cur);
      }
    }
  });

  if (markerAt < 0 && full.length > sentLen) {
    send(sse.text({ delta: full.slice(sentLen) }));
    sentLen = full.length;
    sentText = true;
  }
  let suppress = false;
  if (sentLen === 0 && full.trim() && !callsByIdx.size) {
    send(sse.text({ delta: full }));
    sentText = true;
    suppress = true;
  }

  const toolCalls: { id: string; name: string; args: Record<string, unknown> }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawToolCalls: any[] = [];
  let ti = 0;
  for (const [, tc] of [...callsByIdx.entries()].sort((a, b) => a[0] - b[0])) {
    if (!tc.name) continue;
    let args: Record<string, unknown> = {};
    try {
      args = tc.args ? JSON.parse(tc.args) : {};
    } catch {
      args = {};
    }
    const id = tc.id || `kimi_${ti++}`;
    toolCalls.push({ id, name: tc.name, args });
    rawToolCalls.push({ id, type: 'function', function: { name: tc.name, arguments: tc.args || '{}' } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assistantMessage: any = { role: 'assistant', content: full.trim() || null };
  if (rawToolCalls.length) assistantMessage.tool_calls = rawToolCalls;

  const suggestions =
    suppress || markerAt < 0
      ? []
      : full
          .slice(markerAt + MARKER.length)
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4);

  return { toolCalls, assistantMessage, suggestions, sentText };
}

/** Message {role:'tool', tool_call_id, content} — kết quả 1 lượt thực thi tool,
 *  format OpenAI/Kimi (KHÁC Anthropic — không lồng trong content của user). */
export function kimiToolResultMessage(toolCallId: string, content: string) {
  return { role: 'tool', tool_call_id: toolCallId, content };
}

// ── Nội bộ: gọi + retry lỗi tạm thời, rồi bơm SSE ──────────────
async function kimiFetch(body: unknown): Promise<Response> {
  if (!KIMI_KEY) throw new Error('kimi: thiếu KIMIK3_API_KEY');
  let resp: Response | null = null;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
    try {
      resp = await fetch(KIMI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt === MAX_TRIES - 1) throw new Error('kimi fetch: ' + (e as Error).message);
      continue;
    }
    if (resp.ok) break;
    if (!RETRYABLE.has(resp.status) || attempt === MAX_TRIES - 1) {
      const t = (await resp.text()).slice(0, 300);
      throw new Error(`kimi non-200: ${resp.status} — ${t}`);
    }
    console.error(`[kimi] ${resp.status} (lần ${attempt + 1}/${MAX_TRIES}) — thử lại`);
  }
  if (!resp || !resp.ok || !resp.body) throw new Error('kimi: không có response body');
  return resp;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pumpKimiSSE(resp: Response, onEvent: (evt: any) => void): Promise<void> {
  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        if (!json || json === '[DONE]') continue;
        try {
          onEvent(JSON.parse(json));
        } catch {
          /* mảnh JSON dở — bỏ qua */
        }
      }
    }
  } catch (e) {
    // Lỗi GIỮA stream: đã có thể gửi text rồi → KHÔNG ném (tránh trùng khi
    // caller fallback). Dừng êm, caller xả nốt phần đã tích lũy.
    console.error('[kimi] lỗi giữa stream:', (e as Error).message);
  }
}
