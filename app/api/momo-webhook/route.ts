// app/api/momo-webhook/route.ts
// IPN MoMo — tự động add credits khi user thanh toán MoMo thành công.
// Cùng khuôn với app/api/bank-webhook/route.ts: một bảng đơn (`momo_orders`)
// + một RPC nguyên tử (`momo_settle_topup`) chịu được gọi trùng.
import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { fireServerPurchase } from '@/lib/marketing/server-conversions';
import { alertNewPayment } from '@/lib/admin/alert';
import { sendInvoiceEmail } from '@/lib/email/invoice';
import { verifyMomoIpnSignature, type MomoIpnBody } from '@/lib/billing/momo';

const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY || '';
const MOMO_SECRET_KEY = process.env.MOMO_SECRET_KEY || '';
const SUPABASE_URL    = process.env.SUPABASE_URL!;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY!;

const SB = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

type SettleRow = { credited: boolean; reason: string; balance: number; credits: number };

async function settle(orderId: string, amountVnd: number): Promise<SettleRow | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/momo_settle_topup`, {
    method: 'POST',
    headers: SB,
    cache: 'no-store',
    body: JSON.stringify({ p_order_id: orderId, p_amount_vnd: amountVnd }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return (JSON.parse(text) as SettleRow[])[0] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MomoIpnBody;

    if (!MOMO_ACCESS_KEY || !MOMO_SECRET_KEY) {
      console.error('[momo-webhook] MOMO_ACCESS_KEY/MOMO_SECRET_KEY chưa set — bỏ qua');
      return Response.json({ error: 'not configured' }, { status: 501 });
    }
    if (!verifyMomoIpnSignature(body, MOMO_ACCESS_KEY, MOMO_SECRET_KEY)) {
      console.error('[momo-webhook] invalid signature');
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // resultCode 0 = giao dịch thành công.
    if (Number(body.resultCode) !== 0) {
      return Response.json({ message: 'ignored' });
    }

    const orderId   = String(body.orderId || '');
    const amountVnd = Number(body.amount) || 0;
    if (!orderId) return Response.json({ message: 'no order id' });

    const row = await settle(orderId, amountVnd);
    if (!row) {
      console.error('[momo-webhook] settle RPC không trả dòng nào:', orderId);
      return Response.json({ error: 'settle failed' }, { status: 500 });
    }

    // `credited=false` KHÔNG phải lỗi — đơn đã có người chốt trước (IPN gửi
    // lại), hoặc không đủ điều kiện. Trả 200 để MoMo thôi gửi lại.
    if (!row.credited) {
      console.warn(`[momo-webhook] không chốt orderId=${orderId} reason=${row.reason} amount=${amountVnd}`);
      return Response.json({ message: row.reason });
    }

    console.log(`[momo-webhook] paid orderId=${orderId} credits=${row.credits} newBal=${row.balance}`);

    // Best-effort: lỗi ở đây không được làm hỏng phản hồi IPN.
    try {
      const uidRes = await fetch(
        `${SUPABASE_URL}/rest/v1/momo_orders?order_id=eq.${encodeURIComponent(orderId)}&select=user_id`,
        { headers: SB, cache: 'no-store' },
      );
      const uidRows = uidRes.ok ? ((await uidRes.json()) as { user_id: string }[]) : [];
      const userId = uidRows[0]?.user_id;
      if (userId) {
        fireServerPurchase(userId, orderId, amountVnd);
        waitUntil(alertNewPayment({ provider: 'momo', amountVnd, credits: row.credits, userId }));
        waitUntil(sendInvoiceEmail({
          userId, orderId, provider: 'momo', credits: row.credits, amountVnd,
          label: `MoMo – ${row.credits} Lượng`, balance: row.balance,
        }));
      } else {
        console.error('[momo-webhook] không tìm được user_id để bắn Purchase, orderId=', orderId);
      }
    } catch (e) {
      console.error('[momo-webhook] lỗi tra user_id cho Purchase', e);
    }

    return Response.json({ success: true });

  } catch (e: unknown) {
    console.error('[momo-webhook] error:', e);
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

// MoMo không gọi GET, nhưng có người sẽ mở thử bằng trình duyệt.
export async function GET() {
  return Response.json({ message: 'MoMo IPN endpoint. POST only.' }, { status: 405 });
}
