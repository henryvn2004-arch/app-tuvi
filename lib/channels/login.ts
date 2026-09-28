// lib/channels/login.ts
// ============================================================
// ĐĂNG NHẬP WEB BẰNG TIN NHẮN — người đã nói chuyện với thầy qua Zalo/
// Messenger/WhatsApp/Telegram vào web không cần email/mật khẩu:
//   1. Web xin mã (`createLoginCode`) → hiện mã 6 số + nút mở từng kênh.
//   2. Người dùng nhắn mã cho OA/Page/bot (Messenger/Telegram/WhatsApp tự điền
//      mã qua deep link; Zalo phải dán). Bot gọi `claimLoginCode` gắn mã với
//      tài khoản của chính cuộc trò chuyện đó (lib/channels/account.ts).
//   3. Web hỏi dần bằng `poll_key` (bí mật, chỉ trình duyệt tạo mã giữ) →
//      `takeLoginSession` trả mã đăng nhập đúng một lần (trình duyệt tự đổi
//      lấy phiên — xem lib/channels/handoff.ts).
// Biết mã thôi không đăng nhập được: phải cầm `poll_key` — mã chỉ là thứ
// người dùng chuyển từ màn hình này sang app chat kia.
// ============================================================

import { randomBytes, randomInt } from 'crypto';
import { mintLoginHash, purgeExpired } from './handoff';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};
const CODE_TTL_MIN = 10;

/** Tin nhắn là mã đăng nhập: "DN 123456", "đn:123456", "login_123456" (ref/
 *  start param) hoặc chỉ 6 chữ số. Trả mã, hoặc null. */
export function parseLoginCode(text: string): string | null {
  const m = (text || '')
    .trim()
    .match(/^(?:(?:dn|đn|đăng nhập|dang nhap|login)[\s:_-]*)?(\d{6})$/i);
  return m ? m[1] : null;
}

export async function createLoginCode(): Promise<{ code: string; pollKey: string; expiresIn: number } | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  // Trùng mã (PK) thì thử lại mã khác — 10^6 mã, sống 10 phút, trùng rất hiếm.
  for (let i = 0; i < 4; i++) {
    const pollKey = randomBytes(24).toString('base64url');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_login_codes`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({
          code,
          poll_key: pollKey,
          expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
        }),
      });
      if (res.ok) {
        if (Math.random() < 0.05) void purgeExpired('chat_login_codes');
        return { code, pollKey, expiresIn: CODE_TTL_MIN * 60 };
      }
      if (res.status !== 409) {
        console.error('[chat-login] tạo mã lỗi', res.status, await res.text().catch(() => ''));
        return null;
      }
    } catch (e) {
      console.error('[chat-login] tạo mã lỗi mạng', e);
      return null;
    }
  }
  return null;
}

/** Bot gắn mã với tài khoản của cuộc trò chuyện. true = nhận mã thành công. */
export async function claimLoginCode(code: string, userId: string, platform: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return false;
  const nowIso = new Date().toISOString();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_login_codes?code=eq.${encodeURIComponent(code)}&claimed_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=code`,
      {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        cache: 'no-store',
        body: JSON.stringify({ user_id: userId, platform, claimed_at: nowIso }),
      },
    );
    if (!res.ok) {
      console.error('[chat-login] nhận mã lỗi', res.status, await res.text().catch(() => ''));
      return false;
    }
    return ((await res.json()) as unknown[]).length > 0;
  } catch (e) {
    console.error('[chat-login] nhận mã lỗi mạng', e);
    return false;
  }
}

export type LoginPoll =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'ok'; tokenHash: string; platform: string | null };

/** Web hỏi: mã đã được nhận chưa? Đã nhận → trả mã đăng nhập, đúng MỘT lần. */
export async function takeLoginSession(pollKey: string): Promise<LoginPoll> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !/^[A-Za-z0-9_-]{20,80}$/.test(pollKey)) return { status: 'expired' };
  const nowIso = new Date().toISOString();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_login_codes?poll_key=eq.${encodeURIComponent(pollKey)}&claimed_at=not.is.null&used_at=is.null&select=user_id,platform`,
      {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        cache: 'no-store',
        body: JSON.stringify({ used_at: nowIso }),
      },
    );
    if (!res.ok) {
      console.error('[chat-login] lấy phiên lỗi', res.status, await res.text().catch(() => ''));
      return { status: 'pending' };
    }
    const row = ((await res.json()) as { user_id?: string; platform?: string | null }[])[0];
    if (row?.user_id) {
      const tokenHash = await mintLoginHash(row.user_id);
      return tokenHash ? { status: 'ok', tokenHash, platform: row.platform ?? null } : { status: 'expired' };
    }
    // Chưa ai nhận: còn hạn thì chờ tiếp.
    const chk = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_login_codes?poll_key=eq.${encodeURIComponent(pollKey)}&used_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=code&limit=1`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!chk.ok) return { status: 'pending' };
    return ((await chk.json()) as unknown[]).length ? { status: 'pending' } : { status: 'expired' };
  } catch (e) {
    console.error('[chat-login] lấy phiên lỗi mạng', e);
    return { status: 'pending' };
  }
}
