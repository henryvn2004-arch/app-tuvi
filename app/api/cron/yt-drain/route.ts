// app/api/cron/yt-drain/route.ts
// M1 (track Media Pipeline) — xả kho video lên YouTube, nhỏ giọt mỗi ngày.
//
// Cron 11h VN hằng ngày. Không tự sản xuất gì: `auto-pipeline` (pg_cron 07:00)
// vẫn là nơi đẻ ra `van_dap` + TTS + mix như cũ. Route này chỉ nối lại khâu CUỐI
// vốn đã đứt từ 16/07, và quan trọng hơn — **làm cho việc nó đứt nhìn thấy
// được**. Trước đây `youtube-upload` chỉ ghi `yt_error` vào một cột DB rồi thôi,
// nên kho tắc suốt 16 ngày mà không có lấy một tín hiệu nào ra ngoài.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được —
// thiếu `force-dynamic` thì Next thử prerender lúc build rồi ghi lỗi GIẢ vào
// `cron_runs` (bài học S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Mỗi upload tải nguyên MP4 rồi đẩy lên YouTube. `drainYouTubeQueue` tự dừng
// trước mốc 240s, chừa biên cho lượt cuối và cho bước đếm/gửi Telegram.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { drainYouTubeQueue, formatDrainReport } from '@/lib/media/yt-drain';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';
/** Chừa 60s cho phần đếm kho + gửi Telegram sau vòng lặp. */
const TIME_BUDGET_MS = 240_000;

export async function GET(request: NextRequest) {
  return withCronLog('yt-drain', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await drainYouTubeQueue({ deadlineMs: Date.now() + TIME_BUDGET_MS });
  const report = formatDrainReport(result);

  // Kho rỗng → `report` rỗng → im lặng. Cố ý khác CMO Digest (luôn gửi đều đặn):
  // một bản tin "hôm nay không có gì" mỗi ngày sẽ nhanh chóng bị lướt qua, và
  // lúc đó bản tin CÓ chuyện cũng chịu chung số phận.
  if (report && TG_CHAT_ID) {
    const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    await tgSendMessage(TG_CHAT_ID, `📹 Xả kho YouTube — ${day}\n\n${report}`);
  }

  return NextResponse.json({
    ok: true,
    attempted: result.attempted,
    uploaded: result.uploaded.length,
    failed: result.failed.length,
    remaining: result.remaining,
    stuck: result.stuck,
    stoppedReason: result.stoppedReason,
  });
}
