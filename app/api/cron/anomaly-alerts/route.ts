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
import { checkAnomalies, commitAnomalyCooldown } from '@/lib/marketing/anomaly-alerts';
import { tgSendMessage } from '@/lib/channels/telegram';
import { logOpsAlerts } from '@/lib/ops/alerts';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  // retry: bật ĐƯỢC ở đây vì lượt chạy này idempotent — thuần đọc RPC, và
  // cooldown chỉ đóng dấu SAU khi Telegram gửi xong (commitAnomalyCooldown),
  // nên chạy lại lượt hỏng không phát trùng cũng không nuốt cảnh báo.
  //
  // CỐ Ý KHÔNG bật cho cron-master-write / cron-khao-luan: chúng pop
  // `topic_queue` rồi viết bài, một lượt hỏng giữa đường mà thử lại thành hai
  // bài. Cũng KHÔNG bật cho các job cấp Lượng/quà.
  //
  // Nói thẳng giới hạn: retry chỉ cứu lỗi TRONG tiến trình (RPC chớp, Telegram
  // 5xx). Lượt bị giết ngang thì không còn tiến trình nào để thử lại — ca đó
  // do dòng nhịp tim + cảnh báo `job_stuck` lo.
  return withCronLog('anomaly-alerts', 'vercel', () => handle(request), { retry: true });
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
      delivered = await tgSendMessage(TG_CHAT_ID, text);
      // Chỉ đóng dấu cooldown khi tin THẬT SỰ tới nơi (delivered=true).
      // tgSendMessage KHÔNG throw khi Telegram từ chối (chat_id sai, bot bị
      // chặn/gỡ...) — trước đây dòng này chạy vô điều kiện nên một lượt gửi
      // hỏng vẫn đóng dấu cooldown 20h, coi như "đã báo" dù chưa ai nhận được.
      if (delivered) await commitAnomalyCooldown(fired.map((f) => f.key));
    }
    if (fired.length) await logOpsAlerts(fired, delivered);

    return NextResponse.json({
      ok: true,
      checked,
      fired: fired.length,
      // Hiện thẳng trong panel "Cron & Jobs". Ba trạng thái phải phân biệt được
      // bằng mắt, vì chúng đòi ba phản ứng khác hẳn nhau: đã báo N chuyện · có
      // chuyện mà chưa báo được cho ai · không có gì để báo. Bản trước để trống
      // note ở nhánh đẩy thành công, nên một lượt gửi 3 cảnh báo trông giống hệt
      // một lượt yên ắng khi nhìn từ panel.
      note: fired.length
        ? delivered
          ? `đã đẩy ${fired.length} cảnh báo qua Telegram`
          : TG_CHAT_ID
            ? `${fired.length} cảnh báo ĐÃ GHI nhưng Telegram TỪ CHỐI gửi — xem log server (chat_id sai? bot bị chặn/gỡ?)`
            : `${fired.length} cảnh báo ĐÃ GHI nhưng CHƯA ĐẨY — thiếu ADMIN_TELEGRAM_CHAT_ID`
        : TG_CHAT_ID
          ? undefined
          : 'chưa có ADMIN_TELEGRAM_CHAT_ID (không có cảnh báo nào để đẩy)',
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
