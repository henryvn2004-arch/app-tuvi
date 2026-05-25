// app/sitemap-ngay-tot/route.ts — sitemapindex cho ngày tốt
// 1 file hub + 17 file per-year
export const revalidate = false;

import { NextResponse } from 'next/server';

const BASE = 'https://www.tuviminhbao.com';
const YEAR_FROM = 2020;
const YEAR_TO = 2036;
const YEARS = Array.from({ length: YEAR_TO - YEAR_FROM + 1 }, (_, i) => YEAR_FROM + i);

export async function GET() {
  const entries = [
    `  <sitemap><loc>${BASE}/sitemap-ngay-tot/hub</loc></sitemap>`,
    ...YEARS.map(y => `  <sitemap><loc>${BASE}/sitemap-ngay-tot/${y}</loc></sitemap>`),
  ].join('\n');

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
