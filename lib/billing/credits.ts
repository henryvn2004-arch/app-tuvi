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
      { headers: SB_HEADERS, cache: 'no-store' },
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

// ── Chốt chặn thanh toán PHÍA SERVER (S0 track COO) ───────────
// VÌ SAO CẦN: paywall hiện nằm HOÀN TOÀN ở client — `tuvi-paywall.js` gọi
// `/api/payment?action=deduct` như một request RIÊNG, rồi mới gọi API của tool.
// Nên các route tool trả phí trước đây chỉ xác thực "user hợp lệ" là chạy luôn:
// gọi thẳng endpoint bằng curl là dùng miễn phí không giới hạn, mỗi lượt tốn
// tiền thật (OpenAI image + LLM). Hai hàm dưới cho route tự kiểm chứng ở server.

/**
 * true nếu user ĐÃ trả cho lượt dùng mang `slug` này (có một dòng
 * `credit_transactions` âm gắn đúng slug).
 *
 * Dùng CHÍNH quy ước "slug = một lượt mua, mở lại được" mà paywall client và
 * `/api/payment?action=check` đang dùng — nên tool gọi API nhiều lần cho cùng
 * một lượt mua (vd Chân Dung Tiền Kiếp chạy song song 2 pha story+image) vẫn
 * qua được, không cần cơ chế "tiêu thụ một lần" phức tạp.
 */
// ⚠️ `cache:'no-store'` ở ba lượt GET dưới KHÔNG phải phòng xa: Next bọc `fetch`
// toàn cục và nhớ kết quả kể cả trong route `force-dynamic` (đã trả giá ở
// `/ket-qua/[id]` và ở đường giám sát cron). Riêng chỗ này còn có đường tự đầu
// độc: `handleDeduct` gọi CHÍNH `hasSlugAccess` với ĐÚNG URL đó ngay TRƯỚC khi
// ghi giao dịch — kết quả rỗng bị nhớ lại, rồi route tool hỏi cùng URL và nhận
// lại bản rỗng ⇒ user vừa trả tiền xong vẫn ăn 402.
export async function hasSlugAccess(userId: string, slug: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId || !slug) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions` +
        `?user_id=eq.${encodeURIComponent(userId)}` +
        `&slug=eq.${encodeURIComponent(slug)}&amount=lt.0&limit=1&select=id`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

/** Cửa sổ (phút) cho đường lùi khi client chưa gửi slug — xem `toolPaymentDenied`. */
const RECENT_PAYMENT_MIN = 20;

/**
 * true nếu user vừa trả tiền cho tool này trong `minutes` phút gần đây, xét
 * theo tiền tố slug (`generateToolSlug` luôn dựng slug dạng `<toolId>-...`).
 */
async function hasRecentToolPayment(
  userId: string,
  toolId: string,
  minutes: number,
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !userId) return false;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions` +
        `?user_id=eq.${encodeURIComponent(userId)}` +
        `&slug=like.${encodeURIComponent(toolId + '*')}` +
        `&amount=lt.0&created_at=gte.${encodeURIComponent(since)}&limit=1&select=id`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

/**
 * Chốt chặn cho route tool TRẢ PHÍ. Trả `null` nếu được phép chạy, hoặc chuỗi
 * lý do nếu phải từ chối (nơi gọi tự dựng Response cho khớp shape lỗi của mình).
 *
 * Cho qua khi:
 *  1. Tắt paywall (dev/soft-launch).
 *  2. `tool_pricing` khai giá 0 — miễn phí hợp lệ. `handleDeduct` KHÔNG ghi
 *     giao dịch cho tool giá 0, nên đòi slug ở đây sẽ chặn oan tool free.
 *     (`getToolPrice` trả null khi tool vắng mặt/bị tắt — lúc đó `handleDeduct`
 *     vẫn trừ tiền theo giá client gửi, nên vẫn phải đòi thanh toán.)
 *  3. Có slug và slug đó đã được thanh toán — đường chính, chính xác nhất vì
 *     buộc đúng lượt chạy vào đúng lượt mua.
 *  4. ĐƯỜNG LÙI: user vừa trả cho CHÍNH tool này trong 20 phút qua.
 *
 * Vì sao cần (4): trang tool là HTML tĩnh trong `public/`, và không xác minh
 * được nó có bị CDN giữ lại hay không. Nếu server mới đòi slug trong lúc trình
 * duyệt còn chạy bản HTML cũ (chưa gửi slug), khách ĐÃ TRẢ TIỀN sẽ ăn 402 —
 * đúng cái vòng "trả tiền mà không nhận được hàng" mà sprint này sinh ra để
 * dập. (4) vẫn xác minh ở server, chỉ lỏng hơn (4) cho phép dùng lại trong 20
 * phút; so với lỗ đang vá (dùng miễn phí VÔ HẠN, VĨNH VIỄN) thì vẫn là bịt.
 * Siết bỏ (4) được sau khi lưu lượng đã chuyển hết sang client mới.
 */
export async function toolPaymentDenied(
  toolId: string,
  userId: string,
  slug: string,
): Promise<string | null> {
  if (paywallDisabled()) return null;
  const { getToolPrice } = await import('./pricing');
  if ((await getToolPrice(toolId)) === 0) return null;
  if (slug && (await hasSlugAccess(userId, slug))) return null;
  if (await hasRecentToolPayment(userId, toolId, RECENT_PAYMENT_MIN)) return null;
  return 'Lượt dùng này chưa được thanh toán.';
}
