// app/api/reports/pdf/route.ts
// ============================================================
// PDF dựng ở SERVER cho MỌI công cụ (Vận Hạn 12 Tháng, Tử Bình, Xem Tuổi…) —
// đường lùi của nút "Lưu PDF" trong trình duyệt NHÚNG trong app (Zalo/FB), nơi
// `window.print()` không chạy. Luận Giải + Chu Trình có bản riêng đẹp hơn
// (/api/luan-giai/pdf); mọi công cụ khác đi đây.
//
// Nguồn = bản chụp báo cáo (`report_snapshots`, lib/reports/snapshots.ts): ĐÚNG
// thứ đang hiện trên màn hình người này, phần còn khoá paywall đã bị shell bỏ
// sẵn (`currentShare()`). Cùng mức tin như /api/luan-giai/email-pdf (nội dung
// client gửi), và PDF chỉ về tay chính chủ (link ký theo user / kênh chat của họ).
//
//   POST {…payload reportSnapshot(), to?:'open'|'chat'} + Bearer
//     → upsert bản chụp (cùng dòng với trang Báo cáo) →
//       'open': trả link GET ký · 'chat': dựng PDF gửi vào Zalo/Messenger…
//   GET ?s&u&e&k → dựng PDF `inline` từ dòng `report_snapshots` của đúng user.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { snapshotRow, saveSnapshot, type ReportBlock } from '@/lib/reports/snapshots';
import { renderReportPdf } from '@/lib/pdf/luan-giai';
import { sendFileToUserChats } from '@/lib/channels/notify';
import { pdfLinkReady, signPdfQuery, verifyPdfQuery, pdfResponse, textResponse } from '@/lib/pdf/signed-link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const SCOPE = 'report-pdf';
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

type Snap = { tool_id: string; tool_label: string | null; title: string; subtitle: string | null; blocks: ReportBlock[] };

function render(r: Snap): Promise<Buffer> {
  return renderReportPdf({
    title: r.tool_label || r.title || 'Báo cáo',
    subtitle: r.subtitle || (r.tool_label && r.title !== r.tool_label ? r.title : ''),
    sections: (r.blocks || []).filter((b) => b.text).map((b) => ({ header: b.header, text: String(b.text) })),
  });
}
const fileName = (toolId: string) => `${toolId}-tu-vi-minh-bao.pdf`;

export async function POST(req: NextRequest) {
  if (!pdfLinkReady() || !SB_URL) return NextResponse.json({ error: 'Chưa cấu hình' }, { status: 500 });
  const auth = await authUserFromRequest(req);
  if ('error' in auth) return NextResponse.json({ error: 'Bạn cần đăng nhập để lưu PDF' }, { status: auth.status });
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }
  const row = snapshotRow(auth.user.id, b);
  if (typeof row === 'string') return NextResponse.json({ error: row }, { status: 400 });
  if (!row.blocks.some((x) => x.text)) return NextResponse.json({ error: 'Kết quả này chưa có chữ để dựng PDF' }, { status: 400 });
  const id = await saveSnapshot(row);
  if (!id) return NextResponse.json({ error: 'Không lưu được báo cáo, thử lại sau ít phút' }, { status: 502 });

  if (b.to !== 'chat') {
    return NextResponse.json({ ok: true, url: `/api/reports/pdf?${signPdfQuery(SCOPE, id, auth.user.id)}` });
  }
  try {
    const r = await sendFileToUserChats(auth.user.id, await render(row), fileName(row.tool_id), `Bản PDF ${row.tool_label || row.title} — lưu lại để đọc dần nhé.`);
    if (!r.linked) {
      return NextResponse.json({ error: 'Tài khoản chưa kết nối Zalo. Vào Tài khoản → Kết nối để gắn Zalo, rồi bấm lại.', code: 'no_chat' }, { status: 409 });
    }
    if (!r.sent.length) {
      return NextResponse.json({ error: 'Zalo chưa nhận tin — bạn nhắn OA một câu bất kỳ trước rồi bấm lại nhé.', code: 'outside_window' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: r.sent });
  } catch (e) {
    console.error('[reports/pdf] lỗi dựng/gửi PDF', e);
    return NextResponse.json({ error: 'Không tạo được PDF' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const v = verifyPdfQuery(SCOPE, req.nextUrl.searchParams);
  if ('error' in v) return textResponse(v.error, v.status);
  if (!/^[0-9a-f-]{36}$/.test(v.ref)) return textResponse('Link không hợp lệ.', 403);
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/report_snapshots?id=eq.${v.ref}&user_id=eq.${encodeURIComponent(v.uid)}` +
        '&select=tool_id,tool_label,title,subtitle,blocks&limit=1',
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) {
      console.error('[reports/pdf] đọc bản chụp', res.status);
      return textResponse('Không đọc được báo cáo, thử lại sau ít phút.', 502);
    }
    const r = ((await res.json()) as Snap[])[0];
    if (!r) return textResponse('Không tìm thấy báo cáo.', 404);
    return pdfResponse(await render(r), fileName(r.tool_id));
  } catch (e) {
    console.error('[reports/pdf] lỗi dựng PDF', e);
    return textResponse('Không tạo được PDF, thử lại sau ít phút.', 500);
  }
}
