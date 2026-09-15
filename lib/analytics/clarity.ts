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
// 🔑 CHƯA VERIFY được response thật — sandbox dev KHÔNG gọi được `clarity.ms`
// (domain bị chặn ở egress proxy, xác nhận 2026-09-15, kể cả có token thật).
// Tài liệu công khai chỉ xác nhận CHẮC field của metric "Traffic"
// (totalSessionCount/totalBotSessionCount, thấy lặp lại giống nhau ở nhiều
// dòng ví dụ). Metric khác (ScrollDepth/RageClickCount/DeadClickCount…) CHƯA
// có field chắc chắn — CỐ Ý không tự bịa tên field (đúng luật "nghi sai thì
// ghi lại, không sửa mò"). `raw` giữ nguyên toàn bộ response để đối chiếu
// bằng dữ liệu thật ở lượt cron đầu tiên, rồi vá phần parse còn thiếu sau.
// ============================================================

const BASE = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const TOKEN = process.env.CLARITY_API_TOKEN || '';

interface ClarityMetricBlock {
  metricName: string;
  information?: Array<Record<string, unknown>>;
}

export interface ClaritySnapshot {
  /** Field ĐÃ verify qua tài liệu (metric "Traffic"). null = không có dòng nào. */
  totalSessions: number | null;
  totalBotSessions: number | null;
  /** Toàn bộ response, KHÔNG qua parse — nguồn để vá thêm field sau. */
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

    const traffic = blocks.find((b) => b.metricName === 'Traffic');
    const rows = traffic?.information || [];
    const sum = (key: string) => rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);

    return {
      totalSessions: rows.length ? sum('totalSessionCount') : null,
      totalBotSessions: rows.length ? sum('totalBotSessionCount') : null,
      raw: blocks,
    };
  } catch (e) {
    console.warn('[clarity] ném lỗi:', (e as Error).message);
    return null;
  }
}
