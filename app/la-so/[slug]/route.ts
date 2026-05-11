// app/la-so/[slug]/route.ts
// Priority:
//   1. laso_public  (user-paid, full AI luận giải)
//   2. laso_pregen  (old pre-generated batch)
//   3. ISR compute  (new 438K pages: {can-chi}-{dd}-{mm}-{yyyy}-gio-{gio}-{gioi}-{namXem})
//   4. Redirect to menh-kho
export const revalidate = false;   // cache forever on CDN after first compute
export const maxDuration = 30;     // allow 30s for engine on cold start

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// ⚠️ Module-level: must run before any request so that if loadEngine() sets
// globalThis.window = globalThis, Next.js URL parsing (getLocationOrigin)
// won't crash looking for window.location.protocol
{
  const _g = globalThis as Record<string, unknown>;
  if (!_g.location) {
    _g.location = { protocol:'https:', hostname:'tuviminhbao.com', host:'tuviminhbao.com', port:'', href:'https://tuviminhbao.com/', pathname:'/', search:'', hash:'' };
  }
}

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

// ────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────────
type Rec = Record<string, unknown>;

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ────────────────────────────────────────────────────────────────────────────
// Existing builders (laso_public + laso_pregen) — unchanged
// ────────────────────────────────────────────────────────────────────────────
function ogImg(base: string, title: string, sub: string): string {
  return `${base}/api/og?${new URLSearchParams({ title: title.slice(0,80), sub }).toString()}`;
}

function buildPregenHTML(row: Record<string,unknown>, slug: string): string {
  const url   = `${BASE}/la-so/${slug}`;
  const gt    = row.gioi_tinh === 'nu' ? 'Nữ' : 'Nam';
  const title = `Lá Số Tử Vi ${esc(row.can_chi)} ${gt} — Cung ${esc(row.cung_menh)} — Tử Vi Minh Bảo`;
  const desc  = `Lá số tử vi ${row.can_chi} ${gt.toLowerCase()}, cung mệnh ${row.cung_menh}, chính tinh ${row.chinh_tinh_menh || ''}, nạp âm ${row.nap_am || ''}. Xem cách cục đặc biệt và phân tích 12 cung theo cổ pháp.`;
  const img   = ogImg(BASE, title, 'Lá Số Tử Vi · Cổ Pháp');
  const schema = JSON.stringify([
    {'@context':'https://schema.org','@type':'Article',headline:title,description:desc,url,inLanguage:'vi',
     author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
     publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
     image:{'@type':'ImageObject',url:img}},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:'Mệnh Khố',item:`${BASE}/menh-kho.html`},
      {'@type':'ListItem',position:3,name:title,item:url}]},
  ]);

  const cachCuc: Array<Record<string,string>> = (row.cach_cuc as Array<Record<string,string>>) || [];
  const daiVan: Array<Record<string,unknown>> = (row.dai_van as Array<Record<string,unknown>>) || [];
  const cungScores: Record<string,Record<string,number>> = (row.cung_scores as Record<string,Record<string,number>>) || {};

  const CUNGS = ['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];
  const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
  const MLABELS = ['Tiềm Năng','Bền Vững','An Toàn','Quý Nhân','Minh Bạch','Tương Hợp'];

  const ccHTML = cachCuc.length > 0
    ? `<div class="cc-list">${cachCuc.map(c=>`<div class="cc-item"><span class="cc-badge cc-${esc(c.loai||'')}">${esc(c.ten||'')}</span><span class="cc-desc">${esc(c.moTa||'')}</span></div>`).join('')}</div>`
    : '<p class="no-cc">Lá số này không có cách cục đặc biệt nổi bật.</p>';

  const dvHTML = daiVan.length > 0
    ? `<div class="dv-list">${daiVan.slice(0,8).map((d)=>{
        const active = (d as Record<string,boolean>).isCurrentDV;
        return `<div class="dv-item${active?' dv-active':''}"><div class="dv-age">${esc(d.startAge||'')}-${esc(d.endAge||'')}</div><div class="dv-canchi">${esc(d.canChi||'')}</div>${active?'<div class="dv-now">Hiện tại</div>':''}</div>`;
      }).join('')}</div>`
    : '';

  const scoresHTML = Object.keys(cungScores).length > 0
    ? CUNGS.filter(c => cungScores[c]).map(c => {
        const sc = cungScores[c];
        return `<div class="score-cung"><div class="score-cung-name">${esc(c)}</div><div class="score-bars">${METRICS.map((m,i)=>{
          const v = sc[m]||0; const pct = v*10;
          const col = v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
          return `<div class="sb-row"><span class="sb-label">${MLABELS[i]}</span><div class="sb-bg"><div class="sb-fill" style="width:${pct}%;background:${col}"></div></div><span class="sb-val">${v}</span></div>`;
        }).join('')}</div></div>`;
      }).join('')
    : '';

  const contentHTML = String(row.content_html || '');

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--gold-bright:#D4A843;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}.bc span{color:var(--border)}
.wrap{flex:1;max-width:900px;margin:0 auto;padding:40px 40px 80px;width:100%}
.hero{background:linear-gradient(135deg,var(--navy),var(--navy-mid));border-radius:12px;padding:28px 32px;color:#fff;margin-bottom:28px}
.hero-eyebrow{font-size:10px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px}
.hero-title{font-family:'Noto Serif',serif;font-size:28px;font-weight:600;margin-bottom:12px;line-height:1.3}
.hero-tags{display:flex;gap:8px;flex-wrap:wrap}
.hero-tag{font-size:11px;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.85)}
.section{margin-bottom:28px}
.section-title{font-family:'Noto Serif',serif;font-size:16px;font-weight:600;color:var(--navy);padding-bottom:10px;border-bottom:2px solid var(--border-lt);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.cc-list{display:flex;flex-direction:column;gap:10px}
.cc-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:var(--bg-soft);border-radius:8px;border-left:3px solid var(--gold)}
.cc-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;background:#2a1f5e;color:#a78bfa}
.cc-desc{font-size:13px;color:var(--text-mid);line-height:1.5}
.no-cc{font-size:13px;color:var(--text-lt);font-style:italic;padding:8px 0}
.dv-list{display:flex;gap:8px;flex-wrap:wrap}
.dv-item{text-align:center;padding:10px 14px;border:1.5px solid var(--border-lt);border-radius:8px;min-width:72px}
.dv-active{border-color:var(--gold);background:var(--gold-lt)}
.dv-age{font-size:10px;color:var(--text-lt);margin-bottom:3px}
.dv-canchi{font-family:'Noto Serif',serif;font-size:14px;font-weight:600;color:var(--navy)}
.dv-now{font-size:9px;color:var(--gold);font-weight:700;margin-top:3px}
.scores-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.score-cung{background:var(--bg-soft);border-radius:9px;padding:14px}
.score-cung-name{font-family:'Noto Serif',serif;font-size:13px;font-weight:600;color:var(--navy);margin-bottom:10px}
.score-bars{display:flex;flex-direction:column;gap:5px}
.sb-row{display:flex;align-items:center;gap:6px}
.sb-label{font-size:10px;color:var(--text-lt);width:68px;flex-shrink:0}
.sb-bg{flex:1;height:6px;background:#d0d8e0;border-radius:3px;overflow:hidden}
.sb-fill{height:100%;border-radius:3px}
.sb-val{font-size:10px;color:var(--text-mid);width:18px;text-align:right}
.body-content{font-size:15px;line-height:1.85;color:var(--text-mid)}
.body-content h2{font-family:'Noto Serif',serif;font-size:20px;color:var(--navy);font-weight:600;margin:28px 0 12px;padding-top:24px;border-top:1px solid var(--border-lt)}
.body-content p{margin-bottom:14px}
.cta-box{margin-top:36px;padding:28px 24px;background:linear-gradient(135deg,#171a4a,#2d2060);border-radius:12px;color:#fff;text-align:center}
.cta-box h3{font-family:'Noto Serif',serif;font-size:20px;margin-bottom:10px}
.cta-box p{font-size:14px;opacity:.85;margin-bottom:20px;line-height:1.6}
.cta-btn{display:inline-block;background:#8b6dff;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}
@media(max-width:700px){.bc,.wrap{padding-left:16px;padding-right:16px}.hero-title{font-size:22px}}
</style>
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/menh-kho.html">Mệnh Khố</a><span>›</span>
  <span>${esc(row.can_chi)} ${esc(gt)} — Cung ${esc(row.cung_menh)}</span>
</div>
<div class="wrap">
  <div class="hero">
    <div class="hero-eyebrow">Lá Số Tử Vi · Cổ Pháp</div>
    <div class="hero-title">Lá Số ${esc(row.can_chi)} ${esc(gt)} — Cung Mệnh ${esc(row.cung_menh)}</div>
    <div class="hero-tags">
      ${row.chinh_tinh_menh?`<span class="hero-tag">⭐ ${esc(row.chinh_tinh_menh)}</span>`:''}
      ${row.nap_am?`<span class="hero-tag">🔥 ${esc(row.nap_am)}</span>`:''}
      ${row.cuc?`<span class="hero-tag">⚙ Cục ${esc(row.cuc)}</span>`:''}
      ${row.am_duong?`<span class="hero-tag">${esc(row.am_duong)}</span>`:''}
      ${row.gio_chi?`<span class="hero-tag">Giờ ${esc(row.gio_chi)}</span>`:''}
    </div>
  </div>
  ${cachCuc.length > 0 ? `<div class="section"><div class="section-title">⚙ Cách Cục Đặc Biệt <span style="font-size:12px;color:var(--text-lt);font-weight:400">(${cachCuc.length} cách cục)</span></div>${ccHTML}</div>` : ''}
  ${dvHTML ? `<div class="section"><div class="section-title">📅 Đại Vận</div>${dvHTML}</div>` : ''}
  ${scoresHTML ? `<div class="section"><div class="section-title">📊 Điểm 6 Chiều Từng Cung</div><div class="scores-grid">${scoresHTML}</div></div>` : ''}
  ${contentHTML ? `<div class="section"><div class="body-content">${contentHTML}</div></div>` : ''}
  <div class="cta-box">
    <h3>Luận Giải AI Đầy Đủ — 24 Phần</h3>
    <p>Nhập đúng giờ sinh để có luận giải chuyên sâu về tính cách, sự nghiệp, tình duyên, vận hạn theo cổ pháp Tử Vi Đẩu Số.</p>
    <a class="cta-btn" href="/">Xem Luận Giải ($19) →</a>
  </div>
</div>
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body></html>`;
}

function buildPublicHTML(row: Record<string,unknown>, slug: string): string {
  const url   = `${BASE}/la-so/${slug}`;
  const gt    = row.gioi_tinh === 'nu' ? 'Nữ' : 'Nam';
  const title = `Lá Số ${esc(row.can_chi_nam)} ${gt} — Cung ${esc(row.cung_menh)} — Tử Vi Minh Bảo`;
  const desc  = `Lá số tử vi ${row.can_chi_nam} ${gt.toLowerCase()}, cung mệnh ${row.cung_menh}, chính tinh ${row.chinh_tinh || ''}, nạp âm ${row.nap_am || ''}.`;
  const img   = ogImg(BASE, title, `Cung ${esc(row.cung_menh as string)}`);
  const schema = JSON.stringify([
    {'@context':'https://schema.org','@type':'Article',headline:title,description:desc,url,inLanguage:'vi',
     datePublished:(row.created_at as string||'').slice(0,10)||undefined,
     author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
     publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
     image:{'@type':'ImageObject',url:img}},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:'Mệnh Khố',item:`${BASE}/menh-kho.html`},
      {'@type':'ListItem',position:3,name:title,item:url}]},
  ]);
  const commonHead = `<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${schema}</script>`;
  const bcHTML = `<div style="background:#F5F4F0;border-bottom:1px solid #E8E8E8;padding:12px 40px;font-size:12px;color:#777;display:flex;gap:8px;align-items:center">
  <a href="/" style="color:#777;text-decoration:none">Trang Chủ</a><span style="color:#CCC">›</span>
  <a href="/menh-kho.html" style="color:#777;text-decoration:none">Mệnh Khố</a><span style="color:#CCC">›</span>
  <span>${esc(row.can_chi_nam as string)} ${esc(gt)} — Cung ${esc(row.cung_menh as string)}</span>
</div>`;
  if (row.rendered_html) {
    return `<!DOCTYPE html><html lang="vi"><head>
${commonHead}
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
${bcHTML}
${row.rendered_html}
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body></html>`;
  }
  const luanGiai: Record<string,string> = (row.luan_giai as Record<string,string>) || {};
  const sections = Object.entries(luanGiai).sort(([a],[b]) => Number(a)-Number(b));
  const bodyHTML = sections.map(([,v]) => `<div style="margin-bottom:24px">${String(v||'').split('\n').map(l=>`<p>${l}</p>`).join('')}</div>`).join('');
  return `<!DOCTYPE html><html lang="vi"><head>
${commonHead}
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script src="/auth.js" defer></script>
<style>body{font-family:'Be Vietnam Pro',sans-serif;max-width:760px;margin:0 auto;padding:0 20px 40px;color:#333}h1{font-family:'Noto Serif',serif;color:#061A2E;margin:32px 0 24px}p{margin-bottom:14px;line-height:1.8;color:#444}</style>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
${bcHTML}
<h1>${title}</h1>
<div>${bodyHTML}</div>
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body></html>`;
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: slug parser
// Format: {can}-{chi}-{dd}-{mm}-{yyyy}-gio-{gioSlug}-{gioi}-{namXem}
// Example: canh-ngo-03-06-1998-gio-suu-nam-2027
// ────────────────────────────────────────────────────────────────────────────
const CAN_SLUGS = ['giap','at','binh','dinh','mau','ky','canh','tan','nham','quy'];
const CAN_NAMES = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const CHI_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_HOURS = [23,1,3,5,7,9,11,13,15,17,19,21];

interface IsrParams {
  canIdx: number; chiIdx: number;
  dd: number; mm: number; year: number;
  gioIdx: number; gioi: 'nam'|'nu'; namXem: number;
}

function parseIsrSlug(slug: string): IsrParams | null {
  const parts = slug.split('-');
  // Minimum: [can, chi, dd, mm, yyyy, gio, gioSlug, gioi, namXem] = 9 parts
  if (parts.length < 9) return null;

  const namXem = parseInt(parts[parts.length - 1]);
  const gioi   = parts[parts.length - 2] as 'nam'|'nu';
  const gioSlug = parts[parts.length - 3];
  const gioLit  = parts[parts.length - 4];   // must be 'gio'
  const yyyy    = parseInt(parts[parts.length - 5]);
  const mm      = parseInt(parts[parts.length - 6]);
  const dd      = parseInt(parts[parts.length - 7]);

  if (gioLit !== 'gio') return null;
  if (isNaN(namXem) || namXem < 2020 || namXem > 2040) return null;
  if (isNaN(yyyy) || yyyy < 1900 || yyyy > 2050) return null;
  if (isNaN(mm) || mm < 1 || mm > 12) return null;
  if (isNaN(dd) || dd < 1 || dd > 31) return null;
  if (gioi !== 'nam' && gioi !== 'nu') return null;

  const gioIdx = GIO_SLUGS.indexOf(gioSlug);
  if (gioIdx < 0) return null;

  const canChiParts = parts.slice(0, parts.length - 7);
  if (canChiParts.length !== 2) return null;

  const canIdx = CAN_SLUGS.indexOf(canChiParts[0]);
  const chiIdx = CHI_SLUGS.indexOf(canChiParts[1]);
  if (canIdx < 0 || chiIdx < 0) return null;

  return { canIdx, chiIdx, dd, mm, year: yyyy, gioIdx, gioi, namXem };
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: engine loader (singleton per serverless instance)
// ────────────────────────────────────────────────────────────────────────────
let engineCache: { convertDuongToAm: (...a: unknown[]) => unknown; anSaoLaSo: (...a: unknown[]) => unknown } | null = null;

function loadEngine() {
  if (engineCache) return engineCache;
  const code = readFileSync(join(process.cwd(), 'public', 'tuvi-ansao-engine.js'), 'utf-8');
  const g = globalThis as Rec;
  g.window = g;
  // Provide mock location so Next.js shared utils don't crash when
  // they check `typeof window !== 'undefined'` and then read window.location
  if (!g.location) {
    g.location = { protocol:'https:', hostname:'tuviminhbao.com', host:'tuviminhbao.com', port:'', href:'https://tuviminhbao.com/', pathname:'/', search:'', hash:'' };
  }
  engineCache = (new Function('window','globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo};'))(g,g) as typeof engineCache;
  return engineCache!;
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: 4×4 HTML grid
// ────────────────────────────────────────────────────────────────────────────
const DCHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const DCHI_TO_POS: Record<number, [number,number]> = {
  0:[3,2], 1:[3,1], 2:[3,0], 3:[2,0],
  4:[1,0], 5:[0,0], 6:[0,1], 7:[0,2],
  8:[0,3], 9:[1,3], 10:[2,3], 11:[3,3],
};

function renderGrid(ls: Rec): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const dcMap: Record<number, Rec> = {};
  palaces.forEach(p => {
    const dc = DCHI.indexOf(String(p.diaChi||''));
    if (dc >= 0) dcMap[dc] = p;
  });

  const grid: (Rec|null|'center')[][] = Array.from({length:4}, () => Array(4).fill(null));
  Object.entries(DCHI_TO_POS).forEach(([dcStr, [r,c]]) => { grid[r][c] = dcMap[parseInt(dcStr)] || null; });
  grid[1][1] = grid[1][2] = grid[2][1] = grid[2][2] = 'center';

  const dvs    = (ls.daiVans as Rec[]) || [];
  const curDV  = dvs.find(d => d.isCurrentDV) as Rec|undefined;
  const HOA_COLORS: Record<string,string> = { 'Lộc':'#1E6B3C','Quyền':'#7B3FA0','Khoa':'#1455A4','Kỵ':'#C0392B' };
  const SAT = new Set(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp','Tang Môn','Bạch Hổ']);

  function renderStar(s: Rec) {
    const ten    = String(s.ten||'');
    const hoa    = String(s.hoa||'');
    const bright = String(s.brightness||'');
    const isSat  = SAT.has(ten);
    const col    = hoa ? HOA_COLORS[hoa]||'#1455A4' : isSat ? '#C0392B' : '#1a1a1a';
    const bDot   = bright==='Miếu'||bright==='Vượng' ? '●' : '';
    return `<span style="color:${col};font-size:11px;font-weight:700;white-space:nowrap">${esc(ten)}${hoa?`<sup style="font-size:8px;color:${HOA_COLORS[hoa]}">${esc(hoa[0])}</sup>`:''}${bDot?`<sup style="color:#4ade80;font-size:8px">${bDot}</sup>`:''}</span>`;
  }

  function renderCell(p: Rec): string {
    const cungName  = String(p.cungName||'');
    const diacChi   = String(p.diaChi||'');
    const majStars  = (p.majorStars as Rec[])||[];
    const allStars  = (p.stars as Rec[])||[];
    const minStars  = allStars.filter(s => !majStars.find(m => m.ten===s.ten));
    const isMenh    = !!p.isMenh;
    const isVong    = !!p.isVong;
    const trangSinh = String(p.trangSinh||'');
    const hasTuan   = allStars.some(s => s.ten==='Tuần');
    const hasTriet  = allStars.some(s => s.ten==='Triệt');
    const dcIdx     = DCHI.indexOf(diacChi);
    const dvForCung = dvs.find(d => d.cungIdx===dcIdx) as Rec|undefined;
    const dvBadge   = dvForCung ? `<span style="position:absolute;bottom:3px;right:5px;font-size:10px;font-weight:700;color:#555">${esc(String(dvForCung.canChi||''))}</span>` : '';
    const tuanTag   = hasTuan  ? '<span style="position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);background:#2c4a00;color:#fff;font-size:8px;padding:0 5px;border-radius:2px">Tuần</span>' : '';
    const trietTag  = hasTriet ? '<span style="position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);background:#4a0000;color:#fff;font-size:8px;padding:0 5px;border-radius:2px">Triệt</span>' : '';
    const dvActive  = curDV && dcIdx === dvs.indexOf(curDV);
    const border    = isMenh ? '2px solid #1455A4' : dvActive ? '2px solid #1E6B3C' : '1px solid #aaa';
    const bg        = isMenh ? '#EEF4FF' : '#fff';
    return `<div style="border:${border};background:${bg};padding:6px 6px 18px;min-height:130px;position:relative;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px">
        <span style="font-size:9px;color:#888">${esc(diacChi)}</span>
        ${isVong?'<span style="font-size:8px;color:#888;border:1px solid #ccc;padding:0 3px;border-radius:2px">Vong</span>':''}
      </div>
      <div style="text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#222;margin-bottom:3px">
        ${esc(cungName)}${isMenh?'<span style="font-size:9px;color:#1455A4;margin-left:3px">⊕</span>':''}
      </div>
      <div style="text-align:center;margin-bottom:4px">${majStars.map(s=>renderStar(s)).join('<br>')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 3px;flex:1">
        ${minStars.slice(0,8).map(s=>`<div>${renderStar(s)}</div>`).join('')}
      </div>
      <div style="position:absolute;bottom:3px;left:5px;font-size:9px;color:#999">${esc(trangSinh)}</div>
      ${dvBadge}${tuanTag}${trietTag}
    </div>`;
  }

  const menhP = palaces.find(p => p.isMenh) as Rec|undefined;
  const napAm = String(ls.napAm||'');
  const cuc   = String(ls.cuc||'');
  const canChiNam = String(ls.canChiNam||'');
  const centerHTML = `<div style="border:1px solid #ddd;background:#F9F4EB;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12px;grid-column:span 2;grid-row:span 2">
    <div style="font-size:10px;color:#9A7B3A;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">紫微明寶</div>
    <div style="font-size:14px;font-weight:700;color:#061A2E;margin-bottom:4px">${esc(canChiNam)}</div>
    <div style="font-size:11px;color:#444;margin-bottom:2px">Cung ${esc(String(menhP?.cungName||''))}</div>
    <div style="font-size:10px;color:#777;margin-bottom:2px">${esc(napAm)}</div>
    <div style="font-size:10px;color:#777">${esc(cuc)}</div>
  </div>`;

  let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);border:2px solid #333;background:#333;gap:1px">`;
  let centerRendered = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = grid[r][c];
      if (cell === 'center') {
        if (!centerRendered && r===1 && c===1) { html += centerHTML; centerRendered = true; }
        continue;
      }
      html += cell ? renderCell(cell) : `<div style="background:#f8f8f8;min-height:130px"></div>`;
    }
  }
  html += '</div>';
  return html;
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: text blocks (cách cục + scores + đại vận)
// ────────────────────────────────────────────────────────────────────────────
function renderTextBlocks(ls: Rec): string {
  const cachCuc = (ls.cachCuc as Rec[]) || [];
  const scores  = (ls.cungScores as Record<string, Record<string,number>>) || {};
  const dvs     = (ls.daiVans as Rec[]) || [];
  const CUNGS   = ['Mệnh','Quan Lộc','Tài Bạch','Phu Thê','Tử Tức'];
  const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
  const MLABELS = ['Tiềm Năng','Bền Vững','An Toàn','Quý Nhân','Minh Bạch','Tương Hợp'];
  const LOAIs: Record<string,string> = {
    quy_cuc:'background:#2a1f5e;color:#a78bfa',
    phu_cuc:'background:#1f3a2a;color:#4ade80',
    hung_cuc:'background:#3a1f1f;color:#f87171',
    trung_cuc:'background:#2a2a1f;color:#fbbf24',
    than_cu:'background:#1e1e1e;color:#94a3b8',
  };

  const ccHTML = cachCuc.length > 0
    ? cachCuc.map(c => {
        const style = LOAIs[String(c.loai||'')] || 'background:#1e1e1e;color:#94a3b8';
        return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;padding:8px 12px;background:#f5f5f5;border-radius:6px">
          <span style="${style};font-size:11px;font-weight:700;padding:2px 7px;border-radius:3px;white-space:nowrap">${esc(String(c.ten||''))}</span>
          <span style="font-size:12px;color:#444;line-height:1.5">${esc(String(c.moTa||c.tomTat||''))}</span>
        </div>`;
      }).join('')
    : '<p style="font-size:13px;color:#888;font-style:italic">Không có cách cục đặc biệt</p>';

  const scoresHTML = CUNGS.map(cung => {
    const sc = scores[cung];
    if (!sc) return '';
    const total = METRICS.reduce((s,m)=>s+(sc[m]||0),0);
    return `<div style="background:#F5F4F0;border-radius:8px;padding:12px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:#061A2E;margin-bottom:8px">${esc(cung)} <span style="font-weight:400;color:#888;font-size:11px">(${(total/METRICS.length).toFixed(1)}/10)</span></div>
      ${METRICS.map((m,i) => {
        const v=sc[m]||0; const pct=v*10;
        const col=v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:10px;color:#666;width:72px;flex-shrink:0">${MLABELS[i]}</span>
          <div style="flex:1;height:6px;background:#d0d8e0;border-radius:3px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${col};border-radius:3px"></div>
          </div>
          <span style="font-size:10px;color:#444;width:18px;text-align:right">${v}</span>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  const dvHTML = dvs.slice(0,9).map(dv => {
    const sc   = (dv.scoring as Rec)||{};
    const tong = sc.tong as number || 0;
    const col  = tong>=7?'#1a6b3a':tong>=4?'#7a5f0a':'#6b1a1a';
    const isCur= !!dv.isCurrentDV;
    return `<div style="text-align:center;padding:8px 10px;border:${isCur?'2px solid #c9a84c':'1px solid #e0e0e0'};border-radius:6px;background:${isCur?'#F9F4EB':'#fff'}">
      <div style="font-size:10px;color:#888;margin-bottom:2px">${esc(String(dv.tuoiStart||''))}–${esc(String(dv.tuoiEnd||''))}t</div>
      <div style="font-size:12px;font-weight:700;color:#061A2E">${esc(String(dv.canChi||''))}</div>
      ${tong>0?`<div style="font-size:11px;font-weight:700;color:${col};margin-top:2px">${tong}/10</div>`:''}
      ${isCur?'<div style="font-size:9px;color:#9A7B3A;font-weight:700;margin-top:2px">Hiện tại</div>':''}
    </div>`;
  }).join('');

  return `
    <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #061A2E">⚙ Cách Cục</div>
      ${ccHTML}
    </div>
    ${scoresHTML ? `<div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #061A2E">📊 Điểm 6 Chiều</div>
      ${scoresHTML}
    </div>` : ''}
    ${dvHTML ? `<div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #061A2E">📅 Đại Vận</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${dvHTML}</div>
    </div>` : ''}`;
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: full HTML builder
// ────────────────────────────────────────────────────────────────────────────
function buildIsrHTML(ls: Rec, params: IsrParams, slug: string): string {
  const palaces    = (ls.palaces as Rec[]) || [];
  const menhP      = palaces.find(p => p.isMenh) as Rec|undefined;
  const cungMenh   = String(menhP?.cungName || '');
  const chinhTinh  = ((menhP?.majorStars as Rec[])||[]).map(s=>String(s.ten||'')).join(', ');
  const cachCuc    = (ls.cachCuc as Rec[]) || [];
  const canChiNam  = String(ls.canChiNam || `${CAN_NAMES[params.canIdx]} ${CHI_NAMES[params.chiIdx]}`);
  const napAm      = String(ls.napAm || '');
  const scores     = (ls.cungScores as Record<string, Record<string,number>>) || {};
  const dvs        = (ls.daiVans as Rec[]) || [];
  const curDV      = dvs.find(d => d.isCurrentDV) as Rec|undefined;
  const { dd, mm, year, gioIdx, gioi, namXem } = params;
  const gtLabel    = gioi === 'nam' ? 'Nam' : 'Nữ';
  const gioLabel   = GIO_NAMES[gioIdx];
  const pad        = (n: number) => String(n).padStart(2,'0');

  // Điểm cung mệnh
  const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
  const sc = scores[cungMenh];
  const diemMenh = sc ? Math.round(METRICS.reduce((s,m)=>s+(sc[m]||0),0)/METRICS.length*10)/10 : 0;

  // OG image
  const ccNames = cachCuc.slice(0,3).map(c=>String(c.ten||'')).join(',');
  const ogUrl   = `${BASE}/api/og/laso?cm=${encodeURIComponent(cungMenh)}&ct=${encodeURIComponent(chinhTinh)}&cc=${encodeURIComponent(ccNames)}&diem=${diemMenh.toFixed(1)}&gt=${encodeURIComponent(gtLabel)}&year=${year}&cc_nam=${encodeURIComponent(canChiNam)}`;

  const url     = `${BASE}/la-so/${slug}`;
  const title   = `Lá Số Tử Vi ${canChiNam} ${gtLabel} — Sinh ${pad(dd)}/${pad(mm)}/${year} Giờ ${gioLabel} — Cung ${cungMenh}`;
  const desc    = `Lá số tử vi ${canChiNam} ${gtLabel.toLowerCase()}, sinh ngày ${pad(dd)}/${pad(mm)}/${year} giờ ${gioLabel}, cung mệnh ${cungMenh}${chinhTinh?`, chính tinh ${chinhTinh}`:''}${napAm?`, nạp âm ${napAm}`:''}. Phân tích cách cục, đại vận, điểm 6 chiều năm ${namXem}.`;

  // FAQPage schema for AEO
  const faqItems = [
    { q: `Người sinh năm ${canChiNam} ${gtLabel.toLowerCase()}, ngày ${pad(dd)}/${pad(mm)}/${year} giờ ${gioLabel} có cung mệnh gì?`,
      a: `Cung mệnh là cung ${cungMenh}${chinhTinh?` với chính tinh ${chinhTinh}`:''}${napAm?`, nạp âm ${napAm}`:''}.` },
    ...(cachCuc.length > 0 ? [{ q: `Lá số ${canChiNam} ${gtLabel.toLowerCase()} giờ ${gioLabel} có những cách cục gì?`,
      a: `Lá số này có ${cachCuc.length} cách cục: ${cachCuc.map(c=>String(c.ten||'')).join(', ')}.` }] : []),
    ...(curDV ? [{ q: `Đại vận hiện tại của lá số này là gì?`,
      a: `Đại vận hiện tại là ${String(curDV.canChi||'')} (tuổi ${String(curDV.tuoiStart||'')}–${String(curDV.tuoiEnd||'')}).` }] : []),
    { q: `Điểm cung mệnh của lá số ${canChiNam} ${gtLabel.toLowerCase()} giờ ${gioLabel} là bao nhiêu?`,
      a: diemMenh > 0 ? `Điểm cung mệnh là ${diemMenh.toFixed(1)}/10. Để xem phân tích chi tiết 24 phần, dùng công cụ luận giải tại tuviminhbao.com.` : `Xem điểm chi tiết bằng công cụ luận giải tại tuviminhbao.com.` },
  ];

  const schema = JSON.stringify([
    { '@context':'https://schema.org','@type':'Article',
      headline: title, description: desc, url, inLanguage:'vi',
      author: {'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
      publisher: {'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
      image: {'@type':'ImageObject',url:ogUrl,width:1200,height:630} },
    { '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:'Mệnh Khố',item:`${BASE}/menh-kho.html`},
      {'@type':'ListItem',position:3,name:`Năm ${year}`,item:`${BASE}/menh-kho/${year}`},
      {'@type':'ListItem',position:4,name:`${pad(dd)}/${pad(mm)}/${year}`,item:`${BASE}/menh-kho/${year}/${pad(mm)}-${pad(dd)}`},
      {'@type':'ListItem',position:5,name:title,item:url}] },
    { '@context':'https://schema.org','@type':'FAQPage',
      mainEntity: faqItems.map(f => ({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}})) },
  ]);

  const gridHTML = renderGrid(ls);
  const textHTML = renderTextBlocks(ls);

  return `<!DOCTYPE html>
<html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogUrl)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(ogUrl)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:9px 24px;font-size:12px;color:var(--text-lt);display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}
.wrap{max-width:1000px;margin:0 auto;padding:28px 24px 80px}
.hero{background:linear-gradient(135deg,var(--navy),var(--navy-mid));border-radius:10px;padding:24px 28px;color:#fff;margin-bottom:24px}
.hero-eyebrow{font-size:10px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px}
.hero-title{font-size:22px;font-weight:700;margin-bottom:10px;line-height:1.3}
.hero-tags{display:flex;gap:8px;flex-wrap:wrap}
.hero-tag{font-size:11px;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.85)}
.layout{display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start}
.grid-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:8px}
.cta-box{margin-top:20px;padding:20px;background:linear-gradient(135deg,#171a4a,#2d2060);border-radius:10px;color:#fff;text-align:center}
.cta-box h3{font-size:17px;font-weight:700;margin-bottom:8px}
.cta-box p{font-size:13px;opacity:.85;margin-bottom:16px;line-height:1.6}
.cta-btn{display:inline-block;background:#8b6dff;color:#fff;padding:11px 28px;border-radius:7px;text-decoration:none;font-weight:700;font-size:14px}
.faq{margin-top:20px;background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0}
.faq-title{font-size:13px;font-weight:700;color:var(--navy);margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid var(--navy)}
.faq-item{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border-lt)}
.faq-item:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}
.faq-q{font-size:13px;font-weight:700;color:var(--navy);margin-bottom:4px}
.faq-a{font-size:13px;color:var(--text-mid);line-height:1.6}
@media(max-width:800px){.layout{grid-template-columns:1fr}.bc,.wrap{padding-left:14px;padding-right:14px}.hero-title{font-size:18px}}
</style>
<script src="/auth.js" defer></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc">
  <a href="/">Trang Chủ</a>›
  <a href="/menh-kho.html">Mệnh Khố</a>›
  <a href="/menh-kho/${year}">Năm ${year}</a>›
  <a href="/menh-kho/${year}/${pad(mm)}-${pad(dd)}">${pad(dd)}/${pad(mm)}/${year}</a>›
  <span>${esc(canChiNam)} ${esc(gtLabel)} Giờ ${esc(gioLabel)}</span>
</div>
<div class="wrap">
  <div class="hero">
    <div class="hero-eyebrow">Lá Số Tử Vi · Cổ Pháp · Năm ${namXem}</div>
    <div class="hero-title">Lá Số ${esc(canChiNam)} ${esc(gtLabel)} — Sinh ${pad(dd)}/${pad(mm)}/${year} Giờ ${esc(gioLabel)}</div>
    <div class="hero-tags">
      ${cungMenh?`<span class="hero-tag">Cung ${esc(cungMenh)}</span>`:''}
      ${chinhTinh?`<span class="hero-tag">⭐ ${esc(chinhTinh)}</span>`:''}
      ${napAm?`<span class="hero-tag">${esc(napAm)}</span>`:''}
      ${String(ls.cuc||'')?`<span class="hero-tag">Cục ${esc(String(ls.cuc))}</span>`:''}
      ${diemMenh>0?`<span class="hero-tag">Điểm ${diemMenh.toFixed(1)}/10</span>`:''}
    </div>
  </div>

  <div class="layout">
    <div>
      <div class="grid-label">Lá Số Grid — 12 Cung Bố Cục</div>
      ${gridHTML}
      <div style="margin-top:20px">${textHTML}</div>
    </div>

    <div>
      <div class="cta-box">
        <h3>Luận Giải AI — 24 Phần</h3>
        <p>Nhập đúng giờ sinh để nhận phân tích chuyên sâu: tính cách, sự nghiệp, tình duyên, vận hạn năm ${namXem}.</p>
        <a class="cta-btn" href="/">Xem Luận Giải Miễn Phí →</a>
      </div>

      <div class="faq">
        <div class="faq-title">Câu Hỏi Thường Gặp</div>
        ${faqItems.map(f => `<div class="faq-item">
          <div class="faq-q">${esc(f.q)}</div>
          <div class="faq-a">${esc(f.a)}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>
<script src="/footer.js"></script>
<script src="/nav.js" defer></script>
</body></html>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Route handler
// ────────────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return NextResponse.redirect(`${BASE}/menh-kho.html`);

  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  // 1. Try laso_public (user-paid, full AI analysis)
  try {
    const pubRes = await fetch(
      `${SB_URL}/rest/v1/laso_public?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      { headers }
    );
    if (pubRes.ok) {
      const rows = await pubRes.json();
      if (rows?.length) {
        const html = buildPublicHTML(rows[0], slug);
        return new NextResponse(html, { headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        }});
      }
    }
  } catch { /* continue */ }

  // 2. Try laso_pregen (old pre-generated batch)
  try {
    const preRes = await fetch(
      `${SB_URL}/rest/v1/laso_pregen?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      { headers }
    );
    if (preRes.ok) {
      const rows = await preRes.json();
      if (rows?.length) {
        const html = buildPregenHTML(rows[0], slug);
        return new NextResponse(html, { headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        }});
      }
    }
  } catch { /* continue */ }

  // 3. Try ISR compute (new 438K slug format)
  const isrParams = parseIsrSlug(slug);
  if (isrParams) {
    try {
      const { convertDuongToAm, anSaoLaSo } = loadEngine();
      const hour  = GIO_HOURS[isrParams.gioIdx];
      const conv  = convertDuongToAm(isrParams.dd, isrParams.mm, isrParams.year, hour) as Rec;
      if (conv?.amLich) {
        const al = conv.amLich as Rec;
        const ls = anSaoLaSo({
          ngayAL: al.day, thangAL: al.month, namAL: isrParams.year,
          canNam: conv.canNam, chiNam: conv.chiNam,
          gioIdx: isrParams.gioIdx,
          gioitinh: isrParams.gioi,
          namXem: isrParams.namXem,
        }) as Rec;
        if (ls) {
          const html = buildIsrHTML(ls, isrParams, slug);
          return new NextResponse(html, { headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
          }});
        }
      }
    } catch { /* fall through to redirect */ }
  }

  // 4. Not found
  return NextResponse.redirect(`${BASE}/menh-kho.html`);
}
