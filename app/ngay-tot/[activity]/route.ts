// app/ngay-tot/[activity]/route.ts — activity hub: 17 năm × 12 tháng grid
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import {
  ACTIVITY_META, ACTIVITY_LIST,
  type ActivityKey,
} from '../../../tuvi-engine/dist/ngay-tot/index.js';
import { BASE, YEARS, esc, renderPage, CACHE_HEADERS } from '../_shared';

const VALID = new Set(ACTIVITY_LIST as readonly string[]);
const CURRENT_YEAR = 2026;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ activity: string }> },
) {
  const { activity } = await params;
  if (!VALID.has(activity)) {
    return NextResponse.redirect(`${BASE}/ngay-tot`);
  }

  const key = activity as ActivityKey;
  const meta = ACTIVITY_META[key];

  const title = `${meta.name} — Ngày Tốt 2020-2036 | Tử Vi Minh Bảo`;
  const desc = `Tra cứu ${meta.name.toLowerCase()} theo từng tháng, từng năm 2020-2036. ${meta.desc}. Cổ pháp 12 trực, hoàng đạo, Tam Nương / Nguyệt Kỵ / Dương Công.`;
  const url = `${BASE}/ngay-tot/${activity}`;

  // Ưu tiên năm hiện tại + 1 năm sau ở đầu
  const orderedYears = [
    CURRENT_YEAR, CURRENT_YEAR + 1,
    ...YEARS.filter(y => y !== CURRENT_YEAR && y !== CURRENT_YEAR + 1),
  ];

  const cards = orderedYears.map(y => {
    const monthsHTML = Array.from({ length: 12 }, (_, mi) => {
      const m = mi + 1;
      return `<a href="/ngay-tot/${activity}/${y}/thang-${m}" class="cal-day">T${m}</a>`;
    }).join('');
    return `<div class="cal-month">
      <div class="cal-month-name">Năm ${y}</div>
      <div class="cal-days" style="grid-template-columns:repeat(6,1fr)">${monthsHTML}</div>
    </div>`;
  }).join('');

  // Cross-links to other activities
  const otherActs = ACTIVITY_LIST.filter(a => a !== key)
    .map(a => `<a href="/ngay-tot/${a}" class="rel-item">${esc(ACTIVITY_META[a].name)}</a>`).join('');

  const body = `
    <div class="hero">
      <div class="eyebrow">Ngày Tốt · ${esc(meta.name)}</div>
      <h1>Ngày Tốt <em>${esc(meta.name)}</em></h1>
      <p>${esc(meta.desc)}. Chọn năm và tháng để xem top ngày đẹp với chi tiết trực, sao hoàng đạo, can chi và giờ đẹp.</p>
    </div>
    <h2 class="sec-title">Chọn Năm và Tháng</h2>
    <div class="cal-grid">${cards}</div>
    <div class="rel-block">
      <div class="rel-title">Việc khác</div>
      <div class="rel-grid">${otherActs}</div>
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
        { '@type': 'ListItem', position: 3, name: meta.name, item: url },
      ]},
    },
    breadcrumbs: [
      { name: 'Trang Chủ', url: '/' },
      { name: 'Xem Ngày Tốt', url: '/ngay-tot' },
      { name: meta.name },
    ],
    body,
  });

  return new NextResponse(html, { headers: CACHE_HEADERS });
}
