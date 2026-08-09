// app/sitemap-ngay-tot/hub/route.ts
// 28 URLs không thuộc về 1 năm cụ thể: top + 10 activity hub + 17 year hub
export const revalidate = false;

import { NextResponse } from 'next/server';
import { ACTIVITY_LIST } from '../../../tuvi-engine/dist/ngay-tot/index.js';
import { lastmodLine, revOf } from '@/lib/seo/lastmod';

const BASE = 'https://www.tuviminhbao.com';
const YEAR_FROM = 2020;
const YEAR_TO = 2036;
const YEARS = Array.from({ length: YEAR_TO - YEAR_FROM + 1 }, (_, i) => YEAR_FROM + i);

// `changefreq`/`priority` đã GỠ — Google bỏ qua cả hai. Xem lib/seo/lastmod.ts.
function urlEntry(loc: string, lastmod?: string | null): string {
  return `  <url>
    <loc>${loc}</loc>${lastmodLine(lastmod)}
  </url>`;
}

export async function GET() {
  const entries: string[] = [];
  const rev = revOf('ngay-tot');

  // Top hub
  entries.push(urlEntry(`${BASE}/ngay-tot`, rev));

  // 10 activity hubs
  for (const act of ACTIVITY_LIST) {
    entries.push(urlEntry(`${BASE}/ngay-tot/${act}`, rev));
  }

  // 17 year hubs
  for (const y of YEARS) {
    entries.push(urlEntry(`${BASE}/ngay-tot/lich/${y}`, rev));
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
