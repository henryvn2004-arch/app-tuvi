// app/sitemap-hubs/route.ts
// Hub pages: /menh-kho/[year] (51) + /menh-kho/[year]/[mm]-[dd] (~18,615) = ~18,666 URLs
export const revalidate = false;

import { NextResponse } from 'next/server';

const BASE  = 'https://www.tuviminhbao.com';
const YEARS = Array.from({ length: 51 }, (_, i) => 1960 + i);

function isLeap(y: number) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInMonth(m: number, y: number) {
  return [31, isLeap(y)?29:28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
function pad(n: number) { return String(n).padStart(2, '0'); }

function url(loc: string, lastmod: string, cf: string, pri: string) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>${pri}</priority>\n  </url>`;
}

export async function GET() {
  const lines: string[] = [];

  for (const year of YEARS) {
    // Year hub
    lines.push(url(`${BASE}/menh-kho/${year}`, `${year}-01-01`, 'yearly', '0.7'));

    // Day hubs
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(m, year);
      for (let d = 1; d <= dim; d++) {
        lines.push(url(
          `${BASE}/menh-kho/${year}/${pad(m)}-${pad(d)}`,
          `${year}-01-01`, 'yearly', '0.5'
        ));
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
