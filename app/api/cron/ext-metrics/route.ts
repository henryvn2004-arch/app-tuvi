// app/api/cron/ext-metrics/route.ts
// Bậc 1-3 của docs/GROWTH-DATA-PLAN.md — kéo GA4 + Search Console + Clarity +
// Meta Ads vào `ext_metrics_daily` mỗi ngày (thay Windsor.ai). Xem
// lib/growth/collect-ext-metrics.ts cho logic thật.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được
// — thiếu `force-dynamic` thì Next chạy nó ngay trong `next build` rồi ghi
// lỗi GIẢ vào `cron_runs` (bài học S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { collectExtMetrics, formatCollectExtMetricsReport } from '@/lib/growth/collect-ext-metrics';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('ext-metrics', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await collectExtMetrics();
  const sources: Array<[string, (typeof result)[keyof typeof result]]> = [
    ['GA4', result.ga4],
    ['GSC', result.gsc],
    ['Clarity', result.clarity],
    ['Meta Ads', result.metaAds],
  ];
  const note = sources
    .map(([label, o]) => `${label} ${o.ok ? 'ok' : 'lỗi'} (${o.detail}, ${o.rows} dòng)`)
    .join(' · ');

  // Nguồn chưa cấu hình vẫn trả `ok:true` (best-effort, xem collectGa4/collectGsc/
  // collectClarity/collectMetaAds) — chỉ báo `ok:false` khi một nguồn NÉM LỖI
  // thật, để `withCronLog` phân biệt đúng "chưa cấu hình" với "API lỗi".
  const ok = sources.every(([, o]) => o.ok);

  return NextResponse.json(ok ? { ok, note } : { ok, error: formatCollectExtMetricsReport(result) });
}
