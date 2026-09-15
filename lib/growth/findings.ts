// lib/growth/findings.ts
// ============================================================
// Bậc 5 (Tầng 4 — Phán đoán) của docs/GROWTH-DATA-PLAN.md. Đọc output của
// lib/growth/engine.ts (T3, số đã chốt) rồi soi LUẬT CỨNG để ra một danh
// sách VIỆC có bằng chứng — không phải một đống số. Ghi vào
// `marketing_insights` (_patches/migration-marketing-insights.sql).
//
// KHÔNG tự tính lại CAC/CPA/ROAS ở đây — mọi ngưỡng chỉ SO SÁNH số đã có
// sẵn trong `CampaignAggregate`. Đây đúng ranh giới T3 (tính số)/T4 (phán
// đoán) mà plan §5-6 vạch ra: engine không phán đoán, findings không tính số.
//
// `suggested_action` dùng đúng vocabulary `AutopilotActionType`
// (lib/marketing/autopilot.ts) + 2 giá trị mới cho ads. 🔴 Hai giá trị mới
// (`pause_campaign`/`shift_budget`) là ĐỀ XUẤT THUẦN — hành động thật trên
// tài khoản ads nằm NGOÀI phạm vi B (plan §8), autopilot.ts KHÔNG có
// dispatcher cho chúng và file này không tự thực thi gì cả.
// ============================================================

import type { CampaignAggregate, GrowthEngineResult } from '@/lib/growth/engine';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export type FindingSeverity = 'info' | 'watch' | 'act';
export type FindingConfidence = 'solid' | 'thin_sample' | 'no_data';
/** vocabulary cũ của autopilot.ts + 2 giá trị mới CHỈ để đề xuất cho ads. */
export type SuggestedAction = 'price_adjust' | 'promo_grant' | 'segment_nudge' | 'pause_campaign' | 'shift_budget';

export interface Finding {
  findingKey: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  headline: string;
  metrics: Record<string, unknown>;
  evidence: Record<string, unknown>;
  suggestedAction: SuggestedAction | null;
}

// Ngưỡng soi findings — tách khỏi hằng số của anomaly-alerts.ts (thresholds
// đó canh vận hành/bảo mật, đây canh HIỆU QUẢ ADS, hai việc khác nhau) để
// sửa một bên không vô tình đổi ngưỡng bên kia.
const ZERO_CONVERSION_MIN_VISITORS = 20; // dưới mức này là mẫu quá mỏng để kết luận "0% là thật"
const CAC_SPIKE_DELTA_PCT = 50; // CAC tăng ≥ 50% so tuần trước (đã qua sampleGate ≥30 mẫu)
const NEGATIVE_ROAS_MIN_SPEND_VND = 50_000; // dưới mức này ROAS<1 chỉ là nhiễu chi tiêu nhỏ

function pctFmt(n: number): string {
  return `${n.toFixed(1)}%`;
}

function vndFmt(n: number): string {
  return Math.round(n).toLocaleString('vi-VN') + 'đ';
}

/**
 * Soi TỪNG campaign trong `engineResult.campaigns` theo luật cứng — thuần
 * hàm, không I/O, dễ test bằng dữ liệu giả. `runDate` chỉ để gắn vào
 * `finding_key`/`evidence`, không ảnh hưởng logic.
 */
export function generateFindings(engineResult: GrowthEngineResult): Finding[] {
  const findings: Finding[] = [];
  const window = `${engineResult.from}..${engineResult.to}`;

  for (const c of engineResult.campaigns) {
    if (c.platform === 'other') continue; // không phải ads — không soi luật ads
    checkZeroConversion(c, window, findings);
    checkCacSpike(c, window, findings);
    checkNegativeRoas(c, window, findings);
  }

  return findings;
}

function checkZeroConversion(c: CampaignAggregate, window: string, out: Finding[]): void {
  if (c.spendVnd === null || c.spendVnd <= 0) return;
  if (c.visitorsHuman < ZERO_CONVERSION_MIN_VISITORS) return;
  if (c.toolRun > 0) return;
  const bouncePct = c.visitorsHuman > 0 ? (1 - c.previewShown / c.visitorsHuman) * 100 : null;
  out.push({
    findingKey: `campaign_zero_conversion:${c.campaignId}`,
    severity: 'act',
    confidence: c.visitorsHuman >= 30 ? 'solid' : 'thin_sample',
    headline:
      `Campaign ${c.campaignName || c.campaignId}: ${c.visitorsHuman} khách, ` +
      `0 lượt chạy thử tool (0%), đã chi ${vndFmt(c.spendVnd)}`,
    metrics: { visitors_human: c.visitorsHuman, tool_run: c.toolRun, spend_vnd: c.spendVnd, bounce_pct: bouncePct },
    evidence: { source: 'ext_metrics_daily+events', window, n: c.visitorsHuman },
    suggestedAction: 'pause_campaign',
  });
}

function checkCacSpike(c: CampaignAggregate, window: string, out: Finding[]): void {
  if (c.cac.verdict !== 'ok' || c.cac.value === null || c.cac.delta_pct === null) return;
  if (c.cac.delta_pct < CAC_SPIKE_DELTA_PCT) return;
  out.push({
    findingKey: `campaign_cac_spike:${c.campaignId}`,
    severity: 'watch',
    confidence: 'solid', // sampleGate đã đảm bảo mẫu ≥30 ở cả 2 kỳ mới ra verdict 'ok'
    headline:
      `Campaign ${c.campaignName || c.campaignId}: CAC ${vndFmt(c.cac.value)}, ` +
      `tăng ${pctFmt(c.cac.delta_pct)} so tuần trước (${vndFmt(c.cac.prev ?? 0)})`,
    metrics: { cac_vnd: c.cac.value, cac_prev_vnd: c.cac.prev, delta_pct: c.cac.delta_pct, signup: c.signup },
    evidence: { source: 'campaign_funnel_daily', window, n: c.signup },
    suggestedAction: 'shift_budget',
  });
}

function checkNegativeRoas(c: CampaignAggregate, window: string, out: Finding[]): void {
  if (c.roas.verdict !== 'ok' || c.roas.value === null) return;
  if (c.roas.value >= 1) return;
  if (c.spendVnd === null || c.spendVnd < NEGATIVE_ROAS_MIN_SPEND_VND) return;
  out.push({
    findingKey: `campaign_negative_roas:${c.campaignId}`,
    severity: 'act',
    confidence: 'solid', // sampleGate đã đảm bảo mẫu ≥30 purchase ở cả 2 kỳ mới ra verdict 'ok'
    headline:
      `Campaign ${c.campaignName || c.campaignId}: ROAS ${c.roas.value.toFixed(2)} (< 1) — ` +
      `chi ${vndFmt(c.spendVnd)}, thu về ${vndFmt(c.revenueVnd)}`,
    metrics: { roas: c.roas.value, spend_vnd: c.spendVnd, revenue_vnd: c.revenueVnd, purchase: c.purchase },
    evidence: { source: 'campaign_funnel_daily+tool-profit', window, n: c.purchase },
    suggestedAction: 'shift_budget',
  });
}

async function upsertMarketingInsights(runDate: string, findings: Finding[]): Promise<number> {
  if (!findings.length) return 0;
  const rows = findings.map((f) => ({
    run_date: runDate,
    finding_key: f.findingKey,
    severity: f.severity,
    confidence: f.confidence,
    headline: f.headline,
    metrics: f.metrics,
    evidence: f.evidence,
    suggested_action: f.suggestedAction,
  }));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/marketing_insights?on_conflict=run_date,finding_key`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`upsert marketing_insights: ${await res.text()}`);
  return rows.length;
}

export interface RunFindingsResult {
  runDate: string;
  findings: Finding[];
  saved: number;
}

/** Gọi bởi app/api/cron/growth-insights/route.ts. Tách khỏi generateFindings
 * (thuần hàm) để phần I/O (upsert) không lẫn vào logic soi luật — dễ test. */
export async function runFindings(runDate: string, engineResult: GrowthEngineResult): Promise<RunFindingsResult> {
  const findings = generateFindings(engineResult);
  const saved = await upsertMarketingInsights(runDate, findings);
  return { runDate, findings, saved };
}

interface MarketingInsightRow {
  run_date: string;
  finding_key: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  headline: string;
  metrics: Record<string, unknown>;
  evidence: Record<string, unknown>;
  suggested_action: SuggestedAction | null;
}

/**
 * Đọc findings của run_date GẦN NHẤT — cửa DUY NHẤT cho mọi người đọc ở
 * tầng phân phối (bậc 6): cmo-digest, anomaly-alerts, và marketing
 * orchestrator tương lai (IMPORT thẳng hàm này, xem docs/GROWTH-DATA-PLAN.md
 * §2 — không cần API mới, không cần MCP). fail-open: lỗi/rỗng → mảng rỗng,
 * KHÔNG chặn phần còn lại của caller (đọc số, không phải phát tiền).
 */
export async function getLatestGrowthFindings(): Promise<Finding[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const latestRes = await fetch(
      `${SUPABASE_URL}/rest/v1/marketing_insights?select=run_date&order=run_date.desc&limit=1`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!latestRes.ok) return [];
    const latest = (await latestRes.json()) as { run_date: string }[];
    if (!latest.length) return [];

    const res = await fetch(`${SUPABASE_URL}/rest/v1/marketing_insights?select=*&run_date=eq.${latest[0].run_date}`, {
      headers: SB_HEADERS,
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as MarketingInsightRow[];
    // 'act' > 'watch' > 'info' — thứ tự MỨC ĐỘ, không phải alphabet (sort SQL
    // 'severity.desc' cho 'watch' lên trước 'act' vì w > a trong bảng chữ).
    const rank: Record<FindingSeverity, number> = { act: 0, watch: 1, info: 2 };
    return rows
      .map((r) => ({
        findingKey: r.finding_key,
        severity: r.severity,
        confidence: r.confidence,
        headline: r.headline,
        metrics: r.metrics,
        evidence: r.evidence,
        suggestedAction: r.suggested_action,
      }))
      .sort((a, b) => rank[a.severity] - rank[b.severity]);
  } catch {
    return [];
  }
}
