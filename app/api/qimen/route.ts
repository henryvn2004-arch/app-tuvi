import { NextRequest, NextResponse } from 'next/server';
import { dungBan, railData } from '@/lib/qimen/board';

export const runtime = 'nodejs';
/**
 * ⚠️ BẮT BUỘC `force-dynamic`. Route GET không đọc API động nào thì Next coi là
 * TĨNH và THỰC THI TRỌN VẸN ngay trong `next build`, rồi phục vụ mãi kết quả
 * lúc build — đúng bug `/api/cron-push` đã dính. Với bàn Kỳ Môn thì hậu quả là
 * mọi người xem chung một bàn của thời điểm build, sai hoàn toàn mà không có
 * gì báo.
 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/qimen[?t=<ISO>]
 *
 * Tool MIỄN PHÍ nên KHÔNG kiểm auth, KHÔNG trừ Lượng — giống các route tool
 * free khác. Nhưng vẫn chặn `t` rác: `new Date('bậy')` ra Invalid Date, đưa
 * xuống engine thì nó ném và người dùng nhận lỗi 500 khó hiểu.
 */
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('t');
    let khi: Date | undefined;
    if (raw) {
      const d = new Date(raw);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: 'Thời điểm không hợp lệ.' }, { status: 400 });
      }
      // Trần 100 năm hai phía: ngoài khoảng đó bảng tiết khí của ephemeris
      // không còn đáng tin, mà bàn vẫn dựng ra bình thường nên không ai biết.
      const cach = Math.abs(d.getFullYear() - new Date().getFullYear());
      if (cach > 100) {
        return NextResponse.json({ ok: false, error: 'Chỉ lập bàn trong khoảng 100 năm.' }, { status: 400 });
      }
      khi = d;
    }

    const ban = dungBan(khi);
    return NextResponse.json(
      { ...ban, rail: railData(ban) },
      // Bàn Kỳ Môn đổi theo GIỜ (mỗi canh giờ một bàn). Cache 60s ở CDN là đủ
      // gánh lượt truy cập mà không bao giờ trả nhầm sang canh giờ khác.
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (e) {
    console.error('[api/qimen] dựng bàn hỏng:', e);
    return NextResponse.json({ ok: false, error: 'Không dựng được bàn Kỳ Môn.' }, { status: 500 });
  }
}
