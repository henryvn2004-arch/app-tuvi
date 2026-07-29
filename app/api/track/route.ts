// app/api/track/route.ts
// Beacon nhận sự kiện hành vi (ẩn danh + đã đăng nhập) → bảng events.
// Nền tảng cho funnel marketing: traffic source → visit → signup → paid → return.
//   • Ẩn danh: KHÔNG cần auth (page_view của khách vãng lai).
//   • Có Authorization token → gắn user_id; nếu là lần đầu thấy user (chưa có dòng
//     user_attribution) → snapshot attribution first-touch + phát event 'signup'.
// Ghi bằng service key (bypass RLS). Beacon KHÔNG bao giờ ném lỗi ra client.
// Xem _patches/migration-events-tracking.sql.
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ok, options, parseBody } from '@/lib/cors';
import { checkTrackRate } from '@/lib/ops/rate-limit';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// Allowlist loại sự kiện — ngoài danh sách ghi thành 'other' để tránh rác.
// share_view/referral_signup: các mắt xích vòng lặp viral (V2.4) — người MỞ link
// chia sẻ, và lượt giới thiệu được ghi nhận. referral_signup do server tự ghi
// (app/api/payment referral-register), có mặt ở đây để client không bị coi là rác
// nếu sau này cần bắn thêm.
const ALLOWED = new Set([
  'page_view', 'tool_open', 'tool_run', 'tool_result', 'chat_msg',
  'signup', 'login', 'topup_start', 'topup_success', 'share', 'cta_click',
  'share_view', 'referral_signup',
  // Tải ảnh 9:16 để đăng Story/TikTok (V3). CỐ Ý là loại RIÊNG, không gộp vào
  // 'share': phễu Vòng Lặp Viral đếm 'share' làm mẫu số của K-factor, mà ảnh
  // tải về không mang link bấm được nên không bao giờ sinh ra share_view/
  // cta_click tương ứng — nhét chung vào chỉ làm K tụt giả.
  'poster_download',
]);

// Coi là "vừa đăng ký" nếu tài khoản tạo trong 15 phút gần đây (né tính nhầm
// user cũ đăng nhập lại sau khi hệ thống tracking mới bật thành signup mới).
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

// Bot TỰ KHAI qua User-Agent. Độ chính xác cao / độ phủ thấp CÓ CHỦ ĐÍCH: bot
// giả dạng trình duyệt thật không bị bắt ở đây, và đó là chuyện bình thường —
// chúng rơi vào bucket 'drive_by' của RPC traffic_quality(). Mẫu này chỉ lo
// phần dễ và chắc, để phần khó cho phân tích hành vi.
//
// "bot" phải kèm dấu phân cách phía sau (`bot/`, `bot;`, `bot)`, `bot ` hoặc
// cuối chuỗi) chứ không bắt như chuỗi con tự do: Googlebot/2.1 khớp, nhưng
// không kéo theo mọi từ có chứa "bot". Các tên không chứa "bot" phải liệt kê
// riêng.
const BOT_UA =
  /(?:bot[/;)\s]|bot$|crawler|spider|slurp|headlesschrome|phantomjs|puppeteer|playwright|python-requests|scrapy|curl\/|wget\/|go-http-client|node-fetch|okhttp|java\/|libwww|ahrefs|semrush|mj12|lighthouse|pingdom|perplexity|facebookexternalhit)/i;

// CUBOT là hãng điện thoại Android CÓ THẬT, User-Agent của nó chứa "CUBOT " —
// dính đúng nhánh "bot + khoảng trắng" ở trên. Người dùng thật bị gắn nhãn bot
// là kiểu sai tệ nhất ở đây, nên loại trừ tường minh.
const BOT_UA_EXCEPTION = /cubot/i;

function looksLikeBot(ua: string): boolean {
  if (!ua) return false; // thiếu UA thì để traffic_quality phân xử, không đoán bừa
  return BOT_UA.test(ua) && !BOT_UA_EXCEPTION.test(ua);
}

function s(v: unknown, n = 300): string | null {
  if (v == null) return null;
  const str = String(v).slice(0, n);
  return str || null;
}

type Ev = Record<string, unknown>;

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  try {
    const b = (await parseBody(request)) as Record<string, unknown>;
    const rawEvents: Ev[] = Array.isArray(b.events) ? (b.events as Ev[]) : [b];
    if (!rawEvents.length) return ok({ ok: true, n: 0 });

    // S6 — chặn bơm sự kiện. Danh tính lấy theo anon_id (ổn định giữa các
    // request của cùng trình duyệt); không có thì rơi về IP. CỐ Ý ưu tiên
    // anon_id: nhiều người Việt dùng chung IP nhà mạng/CGNAT, khoá theo IP là
    // vạ lây cả một khu.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const identity = s(rawEvents[0]?.anon_id, 64) || `ip:${ip}`;
    const verdict = await checkTrackRate(identity, Math.min(rawEvents.length, 30));
    if (!verdict.allowed) {
      // Trả `ok` chứ KHÔNG phải 429: đây là beacon, client dùng sendBeacon và
      // không đọc phản hồi. Trả lỗi chỉ tổ làm bẩn console của người dùng thật
      // bị chặn nhầm, mà không ngăn thêm được gì. Việc cần làm là ghi log để
      // `security_audit()` và panel Bảo Mật nhìn thấy.
      console.warn(`[track] vuot nguong: ${identity} — ${verdict.count}/${verdict.limit} event/phut`);
      return ok({ ok: true, n: 0, throttled: true });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Giải mã user (tùy chọn) — beacon ẩn danh vẫn ghi được.
    let userId: string | null = null;
    let createdAt: string | null = null;
    const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim();
    if (token) {
      const { data } = await sb.auth.getUser(token);
      userId = data?.user?.id || null;
      createdAt = data?.user?.created_at || null;
    }

    // ĐÁNH DẤU, KHÔNG CHẶN. Vẫn ghi đủ mọi lượt kể cả bot đã nhận diện: luật
    // phân loại chắc chắn còn phải chỉnh, mà dữ liệu đã vứt thì không lấy lại
    // được. Có cờ thì sửa luật xong chạy lại là ra số mới.
    const ua = request.headers.get('user-agent') || '';
    const isBot = looksLikeBot(ua);

    const evType = (e: Ev) => s(e.type || e.event_type, 40) || '';
    const rows = rawEvents.slice(0, 30).map((e) => {
      const t = evType(e);
      return {
        event_type: ALLOWED.has(t) ? t : 'other',
        ua: s(ua, 400),
        is_bot: isBot,
        anon_id: s(e.anon_id, 64),
        user_id: userId,
        session_id: s(e.session_id, 64),
        platform: s(e.platform, 20) || 'web',
        tool_id: s(e.tool_id, 60),
        slug: s(e.slug, 200),
        path: s(e.path, 300),
        referrer: s(e.referrer, 400),
        utm_source: s(e.utm_source, 120),
        utm_medium: s(e.utm_medium, 120),
        utm_campaign: s(e.utm_campaign, 160),
        utm_term: s(e.utm_term, 160),
        utm_content: s(e.utm_content, 160),
        meta: e.meta && typeof e.meta === 'object' ? e.meta : null,
      };
    });

    await sb.from('events').insert(rows);

    // Snapshot attribution. CỐ Ý xét MỌI event đã đăng nhập, không chỉ
    // 'login'/'signup': trước đây chỉ nhận đúng 2 loại đó, mà chúng chỉ bắn
    // được ở trang có nạp track.js — đăng nhập ở trang khác là user vĩnh viễn
    // KHÔNG có dòng attribution, và bậc "đăng ký" của mọi dashboard đọc thành 0
    // trong im lặng (đúng chuyện đã xảy ra với tài khoản 24/7). Mọi event đều
    // mang sẵn `first` (first-touch client lưu 1 lần) nên dữ liệu ghi vào y hệt.
    // Last-touch vẫn CHỈ cập nhật ở event auth thật: nó có nghĩa là "lần gần
    // nhất kênh nào đưa họ quay lại", đạp lại nó mỗi lần bắn beacon là biến mọi
    // user thành last-touch nội bộ.
    if (userId) {
      const authEvt = rawEvents.find((e) => {
        const t = evType(e);
        return t === 'login' || t === 'signup';
      });
      await upsertAttribution(sb, userId, createdAt, authEvt || rawEvents[0], !!authEvt);
    }

    return ok({ ok: true, n: rows.length });
  } catch (e: unknown) {
    console.error('[track] exception', e);
    return ok({ ok: false }); // beacon không được làm hỏng luồng client
  }
}

async function upsertAttribution(
  sb: SupabaseClient,
  userId: string,
  createdAt: string | null,
  e: Ev,
  /** Batch có event 'login'/'signup' thật hay không — quyết định có đụng last-touch. */
  isAuthEvent: boolean,
): Promise<void> {
  try {
    const { data: existing } = await sb
      .from('user_attribution').select('user_id').eq('user_id', userId).maybeSingle();

    const first = (e.first && typeof e.first === 'object' ? e.first : {}) as Ev;
    const now = new Date().toISOString();

    if (existing) {
      if (!isAuthEvent) return; // đã có dòng, không phải lượt đăng nhập → không cần ghi gì
      // Đã có → chỉ cập nhật last-touch.
      await sb.from('user_attribution').update({
        last_utm_source: s(e.utm_source, 120),
        last_utm_medium: s(e.utm_medium, 120),
        last_utm_campaign: s(e.utm_campaign, 160),
        last_referrer: s(e.referrer, 400),
        last_landing_path: s(e.path, 300),
        updated_at: now,
      }).eq('user_id', userId);
      return;
    }

    // Lần đầu thấy user → ghi first-touch. signup_at = created_at thật của tài khoản.
    const signupAt = createdAt || now;
    await sb.from('user_attribution').insert({
      user_id: userId,
      anon_id: s(e.anon_id, 64),
      first_utm_source: s(first.utm_source, 120),
      first_utm_medium: s(first.utm_medium, 120),
      first_utm_campaign: s(first.utm_campaign, 160),
      first_utm_term: s(first.utm_term, 160),
      first_utm_content: s(first.utm_content, 160),
      first_referrer: s(first.referrer, 400),
      first_landing_path: s(first.landing_path, 300),
      first_seen_at: first.seen_at ? new Date(String(first.seen_at)).toISOString() : signupAt,
      last_utm_source: s(e.utm_source, 120),
      last_utm_medium: s(e.utm_medium, 120),
      last_utm_campaign: s(e.utm_campaign, 160),
      last_referrer: s(e.referrer, 400),
      last_landing_path: s(e.path, 300),
      signup_at: signupAt,
      updated_at: now,
    });

    // Chỉ phát event 'signup' cho tài khoản thật sự mới (né user cũ đăng nhập lại).
    const isFresh = createdAt ? Date.now() - new Date(createdAt).getTime() < SIGNUP_WINDOW_MS : true;
    if (isFresh) {
      await sb.from('events').insert({
        event_type: 'signup',
        user_id: userId,
        anon_id: s(e.anon_id, 64),
        session_id: s(e.session_id, 64),
        platform: 'web',
        utm_source: s(first.utm_source, 120),
        utm_medium: s(first.utm_medium, 120),
        utm_campaign: s(first.utm_campaign, 160),
        referrer: s(first.referrer, 400),
        path: s(first.landing_path, 300),
      });
    }
  } catch (err) {
    console.error('[track] attribution', err);
  }
}
