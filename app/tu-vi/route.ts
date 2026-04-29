// app/tu-vi/route.ts — Index page /tu-vi
// Format: giống resources.html (hero + tabs + search + danh sách bài)
export const revalidate = 86400;
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const CAT_META: Record<string,{label:string;icon:string;hub?:string}> = {
  'tuong-hop-hon-nhan': { label:'Tương Hợp Hôn Nhân', icon:'💑', hub:'/xem-tuoi.html' },
  'tuong-hop-lam-an':  { label:'Tương Hợp Làm Ăn',   icon:'🤝', hub:'/xem-lam-an.html' },
  'chon-ngay':         { label:'Chọn Ngày Tốt',       icon:'📅', hub:'/chon-ngay.html' },
  'van-han':           { label:'Vận Hạn',             icon:'📈' },
  'xem-tuong':         { label:'Xem Tướng',           icon:'👁', hub:'/xem-tuong.html' },
  'phong-thuy':        { label:'Phong Thủy',          icon:'🧭', hub:'/phong-thuy.html' },
  'y-nghia-sao':       { label:'Ý Nghĩa Sao',         icon:'⭐', hub:'/kien-thuc-tuvi.html' },
  'tu-vi-nam-sinh':    { label:'Tử Vi Năm Sinh',      icon:'🗓', hub:'/luan-giai.html' },
  'lam-dep':           { label:'Làm Đẹp',             icon:'✨', hub:'/lam-dep.html' },
  'dat-ten':           { label:'Đặt Tên',             icon:'✍️', hub:'/dat-ten.html' },
};

const CAT_ORDER = [
  'tuong-hop-hon-nhan','tuong-hop-lam-an','chon-ngay','van-han',
  'xem-tuong','phong-thuy','y-nghia-sao','tu-vi-nam-sinh','lam-dep','dat-ten',
];

export async function GET() {
  const hdrs = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  // Total count
  const countRes = await fetch(
    `${SB_URL}/rest/v1/seo_pages?select=slug&limit=1`,
    { headers: { ...hdrs, 'Prefer': 'count=exact' } }
  );
  const totalCount = parseInt(countRes.headers.get('content-range')?.split('/')[1] || '9958');

  // Fetch 150 items per category (parallel)
  const catData: Record<string,{slug:string;title:string}[]> = {};
  const catCounts: Record<string,number> = {};

  await Promise.all(CAT_ORDER.map(async cat => {
    const r = await fetch(
      `${SB_URL}/rest/v1/seo_pages?select=slug,title&category=eq.${cat}&order=title.asc&limit=150`,
      { headers: { ...hdrs, 'Prefer': 'count=exact' } }
    );
    catCounts[cat] = parseInt(r.headers.get('content-range')?.split('/')[1] || '0');
    catData[cat] = r.ok ? await r.json() : [];
  }));

  // Build tabs nav
  const tabBtns = CAT_ORDER.map((cat, i) => {
    const m = CAT_META[cat];
    const cnt = catCounts[cat] || 0;
    return `<button class="tab-btn${i===0?' active':''}" onclick="switchTab('${cat}',this)">${m.icon} ${esc(m.label)} <span class="tab-count">${cnt >= 1000 ? (cnt/1000).toFixed(1)+'k' : cnt}</span></button>`;
  }).join('');

  // Build tab contents
  const tabContents = CAT_ORDER.map((cat, i) => {
    const m = CAT_META[cat];
    const rows = catData[cat] || [];
    const cnt  = catCounts[cat] || 0;
    const items = rows.map(r =>
      `<li class="book-item" data-title="${esc(r.title.toLowerCase())}"><span class="book-title"><a href="/tu-vi/${esc(r.slug)}">${esc(r.title)}</a></span></li>`
    ).join('');
    const more = cnt > 150
      ? `<li class="book-item more-row"><span class="book-title">Đang hiển thị 150/${cnt.toLocaleString()} bài${m.hub ? ` · <a href="${m.hub}">Dùng công cụ AI →</a>` : ''}</span></li>`
      : '';
    return `<div class="tab-content${i===0?' active':''}" id="tab-${cat}">
      <div class="section-header">
        <h2 class="section-title">${m.icon} ${esc(m.label)}</h2>
        <p class="section-sub">${cnt.toLocaleString()} bài viết${m.hub ? ` · <a href="${m.hub}" style="color:var(--blue)">Xem công cụ AI →</a>` : ''}</p>
      </div>
      <ul class="book-list" id="list-${cat}">${items}${more}</ul>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Tử Vi Đẩu Số — Kho Bài Viết Tra Cứu | Tử Vi Minh Bảo</title>
<meta name="description" content="Kho ${totalCount.toLocaleString()} bài viết tử vi đẩu số: tương hợp hôn nhân &amp; làm ăn, chọn ngày tốt, vận hạn, ý nghĩa sao, xem tướng, phong thủy theo cổ pháp.">
<meta property="og:title" content="Tử Vi Đẩu Số — Kho Bài Viết | Tử Vi Minh Bảo">
<meta property="og:image" content="${BASE}/seal.webp">
<meta property="og:url" content="${BASE}/tu-vi">
<link rel="canonical" href="${BASE}/tu-vi">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--bg:#FFFFFF;--bg-soft:#F5F4F0;--red:#b5201a}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:16px;-webkit-font-smoothing:antialiased}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px}
.bc a{color:var(--text-lt);text-decoration:none}.bc span{color:#ccc}
.hero{background:var(--navy);padding:52px 40px 40px;position:relative;overflow:hidden}
.hero::before{content:"典";position:absolute;font-family:'Noto Serif',serif;font-size:280px;color:rgba(255,255,255,.025);top:50%;right:5%;transform:translateY(-50%);pointer-events:none}
.hero-eyebrow{font-size:11px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;margin-bottom:12px}
.hero-title{font-family:'Noto Serif',serif;font-size:36px;color:#fff;font-weight:400;margin-bottom:10px}
.hero-sub{font-size:14px;color:#8BAACC;font-weight:300;line-height:1.7;max-width:580px}
.hero-stats{display:flex;gap:40px;margin-top:24px;flex-wrap:wrap}
.hero-stat-n{font-family:'Noto Serif',serif;font-size:28px;color:#c9a84c}
.hero-stat-l{font-size:11px;color:#8BAACC;margin-top:2px;letter-spacing:.3px}
.search-bar{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:14px 40px;display:flex;gap:12px;align-items:center}
.search-input{flex:1;max-width:480px;padding:9px 14px;border:1px solid var(--border);font-size:13px;font-family:inherit;outline:none;transition:border-color .15s}
.search-input:focus{border-color:var(--navy)}
.search-count{font-size:12px;color:var(--text-lt);margin-left:auto}
.tabs{display:flex;border-bottom:2px solid var(--border);background:var(--bg);padding:0 40px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab-btn{padding:13px 16px;border:none;background:none;font-family:inherit;font-size:13px;font-weight:600;color:var(--text-lt);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s;white-space:nowrap;flex-shrink:0}
.tab-btn:hover{color:var(--text)}
.tab-btn.active{color:var(--red);border-bottom-color:var(--red)}
.tab-count{font-size:11px;font-weight:400;opacity:.65;margin-left:3px}
.page-body{flex:1;max-width:900px;margin:0 auto;padding:36px 40px 72px;width:100%}
.section-header{margin-bottom:20px}
.section-title{font-family:'Noto Serif',serif;font-size:22px;color:var(--navy);font-weight:400;margin-bottom:6px}
.section-sub{font-size:13px;color:var(--text-lt)}
.book-list{list-style:none;border:1px solid var(--border);overflow:hidden}
.book-item{display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border);transition:background .12s}
.book-item:last-child{border-bottom:none}
.book-item:hover{background:var(--bg-soft)}
.book-item.hidden{display:none}
.book-title{font-size:13px;color:var(--text);line-height:1.5;flex:1}
.book-title a{color:var(--blue);text-decoration:none}
.book-title a:hover{text-decoration:underline}
.more-row{background:var(--bg-soft)}
.more-row .book-title{color:var(--text-lt);font-style:italic}
.tab-content{display:none}
.tab-content.active{display:block}
@media(max-width:700px){
  .bc,.hero,.search-bar,.page-body{padding-left:16px;padding-right:16px}
  .tabs{padding-left:8px;padding-right:8px}
  .hero-title{font-size:26px}.hero-stats{gap:24px}
}
</style>
<script src="/auth.js"></script>
</head><body>
<script src="/nav.js"></script>
<div class="bc"><a href="/">Trang Chủ</a><span>›</span><span>Tử Vi — Kho Bài Viết</span></div>

<div class="hero">
  <div class="hero-eyebrow">Tra Cứu</div>
  <h1 class="hero-title">Kho Bài Viết Tử Vi Đẩu Số</h1>
  <p class="hero-sub">Tổng hợp bài viết tra cứu theo chủ đề — tương hợp tuổi, chọn ngày, vận hạn, ý nghĩa sao và nhiều chủ đề khác theo cổ pháp.</p>
  <div class="hero-stats">
    <div class="hero-stat"><div class="hero-stat-n">${totalCount.toLocaleString()}</div><div class="hero-stat-l">Bài viết tra cứu</div></div>
    <div class="hero-stat"><div class="hero-stat-n">${CAT_ORDER.length}</div><div class="hero-stat-l">Chủ đề</div></div>
    <div class="hero-stat"><div class="hero-stat-n">${((catCounts['tuong-hop-hon-nhan']||0)+(catCounts['tuong-hop-lam-an']||0)).toLocaleString()}</div><div class="hero-stat-l">Cặp tuổi tương hợp</div></div>
  </div>
</div>

<div class="search-bar">
  <input class="search-input" type="text" id="search-input" placeholder="Tìm bài viết trong tab đang chọn..." oninput="filterItems()">
  <span class="search-count" id="search-count"></span>
</div>

<div class="tabs">${tabBtns}</div>

<div class="page-body">${tabContents}</div>

<script src="/footer.js"></script>
<script>
var _activeCat = '${CAT_ORDER[0]}';
function switchTab(cat, btn) {
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active');
  document.getElementById('tab-'+cat).classList.add('active');
  _activeCat = cat;
  var inp = document.getElementById('search-input');
  inp.value = '';
  document.getElementById('search-count').textContent = '';
  btn.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function filterItems() {
  var q = document.getElementById('search-input').value.toLowerCase().trim();
  var list = document.getElementById('list-'+_activeCat);
  if (!list) return;
  var items = list.querySelectorAll('.book-item:not(.more-row)');
  var shown = 0;
  items.forEach(function(li) {
    var t = li.getAttribute('data-title')||'';
    var match = !q || t.includes(q);
    li.classList.toggle('hidden', !match);
    if (match) shown++;
  });
  document.getElementById('search-count').textContent = q ? shown+' kết quả' : '';
}
</script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800'
    }
  });
}
