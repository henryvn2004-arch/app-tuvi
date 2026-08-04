import { NextRequest, NextResponse } from 'next/server';
import { lapKhoa, railData } from '@/lib/liuren/ke';

export const runtime = 'nodejs';
/** ⚠️ BẮT BUỘC — xem chú thích ở `app/api/qimen/route.ts`. */
export const dynamic = 'force-dynamic';

/**
 * GET /api/liuren[?t=<ISO>]
 *
 * Tool MIỄN PHÍ — không auth, không trừ Lượng, giống mọi route tool free khác.
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
      if (Math.abs(d.getFullYear() - new Date().getFullYear()) > 100) {
        return NextResponse.json({ ok: false, error: 'Chỉ lập khóa trong khoảng 100 năm.' }, { status: 400 });
      }
      khi = d;
    }

    const khoa = lapKhoa(khi);
    return NextResponse.json(
      { ok: true, khoa, rail: railData(khoa) },
      // Khóa Lục Nhâm đổi theo CANH GIỜ. Cache 60s là đủ gánh tải mà không bao
      // giờ trả nhầm sang canh giờ khác.
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (e) {
    console.error('[api/liuren] lập khóa hỏng:', e);
    return NextResponse.json({ ok: false, error: 'Không lập được khóa Lục Nhâm.' }, { status: 500 });
  }
}
