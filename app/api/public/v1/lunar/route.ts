// app/api/public/v1/lunar/route.ts
// ============================================================
// GET /api/public/v1/lunar — LỊCH: dương → âm, can chi, con giáp, nạp âm,
// giờ hoàng đạo. Miễn phí, không key, CORS mở. Xem `lib/api/public.ts`.
//
// 🔑 Vì sao nguồn là `computeNgayTot` chứ không phải `lib/almanac/day.ts`
// (mingyu): engine repo ĐANG nuôi 8.958 trang `/ngay-tot/*` và có bộ kiểm
// riêng, còn mingyu là payload của gói bên thứ ba mà mình không kiểm soát
// shape. Đóng băng một hợp đồng CÔNG KHAI lên payload của người khác là hẹn
// ngày họ bump phiên bản rồi API mình vỡ cho người lạ.
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { buildLunar } from '@/lib/api/calendar-public';
import { apiError, apiOk, preflight, readDates } from '@/lib/api/public';

export function OPTIONS() {
  return preflight();
}

export async function GET(req: NextRequest) {
  const sel = readDates(req.nextUrl.searchParams);
  if ('err' in sel) return apiError(sel.err[0], sel.err[1]);
  try {
    const days = sel.days.map(buildLunar);
    return apiOk(sel.days.length === 1 ? days[0]! : { days }, { immutable: sel.immutable });
  } catch (e: unknown) {
    return apiError('engine_error', (e as Error).message, 500);
  }
}
