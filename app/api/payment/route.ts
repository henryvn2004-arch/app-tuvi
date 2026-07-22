import crypto from 'crypto';
// app/api/payment/route.ts
// GET  /api/payment?action=balance&userId=xxx
// GET  /api/payment?action=check&slug=xxx&userId=xxx
// POST /api/payment?action=topup    { packageId, userId }
// POST /api/payment?action=capture  { orderId, slug, userId }
// POST /api/payment?action=deduct   (Authorization: Bearer <token>) { amount, toolType, slug, description }
export const maxDuration = 15;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { getPackage, getPackages } from '@/lib/billing/packages';
import { getToolPrice } from '@/lib/billing/pricing';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID     = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const SUPABASE_URL  = process.env.SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY!;
const SITE_URL      = 'https://www.tuviminhbao.com';
const CURRENCY      = 'USD';

// ── Gói nạp ───────────────────────────────────────────────────
// Nguồn thật = bảng credit_packages (lib/billing/packages), admin sửa được;
// module tự fallback hardcode nếu DB hụt. Tỷ giá tham chiếu 1 USD = 25.000đ.

function createPayOSSignature(data: Record<string, unknown>): string {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;
  const str = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('&');
  return crypto.createHmac('sha256', checksumKey).update(str).digest('hex');
}


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
  const packageId        = String(body.packageId        || '');
  const userId           = String(body.userId           || '');
  // Frontend gửi VND-native cho cả PayPal và bank — convert sang USD ở đây
  const customAmountVnd  = parseFloat(String(body.customAmountVnd || body.customAmount || '0'));

  // Resolve package
  let pkg: { amount: string; credits: number; label: string };
  let slug: string;

  if (packageId === 'custom') {
    if (!customAmountVnd || customAmountVnd < 50_000 || customAmountVnd > 5_000_000)
      return err('Số tiền tùy chỉnh phải từ 50.000đ đến 5.000.000đ', 400);
    // 1 Lượng = 2.500đ (no bonus, anchor pricing)
    const credits = Math.floor(customAmountVnd / 2500);
    // PayPal cần USD: convert VND → USD ở rate 25.000
    const usdAmount = Math.round((customAmountVnd / 25_000) * 100) / 100;
    pkg  = { amount: usdAmount.toFixed(2), credits, label: `Nap Tuy Chinh – ${credits} Luong` };
    slug = `topup-custom-${Math.round(customAmountVnd / 1000)}k`;
  } else {
    const pkgs  = await getPackages();
    const found = pkgs[packageId];
    if (!found) return err(`packageId không hợp lệ. Dùng: ${Object.keys(pkgs).join(', ')} hoặc "custom"`, 400);
    pkg  = { amount: found.amountUsd, credits: found.credits, label: `${found.label} – ${found.credits} Luong` };
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
  const foundPkg = await getPackage(packageId);
  if (!foundPkg) return err('Invalid package in slug', 400);
  const pkg = { amount: foundPkg.amountUsd, credits: foundPkg.credits, label: `${foundPkg.label} – ${foundPkg.credits} Luong` };

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
      // Referral reward fire tự động qua Postgres trigger trg_referral_check_on_topup
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
    // Referral reward fire tự động qua Postgres trigger trg_referral_check_on_topup
    return ok({ success: true, credits: pkg.credits, balance: newBal });

  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: deduct ──────────────────────────────────────────────
async function handleDeduct(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const authHeader = request.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return err('Missing Authorization token', 401);

  const clientAmount = parseInt(String(body.amount || '0'));
  const toolType     = String(body.toolType    || '');
  const product      = String(body.product     || ''); // tool_id để tra giá server-side
  const slug         = String(body.slug        || '');
  const description  = String(body.description || toolType);

  if (!toolType) return err('Missing toolType', 400);

  // GIÁ THẬT do server quyết theo tool_pricing (KHÔNG tin amount client gửi).
  // Tool không có trong bảng / bị tắt → fallback amount client (tương thích ngược).
  const serverPrice = product ? await getToolPrice(product) : null;
  const amount = serverPrice != null ? serverPrice : clientAmount;
  if (amount < 0 || (serverPrice == null && (!clientAmount || clientAmount <= 0)))
    return err('Invalid amount', 400);

  if (process.env.PAYWALL_DISABLED === 'true') {
    return ok({ success: true, balance: 99999, _dev: 'paywall_disabled' });
  }

  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid or expired token', 401);

    // Giá server = 0 (tool miễn phí) → cho qua, không trừ.
    if (amount === 0) return ok({ success: true, balance: await getBalance(user.id), free: true });

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

// ── POST: admin set config (app_config upsert) ────────────────
// Body: { key, value, note? }   value = JSON (số / mảng / chuỗi) → cột jsonb.
async function handleAdminSetConfig(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const key = String(body.key || '').trim();
  if (!key) return err('Missing key', 400);
  if (!('value' in body)) return err('Missing value', 400);

  const row: Record<string, unknown> = { key, value: body.value };
  if (body.note != null) row.note = String(body.note);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_config`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(await res.text());
    return ok({ success: true });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: admin save credit package (upsert) ──────────────────
async function handleAdminSavePackage(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const packageId = String(body.package_id || body.packageId || '').trim();
  if (!packageId) return err('Missing package_id', 400);

  const row: Record<string, unknown> = { package_id: packageId, updated_at: new Date().toISOString() };
  if (body.credits     != null) row.credits     = parseInt(String(body.credits));
  if (body.amount_vnd  != null) row.amount_vnd  = parseInt(String(body.amount_vnd));
  if (body.amount_usd  != null) row.amount_usd  = Number(body.amount_usd);
  if (body.label       != null) row.label       = String(body.label);
  if (body.bonus_label != null) row.bonus_label = String(body.bonus_label);
  if (body.enabled     != null) row.enabled     = !!body.enabled;
  if (body.sort_order  != null) row.sort_order  = parseInt(String(body.sort_order));
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/credit_packages`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(await res.text());
    return ok({ success: true });
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

// ── POST: create-bank (payOS) ────────────────────────────────
async function handleCreateBank(body: Record<string, unknown>): Promise<Response> {
  const packageId = String(body.packageId || '');
  const userId    = String(body.userId    || '');
  if (!userId) return err('Missing userId', 400);

  let amountVND: number;
  let credits: number;
  let label: string;

  if (packageId === 'custom') {
    // Frontend gửi customAmountVnd (VND), backward-compat customAmount (USD)
    const customAmountVnd = Number(body.customAmountVnd || 0);
    const customAmountUsd = Number(body.customAmount    || 0);
    if (customAmountVnd) {
      if (customAmountVnd < 50_000 || customAmountVnd > 5_000_000)
        return err('Custom amount must be 50.000đ – 5.000.000đ', 400);
      amountVND = customAmountVnd;
      credits   = Math.floor(customAmountVnd / 2500);  // 1 Lượng = 2.500đ
    } else {
      // Legacy USD path
      if (customAmountUsd < 5 || customAmountUsd > 500) return err('Custom amount must be 5-500 USD', 400);
      amountVND = Math.round(customAmountUsd * 25_000);
      credits   = Math.floor(amountVND / 2500);
    }
    label = `Nap ${credits} Luong`;
  } else {
    const pkgs  = await getPackages();
    const found = pkgs[packageId];
    if (!found) return err(`Invalid packageId. Use: ${Object.keys(pkgs).join(', ')}`, 400);
    amountVND = found.amountVnd;
    credits   = found.credits;
    label     = `${found.label} – ${found.credits} Luong`;
  }

  const orderCode   = Date.now() % 999_999_999;
  const description = label.substring(0, 25);
  const returnUrl   = `${SITE_URL}/topup.html?payment=success&method=bank&orderCode=${orderCode}`;
  const cancelUrl   = `${SITE_URL}/topup.html?payment=cancelled`;
  const sigData     = { amount: amountVND, cancelUrl, description, orderCode, returnUrl };

  try {
    const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id':  process.env.PAYOS_CLIENT_ID!,
        'x-api-key':    process.env.PAYOS_API_KEY!,
      },
      body: JSON.stringify({ ...sigData, signature: createPayOSSignature(sigData) }),
    });
    const payosData = await res.json();
    if (payosData.code !== '00') return err(payosData.desc || 'payOS error');

    await fetch(`${SUPABASE_URL}/rest/v1/bank_orders`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        order_code: String(orderCode), user_id: userId,
        package_id: packageId, amount_vnd: amountVND,
        credits, label,
        status: 'pending', created_at: new Date().toISOString(),
      }),
    });

    const d = payosData.data;
    return ok({ orderCode, checkoutUrl: d.checkoutUrl, accountNumber: d.accountNumber,
      accountName: d.accountName, bin: d.bin, amountVND,
      credits, label });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: check-bank ───────────────────────────────────────────
async function handleCheckBank(sp: URLSearchParams): Promise<Response> {
  const orderCode = sp.get('orderCode') || '';
  if (!orderCode) return err('Missing orderCode', 400);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bank_orders?order_code=eq.${encodeURIComponent(orderCode)}&select=status,credits&limit=1`,
    { headers: SB_HEADERS }
  );
  const rows: { status: string; credits: number }[] = res.ok ? await res.json() : [];
  if (!rows.length) return err('Order not found', 404);
  return ok({ paid: rows[0].status === 'paid', credits: rows[0].credits });
}

// ── Route handlers ────────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  if (action === 'balance')      return handleBalance(searchParams);
  if (action === 'check')        return handleCheck(searchParams);
  if (action === 'admin-users')  return handleAdminUsers(request, searchParams);
  if (action === 'admin-marketing') return handleAdminMarketing(request, searchParams);
  if (action === 'check-bank')  return handleCheckBank(searchParams);
  return err('Invalid action.', 400);
}

// ── GET: admin-marketing (funnel + sources theo cửa sổ ngày) ──────
// Dashboard Marketing đọc events/user_attribution/credit_transactions qua RPC
// aggregate (marketing_funnel + marketing_sources). Chỉ admin (service key gọi RPC).
async function handleAdminMarketing(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  // from/to là ISO date (YYYY-MM-DD). Mặc định 30 ngày gần nhất → hết hôm nay.
  const to = sp.get('to') ? new Date(sp.get('to') as string) : new Date();
  const from = sp.get('from') ? new Date(sp.get('from') as string) : new Date(Date.now() - 30 * 864e5);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return err('Invalid date range', 400);
  // to = cuối ngày (exclusive nửa mở ở +1 ngày) để bao trọn ngày 'to'.
  const toExcl = new Date(to.getTime() + 864e5);
  const params = { p_from: from.toISOString(), p_to: toExcl.toISOString() };

  const callRpc = async (fn: string) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: SB_HEADERS, body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`${fn}: ${await res.text()}`);
    return res.json();
  };

  try {
    const [funnel, sources, acquisition, campaigns, traffic] = await Promise.all([
      callRpc('marketing_funnel'),
      callRpc('marketing_sources'),
      callRpc('marketing_acquisition'),
      callRpc('marketing_campaigns'),
      callRpc('marketing_traffic'),
    ]);
    return ok({
      funnel, sources, acquisition, campaigns, traffic,
      from: from.toISOString(), to: to.toISOString(),
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: referral-register ────────────────────────────────────
// Body: { refCode: string }   Headers: Authorization: Bearer <user_token>
// Frontend gọi sau khi user mới đăng ký xong + có ?ref=CODE trong URL/sessionStorage.
// INSERT pending referral. Reward sẽ trigger tự động khi user nạp lần đầu (Postgres trigger).
async function handleReferralRegister(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const authHeader = request.headers.get('Authorization') || '';
  const userToken  = authHeader.replace('Bearer ', '').trim();
  if (!userToken) return err('Missing Authorization token', 401);

  const refCode = String(body.refCode || '').toUpperCase().trim();
  if (!refCode || refCode.length !== 8) return err('Invalid referral code format', 400);

  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid token', 401);

    // Lookup referrer by code
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_credits?referral_code=eq.${encodeURIComponent(refCode)}&select=user_id&limit=1`,
      { headers: SB_HEADERS }
    );
    const rows: { user_id: string }[] = lookupRes.ok ? await lookupRes.json() : [];
    if (!rows.length) return err('Referral code không tồn tại', 404);

    const referrerId = rows[0].user_id;
    if (referrerId === user.id) return err('Không thể tự refer chính mình', 400);

    // INSERT (UNIQUE constraint on referee_user_id sẽ block double-refer)
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        referrer_user_id: referrerId,
        referee_user_id:  user.id,
        referral_code_used: refCode,
        status: 'pending',
      }),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      return err('Insert failed: ' + text.slice(0, 100));
    }
    const inserted = await insertRes.json();
    if (!inserted?.length) {
      // Đã có referral cho user này (UNIQUE conflict, ignored) — không phải lỗi
      return ok({ success: true, alreadyReferred: true });
    }

    // Tầng 1: thưởng NGAY cho người giới thiệu khi referee vừa đăng ký (best-effort,
    // có cap chống farm trong process_referral_signup). Tầng 2 (30 mỗi bên) vẫn fire
    // khi referee nạp lần đầu qua trigger_referral_check_on_topup.
    try { await rpc('process_referral_signup', { p_referee_user_id: user.id }); } catch { /* best-effort */ }

    return ok({ success: true, referrerId, message: 'Đã ghi nhận! Người giới thiệu vừa nhận thưởng chào mừng. Khi bạn nạp Lượng lần đầu, cả hai nhận thêm 30 Lượng.' });
  } catch (e: unknown) { return err((e as Error).message); }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body   = await parseBody(request);
  if (action === 'topup')             return handleTopup(body);
  if (action === 'capture')           return handleCapture(body);
  if (action === 'deduct')            return handleDeduct(request, body);
  if (action === 'admin-grant')       return handleAdminGrant(request, body);
  if (action === 'admin-set-config')  return handleAdminSetConfig(request, body);
  if (action === 'admin-save-package') return handleAdminSavePackage(request, body);
  if (action === 'admin-create-user') return handleAdminCreateUser(request, body);
  if (action === 'create-bank')       return handleCreateBank(body);
  if (action === 'referral-register') return handleReferralRegister(request, body);
  return err('Invalid action.', 400);
}
