// app/api/paypal-webhook/route.ts
// ============================================================
// Webhook PayPal — lưới đỡ cho việc cộng Lượng.
//
// VÌ SAO CẦN: việc cộng Lượng vốn phụ thuộc HOÀN TOÀN vào chuyện trình duyệt
// khách quay về `payment-success.html` rồi gọi `?action=capture`. Khách trả
// tiền xong mà đóng tab, rớt mạng, hay máy hết pin thì đơn nằm ở `APPROVED`
// rồi hết hạn: tiền không bị trừ thật (intent là CAPTURE) nhưng khách vẫn nhớ
// là mình đã bấm trả tiền và không thấy Lượng đâu. Ở mức sandbox thì không sao,
// ở mức tiền thật đó là ticket hỗ trợ đều đặn.
//
// Webhook đi cùng một cửa `settlePayPalTopup` với trình duyệt, và cửa đó chịu
// được gọi trùng (xem `_patches/migration-paypal-webhook.sql`), nên hai đường
// chạm cùng một đơn cùng lúc vẫn chỉ cộng Lượng MỘT lần.
// ============================================================
import { NextRequest } from 'next/server';
import { settlePayPalTopup, verifyPayPalWebhook } from '@/lib/billing/paypal';

export const maxDuration = 20;

/** Các sự kiện đáng chốt đơn. Mọi loại khác đều bỏ qua có chủ ý. */
const HANDLED = new Set([
  // Khách đã bấm duyệt nhưng trình duyệt có thể không bao giờ quay về.
  'CHECKOUT.ORDER.APPROVED',
  // Tiền đã thu xong — chốt chặn cuối, phòng khi lượt capture của trình duyệt
  // thu được tiền rồi mới chết ở bước ghi sổ.
  'PAYMENT.CAPTURE.COMPLETED',
]);

/** Moi order id ra khỏi resource — mỗi loại sự kiện để nó một chỗ khác nhau. */
function orderIdOf(eventType: string, resource: Record<string, any>): string {
  if (eventType === 'CHECKOUT.ORDER.APPROVED') return String(resource?.id || '');
  // Với PAYMENT.CAPTURE.COMPLETED thì `resource.id` là id của CAPTURE, không
  // phải của đơn; id đơn nằm ở supplementary_data.
  const fromSupp = resource?.supplementary_data?.related_ids?.order_id;
  if (fromSupp) return String(fromSupp);
  // Đường lùi: link `up` trỏ về chính đơn.
  const up = (resource?.links as { rel: string; href: string }[] | undefined)
    ?.find(l => l.rel === 'up')?.href || '';
  return up.split('/checkout/orders/')[1]?.split('/')[0] || '';
}

/**
 * Bóc vài trường ĐỊNH DANH ra khỏi thân gói tin CHƯA xác thực, để ghi log.
 *
 * ⚠️ Dữ liệu ở đây do phía gửi khai và CHƯA qua cửa chữ ký — chỉ được dùng để
 * chẩn đoán, TUYỆT ĐỐI không dùng để quyết định gì. Mỗi giá trị phải khớp một
 * mẫu hẹp mới được ghi, nếu không thì bỏ: log là thứ người ta đọc và grep, nên
 * một chuỗi tuỳ ý từ Internet chèn được vào đó là chèn được cả dòng giả.
 */
function peekUnverified(raw: string): string {
  let o: Record<string, any>;
  try { o = JSON.parse(raw); } catch { return `(không phải JSON, dài ${raw.length})`; }
  const safe = (v: unknown) => {
    const t = String(v ?? '');
    return /^[A-Za-z0-9._:+-]{1,64}$/.test(t) ? t : '(bỏ)';
  };
  return [
    `event_type=${safe(o?.event_type)}`,
    `event_id=${safe(o?.id)}`,
    `create_time=${safe(o?.create_time)}`,
  ].join(' ');
}

export async function POST(request: NextRequest) {
  // Chữ ký phải soát trên ĐÚNG chuỗi byte đã nhận. Đọc `.json()` rồi
  // `JSON.stringify` lại là đổi thứ tự khoá / khoảng trắng ⇒ chữ ký sai.
  const raw = await request.text();

  if (!(await verifyPayPalWebhook(request.headers, raw))) {
    // Phía TRẢ VỀ vẫn không nói gì — đây là cửa mở ra Internet. Phía LOG thì
    // ngược lại: một gói tin trượt chữ ký là thứ khó chẩn nhất, và khi không
    // biết nó là sự kiện gì thì không phân biệt nổi "code sai" với "gói tin cũ
    // ký bằng webhook đã xoá, thử lại mãi mãi" — hai thứ đòi hai cách xử lý
    // khác hẳn nhau.
    console.error('[paypal-webhook] 401 —', peekUnverified(raw));
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(raw);
  } catch {
    console.error('[paypal-webhook] thân gói tin không phải JSON hợp lệ, dài', raw.length);
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const eventType = String(event.event_type || '');
  // Ghi MỌI gói tin đã qua cửa chữ ký. Nhánh "bỏ qua" trước đây trả 200 lặng
  // thinh, nên khi webhook đăng ký `All Events` thì gần như mọi lượt giao đều
  // vô hình trong log — đúng lúc cần biết "PayPal có gửi không" thì không có
  // gì để đọc. Một dòng cho mỗi gói tin là cái giá rẻ để câu hỏi đó trả lời
  // được bằng log thay vì bằng suy đoán.
  console.log('[paypal-webhook] nhận', eventType || '(không có event_type)');
  if (!HANDLED.has(eventType)) {
    return Response.json({ message: 'ignored', eventType });
  }

  const orderId = orderIdOf(eventType, event.resource || {});
  if (!orderId) {
    console.error('[paypal-webhook] không tìm được orderId trong', eventType);
    // 200: không có orderId thì PayPal gửi lại bao nhiêu lần cũng vậy.
    return Response.json({ message: 'no order id', eventType });
  }

  try {
    const out = await settlePayPalTopup(orderId);
    if (!out.ok) {
      // 4xx của mình = gói tin này không bao giờ chốt được (đơn không phải
      // topup, thiếu userId…) ⇒ trả 200 để PayPal thôi gửi lại. Còn 5xx là
      // trục trặc phía mình ⇒ trả 500 để PayPal thử lại.
      const retriable = out.status >= 500;
      console.error('[paypal-webhook]', eventType, orderId, '→', out.error, retriable ? '(sẽ thử lại)' : '(bỏ qua)');
      return Response.json({ message: out.error }, { status: retriable ? 500 : 200 });
    }
    console.log('[paypal-webhook]', eventType, orderId,
      out.credited ? `đã cộng ${out.credits} Lượng` : 'đơn đã được chốt trước đó');
    return Response.json({ success: true, credited: out.credited, credits: out.credits });
  } catch (e) {
    console.error('[paypal-webhook] lỗi khi chốt', orderId, e);
    return Response.json({ error: 'settle failed' }, { status: 500 });
  }
}

// PayPal không gọi GET, nhưng có người sẽ mở thử bằng trình duyệt lúc đi tìm
// xem URL đã sống chưa.
export async function GET() {
  return Response.json({ message: 'PayPal webhook endpoint. POST only.' }, { status: 405 });
}
