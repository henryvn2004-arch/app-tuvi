// lib/analytics/clarity.ts
// ============================================================
// Đọc Microsoft Clarity Data Export API — rage click/dead click/scroll depth,
// bổ sung chất lượng landing mà GA4/GSC không thấy (chúng chỉ đo có vào/ra,
// không đo hành vi thất vọng). Xem docs/GROWTH-DATA-PLAN.md bậc 2.
//
// ⚠️ GIỚI HẠN CỨNG PHẢI BIẾT TRƯỚC KHI GỌI:
//   • Tối đa 10 request/project/NGÀY — API trả 429 nếu vượt. Gọi ĐÚNG 1
//     lần/lượt cron, KHÔNG retry khi lỗi (đợi lượt cron ngày mai).
//   • Dữ liệu chỉ phủ 1–3 NGÀY GẦN NHẤT tính từ lúc gọi (rolling window theo
//     giờ gọi, KHÔNG phải một ngày lịch VN sạch) — khác hẳn GA4/GSC/Meta Ads
//     ở file khác (query theo [from,to] ngày lịch). Đừng đọc `stat_date` của
//     dòng Clarity như một ngày lịch chính xác.
//   • Tối đa 3 dimension/request, không phân trang, trần 1.000 dòng.
//
// ✅ ĐÃ VERIFY bằng response THẬT — lượt cron đầu tiên (2026-09-16 05:00 VN,
// `ext_metrics_daily` source='clarity' stat_date=2026-09-15). Field field
// dưới đây lấy nguyên tên/hình dạng từ response đó, không suy đoán:
//   • Traffic: {distinctUserCount, totalSessionCount, totalBotSessionCount,
//     pagesPerSessionPercentage} — đúng như tài liệu đã xác nhận trước đó.
//   • RageClickCount/DeadClickCount: information là 1 dòng
//     {subTotal, pagesViews, sessionsCount, sessionsWithMetricPercentage,
//     sessionsWithoutMetricPercentage} — subTotal là SỐ LƯỢT CLICK, không
//     phải số session.
//   • ScrollDepth: information là 1 dòng {averageScrollDepth} — SỐ TRUNG
//     BÌNH (0-100), không có cấu trúc session-count như hai metric trên.
// Field khác thấy trong response (ExcessiveScroll/QuickbackClick/
// ScriptErrorCount/ErrorClickCount/EngagementTime/Browser/Device/OS/
// Country/PageTitle/ReferrerUrl/PopularPages) CHƯA parse — `raw` vẫn giữ
// nguyên toàn bộ response nếu cần đọc thêm sau, không phải vì nghi ngờ tên
// field (đã có bằng chứng thật, khác tình trạng "chưa verify" trước đây).
// ============================================================

const BASE = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const TOKEN = process.env.CLARITY_API_TOKEN || '';

interface ClarityMetricBlock {
  metricName: string;
  information?: Array<Record<string, unknown>>;
}

export interface ClaritySnapshot {
  totalSessions: number | null;
  totalBotSessions: number | null;
  /** Số lượt rage click (subTotal, KHÔNG phải số session). null = metric vắng mặt. */
  rageClickCount: number | null;
  /** % session có ít nhất 1 rage click. */
  rageClickSessionPct: number | null;
  deadClickCount: number | null;
  deadClickSessionPct: number | null;
  /** Trung bình % cuộn trang (0-100). */
  avgScrollDepth: number | null;
  /** Toàn bộ response, KHÔNG qua parse — field chưa parse (Excessive Scroll,
   * Quickback Click, Script/Error Click, breakdown Browser/Device/...) vẫn
   * đọc được ở đây khi cần, không phải vì nghi ngờ tên field. */
  raw: ClarityMetricBlock[];
}

export async function getClaritySnapshot(): Promise<ClaritySnapshot | null> {
  if (!TOKEN) return null;
  try {
    const res = await fetch(`${BASE}?numOfDays=1`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      // Cảnh báo ra log thay vì nuốt im — 429 nghĩa là đã chạm trần 10
      // request/ngày (kiểm có ai khác đang gọi cùng token), 401/403 nghĩa là
      // token sai/hết hiệu lực.
      console.warn(`[clarity] lỗi ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const blocks = (await res.json()) as ClarityMetricBlock[];

    const metric = (name: string) => blocks.find((b) => b.metricName === name)?.information || [];
    const sum = (rows: Array<Record<string, unknown>>, key: string) =>
      rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
    // sessionsWithMetricPercentage/averageScrollDepth là số ĐÃ TÍNH SẴN của
    // Clarity cho cửa sổ gọi — lấy dòng ĐẦU (numOfDays=1 luôn trả đúng 1
    // dòng/metric), không cộng dồn percentage qua nhiều dòng như subTotal.
    const firstNum = (rows: Array<Record<string, unknown>>, key: string) =>
      rows.length ? Number(rows[0][key] ?? 0) : null;

    const traffic = metric('Traffic');
    const rage = metric('RageClickCount');
    const dead = metric('DeadClickCount');
    const scroll = metric('ScrollDepth');

    return {
      totalSessions: traffic.length ? sum(traffic, 'totalSessionCount') : null,
      totalBotSessions: traffic.length ? sum(traffic, 'totalBotSessionCount') : null,
      rageClickCount: rage.length ? sum(rage, 'subTotal') : null,
      rageClickSessionPct: firstNum(rage, 'sessionsWithMetricPercentage'),
      deadClickCount: dead.length ? sum(dead, 'subTotal') : null,
      deadClickSessionPct: firstNum(dead, 'sessionsWithMetricPercentage'),
      avgScrollDepth: firstNum(scroll, 'averageScrollDepth'),
      raw: blocks,
    };
  } catch (e) {
    console.warn('[clarity] ném lỗi:', (e as Error).message);
    return null;
  }
}
