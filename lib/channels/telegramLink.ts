// lib/channels/telegramLink.ts
// ============================================================
// LIÊN KẾT Telegram ↔ ví Lượng — VỎ MỎNG trên lib/channels/store (generic).
//
// Lưu trữ liên kết/usage đã gộp về store đa-nền-tảng (bảng chat_links /
// chat_link_tokens / chat_usage, cột platform). File này chỉ bind sẵn
// platform='telegram' + dựng deep link t.me, giữ NGUYÊN chữ ký cũ để
// route Telegram + route /link không phải đổi.
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

const PLATFORM = 'telegram';

/** Username bot (không kèm @) để dựng deep link t.me. */
export const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'tuviminhbao_bot';

/** Số lượt free/ngày cho Telegram CHƯA link (chống đốt token). */
export const FREE_DAILY_CAP = Number(process.env.TELEGRAM_FREE_DAILY || '3');

/** Web (đã đăng nhập) sinh token 1 lần → { token, url } deep link t.me. */
export async function createLinkToken(userId: string): Promise<{ token: string; url: string } | null> {
  const token = await chatCreateLinkToken(PLATFORM, userId);
  if (!token) return null;
  return { token, url: `https://t.me/${BOT_USERNAME}?start=${token}` };
}

/** Bot tiêu thụ /start <token> → lưu map → trả userId (null nếu sai/hết hạn). */
export const consumeLinkToken = (token: string, telegramUserId: string) =>
  chatConsumeLinkToken(PLATFORM, token, telegramUserId);

/** Tra ngược telegram_user_id → user_id đã link (null nếu chưa). */
export const resolveLinkedUser = (telegramUserId: string) => chatResolveLinkedUser(PLATFORM, telegramUserId);

/** Tra xuôi user_id → telegram_user_id đã link (cho UI web). */
export const getLinkedTelegramId = (userId: string) => chatGetLinkedExternalId(PLATFORM, userId);

/** Gỡ link (web bấm "Hủy liên kết"). */
export const unlinkTelegram = (userId: string) => chatUnlink(PLATFORM, userId);

/** Số lượt free đã dùng hôm nay (Telegram CHƯA link). */
export const getFreeUsageToday = (telegramUserId: string) => chatGetFreeUsageToday(PLATFORM, telegramUserId);

/** Tăng lượt free hôm nay (atomic) → count mới, null nếu lỗi. */
export const incrFreeUsage = (telegramUserId: string) => chatIncrFreeUsage(PLATFORM, telegramUserId);
