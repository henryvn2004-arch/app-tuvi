// app/api/payment/route.ts
// GET  /api/payment?action=check&slug=xxx&userId=xxx
// POST /api/payment?action=create   { slug, amount }
// POST /api/payment?action=capture  { orderId, slug, userId }
export const maxDuration = 15;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
const SITE_URL      = 'https://www.tuviminhbao.com';
const CURRENCY      = 'USD';

function toAsciiSlug(str: string): string {
  return String(str || '')
    .toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 100);
}

async function getPayPalToken(): Promise<string> {
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

async function savePurchase(p: { orderId: string; slug: string; userId?: string; email?: string; amount: string; currency: string }) {
  const slug = toAsciiSlug(p.slug);
  await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      order_id: p.orderId, slug, user_id: p.userId || null,
      email: p.email || null, amount: parseFloat(p.amount),
      currency: p.currency, status: 'completed',
      created_at: new Date().toISOString(),
    }),
  });
}

function getCancelUrl(slug: string): string {
  if (slug.startsWith('xem-tuoi-'))   return `${SITE_URL}/xem-tuoi.html?payment=cancelled`;
  if (slug.startsWith('xem-lam-an-')) return `${SITE_URL}/xem-lam-an.html?payment=cancelled`;
  return `${SITE_URL}/la-so.html?slug=${encodeURIComponent(slug)}&payment=cancelled`;
}

// ── Handlers ──────────────────────────────────────────────────
async function handleCreate(body: Record<string, unknown>): Promise<Response> {
  const slug = String(body.slug || '');
  const price = String(body.amount || '19.00');
  if (!slug) return err('Missing slug', 400);
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
          brand_name: 'Tu Vi Minh Bao', locale: 'vi-VN',
          landing_page: 'NO_PREFERENCE', user_action: 'PAY_NOW',
          return_url: `${SITE_URL}/payment-success.html?slug=${encodeURIComponent(slug)}`,
          cancel_url: getCancelUrl(safeSlug),
        },
      }),
    });
    if (!orderRes.ok) {
      const e = await orderRes.json();
      throw new Error(e.details?.[0]?.description || e.message || 'PayPal order failed');
    }
    const order = await orderRes.json();
    const approvalUrl = order.links?.find((l: { rel: string }) => l.rel === 'approve')?.href;
    if (!approvalUrl) throw new Error('No approval URL');
    return ok({ orderId: order.id, approvalUrl });
  } catch (e: unknown) { return err((e as Error).message); }
}

async function handleCapture(body: Record<string, unknown>): Promise<Response> {
  const orderId = String(body.orderId || '');
  const slug    = String(body.slug || '');
  const userId  = body.userId ? String(body.userId) : undefined;
  if (!orderId || !slug) return err('Missing orderId or slug', 400);

  try {
    const token = await getPayPalToken();
    const verifyRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!verifyRes.ok) throw new Error('Cannot verify order');
    const order = await verifyRes.json();

    if (order.status === 'COMPLETED') {
      const unit = order.purchase_units?.[0];
      const capture = unit?.payments?.captures?.[0];
      await savePurchase({ orderId, slug: unit?.custom_id || slug, userId, email: order.payer?.email_address, amount: capture?.amount?.value || '19.00', currency: capture?.amount?.currency_code || CURRENCY });
      return ok({ success: true, status: 'already_completed' });
    }
    if (order.status !== 'APPROVED') return err(`Order status: ${order.status}`, 400);

    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!captureRes.ok) { const e = await captureRes.json(); throw new Error(e.message || 'Capture failed'); }
    const captured = await captureRes.json();
    const unit = captured.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    if (captured.status !== 'COMPLETED' || capture?.status !== 'COMPLETED') throw new Error(`Capture incomplete: ${captured.status}`);
    await savePurchase({ orderId, slug: unit?.custom_id || slug, userId, email: captured.payer?.email_address, amount: capture.amount.value, currency: capture.amount.currency_code });
    return ok({ success: true, orderId, slug, amount: capture.amount.value });
  } catch (e: unknown) { return err((e as Error).message); }
}

async function handleCheck(searchParams: URLSearchParams): Promise<Response> {
  const slug   = searchParams.get('slug') || '';
  const userId = searchParams.get('userId') || '';
  if (!slug) return err('Missing slug', 400);

  if (process.env.PAYWALL_DISABLED === 'true') {
    return ok({ purchased: true, purchasedAt: null, _dev: 'paywall_disabled' });
  }
  if (!userId) return ok({ purchased: false, purchasedAt: null });

  const safeSlug = toAsciiSlug(slug);
  try {
    const url = `${SUPABASE_URL}/rest/v1/purchases`
      + `?slug=eq.${encodeURIComponent(safeSlug)}`
      + `&status=eq.completed`
      + `&user_id=eq.${encodeURIComponent(userId)}`
      + `&limit=1&select=id,email,user_id,created_at`;
    const r = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) throw new Error('Supabase query failed');
    const rows = await r.json();
    return ok({ purchased: rows.length > 0, purchasedAt: rows[0]?.created_at || null });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ─── Route handlers ───────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('action') === 'check') return handleCheck(searchParams);
  return err('Invalid action', 400);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = await parseBody(request);
  if (action === 'create')  return handleCreate(body);
  if (action === 'capture') return handleCapture(body);
  return err('Invalid action. Use ?action=create|capture|check', 400);
}
