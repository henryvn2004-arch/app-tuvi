// app/api/cron/backlink-prospect/route.ts
// Tuần một lần: tìm cơ hội backlink mới bằng Brave Search API (TUỲ CHỌN — xem
// lib/backlinks/prospecting.ts). Chưa cấu hình key thì route vẫn 200, chỉ
// không tìm được gì tự động — cơ hội vẫn thêm được bằng tay trong admin.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runProspecting } from '@/lib/backlinks/prospecting';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('backlink-prospect', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await runProspecting();

  // Chỉ báo khi THẬT SỰ tìm được gì mới — chưa cấu hình key thì im lặng mỗi
  // tuần, không cần nhắc lại một việc tay đã ghi rõ trong docs.
  if (TG_CHAT_ID && r.inserted > 0) {
    await tgSendMessage(
      TG_CHAT_ID,
      `🔍 Backlink — tìm cơ hội mới\n\nTìm thấy ${r.found}, thêm mới ${r.inserted} (${r.skipped} đã có sẵn).\nMở Admin → Backlink để xem và soạn nội dung.`,
    );
  }

  return NextResponse.json({ ok: true, ...r });
}
