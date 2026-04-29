// app/la-so/[slug]/route.ts
// Static-first: serves laso_public (user lá số) + laso_pregen (pre-generated)
export const revalidate = 3600; // ISR: re-generate every hour
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildPregenHTML(row: Record<string,unknown>, slug: string): string {
  const url   = `${BASE}/la-so/${slug}`;
  const gt    = row.gioi_tinh === 'nu' ? 'Nữ' : 'Nam';
  const title = `Lá Số Tử Vi ${esc(row.can_chi)} ${gt} — Cung ${esc(row.cung_menh)} — Tử Vi Minh Bảo`;
  const desc  = `Lá số tử vi ${row.can_chi} ${gt.toLowerCase()}, cung mệnh ${row.cung_menh}, chính tinh ${row.chinh_tinh_menh || ''}, nạp âm ${row.nap_am || ''}. Xem cách cục đặc biệt và phân tích 12 cung theo cổ pháp.`;
  const schema = JSON.stringify([
    {'@context':'https://schema.org','@type':'Article',headline:title,description:desc,url,inLanguage:'vi',
     author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
     publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
     image:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:'Mệnh Khố',item:`${BASE}/menh-kho.html`},
      {'@type':'ListItem',position:3,name:title,item:url}]},
  ]);

  // Parse engine data
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
    ? `<div class="dv-list">${daiVan.slice(0,8).map((d,i)=>{
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
<meta property="og:image" content="${BASE}/seal.webp">
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
.sb-fill{height:100%;border-radius:3px;transition:width .4s}
.sb-val{font-size:10px;color:var(--text-mid);width:18px;text-align:right}
.body-content{font-size:15px;line-height:1.85;color:var(--text-mid)}
.body-content h2{font-family:'Noto Serif',serif;font-size:20px;color:var(--navy);font-weight:600;margin:28px 0 12px;padding-top:24px;border-top:1px solid var(--border-lt)}
.body-content h3{font-size:17px;font-weight:600;color:var(--text);margin:20px 0 8px}
.body-content p{margin-bottom:14px}
.body-content strong{color:var(--text);font-weight:600}
.cta-box{margin-top:36px;padding:28px 24px;background:linear-gradient(135deg,#171a4a,#2d2060);border-radius:12px;color:#fff;text-align:center}
.cta-box h3{font-family:'Noto Serif',serif;font-size:20px;margin-bottom:10px}
.cta-box p{font-size:14px;opacity:.85;margin-bottom:20px;line-height:1.6}
.cta-btn{display:inline-block;background:#8b6dff;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}
.rel-wrap{margin-top:28px;padding-top:20px;border-top:1px solid var(--border-lt)}
.rel-title{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#999;margin-bottom:12px}
.rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.rel-item{display:block;padding:10px 12px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:6px;font-size:12px;color:var(--navy);text-decoration:none;line-height:1.4;transition:all .12s}
.rel-item:hover{border-color:var(--blue);color:var(--blue)}
@media(max-width:700px){.bc,.wrap{padding-left:16px;padding-right:16px}.hero-title{font-size:22px}}
</style>
<script src="/auth.js"></script>
</head><body>
<script src="/nav.js"></script>
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
      <span class="hero-tag">${row.gio_chi?`Giờ ${esc(row.gio_chi)}`:''}</span>
    </div>
  </div>

  ${cachCuc.length > 0 ? `
  <div class="section">
    <div class="section-title">⚙ Cách Cục Đặc Biệt <span style="font-size:12px;color:var(--text-lt);font-weight:400">(${cachCuc.length} cách cục)</span></div>
    ${ccHTML}
  </div>` : ''}

  ${dvHTML ? `
  <div class="section">
    <div class="section-title">📅 Đại Vận</div>
    ${dvHTML}
  </div>` : ''}

  ${scoresHTML ? `
  <div class="section">
    <div class="section-title">📊 Điểm 6 Chiều Từng Cung</div>
    <div class="scores-grid">${scoresHTML}</div>
  </div>` : ''}

  ${contentHTML ? `
  <div class="section">
    <div class="body-content">${contentHTML}</div>
  </div>` : ''}

  <div class="cta-box">
    <h3>Luận Giải AI Đầy Đủ — 24 Phần</h3>
    <p>Nhập đúng giờ sinh để có luận giải chuyên sâu về tính cách, sự nghiệp, tình duyên, vận hạn theo cổ pháp Tử Vi Đẩu Số.</p>
    <a class="cta-btn" href="/">Xem Luận Giải ($19) →</a>
  </div>
</div>
<script src="/footer.js"></script>
</body></html>`;
}

function buildPublicHTML(row: Record<string,unknown>, slug: string): string {
  const url   = `${BASE}/la-so/${slug}`;
  const gt    = row.gioi_tinh === 'nu' ? 'Nữ' : 'Nam';
  const title = `Lá Số ${esc(row.can_chi_nam)} ${gt} — Cung ${esc(row.cung_menh)} — Tử Vi Minh Bảo`;
  const desc  = `Lá số tử vi ${row.can_chi_nam} ${gt.toLowerCase()}, cung mệnh ${row.cung_menh}, chính tinh ${row.chinh_tinh || ''}, nạp âm ${row.nap_am || ''}.`;

  // If rendered_html exists, embed it directly
  if (row.rendered_html) {
    return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${BASE}/seal.webp">
<meta property="og:url" content="${url}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<script src="/auth.js"></script>
</head><body>
<script src="/nav.js"></script>
${row.rendered_html}
<script src="/footer.js"></script>
</body></html>`;
  }

  // Fallback: basic layout
  const luanGiai: Record<string,string> = (row.luan_giai as Record<string,string>) || {};
  const sections = Object.entries(luanGiai).sort(([a],[b]) => Number(a)-Number(b));
  const bodyHTML = sections.map(([,v]) => `<div style="margin-bottom:24px">${String(v||'').split('\n').map(l=>`<p>${l}</p>`).join('')}</div>`).join('');

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script src="/auth.js"></script>
<style>
body{font-family:'Be Vietnam Pro',sans-serif;max-width:760px;margin:0 auto;padding:40px 20px;color:#333}
h1{font-family:'Noto Serif',serif;color:#061A2E;margin-bottom:24px}
p{margin-bottom:14px;line-height:1.8;color:#444}
</style>
</head><body>
<script src="/nav.js"></script>
<h1>${title}</h1>
<div>${bodyHTML}</div>
<script src="/footer.js"></script>
</body></html>`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return NextResponse.redirect(`${BASE}/menh-kho.html`);

  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  // 1. Try laso_public first
  const pubRes = await fetch(
    `${SB_URL}/rest/v1/laso_public?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers }
  );
  if (pubRes.ok) {
    const rows = await pubRes.json();
    if (rows?.length) {
      const html = buildPublicHTML(rows[0], slug);
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }});
    }
  }

  // 2. Try laso_pregen
  const preRes = await fetch(
    `${SB_URL}/rest/v1/laso_pregen?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers }
  );
  if (preRes.ok) {
    const rows = await preRes.json();
    if (rows?.length) {
      const html = buildPregenHTML(rows[0], slug);
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }});
    }
  }

  // 3. Not found → redirect
  return NextResponse.redirect(`${BASE}/menh-kho.html`);
}
