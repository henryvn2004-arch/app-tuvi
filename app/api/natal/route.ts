import { NextRequest, NextResponse } from 'next/server';
import { lapBanDo, railData } from '@/lib/tayphuong/natal';

export const runtime = 'nodejs';
/** ⚠️ BẮT BUỘC — xem chú thích ở `app/api/qimen/route.ts`. */
export const dynamic = 'force-dynamic';

/**
 * GET /api/natal?d=&m=&y=&h=&mi=&lat=&lon=&tz=
 *
 * Tool MIỄN PHÍ — không auth, không trừ Lượng.
 *
 * ⚠️ VĨ ĐỘ / KINH ĐỘ LÀ BẮT BUỘC VỚI MÔN NÀY, khác mọi tool Á Đông của site.
 * Cung Mọc đổi khoảng 1 độ mỗi 4 phút và phụ thuộc vĩ độ nơi sinh; đoán bừa
 * toạ độ là sai cả bản đồ mà bản đồ VẪN vẽ ra bình thường. Mặc định Hà Nội chỉ
 * để trang có sẵn giá trị điền — trang phải cho người dùng đổi.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const num = (k: string, mac: number) => {
      const r = q.get(k);
      return r === null || r === '' ? mac : Number(r);
    };
    const d = Number(q.get('d'));
    const m = Number(q.get('m'));
    const y = Number(q.get('y'));
    const h = num('h', 12);
    const mi = num('mi', 0);
    const lat = num('lat', 21.0278);
    const lon = num('lon', 105.8342);
    const tz = num('tz', 7);

    if (!Number.isInteger(d) || d < 1 || d > 31 || !Number.isInteger(m) || m < 1 || m > 12) {
      return NextResponse.json({ ok: false, error: 'Ngày tháng không hợp lệ.' }, { status: 400 });
    }
    if (!Number.isInteger(y) || y < 1800 || y > 2200) {
      return NextResponse.json({ ok: false, error: 'Năm sinh phải trong khoảng 1800–2200.' }, { status: 400 });
    }
    if (!(h >= 0 && h <= 23) || !(mi >= 0 && mi <= 59)) {
      return NextResponse.json({ ok: false, error: 'Giờ phút sinh không hợp lệ.' }, { status: 400 });
    }
    if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) {
      return NextResponse.json({ ok: false, error: 'Toạ độ nơi sinh không hợp lệ.' }, { status: 400 });
    }
    if (!(tz >= -12 && tz <= 14)) {
      return NextResponse.json({ ok: false, error: 'Múi giờ không hợp lệ.' }, { status: 400 });
    }

    const ban = lapBanDo({ ngay: d, thang: m, nam: y, gio: h, phut: mi, vido: lat, kinhdo: lon, muiGio: tz });
    return NextResponse.json(
      { ok: true, banDo: ban, rail: railData(ban) },
      // Bản đồ lúc sinh KHÔNG đổi theo thời gian — cache dài.
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } }
    );
  } catch (e) {
    console.error('[api/natal] lập bản đồ hỏng:', e);
    return NextResponse.json({ ok: false, error: 'Không lập được bản đồ sao.' }, { status: 500 });
  }
}
