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

// Mapping tên sao → slug tu-dien (chỉ sao có trang riêng)
const SAO_SLUG: Record<string,string> = {
  'Tử Vi':'sao-tu-vi','Thiên Cơ':'sao-thien-co','Thái Dương':'sao-thai-duong',
  'Vũ Khúc':'sao-vu-khuc','Thiên Đồng':'sao-thien-dong','Liêm Trinh':'sao-liem-trinh',
  'Thiên Phủ':'sao-thien-phu','Thái Âm':'sao-thai-am','Tham Lang':'sao-tham-lang',
  'Cự Môn':'sao-cu-mon','Thiên Tướng':'sao-thien-tuong','Thiên Lương':'sao-thien-luong',
  'Thất Sát':'sao-that-sat','Phá Quân':'sao-pha-quan',
  'Kình Dương':'sao-kinh-duong','Đà La':'sao-da-la',
  'Hỏa Tinh':'sao-hoa-tinh','Linh Tinh':'sao-linh-tinh',
  'Địa Không':'sao-dia-khong','Địa Kiếp':'sao-dia-kiep',
  'Văn Xương':'sao-van-xuong','Văn Khúc':'sao-van-khuc',
  'Tả Phù':'sao-ta-phu','Hữu Bật':'sao-huu-bat',
  'Thiên Khôi':'sao-thien-khoi','Thiên Việt':'sao-thien-viet',
  'Lộc Tồn':'sao-loc-ton','Thiên Mã':'sao-thien-ma',
  'Hóa Lộc':'sao-hoa-loc','Hóa Quyền':'sao-hoa-quyen',
  'Hóa Khoa':'sao-hoa-khoa','Hóa Kỵ':'sao-hoa-ky',
  'Thiên Hình':'sao-thien-hinh','Thiên Hư':'sao-thien-hu',
  'Thiên Hỷ':'sao-thien-hy','Thiên Khốc':'sao-thien-kho',
  'Thiên Không':'sao-thien-khong','Thiên Đức':'sao-thien-duc',
  'Nguyệt Đức':'sao-nguyet-duc','Hồng Loan':'sao-hong-loan',
  'Đào Hoa':'sao-dao-hoa','Thiên Diêu':'sao-thien-dieu',
  'Bạch Hổ':'sao-bac-ho','Thanh Long':'sao-thanh-long',
  'Tang Môn':'sao-tang-mon','Bệnh Phù':'sao-benh-phu',
  'Thái Tuế':'sao-thai-tue','Phá Toái':'sao-pha-toai',
  'Kiếp Sát':'sao-kiep-sat','Quan Phù':'sao-quan-phu',
  'Cô Thần':'sao-co-than','Quả Tú':'sao-qua-tu',
  'Thiên Tài':'sao-thien-tai','Thiên Thọ':'sao-thien-tho',
  'Thiên Phúc':'sao-thien-phuc','Bát Tọa':'sao-bat-toa',
  'Ân Quang':'sao-an-quang','Tiểu Hao':'sao-tieu-hao',
  'Đại Hao':'sao-dai-hao','Phi Liêm':'sao-phi-liem',
};

function starLink(ten: string, display: string): string {
  const slug = SAO_SLUG[ten];
  if (!slug) return display;
  return `<a href="/tu-dien/${slug}" class="sao-link">${display}</a>`;
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
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" as="style" onload="this.rel='stylesheet'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet"></noscript>
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
.cc-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;flex-shrink:0;background:#2a1f5e;color:#a78bfa}
.cc-desc{font-size:13px;color:var(--text-mid);line-height:1.5;flex:1;min-width:0}
@media(max-width:600px){.cc-item{flex-direction:column;gap:6px}.cc-badge{align-self:flex-start}}
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
      ${row.cuc?`<span class="hero-tag"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">⚙</span> Cục ${esc(row.cuc)}</span>`:''}
      ${row.am_duong?`<span class="hero-tag">${esc(row.am_duong)}</span>`:''}
      ${row.gio_chi?`<span class="hero-tag">Giờ ${esc(row.gio_chi)}</span>`:''}
    </div>
  </div>
  ${cachCuc.length > 0 ? `<div class="section"><div class="section-title"><span class="ic-inline" data-icon-emoji="⚙" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">⚙</span> Cách Cục Đặc Biệt <span style="font-size:12px;color:var(--text-lt);font-weight:400">(${cachCuc.length} cách cục)</span></div>${ccHTML}</div>` : ''}
  ${dvHTML ? `<div class="section"><div class="section-title"><span class="ic-inline" data-icon-emoji="📅" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📅</span> Đại Vận</div>${dvHTML}</div>` : ''}
  ${scoresHTML ? `<div class="section"><div class="section-title"><span class="ic-inline" data-icon-emoji="📊" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">📊</span> Điểm 6 Chiều Từng Cung</div><div class="scores-grid">${scoresHTML}</div></div>` : ''}
  ${contentHTML ? `<div class="section"><div class="body-content">${contentHTML}</div></div>` : ''}
  <div class="cta-box">
    <h3>Luận Giải AI Đầy Đủ — 24 Phần</h3>
    <p>Nhập đúng giờ sinh để có luận giải chuyên sâu về tính cách, sự nghiệp, tình duyên, vận hạn theo cổ pháp Tử Vi Đẩu Số.</p>
    <a class="cta-btn" href="/luan-giai.html">Xem Luận Giải →</a>
  </div>
</div>
<script src="/footer.js"></script>
<script src="/nav.js?v=14" defer></script>
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
<script src="/nav.js?v=14" defer></script>
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
<script src="/nav.js?v=14" defer></script>
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
let engineCache: { convertDuongToAm: (...a: unknown[]) => unknown; anSaoLaSo: (...a: unknown[]) => unknown; phanTichCungYNghia: (...a: unknown[]) => Record<string,string[]> } | null = null;

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
  engineCache = (new Function('window','globalThis', code + '\nreturn{convertDuongToAm,anSaoLaSo,phanTichCungYNghia};'))(g,g) as typeof engineCache;
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

// ── Star data for grid rendering ─────────────────────────────────────────────
const CHINH_CLS: Record<string,string> = {
  'Tử Vi':'tho','Thiên Cơ':'moc','Thái Dương':'hoa','Vũ Khúc':'kim',
  'Thiên Đồng':'thuy','Liêm Trinh':'hoa','Thiên Phủ':'tho','Thái Âm':'thuy',
  'Tham Lang':'thuy','Cự Môn':'thuy','Thiên Tướng':'thuy','Thiên Lương':'moc',
  'Thất Sát':'kim','Phá Quân':'thuy',
};
const HUNG_SET = new Set([
  'Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp','Thiên Không',
  'Đại Hao','Tiểu Hao','Bệnh Phù','Phục Binh','Quan Phù','Bạch Hổ','Tang Môn',
  'Điếu Khách','Kiếp Sát','Phá Toái','Thiên Hình','Thiên Riêu','Phi Liêm','Thiên Sứ',
]);
// STAR_CLS compiled from tuvi-ansao-engine.js STAR_DATA (server-side, no runtime access)
const STAR_CLS: Record<string,string> = {
  // Kim
  'Kình Dương':'sc-kim','Đà La':'sc-kim',
  'Văn Xương':'sc-kim','Phượng Các':'sc-kim',
  'Bạch Hổ':'sc-kim','Nguyệt Đức':'sc-kim',
  'Hoa Cái':'sc-kim','Lực Sỹ':'sc-kim','Tướng Quân':'sc-kim',
  // Thủy
  'Văn Khúc':'sc-thuy','Thiên Y':'sc-thuy',
  'Hồng Loan':'sc-thuy','Thiên Hỷ':'sc-thuy',
  'Long Trì':'sc-thuy','Lưu Hà':'sc-thuy',
  'Thiên Riêu':'sc-thuy','Thiên Sứ':'sc-thuy',
  'Thiên Khốc':'sc-thuy','Thiên Hư':'sc-thuy',
  'Tam Thai':'sc-thuy','Long Đức':'sc-thuy',
  'Thiếu Âm':'sc-thuy','Bác Sỹ':'sc-thuy',
  'Hữu Bật':'sc-thuy',
  // Hỏa
  'Hỏa Tinh':'sc-hoa','Linh Tinh':'sc-hoa',
  'Kiếp Sát':'sc-hoa','Thiên Hình':'sc-hoa',
  'Địa Không':'sc-hoa','Địa Kiếp':'sc-hoa','Thiên Không':'sc-hoa',
  'Đại Hao':'sc-hoa','Tiểu Hao':'sc-hoa',
  'Phục Binh':'sc-hoa','Quan Phù':'sc-hoa',
  'Phá Toái':'sc-hoa','Tử Phù':'sc-hoa','Trực Phù':'sc-hoa',
  'Thiếu Dương':'sc-hoa','Thiên Giải':'sc-hoa',
  'Thiên Mã':'sc-hoa','Phi Liêm':'sc-hoa',
  // Mộc
  'Đào Hoa':'sc-moc','Bát Tọa':'sc-moc',
  'Ân Quang':'sc-moc','Giải Thần':'sc-moc',
  'Tang Môn':'sc-moc','Đường Phù':'sc-moc',
  'Thanh Long':'sc-moc','Tấu Thư':'sc-moc','Hỷ Thần':'sc-moc',
  // Thổ
  'Tả Phụ':'sc-tho','Tả Phù':'sc-tho',
  'Thiên Khôi':'sc-tho','Thiên Việt':'sc-tho',
  'Thiên Quý':'sc-tho','Thiên Tài':'sc-tho',
  'Lộc Tồn':'sc-tho','Thiên Thọ':'sc-tho',
  'Thiên Đức':'sc-tho','Thiên Phúc':'sc-tho',
  'Địa Giải':'sc-tho','Phúc Đức':'sc-tho',
  'Thiên La':'sc-tho','Địa Võng':'sc-tho',
  'Thiên Thương':'sc-tho','Thiên Trù':'sc-tho',
  'Cô Thần':'sc-tho','Quả Tú':'sc-tho',
  'Quốc Ấn':'sc-tho','Thiên Quan':'sc-tho',
  'Thái Tuế':'sc-tho','Tuế Phá':'sc-tho',
  'Bệnh Phù':'sc-tho','Điếu Khách':'sc-tho',
  'Đẩu Quân':'sc-tho',
};
const BC_MAP: Record<string,string> = {Miếu:'M',Vượng:'V',Đắc:'Đ',Bình:'B',Hãm:'H'};
const TS_SET = new Set(['Tràng Sinh','Mộc Dục','Quan Đới','Lâm Quan','Đế Vượng','Suy','Bệnh','Tử','Mộ','Tuyệt','Thai','Dưỡng']);
const G_CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];

function renderGrid(ls: Rec, canIdx: number): string {
  const palaces = (ls.palaces as Rec[]) || [];
  const dcMap: Record<number, Rec> = {};
  palaces.forEach(p => {
    const dc = DCHI.indexOf(String(p.diaChi||''));
    if (dc >= 0) dcMap[dc] = p;
  });
  const grid: (Rec|null|'center')[][] = Array.from({length:4}, () => Array(4).fill(null));
  Object.entries(DCHI_TO_POS).forEach(([dcStr, [r,c]]) => { grid[r][c] = dcMap[parseInt(dcStr)] || null; });
  grid[1][1] = grid[1][2] = grid[2][1] = grid[2][2] = 'center';

  const dvs   = (ls.daiVans as Rec[]) || [];
  const curDV = dvs.find(d => d.isCurrentDV) as Rec|undefined;

  function phuCls(s: Rec): string {
    const ten = String(s.ten||''); const hoa = String(s.hoa||'');
    if (hoa==='Lộc') return 'sc-hoa-loc';
    if (hoa==='Quyền') return 'sc-hoa-quyen';
    if (hoa==='Khoa') return 'sc-hoa-khoa';
    if (hoa==='Kỵ') return 'sc-hoa-ky';
    return STAR_CLS[ten]||'sc-neutral';
  }

  function renderCell(p: Rec): string {
    const cungName = String(p.cungName||'');
    const diacChi  = String(p.diaChi||'');
    const dcIdx    = DCHI.indexOf(diacChi);
    const majStars = (p.majorStars as Rec[])||[];
    const allStars = (p.stars as Rec[])||[];
    const isMenh   = !!p.isMenh;
    const isThan   = !!p.isThan;
    const isDVCung = curDV && Number(curDV.cungIdx) === dcIdx;

    // Can-chi header for this cung
    const cungCanIdx = (((canIdx % 5) * 2 + dcIdx) % 10);
    const canChiHeader = `${G_CAN[cungCanIdx]} ${diacChi}`;

    // Chính tinh
    const hoaFromChinh: Rec[] = [];
    let chinhH = '';
    for (const s of majStars) {
      const cls = 'sc-'+(CHINH_CLS[String(s.ten||'')] ? CHINH_CLS[String(s.ten||'')] : 'neutral');
      const b = s.brightness ? ` <span style="font-size:10px">(${BC_MAP[String(s.brightness)]||''})</span>` : '';
      if (s.hoa) hoaFromChinh.push(s);
      const _tenChinhDisplay = starLink(String(s.ten||''), esc(String(s.ten||'')).toUpperCase());
      chinhH += `<div class="v2-chinh-item ${cls}">${_tenChinhDisplay}${b}</div>`;
    }

    // Phụ tinh: exclude tràng sinh, tuần/triệt, chính tinh
    const phuStars = allStars.filter(s => {
      const ten = String(s.ten||'');
      if (String(s.nhom||'')==='chinh') return false;
      if (TS_SET.has(ten)) return false;
      if (ten==='Tuần'||ten==='Triệt'||ten==='Tuần+Triệt') return false;
      return true;
    });
    const renderPhu = (s: Rec) => {
      const cls = phuCls(s);
      const b = s.brightness ? ` <span style="font-size:8px">(${BC_MAP[String(s.brightness)]||''})</span>` : '';
      let nm = starLink(String(s.ten||''), esc(String(s.ten||'')).toUpperCase());
      if (s.hoa) {
        const hc = s.hoa==='Lộc'?'sc-hoa-loc':s.hoa==='Quyền'?'sc-hoa-quyen':s.hoa==='Khoa'?'sc-hoa-khoa':'sc-hoa-ky';
        nm += ` <span class="${hc}" style="font-size:8px">[${esc(String(s.hoa)[0])}]</span>`;
      }
      return `<div class="v2-phu-item ${cls}">${nm}${b}</div>`;
    };
    let catH = phuStars.filter(s => !HUNG_SET.has(String(s.ten||''))).map(renderPhu).join('');
    const hungH = phuStars.filter(s => HUNG_SET.has(String(s.ten||''))).map(renderPhu).join('');
    // Hóa từ chính tinh appended to cat column, written out in full
    for (const s of hoaFromChinh) {
      const hoa = String(s.hoa||'');
      const hc = hoa==='Lộc'?'sc-hoa-loc':hoa==='Quyền'?'sc-hoa-quyen':hoa==='Khoa'?'sc-hoa-khoa':'sc-hoa-ky';
      catH += `<div class="v2-phu-item ${hc}" style="font-weight:700">HÓA ${hoa.toUpperCase()}</div>`;
    }

    const tsS = allStars.find(s => TS_SET.has(String(s.ten||'')));
    const hasTuan  = allStars.some(s => s.ten==='Tuần'||s.ten==='Tuần+Triệt');
    const hasTriet = allStars.some(s => s.ten==='Triệt'||s.ten==='Tuần+Triệt');
    let tt = '';
    if (hasTuan && hasTriet) tt = '<span class="v2-tuan-tag">TUẦN+TRIỆT</span>';
    else if (hasTuan)  tt = '<span class="v2-tuan-tag">TUẦN</span>';
    else if (hasTriet) tt = '<span class="v2-triet-tag">TRIỆT</span>';

    const dvTuoi = isDVCung && curDV ? `${curDV.tuoiStart}–${curDV.tuoiEnd}` : '';
    const thanBadge = isThan ? ` <span class="v2-badge-than">THÂN</span>` : '';

    return `<div class="cung-cell${isMenh?' is-menh':''}${isDVCung?' cur-van':''}">
      <div class="v2-cell-header">
        <span class="v2-can-chi">${esc(canChiHeader).toUpperCase()}</span>
        <span class="v2-cung-name">${esc(cungName).toUpperCase()}${thanBadge}</span>
      </div>
      <div class="v2-chinh-area">${chinhH}</div>
      <div class="v2-phu-area">
        <div class="v2-phu-col">${catH}</div>
        <div class="v2-phu-col v2-phu-col-right">${hungH}</div>
      </div>
      <div class="v2-footer">
        <span class="v2-trang-sinh">${tsS ? esc(String(tsS.ten||'')).toUpperCase() : ''}</span>
        <span class="v2-dai-van">${esc(dvTuoi)}</span>
      </div>
      ${tt}
    </div>`;
  }

  const menhP     = palaces.find(p => p.isMenh) as Rec|undefined;
  const napAm     = String(ls.napAmHanh||ls.napAm||'');
  const cuc       = String(ls.cucName||ls.cuc||'');
  const canChiNam = String(ls.canChiNam||'');
  const centerHTML = `<div class="grid-center">
    <div style="font-size:10px;color:#9A7B3A;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">紫微明寶</div>
    <div style="font-size:14px;font-weight:700;color:#061A2E;margin-bottom:4px">${esc(canChiNam)}</div>
    <div style="font-size:11px;color:#444;margin-bottom:2px">Cung Mệnh: ${esc(String(menhP?.cungName||''))}</div>
    <div style="font-size:10px;color:#777;margin-bottom:2px">${esc(napAm)}</div>
    <div style="font-size:10px;color:#777">${esc(cuc)}</div>
  </div>`;

  let html = `<div class="laso-grid">`;
  let centerRendered = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = grid[r][c];
      if (cell === 'center') {
        if (!centerRendered && r===1 && c===1) { html += centerHTML; centerRendered = true; }
        continue;
      }
      html += cell ? renderCell(cell) : `<div class="cung-cell cung-empty"></div>`;
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
      <div style="font-size:12px;font-weight:700;color:#061A2E">${esc(String(dv.diaChi||''))}</div>
      ${tong>0?`<div style="font-size:11px;font-weight:700;color:${col};margin-top:2px">${tong}/10</div>`:''}
      ${isCur?'<div style="font-size:9px;color:#9A7B3A;font-weight:700;margin-top:2px">Hiện tại</div>':''}
    </div>`;
  }).join('');

  return `
    <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #061A2E">⚙ Cách Cục</div>
      ${ccHTML}
    </div>

    ${dvHTML ? `<div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e0e0e0">
      <div style="font-size:13px;font-weight:700;color:#061A2E;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #061A2E">📅 Đại Vận</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${dvHTML}</div>
    </div>` : ''}`;
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: 24-section template content (mirrors luan-giai.html buildPreGenHtml)
// Structure: 1=Tổng Quan, 2-13=12 Cung, 14=Tổng quan ĐV, 15-23=ĐV 1-9, 24=Tiểu Vận Năm Xem
// ────────────────────────────────────────────────────────────────────────────

const CUNG_12 = ['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc',
                 'Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];

const PHAN_LABELS_ISR = [
  '','Tổng Quan Lá Số',
  'Cung Mệnh','Cung Phụ Mẫu','Cung Phúc Đức','Cung Điền Trạch',
  'Cung Quan Lộc','Cung Nô Bộc','Cung Thiên Di','Cung Tật Ách',
  'Cung Tài Bạch','Cung Tử Tức','Cung Phu Thê','Cung Huynh Đệ',
  'Tổng Quan Đại Vận',
  'Đại Vận 1','Đại Vận 2','Đại Vận 3','Đại Vận 4','Đại Vận 5',
  'Đại Vận 6','Đại Vận 7','Đại Vận 8','Đại Vận 9',
  'Tiểu Vận Năm Xem',
];

function render24Sections(ls: Rec, params: IsrParams): string {
  const palaces   = (ls.palaces as Rec[]) || [];
  const scores    = (ls.cungScores as Record<string,Record<string,number>>) || {};
  const cachCuc   = (ls.cachCuc as Rec[]) || [];
  const cachCucTC = (ls.cachCucTungCung as Record<string,string[]>) || {};
  const CHINH_TINH = ['Tử Vi','Thiên Cơ','Thái Dương','Vũ Khúc','Thiên Đồng','Liêm Trinh',
    'Thiên Phủ','Thái Âm','Tham Lang','Cự Môn','Thiên Tướng','Thiên Lương','Thất Sát','Phá Quân'];
  function sortByChinhTinh(items: string[]): string[] {
    return [...items].sort((a, b) => {
      const aHas = CHINH_TINH.some(s => a.includes(s)) ? 0 : 1;
      const bHas = CHINH_TINH.some(s => b.includes(s)) ? 0 : 1;
      return aHas - bHas;
    });
  }
  const dvs       = (ls.daiVans as Rec[]) || [];
  const tieuVanSc = (ls.tieuVanScores as Rec[]) || [];
  const { namXem } = params;

  const METRICS = ['tiemNang','benVung','anToan','quyNhan','minhBach','tuongHop'];
  const MLABELS = ['Tiềm Năng','Bền Vững','An Toàn','Quý Nhân','Minh Bạch','Tương Hợp'];
  const LOAI_COL: Record<string,string> = {
    quy_cuc:'#7B3FA0',phu_cuc:'#1E6B3C',hung_cuc:'#C0392B',trung_cuc:'#9A7B3A',than_cu:'#555',
  };
  const LOAI_LABEL: Record<string,string> = {
    quy_cuc:'Quý Cục',phu_cuc:'Phú Cục',hung_cuc:'Hung Cục',trung_cuc:'Trung Cục',than_cu:'Thần Cú',
  };
  const SAT_TPTC = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
  const BAI_TPTC = ['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
  const CAT_TPTC = ['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật','Lộc Tồn','Hóa Lộc','Hóa Quyền','Hóa Khoa'];

  function scoreBars6(cungName: string): string {
    const sc = scores[cungName];
    if (!sc) return '';
    return `<div style="display:flex;flex-direction:column;gap:3px;margin-top:8px">${METRICS.map((m,i)=>{
      const v=sc[m]||0; const col=v>=7?'#1FA3D6':v>=5?'#2F5BEA':v>=3?'#233E99':'#C0392B';
      return `<div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;color:#888;width:72px">${MLABELS[i]}</span>
        <div style="flex:1;height:5px;background:#e0e0e0;border-radius:3px;overflow:hidden">
          <div style="width:${v*10}%;height:100%;background:${col};border-radius:3px"></div>
        </div>
        <span style="font-size:10px;color:#555;width:16px">${v}</span>
      </div>`;
    }).join('')}</div>`;
  }

  const lasoSlug = `${CAN_SLUGS[params.canIdx]}-${CHI_SLUGS[params.chiIdx]}-${String(params.dd).padStart(2,'0')}-${String(params.mm).padStart(2,'0')}-${params.year}-gio-${GIO_SLUGS[params.gioIdx]}-${params.gioi}-${params.namXem}`;

  function cta(label: string): string {
    return `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #E8E3D9;text-align:right">
<a href="/luan-giai.html" style="display:inline-block;background:#9A7B3A;color:#fff;font-size:12px;font-weight:600;padding:7px 16px;border-radius:5px;text-decoration:none">${esc(label)} →</a>
</div>`;
  }

  function sec(n: number, body: string): string {
    const label = PHAN_LABELS_ISR[n] || `Phần ${n}`;
    return `<div class="s24" id="s${n}">
<h2 class="s24h">Phần ${n} / 24 — ${esc(label)}</h2>
<div class="s24b">${body}</div>
</div>`;
  }

  // ── Section 1: Tổng Quan Lá Số ───────────────────────────────────────────
  let b1 = '';
  if (cachCuc.length > 0) {
    b1 += `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">⚙ Cách cục đặc biệt</div>`;
    cachCuc.forEach(c => {
      const loai = String(c.loai||'');
      b1 += `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;padding:8px 10px;background:#F5F4F0;border-radius:6px;border-left:3px solid ${LOAI_COL[loai]||'#888'}">
        <span style="background:${LOAI_COL[loai]||'#888'};color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:3px;white-space:nowrap">${esc(String(c.ten||''))}</span>
        <span style="font-size:12px;color:#444;line-height:1.5">${esc(String(c.moTa||''))}</span>
      </div>`;
    });
    b1 += `</div>`;
  }
  if (!b1) b1 = `<p>Lá số không có cách cục đặc biệt. Phân tích dựa trên từng sao và sự phối hợp giữa các cung.</p>`;
  b1 += cta('Xem luận giải AI đầy đủ lá số này');
  const s1 = sec(1, b1);

  // ── Sections 2–13: 12 Cung ───────────────────────────────────────────────
  const HOA_COL: Record<string,string> = {'Lộc':'#1E6B3C','Quyền':'#7B3FA0','Khoa':'#1455A4','Kỵ':'#C0392B'};

  // TPTC-augmented analysis: expose phanTichCungYNghia to re-run with TPTC stars merged into each palace
  const _engine = loadEngine();
  const _phanTichCYN = _engine.phanTichCungYNghia as (...a: unknown[]) => Record<string,string[]>;
  const _canNam = CAN_NAMES[params.canIdx];
  const _chiNam = CHI_NAMES[params.chiIdx];
  const _lsBase = { palaces: ls.palaces, menhDC: ls.menhDC, thanDC: ls.thanDC, amDuong: ls.amDuong, napAmHanh: ls.napAmHanh, chiNam: _chiNam };

  const cungSecs = CUNG_12.map((cungName, i) => {
    const palace    = palaces.find(p => p.cungName === cungName) as Rec|undefined;
    const majStars  = palace ? ((palace.majorStars as Rec[])||[]) : [];
    const allStars  = palace ? ((palace.stars as Rec[])||[]) : [];
    const minStars  = allStars.filter(s => !majStars.find(m => m.ten===s.ten));
    const diacChi   = palace ? String(palace.diaChi||'') : '';
    const trangSinh = palace ? String(palace.trangSinh||'') : '';
    const isVong    = palace ? !!palace.isVong : false;
    const ynItems   = cachCucTC[cungName] || [];
    const ccInCung  = cachCuc.filter(c => String(c.cung||'')===cungName);
    const sc        = scores[cungName];

    let body = '';

    // Chính tinh block
    body += `<div style="margin-bottom:8px">`;
    if (majStars.length === 0) {
      const xung = palace?.xungChieuCung as Rec|undefined;
      const xungStars = xung ? ((xung.majorStars as Rec[])||[]).map(s=>`${esc(String(s.ten||''))} (${esc(String(s.brightness||''))})`).join(', ') : '';
      body += `<span style="font-size:12px;color:#888;font-style:italic">Vô chính diệu${xungStars?` — mượn từ cung xung: <strong>${xungStars}</strong>`:''}</span>`;
    } else {
      majStars.forEach(s => {
        const hoa   = String(s.hoa||'');
        const bright = String(s.brightness||'');
        const brightCol = bright==='Miếu'||bright==='Vượng'?'#4ade80':bright==='Đắc'?'#86efac':bright==='Bình hòa'||bright==='Bình'?'#60a5fa':'#f87171';
        body += `<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;background:#061A2E;color:#fff;border-radius:4px;font-size:12px;font-weight:700">${starLink(String(s.ten||''), esc(String(s.ten||'')))} <span style="color:${brightCol};font-size:10px">(${esc(bright)})</span>${hoa?` <span style="color:#5FA8D3">[H.${esc(hoa[0])}]</span>`:''}</span>`;
      });
    }
    body += `</div>`;

    // Phụ tinh
    const minNameLinks = minStars.slice(0,8).map(s=>{ const t=String(s.ten||''); return t?starLink(t,esc(t)):''; }).filter(Boolean).join(', ');
    if (minNameLinks) body += `<p style="font-size:11px;color:#888;margin-bottom:6px">Phụ tinh: ${minNameLinks}</p>`;

    // Trạng thái cung
    const stateChips: string[] = [];
    if (diacChi) stateChips.push(esc(diacChi));
    if (trangSinh) stateChips.push(esc(trangSinh));
    if (isVong) stateChips.push('<span style="color:#C0392B">Không Vong</span>');
    const hasTuan  = allStars.some(s=>s.ten==='Tuần');
    const hasTriet = allStars.some(s=>s.ten==='Triệt');
    if (hasTuan)  stateChips.push('<span style="color:#5a4a00">Tuần</span>');
    if (hasTriet) stateChips.push('<span style="color:#5a4a00">Triệt</span>');
    if (stateChips.length) body += `<p style="font-size:11px;color:#888;margin-bottom:6px">${stateChips.join(' · ')}</p>`;

    // Sao tam phương tứ chính — hiển thị + augmented analysis
    const tptcPals3 = [...((palace?.tamHopCungs as Rec[])||[]), palace?.xungChieuCung as Rec].filter(Boolean) as Rec[];
    const tptcCungs = palace ? [palace, ...tptcPals3] : tptcPals3;
    const tptcNames = tptcCungs.flatMap(p => ((p.stars as Rec[])||[]).map(s => String(s.ten||'')));
    const catTPTC = CAT_TPTC.filter(s => tptcNames.includes(s));
    const satTPTC = SAT_TPTC.filter(s => tptcNames.includes(s));
    const baiTPTC = BAI_TPTC.filter(s => tptcNames.includes(s));
    // Re-run phanTichCungYNghia with TPTC stars merged into this palace's stars
    let tptcItems: string[] = [];
    if (palace) {
      const tptcExtraStars = tptcPals3.flatMap(p => (p.stars as Rec[])||[])
        .filter((s: Rec) => s.ten !== 'Tuần' && s.ten !== 'Triệt' && s.ten !== 'Tuần+Triệt');
      const augPalace = { ...palace, stars: [...((palace.stars as Rec[])||[]), ...tptcExtraStars] };
      const augPalaces = (ls.palaces as Rec[]).map((p: Rec) => String(p.cungName||'') === cungName ? augPalace : p);
      const augLs = { ..._lsBase, palaces: augPalaces };
      const augResult = _phanTichCYN(augLs, params.gioi, params.gioIdx, _canNam, _chiNam, 0);
      const origSet = new Set(ynItems);
      tptcItems = sortByChinhTinh((augResult[cungName] || []).filter((item: string) => !origSet.has(item)));
    }

    // Phân tích sao (cachCucTungCung) — chính tinh patterns first
    const ynSorted = sortByChinhTinh(ynItems);
    if (ynSorted.length > 0) {
      body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📋 Phân tích sao</div>`;
      ynSorted.slice(0, 8).forEach(y => {
        const isGreatCat = y.includes('đại cát')||y.includes('đại phú');
        const isCat      = !isGreatCat && (y.includes('[cát]')||y.includes('phú quý')||y.includes('giàu sang'));
        const isGreatHung= y.includes('đại hung');
        const isHung     = !isGreatHung && (y.includes('hung')||y.includes('vất vả')||y.includes('tai'));
        const isTT       = y.includes('Tuần')||y.includes('Triệt');
        const col = isGreatCat?'#4ade80':isCat?'#86efac':isGreatHung?'#f87171':isHung?'#fca5a5':isTT?'#fbbf24':'#94a3b8';
        body += `<div style="font-size:12px;color:${col};padding:2px 0;line-height:1.5">• ${esc(y)}</div>`;
      });
      body += `</div>`;
    }

    // Tam phương tứ chính — after Phân tích sao
    if (catTPTC.length || satTPTC.length || baiTPTC.length || tptcItems.length) {
      body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">🔍 Tam phương tứ chính</div>`;
      if (catTPTC.length) body += `<div style="font-size:12px;color:#86efac;margin:2px 0">Cát tinh: ${catTPTC.map(s=>starLink(s,esc(s))).join(', ')}</div>`;
      if (satTPTC.length) body += `<div style="font-size:12px;color:#f87171;margin:2px 0">Sát tinh: ${satTPTC.map(s=>starLink(s,esc(s))).join(', ')}</div>`;
      if (baiTPTC.length) body += `<div style="font-size:12px;color:#fca5a5;margin:2px 0">Bại tinh: ${baiTPTC.map(s=>starLink(s,esc(s))).join(', ')}</div>`;
      if (tptcItems.length) {
        body += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e0e0e0">`;
        tptcItems.slice(0, 6).forEach(y => {
          const isGreatCat = y.includes('đại cát')||y.includes('đại phú')||y.includes('phú quý');
          const isCat      = !isGreatCat && (y.includes('[cát]')||y.includes('giàu sang')||y.includes('sáng'));
          const isHung     = y.includes('hung')||y.includes('vất vả')||y.includes('tai')||y.includes('xấu');
          const col = isGreatCat?'#4ade80':isCat?'#86efac':isHung?'#fca5a5':'#94a3b8';
          body += `<div style="font-size:12px;color:${col};padding:2px 0;line-height:1.5">◦ ${esc(y)}</div>`;
        });
        body += `</div>`;
      }
      body += `</div>`;
    }

    // Cách cục riêng cung
    if (ccInCung.length > 0) {
      body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">⚙ Cách cục đặc biệt</div>`;
      ccInCung.forEach(c => {
        const loai = String(c.loai||'');
        body += `<span style="display:inline-block;background:${LOAI_COL[loai]||'#888'};color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:3px;margin:2px">${esc(String(c.ten||''))}</span>`;
      });
      body += `</div>`;
    }

    // Score bars 6 chiều
    if (sc) body += scoreBars6(cungName);

    body += cta(`Xem luận giải AI chi tiết ${cungName}`);
    return sec(i+2, body);
  });

  // ── Section 14: Tổng quan Đại Vận ────────────────────────────────────────
  let b14 = '';
  if (dvs.length > 0) {
    b14 += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">`;
    dvs.slice(0,9).forEach((dv, idx) => {
      const sc2=(dv.scoring as Rec)||{}; const t2=Number(sc2.tong)||0;
      const isCur=!!dv.isCurrentDV;
      const col=t2>=7?'#1E6B3C':t2>=4?'#9A7B3A':'#C0392B';
      b14 += `<div style="text-align:center;padding:8px 10px;border:${isCur?'2px solid #9A7B3A':'1px solid #e0e0e0'};border-radius:7px;background:${isCur?'#F9F4EB':'#fff'};min-width:66px">
        <div style="font-size:10px;color:#888;margin-bottom:2px">ĐV ${idx+1}</div>
        <div style="font-size:12px;font-weight:700;color:#061A2E">${esc(String(dv.diaChi||''))}</div>
        <div style="font-size:9px;color:#999">${esc(String(dv.tuoiStart||''))}–${esc(String(dv.tuoiEnd||''))}t</div>
        ${t2>0?`<div style="font-size:11px;font-weight:700;color:${col};margin-top:2px">${t2}/10</div>`:''}
        ${isCur?`<div style="font-size:9px;color:#9A7B3A;font-weight:700">Hiện tại</div>`:''}
      </div>`;
    });
    b14 += `</div>`;
    b14 += `<p style="font-size:12px;color:#666">Điểm đại vận tính theo 3 trụ: Thiên Thời (0-5), Địa Lợi (0-1), Nhân Hòa (0-4). Tổng tối đa 10 điểm.</p>`;
  } else {
    b14 = `<p>Không có dữ liệu đại vận.</p>`;
  }
  b14 += cta('Xem luận giải AI toàn bộ đại vận');
  const s14 = sec(14, b14);

  // ── Sections 15–23: Đại Vận 1–9 ──────────────────────────────────────────
  function buildDVSection(dvIdx: number, phanNum: number): string {
    const dv = dvs[dvIdx] as Rec|undefined;
    if (!dv) return sec(phanNum, `<p style="color:#888;font-style:italic">Không có dữ liệu đại vận ${dvIdx+1}.</p>`);

    const dvPalace = dv.cungIdx !== undefined ? (palaces[Number(dv.cungIdx)] as Rec|undefined) : undefined;
    const dvCungName = dvPalace ? String(dvPalace.cungName||'') : '';
    const dvDC       = dvPalace ? String(dvPalace.diaChi||'') : '';
    const sc         = (dv.scoring as Rec)||{};
    const isCur      = !!dv.isCurrentDV;

    // Override PHAN_LABELS_ISR with actual DV canChi + ages
    const dvLabel = `${PHAN_LABELS_ISR[phanNum]} — Cung ${esc(dvDC||String(dv.diaChi||''))} (${esc(String(dv.tuoiStart||''))}–${esc(String(dv.tuoiEnd||''))}t)${isCur?' ★ Hiện tại':''}`;

    let body = '';

    // Scoring bars (Thiên Thời / Địa Lợi / Nhân Hòa / Tổng)
    if (sc.tong !== undefined) {
      const ttSc = Number((sc.thienThoi as Rec)?.score ?? sc.thienThoi ?? 0);
      const dlSc = Number((sc.diaLoi as Rec)?.score ?? sc.diaLoi ?? 0);
      const nhSc = Number((sc.nhanHoa as Rec)?.score ?? sc.nhanHoa ?? 0);
      const tong = Number(sc.tong)||0;
      const totCol = tong>=7?'#4ade80':tong>=4?'#60a5fa':'#f87171';
      const nhDetail = sc.nhanHoa as Rec|undefined;
      body += `<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📊 Scoring — Cung ${esc(dvCungName)} (${esc(dvDC)})</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${[['Thiên Thời',ttSc,5,'#c9a84c'],['Địa Lợi',dlSc,1,'#0E7490'],['Nhân Hòa',nhSc,4,'#7B2FBE']].map(([lbl,v,max,col])=>`
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:10px;color:#888;width:72px">${esc(String(lbl))}</span>
              <div style="flex:1;height:5px;background:#e0e0e0;border-radius:3px;overflow:hidden">
                <div style="width:${(Number(v)/Number(max)*100).toFixed(0)}%;height:100%;background:${esc(String(col))};border-radius:3px"></div>
              </div>
              <span style="font-size:10px;color:#555;width:28px">${Number(v).toFixed(0)}/${max}</span>
            </div>`).join('')}
          <div style="display:flex;align-items:center;gap:6px;border-top:1px solid #e0e0e0;padding-top:4px;margin-top:2px">
            <span style="font-size:10px;font-weight:700;color:#444;width:72px">Tổng ${esc(String(sc.flag||''))}</span>
            <div style="flex:1;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden">
              <div style="width:${tong*10}%;height:100%;background:${totCol};border-radius:3px"></div>
            </div>
            <span style="font-size:11px;font-weight:700;color:${totCol};width:28px">${tong}/10</span>
          </div>
        </div>
        ${nhDetail?.boMenh?`<p style="font-size:11px;color:#888;margin-top:6px">Bộ Mệnh: ${esc(String(nhDetail.boMenh))} → Bộ ĐV: ${esc(String(nhDetail.boVan||''))}</p>`:''}</div>`;
    }

    // Chính tinh cung đại vận
    if (dvPalace) {
      const majDV  = (dvPalace.majorStars as Rec[])||[];
      const xungDV = dvPalace.xungChieuCung as Rec|undefined;
      body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">⭐ Chính tinh cung đại vận</div>`;
      if (majDV.length === 0) {
        const xungStars = xungDV ? ((xungDV.majorStars as Rec[])||[]).map(s=>`${esc(String(s.ten||''))} (${esc(String(s.brightness||''))})`).join(', ') : '';
        body += `<div style="font-size:12px;color:#94a3b8;font-style:italic">Vô chính diệu${xungStars?` — mượn từ cung xung: <strong>${xungStars}</strong>`:''}</div>`;
      } else {
        majDV.forEach(s => {
          const bright = String(s.brightness||'');
          const bCol = bright==='Miếu'||bright==='Vượng'?'#4ade80':bright==='Đắc'?'#86efac':bright==='Bình hòa'||bright==='Bình'?'#60a5fa':'#f87171';
          const hoa   = String(s.hoa||'');
          body += `<div style="font-size:12px;color:#ddd;margin:2px 0"><span style="font-weight:600;color:#061A2E">${esc(String(s.ten||''))}</span> <span style="color:${bCol};font-size:11px">(${esc(bright)})</span>${hoa?` <span style="color:#1455A4">[Hóa ${esc(hoa)}]</span>`:''}</div>`;
        });
      }
      body += `</div>`;

      // Sao tam phương tứ chính
      const tptcP = [dvPalace, ...((dvPalace.tamHopCungs as Rec[])||[]), xungDV].filter(Boolean) as Rec[];
      const tptcNames = tptcP.flatMap(p => ((p.stars as Rec[])||[]).map(s=>String(s.ten||'')));
      const allDVStars = (dvPalace.stars as Rec[])||[];
      const hasTuan  = allDVStars.some(s=>s.ten==='Tuần');
      const hasTriet = allDVStars.some(s=>s.ten==='Triệt');
      const catIn  = CAT_TPTC.filter(s=>tptcNames.includes(s));
      const satIn  = SAT_TPTC.filter(s=>tptcNames.includes(s));
      const baiIn  = BAI_TPTC.filter(s=>tptcNames.includes(s));

      if (catIn.length||satIn.length||baiIn.length||hasTuan||hasTriet) {
        body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">🔍 Sao tam phương tứ chính</div>`;
        if (catIn.length)  body += `<div style="font-size:12px;color:#86efac;margin:2px 0">Cát tinh: ${esc(catIn.join(', '))}</div>`;
        if (satIn.length)  body += `<div style="font-size:12px;color:#f87171;margin:2px 0">Sát tinh: ${esc(satIn.join(', '))}</div>`;
        if (baiIn.length)  body += `<div style="font-size:12px;color:#fca5a5;margin:2px 0">Bại tinh: ${esc(baiIn.join(', '))}</div>`;
        if (hasTuan)  body += `<div style="font-size:12px;color:#fbbf24;margin:2px 0">Tuần án ngữ cung đại vận</div>`;
        if (hasTriet) body += `<div style="font-size:12px;color:#fbbf24;margin:2px 0">Triệt án ngữ cung đại vận</div>`;
        body += `</div>`;
      }
    }

    // Cách cục liên quan
    const ccDV = cachCuc.filter(c => dvCungName && String(c.cung||'')===dvCungName);
    if (ccDV.length > 0) {
      body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">⚙ Cách cục liên quan</div>`;
      ccDV.forEach(c => {
        const loai = String(c.loai||'');
        body += `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;padding:7px 10px;background:#F5F4F0;border-radius:5px;border-left:2px solid ${LOAI_COL[loai]||'#888'}">
          <span style="background:${LOAI_COL[loai]||'#888'};color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;white-space:nowrap">${esc(String(c.ten||''))}</span>
          <span style="font-size:11px;color:#444;line-height:1.4">${esc(String(c.moTa||''))}</span>
        </div>`;
      });
      body += `</div>`;
    }

    // Luận đoán rules
    const dvRules = (dv.rules as Rec[])||[];
    if (dvRules.length > 0) {
      const totR  = dvRules.filter(r=>r.type==='tot');
      const xauR  = dvRules.filter(r=>r.type==='xau');
      const cbR   = dvRules.filter(r=>r.type==='canh_bao');
      const trungR = dvRules.filter(r=>r.type==='trung');
      body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">🔮 Luận đoán vận hạn</div>`;
      totR.forEach(r   => { body += `<div style="font-size:12px;color:#86efac;padding:2px 0;line-height:1.5">✦ ${esc(String(r.text||''))}</div>`; });
      trungR.forEach(r => { body += `<div style="font-size:12px;color:#94a3b8;padding:2px 0;line-height:1.5">◆ ${esc(String(r.text||''))}</div>`; });
      xauR.forEach(r   => { body += `<div style="font-size:12px;color:#f87171;padding:2px 0;line-height:1.5">▼ ${esc(String(r.text||''))}</div>`; });
      cbR.forEach(r    => { body += `<div style="font-size:12px;color:#f87171;font-weight:600;padding:2px 0;line-height:1.5">⚠ ${esc(String(r.text||''))}</div>`; });
      body += `</div>`;
    }

    // Vận Hạn patterns (yNghia)
    const dvYN = (dv.yNghia as string[])||[];
    if (dvYN.length > 0) {
      body += `<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:#9A7B3A;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📖 Luận giải vận hạn</div>`;
      dvYN.forEach(t => {
        body += `<div style="font-size:12px;color:#374151;padding:3px 0 3px 10px;border-left:2px solid #c9a84c;margin-bottom:4px;line-height:1.5">${esc(t)}</div>`;
      });
      body += `</div>`;
    }

    if (!body) body = `<p style="color:#888;font-style:italic">Không đủ dữ liệu để phân tích đại vận này.</p>`;
    body += cta(`Xem luận giải AI đại vận ${dvIdx+1}`);

    // Return with dynamic title including canChi + age
    return `<div class="s24" id="s${phanNum}">
<h2 class="s24h">Phần ${phanNum} / 24 — ${dvLabel}</h2>
<div class="s24b">${body}</div>
</div>`;
  }

  const dvSecs = Array.from({length:9}, (_, i) => buildDVSection(i, 15+i));

  // ── Section 24: Tiểu Vận Năm Xem ─────────────────────────────────────────
  const curDV    = dvs.find(d => d.isCurrentDV) as Rec|undefined;
  const tvThis   = tieuVanSc.find(t=>Number(t.nam)===namXem) as Rec|undefined;
  const tvScore  = tvThis ? Number(tvThis.mainScore||0) : 0;
  const tvDC     = tvThis ? String(tvThis.diaChi||'') : '';
  const tvDir    = tvThis ? String(tvThis.direction||'') : '';
  const tvWindow = tieuVanSc.filter(t=>Number(t.nam)>=namXem-1&&Number(t.nam)<=namXem+2)
    .sort((a,b)=>Number(a.nam)-Number(b.nam));

  let b24 = '';
  if (tvThis) {
    const tvCol = tvScore>=7?'#1E6B3C':tvScore>=4?'#9A7B3A':'#C0392B';
    const tvDirLbl = tvDir==='up'?'↑ Đang tăng':tvDir==='down'?'↓ Đang giảm':'→ Ổn định';
    b24 += `<p>Tiểu vận năm <strong>${namXem}</strong>: cung <strong>${esc(tvDC)}</strong>. Điểm <strong style="color:${tvCol}">${tvScore.toFixed(1)}/10</strong> — ${esc(tvDirLbl)}.</p>`;
    if (Number(tvThis.satCount)>0) b24 += `<p style="color:#C0392B;font-size:12px">⚠ ${tvThis.satCount} sát tinh ảnh hưởng — chú ý sức khỏe và tránh rủi ro.</p>`;
    if (Number(tvThis.catCount)>0) b24 += `<p style="color:#1E6B3C;font-size:12px">✦ ${tvThis.catCount} cát tinh hỗ trợ trong năm này.</p>`;
  }
  if (curDV) {
    const dvSc2 = (curDV.scoring as Rec)||{};
    const dvT2  = Number(dvSc2.tong)||0;
    b24 += `<p style="font-size:12px;color:#666">Đại vận đang chạy: <strong>Cung ${esc(String(curDV.diaChi||''))}</strong> (${esc(String(curDV.tuoiStart||''))}–${esc(String(curDV.tuoiEnd||''))}t)${dvT2>0?`, điểm ${dvT2}/10`:''} — tiểu vận được xét trong bối cảnh đại vận này.</p>`;
  }
  if (tvWindow.length > 1) {
    b24 += `<div style="display:flex;gap:6px;margin:10px 0;flex-wrap:wrap">`;
    tvWindow.forEach(t => {
      const tSc=Number(t.mainScore||0); const tNam=Number(t.nam); const isThis=tNam===namXem;
      b24 += `<div style="text-align:center;padding:7px 10px;border:${isThis?'2px solid #1455A4':'1px solid #e0e0e0'};border-radius:6px;background:${isThis?'#EEF4FF':'#fff'};min-width:64px">
        <div style="font-size:10px;color:#888">${tNam}</div>
        <div style="font-size:13px;font-weight:700;color:${tSc>=7?'#1E6B3C':tSc>=4?'#9A7B3A':'#C0392B'}">${tSc.toFixed(1)}</div>
        <div style="font-size:10px;color:#888">${esc(String(t.diaChi||''))}</div>
      </div>`;
    });
    b24 += `</div>`;
  }
  if (!b24) b24 = `<p>Không tìm thấy dữ liệu tiểu vận năm ${namXem}.</p>`;
  b24 += cta(`Xem luận giải AI tiểu vận năm ${namXem}`);
  const s24 = sec(24, b24);

  return [s1, ...cungSecs, s14, ...dvSecs, s24].join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: related links (internal linking for Google crawl)
// ────────────────────────────────────────────────────────────────────────────
function isLeapYear(y: number) { return (y%4===0&&y%100!==0)||y%400===0; }
function daysInMonthISR(m: number, y: number) {
  return [31,isLeapYear(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}

function buildRelatedLinks(params: IsrParams): string {
  const { canIdx, chiIdx, dd, mm, year, gioIdx, gioi, namXem } = params;
  const can  = CAN_SLUGS[canIdx];
  const chi  = CHI_SLUGS[chiIdx];
  const p    = (n: number) => String(n).padStart(2,'0');
  const base = `${can}-${chi}-${p(dd)}-${p(mm)}-${year}`;

  const links: { label: string; url: string }[] = [];

  // Same day, adjacent giờ (±1 ±2)
  for (const d of [-2,-1,1,2]) {
    const gi = (gioIdx + d + 12) % 12;
    links.push({ label: `Giờ ${GIO_NAMES[gi]}`, url: `/la-so/${base}-gio-${GIO_SLUGS[gi]}-${gioi}-${namXem}` });
  }

  // Same day/giờ, other giới
  const otherGioi = gioi === 'nam' ? 'nu' : 'nam';
  links.push({ label: gioi === 'nam' ? 'Xem lá số Nữ cùng ngày giờ' : 'Xem lá số Nam cùng ngày giờ',
    url: `/la-so/${base}-gio-${GIO_SLUGS[gioIdx]}-${otherGioi}-${namXem}` });

  // namXem ±1
  if (namXem >= 2021) links.push({ label: `Xem vận năm ${namXem-1}`, url: `/la-so/${base}-gio-${GIO_SLUGS[gioIdx]}-${gioi}-${namXem-1}` });
  if (namXem <= 2038) links.push({ label: `Xem vận năm ${namXem+1}`, url: `/la-so/${base}-gio-${GIO_SLUGS[gioIdx]}-${gioi}-${namXem+1}` });

  // Adjacent days
  if (dd > 1) links.push({ label: `Sinh ${p(dd-1)}/${p(mm)}/${year}`, url: `/la-so/${can}-${chi}-${p(dd-1)}-${p(mm)}-${year}-gio-${GIO_SLUGS[gioIdx]}-${gioi}-${namXem}` });
  const maxD = daysInMonthISR(mm, year);
  if (dd < maxD) links.push({ label: `Sinh ${p(dd+1)}/${p(mm)}/${year}`, url: `/la-so/${can}-${chi}-${p(dd+1)}-${p(mm)}-${year}-gio-${GIO_SLUGS[gioIdx]}-${gioi}-${namXem}` });

  // Hub links
  links.push({ label: `Tất cả giờ sinh ngày ${p(dd)}/${p(mm)}/${year}`, url: `/menh-kho/${year}/${p(mm)}-${p(dd)}` });
  links.push({ label: `Lá số tử vi năm sinh ${year}`, url: `/menh-kho/${year}` });

  return `<div style="background:#F5F4F0;border-top:2px solid #E8E8E8;padding:24px;margin-top:32px">
<div style="max-width:1000px;margin:0 auto">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:16px">Xem thêm lá số liên quan</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px">
    ${links.map(l=>`<a href="${l.url}" style="font-size:12px;padding:5px 12px;border:1px solid #CCC;border-radius:14px;text-decoration:none;color:#444;background:#fff;white-space:nowrap">${esc(l.label)}</a>`).join('')}
  </div>
</div>
</div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: fetch related nghien-cuu articles (tag match → fallback latest)
// ────────────────────────────────────────────────────────────────────────────
type ArticleStub = { slug: string; title: string; excerpt: string };

async function fetchRelatedArticles(cungMenh: string, chinhTinh: string): Promise<ArticleStub[]> {
  const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const keywords = [cungMenh, ...chinhTinh.split(', ').slice(0,2)].filter(Boolean);
  // Try each keyword, return first non-empty result
  for (const kw of keywords) {
    try {
      const r = await fetch(
        `${SB_URL}/rest/v1/master_articles?tags=cs.%7B"${encodeURIComponent(kw)}"%7D&select=slug,title,excerpt&order=created_at.desc&limit=4`,
        { headers: h }
      );
      if (r.ok) {
        const rows = await r.json() as ArticleStub[];
        if (rows?.length) return rows;
      }
    } catch { /* continue */ }
  }
  // Fallback: latest 4 articles
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/master_articles?select=slug,title,excerpt&order=created_at.desc&limit=4`,
      { headers: h }
    );
    if (r.ok) return (await r.json() as ArticleStub[]) || [];
  } catch { /* ignore */ }
  return [];
}

// ────────────────────────────────────────────────────────────────────────────
// ISR: full HTML builder
// ────────────────────────────────────────────────────────────────────────────
function buildIsrHTML(ls: Rec, params: IsrParams, slug: string, relatedArticles: ArticleStub[]): string {
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
      a: `Đại vận hiện tại là Cung ${String(curDV.diaChi||'')} (tuổi ${String(curDV.tuoiStart||'')}–${String(curDV.tuoiEnd||'')}).` }] : []),
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

  const gridHTML       = renderGrid(ls, params.canIdx);
  const textHTML       = renderTextBlocks(ls);
  const sections24HTML = render24Sections(ls, params);
  const relatedHTML    = buildRelatedLinks(params);

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@0,400;0,700&display=swap" rel="stylesheet">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:9px 24px;font-size:12px;color:var(--text-lt);display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}
a.sao-link{color:inherit;text-decoration:none;border-bottom:1px dotted currentColor;opacity:.9}
a.sao-link:hover{opacity:1;border-bottom-style:solid}
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
.sections-24{margin-top:32px}
.s24{background:#fff;border:1px solid var(--border-lt);border-radius:10px;padding:18px 20px;margin-bottom:16px}
.s24h{font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:var(--navy);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border-lt)}
.s24b p{font-size:13px;color:var(--text-mid);line-height:1.75;margin-bottom:10px}
.s24b p:last-child{margin-bottom:0}
.s24b strong{color:var(--navy)}
.laso-grid{display:grid;grid-template-columns:repeat(4,1fr);border:2px solid #555;background:#555;gap:1px}
.cung-cell{border:1px solid #888;padding:7px 7px 22px;min-height:150px;position:relative;display:flex;flex-direction:column;background:#fff;overflow:hidden}
.cung-cell.is-menh{border:2px solid #9A7B3A;background:#FFFDF7}
.cung-cell.cur-van{outline:2px solid #1E6B3C;outline-offset:-2px}
.cung-empty{background:#f8f8f8;min-height:150px}
.grid-center{border:2px solid #9A7B3A;background:#F9F4EB;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:12px;grid-column:span 2;grid-row:span 2}
.v2-cell-header{display:flex;flex-direction:column;align-items:center;margin-bottom:4px;gap:2px}
.v2-can-chi{font-size:9px;color:#777;font-weight:500;width:100%;text-align:left}
.v2-cung-name{font-size:10px;color:#222;font-weight:700;text-transform:uppercase;text-align:center;width:100%;letter-spacing:.5px;display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap}
.v2-badge-than{font-size:8px;background:#555;color:#fff;padding:1px 4px;border-radius:2px}
.v2-chinh-area{margin-bottom:4px;text-align:center}
.v2-chinh-item{font-family:'Noto Serif',Georgia,serif;font-size:12.5px;font-weight:700;line-height:1.4;text-align:center}
.v2-phu-area{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:0 4px;align-content:start}
.v2-phu-col{display:flex;flex-direction:column;gap:1px}
.v2-phu-col-right{text-align:right}
.v2-phu-item{font-size:9.5px;line-height:1.45;font-weight:700}
.v2-footer{position:absolute;bottom:3px;left:6px;right:6px;display:flex;justify-content:space-between;align-items:center}
.v2-trang-sinh{font-size:9px;color:#999}
.v2-dai-van{font-size:9px;color:#666;font-weight:700}
.v2-tuan-tag,.v2-triet-tag{position:absolute;bottom:-1px;left:0;right:0;font-size:8px;text-align:center;padding:1px;color:#fff}
.v2-tuan-tag{background:#2c4a00}.v2-triet-tag{background:#4a0000}
.sc-hoa{color:#E74C3C}.sc-kim{color:#7F8C8D}.sc-thuy{color:#1a1a1a}.sc-moc{color:#27AE60}.sc-tho{color:#D4A017}.sc-neutral{color:#333}
.sc-hoa-loc{color:#D4A017;font-weight:700}.sc-hoa-quyen{color:#27AE60;font-weight:700}.sc-hoa-khoa{color:#1a1a1a;font-weight:700}.sc-hoa-ky{color:#1a1a1a;font-weight:700}
@media(max-width:800px){.layout{grid-template-columns:1fr}.bc,.wrap{padding-left:14px;padding-right:14px}.hero-title{font-size:18px}.laso-grid{font-size:9px}.cung-cell{min-height:90px;padding:3px 4px 16px}.v2-chinh-item{font-size:10px}.v2-phu-item{font-size:8px}.v2-phu-area{grid-template-columns:1fr}}
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
    <p style="margin-top:14px;font-size:13px;color:rgba(255,255,255,.8);line-height:1.7;max-width:620px">${
      `Người sinh năm ${esc(canChiNam)} ${esc(gtLabel.toLowerCase())}, ngày ${pad(dd)}/${pad(mm)}/${year} giờ ${esc(gioLabel)}, an vào cung Mệnh ${esc(cungMenh)}${chinhTinh?` với chính tinh ${esc(chinhTinh)}`:''}${napAm?`, nạp âm ${esc(napAm)}`:''}.${cachCuc.length>0?` Lá số có ${cachCuc.length} cách cục${cachCuc.length<=3?': '+cachCuc.slice(0,3).map(c=>esc(String(c.ten||''))).join(', '):'.'}.`:''}${diemMenh>0?` Điểm cung mệnh ${diemMenh.toFixed(1)}/10 theo thang 6 chiều (tiềm năng, bền vững, an toàn, quý nhân, minh bạch, tương hợp).`:''}`
    }</p>
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

      <div id="share-bar-isr"></div>

      <div class="faq">
        <div class="faq-title">Câu Hỏi Thường Gặp</div>
        ${faqItems.map(f => `<div class="faq-item">
          <div class="faq-q">${esc(f.q)}</div>
          <div class="faq-a">${esc(f.a)}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="sections-24">
    ${sections24HTML}
  </div>
</div>
${relatedArticles.length ? `<div style="background:#F9F4EB;border-top:2px solid #E8E4D9;padding:24px;margin-top:0">
<div style="max-width:1000px;margin:0 auto">
  <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9A7B3A;margin-bottom:14px">Đọc thêm từ nghiên cứu</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
    ${relatedArticles.map(a=>`<a href="/nghien-cuu/${esc(a.slug)}" style="display:block;background:#fff;border:1px solid #E6D9C0;border-radius:8px;padding:14px;text-decoration:none;color:inherit;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 2px 10px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='none'">
      <div style="font-size:13px;font-weight:700;color:#061A2E;line-height:1.45;margin-bottom:6px">${esc(a.title)}</div>
      ${a.excerpt?`<div style="font-size:12px;color:#777;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(a.excerpt)}</div>`:''}
    </a>`).join('')}
  </div>
</div>
</div>` : ''}
${relatedHTML}
<script src="/footer.js"></script>
<script src="/nav.js?v=14" defer></script>
<script src="/share-widget.js" defer></script>
<script src="/pwa-push.js" defer></script>
<script>
window.addEventListener('load', function () {
  if (window.showShareWidget) {
    window.showShareWidget('share-bar-isr', {
      url: 'https://www.tuviminhbao.com/la-so/${slug}',
      title: 'Lá Số ${esc(canChiNam)} ${esc(gtLabel)} — ${pad(dd)}/${pad(mm)}/${year} Giờ ${esc(gioLabel)}',
      text: 'Xem lá số tử vi của tôi tại Tử Vi Minh Bảo'
    });
  }
  setTimeout(function () {
    if (window.askPushPermission) window.askPushPermission(${year}, '${esc(canChiNam)}');
  }, 4000);
});
</script>
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
          const palaces   = (ls.palaces as Rec[]) || [];
          const menhP     = palaces.find(p => p.isMenh) as Rec|undefined;
          const cungMenh  = String(menhP?.cungName || '');
          const chinhTinh = ((menhP?.majorStars as Rec[])||[]).map(s=>String(s.ten||'')).join(', ');
          const relatedArticles = await fetchRelatedArticles(cungMenh, chinhTinh);
          const html = buildIsrHTML(ls, isrParams, slug, relatedArticles);
          return new NextResponse(html, { headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
          }});
        }
      }
    } catch { /* fall through to redirect */ }
  }

  // 4. Not found — trả về 404 thay vì redirect
  // Lý do: redirect 307 lãng phí crawl budget (GSC báo "Page with redirect")
  // 404 rõ ràng hơn: Google dừng crawl URL này, không follow redirect
  return new NextResponse(
    `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Không tìm thấy</title><meta name="robots" content="noindex"></head><body><p>Lá số này không tồn tại. <a href="${BASE}/menh-kho.html">Xem mệnh khố</a></p></body></html>`,
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
