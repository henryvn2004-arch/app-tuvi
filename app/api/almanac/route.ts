import { NextRequest, NextResponse } from 'next/server';
import { dungHoangLich, dungMotNgay } from '@/lib/almanac/day';

export const runtime = 'nodejs';
/**
 * ⚠️ BẮT BUỘC `force-dynamic` — xem chú thích dài ở `app/api/qimen/route.ts`.
 * Route này mặc định trả HÔM NAY; để Next coi là tĩnh thì mọi người sẽ xem
 * chung tờ lịch của ngày build, sai âm thầm.
 */
export const dynamic = 'force-dynamic';

/** mingyu chỉ nhận tối đa 31 ngày một lượt. */
const TRAN_NGAY = 31;

function docNgay(raw: string | null): Date | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * GET /api/almanac[?d=YYYY-MM-DD][&den=YYYY-MM-DD]
 *
 * Tool MIỄN PHÍ — không auth, không trừ Lượng, giống mọi route tool free.
 * Không có `d` thì trả hôm nay theo giờ Việt Nam.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const tuRaw = q.get('d');
    const denRaw = q.get('den');

    let tu: Date;
    if (tuRaw) {
      const p = docNgay(tuRaw);
      if (!p) {
        return NextResponse.json({ ok: false, error: 'Ngày không hợp lệ (cần YYYY-MM-DD).' }, { status: 400 });
      }
      tu = p;
    } else {
      // Hôm nay theo giờ VN, không theo giờ máy chủ.
      const now = new Date();
      const vn = new Date(now.getTime() + 7 * 3600_000);
      tu = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
    }

    // Ngoài khoảng này thì công thức tiết khí xấp xỉ không còn đáng tin, mà tờ
    // lịch VẪN ra bình thường nên không ai phát hiện.
    if (Math.abs(tu.getUTCFullYear() - new Date().getFullYear()) > 100) {
      return NextResponse.json({ ok: false, error: 'Chỉ tra trong khoảng 100 năm.' }, { status: 400 });
    }

    if (denRaw) {
      const den = docNgay(denRaw);
      if (!den) {
        return NextResponse.json({ ok: false, error: 'Ngày kết thúc không hợp lệ.' }, { status: 400 });
      }
      const so = Math.floor((den.getTime() - tu.getTime()) / 86_400_000) + 1;
      if (so < 1) {
        return NextResponse.json({ ok: false, error: 'Ngày kết thúc phải sau ngày bắt đầu.' }, { status: 400 });
      }
      if (so > TRAN_NGAY) {
        return NextResponse.json(
          { ok: false, error: `Mỗi lượt tra tối đa ${TRAN_NGAY} ngày.` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { ok: true, ngay: dungHoangLich(tu, den) },
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
      );
    }

    return NextResponse.json(
      { ok: true, ngay: [dungMotNgay(tu)] },
      // Tờ lịch chỉ đổi theo NGÀY nên cache 1 giờ ở CDN là an toàn tuyệt đối.
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (e) {
    console.error('[api/almanac] dựng lịch hỏng:', e);
    return NextResponse.json({ ok: false, error: 'Không tra được hoàng lịch.' }, { status: 500 });
  }
}
