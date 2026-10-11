// app/api/cron/nghiem-chung/route.ts
// Sinh hồ sơ Nghiệm Chứng mỗi đêm bằng Claude qua API (credit API, KHÔNG phải hạn mức gói), ghi vào
// Supabase (nc_ho_so / nc_loai_tru) — trang đọc từ DB sau khi hết file (lib/nghiem-chung/store.ts).
// Cùng bộ luật + bộ kiểm tra với pipeline agent: không nới cho cron. Vòng chạy: lib/nghiem-chung/sinh/chay.ts.
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { options } from '@/lib/cors';
import { withCronLog } from '@/lib/cron/log';
import { danhSach, dongGoi } from '@/lib/nghiem-chung/sinh/goi';
import { chay, type CauHinh } from '@/lib/nghiem-chung/sinh/chay';

const CFG: CauHinh = {
  muc: 'nghiem-chung',
  job: 'nghiem-chung',
  capKey: 'nghiem_chung.daily_cap',
  capMacDinh: 100,
  hangDoi: danhSach,
  dongGoi,
};

export async function OPTIONS() {
  return options();
}
export async function GET(request: NextRequest) {
  return withCronLog('nghiem-chung', 'vercel', () => chay(request, CFG));
}
export async function POST(request: NextRequest) {
  return withCronLog('nghiem-chung', 'vercel', () => chay(request, CFG));
}
