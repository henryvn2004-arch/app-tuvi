// app/api/cron/autopilot-promo/route.ts
// M0.6.3 (track Marketing Autopilot) — cron TUẦN, tự cấp Lượng khuyến mãi
// giữ chân cho user sắp rời bỏ (xem lib/marketing/autopilot-promo.ts). MẶC
// ĐỊNH tắt (budgetCreditsPerRun=0 trong app_config['marketing.autopilot_promo'])
// — Henry phải tự đặt budget dương mới có hiệu lực, kể cả khi autopilot_enabled=true.
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
// Thiếu dòng này, Next 14 vẫn thử prerender lúc build → withCronLog bắt được
// lỗi "Dynamic server usage" rồi ghi vào cron_runs, sinh hàng trăm dòng lỗi
// GIẢ mỗi lần deploy và chôn vùi lỗi thật (S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runPromoAutopilot } from '@/lib/marketing/autopilot-promo';
import { notifyAutopilotRun } from '@/lib/marketing/autopilot';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('autopilot-promo', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runPromoAutopilot();
    if (result.proposals.length) {
      const title = result.granted > 0 ? '🤖 Autopilot — Khuyến mãi giữ chân' : '🧪 Autopilot (dry-run) — Khuyến mãi giữ chân';
      await notifyAutopilotRun(title, result.proposals);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
