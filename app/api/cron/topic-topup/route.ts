// app/api/cron/topic-topup/route.ts
// Nạp chủ đề hằng tuần cho 2 cron viết bài (cron-master-write → /nghien-cuu,
// cron-khao-luan → blog.html). Mặc định 21 chủ đề mỗi bề mặt = 3 bài/ngày × 7
// ngày, khớp đúng nhịp hai cron đang chạy.
//
// Chạy THỨ TƯ 8h sáng VN (0 1 * * 3) — SAU keyword-suggest (T3) đúng một ngày
// để lượt nạp luôn ăn được mẻ Google Suggest mới nhất. Né T2/T6 (autopilot),
// CN (content-pack).
//
// GỬI Telegram admin: khác keyword-suggest (job nuôi dữ liệu, chạy im lặng),
// job này quyết định 42 bài sắp đăng — cần người liếc qua tiêu đề mỗi tuần.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được —
// thiếu `force-dynamic` thì Next thử prerender lúc build rồi ghi lỗi GIẢ vào
// cron_runs (đúng lỗ hổng S0 track COO đã vá).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 1 lượt LLM + vài lượt PostgREST. 300 = trần Node của Vercel Pro.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runTopicTopup, DEFAULT_PER_SURFACE } from '@/lib/content/topic-topup';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const ADMIN_CHAT = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('topic-topup', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const perSurface = Number(url.searchParams.get('per') || '') || DEFAULT_PER_SURFACE;
  const dryRun = url.searchParams.get('dry') === '1';

  const r = await runTopicTopup({ perSurface, dryRun });

  // Không có gì để nạp thì im lặng — nhét một tin nhắn tuần vào máy Henry cho
  // một lượt chạy không cần quyết định gì chỉ làm loãng mấy cảnh báo THẬT.
  if (ADMIN_CHAT && r.inserted > 0) {
    const src = Object.entries(r.sources).map(([k, v]) => `${k} ${v}`).join(' · ');
    // `tgSendMessage` gửi TEXT THUẦN (không parse_mode) — đừng thêm thẻ HTML,
    // nó sẽ hiện nguyên chuỗi `<b>` trên máy người nhận.
    await tgSendMessage(
      ADMIN_CHAT,
      `📝 Nạp chủ đề tuần\n\n` +
        `Đã thêm ${r.inserted} chủ đề\n` +
        `• /nghien-cuu: ${r.bySurface['nghien-cuu'] || 0}\n` +
        `• blog (khảo luận): ${r.bySurface['khao-luan'] || 0}\n\n` +
        `Nguồn cầu: ${src || '—'}\n` +
        `Loại vì trùng bài đã có: ${r.deduped}`,
    ).catch(() => {});
  }

  // `note` hiện thẳng trong panel "Cron & Jobs" của admin.
  return NextResponse.json({
    ok: true,
    ...r,
    note:
      r.note ||
      `+${r.inserted} chủ đề (nghiên cứu ${r.bySurface['nghien-cuu'] || 0} · khảo luận ${r.bySurface['khao-luan'] || 0}) · loại trùng ${r.deduped}`,
  });
}
