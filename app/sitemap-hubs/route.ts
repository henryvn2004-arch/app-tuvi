// app/sitemap-hubs/route.ts
// Hub pages: /menh-kho/[year] (67) + /menh-kho/[year]/[mm]-[dd] (~24,471) = ~24,538 URLs
export const revalidate = false;

import { NextResponse } from 'next/server';
import { lastmodLine, revOf } from '@/lib/seo/lastmod';

const BASE  = 'https://www.tuviminhbao.com';
const YEARS = Array.from({ length: 51 }, (_, i) => 1960 + i); // 1960–2010, khớp với route handler

function isLeap(y: number) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInMonth(m: number, y: number) {
  return [31, isLeap(y)?29:28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
function pad(n: number) { return String(n).padStart(2, '0'); }

// `changefreq`/`priority` đã GỠ — Google bỏ qua cả hai. Xem lib/seo/lastmod.ts.
function url(loc: string, lastmod?: string | null) {
  return `  <url>\n    <loc>${loc}</loc>${lastmodLine(lastmod)}\n  </url>`;
}

export async function GET() {
  const lines: string[] = [];

  // Trang sinh bằng thuật toán, không có dòng DB nào để hỏi ngày sửa. Mốc nội
  // dung khai tập trung ở `CONTENT_REV['menh-kho']` — hiện `null` ⇒ không phát
  // lastmod. Bump ở ĐÓ khi template `app/menh-kho/**` hoặc `NAM_XEM` đổi.
  const rev = revOf('menh-kho');

  for (const year of YEARS) {
    // Year hub
    lines.push(url(`${BASE}/menh-kho/${year}`, rev));

    // Day hubs
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(m, year);
      for (let d = 1; d <= dim; d++) {
        lines.push(url(`${BASE}/menh-kho/${year}/${pad(m)}-${pad(d)}`, rev));
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=604800',
    },
  });
}
