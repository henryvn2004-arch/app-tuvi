// app/api/luan-giai/email-pdf/route.ts
// ============================================================
// "Gửi PDF qua email" trên trang luận giải — người dùng ĐÃ đăng nhập, ĐÃ mở
// khoá (nội dung hiển thị sẵn trên trang), bấm nút để nhận lại bản PDF qua
// email. Route KHÔNG tính lại lá số/gọi LLM — client gửi nguyên văn nội dung
// đã hiển thị, route chỉ dựng PDF (lib/pdf/luan-giai.tsx) rồi gửi qua
// lib/email/send.ts. Yêu cầu đăng nhập để tránh biến route thành máy gửi PDF
// tuỳ ý cho khách vô danh.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getUserFromSupabaseToken } from '@/lib/admin/auth';
import { sendTransactionalEmail } from '@/lib/email/send';
import { renderLuanGiaiPdf, type LuanGiaiPhan } from '@/lib/pdf/luan-giai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 45;

// Trần tổng số ký tự nội dung — chặn payload bất thường làm PDF quá nặng.
// 24 phần luận giải thật đo được vài chục nghìn ký tự/phần, 500K là dư dả.
const MAX_TOTAL_CHARS = 500_000;
const MAX_PHANS = 30;

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUserFromSupabaseToken(token);
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    hoTen?: string; ngaySinh?: string; gioiTinh?: string; phans?: LuanGiaiPhan[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const phans = Array.isArray(body.phans) ? body.phans.slice(0, MAX_PHANS) : [];
  if (!phans.length) return NextResponse.json({ error: 'Thiếu nội dung luận giải' }, { status: 400 });

  const totalChars = phans.reduce((n, p) => n + (p.text?.length || 0), 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return NextResponse.json({ error: 'Nội dung quá lớn' }, { status: 400 });
  }

  const input = {
    hoTen: String(body.hoTen || '').slice(0, 100),
    ngaySinh: String(body.ngaySinh || '').slice(0, 100),
    gioiTinh: String(body.gioiTinh || '').slice(0, 20),
    phans: phans.map((p) => ({ title: String(p.title || '').slice(0, 200), text: String(p.text || '').slice(0, 50_000) })),
  };

  try {
    const pdfBuffer = await renderLuanGiaiPdf(input);
    // Khoá chống trùng theo NỘI DUNG — click lại đúng bản luận giải chỉ gửi
    // một lần; nội dung khác (unlock phần mới) thì hash khác, gửi được tiếp.
    const contentHash = createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 16);

    const result = await sendTransactionalEmail({
      dedupeKey: `pdf-luan-giai-${user.id}-${contentHash}`,
      template: 'luan-giai-pdf',
      to: user.email,
      subject: `PDF Luận Giải Lá Số${input.hoTen ? ' — ' + input.hoTen : ''} — Tử Vi Minh Bảo`,
      html: `<p>Gửi bạn bản PDF luận giải lá số${input.hoTen ? ' của <b>' + input.hoTen + '</b>' : ''} — đính kèm trong email này.</p>
<p style="font-size:12px;color:#888">Bạn luôn xem lại bản đầy đủ trên tài khoản tại <a href="https://tuviminhbao.com/app">tuviminhbao.com/app</a>.</p>`,
      userId: user.id,
      attachments: [{ filename: 'luan-giai-tu-vi-minh-bao.pdf', content: pdfBuffer.toString('base64') }],
    });

    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.reason === 'duplicate' ? 200 : 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[luan-giai/email-pdf] lỗi dựng/gửi PDF', e);
    return NextResponse.json({ error: 'Không tạo được PDF' }, { status: 500 });
  }
}
