// app/api/cron/backlink-broken-links/route.ts
// Tuần một lần (T5): quét outbound link của các trang roundup/tài nguyên
// trong danh sách tĩnh (lib/backlinks/seed-list.ts), tìm link CHẾT đúng
// ngách tử vi/tarot/chiêm tinh — cách backlink WHITE HAT nhất trong cả
// module: chỉ ra một lỗi THẬT trên trang người khác, không xin gì cả. Chỉ
// ĐỌC trang công khai — xem lib/backlinks/broken-links.ts.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runBrokenLinkScan } from '@/lib/backlinks/broken-links';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('backlink-broken-links', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await runBrokenLinkScan();

  // Chỉ báo khi thật sự có phát hiện — quét mà 0 link chết đúng ngách thì
  // im lặng, không cần một bản tin "đã soi, không có gì" mỗi tuần.
  if (TG_CHAT_ID && (r.inserted > 0 || r.enriched > 0)) {
    await tgSendMessage(
      TG_CHAT_ID,
      `🔗💀 Backlink — quét link chết\n\nĐã soi ${r.pagesScanned} trang, tìm thấy ${r.deadFound} link chết đúng ngách (mới ${r.inserted}, bổ sung ghi chú ${r.enriched}).\nMở Admin → Backlink để xem chi tiết + soạn email báo lỗi.`,
    );
  }

  return NextResponse.json({ ok: true, ...r });
}
