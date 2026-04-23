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
  '20': { amount: '20.00', credits: 200,  label: 'Cá Nhân – 200 Lượng'  },
  '45': { amount: '45.00', credits: 500,  label: 'Gia Đình – 500 Lượng' },
  '80': { amount: '80.00', credits: 1000, label: 'Nhóm – 1000 Lượng'    },
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

// ── Admin: verify token is admin ─────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tuviminhbao.com';

async function verifyAdmin(token: string): Promise<{ id: string; email: string } | null> {
  const user = await getUserFromToken(token);
  if (!user) return null;
  const email = (user as any).email || '';
  if (email !== ADMIN_EMAIL) return null;
  return user as { id: string; email: string };
}

// ── GET: balance ──────────────────────────────────────────────────
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
  const packageId    = String(body.packageId    || '');
  const userId       = String(body.userId       || '');
  const customAmount = parseFloat(String(body.customAmount || '0'));

  // Resolve package
  let pkg: { amount: string; credits: number; label: string };
  let slug: string;

  if (packageId === 'custom') {
    if (!customAmount || customAmount < 5 || customAmount > 500)
      return err('Số tiền tùy chỉnh phải từ $5 đến $500', 400);
    const roundedAmt = Math.round(customAmount * 100) / 100;
    const credits    = Math.round(roundedAmt * 10);
    pkg  = { amount: roundedAmt.toFixed(2), credits, label: `Nạp Tùy Chỉnh – ${credits} Lượng` };
    slug = `topup-custom-${Math.round(roundedAmt)}`;
  } else {
    const found = PACKAGES[packageId];
    if (!found) return err(`packageId không hợp lệ. Dùng: ${Object.keys(PACKAGES).join(', ')} hoặc "custom"`, 400);
    pkg  = found;
    slug = `topup-${packageId}`;
  }
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

// ── POST: admin grant credits ────────────────────────────────
// Headers: Authorization: Bearer <admin_token>
// Body: { targetEmail?, targetUserId?, amount, description? }
async function handleAdminGrant(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const amount      = parseInt(String(body.amount || '0'));
  const targetEmail = String(body.targetEmail || '');
  const targetId    = String(body.targetUserId || '');
  const description = String(body.description || 'Admin grant');

  if (!amount || amount <= 0) return err('Invalid amount', 400);
  if (!targetEmail && !targetId) return err('Need targetEmail or targetUserId', 400);

  try {
    // Resolve userId from email if needed
    let userId = targetId;
    if (!userId && targetEmail) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(targetEmail)}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      });
      if (!r.ok) return err('User not found', 404);
      const data = await r.json();
      userId = data.users?.[0]?.id || '';
      if (!userId) return err(`No user found with email: ${targetEmail}`, 404);
    }

    const newBal = await rpc('add_credits', { p_user_id: userId, p_amount: amount });
    await logTransaction({ userId, amount, type: 'admin_grant', description });
    return ok({ success: true, balance: newBal, userId });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: admin create user ───────────────────────────────────
// Headers: Authorization: Bearer <admin_token>
// Body: { email, password, credits? }
async function handleAdminCreateUser(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const email    = String(body.email    || '').trim().toLowerCase();
  const password = String(body.password || '').trim();
  const credits  = parseInt(String(body.credits || '0'));

  if (!email || !password) return err('Need email and password', 400);
  if (password.length < 6)  return err('Password min 6 chars', 400);

  try {
    // Create user via Supabase Admin API
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!createRes.ok) {
      const e = await createRes.json();
      throw new Error(e.message || e.msg || 'Create user failed');
    }
    const newUser = await createRes.json();
    const userId = newUser.id;

    // Grant initial credits if specified
    let balance = 0;
    if (credits > 0) {
      balance = await rpc('add_credits', { p_user_id: userId, p_amount: credits });
      await logTransaction({ userId, amount: credits, type: 'admin_grant', description: 'Khởi tạo credits khi tạo account' });
    }

    return ok({ success: true, userId, email, balance });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin list users (all auth users + balances) ────────
async function handleAdminUsers(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const page = parseInt(sp.get('page') || '1');
    const perPage = 100;

    // Fetch all auth users via Admin API (service key)
    const authRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!authRes.ok) throw new Error(`Auth API failed: ${authRes.status}`);
    const authData = await authRes.json();
    const authUsers = authData.users || [];

    // Fetch all credit balances
    const credRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_credits?select=user_id,balance`,
      { headers: SB_HEADERS }
    );
    const credits: { user_id: string; balance: number }[] = credRes.ok ? await credRes.json() : [];
    const creditMap: Record<string, number> = {};
    credits.forEach((c) => { creditMap[c.user_id] = c.balance; });

    // Fetch transaction counts per user
    const txnRes = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions?select=user_id&type=neq.topup`,
      { headers: SB_HEADERS }
    );
    const txns: { user_id: string }[] = txnRes.ok ? await txnRes.json() : [];
    const txnCount: Record<string, number> = {};
    txns.forEach((t) => { txnCount[t.user_id] = (txnCount[t.user_id] || 0) + 1; });

    // Merge
    const users = authUsers.map((u: any) => ({
      id:           u.id,
      email:        u.email,
      name:         u.user_metadata?.full_name || u.user_metadata?.name || '',
      provider:     u.app_metadata?.provider || 'email',
      created_at:   u.created_at,
      last_sign_in: u.last_sign_in_at,
      balance:      creditMap[u.id] ?? 0,
      tool_uses:    txnCount[u.id] || 0,
      confirmed:    !!u.email_confirmed_at,
    }));

    return ok({ users, total: authData.total || users.length });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── Route handlers ────────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  if (action === 'balance')      return handleBalance(searchParams);
  if (action === 'check')        return handleCheck(searchParams);
  if (action === 'admin-users')  return handleAdminUsers(request, searchParams);
  return err('Invalid action.', 400);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body   = await parseBody(request);
  if (action === 'topup')           return handleTopup(body);
  if (action === 'capture')         return handleCapture(body);
  if (action === 'deduct')          return handleDeduct(request, body);
  if (action === 'admin-grant')     return handleAdminGrant(request, body);
  if (action === 'admin-create-user') return handleAdminCreateUser(request, body);
  return err('Invalid action.', 400);
}
