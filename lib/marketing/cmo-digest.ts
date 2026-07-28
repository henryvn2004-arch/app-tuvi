// lib/marketing/cmo-digest.ts
// ============================================================
// M0.2 (track Marketing Autopilot) — "CMO quân sư" digest tự động: đọc lại
// CHÍNH các RPC marketing/dashboard đã có (không thêm RPC mới), gói thành 1
// snapshot gọn rồi nhờ LLM tóm tắt "điểm sáng / điểm nghẽn / đề xuất" kiểu
// CEO brief. Read-only tuyệt đối — không ghi gì, không đụng dữ liệu end-user.
// Gọi bởi app/api/cron/cmo-digest/route.ts (Vercel cron, 1 lần/ngày).
// ============================================================

import { llmText } from '@/lib/llm/complete';
import { getGa4Breakdown, type Ga4Breakdown } from '@/lib/analytics/ga4';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function callRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`${fn}: ${await res.text()}`);
  return res.json();
}

interface CmoSnapshot {
  funnelThisWeek: unknown;
  funnelPrevWeek: unknown;
  sourcesThisWeek: unknown;
  engagement: unknown;
  revenueThisWeek: unknown;
  revenuePrevWeek: unknown;
  margin: unknown;
  channelHealth: unknown;
  atRiskCount: number;
  /** GA4 7 ngày qua — null khi chưa cấu hình env hoặc API lỗi (digest tự nói thiếu). */
  ga4: (Ga4Breakdown & { internalVisitors: unknown }) | null;
}

// Snapshot 7 ngày gần nhất SO VỚI 7 ngày trước đó (WoW) — đủ để LLM thấy xu
// hướng mà không cần lịch sử dài (tracking mới có dữ liệu từ 2026-07-22, xem
// D5 track Admin Revamp).
async function buildSnapshot(): Promise<CmoSnapshot> {
  const now = new Date();
  const d = (days: number) => new Date(now.getTime() - days * 864e5).toISOString();

  const day = (days: number) => d(days).slice(0, 10); // GA4 Data API nhận YYYY-MM-DD

  const [
    funnelThisWeek, funnelPrevWeek, sourcesThisWeek, engagement,
    revenueThisWeek, revenuePrevWeek, margin, channelHealth, atRisk, ga4,
  ] = await Promise.all([
    callRpc('marketing_funnel', { p_from: d(7), p_to: d(0) }),
    callRpc('marketing_funnel', { p_from: d(14), p_to: d(7) }),
    callRpc('marketing_sources', { p_from: d(7), p_to: d(0) }),
    callRpc('dashboard_engagement', { p_days: 14 }),
    callRpc('marketing_revenue', { p_from: d(7), p_to: d(0) }),
    callRpc('marketing_revenue', { p_from: d(14), p_to: d(7) }),
    callRpc('dashboard_margin', { p_from: d(7), p_to: d(0) }),
    callRpc('channel_error_rate', { p_hours: 24 }),
    callRpc<unknown[]>('dashboard_at_risk', { p_idle_days: 14, p_min_events: 3, p_limit: 50 }),
    // GA4 là nguồn DUY NHẤT thấy được organic/ads/social; thiếu nó thì digest chỉ
    // nhìn được phần traffic đã chạm track.js và dễ kết luận sai về kênh.
    // Best-effort: hỏng → null, không kéo sập cả digest.
    getGa4Breakdown(day(7), day(0)).catch(() => null),
  ]);

  const funnel = funnelThisWeek as { visitors?: unknown };
  return {
    funnelThisWeek, funnelPrevWeek, sourcesThisWeek, engagement,
    revenueThisWeek, revenuePrevWeek, margin, channelHealth,
    atRiskCount: Array.isArray(atRisk) ? atRisk.length : 0,
    ga4: ga4 ? { ...ga4, internalVisitors: funnel?.visitors ?? null } : null,
  };
}

const SYSTEM_PROMPT = `Bạn là CMO quân sư của tuviminhbao.com (app Tử Vi Đẩu Số, Việt Nam). Mỗi ngày bạn nhận
1 snapshot dữ liệu marketing (JSON) và viết bản tóm tắt ngắn gọn kiểu "CEO brief" gửi qua Telegram
cho founder. Yêu cầu:
- Tiếng Việt, thẳng vào trọng tâm, KHÔNG chào hỏi/mở đầu dài dòng.
- 3 phần rõ ràng, mỗi phần tối đa 3 gạch đầu dòng NGẮN: "📈 Điểm sáng", "⚠️ Điểm nghẽn", "💡 Đề xuất".
- So sánh tuần này (funnelThisWeek/revenueThisWeek) với tuần trước (funnelPrevWeek/revenuePrevWeek)
  để nêu xu hướng (tăng/giảm bao nhiêu %) — CHỈ nêu số có trong dữ liệu, KHÔNG bịa số.
- Nếu dữ liệu quá ít để kết luận (vd 0 hoặc gần 0 ở cả 2 tuần), NÓI THẲNG "chưa đủ dữ liệu" thay vì
  suy diễn.
- Tổng độ dài dưới 350 từ.

VỀ KHỐI "ga4" (Google Analytics 4, 7 ngày qua) — đọc kỹ, đây là chỗ dễ kết luận sai nhất:
- ga4 = null nghĩa là CHƯA nối được GA4. Khi đó nói thẳng một câu "chưa đọc được GA4" và chỉ luận
  trên số nội bộ; TUYỆT ĐỐI không đoán lưu lượng.
- ga4.sessions là lưu lượng THẬT (thấy cả organic/ads/social). ga4.internalVisitors là số nội bộ suy
  từ track.js, vốn CHỈ đếm được khách đã chạy JS trên site. Chênh lệch giữa hai số là phần đo hụt của
  hệ thống nội bộ — KHÔNG phải traffic sụt, KHÔNG phải lỗi. Nếu chênh lớn (nội bộ < 60% GA4), nêu ở
  "điểm nghẽn" rằng mọi phân tích theo kênh của bảng nội bộ đang dựa trên mẫu thiếu.
- ga4.channels (kênh) và ga4.landing (trang đáp) là căn cứ tốt nhất để nói kênh/nội dung nào đang kéo
  khách. Ưu tiên dùng chúng thay vì đoán.
- ga4.activeNow là số người online 30 phút gần nhất, mang tính tức thời — dùng làm màu sắc, ĐỪNG suy ra
  xu hướng cả tuần từ nó.
- Mọi tỉ lệ ghép GA4 với số nội bộ (vd sessions GA4 ÷ số người trả tiền) là ƯỚC LƯỢNG vì hai nguồn đo
  khác nhau — nếu nêu thì phải nói rõ là ước lượng.`;

export interface CmoDigestResult {
  text: string;
  /** Snapshot GA4 THÔ để caller lưu lại — xem chú thích ở route cron. */
  ga4: CmoSnapshot['ga4'];
}

export async function generateCmoDigestText(): Promise<CmoDigestResult> {
  const snapshot = await buildSnapshot();
  const text = await llmText({
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(snapshot),
    maxTokens: 1200,
  });
  return { text, ga4: snapshot.ga4 };
}
