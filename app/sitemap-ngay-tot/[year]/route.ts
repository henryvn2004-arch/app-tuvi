// app/sitemap-ngay-tot/[year]/route.ts
// Per-year URLs: 12 month overview + 12*10 activity-month + ~365 day-detail
// Total: ~497 URL/năm × 17 năm = ~8,449 URL, mỗi URL × 6 ngôn ngữ (W33b) ⇒ ~2.982 mục/file (< trần 50.000)
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { ACTIVITY_LIST } from '../../../tuvi-engine/dist/ngay-tot/index.js';
import { revOf } from '@/lib/seo/lastmod';
import { URLSET_OPEN, urlEntries } from '@/lib/ngay-tot/sitemap';

const YEAR_FROM = 2020;
const YEAR_TO = 2036;
const YEARS = Array.from({ length: YEAR_TO - YEAR_FROM + 1 }, (_, i) => YEAR_FROM + i);

function daysInMonth(m: number, y: number): number {
  return new Date(y, m, 0).getDate();
}

// `changefreq`/`priority` đã GỠ — Google bỏ qua cả hai. Xem lib/seo/lastmod.ts.
// lastmod ở đây là MỐC ĐỔI ENGINE (`CONTENT_REV['ngay-tot']`), không phải ngày
// hôm nay: nội dung mỗi trang là kết quả tra bảng ngày-tốt, nó chỉ đổi khi
// engine đổi. Bump ở đó khi sửa luật chấm ngày.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);
  if (!YEARS.includes(year)) {
    return new NextResponse('Year out of range', { status: 404 });
  }

  const entries: string[] = [];
  const rev = revOf('ngay-tot');

  // 12 month overview pages
  for (let m = 1; m <= 12; m++) {
    entries.push(...urlEntries(`/ngay-tot/lich/${year}/thang-${m}`, rev));
  }

  // 12 × 10 = 120 activity × month pages (the SEO long-tail targets)
  for (const act of ACTIVITY_LIST) {
    for (let m = 1; m <= 12; m++) {
      entries.push(...urlEntries(`/ngay-tot/${act}/${year}/thang-${m}`, rev));
    }
  }

  // ~365 day-detail pages
  for (let m = 1; m <= 12; m++) {
    const dim = daysInMonth(m, year);
    for (let d = 1; d <= dim; d++) {
      entries.push(...urlEntries(`/ngay-tot/ngay/${year}/${m}/${d}`, rev));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
${URLSET_OPEN}
${entries.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
