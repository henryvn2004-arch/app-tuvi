// app/van-han/[slug]/route.ts
// Bridge content AEO pages: "tuổi [chi] năm [namXem]"
// 36 pages: 12 chi × 3 năm xem (2026/2027/2028)
// ISR — cache vĩnh viễn sau lần đầu request
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = 'https://www.tuviminhbao.com';

// ── Constants ──────────────────────────────────────────────────────
const CHI_NAMES  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const CHI_SLUGS  = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const CAN_NAMES  = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const GIO_CHI    = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_SLUGS  = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_HOURS  = [23,1,3,5,7,9,11,13,15,17,19,21];
const NAM_XEMS   = [2026, 2027, 2028];

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Parse slug: "tuoi-ngo-nam-2027" → { chiIdx, namXem } | null
function parseSlug(slug: string): { chiIdx: number; namXem: number } | null {
  const m = slug.match(/^tuoi-([a-z]+)-nam-(\d{4})$/);
  if (!m) return null;
  const chiIdx  = CHI_SLUGS.indexOf(m[1]);
  const namXem  = parseInt(m[2]);
  if (chiIdx < 0 || !NAM_XEMS.includes(namXem)) return null;
  return { chiIdx, namXem };
}

// Lấy các năm sinh thuộc chi trong khoảng 1960–2005
function getYearsForChi(chiIdx: number): number[] {
  const years: number[] = [];
  for (let y = 1960; y <= 2005; y++) {
    if ((y - 4 + 480) % 12 === chiIdx) years.push(y);
  }
  return years;
}

// Can của một năm
function getCanOfYear(year: number): string {
  return CAN_NAMES[(year - 4 + 400) % 10];
}

// Load engine một lần
let _engineCache: { convertDuongToAm: (...a: unknown[]) => unknown; anSaoLaSo: (...a: unknown[]) => unknown } | null = null;
function loadEngine() {
  if (_engineCache) return _engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Record<string, unknown>;
  g.window = g;
  const fn = new Function('window', 'globalThis', code + '\nreturn { convertDuongToAm, anSaoLaSo };');
  _engineCache = fn(g, g) as typeof _engineCache;
  return _engineCache!;
}

type StarRecord  = Record<string, string>;
type PalaceRec   = Record<string, unknown>;
type DaiVanRec   = Record<string, unknown>;
type CachCucRec  = Record<string, string>;
type CungScores  = Record<string, Record<string, number>>;

interface GioRow {
  gioIdx: number;
  gioChi: string;
  gioSlug: string;
  cungMemh: string;
  chinhTinh: string;
  daiVanCanChi: string;
  daiVanAge: string;
  diemTong: number;
  laSoSlug: string;
}

interface YearData {
  year: number;
  canChi: string;
  rows: GioRow[];
  topCachCuc: CachCucRec[];
}

function computeYearData(year: number, namXem: number, chiIdx: number): YearData | null {
  try {
    const { convertDuongToAm, anSaoLaSo } = loadEngine();
    const canChi = `${getCanOfYear(year)} ${CHI_NAMES[chiIdx]}`;
    const rows: GioRow[] = [];
    const cachCucMap: Record<string, CachCucRec> = {};

    for (let gi = 0; gi < 12; gi++) {
      try {
        const gh = GIO_HOURS[gi];
        const conv = convertDuongToAm(15, 6, year, gh) as Record<string, unknown>;
        if (!conv?.amLich) continue;
        const amLich = conv.amLich as Record<string, number>;

        const ls = anSaoLaSo({
          ngayAL: amLich.day, thangAL: amLich.month, namAL: year,
          canNam: conv.canNam, chiNam: conv.chiNam, gioIdx: conv.gioIdx ?? gi,
          gioitinh: 'nam', namXem,
        }) as Record<string, unknown>;
        if (!ls) continue;

        const palaces  = (ls.palaces as PalaceRec[]) || [];
        const menhP    = palaces.find(p => p.isMenh) as PalaceRec | undefined;
        const cungMemh = String(menhP?.cungName || '');
        const chinhTinh= ((menhP?.majorStars as StarRecord[]) || []).map(s => s.ten||s).join(', ') || '—';

        const daiVans  = (ls.daiVans as DaiVanRec[]) || [];
        const curDV    = daiVans.find(d => d.isCurrentDV) as DaiVanRec | undefined;
        const daiVanCanChi = String(curDV?.canChi || '—');
        const daiVanAge    = curDV ? `${curDV.tuoiStart}–${curDV.tuoiEnd}t` : '—';

        const scores   = (ls.cungScores as CungScores) || {};
        const sc       = scores[cungMemh];
        const METRICS  = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
        const diemTong = sc ? Math.round(METRICS.reduce((s, m) => s + (sc[m]||0), 0) / METRICS.length * 10) / 10 : 0;

        // can chi slug for la-so link
        const canSlug  = canChi.toLowerCase()
          .replace(/á|à|ã|ả|ạ|ă|ắ|ằ|ẵ|ẳ|ặ|â|ấ|ầ|ẫ|ẩ|ậ/g,'a')
          .replace(/é|è|ẽ|ẻ|ẹ|ê|ế|ề|ễ|ể|ệ/g,'e')
          .replace(/í|ì|ĩ|ỉ|ị/g,'i')
          .replace(/ó|ò|õ|ỏ|ọ|ô|ố|ồ|ỗ|ổ|ộ|ơ|ớ|ờ|ỡ|ở|ợ/g,'o')
          .replace(/ú|ù|ũ|ủ|ụ|ư|ứ|ừ|ữ|ử|ự/g,'u')
          .replace(/ý|ỳ|ỹ|ỷ|ỵ/g,'y')
          .replace(/đ/g,'d')
          .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        // Dùng format hiện tại của laso_pregen: {can-chi}-nam-{year}-gio-{gio}
        const laSoSlug = `${canSlug}-nam-${year}-gio-${GIO_SLUGS[gi]}`;

        // aggregate cach cuc
        const cc = (ls.cachCuc as CachCucRec[]) || [];
        cc.forEach(c => { if (c.ten) cachCucMap[c.ten] = c; });

        rows.push({ gioIdx: gi, gioChi: GIO_CHI[gi], gioSlug: GIO_SLUGS[gi], cungMemh, chinhTinh, daiVanCanChi, daiVanAge, diemTong, laSoSlug });
      } catch { /* skip giờ lỗi */ }
    }

    const topCachCuc = Object.values(cachCucMap).slice(0, 6);
    return { year, canChi, rows, topCachCuc };
  } catch { return null; }
}

function starRating(diem: number): string {
  if (diem >= 7) return '<span style="color:#1a6b3a">★★★★</span>';
  if (diem >= 5.5) return '<span style="color:#7a5f0a">★★★</span>';
  if (diem >= 4) return '<span style="color:#1455A4">★★</span>';
  return '<span style="color:#C0392B">★</span>';
}

function buildHTML(chiIdx: number, namXem: number, yearsData: YearData[]): string {
  const chiName = CHI_NAMES[chiIdx];
  const chiSlug = CHI_SLUGS[chiIdx];
  const url     = `${BASE}/van-han/tuoi-${chiSlug}-nam-${namXem}`;
  const title   = `Tuổi ${chiName} Vận Hạn Năm ${namXem} — Tử Vi Đẩu Số Cổ Pháp`;
  const desc    = `Xem vận hạn năm ${namXem} cho người tuổi ${chiName} theo tử vi đẩu số cổ pháp. Phân tích cung mệnh, đại vận, cách cục đặc biệt theo giờ sinh — miễn phí.`;

  // Aggregate cach cuc across all years
  const allCachCuc: Record<string, CachCucRec> = {};
  yearsData.forEach(yd => yd.topCachCuc.forEach(c => { if (c.ten) allCachCuc[c.ten] = c; }));
  const topCC = Object.values(allCachCuc).slice(0, 5);

  // FAQ schema for AEO
  const faqItems = [
    { q: `Tuổi ${chiName} năm ${namXem} có vận tốt không?`, a: `Vận hạn năm ${namXem} của người tuổi ${chiName} phụ thuộc vào giờ sinh cụ thể — giờ sinh quyết định cung Mệnh và đại vận đang chạy. Xem bảng phân tích theo từng giờ sinh bên dưới hoặc nhập ngày giờ sinh chính xác để có kết quả cá nhân hóa.` },
    { q: `Người sinh năm ${yearsData[2]?.year || 1990} (tuổi ${chiName}) đang chạy đại vận gì năm ${namXem}?`, a: `Tùy theo giờ sinh, người sinh năm ${yearsData[2]?.year || 1990} đang chạy các đại vận khác nhau năm ${namXem}. Xem bảng chi tiết theo giờ sinh bên dưới.` },
    { q: `Tuổi ${chiName} hợp với nghề gì?`, a: `Theo tử vi đẩu số, người tuổi ${chiName} có các chính tinh và cách cục đặc trưng ảnh hưởng đến sự nghiệp. Để biết chính xác, cần xem cung Quan Lộc trong lá số cá nhân theo ngày giờ sinh.` },
  ];
  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  });

  const articleSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: desc,
    url,
    inLanguage: 'vi',
    author: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE },
    publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE, logo: { '@type': 'ImageObject', url: `${BASE}/seal.webp` } },
  });

  // Tables HTML
  const tablesHTML = yearsData.map(yd => {
    const canChiLink = yd.canChi.toLowerCase()
      .replace(/á|à|ã|ả|ạ|ă|ắ|ằ|ẵ|ẳ|ặ|â|ấ|ầ|ẫ|ẩ|ậ/g,'a').replace(/é|è|ẽ|ẻ|ẹ|ê|ế|ề|ễ|ể|ệ/g,'e')
      .replace(/í|ì|ĩ|ỉ|ị/g,'i').replace(/ó|ò|õ|ỏ|ọ|ô|ố|ồ|ỗ|ổ|ộ|ơ|ớ|ờ|ỡ|ở|ợ/g,'o')
      .replace(/ú|ù|ũ|ủ|ụ|ư|ứ|ừ|ữ|ử|ự/g,'u').replace(/ý|ỳ|ỹ|ỷ|ỵ/g,'y')
      .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

    const rows = yd.rows.map(r => `
      <tr>
        <td><strong>Giờ ${esc(r.gioChi)}</strong></td>
        <td>${esc(r.cungMemh)}</td>
        <td>${esc(r.chinhTinh)}</td>
        <td>${esc(r.daiVanCanChi)} <span style="color:#999;font-size:11px">(${esc(r.daiVanAge)})</span></td>
        <td>${r.diemTong} ${starRating(r.diemTong)}</td>
        <td><a href="/la-so/${esc(r.laSoSlug)}" class="tbl-link">Xem →</a></td>
      </tr>`).join('');

    return `
    <div class="year-block">
      <h2>Người sinh năm <em>${esc(yd.canChi)}</em> (${yd.year})</h2>
      <p class="year-intro">Nạp âm và cục của lá số phụ thuộc vào can chi năm sinh và giờ sinh. Bảng dưới cho thấy cung Mệnh, chính tinh và đại vận đang chạy năm ${namXem} theo từng giờ sinh — dành cho <strong>nam giới</strong>.</p>
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Giờ sinh</th>
              <th>Cung Mệnh</th>
              <th>Chính tinh</th>
              <th>Đại vận ${namXem}</th>
              <th>Điểm cung</th>
              <th>Lá số</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="note">* Kết quả tính cho ngày 15/6/${yd.year} — cung Mệnh có thể thay đổi theo tháng/ngày sinh thực tế. <a href="/van-han/${canChiLink}-nam-${namXem}" class="inline-link">Xem riêng tuổi ${esc(yd.canChi)} →</a></p>
    </div>`;
  }).join('');

  // Cach cuc block
  const cachCucHTML = topCC.length > 0 ? `
    <div class="cc-block">
      <h2>Cách Cục Phổ Biến Của Tuổi ${esc(chiName)}</h2>
      <p>Các cách cục này xuất hiện thường xuyên trong lá số người tuổi ${esc(chiName)}, tùy theo giờ sinh và năm sinh cụ thể:</p>
      <div class="cc-list">
        ${topCC.map(c => `<div class="cc-item"><span class="cc-badge">${esc(c.ten)}</span><span class="cc-desc">${esc(c.moTa||c.tomTat||'')}</span></div>`).join('')}
      </div>
    </div>` : '';

  // FAQ block
  const faqHTML = faqItems.map(f => `
    <div class="faq-item">
      <h3 class="faq-q">${esc(f.q)}</h3>
      <p class="faq-a">${esc(f.a)}</p>
    </div>`).join('');

  // Related van-han links (other years)
  const relLinks = NAM_XEMS.filter(y => y !== namXem).map(y =>
    `<a href="/van-han/tuoi-${chiSlug}-nam-${y}" class="rel-item">Tuổi ${esc(chiName)} Năm ${y}</a>`
  );
  CHI_SLUGS.filter((_,i) => i !== chiIdx).slice(0,6).forEach(s => {
    const idx = CHI_SLUGS.indexOf(s);
    relLinks.push(`<a href="/van-han/tuoi-${s}-nam-${namXem}" class="rel-item">Tuổi ${esc(CHI_NAMES[idx])} Năm ${namXem}</a>`);
  });

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${BASE}/seal.webp">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${articleSchema}</script>
<script type="application/ld+json">${faqSchema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#fff;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.6}
a{color:var(--blue);text-decoration:none}
.page{max-width:1000px;margin:0 auto;padding:0 40px 80px}
@media(max-width:700px){.page{padding:0 16px 60px}}

.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:10px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px}
.bc a{color:var(--text-lt)}.bc a:hover{color:var(--navy)}
@media(max-width:700px){.bc{padding:10px 16px}}

.hero{padding:48px 0 32px;border-bottom:1px solid var(--border)}
.hero-eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
.hero h1{font-size:38px;font-weight:400;color:var(--navy);margin-bottom:16px;line-height:1.15}
.hero h1 em{font-style:italic;color:var(--gold)}
.hero-desc{font-size:17px;color:var(--text-mid);max-width:640px;line-height:1.8}
@media(max-width:700px){.hero{padding:28px 0 20px}.hero h1{font-size:26px}}

.year-block{padding:40px 0;border-bottom:1px solid var(--border-lt)}
.year-block h2{font-size:22px;font-weight:400;color:var(--navy);margin-bottom:10px}
.year-block h2 em{font-style:italic;color:var(--gold)}
.year-intro{font-size:14px;color:var(--text-lt);margin-bottom:16px}
.note{font-size:12px;color:var(--text-lt);margin-top:10px}
.inline-link{color:var(--blue);font-size:12px}

.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:var(--navy);color:#fff;padding:9px 12px;text-align:left;font-weight:600;font-size:11px;letter-spacing:.5px;text-transform:uppercase}
td{padding:9px 12px;border-bottom:1px solid var(--border-lt);vertical-align:middle}
tr:hover td{background:var(--bg-soft)}
.tbl-link{font-size:11px;font-weight:600;color:var(--blue);white-space:nowrap}

.cc-block{padding:40px 0;border-bottom:1px solid var(--border-lt)}
.cc-block h2{font-size:22px;font-weight:400;color:var(--navy);margin-bottom:10px}
.cc-block p{font-size:14px;color:var(--text-lt);margin-bottom:16px}
.cc-list{display:flex;flex-direction:column;gap:8px}
.cc-item{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;background:var(--bg-soft);border-radius:6px}
.cc-badge{font-size:11px;font-weight:700;padding:2px 8px;background:#2a1f5e;color:#a78bfa;border-radius:4px;white-space:nowrap;flex-shrink:0}
.cc-desc{font-size:13px;color:var(--text-mid);line-height:1.5}

.cta-box{margin:40px 0;padding:32px 28px;background:linear-gradient(135deg,#061A2E,#0D3B5E);border-radius:12px;color:#fff;text-align:center}
.cta-box h2{font-size:22px;font-weight:400;margin-bottom:10px}
.cta-box p{font-size:14px;opacity:.85;margin-bottom:20px;line-height:1.7;max-width:500px;margin-left:auto;margin-right:auto}
.cta-btn{display:inline-block;background:#c9a84c;color:#061A2E;padding:13px 32px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:.5px}
.cta-btn:hover{background:#d4b86a}

.faq-block{padding:40px 0;border-bottom:1px solid var(--border-lt)}
.faq-block>h2{font-size:22px;font-weight:400;color:var(--navy);margin-bottom:20px}
.faq-item{margin-bottom:20px}
.faq-q{font-size:16px;font-weight:600;color:var(--navy);margin-bottom:6px}
.faq-a{font-size:14px;color:var(--text-mid);line-height:1.7}

.rel-block{padding:32px 0}
.rel-title{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--text-lt);margin-bottom:12px}
.rel-grid{display:flex;flex-wrap:wrap;gap:8px}
.rel-item{font-size:12px;padding:7px 14px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:4px;color:var(--navy)}
.rel-item:hover{border-color:var(--blue);color:var(--blue)}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/van-han/">Vận Hạn</a><span>›</span>
  <span>Tuổi ${esc(chiName)} Năm ${namXem}</span>
</div>
<div class="page">
  <div class="hero">
    <div class="hero-eyebrow">Tử Vi Đẩu Số · Vận Hạn Theo Tuổi</div>
    <h1>Tuổi <em>${esc(chiName)}</em> Vận Hạn Năm ${namXem}</h1>
    <p class="hero-desc">Phân tích vận hạn năm ${namXem} cho người tuổi ${esc(chiName)} theo Tử Vi Đẩu Số cổ pháp — cung Mệnh, chính tinh, đại vận đang chạy và điểm số theo từng giờ sinh.</p>
  </div>

  ${tablesHTML}

  <div class="cta-box">
    <h2>Xem Vận Hạn Chính Xác Theo Ngày Giờ Sinh</h2>
    <p>Nhập đầy đủ ngày tháng năm và giờ sinh để nhận lá số cá nhân — phân tích 12 cung, đại vận, tiểu vận năm ${namXem} theo cổ pháp.</p>
    <a class="cta-btn" href="/luan-giai.html">Xem Lá Số Miễn Phí →</a>
  </div>

  ${cachCucHTML}

  <div class="faq-block">
    <h2>Câu Hỏi Thường Gặp</h2>
    ${faqHTML}
  </div>

  <div class="rel-block">
    <div class="rel-title">Xem thêm</div>
    <div class="rel-grid">${relLinks.join('')}</div>
  </div>
</div>
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body>
</html>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return NextResponse.redirect(`${BASE}/van-han/`);

  const { chiIdx, namXem } = parsed;
  const years = getYearsForChi(chiIdx);

  // Lấy 4 năm phổ biến nhất (working age: ~1960-2005, chọn 4 gần nhất)
  const targetYears = years.slice(-4);
  const yearsData: YearData[] = [];
  for (const y of targetYears) {
    const data = computeYearData(y, namXem, chiIdx);
    if (data) yearsData.push(data);
  }

  if (yearsData.length === 0) return NextResponse.redirect(`${BASE}/van-han/`);

  const html = buildHTML(chiIdx, namXem, yearsData);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
    },
  });
}
