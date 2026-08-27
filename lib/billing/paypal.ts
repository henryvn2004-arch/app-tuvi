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

// ── Dịch mã lỗi PayPal sang câu người dùng LÀM ĐƯỢC gì đó ─────
//
// VÌ SAO CẦN: mã `issue` của PayPal đủ để lập trình viên chẩn đoán, nhưng đưa
// nguyên `INSTRUMENT_DECLINED` cho khách thì cũng vô dụng ngang câu chung chung
// cũ. Đã trả giá thật: một lượt nạp hỏng vì thẻ không đủ số dư, mà chính chủ
// site — người biết rõ hệ thống — phải đi dò số dư thẻ mới hiểu. Khách thì
// không dò gì cả, họ chỉ bỏ đi.
//
// Nguyên tắc mỗi câu dưới đây: nói HỎNG Ở ĐÂU và LÀM GÌ TIẾP, bằng tiếng Việt,
// không có mã lỗi. Mã lỗi vẫn đi vào `console.error` cho mình đọc.
const PAYPAL_ISSUE_MESSAGES: Record<string, string> = {
  INSTRUMENT_DECLINED:
    'Thẻ của bạn bị từ chối. Thường gặp nhất là thẻ không đủ số dư, hoặc ngân hàng chặn thanh toán quốc tế. Bạn thử lại bằng thẻ khác, hoặc trả bằng số dư trong tài khoản PayPal.',
  PAYER_CANNOT_PAY:
    'Nguồn tiền này không dùng để thanh toán được. Bạn thử lại bằng thẻ khác hoặc bằng số dư trong tài khoản PayPal.',
  PAYER_ACTION_REQUIRED:
    'Ngân hàng cần bạn xác nhận thêm một bước cho giao dịch này. Bạn quay lại PayPal hoàn tất bước xác thực rồi thử lại.',
  TRANSACTION_REFUSED:
    'PayPal từ chối giao dịch này. Bạn thử lại bằng nguồn tiền khác; nếu vẫn không được, liên hệ PayPal để biết lý do cụ thể.',
  // Nhóm dưới là hỏng ở PHÍA MÌNH — khách có làm gì cũng không xong, nên đừng
  // bảo họ thử lại, mà nhận lỗi và chỉ họ sang kênh khác.
  PAYEE_ACCOUNT_RESTRICTED:
    'Cổng thanh toán của chúng tôi đang gặp sự cố, không phải lỗi từ phía bạn. Bạn dùng cách chuyển khoản ngân hàng, hoặc liên hệ hỗ trợ để được xử lý.',
  PAYEE_ACCOUNT_INVALID:
    'Cổng thanh toán của chúng tôi đang gặp sự cố, không phải lỗi từ phía bạn. Bạn dùng cách chuyển khoản ngân hàng, hoặc liên hệ hỗ trợ để được xử lý.',
  CURRENCY_NOT_SUPPORTED:
    'Cổng thanh toán của chúng tôi đang gặp sự cố, không phải lỗi từ phía bạn. Bạn dùng cách chuyển khoản ngân hàng, hoặc liên hệ hỗ trợ để được xử lý.',
};

/** Câu cho khách đọc. Không kèm mã lỗi — mã đã nằm trong log của server. */
export function humanIssueMessage(issue: string): string {
  return (
    PAYPAL_ISSUE_MESSAGES[issue] ||
    'Thanh toán chưa hoàn tất. Bạn thử lại bằng nguồn tiền khác, hoặc dùng cách chuyển khoản ngân hàng. Nếu vẫn không được, liên hệ hỗ trợ giúp chúng tôi.'
  );
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
  if (!orderRes.ok) {
    console.error('[paypal] không đọc được đơn', orderId, 'HTTP', orderRes.status, await orderRes.text().catch(() => ''));
    return { ok: false, status: 502, error: `Không đọc được đơn PayPal (HTTP ${orderRes.status})` };
  }
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
        // ⚠️ `e.message` của PayPal LUÔN là một câu chung chung ("The requested
        // action could not be performed, semantically incorrect, or failed
        // business validation") — nó KHÔNG phân biệt được "tài khoản nhận bị
        // hạn chế" với "thẻ người mua bị từ chối". Lý do thật nằm ở
        // `details[0].issue`, và `debug_id` là thứ hỗ trợ PayPal hỏi tới. Trả
        // về mỗi `message` là tự bịt mắt đúng lúc cần nhìn nhất — đã trả giá
        // bằng một lượt nạp tiền thật hỏng mà không ai đọc ra được vì sao.
        console.error('[paypal] capture bị từ chối', orderId, 'HTTP', capRes.status, JSON.stringify(e));
        // Khách đọc câu tiếng Việt nói rõ làm gì tiếp; mã `issue` và `debug_id`
        // ở lại trong log cho mình. Đưa mã lỗi ra màn hình chỉ đổi một câu khó
        // hiểu bằng một câu khó hiểu khác.
        return { ok: false, status: 502, error: humanIssueMessage(issue) };
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

  // Chỉ soát tính hợp lệ của JSON. KHÔNG dùng kết quả parse để dựng lại gói tin
  // gửi đi — xem lý do ngay dưới.
  try { JSON.parse(rawBody); } catch {
    console.error('[paypal-webhook] thân gói tin không phải JSON hợp lệ');
    return false;
  }

  // ⚠️ `webhook_event` phải là ĐÚNG CHUỖI BYTE PayPal đã ký, nên nó được nối
  // thẳng vào đây thay vì `JSON.stringify` một object đã parse.
  //
  // VÌ SAO: PayPal ký trên thân gói tin GỐC. Parse rồi tuần tự hoá lại là một
  // phép biến đổi CÓ MẤT MÁT với mục đích này — thứ tự khoá, cách viết số, và
  // nhất là cách escape unicode đều có thể đổi. Mô tả đơn của mình
  // ("Tử Vi Minh Bảo – Nạp N Credits") đầy dấu tiếng Việt và gạch ngang dài;
  // PayPal gửi chúng dạng `\uXXXX` còn `JSON.stringify` của Node bung ra UTF-8
  // thô ⇒ khác byte ⇒ chữ ký sai ⇒ `FAILURE` đều đặn MỌI lần, dù webhook id
  // hoàn toàn đúng. Đã trả giá bằng một buổi truy tìm.
  const verifyBody =
    '{"auth_algo":' + JSON.stringify(authAlgo) +
    ',"cert_url":' + JSON.stringify(certUrl) +
    ',"transmission_id":' + JSON.stringify(transmissionId) +
    ',"transmission_sig":' + JSON.stringify(transmissionSig) +
    ',"transmission_time":' + JSON.stringify(transmissionTime) +
    ',"webhook_id":' + JSON.stringify(webhookId) +
    ',"webhook_event":' + rawBody +
    '}';

  try {
    const token = await getPayPalToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: verifyBody,
    });
    if (!res.ok) {
      console.error('[paypal-webhook] verify API trả', res.status, await res.text());
      return false;
    }
    const out = await res.json();
    if (out?.verification_status !== 'SUCCESS') {
      // ⚠️ Nhánh này TRƯỚC ĐÂY trả `false` mà không ghi gì — nên lúc webhook
      // câm, log trống trơn và không ai biết nó trượt ở cửa nào. Cùng lớp lỗi
      // "nuốt thông tin chẩn đoán trên đường tiền" đã vá hai chỗ khác hôm nay.
      console.error(
        '[paypal-webhook] chữ ký KHÔNG hợp lệ —',
        `verification_status=${out?.verification_status}`,
        `transmission_id=${transmissionId}`,
        // Vân tay chứ không phải độ dài: ID cũ và ID mới ĐỀU dài 17, nên
        // `webhook_id_dài=17` không phân biệt được bản deploy đang đọc cái nào
        // — đúng câu hỏi cần trả lời khi đang đổi webhook. Webhook id là mã
        // định danh, không phải bí mật, nhưng vẫn chỉ ghi đầu-cuối cho gọn.
        `webhook_id=${webhookId.slice(0, 4)}…${webhookId.slice(-4)}`,
        `transmission_time=${transmissionTime}`
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error('[paypal-webhook] verify lỗi:', e);
    return false;
  }
}
