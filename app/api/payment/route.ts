// app/api/payment/route.ts
// GET  /api/payment?action=balance&userId=xxx
// GET  /api/payment?action=check&slug=xxx&userId=xxx
// POST /api/payment?action=topup    { packageId, userId }
// POST /api/payment?action=capture  { orderId, slug, userId }
// POST /api/payment?action=deduct   (Authorization: Bearer <token>) { amount, toolType, slug, description }
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

// ── Credit packages ───────────────────────────────────────────
const PACKAGES: Record<string, { amount: string; credits: number; label: string }> = {
  '10': { amount: '10.00', credits: 100, label: 'Starter – 100 Credits' },
  '20': { amount: '20.00', credits: 220, label: 'Popular – 220 Credits' },
  '40': { amount: '40.00', credits: 460, label: 'Pro – 460 Credits'     },
};

// ── Helpers ───────────────────────────────────────────────────
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

const SB_HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

async function getUserFromToken(token: string): Promise<{ id: string; email?: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function getBalance(userId: string): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_credits?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: SB_HEADERS }
  );
  if (!res.ok) return 0;
  const rows = await res.json();
  return rows[0]?.balance ?? 0;
}

async function rpc(fn: string, params: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function logTransaction(p: {
  userId: string; amount: number; type: string;
  description?: string; slug?: string; paypalOrderId?: string;
}) {
  await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
    method: 'POST',
    headers: { ...SB_HEADERS, 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      user_id:         p.userId,
      amount:          p.amount,
      type:            p.type,
      description:     p.description   || null,
      slug:            p.slug          || null,
      paypal_order_id: p.paypalOrderId || null,
      created_at:      new Date().toISOString(),
    }),
  });
}

async function hasSlugAccess(userId: string, slug: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/credit_transactions?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(slug)}&amount=lt.0&limit=1&select=id`,
    { headers: SB_HEADERS }
  );
  if (!res.ok) return false;
  return (await res.json()).length > 0;
}

// ── GET: balance ──────────────────────────────────────────────
async function handleBalance(sp: URLSearchParams): Promise<Response> {
  const userId = sp.get('userId') || '';
  if (!userId) return err('Missing userId', 400);
  if (process.env.PAYWALL_DISABLED === 'true') return ok({ balance: 99999, _dev: 'paywall_disabled' });
  try {
    return ok({ balance: await getBalance(userId) });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: check slug access ────────────────────────────────────
async function handleCheck(sp: URLSearchParams): Promise<Response> {
  const slug   = sp.get('slug')   || '';
  const userId = sp.get('userId') || '';
  if (!slug || !userId) return ok({ hasAccess: false });
  if (process.env.PAYWALL_DISABLED === 'true') return ok({ hasAccess: true, _dev: 'paywall_disabled' });
  try {
    return ok({ hasAccess: await hasSlugAccess(userId, slug) });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: topup ───────────────────────────────────────────────
async function handleTopup(body: Record<string, unknown>): Promise<Response> {
  const packageId = String(body.packageId || '');
  const userId    = String(body.userId    || '');
  const pkg = PACKAGES[packageId];
  if (!pkg) return err(`Invalid packageId. Use: ${Object.keys(PACKAGES).join(', ')}`, 400);

  const slug = `topup-${packageId}`;
  try {
    const ppToken = await getPayPalToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization':     `Bearer ${ppToken}`,
        'Content-Type':      'application/json',
        'PayPal-Request-Id': `tuvi-topup-${packageId}-${userId.slice(0, 8)}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: slug,
          description:  `Tử Vi Minh Bảo – Nạp ${pkg.credits} Credits`,
          amount: { currency_code: CURRENCY, value: pkg.amount },
          custom_id: `${slug}|${userId}`,
        }],
        application_context: {
          brand_name:   'Tu Vi Minh Bao',
          locale:       'vi-VN',
          landing_page: 'NO_PREFERENCE',
          user_action:  'PAY_NOW',
          return_url: `${SITE_URL}/payment-success.html?slug=${encodeURIComponent(slug)}&userId=${encodeURIComponent(userId)}`,
          cancel_url:  `${SITE_URL}/topup.html?payment=cancelled`,
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

// ── POST: capture ─────────────────────────────────────────────
async function handleCapture(body: Record<string, unknown>): Promise<Response> {
  const orderId = String(body.orderId || '');
  const slug    = String(body.slug    || '');
  let   userId  = String(body.userId  || '');
  if (!orderId || !slug) return err('Missing orderId or slug', 400);
  if (!slug.startsWith('topup-')) return err('Only topup orders handled here', 400);

  const packageId = slug.replace('topup-', '');
  const pkg = PACKAGES[packageId];
  if (!pkg) return err('Invalid package in slug', 400);

  try {
    const ppToken = await getPayPalToken();
    const verifyRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${ppToken}` },
    });
    if (!verifyRes.ok) throw new Error('Cannot verify PayPal order');
    const order = await verifyRes.json();

    if (!userId) {
      const customId: string = order.purchase_units?.[0]?.custom_id || '';
      userId = customId.split('|')[1] || '';
    }
    if (!userId) return err('Cannot determine userId', 400);

    if (order.status === 'COMPLETED') {
      const dupRes = await fetch(
        `${SUPABASE_URL}/rest/v1/credit_transactions?paypal_order_id=eq.${encodeURIComponent(orderId)}&limit=1&select=id`,
        { headers: SB_HEADERS }
      );
      if (dupRes.ok && (await dupRes.json()).length > 0) {
        return ok({ success: true, status: 'already_completed', credits: pkg.credits });
      }
      const newBal = await rpc('add_credits', { p_user_id: userId, p_amount: pkg.credits });
      await logTransaction({ userId, amount: pkg.credits, type: 'topup', description: pkg.label, paypalOrderId: orderId });
      return ok({ success: true, credits: pkg.credits, balance: newBal });
    }

    if (order.status !== 'APPROVED') return err(`Order status: ${order.status}`, 400);

    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ppToken}`, 'Content-Type': 'application/json' },
    });
    if (!captureRes.ok) {
      const e = await captureRes.json();
      throw new Error(e.message || 'Capture failed');
    }
    const captured = await captureRes.json();
    if (captured.status !== 'COMPLETED') throw new Error(`Capture incomplete: ${captured.status}`);

    const newBal = await rpc('add_credits', { p_user_id: userId, p_amount: pkg.credits });
    await logTransaction({ userId, amount: pkg.credits, type: 'topup', description: pkg.label, paypalOrderId: orderId });
    return ok({ success: true, credits: pkg.credits, balance: newBal });

  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: deduct ──────────────────────────────────────────────
async function handleDeduct(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const authHeader = request.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return err('Missing Authorization token', 401);

  const amount      = parseInt(String(body.amount || '0'));
  const toolType    = String(body.toolType    || '');
  const slug        = String(body.slug        || '');
  const description = String(body.description || toolType);

  if (!amount || amount <= 0) return err('Invalid amount', 400);
  if (!toolType)              return err('Missing toolType', 400);

  if (process.env.PAYWALL_DISABLED === 'true') {
    return ok({ success: true, balance: 99999, _dev: 'paywall_disabled' });
  }

  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid or expired token', 401);

    if (slug) {
      const already = await hasSlugAccess(user.id, slug);
      if (already) return ok({ success: true, alreadyPaid: true });
    }

    let newBal: number;
    try {
      newBal = await rpc('deduct_credits', { p_user_id: user.id, p_amount: amount });
    } catch (e: unknown) {
      if ((e as Error).message?.includes('insufficient_balance')) {
        return ok({ success: false, insufficientBalance: true, balance: await getBalance(user.id) });
      }
      throw e;
    }

    await logTransaction({ userId: user.id, amount: -amount, type: toolType, description, slug: slug || undefined });
    return ok({ success: true, balance: newBal });

  } catch (e: unknown) { return err((e as Error).message); }
}

// ── Route handlers ────────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  if (action === 'balance') return handleBalance(searchParams);
  if (action === 'check')   return handleCheck(searchParams);
  return err('Invalid action. Use ?action=balance|check', 400);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body   = await parseBody(request);
  if (action === 'topup')   return handleTopup(body);
  if (action === 'capture') return handleCapture(body);
  if (action === 'deduct')  return handleDeduct(request, body);
  return err('Invalid action. Use ?action=topup|capture|deduct', 400);
}
