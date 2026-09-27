// app/api/cron/tien-tri-nhac/route.ts
// "Thầy tự nhắn" GĐ2 (docs/DAC-TRUNG-PLAN.md) — sáng mỗi ngày, lời phán trong
// Sổ tiên tri đã đến hạn mà khách chưa trả lời ⇒ nhắn qua Telegram (nếu tài
// khoản đã nối bot). Chưa nối thì thôi: thầy vẫn hỏi lại trong màn chat chính
// lần tới khách mở app (askTienTri, public/shell.js).
//
// Đánh dấu `nhac_at` TRƯỚC khi gửi (khoá bằng `nhac_at=is.null`) — hai lượt
// cron chồng nhau hoặc chạy lại tay không nhắn đôi. Gửi hỏng thì mất một lời
// nhắc, còn hơn nhắn hai lần: nhắc trùng là cách nhanh nhất để bị chặn bot.
// Web push theo user_id chưa có đường gửi (edge function hiện chỉ gửi hàng
// loạt) — xem plan.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { listCanNhac, danhDauDaNhac } from '@/lib/tien-tri/store';
import { getLinkedTelegramId } from '@/lib/channels/telegramLink';
import { tgSendMessage } from '@/lib/channels/telegram';
import { PERSONAS } from '@/lib/agent/personas';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('tien-tri-nhac', 'vercel', () => handle(request));
}

function ngayVN(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'numeric' }).format(d);
}

function tinNhac(noiDung: string, createdAt: string, authorId: string | null): string {
  const thay = (authorId && PERSONAS[authorId]?.name) || '';
  return (
    `Thầy${thay ? ' ' + thay : ''} nhắn con:\n\n` +
    `Hôm ${ngayVN(createdAt)} thầy có nói: “${noiDung}”\n\n` +
    'Chuyện đó thế nào rồi con? Mở app kể thầy nghe nhé: https://tuviminhbao.com/app'
  );
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const items = await listCanNhac();
  if (!items.length) return NextResponse.json({ ok: true, skipped: 'không có lời phán đến hạn' });

  // Mỗi người tối đa MỘT lời nhắc mỗi sáng, dù có nhiều lời cùng đến hạn.
  const daNhan = new Set<string>();
  let sent = 0, noLink = 0, failed = 0;
  for (const it of items) {
    if (daNhan.has(it.user_id)) continue;
    const tg = await getLinkedTelegramId(it.user_id);
    if (!tg) { noLink++; continue; }
    if (!(await danhDauDaNhac(it.id))) continue;
    daNhan.add(it.user_id);
    if (await tgSendMessage(tg, tinNhac(it.noi_dung, it.created_at, it.author_id))) sent++;
    else failed++;
  }
  return NextResponse.json({ ok: true, due: items.length, sent, noLink, failed });
}
