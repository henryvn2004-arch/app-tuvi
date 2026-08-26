// app/api/cron/backlink-content/route.ts
// Mỗi sáng: soạn nội dung (email pitch / bài web2 / mô tả directory) cho các
// cơ hội đang `status='new'`. DỪNG Ở BẢN NHÁP — không adapter nào được import
// ở đây, xem lib/backlinks/content.ts + đầu migration-backlinks.sql.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Mỗi cơ hội tốn 1 lượt LLM soạn nội dung — nặng tương đương seeding-build.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { buildContentDrafts, formatBuildReport } from '@/lib/backlinks/content';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('backlink-content', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await buildContentDrafts();

  if (TG_CHAT_ID) {
    const report = formatBuildReport(r);
    if (report) {
      const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      await tgSendMessage(TG_CHAT_ID, `🔗 Backlink — ${day}\n\n${report}`);
    }
  }

  return NextResponse.json({
    ok: true,
    built: r.built.length,
    due: r.due,
    skipped: r.skipped.length,
    stoppedReason: r.stoppedReason,
  });
}
