// app/api/admin/login/route.ts
// Proxy đăng nhập Admin (email/password) qua server thay vì client gọi thẳng
// Supabase Auth, để: (1) mọi lượt thử — kể cả sai email/mật khẩu — đều bắn
// cảnh báo Telegram+WhatsApp cho admin; (2) IP + thời điểm log được từ header
// server. "Admin" nay tra bảng admin_users (nhiều người), không còn 1 email
// hardcode — xem lib/admin/auth.ts + _patches/migration-admin-users.sql.
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { getAdminUser } from '@/lib/admin/auth';
import { alertAdminLogin } from '@/lib/admin/alert';
import { countRecentFailures, logLoginAttempt } from '@/lib/admin/loginAttempts';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Ngưỡng chặn: theo IP lỏng hơn (nhiều người dùng chung mạng/NAT), theo email
// chặt hơn (đích danh 1 tài khoản bị dò). Cùng cửa sổ 15 phút.
const WINDOW_MINUTES = 15;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_PER_EMAIL = 5;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request);
  const email = String(body.email || '').trim();
  const password = String(body.password || '');
  const ip = clientIp(request);

  if (!email || !password) return err('Thiếu email/mật khẩu', 400);

  const [ipFails, emailFails] = await Promise.all([
    countRecentFailures('ip', ip, WINDOW_MINUTES),
    countRecentFailures('email', email.toLowerCase(), WINDOW_MINUTES),
  ]);
  if (ipFails >= MAX_FAILS_PER_IP || emailFails >= MAX_FAILS_PER_EMAIL) {
    // Log lại (không alert Telegram/WhatsApp mỗi lượt — tránh bị dội bom
    // thông báo khi có brute-force thật đang chạy).
    await logLoginAttempt({ email, ip, success: false, method: 'password', detail: 'rate limited' });
    return err('Quá nhiều lượt thử. Vui lòng thử lại sau ít phút.', 429);
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();

    if (!r.ok) {
      const detail = data?.error_description || 'sai mật khẩu';
      await Promise.allSettled([
        alertAdminLogin(false, email, ip, detail),
        logLoginAttempt({ email, ip, success: false, method: 'password', detail }),
      ]);
      return err(data?.error_description || 'Sai thông tin đăng nhập', r.status || 401);
    }
    const admin = await getAdminUser(email);
    if (!admin) {
      await Promise.allSettled([
        alertAdminLogin(false, email, ip, 'không phải tài khoản admin'),
        logLoginAttempt({ email, ip, success: false, method: 'password', detail: 'không phải tài khoản admin' }),
      ]);
      return err('Không có quyền admin.', 403);
    }

    await Promise.allSettled([alertAdminLogin(true, email, ip), logLoginAttempt({ email, ip, success: true, method: 'password' })]);
    return ok({ ...data, admin_role: admin.role, admin_team: admin.team });
  } catch (e) {
    console.error('[admin/login] exception', e);
    return err('Lỗi máy chủ', 500);
  }
}
