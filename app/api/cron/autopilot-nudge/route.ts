// app/api/cron/autopilot-nudge/route.ts
// M0.6.4 (track Marketing Autopilot) — cron TUẦN, tự nhắc segment "sắp im
// lặng sớm" qua kênh sở hữu (Telegram/Push) — không tặng gì, chỉ nhắc (xem
// lib/marketing/autopilot-nudge.ts). MẶC ĐỊNH tắt (enabledBudgetPerRun=0
// trong app_config['marketing.autopilot_segment_nudge']).
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runSegmentNudgeAutopilot } from '@/lib/marketing/autopilot-nudge';
import { notifyAutopilotRun } from '@/lib/marketing/autopilot';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('autopilot-nudge', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runSegmentNudgeAutopilot();
    if (result.proposals.length) {
      const title = result.sent > 0 ? '🤖 Autopilot — Nhắc segment' : '🧪 Autopilot (dry-run) — Nhắc segment';
      await notifyAutopilotRun(title, result.proposals.slice(0, 15).concat(result.proposals.length > 15 ? [`+${result.proposals.length - 15} user khác`] : []));
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
