// lib/billing/vouchers.ts
// ============================================================
// VÍ ƯU ĐÃI — lớp gọi 3 RPC voucher (voucher_grant/consume/list_active).
// ============================================================
// Schema: _patches/migration-voucher-wallet.sql (`voucher_defs` + `user_vouchers`).
//
// 🔴 File này CHỈ là lớp gọi RPC — CHƯA có nơi nào trong app THỰC SỰ cấp hay
// tiêu voucher. Hai việc còn lại, cố tình để riêng:
//   1. Nối `voucherConsume` vào `handleDeduct` (app/api/payment/route.ts) —
//      tính giá thật qua `effectivePrice()` TRƯỚC, truyền vào đây SAU.
//   2. Các trigger CẤP tự động (chào sân 48h, đơn rơi, hồi sinh, sinh nhật…)
//      — mỗi trigger gọi `voucherGrant()` từ đúng chỗ sự kiện xảy ra.
//
// Mọi hàm ở đây "báo cáo/best-effort" theo ĐÚNG quy ước file — record/read
// không throw; nhưng `voucherConsume` là ĐƯỜNG TIỀN nên lỗi mạng phải rõ
// ràng false, KHÔNG được coi lỗi mạng là "không có voucher" một cách im lặng
// (nơi gọi phải tự quyết định có chặn thanh toán hay không khi gặp lỗi).
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Cấp MỘT voucher cho user. Idempotent theo (user_id, voucher_id) — gọi lại
 * không cấp thêm. Trả về id dòng `user_vouchers` mới, hoặc `null` (đã có từ
 * trước / campaign tắt / ngoài khung ngày / hết suất / lỗi mạng — không phân
 * biệt được các lý do này từ phía TypeScript, RPC không trả lý do cho hàm
 * best-effort này; cần biết lý do thì tự SELECT `voucher_defs`/`user_vouchers`).
 */
export async function voucherGrant(
  userId: string,
  voucherId: string,
  reason: string,
  expiresAt?: string | null,
): Promise<number | null> {
  const r = await rpc<number | null>('voucher_grant', {
    p_user_id: userId,
    p_voucher_id: voucherId,
    p_reason: reason,
    p_expires_at: expiresAt ?? null,
  });
  return typeof r === 'number' ? r : null;
}

export interface VoucherConsumeResult {
  ok: boolean;
  /** 'not_found' | 'already_redeemed' | 'expired' | 'campaign_disabled' |
   *  'not_started' | 'campaign_ended' | 'race_lost' | 'network_error' */
  reason?: string;
  discountCredits?: number;
}

/**
 * Tiêu MỘT voucher cho đúng đơn đang thanh toán. `priceCredits` PHẢI là GIÁ
 * THẬT đã qua `effectivePrice()` (lib/billing/pricing.ts) — hàm SQL tự tính
 * trần giảm từ `voucher_defs`, không tin số discount tự khai, nhưng vẫn cần
 * đúng giá gốc để tính % cho đúng.
 *
 * ⚠️ `reason: 'network_error'` KHÁC mọi lý do khác — đó là lỗi hạ tầng, không
 * phải voucher không hợp lệ. Nơi gọi (đường tiền) phải tự quyết định: chặn
 * thanh toán lại hay bỏ qua voucher rồi thu giá gốc — ĐỪNG ngầm hiểu network
 * lỗi là "voucher không có", hai tình huống cần xử lý khác nhau.
 */
export async function voucherConsume(
  userId: string,
  userVoucherId: number,
  priceCredits: number,
  slug: string,
): Promise<VoucherConsumeResult> {
  const r = await rpc<{ ok: boolean; reason?: string; discount_credits?: number }>('voucher_consume', {
    p_user_id: userId,
    p_user_voucher_id: userVoucherId,
    p_price_credits: priceCredits,
    p_slug: slug,
  });
  if (!r) return { ok: false, reason: 'network_error' };
  return { ok: r.ok, reason: r.reason, discountCredits: r.discount_credits };
}

export interface VoucherActive {
  userVoucherId: number;
  voucherId: string;
  label: string;
  kind: 'percent' | 'flat_credits';
  value: number;
  maxDiscountCredits: number | null;
  scope: 'site' | 'tool';
  toolIds: string[] | null;
  minPurchaseCredits: number | null;
  expiresAt: string | null;
}

/** Voucher đang dùng được của một user (chưa tiêu, chưa hết hạn, campaign còn
 *  bật) — cho UI "Ví Ưu Đãi". Lỗi mạng → mảng rỗng, không throw (đây là hiển
 *  thị, không phải chốt thanh toán). */
export async function voucherListActive(userId: string): Promise<VoucherActive[]> {
  const r = await rpc<
    {
      user_voucher_id: number;
      voucher_id: string;
      label: string;
      kind: string;
      value: number;
      max_discount_credits: number | null;
      scope: string;
      tool_ids: string[] | null;
      min_purchase_credits: number | null;
      expires_at: string | null;
    }[]
  >('voucher_list_active', { p_user_id: userId });
  if (!r) return [];
  return r.map((v) => ({
    userVoucherId: v.user_voucher_id,
    voucherId: v.voucher_id,
    label: v.label,
    kind: v.kind as 'percent' | 'flat_credits',
    value: v.value,
    maxDiscountCredits: v.max_discount_credits,
    scope: v.scope as 'site' | 'tool',
    toolIds: v.tool_ids,
    minPurchaseCredits: v.min_purchase_credits,
    expiresAt: v.expires_at,
  }));
}
