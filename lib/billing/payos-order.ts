// lib/billing/payos-order.ts
// ============================================================
// TẠO ĐƠN NẠP payOS (chuyển khoản VietQR) — nguồn DUY NHẤT, dùng chung cho
// trang nạp web (`/api/payment?action=create-bank`) và kênh chat (gửi ảnh QR
// ngay trong Zalo/Messenger/WhatsApp/Telegram). Chốt đơn vẫn một cửa:
// `app/api/bank-webhook` → RPC `bank_settle_topup`, khớp theo `bank_orders`.
// ============================================================

import { signPayOSData } from './payos';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITE_URL = 'https://www.tuviminhbao.com';

export interface PayOSOrderInput {
  userId: string;
  packageId: string;
  amountVND: number;
  credits: number;
  label: string;
  /** Trang payOS quay về sau khi trả (mặc định trang nạp web). */
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayOSOrder {
  orderCode: number;
  checkoutUrl: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  /** Chuỗi VietQR payOS phát ra (vẽ thành ảnh QR). */
  qrCode: string | null;
  amountVND: number;
  credits: number;
  label: string;
  /** Nội dung chuyển khoản — MỘT chuỗi cho cả payOS lẫn màn hình khách. */
  description: string;
}

/** Tạo đơn payOS + ghi `bank_orders` (pending). Ném lỗi khi payOS từ chối. */
export async function createPayOSOrder(input: PayOSOrderInput): Promise<PayOSOrder> {
  const { userId, packageId, amountVND, credits, label } = input;
  const orderCode = Date.now() % 999_999_999;
  // 🔑 MỘT chuỗi cho cả hai phía. Bản trước khai với PayOS là `label` cắt 25
  // ký tự ("Phổ Thông – 240 Luong") trong khi modal lại bảo khách ghi nội dung
  // CK là `TVMB<orderCode>` — hai chuỗi KHÁC nhau cho cùng một đơn. Hiện vô
  // hại vì PayOS khớp bằng số tài khoản ảo chứ không bằng nội dung, nhưng đó
  // là vô hại NHỜ MAY: rơi vào kênh nào khớp bằng nội dung CK là khách gõ
  // đúng theo màn hình mà tiền không ai nhận.
  // Chọn `TVMB<orderCode>` chứ không chọn label: ASCII (ô nội dung CK của
  // ngân hàng hay chối dấu tiếng Việt và dấu –), ngắn (≤13 ký tự, PayOS trần
  // 25), và tự nó là khoá đối soát. Nhãn đọc được vẫn còn nguyên ở
  // `bank_orders.label` và ở `credit_transactions.description`.
  const description = `TVMB${orderCode}`;
  const returnUrl =
    input.returnUrl || `${SITE_URL}/topup.html?payment=success&method=bank&orderCode=${orderCode}`;
  const cancelUrl = input.cancelUrl || `${SITE_URL}/topup.html?payment=cancelled`;
  const sigData = { amount: amountVND, cancelUrl, description, orderCode, returnUrl };

  const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.PAYOS_CLIENT_ID!,
      'x-api-key': process.env.PAYOS_API_KEY!,
    },
    body: JSON.stringify({ ...sigData, signature: signPayOSData(sigData, process.env.PAYOS_CHECKSUM_KEY!) }),
  });
  const payosData = await res.json();
  if (payosData.code !== '00') throw new Error(payosData.desc || 'payOS error');

  await fetch(`${SUPABASE_URL}/rest/v1/bank_orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY || '',
      Authorization: `Bearer ${SUPABASE_KEY || ''}`,
      Prefer: 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      order_code: String(orderCode),
      user_id: userId,
      package_id: packageId,
      amount_vnd: amountVND,
      credits,
      label,
      status: 'pending',
      created_at: new Date().toISOString(),
    }),
  });

  const d = payosData.data;
  return {
    orderCode,
    checkoutUrl: d.checkoutUrl,
    accountNumber: d.accountNumber,
    accountName: d.accountName,
    bin: String(d.bin || ''),
    qrCode: d.qrCode || null,
    amountVND,
    credits,
    label,
    description,
  };
}
