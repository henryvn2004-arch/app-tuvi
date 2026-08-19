// app/api/cron/backlink-check/route.ts
// Mỗi sáng: re-fetch các trang mang backlink, xác nhận link còn sống, đọc lại
// dofollow/nofollow + anchor text. Chỉ ĐỌC trang công khai — xem
// lib/backlinks/tracker.ts.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runLinkCheck } from '@/lib/backlinks/tracker';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('backlink-check', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await runLinkCheck();

  // Chỉ báo khi có link VỪA CHẾT — đó là tin đáng biết ngay. "Đã kiểm N link,
  // tất cả còn sống" mỗi sáng thì mau chóng bị lướt qua như mọi bản tin đều đặn.
  if (TG_CHAT_ID && r.newlyDead.length) {
    const lines = r.newlyDead.slice(0, 15).map((u) => `  • ${u}`).join('\n');
    const more = r.newlyDead.length > 15 ? `\n  …và ${r.newlyDead.length - 15} link nữa` : '';
    await tgSendMessage(
      TG_CHAT_ID,
      `💔 Backlink vừa MẤT (${r.newlyDead.length}):\n${lines}${more}\n\nMở Admin → Backlink để xem chi tiết.`,
    );
  }

  return NextResponse.json({ ok: true, ...r });
}
