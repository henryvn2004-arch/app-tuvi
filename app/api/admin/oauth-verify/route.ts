// app/api/admin/oauth-verify/route.ts
// Xác nhận access_token nhận được từ redirect Google OAuth (GoTrue implicit
// flow — /auth/v1/authorize?provider=google trả token thẳng trong URL hash,
// không qua server) thuộc về 1 tài khoản trong admin_users. Vì bước đăng
// nhập Google xảy ra HOÀN TOÀN giữa trình duyệt/Google/Supabase, server chỉ
// vào cuộc SAU KHI trình duyệt đã có token, để: xác nhận email được phép +
// bắn cảnh báo Telegram/WhatsApp giống hệt luồng password.
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { getAdminUser, getUserFromSupabaseToken } from '@/lib/admin/auth';
import { alertAdminLogin } from '@/lib/admin/alert';

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
  const token = String(body.access_token || '').trim();
  const ip = clientIp(request);
  if (!token) return err('Thiếu access_token', 400);

  const user = await getUserFromSupabaseToken(token);
  const email = user?.email || '';
  if (!user || !email) {
    await alertAdminLogin(false, '(Google — token không hợp lệ)', ip);
    return err('Token không hợp lệ', 401);
  }

  const admin = await getAdminUser(email);
  if (!admin) {
    await alertAdminLogin(false, email, ip, 'đăng nhập Google nhưng không phải admin');
    return err('Không có quyền admin.', 403);
  }

  await alertAdminLogin(true, email, ip, 'qua Google');
  return ok({ email, admin_role: admin.role, admin_team: admin.team });
}
