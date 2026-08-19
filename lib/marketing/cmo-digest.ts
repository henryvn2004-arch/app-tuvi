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
import { getSearchConsoleSnapshot, type GscSnapshot } from '@/lib/analytics/search-console';

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
  /**
   * Số tài khoản THẬT tạo trong tuần, đếm thẳng auth.users (marketing_signup_truth).
   * Mỏ neo độc lập với beacon client: `funnel.signups` đi qua user_attribution,
   * vốn chỉ có khi /api/track nhận được event đăng nhập — hụt một mắt xích là
   * bậc "đăng ký" tụt về 0 trong im lặng và đọc y hệt một tin xấu có thật.
   */
  signupTruthThisWeek: unknown;
  signupTruthPrevWeek: unknown;
  /**
   * Phân loại chất lượng lưu lượng (traffic_quality). Mọi con số "khách ghé"
   * khác trong snapshot đều đếm THÔ, mà GA4 cho thấy 78% khách đến từ các thành
   * phố data center với 4 giây tương tác — tức phần lớn là máy. Không có khối
   * này thì digest lấy mẫu số bot chia cho tử số người và kết luận "conversion
   * thấp", trong khi thật ra là "chưa có ai vào".
   */
  trafficQuality: unknown;
  /**
   * GA4 7 ngày qua — null khi chưa cấu hình env hoặc API lỗi (digest tự nói thiếu).
   * Kèm số nội bộ cùng kỳ ở CẢ HAI dạng: `internalVisitors` (thô) và
   * `internalVisitorsHuman` (đã trừ đội máy). Đưa cả hai vì GA4 đo ở phía Google
   * nên KHÔNG lọc bot được — chỉ có bản thô mới so được cùng đơn vị với nó, còn
   * bản human mới là số khách thật để nói ra miệng.
   */
  ga4: (Ga4Breakdown & { internalVisitors: unknown; internalVisitorsHuman: unknown }) | null;
  /**
   * Search Console 28 ngày (kết thúc TRƯỚC 3 ngày vì dữ liệu GSC trễ 2–3 ngày).
   * Cửa sổ dài hơn GA4 có chủ đích: index và thứ hạng nhúc nhích theo tuần chứ
   * không theo ngày, lấy 7 ngày trên một site ít traffic thì phần lớn ô sẽ là 0
   * và đọc thành "không có gì" trong khi thực ra chỉ là mẫu quá mỏng.
   */
  gsc: GscSnapshot | null;
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
    revenueThisWeek, revenuePrevWeek, margin, channelHealth, atRisk,
    signupTruthThisWeek, signupTruthPrevWeek, trafficQuality, ga4, gsc,
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
    // Số đăng ký THẬT + mốc bật tracking. Xem chú thích ở CmoSnapshot.
    callRpc('marketing_signup_truth', { p_from: d(7), p_to: d(0) }),
    callRpc('marketing_signup_truth', { p_from: d(14), p_to: d(7) }),
    // Bao nhiêu trong số "khách" là người thật. Xem chú thích ở CmoSnapshot.
    callRpc('traffic_quality', { p_from: d(7), p_to: d(0) }),
    // GA4 là nguồn DUY NHẤT thấy được organic/ads/social; thiếu nó thì digest chỉ
    // nhìn được phần traffic đã chạm track.js và dễ kết luận sai về kênh.
    // Best-effort: hỏng → null, không kéo sập cả digest.
    getGa4Breakdown(day(7), day(0)).catch(() => null),
    // Search Console: nguồn DUY NHẤT nói được site có được TÌM THẤY hay không.
    // GA4 chỉ đo người đã vào — trang không hề hiện trên kết quả tìm kiếm và
    // trang hiện mà không ai bấm nhìn giống hệt nhau qua GA4. Kết thúc trước 3
    // ngày vì dữ liệu GSC luôn trễ 2–3 ngày; lấy tới hôm nay là tự tạo ra một
    // cái dốc đi xuống giả ở cuối. Best-effort như GA4.
    getSearchConsoleSnapshot(day(31), day(3)).catch(() => null),
  ]);

  const funnel = funnelThisWeek as { visitors?: unknown; visitors_human?: unknown };
  return {
    funnelThisWeek, funnelPrevWeek, sourcesThisWeek, engagement,
    revenueThisWeek, revenuePrevWeek, margin, channelHealth,
    atRiskCount: Array.isArray(atRisk) ? atRisk.length : 0,
    signupTruthThisWeek, signupTruthPrevWeek, trafficQuality,
    ga4: ga4
      ? {
          ...ga4,
          internalVisitors: funnel?.visitors ?? null,
          internalVisitorsHuman: funnel?.visitors_human ?? null,
        }
      : null,
    gsc,
  };
}

const SYSTEM_PROMPT = `Bạn là CMO quân sư của tuviminhbao.com (app Tử Vi Đẩu Số, Việt Nam). Mỗi ngày bạn nhận
1 snapshot dữ liệu marketing (JSON) và viết bản tóm tắt ngắn gọn kiểu "CEO brief" gửi qua Telegram
cho founder. Yêu cầu:
- Tiếng Việt, thẳng vào trọng tâm, KHÔNG chào hỏi/mở đầu dài dòng.
- 3 phần rõ ràng, mỗi phần tối đa 3 gạch đầu dòng NGẮN: "📈 Điểm sáng", "⚠️ Điểm nghẽn", "💡 Đề xuất".
- So sánh tuần này (funnelThisWeek/revenueThisWeek) với tuần trước (funnelPrevWeek/revenuePrevWeek)
  để nêu xu hướng — CHỈ nêu số có trong dữ liệu, KHÔNG bịa số.
- LUẬT SỐ NHỎ (áp cho MỌI khối): chỉ được nêu phần trăm tăng/giảm khi mẫu ≥ 30 ở CẢ HAI kỳ. Phễu
  hiện cỡ vài người mỗi tuần, nên "tăng 50%" của 2→3 người là câu nói dối bằng số thật. Dưới ngưỡng
  đó: nêu số tuyệt đối kèm số kỳ trước, hết.
- Nếu dữ liệu quá ít để kết luận (vd 0 hoặc gần 0 ở cả 2 tuần), NÓI THẲNG "chưa đủ dữ liệu" thay vì
  suy diễn.
- Tổng độ dài dưới 350 từ.

VỀ SỐ ĐĂNG KÝ — đọc sai chỗ này là báo động giả cho founder:
- "signupTruth*.accounts" là SỰ THẬT (đếm thẳng bảng tài khoản). "funnel*.signups" đi qua lớp đo
  attribution nên có thể HỤT. Khi nói về đăng ký, LUÔN lấy accounts làm số chính.
- accounts > attributed nghĩa là hệ thống ĐANG ĐO HỤT — nêu ở "điểm nghẽn" như một lỗi ĐO LƯỜNG,
  và TUYỆT ĐỐI không được viết thành "không ai đăng ký" hay "sản phẩm có vấn đề".
- Chỉ khi accounts = 0 mới được nói là thật sự không có ai đăng ký.

VỀ TUỔI DỮ LIỆU ("signupTruthThisWeek.tracking_since" = event sớm nhất từng ghi):
- Nếu mốc đó nằm SAU thời điểm bắt đầu tuần trước, thì tuần trước KHÔNG có dữ liệu đầy đủ, và mọi
  phép so tuần này/tuần trước trên số suy từ events (visitors, activated, returned, DAU/WAU/MAU)
  đang so với một số 0 giả.
- Trong trường hợp đó CẤM gọi mức tăng là tăng trưởng hay "điểm sáng". Nói thẳng một câu rằng
  tracking mới bật nên chưa có nền so sánh. Doanh thu và số tài khoản KHÔNG dính lỗi này (đọc từ
  bảng giao dịch/tài khoản, có từ trước) nên vẫn so bình thường được.

VỀ KHỐI "trafficQuality" — ĐỌC KHỐI NÀY TRƯỚC MỌI KHỐI KHÁC, nó quyết định cách đọc tất cả phần còn lại:
- Site đang bị một ĐỘI MÁY quét đều mỗi ngày. Chúng KHÔNG tự khai là bot nên phải bắt bằng hành vi:
  "fleet_bot" là số lượt đã bắt được, "fleet_uas" liệt kê đích danh chuỗi User-Agent của chúng.
  "known_bot" là loại tự khai (Ahrefs, GPTBot…).
- "human" = khách THẬT còn lại sau khi trừ fleet_bot và known_bot. ĐÂY là con số khách DUY NHẤT được
  phép gọi là người. "total" là số THÔ gồm cả máy — cấm dùng nó làm mẫu số cho bất kỳ tỉ lệ nào, và
  cấm nêu nó như lưu lượng của site.
- Trong "human" còn chia tiếp theo CHẤT LƯỢNG: engaged (có tương tác thật hoặc quay lại ngày khác) /
  browsed (xem vài trang) / drive_by (đúng 1 lượt rồi đi). Ba nhóm cộng lại đúng bằng "human". Đây là
  thang chất lượng của NGƯỜI THẬT — TUYỆT ĐỐI không đọc drive_by thành máy, máy đã bị tách ra rồi.
- Khi nêu tỉ lệ chuyển đổi, mẫu số LUÔN là "human" và phải nói rõ đã lọc máy. Chia cho "total" là tự
  dựng ra một kết luận xấu về sản phẩm bằng một phép chia sai.
- ua_coverage.with_ua = 0 nghĩa là CHƯA thu được User-Agent nào trong khoảng này. Khi đó fleet_bot và
  known_bot = 0 là "chưa đo được", KHÔNG phải "không có bot" — cấm đọc thành tin tốt.

VỀ SỐ KHÁCH VÀ NGƯỜI DÙNG HOẠT ĐỘNG — chỗ này ĐÃ báo động giả một lần, đọc kỹ:
- funnel*.visitors là số THÔ (gồm máy). Số phải dùng là funnel*.visitors_human; funnel*.visitors_bot
  cho biết đã trừ đi bao nhiêu.
- engagement mang ĐỦ CẢ HAI bản: wau/mau/dau_* là THÔ, còn wau_human/mau_human/dau_*_human đã lọc máy.
  LUÔN dùng bản _human. Đội máy chạy phập phù nên số thô nhảy hàng chục phần trăm mỗi tuần trong khi
  người thật đi ngang: đã có một bản digest báo "WAU giảm 38,65%" trong khi người thật là 87 vs 88.
- So giữ chân bằng wau_human vs wau_prev_human. TUYỆT ĐỐI không so dau_today với dau_yesterday —
  digest chạy lúc 8h sáng nên dau_today mới đếm được một phần của ngày, luôn thấp, và luôn đọc thành
  "đang sụt".
- mau_prev_human = 0 nghĩa là chưa đủ 60 ngày dữ liệu — bỏ qua, đừng tính % MAU.

VỀ TIỀN — chỉ MỘT con số trong snapshot là tiền thật:
- revenue*.real_vnd là tiền đã đối chiếu. revenue*.estimated_vnd suy ra từ số Lượng, phải gọi đúng
  tên là ước lượng.
- margin.chat_revenue_vnd KHÔNG phải doanh thu: nó là số Lượng đã TIÊU nhân đơn giá. Phần lớn Lượng
  đang lưu hành là do hệ thống TẶNG (quà đăng ký, thưởng giới thiệu), nên nêu con số đó như "doanh
  thu" là báo tin mừng giả. real_vnd = 0 thì phải nói thẳng là chưa có giao dịch nào, kể cả khi
  chat_revenue_vnd lớn.
- margin.chat_cost_vnd = 0 KHÔNG có nghĩa rail miễn phí: bảng chi phí chỉ đo Anthropic, mà rail đang
  chạy Gemini. Cấm suy ra "biên lợi nhuận 100%".

VỀ KHỐI "ga4" (Google Analytics 4, 7 ngày qua) — đọc kỹ, đây là chỗ dễ kết luận sai nhất:
- ga4 = null nghĩa là CHƯA nối được GA4. Khi đó nói thẳng một câu "chưa đọc được GA4" và chỉ luận
  trên số nội bộ; TUYỆT ĐỐI không đoán lưu lượng.
- ga4.sessions đo ở PHÍA GOOGLE nên KHÔNG lọc được đội máy lẫn CI, và không có bản _human nào.
  TUYỆT ĐỐI không lấy ga4.sessions làm số khách: ngày 17/08 nó báo 1.831 phiên trong khi người thật
  là 98 — chênh ~19 lần, đủ để bóp mọi tỉ lệ chuyển đổi thành vô nghĩa.
- ga4.internalVisitorsHuman là số khách THẬT đo được nội bộ; ga4.internalVisitors là bản thô cùng kỳ
  (để so cùng đơn vị với GA4). Chênh lệch GA4 vs nội bộ gồm CẢ phần đo hụt LẪN phần máy mà GA4 không
  lọc được — không đủ căn cứ để gọi một chiều là "đo hụt", đừng kết luận.
- ga4.channels (kênh) và ga4.landing (trang đáp) là thứ DUY NHẤT chỉ GA4 thấy được — dùng GA4 đúng
  vào việc này, đừng dùng nó để đếm người.
- Nếu ga4.landing thấy /xem-tuoi.html và /xem-lam-an.html cao gần bằng nhau (mỗi trang vài trăm), đó
  là dấu vết CI Playwright chạy vào prod, KHÔNG phải người thật — nói thẳng, đừng đem khoe là traffic.
- ga4.activeNow là số người online 30 phút gần nhất, mang tính tức thời — dùng làm màu sắc, ĐỪNG suy ra
  xu hướng cả tuần từ nó.
- Mọi tỉ lệ ghép GA4 với số nội bộ (vd sessions GA4 ÷ số người trả tiền) là ƯỚC LƯỢNG vì hai nguồn đo
  khác nhau — nếu nêu thì phải nói rõ là ước lượng.

VỀ KHỐI "gsc" (Google Search Console, 28 ngày, KẾT THÚC TRƯỚC 3 NGÀY vì dữ liệu GSC luôn trễ):
- gsc = null nghĩa là chưa nối được Search Console → nói thẳng một câu, KHÔNG suy đoán gì về SEO.
- Đây là nguồn DUY NHẤT cho biết site có được TÌM THẤY không. GA4 chỉ đo người đã vào, nên "không ai
  tìm thấy" và "tìm thấy mà không ai bấm" nhìn y hệt nhau qua GA4 — chỉ gsc phân biệt được:
  impressions thấp = không ai thấy (vấn đề index/thứ hạng); impressions cao mà clicks thấp = có thấy
  nhưng tiêu đề/mô tả không mời gọi (vấn đề nội dung). HAI BỆNH NÀY CHỮA NGƯỢC NHAU, đừng nhầm.
- gsc.pagesWithImpressions.count = số trang RIÊNG BIỆT từng hiện trong kết quả tìm kiếm. Site có hàng
  trăm nghìn trang SEO, nên con số này so với gsc.sitemaps[].submitted là chỉ dấu quan trọng nhất về
  sức khoẻ SEO. Nếu capped=true thì phải đọc là "≥ count", KHÔNG được nêu như số chính xác.
- gsc.totals.position là thứ hạng trung bình: càng NHỎ càng tốt (1 = đầu trang 1). Đừng đọc ngược.
- gsc.topQueries/topPages đã được sắp theo IMPRESSIONS giảm dần, tức theo NHU CẦU tìm kiếm thật.
  Một dòng thứ hạng rất tốt (position 1-5) mà impressions chỉ 1-2 KHÔNG phải thành tích: nó nghĩa là
  đứng đầu cho một truy vấn gần như không ai gõ. Ngược lại, dòng impressions cao mà position 50-100 là
  nhu cầu CÓ THẬT đang bị bỏ lỡ — đó mới là chỗ đáng đề xuất đầu tư. Khi nêu một truy vấn, LUÔN kèm
  impressions của nó để founder biết nó lớn cỡ nào; nêu trần trụi mỗi thứ hạng là gây hiểu nhầm.
- So gsc.namedQueryTotals.impressions với gsc.totals.impressions: phần chênh là lưu lượng đến từ những
  truy vấn hiếm tới mức Google ẩn danh, không cho biết là gì. Nếu phần ẩn danh chiếm ĐA SỐ, nói thẳng
  rằng site đang hiện ra chủ yếu cho các truy vấn siêu hiếm — dấu hiệu kho trang tổ hợp tự sinh nhắm
  vào nhu cầu không tồn tại. Đây là kết luận về CHIẾN LƯỢC nội dung, KHÔNG phải lỗi dữ liệu, và KHÔNG
  được diễn đạt thành "thiếu dữ liệu" hay "GSC lỗi".
- gsc.queriesWithImpressions.count = số truy vấn riêng biệt đọc được tên. Con số này nhỏ trong khi
  impressions tổng lớn cũng chỉ đúng một chuyện đó — đừng đọc thành "ít người tìm".
- KHÔNG kết luận "Google chưa index" chỉ vì impressions thấp — báo cáo Lập chỉ mục KHÔNG có trong API,
  nên số ở đây là cận dưới. Nói "chưa hiện ra trong tìm kiếm" thì đúng, nói "chưa được index" là vượt
  quá dữ liệu.
- Ngày cuối trong khoảng vẫn có thể thiếu do độ trễ — TUYỆT ĐỐI không đọc phần đuôi thành "đang sụt".`;

export interface CmoDigestResult {
  text: string;
  /** Snapshot GA4 THÔ để caller lưu lại — xem chú thích ở route cron. */
  ga4: CmoSnapshot['ga4'];
  /** Snapshot Search Console THÔ, lưu cùng lý do với ga4. */
  gsc: CmoSnapshot['gsc'];
}

export async function generateCmoDigestText(): Promise<CmoDigestResult> {
  const snapshot = await buildSnapshot();
  const text = await llmText({
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(snapshot),
    maxTokens: 1200,
  });
  return { text, ga4: snapshot.ga4, gsc: snapshot.gsc };
}
