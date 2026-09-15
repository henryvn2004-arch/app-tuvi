// lib/growth/collect-ext-metrics.ts
// ============================================================
// BẬC 1 — docs/GROWTH-DATA-PLAN.md — snapshot GA4 + Search Console vào
// `ext_metrics_daily`, thay Windsor.ai. KHÔNG tính lại số — chỉ đóng gói
// output của lib/analytics/ga4.ts / search-console.ts thành dòng kho.
//
// Best-effort TỪNG NGUỒN độc lập, đúng khuôn `lib/metrics/collect.ts`: GA4
// lỗi không được kéo GSC theo, và ngược lại. Gọi bởi
// app/api/cron/ext-metrics/route.ts (Vercel cron, 1 lần/ngày).
//
// Bậc 2 (Clarity) và bậc 3 (Meta Ads) CHƯA nằm trong file này — thêm sau,
// mỗi nguồn một hàm collect riêng, cùng ghi vào `ext_metrics_daily`.
// ============================================================

import { getGa4DailySnapshot } from '@/lib/analytics/ga4';
import { getSearchConsoleDaily } from '@/lib/analytics/search-console';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

/**
 * Tiền tệ báo cáo của property GA4 (áp cho `advertiserAdCost`, đã được GA4 tự
 * quy đổi về đơn vị này). GA4 Admin API đang TẮT trên project hiện tại (403
 * SERVICE_DISABLED, đo 2026-09-15) nên không tự tra được — set
 * `GA4_PROPERTY_CURRENCY` khi property không dùng VND. Đây là tiền tệ CỦA
 * GA4, khác hẳn tiền tệ ad account Meta ở bậc 3 (không được mặc định VND).
 */
const GA4_CURRENCY = process.env.GA4_PROPERTY_CURRENCY || 'VND';

interface ExtMetricRow {
  source: string;
  entity: string;
  stat_date: string;
  metrics: Record<string, unknown>;
  dims: Record<string, unknown>;
}

async function upsertExtMetrics(rows: ExtMetricRow[]): Promise<number> {
  if (!rows.length) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ext_metrics_daily?on_conflict=source,entity,stat_date`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`upsert ext_metrics_daily: ${await res.text()}`);
  return rows.length;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** Ngày VN cách hôm nay `offsetDays` ngày, dạng YYYY-MM-DD. */
const dayAgo = (offsetDays: number) => ymd(new Date(Date.now() - offsetDays * 864e5));

export interface SourceOutcome {
  ok: boolean;
  rows: number;
  /** Mô tả ngắn: khoảng ngày đã kéo, hoặc lý do bỏ qua/lỗi. */
  detail: string;
}

export interface CollectExtMetricsReport {
  ga4: SourceOutcome;
  gsc: SourceOutcome;
}

async function collectGa4(): Promise<SourceOutcome> {
  // Đúng HÔM QUA — khác GSC, GA4 không có độ trễ nhiều ngày nên không cần
  // cửa sổ lặp lại; dữ liệu hôm nay cũng có nhưng chưa đầy đủ tới cuối ngày.
  const date = dayAgo(1);
  try {
    const snap = await getGa4DailySnapshot(date);
    if (!snap) {
      return { ok: true, rows: 0, detail: `${date}: chưa cấu hình GA4 hoặc API lỗi (xem log [ga4])` };
    }
    const rows: ExtMetricRow[] = [
      {
        source: 'ga4',
        entity: '_total',
        stat_date: date,
        metrics: { sessions: snap.totalSessions, users: snap.totalUsers },
        dims: {},
      },
      ...snap.bySourceMedium.map((r) => ({
        source: 'ga4',
        entity: r.key,
        stat_date: date,
        metrics: { sessions: r.sessions, users: r.users },
        dims: { source_medium: r.key },
      })),
      // `campaignId` rỗng/'(not set)' vẫn GIỮ NGUYÊN — đó là dấu hiệu link
      // GA4↔Google Ads chưa bật (bậc 0), không phải lỗi cần lọc bỏ.
      ...snap.byGoogleAdsCampaign.map((r) => ({
        source: 'ga4_ads',
        entity: r.campaignId,
        stat_date: date,
        metrics: {
          sessions: r.sessions,
          cost_native: r.adCost,
          cost_currency: GA4_CURRENCY,
          clicks: r.adClicks,
          impressions: r.adImpressions,
        },
        dims: { campaign_name: r.campaignName },
      })),
    ];
    const saved = await upsertExtMetrics(rows);
    return { ok: true, rows: saved, detail: date };
  } catch (e) {
    return { ok: false, rows: 0, detail: `${date}: ${(e as Error).message}` };
  }
}

async function collectGsc(): Promise<SourceOutcome> {
  // Cửa sổ 6 ngày, LẶP LẠI mỗi lần chạy — bù độ trễ 2-3 ngày của GSC: ngày gần
  // nhất còn thiếu ở lượt gọi hôm nay được điền đủ ở lượt gọi vài ngày sau,
  // upsert theo (source, entity, stat_date) tự xử lý, không cần chờ.
  const from = dayAgo(6);
  const to = dayAgo(1); // kết thúc HÔM QUA — hôm nay chắc chắn chưa có gì.
  try {
    const daily = await getSearchConsoleDaily(from, to);
    if (!daily) {
      return { ok: true, rows: 0, detail: `${from}..${to}: chưa cấu hình Search Console hoặc API lỗi (xem log [gsc])` };
    }
    const rows: ExtMetricRow[] = daily
      .filter((r) => r.date)
      .map((r) => ({
        source: 'gsc',
        entity: '_total',
        stat_date: r.date,
        metrics: { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position },
        dims: {},
      }));
    const saved = await upsertExtMetrics(rows);
    return { ok: true, rows: saved, detail: `${from}..${to}` };
  } catch (e) {
    return { ok: false, rows: 0, detail: `${from}..${to}: ${(e as Error).message}` };
  }
}

export async function collectExtMetrics(): Promise<CollectExtMetricsReport> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Thiếu SUPABASE_URL / SUPABASE_SERVICE_KEY');
  // Song song — hai nguồn độc lập, một cái chậm/lỗi không được giữ cái kia.
  const [ga4, gsc] = await Promise.all([collectGa4(), collectGsc()]);
  return { ga4, gsc };
}

export function formatCollectExtMetricsReport(r: CollectExtMetricsReport): string {
  const line = (label: string, o: SourceOutcome) =>
    o.ok ? `✅ ${label} ${o.detail}: ${o.rows} dòng` : `❌ ${label} ${o.detail}`;
  return `📊 ext_metrics_daily\n${line('GA4', r.ga4)}\n${line('GSC', r.gsc)}`;
}
