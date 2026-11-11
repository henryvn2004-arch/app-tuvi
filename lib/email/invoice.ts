// lib/email/invoice.ts
// ============================================================
// Hoá đơn/biên nhận nạp Lượng — gửi NGAY tại chokepoint đã cộng tiền thật
// (`settlePayPalTopup` và `bank-webhook`), không phải cron. `dedupeKey` khoá
// theo mã đơn (`invoice-<orderId>`) nên trình duyệt và webhook đụng cùng đơn
// vẫn chỉ ra một email — cùng cơ chế mutex `email_log` của lib/email/send.ts.
// ============================================================
import { sendTransactionalEmail } from './send';
import { getUserLocale } from './locale';
import { renderInvoice } from './i18n';

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
  provider: 'paypal' | 'bank' | 'momo';
  credits: number;
  /** USD thật đã thu (PayPal) — có thì hoá đơn hiện USD; thiếu thì rơi về VNĐ (webhook ngân hàng/MoMo cũ). */
  amountUsd?: number;
  amountVnd: number;
  label: string;
  balance: number;
}

/** Best-effort — không được phép làm hỏng luồng chốt đơn nếu gửi email lỗi. */
export async function sendInvoiceEmail(input: InvoiceInput): Promise<void> {
  try {
    const email = await resolveEmail(input.userId);
    if (!email) return;

    const locale = await getUserLocale(input.userId);
    const { subject, html } = renderInvoice(locale, input);

    await sendTransactionalEmail({
      dedupeKey: `invoice-${input.orderId}`,
      template: 'invoice',
      to: email,
      subject,
      html,
      userId: input.userId,
      locale,
    });
  } catch (e) {
    console.error('[invoice] gửi hoá đơn lỗi', input.orderId, e);
  }
}
