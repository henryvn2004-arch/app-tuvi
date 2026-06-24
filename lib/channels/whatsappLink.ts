// lib/channels/whatsappLink.ts
// ============================================================
// LIÊN KẾT WhatsApp ↔ ví Lượng — VỎ MỎNG trên lib/channels/store (generic).
//
// Giống telegramLink.ts: chỉ bind platform='whatsapp' + dựng deep link wa.me.
// Khác Telegram ở DEEP LINK: WhatsApp không có /start?token, nên ta dùng
// wa.me/<number>?text=/link <token> — user bấm sẽ mở WhatsApp với tin SOẠN
// SẴN "/link <token>", gửi đi → webhook (route.ts) tiêu thụ qua consumeLinkToken.
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

const PLATFORM = 'whatsapp';

/** Số WhatsApp doanh nghiệp (CHỈ chữ số, không + / khoảng trắng) để dựng wa.me.
 *  Mặc định = số test sandbox; đổi sang số WABA production qua env khi go-live. */
export const WA_NUMBER = (process.env.WHATSAPP_NUMBER || '15556528238').replace(/\D/g, '');

/** Số lượt free/ngày cho WhatsApp CHƯA link (chống đốt token). */
export const FREE_DAILY_CAP = Number(process.env.WHATSAPP_FREE_DAILY || '3');

/** Lệnh soạn sẵn để liên kết (webhook so khớp prefix này). */
export const LINK_CMD = '/link';

/** Web (đã đăng nhập) sinh token 1 lần → { token, url } deep link wa.me.
 *  url mở WhatsApp với tin soạn sẵn "/link <token>". */
export async function createLinkToken(userId: string): Promise<{ token: string; url: string } | null> {
  const token = await chatCreateLinkToken(PLATFORM, userId);
  if (!token) return null;
  const text = encodeURIComponent(`${LINK_CMD} ${token}`);
  return { token, url: `https://wa.me/${WA_NUMBER}?text=${text}` };
}

/** Webhook tiêu thụ "/link <token>" → lưu map → trả userId (null nếu sai/hết hạn). */
export const consumeLinkToken = (token: string, waId: string) =>
  chatConsumeLinkToken(PLATFORM, token, waId);

/** Tra ngược wa_id (số điện thoại) → user_id đã link (null nếu chưa). */
export const resolveLinkedUser = (waId: string) => chatResolveLinkedUser(PLATFORM, waId);

/** Tra xuôi user_id → wa_id đã link (cho UI web). */
export const getLinkedWhatsappId = (userId: string) => chatGetLinkedExternalId(PLATFORM, userId);

/** Gỡ link (web bấm "Hủy liên kết"). */
export const unlinkWhatsapp = (userId: string) => chatUnlink(PLATFORM, userId);

/** Số lượt free đã dùng hôm nay (WhatsApp CHƯA link). */
export const getFreeUsageToday = (waId: string) => chatGetFreeUsageToday(PLATFORM, waId);

/** Tăng lượt free hôm nay (atomic) → count mới, null nếu lỗi. */
export const incrFreeUsage = (waId: string) => chatIncrFreeUsage(PLATFORM, waId);
