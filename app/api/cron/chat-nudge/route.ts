// app/api/cron/chat-nudge/route.ts
// Tin nhắc chủ động cho người đã chat ở kênh (Zalo/Messenger/WhatsApp/Telegram)
// — mỗi giờ; luật khung gửi + chống spam nằm ở lib/channels/nudge.ts.
// Ngoài 08–21h VN hoặc chưa chạy _patches/migration-chat-nudge.sql thì chạy ra
// không gửi gì (lỗi truy vấn cột ⇒ bỏ qua kênh, không bao giờ gửi tràn).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { chayNhac } from '@/lib/channels/nudge';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('chat-nudge', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const kq = await chayNhac();
  return NextResponse.json({ ok: true, ...kq });
}
