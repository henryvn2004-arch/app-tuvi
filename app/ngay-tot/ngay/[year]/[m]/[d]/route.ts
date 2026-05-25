// app/ngay-tot/ngay/[year]/[m]/[d]/route.ts — day detail, 10 activity scores
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import {
  computeNgayTot, scoreAllActivities,
  ACTIVITY_META,
} from '../../../../../../tuvi-engine/dist/ngay-tot/index.js';
import {
  BASE, YEARS, esc, renderPage, CACHE_HEADERS, daysInMonth,
} from '../../../../_shared';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string; m: string; d: string }> },
) {
  const { year: yearStr, m: monthStr, d: dayStr } = await params;
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);
  if (!YEARS.includes(year) || month < 1 || month > 12
      || day < 1 || day > daysInMonth(month, year)) {
    return NextResponse.redirect(`${BASE}/ngay-tot`);
  }

  const info = computeNgayTot(day, month, year);
  const scores = scoreAllActivities(info);

  const title = `Ngày ${day}/${month}/${year} có tốt không? — ${info.thuTrongTuan}, ${esc(info.canChiNgay)}`;
  const desc = `Phân tích chi tiết ngày ${day}/${month}/${year} (ÂL ${info.amLich.day}/${info.amLich.month}, ${esc(info.canChiNgay)}): trực ${esc(info.truc)}, sao ${esc(info.saoNgay)}, tú ${esc(info.tu)}, đánh giá 10 loại việc.`;
  const url = `${BASE}/ngay-tot/ngay/${year}/${month}/${day}`;

  const kyList: string[] = [];
  if (info.kyTamNuong) kyList.push('Tam Nương');
  if (info.kyNguyetKy) kyList.push('Nguyệt Kỵ');
  if (info.kyDuongCong) kyList.push('Dương Công');

  // Card 1: tổng quan
  const cardOverall = `<div class="detail-card">
    <h3>Tổng quan</h3>
    <div class="row"><span>Dương lịch</span><strong>${info.duongLich.day}/${info.duongLich.month}/${info.duongLich.year}</strong></div>
    <div class="row"><span>Âm lịch</span><strong>${info.amLich.day}/${info.amLich.month}/${info.amLich.year}${info.amLich.isLeap ? ' (nhuận)' : ''}</strong></div>
    <div class="row"><span>Thứ</span><strong>${info.thuTrongTuan}</strong></div>
    <div class="row"><span>Can chi ngày</span><strong>${esc(info.canChiNgay)}</strong></div>
    <div class="row"><span>Chi tháng</span><strong>${esc(info.chiThang)}</strong></div>
    <div class="row"><span>Đánh giá chung</span>
      <span class="pill ${info.overallTinhChat==='tốt'?'good':info.overallTinhChat==='xấu'?'bad':'mid'}">${info.overallTinhChat.toUpperCase()}</span>
    </div>
  </div>`;

  // Card 2: trực + sao + tú
  const cardStars = `<div class="detail-card">
    <h3>Trực, Sao, Tú</h3>
    <div class="row"><span>12 trực</span>
      <strong>${esc(info.truc)} <span class="pill ${info.trucTinhChat==='cát'?'good':info.trucTinhChat==='hung'?'bad':'mid'}">${esc(info.trucTinhChat)}</span></strong>
    </div>
    <div class="row"><span>Sao ngày</span>
      <strong>${esc(info.saoNgay)} <span class="pill ${info.hoangDao?'good':'bad'}">${info.hoangDao?'hoàng đạo':'hắc đạo'}</span></strong>
    </div>
    <div class="row" style="display:block">
      <span style="display:block;margin-bottom:4px">Ý nghĩa</span>
      <strong style="font-weight:400;font-size:13px;color:var(--text-lt)">${esc(info.saoYNghia)}</strong>
    </div>
    <div class="row"><span>28 Nhị Thập Bát Tú</span>
      <strong>${esc(info.tu)} <span class="pill ${info.tuTinhChat==='cát'?'good':'bad'}">${esc(info.tuTinhChat)}</span></strong>
    </div>
  </div>`;

  // Card 3: cấm kỵ
  const cardKy = `<div class="detail-card">
    <h3>Cấm kỵ</h3>
    <div class="row"><span>Tam Nương</span>
      <strong>${info.kyTamNuong ? '<span class="pill bad">CÓ — kỵ</span>' : '<span class="pill good">Không</span>'}</strong>
    </div>
    <div class="row"><span>Nguyệt Kỵ</span>
      <strong>${info.kyNguyetKy ? '<span class="pill bad">CÓ — kỵ</span>' : '<span class="pill good">Không</span>'}</strong>
    </div>
    <div class="row"><span>Dương Công kỵ nhật</span>
      <strong>${info.kyDuongCong ? '<span class="pill bad">CÓ — đại kỵ</span>' : '<span class="pill good">Không</span>'}</strong>
    </div>
  </div>`;

  // Card 4: giờ hoàng đạo
  const gioRows = info.gio.map(g =>
    `<div class="gio-row ${g.hoangDao?'hoang':'hac'}">
      <span><strong>${esc(g.chi)}</strong> ${esc(g.range)}</span>
      <span>${esc(g.sao)}</span>
    </div>`
  ).join('');
  const cardGio = `<div class="detail-card" style="grid-column:1/-1">
    <h3>12 giờ — Hoàng đạo (xanh) / Hắc đạo (đỏ)</h3>
    <div class="gio-list">${gioRows}</div>
  </div>`;

  // Card 5: 10 activity scores
  const actRows = scores
    .sort((a, b) => b.score - a.score)
    .map(s => {
      const meta = ACTIVITY_META[s.activity];
      const pct = s.score * 10;
      const color = s.score >= 8 ? 'var(--green)' : s.score >= 5 ? 'var(--gold)' : 'var(--red)';
      return `<tr>
        <td><a href="/ngay-tot/${s.activity}/${year}/thang-${month}">${esc(meta.name)}</a></td>
        <td>
          <span class="bar"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>
          ${s.score}/10 <span style="color:var(--text-lt);font-weight:400">(${esc(s.level)})</span>
        </td>
      </tr>`;
    }).join('');
  const cardActs = `<div class="detail-card" style="grid-column:1/-1">
    <h3>Đánh giá 10 loại việc</h3>
    <table class="act-table">${actRows}</table>
  </div>`;

  // Detailed reasons for top 3 activities
  const top3 = scores.slice(0, 3);
  const detailReasons = top3.map(s => {
    const meta = ACTIVITY_META[s.activity];
    return `<div style="margin-bottom:14px">
      <strong style="color:var(--navy)">${esc(meta.name)} (${s.score}/10 — ${esc(s.level)})</strong>
      ${s.reasons.length ? `<div class="day-reasons" style="margin-top:4px"><strong>Tốt:</strong> ${esc(s.reasons.join('; '))}</div>` : ''}
      ${s.warnings.length ? `<div class="day-warns" style="margin-top:2px"><strong>Lưu ý:</strong> ${esc(s.warnings.join('; '))}</div>` : ''}
    </div>`;
  }).join('');

  // Related: ngày trước/sau, tháng
  const total = daysInMonth(month, year);
  const navRel: string[] = [];
  if (day > 1) navRel.push(`<a href="/ngay-tot/ngay/${year}/${month}/${day-1}" class="rel-item">← Ngày ${day-1}/${month}</a>`);
  if (day < total) navRel.push(`<a href="/ngay-tot/ngay/${year}/${month}/${day+1}" class="rel-item">Ngày ${day+1}/${month} →</a>`);
  navRel.push(`<a href="/ngay-tot/lich/${year}/thang-${month}" class="rel-item">Toàn tháng ${month}/${year}</a>`);

  const body = `
    <div class="hero">
      <div class="eyebrow">${esc(info.thuTrongTuan)} · ${esc(info.canChiNgay)}</div>
      <h1>Ngày <em>${day}/${month}/${year}</em> có tốt không?</h1>
      <p>Phân tích chi tiết ngày ${day}/${month}/${year} dương lịch (âm lịch ${info.amLich.day}/${info.amLich.month}/${info.amLich.year}). Đánh giá cho 10 loại việc cổ truyền.</p>
    </div>
    <div class="detail-grid">${cardOverall}${cardStars}${cardKy}${cardGio}${cardActs}</div>
    ${top3.length ? `<h2 class="sec-title">3 việc phù hợp nhất hôm nay</h2><div>${detailReasons}</div>` : ''}
    ${kyList.length ? `<div class="day-card bad"><strong>⚠️ Cảnh báo cấm kỵ:</strong> Ngày này rơi vào ${esc(kyList.join(', '))} — nên tránh các việc trọng đại như cưới hỏi, khai trương, nhập trạch, an táng.</div>` : ''}
    <div class="rel-block">
      <div class="rel-title">Ngày khác</div>
      <div class="rel-grid">${navRel.join('')}</div>
    </div>
  `;

  const html = renderPage({
    title, desc, canonical: url,
    schema: {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: title, description: desc, datePublished: new Date(year, month-1, day).toISOString(),
      url, inLanguage: 'vi',
      publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE },
      breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Xem Ngày Tốt', item: `${BASE}/ngay-tot` },
        { '@type': 'ListItem', position: 3, name: `Năm ${year}`, item: `${BASE}/ngay-tot/lich/${year}` },
        { '@type': 'ListItem', position: 4, name: `${day}/${month}/${year}`, item: url },
      ]},
    },
    breadcrumbs: [
      { name: 'Trang Chủ', url: '/' },
      { name: 'Xem Ngày Tốt', url: '/ngay-tot' },
      { name: `Năm ${year}`, url: `/ngay-tot/lich/${year}` },
      { name: `${day}/${month}/${year}` },
    ],
    body,
  });

  return new NextResponse(html, { headers: CACHE_HEADERS });
}
