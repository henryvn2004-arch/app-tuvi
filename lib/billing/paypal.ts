// lib/billing/paypal.ts
// ============================================================
// Nguồn DUY NHẤT cho mọi thứ chạm PayPal: khoá, endpoint, tỷ giá, việc chốt
// một đơn topup, và việc xác thực webhook.
//
// VÌ SAO GOM VÀO ĐÂY: từ nay có HAI đường cùng chốt một đơn — trình duyệt
// quay về `payment-success.html` gọi `/api/payment?action=capture`, và webhook
// PayPal gọi `/api/paypal-webhook`. Hai bản logic tiền song song là chuyện
// chắc chắn trôi lệch; cái nào sửa trước thì đường kia âm thầm giữ bản cũ.
// ============================================================

import { getPackage, quoteCustomVnd } from './packages';

// ⚠️ Mặc định là SANDBOX. Chỉ `PAYPAL_MODE=live` mới đập vào tiền thật — và
// nhầm chiều nào cũng hỏng IM LẶNG: quên set thì khoá LIVE bắn vào sandbox
// (401, mọi lượt nạp báo "Lỗi kết nối PayPal"); set nhầm thì khoá sandbox bắn
// vào live. `.trim().toLowerCase()` vì một dấu cách thừa hay chữ `Live` dán từ
// bảng env cũng đủ rơi ngược về sandbox mà không có gì kêu.
export const PAYPAL_MODE = (process.env.PAYPAL_MODE || '').trim().toLowerCase();
export const PAYPAL_BASE = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export const PAYPAL_CURRENCY = 'USD';
/** Tỷ giá quy đổi VND → USD cho PayPal. Dùng CHUNG cho lượt tạo đơn và lượt
 *  chốt đơn — hai nơi lệch nhau là số Lượng cộng không khớp số tiền đã thu. */
export const VND_PER_USD = 25_000;

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

export async function getPayPalToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return (await res.json()).access_token;
}

// ── Chốt một đơn topup ────────────────────────────────────────
export type SettleOutcome =
  | { ok: true; credits: number; balance: number; credited: boolean }
  | { ok: false; status: number; error: string };

/**
 * Đưa MỘT đơn topup PayPal về trạng thái đã thu tiền và đã cộng Lượng.
 *
 * Gọi được bao nhiêu lần cũng vẫn ra cùng một kết quả: RPC `paypal_settle_topup`
 * dùng chính ràng buộc UNIQUE trên `paypal_order_id` làm chỗ giành quyền, nên
 * lượt thứ hai trả `credited=false` chứ không cộng thêm. Nhờ vậy trình duyệt và
 * webhook đụng nhau trong cùng mili-giây vẫn an toàn.
 *
 * `slug` / `userId` chỉ là GỢI Ý từ phía gọi; thiếu thì moi ra từ chính đơn
 * (`reference_id` và `custom_id` đều do lượt tạo đơn ghi vào).
 */
export async function settlePayPalTopup(
  orderId: string,
  opts: { slug?: string; userId?: string } = {},
): Promise<SettleOutcome> {
  if (!orderId) return { ok: false, status: 400, error: 'Missing orderId' };

  const ppToken = await getPayPalToken();
  const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { 'Authorization': `Bearer ${ppToken}` },
    cache: 'no-store',
  });
  if (!orderRes.ok) return { ok: false, status: 502, error: 'Cannot verify PayPal order' };
  let order = await orderRes.json();

  const unit     = order.purchase_units?.[0] || {};
  const customId = String(unit.custom_id || '');
  const slug     = opts.slug   || String(unit.reference_id || '') || customId.split('|')[0] || '';
  const userId   = opts.userId || customId.split('|')[1] || '';

  if (!slug.startsWith('topup-')) return { ok: false, status: 400, error: 'Only topup orders handled here' };
  if (!userId) return { ok: false, status: 400, error: 'Cannot determine userId' };

  // ⚠️ Nạp TUỲ CHỌN không có dòng nào trong `credit_packages` — slug của nó là
  // `topup-custom-<N>k`, nên `getPackage()` luôn trả null. Số Lượng phải suy lại
  // từ SỐ TIỀN THẬT trên đơn, không từ slug: slug đã làm tròn về đơn vị nghìn.
  // USD hai chữ số thập phân ↔ VND ở rate 25.000 round-trip khớp đúng với mọi
  // số tiền là bội của 250đ (ô nhập bước 1.000đ). Đơn giá vẫn do `quoteCustomVnd`
  // suy từ bảng gói — một nguồn.
  const packageId = slug.replace('topup-', '');
  let pkg: { credits: number; label: string; amountVnd: number };
  if (packageId.startsWith('custom-')) {
    const usd = Number(unit.amount?.value || 0);
    const vnd = Math.round(usd * VND_PER_USD);
    if (!(vnd > 0)) return { ok: false, status: 400, error: 'Không đọc được số tiền của đơn PayPal' };
    const { credits } = await quoteCustomVnd(vnd);
    if (credits <= 0) return { ok: false, status: 500, error: 'Không quy đổi được số Lượng cho đơn này' };
    pkg = { credits, label: `Nap Tuy Chinh – ${credits} Luong`, amountVnd: vnd };
  } else {
    const found = await getPackage(packageId);
    if (!found) return { ok: false, status: 400, error: 'Invalid package in slug' };
    pkg = { credits: found.credits, label: `${found.label} – ${found.credits} Luong`, amountVnd: found.amountVnd };
  }

  if (order.status === 'APPROVED') {
    const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ppToken}`, 'Content-Type': 'application/json' },
    });
    if (capRes.ok) {
      order = await capRes.json();
    } else {
      // Đường này đi qua khi trình duyệt và webhook capture cùng lúc: kẻ chậm
      // chân nhận ORDER_ALREADY_CAPTURED. Đó KHÔNG phải lỗi — đọc lại đơn rồi
      // đi tiếp, vì tiền đã thu thật và Lượng vẫn phải được cộng.
      const e = await capRes.json().catch(() => ({}));
      const issue = e?.details?.[0]?.issue || '';
      if (issue !== 'ORDER_ALREADY_CAPTURED') {
        return { ok: false, status: 502, error: e?.message || 'Capture failed' };
      }
      const reread = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
        headers: { 'Authorization': `Bearer ${ppToken}` },
        cache: 'no-store',
      });
      if (!reread.ok) return { ok: false, status: 502, error: 'Cannot re-read PayPal order' };
      order = await reread.json();
    }
  }

  if (order.status !== 'COMPLETED') {
    return { ok: false, status: 400, error: `Order status: ${order.status}` };
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/paypal_settle_topup`, {
    method: 'POST',
    headers: SB_HEADERS,
    cache: 'no-store',
    body: JSON.stringify({
      p_order_id:    orderId,
      p_user_id:     userId,
      p_amount:      pkg.credits,
      p_description: pkg.label,
      p_amount_vnd:  pkg.amountVnd,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('[paypal] settle RPC failed:', text);
    return { ok: false, status: 500, error: 'Không ghi được giao dịch' };
  }
  // RETURNS TABLE ⇒ PostgREST trả về MẢNG một phần tử.
  const row = (JSON.parse(text) as { credited: boolean; balance: number }[])[0];
  if (!row) return { ok: false, status: 500, error: 'Không ghi được giao dịch' };

  // Thưởng giới thiệu tự fire qua trigger trg_referral_check_on_topup.
  return { ok: true, credits: pkg.credits, balance: row.balance, credited: row.credited };
}

// ── Xác thực webhook ──────────────────────────────────────────
/**
 * Hỏi thẳng PayPal xem chữ ký của gói tin có thật không.
 *
 * Fail-CLOSED tuyệt đối: đây là đường PHÁT tiền, thiếu cấu hình hay nghi ngờ gì
 * cũng phải từ chối. (Ngược với `viral-budget.ts` fail-open — cái đó gác ngân
 * sách cho người ĐÃ trả tiền, còn đây là cửa cộng Lượng cho bất kỳ ai gõ đúng
 * URL.)
 */
export async function verifyPayPalWebhook(h: Headers, rawBody: string): Promise<boolean> {
  const webhookId = (process.env.PAYPAL_WEBHOOK_ID || '').trim();
  if (!webhookId) {
    console.error('[paypal-webhook] thiếu PAYPAL_WEBHOOK_ID — từ chối (fail-closed)');
    return false;
  }

  const authAlgo         = h.get('paypal-auth-algo');
  const certUrl          = h.get('paypal-cert-url');
  const transmissionId   = h.get('paypal-transmission-id');
  const transmissionSig  = h.get('paypal-transmission-sig');
  const transmissionTime = h.get('paypal-transmission-time');
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    console.error('[paypal-webhook] thiếu header chữ ký');
    return false;
  }

  // `cert_url` do phía gửi khai. PayPal có tự soát ở đầu kia, nhưng chặn sẵn ở
  // đây để không bao giờ chuyển tiếp một URL lạ đi đâu cả.
  let certHost = '';
  try { certHost = new URL(certUrl).hostname; } catch { return false; }
  if (certHost !== 'api.paypal.com' && !certHost.endsWith('.paypal.com')) {
    console.error('[paypal-webhook] cert_url không thuộc paypal.com:', certHost);
    return false;
  }

  let event: unknown;
  try { event = JSON.parse(rawBody); } catch { return false; }

  try {
    const token = await getPayPalToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        auth_algo:         authAlgo,
        cert_url:          certUrl,
        transmission_id:   transmissionId,
        transmission_sig:  transmissionSig,
        transmission_time: transmissionTime,
        webhook_id:        webhookId,
        webhook_event:     event,
      }),
    });
    if (!res.ok) {
      console.error('[paypal-webhook] verify API trả', res.status, await res.text());
      return false;
    }
    return (await res.json()).verification_status === 'SUCCESS';
  } catch (e) {
    console.error('[paypal-webhook] verify lỗi:', e);
    return false;
  }
}
