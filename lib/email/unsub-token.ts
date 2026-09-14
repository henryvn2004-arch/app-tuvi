// lib/email/unsub-token.ts
// ============================================================
// Token ký cho link "Huỷ nhận email" — cho phép huỷ KHÔNG cần đăng nhập
// (người nhận thư quảng bá chưa chắc còn phiên đăng nhập trên máy đó).
//
// Nguồn DUY NHẤT ký/xác thực token này — `lib/email/send.ts` (dựng link để
// nhét vào thư) và `app/api/email/unsubscribe/route.ts` (xác thực khi bấm)
// PHẢI cùng gọi qua đây, không tự `createHmac` riêng mỗi nơi.
// ============================================================
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.EMAIL_UNSUB_SECRET;
const SITE_URL = (process.env.SITE_URL || 'https://tuviminhbao.com').replace(/\/+$/, '');

function sign(email: string): string {
  return createHmac('sha256', SECRET!).update(email.trim().toLowerCase()).digest('hex');
}

/** true nếu `sig` khớp `email` — false nếu thiếu secret hoặc token sai/hỏng. */
export function verifyUnsubToken(email: string, sig: string): boolean {
  if (!SECRET || !email || !sig) return false;
  try {
    const expected = Buffer.from(sign(email), 'hex');
    const given = Buffer.from(sig, 'hex');
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/**
 * Link "Huỷ nhận email" cho một địa chỉ — nhét vào MỌI email marketing.
 * `null` khi thiếu `EMAIL_UNSUB_SECRET` (chưa cấu hình) — nơi gọi tự quyết
 * có chặn gửi hay không, đừng gửi thư quảng bá thiếu link huỷ ra ngoài.
 */
export function unsubscribeUrl(email: string): string | null {
  if (!SECRET) return null;
  const clean = email.trim().toLowerCase();
  const sig = sign(clean);
  return `${SITE_URL}/api/email/unsubscribe?email=${encodeURIComponent(clean)}&sig=${sig}`;
}
