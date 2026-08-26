// app/api/feedback/route.ts
// ============================================================
// HỘP THƯ GÓP Ý — đầu người dùng (tab Tài khoản > Góp Ý).
//
//   GET   → 50 góp ý gần nhất CỦA CHÍNH người đang đăng nhập, kèm trạng thái
//           và lời hồi đáp của admin.
//   POST  → gửi một góp ý mới.
//
// Bảng `user_feedback` KHÔNG có policy RLS nào (xem
// _patches/migration-user-feedback.sql) → chỉ chạm được bằng service key qua
// đúng route này. Vì thế MỌI câu truy vấn ở đây phải tự lọc `user_id` — không
// có lưới RLS đỡ phía dưới nếu quên.
//
// Dùng `fetch` trần + `cache:'no-store'` thay cho supabase-js: Next bọc fetch
// toàn cục và nhớ kết quả kể cả trong route động — luật cứng của repo, và
// `npm run check:nostore` canh đúng lối viết này.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSupabaseToken } from '@/lib/admin/auth';
import { getConfigValue } from '@/lib/config/appConfig';
import { alertNewFeedback } from '@/lib/admin/alert';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const KINDS = new Set(['bug', 'noi_dung', 'tinh_nang', 'thanh_toan', 'khac']);

/** Trần cứng phía server cho các trường ngữ cảnh — client tự khai, đừng tin độ dài. */
const CAP_URL = 500;
const CAP_UA = 400;
const CAP_TOOL = 64;
const CAP_META = 2000;

function bearer(req: NextRequest): string {
  return (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
}

function cut(v: unknown, n: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, n) : null;
}

// ── GET: góp ý của chính mình ────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getUserFromSupabaseToken(bearer(req));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url =
    `${SUPABASE_URL}/rest/v1/user_feedback` +
    `?user_id=eq.${encodeURIComponent(user.id)}` +
    `&select=id,kind,message,status,admin_reply,replied_at,created_at` +
    `&order=created_at.desc&limit=50`;
  const res = await fetch(url, { cache: 'no-store', headers: SB_HEADERS });
  if (!res.ok) {
    console.error('[feedback GET] supabase', res.status, await res.text());
    return NextResponse.json({ error: 'Không đọc được danh sách góp ý.' }, { status: 502 });
  }
  return NextResponse.json({ items: await res.json() });
}

// ── POST: gửi góp ý ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getUserFromSupabaseToken(bearer(req));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung gửi lên không hợp lệ.' }, { status: 400 });
  }

  const maxLen = await getConfigValue<number>('feedback.max_len', 2000);
  const message = String(body.message ?? '').trim().slice(0, maxLen);
  if (message.length < 5) {
    return NextResponse.json({ error: 'Góp ý quá ngắn — viết giúp vài dòng để chúng tôi hiểu ý.' }, { status: 400 });
  }

  const kindRaw = String(body.kind ?? 'khac');
  const kind = KINDS.has(kindRaw) ? kindRaw : 'khac';

  // Trần theo NGÀY GIỜ VN, đếm trong DB (feedback_today_count) để không lệch
  // theo múi giờ của runtime.
  //
  // HƯỚNG FAIL: OPEN — đọc trần hỏng thì vẫn cho gửi. Ở đây không có đồng nào
  // chảy ra; chặn oan là mất vĩnh viễn một tín hiệu (người ta không gửi lại lần
  // hai), còn lọt oan vài dòng rác thì admin xoá mất ba giây. Ngược hướng với
  // anon-trial có chủ ý.
  //
  // Đếm-rồi-ghi KHÔNG nguyên tử: hai tab bấm cùng lúc có thể lọt cái thứ 6.
  // Chấp nhận có chủ ý — bịt bằng RPC nguyên tử là thêm một SECURITY DEFINER
  // (thêm mặt hở) để chặn một hành vi chẳng tốn gì.
  const cap = await getConfigValue<number>('feedback.user_daily_cap', 5);
  if (cap <= 0) {
    return NextResponse.json({ error: 'Kênh góp ý đang tạm khoá.' }, { status: 403 });
  }
  try {
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/feedback_today_count`, {
      method: 'POST',
      cache: 'no-store',
      headers: SB_HEADERS,
      body: JSON.stringify({ p_user_id: user.id }),
    });
    if (cRes.ok) {
      const used = Number(await cRes.json());
      if (Number.isFinite(used) && used >= cap) {
        return NextResponse.json(
          { error: `Bạn đã gửi ${cap} góp ý hôm nay. Xin quay lại vào ngày mai — chúng tôi đọc hết.` },
          { status: 429 }
        );
      }
    } else {
      console.error('[feedback POST] đếm trần hỏng', cRes.status, await cRes.text());
    }
  } catch (e) {
    console.error('[feedback POST] đếm trần ném lỗi', e);
  }

  // `meta` là ngữ cảnh client tự khai — giữ nguyên hình dạng nhưng chặn kích
  // thước, không dùng cho quyền hạn hay tính phí nên không cần xác thực sâu.
  let meta: unknown = {};
  try {
    const raw = JSON.stringify(body.meta ?? {});
    meta = raw.length <= CAP_META ? JSON.parse(raw) : { _bo_qua: 'meta quá lớn', _bytes: raw.length };
  } catch {
    meta = {};
  }

  const row = {
    user_id: user.id,
    email: user.email ?? null,
    kind,
    message,
    page_url: cut(body.page_url, CAP_URL),
    // User-Agent lấy từ HEADER, không nhận bản client tự khai.
    user_agent: cut(req.headers.get('user-agent'), CAP_UA),
    tool_id: cut(body.tool_id, CAP_TOOL),
    meta,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_feedback`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    console.error('[feedback POST] insert', res.status, await res.text());
    return NextResponse.json({ error: 'Không lưu được góp ý. Xin thử lại.' }, { status: 502 });
  }
  const saved = (await res.json())[0] || null;

  // Báo Telegram — best-effort, KHÔNG chặn phản hồi cho người gửi. Có
  // console.error bên trong alert nên không phải catch rỗng.
  alertNewFeedback({
    email: user.email ?? '',
    kind,
    message,
    pageUrl: row.page_url,
  }).catch((e) => console.error('[feedback POST] alert', e));

  return NextResponse.json({ ok: true, item: saved });
}
