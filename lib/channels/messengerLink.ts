// lib/channels/messengerLink.ts
// ============================================================
// LIÊN KẾT Facebook Messenger ↔ ví Lượng — VỎ MỎNG trên lib/channels/store.
//
// Giống telegramLink.ts / whatsappLink.ts: bind platform='messenger' + dựng
// deep link m.me. Khác DEEP LINK: Messenger không pre-fill text như WhatsApp,
// nên dùng m.me/<PAGE_ID>?ref=<token> — khi user mở, webhook (route.ts) nhận
// được `ref` qua sự kiện messaging_referrals (thread cũ) hoặc postback Get
// Started (thread mới) → consumeLinkToken. Có fallback lệnh chữ "/link <token>".
// ============================================================

import {
  chatCreateLinkToken,
  chatConsumeLinkToken,
  chatResolveLinkedUser,
  chatGetLinkedExternalId,
  chatUnlink,
  chatGetFreeUsageToday,
  chatIncrFreeUsage,
} from './store';

const PLATFORM = 'messenger';

/** Page ID (numeric) của Facebook Page để dựng deep link m.me.
 *  Mặc định = page "Tử Vi Minh Bảo"; đổi qua env nếu thay page. */
export const PAGE_ID = (process.env.MESSENGER_PAGE_ID || '1218919127970486').replace(/\D/g, '');

/** Số lượt free/ngày cho Messenger CHƯA link (chống đốt token). */
export const FREE_DAILY_CAP = Number(process.env.MESSENGER_FREE_DAILY || '3');

/** Lệnh chữ để liên kết (fallback nếu ref không tới — webhook so khớp prefix). */
export const LINK_CMD = '/link';

/** Web (đã đăng nhập) sinh token 1 lần → { token, url } deep link m.me.
 *  url mở Messenger; ref=<token> được webhook tiêu thụ tự động. */
export async function createLinkToken(userId: string): Promise<{ token: string; url: string } | null> {
  const token = await chatCreateLinkToken(PLATFORM, userId);
  if (!token) return null;
  return { token, url: `https://m.me/${PAGE_ID}?ref=${encodeURIComponent(token)}` };
}

/** Webhook tiêu thụ token (từ ref hoặc "/link <token>") → lưu map → trả userId. */
export const consumeLinkToken = (token: string, psid: string) =>
  chatConsumeLinkToken(PLATFORM, token, psid);

/** Tra ngược psid → user_id đã link (null nếu chưa). */
export const resolveLinkedUser = (psid: string) => chatResolveLinkedUser(PLATFORM, psid);

/** Tra xuôi user_id → psid đã link (cho UI web). */
export const getLinkedMessengerId = (userId: string) => chatGetLinkedExternalId(PLATFORM, userId);

/** Gỡ link (web bấm "Hủy liên kết"). */
export const unlinkMessenger = (userId: string) => chatUnlink(PLATFORM, userId);

/** Số lượt free đã dùng hôm nay (Messenger CHƯA link). */
export const getFreeUsageToday = (psid: string) => chatGetFreeUsageToday(PLATFORM, psid);

/** Tăng lượt free hôm nay (atomic) → count mới, null nếu lỗi. */
export const incrFreeUsage = (psid: string) => chatIncrFreeUsage(PLATFORM, psid);
