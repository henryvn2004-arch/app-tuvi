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
// không cần bảng riêng. CHỈ theo dõi model Anthropic (Gemini route riêng,
// khác cấu trúc giá — chưa có số, bỏ qua có chủ đích).
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
// Cache read ×0.1. Nguồn: bảng giá Anthropic hiện hành.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};
const DEFAULT_PRICING = MODEL_PRICING['claude-sonnet-4-6'];
const USD_TO_VND = 25_000; // khớp tỷ giá quy đổi topup hiện có trong hệ thống

function calcCostVnd(model: string, u: LlmUsage): number {
  const p = MODEL_PRICING[model] || DEFAULT_PRICING;
  const usd =
    (u.input_tokens * p.input +
      u.cache_creation_input_tokens * p.input * 1.25 +
      u.cache_read_input_tokens * p.input * 0.1 +
      u.output_tokens * p.output) /
    1e6;
  return Math.round(usd * USD_TO_VND);
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
