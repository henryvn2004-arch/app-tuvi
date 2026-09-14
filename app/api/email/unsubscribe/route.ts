// app/api/email/unsubscribe/route.ts
// ============================================================
// Cửa "Huỷ nhận email" — công khai, KHÔNG cần đăng nhập (link nằm trong
// email, người bấm chưa chắc còn phiên trên máy đó). Xác thực bằng token
// ký ở `lib/email/unsub-token.ts` — cùng một nguồn với nơi dựng link.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubToken } from '@/lib/email/unsub-token';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function page(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="vi"><meta charset="utf-8"><title>${title}</title>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;text-align:center;color:#222">
<h1 style="font-size:20px">${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  const sig = req.nextUrl.searchParams.get('sig') || '';

  if (!email || !verifyUnsubToken(email, sig)) {
    return page('Liên kết không hợp lệ', 'Liên kết huỷ nhận email này đã hỏng hoặc hết hạn.', 400);
  }

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/email_unsubscribes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ email, unsubscribed_at: new Date().toISOString() }),
      });
    } catch {
      return page('Có lỗi xảy ra', 'Không huỷ được lúc này, thử lại sau ít phút.', 500);
    }
  }

  return page(
    'Đã huỷ nhận email',
    `Địa chỉ <b>${escapeHtml(email)}</b> sẽ không nhận thêm email quảng bá từ Tử Vi Minh Bảo.`,
  );
}
