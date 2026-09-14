// app/api/cron/email-reminder-idle/route.ts
// Cron TUẦN — nhắc user còn Lượng chưa dùng, im lặng lâu ngày, qua EMAIL (kênh
// duy nhất chắc chắn có — khác Telegram/Push của autopilot-nudge, xem
// lib/marketing/email-reminder.ts). MẶC ĐỊNH TẮT (enabledBudgetPerRun=0 trong
// app_config['marketing.email_reminder_idle']).
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runEmailReminderIdle } from '@/lib/marketing/email-reminder';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('email-reminder-idle', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runEmailReminderIdle();
    return NextResponse.json({ ok: true, ...result, skipped: result.ran ? undefined : 'chưa bật (marketing.email_reminder_idle)' });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
