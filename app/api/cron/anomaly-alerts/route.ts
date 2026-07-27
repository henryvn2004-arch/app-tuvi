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
import { logOpsAlerts } from '@/lib/ops/alerts';

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
  // CỐ Ý KHÔNG thoát sớm khi thiếu ADMIN_TELEGRAM_CHAT_ID.
  //
  // Bản trước thoát ngay ở đây, tức một kênh GỬI chưa cấu hình làm chết luôn cả
  // hệ PHÁT HIỆN — hệ quả là suốt 14 ngày không có cảnh báo nào được TÍNH, chứ
  // không phải "tính rồi mà không gửi được". Nhìn từ ngoài, im lặng vì đã chết
  // trông y hệt im lặng vì mọi thứ đều ổn (lỗ P0-1, track COO).
  //
  // Nay: luôn chạy check, luôn ghi vào `events` cho panel Vận Hành đọc; Telegram
  // chỉ là đường ĐẨY THÊM. Chưa cấu hình thì cảnh báo vẫn còn nguyên chỗ để xem,
  // và `note` dưới đây nói rõ là chưa ai được báo.
  try {
    const { fired, checked } = await checkAnomalies();

    let delivered = false;
    if (fired.length && TG_CHAT_ID) {
      const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const text = `🚨 Cảnh báo bất thường — ${time}\n\n` + fired.map((f) => `• ${f.text}`).join('\n');
      await tgSendMessage(TG_CHAT_ID, text);
      delivered = true;
    }
    if (fired.length) await logOpsAlerts(fired, delivered);

    return NextResponse.json({
      ok: true,
      checked,
      fired: fired.length,
      // Hiện thẳng trong panel "Cron & Jobs": có cảnh báo mà chưa đẩy đi được là
      // một sự cố riêng, phải nhìn thấy chứ không được lẫn vào "chạy ok".
      note: TG_CHAT_ID
        ? undefined
        : fired.length
          ? `${fired.length} cảnh báo ĐÃ GHI nhưng CHƯA ĐẨY — thiếu ADMIN_TELEGRAM_CHAT_ID`
          : 'chưa có ADMIN_TELEGRAM_CHAT_ID (không có cảnh báo nào để đẩy)',
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
