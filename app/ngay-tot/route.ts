// app/ngay-tot/route.ts — /ngay-tot top hub
export const revalidate = false;

import { NextResponse } from 'next/server';
import { ACTIVITY_LIST, ACTIVITY_META } from '../../tuvi-engine/dist/ngay-tot/index.js';
import { BASE, YEARS, esc, renderPage, CACHE_HEADERS } from './_shared';
import { ORG_ID } from '@/lib/seo/entity';

export async function GET() {
  const title = 'Xem Ngày Tốt — Lịch Vạn Niên 2020-2036 | Tử Vi Minh Bảo';
  const desc =
    'Tra cứu ngày tốt theo việc: cưới hỏi, khởi công, khai trương, nhập trạch, xuất hành, cầu tài, sinh con, an táng, đào giếng, sửa nhà. Cổ pháp 12 trực, 28 sao, hoàng đạo.';
  const url = `${BASE}/ngay-tot`;

  const actGrid = ACTIVITY_LIST.map((key) => {
    const m = ACTIVITY_META[key];
    return `<a href="/ngay-tot/${key}" class="act-card">
      <div class="act-name">${esc(m.name)}</div>
      <div class="act-desc">${esc(m.desc)}</div>
    </a>`;
  }).join('');

  const yearGrid = YEARS.map(
    (y) => `<a href="/ngay-tot/lich/${y}" class="year-cell">${y}</a>`,
  ).join('');

  const body = `
    <div class="hero">
      <div class="eyebrow">Lịch Vạn Niên · Cổ Pháp</div>
      <h1>Xem <em>Ngày Tốt</em> 2020–2036</h1>
      <p>Tra cứu ngày đẹp theo 10 loại việc — dựa trên 12 trực, 28 nhị thập bát tú, hoàng/hắc đạo và Tam Nương / Nguyệt Kỵ / Dương Công.</p>
    </div>
    <h2 class="sec-title">Xem Theo Việc</h2>
    <div class="act-grid">${actGrid}</div>
    <h2 class="sec-title">Xem Theo Năm</h2>
    <div class="year-grid">${yearGrid}</div>
  `;

  const html = renderPage({
    title, desc, canonical: url,
    schema: {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: title, description: desc, url, inLanguage: 'vi',
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
    },
    breadcrumbs: [
      { name: 'Trang Chủ', url: '/' },
      { name: 'Xem Ngày Tốt' },
    ],
    body,
  });

  return new NextResponse(html, { headers: CACHE_HEADERS });
}
