// app/api/cron/email-abandoned-checkout/route.ts
// Cron NGÀY — nhắc "đơn rơi": user đã bấm mở khoá một tool nhưng chưa hoàn
// tất mua, qua EMAIL (xem lib/marketing/email-abandoned-checkout.ts).
// MẶC ĐỊNH TẮT (enabledBudgetPerRun=0 trong
// app_config['marketing.email_abandoned_checkout']).
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runEmailAbandonedCheckout } from '@/lib/marketing/email-abandoned-checkout';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('email-abandoned-checkout', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runEmailAbandonedCheckout();
    return NextResponse.json({
      ok: true,
      ...result,
      skipped: result.ran ? undefined : 'chưa bật (marketing.email_abandoned_checkout)',
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
