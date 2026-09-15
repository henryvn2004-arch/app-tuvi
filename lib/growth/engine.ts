// lib/growth/engine.ts
// ============================================================
// Bậc 4 (Tầng 2 Nối + Tầng 3 Engine) của docs/GROWTH-DATA-PLAN.md. Nguồn số
// DUY NHẤT cho CAC/CPA/ROAS/biên đóng góp có ads — LLM ở tầng phân phối
// (cmo-digest) chỉ được ĐỌC LẠI output của file này, không tự tính.
//
// KHÔNG tính lại doanh thu/chi phí theo tool — đó là việc của
// lib/marketing/tool-profit.ts (PR #865). File này CHỈ cộng thêm biến ads
// spend mà tool-profit chưa biết, và join nó với phễu nội bộ THEO CAMPAIGN
// (RPC campaign_funnel_daily, _patches/migration-campaign-funnel-daily.sql).
//
// "campaign_daily" của plan §4 được dựng ở TẦNG NÀY (TypeScript), không phải
// một Postgres VIEW: join cần tham số khoảng ngày (cho bot-filter) mà VIEW
// trần không nhận tham số được — campaign_funnel_daily đã là hàm RPC đúng
// khuôn mọi RPC marketing khác trong repo, T2 chỉ còn việc ghép nó với
// ext_metrics_daily bằng một `fetch` REST giống mọi module lib/growth khác.
// ============================================================

import { vndPerCredit } from '@/lib/billing/packages';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

/** Cổng mẫu nhỏ — bản CODE của luật "chỉ nêu % khi mẫu ≥ 30 ở CẢ HAI kỳ" đang
 * nằm trong SYSTEM_PROMPT của cmo-digest.ts. Chuyển xuống đây để LLM ở tầng
 * phân phối KHÔNG THẤY con số % khi mẫu quá mỏng — hết đường lỡ nói ra. */
export interface SampledMetric {
  value: number | null;
  prev: number | null;
  delta_pct: number | null;
  verdict: 'ok' | 'insufficient_sample' | 'no_data';
}

const MIN_SAMPLE = 30;

/**
 * `n`/`nPrev` là mẫu số làm nền cho % — KHÔNG phải luôn là chính `value`.
 * Vd CAC: value=spend/signups, nhưng mẫu thật quyết định % có tin được hay
 * không là SỐ SIGNUP (mẫu nhỏ), không phải số tiền spend (luôn "đủ mẫu").
 */
export function sampleGate(
  value: number | null,
  prev: number | null,
  n: number,
  nPrev: number,
  min = MIN_SAMPLE,
): SampledMetric {
  if (value === null && prev === null) return { value, prev, delta_pct: null, verdict: 'no_data' };
  const insufficient = n < min || nPrev < min;
  const deltaOk = !insufficient && value !== null && prev !== null && prev !== 0;
  return {
    value,
    prev,
    delta_pct: deltaOk ? ((value! - prev!) / prev!) * 100 : null,
    verdict: insufficient ? 'insufficient_sample' : 'ok',
  };
}

/**
 * spend ÷ 0 là "chưa tốn được một khách nào", không phải 0 hay Infinity — cả
 * hai đọc sai theo hai chiều khác nhau nên phải trả null tường minh. `spend
 * === null` (tiền tệ lạ, chưa quy đổi được) cũng phải null NGAY, không được
 * lọt qua phép chia — `NaN / n` cho `n > 0` ra `NaN`, KHÔNG ra `null`, và một
 * `NaN` lẫn vào JSON gửi LLM/Postgres là loại lỗi im lặng đúng kiểu đã cắn.
 */
function safeDiv(spend: number | null, n: number): number | null {
  return spend !== null && n > 0 ? spend / n : null;
}

async function callRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: SB_HEADERS,
    cache: 'no-store',
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`${fn}: ${await res.text()}`);
  return res.json();
}

interface ExtMetricRow {
  source: string;
  entity: string;
  stat_date: string;
  metrics: Record<string, unknown>;
  dims: Record<string, unknown>;
}

async function fetchAdsSpendRows(from: string, to: string): Promise<ExtMetricRow[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const url =
    `${SUPABASE_URL}/rest/v1/ext_metrics_daily?select=source,entity,stat_date,metrics,dims` +
    `&source=in.(ga4_ads,meta_ads)&stat_date=gte.${from}&stat_date=lte.${to}`;
  const res = await fetch(url, { headers: SB_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`ext_metrics_daily(ads): ${await res.text()}`);
  return res.json();
}

interface CampaignFunnelRow {
  day: string;
  campaign: string;
  visitors_human: number;
  tool_run: number;
  preview_shown: number;
  signup: number;
  purchase: number;
  revenue_credits: number;
}

async function fetchFunnelRows(from: string, to: string): Promise<CampaignFunnelRow[]> {
  return callRpc<CampaignFunnelRow[]>('campaign_funnel_daily', {
    p_from: `${from}T00:00:00Z`,
    p_to: `${to}T23:59:59.999Z`,
  });
}

export interface CampaignDailyRow {
  campaignId: string;
  campaignName: string | null;
  platform: 'google_ads' | 'meta_ads' | 'other';
  statDate: string;
  /** Chi phí bằng đơn vị GỐC của nguồn — KHÔNG quy đổi mò khi khác VND. */
  spendNative: number;
  spendCurrency: string | null;
  /** null khi `spendCurrency !== 'VND'` — tuyệt đối không tự đặt tỉ giá. */
  spendVnd: number | null;
  clicks: number;
  impressions: number;
  visitorsHuman: number;
  toolRun: number;
  previewShown: number;
  signup: number;
  purchase: number;
  revenueVnd: number;
}

/**
 * T2 — nối ads spend (ext_metrics_daily) với phễu nội bộ theo (campaign, ngày).
 *
 * Luật cứng của plan §4: dòng nào không nối được PHẢI hiện ra, KHÔNG âm thầm
 * rơi mất — chi phí biến mất khỏi mẫu số là cách nhanh nhất để ROAS đẹp giả.
 * Ở đây spend (từ `ext_metrics_daily`) LUÔN giữ platform thật của nó
 * (`google_ads`/`meta_ads`) bất kể có khớp funnel hay không — không có
 * đường nào làm mất một dòng chi phí. Funnel CÓ campaign nhưng KHÔNG có ads
 * khớp (kênh organic/referral tự dán utm_campaign như 'zalo'/'gallery', HOẶC
 * một campaign ads thật mà `ext_metrics_daily` chưa/không kéo được) được gắn
 * `platform:'other'` — hiện ra để không mất doanh thu, không đoán nó là gì.
 *
 * ⚠️ Khoá join `campaign` = `entity` (ext_metrics_daily) = `utm_campaign`
 * (events). Với Google Ads đã XÁC NHẬN khớp (track.js suy utm_campaign=
 * gad_campaignid, xem nhat-ky/2026-09.md "Google Ads có traffic thật, 0 sign
 * up"). Với Meta Ads: KHÔNG có xác nhận nào — phụ thuộc việc dán tay UTM
 * link ads khớp đúng campaign ID mà Meta Insights trả về hay không, và
 * `ext_metrics_daily(source='meta_ads')` CHƯA có dòng nào tại thời điểm viết
 * (cron ext-metrics chưa chạy lượt đầu) để đối chiếu. Ghi lại, không tự vá —
 * xem lại khi có dữ liệu thật.
 */
export async function computeCampaignDaily(from: string, to: string): Promise<CampaignDailyRow[]> {
  const [adsRows, funnelRows, vpc] = await Promise.all([
    fetchAdsSpendRows(from, to),
    fetchFunnelRows(from, to),
    vndPerCredit().catch(() => 500),
  ]);

  const funnelByKey = new Map<string, CampaignFunnelRow>();
  for (const r of funnelRows) funnelByKey.set(`${r.campaign}|${r.day}`, r);

  const rows: CampaignDailyRow[] = [];
  const matchedKeys = new Set<string>();

  for (const ad of adsRows) {
    const key = `${ad.entity}|${ad.stat_date}`;
    const f = funnelByKey.get(key);
    if (f) matchedKeys.add(key);
    const currency = (ad.metrics.cost_currency as string) || (ad.metrics.spend_currency as string) || null;
    const nativeSpend = Number(ad.metrics.cost_native ?? ad.metrics.spend_native ?? 0) || 0;
    rows.push({
      campaignId: ad.entity,
      campaignName: (ad.dims.campaign_name as string) || null,
      platform: ad.source === 'ga4_ads' ? 'google_ads' : ad.source === 'meta_ads' ? 'meta_ads' : 'other',
      statDate: ad.stat_date,
      spendNative: nativeSpend,
      spendCurrency: currency,
      spendVnd: currency === 'VND' ? nativeSpend : null,
      clicks: Number(ad.metrics.clicks ?? 0) || 0,
      impressions: Number(ad.metrics.impressions ?? 0) || 0,
      visitorsHuman: f?.visitors_human ?? 0,
      toolRun: f?.tool_run ?? 0,
      previewShown: f?.preview_shown ?? 0,
      signup: f?.signup ?? 0,
      purchase: f?.purchase ?? 0,
      revenueVnd: Math.round((f?.revenue_credits ?? 0) * vpc),
    });
  }

  for (const [key, f] of funnelByKey) {
    if (matchedKeys.has(key)) continue;
    rows.push({
      campaignId: f.campaign,
      campaignName: null,
      platform: 'other',
      statDate: f.day,
      spendNative: 0,
      spendCurrency: null,
      spendVnd: 0,
      clicks: 0,
      impressions: 0,
      visitorsHuman: f.visitors_human,
      toolRun: f.tool_run,
      previewShown: f.preview_shown,
      signup: f.signup,
      purchase: f.purchase,
      revenueVnd: Math.round(f.revenue_credits * vpc),
    });
  }

  return rows;
}

export interface CampaignAggregate {
  campaignId: string;
  campaignName: string | null;
  platform: CampaignDailyRow['platform'];
  spendVnd: number | null;
  visitorsHuman: number;
  toolRun: number;
  previewShown: number;
  signup: number;
  purchase: number;
  revenueVnd: number;
  cac: SampledMetric;
  cpaToolRun: SampledMetric;
  cpaPurchase: SampledMetric;
  roas: SampledMetric;
}

type CampaignTotals = Omit<CampaignAggregate, 'cac' | 'cpaToolRun' | 'cpaPurchase' | 'roas'>;

function groupByCampaign(rows: CampaignDailyRow[]): Map<string, CampaignTotals> {
  const map = new Map<string, CampaignTotals>();
  for (const r of rows) {
    const cur =
      map.get(r.campaignId) ||
      ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        platform: r.platform,
        spendVnd: r.spendVnd === null ? null : 0,
        visitorsHuman: 0,
        toolRun: 0,
        previewShown: 0,
        signup: 0,
        purchase: 0,
        revenueVnd: 0,
      } satisfies CampaignTotals);
    // Một dòng bất kỳ trong kỳ có spendVnd=null (currency lạ) là đủ để làm
    // TỔNG cả campaign đó thành null — cộng thiếu một phần chi phí rồi báo
    // như đã đủ còn nguy hơn báo "không tính được".
    cur.spendVnd = r.spendVnd === null || cur.spendVnd === null ? null : cur.spendVnd + r.spendVnd;
    cur.campaignName = cur.campaignName || r.campaignName;
    if (r.platform !== 'other') cur.platform = r.platform;
    cur.visitorsHuman += r.visitorsHuman;
    cur.toolRun += r.toolRun;
    cur.previewShown += r.previewShown;
    cur.signup += r.signup;
    cur.purchase += r.purchase;
    cur.revenueVnd += r.revenueVnd;
    map.set(r.campaignId, cur);
  }
  return map;
}

/**
 * T3 — gộp `computeCampaignDaily` theo campaign (bỏ chiều ngày) rồi tính
 * CAC/CPA/ROAS. So kỳ (WoW) do CALLER truyền `prevRows` — hàm này không tự
 * quyết định "kỳ trước" là gì, tránh trộn 2 quyết định (gộp số + chọn kỳ so)
 * vào một hàm khó test.
 */
export function aggregateCampaigns(rows: CampaignDailyRow[], prevRows: CampaignDailyRow[] = []): CampaignAggregate[] {
  const byId = groupByCampaign(rows);
  const prevById = groupByCampaign(prevRows);

  return [...byId.values()].map((c) => {
    const prev = prevById.get(c.campaignId);
    return {
      ...c,
      cac: sampleGate(
        safeDiv(c.spendVnd, c.signup),
        prev ? safeDiv(prev.spendVnd, prev.signup) : null,
        c.signup,
        prev?.signup ?? 0,
      ),
      cpaToolRun: sampleGate(
        safeDiv(c.spendVnd, c.toolRun),
        prev ? safeDiv(prev.spendVnd, prev.toolRun) : null,
        c.toolRun,
        prev?.toolRun ?? 0,
      ),
      cpaPurchase: sampleGate(
        safeDiv(c.spendVnd, c.purchase),
        prev ? safeDiv(prev.spendVnd, prev.purchase) : null,
        c.purchase,
        prev?.purchase ?? 0,
      ),
      roas: sampleGate(
        c.spendVnd && c.spendVnd > 0 ? c.revenueVnd / c.spendVnd : null,
        prev?.spendVnd && prev.spendVnd > 0 ? prev.revenueVnd / prev.spendVnd : null,
        c.purchase,
        prev?.purchase ?? 0,
      ),
    };
  });
}

/**
 * Điểm vào chính bậc 4 — gọi từ cron growth-insights (bậc 5). Trả về đủ dữ
 * liệu để lib/growth/findings.ts (bậc 5) sinh findings, KHÔNG tự sinh
 * findings ở đây (tách "tính số" khỏi "phán đoán", đúng T3 vs T4 của plan).
 */
export interface GrowthEngineResult {
  from: string;
  to: string;
  rows: CampaignDailyRow[];
  campaigns: CampaignAggregate[];
  /** null khi ÍT NHẤT một campaign có chi phí bằng tiền tệ lạ (chưa quy đổi
   * được) — im lặng cộng thiếu còn nguy hơn báo "chưa tính được tổng". */
  totalSpendVnd: number | null;
}

export async function runGrowthEngine(
  from: string,
  to: string,
  prevFrom: string,
  prevTo: string,
): Promise<GrowthEngineResult> {
  const [rows, prevRows] = await Promise.all([computeCampaignDaily(from, to), computeCampaignDaily(prevFrom, prevTo)]);
  const campaigns = aggregateCampaigns(rows, prevRows);
  const totalSpendVnd = campaigns.some((c) => c.spendVnd === null)
    ? null
    : campaigns.reduce((s, c) => s + (c.spendVnd || 0), 0);
  return { from, to, rows, campaigns, totalSpendVnd };
}
