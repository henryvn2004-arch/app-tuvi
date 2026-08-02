// app/api/cron/media-build/route.ts
// M2 (track Media Pipeline) — dựng hàng đợi bài đăng mỗi ngày.
//
// CHỈ XẾP HÀNG, KHÔNG ĐĂNG. Bài nằm ở trạng thái `queued` cho tới khi Henry bấm
// duyệt trong admin — theo đúng tiền lệ shadow-mode của M0.6: công tắc tổng
// `social.autopost_enabled` mặc định false và code không bao giờ tự bật.
// Đăng nhầm lên trang công khai không rút lại được như một dòng DB.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Mỗi bài tốn 1 lượt LLM viết caption + 1 lượt gate brand-check (tầng LLM).
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { buildMediaQueue } from '@/lib/media/build';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('media-build', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await buildMediaQueue();

  // Chỉ báo khi có bài mới chờ duyệt — đó là lúc cần người làm gì đó. Bỏ qua
  // vài bài vì trích không ra câu là chuyện thường ngày, không đáng gọi ai.
  if (r.built.length && TG_CHAT_ID) {
    const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const lines = r.built.map((b, i) => `${i + 1}. ${b.title}\n   “${b.quote}”`);
    await tgSendMessage(
      TG_CHAT_ID,
      `🗂️ ${r.built.length} bài mới chờ duyệt — ${day}\n\n${lines.join('\n\n')}\n\n` +
        `Vào Admin → Marketing → Hàng Đợi Bài Đăng để xem ảnh và duyệt.`,
    );
  }

  return NextResponse.json({
    ok: true,
    built: r.built.length,
    skipped: r.skipped.length,
    skippedReasons: r.skipped.slice(0, 10),
  });
}
