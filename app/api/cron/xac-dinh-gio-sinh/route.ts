// app/api/cron/xac-dinh-gio-sinh/route.ts
// Sinh hồ sơ "Xác Định Giờ Sinh" (người KHÔNG có giờ sinh công khai) bằng Claude qua API: chấm 12 giờ → chốt
// giờ → viết hồ sơ như Nghiệm Chứng. Hàng đợi: data/nghiem-chung/doan-gio.jsonl (xếp sẵn theo bậc).
// Vòng chạy chung với Nghiệm Chứng: lib/nghiem-chung/sinh/chay.ts.
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { options } from '@/lib/cors';
import { withCronLog } from '@/lib/cron/log';
import { hangDoi, dongGoiDoan } from '@/lib/nghiem-chung/sinh/doan';
import { chay, type CauHinh } from '@/lib/nghiem-chung/sinh/chay';

const CFG: CauHinh = {
  muc: 'xac-dinh-gio-sinh',
  job: 'xac-dinh-gio-sinh',
  capKey: 'nghiem_chung.doan_daily_cap',
  capMacDinh: 40,
  hangDoi,
  dongGoi: dongGoiDoan,
};

export async function OPTIONS() {
  return options();
}
export async function GET(request: NextRequest) {
  return withCronLog('xac-dinh-gio-sinh', 'vercel', () => chay(request, CFG));
}
export async function POST(request: NextRequest) {
  return withCronLog('xac-dinh-gio-sinh', 'vercel', () => chay(request, CFG));
}
