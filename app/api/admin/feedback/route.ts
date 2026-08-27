// app/api/admin/feedback/route.ts
// ============================================================
// HỘP THƯ GÓP Ý — đầu quản trị (panel "Góp Ý" trong admin.html).
//
//   GET   ?status=&kind=&limit=&offset=  → danh sách + đếm theo trạng thái
//   PATCH {id, status?, admin_reply?}    → đổi trạng thái / viết hồi đáp
//
// Xác thực: access token Supabase của admin → email → tra `admin_users`
// (lib/admin/auth.ts). Cùng lối với /api/payment các action admin — KHÔNG dựa
// vào RLS, vì bảng user_feedback cố ý không có policy nào.
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

const STATUSES = ['moi', 'dang_xu_ly', 'da_xu_ly', 'bo_qua'] as const;
const KINDS = new Set(['bug', 'noi_dung', 'tinh_nang', 'thanh_toan', 'khac']);
const SOURCES = new Set(['account', 'reading']);
const RATINGS = new Set(['up', 'down']);

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUserFromSupabaseToken(token);
  if (!user?.email) return null;
  return getAdminUser(user.email);
}

/** Đếm bằng HEAD + `Prefer: count=exact` — đọc tổng từ header Content-Range. */
async function countBy(filter: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_feedback?select=id&limit=1${filter}`, {
    method: 'HEAD',
    cache: 'no-store',
    headers: { ...SB_HEADERS, Prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Không có quyền admin.' }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const status = sp.get('status') || '';
  const kind = sp.get('kind') || '';
  const source = sp.get('source') || '';
  const rating = sp.get('rating') || '';
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 50, 1), 200);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);

  let q =
    `${SUPABASE_URL}/rest/v1/user_feedback` +
    `?select=id,user_id,email,kind,message,page_url,user_agent,tool_id,meta,` +
    `rating,source,status,admin_reply,admin_email,replied_at,created_at,updated_at` +
    `&order=created_at.desc&limit=${limit}&offset=${offset}`;
  if ((STATUSES as readonly string[]).includes(status)) q += `&status=eq.${status}`;
  if (KINDS.has(kind)) q += `&kind=eq.${kind}`;
  if (SOURCES.has(source)) q += `&source=eq.${source}`;
  if (RATINGS.has(rating)) q += `&rating=eq.${rating}`;

  try {
    const [listRes, statsRes, ...counts] = await Promise.all([
      fetch(q, { cache: 'no-store', headers: SB_HEADERS }),
      // Bảng "tool nào đang bị chê nhất" — con số mà cả lớp 👍/👎 sinh ra để
      // có. PostgREST không gộp nhóm được nên phải qua RPC.
      fetch(`${SUPABASE_URL}/rest/v1/rpc/feedback_tool_stats`, {
        method: 'POST',
        cache: 'no-store',
        headers: SB_HEADERS,
        body: JSON.stringify({ p_min_votes: 1 }),
      }),
      ...STATUSES.map((s) => countBy(`&status=eq.${s}`)),
    ]);
    if (!listRes.ok) {
      console.error('[admin/feedback GET] supabase', listRes.status, await listRes.text());
      return NextResponse.json({ error: 'Không đọc được góp ý.' }, { status: 502 });
    }
    const byStatus: Record<string, number> = {};
    STATUSES.forEach((s, i) => (byStatus[s] = counts[i] as number));
    // Bảng xếp hạng hỏng KHÔNG được kéo cả panel xuống theo — danh sách góp ý
    // mới là thứ chính. Migration lớp 1 chưa chạy thì RPC 404, panel vẫn dùng
    // được, chỉ thiếu một khối.
    let toolStats: unknown[] = [];
    if (statsRes.ok) toolStats = await statsRes.json();
    else console.error('[admin/feedback GET] tool stats', statsRes.status, await statsRes.text());
    return NextResponse.json({ items: await listRes.json(), counts: byStatus, toolStats });
  } catch (e) {
    console.error('[admin/feedback GET] exception', e);
    return NextResponse.json({ error: 'Lỗi máy chủ.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Không có quyền admin.' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung gửi lên không hợp lệ.' }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Thiếu id góp ý.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.status === 'string') {
    if (!(STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.admin_reply === 'string') {
    // Hồi đáp HIỆN THẲNG cho người góp ý trong tab Góp Ý của họ — cắt độ dài
    // để một cú dán nhầm cả trang không tràn vào giao diện của họ.
    const reply = body.admin_reply.trim().slice(0, 2000);
    patch.admin_reply = reply || null;
    patch.admin_email = reply ? admin.email : null;
    patch.replied_at = reply ? new Date().toISOString() : null;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Không có gì để cập nhật.' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_feedback?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    console.error('[admin/feedback PATCH] supabase', res.status, await res.text());
    return NextResponse.json({ error: 'Không cập nhật được.' }, { status: 502 });
  }
  const rows = await res.json();
  // PATCH ăn 0 dòng vẫn trả 200 — id sai thì phải nói ra, đừng báo "đã lưu".
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Không tìm thấy góp ý này.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item: rows[0] });
}
