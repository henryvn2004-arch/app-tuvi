// app/ngay-tot/lich/[year]/route.ts — year hub: 12 tháng
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { BASE, YEARS, esc, renderPage, CACHE_HEADERS } from '../../_shared';

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);
  if (!YEARS.includes(year)) {
    return NextResponse.redirect(`${BASE}/ngay-tot`);
  }

  const title = `Lịch Ngày Tốt Năm ${year} — Xem Ngày Đẹp Theo Tháng | Tử Vi Minh Bảo`;
  const desc = `Lịch vạn niên năm ${year}: tra cứu ngày tốt theo từng tháng, đầy đủ 12 tháng. Cổ pháp 12 trực, 28 nhị thập bát tú, hoàng/hắc đạo.`;
  const url = `${BASE}/ngay-tot/lich/${year}`;

  const monthGrid = MONTHS.map((name, i) => {
    const m = i + 1;
    return `<a href="/ngay-tot/lich/${year}/thang-${m}" class="month-cell">
      ${esc(name)} · ${year}
      <small>Xem ngày đẹp tháng ${m}</small>
    </a>`;
  }).join('');

  const relYears = YEARS.filter(y => y !== year && Math.abs(y - year) <= 6)
    .map(y => `<a href="/ngay-tot/lich/${y}" class="rel-item">Năm ${y}</a>`).join('');

  const body = `
    <div class="hero">
      <div class="eyebrow">Lịch Vạn Niên · Năm ${year}</div>
      <h1>Lịch Ngày Tốt <em>Năm ${year}</em></h1>
      <p>Chọn tháng để xem các ngày đẹp dành cho cưới hỏi, khởi công, khai trương, nhập trạch và các việc trọng đại khác.</p>
    </div>
    <h2 class="sec-title">12 Tháng Năm ${year}</h2>
    <div class="month-grid">${monthGrid}</div>
    <div class="rel-block">
      <div class="rel-title">Năm khác</div>
      <div class="rel-grid">${relYears}</div>
    </div>
  `;

  const html = renderPage({
    title, desc, canonical: url,
    schema: {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: title, description: desc, url, inLanguage: 'vi',
      breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Xem Ngày Tốt', item: `${BASE}/ngay-tot` },
        { '@type': 'ListItem', position: 3, name: `Năm ${year}`, item: url },
      ]},
    },
    breadcrumbs: [
      { name: 'Trang Chủ', url: '/' },
      { name: 'Xem Ngày Tốt', url: '/ngay-tot' },
      { name: `Năm ${year}` },
    ],
    body,
  });

  return new NextResponse(html, { headers: CACHE_HEADERS });
}
