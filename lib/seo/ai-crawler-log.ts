// lib/seo/ai-crawler-log.ts
// ============================================================
// Đếm lượt AI crawler ghé `/van-dap/*` — số DUY NHẤT trả lời được câu "PR GEO
// có tác dụng không" thay vì đoán.
//
// 🔑 Vì sao cần bảng riêng, không dùng GA4/track.js: đúng luật đã ghi ở
// docs/luat/bay.md — "log của bên GỬI không chứng minh bên NHẬN hiện ra".
// GA4/Clarity chỉ thấy trình duyệt CHẠY JS; GPTBot/PerplexityBot/ClaudeBot
// không chạy JS (chính lý do `/van-dap` phải SSR — xem app/van-dap/route.ts).
// Không có bảng này thì AI có thật sự đọc 360 bài hay không mãi mãi là cảm
// giác, không phải số.
//
// ⚠️ Chỉ log được cho ROUTE ĐỘNG (app/van-dap/**/*.ts) — `/phuong-phap` là
// file tĩnh phục vụ qua rewrite, không chạy qua tay Node nên KHÔNG gọi được
// hàm này. Đo trang đó cần Vercel Log Drain riêng, ngoài phạm vi file này.
//
// Fire-and-forget TUYỆT ĐỐI: không await ở nơi gọi, lỗi ghi log không được
// làm chậm hay làm hỏng response thật cho người/bot đang đọc trang.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/**
 * Danh sách User-Agent AI crawler quan tâm nhất cho GEO — không phải danh
 * sách đầy đủ mọi bot (Googlebot/Bingbot thường đã có qua Search Console).
 */
const CRAWLER_PATTERNS: readonly [string, RegExp][] = [
  ['gptbot', /GPTBot/i],
  ['oai-searchbot', /OAI-SearchBot/i],
  ['chatgpt-user', /ChatGPT-User/i],
  ['perplexitybot', /PerplexityBot/i],
  ['claudebot', /ClaudeBot/i],
  ['anthropic-ai', /anthropic-ai/i],
  ['google-extended', /Google-Extended/i],
  ['cohere-ai', /cohere-ai/i],
];

/**
 * Gọi ở đầu mỗi route `/van-dap/*` — KHÔNG `await` ở nơi gọi. No-op im lặng
 * nếu UA không khớp bot nào hoặc thiếu cấu hình Supabase (không có gì đáng
 * ghi, và route chính vẫn phải chạy được kể cả thiếu cấu hình phụ này).
 */
export function logAiCrawlerHit(userAgent: string | null, path: string): void {
  if (!userAgent || !SUPABASE_URL || !SUPABASE_KEY) return;
  const hit = CRAWLER_PATTERNS.find(([, re]) => re.test(userAgent));
  if (!hit) return;
  fetch(`${SUPABASE_URL}/rest/v1/ai_crawler_hits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ bot: hit[0], path }),
  }).catch(() => {});
}
