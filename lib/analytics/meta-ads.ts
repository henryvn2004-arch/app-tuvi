// lib/analytics/meta-ads.ts
// ============================================================
// Đọc Meta Marketing API Insights — chi phí/click/impression theo campaign.
// GA4 chỉ thấy campaign Meta dưới dạng ID thô (không có tên/chi phí đáng tin
// — xem lib/analytics/ga4.ts), đây là nguồn DUY NHẤT có chi phí Meta Ads
// thật. Xem docs/GROWTH-DATA-PLAN.md bậc 3.
//
// Auth: System User token quyền `ads_read` (Business Settings → System
// Users) — KHÔNG tự hết hạn như token cá nhân (60 ngày). Best-effort: thiếu
// env/lỗi API → null, không chặn cron.
//
// ⚠️ Chi phí trả về theo TIỀN TỆ CỦA AD ACCOUNT (`currency`, tra riêng qua
// `/act_.../?fields=currency`) — PHẢI lưu kèm dòng, KHÔNG mặc định VND.
// Khác GA4 (advertiserAdCost đã được Google tự quy đổi theo property).
//
// ⚠️ Số liệu Meta có thể NHÍCH trong vài ngày do cửa sổ gán quy đổi
// (attribution window) — cron dùng cửa sổ lùi lại vài ngày, upsert theo
// (source, entity, stat_date) tự vá số mới nhất, giống cách GSC xử lý độ trễ.
// ============================================================

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.META_ADS_ACCESS_TOKEN || '';
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || ''; // dạng act_XXXXXXXXXXXXX

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[meta-ads] lỗi ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn('[meta-ads] ném lỗi:', (e as Error).message);
    return null;
  }
}

export interface MetaCampaignDayRow {
  campaignId: string;
  campaignName: string;
  spend: number;
  clicks: number;
  impressions: number;
  date: string; // YYYY-MM-DD
}

export interface MetaAdsSnapshot {
  /** Mã tiền tệ CỦA AD ACCOUNT (vd 'USD', 'VND') — lưu kèm dòng, không quy đổi. */
  currency: string;
  rows: MetaCampaignDayRow[];
}

/**
 * Chi phí/click/impression theo campaign, MỖI NGÀY trong [from, to]
 * (YYYY-MM-DD, inclusive). `time_increment=1` tách sẵn theo ngày trong một
 * lượt gọi — không cần vòng lặp theo ngày ở phía mình.
 */
export async function getMetaAdsDaily(from: string, to: string): Promise<MetaAdsSnapshot | null> {
  if (!TOKEN || !AD_ACCOUNT_ID) return null;

  const currencyRes = await fetchJson<{ currency?: string }>(
    `${GRAPH_BASE}/${AD_ACCOUNT_ID}?fields=currency&access_token=${TOKEN}`,
  );
  if (!currencyRes) return null;

  const timeRange = encodeURIComponent(JSON.stringify({ since: from, until: to }));
  const insightsUrl =
    `${GRAPH_BASE}/${AD_ACCOUNT_ID}/insights` +
    `?level=campaign&fields=campaign_id,campaign_name,spend,clicks,impressions,date_start` +
    `&time_range=${timeRange}&time_increment=1&limit=200&access_token=${TOKEN}`;

  const insights = await fetchJson<{ data?: Array<Record<string, string>> }>(insightsUrl);
  if (!insights) return null;

  const rows: MetaCampaignDayRow[] = (insights.data || []).map((r) => ({
    campaignId: r.campaign_id || '(not set)',
    campaignName: r.campaign_name || '(not set)',
    spend: Number(r.spend || 0),
    clicks: Number(r.clicks || 0),
    impressions: Number(r.impressions || 0),
    date: r.date_start || from,
  }));

  return { currency: currencyRes.currency || '', rows };
}
