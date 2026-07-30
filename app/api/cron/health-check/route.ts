// app/api/cron/health-check/route.ts
// Canh prod còn sống, mỗi 30 phút. Xem lib/ops/health-check.ts để biết sự cố
// nào sinh ra nó và ba luật thiết kế.
//
// Im lặng khi mọi thứ ổn (giống anomaly-alerts, khác digest vốn gửi đều đặn).
// `dynamic = 'force-dynamic'` vì route đọc headers để xác thực CRON_SECRET —
// thiếu dòng này Next 14 vẫn thử prerender lúc build rồi ghi hàng loạt lỗi GIẢ
// vào `cron_runs` mỗi lần deploy (bài học S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { checkProdHealth } from '@/lib/ops/health-check';
import { tgSendMessageReturnId } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('health-check', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { problems, checked } = await checkProdHealth();

  // Dùng tgSendMessageReturnId (không phải tgSendMessage) để BIẾT tin có tới
  // nơi hay không: bản kia nuốt lỗi và trả void, nên "đã gửi" và "gửi hỏng"
  // trông y hệt nhau. Với cảnh báo prod-down thì phân biệt được hai ca đó là
  // bắt buộc — đúng loại nhầm lẫn đã làm sự cố 28/07 chìm mất.
  let delivered = false;
  if (problems.length && TG_CHAT_ID) {
    const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const text =
      `🔴 PROD CÓ VẤN ĐỀ — ${time}\n\n` +
      problems.map((p) => `• ${p.text}`).join('\n\n') +
      '\n\nCòn hỏng thì tin này nhắc lại mỗi 30 phút.';
    delivered = (await tgSendMessageReturnId(TG_CHAT_ID, text)) !== null;
  }

  return NextResponse.json({
    ok: true,
    checked: checked.join(','),
    problems: problems.length,
    keys: problems.map((p) => p.key).join(',') || undefined,
    // Nói thẳng khi phát hiện được mà không báo được cho ai — im lặng vì chưa
    // cấu hình kênh gửi trông giống hệt im lặng vì prod đang ổn.
    note: problems.length
      ? delivered
        ? undefined
        : TG_CHAT_ID
          ? 'phát hiện được nhưng GỬI TELEGRAM HỎNG'
          : 'phát hiện được nhưng CHƯA CẤU HÌNH ADMIN_TELEGRAM_CHAT_ID'
      : undefined,
  });
}
