// app/ngay-tot/lich/[year]/thang-[m]/route.ts — month overview với toàn bộ ngày
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import {
  computeMonth, scoreAllActivities,
  ACTIVITY_LIST, ACTIVITY_META,
} from '../../../../../tuvi-engine/dist/ngay-tot/index.js';
import {
  BASE, YEARS, esc, renderPage, CACHE_HEADERS, pad,
} from '../../../_shared';

const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                     'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string; m: string }> },
) {
  const { year: yearStr, m: monthSlug } = await params;
  const year = parseInt(yearStr);
  // Segment có thể là "thang-5" hoặc "5" — strip prefix
  const month = parseInt(monthSlug.replace(/^thang-/, ''));
  if (!YEARS.includes(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.redirect(`${BASE}/ngay-tot`);
  }
  // Canonical: ép URL có dạng /lich/{year}/thang-{m}
  if (!monthSlug.startsWith('thang-')) {
    return NextResponse.redirect(`${BASE}/ngay-tot/lich/${year}/thang-${month}`);
  }

  const monthName = MONTH_NAMES[month - 1];
  const title = `Ngày Tốt ${monthName}/${year} — Lịch Vạn Niên | Tử Vi Minh Bảo`;
  const desc = `Tra cứu ngày tốt ngày xấu ${monthName} năm ${year} đầy đủ: can chi, trực, sao hoàng đạo, 28 tú và đánh giá 10 loại việc cho từng ngày.`;
  const url = `${BASE}/ngay-tot/lich/${year}/thang-${month}`;

  // Compute all days
  const days = computeMonth(year, month);

  // Day cards (compact: hiện ngày + tốt/xấu chính)
  const dayCards = days.map(info => {
    const cls = info.overallTinhChat === 'tốt' ? 'good'
              : info.overallTinhChat === 'xấu' ? 'bad' : '';
    const kyList: string[] = [];
    if (info.kyTamNuong) kyList.push('Tam Nương');
    if (info.kyNguyetKy) kyList.push('Nguyệt Kỵ');
    if (info.kyDuongCong) kyList.push('Dương Công');

    // Top 3 activities cho ngày này
    const scores = scoreAllActivities(info)
      .filter(s => s.score >= 7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const topGood = scores.length
      ? scores.map(s => esc(ACTIVITY_META[s.activity].name)).join(', ')
      : '—';

    const dayUrl = `/ngay-tot/ngay/${year}/${month}/${info.duongLich.day}`;
    return `<div class="day-card ${cls}">
      <div class="day-head">
        <div class="day-date">
          <a href="${esc(dayUrl)}">${info.thuTrongTuan}, ${info.duongLich.day}/${info.duongLich.month}/${info.duongLich.year}</a>
          <small style="font-weight:400;color:var(--text-lt);margin-left:8px">ÂL ${info.amLich.day}/${info.amLich.month}</small>
        </div>
        <span class="day-score ${info.overallTinhChat==='tốt'?'':info.overallTinhChat==='xấu'?'bad':'mid'}">${info.overallTinhChat.toUpperCase()}</span>
      </div>
      <div class="day-meta">
        <span>Can chi: <strong>${esc(info.canChiNgay)}</strong></span>
        <span>Trực <strong>${esc(info.truc)}</strong></span>
        <span>Sao <strong>${esc(info.saoNgay)}</strong> (${info.hoangDao ? 'hoàng' : 'hắc'} đạo)</span>
        <span>Tú <strong>${esc(info.tu)}</strong></span>
        ${kyList.length ? `<span style="color:var(--red)">Kỵ: ${esc(kyList.join(', '))}</span>` : ''}
      </div>
      <div class="day-reasons"><strong>Tốt cho:</strong> ${topGood}</div>
    </div>`;
  }).join('');

  // Activity quick links cho tháng này
  const actLinks = ACTIVITY_LIST.map(a =>
    `<a href="/ngay-tot/${a}/${year}/thang-${month}" class="rel-item">${esc(ACTIVITY_META[a].name)} ${monthName}</a>`
  ).join('');

  // Related months
  const prevM = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextM = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const navMonths: string[] = [];
  if (YEARS.includes(prevM.y)) navMonths.push(`<a href="/ngay-tot/lich/${prevM.y}/thang-${prevM.m}" class="rel-item">← ${MONTH_NAMES[prevM.m-1]} ${prevM.y}</a>`);
  if (YEARS.includes(nextM.y)) navMonths.push(`<a href="/ngay-tot/lich/${nextM.y}/thang-${nextM.m}" class="rel-item">${MONTH_NAMES[nextM.m-1]} ${nextM.y} →</a>`);
  navMonths.push(`<a href="/ngay-tot/lich/${year}" class="rel-item">Toàn năm ${year}</a>`);

  const body = `
    <div class="hero">
      <div class="eyebrow">Lịch Vạn Niên · ${esc(monthName)} ${year}</div>
      <h1>Ngày Tốt <em>${esc(monthName)} ${year}</em></h1>
      <p>Bảng chi tiết ${days.length} ngày trong ${esc(monthName.toLowerCase())} năm ${year}: can chi, trực, 28 tú, sao hoàng đạo, ngày kỵ và đánh giá 10 loại việc.</p>
    </div>
    <h2 class="sec-title">Xem nhanh theo việc</h2>
    <div class="rel-grid" style="margin-bottom:20px">${actLinks}</div>
    <h2 class="sec-title">${days.length} ngày trong ${esc(monthName)} ${year}</h2>
    ${dayCards}
    <div class="rel-block">
      <div class="rel-title">Tháng khác</div>
      <div class="rel-grid">${navMonths.join('')}</div>
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
        { '@type': 'ListItem', position: 3, name: `Năm ${year}`, item: `${BASE}/ngay-tot/lich/${year}` },
        { '@type': 'ListItem', position: 4, name: `${monthName} ${year}`, item: url },
      ]},
    },
    breadcrumbs: [
      { name: 'Trang Chủ', url: '/' },
      { name: 'Xem Ngày Tốt', url: '/ngay-tot' },
      { name: `Năm ${year}`, url: `/ngay-tot/lich/${year}` },
      { name: `${monthName} ${year}` },
    ],
    body,
  });

  return new NextResponse(html, { headers: CACHE_HEADERS });
}
