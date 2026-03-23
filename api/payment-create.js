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

// PayPal chỉ chấp nhận ASCII — strip toàn bộ ký tự non-ASCII
function toAsciiSlug(str) {
  return str
    .normalize('NFD')                          // tách dấu ra khỏi chữ
    .replace(/[\u0300-\u036f]/g, '')           // xóa dấu
    .replace(/[đĐ]/g, 'd')                     // đ → d
    .replace(/[^a-zA-Z0-9\-_]/g, '-')         // ký tự lạ → gạch
    .replace(/-+/g, '-')                       // gộp nhiều gạch
    .replace(/^-|-$/g, '')                     // trim gạch đầu/cuối
    .slice(0, 127);                            // PayPal giới hạn 127 chars
}

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

  // Sanitize slug — PayPal header/body chỉ chấp nhận ASCII
  const safeSlug = toAsciiSlug(slug);
  const idempotencyKey = `tuvi-${safeSlug}-${Date.now()}`;

  try {
    const token = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': idempotencyKey,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: safeSlug,
          description: `Luan giai Tu Vi day du - ${safeSlug}`,  // ASCII only
          amount: {
            currency_code: CURRENCY,
            value: PRICE,
          },
          custom_id: slug,  // lưu slug gốc (UTF-8) vào custom_id để dùng sau
        }],
        application_context: {
          brand_name: 'Tu Vi Minh Bao',  // ASCII only
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
      console.error('[payment-create] PayPal error:', JSON.stringify(err));
      throw new Error(err.details?.[0]?.description || err.message || 'PayPal order creation failed');
    }

    const order = await orderRes.json();
    const approvalUrl = order.links?.find(l => l.rel === 'approve')?.href;
    if (!approvalUrl) throw new Error('No approval URL from PayPal');

    return res.status(200).json({ orderId: order.id, approvalUrl });

  } catch (e) {
    console.error('[payment-create]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
