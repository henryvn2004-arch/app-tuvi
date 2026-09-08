// app/api/cron/tool-usage-alerts/route.ts
// Digest "dùng tool" mỗi 15 phút, gửi CẢ Telegram lẫn WhatsApp — xem
// lib/ops/tool-usage-alerts.ts. Route đọc request.headers (auth CRON_SECRET)
// nên KHÔNG prerender tĩnh được (cùng lý do đã ghi ở anomaly-alerts/route.ts).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { buildToolUsageDigest } from '@/lib/ops/tool-usage-alerts';
import { tgSendMessage } from '@/lib/channels/telegram';
import { waSendText } from '@/lib/channels/whatsapp';
import { logOpsAlerts } from '@/lib/ops/alerts';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';
const WA_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || '';

export async function GET(request: NextRequest) {
  // retry AN TOÀN: buildToolUsageDigest() dời cursor ngay sau khi đọc xong,
  // trước khi gửi — một lượt thử lại đọc lô MỚI chứ không đọc trùng lô cũ.
  return withCronLog('tool-usage-alerts', 'vercel', () => handle(request), { retry: true });
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  // CỐ Ý KHÔNG thoát sớm khi thiếu cấu hình kênh gửi — cùng lý do đã ghi ở
  // anomaly-alerts/route.ts: một kênh GỬI chưa cấu hình không được phép làm
  // chết cả việc PHÁT HIỆN.
  try {
    const { text, total, checked } = await buildToolUsageDigest();

    let delivered = false;
    if (text && (TG_CHAT_ID || WA_NUMBER)) {
      const results = await Promise.allSettled([
        TG_CHAT_ID ? tgSendMessage(TG_CHAT_ID, text) : Promise.resolve(false),
        WA_NUMBER ? waSendText(WA_NUMBER, text).then(() => true) : Promise.resolve(false),
      ]);
      delivered = results.some((r) => r.status === 'fulfilled' && r.value === true);
    }
    if (total > 0) await logOpsAlerts([{ key: 'tool_usage_digest', text: text || '' }], delivered);

    return NextResponse.json({
      ok: true,
      checked,
      total,
      note:
        total > 0
          ? delivered
            ? `đã đẩy digest ${total} lượt qua Telegram/WhatsApp`
            : TG_CHAT_ID || WA_NUMBER
              ? `${total} lượt ĐÃ GHI nhưng cả hai kênh đều TỪ CHỐI gửi — xem log server`
              : `${total} lượt ĐÃ GHI nhưng CHƯA ĐẨY — thiếu ADMIN_TELEGRAM_CHAT_ID lẫn ADMIN_WHATSAPP_NUMBER`
          : undefined,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
