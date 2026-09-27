// app/api/tien-tri/route.ts
// SỔ TIÊN TRI (docs/DAC-TRUNG-PLAN.md) — thầy hỏi lại khi lời phán đến hạn.
//   GET   /api/tien-tri          → { item } lời phán đến hạn cũ nhất chưa trả lời (hoặc null)
//   PATCH /api/tien-tri?id=…     { ket_qua: 'dung' | 'chua' | 'de_sau' }
// Đọc/ghi đều qua lib/tien-tri/store.ts (lọc kèm user_id của CHÍNH người gọi).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { listDenHan, traLoi } from '@/lib/tien-tri/store';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function authUser(request: NextRequest): Promise<{ id: string } | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SUPABASE_KEY },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ? { id: u.id } : null;
}

export async function OPTIONS() {
  return options();
}

export async function GET(request: NextRequest) {
  const user = await authUser(request);
  if (!user) return err('Unauthorized', 401);
  const [item] = await listDenHan(user.id, 1);
  return ok({ success: true, item: item || null });
}

export async function PATCH(request: NextRequest) {
  const user = await authUser(request);
  if (!user) return err('Unauthorized', 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  const body = await parseBody(request);
  const kq = String(body.ket_qua || '');
  if (kq !== 'dung' && kq !== 'chua' && kq !== 'de_sau') return err('ket_qua không hợp lệ', 400);
  const done = await traLoi(user.id, id, kq);
  if (!done) return err('Không tìm thấy.', 404);
  return ok({ success: true });
}
