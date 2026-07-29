// lib/analytics/search-console.ts
// ============================================================
// Đọc Google Search Console API — nguồn DUY NHẤT trả lời được "Google có thấy
// mấy trăm nghìn trang SEO của mình không", thứ mà GA4 không biết: GA4 chỉ đo
// người ĐÃ vào site, nên khi trang không hề xuất hiện trên kết quả tìm kiếm thì
// GA4 im lặng y như khi trang xuất hiện mà không ai bấm. Hai ca đó phải phân
// biệt được mới biết nên sửa nội dung hay sửa index.
//
// Dùng CHUNG service account với GA4 (./google-auth) — chỉ khác scope, KHÔNG
// thêm env mới. Việc tay đi kèm: thêm email service account vào Search Console
// (quyền Full — Restricted không đọc được Sitemaps API) + Enable "Google Search
// Console API" trong GCP.
//
// ⚠️ GIỚI HẠN PHẢI BIẾT TRƯỚC KHI ĐỌC SỐ:
//   • Dữ liệu Search Console TRỄ 2–3 ngày. Hỏi tới hôm nay thì mấy ngày cuối
//     luôn thiếu — đừng đọc đó thành "traffic đang sụt".
//   • Báo cáo "Lập chỉ mục trang" (Page Indexing/Coverage) KHÔNG có trong API,
//     Google chỉ để trên giao diện web. Nên `pagesWithImpressions` ở đây là số
//     trang TỪNG HIỆN trong kết quả tìm kiếm, KHÔNG phải số trang đã index —
//     một trang có thể được index mà chưa bao giờ đủ hạng để hiện ra. Nó là
//     CẬN DƯỚI của số trang đã index, và đọc đúng như vậy thì vẫn rất có ích.
// ============================================================

import { getGoogleAccessToken } from './google-auth';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const BASE = 'https://searchconsole.googleapis.com/webmasters/v3';

/** Giới hạn cứng của searchAnalytics.query. Chạm trần = số thật còn cao hơn. */
const MAX_ROWS = 25000;

/** Số dòng giữ lại trong snapshot sau khi đã sắp theo impressions. */
const TOP_N = 50;

export interface GscRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  /** Thứ hạng trung bình. Càng NHỎ càng tốt (1 = đầu trang 1). */
  position: number;
}

export interface GscSitemap {
  path: string;
  submitted: number;
  lastSubmitted: string | null;
  errors: number;
  warnings: number;
  isPending: boolean;
}

export interface GscSnapshot {
  /** Property thật sự đọc được (sc-domain:... hoặc https://...). */
  siteUrl: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number } | null;
  /** Sắp theo IMPRESSIONS giảm dần, không theo thứ tự mặc định của API — xem `topBy`. */
  topQueries: GscRow[];
  topPages: GscRow[];
  /**
   * Số trang RIÊNG BIỆT từng hiện trong kết quả tìm kiếm ở khoảng ngày này.
   * `capped=true` nghĩa là đã chạm trần 25.000 dòng của API — con số thật CAO
   * HƠN, phải đọc là "≥", đừng báo cáo như số chính xác.
   */
  pagesWithImpressions: { count: number; capped: boolean } | null;
  /** Như trên nhưng đếm TRUY VẤN riêng biệt. Xem `namedQueryTotals` để đọc đúng. */
  queriesWithImpressions: { count: number; capped: boolean } | null;
  /**
   * Tổng clicks/impressions cộng từ các dòng truy vấn ĐỌC ĐƯỢC TÊN.
   *
   * PHẢI so với `totals` mới đọc đúng: Google GIẤU hẳn những truy vấn quá hiếm
   * (ngưỡng ẩn danh, không công bố) — chúng vẫn được cộng vào `totals` nhưng
   * KHÔNG xuất hiện thành dòng nào. Nên `totals.impressions` trừ đi số này là
   * phần lưu lượng đến từ các truy vấn hiếm tới mức Google không cho biết là gì.
   *
   * Chênh lệch lớn KHÔNG phải lỗi đọc dữ liệu — nó tự nó là một kết luận: nội
   * dung đang hiện ra cho những truy vấn gần như không ai gõ. Đó chính là hình
   * dạng dữ liệu của một kho trang tổ hợp tự sinh.
   */
  namedQueryTotals: { clicks: number; impressions: number } | null;
  sitemaps: GscSitemap[];
  /** Ghi lại để người đọc biết mấy ngày cuối có thể còn thiếu do độ trễ. */
  range: { from: string; to: string };
}

interface ApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

async function gscFetch<T>(token: string, path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
    if (!res.ok) {
      // Cảnh báo chứ không nuốt im: 403 ở đây gần như luôn là "quên thêm service
      // account vào property" hoặc "quên Enable API" — hai thứ sửa được trong
      // vài phút NẾU biết. Im lặng thì lại đi dò như vụ base64.
      console.warn(`[gsc] ${path} lỗi ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[gsc] ${path} ném lỗi:`, (e as Error).message);
    return null;
  }
}

const toRow = (r: ApiRow): GscRow => ({
  key: r.keys?.[0] || '(không rõ)',
  clicks: Number(r.clicks || 0),
  impressions: Number(r.impressions || 0),
  ctr: Number(r.ctr || 0),
  position: Number(r.position || 0),
});

/**
 * Top N theo IMPRESSIONS. CỐ Ý tự sắp thay vì cắt top-N thẳng từ API:
 * searchAnalytics.query sắp mặc định theo CLICKS giảm dần và KHÔNG nhận tham số
 * orderBy. Trên site ít click, gần như mọi dòng đều 0 click nên phần đuôi trả về
 * theo thứ tự alphabet — cắt 25 dòng đầu ra một danh sách bắt đầu bằng "1976 12"
 * chứ không phải truy vấn nhiều người tìm nhất. Muốn biết NHU CẦU nằm ở đâu thì
 * phải sắp theo impressions.
 */
const topBy = (rows: ApiRow[] | undefined, n: number): GscRow[] =>
  (rows || [])
    .map(toRow)
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
    .slice(0, n);

type RowTotals = { clicks: number; impressions: number };

// reduce<RowTotals> tường minh: mọi field của ApiRow đều optional nên
// `{clicks:0,impressions:0}` cũng hợp lệ như một ApiRow, và TS chọn nhầm overload
// "accumulator cùng kiểu phần tử" → acc thành ApiRow với clicks có thể undefined.
const sumRows = (rows: ApiRow[]): RowTotals =>
  rows.reduce<RowTotals>(
    (acc, r) => ({
      clicks: acc.clicks + Number(r.clicks || 0),
      impressions: acc.impressions + Number(r.impressions || 0),
    }),
    { clicks: 0, impressions: 0 },
  );

/**
 * Chọn property để đọc. CỐ Ý tự dò thay vì bắt khai bằng env: Search Console có
 * hai kiểu property (Domain `sc-domain:x` và URL-prefix `https://x/`) cho cùng
 * một site, khai sai một ký tự là 403 mà thông điệp lỗi không nói vì sao. Ưu
 * tiên Domain vì nó gộp mọi subdomain + cả http/https.
 */
async function pickSite(token: string, hint: string): Promise<string | null> {
  const data = await gscFetch<{ siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }> }>(
    token,
    '/sites',
  );
  const sites = (data?.siteEntry || [])
    .map((s) => s.siteUrl || '')
    .filter((u) => u && !u.startsWith('sc-set:'));
  if (!sites.length) {
    console.warn('[gsc] service account chưa được thêm vào property nào — kiểm tra Cài đặt → Người dùng và quyền.');
    return null;
  }
  const host = hint.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
  return (
    sites.find((u) => u === `sc-domain:${host}`) ||
    sites.find((u) => u.startsWith('sc-domain:') && u.includes(host)) ||
    sites.find((u) => u.includes(host)) ||
    sites[0]
  );
}

/**
 * Snapshot Search Console cho [from, to] (YYYY-MM-DD, cả hai đầu inclusive).
 * Best-effort từng phần: mỗi truy vấn hỏng độc lập, phần còn lại vẫn dùng được.
 * Trả null khi chưa cấu hình được gì cả (không có token / không có property).
 */
export async function getSearchConsoleSnapshot(
  from: string,
  to: string,
  siteHint = 'tuviminhbao.com',
): Promise<GscSnapshot | null> {
  const token = await getGoogleAccessToken(SCOPE);
  if (!token) return null;

  const siteUrl = await pickSite(token, siteHint);
  if (!siteUrl) return null;
  const site = encodeURIComponent(siteUrl);

  const query = (dimensions: string[], rowLimit: number) =>
    gscFetch<{ rows?: ApiRow[] }>(token, `/sites/${site}/searchAnalytics/query`, {
      startDate: from,
      endDate: to,
      ...(dimensions.length ? { dimensions } : {}),
      rowLimit,
    });

  // Kéo TOÀN BỘ dòng cho cả hai chiều rồi mới cắt top-N ở client. Trước đây có
  // thêm 2 lượt gọi lấy sẵn 25 dòng, nhưng chúng nhận về thứ tự mặc định theo
  // clicks nên vô dụng trên site ít click (xem `topBy`) — bỏ đi, lấy top-N từ
  // chính bản đầy đủ. Ít hơn 2 lượt gọi mạng mà dữ liệu giàu hơn.
  const [totalsRes, allQueriesRes, allPagesRes, sitemapsRes] = await Promise.all([
    query([], 1),
    // Đếm truy vấn/trang riêng biệt: lấy tối đa rồi đếm dòng. Không có metric
    // "số truy vấn"/"số trang" nào sẵn trong API, đây là cách duy nhất.
    query(['query'], MAX_ROWS),
    query(['page'], MAX_ROWS),
    gscFetch<{ sitemap?: Array<Record<string, unknown>> }>(token, `/sites/${site}/sitemaps`),
  ]);

  const t = totalsRes?.rows?.[0];
  const allQueries = allQueriesRes?.rows;
  const allPages = allPagesRes?.rows;

  return {
    siteUrl,
    totals: t
      ? {
          clicks: Number(t.clicks || 0),
          impressions: Number(t.impressions || 0),
          ctr: Number(t.ctr || 0),
          position: Number(t.position || 0),
        }
      : totalsRes
        ? { clicks: 0, impressions: 0, ctr: 0, position: 0 }
        : null,
    topQueries: topBy(allQueries, TOP_N),
    topPages: topBy(allPages, TOP_N),
    pagesWithImpressions: allPages ? { count: allPages.length, capped: allPages.length >= MAX_ROWS } : null,
    queriesWithImpressions: allQueries
      ? { count: allQueries.length, capped: allQueries.length >= MAX_ROWS }
      : null,
    namedQueryTotals: allQueries ? sumRows(allQueries) : null,
    sitemaps: (sitemapsRes?.sitemap || []).map((s) => {
      // `contents[].indexed` từng tồn tại nhưng Google đã bỏ (luôn trả 0) — CỐ Ý
      // không đọc, bày một cột 0 vĩnh viễn chỉ khiến người xem tưởng chưa index gì.
      const contents = (s.contents as Array<{ submitted?: string | number }> | undefined) || [];
      return {
        path: String(s.path || ''),
        submitted: contents.reduce((n, c) => n + Number(c.submitted || 0), 0),
        lastSubmitted: (s.lastSubmitted as string) || null,
        errors: Number(s.errors || 0),
        warnings: Number(s.warnings || 0),
        isPending: Boolean(s.isPending),
      };
    }),
    range: { from, to },
  };
}
