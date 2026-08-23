// app/api/xong-dat/route.ts
// ============================================================
// Chấm tuổi xông đất — tra bảng thuần, 0 lượt LLM, 0đ nên KHÔNG tính phí và
// KHÔNG đòi đăng nhập (cùng lối các công cụ miễn phí khác).
//
// Kết quả CHỈ phụ thuộc (năm sinh, năm xem) và không đổi theo thời gian ⇒
// cache CDN dài. Đây là trang mùa Tết, lưu lượng dồn vào vài tuần — để CDN
// gánh thay vì mỗi lượt đều chạm hàm.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { computeXongDat, XONG_DAT_YEARS } from '@/lib/engine/xong-dat';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const nam = Number(sp.get('nam'));
  const namXem = Number(sp.get('namXem'));

  if (!Number.isInteger(nam) || nam < 1930 || nam > 2030) {
    return NextResponse.json({ error: 'Năm sinh không hợp lệ' }, { status: 400 });
  }
  // Chốt vào tập năm CÓ BẢNG TẾT: ngoài tập đó thì `tetDate` rỗng, mà trả một
  // kết quả thiếu ngày Tết cho trang mùa Tết là trả nửa câu trả lời.
  if (!XONG_DAT_YEARS.includes(namXem)) {
    return NextResponse.json({ error: `Chỉ hỗ trợ Tết các năm: ${XONG_DAT_YEARS.join(', ')}` }, { status: 400 });
  }

  const r = computeXongDat(nam, namXem);
  if (!r) return NextResponse.json({ error: 'Không tính được' }, { status: 400 });

  return NextResponse.json(r, {
    headers: { 'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000' },
  });
}
