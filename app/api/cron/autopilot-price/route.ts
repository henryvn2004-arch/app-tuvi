// app/api/cron/autopilot-price/route.ts
// M0.6.2 (track Marketing Autopilot) — cron TUẦN, tự chỉnh giá rail-message
// khi margin âm đủ lâu (xem lib/marketing/autopilot-price.ts). MẶC ĐỊNH
// shadow-mode (chỉ tính + log, không áp dụng) trừ khi
// app_config['marketing.autopilot_enabled']=true VÀ đã khai bound giá.
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runPriceAutopilot } from '@/lib/marketing/autopilot-price';
import { notifyAutopilotRun } from '@/lib/marketing/autopilot';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('autopilot-price', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runPriceAutopilot();
    if (result.proposal) {
      const title = result.mode === 'live' ? '🤖 Autopilot — Giá' : '🧪 Autopilot (dry-run) — Giá';
      await notifyAutopilotRun(title, [result.proposal]);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
