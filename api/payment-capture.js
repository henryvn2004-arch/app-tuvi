// api/payment-capture.js
// Capture PayPal order sau khi user approve
// POST { orderId, slug, userId? }

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY;

async function getAccessToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const { access_token } = await res.json();
  return access_token;
}

async function savePurchase({ orderId, slug, userId, email, amount, currency }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      order_id:   orderId,
      slug,
      user_id:    userId || null,
      email:      email || null,
      amount:     parseFloat(amount),
      currency,
      status:     'completed',
      created_at: new Date().toISOString(),
    }),
  });
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId, slug, userId } = req.body || {};
  if (!orderId || !slug) return res.status(400).json({ error: 'Missing orderId or slug' });

  try {
    const token = await getAccessToken();

    // 1. Verify order status trước khi capture
    const verifyRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!verifyRes.ok) throw new Error('Cannot verify PayPal order');
    const order = await verifyRes.json();

    if (order.status === 'COMPLETED') {
      // Đã capture rồi (double submit) — vẫn lưu nếu chưa có
      const unit = order.purchase_units?.[0];
      const capture = unit?.payments?.captures?.[0];
      await savePurchase({
        orderId,
        slug: unit?.custom_id || slug,
        userId,
        email: order.payer?.email_address,
        amount: capture?.amount?.value || '19.00',
        currency: capture?.amount?.currency_code || 'USD',
      });
      return res.status(200).json({ success: true, status: 'already_completed' });
    }

    if (order.status !== 'APPROVED') {
      return res.status(400).json({ error: `Order status: ${order.status}` });
    }

    // 2. Capture payment
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      const err = await captureRes.json();
      throw new Error(err.message || 'Capture failed');
    }

    const captured = await captureRes.json();
    const unit     = captured.purchase_units?.[0];
    const capture  = unit?.payments?.captures?.[0];

    if (captured.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
      throw new Error(`Capture incomplete: ${captured.status}`);
    }

    // 3. Save vào Supabase purchases
    await savePurchase({
      orderId,
      slug: unit?.custom_id || slug,
      userId,
      email: captured.payer?.email_address,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
    });

    console.log(`[payment-capture] ✅ Captured $${capture.amount.value} for slug: ${slug}`);

    return res.status(200).json({
      success: true,
      orderId,
      slug,
      amount: capture.amount.value,
    });

  } catch (e) {
    console.error('[payment-capture]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
