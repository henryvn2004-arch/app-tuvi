// lib/billing/momo.ts
// Nguồn DUY NHẤT dựng & kiểm chữ ký MoMo (tạo đơn + IPN) — cùng vai trò với
// `lib/billing/payos.ts`, cùng bài học: đừng để mỗi route tự viết lại chuỗi
// ký, hai bản trôi khỏi nhau là chuyện chắc chắn xảy ra.
//
// 🪤 CHƯA ĐỐI CHIẾU VỚI TÀI LIỆU MERCHANT THẬT — viết từ tài liệu công khai
// "MoMo AIO v2 / payWithMethod" lúc chưa có tài khoản merchant để test tay
// (container này cũng không có mạng ra momo.vn). TRƯỚC KHI BẬT THẬT (set
// MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY trên Vercel): đối chiếu
// lại tên trường + THỨ TỰ trường trong chuỗi ký với tài liệu trong Merchant
// Portal của MoMo (mỗi merchant có thể có phiên bản riêng), rồi thử MỘT đơn
// thật ở môi trường test-payment.momo.vn trước khi chuyển `MOMO_MODE=live`.
// Cho tới lúc đó tính năng này VÔ HẠI: thiếu 3 biến env trên thì
// `handleCreateMomo` (app/api/payment/route.ts) trả lỗi ngay, không route
// nào khác đụng tới file này.
//
// Endpoint tạo đơn và endpoint IPN dùng HAI thứ tự trường KHÁC NHAU trong
// chuỗi ký — bê nguyên thứ tự của bên này sang bên kia là chữ ký luôn sai,
// bẫy y hệt payOS (field thiếu/thừa im lặng, không phải lỗi cú pháp).
import crypto from 'crypto';

export const MOMO_MODE = (process.env.MOMO_MODE || '').trim().toLowerCase();

// ⚠️ Mặc định TEST — giống quy ước `PAYPAL_MODE`: chỉ `MOMO_MODE=live` mới
// đập vào tiền thật, quên set thì rơi về sandbox thay vì rơi ngược vào live.
export const MOMO_CREATE_ENDPOINT = MOMO_MODE === 'live'
  ? 'https://payment.momo.vn/v2/gateway/api/create'
  : 'https://test-payment.momo.vn/v2/gateway/api/create';

function hmac(raw: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

export interface MomoCreateSigFields {
  accessKey: string; amount: number | string; extraData: string; ipnUrl: string;
  orderId: string; orderInfo: string; partnerCode: string; redirectUrl: string;
  requestId: string; requestType: string;
}

/** Chữ ký cho lượt TẠO ĐƠN — thứ tự trường đúng như tài liệu `payWithMethod`. */
export function signMomoCreate(f: MomoCreateSigFields, secretKey: string): string {
  const raw = `accessKey=${f.accessKey}&amount=${f.amount}&extraData=${f.extraData}`
    + `&ipnUrl=${f.ipnUrl}&orderId=${f.orderId}&orderInfo=${f.orderInfo}`
    + `&partnerCode=${f.partnerCode}&redirectUrl=${f.redirectUrl}`
    + `&requestId=${f.requestId}&requestType=${f.requestType}`;
  return hmac(raw, secretKey);
}

export interface MomoIpnBody {
  partnerCode?: string; orderId?: string; requestId?: string; amount?: number | string;
  orderInfo?: string; orderType?: string; transId?: string | number; resultCode?: number | string;
  message?: string; payType?: string; responseTime?: string | number; extraData?: string;
  signature?: string;
}

/** Kiểm chữ ký gói IPN MoMo gửi tới — thứ tự trường KHÁC lượt tạo đơn. */
export function verifyMomoIpnSignature(body: MomoIpnBody, accessKey: string, secretKey: string): boolean {
  if (!body || !body.signature) return false;
  const raw = `accessKey=${accessKey}&amount=${body.amount}&extraData=${body.extraData ?? ''}`
    + `&message=${body.message ?? ''}&orderId=${body.orderId}&orderInfo=${body.orderInfo ?? ''}`
    + `&orderType=${body.orderType ?? ''}&partnerCode=${body.partnerCode}&payType=${body.payType ?? ''}`
    + `&requestId=${body.requestId}&responseTime=${body.responseTime}&resultCode=${body.resultCode}`
    + `&transId=${body.transId}`;
  return hmac(raw, secretKey) === body.signature;
}
