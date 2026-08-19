// app/api/cron/backlink-prospect/route.ts
// Tuần một lần: tìm cơ hội backlink mới qua BA nguồn độc lập — danh sách
// tĩnh + Google Alerts RSS (cả hai 0 API key) + Brave Search (TUỲ CHỌN, xem
// lib/backlinks/prospecting.ts). Thiếu Brave key thì hai nguồn kia vẫn chạy
// đều — cơ hội vẫn thêm được bằng tay trong admin ngoài ra.
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

  // Chỉ báo khi THẬT SỰ tìm được gì mới — nguồn chưa cấu hình thì im lặng
  // mỗi tuần, không cần nhắc lại một việc tay đã ghi rõ trong docs.
  if (TG_CHAT_ID && r.totalInserted > 0) {
    const lines = [`🔍 Backlink — tìm cơ hội mới`, ''];
    if (r.seedList.inserted) lines.push(`• Danh sách tĩnh: +${r.seedList.inserted}`);
    if (r.alertsRss.inserted) lines.push(`• Google Alerts (nhắc tên chưa gắn link): +${r.alertsRss.inserted}`);
    if (r.brave.inserted) lines.push(`• Brave Search: +${r.brave.inserted}`);
    if (r.alertsRss.configured === false) lines.push(`⏸️ Google Alerts: ${r.alertsRss.note}`);
    if (r.brave.configured === false) lines.push(`⏸️ Brave Search: ${r.brave.note}`);
    lines.push('', `Tổng ${r.totalInserted} cơ hội mới. Mở Admin → Backlink để xem và soạn nội dung.`);
    await tgSendMessage(TG_CHAT_ID, lines.join('\n'));
  }

  return NextResponse.json({ ok: true, ...r });
}
