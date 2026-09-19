// app/api/admin/rail-chats/route.ts
// ============================================================
// XEM HỘI THOẠI RAIL CHAT — đầu quản trị (panel "Rail Chat" trong admin.html).
//
//   GET ?limit=&offset=&type=&email=&q= → danh sách phiên chat (kèm nguyên
//   `messages`) + tổng số khớp bộ lọc.
//
// Nguồn dữ liệu: bảng `tuvi_chats` (app/api/tuvi-chats/route.ts) — nơi
// shell.js/tuvi-chat.html ĐÃ tự đồng bộ mỗi phiên rail của user ĐĂNG NHẬP
// (client upload messages sau mỗi lượt, xem `histSrvSave` trong shell.js).
// KHÔNG có phiên của khách ẩn danh — họ chỉ sống trong localStorage, chưa
// từng gửi lên server. Route này CHỈ ĐỌC, không ghi thêm gì mới.
//
// Xác thực: access token Supabase của admin → email → tra `admin_users`
// (lib/admin/auth.ts) — cùng lối /api/admin/feedback. Bảng `tuvi_chats` có
// RLS "chỉ đọc của chính mình" (auth.uid()=user_id) nên JWT của admin một
// mình không đọc được chat của người khác — route này dùng SERVICE KEY để
// vượt qua, đúng như /api/tuvi-chats đã làm cho chính user.
//
// ⚠️ Khoá thật của `tuvi_chats` là (id, user_id) — CHỦ Ý client tự sinh `id`
// nên cùng một chuỗi id có thể thuộc nhiều user khác nhau (mỗi user một
// dòng riêng). "id" một mình KHÔNG định danh được một phiên.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, getUserFromSupabaseToken } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUserFromSupabaseToken(token);
  if (!user?.email) return null;
  return getAdminUser(user.email);
}

/** Đếm bằng HEAD + `Prefer: count=exact` — đọc tổng từ header Content-Range,
 *  cùng lối /api/admin/feedback::countBy. */
async function countRailChats(filter: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tuvi_chats?select=id&limit=1${filter}`, {
    method: 'HEAD',
    cache: 'no-store',
    headers: { ...SB_HEADERS, Prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

/** email → user_id qua GoTrue admin API. null nếu không tìm thấy. */
async function resolveEmailToUserId(email: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    cache: 'no-store',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.users?.[0]?.id || null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Không có quyền admin.' }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const type = sp.get('type')?.trim() || '';
  const q = sp.get('q')?.trim() || '';
  const emailFilter = sp.get('email')?.trim() || '';
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 50, 1), 200);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);

  // Lọc theo email: tra user_id trước — không tìm thấy thì trả rỗng ngay,
  // đừng để user_id=eq.undefined lọt xuống PostgREST (khớp bừa hoặc 400).
  let userIdFilter = '';
  if (emailFilter) {
    const uid = await resolveEmailToUserId(emailFilter);
    if (!uid) return NextResponse.json({ items: [], total: 0 });
    userIdFilter = `&user_id=eq.${uid}`;
  }

  let filter = userIdFilter;
  if (type) filter += `&type=ilike.*${encodeURIComponent(type)}*`;
  if (q) {
    // PostgREST or=() — dấu phẩy/ngoặc trong q sẽ vỡ cú pháp filter, encode
    // riêng phần giá trị rồi ghép tay thay vì encodeURIComponent cả cụm.
    const safeQ = q.replace(/[,()]/g, ' ').trim();
    filter += `&or=(label.ilike.*${encodeURIComponent(safeQ)}*,last_msg.ilike.*${encodeURIComponent(safeQ)}*)`;
  }

  try {
    const [listRes, total] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/tuvi_chats?select=id,user_id,label,type,summary,messages,last_msg,updated_at,created_at` +
          `&order=updated_at.desc&limit=${limit}&offset=${offset}${filter}`,
        { cache: 'no-store', headers: SB_HEADERS },
      ),
      countRailChats(filter),
    ]);
    if (!listRes.ok) {
      console.error('[admin/rail-chats GET] supabase', listRes.status, await listRes.text());
      return NextResponse.json({ error: 'Không đọc được hội thoại.' }, { status: 502 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = await listRes.json();

    // user_id → email — chỉ tra những id THẬT SỰ xuất hiện trong trang này,
    // không loop hết auth users (tránh tốn quota, cùng lối app/api/payment.ts).
    const userIds = Array.from(new Set(items.map((r) => r.user_id).filter(Boolean)));
    const emailMap: Record<string, string> = {};
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
            cache: 'no-store',
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          });
          if (r.ok) {
            const u = await r.json();
            if (u?.email) emailMap[uid] = u.email;
          }
        } catch {
          /* bỏ qua, hiện user_id thô */
        }
      }),
    );
    const out = items.map((r) => ({
      ...r,
      email: emailMap[r.user_id] || null,
      msg_count: Array.isArray(r.messages) ? r.messages.length : 0,
    }));
    return NextResponse.json({ items: out, total });
  } catch (e) {
    console.error('[admin/rail-chats GET] exception', e);
    return NextResponse.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}
