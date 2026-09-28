// lib/channels/shadow-email.ts
// Email tổng hợp của tài khoản tạo từ kênh chat (lib/channels/account.ts) —
// tách riêng, không phụ thuộc gì, để lib/email/send.ts chặn được mà không kéo
// cả tầng tài khoản vào.

export const SHADOW_DOMAIN = 'chat.tuviminhbao.com';

/** Email tổng hợp — tất định theo (kênh, id), là mutex chống tạo trùng. */
export function shadowEmail(platform: string, externalId: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${clean(platform)}.${clean(externalId)}@${SHADOW_DOMAIN}`;
}

/** Email thuộc tài khoản bóng (không có hộp thư thật) ⇒ không gửi thư. */
export function isShadowEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith('@' + SHADOW_DOMAIN);
}
