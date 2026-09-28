// app/api/channels/send-pdf/route.ts
// ============================================================
// Nút "Gửi về Zalo" trên trang Báo cáo: gửi bản PDF luận giải ĐÃ TRẢ TIỀN vào
// (các) kênh chat đã gắn với tài khoản (Zalo/Messenger/WhatsApp/Telegram).
// Cổng quyền là THANH TOÁN (lib/pdf/paid-reports.ts), không phải `user_id` của
// dòng laso_public — PDF chỉ gồm các phần người này đã mua.
// Nền tảng chỉ cho OA/Page nhắn trong khung 24–48h kể từ tin cuối của khách ⇒
// ngoài khung thì báo khách nhắn OA một câu trước rồi bấm lại.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSupabaseToken } from '@/lib/admin/auth';
import { listPaidReports, paidReportPdf } from '@/lib/pdf/paid-reports';
import { sendFileToUserChats } from '@/lib/channels/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
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
  if (!report) return NextResponse.json({ error: 'Bản này chưa được mua trên tài khoản của bạn' }, { status: 403 });

  try {
    const pdf = await paidReportPdf(report);
    const r = await sendFileToUserChats(user.id, pdf.data, pdf.filename, `Bản PDF ${report.label} — lưu lại để đọc dần nhé.`);
    if (!r.linked) {
      return NextResponse.json(
        { error: 'Tài khoản chưa kết nối Zalo. Vào Tài khoản → Kết nối để gắn Zalo, rồi bấm lại.', code: 'no_chat' },
        { status: 409 },
      );
    }
    if (!r.sent.length) {
      return NextResponse.json(
        { error: 'Zalo chưa nhận tin — bạn nhắn OA một câu bất kỳ trước rồi bấm lại nhé.', code: 'outside_window' },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, sent: r.sent });
  } catch (e) {
    console.error('[channels/send-pdf] lỗi dựng/gửi PDF', e);
    return NextResponse.json({ error: 'Không tạo được PDF' }, { status: 500 });
  }
}
