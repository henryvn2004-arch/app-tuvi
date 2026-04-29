// app/tu-dien/route.ts — Từ Điển Index Page
export const revalidate = 86400;
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const LOAI_CONFIG: Record<string, { label: string; icon: string; desc: string; hub?: string }> = {
  'sao-tu-vi':  { label: 'Sao Tử Vi', icon: '⭐', desc: '14 chính tinh, sao phụ, Tứ Hóa và sao lưu niên trong Tử Vi Đẩu Số', hub: '/kien-thuc-tuvi' },
  'cung-tu-vi': { label: 'Cung Tử Vi', icon: '🏛', desc: '12 cung trong lá số — ý nghĩa và cách phân tích từng cung', hub: '/kien-thuc-tuvi' },
  'khai-niem':  { label: 'Khái Niệm', icon: '📖', desc: 'Các khái niệm cốt lõi: Tứ Hóa, Đại Vận, Cách Cục và phương pháp luận', hub: '/kien-thuc-tuvi' },
  'tuong-phap': { label: 'Tướng Pháp', icon: '👁', desc: 'Nhân tướng học: xem mặt, tay, tai, lông mày, mũi, miệng, trán', hub: '/xem-tuong' },
  'ngay-tot':   { label: 'Chọn Ngày Tốt', icon: '📅', desc: 'Chọn ngày tốt cho xuất hành, khai trương, cưới hỏi, nhập trạch', hub: '/chon-ngay' },
  'phong-thuy': { label: 'Phong Thủy', icon: '🧭', desc: 'Phong thủy nhà ở, văn phòng, bàn thờ và cây xanh theo ngũ hành', hub: '/phong-thuy' },
  'lam-dep':    { label: 'Làm Đẹp Theo Mệnh', icon: '✨', desc: 'Màu sắc, kiểu tóc, đá phong thủy và phụ kiện phù hợp ngũ hành mệnh', hub: '/lam-dep' },
  'dat-ten':    { label: 'Đặt Tên', icon: '✍️', desc: 'Đặt tên con và tên doanh nghiệp theo ngũ hành mệnh', hub: '/dat-ten' },
  'ngu-hanh':   { label: 'Ngũ Hành', icon: '🌀', desc: 'Kiến thức về ngũ hành, tương sinh tương khắc và ứng dụng', hub: '/kien-thuc-tuvi' },
};

export async function GET() {
  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };
  const res = await fetch(
    `${SB_URL}/rest/v1/tu_dien?select=slug,ten,loai,seo_desc&order=loai.asc,ten.asc&limit=500`,
    { headers }
  );
  const rows: Array<{slug:string;ten:string;loai:string;seo_desc:string}> = res.ok ? await res.json() : [];

  // Group by loai
  const grouped: Record<string, typeof rows> = {};
  for (const r of rows) {
    const l = r.loai || 'khac';
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(r);
  }

  // Order of display
  const ORDER = ['sao-tu-vi','cung-tu-vi','khai-niem','tuong-phap','ngay-tot','phong-thuy','lam-dep','dat-ten','ngu-hanh'];

  const sectionsHTML = ORDER.filter(l => grouped[l]?.length).map(loai => {
    const cfg = LOAI_CONFIG[loai] || { label: loai, icon: '📄', desc: '' };
    const items = grouped[loai];
    const cards = items.map(r =>
      `<a class="td-card" href="/tu-dien/${esc(r.slug)}">
        <div class="td-card-title">${esc(r.ten)}</div>
        ${r.seo_desc ? `<div class="td-card-desc">${esc(r.seo_desc.slice(0,80))}…</div>` : ''}
      </a>`
    ).join('');
    return `
    <section class="td-section" id="${loai}">
      <div class="td-sec-header">
        <div class="td-sec-icon">${cfg.icon}</div>
        <div>
          <h2 class="td-sec-title">${esc(cfg.label)}</h2>
          <p class="td-sec-desc">${esc(cfg.desc)}</p>
        </div>
        ${cfg.hub ? `<a class="td-sec-hub" href="${cfg.hub}">Xem Công Cụ →</a>` : ''}
      </div>
      <div class="td-grid">${cards}</div>
    </section>`;
  }).join('');

  const totalCount = rows.length;

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Từ Điển Tử Vi &amp; Huyền Học | ${totalCount} Mục | Tử Vi Minh Bảo</title>
<meta name="description" content="Từ điển tử vi đẩu số đầy đủ: ${totalCount} mục tra cứu về sao, cung, tướng pháp, ngày tốt, phong thủy, làm đẹp và đặt tên theo cổ pháp.">
<meta property="og:title" content="Từ Điển Tử Vi &amp; Huyền Học — Tử Vi Minh Bảo">
<meta property="og:description" content="Tra cứu ${totalCount} mục từ điển tử vi cổ pháp: sao, cung, tướng pháp, ngày tốt, phong thủy.">
<meta property="og:image" content="${BASE}/seal.webp">
<meta property="og:url" content="${BASE}/tu-dien">
<link rel="canonical" href="${BASE}/tu-dien">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify({
  '@context':'https://schema.org','@type':'CollectionPage',
  name:'Từ Điển Tử Vi Minh Bảo',
  description:`Từ điển tử vi cổ pháp ${totalCount} mục`,
  url:`${BASE}/tu-dien`,
  publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE}
})}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}.bc span{color:var(--border)}
.td-hero{background:var(--navy);color:#fff;padding:64px 40px 48px;text-align:center;border-bottom:3px solid #c9a84c}
.td-hero-label{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin-bottom:14px}
.td-hero-title{font-family:'Noto Serif',serif;font-size:38px;font-weight:600;margin-bottom:16px;line-height:1.25}
.td-hero-desc{font-size:15px;opacity:.75;max-width:560px;margin:0 auto 28px;line-height:1.7}
.td-hero-count{display:inline-block;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);color:#c9a84c;padding:8px 20px;font-size:13px;font-weight:600}
.td-nav{background:#fff;border-bottom:1px solid var(--border-lt);padding:0 40px;overflow-x:auto;white-space:nowrap}
.td-nav-inner{display:flex;gap:0;max-width:1100px;margin:0 auto}
.td-nav-link{display:inline-block;padding:14px 18px;font-size:13px;color:var(--text-lt);text-decoration:none;border-bottom:2px solid transparent;transition:all .12s;white-space:nowrap}
.td-nav-link:hover{color:var(--navy);border-bottom-color:var(--gold)}
.td-body{max-width:1100px;margin:0 auto;padding:40px 40px 80px;width:100%;flex:1}
.td-section{margin-bottom:56px}
.td-sec-header{display:flex;align-items:flex-start;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--border-lt)}
.td-sec-icon{font-size:24px;flex-shrink:0;margin-top:4px}
.td-sec-title{font-family:'Noto Serif',serif;font-size:22px;color:var(--navy);font-weight:600;margin-bottom:4px}
.td-sec-desc{font-size:13px;color:var(--text-lt);line-height:1.5}
.td-sec-hub{margin-left:auto;flex-shrink:0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--gold);text-decoration:none;padding:8px 16px;border:1px solid var(--gold);white-space:nowrap;transition:all .12s}
.td-sec-hub:hover{background:var(--gold);color:#fff}
.td-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.td-card{display:block;padding:14px 16px;background:var(--bg-soft);border:1px solid var(--border-lt);text-decoration:none;transition:all .12s}
.td-card:hover{border-color:var(--blue);background:#fff;color:var(--blue)}
.td-card-title{font-size:14px;font-weight:600;color:var(--navy);margin-bottom:4px}
.td-card:hover .td-card-title{color:var(--blue)}
.td-card-desc{font-size:11px;color:var(--text-lt);line-height:1.4}
@media(max-width:700px){
  .bc,.td-hero,.td-body,.td-nav{padding-left:20px;padding-right:20px}
  .td-hero-title{font-size:28px}
  .td-grid{grid-template-columns:1fr 1fr}
  .td-sec-header{flex-wrap:wrap}
  .td-sec-hub{margin-left:0}
}
</style>
<script src="/auth.js"></script>
</head><body>
<script src="/nav.js"></script>
<div class="bc"><a href="/">Trang Chủ</a><span>›</span><span>Từ Điển</span></div>

<div class="td-hero">
  <div class="td-hero-label">Tra Cứu</div>
  <h1 class="td-hero-title">Từ Điển Tử Vi &amp; Huyền Học</h1>
  <p class="td-hero-desc">Tra cứu kiến thức cổ pháp theo cách hệ thống — từ sao tử vi đến tướng pháp, phong thủy và ngày tốt.</p>
  <span class="td-hero-count">${totalCount} mục tra cứu</span>
</div>

<nav class="td-nav">
  <div class="td-nav-inner">
    ${ORDER.filter(l => grouped[l]?.length).map(l => {
      const cfg = LOAI_CONFIG[l] || { label: l, icon: '' };
      return `<a class="td-nav-link" href="#${l}">${cfg.icon} ${esc(cfg.label)}</a>`;
    }).join('')}
  </div>
</nav>

<div class="td-body">
  ${sectionsHTML}
</div>

<script src="/footer.js"></script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800'
    }
  });
}
