// app/api/cron/anomaly-alerts/route.ts
// M0.3 (track Marketing Autopilot) — cảnh báo bất thường, mỗi 3 giờ. Gọi
// checkAnomalies() (lib/marketing/anomaly-alerts.ts) — chỉ gửi Telegram admin
// khi THẬT SỰ có bất thường vượt ngưỡng (im lặng nếu không, khác CMO Digest
// vốn gửi đều đặn 1 lần/ngày). Read-only, no-op an toàn nếu thiếu cấu hình.
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
// Thiếu dòng này, Next 14 vẫn thử prerender lúc build → withCronLog bắt được
// lỗi "Dynamic server usage" rồi ghi vào cron_runs, sinh hàng trăm dòng lỗi
// GIẢ mỗi lần deploy và chôn vùi lỗi thật (S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { checkAnomalies } from '@/lib/marketing/anomaly-alerts';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('anomaly-alerts', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!TG_CHAT_ID) return NextResponse.json({ ok: true, skipped: 'no ADMIN_TELEGRAM_CHAT_ID' });

  try {
    const { fired, checked } = await checkAnomalies();
    if (fired.length) {
      const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const text = `🚨 Cảnh báo bất thường — ${time}\n\n` + fired.map((f) => `• ${f.text}`).join('\n');
      await tgSendMessage(TG_CHAT_ID, text);
    }
    return NextResponse.json({ ok: true, checked, fired: fired.length });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
