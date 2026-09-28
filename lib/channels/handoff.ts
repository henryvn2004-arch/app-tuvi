// lib/channels/handoff.ts
// ============================================================
// CẦU CHAT → WEB: bấm một link trong Zalo/Messenger/WhatsApp/Telegram là mở
// đúng trang, ĐÃ đăng nhập, đúng lá số đang nói dở — không bắt nhập lại gì.
//
// Luồng:
//   1. Bot gọi `createHandoffUrl(userId, next, birth)` → `/c/<token>` (token
//      một lần, sống HANDOFF_TTL_MIN phút) gắn vào nút bấm.
//   2. GET /c/<token> chỉ trả một trang HTML nhỏ — KHÔNG tiêu token. Zalo/
//      Messenger tự tải trước link để dựng thẻ xem trước; tiêu token ở GET là
//      máy xem trước ăn mất lượt của người thật.
//   3. Script trong trang POST /api/channels/handoff → `redeemHandoff`: đánh
//      dấu token đã dùng (atomic), xin `hashed_token` đăng nhập cho tài khoản
//      đó (`mintLoginHash`), trả kèm trang đích + lá số.
//   4. CHÍNH TRÌNH DUYỆT đổi `hashed_token` lấy phiên ở Supabase `/verify`
//      (lib/channels/web-pages.ts) rồi ghi vào đúng các lớp lưu của auth.js.
//      Đổi ở trình duyệt chứ không ở server: Supabase giới hạn lượt /verify
//      THEO IP — mọi người dùng đi qua vài IP của Vercel là chạm trần chung.
//
// `mintLoginHash` dùng chung cho đăng nhập web bằng mã nhắn qua chat
// (app/api/channels/login).
// ============================================================

import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { BirthParams } from '@/lib/contract/v1';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

export const SITE = 'https://tuviminhbao.com';
const HANDOFF_TTL_MIN = 60;

/** Chỉ nhận đường dẫn nội bộ — chặn chuyển hướng ra ngoài (`//evil.com`). */
export function safeNext(p: unknown): string {
  const s = typeof p === 'string' ? p.trim() : '';
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s.slice(0, 500) : '/app';
}

/**
 * Lá số của kênh chat (BirthParams) → shape `app_birth` của web (TuviForm).
 * Âm lịch → null: web đọc app_birth như ngày DƯƠNG, truyền vào là lập nhầm.
 */
export function birthToWeb(b: BirthParams | null | undefined): Record<string, unknown> | null {
  if (!b || b.isLunar || !b.day || !b.month || !b.year) return null;
  const o: Record<string, unknown> = { ngay: b.day, thang: b.month, nam: b.year, gioitinh: b.gender === 'nu' ? 'nu' : 'nam' };
  if (b.hourBranch != null && b.hourBranch >= 0) o.gioIdx = b.hourBranch;
  if (b.name) o.hoten = b.name;
  return o;
}

/** Trang lá số/luận giải đúng người — cùng tham số `luanGiaiHref()` của shell.js. */
export function lasoPath(b: BirthParams | null | undefined): string {
  if (!b || b.isLunar || !b.day || !b.month || !b.year) return '/app/luan-giai';
  const q = new URLSearchParams({
    ngay: String(b.day),
    thang: String(b.month),
    nam: String(b.year),
    gioitinh: b.gender === 'nu' ? 'nu' : 'nam',
  });
  if (b.hourBranch != null && b.hourBranch >= 0) q.set('gio', String(b.hourBranch * 2));
  if (b.name) q.set('ten', b.name);
  return `/app/luan-giai?${q.toString()}`;
}

/** Xoá dòng token đã hết hạn quá 1 ngày của bảng `table`. Best-effort. */
export async function purgeExpired(table: 'chat_handoff_tokens' | 'chat_login_codes'): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?expires_at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: SB_HEADERS,
    });
  } catch (e) {
    console.error(`[handoff] dọn ${table} lỗi`, e);
  }
}

/** Tạo link một lần chat → web. null nếu lỗi (nơi gọi bỏ nút, không chặn lượt). */
export async function createHandoffUrl(
  userId: string,
  next: string,
  birth?: BirthParams | null,
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return null;
  const token = randomBytes(18).toString('base64url');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_handoff_tokens`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        token,
        user_id: userId,
        next_path: safeNext(next),
        birth: birthToWeb(birth),
        expires_at: new Date(Date.now() + HANDOFF_TTL_MIN * 60_000).toISOString(),
      }),
    });
    if (!res.ok) {
      console.error('[handoff] tạo token lỗi', res.status, await res.text().catch(() => ''));
      return null;
    }
    // Dọn token hết hạn (mỗi lượt trả lời sinh 1–2 token) — ~2% lượt gọi, không chờ.
    if (Math.random() < 0.02) void purgeExpired('chat_handoff_tokens');
    return `${SITE}/c/${token}`;
  } catch (e) {
    console.error('[handoff] tạo token lỗi mạng', e);
    return null;
  }
}

/**
 * `hashed_token` đăng nhập một lần cho tài khoản — `generateLink` (KHÔNG gửi
 * email), như thể người dùng vừa nhận magic link. Trình duyệt đổi nó lấy phiên.
 */
export async function mintLoginHash(userId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u, error: ue } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (ue || !email) {
      console.error('[handoff] không đọc được tài khoản', userId, ue?.message);
      return null;
    }
    const { data: link, error: le } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const hashed = link?.properties?.hashed_token;
    if (le || !hashed) {
      console.error('[handoff] generateLink lỗi', le?.message);
      return null;
    }
    return hashed;
  } catch (e) {
    console.error('[handoff] mintLoginHash lỗi', e);
    return null;
  }
}

/**
 * Tiêu token (một lần — `used_at is null` trong chính câu PATCH là mutex) rồi
 * xin mã đăng nhập. null = sai/hết hạn/đã dùng.
 */
export async function redeemHandoff(
  token: string,
): Promise<{ tokenHash: string; next: string; birth: Record<string, unknown> | null } | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const nowIso = new Date().toISOString();
  let row: { user_id?: string; next_path?: string; birth?: Record<string, unknown> | null } | undefined;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_handoff_tokens?token=eq.${encodeURIComponent(token)}&used_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&select=user_id,next_path,birth`,
      {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        cache: 'no-store',
        body: JSON.stringify({ used_at: nowIso }),
      },
    );
    if (!res.ok) {
      console.error('[handoff] tiêu token lỗi', res.status, await res.text().catch(() => ''));
      return null;
    }
    row = ((await res.json()) as (typeof row)[])[0];
  } catch (e) {
    console.error('[handoff] tiêu token lỗi mạng', e);
    return null;
  }
  if (!row?.user_id) return null;
  const tokenHash = await mintLoginHash(row.user_id);
  if (!tokenHash) return null;
  return { tokenHash, next: safeNext(row.next_path), birth: row.birth ?? null };
}
