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
import { renderLuanGiaiPdf, type LuanGiaiToolId } from '@/lib/pdf/luan-giai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const TOOL_LABEL: Record<LuanGiaiToolId, string> = {
  laso: 'Luận Giải Lá Số',
  'chu-trinh-cuoc-doi': 'Chu Trình Cuộc Đời',
};

// Nhãn phần — PORT NGUYÊN VĂN từ `PHAN_LABELS` (public/account-core.js), nơi
// tab "Xem Lại" của trang này đang dùng để vẽ modal. Hai bản phải khớp nhau —
// đổi một bên thì đổi bên kia, không có cách nào bắt lệch bằng type-check vì
// một bên là JS trình duyệt.
const PHAN_LABELS: Record<string, string> = {
  '1': 'Tổng Quan', '2': 'Cung Mệnh', '3': 'Tâm Tính', '4': 'Học Vấn',
  '5': 'Phụ Mẫu', '6': 'Phúc Đức', '7': 'Điền Trạch', '8': 'Quan Lộc',
  '9': 'Nô Bộc', '10': 'Thiên Di', '11': 'Tật Ách', '12': 'Tài Bạch',
  '13': 'Tử Tức', '14': 'Phu Thê', '15': 'Huynh Đệ', '16': 'Đại Vận',
  '17': 'Tiểu Hạn', '18': 'Lưu Niên', '19': 'Cách Cục', '20': 'Sự Nghiệp',
  '21': 'Tình Cảm', '22': 'Sức Khoẻ', '23': 'Tài Lộc', '24': 'Vận Mệnh',
};

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

  const luanGiai = (row.luan_giai as Record<string, unknown> | null) || {};
  const phans = Object.keys(luanGiai)
    .filter((k) => /^\d+$/.test(k) && PHAN_LABELS[k] && String(luanGiai[k] ?? '').trim())
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => ({ title: PHAN_LABELS[k], text: String(luanGiai[k]).slice(0, 50_000) }));
  if (!phans.length) {
    return NextResponse.json({ error: 'Chưa có nội dung luận giải nào được lưu cho lá số này' }, { status: 400 });
  }

  const hoTen = row.person_name ? String(row.person_name) : '';
  const ngaySinh = [row.ngay_sinh, row.thang_sinh, row.nam_sinh].every((v) => v != null)
    ? `${row.ngay_sinh}/${row.thang_sinh}/${row.nam_sinh}${row.gio_chi ? ', giờ ' + row.gio_chi : ''}`
    : '';
  const toolLabel = TOOL_LABEL[toolId];

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
    const result = await sendTransactionalEmail({
      dedupeKey: `resend-pdf-luan-giai-${toolId}-${user.id}-${slug}-${dayBucket}`,
      template: 'luan-giai-pdf-resend',
      to: user.email,
      subject: `PDF ${toolLabel}${hoTen ? ' — ' + hoTen : ''} — Tử Vi Minh Bảo`,
      html: `<p>Gửi lại bạn bản PDF ${toolLabel.toLowerCase()}${hoTen ? ' của <b>' + hoTen + '</b>' : ''} — đính kèm trong email này.</p>
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
