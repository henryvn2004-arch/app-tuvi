// app/api/public/v1/almanac/route.ts
// ============================================================
// GET /api/public/v1/almanac — PHÁN ĐOÁN: 12 trực, 28 tú, sao hoàng/hắc đạo,
// ngày kỵ, và điểm 10 loại việc. Miễn phí, không key, CORS mở.
//
// 🔑 Tách khỏi `/lunar` CÓ CHỦ Ý dù cùng một lượt tính engine: `/lunar` là
// DỮ KIỆN LỊCH (bất biến, ai cũng đồng ý), còn cái này là PHÁN ĐOÁN theo cổ
// pháp (một trường phái, có thể sửa). Gộp một endpoint thì người chỉ cần đổi
// ngày dương→âm bị buộc nhận kèm cả tầng phán đoán mà họ không tin, và mình
// mất luôn quyền sửa tầng đó mà không phá hợp đồng của họ.
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { buildAlmanac } from '@/lib/api/calendar-public';
import { apiError, apiOk, preflight, readDates } from '@/lib/api/public';

export function OPTIONS() {
  return preflight();
}

export async function GET(req: NextRequest) {
  const sel = readDates(req.nextUrl.searchParams);
  if ('err' in sel) return apiError(sel.err[0], sel.err[1]);
  try {
    const days = sel.days.map(buildAlmanac);
    return apiOk(sel.days.length === 1 ? days[0]! : { days }, { immutable: sel.immutable });
  } catch (e: unknown) {
    return apiError('engine_error', (e as Error).message, 500);
  }
}
