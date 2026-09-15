// app/api/cron/email-broadcast-drain/route.ts
// Rút hàng đợi email_broadcast_queue theo lô mỗi 15 phút — xem
// lib/marketing/email-broadcast.ts. `skipped` khi không có hàng đợi nào
// pending (đúng nghĩa — không phải lỗi).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { drainEmailBroadcastQueue } from '@/lib/marketing/email-broadcast';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('email-broadcast-drain', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await drainEmailBroadcastQueue();
    return NextResponse.json({ ok: true, ...result, skipped: result.ran ? undefined : 'không có hàng đợi pending' });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
