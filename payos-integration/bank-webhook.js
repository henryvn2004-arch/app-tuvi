// api/bank-webhook.js
// payOS webhook — nhận thông báo khi có giao dịch thành công
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

// Verify chữ ký payOS
function verifyWebhookSignature(webhookBody) {
  const { data, signature } = webhookBody;
  if (!data || !signature) return false;

  // Sort keys, build string
  const sortedKeys = Object.keys(data).sort();
  const dataStr = sortedKeys
    .map(k => `${k}=${data[k]}`)
    .join('&');

  const expected = crypto
    .createHmac('sha256', CHECKSUM_KEY)
    .update(dataStr)
    .digest('hex');

  return expected === signature;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Verify signature
    if (!verifyWebhookSignature(body)) {
      console.error('payOS webhook: invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { data } = body;

    // Chỉ xử lý giao dịch PAID
    if (data.code !== '00' && body.code !== '00') {
      return res.status(200).json({ message: 'ignored' });
    }

    const orderCode = String(data.orderCode);

    // Tìm pending order trong Supabase
    const { data: purchase, error: fetchErr } = await supabase
      .from('purchases')
      .select('*')
      .eq('order_code', orderCode)
      .eq('payment_method', 'bank_transfer')
      .eq('status', 'pending')
      .single();

    if (fetchErr || !purchase) {
      console.warn('payOS webhook: order not found', orderCode);
      return res.status(200).json({ message: 'order not found, ignored' });
    }

    // Verify amount khớp
    if (Number(data.amount) < Number(purchase.amount_vnd)) {
      console.warn('payOS webhook: amount mismatch', data.amount, purchase.amount_vnd);
      return res.status(200).json({ message: 'amount mismatch, ignored' });
    }

    // Update status → paid
    const { error: updateErr } = await supabase
      .from('purchases')
      .update({
        status: 'paid',
        payos_transaction_id: String(data.paymentLinkId || data.reference || ''),
        paid_at: new Date().toISOString()
      })
      .eq('order_code', orderCode);

    if (updateErr) {
      console.error('payOS webhook: update error', updateErr);
      return res.status(500).json({ error: 'DB update failed' });
    }

    console.log('payOS webhook: order paid', orderCode, purchase.slug);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('payOS webhook error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
