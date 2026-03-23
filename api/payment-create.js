// api/payment-create.js
// Tạo PayPal order cho 1 lá số
// POST { slug, amount? }

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const SITE_URL      = 'https://www.tuviminhbao.com';
const PRICE         = '19.00';
const CURRENCY      = 'USD';

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
  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.body || {};
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const token = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `tuvi-${slug}-${Date.now()}`, // idempotency key
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: slug,
          description: `Luận giải Tử Vi đầy đủ — ${slug}`,
          amount: {
            currency_code: CURRENCY,
            value: PRICE,
          },
          custom_id: slug,
        }],
        application_context: {
          brand_name: 'Tử Vi Minh Bảo',
          locale: 'vi-VN',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${SITE_URL}/payment-success.html?slug=${encodeURIComponent(slug)}`,
          cancel_url: `${SITE_URL}/la-so.html?slug=${encodeURIComponent(slug)}&payment=cancelled`,
        },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json();
      console.error('[payment-create] PayPal error:', err);
      throw new Error(err.message || 'PayPal order creation failed');
    }

    const order = await orderRes.json();

    // Lấy approval URL để redirect user
    const approvalUrl = order.links?.find(l => l.rel === 'approve')?.href;
    if (!approvalUrl) throw new Error('No approval URL from PayPal');

    return res.status(200).json({
      orderId: order.id,
      approvalUrl,
    });

  } catch (e) {
    console.error('[payment-create]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
