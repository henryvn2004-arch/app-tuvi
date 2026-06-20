// lib/billing/credits.ts
// ============================================================
// BILLING — gộp logic Lượng (credits) / paywall vào một chỗ để
// MỌI client dùng chung qua /api/v1/chat (Sprint 0.3).
//
// Tái dùng đúng pattern đã chạy production ở app/api/payment:
//   - auth: GET {SUPABASE_URL}/auth/v1/user  (Bearer = access_token)
//   - balance: REST user_credits.balance
//   - deduct: RPC deduct_credits(p_user_id, p_amount) — atomic,
//             raise 'insufficient_balance' nếu thiếu
//   - log: POST credit_transactions
//
// Cờ PAYWALL_DISABLED=true → bỏ qua tính phí (dev / soft-launch).
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/** true nếu đang TẮT paywall (miễn phí toàn bộ). */
export function paywallDisabled(): boolean {
  return process.env.PAYWALL_DISABLED === 'true';
}

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

export interface AuthUser {
  id: string;
  email?: string;
}

/** Rút access_token từ header Authorization: Bearer <token>. */
export function extractToken(req: { headers: { get(name: string): string | null } }): string {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return h.replace(/^Bearer\s+/i, '').trim();
}

/** Xác thực token → user, hoặc null nếu không hợp lệ. */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string; email?: string };
    return u?.id ? { id: u.id, email: u.email } : null;
  } catch {
    return null;
  }
}

/** Số dư Lượng hiện tại (0 nếu không có / lỗi). */
export async function getBalance(userId: string): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return 0;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_credits?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return 0;
    const rows = (await res.json()) as { balance?: number }[];
    return rows[0]?.balance ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Trừ Lượng atomic qua RPC. Trả về số dư mới, hoặc null nếu lỗi
 * (gọi nơi dùng tự xử lý — KHÔNG để mất tiền user mà vẫn chặn).
 */
export async function deductCredits(userId: string, amount: number): Promise<number | null> {
  if (amount <= 0) return null;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/deduct_credits`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_user_id: userId, p_amount: amount }),
    });
    const text = await res.text();
    if (!res.ok) return null;
    const n = Number(JSON.parse(text));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Ghi sổ giao dịch (best-effort, không chặn luồng nếu lỗi). */
export async function logTransaction(p: {
  userId: string;
  amount: number; // âm = trừ
  type: string;
  description?: string;
}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        user_id: p.userId,
        amount: p.amount,
        type: p.type,
        description: p.description || null,
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    /* best-effort */
  }
}
