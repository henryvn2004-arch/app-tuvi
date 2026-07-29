// app/van-han/[slug]/route.ts
// Level 1 (36 pages):  tuoi-[chi]-nam-[namXem]    — tất cả năm sinh cùng chi
// Level 2 (180 pages): [can-chi]-nam-[namXem]      — can-chi cụ thể
export const revalidate = false;

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Module-level location mock — prevents Next.js URL parsing crash after engine load
{
  const _g = globalThis as Record<string, unknown>;
  if (!_g.location) {
    _g.location = { protocol:'https:', hostname:'tuviminhbao.com', host:'tuviminhbao.com', port:'', href:'https://tuviminhbao.com/', pathname:'/', search:'', hash:'' };
  }
}

const BASE = 'https://www.tuviminhbao.com';

const CHI_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const CHI_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const CAN_NAMES = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CAN_SLUGS = ['giap','at','binh','dinh','mau','ky','canh','tan','nham','quy'];
const GIO_CHI   = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_HOURS = [23,1,3,5,7,9,11,13,15,17,19,21];
const NAM_XEMS  = [2026, 2027, 2028];

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Parsers ─────────────────────────────────────────────────────────

// Level 1: "tuoi-ngo-nam-2027"
function parseL1(slug: string): { chiIdx: number; namXem: number } | null {
  const m = slug.match(/^tuoi-([a-z]+)-nam-(\d{4})$/);
  if (!m) return null;
  const chiIdx = CHI_SLUGS.indexOf(m[1]);
  const namXem = parseInt(m[2]);
  if (chiIdx < 0 || !NAM_XEMS.includes(namXem)) return null;
  return { chiIdx, namXem };
}

// Level 2: "canh-ngo-nam-2027"
function parseL2(slug: string): { canIdx: number; chiIdx: number; namXem: number } | null {
  const m = slug.match(/^([a-z]+)-([a-z]+)-nam-(\d{4})$/);
  if (!m) return null;
  const canIdx = CAN_SLUGS.indexOf(m[1]);
  const chiIdx = CHI_SLUGS.indexOf(m[2]);
  const namXem = parseInt(m[3]);
  if (canIdx < 0 || chiIdx < 0 || !NAM_XEMS.includes(namXem)) return null;
  return { canIdx, chiIdx, namXem };
}

// ── Helpers ──────────────────────────────────────────────────────────

function getCanOfYear(year: number) { return CAN_NAMES[(year - 4 + 400) % 10]; }
function getChiIdxOfYear(year: number) { return (year - 4 + 480) % 12; }

function getYearsForChi(chiIdx: number): number[] {
  const out: number[] = [];
  for (let y = 1960; y <= 2005; y++) if (getChiIdxOfYear(y) === chiIdx) out.push(y);
  return out;
}

function getYearsForCanChi(canIdx: number, chiIdx: number): number[] {
  return getYearsForChi(chiIdx).filter(y => (y - 4 + 400) % 10 === canIdx);
}

// ── Engine ───────────────────────────────────────────────────────────

type EngineType = { convertDuongToAm: (...a: unknown[]) => unknown; anSaoLaSo: (...a: unknown[]) => unknown };
let _eng: EngineType | null = null;
function loadEngine(): EngineType {
  if (_eng) return _eng;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Record<string, unknown>;
  g.window = g;
  if (!g.location) {
    g.location = { protocol:'https:', hostname:'tuviminhbao.com', host:'tuviminhbao.com', port:'', href:'https://tuviminhbao.com/', pathname:'/', search:'', hash:'' };
  }
  _eng = (new Function('window', 'globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};'))(g, g) as EngineType;
  return _eng;
}

// ── Types ────────────────────────────────────────────────────────────

type CC  = Record<string, string>;
type SC  = Record<string, Record<string, number>>;
const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];

interface Row {
  gioChi: string; gioSlug: string;
  cungMenh: string; chinhTinh: string;
  dvCanChi: string; dvAge: string;
  diem: number; laSoSlug: string;
}
interface YD { year: number; canChi: string; rows: Row[]; cachCuc: CC[]; }

// ── Compute ──────────────────────────────────────────────────────────

function computeYear(year: number, namXem: number): YD | null {
  try {
    const { convertDuongToAm, anSaoLaSo } = loadEngine();
    const chiIdx = getChiIdxOfYear(year);
    const canChi = `${getCanOfYear(year)} ${CHI_NAMES[chiIdx]}`;
    const rows: Row[] = [];
    const ccMap: Record<string, CC> = {};

    for (let gi = 0; gi < 12; gi++) {
      try {
        const conv = convertDuongToAm(15, 6, year, GIO_HOURS[gi]) as Record<string, unknown>;
        if (!conv?.amLich) continue;
        const al = conv.amLich as Record<string, number>;
        const ls = anSaoLaSo({
          ngayAL: al.day, thangAL: al.month, namAL: year,
          canNam: conv.canNam, chiNam: conv.chiNam, gioIdx: conv.gioIdx ?? gi,
          gioitinh: 'nam', namXem,
        }) as Record<string, unknown>;
        if (!ls) continue;

        const pals    = (ls.palaces as Record<string, unknown>[]) || [];
        const mp      = pals.find(p => p.isMenh);
        const cungMenh  = String(mp?.cungName || '');
        const chinhTinh = ((mp?.majorStars as Record<string,string>[]) || []).map(s => s.ten||s).join(', ') || '—';

        const dvs   = (ls.daiVans as Record<string, unknown>[]) || [];
        const curDV = dvs.find(d => d.isCurrentDV) as Record<string, unknown> | undefined;
        const dvCanChi = String(curDV?.canChi || '—');
        const dvAge    = curDV ? `${curDV.tuoiStart}–${curDV.tuoiEnd}t` : '—';

        const sc    = ((ls.cungScores as SC) || {})[cungMenh];
        const diem  = sc ? Math.round(METRICS.reduce((s,m) => s+(sc[m]||0),0) / METRICS.length * 10) / 10 : 0;

        const canChiSlug = canChi.toLowerCase()
          .replace(/[áàãảạăắằẵẳặâấầẫẩậ]/g,'a').replace(/[éèẽẻẹêếềễểệ]/g,'e')
          .replace(/[íìĩỉị]/g,'i').replace(/[óòõỏọôốồỗổộơớờỡởợ]/g,'o')
          .replace(/[úùũủụưứừữửự]/g,'u').replace(/[ýỳỹỷỵ]/g,'y')
          .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        const laSoSlug = `${canChiSlug}-nam-${year}-gio-${GIO_SLUGS[gi]}`;

        ((ls.cachCuc as CC[]) || []).forEach(c => { if (c.ten) ccMap[c.ten] = c; });
        rows.push({ gioChi: GIO_CHI[gi], gioSlug: GIO_SLUGS[gi], cungMenh, chinhTinh, dvCanChi, dvAge, diem, laSoSlug });
      } catch { /* skip */ }
    }
    return { year, canChi, rows, cachCuc: Object.values(ccMap).slice(0, 6) };
  } catch { return null; }
}

// ── Shared UI ────────────────────────────────────────────────────────

function stars(d: number) {
  if (d >= 7)   return '<span style="color:#1a6b3a">★★★★</span>';
  if (d >= 5.5) return '<span style="color:#7a5f0a">★★★</span>';
  if (d >= 4)   return '<span style="color:#1455A4">★★</span>';
  return '<span style="color:#C0392B">★</span>';
}

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCC;--border-lt:#E8E8E8;--bg:#fff;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.6}
a{color:var(--blue);text-decoration:none}
.page{max-width:1000px;margin:0 auto;padding:0 40px 80px}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:10px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;flex-wrap:wrap}
.bc a{color:var(--text-lt)}.bc a:hover{color:var(--navy)}
.hero{padding:48px 0 32px;border-bottom:1px solid var(--border)}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
h1{font-size:36px;font-weight:400;color:var(--navy);margin-bottom:14px;line-height:1.15}
h1 em{font-style:italic;color:var(--gold)}
.hero-desc{font-size:16px;color:var(--text-mid);max-width:640px;line-height:1.8}
.year-block{padding:36px 0;border-bottom:1px solid var(--border-lt)}
.year-block h2{font-size:20px;font-weight:400;color:var(--navy);margin-bottom:8px}
.year-block h2 em{font-style:italic;color:var(--gold)}
.sub{font-size:13px;color:var(--text-lt);margin-bottom:14px}
.note{font-size:11px;color:var(--text-lt);margin-top:8px}
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:var(--navy);color:#fff;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase}
td{padding:8px 12px;border-bottom:1px solid var(--border-lt);vertical-align:middle}
tr:hover td{background:var(--bg-soft)}
.tbl-link{font-size:11px;font-weight:600;color:var(--blue)}
.cc-block{padding:36px 0;border-bottom:1px solid var(--border-lt)}
.cc-block h2{font-size:20px;font-weight:400;color:var(--navy);margin-bottom:8px}
.cc-block .sub{margin-bottom:14px}
.cc-list{display:flex;flex-direction:column;gap:8px}
.cc-item{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;background:var(--bg-soft);border-radius:6px}
.cc-badge{font-size:11px;font-weight:700;padding:2px 8px;background:#2a1f5e;color:#a78bfa;border-radius:4px;white-space:nowrap;flex-shrink:0}
.cc-desc{font-size:13px;color:var(--text-mid);line-height:1.5}
.cta-box{margin:36px 0;padding:28px 24px;background:linear-gradient(135deg,#061A2E,#0D3B5E);border-radius:10px;color:#fff;text-align:center}
.cta-box h2{font-size:20px;font-weight:400;margin-bottom:8px}
.cta-box p{font-size:13px;opacity:.85;margin-bottom:18px;line-height:1.7;max-width:480px;margin-left:auto;margin-right:auto}
.cta-btn{display:inline-block;background:#c9a84c;color:#061A2E;padding:11px 28px;border-radius:6px;font-weight:700;font-size:13px}
.faq-block{padding:36px 0;border-bottom:1px solid var(--border-lt)}
.faq-block>h2{font-size:20px;font-weight:400;color:var(--navy);margin-bottom:18px}
.faq-item{margin-bottom:18px}
.faq-q{font-size:15px;font-weight:600;color:var(--navy);margin-bottom:5px}
.faq-a{font-size:13px;color:var(--text-mid);line-height:1.7}
.rel-block{padding:28px 0}
.rel-title{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--text-lt);margin-bottom:10px}
.rel-grid{display:flex;flex-wrap:wrap;gap:8px}
.rel-item{font-size:12px;padding:6px 12px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:4px;color:var(--navy)}
.rel-item:hover{border-color:var(--blue);color:var(--blue)}
@media(max-width:700px){.page,.bc{padding-left:16px;padding-right:16px}h1{font-size:26px}.hero{padding:28px 0 20px}}`;

function tableHTML(yd: YD, namXem: number) {
  const rows = yd.rows.map(r => `<tr>
    <td><strong>Giờ ${esc(r.gioChi)}</strong></td>
    <td>${esc(r.cungMenh)}</td>
    <td>${esc(r.chinhTinh)}</td>
    <td>${esc(r.dvCanChi)} <span style="color:#999;font-size:11px">(${esc(r.dvAge)})</span></td>
    <td>${r.diem} ${stars(r.diem)}</td>
    <td><a href="/la-so/${esc(r.laSoSlug)}" class="tbl-link">Xem →</a></td>
  </tr>`).join('');
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Giờ sinh</th><th>Cung Mệnh</th><th>Chính tinh</th><th>Đại vận ${namXem}</th><th>Điểm</th><th>Lá số</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function pageShell(opts: {
  title: string; desc: string; url: string; bc: string;
  h1: string; heroDesc: string; body: string;
  faqItems: {q:string;a:string}[]; relLinks: string[];
}) {
  const { title, desc, url, bc, h1, heroDesc, body, faqItems, relLinks } = opts;
  const articleSchema = JSON.stringify({ '@context':'https://schema.org','@type':'Article', headline:title, description:desc, url, inLanguage:'vi', author:{name:'Tử Vi Minh Bảo',url:BASE}, publisher:{name:'Tử Vi Minh Bảo',url:BASE} });
  const faqSchema = JSON.stringify({ '@context':'https://schema.org','@type':'FAQPage', mainEntity: faqItems.map(f => ({ '@type':'Question', name:f.q, acceptedAnswer:{text:f.a} })) });
  const faqHTML = faqItems.map(f => `<div class="faq-item"><h3 class="faq-q">${esc(f.q)}</h3><p class="faq-a">${esc(f.a)}</p></div>`).join('');
  return `<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article"><meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${BASE}/seal.webp">
<link rel="canonical" href="${esc(url)}"><link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${articleSchema}</script>
<script type="application/ld+json">${faqSchema}</script>
<style>${CSS}</style>
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">${bc}</div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Tử Vi Đẩu Số · Vận Hạn</div>
    <h1>${h1}</h1>
    <p class="hero-desc">${heroDesc}</p>
  </div>
  ${body}
  <div class="faq-block"><h2>Câu Hỏi Thường Gặp</h2>${faqHTML}</div>
  <div class="rel-block"><div class="rel-title">Xem thêm</div><div class="rel-grid">${relLinks.join('')}</div></div>
</div>
<script src="/footer.js"></script><script src="/track.js?v=2" defer></script><script src="/nav.js?v=18" defer></script>
</body></html>`;
}

// ── Level 1 builder ──────────────────────────────────────────────────

function buildL1(chiIdx: number, namXem: number): string {
  const chiName = CHI_NAMES[chiIdx];
  const chiSlug = CHI_SLUGS[chiIdx];
  const years   = getYearsForChi(chiIdx).slice(-4); // 4 năm gần nhất
  const yearsData = years.map(y => computeYear(y, namXem)).filter(Boolean) as YD[];

  const allCC: Record<string, CC> = {};
  yearsData.forEach(yd => yd.cachCuc.forEach(c => { if (c.ten) allCC[c.ten] = c; }));
  const topCC = Object.values(allCC).slice(0, 5);

  const body = [
    // Tables theo từng năm
    ...yearsData.map(yd => {
      const canChiSlug = yd.canChi.toLowerCase()
        .replace(/[áàãảạăắằẵẳặâấầẫẩậ]/g,'a').replace(/[éèẽẻẹêếềễểệ]/g,'e')
        .replace(/[íìĩỉị]/g,'i').replace(/[óòõỏọôốồỗổộơớờỡởợ]/g,'o')
        .replace(/[úùũủụưứừữửự]/g,'u').replace(/[ýỳỹỷỵ]/g,'y')
        .replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
      return `<div class="year-block">
        <h2>Năm <em>${esc(yd.canChi)}</em> (${yd.year})</h2>
        <p class="sub">Bảng theo giờ sinh — nam giới · Kết quả tính cho ngày 15/6/${yd.year}</p>
        ${tableHTML(yd, namXem)}
        <p class="note"><a href="/van-han/${canChiSlug}-nam-${namXem}" style="color:var(--blue);font-size:12px">Xem chi tiết tuổi ${esc(yd.canChi)} năm ${namXem} →</a></p>
      </div>`;
    }),
    // CTA
    `<div class="cta-box">
      <h2>Xem Chính Xác Theo Ngày Giờ Sinh</h2>
      <p>Nhập đầy đủ ngày tháng năm và giờ sinh để nhận lá số cá nhân hoá.</p>
      <a class="cta-btn" href="/luan-giai.html">Xem Lá Số Miễn Phí →</a>
    </div>`,
    // Cach cuc
    topCC.length > 0 ? `<div class="cc-block">
      <h2>Cách Cục Phổ Biến Tuổi ${esc(chiName)}</h2>
      <div class="sub">Tổng hợp từ lá số người tuổi ${esc(chiName)} theo giờ và năm sinh khác nhau</div>
      <div class="cc-list">${topCC.map(c => `<div class="cc-item"><span class="cc-badge">${esc(c.ten)}</span><span class="cc-desc">${esc(c.moTa||c.tomTat||'')}</span></div>`).join('')}</div>
    </div>` : '',
  ].join('');

  const refYear = yearsData[2]?.year || 1990;
  const faqItems = [
    { q:`Tuổi ${chiName} năm ${namXem} có vận tốt không?`, a:`Vận hạn phụ thuộc vào giờ sinh cụ thể — xem bảng theo từng giờ sinh bên trên hoặc nhập ngày giờ sinh để có kết quả cá nhân.` },
    { q:`Sinh năm ${refYear} tuổi ${chiName} đang chạy đại vận gì năm ${namXem}?`, a:`Tùy giờ sinh, người sinh năm ${refYear} đang chạy các đại vận khác nhau. Xem bảng chi tiết bên trên.` },
    { q:`Tuổi ${chiName} hợp nghề gì?`, a:`Cần xem cung Quan Lộc trong lá số cá nhân — phụ thuộc vào giờ sinh và năm sinh cụ thể, không thể nói chung cho cả tuổi ${chiName}.` },
  ];

  const relLinks = [
    ...NAM_XEMS.filter(y => y !== namXem).map(y => `<a href="/van-han/tuoi-${chiSlug}-nam-${y}" class="rel-item">Tuổi ${esc(chiName)} Năm ${y}</a>`),
    ...CHI_SLUGS.filter((_,i)=>i!==chiIdx).slice(0,8).map((s,_i) => {
      const idx = CHI_SLUGS.indexOf(s);
      return `<a href="/van-han/tuoi-${s}-nam-${namXem}" class="rel-item">Tuổi ${esc(CHI_NAMES[idx])} ${namXem}</a>`;
    }),
    ...yearsData.map(yd => {
      const s = yd.canChi.toLowerCase().replace(/[áàãảạăắằẵẳặâấầẫẩậ]/g,'a').replace(/[éèẽẻẹêếềễểệ]/g,'e').replace(/[íìĩỉị]/g,'i').replace(/[óòõỏọôốồỗổộơớờỡởợ]/g,'o').replace(/[úùũủụưứừữửự]/g,'u').replace(/[ýỳỹỷỵ]/g,'y').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
      return `<a href="/van-han/${s}-nam-${namXem}" class="rel-item">${esc(yd.canChi)} ${yd.year}</a>`;
    }),
  ];

  return pageShell({
    title: `Tuổi ${chiName} Vận Hạn Năm ${namXem} — Tử Vi Đẩu Số`,
    desc:  `Vận hạn năm ${namXem} cho người tuổi ${chiName} — phân tích cung mệnh, đại vận, cách cục theo từng giờ sinh và năm sinh. Miễn phí.`,
    url:   `${BASE}/van-han/tuoi-${chiSlug}-nam-${namXem}`,
    bc:    `<a href="/">Trang Chủ</a><span>›</span><a href="/van-han/">Vận Hạn</a><span>›</span><span>Tuổi ${esc(chiName)} Năm ${namXem}</span>`,
    h1:    `Tuổi <em>${esc(chiName)}</em> Vận Hạn Năm ${namXem}`,
    heroDesc: `Phân tích vận hạn năm ${namXem} cho người tuổi ${esc(chiName)} theo Tử Vi Đẩu Số cổ pháp — cung Mệnh, chính tinh, đại vận và điểm số theo từng giờ sinh.`,
    body, faqItems, relLinks,
  });
}

// ── Level 2 builder ──────────────────────────────────────────────────

function buildL2(canIdx: number, chiIdx: number, namXem: number): string {
  const canName = CAN_NAMES[canIdx];
  const chiName = CHI_NAMES[chiIdx];
  const chiSlug = CHI_SLUGS[chiIdx];
  const canSlug = CAN_SLUGS[canIdx];
  const canChi  = `${canName} ${chiName}`;

  // Lấy năm sinh trong working age
  const years = getYearsForCanChi(canIdx, chiIdx);
  if (years.length === 0) return '';
  const yearsData = years.map(y => computeYear(y, namXem)).filter(Boolean) as YD[];
  if (yearsData.length === 0) return '';

  const allCC: Record<string, CC> = {};
  yearsData.forEach(yd => yd.cachCuc.forEach(c => { if (c.ten) allCC[c.ten] = c; }));
  const topCC = Object.values(allCC).slice(0, 5);

  const body = [
    ...yearsData.map(yd => `<div class="year-block">
      <h2>Người sinh năm <em>${esc(yd.canChi)}</em> (${yd.year})</h2>
      <p class="sub">Bảng theo giờ sinh — nam giới · Kết quả tính cho ngày 15/6/${yd.year}</p>
      ${tableHTML(yd, namXem)}
      <p class="note">* Cung Mệnh có thể thay đổi theo tháng/ngày sinh thực tế</p>
    </div>`),
    `<div class="cta-box">
      <h2>Xem Lá Số Cá Nhân Hoá</h2>
      <p>Nhập đầy đủ ngày tháng năm và giờ sinh để xem chính xác cung Mệnh, đại vận và tiểu vận năm ${namXem}.</p>
      <a class="cta-btn" href="/luan-giai.html">Xem Lá Số Miễn Phí →</a>
    </div>`,
    topCC.length > 0 ? `<div class="cc-block">
      <h2>Cách Cục Của Tuổi ${esc(canChi)}</h2>
      <div class="sub">Các cách cục hay xuất hiện trong lá số người ${esc(canChi)}</div>
      <div class="cc-list">${topCC.map(c => `<div class="cc-item"><span class="cc-badge">${esc(c.ten)}</span><span class="cc-desc">${esc(c.moTa||c.tomTat||'')}</span></div>`).join('')}</div>
    </div>` : '',
  ].join('');

  const refYear = yearsData[0]?.year || 1990;
  const faqItems = [
    { q:`Người sinh năm ${refYear} (${canChi}) vận năm ${namXem} thế nào?`, a:`Vận năm ${namXem} của người sinh năm ${refYear} phụ thuộc vào giờ sinh — xem bảng bên trên để biết cung Mệnh và đại vận theo từng giờ.` },
    { q:`Tuổi ${canChi} có cách cục gì đặc biệt?`, a:`Người tuổi ${canChi} có thể có các cách cục ${topCC.slice(0,3).map(c=>c.ten).join(', ')||'tùy theo giờ sinh'}. Xem đầy đủ bên trên.` },
    { q:`Sinh năm ${refYear} giờ nào vận ${namXem} tốt nhất?`, a:`Theo phân tích, các giờ sinh có điểm cao nhất có thể thay đổi theo năm sinh cụ thể. Xem bảng điểm chi tiết bên trên.` },
  ];

  const relLinks = [
    `<a href="/van-han/tuoi-${chiSlug}-nam-${namXem}" class="rel-item">Tất cả tuổi ${esc(chiName)} năm ${namXem}</a>`,
    ...NAM_XEMS.filter(y => y !== namXem).map(y => `<a href="/van-han/${canSlug}-${chiSlug}-nam-${y}" class="rel-item">${esc(canChi)} năm ${y}</a>`),
    ...CHI_SLUGS.filter((_,i) => i !== chiIdx).slice(0,5).map(s => {
      const idx = CHI_SLUGS.indexOf(s);
      return `<a href="/van-han/tuoi-${s}-nam-${namXem}" class="rel-item">Tuổi ${esc(CHI_NAMES[idx])} ${namXem}</a>`;
    }),
    ...yearsData.flatMap(yd => yd.rows.slice(0,3).map(r => `<a href="/la-so/${esc(r.laSoSlug)}" class="rel-item">Lá số ${esc(yd.canChi)} giờ ${esc(r.gioChi)}</a>`)),
  ];

  return pageShell({
    title:   `${canChi} Vận Hạn Năm ${namXem} — Tử Vi Đẩu Số`,
    desc:    `Vận hạn năm ${namXem} cho người sinh năm ${canChi} — cung mệnh, chính tinh, đại vận và cách cục đặc biệt theo từng giờ sinh.`,
    url:     `${BASE}/van-han/${canSlug}-${chiSlug}-nam-${namXem}`,
    bc:      `<a href="/">Trang Chủ</a><span>›</span><a href="/van-han/">Vận Hạn</a><span>›</span><a href="/van-han/tuoi-${chiSlug}-nam-${namXem}">Tuổi ${esc(chiName)} ${namXem}</a><span>›</span><span>${esc(canChi)}</span>`,
    h1:      `<em>${esc(canChi)}</em> Vận Hạn Năm ${namXem}`,
    heroDesc: `Phân tích chi tiết vận hạn năm ${namXem} cho người sinh năm ${esc(canChi)} — cung Mệnh, chính tinh, đại vận đang chạy và điểm số theo từng giờ sinh.`,
    body, faqItems, relLinks,
  });
}

// ── Route Handler ────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Thử Level 1 trước
  const l1 = parseL1(slug);
  if (l1) {
    const html = buildL1(l1.chiIdx, l1.namXem);
    if (!html) return NextResponse.redirect(`${BASE}/van-han/`);
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400' } });
  }

  // Thử Level 2
  const l2 = parseL2(slug);
  if (l2) {
    const html = buildL2(l2.canIdx, l2.chiIdx, l2.namXem);
    if (!html) return NextResponse.redirect(`${BASE}/van-han/`);
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400' } });
  }

  return NextResponse.redirect(`${BASE}/van-han/`);
}
