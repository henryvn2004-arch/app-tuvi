// lib/llm/complete.ts
// ============================================================
// Helper LLM DÙNG CHUNG cho các route STANDALONE (không qua runAgent):
// cron, tuong-mat, phong-thuy, tubinh, xem-tuoi, lasotuvi, van-han-nam...
//
// Provider ĐỨNG ĐẦU đọc từ app_config 'chat.standalone_provider' (mặc định
// 'kimi' — DEFAULTS.standaloneProvider trong appConfig.ts, chỉ dùng khi DB
// không đọc được); provider đứng đầu lỗi → tự rơi xuống 2 provider còn lại
// theo CANONICAL_ORDER. Đổi khoá đó qua DB để ép một provider cụ thể lên đầu
// (không cần deploy).
// 🔴 LIVE 2026-08-20 tối (chốt Henry, "trước mắt"): DB đang set 'gemini' —
// Gemini Flash PRIMARY → Kimi K3 secondary-1 → Opus 5 secondary-2. Đảo lại
// đúng buổi sáng cùng ngày ("Kimi K3 PRIMARY") vì Kimi thực tế chạy quá chậm
// (>120s/phần) khiến rail khó dùng thật. Đổi DB về 'kimi' để quay lại thứ tự
// sáng, không cần sửa code — xem `providerOrder()` cuối file.
//
// Hỗ trợ:
//   - llmText           : non-stream text (+ ảnh vision, + hội thoại nhiều lượt)
//   - llmStreamResponse : streaming SSE, GIỮ NGUYÊN 2 shape frontend đang parse
//     ('anthropic' = content_block_delta/text_delta như tu-binh.html;
//      'delta'     = data:{t} / {err} / [DONE] như dat-ten/chon-ngay).
// ============================================================

import { getChatConfig } from '@/lib/config/appConfig';
import { toGeminiTools } from '@/lib/agent/providers/gemini';
import { toKimiTools } from '@/lib/agent/providers/kimi';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
// Opus 5. Đứng thứ 2 hoặc thứ 3 tùy `chat.standalone_provider` trong DB (xem
// header file + `providerOrder()` cuối file) — hằng số này KHÔNG đọc được từ
// app_config, đổi MODEL thì phải sửa trực tiếp ở đây rồi deploy; đổi THỨ TỰ
// thì không, chỉ cần đổi DB.
const ANTHROPIC_MODEL = 'claude-opus-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
// Kimi K3 (Moonshot AI), endpoint OpenAI-compatible Chat Completions. Đứng
// thứ mấy trong chuỗi cũng tùy `chat.standalone_provider` — xem trên.
const KIMI_KEY = process.env.KIMIK3_API_KEY || '';
const KIMI_MODEL = process.env.KIMI_MODEL || 'kimi-k3';
const KIMI_URL = 'https://api.moonshot.ai/v1/chat/completions';

export interface LlmImage {
  data: string; // base64 (không kèm data: prefix)
  mediaType?: string; // vd 'image/jpeg'
}
export interface LlmMessage {
  role: string; // 'user' | 'assistant'
  content: string;
}
export interface LlmTextOpts {
  system?: string;
  /** Prompt 1 lượt. Bỏ qua nếu có `messages`. */
  prompt?: string;
  /** Hội thoại nhiều lượt (chat). Nếu có → dùng thay `prompt`. */
  messages?: LlmMessage[];
  images?: LlmImage[];
  maxTokens?: number;
  temperature?: number;
  /** Ép model trả JSON hợp lệ ở TẦNG API (Gemini responseMimeType /
   * Anthropic prefill), thay vì chỉ dặn trong prompt rồi tự parse. Dặn suông
   * không chặn được lỗi cú pháp thật sự hay gặp: dấu " trong lời thoại không
   * escape, xuống dòng thật giữa chuỗi. */
  json?: boolean;
  /** Schema (OpenAPI subset của Gemini) đi kèm `json` — ép luôn ĐÚNG SHAPE,
   * không chỉ đúng cú pháp. Bỏ qua với Anthropic (API không có). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonSchema?: any;
  /** OPT-IN — chỉ bật khi CHÍNH caller biết `system` sẽ được gửi LẶP LẠI với
   * nội dung GIỐNG HỆT ở nhiều lượt gọi kế tiếp (vd 24 phần Luận Giải cùng
   * một lá số). Chỉ tác dụng ở nhánh Anthropic (`buildAnthropicBody` bọc
   * `system` thành 1 khối `cache_control:{type:'ephemeral',ttl:'1h'}`) —
   * Gemini/Kimi không đọc field này, tự bỏ qua. Mặc định TẮT: gắn tràn lan
   * cho các lượt gọi 1-shot không lặp lại (đa số route đang dùng module này)
   * chỉ tốn thêm phí GHI cache (×1,25) mà không có lượt ĐỌC nào bù lại. */
  cacheSystem?: boolean;
  /** Ép provider ĐỨNG ĐẦU cho ĐÚNG LƯỢT NÀY, bỏ qua `chat.standalone_provider`
   * trong DB (khoá đó là cấu hình GLOBAL, dùng chung mọi route standalone —
   * ép ở đây không đổi hành vi của route khác). Vẫn giữ NGUYÊN chuỗi fallback
   * (2 provider còn lại của `CANONICAL_ORDER`, đúng thứ tự cũ) nếu provider
   * bị ép lỗi/timeout — chỉ khác PRIMARY, không phải "chỉ dùng đúng provider
   * này". Chỉ dùng khi có lý do THẬT SỰ cần ĐÚNG provider đó cho lượt này
   * (vd cron viết bài muốn Kimi dù DB đang ưu tiên Gemini cho toàn site).
   */
  provider?: 'kimi' | 'anthropic' | 'gemini';
}

// ─── Gemini ────────────────────────────────────────────────────
// Dựng body generateContent/streamGenerateContent từ opts chung.
function buildGeminiBody(o: LlmTextOpts, maxTokens: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contents: any[];
  if (o.messages?.length) {
    contents = o.messages
      .filter((m) => String(m.content || '').trim())
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      }));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];
    for (const im of o.images || []) {
      parts.push({ inline_data: { mime_type: im.mediaType || 'image/jpeg', data: im.data } });
    }
    parts.push({ text: o.prompt || '' });
    contents = [{ role: 'user', parts }];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: o.temperature ?? 0.7,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (o.system) body.system_instruction = { parts: [{ text: o.system }] };
  if (o.json) {
    body.generationConfig.responseMimeType = 'application/json';
    if (o.jsonSchema) body.generationConfig.responseSchema = o.jsonSchema;
  }
  return body;
}

interface RawLlmResult {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    /** Chỉ Anthropic có ý nghĩa (đọc thật từ response khi `cacheSystem` bật);
     * Gemini/Kimi luôn 0. Cần cho `logLlmUsage` tính đúng `cost_vnd` (write
     * ×1,25 / read ×0,1) — thiếu 2 trường này thì cache có chạy thật cũng
     * không đo được tiết kiệm, số liệu vẫn tính như chưa cache. */
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
}

async function geminiText(o: LlmTextOpts, maxTokens: number): Promise<RawLlmResult> {
  if (!GEMINI_KEY) throw new Error('gemini: thiếu GEMINI_API_KEY');
  const url = `${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_KEY}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGeminiBody(o, maxTokens)),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (j?.candidates?.[0]?.content?.parts as any[] | undefined)?.map((p) => p.text).filter(Boolean).join('') || '';
  if (!t) throw new Error('gemini: completion rỗng');
  return {
    text: t,
    usage: {
      input_tokens: j?.usageMetadata?.promptTokenCount || 0,
      output_tokens: j?.usageMetadata?.candidatesTokenCount || 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}

async function openGeminiStream(o: LlmTextOpts, maxTokens: number): Promise<Response> {
  if (!GEMINI_KEY) throw new Error('gemini: thiếu GEMINI_API_KEY');
  const url = `${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildGeminiBody(o, maxTokens)),
  });
}

// Lấy text từ 1 payload SSE của Gemini (đã strip 'data: ').
function geminiChunkText(raw: string): string {
  const j = JSON.parse(raw);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (j?.candidates?.[0]?.content?.parts as any[] | undefined)?.map((p) => p.text).filter(Boolean).join('') || '';
}

// ─── Kimi K3 (Moonshot AI, OpenAI-compatible Chat Completions) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildKimiMessages(o: LlmTextOpts): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  if (o.system) out.push({ role: 'system', content: o.system });
  if (o.messages?.length) {
    for (const m of o.messages) {
      const c = String(m.content || '').trim();
      if (c) out.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: c });
    }
  } else if (o.images?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];
    for (const im of o.images) {
      parts.push({ type: 'image_url', image_url: { url: `data:${im.mediaType || 'image/jpeg'};base64,${im.data}` } });
    }
    parts.push({ type: 'text', text: o.prompt || '' });
    out.push({ role: 'user', content: parts });
  } else {
    out.push({ role: 'user', content: o.prompt || '' });
  }
  return out;
}

async function kimiText(o: LlmTextOpts, maxTokens: number): Promise<RawLlmResult> {
  if (!KIMI_KEY) throw new Error('kimi: thiếu KIMIK3_API_KEY');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    model: KIMI_MODEL,
    messages: buildKimiMessages(o),
    max_tokens: maxTokens,
    // 🔴 ĐÃ VÁ 2026-08-20 — Kimi K3 (Moonshot) CHỈ nhận temperature=1; giá trị
    // khác (kể cả `o.temperature` do caller đặt, vd 0 cho JSON xác định) bị
    // Moonshot từ chối NGAY với `400 invalid temperature: only 1 is allowed
    // for this model` — mọi lượt Kimi ở CẢ 3 hàm trong file này lẫn
    // lib/agent/providers/kimi.ts đều dính, đúng lý do Kimi 0đ trên dashboard
    // dù đã set 'kimi' làm primary. KHÔNG dùng `o.temperature` ở đây được nữa.
    temperature: 1,
  };
  if (o.json) body.response_format = { type: 'json_object' };
  const r = await fetch(KIMI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`kimi ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const t = j?.choices?.[0]?.message?.content || '';
  if (!t) throw new Error('kimi: completion rỗng');
  return {
    text: t,
    usage: {
      input_tokens: j?.usage?.prompt_tokens || 0,
      output_tokens: j?.usage?.completion_tokens || 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}

async function openKimiStream(o: LlmTextOpts, maxTokens: number): Promise<Response> {
  if (!KIMI_KEY) throw new Error('kimi: thiếu KIMIK3_API_KEY');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    model: KIMI_MODEL,
    messages: buildKimiMessages(o),
    max_tokens: maxTokens,
    // Xem chú thích ở kimiText() phía trên — Kimi K3 chỉ nhận temperature=1.
    temperature: 1,
    stream: true,
  };
  return fetch(KIMI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
    body: JSON.stringify(body),
  });
}

// Lấy text từ 1 payload SSE của Kimi (đã strip 'data: ', shape OpenAI delta).
function kimiChunkText(raw: string): string {
  const j = JSON.parse(raw);
  return j?.choices?.[0]?.delta?.content || '';
}

// ─── Anthropic ─────────────────────────────────────────────────
function buildAnthropicBody(o: LlmTextOpts, maxTokens: number, stream: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: any[];
  if (o.messages?.length) {
    messages = o.messages
      .filter((m) => String(m.content || '').trim())
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
  } else if (o.images?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];
    for (const im of o.images) {
      content.push({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } });
    }
    content.push({ type: 'text', text: o.prompt || '' });
    messages = [{ role: 'user', content }];
  } else {
    messages = [{ role: 'user', content: o.prompt || '' }];
  }
  // Anthropic không có JSON mode; tương đương gần nhất là PREFILL — mở sẵn lượt
  // trả lời bằng '{' để model buộc phải viết tiếp thân JSON, hết đường thêm câu
  // dẫn. Chỉ dùng cho non-stream (nhánh streaming không parse JSON).
  // `anthropicText` nối lại '{' đã bị prefill nuốt mất.
  if (o.json && !stream) messages = [...messages, { role: 'assistant', content: '{' }];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = { model: ANTHROPIC_MODEL, max_tokens: maxTokens, messages };
  if (o.system) {
    // cacheSystem opt-in (xem LlmTextOpts): bọc `system` thành 1 khối content
    // với breakpoint TTL 1h — 5' mặc định KHÔNG đủ cho lượt chạy dài (24 phần
    // Luận Giải tốn tới ~11 phút, xem CLAUDE.md track tối ưu chi phí Opus).
    // Prefix match TUYỆT ĐỐI: caller phải tự đảm bảo `o.system` giống hệt
    // byte-for-byte ở mọi lượt muốn dùng chung cache (không tự trộn thêm gì
    // biến thiên vào field này khi đã bật cờ).
    body.system = o.cacheSystem
      ? [{ type: 'text', text: o.system, cache_control: { type: 'ephemeral', ttl: '1h' } }]
      : o.system;
  }
  if (stream) body.stream = true;
  return body;
}

async function anthropicText(o: LlmTextOpts, maxTokens: number): Promise<RawLlmResult> {
  if (!ANTHROPIC_KEY) throw new Error('anthropic: thiếu ANTHROPIC_API_KEY');
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(buildAnthropicBody(o, maxTokens, false)),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (j?.content as any[] | undefined)?.map((b) => b.text).filter(Boolean).join('') || '';
  if (!t) throw new Error('anthropic: completion rỗng');
  return {
    // Nối lại dấu '{' của prefill (xem buildAnthropicBody) — API chỉ trả phần
    // model viết TIẾP, không lặp lại phần đã mồi.
    text: o.json ? '{' + t : t,
    usage: {
      input_tokens: j?.usage?.input_tokens || 0,
      output_tokens: j?.usage?.output_tokens || 0,
      // Chỉ có giá trị thật khi `cacheSystem` bật (xem buildAnthropicBody) —
      // Anthropic vẫn trả 2 trường này bằng 0 khi lượt gọi không cache.
      cache_creation_input_tokens: j?.usage?.cache_creation_input_tokens || 0,
      cache_read_input_tokens: j?.usage?.cache_read_input_tokens || 0,
    },
  };
}

async function openAnthropicStream(o: LlmTextOpts, maxTokens: number): Promise<Response> {
  if (!ANTHROPIC_KEY) throw new Error('anthropic: thiếu ANTHROPIC_API_KEY');
  return fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(buildAnthropicBody(o, maxTokens, true)),
  });
}

// Lấy text từ 1 payload SSE của Anthropic (đã strip 'data: ').
function anthropicChunkText(raw: string): string {
  const j = JSON.parse(raw);
  if (j?.type === 'content_block_delta' && j?.delta?.type === 'text_delta') return j.delta.text || '';
  return '';
}

// ─── Chọn provider (chính + 2 backup) ───────────────────────────
// `standaloneProvider` (app_config 'chat.standalone_provider') giữ vai trò
// ĐẶT LÊN ĐẦU một provider cụ thể — còn lại xếp theo `CANONICAL_ORDER` phía
// sau (KHÔNG cần đụng mảng đó để đổi primary). LIVE 2026-08-20 tối (chốt
// Henry, "trước mắt"): DB = 'gemini' → Gemini Flash primary, Kimi K3
// secondary-1, Opus 5 secondary-2 — thứ tự Kimi/anthropic trong mảng dưới đây
// vốn đã đúng thứ tự secondary-1/secondary-2 Henry muốn, nên đặt primary =
// 'gemini' là đủ, không cần sửa mảng. Kimi thiếu key thì
// `kimiText`/`openKimiStream` tự ném lỗi ngay, vòng thử-provider-kế-tiếp bên
// dưới xử lý y như mọi lỗi khác.
const CANONICAL_ORDER = ['kimi', 'anthropic', 'gemini'];
// `override` (từ `LlmTextOpts.provider`) đặt LÊN ĐẦU cho ĐÚNG LƯỢT gọi này,
// KHÔNG đụng đến `chat.standalone_provider` trong DB — cấu hình đó vẫn quyết
// định primary cho mọi lượt KHÔNG truyền override. Có override → bỏ qua hẳn
// bước đọc DB (đỡ một round-trip Supabase không cần thiết).
async function providerOrder(override?: string): Promise<string[]> {
  if (override && CANONICAL_ORDER.includes(override)) {
    return [override, ...CANONICAL_ORDER.filter((p) => p !== override)];
  }
  let primary = 'kimi';
  try {
    primary = (await getChatConfig()).standaloneProvider || 'kimi';
  } catch {
    /* getChatConfig không throw; phòng hờ → kimi */
  }
  if (!CANONICAL_ORDER.includes(primary)) primary = 'kimi';
  return [primary, ...CANONICAL_ORDER.filter((p) => p !== primary)];
}

export interface LlmTextFullResult {
  text: string;
  provider: 'gemini' | 'anthropic' | 'kimi';
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
  /** Thời lượng THẬT của lượt gọi (ms), tính cả lượt fallback provider nếu có.
   * Đo tại đây để mọi route chỉ việc chuyển tiếp — bắt 10 chỗ gọi tự bấm giờ
   * thì sớm muộn có chỗ quên, mà chỗ quên đó im lặng. */
  durationMs: number;
}

/**
 * Sinh text (non-stream) qua provider chính, tự fallback provider kia nếu lỗi.
 * Trả full kết quả (kèm provider/model/usage) — cho các route cần log chi phí
 * thật (vd chan-dung-vo-chong qua lib/agent/usage.ts logLlmUsage).
 */
export async function llmTextFull(o: LlmTextOpts): Promise<LlmTextFullResult> {
  const maxTokens = o.maxTokens ?? 2000;
  const order = await providerOrder(o.provider);
  const t0 = Date.now();
  let lastErr: unknown;
  for (const p of order) {
    try {
      const r = p === 'kimi' ? await kimiText(o, maxTokens) : p === 'gemini' ? await geminiText(o, maxTokens) : await anthropicText(o, maxTokens);
      return {
        text: r.text,
        usage: r.usage,
        provider: p as 'gemini' | 'anthropic' | 'kimi',
        model: p === 'kimi' ? KIMI_MODEL : p === 'gemini' ? GEMINI_MODEL : ANTHROPIC_MODEL,
        durationMs: Date.now() - t0,
      };
    } catch (e) {
      lastErr = e;
      console.error(`[llmText] ${p} lỗi → thử backup:`, (e as Error).message);
    }
  }
  throw lastErr ?? new Error('llmText: không provider nào khả dụng');
}

/**
 * Sinh text (non-stream) qua provider chính, tự fallback provider kia nếu lỗi.
 * Trả về text thuần (route tự parse/JSON như cũ).
 */
export async function llmText(o: LlmTextOpts): Promise<string> {
  return (await llmTextFull(o)).text;
}

// ─── Streaming ─────────────────────────────────────────────────
export type StreamFormat = 'anthropic' | 'delta';

function sseHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
    ...(extra || {}),
  };
}

/**
 * Trả về Response SSE, provider chính đọc từ config (fallback provider kia NẾU
 * lỗi lúc mở kết nối — không fallback giữa dòng). GIỮ NGUYÊN byte-shape mà
 * frontend đang parse:
 *   - 'anthropic': data:{type:'content_block_delta',delta:{type:'text_delta',text}}
 *                  (kết thúc = đóng stream; tu-binh.html đọc tới hết).
 *   - 'delta'    : data:{t} / data:{err} / data:[DONE] (dat-ten/chon-ngay).
 */
export async function llmStreamResponse(
  o: LlmTextOpts,
  format: StreamFormat,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const maxTokens = o.maxTokens ?? 2000;
  const order = await providerOrder();
  const enc = new TextEncoder();

  const emitDelta = (t: string) =>
    format === 'delta'
      ? `data: ${JSON.stringify({ t })}\n\n`
      : `data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })}\n\n`;
  const emitDone = () => (format === 'delta' ? 'data: [DONE]\n\n' : '');
  const emitErr = (msg: string) =>
    format === 'delta'
      ? `data: ${JSON.stringify({ err: msg })}\n\ndata: [DONE]\n\n`
      : `data: ${JSON.stringify({ type: 'error', error: { message: msg } })}\n\n`;

  // Mở upstream TRƯỚC (thử provider chính rồi backup) — chỉ fallback khi CHƯA
  // phát byte nào xuống client.
  let upstream: Response | null = null;
  let usedProvider = '';
  let lastErr = '';
  for (const p of order) {
    try {
      const u =
        p === 'kimi'
          ? await openKimiStream(o, maxTokens)
          : p === 'gemini'
            ? await openGeminiStream(o, maxTokens)
            : await openAnthropicStream(o, maxTokens);
      if (u.ok && u.body) {
        upstream = u;
        usedProvider = p;
        break;
      }
      lastErr = `${p} ${u.status}: ${(await u.text()).slice(0, 200)}`;
      console.error('[llmStream]', lastErr);
    } catch (e) {
      lastErr = `${p}: ${(e as Error).message}`;
      console.error('[llmStream]', lastErr);
    }
  }

  if (!upstream) {
    return new Response(emitErr(lastErr || 'LLM không khả dụng'), { headers: sseHeaders(extraHeaders) });
  }

  const parseChunk = usedProvider === 'kimi' ? kimiChunkText : usedProvider === 'gemini' ? geminiChunkText : anthropicChunkText;
  const body = upstream.body!;

  const stream = new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(line.indexOf(':') + 1).trim();
            if (!raw || raw === '[DONE]') continue;
            let t = '';
            try {
              t = parseChunk(raw);
            } catch {
              continue;
            }
            if (t) controller.enqueue(enc.encode(emitDelta(t)));
          }
        }
      } catch (e) {
        // Lỗi giữa dòng: đã có text hiển thị một phần — báo lỗi theo format rồi đóng.
        if (format === 'delta') controller.enqueue(enc.encode(`data: ${JSON.stringify({ err: (e as Error).message })}\n\n`));
      }
      const d = emitDone();
      if (d) controller.enqueue(enc.encode(d));
      controller.close();
    },
  });

  return new Response(stream, { headers: sseHeaders(extraHeaders) });
}

// ─── Function-calling (Anthropic-shaped) ───────────────────────
// Cho lasotuvi handleChat/handleChatStream: vòng lặp tool đang viết theo shape
// Anthropic (content[].type='tool_use'/'tool_result', stop_reason='tool_use').
// callLLMTools TRẢ VỀ ĐÚNG shape đó dù provider là Gemini → giữ nguyên vòng lặp.

/* eslint-disable @typescript-eslint/no-explicit-any */

// Rút text thuần từ system (string) — buildChatContext trả systemForCall là chuỗi;
// phòng hờ nhận cả mảng block Anthropic [{type:'text',text}].
function systemText(system: any): string {
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) return system.map((b) => b?.text || '').filter(Boolean).join('\n');
  return '';
}

// Convo Anthropic (kèm tool_use/tool_result) → Gemini contents (functionCall/
// functionResponse). Map tool_use_id → name để dựng functionResponse (Gemini cần name).
function convoToGeminiFC(convo: any[]): any[] {
  const out: any[] = [];
  const idToName: Record<string, string> = {};
  for (const m of convo) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const c = m.content;
    if (typeof c === 'string') {
      if (c) out.push({ role, parts: [{ text: c }] });
      continue;
    }
    if (!Array.isArray(c)) continue;
    const parts: any[] = [];
    for (const b of c) {
      if (b?.type === 'text' && b.text) parts.push({ text: b.text });
      else if (b?.type === 'tool_use') {
        idToName[b.id] = b.name;
        parts.push({ functionCall: { name: b.name, args: b.input || {} } });
      } else if (b?.type === 'tool_result') {
        const name = idToName[b.tool_use_id] || 'unknown';
        const rc = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
        parts.push({ functionResponse: { name, response: { result: rc } } });
      } else if (b?.type === 'image' && b.source?.data) {
        parts.push({ inline_data: { mime_type: b.source.media_type || 'image/jpeg', data: b.source.data } });
      }
    }
    if (parts.length) out.push({ role, parts });
  }
  return out;
}

async function geminiCallTools(
  system: any,
  convo: any[],
  tools: any[],
  toolChoiceNone: boolean,
  maxTokens: number,
): Promise<any> {
  if (!GEMINI_KEY) throw new Error('gemini: thiếu GEMINI_API_KEY');
  const body: any = {
    system_instruction: { parts: [{ text: systemText(system) }] },
    contents: convoToGeminiFC(convo),
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
  };
  // toolChoiceNone (vòng chốt) → KHÔNG gửi tools → Gemini buộc trả text.
  if (tools?.length && !toolChoiceNone) body.tools = toGeminiTools(tools);
  const url = `${GEMINI_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${GEMINI_KEY}`;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const parts = (j?.candidates?.[0]?.content?.parts as any[]) || [];
  const content: any[] = [];
  let hasTool = false;
  let idx = 0;
  for (const p of parts) {
    if (typeof p.text === 'string' && p.text) content.push({ type: 'text', text: p.text });
    if (p.functionCall) {
      hasTool = true;
      content.push({ type: 'tool_use', id: `gem_${idx++}`, name: p.functionCall.name, input: p.functionCall.args || {} });
    }
  }
  return {
    content,
    stop_reason: hasTool ? 'tool_use' : 'end_turn',
    usage: {
      input_tokens: j?.usageMetadata?.promptTokenCount || 0,
      output_tokens: j?.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

async function anthropicCallTools(
  system: any,
  convo: any[],
  tools: any[],
  toolChoiceNone: boolean,
  maxTokens: number,
): Promise<any> {
  if (!ANTHROPIC_KEY) throw new Error('anthropic: thiếu ANTHROPIC_API_KEY');
  const payload: any = { model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: convo };
  if (tools?.length) {
    payload.tools = tools;
    if (toolChoiceNone) payload.tool_choice = { type: 'none' };
  }
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('anthropic ' + r.status + ': ' + (await r.text()).slice(0, 200));
  return r.json();
}

// Convo Anthropic (kèm tool_use/tool_result) → messages OpenAI/Kimi. Khác
// convoToGeminiFC ở chỗ tool_use gói thành `tool_calls` trên message
// 'assistant' (không lồng trong content), và tool_result tách thành message
// RIÊNG role:'tool' (không lồng trong content của user) — đúng shape
// Chat Completions.
function convoToKimiMessages(system: any, convo: any[]): any[] {
  const out: any[] = [{ role: 'system', content: systemText(system) }];
  for (const m of convo) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const c = m.content;
    if (typeof c === 'string') {
      if (c) out.push({ role, content: c });
      continue;
    }
    if (!Array.isArray(c)) continue;
    const textParts: any[] = [];
    const toolCalls: any[] = [];
    const toolResults: any[] = [];
    for (const b of c) {
      if (b?.type === 'text' && b.text) {
        textParts.push({ type: 'text', text: b.text });
      } else if (b?.type === 'tool_use') {
        toolCalls.push({ id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input || {}) } });
      } else if (b?.type === 'tool_result') {
        const rc = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
        toolResults.push({ role: 'tool', tool_call_id: b.tool_use_id, content: rc });
      } else if (b?.type === 'image' && b.source?.data) {
        textParts.push({ type: 'image_url', image_url: { url: `data:${b.source.media_type || 'image/jpeg'};base64,${b.source.data}` } });
      }
    }
    if (toolCalls.length) {
      const txt = textParts.filter((p) => p.type === 'text').map((p) => p.text).join('') || null;
      out.push({ role: 'assistant', content: txt, tool_calls: toolCalls });
    } else if (textParts.length) {
      out.push({ role, content: textParts.length === 1 && textParts[0].type === 'text' ? textParts[0].text : textParts });
    }
    for (const tr of toolResults) out.push(tr);
  }
  return out;
}

async function kimiCallTools(
  system: any,
  convo: any[],
  tools: any[],
  toolChoiceNone: boolean,
  maxTokens: number,
): Promise<any> {
  if (!KIMI_KEY) throw new Error('kimi: thiếu KIMIK3_API_KEY');
  // temperature:1 bắt buộc — xem chú thích ở kimiText() phía trên. Hàm này
  // trước đây KHÔNG gửi field temperature (mặc định phía Moonshot có thể khác
  // 1) — thêm tường minh cho chắc, cùng bệnh với 2 hàm kia trong file này.
  const body: any = { model: KIMI_MODEL, messages: convoToKimiMessages(system, convo), max_tokens: maxTokens, temperature: 1 };
  if (tools?.length) {
    body.tools = toKimiTools(tools);
    if (toolChoiceNone) body.tool_choice = 'none';
  }
  const r = await fetch(KIMI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KIMI_KEY}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('kimi ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  const msg = j?.choices?.[0]?.message || {};
  const content: any[] = [];
  if (msg.content) content.push({ type: 'text', text: msg.content });
  let hasTool = false;
  for (const tc of msg.tool_calls || []) {
    hasTool = true;
    let args: any = {};
    try {
      args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
    } catch {
      args = {};
    }
    content.push({ type: 'tool_use', id: tc.id, name: tc.function?.name, input: args });
  }
  return {
    content,
    stop_reason: hasTool ? 'tool_use' : 'end_turn',
    usage: {
      input_tokens: j?.usage?.prompt_tokens || 0,
      output_tokens: j?.usage?.completion_tokens || 0,
    },
  };
}

/**
 * Một lượt LLM có function-calling, TRẢ VỀ shape Anthropic
 * ({content, stop_reason, usage}) dù provider là Gemini. Provider chính đọc từ
 * config, tự fallback provider kia nếu lỗi.
 *
 * Kết quả gắn kèm `provider`/`model` THẬT SỰ đã chạy — vòng lặp tool có thể rơi
 * sang provider backup giữa chừng, nên chỗ gọi mà chép tay tên model là ghi sai
 * giá mà không có gì báo (đúng bẫy `generatePortraitImage` đã trả giá).
 * Lấy hằng số cấu hình chứ KHÔNG lấy `model` trong phản hồi Anthropic: bản
 * phản hồi trả id đã gắn hậu tố ngày, tra `MODEL_PRICING` trượt khoá rồi lặng
 * lẽ rơi về giá mặc định (Sonnet) — đắt gấp 3 nếu thực tế chạy Haiku.
 */
export async function callLLMTools(
  system: any,
  convo: any[],
  tools: any[],
  toolChoiceNone = false,
  maxTokens = 2250, // Nâng 50% (Henry chốt 2026-08-20, chống cắt ngang giữa lượt)
): Promise<any> {
  const order = await providerOrder();
  let lastErr: unknown;
  for (const p of order) {
    try {
      const r =
        p === 'kimi'
          ? await kimiCallTools(system, convo, tools, toolChoiceNone, maxTokens)
          : p === 'gemini'
            ? await geminiCallTools(system, convo, tools, toolChoiceNone, maxTokens)
            : await anthropicCallTools(system, convo, tools, toolChoiceNone, maxTokens);
      r.provider = p;
      r.model = p === 'kimi' ? KIMI_MODEL : p === 'gemini' ? GEMINI_MODEL : ANTHROPIC_MODEL;
      return r;
    } catch (e) {
      lastErr = e;
      console.error(`[callLLMTools] ${p} lỗi → thử backup:`, (e as Error).message);
    }
  }
  throw lastErr ?? new Error('callLLMTools: không provider nào khả dụng');
}
/* eslint-enable @typescript-eslint/no-explicit-any */
