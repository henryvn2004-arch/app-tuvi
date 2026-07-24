// app/api/admin/login/route.ts
// Proxy đăng nhập Admin qua server (thay vì client gọi thẳng Supabase Auth) để:
//  (1) mọi lượt thử — kể cả sai email/mật khẩu — đều bắn cảnh báo Telegram cho
//      admin, cho biết ngay nếu có ai khác đang dò/login vào trang quản trị;
//  (2) IP + thời điểm được log từ header server (client không tự khai được).
export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { tgSendMessage } from '@/lib/channels/telegram';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tuviminhbao.com';
const ADMIN_TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

async function alertLogin(success: boolean, email: string, ip: string, reason?: string): Promise<void> {
  if (!ADMIN_TG_CHAT_ID) return;
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const text = success
    ? `✅ Đăng nhập Admin thành công\nIP: ${ip}\nLúc: ${time}`
    : `🚨 ĐĂNG NHẬP ADMIN THẤT BẠI\nEmail thử: ${email || '(trống)'}\nIP: ${ip}\nLúc: ${time}${reason ? `\nLý do: ${reason}` : ''}`;
  try {
    await tgSendMessage(ADMIN_TG_CHAT_ID, text);
  } catch {
    /* best-effort, không chặn luồng đăng nhập */
  }
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

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();

    if (!r.ok) {
      await alertLogin(false, email, ip, data?.error_description || 'sai mật khẩu');
      return err(data?.error_description || 'Sai thông tin đăng nhập', r.status || 401);
    }
    if (email !== ADMIN_EMAIL) {
      await alertLogin(false, email, ip, 'không phải tài khoản admin');
      return err('Không có quyền admin.', 403);
    }

    await alertLogin(true, email, ip);
    return ok(data);
  } catch (e) {
    console.error('[admin/login] exception', e);
    return err('Lỗi máy chủ', 500);
  }
}
