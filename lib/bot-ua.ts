// lib/bot-ua.ts
// Bot TỰ KHAI qua User-Agent — NGUỒN DUY NHẤT. `app/api/track` dùng để ĐÁNH DẤU
// (`events.is_bot`), `lib/billing/anon-preview.ts` dùng để CHẶN bản xem trước
// miễn phí (botnet HeadlessChrome xoay IP + anon_id né được trần theo key/IP).
//
// Độ chính xác cao / độ phủ thấp CÓ CHỦ ĐÍCH: bot giả dạng trình duyệt thật không
// bị bắt ở đây, và đó là chuyện bình thường — chúng rơi vào bucket 'drive_by' của
// RPC traffic_quality(). Mẫu này chỉ lo phần dễ và chắc, để phần khó cho phân
// tích hành vi.
//
// "bot" phải kèm dấu phân cách phía sau (`bot/`, `bot;`, `bot)`, `bot ` hoặc
// cuối chuỗi) chứ không bắt như chuỗi con tự do: Googlebot/2.1 khớp, nhưng
// không kéo theo mọi từ có chứa "bot". Các tên không chứa "bot" phải liệt kê
// riêng.
const BOT_UA =
  /(?:bot[/;)\s]|bot$|crawler|spider|slurp|headlesschrome|phantomjs|puppeteer|playwright|python-requests|scrapy|curl\/|wget\/|go-http-client|node-fetch|okhttp|java\/|libwww|ahrefs|semrush|mj12|lighthouse|pingdom|perplexity|facebookexternalhit)/i;

// CUBOT là hãng điện thoại Android CÓ THẬT, User-Agent của nó chứa "CUBOT " —
// dính đúng nhánh "bot + khoảng trắng" ở trên. Người dùng thật bị gắn nhãn bot
// là kiểu sai tệ nhất ở đây, nên loại trừ tường minh.
const BOT_UA_EXCEPTION = /cubot/i;

export function looksLikeBot(ua: string): boolean {
  if (!ua) return false; // thiếu UA thì để traffic_quality phân xử, không đoán bừa
  return BOT_UA.test(ua) && !BOT_UA_EXCEPTION.test(ua);
}
