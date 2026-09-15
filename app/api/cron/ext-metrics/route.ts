// app/api/cron/ext-metrics/route.ts
// Bậc 1 của docs/GROWTH-DATA-PLAN.md — kéo GA4 + Search Console vào
// `ext_metrics_daily` mỗi ngày (thay Windsor.ai). Xem
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
  const note = `GA4 ${result.ga4.ok ? 'ok' : 'lỗi'} (${result.ga4.detail}, ${result.ga4.rows} dòng) · GSC ${
    result.gsc.ok ? 'ok' : 'lỗi'
  } (${result.gsc.detail}, ${result.gsc.rows} dòng)`;

  // Nguồn chưa cấu hình vẫn trả `ok:true` (best-effort, xem collectGa4/collectGsc)
  // — chỉ báo `ok:false` khi một nguồn NÉM LỖI thật, để `withCronLog` phân biệt
  // đúng "chưa cấu hình" (không phải sự cố) với "API lỗi" (cần xem log).
  const ok = result.ga4.ok && result.gsc.ok;

  return NextResponse.json(ok ? { ok, note } : { ok, error: formatCollectExtMetricsReport(result) });
}
