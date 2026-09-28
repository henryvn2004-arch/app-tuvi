// lib/channels/notify.ts
// Nhắn chủ động cho người dùng trên (các) kênh chat đã gắn với tài khoản —
// vd "đã nhận tiền" ngay sau khi chuyển khoản. Best-effort: kênh chưa cấu
// hình / ngoài khung tin (Zalo 48h, Messenger & WhatsApp 24h) thì nền tảng từ
// chối, ta chỉ log — KHÔNG được làm hỏng luồng gọi (webhook thanh toán).
import { zaloSendText, ZALO_PLATFORM } from './zalo';
import { msgrSendText } from './messenger';
import { waSendText } from './whatsapp';
import { tgSendMessage } from './telegram';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SENDERS: Record<string, (id: string, text: string) => Promise<unknown>> = {
  [ZALO_PLATFORM]: zaloSendText,
  messenger: msgrSendText,
  whatsapp: waSendText,
  telegram: tgSendMessage,
};

/** Gửi `text` tới mọi kênh chat đang gắn với `userId`. Trả số kênh đã thử. */
export async function notifyUserOnChat(userId: string, text: string): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return 0;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_links?user_id=eq.${encodeURIComponent(userId)}&select=platform,external_id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) return 0;
    const rows = (await res.json()) as { platform: string; external_id: string }[];
    let n = 0;
    for (const r of rows) {
      const send = SENDERS[r.platform];
      if (!send) continue;
      n++;
      await send(r.external_id, text).catch((e) => console.error(`[notify] gửi ${r.platform} lỗi`, e));
    }
    return n;
  } catch (e) {
    console.error('[notify] tra chat_links lỗi', e);
    return 0;
  }
}
