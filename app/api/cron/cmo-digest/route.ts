// app/api/cron/cmo-digest/route.ts
// M0.2 (track Marketing Autopilot) — "CMO quân sư" digest tự động, 1 lần/ngày.
// Đọc lại RPC marketing/dashboard đã có (lib/marketing/cmo-digest.ts), nhờ LLM
// tóm tắt, gửi Telegram cho admin qua CHÍNH kênh đã dùng cho alert đăng nhập
// (ADMIN_TELEGRAM_CHAT_ID, lib/admin/alert.ts) — không cần thêm env mới.
// Read-only tuyệt đối, no-op an toàn nếu thiếu cấu hình.
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { generateCmoDigestText } from '@/lib/marketing/cmo-digest';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('cmo-digest', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!TG_CHAT_ID) return NextResponse.json({ ok: true, skipped: 'no ADMIN_TELEGRAM_CHAT_ID' });

  try {
    const text = await generateCmoDigestText();
    await tgSendMessage(TG_CHAT_ID, '🎖️ CMO Digest — ' + new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + '\n\n' + text);
    return NextResponse.json({ ok: true, sent: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
