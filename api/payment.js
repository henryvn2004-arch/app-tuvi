// api/payment.js
// Gộp create + capture + check thành 1 function để tiết kiệm Vercel function slots
// POST /api/payment?action=create   { slug }
// POST /api/payment?action=capture  { orderId, slug, userId? }
// GET  /api/payment?action=check    ?slug=xxx&userId=xxx

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID    = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITE_URL     = 'https://www.tuviminhbao.com';
// PRICE read from request body (default 19.00)
const CURRENCY     = 'USD';

// ── Helpers ───────────────────────────────────────────────────────

function toAsciiSlug(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

async function getPayPalToken() {
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

async function savePurchase({ orderId, slug, userId, email, amount, currency }) {
  slug = toAsciiSlug(slug);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      order_id: orderId, slug, user_id: userId || null,
      email: email || null, amount: parseFloat(amount),
      currency, status: 'completed',
      created_at: new Date().toISOString(),
    }),
  });
  return res.ok;
}

// ── Action: create ────────────────────────────────────────────────

function getCancelUrl(slug) {
  if (slug.startsWith('xem-tuoi-')) return `${SITE_URL}/xem-tuoi.html?payment=cancelled`;
  if (slug.startsWith('xem-lam-an-')) return `${SITE_URL}/xem-lam-an.html?payment=cancelled`;
  return `${SITE_URL}/la-so.html?slug=${encodeURIComponent(slug)}&payment=cancelled`;
}

async function handleCreate(req, res) {
  const { slug, amount } = req.body || {};
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const price = amount || '19.00';
  const safeSlug = toAsciiSlug(slug);

  try {
    const token = await getPayPalToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `tuvi-${safeSlug}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: safeSlug,
          description: `${slug.startsWith('xem-tuoi-') ? 'Xem Tuoi Vo Chong' : slug.startsWith('xem-lam-an-') ? 'Xem Tuoi Lam An' : 'Luan giai Tu Vi'} - ${safeSlug}`,
          amount: { currency_code: CURRENCY, value: price },
          custom_id: slug,
        }],
        application_context: {
          brand_name: 'Tu Vi Minh Bao',
          locale: 'vi-VN',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${SITE_URL}/payment-success.html?slug=${encodeURIComponent(slug)}`,
          cancel_url: getCancelUrl(safeSlug),
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json();
      throw new Error(err.details?.[0]?.description || err.message || 'PayPal order failed');
    }

    const order = await orderRes.json();
    const approvalUrl = order.links?.find(l => l.rel === 'approve')?.href;
    if (!approvalUrl) throw new Error('No approval URL');

    return res.status(200).json({ orderId: order.id, approvalUrl });
  } catch (e) {
    console.error('[payment/create]', e.message);
    return res.status(500).json({ error: e.message });
  }
}

// ── Action: capture ───────────────────────────────────────────────

async function handleCapture(req, res) {
  const { orderId, slug, userId } = req.body || {};
  if (!orderId || !slug) return res.status(400).json({ error: 'Missing orderId or slug' });

  try {
    const token = await getPayPalToken();

    // Verify order
    const verifyRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!verifyRes.ok) throw new Error('Cannot verify order');
    const order = await verifyRes.json();

    if (order.status === 'COMPLETED') {
      const unit = order.purchase_units?.[0];
      const capture = unit?.payments?.captures?.[0];
      await savePurchase({
        orderId, slug: unit?.custom_id || slug, userId,
        email: order.payer?.email_address,
        amount: capture?.amount?.value || PRICE,
        currency: capture?.amount?.currency_code || CURRENCY,
      });
      return res.status(200).json({ success: true, status: 'already_completed' });
    }

    if (order.status !== 'APPROVED') {
      return res.status(400).json({ error: `Order status: ${order.status}` });
    }

    // Capture
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!captureRes.ok) {
      const err = await captureRes.json();
      throw new Error(err.message || 'Capture failed');
    }

    const captured = await captureRes.json();
    const unit = captured.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];

    if (captured.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') {
      throw new Error(`Capture incomplete: ${captured.status}`);
    }

    await savePurchase({
      orderId, slug: unit?.custom_id || slug, userId,
      email: captured.payer?.email_address,
      amount: capture.amount.value,
      currency: capture.amount.currency_code,
    });

    return res.status(200).json({ success: true, orderId, slug, amount: capture.amount.value });
  } catch (e) {
    console.error('[payment/capture]', e.message);
    return res.status(500).json({ error: e.message });
  }
}

// ── Action: check ─────────────────────────────────────────────────

async function handleCheck(req, res) {
  const { slug, userId } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const safeSlug = toAsciiSlug(slug);

  try {
    let url = `${SUPABASE_URL}/rest/v1/purchases?slug=eq.${encodeURIComponent(safeSlug)}&status=eq.completed&limit=1&select=id,email,user_id,created_at`;
    if (userId) url += `&user_id=eq.${encodeURIComponent(userId)}`;

    const r = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) throw new Error('Supabase query failed');
    const rows = await r.json();

    return res.status(200).json({
      purchased: rows.length > 0,
      purchasedAt: rows[0]?.created_at || null,
    });
  } catch (e) {
    console.error('[payment/check]', e.message);
    return res.status(500).json({ error: e.message });
  }
}

// ── Main handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  const action = req.query.action;

  if (action === 'create' && req.method === 'POST') return handleCreate(req, res);
  if (action === 'capture' && req.method === 'POST') return handleCapture(req, res);
  if (action === 'check') return handleCheck(req, res);

  return res.status(400).json({ error: 'Invalid action. Use ?action=create|capture|check' });
}
