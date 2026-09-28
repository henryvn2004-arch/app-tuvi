// lib/channels/notify.ts
// Nhắn chủ động cho người dùng trên (các) kênh chat đã gắn với tài khoản —
// vd "đã nhận tiền" ngay sau khi chuyển khoản. Best-effort: kênh chưa cấu
// hình / ngoài khung tin (Zalo 48h, Messenger & WhatsApp 24h) thì nền tảng từ
// chối, ta chỉ log — KHÔNG được làm hỏng luồng gọi (webhook thanh toán).
import { zaloSendText, zaloSendFile, ZALO_PLATFORM } from './zalo';
import { msgrSendText, msgrSendFile } from './messenger';
import { waSendText, waSendFile } from './whatsapp';
import { tgSendMessage, tgSendFile } from './telegram';

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

const FILE_SENDERS: Record<string, (id: string, data: Buffer, filename: string, caption?: string) => Promise<void>> = {
  [ZALO_PLATFORM]: zaloSendFile,
  messenger: msgrSendFile,
  whatsapp: waSendFile,
  telegram: tgSendFile,
};

/**
 * Gửi một FILE (PDF báo cáo) tới mọi kênh chat đang gắn với `userId` — nút
 * "Gửi về Zalo" của trang Báo cáo. Trả `{linked, sent}`: số kênh đã gắn và số
 * kênh gửi được (nền tảng từ chối ngoài khung tin 24–48h thì chỉ log).
 */
export async function sendFileToUserChats(
  userId: string,
  data: Buffer,
  filename: string,
  caption?: string,
): Promise<{ linked: number; sent: string[] }> {
  const out = { linked: 0, sent: [] as string[] };
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return out;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_links?user_id=eq.${encodeURIComponent(userId)}&select=platform,external_id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) return out;
    const rows = (await res.json()) as { platform: string; external_id: string }[];
    for (const r of rows) {
      const send = FILE_SENDERS[r.platform];
      if (!send) continue;
      out.linked++;
      try {
        await send(r.external_id, data, filename, caption);
        out.sent.push(r.platform);
      } catch (e) {
        console.error(`[notify] gửi file ${r.platform} lỗi`, e);
      }
    }
  } catch (e) {
    console.error('[notify] tra chat_links lỗi', e);
  }
  return out;
}
