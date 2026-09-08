// app/api/cron/error-alerts/route.ts
// Cảnh báo lỗi JS phía client GẦN-THỜI-GIAN-THỰC — mỗi 15 phút, xem
// lib/ops/error-alerts.ts. Route đọc request.headers (auth CRON_SECRET) nên
// KHÔNG prerender tĩnh được — thiếu dòng dưới thì `next build` tự thử prerender
// và ghi rác vào cron_runs (xem chú thích tương tự ở anomaly-alerts/route.ts).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { checkJsErrors } from '@/lib/ops/error-alerts';
import { tgSendMessage } from '@/lib/channels/telegram';
import { logOpsAlerts } from '@/lib/ops/alerts';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  // retry AN TOÀN: checkJsErrors() dời cursor ngay sau khi đọc xong, trước khi
  // gửi Telegram — một lượt thử lại (Telegram 5xx/network chớp) đọc lô MỚI chứ
  // không đọc trùng lô cũ, nên không có nguy cơ báo hai lần cho cùng một lỗi.
  return withCronLog('error-alerts', 'vercel', () => handle(request), { retry: true });
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  // CỐ Ý KHÔNG thoát sớm khi thiếu ADMIN_TELEGRAM_CHAT_ID — cùng lý do đã ghi ở
  // anomaly-alerts/route.ts: một kênh GỬI chưa cấu hình không được phép làm
  // chết cả việc PHÁT HIỆN. Luôn chạy check + ghi `events`; Telegram chỉ là
  // đường đẩy thêm.
  try {
    const { fired, checked } = await checkJsErrors();

    let delivered = false;
    if (fired.length && TG_CHAT_ID) {
      const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      // Cắt còn tối đa 10 nhóm lỗi/tin — nhiều hơn thì Telegram cắt tin hoặc
      // trôi mất ý, mà đây chỉ là tin BÁO: mở panel Vận Hành xem đủ danh sách.
      const top = fired.slice(0, 10);
      const text =
        `🐛 Lỗi JS mới trên web — ${time}\n\n` +
        top.map((f) => `• ${f.text}`).join('\n\n') +
        (fired.length > top.length ? `\n\n… và ${fired.length - top.length} nhóm lỗi khác` : '');
      delivered = await tgSendMessage(TG_CHAT_ID, text);
    }
    if (fired.length) await logOpsAlerts(fired, delivered);

    return NextResponse.json({
      ok: true,
      checked,
      fired: fired.length,
      note: fired.length
        ? delivered
          ? `đã đẩy ${fired.length} nhóm lỗi qua Telegram`
          : TG_CHAT_ID
            ? `${fired.length} nhóm lỗi ĐÃ GHI nhưng Telegram TỪ CHỐI gửi — xem log server`
            : `${fired.length} nhóm lỗi ĐÃ GHI nhưng CHƯA ĐẨY — thiếu ADMIN_TELEGRAM_CHAT_ID`
        : undefined,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
