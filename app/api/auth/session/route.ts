// app/api/auth/session/route.ts
// Cookie phiên đặt TỪ SERVER (HttpOnly) để giữ đăng nhập bền trên Safari/iOS.
//
// Vì sao cần: auth.js lưu refresh_token vào cookie bằng document.cookie (JS-set).
// iOS Safari ITP giới hạn mọi storage do script ghi (localStorage + cookie JS)
// xuống ~7 ngày → user không vào lại trong 7 ngày sẽ bị đăng xuất. Cookie đặt qua
// HTTP Set-Cookie (HttpOnly) KHÔNG bị cap 7 ngày đó → phiên sống tới Max-Age thật.
//
// Luồng:
//   POST {refresh_token}  → lưu refresh_token vào cookie HttpOnly `tvmb_rt`.
//   GET                    → đọc cookie, gọi Supabase refresh (token XOAY vòng),
//                            ĐẶT LẠI cookie bằng refresh_token mới, trả session.
//   DELETE                 → xoá cookie (đăng xuất).
// Cookie riêng tên `tvmb_rt` (KHÔNG đụng cookie JS `tuvi_rt` cũ — giữ tương thích).
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { ok, err, options, parseBody, cors } from '@/lib/cors';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const COOKIE = 'tvmb_rt';
const MAX_AGE = 180 * 24 * 60 * 60; // 180 ngày

function setRt(res: NextResponse, token: string) {
  res.cookies.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}
function clearRt(res: NextResponse) {
  res.cookies.set({ name: COOKIE, value: '', httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function OPTIONS() {
  return options();
}

// Lưu refresh_token hiện tại vào cookie HttpOnly bền. Client gọi sau mỗi lần đăng
// nhập / refresh thành công. KHÔNG gọi Supabase ở đây (tránh tiêu token — refresh
// token của Supabase xoay vòng, dùng 1 lần).
export async function POST(request: NextRequest) {
  const b = (await parseBody(request)) as Record<string, unknown>;
  const rt = String(b.refresh_token || '').trim();
  const res = ok({ ok: true });
  if (rt) setRt(res, rt);
  return res;
}

// Refresh phiên từ cookie HttpOnly. Không có cookie / refresh lỗi → 401 + xoá cookie.
export async function GET(request: NextRequest) {
  const rt = request.cookies.get(COOKIE)?.value;
  if (!rt) return err('No session', 401);
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!r.ok) {
      const res = err('Refresh failed', 401);
      clearRt(res);
      return res;
    }
    const data = await r.json();
    const res = ok(data);
    // Refresh token đã xoay → lưu bản mới vào cookie.
    if (data.refresh_token) setRt(res, data.refresh_token);
    return res;
  } catch (e) {
    console.error('[auth/session] refresh exception', e);
    return err('Refresh error', 500);
  }
}

// Đăng xuất — xoá cookie.
export async function DELETE() {
  const res = cors(NextResponse.json({ ok: true }));
  clearRt(res);
  return res;
}
