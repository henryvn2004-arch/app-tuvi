// app/api/sitemap/pregen/[year]/route.ts
// Per-year sitemap: 365 × 12 × 2 = 8,760 ISR lá số URLs
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const BASE     = 'https://www.tuviminhbao.com';
const NAM_XEM  = 2027;
const YEARS    = Array.from({ length: 51 }, (_, i) => 1960 + i);
const CAN_SLUGS = ['giap','at','binh','dinh','mau','ky','canh','tan','nham','quy'];
const CHI_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];

function canSlug(year: number)  { return CAN_SLUGS[(year - 4 + 400) % 10]; }
function chiSlug(year: number)  { return CHI_SLUGS[(year - 4 + 480) % 12]; }
function isLeap(y: number)      { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInMonth(m: number, y: number) {
  return [31, isLeap(y)?29:28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}
function pad(n: number) { return String(n).padStart(2, '0'); }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);
  if (!YEARS.includes(year)) return new NextResponse('Not found', { status: 404 });

  const can     = canSlug(year);
  const chi     = chiSlug(year);
  const lastmod = `${year}-07-01`;

  const urlLines: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const dim = daysInMonth(m, year);
    for (let d = 1; d <= dim; d++) {
      const dd = pad(d);
      const mm = pad(m);
      for (const gio of GIO_SLUGS) {
        for (const gioi of ['nam', 'nu']) {
          const slug = `${can}-${chi}-${dd}-${mm}-${year}-gio-${gio}-${gioi}-${NAM_XEM}`;
          urlLines.push(
            `  <url>\n    <loc>${BASE}/la-so/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.6</priority>\n  </url>`
          );
        }
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlLines.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=604800',
    },
  });
}
