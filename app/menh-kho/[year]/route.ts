// app/menh-kho/[year]/route.ts
// Hub page: /menh-kho/1990 → list 365 ngày → /menh-kho/1990/[mm-dd]
// 50 pages (1960–2010), ISR cache vĩnh viễn
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';

const BASE = 'https://www.tuviminhbao.com';
const CAN_NAMES = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const MONTHS    = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const VALID_YEARS = Array.from({ length: 51 }, (_, i) => 1960 + i); // 1960–2010

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getCanChi(year: number) {
  return `${CAN_NAMES[(year - 4 + 400) % 10]} ${CHI_NAMES[(year - 4 + 480) % 12]}`;
}

function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(month: number, year: number) {
  return [31, isLeap(year)?29:28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr);
  if (!VALID_YEARS.includes(year)) return new NextResponse('Not Found', { status: 404 });

  const canChi = getCanChi(year);
  const url    = `${BASE}/menh-kho/${year}`;
  const title  = `Lá Số Tử Vi Năm ${year} (${canChi}) — Tử Vi Minh Bảo`;
  const desc   = `Tra cứu lá số tử vi theo ngày sinh năm ${year} (${canChi}). Chọn ngày sinh để xem đầy đủ 24 giờ sinh và link lá số tương ứng.`;

  // Calendar grid theo tháng
  const calHTML = Array.from({ length: 12 }, (_, mi) => {
    const m   = mi + 1;
    const dim = daysInMonth(m, year);
    const days = Array.from({ length: dim }, (_, di) => {
      const d   = di + 1;
      const slug = `${pad(m)}-${pad(d)}`;
      return `<a href="/menh-kho/${year}/${slug}" class="day-cell">${d}</a>`;
    }).join('');
    return `<div class="month-block">
      <div class="month-name">${MONTHS[mi]}</div>
      <div class="days-grid">${days}</div>
    </div>`;
  }).join('');

  // Related years
  const relLinks = VALID_YEARS.filter(y => y !== year)
    .filter(y => Math.abs(y - year) <= 24 || y % 12 === year % 12) // cùng chi hoặc gần
    .slice(0, 12)
    .map(y => `<a href="/menh-kho/${y}" class="rel-item">${y} (${getCanChi(y)})</a>`)
    .join('');

  const schema = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: title, description: desc, url,
    inLanguage: 'vi',
    publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Mệnh Khố', item: `${BASE}/menh-kho.html` },
      { '@type': 'ListItem', position: 3, name: `Năm ${year}`, item: url },
    ]},
  });

  const html = `<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-lt:#777;--border:#CCC;--border-lt:#E8E8E8;--bg:#fff;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.6}
a{color:var(--blue);text-decoration:none}
.page{max-width:1000px;margin:0 auto;padding:0 32px 80px}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:9px 32px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;flex-wrap:wrap}
.bc a{color:var(--text-lt)}.bc a:hover{color:var(--navy)}
.hero{padding:40px 0 28px;border-bottom:2px solid var(--navy);margin-bottom:32px}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:10px}
h1{font-size:32px;font-weight:400;color:var(--navy);margin-bottom:8px}
h1 em{font-style:italic;color:var(--gold)}
.hero p{font-size:14px;color:var(--text-lt);max-width:560px}
.calendar{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:40px}
.month-block{background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:8px;padding:12px}
.month-name{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--navy);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border-lt)}
.days-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.day-cell{display:flex;align-items:center;justify-content:center;height:26px;font-size:12px;color:var(--navy);border-radius:3px;transition:all .1s}
.day-cell:hover{background:var(--blue);color:#fff}
.rel-block{padding:20px 0;border-top:1px solid var(--border-lt)}
.rel-title{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--text-lt);margin-bottom:10px}
.rel-grid{display:flex;flex-wrap:wrap;gap:8px}
.rel-item{font-size:12px;padding:5px 12px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:4px;color:var(--navy)}
.rel-item:hover{border-color:var(--blue);color:var(--blue)}
@media(max-width:700px){.page,.bc{padding-left:14px;padding-right:14px}.calendar{grid-template-columns:repeat(2,1fr)}h1{font-size:24px}}
@media(max-width:400px){.calendar{grid-template-columns:1fr}}
</style>
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/menh-kho.html">Mệnh Khố</a><span>›</span>
  <span>Năm ${year} · ${esc(canChi)}</span>
</div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Mệnh Khố · Tra Cứu Lá Số</div>
    <h1>Lá Số Năm <em>${esc(canChi)}</em> (${year})</h1>
    <p>Năm ${esc(canChi)} (${year}) — chọn ngày sinh bên dưới để tra cứu lá số tử vi theo cổ pháp. Mỗi ngày có 24 lá số (12 giờ sinh × nam/nữ) với phân tích đầy đủ 12 cung, cách cục và vận hạn.</p>
  </div>
  <div class="calendar">${calHTML}</div>
  <div class="rel-block">
    <div class="rel-title">Năm khác</div>
    <div class="rel-grid">${relLinks}</div>
  </div>
</div>
<script src="/footer.js"></script>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=23" defer></script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
    },
  });
}
