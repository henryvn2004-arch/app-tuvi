// app/menh-kho/[year]/[day]/route.ts
// Day hub: /menh-kho/1990/06-15 → 24 links (12 giờ × 2 giới) → /la-so/[slug]
// ~18,250 pages, ISR cache vĩnh viễn
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';

const BASE      = 'https://www.tuviminhbao.com';
const NAM_XEM   = 2027; // cập nhật hằng năm
const CAN_NAMES = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_CHI   = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_HOURS = ['23h–1h','1h–3h','3h–5h','5h–7h','7h–9h','9h–11h','11h–13h','13h–15h','15h–17h','17h–19h','19h–21h','21h–23h'];

const VALID_YEARS = Array.from({ length: 51 }, (_, i) => 1960 + i);

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

// Tạo slug cho la-so: {can-chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi}-{namXem}
function toLasoSlug(canChi: string, dd: number, mm: number, year: number, gioSlug: string, gioi: string): string {
  const ccSlug = canChi.toLowerCase()
    .replace(/[áàãảạăắằẵẳặâấầẫẩậ]/g,'a').replace(/[éèẽẻẹêếềễểệ]/g,'e')
    .replace(/[íìĩỉị]/g,'i').replace(/[óòõỏọôốồỗổộơớờỡởợ]/g,'o')
    .replace(/[úùũủụưứừữửự]/g,'u').replace(/[ýỳỹỷỵ]/g,'y')
    .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return `${ccSlug}-${pad(dd)}-${pad(mm)}-${year}-gio-${gioSlug}-${gioi}-${NAM_XEM}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ year: string; day: string }> }
) {
  const { year: yearStr, day } = await params;
  const year = parseInt(yearStr);
  if (!VALID_YEARS.includes(year)) return new NextResponse('Not Found', { status: 404 });

  // Parse day: "06-15" → month=6, date=15
  const dayMatch = day.match(/^(\d{2})-(\d{2})$/);
  if (!dayMatch) return new NextResponse('Not Found', { status: 404 });
  const mm = parseInt(dayMatch[1]);
  const dd = parseInt(dayMatch[2]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > daysInMonth(mm, year)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const canChi = getCanChi(year);
  const url    = `${BASE}/menh-kho/${year}/${day}`;
  const title  = `Lá Số Tử Vi Ngày ${dd}/${mm}/${year} (${canChi}) — 12 Giờ Sinh`;
  const desc   = `Xem lá số tử vi ngày ${dd} tháng ${mm} năm ${year} (${canChi}) theo 12 giờ sinh, nam và nữ. An sao cổ pháp, phân tích đầy đủ.`;

  // 24 cards: 12 giờ × 2 giới
  const cardsHTML = GIO_CHI.map((gioChi, gi) => {
    const gioSlug = GIO_SLUGS[gi];
    const hours   = GIO_HOURS[gi];
    const namSlug = toLasoSlug(canChi, dd, mm, year, gioSlug, 'nam');
    const nuSlug  = toLasoSlug(canChi, dd, mm, year, gioSlug, 'nu');
    return `<div class="gio-card">
      <div class="gio-header">
        <span class="gio-chi">Giờ ${esc(gioChi)}</span>
        <span class="gio-hours">${hours}</span>
      </div>
      <div class="gio-links">
        <a href="/la-so/${esc(namSlug)}" class="gio-link gio-nam">Nam →</a>
        <a href="/la-so/${esc(nuSlug)}"  class="gio-link gio-nu">Nữ →</a>
      </div>
    </div>`;
  }).join('');

  // Ngày liền kề
  const prevDay = dd > 1 ? `${pad(mm)}-${pad(dd-1)}` : (mm > 1 ? `${pad(mm-1)}-${pad(daysInMonth(mm-1,year))}` : null);
  const nextDay = dd < daysInMonth(mm, year) ? `${pad(mm)}-${pad(dd+1)}` : (mm < 12 ? `${pad(mm+1)}-01` : null);

  const schema = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: title, description: desc, url, inLanguage: 'vi',
    publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Mệnh Khố', item: `${BASE}/menh-kho.html` },
      { '@type': 'ListItem', position: 3, name: `Năm ${year}`, item: `${BASE}/menh-kho/${year}` },
      { '@type': 'ListItem', position: 4, name: `${dd}/${mm}/${year}`, item: url },
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
.page{max-width:900px;margin:0 auto;padding:0 32px 80px}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:9px 32px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;flex-wrap:wrap}
.bc a{color:var(--text-lt)}.bc a:hover{color:var(--navy)}
.hero{padding:36px 0 24px;border-bottom:2px solid var(--navy);margin-bottom:28px}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:10px}
h1{font-size:28px;font-weight:400;color:var(--navy);margin-bottom:8px}
h1 em{font-style:italic;color:var(--gold)}
.hero p{font-size:13px;color:var(--text-lt)}
.nav-days{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-lt);margin-bottom:20px;font-size:13px}
.nav-days a{color:var(--blue);font-weight:600}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:32px}
.gio-card{background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:8px;padding:12px}
.gio-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.gio-chi{font-size:14px;font-weight:700;color:var(--navy)}
.gio-hours{font-size:10px;color:var(--text-lt)}
.gio-links{display:flex;gap:6px}
.gio-link{flex:1;text-align:center;padding:6px 0;border-radius:4px;font-size:12px;font-weight:600;transition:all .12s}
.gio-nam{background:var(--navy);color:#fff}.gio-nam:hover{background:#1455A4}
.gio-nu{background:var(--gold);color:#fff}.gio-nu:hover{opacity:.85}
.cta-box{padding:20px 24px;background:linear-gradient(135deg,#061A2E,#0D3B5E);border-radius:8px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.cta-box p{font-size:13px;opacity:.85;max-width:480px;line-height:1.6}
.cta-btn{background:#c9a84c;color:#061A2E;padding:9px 20px;border-radius:5px;font-weight:700;font-size:13px;white-space:nowrap}
.note{font-size:12px;color:var(--text-lt);padding:10px 0;border-top:1px solid var(--border-lt)}
@media(max-width:700px){.page,.bc{padding-left:14px;padding-right:14px}.grid{grid-template-columns:repeat(2,1fr)}h1{font-size:22px}.cta-box{flex-direction:column;text-align:center}}
</style>
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/menh-kho.html">Mệnh Khố</a><span>›</span>
  <a href="/menh-kho/${year}">Năm ${year}</a><span>›</span>
  <span>${dd}/${mm}/${year}</span>
</div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Mệnh Khố · ${dd}/${mm}/${year} · ${esc(canChi)}</div>
    <h1>Lá Số Ngày <em>${dd}/${mm}/${year}</em></h1>
    <p>Chọn giờ sinh và giới tính để xem lá số tử vi cổ pháp — phân tích 12 cung, đại vận, tiểu vận năm ${NAM_XEM}.</p>
  </div>

  <div class="nav-days">
    ${prevDay ? `<a href="/menh-kho/${year}/${prevDay}">← ${prevDay.split('-').reverse().join('/')}/${year}</a>` : '<span></span>'}
    <span style="font-size:12px;color:var(--text-lt)">12 giờ × 2 giới = 24 lá số</span>
    ${nextDay ? `<a href="/menh-kho/${year}/${nextDay}">${nextDay.split('-').reverse().join('/')}/${year} →</a>` : '<span></span>'}
  </div>

  <div class="grid">${cardsHTML}</div>

  <div class="cta-box">
    <p>Muốn nhập ngày sinh khác và nhận luận giải AI chuyên sâu 24 phần?</p>
    <a class="cta-btn" href="/luan-giai.html">Xem Lá Số Miễn Phí →</a>
  </div>

  <p class="note">* Lá số hiển thị vận hạn năm ${NAM_XEM}. Để xem năm khác, dùng công cụ luận giải trực tiếp.</p>
</div>
<script src="/footer.js"></script>
<script src="/nav.js?v=14" defer></script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
    },
  });
}
