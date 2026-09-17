// app/api/luan-giai/resend-pdf/route.ts
// ============================================================
// "Gửi lại PDF" — nút ở tab Lịch Sử (Lá Số) trên profile/tài khoản, cho lá số
// ĐÃ luận giải xong TRƯỚC ĐÓ (có thể vài ngày/tuần trước), không phải ngay
// sau khi vừa sinh xong như `email-pdf/route.ts`. Khác route đó ở CHỖ LẤY
// NỘI DUNG: route đó nhận `phans` client gửi kèm (vừa hiển thị xong, còn
// trong bộ nhớ trình duyệt) — route NÀY không có nguồn đó (mở lại trang sau
// nhiều ngày, browser không còn state), nên đọc thẳng `laso_public.luan_giai`
// (đã tự lưu mỗi lượt sinh xong, xem `app/api/save-laso/route.ts`). KHÔNG gọi
// lại LLM/engine — đúng luật "route không tính lại", chỉ đổi NGUỒN đọc.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromSupabaseToken } from '@/lib/admin/auth';
import { sendTransactionalEmail } from '@/lib/email/send';
import { renderLuanGiaiPdf, TOOL_META, type LuanGiaiToolId } from '@/lib/pdf/luan-giai';
import { buildPhans } from '@/lib/pdf/phan-labels';
import { getOrCreateReportToken } from '@/lib/pdf/report-link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// 🔑 Slug của 2 tool CÓ nút "Gửi lại PDF" phân biệt bằng TIỀN TỐ (xem
// `makeLasoSlug`, lib/engine/laso.ts): chu-trinh-cuoc-doi luôn có tiền tố
// riêng; laso (kể cả trang 24-phần CŨ đã retire) luôn KHÔNG tiền tố. Slug của
// tool khác lưu chung bảng `laso_public` (Bát Tự `tu-binh-*`, Vận Hạn Năm
// `van-han-nam-al*`) bị loại rõ ràng — không có nút này, tránh dựng nhầm PDF
// "Luận Giải Tử Vi" từ nội dung Bát Tự (khoá phần trùng số nhưng khác ý nghĩa
// hoàn toàn giữa các tool).
function classifySlug(slug: string): LuanGiaiToolId | null {
  if (slug.startsWith('chu-trinh-cuoc-doi-')) return 'chu-trinh-cuoc-doi';
  if (slug.startsWith('tu-binh-') || slug.startsWith('van-han-nam-al')) return null;
  return 'laso';
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUserFromSupabaseToken(token);
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }
  const slug = String(body.slug || '').trim();
  if (!slug) return NextResponse.json({ error: 'Thiếu slug' }, { status: 400 });

  const toolId = classifySlug(slug);
  if (!toolId) return NextResponse.json({ error: 'Lá số này không hỗ trợ gửi lại PDF' }, { status: 400 });

  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: row } = await sb.from('laso_public')
    .select('slug, user_id, person_name, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh, gio_chi, luan_giai')
    .eq('slug', slug).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Không tìm thấy lá số' }, { status: 404 });
  // Chỉ chủ sở hữu ĐÃ GẮN (user_id) mới gửi lại được — chặt hơn hẳn
  // `/api/history?action=laso` (chỉ đòi ĐĂNG NHẬP, không đối chiếu user_id)
  // vì route đó phục vụ modal "Xem Lại" công khai trong phiên, còn route này
  // GỬI EMAIL thật, không thể để user A bấm gửi email của user B.
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'Bạn không sở hữu lá số này' }, { status: 403 });
  }

  const phans = buildPhans(row.luan_giai as Record<string, unknown> | null)
    .map((p) => ({ title: p.title, text: p.text.slice(0, 50_000) }));
  if (!phans.length) {
    return NextResponse.json({ error: 'Chưa có nội dung luận giải nào được lưu cho lá số này' }, { status: 400 });
  }

  const hoTen = row.person_name ? String(row.person_name) : '';
  const ngaySinh = [row.ngay_sinh, row.thang_sinh, row.nam_sinh].every((v) => v != null)
    ? `${row.ngay_sinh}/${row.thang_sinh}/${row.nam_sinh}${row.gio_chi ? ', giờ ' + row.gio_chi : ''}`
    : '';
  const toolLabel = TOOL_META[toolId].title;

  try {
    const pdfBuffer = await renderLuanGiaiPdf({
      toolId, hoTen, ngaySinh,
      gioiTinh: row.gioi_tinh ? String(row.gioi_tinh) : '',
      phans,
    });

    // Khoá chống trùng theo NGÀY (không theo nội dung như `email-pdf`): đây
    // là hành động "gửi lại" chủ động của user, có thể diễn ra nhiều lần cách
    // nhau vài ngày với NỘI DUNG Y HỆT (lá số không đổi) — khoá theo nội dung
    // sẽ khoá CỨNG resend lần 2 trở đi mãi mãi (bug thật: user bấm "gửi lại",
    // tưởng đã gửi, không có gì tới hộp thư). Khoá theo ngày vẫn chặn được
    // double-click/spam-click trong cùng một ngày, đúng mẫu dedupeKey
    // `crosssell-<user>-<tool>-<yyyy-mm-dd>` đã có sẵn (lib/email/send.ts).
    const dayBucket = new Date().toISOString().slice(0, 10);

    // Link xem báo cáo trực tuyến (magic link, không cần đăng nhập) — best-
    // effort: lỗi sinh token KHÔNG được chặn việc gửi PDF, đính kèm mới là
    // giá trị chính của email này. Thiếu token thì email vẫn gửi, chỉ thiếu
    // dòng link.
    let viewOnlineHtml = '';
    try {
      const linkToken = await getOrCreateReportToken(slug, toolId, user.id);
      const viewUrl = `https://tuviminhbao.com/ket-qua-laso/${linkToken}`;
      viewOnlineHtml = `<p><a href="${viewUrl}">Xem báo cáo trực tuyến →</a> (không cần đăng nhập, mở trên bất kỳ thiết bị nào)</p>`;
    } catch (e) {
      console.error('[luan-giai/resend-pdf] lỗi sinh report token', e);
    }

    const result = await sendTransactionalEmail({
      dedupeKey: `resend-pdf-luan-giai-${toolId}-${user.id}-${slug}-${dayBucket}`,
      template: 'luan-giai-pdf-resend',
      to: user.email,
      subject: `PDF ${toolLabel}${hoTen ? ' — ' + hoTen : ''} — Tử Vi Minh Bảo`,
      html: `<p>Gửi lại bạn bản PDF ${toolLabel.toLowerCase()}${hoTen ? ' của <b>' + hoTen + '</b>' : ''} — đính kèm trong email này.</p>
${viewOnlineHtml}
<p style="font-size:12px;color:#888">Bạn luôn xem lại bản đầy đủ trên tài khoản tại <a href="https://tuviminhbao.com/app">tuviminhbao.com/app</a>.</p>`,
      userId: user.id,
      attachments: [{ filename: `${toolId}-tu-vi-minh-bao.pdf`, content: pdfBuffer.toString('base64') }],
    });

    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.reason === 'duplicate' ? 200 : 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[luan-giai/resend-pdf] lỗi dựng/gửi PDF', e);
    return NextResponse.json({ error: 'Không tạo được PDF' }, { status: 500 });
  }
}
