// ══════════════════════════════════════════════════════════════
// THÊM VÀO app/api/payment/route.ts
// ══════════════════════════════════════════════════════════════

// 1. Thêm import crypto ở đầu file (nếu chưa có):
//    import crypto from 'crypto';

// 2. Thêm PAYOS_PACKAGES sau PACKAGES hiện tại:

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

// 3. Thêm handler function:

async function handleCreateBank(body: Record<string, unknown>): Promise<Response> {
  const packageId = String(body.packageId || '');
  const userId    = String(body.userId    || '');
  const pkg = PAYOS_PACKAGES[packageId];
  if (!pkg)    return err(`Invalid packageId. Use: ${Object.keys(PAYOS_PACKAGES).join(', ')}`, 400);
  if (!userId) return err('Missing userId', 400);

  // orderCode phải là số nguyên dương, max 9 chữ số
  const orderCode = Date.now() % 999_999_999;
  const description = pkg.label.substring(0, 25);
  const returnUrl = `${SITE_URL}/topup.html?payment=success&method=bank&orderCode=${orderCode}`;
  const cancelUrl = `${SITE_URL}/topup.html?payment=cancelled`;

  const sigData = {
    amount:      pkg.amountVND,
    cancelUrl,
    description,
    orderCode,
    returnUrl,
  };

  try {
    const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-client-id':   process.env.PAYOS_CLIENT_ID!,
        'x-api-key':     process.env.PAYOS_API_KEY!,
      },
      body: JSON.stringify({ ...sigData, signature: createPayOSSignature(sigData) }),
    });
    const payosData = await res.json();
    if (payosData.code !== '00') {
      console.error('[create-bank] payOS error:', payosData);
      return err(payosData.desc || 'payOS error');
    }

    // Lưu pending order vào Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/bank_orders`, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        order_code:  String(orderCode),
        user_id:     userId,
        package_id:  packageId,
        amount_vnd:  pkg.amountVND,
        credits:     pkg.credits,
        label:       pkg.label,
        status:      'pending',
        created_at:  new Date().toISOString(),
      }),
    });

    const d = payosData.data;
    return ok({
      orderCode,
      checkoutUrl:   d.checkoutUrl,
      accountNumber: d.accountNumber,
      accountName:   d.accountName,
      bin:           d.bin,
      amountVND:     pkg.amountVND,
      credits:       pkg.credits,
      label:         pkg.label,
    });
  } catch (e: unknown) { return err((e as Error).message); }
}

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

// 4. Thêm vào GET handler (trước return err cuối):
//    if (action === 'check-bank')  return handleCheckBank(searchParams);

// 5. Thêm vào POST handler (trước return err cuối):
//    if (action === 'create-bank') return handleCreateBank(body);
