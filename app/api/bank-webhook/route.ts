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

type SettleRow = { credited: boolean; reason: string; balance: number; credits: number };

/**
 * Chốt đơn qua RPC `bank_settle_topup` — cửa DUY NHẤT, và là một transaction.
 *
 * Bản trước chốt bằng BỐN lượt gọi rời nhau (SELECT dòng `pending` → PATCH
 * sang `paid` → `add_credits` → INSERT sổ). Giữa SELECT và PATCH là khe hở
 * thật: PayOS CÓ gửi lại webhook, hai lượt gửi lại chạy song song thì cả hai
 * đều thấy `status='pending'` ⇒ ví tăng HAI lần cho một lần trả tiền.
 * Nay `UPDATE … WHERE status='pending'` trong RPC vừa là chốt vừa là mutex.
 * Xem `_patches/migration-bank-settle.sql`.
 */
async function settle(orderCode: string, amountVnd: number): Promise<SettleRow | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bank_settle_topup`, {
    method: 'POST',
    headers: SB,
    cache: 'no-store',
    body: JSON.stringify({ p_order_code: orderCode, p_amount_vnd: amountVnd }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  // RETURNS TABLE ⇒ PostgREST trả về MẢNG một phần tử.
  return (JSON.parse(text) as SettleRow[])[0] ?? null;
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
    const amountVnd = Number(data.amount) || 0;

    const row = await settle(orderCode, amountVnd);
    if (!row) {
      console.error('[bank-webhook] settle RPC không trả dòng nào:', orderCode);
      return Response.json({ error: 'settle failed' }, { status: 500 });
    }

    // `credited=false` KHÔNG phải lỗi — đơn đã có người chốt trước (gói tin
    // gửi lại), hoặc không đủ điều kiện chốt. Trả 200 để PayOS thôi gửi lại;
    // trả lỗi ở đây là tự chuốc thêm một vòng retry cho việc đã xong.
    if (!row.credited) {
      console.warn(`[bank-webhook] không chốt orderCode=${orderCode} reason=${row.reason} amount=${amountVnd}`);
      return Response.json({ message: row.reason });
    }

    console.log(`[bank-webhook] paid orderCode=${orderCode} credits=${row.credits} newBal=${row.balance}`);
    return Response.json({ success: true });

  } catch (e: unknown) {
    console.error('[bank-webhook] error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
