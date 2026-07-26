// lib/agent/usage.ts
// ============================================================
// LOG CHI PHÍ LLM — best-effort, KHÔNG throw, KHÔNG chặn trả lời.
//
// runAgent (run.ts) cộng dồn usage token qua hết vòng lặp tool-use rồi gọi
// logLlmUsage() một lần cuối, gắn "tool_id" = scenario.type nếu có, ngược lại
// 'chat' — CHÍNH chuỗi mà /api/v1/chat + lib/channels/gate.ts ghi vào
// credit_transactions.type cho MỌI lượt rail (bất kể scenario/lá số), nên
// bucket cost này khớp thẳng với bucket doanh thu thật khi tính biên LN.
// Ghi vào events (event_type='llm_usage') — cùng bảng dùng chung toàn hệ thống,
// không cần bảng riêng.
//
// logImageUsage() — thêm cho route "Chân Dung Vợ Chồng" (gpt-image-1, text-to-
// image): cấu trúc giá 3 loại token (text input / image input / image output)
// KHÁC hẳn LlmUsage 2 chiều (input/output) của Anthropic/Gemini text, nên tách
// riêng calcImageCostVnd thay vì ép vào MODEL_PRICING chung.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export interface LlmUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

// Giá USD/1M token (sticker price, không tính intro discount tạm thời).
// Cache write ×1.25 (TTL 5', hệ thống dùng TTL 1h thực tế đắt hơn 2x nhưng cứ
// dùng mốc bảo thủ hơn — biên LN sẽ hơi thấp hơn thực tế, không thổi phồng).
// Cache read ×0.1. Nguồn: bảng giá Anthropic hiện hành + Gemini 2.5 Flash
// (provider chính của lib/llm/complete.ts, "chat.standalone_provider").
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'gemini-2.5-flash': { input: 0.15, output: 1.25 },
};
const DEFAULT_PRICING = MODEL_PRICING['claude-sonnet-4-6'];
const DEFAULT_GEMINI_PRICING = MODEL_PRICING['gemini-2.5-flash'];
const USD_TO_VND = 25_000; // khớp tỷ giá quy đổi topup hiện có trong hệ thống

// model lạ (vd đổi GEMINI_MODEL env sang bản khác) → fallback theo HỌ model
// (gemini-* dùng giá Flash, còn lại dùng giá Sonnet) thay vì luôn rơi về giá
// Anthropic — tránh thổi phồng chi phí Gemini sai họ giá.
function pricingFor(model: string): { input: number; output: number } {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  return model.startsWith('gemini') ? DEFAULT_GEMINI_PRICING : DEFAULT_PRICING;
}

function calcCostVnd(model: string, u: LlmUsage): number {
  const p = pricingFor(model);
  const usd =
    (u.input_tokens * p.input +
      u.cache_creation_input_tokens * p.input * 1.25 +
      u.cache_read_input_tokens * p.input * 0.1 +
      u.output_tokens * p.output) /
    1e6;
  return Math.round(usd * USD_TO_VND);
}

// ─── Ảnh (gpt-image-1) ──────────────────────────────────────────
// Giá 3 loại token riêng (KHÔNG giống LlmUsage 2 chiều ở trên): text input
// $5/1M, image input $10/1M (không dùng ở route hiện tại — text-to-image,
// không có ảnh đầu vào), image output $40/1M. Nguồn: bảng giá OpenAI hiện hành.
export interface ImageUsage {
  text_tokens: number;
  image_input_tokens: number;
  image_output_tokens: number;
}

const IMAGE_MODEL_PRICING: Record<string, { textInput: number; imageInput: number; imageOutput: number }> = {
  'gpt-image-1': { textInput: 5, imageInput: 10, imageOutput: 40 },
};
const DEFAULT_IMAGE_PRICING = IMAGE_MODEL_PRICING['gpt-image-1'];

function calcImageCostVnd(model: string, u: ImageUsage): number {
  const p = IMAGE_MODEL_PRICING[model] || DEFAULT_IMAGE_PRICING;
  const usd = (u.text_tokens * p.textInput + u.image_input_tokens * p.imageInput + u.image_output_tokens * p.imageOutput) / 1e6;
  return Math.round(usd * USD_TO_VND);
}

/** Log chi phí sinh ảnh (gpt-image-1) — cùng bảng/event_type với logLlmUsage
 * nên gộp chung vào bucket tool_id trên dashboard_margin "by_tool" (không cần
 * RPC/panel riêng). Best-effort, không throw. */
export async function logImageUsage(toolId: string, model: string, usage: ImageUsage): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  if (!usage.text_tokens && !usage.image_output_tokens) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: 'llm_usage',
        tool_id: toolId,
        meta: { model, ...usage, cost_vnd: calcImageCostVnd(model, usage) },
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function logLlmUsage(toolId: string, model: string, usage: LlmUsage): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  if (!usage.input_tokens && !usage.output_tokens) return; // không có gì để ghi
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: 'llm_usage',
        tool_id: toolId,
        meta: { model, ...usage, cost_vnd: calcCostVnd(model, usage) },
      }),
    });
  } catch {
    /* best-effort */
  }
}
