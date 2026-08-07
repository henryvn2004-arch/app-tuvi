// app/api/cron/ops-digest/route.ts
// S5 (track COO) — Digest Vận Hành, 1 lần/ngày.
//
// KHÁC anomaly-alerts (S2): cái kia là CHUÔNG BÁO CHÁY, im khi không có gì.
// Cái này là ĐIỂM DANH — gửi đều đặn kể cả khi mọi thứ bình thường, vì một
// digest chỉ gửi lúc có vấn đề thì không phân biệt được với digest đã chết.
//
// Cũng như S2: LUÔN dựng và LUÔN ghi vào events; Telegram chỉ là đường đẩy
// thêm. Thiếu ADMIN_TELEGRAM_CHAT_ID thì bản digest vẫn còn nguyên trên panel
// Vận Hành, và `note` nói rõ là chưa đẩy được.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { tgSendMessage } from '@/lib/channels/telegram';
import { buildOpsDigest, logOpsDigest } from '@/lib/ops/digest';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const digest = await buildOpsDigest();
    const day = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    let delivered = false;
    if (TG_CHAT_ID) {
      const head = digest.hasIssues ? '🛠️ Vận Hành — CÓ VIỆC CẦN XEM' : '🛠️ Vận Hành — bình thường';
      delivered = await tgSendMessage(TG_CHAT_ID, `${head} · ${day}\n\n${digest.text}`);
    }
    await logOpsDigest(digest, delivered);

    return NextResponse.json({
      ok: true,
      hasIssues: digest.hasIssues,
      sent: delivered,
      note: TG_CHAT_ID
        ? delivered
          ? undefined
          : 'đã dựng + ghi log, Telegram TỪ CHỐI gửi — xem log server để biết lý do (chat_id sai? bot bị chặn/gỡ?)'
        : 'đã dựng + ghi log, CHƯA đẩy — thiếu ADMIN_TELEGRAM_CHAT_ID',
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return withCronLog('ops-digest', 'vercel', () => handle(request));
}
