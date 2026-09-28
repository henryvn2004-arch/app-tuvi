// lib/channels/zaloLink.ts
// ============================================================
// LIÊN KẾT Zalo OA ↔ ví Lượng — VỎ MỎNG trên lib/channels/store.
//
// Giống messengerLink.ts, khác DEEP LINK: Zalo không truyền được tham số vào
// cuộc trò chuyện (không có ?ref như m.me, không pre-fill như wa.me), nên web
// hiện mã và người dùng nhắn "/link <mã>" cho OA. URL chỉ để mở đúng OA.
// ============================================================

import {
  chatCreateLinkToken,
  chatConsumeLinkToken,
  chatResolveLinkedUser,
  chatGetLinkedExternalId,
  chatUnlink,
} from './store';
import { ZALO_PLATFORM } from './zalo';

/** OA ID (số) để dựng link mở OA. Trống → trả link trang chủ Zalo OA. */
const OA_ID = (process.env.ZALO_OA_ID || '').replace(/\D/g, '');

export const LINK_CMD = '/link';

/** Web (đã đăng nhập) sinh mã 1 lần → { token, url } — url mở OA trên Zalo. */
export async function createLinkToken(userId: string): Promise<{ token: string; url: string } | null> {
  const token = await chatCreateLinkToken(ZALO_PLATFORM, userId);
  if (!token) return null;
  return { token, url: OA_ID ? `https://zalo.me/${OA_ID}` : 'https://zalo.me' };
}

export const consumeLinkToken = (token: string, zaloUserId: string) =>
  chatConsumeLinkToken(ZALO_PLATFORM, token, zaloUserId);

export const resolveLinkedUser = (zaloUserId: string) => chatResolveLinkedUser(ZALO_PLATFORM, zaloUserId);

export const getLinkedZaloId = (userId: string) => chatGetLinkedExternalId(ZALO_PLATFORM, userId);

export const unlinkZalo = (userId: string) => chatUnlink(ZALO_PLATFORM, userId);
