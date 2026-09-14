// app/api/luan-giai/email-pdf/route.ts
// ============================================================
// "Gửi PDF qua email" — nút productize (xem plan 2026-09), dùng CHUNG cho cả
// 2 tool sinh nhiều phần: Luận Giải Tử Vi (laso, 13 phần, trang
// app-luan-giai.html) và Chu Trình Cuộc Đời (chu-trinh-cuoc-doi, 11 phần,
// app-chu-trinh-cuoc-doi.html) — cùng qua tools-shared/report-delivery.js.
// Trang CŨ /luan-giai.html (24 phần) gọi route này KHÔNG kèm `toolId` — mặc
// định 'laso' giữ nguyên hành vi cũ, không hồi quy.
//
// Người dùng ĐÃ đăng nhập, ĐÃ mở khoá (nội dung hiển thị sẵn trên trang), bấm
// nút để nhận lại bản PDF qua email. Route KHÔNG tính lại lá số/gọi LLM —
// client gửi nguyên văn nội dung ĐÃ hiển thị (đã trả tiền để xem), route chỉ
// dựng PDF (lib/pdf/luan-giai.tsx) rồi gửi qua lib/email/send.ts. Yêu cầu
// đăng nhập để tránh biến route thành máy gửi PDF tuỳ ý cho khách vô danh —
// khách vô danh (guest checkout) phải "Lưu tài khoản" (claimAccount) trước,
// xem tools-shared/report-delivery.js.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getUserFromSupabaseToken } from '@/lib/admin/auth';
import { sendTransactionalEmail } from '@/lib/email/send';
import { renderLuanGiaiPdf, type LuanGiaiPhan, type LuanGiaiToolId } from '@/lib/pdf/luan-giai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

// Trần tổng số ký tự nội dung — chặn payload bất thường làm PDF quá nặng.
// 24 phần luận giải thật đo được vài chục nghìn ký tự/phần, 500K là dư dả.
const MAX_TOTAL_CHARS = 500_000;
const MAX_PHANS = 30;

// Tên hiển thị trong subject email — khớp `TOOL_META` trong lib/pdf/luan-giai.tsx.
const TOOL_LABEL: Record<LuanGiaiToolId, string> = {
  laso: 'Luận Giải Lá Số',
  'chu-trinh-cuoc-doi': 'Chu Trình Cuộc Đời',
};

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUserFromSupabaseToken(token);
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    toolId?: string; hoTen?: string; ngaySinh?: string; gioiTinh?: string; phans?: LuanGiaiPhan[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const toolId: LuanGiaiToolId = body.toolId === 'chu-trinh-cuoc-doi' ? 'chu-trinh-cuoc-doi' : 'laso';

  const phans = Array.isArray(body.phans) ? body.phans.slice(0, MAX_PHANS) : [];
  if (!phans.length) return NextResponse.json({ error: 'Thiếu nội dung luận giải' }, { status: 400 });

  const totalChars = phans.reduce((n, p) => n + (p.text?.length || 0), 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return NextResponse.json({ error: 'Nội dung quá lớn' }, { status: 400 });
  }

  const input = {
    toolId,
    hoTen: String(body.hoTen || '').slice(0, 100),
    ngaySinh: String(body.ngaySinh || '').slice(0, 100),
    gioiTinh: String(body.gioiTinh || '').slice(0, 20),
    phans: phans.map((p) => ({ title: String(p.title || '').slice(0, 200), text: String(p.text || '').slice(0, 50_000) })),
  };
  const toolLabel = TOOL_LABEL[toolId];

  try {
    const pdfBuffer = await renderLuanGiaiPdf(input);
    // Khoá chống trùng theo NỘI DUNG — click lại đúng bản luận giải chỉ gửi
    // một lần; nội dung khác (unlock phần mới) thì hash khác, gửi được tiếp.
    // `toolId` vào cả hash lẫn key: cùng một user gửi CẢ HAI tool cho cùng lá
    // số (hoTen/ngaySinh trùng) vẫn ra 2 khoá khác nhau, không đè lẫn nhau.
    const contentHash = createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 16);

    const result = await sendTransactionalEmail({
      dedupeKey: `pdf-luan-giai-${toolId}-${user.id}-${contentHash}`,
      template: 'luan-giai-pdf',
      to: user.email,
      subject: `PDF ${toolLabel}${input.hoTen ? ' — ' + input.hoTen : ''} — Tử Vi Minh Bảo`,
      html: `<p>Gửi bạn bản PDF ${toolLabel.toLowerCase()}${input.hoTen ? ' của <b>' + input.hoTen + '</b>' : ''} — đính kèm trong email này.</p>
<p style="font-size:12px;color:#888">Bạn luôn xem lại bản đầy đủ trên tài khoản tại <a href="https://tuviminhbao.com/app">tuviminhbao.com/app</a>.</p>`,
      userId: user.id,
      attachments: [{ filename: `${toolId}-tu-vi-minh-bao.pdf`, content: pdfBuffer.toString('base64') }],
    });

    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.reason === 'duplicate' ? 200 : 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[luan-giai/email-pdf] lỗi dựng/gửi PDF', e);
    return NextResponse.json({ error: 'Không tạo được PDF' }, { status: 500 });
  }
}
