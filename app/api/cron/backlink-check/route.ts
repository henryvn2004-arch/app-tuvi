// app/api/cron/backlink-check/route.ts
// Mỗi sáng: (1) hỏi Bing Webmaster Tools xem có backlink MỚI nào mình chưa
// từng biết tới không (miễn phí, xem lib/backlinks/bing-webmaster.ts), rồi
// (2) re-fetch các trang mang backlink ĐÃ CÓ trong bảng, xác nhận còn sống,
// đọc lại dofollow/nofollow + anchor text (lib/backlinks/tracker.ts), rồi
// (3) ghé lại các trang ĐANG NHÚNG widget xem dòng ghi nguồn còn không
// (lib/growth/embeds.ts). Cả ba chỉ ĐỌC trang công khai.
//
// 🔑 Gộp việc (3) vào ĐÂY thay vì mở cron thứ tư: cùng một hành vi (fetch
// HTML trang bên thứ ba mỗi ngày), cùng ngân sách thời gian, và mỗi cron
// thêm vào là một mục nữa phải nuôi trong sổ `lib/ops/jobs.ts`.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { discoverBingBacklinks } from '@/lib/backlinks/bing-webmaster';
import { runLinkCheck } from '@/lib/backlinks/tracker';
import { runEmbedCheck, formatEmbedReport } from '@/lib/growth/embeds';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('backlink-check', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const bing = await discoverBingBacklinks();
  const r = await runLinkCheck();
  const embed = await runEmbedCheck();

  const lines: string[] = [];
  // Backlink MỚI mình chưa từng biết là tin ĐÁNG MỪNG, báo ngay.
  if (bing.newLinks > 0) {
    lines.push(`🎉 Bing Webmaster phát hiện ${bing.newLinks} backlink MỚI (chưa từng có trong hệ thống)!`);
  }
  // Link VỪA CHẾT là tin đáng biết ngay. "Đã kiểm N link, tất cả còn sống"
  // mỗi sáng thì mau chóng bị lướt qua như mọi bản tin đều đặn.
  if (r.newlyDead.length) {
    const dead = r.newlyDead.slice(0, 15).map((u) => `  • ${u}`).join('\n');
    const more = r.newlyDead.length > 15 ? `\n  …và ${r.newlyDead.length - 15} link nữa` : '';
    lines.push(`💔 Backlink vừa MẤT (${r.newlyDead.length}):\n${dead}${more}`);
  }
  const embedLine = formatEmbedReport(embed);
  if (embedLine) lines.push(embedLine);
  if (TG_CHAT_ID && lines.length) {
    lines.push('', 'Mở Admin → Backlink để xem chi tiết.');
    await tgSendMessage(TG_CHAT_ID, lines.join('\n\n'));
  }

  return NextResponse.json({ ok: true, bing, embed, ...r });
}
