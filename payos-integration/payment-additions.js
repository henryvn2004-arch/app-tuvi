// ============================================================
// THÊM VÀO api/payment.js — payOS bank transfer actions
// Paste đoạn này vào trong handler() của payment.js,
// trước dòng return res.status(400).json({ error: 'Unknown action' })
// ============================================================

// ── Giá VNĐ (điều chỉnh nếu cần) ──
const PRICE_VND = {
  laso: 450000,      // Luận giải lá số ~$19
  xem_tuoi: 220000,  // Xem tuổi vợ chồng ~$9
  xem_lam_an: 220000 // Xem tuổi làm ăn ~$9
};

function getProductVND(slug) {
  if (!slug) return PRICE_VND.laso;
  if (slug.startsWith('xem-lam-an')) return PRICE_VND.xem_lam_an;
  if (slug.startsWith('xem-tuoi')) return PRICE_VND.xem_tuoi;
  return PRICE_VND.laso;
}

function getProductLabel(slug) {
  if (!slug) return 'Luan giai la so';
  if (slug.startsWith('xem-lam-an')) return 'Xem tuoi lam an';
  if (slug.startsWith('xem-tuoi')) return 'Xem tuoi vo chong';
  return 'Luan giai la so';
}

// Tạo chữ ký payOS
function createPayOSSignature(data) {
  const crypto = require('crypto');
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  const sortedKeys = Object.keys(data).sort();
  const dataStr = sortedKeys.map(k => `${k}=${data[k]}`).join('&');
  return crypto.createHmac('sha256', checksumKey).update(dataStr).digest('hex');
}

// ── ACTION: create-bank ──────────────────────────────────────
if (action === 'create-bank') {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const amountVND = getProductVND(slug);
  // orderCode phải là số nguyên dương, max 9 chữ số
  const orderCode = Date.now() % 999999999;
  // description tối đa 25 ký tự
  const description = getProductLabel(slug).substring(0, 25);

  const returnUrl = `https://tuviminhbao.com/payment-success.html?slug=${encodeURIComponent(slug)}&method=bank`;
  const cancelUrl = `https://tuviminhbao.com/payment-success.html?cancelled=1&slug=${encodeURIComponent(slug)}`;

  const sigData = { amount: amountVND, cancelUrl, description, orderCode, returnUrl };
  const signature = createPayOSSignature(sigData);

  // Gọi payOS API tạo payment link
  const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.PAYOS_CLIENT_ID,
      'x-api-key': process.env.PAYOS_API_KEY,
    },
    body: JSON.stringify({ ...sigData, signature })
  });

  const payosData = await payosRes.json();
  if (payosData.code !== '00') {
    console.error('payOS create error:', payosData);
    return res.status(500).json({ error: 'payOS error', detail: payosData.desc });
  }

  // Lưu pending order vào Supabase
  const { error: dbErr } = await supabase.from('purchases').insert({
    slug,
    order_code: String(orderCode),
    amount_vnd: amountVND,
    status: 'pending',
    payment_method: 'bank_transfer',
    created_at: new Date().toISOString()
  });

  if (dbErr) console.error('DB insert error:', dbErr);

  return res.status(200).json({
    orderCode,
    checkoutUrl: payosData.data.checkoutUrl,
    qrCode: payosData.data.qrCode,        // string dạng base64 hoặc URL
    accountNumber: payosData.data.accountNumber,
    accountName: payosData.data.accountName,
    bin: payosData.data.bin,
    amountVND
  });
}

// ── ACTION: check-bank ───────────────────────────────────────
if (action === 'check-bank') {
  const orderCode = req.query.orderCode || req.body?.orderCode;
  if (!orderCode) return res.status(400).json({ error: 'Missing orderCode' });

  const { data: purchase } = await supabase
    .from('purchases')
    .select('status, slug')
    .eq('order_code', String(orderCode))
    .single();

  if (!purchase) return res.status(404).json({ error: 'Order not found' });

  return res.status(200).json({
    paid: purchase.status === 'paid',
    slug: purchase.slug
  });
}
