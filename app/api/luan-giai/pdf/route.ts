// app/api/luan-giai/pdf/route.ts
// ============================================================
// Tải PDF luận giải bằng FILE THẬT dựng ở server — cho trình duyệt NHÚNG trong
// app (Zalo, Facebook/Messenger, Instagram…), nơi `window.print()` là no-op im
// lặng: bấm nút "Lưu PDF" không ra gì (Henry báo 2026-09-30, mở từ Zalo).
// Trình duyệt thường vẫn đi `window.print()` (bìa sách + ảnh, shell.js).
//
// Hai bước, vì trình duyệt nhúng chỉ mở được file bằng ĐIỀU HƯỚNG (không gắn
// được header Authorization, blob URL thì webview Android không tải được):
//   1. POST {slug} + Bearer → kiểm ĐÃ TRẢ TIỀN (lib/pdf/paid-reports.ts, cùng
//      cổng với "Gửi về Zalo") → trả link GET ký HMAC, sống PDF_LINK_TTL_SEC.
//   2. GET ?s&u&e&k → kiểm chữ ký + hạn → dựng PDF, trả `inline` để webview
//      iOS hiện thẳng file (từ đó khách chia sẻ/lưu bằng menu của app).
// Nội dung đọc `laso_public.luan_giai` — KHÔNG gọi lại LLM/engine.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getUserFromSupabaseToken } from '@/lib/admin/auth';
import { listPaidReports, paidReportPdf } from '@/lib/pdf/paid-reports';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const PDF_LINK_TTL_SEC = 15 * 60;
const KEY = process.env.SUPABASE_SERVICE_KEY || '';

function sign(slug: string, uid: string, exp: number): string {
  return createHmac('sha256', KEY).update(`luan-giai-pdf|${slug}|${uid}|${exp}`).digest('base64url');
}

function sigOk(slug: string, uid: string, exp: number, sig: string): boolean {
  const want = Buffer.from(sign(slug, uid, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

export async function POST(req: NextRequest) {
  if (!KEY) return NextResponse.json({ error: 'Chưa cấu hình' }, { status: 500 });
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUserFromSupabaseToken(token);
  if (!user?.id) return NextResponse.json({ error: 'Bạn cần đăng nhập' }, { status: 401 });

  let slug = '';
  try {
    slug = String(((await req.json()) as { slug?: string }).slug || '').trim();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: 'Thiếu slug' }, { status: 400 });

  const report = (await listPaidReports(user.id)).find((r) => r.slug === slug);
  if (!report) {
    return NextResponse.json({ error: 'Bản này chưa lưu xong hoặc chưa được mua trên tài khoản của bạn', code: 'not_ready' }, { status: 404 });
  }

  const exp = Math.floor(Date.now() / 1000) + PDF_LINK_TTL_SEC;
  const q = new URLSearchParams({ s: slug, u: user.id, e: String(exp), k: sign(slug, user.id, exp) });
  return NextResponse.json({ ok: true, url: `/api/luan-giai/pdf?${q.toString()}` });
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const slug = p.get('s') || '';
  const uid = p.get('u') || '';
  const exp = Number(p.get('e') || 0);
  const sig = p.get('k') || '';
  const text = (msg: string, status: number) =>
    new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

  if (!KEY || !slug || !uid || !exp || !sig || !sigOk(slug, uid, exp, sig)) return text('Link không hợp lệ.', 403);
  if (exp < Date.now() / 1000) return text('Link đã hết hạn — quay lại trang luận giải và bấm Lưu PDF lần nữa.', 410);

  const report = (await listPaidReports(uid)).find((r) => r.slug === slug);
  if (!report) return text('Không tìm thấy bản luận giải.', 404);

  try {
    const pdf = await paidReportPdf(report);
    return new Response(new Uint8Array(pdf.data), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="${pdf.filename}"`,
        'cache-control': 'private, no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  } catch (e) {
    console.error('[luan-giai/pdf] lỗi dựng PDF', e);
    return text('Không tạo được PDF, thử lại sau ít phút.', 500);
  }
}
