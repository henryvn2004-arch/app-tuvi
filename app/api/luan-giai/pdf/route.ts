// app/api/luan-giai/pdf/route.ts
// ============================================================
// Tải PDF luận giải bằng FILE THẬT dựng ở server — cho trình duyệt NHÚNG trong
// app (Zalo, Facebook/Messenger, Instagram…), nơi `window.print()` là no-op im
// lặng: bấm nút "Lưu PDF" không ra gì (Henry báo 2026-09-30, mở từ Zalo).
// Trình duyệt thường vẫn đi `window.print()` (bìa sách + ảnh, shell.js).
//
// Hai bước (link ký — lib/pdf/signed-link.ts):
//   1. POST {slug} + Bearer → kiểm ĐÃ TRẢ TIỀN (lib/pdf/paid-reports.ts, cùng
//      cổng với "Gửi về Zalo") → trả link GET ký HMAC.
//   2. GET ?s&u&e&k → kiểm chữ ký + hạn → dựng PDF `inline`.
// Nội dung đọc `laso_public.luan_giai` — KHÔNG gọi lại LLM/engine.
// Công cụ khác (Vận Hạn 12 Tháng, …) đi /api/reports/pdf (bản chụp báo cáo).
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSupabaseToken } from '@/lib/admin/auth';
import { listPaidReports, paidReportPdf } from '@/lib/pdf/paid-reports';
import { pdfLinkReady, signPdfQuery, verifyPdfQuery, pdfResponse, textResponse } from '@/lib/pdf/signed-link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const SCOPE = 'luan-giai-pdf';

export async function POST(req: NextRequest) {
  if (!pdfLinkReady()) return NextResponse.json({ error: 'Chưa cấu hình' }, { status: 500 });
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
  return NextResponse.json({ ok: true, url: `/api/luan-giai/pdf?${signPdfQuery(SCOPE, slug, user.id)}` });
}

export async function GET(req: NextRequest) {
  const v = verifyPdfQuery(SCOPE, req.nextUrl.searchParams);
  if ('error' in v) return textResponse(v.error, v.status);

  const report = (await listPaidReports(v.uid)).find((r) => r.slug === v.ref);
  if (!report) return textResponse('Không tìm thấy bản luận giải.', 404);

  try {
    const pdf = await paidReportPdf(report);
    return pdfResponse(pdf.data, pdf.filename);
  } catch (e) {
    console.error('[luan-giai/pdf] lỗi dựng PDF', e);
    return textResponse('Không tạo được PDF, thử lại sau ít phút.', 500);
  }
}
