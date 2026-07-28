// app/api/cron/content-pack/route.ts
// V4 (track Viral Loop) — content-pack TikTok hàng tuần. Gom 5 bản chân dung
// được chia sẻ công khai nhiều lượt xem nhất tuần, nhờ LLM viết sẵn kịch bản
// 30–60 giây cho từng cái, gửi Telegram admin qua CHÍNH kênh đã dùng cho CMO
// Digest / cảnh báo bất thường (ADMIN_TELEGRAM_CHAT_ID) — không env mới.
//
// CHỈ SOẠN, KHÔNG ĐĂNG. Không có tích hợp TikTok/Facebook API ở đây; Henry
// đọc trên điện thoại rồi tự đăng tay. Đây là chỗ V4 cố ý dừng lại.
//
// Chạy CHỦ NHẬT 8h sáng VN (0 1 * * 0) — dàn ra khỏi 3 cron autopilot (T2/T4/
// T6) và để Henry có sẵn kịch bản trước khi vào tuần mới.
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được —
// thiếu dòng dưới thì Next 14 vẫn thử prerender lúc build rồi ghi lỗi GIẢ vào
// cron_runs (S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { generateContentPackText } from '@/lib/marketing/content-pack';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('content-pack', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!TG_CHAT_ID) return NextResponse.json({ ok: true, skipped: 'no ADMIN_TELEGRAM_CHAT_ID' });

  try {
    const text = await generateContentPackText();
    const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    // tgSendMessage tự cắt theo giới hạn 4096 ký tự của Telegram, 5 kịch bản
    // gần như chắc chắn tràn 1 tin — không phải tự cắt ở đây.
    await tgSendMessage(TG_CHAT_ID, `🎬 Content Pack tuần — ${day}\n\n${text}`);
    return NextResponse.json({ ok: true, sent: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
