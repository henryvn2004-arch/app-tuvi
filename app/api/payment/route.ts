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
import { getPackage, getPackages, quoteCustomVnd, vndPerCredit } from '@/lib/billing/packages';
import { getToolPrice } from '@/lib/billing/pricing';
import { hasSlugAccess } from '@/lib/billing/credits';
import { freeGenGate, FREE_GEN_CAP_MESSAGE, railFreeRemaining } from '@/lib/billing/viral-budget';
import { anonTrialStatus } from '@/lib/billing/anon-trial';
import { syncOnboardingTasks } from '@/lib/onboarding/tasks';
import { getConfigValue } from '@/lib/config/appConfig';
import { CRON_RUNS_LIMIT, evaluateJobs, fetchPgcronRuns, syncJobFirstSeen } from '@/lib/ops/jobs';
import { checkEnv } from '@/lib/ops/preflight';
import { logCronRun } from '@/lib/cron/log';
import { tgSendMessage } from '@/lib/channels/telegram';
import { parseFirebaseServiceAccount, sendFcmPush } from '@/lib/channels/push';
import { getGa4Breakdown } from '@/lib/analytics/ga4';
import { getAdminUser } from '@/lib/admin/auth';
import { generateContentSuggestions } from '@/lib/marketing/content-suggestions';
import { generateContentPackText } from '@/lib/marketing/content-pack';
import { SUPPORTED_CHANNELS } from '@/lib/media/publish';

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

// ⚠️ `cache:'no-store'` BẮT BUỘC: Next bọc `fetch` toàn cục và nhớ kết quả kể
// cả trong route động. Đây là CỬA XÁC THỰC của toàn bộ /api/payment — gồm cả
// nhánh admin — nên một phản hồi bị nhớ lại nghĩa là phiên đã huỷ / quyền vừa
// bị gỡ vẫn qua cửa. Cùng bài học đã trả giá ở `hasSlugAccess`.
async function getUserFromToken(token: string): Promise<{ id: string; email?: string; created_at?: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return await res.json();
}

// Cửa sổ coi là "tài khoản vừa đăng ký" cho mã giới thiệu (xem handleReferralRegister).
const REFERRAL_NEW_ACCOUNT_MS = 24 * 60 * 60 * 1000;

/** Ghi 1 dòng vào bảng events (service key, bỏ qua RLS). Best-effort — beacon
 *  hành vi không bao giờ được làm hỏng luồng nghiệp vụ gọi nó. */
async function logEvent(row: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ platform: 'web', ...row }),
    });
  } catch { /* best-effort */ }
}

async function getBalance(userId: string): Promise<number> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_credits?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { cache: 'no-store', headers: SB_HEADERS }
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
  amountVnd?: number; gateway?: string;
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
      amount_vnd:      p.amountVnd      ?? null,
      gateway:         p.gateway        || null,
      created_at:      new Date().toISOString(),
    }),
  });
}

// hasSlugAccess đã chuyển sang lib/billing/credits.ts (nguồn DUY NHẤT) để các
// route tool trả phí dùng chung cho chốt chặn thanh toán server-side — xem
// `toolPaymentDenied`. Logic không đổi.

// ── Admin: verify token belongs to an active admin_users row ──
// Nhiều admin (Google sign-in), không còn hardcode 1 email — tra bảng
// admin_users (xem lib/admin/auth.ts + _patches/migration-admin-users.sql).
async function verifyAdmin(
  token: string
): Promise<{ id: string; email: string; role: 'owner' | 'member'; team: string | null } | null> {
  const user = await getUserFromToken(token);
  if (!user) return null;
  const email = (user as any).email || '';
  if (!email) return null;
  const admin = await getAdminUser(email);
  if (!admin) return null;
  return { id: (user as any).id, email, role: admin.role, team: admin.team };
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

// ── GET: signup-bonus (CÔNG KHAI, không cần đăng nhập) ────────
// Quà đăng ký sống trong `app_config` và đã đổi vài lần (A/B [20,30,40] → [25]).
// Trang topup trước đây hoặc nói lửng lơ "tặng Lượng miễn phí", hoặc — nguy hiểm
// hơn — viết cứng một con số sẽ lệch ngay lần chỉnh giá kế tiếp. Đây là con số
// hứa với người CHƯA có tài khoản nên không thể yêu cầu token; chỉ lộ đúng mức
// quà thấp nhất, không lộ gì khác của app_config.
async function handleSignupBonus(): Promise<Response> {
  const raw = await getConfigValue<unknown>('credits.signup_bonus_variants', null);
  const variants = (Array.isArray(raw) ? raw : [raw])
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  // Không đọc được → null, để giao diện lùi về câu chung chung thay vì hứa sai.
  return ok({ bonus: variants.length ? Math.min(...variants) : null });
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
    // Đơn giá suy từ bậc gói (xem quoteCustomVnd) — KHÔNG chia cứng nữa.
    const { credits } = await quoteCustomVnd(customAmountVnd);
    if (credits <= 0) return err('Không quy đổi được số Lượng cho số tiền này', 500);
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
        { cache: 'no-store', headers: SB_HEADERS }
      );
      if (dupRes.ok && (await dupRes.json()).length > 0) {
        return ok({ success: true, status: 'already_completed', credits: pkg.credits });
      }
      const newBal = await rpc('add_credits', { p_user_id: userId, p_amount: pkg.credits });
      await logTransaction({ userId, amount: pkg.credits, type: 'topup', description: pkg.label, paypalOrderId: orderId, amountVnd: foundPkg.amountVnd, gateway: 'paypal' });
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

    // ── CẦU DAO NGÂN SÁCH ẢNH FREE (V2.2) ──
    // Chặn ở ĐÂY, trước `deduct_credits`: đây là điểm cuối cùng còn chặn được
    // mà chưa đụng vào ví ai. Chặn ở route tool thì đã trừ Lượng rồi — người
    // dùng mất Lượng để đổi lấy một lời từ chối.
    // Chỉ chạm tới người tiêu Lượng QUÀ TẶNG; ai đã nạp không bao giờ bị chặn.
    if (product) {
      const gate = await freeGenGate(user.id, product);
      if (!gate.allowed) {
        return ok({ success: false, capReached: true, message: FREE_GEN_CAP_MESSAGE,
          balance: await getBalance(user.id) });
      }
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
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(targetEmail)}`, { cache: 'no-store',
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
    const perPage = 100;
    const MAX_PAGES = 100; // trần an toàn 10k user (tránh vòng lặp vô hạn)

    // Lấy TOÀN BỘ auth user (loop qua các trang tới khi hết) — bỏ trần 100 cũ.
    const authUsers: any[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const authRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
        { cache: 'no-store', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      if (!authRes.ok) throw new Error(`Auth API failed: ${authRes.status}`);
      const authData = await authRes.json();
      const batch = authData.users || [];
      authUsers.push(...batch);
      if (batch.length < perPage) break; // trang cuối
    }

    // Fetch all credit balances
    const credRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_credits?select=user_id,balance`,
      { cache: 'no-store', headers: SB_HEADERS }
    );
    const credits: { user_id: string; balance: number }[] = credRes.ok ? await credRes.json() : [];
    const creditMap: Record<string, number> = {};
    credits.forEach((c) => { creditMap[c.user_id] = c.balance; });

    // Số lượt DÙNG TOOL trả phí = giao dịch trừ Lượng (amount < 0). Loại topup/
    // signup_bonus/admin_grant (đều amount > 0) → không còn thổi phồng như cũ.
    const spendRes = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions?select=user_id&amount=lt.0`,
      { cache: 'no-store', headers: SB_HEADERS }
    );
    const spends: { user_id: string }[] = spendRes.ok ? await spendRes.json() : [];
    const useCount: Record<string, number> = {};
    spends.forEach((t) => { useCount[t.user_id] = (useCount[t.user_id] || 0) + 1; });

    // Merge
    const users = authUsers.map((u: any) => ({
      id:           u.id,
      email:        u.email,
      name:         u.user_metadata?.full_name || u.user_metadata?.name || '',
      provider:     u.app_metadata?.provider || 'email',
      created_at:   u.created_at,
      last_sign_in: u.last_sign_in_at,
      balance:      creditMap[u.id] ?? 0,
      tool_uses:    useCount[u.id] || 0,
      confirmed:    !!u.email_confirmed_at,
    }));

    return ok({ users, total: users.length });
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
      credits   = (await quoteCustomVnd(customAmountVnd)).credits;  // đơn giá theo bậc gói
    } else {
      // Legacy USD path
      if (customAmountUsd < 5 || customAmountUsd > 500) return err('Custom amount must be 5-500 USD', 400);
      amountVND = Math.round(customAmountUsd * 25_000);
      credits   = (await quoteCustomVnd(amountVND)).credits;
    }
    if (credits <= 0) return err('Không quy đổi được số Lượng cho số tiền này', 500);
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
    { cache: 'no-store', headers: SB_HEADERS }
  );
  const rows: { status: string; credits: number }[] = res.ok ? await res.json() : [];
  if (!rows.length) return err('Order not found', 404);
  return ok({ paid: rows[0].status === 'paid', credits: rows[0].credits });
}

// ── Route handlers ────────────────────────────────────────────
// ── Cron & Jobs (Vận Hành) ────────────────────────────────────
// Đọc log cron_runs (admin) + trigger tay 1 job. cron_runs khoá RLS →
// chỉ đọc/ghi qua service key ở đây. Job Vercel tự log qua withCronLog;
// edge (auto-pipeline) log tay trong trigger.
const CRON_SECRET = process.env.CRON_SECRET || '';
// Phải khớp với sổ job ở lib/ops/jobs.ts. Bảng này TRƯỚC ĐÂY cũng chỉ có 5
// mục như sổ cũ trong admin.html, nên nút "Chạy ngay" của 5 job mới thêm không
// hoạt động — cùng một kiểu trôi lệch giữa hai danh sách chép tay.
const CRON_TRIGGERS: Record<string, { path?: string; edge?: string }> = {
  'cron-khao-luan':    { path: '/api/cron-khao-luan' },
  'cron-master-write': { path: '/api/cron-master-write' },
  'cron-push':         { path: '/api/cron-push' },
  'cron-daily-push':   { path: '/api/cron/daily-push' },
  'auto-pipeline':     { edge: 'auto-pipeline' },
  'ops-digest':        { path: '/api/cron/ops-digest' },
  'cmo-digest':        { path: '/api/cron/cmo-digest' },
  'anomaly-alerts':    { path: '/api/cron/anomaly-alerts' },
  'autopilot-price':   { path: '/api/cron/autopilot-price' },
  'autopilot-promo':   { path: '/api/cron/autopilot-promo' },
  'autopilot-nudge':   { path: '/api/cron/autopilot-nudge' },
};

async function handleAdminCronRuns(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);
  try {
    // Trang này là trung tâm VẬN HÀNH của admin (track COO) — trả kèm sức khoẻ
    // tool để panel không phải gọi thêm một vòng API nữa.
    const [r, health24, health7d, alerts, pgcronRuns] = await Promise.all([
      // `cache: 'no-store'` KHÔNG phải tuỳ chọn ở đây: Next nhớ kết quả GET kể
      // cả trong route động, nên panel Vận Hành có thể vẽ lại một bức ảnh cũ
      // của `cron_runs` và nói "mọi job đúng lịch" trong lúc một job đã chết —
      // đúng ca đã đo ngày 30/07 (xem lib/marketing/anomaly-alerts.ts).
      // Cửa sổ dùng CHUNG `CRON_RUNS_LIMIT` với cảnh báo + digest: ba con số
      // khác nhau là ba nơi cùng nhìn một bảng mà kết luận lệch nhau.
      fetch(
        `${SUPABASE_URL}/rest/v1/cron_runs?select=job_key,source,status,started_at,finished_at,duration_ms,note` +
          `&order=started_at.desc&limit=${CRON_RUNS_LIMIT}`,
        { headers: SB_HEADERS, cache: 'no-store' },
      ),
      // Sức khoẻ tool là THÔNG TIN THÊM: hỏng thì trả mảng rỗng chứ không được
      // làm sập cả trang Cron vốn đã chạy tốt từ trước.
      toolHealth(24),
      toolHealth(24 * 7),
      opsAlerts(),
      // Job pg_cron không ghi cron_runs — xem lib/ops/jobs.ts.
      fetchPgcronRuns(),
    ]);
    const runs = r.ok ? await r.json() : [];
    const reconcile = await rpcSafe('payment_reconcile', { p_days: 30 });
    return ok({
      runs,
      toolHealth24: health24,
      toolHealth7d: health7d,
      opsAlerts: alerts,
      reconcile,
      // S4: sổ job giờ ở SERVER (lib/ops/jobs.ts) — sổ hardcode cũ trong
      // admin.html đã trôi khỏi thực tế (khai 5 job trong khi có 9).
      // CỐ Ý chỉ gộp pg_cron cho phần ĐÁNH GIÁ, không nhét vào `runs` — bảng
      // "Cron & Jobs" bên dưới là log thô của cron_runs, trộn nguồn khác vào
      // sẽ thành một bảng không còn khớp với bất kỳ truy vấn SQL nào.
      jobs: evaluateJobs([...runs, ...pgcronRuns], await syncJobFirstSeen()),
      env: checkEnv(),
      digest: await latestOpsDigest(),
      // S6: rà bảo mật. `rpcSafe` để panel không sập nếu RPC chưa được áp.
      security: await rpcSafe('security_audit', {}),
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

/**
 * Cảnh báo vận hành 48h gần nhất (events.event_type='ops_alert', do cron
 * anomaly-alerts ghi). Panel hiện chúng ngay cả khi Telegram chưa cấu hình —
 * trang admin là mặt bằng giám sát chính, Telegram chỉ là đường đẩy thêm.
 */
async function opsAlerts(): Promise<unknown[]> {
  try {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?event_type=eq.ops_alert&ts=gte.${encodeURIComponent(since)}` +
        `&select=ts,meta&order=ts.desc&limit=50`,
      // no-store: cảnh báo mới bắn 5 phút trước phải hiện ra ngay, không đợi
      // cache hết hạn — cùng lý do với cron_runs ở trên.
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

/** Bản Digest Vận Hành gần nhất (S5) — hiện trên panel kể cả khi chưa đẩy được. */
async function latestOpsDigest(): Promise<unknown | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?event_type=eq.ops_digest&select=ts,meta&order=ts.desc&limit=1`,
      { headers: SB_HEADERS, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown[];
    return rows[0] || null;
  } catch {
    return null;
  }
}

/** Gọi một RPC trả bảng — best-effort, lỗi trả mảng rỗng (panel phụ không được
 *  làm sập trang Cron vốn đã chạy tốt từ trước). */
async function rpcSafe(fn: string, params: Record<string, unknown>): Promise<unknown[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: SB_HEADERS,
      body: JSON.stringify(params),
    });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

const toolHealth = (hours: number) => rpcSafe('tool_health', { p_hours: hours });

async function handleAdminCronTrigger(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);
  const job = String(body.job || '');
  const t = CRON_TRIGGERS[job];
  if (!t) return err('Unknown job', 400);

  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  try {
    let res: Response;
    if (t.path) {
      // Job Vercel: gọi chính endpoint prod với CRON_SECRET → tự log qua withCronLog.
      res = await fetch(`${SITE_URL}${t.path}`, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
    } else {
      // Edge fn (Supabase): gọi thẳng, log tay bên dưới.
      res = await fetch(`${SUPABASE_URL}/functions/v1/${t.edge}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET, Authorization: `Bearer ${SUPABASE_KEY}` },
        body: '{}',
      });
    }
    const data = await res.json().catch(() => ({}));
    if (t.edge) {
      await logCronRun({ job_key: job, source: 'edge', status: res.ok ? 'ok' : 'error', started_at: startedAt, finished_at: new Date().toISOString(), duration_ms: Date.now() - t0, note: 'manual · ' + (res.ok ? 'ok' : `HTTP ${res.status}`) });
    }
    return ok({ triggered: job, httpStatus: res.status, result: data });
  } catch (e: unknown) {
    if (t.edge) await logCronRun({ job_key: job, source: 'edge', status: 'error', started_at: startedAt, duration_ms: Date.now() - t0, note: 'manual · ' + String(e) });
    return err((e as Error).message);
  }
}

// ── GET: admin-channels (trạng thái kênh chat + push, Command Center S4) ──
// Đọc trực tiếp bảng generic chat_* (nguồn thật hiện tại — telegram_* cũ đã
// "mồ côi" từ migration-channels-multiplatform). Zalo chưa có adapter → hard-code.
const CHANNEL_PLATFORMS = ['telegram', 'messenger', 'whatsapp'] as const;

async function countExact(path: string): Promise<number> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { cache: 'no-store',
      headers: { ...SB_HEADERS, Prefer: 'count=exact' },
    });
    return parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10);
  } catch { return 0; }
}

async function handleAdminChannels(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  try {
    const [sessionsRes, linksRes, usageRes, webPush, nativeTotal, nativeEnabled] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?select=platform,chat_id,updated_at&limit=5000`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/chat_links?select=platform&limit=5000`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/chat_usage?select=platform,count,day&day=gte.${sevenDaysAgo}&limit=5000`, { cache: 'no-store', headers: SB_HEADERS }),
      countExact('push_subscriptions?select=id&limit=1'),
      countExact('push_tokens?select=token&limit=1'),
      countExact('push_tokens?select=token&enabled=eq.true&limit=1'),
    ]);
    const sessions = sessionsRes.ok ? await sessionsRes.json() : [];
    const links = linksRes.ok ? await linksRes.json() : [];
    const usage = usageRes.ok ? await usageRes.json() : [];

    type ChannelStat = { platform: string; configured: boolean; users: number; linked: number; msgs7d: number; lastActive: string | null };
    const channels: ChannelStat[] = CHANNEL_PLATFORMS.map((p) => {
      const rows = (sessions as { platform: string; chat_id: string; updated_at: string }[]).filter((r) => r.platform === p);
      const linked = (links as { platform: string }[]).filter((r) => r.platform === p).length;
      const msgs7d = (usage as { platform: string; count: number }[]).filter((r) => r.platform === p).reduce((s, r) => s + (r.count || 0), 0);
      const lastActive = rows.reduce<string | null>((max, r) => (!max || r.updated_at > max ? r.updated_at : max), null);
      const configured = p === 'telegram' ? !!process.env.TELEGRAM_BOT_TOKEN
        : p === 'messenger' ? !!process.env.MESSENGER_PAGE_ACCESS_TOKEN
        : !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TOKEN);
      return { platform: p, configured, users: rows.length, linked, msgs7d, lastActive };
    });
    channels.push({ platform: 'zalo', configured: false, users: 0, linked: 0, msgs7d: 0, lastActive: null });

    return ok({
      channels,
      push: { webSubscriptions: webPush, nativeTokensTotal: nativeTotal, nativeTokensEnabled: nativeEnabled },
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: admin-channel-broadcast (gửi tin thủ công tới toàn bộ user 1 kênh) ──
// Hiện chỉ hỗ trợ Telegram (Bot API gửi tự do). Messenger/WhatsApp cần
// template đã duyệt / trong cửa sổ 24h theo policy Meta → chưa làm.
async function handleAdminChannelBroadcast(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const platform = String(body.platform || '');
  const text = String(body.text || '').trim();
  if (!text) return err('Thiếu nội dung', 400);
  if (platform !== 'telegram') return err('Kênh này chưa hỗ trợ gửi broadcast', 400);
  if (!process.env.TELEGRAM_BOT_TOKEN) return err('Chưa cấu hình TELEGRAM_BOT_TOKEN', 400);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_sessions?platform=eq.telegram&select=chat_id&limit=5000`, { cache: 'no-store', headers: SB_HEADERS });
    const rows: { chat_id: string }[] = res.ok ? await res.json() : [];
    const chatIds = Array.from(new Set(rows.map((r) => r.chat_id)));

    let sentCount = 0, failed = 0;
    const BATCH = 20;
    for (let i = 0; i < chatIds.length; i += BATCH) {
      const batch = chatIds.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map((id) => tgSendMessage(id, text)));
      for (const r of results) { if (r.status === 'fulfilled') sentCount++; else failed++; }
    }
    return ok({ targeted: chatIds.length, sent: sentCount, failed });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: admin-nudge-user (M0.4, track Marketing Autopilot — nhắc 1 user sắp
// rời bỏ). Thao tác TAY, không tự động/cron: admin chọn user từ bảng "Sắp Rời
// Bỏ" (dashboard_at_risk), soạn/sửa nội dung ở client trước khi bấm gửi — nội
// dung không cố định cứng ở server, admin duyệt mỗi lần. Cooldown 24h/user
// (đọc lại events event_type=retention_nudge) né spam nếu bấm nhầm/lặp. ──
async function handleAdminNudgeUser(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const userId = String(body.userId || '').trim();
  const channel = String(body.channel || '').trim();
  const text = String(body.text || '').trim();
  if (!userId) return err('Thiếu userId', 400);
  if (channel !== 'telegram' && channel !== 'push') return err('Kênh không hợp lệ', 400);
  if (!text) return err('Thiếu nội dung', 400);

  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const cooldownRes = await fetch(
      `${SUPABASE_URL}/rest/v1/events?user_id=eq.${userId}&event_type=eq.retention_nudge&ts=gte.${since}&select=id&limit=1`,
      { cache: 'no-store', headers: SB_HEADERS },
    );
    const cooldownRows: unknown[] = cooldownRes.ok ? await cooldownRes.json() : [];
    if (cooldownRows.length) return err('Đã nhắc user này trong 24h qua — đợi thêm để tránh spam', 429);

    if (channel === 'telegram') {
      if (!process.env.TELEGRAM_BOT_TOKEN) return err('Chưa cấu hình TELEGRAM_BOT_TOKEN', 400);
      const linkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_links?platform=eq.telegram&user_id=eq.${userId}&select=external_id&limit=1`,
        { cache: 'no-store', headers: SB_HEADERS },
      );
      const linkRows: { external_id: string }[] = linkRes.ok ? await linkRes.json() : [];
      if (!linkRows.length) return err('User chưa liên kết Telegram', 400);
      await tgSendMessage(linkRows[0].external_id, text);
    } else {
      const FIREBASE_SA = process.env.FIREBASE_SERVICE_ACCOUNT || '';
      if (!FIREBASE_SA) return err('Chưa cấu hình FIREBASE_SERVICE_ACCOUNT', 400);
      const tokRes = await fetch(
        `${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${userId}&enabled=eq.true&select=token`,
        { cache: 'no-store', headers: SB_HEADERS },
      );
      const tokRows: { token: string }[] = tokRes.ok ? await tokRes.json() : [];
      if (!tokRows.length) return err('User chưa có thiết bị đăng ký nhận Push', 400);
      const sa = parseFirebaseServiceAccount(FIREBASE_SA);
      const result = await sendFcmPush(sa, tokRows.map((r) => r.token), 'Tử Vi Minh Bảo', text, { url: '/app', kind: 'retention' });
      if (result.dead.length) {
        await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=in.(${result.dead.map((t) => `"${t}"`).join(',')})`, {
          method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify({ enabled: false }),
        });
      }
      if (!result.sent) return err('Gửi Push thất bại (thiết bị có thể đã gỡ app)', 500);
    }

    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ event_type: 'retention_nudge', user_id: userId, meta: { channel, admin_email: admin.email } }),
    });

    return ok({ success: true });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-seo (kho seo_pages/laso_pregen + sức khỏe sitemap) ──
const SITEMAP_PATHS = ['/sitemap.xml', '/sitemap-hubs.xml', '/sitemap-pregen.xml', '/sitemap-ngay-tot.xml'];

async function handleAdminSeo(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const [statsRes, sitemaps] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_seo_stats`, { method: 'POST', headers: SB_HEADERS, body: '{}' }),
      Promise.all(SITEMAP_PATHS.map(async (path) => {
        const t0 = Date.now();
        try {
          const r = await fetch(`${SITE_URL}${path}`, { method: 'HEAD' });
          return { path, ok: r.ok, status: r.status, ms: Date.now() - t0 };
        } catch (e: unknown) {
          return { path, ok: false, status: 0, ms: Date.now() - t0, error: String(e) };
        }
      })),
    ]);
    if (!statsRes.ok) throw new Error(await statsRes.text());
    const stats = await statsRes.json();
    return ok({ stats, sitemaps });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── CONTENT BOARD / KHẢO LUẬN / NGHIÊN CỨU (Command Center S3) ──
// 3 pipeline nội dung tự động (cron viết → lưu → xuất bản ngay, KHÔNG có bước
// duyệt thủ công) + YouTube Studio (van_dap, có publish_status thật). "Board"
// ở đây phản ánh trạng thái THẬT của hàng đợi (topic_queue: pending/processing/
// done/error), không phải quy trình draft→review→scheduled bịa ra — 2 pipeline
// tự viết không có bước duyệt tay.
const MASTER_IDS_15 = ['huyen-khong', 'tu-nguyen', 'linh-son', 'dau-nam', 'ngoc-tinh', 'thien-an', 'thanh-hu', 'bac-minh', 'thai-hu', 'tam-kinh', 'co-nguyet', 'linh-co', 'nhat-nguyen', 'dieu-khong', 'tinh-quang'];

function parseTopicLines(text: string): string[] {
  return String(text || '')
    .split('\n')
    .map((l) => l.replace(/^["']|["']$/g, '').replace(/^\d+[.,]\s*/, '').trim())
    .filter((l) => l.length > 5 && !l.toLowerCase().startsWith('topic') && !l.toLowerCase().startsWith('chủ đề'));
}

async function queueCounts(typeFilter: string): Promise<Record<string, number>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/topic_queue?${typeFilter}&select=status&limit=5000`, { cache: 'no-store', headers: SB_HEADERS });
  const rows: { status: string }[] = res.ok ? await res.json() : [];
  const counts: Record<string, number> = { pending: 0, processing: 0, done: 0, error: 0 };
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
  return counts;
}

// ── GET: admin-content-board ──
async function handleAdminContentBoard(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const [khCounts, ncCounts, khRes, ncRes, ytRes] = await Promise.all([
      queueCounts('type=not.in.(master-article,tai-lieu)'),
      queueCounts('type=eq.master-article'),
      fetch(`${SUPABASE_URL}/rest/v1/khao_luan?select=slug,title,category,created_at&order=created_at.desc&limit=8`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/master_articles?select=slug,title,master_id,created_at&order=created_at.desc&limit=8`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/van_dap?publish_status=eq.published&select=id,title,chu_de,created_at&order=created_at.desc&limit=8`, { cache: 'no-store', headers: SB_HEADERS }),
    ]);
    const khItems = (khRes.ok ? await khRes.json() : []) as { slug: string; title: string; category: string; created_at: string }[];
    const ncItems = (ncRes.ok ? await ncRes.json() : []) as { slug: string; title: string; master_id: string; created_at: string }[];
    const ytItems = (ytRes.ok ? await ytRes.json() : []) as { id: string; title: string; chu_de: string; created_at: string }[];

    type BoardItem = { source: string; title: string; sub: string; createdAt: string; link: string | null };
    const recent: BoardItem[] = [
      ...khItems.map((i) => ({ source: 'khao-luan', title: i.title, sub: i.category, createdAt: i.created_at, link: `/kien-thuc/${i.slug}` })),
      ...ncItems.map((i) => ({ source: 'nghien-cuu', title: i.title, sub: i.master_id, createdAt: i.created_at, link: `/nghien-cuu/${i.slug}` })),
      ...ytItems.map((i) => ({ source: 'youtube', title: i.title, sub: i.chu_de, createdAt: i.created_at, link: null })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 20);

    return ok({
      pipelines: { khaoLuan: khCounts, nghienCuu: ncCounts },
      recent,
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-khao-luan ──
async function handleAdminKhaoLuan(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const [queueCountsRes, allRes, recentRes] = await Promise.all([
      queueCounts('type=not.in.(master-article,tai-lieu)'),
      fetch(`${SUPABASE_URL}/rest/v1/khao_luan?select=category,created_at&limit=2000`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/khao_luan?select=slug,title,category,master_id,created_at&order=created_at.desc&limit=40`, { cache: 'no-store', headers: SB_HEADERS }),
    ]);
    const all = (allRes.ok ? await allRes.json() : []) as { category: string; created_at: string }[];
    const recent = recentRes.ok ? await recentRes.json() : [];

    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const byCategory: Record<string, number> = {};
    let last7d = 0;
    for (const r of all) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      if (r.created_at > sevenDaysAgo) last7d++;
    }
    const categories = Object.entries(byCategory).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

    return ok({ total: all.length, last7d, categories, queue: queueCountsRes, recent });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: admin-khao-luan-topics (bulk add vào topic_queue, type='khao-luan') ──
async function handleAdminKhaoLuanTopics(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const topics = parseTopicLines(String(body.text || ''));
  if (!topics.length) return err('Không tìm thấy chủ đề hợp lệ (mỗi dòng 1 chủ đề, >5 ký tự)', 400);

  const rows = topics.map((topic) => ({ topic: topic.slice(0, 500), type: 'khao-luan', priority: 5, status: 'pending' }));
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/topic_queue`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(await res.text());
    return ok({ inserted: rows.length });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-nghien-cuu ──
async function handleAdminNghienCuu(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const [queueCountsRes, profilesRes, allRes, recentRes] = await Promise.all([
      queueCounts('type=eq.master-article'),
      fetch(`${SUPABASE_URL}/rest/v1/master_profiles?select=id,display_name,primary_article_type,specialty_topics&order=display_name.asc`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/master_articles?select=master_id,word_count,created_at&limit=2000`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/master_articles?select=slug,title,master_id,category,word_count,created_at&order=created_at.desc&limit=40`, { cache: 'no-store', headers: SB_HEADERS }),
    ]);
    const profiles = (profilesRes.ok ? await profilesRes.json() : []) as { id: string; display_name: string; primary_article_type: string; specialty_topics: string[] }[];
    const all = (allRes.ok ? await allRes.json() : []) as { master_id: string; word_count: number; created_at: string }[];
    const recent = recentRes.ok ? await recentRes.json() : [];

    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const byMaster: Record<string, number> = {};
    let last7d = 0, totalWords = 0;
    for (const r of all) {
      byMaster[r.master_id] = (byMaster[r.master_id] || 0) + 1;
      totalWords += r.word_count || 0;
      if (r.created_at > sevenDaysAgo) last7d++;
    }
    const authors = profiles.map((p) => ({ ...p, articleCount: byMaster[p.id] || 0 })).sort((a, b) => b.articleCount - a.articleCount);
    const avgWords = all.length ? Math.round(totalWords / all.length) : 0;

    return ok({ total: all.length, last7d, avgWords, authors, queue: queueCountsRes, recent });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: admin-nghien-cuu-topics (bulk add vào topic_queue, type='master-article') ──
async function handleAdminNghienCuuTopics(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const topics = parseTopicLines(String(body.text || ''));
  if (!topics.length) return err('Không tìm thấy chủ đề hợp lệ (mỗi dòng 1 chủ đề, >5 ký tự)', 400);
  const masterId = body.masterId ? String(body.masterId) : '';
  const articleType = body.articleType ? String(body.articleType) : 'hoc-thuat';

  const rows = topics.map((topic, i) => ({
    topic: topic.slice(0, 500),
    type: 'master-article',
    priority: 5,
    status: 'pending',
    master_id: masterId || MASTER_IDS_15[i % MASTER_IDS_15.length],
    article_type: articleType,
    subject_name: '',
  }));
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/topic_queue`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(await res.text());
    return ok({ inserted: rows.length });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── API & KEYS (Command Center) ────────────────────────────────
// MCP self-serve keys/usage (mcp_keys/mcp_usage — RLS chỉ service_role,
// KHÔNG có admin_read policy như app_config → phải qua route này, không
// đọc thẳng bằng sbGet) + trạng thái configured của provider/infra keys
// (chỉ trả boolean, KHÔNG BAO GIỜ trả giá trị thật của secret).
const ENV_KEY_GROUPS: { label: string; items: { key: string; label: string }[] }[] = [
  { label: 'AI Providers', items: [
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic (Claude — agent chat)' },
    { key: 'GEMINI_API_KEY', label: 'Google Gemini (route rời + backup)' },
    { key: 'OPENAI_API_KEY', label: 'OpenAI (embeddings RAG)' },
    { key: 'REPLICATE_API_KEY', label: 'Replicate (sinh/ghép ảnh)' },
  ]},
  { label: 'Thanh Toán', items: [
    { key: 'PAYPAL_CLIENT_ID', label: 'PayPal Client ID' },
    { key: 'PAYPAL_CLIENT_SECRET', label: 'PayPal Client Secret' },
    { key: 'PAYOS_CLIENT_ID', label: 'PayOS Client ID' },
    { key: 'PAYOS_API_KEY', label: 'PayOS API Key' },
    { key: 'PAYOS_CHECKSUM_KEY', label: 'PayOS Checksum Key' },
  ]},
  { label: 'Hạ Tầng', items: [
    { key: 'SUPABASE_URL', label: 'Supabase URL' },
    { key: 'SUPABASE_SERVICE_KEY', label: 'Supabase Service Key' },
    { key: 'CRON_SECRET', label: 'Cron Secret (bảo vệ /api/cron-*)' },
    { key: 'ADMIN_SECRET', label: 'Admin Secret' },
    { key: 'SIGNUP_SIGNAL_SALT', label: 'Signup Signal Salt (anti-fraud)' },
    { key: 'FIREBASE_SERVICE_ACCOUNT', label: 'Firebase (push notification)' },
  ]},
];

async function handleAdminEnvStatus(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const groups = ENV_KEY_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.map((it) => ({ key: it.key, label: it.label, configured: !!process.env[it.key] })),
  }));
  return ok({ groups });
}

// ── GET: admin-mcp (MCP self-serve keys + usage) ──
async function handleAdminMcp(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const [keysRes, usageRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/mcp_keys?select=key,tier,label,charts_allowed,backtest_years,future_years,active,created_at,user_id&order=created_at.desc&limit=500`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/mcp_usage?select=key,tool,created_at&order=created_at.desc&limit=5000`, { cache: 'no-store', headers: SB_HEADERS }),
    ]);
    if (!keysRes.ok) throw new Error(await keysRes.text());
    type McpKeyRow = { key: string; tier: string; label: string | null; charts_allowed: number; backtest_years: number; future_years: number; active: boolean; created_at: string; user_id: string | null };
    const keys = (await keysRes.json()) as McpKeyRow[];
    const usage = (usageRes.ok ? await usageRes.json() : []) as { key: string; tool: string; created_at: string }[];

    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const callsByKey: Record<string, number> = {};
    const toolCounts: Record<string, number> = {};
    let calls7d = 0;
    for (const u of usage) {
      callsByKey[u.key] = (callsByKey[u.key] || 0) + 1;
      toolCounts[u.tool] = (toolCounts[u.tool] || 0) + 1;
      if (u.created_at > sevenDaysAgo) calls7d++;
    }

    // Resolve user_id → email (chỉ user thật sự có key, thường ít — fetch từng
    // id thay vì loop hết auth users như handleAdminUsers, tránh tốn quota).
    const userIds = Array.from(new Set(keys.map((k) => k.user_id).filter((v): v is string => !!v)));
    const emailMap: Record<string, string> = {};
    await Promise.all(userIds.map(async (uid) => {
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, { cache: 'no-store',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        if (r.ok) { const u = await r.json(); if (u?.email) emailMap[uid] = u.email; }
      } catch { /* bỏ qua, hiện user_id thô */ }
    }));

    const maskKey = (k: string) => (k.length > 14 ? `${k.slice(0, 10)}…${k.slice(-4)}` : k);
    const keysOut = keys.map((k) => ({
      key: maskKey(k.key),
      rawKeyForAction: k.key, // cần nguyên vẹn để admin-mcp-update PATCH đúng dòng
      tier: k.tier,
      label: k.label,
      email: k.user_id ? (emailMap[k.user_id] || null) : null,
      chartsAllowed: k.charts_allowed,
      backtestYears: k.backtest_years,
      futureYears: k.future_years,
      active: k.active,
      createdAt: k.created_at,
      calls: callsByKey[k.key] || 0,
    }));

    return ok({
      stats: { totalKeys: keys.length, activeKeys: keys.filter((k) => k.active).length, totalCalls: usage.length, calls7d },
      keys: keysOut,
      toolCounts,
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: admin-mcp-update (đổi tier / khoá-mở key MCP) ──
async function handleAdminMcpUpdate(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized — admin only', 403);

  const key = String(body.key || '').trim();
  if (!key) return err('Missing key', 400);

  const row: Record<string, unknown> = {};
  if (body.tier != null) {
    const tier = String(body.tier);
    if (!['free', 'paid', 'master'].includes(tier)) return err('Invalid tier', 400);
    row.tier = tier;
  }
  if (body.active != null) row.active = !!body.active;
  if (Object.keys(row).length === 0) return err('Nothing to update', 400);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mcp_keys?key=eq.${encodeURIComponent(key)}`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(await res.text());
    return ok({ success: true });
  } catch (e: unknown) { return err((e as Error).message); }
}

export async function OPTIONS() { return options(); }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  if (action === 'balance')      return handleBalance(searchParams);
  if (action === 'check')        return handleCheck(searchParams);
  if (action === 'signup-bonus') return handleSignupBonus();
  if (action === 'admin-users')  return handleAdminUsers(request, searchParams);
  if (action === 'admin-users-list') return handleAdminUsersList(request);
  if (action === 'admin-login-attempts') return handleAdminLoginAttempts(request);
  if (action === 'admin-user-detail') return handleAdminUserDetail(request, searchParams);
  if (action === 'admin-marketing') return handleAdminMarketing(request, searchParams);
  if (action === 'admin-marketing-suggestions') return handleAdminMarketingSuggestions(request, searchParams);
  if (action === 'admin-dashboard-v2') return handleAdminDashboardV2(request);
  if (action === 'admin-autopilot-log') return handleAdminAutopilotLog(request);
  if (action === 'admin-cron-runs') return handleAdminCronRuns(request);
  if (action === 'admin-channels') return handleAdminChannels(request);
  if (action === 'admin-seo')      return handleAdminSeo(request);
  if (action === 'admin-content-board') return handleAdminContentBoard(request);
  if (action === 'admin-khao-luan') return handleAdminKhaoLuan(request);
  if (action === 'admin-nghien-cuu') return handleAdminNghienCuu(request);
  if (action === 'admin-mcp') return handleAdminMcp(request);
  if (action === 'admin-env-status') return handleAdminEnvStatus(request);
  if (action === 'my-referral') return handleMyReferral(request, searchParams);
  if (action === 'rail-status') return handleRailStatus(request, searchParams);
  if (action === 'signup-bonus') return handleSignupBonus();
  if (action === 'admin-viral') return handleAdminViral(request, searchParams);
  if (action === 'admin-tool-funnel') return handleAdminToolFunnel(request, searchParams);
  if (action === 'admin-content-catalog') return handleAdminContentCatalog(request, searchParams);
  if (action === 'admin-content-pack') return handleAdminContentPack(request, searchParams);
  if (action === 'admin-media-queue') return handleAdminMediaQueue(request, searchParams);
  if (action === 'admin-seeding') return handleAdminSeeding(request);
  if (action === 'check-bank')  return handleCheckBank(searchParams);
  return err('Invalid action.', 400);
}

// ── Quản trị viên (admin_users) — CHỈ owner mới xem/sửa được ─────
// v1: role owner = toàn quyền, member = gắn theo team (metadata, dùng để lọc
// sidebar phía client). Enforcement server-side theo team CHƯA làm ở đây —
// việc gắn từng action/RLS theo team là bước sau, khi thật sự có member
// không-owner cần giới hạn (xem trao đổi PR).
async function handleAdminUsersList(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);
  if (admin.role !== 'owner') return err('Chỉ Owner mới xem được danh sách quản trị viên', 403);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?select=email,display_name,team,role,active,invited_by,created_at&order=created_at.asc`,
    { cache: 'no-store', headers: SB_HEADERS }
  );
  if (!res.ok) return err('Lỗi tải danh sách', 500);
  return ok({ users: await res.json() });
}

// GET admin-login-attempts: audit log đăng nhập admin (owner-only — chứa
// email/IP thử đăng nhập, xem _patches/migration-admin-login-attempts.sql).
async function handleAdminLoginAttempts(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);
  if (admin.role !== 'owner') return err('Chỉ Owner mới xem được audit log đăng nhập', 403);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_login_attempts?select=email,ip,success,method,detail,created_at&order=created_at.desc&limit=200`,
    { cache: 'no-store', headers: SB_HEADERS }
  );
  if (!res.ok) return err('Lỗi tải audit log', 500);
  return ok({ attempts: await res.json() });
}

async function handleAdminUsersUpsert(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);
  if (admin.role !== 'owner') return err('Chỉ Owner mới thêm/sửa được quản trị viên', 403);

  const email = String(body.email || '').trim().toLowerCase();
  const displayName = String(body.display_name || '').trim() || null;
  const team = String(body.team || '').trim() || null;
  const role = body.role === 'owner' ? 'owner' : 'member';
  if (!email || !email.includes('@')) return err('Email không hợp lệ', 400);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_users`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ email, display_name: displayName, team, role, active: true, invited_by: admin.email }),
  });
  if (!res.ok) return err(`Lỗi lưu: ${await res.text()}`, 500);
  const rows = await res.json();
  return ok({ user: rows[0] });
}

async function handleAdminUsersSetActive(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);
  if (admin.role !== 'owner') return err('Chỉ Owner mới thay đổi được trạng thái', 403);

  const email = String(body.email || '').trim().toLowerCase();
  const active = !!body.active;
  if (!email) return err('Thiếu email', 400);
  if (!active && email === admin.email) return err('Không thể tự khoá chính mình', 400);

  if (!active) {
    // Chặn khoá owner CUỐI CÙNG — tránh khoá hết quyền quản trị.
    const r = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?role=eq.owner&active=eq.true&select=email`, { cache: 'no-store',
      headers: SB_HEADERS,
    });
    const owners = r.ok ? await r.json() : [];
    if (owners.length <= 1 && owners.some((o: { email: string }) => o.email === email)) {
      return err('Không thể khoá Owner cuối cùng', 400);
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: SB_HEADERS,
    body: JSON.stringify({ active }),
  });
  if (!res.ok) return err(`Lỗi cập nhật: ${await res.text()}`, 500);
  return ok({ ok: true });
}

// ── GET: admin-user-detail (hồ sơ đầy đủ 1 user cho drawer) ──────
async function handleAdminUserDetail(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);
  const userId = String(sp.get('userId') || '');
  if (!userId) return err('Missing userId', 400);
  const uid = encodeURIComponent(userId);

  try {
    const [txnRes, attrRes, evRes, credRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/credit_transactions?user_id=eq.${uid}&order=created_at.desc&limit=100&select=amount,type,description,slug,created_at`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/user_attribution?user_id=eq.${uid}&limit=1&select=*`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/events?user_id=eq.${uid}&order=ts.desc&limit=2000&select=event_type,tool_id,ts`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/user_credits?user_id=eq.${uid}&limit=1&select=balance,referral_code`, { cache: 'no-store', headers: SB_HEADERS }),
    ]);

    const transactions = txnRes.ok ? await txnRes.json() : [];
    const attribution = attrRes.ok ? (await attrRes.json())[0] || null : null;
    const events = evRes.ok ? await evRes.json() : [];
    const cred = credRes.ok ? (await credRes.json())[0] || null : null;

    // Tổng hợp tiền/Lượng.
    let spent = 0, toppedUp = 0;
    for (const t of transactions as { amount: number }[]) {
      if (t.amount < 0) spent += -t.amount; else if ((t as any).type === 'topup') toppedUp += t.amount;
    }

    // Tổng hợp hoạt động từ events.
    const byType: Record<string, number> = {};
    const toolTally: Record<string, number> = {};
    let lastActive: string | null = null;
    for (const e of events as { event_type: string; tool_id?: string; ts: string }[]) {
      byType[e.event_type] = (byType[e.event_type] || 0) + 1;
      if (e.tool_id && (e.event_type === 'tool_run' || e.event_type === 'tool_open')) {
        toolTally[e.tool_id] = (toolTally[e.tool_id] || 0) + 1;
      }
      if (!lastActive) lastActive = e.ts;
    }
    const topTools = Object.entries(toolTally).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([tool_id, count]) => ({ tool_id, count }));

    return ok({
      balance: cred?.balance ?? 0,
      referral_code: cred?.referral_code ?? null,
      attribution,
      transactions,
      totals: { spent, topped_up: toppedUp, events: events.length },
      activity: { by_type: byType, top_tools: topTools, last_active: lastActive },
    });
  } catch (e: unknown) { return err((e as Error).message); }
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

  // Cohort dùng tham số số TUẦN (không theo from/to) — số tuần suy từ khoảng ngày,
  // kẹp 4..16 để bảng không quá rộng.
  const cohortWeeks = Math.min(16, Math.max(4, Math.ceil((toExcl.getTime() - from.getTime()) / (7 * 864e5))));
  const callCohorts = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/marketing_cohorts`, {
      method: 'POST', headers: SB_HEADERS, body: JSON.stringify({ p_weeks: cohortWeeks }),
    });
    if (!res.ok) throw new Error(`marketing_cohorts: ${await res.text()}`);
    return res.json();
  };

  try {
    const [funnel, sources, acquisition, campaigns, traffic, revenue, cohorts, ga4, trafficQuality] =
      await Promise.all([
        callRpc('marketing_funnel'),
        callRpc('marketing_sources'),
        callRpc('marketing_acquisition'),
        callRpc('marketing_campaigns'),
        callRpc('marketing_traffic'),
        callRpc('marketing_revenue'),
        callCohorts(),
        getGa4Breakdown(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)),
        // Phân loại chất lượng lưu lượng — CÙNG RPC mà CMO digest đã dùng, cố ý
        // KHÔNG viết một phép đếm "khách thật" thứ hai ở đây: `traffic_quality`
        // đã định nghĩa `engaged` và digest đang luận trên đó, hai định nghĩa
        // song song thì sớm muộn cũng trôi khỏi nhau (bệnh đã trả giá ở #409).
        //
        // best-effort như GA4: đây là LỚP CHỒNG LÊN phễu, hỏng thì mất một dòng
        // chú thích chứ không được kéo sập cả trang Marketing.
        callRpc('traffic_quality').catch((e) => {
          console.warn('[admin-marketing] traffic_quality lỗi:', (e as Error).message);
          return null;
        }),
      ]);
    // GA4 sessions THẬT thay 'visitors' nội bộ (page_view) khi đã cấu hình env —
    // nội bộ chỉ thấy traffic chạm track.js, thiếu organic/ads/social GA4 đo được.
    // `internalVisitors` giữ lại số nội bộ để panel GA4 so hai bên (chênh lệch
    // chính là phần track.js đo hụt).
    const internalVisitors = funnel.visitors;
    if (ga4?.sessions != null) {
      funnel.visitors = ga4.sessions;
      funnel.visitorsSource = 'ga4';
    } else {
      funnel.visitorsSource = 'internal';
    }
    return ok({
      funnel, sources, acquisition, campaigns, traffic, revenue, cohorts, cohortWeeks,
      trafficQuality,
      ga4: ga4 ? { ...ga4, internalVisitors } : null,
      from: from.toISOString(), to: to.toISOString(),
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-viral (V2.4 — panel "Vòng Lặp Viral") ─────────────
// Phễu gen → chia sẻ → người mở link → bấm CTA → đăng ký qua mã giới thiệu,
// kèm K-factor từng tool + chi phí/user đăng ký. CÙNG khoảng ngày trang
// Marketing đang xem (client truyền from/to y hệt admin-marketing).
async function handleAdminViral(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const to = sp.get('to') ? new Date(sp.get('to') as string) : new Date();
  const from = sp.get('from') ? new Date(sp.get('from') as string) : new Date(Date.now() - 30 * 864e5);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return err('Invalid date range', 400);
  const toExcl = new Date(to.getTime() + 864e5);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/viral_loop_funnel`, {
      method: 'POST', headers: SB_HEADERS,
      body: JSON.stringify({ p_from: from.toISOString(), p_to: toExcl.toISOString() }),
    });
    if (!res.ok) throw new Error(`viral_loop_funnel: ${await res.text()}`);
    return ok({ viral: await res.json(), from: from.toISOString(), to: to.toISOString() });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-content-catalog (Kho Nội Dung) ────────────────────
// Gom 6 bảng nội dung (khảo luận · nghiên cứu · video hỏi-đáp · từ điển · tài
// liệu · sách) về MỘT bảng đọc, kèm cột "đã ra kênh nào".
//
// CHỈ ĐỌC — không có đường ghi ngược về 6 bảng nguồn. Sửa nội dung vẫn ở trang
// Sản Xuất của từng pipeline; kho này để NHÌN, và để thấy phần lớn kho chưa
// từng ra khỏi website.
//
// Action RIÊNG (không nhét vào `admin-marketing`) theo đúng tiền lệ
// `admin-viral`/`admin-tool-funnel`: chỗ đó đã gánh 8 RPC + một lượt GA4.
async function handleAdminContentCatalog(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const limit = Math.min(Math.max(Number(sp.get('limit') || 50) || 50, 1), 200);
  const offset = Math.max(Number(sp.get('offset') || 0) || 0, 0);

  const rpc = async (fn: string, body: unknown) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: SB_HEADERS, body: JSON.stringify(body), cache: 'no-store',
    });
    if (!r.ok) throw new Error(`${fn}: ${await r.text()}`);
    return r.json();
  };

  try {
    const [stats, list] = await Promise.all([
      rpc('content_catalog_stats', {}),
      rpc('content_catalog_list', {
        p_kind: sp.get('kind') || null,
        p_channel: sp.get('channel') || null,
        p_status: sp.get('status') || null,
        p_q: sp.get('q') || null,
        p_limit: limit,
        p_offset: offset,
      }),
    ]);
    return ok({ stats, list, limit, offset });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-tool-funnel (D1 — panel "Phễu Theo Tool") ─────────
// Trả lời đúng một câu hỏi: TOOL NÀO CÓ NGƯỜI XEM MÀ KHÔNG AI MUA.
//
// CỐ Ý là action RIÊNG chứ không nhét vào `admin-marketing`: chỗ đó đã gánh 8
// RPC + một lượt GA4, thêm nữa là mỗi lần mở trang Marketing lại chậm thêm cho
// một panel không phải ai cũng đọc. Cùng tiền lệ với `admin-viral`.
async function handleAdminToolFunnel(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const to = sp.get('to') ? new Date(sp.get('to') as string) : new Date();
  const from = sp.get('from') ? new Date(sp.get('from') as string) : new Date(Date.now() - 30 * 864e5);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return err('Invalid date range', 400);
  const toExcl = new Date(to.getTime() + 864e5);
  const body = JSON.stringify({ p_from: from.toISOString(), p_to: toExcl.toISOString() });

  const rpc = async (fn: string) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: SB_HEADERS, body });
    if (!r.ok) throw new Error(`${fn}: ${await r.text()}`);
    return r.json();
  };

  try {
    const [rows, lac] = await Promise.all([rpc('tool_funnel'), rpc('tool_funnel_lac')]);
    return ok({ rows, lac, from: from.toISOString(), to: to.toISOString() });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-marketing-suggestions (M0.5, track Marketing Autopilot — đề
// xuất content/campaign ADVISORY). Sinh ON-DEMAND (nút trong dashboard
// Marketing), CÙNG khoảng ngày admin đang xem — không cron, không tự chạy gì. ──
async function handleAdminMarketingSuggestions(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const to = sp.get('to') ? new Date(sp.get('to') as string) : new Date();
  const from = sp.get('from') ? new Date(sp.get('from') as string) : new Date(Date.now() - 30 * 864e5);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return err('Invalid date range', 400);
  const toExcl = new Date(to.getTime() + 864e5);

  try {
    const text = await generateContentSuggestions(from.toISOString(), toExcl.toISOString());
    return ok({ text });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-content-pack (V4, track Viral Loop) — kịch bản TikTok soạn
// sẵn cho các bản chân dung đã được chia sẻ công khai. CÙNG hàm mà cron tuần
// dùng, chỉ khác là bấm lúc nào ra lúc đó: cron gửi Telegram sáng Chủ Nhật,
// lỡ tin thì phải đợi tuần sau — nút này gỡ đúng chỗ kẹt đó. THUẦN SOẠN,
// không đăng đi đâu. ──
async function handleAdminContentPack(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const days = Math.min(90, Math.max(1, Number(sp.get('days')) || 7));
  try {
    const text = await generateContentPackText(days);
    return ok({ text, days });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-media-queue (M2+M3, track Media Pipeline) — NHẬT KÝ bài đăng
// mạng xã hội. Khâu duyệt tay đã bỏ (Henry chốt: dựng xong đăng luôn), nên
// panel này giờ là chỗ THEO DÕI chứ không phải chỗ phê duyệt: xem bài nào đã
// lên, bài nào lỗi, và đăng lại được bài lỗi. Vẫn đọc kèm asset để nhìn thấy
// ảnh thật đã đi ra ngoài, không phải đoán qua caption. ──
async function handleAdminMediaQueue(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const status = (sp.get('status') || '').trim();
  const statusFilter = /^[a-z]+$/.test(status) ? `&status=eq.${status}` : '';
  try {
    const [rowsRes, cfgRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/media_posts?select=id,created_at,channel,caption,hashtags,link_url,status,published_at,external_url,error,media_assets(url,width,height,source_type,meta)${statusFilter}&order=created_at.desc&limit=60`,
        { headers: SB_HEADERS, cache: 'no-store' },
      ),
      fetch(`${SUPABASE_URL}/rest/v1/app_config?key=like.social.*&select=key,value`, {
        headers: SB_HEADERS,
        cache: 'no-store',
      }),
    ]);
    const rows = rowsRes.ok ? await rowsRes.json() : [];
    const cfgRows: { key: string; value: unknown }[] = cfgRes.ok ? await cfgRes.json() : [];
    const cfg: Record<string, unknown> = {};
    for (const r of cfgRows) cfg[r.key] = r.value;

    return ok({
      posts: rows,
      autopostEnabled: cfg['social.autopost_enabled'] === true,
      channels: cfg['social.channels'] || [],
      buildDaily: cfg['social.build_daily'] ?? 0,
      publishDaily: cfg['social.publish_daily'] ?? 0,
      // Kênh được cấu hình mà chưa có adapter thì bài sẽ nằm lại mãi — nói ra ở
      // đây để lỗi cấu hình lộ ngay trên panel thay vì im lặng trong DB.
      supportedChannels: SUPPORTED_CHANNELS,
    });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// ── POST: admin-media-decide (M3) — thao tác VẬN HÀNH trên một bài, KHÔNG
// phải phê duyệt. Khâu duyệt đã bỏ; hai lối ra còn lại đều là để xử lý bài đã
// hỏng: `retry` xếp lại hàng cho lượt cron sau đăng lại, `skip` dừng hẳn để nó
// thôi chiếm chỗ. CỐ Ý vẫn KHÔNG có "đăng ngay" — đăng là việc của cron, một
// cú bấm nhầm không được phép tự nó đẩy bài lên trang công khai. ──
async function handleAdminMediaDecide(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const postId = String(body.postId || '').trim();
  const decision = String(body.decision || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return err('postId không hợp lệ', 400);
  if (decision !== 'retry' && decision !== 'skip') return err('decision phải là retry hoặc skip', 400);

  const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
  const patch: Record<string, unknown> = {
    status: decision === 'retry' ? 'queued' : 'skipped',
    updated_at: new Date().toISOString(),
  };
  // Sửa caption rồi đăng lại — thường là cách nhanh nhất chữa một bài lỗi vì
  // nội dung, nhanh hơn bỏ đi rồi chờ cron viết bản khác hôm sau.
  if (caption) patch.caption = caption;
  // Xếp lại hàng thì xoá dấu lỗi cũ, nếu không panel vẫn đỏ dù bài đã lên.
  if (decision === 'retry') patch.error = null;

  try {
    // KHÔNG đụng được bài đã lên (`live`) hay đang đăng dở (`publishing`):
    // đăng lại một bài đã live là đăng trùng lên trang công khai.
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/media_posts?id=eq.${postId}&status=in.(queued,approved,error,skipped)`,
      {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) return err(await res.text());
    const rows = (await res.json()) as unknown[];
    if (!rows.length) return err('Không tìm thấy bài đang chờ/lỗi với id đó (bài đã đăng thì không sửa được)', 404);
    return ok({ updated: true, status: patch.status });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// ── GET: admin-seeding — trợ lý seeding group. Trả danh sách group (kèm nhịp
// + mốc lần dán gần nhất) và các bài ĐÃ SOẠN đang chờ người dán.
//
// KHÔNG có action nào đăng bài ở đây, và đó là chủ đích chứ không phải thiếu:
// Meta gỡ Groups API khỏi mọi phiên bản từ 22/04/2024 nên không còn đường hợp
// lệ để máy đăng vào group. Panel này rút việc xuống còn Copy → Mở group →
// dán. Xem đầu `lib/media/seeding.ts`. ──
async function handleAdminSeeding(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const [groupsRes, draftsRes, cfgRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/seeding_groups?select=id,name,url,platform,topic,angle,every_days,enabled,member_count,notes,last_posted_at&order=enabled.desc,last_posted_at.asc.nullsfirst&limit=200`,
        { headers: SB_HEADERS, cache: 'no-store' },
      ),
      // Bài chờ dán lên trước; phần đã xử lý giữ lại một ít làm nhật ký.
      fetch(
        `${SUPABASE_URL}/rest/v1/seeding_drafts?select=id,created_at,group_id,source_type,title,quote,caption,hashtags,link_url,image_url,status,posted_at&order=status.asc,created_at.desc&limit=80`,
        { headers: SB_HEADERS, cache: 'no-store' },
      ),
      fetch(`${SUPABASE_URL}/rest/v1/app_config?key=eq.seeding.daily_cap&select=key,value`, {
        headers: SB_HEADERS,
        cache: 'no-store',
      }),
    ]);
    const groups = groupsRes.ok ? await groupsRes.json() : [];
    const drafts = draftsRes.ok ? await draftsRes.json() : [];
    const cfgRows: { key: string; value: unknown }[] = cfgRes.ok ? await cfgRes.json() : [];

    return ok({ groups, drafts, dailyCap: cfgRows[0]?.value ?? 5 });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// ── POST: admin-seeding-group — thêm/sửa/xoá một group trong sổ seeding. ──
async function handleAdminSeedingGroup(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const op = String(body.op || 'save').trim();
  const id = String(body.id || '').trim();
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return err('id không hợp lệ', 400);

  try {
    if (op === 'delete') {
      if (!id) return err('Thiếu id', 400);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/seeding_groups?id=eq.${id}`, {
        method: 'DELETE',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      });
      if (!res.ok) return err(await res.text());
      return ok({ deleted: true });
    }

    const name = String(body.name || '').trim();
    const url = String(body.url || '').trim();
    if (!name) return err('Thiếu tên group', 400);
    // Chỉ nhận URL http(s) — ô này đổ thẳng vào thẻ <a target="_blank">, nhận
    // chuỗi tự do là mở cửa cho `javascript:` chạy trong trang admin.
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return err('URL group phải bắt đầu bằng http:// hoặc https://', 400);

    const everyRaw = Number(body.everyDays);
    // Kẹp trùng đúng ràng buộc CHECK dưới DB để lỗi hiện thành câu tiếng Việt
    // thay vì một thông điệp Postgres thô.
    const everyDays = Number.isFinite(everyRaw) ? Math.min(60, Math.max(1, Math.round(everyRaw))) : 7;
    const memberRaw = Number(body.memberCount);

    const row: Record<string, unknown> = {
      name,
      url,
      platform: String(body.platform || 'facebook').trim() || 'facebook',
      topic: String(body.topic || '').trim() || null,
      angle: String(body.angle || '').trim() || null,
      every_days: everyDays,
      enabled: body.enabled !== false,
      member_count: Number.isFinite(memberRaw) && memberRaw > 0 ? Math.round(memberRaw) : null,
      notes: String(body.notes || '').trim() || null,
      updated_at: new Date().toISOString(),
    };

    const res = id
      ? await fetch(`${SUPABASE_URL}/rest/v1/seeding_groups?id=eq.${id}`, {
          method: 'PATCH',
          headers: { ...SB_HEADERS, Prefer: 'return=representation' },
          body: JSON.stringify(row),
        })
      : await fetch(`${SUPABASE_URL}/rest/v1/seeding_groups`, {
          method: 'POST',
          headers: { ...SB_HEADERS, Prefer: 'return=representation' },
          body: JSON.stringify(row),
        });
    if (!res.ok) {
      const t = await res.text();
      if (t.includes('seeding_groups_url_uniq')) return err('Group này đã có trong sổ rồi', 409);
      return err(t);
    }
    const rows = (await res.json()) as unknown[];
    if (!rows.length) return err('Không tìm thấy group với id đó', 404);
    return ok({ saved: true });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// ── POST: admin-seeding-draft — chốt số phận một bài đã soạn.
//
// `posted` = người thật đã dán bài vào group → đây MỚI là lúc đặt
// `last_posted_at` cho group, vì nhịp seeding đo bằng bài thực sự ra ngoài chứ
// không phải bài máy soạn ra. Bấm nhầm thì chỉ trượt một nhịp, không có gì lên
// mạng ngoài ý muốn — panel này không có đường nào đăng được cả. ──
async function handleAdminSeedingDraft(request: NextRequest, body: Record<string, unknown>): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const draftId = String(body.draftId || '').trim();
  const decision = String(body.decision || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return err('draftId không hợp lệ', 400);
  if (decision !== 'posted' && decision !== 'skip') return err('decision phải là posted hoặc skip', 400);

  const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: decision === 'posted' ? 'posted' : 'skipped',
    updated_at: nowIso,
  };
  if (decision === 'posted') patch.posted_at = nowIso;
  // Giữ lại bản chữ đã sửa tay: lần sau đọc nhật ký mới biết cái gì thật sự
  // được dán, chứ không phải bản LLM viết ra.
  if (caption) patch.caption = caption;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/seeding_drafts?id=eq.${draftId}&status=eq.ready`, {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return err(await res.text());
    const rows = (await res.json()) as { group_id?: string }[];
    if (!rows.length) return err('Không tìm thấy bài đang chờ với id đó (có thể đã xử lý rồi)', 404);

    if (decision === 'posted' && rows[0].group_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/seeding_groups?id=eq.${rows[0].group_id}`, {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ last_posted_at: nowIso, updated_at: nowIso }),
      });
    }
    return ok({ updated: true, status: patch.status });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// ── GET: admin-autopilot-log (M0.6, track Marketing Autopilot) — nhật ký
// hành động autopilot (shadow/live) + trạng thái cấu hình hiện tại. THUẦN
// ĐỌC — không có action bật/tắt qua API này có chủ đích (rủi ro cao, Henry
// tự bật qua app_config/SQL, tránh bấm nhầm 1 click trên UI). ──
async function handleAdminAutopilotLog(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  try {
    const cfgKeys = ['marketing.autopilot_enabled', 'marketing.autopilot_price_bounds', 'marketing.autopilot_promo', 'marketing.autopilot_segment_nudge'];
    const [actionsRes, cfgRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/autopilot_actions?select=id,ts,action_type,mode,target,before,after,reason,meta&order=ts.desc&limit=100`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/app_config?key=in.(${cfgKeys.map((k) => `"${k}"`).join(',')})&select=key,value`, { cache: 'no-store', headers: SB_HEADERS }),
    ]);
    const actions = actionsRes.ok ? await actionsRes.json() : [];
    const cfgRows: { key: string; value: unknown }[] = cfgRes.ok ? await cfgRes.json() : [];
    const cfgMap: Record<string, unknown> = {};
    for (const row of cfgRows) cfgMap[row.key] = row.value;

    return ok({
      enabled: cfgMap['marketing.autopilot_enabled'] === true,
      config: {
        priceBounds: cfgMap['marketing.autopilot_price_bounds'] || {},
        promo: cfgMap['marketing.autopilot_promo'] || { budgetCreditsPerRun: 0 },
        segmentNudge: cfgMap['marketing.autopilot_segment_nudge'] || { enabledBudgetPerRun: 0 },
      },
      actions,
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: admin-dashboard-v2 (Engagement + Content Revenue + At-risk + Content Production) ──
// Đọc 3 RPC mới (dashboard_engagement/dashboard_content_revenue/dashboard_at_risk,
// migration-dashboard-v2.sql) + đếm nhanh 3 pipeline nội dung (count=exact, không
// tải nguyên bảng — khác handleAdminContentBoard vốn tải hàng để dựng "recent").
async function handleAdminDashboardV2(request: NextRequest): Promise<Response> {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const admin = await verifyAdmin(token);
  if (!admin) return err('Unauthorized', 403);

  const to = new Date();
  const from = new Date(Date.now() - 30 * 864e5);
  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const callRpc = async (fn: string, params: Record<string, unknown>) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: SB_HEADERS, body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`${fn}: ${await res.text()}`);
    return res.json();
  };

  try {
    const [engagement, contentRevenue, atRisk, khTotal, kh7d, ncTotal, nc7d, ytTotal, yt7d, channelHealth, margin] = await Promise.all([
      callRpc('dashboard_engagement', { p_days: 30 }),
      callRpc('dashboard_content_revenue', { p_from: from.toISOString(), p_to: to.toISOString() }),
      callRpc('dashboard_at_risk', { p_idle_days: 14, p_min_events: 3, p_limit: 20 }),
      countExact('khao_luan?select=slug&limit=1'),
      countExact(`khao_luan?select=slug&limit=1&created_at=gte.${sevenDaysAgo}`),
      countExact('master_articles?select=slug&limit=1'),
      countExact(`master_articles?select=slug&limit=1&created_at=gte.${sevenDaysAgo}`),
      countExact('van_dap?select=id&limit=1&publish_status=eq.published'),
      countExact(`van_dap?select=id&limit=1&publish_status=eq.published&created_at=gte.${sevenDaysAgo}`),
      callRpc('channel_error_rate', { p_hours: 24 }),
      callRpc('dashboard_margin', { p_from: from.toISOString(), p_to: to.toISOString() }),
    ]);

    return ok({
      engagement,
      contentRevenue,
      atRisk,
      channelHealth,
      margin,
      content: {
        khaoLuan:  { total: khTotal, last7d: kh7d },
        nghienCuu: { total: ncTotal, last7d: nc7d },
        youtube:   { total: ytTotal, last7d: yt7d },
      },
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── GET: my-referral (mã giới thiệu + tiến độ của CHÍNH mình) ────
// Headers: Authorization: Bearer <user_token>. shell.js gọi để gắn ?ref=<mã>
// vào link chia sẻ. CỐ Ý là endpoint có auth chứ không nhét referral_code vào
// `action=balance` (endpoint đó nhận userId qua query, không xác thực — thêm mã
// vào đó là phát mã của người khác cho bất kỳ ai đoán được userId).
/**
 * GET ?action=rail-status — trạng thái ví cho ĐỒNG HỒ ĐẾM CÂU của rail chat.
 *
 * Vì sao cần một endpoint riêng: rail muốn hiện "còn N câu hỏi" NGAY khi mở,
 * trước khi người dùng hỏi câu nào — mà để tính N thì cần cả số dư, giá một lượt
 * rail, và số lượt tặng. Ba thứ đó nằm ở ba nơi (`user_credits`, `tool_pricing`,
 * RPC `rail_free_*`). Không có endpoint này thì `shell.js` phải nhúng anon key
 * để đọc `tool_pricing`, hoặc tự viết cứng giá — mà viết cứng giá là nói sai với
 * người dùng ngay lần đổi giá đầu tiên (đúng lỗi đã xảy ra ở topup.html: FAQ ghi
 * 5 Lượng khi DB là 10).
 *
 * Trả kèm `lasoPrice` để tường hết-Lượng nói được bằng LÁ SỐ ("xem trọn 24 mục
 * — 25 Lượng") thay vì "nạp Lượng" chung chung.
 */
async function handleRailStatus(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const userToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  // KHÁCH CHƯA ĐĂNG NHẬP: trả số câu DÙNG THỬ còn lại thay vì 401, để đồng hồ
  // rail hiện được ngay trước câu hỏi đầu tiên. Chỉ ĐỌC, không tiêu lượt nào.
  // Không cần auth vì `anon_id` do client tự khai và chẳng mở ra quyền gì —
  // biết được số câu thử của một anon_id lạ không giúp làm gì cả.
  if (!userToken) {
    const anonId = String(sp.get('anon') || '').slice(0, 64);
    const t = await anonTrialStatus(anonId);
    return ok({
      anon: true,
      anonTrialLeft: t.left,
      anonTrialCap: t.cap,
      railPrice: await getToolPrice('rail-message'),
      lasoPrice: await getToolPrice('laso'),
      vndPerCredit: await vndPerCredit(),
    });
  }
  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid token', 401);
    // KHÔNG đặt tên biến trùng `vndPerCredit`: const trong cùng scope che luôn
    // hàm import, nên chính lượt gọi ở dòng dưới rơi vào TDZ.
    const [balance, railPrice, lasoPrice, freeTurns, vndRate] = await Promise.all([
      getBalance(user.id),
      getToolPrice('rail-message'),
      getToolPrice('laso'),
      railFreeRemaining(user.id),
      vndPerCredit(),
    ]);
    return ok({
      balance,
      railPrice: railPrice != null ? railPrice : null,
      lasoPrice: lasoPrice != null ? lasoPrice : null,
      freeTurns,
      vndPerCredit: vndRate,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'rail-status failed', 500);
  }
}

async function handleMyReferral(request: NextRequest, sp: URLSearchParams): Promise<Response> {
  const userToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!userToken) return err('Missing Authorization token', 401);
  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid token', 401);
    const uid = encodeURIComponent(user.id);
    // `tool` (tuỳ chọn) — cho widget "mời bạn" tự tính được "còn thiếu bao nhiêu
    // Lượng / cần mời mấy người" trong MỘT lượt mạng, thay vì bắt trang tự đi
    // hỏi giá + số dư ở hai nơi khác nhau (và phải nhúng anon key để đọc
    // tool_pricing).
    const tool = String(sp.get('tool') || '').slice(0, 60);
    const [credRes, refRes, reward, cap, toolPrice] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/user_credits?user_id=eq.${uid}&limit=1&select=referral_code,balance`, { cache: 'no-store', headers: SB_HEADERS }),
      fetch(`${SUPABASE_URL}/rest/v1/referrals?referrer_user_id=eq.${uid}&select=status,signup_rewarded_at,credits_to_referrer`, { cache: 'no-store', headers: SB_HEADERS }),
      getConfigValue<number>('referral.signup_bonus_referrer', 10),
      getConfigValue<number>('referral.signup_reward_cap', 20),
      tool ? getToolPrice(tool) : Promise.resolve(null),
    ]);
    const cred = credRes.ok ? (await credRes.json())[0] || null : null;
    const refs: { status?: string; signup_rewarded_at?: string | null; credits_to_referrer?: number }[] =
      refRes.ok ? await refRes.json() : [];
    // Trần thưởng đếm theo CỬA SỔ 30 NGÀY (khớp process_referral_signup) — lấy
    // tổng mọi thời sẽ báo "hết lượt mời" cho người thật ra vẫn còn.
    const since = Date.now() - 30 * 864e5;
    const rewardedRecent = refs.filter(
      (r) => r.signup_rewarded_at && Date.parse(r.signup_rewarded_at) >= since,
    ).length;
    return ok({
      code: cred?.referral_code ?? null,
      balance: cred?.balance ?? 0,
      invited: refs.length,
      rewarded: refs.filter((r) => !!r.signup_rewarded_at).length,
      rewardedRecent,
      creditsEarned: refs.reduce((s, r) => s + (r.credits_to_referrer || 0), 0),
      rewardPerInvite: Number(reward) || 0,
      cap: Number(cap) || 0,
      toolPrice,
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

// ── POST: onboarding-sync (M3) ─────────────────────────────────
// Headers: Authorization: Bearer <user_token>. Trả trạng thái 3 nhiệm vụ và
// CỘNG NGAY phần vừa hoàn thành (xem lib/onboarding/tasks.ts).
//
// Vì sao POST chứ không GET: lượt gọi này CÓ tác dụng phụ — nó cộng Lượng vào
// ví. Để ở GET là mời trình duyệt/CDN prefetch nó, mà prefetch một endpoint
// phát tiền là loại lỗi rất khó nhìn ra.
//
// Vì sao BẮT BUỘC auth: phần thưởng gắn vào một tài khoản cụ thể; nhận `userId`
// qua body như `action=balance` đang làm là để bất kỳ ai đoán được id cũng kích
// được lượt cộng Lượng cho người khác.
//
// Trả kèm `balance` để trang cập nhật số dư trong CÙNG một lượt mạng thay vì
// phải hỏi `action=balance` ngay sau đó.
async function handleOnboardingSync(request: NextRequest): Promise<Response> {
  const userToken = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!userToken) return err('Missing Authorization token', 401);
  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid token', 401);
    const state = await syncOnboardingTasks(user.id);
    return ok({ ...state, balance: await getBalance(user.id) });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'onboarding-sync failed', 500);
  }
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
  // Nguồn của mã (referral.js đọc từ utm_campaign/utm_source của link chia sẻ) —
  // chỉ dùng để gắn nhãn event, KHÔNG ảnh hưởng việc thưởng.
  const srcTool = String(body.srcTool || '').slice(0, 60) || null;
  const srcSource = String(body.srcSource || '').slice(0, 60) || null;

  try {
    const user = await getUserFromToken(userToken);
    if (!user) return err('Invalid token', 401);

    // Chỉ ghi nhận giới thiệu cho TÀI KHOẢN MỚI. Trước đây không có chốt này:
    // một người đã có tài khoản chỉ cần mở link ?ref= của bạn là referrer được
    // thưởng ngay — vô hại khi chưa ai chia sẻ, nhưng V2.1 vừa gắn ?ref= vào
    // MỌI link chia sẻ nên đó thành đường farm rẻ nhất. 24h đủ rộng cho luồng
    // thật (đáp trang → đăng ký → SIGNED_IN, tính bằng giây).
    const createdMs = user.created_at ? Date.parse(user.created_at) : NaN;
    if (Number.isFinite(createdMs) && Date.now() - createdMs > REFERRAL_NEW_ACCOUNT_MS) {
      return ok({ success: false, settled: true, skipped: 'existing_account',
        message: 'Mã giới thiệu chỉ áp dụng cho tài khoản đăng ký mới.' });
    }

    // Lookup referrer by code
    const lookupRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_credits?referral_code=eq.${encodeURIComponent(refCode)}&select=user_id&limit=1`,
      { cache: 'no-store', headers: SB_HEADERS }
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
    let rewarded = false, creditsGranted = 0;
    try {
      const r = (await rpc('process_referral_signup', { p_referee_user_id: user.id })) as unknown;
      const first = Array.isArray(r) ? (r[0] as Record<string, unknown> | undefined) : null;
      rewarded = first?.rewarded === true;
      creditsGranted = Number(first?.credits_granted) || 0;
    } catch { /* best-effort */ }

    // Mắt xích cuối của vòng lặp viral (V2.4): mã ĐÃ ăn. tool_id = tool của link
    // chia sẻ đưa người này tới → panel Vòng Lặp Viral tính được K-factor TỪNG
    // tool. Best-effort, không chặn phản hồi.
    void logEvent({
      event_type: 'referral_signup',
      user_id: user.id,
      tool_id: srcTool,
      utm_source: srcSource,
      utm_campaign: srcTool,
      meta: { referrer_user_id: referrerId, code: refCode, rewarded, credits_granted: creditsGranted },
    });

    return ok({ success: true, referrerId, rewarded, creditsGranted, message: 'Đã ghi nhận! Người giới thiệu vừa nhận thưởng chào mừng. Khi bạn nạp Lượng lần đầu, cả hai nhận thêm 30 Lượng.' });
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
  if (action === 'admin-cron-trigger') return handleAdminCronTrigger(request, body);
  if (action === 'admin-channel-broadcast') return handleAdminChannelBroadcast(request, body);
  if (action === 'admin-nudge-user') return handleAdminNudgeUser(request, body);
  if (action === 'admin-media-decide') return handleAdminMediaDecide(request, body);
  if (action === 'admin-seeding-group') return handleAdminSeedingGroup(request, body);
  if (action === 'admin-seeding-draft') return handleAdminSeedingDraft(request, body);
  if (action === 'admin-khao-luan-topics') return handleAdminKhaoLuanTopics(request, body);
  if (action === 'admin-nghien-cuu-topics') return handleAdminNghienCuuTopics(request, body);
  if (action === 'admin-mcp-update') return handleAdminMcpUpdate(request, body);
  if (action === 'admin-users-upsert') return handleAdminUsersUpsert(request, body);
  if (action === 'admin-users-set-active') return handleAdminUsersSetActive(request, body);
  if (action === 'create-bank')       return handleCreateBank(body);
  if (action === 'referral-register') return handleReferralRegister(request, body);
  if (action === 'onboarding-sync')   return handleOnboardingSync(request);
  return err('Invalid action.', 400);
}
