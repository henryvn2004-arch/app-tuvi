// app/api/charts/route.ts
// SỔ LÁ SỐ theo tài khoản (U4).
//   GET    /api/charts          — danh sách lá số đã lưu
//   POST   /api/charts          — lưu / cập nhật một lá số (upsert theo chart_key)
//   DELETE /api/charts?id=…     — xoá một mục
//
// 🔑 KHÔNG BAO GIỜ ĐƯỢC CHẶN LUỒNG TOOL. Mọi tool vẫn chạy bằng
// `localStorage['app_birth']` đọc ĐỒNG BỘ như cũ; route này chỉ là tầng bền
// nằm trên. Vì thế client gọi nó kiểu bắn-và-quên, và mọi lỗi ở đây phải trả
// về gọn gàng chứ không được ném ra ngoài.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { chartKey, isUsableBirth, normalizeLabel, type ChartBirth } from '@/lib/charts/key';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

/** Trần số mục mỗi người. Sổ là chỗ tra nhanh, không phải kho lưu trữ — quá
 *  vài chục dòng thì bộ chọn tự nó thành một danh sách phải cuộn, tức lại chậm
 *  đúng thứ nó sinh ra để làm nhanh. Vượt trần thì xoá mục CŨ NHẤT theo lần
 *  dùng gần nhất, không phải từ chối lưu (từ chối là mất lá số vừa nhập). */
const MAX_CHARTS = 30;

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

const SELECT = 'id,label,birth,chart_key,created_at,last_used_at';

async function listCharts(userId: string) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_charts?user_id=eq.${userId}` +
      `&select=${SELECT}&order=last_used_at.desc&limit=${MAX_CHARTS}`,
    { headers: SB, cache: 'no-store' },
  );
  if (!r.ok) return null;
  return r.json();
}

export async function OPTIONS() {
  return options();
}

export async function GET(request: NextRequest) {
  const user = await authUser(request);
  if (!user) return err('Unauthorized', 401);
  const items = await listCharts(user.id);
  if (!items) return err('Lỗi đọc sổ lá số.', 500);
  return ok({ success: true, items });
}

export async function POST(request: NextRequest) {
  const user = await authUser(request);
  if (!user) return err('Unauthorized', 401);

  const body = await parseBody(request);
  const birth = body.birth as ChartBirth | undefined;
  if (!isUsableBirth(birth)) return err('Thiếu ngày tháng năm sinh.', 400);
  const label = normalizeLabel(body.label);
  const key = chartKey(birth, label);
  const now = new Date().toISOString();

  // Upsert theo (user_id, chart_key) — chạy lại cùng một tool với cùng lá số
  // thì CẬP NHẬT mục cũ, không đẻ thêm dòng. `merge-duplicates` là đường dùng
  // đúng ràng buộc unique đã khai trong migration.
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_charts?on_conflict=user_id,chart_key&select=${SELECT}`,
    {
      method: 'POST',
      headers: { ...SB, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: user.id,
        label,
        birth,
        chart_key: key,
        updated_at: now,
        last_used_at: now,
      }),
    },
  );
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('[charts] lưu hỏng:', r.status, t.slice(0, 200));
    return err('Lỗi lưu lá số.', 500);
  }
  const rows = await r.json();

  // Cắt bớt phần vượt trần — best-effort, không chặn phản hồi. Đọc dư MỘT dòng
  // rồi xoá từ dòng thứ MAX_CHARTS trở đi.
  void pruneOverflow(user.id);

  return ok({ success: true, item: Array.isArray(rows) ? rows[0] : rows });
}

async function pruneOverflow(userId: string) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/user_charts?user_id=eq.${userId}` +
        `&select=id&order=last_used_at.desc&offset=${MAX_CHARTS}&limit=50`,
      { headers: SB, cache: 'no-store' },
    );
    if (!r.ok) return;
    const extra = (await r.json()) as { id: number }[];
    if (!extra.length) return;
    const ids = extra.map((x) => x.id).join(',');
    await fetch(`${SUPABASE_URL}/rest/v1/user_charts?id=in.(${ids})&user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: SB,
    });
  } catch {
    /* dọn dẹp hỏng không phải lý do làm hỏng lượt lưu */
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authUser(request);
  if (!user) return err('Unauthorized', 401);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^\d+$/.test(id)) return err('Thiếu id.', 400);
  // `user_id=eq.` là chốt chặn THẬT: service key bỏ qua RLS, nên thiếu điều
  // kiện này là ai cũng xoá được mục của người khác chỉ bằng cách đoán id.
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_charts?id=eq.${id}&user_id=eq.${user.id}`,
    { method: 'DELETE', headers: SB },
  );
  if (!r.ok) return err('Lỗi xoá.', 500);
  return ok({ success: true });
}
