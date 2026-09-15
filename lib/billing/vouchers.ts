// lib/billing/vouchers.ts
// ============================================================
// VÍ ƯU ĐÃI — lớp gọi 3 RPC voucher (voucher_grant/consume/list_active).
// ============================================================
// Schema: _patches/migration-voucher-wallet.sql (`voucher_defs` + `user_vouchers`).
//
// Người gọi thật:
//   - `handle_new_user_signup()` (SQL trigger, migration-voucher-welcome-48h.sql)
//     CẤP voucher "chao-san-48h" ngay lúc đăng ký thật (không ẩn danh).
//   - `handleDeduct` (app/api/payment/route.ts) TỰ ÁP voucher lợi nhất qua
//     `pickBestVoucher()` rồi TIÊU qua `voucherConsume()` — KHÔNG cần client
//     chọn tay. Thứ tự cố ý: trừ Lượng giá đã giảm TRƯỚC, tiêu voucher SAU —
//     đua 2 tab cùng lúc thì thà "hào phóng nhầm" còn hơn thu đủ giá mà vẫn
//     đốt mất voucher của khách. Xem chú thích tại chỗ gọi.
//   - `runEmailReminderIdle()` (lib/marketing/email-reminder.ts) CẤP voucher
//     "hoi-sinh-7d" kèm email nhắc user còn Lượng, im lặng lâu — SAU khi gửi
//     email thành công, gate riêng bằng `voucherEnabled` (khác khoá bật email).
//   - `runEmailAbandonedCheckout()` (lib/marketing/email-abandoned-checkout.ts)
//     CẤP voucher "don-roi-24h" kèm email nhắc user đã bấm mở khoá một tool
//     nhưng chưa mua — cùng khuôn gate tách riêng như "hồi sinh".
//
// Trigger CẤP tự động khác (sinh nhật…) CHƯA làm — để từng cái riêng, mỗi
// cái một PR.
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

/**
 * Số Lượng một voucher giảm được cho ĐÚNG giá `priceCredits` — PHẢI khớp
 * từng bước với công thức trong `voucher_consume` (SQL, migration-voucher-
 * wallet.sql): percent thì floor rồi kẹp `max_discount_credits`, flat thì
 * lấy thẳng giá trị; cả hai đều kẹp về [0, priceCredits]. Dùng để ƯỚC LƯỢNG
 * trước khi gọi RPC (chọn voucher nào lợi nhất) — số THẬT vẫn do RPC trả,
 * đây không phải nguồn sự thật cho việc trừ tiền.
 */
export function computeVoucherDiscount(v: VoucherActive, priceCredits: number): number {
  let discount: number;
  if (v.kind === 'percent') {
    discount = Math.floor((priceCredits * v.value) / 100);
    if (v.maxDiscountCredits != null) discount = Math.min(discount, v.maxDiscountCredits);
  } else {
    discount = v.value;
  }
  return Math.max(0, Math.min(discount, priceCredits));
}

/**
 * Chọn voucher LỢI NHẤT (giảm nhiều Lượng nhất) trong số voucher còn dùng
 * được của user, áp được cho `toolId` ở giá `priceCredits` — dùng cho tự
 * động áp voucher lúc thanh toán, KHÔNG cần client chọn tay.
 * - `scope:'tool'` chỉ áp khi `toolId` nằm trong `tool_ids`; `scope:'site'`
 *   áp cho tool bất kỳ.
 * - `min_purchase_credits` chặn áp cho đơn dưới ngưỡng.
 * Trả `null` nếu không có voucher nào áp được (kể cả áp được nhưng giảm 0).
 */
export function pickBestVoucher(
  vouchers: VoucherActive[],
  toolId: string,
  priceCredits: number,
): { voucher: VoucherActive; discount: number } | null {
  let best: { voucher: VoucherActive; discount: number } | null = null;
  for (const v of vouchers) {
    if (v.scope === 'tool' && !(v.toolIds || []).includes(toolId)) continue;
    if (v.minPurchaseCredits != null && priceCredits < v.minPurchaseCredits) continue;
    const discount = computeVoucherDiscount(v, priceCredits);
    if (discount <= 0) continue;
    if (!best || discount > best.discount) best = { voucher: v, discount };
  }
  return best;
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
