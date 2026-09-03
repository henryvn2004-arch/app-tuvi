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
// không cần bảng riêng. Cùng file còn logLlmParseFail() ghi bản thô khi output
// LLM không parse được (event_type='llm_parse_fail') — chẩn đoán, không phải chi phí.
//
// logImageUsage() — cho 2 route chân dung (gpt-image-*, text-to-image):
// cấu trúc giá 3 loại token (text input / image input / image output)
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
  'claude-opus-5': { input: 5, output: 25 }, // backup-1 (chốt Henry 2026-08-20) — cùng bậc giá 4.8/4.7
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-opus-4-7': { input: 5, output: 25 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  // ⚠️ Giá Gemini tra ở https://ai.google.dev/gemini-api/docs/pricing — ĐỪNG
  // gõ từ trí nhớ. Dòng 2.5-flash từng ghi 0.15/1.25 (đó là giá Gemini **2.0**
  // Flash) suốt nhiều tháng ⇒ MỌI `cost_vnd` của Gemini ghi bằng ĐÚNG MỘT NỬA,
  // và không có gì báo vì hàm này không bao giờ ném. Đo lại 2026-09-02 trên 424
  // lượt/90 ngày: ghi sổ 15.686đ, giá thật 31.360đ. Sai số nằm ở PHÍA THỔI
  // PHỒNG BIÊN LN — đúng thứ file này tự dặn ở đầu là phải tránh.
  // Các dòng đã ghi trong `events` KHÔNG được tính lại (giá chốt lúc ghi) —
  // panel Biên LN đọc ngược về trước 2026-09-02 vẫn là số cũ.
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  // Primary Gemini từ 2026-09-02. 🗓 GIÁ KHUYẾN MÃI CÓ HẠN: $0.75/$3.75 tới
  // 31/12/2026, từ 01/01/2027 thành **$1.50/$7.50** (Google in thẳng hai mốc
  // trên bảng giá). Tới hạn phải sửa hai số này, nếu không lại rơi đúng vào
  // bệnh "ghi sổ bằng nửa giá thật" vừa vá ở trên.
  'gemini-3.8-flash': { input: 0.75, output: 3.75 },
  // Primary (chốt Henry 2026-08-20). $3/$15 mỗi 1M cache-miss input/output —
  // Moonshot còn có tầng cache-hit $0.30/1M nhưng LlmUsage không tách được
  // hit/miss ở đây → tính bảo thủ theo giá cache-miss (không thổi phồng cache
  // read của Anthropic vì cơ chế khác hẳn — không áp hệ số ×0.1).
  'kimi-k3': { input: 3, output: 15 },
};
const DEFAULT_PRICING = MODEL_PRICING['claude-sonnet-4-6'];
/** Model `gemini-*` KHÔNG có dòng riêng (vd pin `GEMINI_MODEL` sang bản khác)
 * → lấy mức ĐẮT NHẤT trong họ, không lấy dòng của một model cụ thể.
 * Vì sao: đường hụt-bảng-giá phải nghiêng về phía tính DƯ, không tính THIẾU.
 * Tính thiếu là thổi phồng biên LN mà không có gì báo — đúng lớp lỗi vừa vá ở
 * dòng `gemini-2.5-flash`. Thêm model đắt hơn vào bảng thì mốc này tự nâng theo. */
const DEFAULT_GEMINI_PRICING = Object.entries(MODEL_PRICING)
  .filter(([m]) => m.startsWith('gemini'))
  .reduce(
    (a, [, p]) => ({ input: Math.max(a.input, p.input), output: Math.max(a.output, p.output) }),
    { input: 0, output: 0 },
  );
const DEFAULT_KIMI_PRICING = MODEL_PRICING['kimi-k3'];
const USD_TO_VND = 25_000; // khớp tỷ giá quy đổi topup hiện có trong hệ thống

// model lạ (vd đổi GEMINI_MODEL/KIMI_MODEL env sang bản khác) → fallback theo
// HỌ model (gemini-* dùng giá Flash, kimi-* dùng giá K3, còn lại dùng giá
// Sonnet) thay vì luôn rơi về giá Anthropic — tránh thổi phồng/hạ thấp sai họ giá.
function pricingFor(model: string): { input: number; output: number } {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  if (model.startsWith('gemini')) return DEFAULT_GEMINI_PRICING;
  if (model.startsWith('kimi')) return DEFAULT_KIMI_PRICING;
  return DEFAULT_PRICING;
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

// ─── Ảnh (gpt-image-*) ──────────────────────────────────────────
// Giá 3 loại token riêng (KHÔNG giống LlmUsage 2 chiều ở trên): text input,
// image input (không dùng ở route hiện tại — text-to-image, không có ảnh đầu
// vào), image output. Nguồn: bảng giá OpenAI hiện hành, USD/1M token.
//
// GIỮ `gpt-image-1` dù đã đổi sang `gpt-image-2`: tên model do CHÍNH lượt gọi
// trả về (xem `lib/image/openai-image.ts`), nên nếu env pin ngược lại thì chi
// phí vẫn tính đúng giá của nó chứ không lặng lẽ tính nhầm giá model mới.
export interface ImageUsage {
  text_tokens: number;
  image_input_tokens: number;
  image_output_tokens: number;
}

const IMAGE_MODEL_PRICING: Record<string, { textInput: number; imageInput: number; imageOutput: number }> = {
  'gpt-image-2': { textInput: 5, imageInput: 8, imageOutput: 30 },
  'gpt-image-1': { textInput: 5, imageInput: 10, imageOutput: 40 },
};
const DEFAULT_IMAGE_PRICING = IMAGE_MODEL_PRICING['gpt-image-2'];

function calcImageCostVnd(model: string, u: ImageUsage): number {
  const p = IMAGE_MODEL_PRICING[model] || DEFAULT_IMAGE_PRICING;
  const usd = (u.text_tokens * p.textInput + u.image_input_tokens * p.imageInput + u.image_output_tokens * p.imageOutput) / 1e6;
  return Math.round(usd * USD_TO_VND);
}

/** Log chi phí sinh ảnh (gpt-image-*) — cùng bảng/event_type với logLlmUsage
 * nên gộp chung vào bucket tool_id trên dashboard_margin "by_tool" (không cần
 * RPC/panel riêng). Best-effort, không throw. */
export async function logImageUsage(
  toolId: string,
  model: string,
  usage: ImageUsage,
  durationMs?: number,
): Promise<void> {
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
        meta: {
          model,
          ...usage,
          cost_vnd: calcImageCostVnd(model, usage),
          ...(durationMs != null ? { duration_ms: Math.round(durationMs) } : {}),
        },
      }),
    });
  } catch {
    /* best-effort */
  }
}

/** Ghi lại BẢN THÔ khi parse JSON của LLM hỏng (event_type='llm_parse_fail').
 *
 * Lý do tồn tại: log runtime Vercel không phải lúc nào cũng đọc được, mà đây
 * đúng loại lỗi không tái hiện nổi nếu không có chính chuỗi model đã trả. Cắt
 * đầu/đuôi (không lưu nguyên bản) — đủ để phân biệt "lạc định dạng" với "bị cắt
 * giữa chừng", không phình bảng events. Best-effort, không throw. */
export async function logLlmParseFail(
  toolId: string,
  model: string,
  raw: string,
  attempt: number,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const t = String(raw || '');
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
        event_type: 'llm_parse_fail',
        tool_id: toolId,
        meta: { model, attempt, len: t.length, head: t.slice(0, 700), tail: t.slice(-400) },
      }),
    });
  } catch {
    /* best-effort */
  }
}

/** `durationMs` — thời lượng THẬT của lượt gọi. Trước đây `llm_usage` chỉ có
 * token và tiền, KHÔNG có trường thời lượng nào, nên không tool nào biết mình
 * chạy bao lâu; con số "45–60 giây" duy nhất đang có là suy gián tiếp từ khoảng
 * cách hai mốc log của hai pha chạy song song — mẹo chỉ dùng được cho đúng tool
 * đó. Có trường này thì mới đặt ETA bằng SỐ ĐO thay vì bằng phỏng đoán. */
export async function logLlmUsage(
  toolId: string,
  model: string,
  usage: LlmUsage,
  durationMs?: number,
): Promise<void> {
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
        meta: {
          model,
          ...usage,
          cost_vnd: calcCostVnd(model, usage),
          ...(durationMs != null ? { duration_ms: Math.round(durationMs) } : {}),
        },
      }),
    });
  } catch {
    /* best-effort */
  }
}
