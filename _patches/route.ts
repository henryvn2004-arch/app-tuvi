// app/api/payment/route.ts
// GET  /api/payment?action=balance&userId=xxx
// GET  /api/payment?action=check&slug=xxx&userId=xxx
// POST /api/payment?action=topup    { packageId, userId }
// POST /api/payment?action=capture  { orderId, slug, userId }
// POST /api/payment?action=deduct   headers: Authorization + body: { amount, toolType, slug, description }
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

// ── Credit packages ──────────────────────────────────────────
const PACKAGES: Record<string, { amount: string; credits: number; label: string }> = {
  '10':  { amount: '10.00', credits: 100,  label: 'Starter – 100 Credits' },
  '20':  { amount: '20.00', credits: 220,  label: 'Popular – 220 Credits' },
  '40':  { amount: '40.00', credits: 460,  label: 'Pro – 460 Credits' },
};

// ── Tool costs (credits) ─────────────────────────────────────
const TOOL_COSTS: Record<string, number> = {
  'use_laso':        190,
  'use_xem_tuoi':     90,
  'use_xem_lam_an':   90,
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

async function getUserFromToken(token: string): Promise<{ id: string; email?: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function supabaseRPC(fn: string, params: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }
  return await res.json();
}

async function getBalance(userId: string): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_credits?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) return 0;
  const rows = await res.json();
  return rows[0]?.balance ?? 0;
}

async function logTransaction(p: {
  userId: string; amount: number; type: string;
  description?: string; slug?: string; paypalOrderId?: string;
}) {
  await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=ignore-duplicates',
    },
    body: JSON.stringify({
      user_id: p.userId,
      amount: p.amount,
      type: p.type,
      description: p.description || null,
      slug: p.slug || null,
      paypal_order_id: p.paypalOrderId || null,
      created_at: new Date().toISOString(),
    }),
  });
}

// Check if user already spent credits for a specific slug (re-access)
async function hasSlugAccess(userId: string, slug: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/credit_transactions?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(slug)}&amount=lt.0&limit=1&select=id`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

// ── Handlers ──────────────────────────────────────────────────

// GET /api/payment?action=balance&userId=xxx
async function handleBalance(searchParams: URLSearchParams): Promise<Response> {
  const userId = searchParams.get('userId') || '';
  if (!userId) return err('Missing userId', 400);
  if (process.env.PAYWALL_DISABLED === 'true') return ok({ balance: 99999, _dev: 'paywall_disabled' });
  try {
    const balance = await getBalance(userId);
    return ok({ balance });
  } catch (e: unknown) { return err((e as Error).message); }
}

// GET /api/payment?action=check&slug=xxx&userId=xxx
async function handleCheck(searchParams: URLSearchParams): Promise<Response> {
  const slug   = searchParams.get('slug') || '';
  const userId = searchParams.get('userId') || '';
  if (!slug || !userId) return ok({ hasAccess: false });

  if (process.env.PAYWALL_DISABLED === 'true') {
    return ok({ hasAccess: true, _dev: 'paywall_disabled' });
  }

  try {
    const access = await hasSlugAccess(userId, slug);
    return ok({ hasAccess: access });
  } catch (e: unknown) { return err((e as Error).message); }
}

// POST /api/payment?action=topup  body: { packageId, userId }
async function handleTopup(body: Record<string, unknown>): Promise<Response> {
  const packageId = String(body.packageId || '');
  const userId    = String(body.userId || '');
  const pkg = PACKAGES[packageId];
  if (!pkg) return err(`Invalid packageId. Use: ${Object.keys(PACKAGES).join(', ')}`, 400);

  const slug = `topup-${packageId}`;

  try {
    const token = await getPayPalToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `tuvi-topup-${packageId}-${userId.slice(0, 8)}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: slug,
          description: `Tử Vi Minh Bảo – Nạp ${pkg.credits} Credits`,
          amount: { currency_code: CURRENCY, value: pkg.amount },
          custom_id: `${slug}|${userId}`,
        }],
        application_context: {
          brand_name: 'Tu Vi Minh Bao', locale: 'vi-VN',
          landing_page: 'NO_PREFERENCE', user_action: 'PAY_NOW',
          return_url: `${SITE_URL}/payment-success.html?slug=${encodeURIComponent(slug)}&userId=${encodeURIComponent(userId)}`,
          cancel_url: `${SITE_URL}/topup.html?payment=cancelled`,
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

// POST /api/payment?action=capture  body: { orderId, slug, userId }
async function handleCapture(body: Record<string, unknown>): Promise<Response> {
  const orderId = String(body.orderId || '');
  const slug    = String(body.slug || '');
  const userId  = String(body.userId || '');

  if (!orderId || !slug) return err('Missing orderId or slug', 400);

  // Only handles topup-* slugs now
  if (!slug.startsWith('topup-')) {
    return err('This endpoint only processes topup orders. Tools use /api/payment?action=deduct instead.', 400);
  }

  const packageId = slug.replace('topup-', '');
  const pkg = PACKAGES[packageId];
  if (!pkg) return err('Invalid package in slug', 400);

  try {
    const ppToken = await getPayPalToken();

    // Check if already captured
    const verifyRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${ppToken}` },
    });
    if (!verifyRes.ok) throw new Error('Cannot verify order');
    const order = await verifyRes.json();

    let finalUserId = userId;
    // Parse userId from custom_id if not in body
    if (!finalUserId) {
      const customId = order.purchase_units?.[0]?.custom_id || '';
      finalUserId = customId.split('|')[1] || '';
    }

    if (order.status === 'COMPLETED') {
      // Already captured — idempotent: check if credits already added
      const existing = await fetch(
        `${SUPABASE_URL}/rest/v1/credit_transactions?paypal_order_id=eq.${encodeURIComponent(orderId)}&limit=1&select=id`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const rows = await (existing.ok ? existing.json() : Promise.resolve([]));
      if (rows.length > 0) return ok({ success: true, status: 'already_completed', credits: pkg.credits });

      // Add credits
      if (finalUserId) {
        const newBal = await supabaseRPC('add_credits', { p_user_id: finalUserId, p_amount: pkg.credits });
        await logTransaction({ userId: finalUserId, amount: pkg.credits, type: 'topup', description: pkg.label, paypalOrderId: orderId });
        return ok({ success: true, status: 'completed', credits: pkg.credits, balance: newBal });
      }
      return ok({ success: true, status: 'already_completed', credits: pkg.credits });
    }

    if (order.status !== 'APPROVED') return err(`Order status: ${order.status}`, 400);

    // Capture
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

    if (!finalUserId) return err('Cannot determine userId for credit allocation', 400);

    const newBal = await supabaseRPC('add_credits', { p_user_id: finalUserId, p_amount: pkg.credits });
    await logTransaction({ userId: finalUserId, amount: pkg.credits, type: 'topup', description: pkg.label, paypalOrderId: orderId });

    return ok({ success: true, credits: pkg.credits, balance: newBal });
  } catch (e: unknown) { return err((e as Error).message); }
}

// POST /api/payment?action=deduct
// Headers: Authorization: Bearer <user_access_token>
// Body: { amount, toolType, slug, description }
async function handleDeduct(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const authHeader = request.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return err('Missing Authorization token', 401);

  const amount      = parseInt(String(body.amount || '0'));
  const toolType    = String(body.toolType || '');
  const slug        = String(body.slug || '');
  const description = String(body.description || toolType);

  if (!amount || amount <= 0) return err('Invalid amount', 400);
  if (!toolType)              return err('Missing toolType', 400);

  if (process.env.PAYWALL_DISABLED === 'true') {
    return ok({ success: true, balance: 99999, _dev: 'paywall_disabled' });
  }

  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid or expired token', 401);

    // Check re-access: already deducted for this slug?
    if (slug) {
      const already = await hasSlugAccess(user.id, slug);
      if (already) return ok({ success: true, alreadyPaid: true, message: 're-access granted' });
    }

    // Atomic deduct
    let newBal: number;
    try {
      newBal = await supabaseRPC('deduct_credits', { p_user_id: user.id, p_amount: amount });
    } catch (e: unknown) {
      const msg = (e as Error).message || '';
      if (msg.includes('insufficient_balance')) {
        const balance = await getBalance(user.id);
        return ok({ success: false, insufficientBalance: true, balance });
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
