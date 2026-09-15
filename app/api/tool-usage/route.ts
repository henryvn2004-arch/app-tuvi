// app/api/tool-usage/route.ts
// Công cụ dùng NHIỀU NHẤT của một tài khoản — sidebar "Công cụ yêu thích".
//
// Nguồn: `events` (event_type='tool_run'), đúng bảng lib/ops/tool-usage-alerts.ts
// đã dùng để tính "top tool" cho digest vận hành. `tool_id` ở đây là SLUG
// (window.SHELL_ACTIVE bắn kèm event — xem public/shell.js dòng gọi
// track('tool_run', {tool_id: ACTIVE})), TRÙNG với `id` của mỗi mục trong
// TOOLS (public/shell.js toItem()) — không phải cột tool_id của tool_pricing.
// Nhờ vậy client chỉ cần khớp thẳng vào TOOLS đã có sẵn, không cần gọi thêm
// tool_pricing ở đây.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

// Trần số dòng đọc — một tài khoản hoạt động lâu vẫn chỉ cần vài trăm dòng
// gần nhất để biết công cụ nào dùng nhiều, không cần đọc cả lịch sử.
const FETCH_LIMIT = 3000;
const TOP_N = 5;

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

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/events?event_type=eq.tool_run&user_id=eq.${user.id}` +
      `&select=tool_id&order=ts.desc&limit=${FETCH_LIMIT}`,
    { headers: SB, cache: 'no-store' },
  );
  if (!r.ok) return err('Lỗi đọc lịch sử dùng công cụ.', 500);
  const rows = (await r.json()) as { tool_id: string | null }[];

  // 'home' là trang Tổng quan, không phải một công cụ — loại khỏi bảng xếp
  // hạng dù nó bắn tool_run nhiều nhất (mọi lượt vào /app).
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.tool_id || row.tool_id === 'home') continue;
    counts.set(row.tool_id, (counts.get(row.tool_id) || 0) + 1);
  }
  const items = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([tool_id, count]) => ({ tool_id, count }));

  return ok({ items });
}
