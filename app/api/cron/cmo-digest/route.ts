// app/api/cron/cmo-digest/route.ts
// M0.2 (track Marketing Autopilot) — "CMO quân sư" digest tự động, 1 lần/ngày.
// Đọc lại RPC marketing/dashboard đã có (lib/marketing/cmo-digest.ts), nhờ LLM
// tóm tắt, gửi Telegram cho admin qua CHÍNH kênh đã dùng cho alert đăng nhập
// (ADMIN_TELEGRAM_CHAT_ID, lib/admin/alert.ts) — không cần thêm env mới.
// Read-only tuyệt đối, no-op an toàn nếu thiếu cấu hình.
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
// Thiếu dòng này, Next 14 vẫn thử prerender lúc build → withCronLog bắt được
// lỗi "Dynamic server usage" rồi ghi vào cron_runs, sinh hàng trăm dòng lỗi
// GIẢ mỗi lần deploy và chôn vùi lỗi thật (S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { generateCmoDigestText } from '@/lib/marketing/cmo-digest';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('cmo-digest', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  // CỐ Ý KHÔNG thoát sớm khi thiếu ADMIN_TELEGRAM_CHAT_ID — cùng lỗi thiết kế
  // đã vá ở anomaly-alerts (S2): một kênh GỬI chưa cấu hình làm chết luôn cả
  // việc DỰNG báo cáo, nên suốt 14 ngày không có bản digest nào TỒN TẠI, chứ
  // không phải có mà không gửi được. Nay vẫn dựng và vẫn ghi vào events để
  // panel admin đọc; Telegram chỉ là đường đẩy thêm.
  //
  // ⚠️ Digest này gọi LLM nên KHÔNG dựng khi thiếu cấu hình sẽ tiết kiệm tiền
  // — nhưng đổi lại là mù hoàn toàn. Chi phí một lượt tóm tắt/ngày là nhỏ so
  // với việc không biết gì suốt hai tuần.
  try {
    const { text, ga4 } = await generateCmoDigestText();
    let delivered = false;
    if (TG_CHAT_ID) {
      await tgSendMessage(
        TG_CHAT_ID,
        '🎖️ CMO Digest — ' + new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + '\n\n' + text,
      );
      delivered = true;
    }
    await logCmoDigest(text, delivered, ga4);
    return NextResponse.json({
      ok: true,
      sent: delivered,
      note: TG_CHAT_ID ? undefined : 'đã dựng + ghi log, CHƯA đẩy — thiếu ADMIN_TELEGRAM_CHAT_ID',
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Lưu bản digest vào `events` để panel đọc kể cả khi chưa có kênh Telegram.
 *
 * Kèm luôn `meta.ga4` = snapshot GA4 THÔ (sessions/kênh/landing/activeNow +
 * internalVisitors). Lý do: GA4 chỉ đọc được ở nơi có service-account key, mà
 * key đó nằm trên Vercel — routine chat "Báo cáo CMO 8h10" chạy trong một phiên
 * Claude KHÁC, không có key, nên tự nó không bao giờ thấy GA4. Cron này chạy 8h00
 * ngay trước đó và đã có sẵn số, nên chỉ cần ghi lại một lượt là mọi thứ đọc được
 * Supabase (routine chat, panel admin, truy vấn tay) đều dùng chung được — không
 * phải phát tán credential thêm chỗ nào. Ghi cả khi `ga4=null` để phân biệt
 * "hôm đó GA4 hỏng" với "hôm đó cron không chạy".
 */
async function logCmoDigest(text: string, delivered: boolean, ga4: unknown): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: 'cmo_digest',
        platform: 'web',
        meta: { text, delivered, ga4: ga4 ?? null },
      }),
    });
  } catch {
    /* best-effort */
  }
}
