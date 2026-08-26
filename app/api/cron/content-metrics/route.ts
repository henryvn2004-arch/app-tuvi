// app/api/cron/content-metrics/route.ts
// Kéo view/like/comment/subscriber từ nền tảng về `content_metrics`.
//
// Trước route này site KHÔNG đo được một số liệu nào từ bên ngoài — 15 video
// YouTube đang live mà chưa bao giờ biết được bao nhiêu view. Đây là tầng dữ
// liệu còn thiếu của trang Kho Nội Dung, không phải một panel nữa.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được —
// thiếu `force-dynamic` thì Next chạy nó ngay trong `next build` rồi ghi lỗi
// GIẢ vào `cron_runs` (bài học S0 track COO, và `/api/cron-push` đã cắn thật).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// `collectContentMetrics` tự dừng trước mốc 240s, chừa biên cho Telegram.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { collectContentMetrics, formatCollectReport } from '@/lib/metrics/collect';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('content-metrics', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await collectContentMetrics();
  const report = formatCollectReport(result);

  // CHỈ nhắn khi có kênh đóng cửa. Ngày nào cũng gửi "đã kéo 15/15 bài" thì
  // bản tin thành tiếng ồn, và hôm có chuyện thật cũng bị lướt qua.
  if (report && TG_CHAT_ID && result.perChannel.some(c => c.blocked)) {
    const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    await tgSendMessage(TG_CHAT_ID, `${report}\n\n— ${day}`);
  }

  // `note` hiện thẳng trong `cron_runs`/panel "Cron & Jobs" — `withCronLog`
  // chỉ nhặt được nó qua khoá `note` (cùng quy ước với keyword-suggest). Đổi
  // tên `skipped`→`unsupportedChannels` (vá lỗi status luôn báo 'skip', xem
  // lib/metrics/collect.ts) làm mất luôn tín hiệu "kênh chưa có bộ đọc" khỏi
  // dòng log nếu không viết lại note ở đây — mất một cách IM LẶNG là đúng
  // kiểu hỏng repo này tự dặn tránh.
  const note = result.perChannel.length
    ? result.perChannel.map(c => `${c.channel}: ${c.saved}/${c.targets}${c.blocked ? ` (${c.blocked})` : ''}`).join(' · ') +
      (result.unsupportedChannels.length ? ` · chưa có bộ đọc: ${result.unsupportedChannels.join(', ')}` : '')
    : result.unsupportedChannels.length
      ? `chưa có bộ đọc: ${result.unsupportedChannels.join(', ')}`
      : 'không có nội dung nào cần cập nhật';

  // `result` đã mang `ok` — spread sau một khoá `ok` viết tay là nó ghi đè im
  // lặng (tsc bắt được: TS2783).
  return NextResponse.json({ ...result, note });
}
