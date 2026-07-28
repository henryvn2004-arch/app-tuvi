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

    const evType = (e: Ev) => s(e.type || e.event_type, 40) || '';
    const rows = rawEvents.slice(0, 30).map((e) => {
      const t = evType(e);
      return {
        event_type: ALLOWED.has(t) ? t : 'other',
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

    // Snapshot attribution khi có sự kiện auth (login/signup).
    if (userId) {
      const authEvt = rawEvents.find((e) => {
        const t = evType(e);
        return t === 'login' || t === 'signup';
      });
      if (authEvt) await upsertAttribution(sb, userId, createdAt, authEvt);
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
): Promise<void> {
  try {
    const { data: existing } = await sb
      .from('user_attribution').select('user_id').eq('user_id', userId).maybeSingle();

    const first = (e.first && typeof e.first === 'object' ? e.first : {}) as Ev;
    const now = new Date().toISOString();

    if (existing) {
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
