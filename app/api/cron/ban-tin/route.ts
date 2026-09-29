// app/api/cron/ban-tin/route.ts
// Bản tin kinh tế – đời sống mỗi sáng (lib/ban-tin.ts). Gemini/Google Search lỗi
// hoặc ra bản không dùng được ⇒ NÉM để withCronLog ghi status=error; rail chat vẫn
// dùng bản hôm trước (docBanTin đọc bản mới nhất trong 3 ngày).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { homNayVN, luuBanTin, taoBanTin } from '@/lib/ban-tin';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('ban-tin', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const ngay = homNayVN();
  const kq = await taoBanTin(ngay);
  if (!(await luuBanTin(ngay, kq))) throw new Error('ban-tin: lưu vào ban_tin_ngay thất bại');
  return NextResponse.json({ ok: true, ngay, dong: kq.noiDung.split('\n').length, so_truy_van: kq.soTruyVan });
}
