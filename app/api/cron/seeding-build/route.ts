// app/api/cron/seeding-build/route.ts
// Trợ lý seeding group — mỗi sáng soạn sẵn bài cho các group tới lượt.
//
// KHÁC hẳn `media-build`: route đó dựng bài RỒI ĐĂNG luôn lên Page. Route này
// dừng ở chỗ soạn xong, vì Groups API đã bị Meta gỡ (22/04/2024) nên không có
// đường hợp lệ nào để máy đăng vào group — xem đầu `lib/media/seeding.ts`.
// Không có adapter nào được import ở đây, và đó là chủ đích: một lần lỡ tay nối
// vào cũng không đủ để bài tự bay ra ngoài.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Mỗi bài tốn 1 lượt LLM viết caption + 1 lượt gate brand-check, và mỗi group
// một bài riêng — nặng hơn media-build vì không dùng chung caption.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { buildSeedingDrafts, formatSeedingReport } from '@/lib/media/seeding';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('seeding-build', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await buildSeedingDrafts();

  if (TG_CHAT_ID) {
    const report = formatSeedingReport(r);
    // Im lặng khi không có gì xảy ra — chưa khai group nào, hoặc không group nào
    // tới lượt hôm nay. Bản tin ngày nào cũng gửi thì ngày có chuyện cũng trôi qua.
    if (report) {
      const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      await tgSendMessage(TG_CHAT_ID, `🌱 Seeding group — ${day}\n\n${report}`);
    }
  }

  return NextResponse.json({
    ok: true,
    built: r.built.length,
    due: r.due,
    pending: r.pending,
    skipped: r.skipped.length,
    skippedReasons: r.skipped.slice(0, 10),
    stoppedReason: r.stoppedReason,
  });
}
