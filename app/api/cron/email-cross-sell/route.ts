// app/api/cron/email-cross-sell/route.ts
// Cron T6 + CN hằng tuần — gợi ý tool liên quan qua email cho user đã dùng tool A mà chưa
// từng dùng tool B (cặp tay chọn, xem lib/marketing/email-cross-sell.ts).
// MẶC ĐỊNH TẮT (enabledBudgetPerRun=0 trong app_config['marketing.email_cross_sell']).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runEmailCrossSell } from '@/lib/marketing/email-cross-sell';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('email-cross-sell', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runEmailCrossSell();
    return NextResponse.json({ ok: true, ...result, skipped: result.ran ? undefined : 'chưa bật (marketing.email_cross_sell)' });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
