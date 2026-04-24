#!/usr/bin/env python3
"""
patch_payos.py — payOS bank transfer integration
Chạy từ root repo: python patch_payos.py
"""
import os, shutil, re

ROOT = '/workspaces/app-tuvi'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── 1. Tạo app/api/bank-webhook/route.ts ─────────────────────
webhook_dir = os.path.join(ROOT, 'app', 'api', 'bank-webhook')
os.makedirs(webhook_dir, exist_ok=True)
shutil.copy2(
    os.path.join(SCRIPT_DIR, 'payos-v2', 'bank-webhook-route.ts'),
    os.path.join(webhook_dir, 'route.ts')
)
print('✅ Created app/api/bank-webhook/route.ts')

# ── 2. Patch app/api/payment/route.ts ────────────────────────
payment_path = os.path.join(ROOT, 'app', 'api', 'payment', 'route.ts')
with open(payment_path, 'r', encoding='utf-8') as f:
    src = f.read()

if 'create-bank' in src:
    print('⏭  payment/route.ts already patched, skip.')
else:
    # a) Thêm import crypto nếu chưa có
    if "import crypto from 'crypto'" not in src:
        src = "import crypto from 'crypto';\n" + src
        print('  + Added crypto import')

    # b) Chèn PAYOS_PACKAGES + helpers sau dòng khai báo PACKAGES
    packages_end = src.find('\n};\n', src.find('const PACKAGES'))
    if packages_end == -1:
        print('⚠️  Không tìm thấy PACKAGES, chèn sau CURRENCY')
        insert_after = src.find("const CURRENCY")
        insert_at = src.find('\n', insert_after) + 1
    else:
        insert_at = packages_end + len('\n};\n')

    payos_consts = """
// ── payOS Credit packages (VNĐ) ──────────────────────────────
const PAYOS_PACKAGES: Record<string, { amountVND: number; credits: number; label: string }> = {
  '5':  { amountVND: 130_000, credits: 50,  label: 'Trial – 50 Credits'    },
  '10': { amountVND: 250_000, credits: 110, label: 'Popular – 110 Credits' },
  '20': { amountVND: 490_000, credits: 240, label: 'Pro – 240 Credits'     },
};

function createPayOSSignature(data: Record<string, unknown>): string {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;
  const str = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('&');
  return crypto.createHmac('sha256', checksumKey).update(str).digest('hex');
}

"""
    src = src[:insert_at] + payos_consts + src[insert_at:]
    print('  + Added PAYOS_PACKAGES + createPayOSSignature')

    # c) Chèn 2 handler functions trước "// ── Route handlers"
    route_handlers_marker = '// ── Route handlers'
    handler_code = """// ── POST: create-bank (payOS) ────────────────────────────────
async function handleCreateBank(body: Record<string, unknown>): Promise<Response> {
  const packageId = String(body.packageId || '');
  const userId    = String(body.userId    || '');
  const pkg = PAYOS_PACKAGES[packageId];
  if (!pkg)    return err(`Invalid packageId. Use: ${Object.keys(PAYOS_PACKAGES).join(', ')}`, 400);
  if (!userId) return err('Missing userId', 400);

  const orderCode   = Date.now() % 999_999_999;
  const description = pkg.label.substring(0, 25);
  const returnUrl   = `${SITE_URL}/topup.html?payment=success&method=bank&orderCode=${orderCode}`;
  const cancelUrl   = `${SITE_URL}/topup.html?payment=cancelled`;
  const sigData     = { amount: pkg.amountVND, cancelUrl, description, orderCode, returnUrl };

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
        package_id: packageId, amount_vnd: pkg.amountVND,
        credits: pkg.credits, label: pkg.label,
        status: 'pending', created_at: new Date().toISOString(),
      }),
    });

    const d = payosData.data;
    return ok({ orderCode, checkoutUrl: d.checkoutUrl, accountNumber: d.accountNumber,
      accountName: d.accountName, bin: d.bin, amountVND: pkg.amountVND,
      credits: pkg.credits, label: pkg.label });
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

"""
    if route_handlers_marker in src:
        src = src.replace(route_handlers_marker, handler_code + route_handlers_marker)
        print('  + Added handleCreateBank + handleCheckBank')
    else:
        print('⚠️  Không tìm thấy "// ── Route handlers", thêm trước export async function GET')
        src = src.replace('export async function GET', handler_code + 'export async function GET')

    # d) Thêm vào GET handler
    get_invalid = "return err('Invalid action.', 400);\n}\n\nexport async function POST"
    src = src.replace(
        get_invalid,
        "if (action === 'check-bank')  return handleCheckBank(searchParams);\n  " + get_invalid
    )
    print("  + Added 'check-bank' to GET handler")

    # e) Thêm vào POST handler
    post_invalid = "return err('Invalid action.', 400);\n}"
    # Lấy cái cuối cùng (POST handler)
    last_idx = src.rfind(post_invalid)
    if last_idx != -1:
        src = src[:last_idx] + "if (action === 'create-bank') return handleCreateBank(body);\n  " + src[last_idx:]
        print("  + Added 'create-bank' to POST handler")

    with open(payment_path, 'w', encoding='utf-8') as f:
        f.write(src)
    print('✅ Patched app/api/payment/route.ts')

# ── 3. Summary ─────────────────────────────────────────────────
print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIẾP THEO — làm thủ công:

① SUPABASE SQL Editor — chạy migration:

CREATE TABLE IF NOT EXISTS bank_orders (
  id          BIGSERIAL PRIMARY KEY,
  order_code  TEXT UNIQUE NOT NULL,
  user_id     UUID NOT NULL,
  package_id  TEXT NOT NULL,
  amount_vnd  INTEGER NOT NULL,
  credits     INTEGER NOT NULL,
  label       TEXT,
  status      TEXT DEFAULT 'pending',
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_orders_order_code ON bank_orders(order_code);

② VERCEL — thêm 3 env vars:
PAYOS_CLIENT_ID=db3d883a-7d42-485f-b50e-93561386329a
PAYOS_API_KEY=68a071b1-87b2-4a45-a215-416475e3c935
PAYOS_CHECKSUM_KEY=67d25151e1adc02ea7b53b1469af7644cf7c24830a5ddb8216f8c0c37c19d746

③ payOS Dashboard (my.payos.vn) — thêm Webhook:
URL: https://www.tuviminhbao.com/api/bank-webhook

④ git add . && git commit -m "feat: payOS bank transfer" && git push
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
print('🎉 Patch xong!')
