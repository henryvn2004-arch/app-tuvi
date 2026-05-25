// app/ngay-tot/[activity]/[year]/thang-[m]/route.ts — THE long-tail page
// vd: /ngay-tot/cuoi-hoi/2026/thang-5
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import {
  computeMonth, topDaysForActivity,
  ACTIVITY_META, ACTIVITY_LIST,
  type ActivityKey,
} from '../../../../../tuvi-engine/dist/ngay-tot/index.js';
import {
  BASE, YEARS, esc, renderPage, CACHE_HEADERS,
} from '../../../_shared';

const VALID_ACT = new Set(ACTIVITY_LIST as readonly string[]);
const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                     'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ activity: string; year: string; m: string }> },
) {
  const { activity, year: yearStr, m: monthSlug } = await params;
  const year = parseInt(yearStr);
  const month = parseInt(monthSlug.replace(/^thang-/, ''));
  if (!VALID_ACT.has(activity) || !YEARS.includes(year)
      || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.redirect(`${BASE}/ngay-tot`);
  }
  if (!monthSlug.startsWith('thang-')) {
    return NextResponse.redirect(`${BASE}/ngay-tot/${activity}/${year}/thang-${month}`);
  }

  const key = activity as ActivityKey;
  const meta = ACTIVITY_META[key];
  const monthName = MONTH_NAMES[month - 1];

  const title = `${meta.seoTitle(year, month)} | Tử Vi Minh Bảo`;
  const desc = `${meta.desc}. Top ngày đẹp nhất trong ${monthName.toLowerCase()} ${year} kèm can chi, trực, sao hoàng đạo, giờ tốt và lý do chọn.`;
  const url = `${BASE}/ngay-tot/${activity}/${year}/thang-${month}`;

  // Compute + lọc top ngày
  const days = computeMonth(year, month);
  const top = topDaysForActivity(days, key, 15);

  // Best days cards
  let topHTML = '';
  if (top.length === 0) {
    topHTML = `<div class="day-card bad">
      <div class="day-head"><div class="day-date">Không có ngày phù hợp</div></div>
      <div class="day-reasons">Trong ${esc(monthName.toLowerCase())} ${year} không có ngày nào đạt điểm ≥ 6 cho việc ${esc(meta.name.toLowerCase())}. Cân nhắc xem tháng khác.</div>
    </div>`;
  } else {
    topHTML = top.map(({ info, score }) => {
      const cls = score.score >= 8 ? 'good' : score.score >= 6 ? '' : 'bad';
      const scoreClass = score.score >= 8 ? '' : score.score >= 6 ? 'mid' : 'bad';
      const kyList: string[] = [];
      if (info.kyTamNuong) kyList.push('Tam Nương');
      if (info.kyNguyetKy) kyList.push('Nguyệt Kỵ');
      if (info.kyDuongCong) kyList.push('Dương Công');

      const goodGio = info.gioHoangDao.map(g => `${g.chi} (${g.range})`).join(', ');
      const dayUrl = `/ngay-tot/ngay/${year}/${month}/${info.duongLich.day}`;

      return `<div class="day-card ${cls}">
        <div class="day-head">
          <div class="day-date">
            <a href="${esc(dayUrl)}">${info.thuTrongTuan}, ${info.duongLich.day}/${info.duongLich.month}/${info.duongLich.year}</a>
            <small style="font-weight:400;color:var(--text-lt);margin-left:8px">ÂL ${info.amLich.day}/${info.amLich.month}</small>
          </div>
          <span class="day-score ${scoreClass}">${score.score}/10 · ${esc(score.level)}</span>
        </div>
        <div class="day-meta">
          <span>Can chi: <strong>${esc(info.canChiNgay)}</strong></span>
          <span>Trực <strong>${esc(info.truc)}</strong></span>
          <span>Sao <strong>${esc(info.saoNgay)}</strong> (${info.hoangDao ? 'hoàng' : 'hắc'} đạo)</span>
          <span>Tú <strong>${esc(info.tu)}</strong></span>
          ${kyList.length ? `<span style="color:var(--red)">Kỵ: ${esc(kyList.join(', '))}</span>` : ''}
        </div>
        ${score.reasons.length ? `<div class="day-reasons"><strong>Lý do tốt:</strong> ${esc(score.reasons.join('; '))}</div>` : ''}
        ${score.warnings.length ? `<div class="day-warns"><strong>Lưu ý:</strong> ${esc(score.warnings.join('; '))}</div>` : ''}
        <div class="day-reasons"><strong>Giờ hoàng đạo:</strong> ${esc(goodGio)}</div>
      </div>`;
    }).join('');
  }

  // Other activities for this month
  const otherActs = ACTIVITY_LIST.filter(a => a !== key)
    .map(a => `<a href="/ngay-tot/${a}/${year}/thang-${month}" class="rel-item">${esc(ACTIVITY_META[a].name)} ${monthName}/${year}</a>`).join('');

  // Other months for this activity
  const otherMonths: string[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    if (offset === 0) continue;
    let m2 = month + offset;
    let y2 = year;
    while (m2 < 1) { m2 += 12; y2--; }
    while (m2 > 12) { m2 -= 12; y2++; }
    if (YEARS.includes(y2)) {
      otherMonths.push(`<a href="/ngay-tot/${activity}/${y2}/thang-${m2}" class="rel-item">${MONTH_NAMES[m2-1]} ${y2}</a>`);
    }
  }
  otherMonths.push(`<a href="/ngay-tot/${activity}" class="rel-item">Tất cả năm</a>`);

  const intro = `<p style="margin-bottom:18px">Dưới đây là <strong>${top.length} ngày đẹp nhất</strong> trong ${esc(monthName.toLowerCase())} năm ${year} để ${esc(meta.name.toLowerCase())}, được chấm điểm dựa trên 12 trực, 28 nhị thập bát tú, sao hoàng/hắc đạo, và các ngày kỵ cổ truyền (Tam Nương, Nguyệt Kỵ, Dương Công).</p>`;

  const body = `
    <div class="hero">
      <div class="eyebrow">Ngày Tốt · ${esc(meta.name)}</div>
      <h1>Ngày Tốt <em>${esc(meta.name)}</em> ${esc(monthName)} ${year}</h1>
      <p>${esc(meta.desc)}. Top ngày đẹp nhất trong ${esc(monthName.toLowerCase())} ${year}.</p>
    </div>
    ${intro}
    <h2 class="sec-title">Top ngày đẹp ${esc(meta.name.toLowerCase())} ${esc(monthName.toLowerCase())} ${year}</h2>
    ${topHTML}
    <div class="rel-block">
      <div class="rel-title">${esc(meta.name)} ở tháng khác</div>
      <div class="rel-grid">${otherMonths.join('')}</div>
    </div>
    <div class="rel-block">
      <div class="rel-title">Việc khác trong ${esc(monthName.toLowerCase())} ${year}</div>
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
        { '@type': 'ListItem', position: 3, name: meta.name, item: `${BASE}/ngay-tot/${activity}` },
        { '@type': 'ListItem', position: 4, name: `${monthName} ${year}`, item: url },
      ]},
    },
    breadcrumbs: [
      { name: 'Trang Chủ', url: '/' },
      { name: 'Xem Ngày Tốt', url: '/ngay-tot' },
      { name: meta.name, url: `/ngay-tot/${activity}` },
      { name: `${monthName} ${year}` },
    ],
    body,
  });

  return new NextResponse(html, { headers: CACHE_HEADERS });
}
