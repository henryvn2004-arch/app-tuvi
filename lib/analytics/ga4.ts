// lib/analytics/ga4.ts
// ============================================================
// Đọc "sessions" THẬT từ GA4 Data API để thay 'visitors' của marketing_funnel
// (RPC cũ suy visitors từ page_view nội bộ — chỉ thấy traffic đã chạm track.js,
// thiếu hẳn organic/ads/social đo qua GA4). Auth bằng service-account JWT
// (RS256, self-signed, KHÔNG cần thư viện googleapis). Best-effort: thiếu env
// hoặc lỗi API → trả null, caller tự fallback về số nội bộ, KHÔNG chặn dashboard.
// ============================================================

import { getGoogleAccessToken } from './google-auth';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;

// Auth service-account nằm ở ./google-auth (dùng CHUNG với Search Console —
// cùng một bộ credential, chỉ khác scope). Trước đây khối JWT/token nằm ngay
// trong file này; tách ra để không có hai bản trôi khỏi nhau.
const GA4_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const getAccessToken = () => getGoogleAccessToken(GA4_SCOPE);

interface Ga4ReportRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

// Gọi Data API. `realtime` đổi sang :runRealtimeReport (30 phút gần nhất — endpoint
// KHÁC, không nhận dateRanges). Lỗi → null, caller tự xử; KHÔNG throw vì mọi thứ ở
// đây chỉ làm giàu dashboard, không được phép kéo sập trang admin. Cảnh báo ra log
// để lỗi cấu hình/quyền lộ ra thay vì im lặng như bug base64 vừa rồi.
async function runReport(
  token: string,
  body: Record<string, unknown>,
  realtime = false,
): Promise<Ga4ReportRow[] | null> {
  const method = realtime ? 'runRealtimeReport' : 'runReport';
  try {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[ga4] ${method} lỗi ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data = (await res.json()) as { rows?: Ga4ReportRow[] };
    return data.rows || [];
  } catch (e) {
    console.warn(`[ga4] ${method} ném lỗi:`, (e as Error).message);
    return null;
  }
}

const num = (r: Ga4ReportRow, i: number) => Number(r.metricValues?.[i]?.value || 0);

// Tổng sessions GA4 trong [fromDate, toDate] (YYYY-MM-DD, cả 2 đầu inclusive
// theo quy ước GA4 Data API). Trả null nếu chưa cấu hình/env thiếu/API lỗi.
export async function getGa4Sessions(fromDate: string, toDate: string): Promise<number | null> {
  if (!PROPERTY_ID) return null;
  const token = await getAccessToken();
  if (!token) return null;
  const rows = await runReport(token, {
    dateRanges: [{ startDate: fromDate, endDate: toDate }],
    metrics: [{ name: 'sessions' }],
  });
  if (!rows) return null;
  return rows[0] ? num(rows[0], 0) : 0;
}

export interface Ga4Row {
  key: string;
  sessions: number;
  users: number;
}

export interface Ga4Breakdown {
  sessions: number | null;
  channels: Ga4Row[];
  landing: Ga4Row[];
  /** Người đang online 30 phút gần nhất — chiều DUY NHẤT thật sự "realtime". */
  activeNow: number | null;
}

// Nhiều chiều GA4 cho panel "GA4 vs nội bộ": tổng sessions + kênh + landing page
// + số người đang online. Vì sao cần: `track.js` chỉ thấy traffic đã chạm JS trên
// site, nên bảng Sources/Traffic nội bộ luôn hụt so với thực tế; bày cạnh nhau thì
// khoảng hụt đó thành con số đọc được thay vì phải đoán.
//
// 4 report chạy SONG SONG trên CÙNG một access token (token cache sẵn trong
// module) — mỗi phần hỏng độc lập, phần còn lại vẫn dùng được.
export async function getGa4Breakdown(fromDate: string, toDate: string): Promise<Ga4Breakdown | null> {
  if (!PROPERTY_ID) return null;
  const token = await getAccessToken();
  if (!token) return null;

  const range = { dateRanges: [{ startDate: fromDate, endDate: toDate }] };
  const byDim = (dimension: string, limit: number) => ({
    ...range,
    dimensions: [{ name: dimension }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit,
  });

  const [totalRows, channelRows, landingRows, realtimeRows] = await Promise.all([
    runReport(token, { ...range, metrics: [{ name: 'sessions' }] }),
    runReport(token, byDim('sessionDefaultChannelGroup', 10)),
    runReport(token, byDim('landingPage', 15)),
    runReport(token, { metrics: [{ name: 'activeUsers' }] }, true),
  ]);

  const toRows = (rows: Ga4ReportRow[] | null): Ga4Row[] =>
    (rows || []).map((r) => ({
      key: r.dimensionValues?.[0]?.value || '(không rõ)',
      sessions: num(r, 0),
      users: num(r, 1),
    }));

  return {
    sessions: totalRows ? (totalRows[0] ? num(totalRows[0], 0) : 0) : null,
    channels: toRows(channelRows),
    landing: toRows(landingRows),
    activeNow: realtimeRows ? (realtimeRows[0] ? num(realtimeRows[0], 0) : 0) : null,
  };
}
