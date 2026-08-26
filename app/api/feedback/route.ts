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
const RATINGS = new Set(['up', 'down']);
const SOURCES = new Set(['account', 'reading']);

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

  // CHỈ liệt kê những dòng CÓ CHỮ. Lá phiếu trần vẫn được ghi (và vẫn vào bảng
  // xếp hạng của admin) nhưng không hiện ở đây: người bấm 👍 năm bản luận giải
  // không muốn thấy năm dòng trống trong "Góp ý đã gửi" của mình.
  const url =
    `${SUPABASE_URL}/rest/v1/user_feedback` +
    `?user_id=eq.${encodeURIComponent(user.id)}` +
    `&message=not.is.null` +
    `&select=id,kind,message,rating,source,tool_id,status,admin_reply,replied_at,created_at` +
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

  // Lá phiếu 👍/👎 từ nút dưới bản luận giải: KHÔNG bắt buộc kèm chữ. Một cú
  // bấm trần vẫn là tín hiệu — và là loại đông nhất. Bắt phải gõ gì đó là mất
  // gần hết chúng.
  const ratingRaw = String(body.rating ?? '');
  const rating = RATINGS.has(ratingRaw) ? ratingRaw : null;
  const sourceRaw = String(body.source ?? 'account');
  const source = SOURCES.has(sourceRaw) ? sourceRaw : 'account';

  if (!rating && message.length < 5) {
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
  // Lá phiếu trần (không kèm chữ) KHÔNG tiêu trần: chúng đã bị chặn bởi mốc
  // một-người-một-phiếu dưới đây, mà đếm chúng vào trần thì đúng người dùng
  // tích cực nhất lại bị khoá mất ô góp ý viết tay.
  if (message.length >= 5) try {
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

  const pageUrl = cut(body.page_url, CAP_URL);
  const toolId = cut(body.tool_id, CAP_TOOL);

  const row = {
    user_id: user.id,
    email: user.email ?? null,
    kind,
    // Rỗng thì ghi NULL, không ghi chuỗi rỗng: ràng buộc
    // `user_feedback_nonempty_chk` phân biệt hai thứ đó.
    message: message.length >= 5 ? message : null,
    rating,
    source,
    page_url: pageUrl,
    // User-Agent lấy từ HEADER, không nhận bản client tự khai.
    user_agent: cut(req.headers.get('user-agent'), CAP_UA),
    tool_id: toolId,
    meta,
  };

  // MỘT người, MỘT bản luận giải ⇒ MỘT lá phiếu. Đổi ý thì GHI ĐÈ lá cũ, đừng
  // đẻ dòng mới — nếu không, bấm đi bấm lại (hay tải lại trang rồi bấm tiếp)
  // thổi phồng đúng con số dùng để xếp hạng tool. DB có chỉ mục duy nhất riêng
  // phần chặn ở lớp dưới; đây là đường đi êm để người dùng không ăn lỗi 409.
  //
  // Tra-rồi-ghi KHÔNG nguyên tử. Đua thì lượt thua ăn 409 từ chỉ mục kia —
  // đúng cái ta muốn (không có dòng trùng), chỉ là thông báo xấu hơn. Không
  // đáng đổi lấy thêm một SECURITY DEFINER nữa.
  let existingId: number | null = null;
  if (rating && source === 'reading' && toolId) {
    try {
      const q =
        `${SUPABASE_URL}/rest/v1/user_feedback?select=id` +
        `&user_id=eq.${encodeURIComponent(user.id)}` +
        `&tool_id=eq.${encodeURIComponent(toolId)}` +
        `&source=eq.reading&rating=not.is.null` +
        `&page_url=${pageUrl ? 'eq.' + encodeURIComponent(pageUrl) : 'is.null'}` +
        `&limit=1`;
      const r = await fetch(q, { cache: 'no-store', headers: SB_HEADERS });
      if (r.ok) existingId = (await r.json())[0]?.id ?? null;
      else console.error('[feedback POST] tra lá phiếu cũ', r.status, await r.text());
    } catch (e) {
      console.error('[feedback POST] tra lá phiếu cũ ném lỗi', e);
    }
  }

  const res = existingId
    ? await fetch(`${SUPABASE_URL}/rest/v1/user_feedback?id=eq.${existingId}`, {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        // Giữ nguyên `status`/`admin_reply` của dòng cũ — người dùng đổi lá
        // phiếu không được xoá phần việc admin đã làm trên dòng đó.
        body: JSON.stringify({
          rating: row.rating, message: row.message, kind: row.kind,
          user_agent: row.user_agent, meta: row.meta,
        }),
      })
    : await fetch(`${SUPABASE_URL}/rest/v1/user_feedback`, {
        method: 'POST',
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
  if (!res.ok) {
    console.error('[feedback POST] ghi', res.status, await res.text());
    return NextResponse.json({ error: 'Không lưu được góp ý. Xin thử lại.' }, { status: 502 });
  }
  const saved = (await res.json())[0] || null;

  // Báo Telegram — best-effort, KHÔNG chặn phản hồi cho người gửi. Có
  // console.error bên trong alert nên không phải catch rỗng.
  //
  // CHỈ báo khi có CHỮ. Lá phiếu trần là loại đông nhất; dội mỗi cú bấm 👍 vào
  // Telegram là cách chắc chắn nhất để Henry tắt thông báo, và lúc đó mất luôn
  // tin về những góp ý thật sự cần đọc. Phiếu trần đã có huy hiệu + panel
  // trong admin.
  if (row.message) {
    alertNewFeedback({
      email: user.email ?? '',
      kind,
      message: row.message,
      pageUrl: row.page_url,
      rating,
      toolId,
    }).catch((e) => console.error('[feedback POST] alert', e));
  }

  return NextResponse.json({ ok: true, item: saved });
}
