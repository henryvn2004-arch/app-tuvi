// lib/email/invoice.ts
// ============================================================
// Hoá đơn/biên nhận nạp Lượng — gửi NGAY tại chokepoint đã cộng tiền thật
// (`settlePayPalTopup` và `bank-webhook`), không phải cron. `dedupeKey` khoá
// theo mã đơn (`invoice-<orderId>`) nên trình duyệt và webhook đụng cùng đơn
// vẫn chỉ ra một email — cùng cơ chế mutex `email_log` của lib/email/send.ts.
// ============================================================
import { sendTransactionalEmail } from './send';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function resolveEmail(userId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { email?: string };
    return j.email || null;
  } catch {
    return null;
  }
}

export interface InvoiceInput {
  userId: string;
  orderId: string;
  provider: 'paypal' | 'bank';
  credits: number;
  amountVnd: number;
  label: string;
  balance: number;
}

function vnd(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

/** Best-effort — không được phép làm hỏng luồng chốt đơn nếu gửi email lỗi. */
export async function sendInvoiceEmail(input: InvoiceInput): Promise<void> {
  try {
    const email = await resolveEmail(input.userId);
    if (!email) return;

    const date = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 0;font-family:Georgia,'Times New Roman',serif">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:6px;overflow:hidden">
<tr><td style="background:#061A2E;padding:28px 32px;text-align:center">
<img src="https://tuviminhbao.com/seal.webp" width="40" height="40" alt="" style="display:block;margin:0 auto 8px">
<span style="color:#C9A84C;font-size:18px;letter-spacing:1px">Tử Vi Minh Bảo</span>
</td></tr>
<tr><td style="padding:32px">
<h1 style="font-size:18px;color:#061A2E;margin:0 0 4px">Biên nhận nạp Lượng</h1>
<p style="font-size:13px;color:#888;margin:0 0 24px">${date}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333">
<tr><td style="padding:6px 0;color:#888">Mã đơn</td><td style="padding:6px 0;text-align:right">${input.orderId}</td></tr>
<tr><td style="padding:6px 0;color:#888">Gói</td><td style="padding:6px 0;text-align:right">${input.label}</td></tr>
<tr><td style="padding:6px 0;color:#888">Số Lượng nạp</td><td style="padding:6px 0;text-align:right">${input.credits} Lượng</td></tr>
<tr><td style="padding:6px 0;color:#888">Số tiền</td><td style="padding:6px 0;text-align:right">${vnd(input.amountVnd)}</td></tr>
<tr><td style="padding:6px 0;color:#888">Cổng thanh toán</td><td style="padding:6px 0;text-align:right">${input.provider === 'paypal' ? 'PayPal' : 'Chuyển khoản ngân hàng'}</td></tr>
<tr><td colspan="2" style="border-top:1px solid #e5e5e5;padding-top:10px;margin-top:6px"></td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#061A2E">Số dư hiện tại</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#C0392B">${input.balance} Lượng</td></tr>
</table>
<p style="font-size:12px;color:#999;margin-top:28px">Đây là biên nhận tự động, không cần phản hồi email này. Cần hỗ trợ, liên hệ qua trang <a href="https://tuviminhbao.com" style="color:#1455A4">tuviminhbao.com</a>.</p>
</td></tr>
</table>
</td></tr>
</table>`;

    await sendTransactionalEmail({
      dedupeKey: `invoice-${input.orderId}`,
      template: 'invoice',
      to: email,
      subject: `Biên nhận nạp ${input.credits} Lượng — Tử Vi Minh Bảo`,
      html,
      userId: input.userId,
    });
  } catch (e) {
    console.error('[invoice] gửi hoá đơn lỗi', input.orderId, e);
  }
}
