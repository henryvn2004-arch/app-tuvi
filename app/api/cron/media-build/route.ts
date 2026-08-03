// app/api/cron/media-build/route.ts
// M2+M3 (track Media Pipeline) — dựng bài rồi ĐĂNG LUÔN, mỗi ngày một lượt.
//
// Bản M2 dừng ở hàng đợi chờ Henry bấm duyệt. Henry chốt bỏ khâu đó: dựng xong
// đăng thẳng. Cái phanh còn lại là `social.autopost_enabled` — tắt được bằng
// một dòng SQL, không cần deploy.
//
// Hai bước TÁCH nhau chứ không gộp: `publishQueue()` xả cả những bài tồn từ
// lượt trước, nên hôm nào không dựng được bài mới thì backlog vẫn chạy tiếp.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Mỗi bài tốn 1 lượt LLM viết caption + 1 lượt gate brand-check, rồi mới tới
// lượt đăng. Đăng để phần đuôi ngân sách thời gian.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { buildMediaQueue } from '@/lib/media/build';
import { publishQueue, formatPublishReport } from '@/lib/media/publish';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

/** Chừa lại cho khâu đăng, tính từ lúc vào route (maxDuration 300s). */
const PUBLISH_BUDGET_MS = 90_000;
const RUN_BUDGET_MS = 270_000;

export async function GET(request: NextRequest) {
  return withCronLog('media-build', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const startedAt = Date.now();
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const built = await buildMediaQueue();

  // Ngân sách còn lại sau khâu dựng; sàn 20s để lượt đăng không bị bóp tới mức
  // vô nghĩa khi phần LLM chạy lâu bất thường.
  const left = RUN_BUDGET_MS - (Date.now() - startedAt);
  const deadlineMs = Date.now() + Math.max(20_000, Math.min(PUBLISH_BUDGET_MS, left));
  const posted = await publishQueue({ deadlineMs });

  if (TG_CHAT_ID) {
    const report = formatPublishReport(posted);
    // Im lặng khi không có gì xảy ra — không dựng được bài, không đăng được bài,
    // không có gì hỏng. Bản tin ngày nào cũng gửi thì ngày có chuyện cũng trôi qua.
    if (built.built.length || report) {
      const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const parts = [`🗂️ Bài đăng mạng xã hội — ${day}`];
      if (built.built.length) {
        parts.push(
          `\n📝 Dựng mới ${built.built.length} bài:\n` +
            built.built.map((b, i) => `${i + 1}. ${b.title}\n   “${b.quote}”`).join('\n\n'),
        );
      }
      if (report) parts.push('\n' + report);
      await tgSendMessage(TG_CHAT_ID, parts.join('\n'));
    }
  }

  return NextResponse.json({
    ok: true,
    built: built.built.length,
    skipped: built.skipped.length,
    skippedReasons: built.skipped.slice(0, 10),
    published: posted.published.length,
    failed: posted.failed.length,
    remaining: posted.remaining,
    stuck: posted.stuck,
    stoppedReason: posted.stoppedReason,
  });
}
