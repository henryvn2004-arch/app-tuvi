// lib/channels/telegramLink.ts
// ============================================================
// LIÊN KẾT Telegram ↔ ví Lượng Supabase (xem migration-telegram-links.sql).
//
// Telegram chỉ đưa telegram_user_id (con số). Để dùng CHUNG ví Lượng với
// web, ta map telegram_user_id → user_id (tài khoản Supabase) một lần:
//   - createLinkToken(userId): web (đã đăng nhập) sinh token 1 lần.
//   - consumeLinkToken(token, tgId): bot tiêu thụ /start <token> → lưu map.
//   - resolveLinkedUser(tgId): adapter Telegram tra ngược trước khi tính phí.
//   - getFreeUsageToday / incrFreeUsage: cap lượt free cho Telegram CHƯA link.
//
// Tất cả qua SERVICE KEY (RLS chỉ service_role). Best-effort, không ném
// để route không sập — nơi gọi tự xử lý null/0.
// ============================================================

import { randomBytes } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

/** Username bot (không kèm @) để dựng deep link t.me. */
export const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'tuviminhbao_bot';

/** Token sống bao lâu (phút) trước khi hết hạn. */
const TOKEN_TTL_MIN = 15;

/** Số lượt free/ngày cho Telegram CHƯA link (chống đốt token). */
export const FREE_DAILY_CAP = Number(process.env.TELEGRAM_FREE_DAILY || '3');

// ── Token liên kết (web sinh) ───────────────────────────────
/**
 * Sinh token 1 lần cho user đang đăng nhập (web). Trả về { token, url }
 * với url là deep link t.me/<bot>?start=<token>. Null nếu lỗi cấu hình.
 */
export async function createLinkToken(
  userId: string,
): Promise<{ token: string; url: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return null;
  // base64url an toàn cho start param Telegram (A-Za-z0-9_-, ≤64 ký tự).
  const token = randomBytes(24).toString('base64url');
  const expires = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/telegram_link_tokens`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ token, user_id: userId, expires_at: expires }),
    });
    if (!res.ok) return null;
    return { token, url: `https://t.me/${BOT_USERNAME}?start=${token}` };
  } catch {
    return null;
  }
}

/**
 * Bot tiêu thụ token khi nhận /start <token>: kiểm token còn hạn & chưa
 * dùng → ghi telegram_links (upsert) → đánh dấu token đã dùng.
 * Trả về userId vừa link, hoặc null nếu token sai/hết hạn/đã dùng.
 */
export async function consumeLinkToken(
  token: string,
  telegramUserId: string,
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !token || !telegramUserId) return null;
  try {
    const nowIso = new Date().toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_link_tokens?token=eq.${encodeURIComponent(token)}&select=user_id,expires_at,used_at&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { user_id?: string; expires_at?: string; used_at?: string | null }[];
    const row = rows[0];
    if (!row?.user_id || row.used_at) return null;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;

    // Ghi map (upsert: 1 Telegram chỉ trỏ 1 tài khoản, link lại thì đè).
    const up = await fetch(`${SUPABASE_URL}/rest/v1/telegram_links`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        telegram_user_id: telegramUserId,
        user_id: row.user_id,
        linked_at: nowIso,
      }),
    });
    if (!up.ok) return null;

    // Đánh dấu token đã dùng (best-effort).
    await fetch(`${SUPABASE_URL}/rest/v1/telegram_link_tokens?token=eq.${encodeURIComponent(token)}`, {
      method: 'PATCH',
      headers: SB_HEADERS,
      body: JSON.stringify({ used_at: nowIso }),
    }).catch(() => {});

    return row.user_id;
  } catch {
    return null;
  }
}

/** Tra ngược telegram_user_id → user_id đã link (null nếu chưa link). */
export async function resolveLinkedUser(telegramUserId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !telegramUserId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_links?telegram_user_id=eq.${encodeURIComponent(telegramUserId)}&select=user_id&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { user_id?: string }[];
    return rows[0]?.user_id ?? null;
  } catch {
    return null;
  }
}

/** Tra xuôi user_id → telegram_user_id đã link (cho UI web). Null nếu chưa. */
export async function getLinkedTelegramId(userId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_links?user_id=eq.${encodeURIComponent(userId)}&select=telegram_user_id&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { telegram_user_id?: string }[];
    return rows[0]?.telegram_user_id ?? null;
  } catch {
    return null;
  }
}

/** Gỡ link (web bấm "Hủy liên kết"). True nếu xóa được. */
export async function unlinkTelegram(userId: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_links?user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers: SB_HEADERS },
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ── Lượt free/ngày (Telegram CHƯA link) ─────────────────────
function todayVN(): string {
  // Ngày theo giờ VN (UTC+7) để cap reset đúng nửa đêm VN.
  const vn = new Date(Date.now() + 7 * 3600_000);
  return vn.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Số lượt free đã dùng hôm nay (0 nếu chưa có / lỗi). */
export async function getFreeUsageToday(telegramUserId: string): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !telegramUserId) return 0;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_usage?telegram_user_id=eq.${encodeURIComponent(telegramUserId)}&day=eq.${todayVN()}&select=count&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return 0;
    const rows = (await res.json()) as { count?: number }[];
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Tăng lượt free hôm nay (atomic qua RPC) → count mới, hoặc null nếu lỗi. */
export async function incrFreeUsage(telegramUserId: string): Promise<number | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !telegramUserId) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/tg_incr_free_usage`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_tid: telegramUserId, p_day: todayVN() }),
    });
    if (!res.ok) return null;
    const n = Number(await res.json());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
