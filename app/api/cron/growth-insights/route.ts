// app/api/cron/growth-insights/route.ts
// Bậc 5 của docs/GROWTH-DATA-PLAN.md — chạy engine (lib/growth/engine.ts,
// bậc 4) + soi luật (lib/growth/findings.ts), ghi `marketing_insights` +
// 1 dòng `events(event_type='growth_insight')` để mọi nơi đọc lại đều thấy
// (đúng khuôn app/api/cron/cmo-digest/route.ts::logCmoDigest).
//
// Read-mostly: chỉ ghi `marketing_insights`/`events`, KHÔNG chạm
// `autopilot_actions`/giá/khuyến mãi — mọi hành động thật vẫn đi qua
// lib/marketing/autopilot.ts với cầu dao riêng (plan §8).
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh
// được — thiếu `force-dynamic` là lỗi GIẢ ghi vào cron_runs lúc build
// (bài học S0 track COO, lặp lại ở mọi cron route trong repo).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runGrowthEngine } from '@/lib/growth/engine';
import { runFindings } from '@/lib/growth/findings';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('growth-insights', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Cùng cửa sổ WoW với cmo-digest (7 ngày vs 7 ngày trước) — giữ MỘT cách
  // chia kỳ xuyên toàn bộ tầng growth, để hai chỗ đọc số không lệch nhau vì
  // chọn khoảng ngày khác nhau cho "tuần này".
  const now = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => ymd(new Date(now.getTime() - n * 864e5));

  const from = daysAgo(7);
  const to = daysAgo(0);
  const prevFrom = daysAgo(14);
  const prevTo = daysAgo(7);
  const runDate = to;

  try {
    const engineResult = await runGrowthEngine(from, to, prevFrom, prevTo);
    const { findings, saved } = await runFindings(runDate, engineResult);
    await logGrowthInsight(runDate, findings, engineResult.totalSpendVnd);

    const bySeverity = { act: 0, watch: 0, info: 0 } as Record<string, number>;
    for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;

    return NextResponse.json({
      ok: true,
      note:
        `${saved} finding đã ghi (act:${bySeverity.act} watch:${bySeverity.watch} info:${bySeverity.info}), ` +
        `${engineResult.campaigns.length} campaign soi, tổng spend ${engineResult.totalSpendVnd ?? 'chưa tính được (tiền tệ lạ)'}`,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

async function logGrowthInsight(runDate: string, findings: unknown[], totalSpendVnd: number | null): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: 'growth_insight',
        platform: 'web',
        meta: { run_date: runDate, finding_count: findings.length, total_spend_vnd: totalSpendVnd },
      }),
    });
  } catch {
    /* best-effort — không chặn cron */
  }
}
