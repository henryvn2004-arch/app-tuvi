// app/api/cron-push/route.ts
// Vercel cron: 0 0 * * * (00:00 UTC = 07:00 VN) → gọi Supabase Edge Function
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';

const EDGE_URL    = `${process.env.SUPABASE_URL}/functions/v1/send-daily-push`;
const CRON_SECRET = process.env.CRON_SECRET ?? '';

export async function GET() {
  return withCronLog('cron-push', 'vercel', handle);
}

async function handle() {
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
      },
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
