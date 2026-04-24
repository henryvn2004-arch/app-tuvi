// app/api/bank-webhook/route.ts
// payOS webhook — tự động add credits khi user chuyển khoản thành công
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SB = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

function verifySignature(body: Record<string, unknown>): boolean {
  const data = body.data as Record<string, unknown> | undefined;
  const signature = body.signature as string | undefined;
  if (!data || !signature) return false;
  const sorted = Object.keys(data).sort();
  const str = sorted.map(k => `${k}=${data[k]}`).join('&');
  const expected = crypto.createHmac('sha256', CHECKSUM_KEY).update(str).digest('hex');
  return expected === signature;
}

async function rpc(fn: string, params: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: SB, body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!verifySignature(body)) {
      console.error('[bank-webhook] invalid signature');
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // payOS gửi code '00' khi thành công
    if (body.code !== '00') {
      return Response.json({ message: 'ignored' });
    }

    const data = body.data as Record<string, unknown>;
    const orderCode = String(data.orderCode);

    // Tìm pending order
    const findRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bank_orders?order_code=eq.${encodeURIComponent(orderCode)}&status=eq.pending&limit=1`,
      { headers: SB }
    );
    const rows: Record<string, unknown>[] = findRes.ok ? await findRes.json() : [];
    if (!rows.length) {
      console.warn('[bank-webhook] order not found:', orderCode);
      return Response.json({ message: 'not found' });
    }

    const order = rows[0];

    // Verify amount
    if (Number(data.amount) < Number(order.amount_vnd)) {
      console.warn('[bank-webhook] amount mismatch', data.amount, order.amount_vnd);
      return Response.json({ message: 'amount mismatch' });
    }

    // Mark paid
    await fetch(`${SUPABASE_URL}/rest/v1/bank_orders?order_code=eq.${encodeURIComponent(orderCode)}`, {
      method: 'PATCH',
      headers: { ...SB, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
    });

    // Add credits
    const userId  = String(order.user_id);
    const credits = Number(order.credits);
    const label   = String(order.label || 'Nạp credits chuyển khoản');

    const newBal = await rpc('add_credits', { p_user_id: userId, p_amount: credits });

    // Log transaction
    await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
      method: 'POST',
      headers: { ...SB, 'Prefer': 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        user_id: userId, amount: credits, type: 'topup',
        description: label, created_at: new Date().toISOString(),
      }),
    });

    console.log(`[bank-webhook] paid orderCode=${orderCode} userId=${userId} credits=${credits} newBal=${newBal}`);
    return Response.json({ success: true });

  } catch (e: unknown) {
    console.error('[bank-webhook] error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
