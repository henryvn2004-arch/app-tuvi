// app/api/admin/email-test/route.ts
// ============================================================
// Gửi 1 email test qua lib/email/send.ts tới CHÍNH email admin đang đăng nhập
// — dùng để xác nhận RESEND_API_KEY + domain đã cắm đúng trước khi wire vào
// tool thật (OTP/hoá đơn/PDF). Chỉ gửi tới admin đang gọi, không nhận `to` từ
// query — tránh biến route này thành cửa gửi email tuỳ ý.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser, getUserFromSupabaseToken } from '@/lib/admin/auth';
import { sendTransactionalEmail } from '@/lib/email/send';

export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUserFromSupabaseToken(token);
  if (!user?.email) return null;
  return getAdminUser(user.email);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const now = new Date().toISOString();
  const result = await sendTransactionalEmail({
    dedupeKey: `admin-email-test-${admin.email}-${Date.now()}`,
    template: 'admin-test',
    to: admin.email,
    subject: 'Test hạ tầng email — Tử Vi Minh Bảo',
    html: `<p>Email test gửi lúc ${now} qua <code>lib/email/send.ts</code> (Resend).</p>
<p>Nhận được email này nghĩa là <code>RESEND_API_KEY</code> + domain gửi transactional đã hoạt động.</p>`,
  });

  return NextResponse.json(result);
}
