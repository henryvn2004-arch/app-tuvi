// lib/channels/email-link.ts
// ============================================================
// GỘP TÀI KHOẢN WEB NGAY TRONG CHAT — bằng email + mã 6 số.
//
// Người nhắn tin lần đầu có "tài khoản bóng" (lib/channels/account.ts). Ai đã
// có tài khoản web thì muốn dùng CHÍNH ví/lá số đó ở Zalo/Messenger/…:
//   1. Nhắn email đã đăng ký web → `startEmailLink` gửi mã 6 số vào email đó.
//   2. Nhắn mã lại → `verifyEmailLink` → `chatLinkAndMerge` (trỏ kênh về tài
//      khoản web + gộp ví/sổ lá số của tài khoản bóng).
// Không mở trình duyệt: trình duyệt nhúng trong Zalo/Messenger không có phiên
// web sẵn và Google chặn đăng nhập trong đó.
//
// An toàn: mã tới HỘP THƯ của email ⇒ chứng minh sở hữu tài khoản. Email không
// có tài khoản vẫn nhận cùng một câu trả lời (không lộ ai có tài khoản), dòng
// vẫn được ghi để trần áp như nhau. Trần: 3 lượt xin mã/giờ cho mỗi người chat
// và cho mỗi email; 5 lần nhập sai/mã; mã sống 10 phút.
// _patches/migration-chat-email-link.sql
// ============================================================

import { createHash, randomInt, randomUUID } from 'crypto';
import { chatLinkAndMerge } from './store';
import { isShadowEmail } from './shadow-email';
import { sendTransactionalEmail } from '@/lib/email/send';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 3;

/** Chữ nút/lệnh mở luồng gộp (so sau khi lowercase). */
export const GOP_CMD = ['gộp tài khoản web', 'gộp tài khoản', 'liên kết tài khoản', 'đã có tài khoản web'];

/** Tin nhắn CHỈ là một địa chỉ email → email (lowercase), không thì null. */
export function parseEmail(text: string): string | null {
  const t = (text || '').trim().toLowerCase();
  return t.length <= 120 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(t) ? t : null;
}

/** a***@gmail.com — nhắc lại email mà không in trọn. */
export function maskEmail(email: string): string {
  const [u, d] = email.split('@');
  return `${u.slice(0, 1)}***@${d}`;
}

const hash = (id: string, code: string) => createHash('sha256').update(`${id}:${code}`).digest('hex');

/** Tài khoản đang dùng là tài khoản BÓNG (chưa gộp vào tài khoản web)? Lỗi
 *  tra cứu → false: không mời gộp còn hơn mời nhầm người đã gộp. */
export async function isShadowUser(userId: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      cache: 'no-store',
      headers: SB_HEADERS,
    });
    if (!res.ok) {
      console.error('[email-link] đọc user lỗi', res.status);
      return false;
    }
    const u = (await res.json()) as { email?: string };
    return isShadowEmail(u.email);
  } catch (e) {
    console.error('[email-link] đọc user lỗi mạng', e);
    return false;
  }
}

async function countSince(filter: string): Promise<number> {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_email_links?${filter}&created_at=gte.${encodeURIComponent(since)}&select=id`,
    { cache: 'no-store', headers: { ...SB_HEADERS, Prefer: 'count=exact' } },
  );
  if (!res.ok) throw new Error(`đếm chat_email_links lỗi ${res.status}`);
  const range = res.headers.get('content-range') || '';
  const n = Number(range.split('/')[1]);
  return Number.isFinite(n) ? n : ((await res.json()) as unknown[]).length;
}

/**
 * Xin mã gộp cho `email`. 'sent' = đã xử lý (có hay không có tài khoản đều trả
 * 'sent' — nơi gọi nói cùng một câu); 'limited' = quá trần/giờ; 'error'.
 */
export async function startEmailLink(
  platform: string,
  externalId: string,
  email: string,
): Promise<'sent' | 'limited' | 'error'> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return 'error';
  try {
    const [byChat, byEmail] = await Promise.all([
      countSince(`platform=eq.${encodeURIComponent(platform)}&external_id=eq.${encodeURIComponent(externalId)}`),
      countSince(`email=eq.${encodeURIComponent(email)}`),
    ]);
    if (byChat >= MAX_PER_HOUR || byEmail >= MAX_PER_HOUR) return 'limited';

    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chat_real_user_id_by_email`, {
      method: 'POST',
      cache: 'no-store',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_email: email }),
    });
    if (!rpc.ok) {
      console.error('[email-link] chat_real_user_id_by_email lỗi', rpc.status, await rpc.text().catch(() => ''));
      return 'error';
    }
    const target = ((await rpc.json()) as string | null) || null;

    const id = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/chat_email_links`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({
        id,
        platform,
        external_id: externalId,
        email,
        target_user_id: target,
        code_hash: hash(id, code),
        expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
      }),
    });
    if (!ins.ok) {
      console.error('[email-link] ghi chat_email_links lỗi', ins.status, await ins.text().catch(() => ''));
      return 'error';
    }
    if (!target) return 'sent'; // không có tài khoản: không gửi thư, câu trả lời như nhau

    const sent = await sendTransactionalEmail({
      dedupeKey: `chat-email-link-${id}`,
      template: 'chat-email-link',
      to: email,
      userId: target,
      subject: `Mã xác nhận ${code} — gộp tài khoản Tử Vi Minh Bảo`,
      html: `<p>Chào bạn,</p>
<p>Có người vừa yêu cầu gộp cuộc trò chuyện Hỏi Thầy trên kênh chat vào tài khoản <b>${email}</b> tại tuviminhbao.com.</p>
<p>Mã xác nhận của bạn:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
<p>Nhắn mã này vào cuộc trò chuyện với thầy để hoàn tất. Mã dùng được trong ${CODE_TTL_MIN} phút.</p>
<p style="color:#888;font-size:13px">Nếu không phải bạn yêu cầu, cứ bỏ qua thư này — tài khoản của bạn không thay đổi gì.</p>`,
    });
    if (!sent.ok) {
      console.error('[email-link] gửi mã lỗi', sent.reason);
      return 'error';
    }
    return 'sent';
  } catch (e) {
    console.error('[email-link] startEmailLink lỗi', e);
    return 'error';
  }
}

interface PendingRow {
  id: string;
  email: string;
  target_user_id: string | null;
  code_hash: string;
  attempts: number;
}

async function latestPending(platform: string, externalId: string): Promise<PendingRow | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_email_links?platform=eq.${encodeURIComponent(platform)}&external_id=eq.${encodeURIComponent(externalId)}` +
        `&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}` +
        '&select=id,email,target_user_id,code_hash,attempts&order=created_at.desc&limit=1',
      { cache: 'no-store', headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    return ((await res.json()) as PendingRow[])[0] || null;
  } catch {
    return null;
  }
}

/** Có mã gộp đang chờ nhập? (để hiểu tin "6 chữ số" là mã gộp chứ không phải
 *  mã đăng nhập web hay câu hỏi). */
export const hasPendingEmailLink = async (platform: string, externalId: string) =>
  !!(await latestPending(platform, externalId));

export type VerifyResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: 'wrong'; left: number }
  | { ok: false; reason: 'expired' | 'locked' | 'error' };

export async function verifyEmailLink(platform: string, externalId: string, code: string): Promise<VerifyResult> {
  const row = await latestPending(platform, externalId);
  if (!row) return { ok: false, reason: 'expired' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };

  if (!row.target_user_id || hash(row.id, code) !== row.code_hash) {
    const attempts = row.attempts + 1;
    await fetch(`${SUPABASE_URL}/rest/v1/chat_email_links?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: SB_HEADERS,
      body: JSON.stringify({ attempts }),
    }).catch((e) => console.error('[email-link] ghi lần sai lỗi', e));
    return attempts >= MAX_ATTEMPTS ? { ok: false, reason: 'locked' } : { ok: false, reason: 'wrong', left: MAX_ATTEMPTS - attempts };
  }

  // Tiêu mã đúng MỘT lần (hai tin trùng cùng lúc: lượt thua nhận 0 dòng).
  const use = await fetch(`${SUPABASE_URL}/rest/v1/chat_email_links?id=eq.${row.id}&used_at=is.null`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify({ used_at: new Date().toISOString() }),
  }).catch(() => null);
  if (!use?.ok || !((await use.json()) as unknown[]).length) return { ok: false, reason: 'expired' };

  if (!(await chatLinkAndMerge(platform, externalId, row.target_user_id))) return { ok: false, reason: 'error' };
  return { ok: true, userId: row.target_user_id, email: row.email };
}
