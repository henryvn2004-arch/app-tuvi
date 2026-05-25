// app/sitemap-ngay-tot/hub/route.ts
// 28 URLs không thuộc về 1 năm cụ thể: top + 10 activity hub + 17 year hub
export const revalidate = false;

import { NextResponse } from 'next/server';
import { ACTIVITY_LIST } from '../../../tuvi-engine/dist/ngay-tot/index.js';

const BASE = 'https://www.tuviminhbao.com';
const YEAR_FROM = 2020;
const YEAR_TO = 2036;
const YEARS = Array.from({ length: YEAR_TO - YEAR_FROM + 1 }, (_, i) => YEAR_FROM + i);

function urlEntry(loc: string, priority = '0.7'): string {
  return `  <url>
    <loc>${loc}</loc>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const entries: string[] = [];

  // Top hub
  entries.push(urlEntry(`${BASE}/ngay-tot`, '0.9'));

  // 10 activity hubs
  for (const act of ACTIVITY_LIST) {
    entries.push(urlEntry(`${BASE}/ngay-tot/${act}`, '0.8'));
  }

  // 17 year hubs
  for (const y of YEARS) {
    entries.push(urlEntry(`${BASE}/ngay-tot/lich/${y}`, '0.7'));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
