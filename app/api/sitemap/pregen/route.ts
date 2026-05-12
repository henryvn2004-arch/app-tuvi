// app/api/sitemap/pregen/route.ts
// Sitemap index for all 51 per-year ISR sitemaps (1960–2010)
export const revalidate = false;

import { NextResponse } from 'next/server';

const BASE = 'https://www.tuviminhbao.com';
const YEARS = Array.from({ length: 51 }, (_, i) => 1960 + i);

export async function GET() {
  const entries = YEARS.map(y =>
    `  <sitemap>\n    <loc>${BASE}/api/sitemap/pregen/${y}</loc>\n  </sitemap>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
