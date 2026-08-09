// lib/mcp/userKey.ts
// ============================================================
// SELF-SERVE MCP KEY — mỗi user tự tạo/thu hồi key riêng gắn tài khoản.
// Dùng SERVICE KEY (server-side). Key ngẫu nhiên 24 ký tự url-safe, tier
// 'free' mặc định (an_sao vô hạn; van_han xem vài năm quá khứ + năm nay/
// năm sau — upsell 'paid' chỉnh tay trong DB). Tất cả best-effort.
// ============================================================

import { randomBytes } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};
const ready = () => !!(SUPABASE_URL && SUPABASE_KEY);

// Mặc định free tier tự phục vụ (chỉnh trong DB nếu muốn hào phóng hơn).
const FREE_DEFAULTS = { tier: 'free', charts_allowed: 3, backtest_years: 5, future_years: 1 };

/** Sinh key url-safe: "mcp_" + 24 ký tự (18 byte base64url). */
export function genMcpKey(): string {
  return 'mcp_' + randomBytes(18).toString('base64url');
}

/** Key ACTIVE hiện tại của user (nếu có). */
export async function getUserKey(userId: string): Promise<string | null> {
  if (!ready() || !userId) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mcp_keys?user_id=eq.${encodeURIComponent(userId)}&active=eq.true&select=key&order=created_at.desc&limit=1`,
      { cache: 'no-store', headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { key: string }[];
    return rows[0]?.key ?? null;
  } catch {
    return null;
  }
}

/** Trả key active của user, tạo mới nếu chưa có (idempotent). */
export async function createUserKey(userId: string): Promise<string | null> {
  if (!ready() || !userId) return null;
  const existing = await getUserKey(userId);
  if (existing) return existing;
  const key = genMcpKey();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mcp_keys`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ key, ...FREE_DEFAULTS, label: `self-serve:${userId}`, user_id: userId }),
    });
    if (!res.ok) return null;
    return key;
  } catch {
    return null;
  }
}

/** Thu hồi (deactivate) mọi key của user. Trả true nếu request OK. */
export async function revokeUserKeys(userId: string): Promise<boolean> {
  if (!ready() || !userId) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mcp_keys?user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ active: false }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
