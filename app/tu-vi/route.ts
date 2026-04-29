// app/tu-vi/route.ts — Index page cho hệ thống SEO pages /tu-vi/:slug
// Format: resources.html (hero + search + tabs + list)
export const revalidate = 86400;
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';
const LIMIT_PER_CAT = 120; // show đủ để SEO, không quá nặng

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const CAT_META: Record<string, { label: string; icon: string; desc: string }> = {
  'tuong-hop-hon-nhan': { label: 'Tương Hợp Hôn Nhân', icon: '💑', desc: 'Xem tuổi kết hôn có hợp không — phân tích tương hợp theo tử vi đẩu số' },
  'tuong-hop-lam-an':   { label: 'Tương Hợp Làm Ăn',  icon: '🤝', desc: 'Xem tuổi hợp tác kinh doanh — hợp hay không hợp theo ngũ hành và cung mệnh' },
  'van-han':            { label: 'Vận Hạn',            icon: '📈', desc: 'Vận hạn từng tuổi — phân tích đại vận, tiểu vận và năm quan trọng' },
  'y-nghia-sao':        { label: 'Ý Nghĩa Sao',        icon: '⭐', desc: 'Giải thích ý nghĩa các sao chính tinh, phụ tinh trong tử vi đẩu số' },
  'tu-vi-nam-sinh':     { label: 'Tử Vi Năm Sinh',     icon: '🔮', desc: 'Luận giải tử vi theo tuổi sinh — vận mệnh và đặc điểm từng tuổi' },
  'chon-ngay':          { label: 'Chọn Ngày Tốt',      icon: '📅', desc: 'Chọn ngày tốt xấu theo âm lịch — khai trương, cưới hỏi, xuất hành, nhập trạch' },
  'xem-tuong':          { label: 'Xem Tướng',          icon: '👁', desc: 'Nhân tướng học — xem tướng mặt, bàn tay đoán tính cách và vận mệnh' },
  'phong-thuy':         { label: 'Phong Thủy',         icon: '🧭', desc: 'Phong thủy nhà ở, văn phòng, hướng nhà hợp tuổi theo ngũ hành' },
  'lam-dep':            { label: 'Làm Đẹp Theo Mệnh',  icon: '✨', desc: 'Màu sắc may mắn, kiểu tóc và phong cách phù hợp ngũ hành mệnh' },
  'dat-ten':            { label: 'Đặt Tên',            icon: '✍️', desc: 'Đặt tên con và tên doanh nghiệp theo ngũ hành mệnh' },
};

// Thứ tự tab hiển thị
const CAT_ORDER = [
  'tuong-hop-hon-nhan','tuong-hop-lam-an','van-han','y-nghia-sao',
  'tu-vi-nam-sinh','chon-ngay','xem-tuong','phong-thuy','lam-dep','dat-ten'
];

export async function GET() {
  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };

  // 1. Count per category
  const countRes = await fetch(
    `${SB_URL}/rest/v1/seo_pages?select=category&limit=10000`,
    { headers }
  );
  const allRows: Array<{category: string}> = countRes.ok ? await countRes.json() : [];
  const counts: Record<string, number> = {};
  for (const r of allRows) counts[r.category] = (counts[r.category]||0) + 1;
  const totalCount = allRows.length;

  // 2. Fetch items per category (LIMIT_PER_CAT each)
  const catData: Record<string, Array<{slug:string; title:string}>> = {};
  await Promise.all(CAT_ORDER.map(async (cat) => {
    const r = await fetch(
      `${SB_URL}/rest/v1/seo_pages?category=eq.${cat}&select=slug,title&order=title.asc&limit=${LIMIT_PER_CAT}`,
      { headers }
    );
    catData[cat] = r.ok ? await r.json() : [];
  }));

  // 3. Build tabs HTML
  const tabBtns = CAT_ORDER.filter(c => catData[c]?.length).map((cat, i) => {
    const meta = CAT_META[cat] || { label: cat, icon: '📄' };
    const cnt = counts[cat] || 0;
    return `<button class="tab-btn${i===0?' active':''}" onclick="switchTab('${cat}',this)">${meta.icon} ${esc(meta.label)} <span class="tab-count">${cnt.toLocaleString()}</span></button>`;
  }).join('\n  ');

  const tabPanels = CAT_ORDER.filter(c => catData[c]?.length).map((cat, i) => {
    const meta = CAT_META[cat] || { label: cat, icon: '📄', desc: '' };
    const items = catData[cat];
    const total = counts[cat] || 0;
    const rows = items.map(r =>
      `<li class="book-item"><span class="book-title"><a href="/tu-vi/${esc(r.slug)}">${esc(r.title)}</a></span></li>`
    ).join('\n          ');
    const moreNote = total > LIMIT_PER_CAT
      ? `<p class="more-note">Hiển thị ${LIMIT_PER_CAT} / ${total.toLocaleString()} bài — dùng tìm kiếm để lọc thêm</p>`
      : '';
    return `
  <div class="tab-content${i===0?' active':''}" id="tab-${cat}" data-cat="${cat}">
    <div class="section-header">
      <h2 class="section-title">${esc(meta.label)}</h2>
      <p class="section-sub">${esc(meta.desc)}</p>
    </div>
    ${moreNote}
    <ul class="book-list" id="list-${cat}">
          ${rows}
    </ul>
  </div>`;
  }).join('\n');

  // Hero stats
  const mainCats = ['tuong-hop-hon-nhan','van-han','y-nghia-sao'];
  const statsHTML = mainCats.map(c => {
    const meta = CAT_META[c];
    const cnt = counts[c] || 0;
    return `<div class="hero-stat"><div class="hero-stat-n">${cnt.toLocaleString()}</div><div class="hero-stat-l">${esc(meta?.label||c)}</div></div>`;
  }).join('\n    ');

  const html = `<!DOCTYPE html><html lang="vi">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Tử Vi Đẩu Số — ${totalCount.toLocaleString()} Bài Tra Cứu | Tử Vi Minh Bảo</title>
<meta name="description" content="Tra cứu tử vi đẩu số đầy đủ: ${totalCount.toLocaleString()} bài về tương hợp hôn nhân, làm ăn, vận hạn, ý nghĩa sao, chọn ngày tốt và xem tướng theo cổ pháp.">
<meta property="og:title" content="Tử Vi Đẩu Số — ${totalCount.toLocaleString()} Bài Tra Cứu">
<meta property="og:description" content="Kho tra cứu tử vi đẩu số cổ pháp: tương hợp, vận hạn, ý nghĩa sao, chọn ngày tốt.">
<meta property="og:url" content="${BASE}/tu-vi">
<meta property="og:image" content="${BASE}/seal.webp">
<link rel="canonical" href="${BASE}/tu-vi">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify({
  '@context':'https://schema.org','@type':'CollectionPage',
  name:'Tử Vi Minh Bảo — Tra Cứu Tử Vi Đẩu Số',
  description:`${totalCount} bài tra cứu tử vi đẩu số cổ pháp`,
  url:`${BASE}/tu-vi`,
  publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE}
})}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--red:#b5201a;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:16px;-webkit-font-smoothing:antialiased}

/* HERO */
.hero{background:var(--navy);padding:52px 40px 40px;position:relative;overflow:hidden}
.hero::before{content:"紫";position:absolute;font-family:"Noto Serif",serif;font-size:280px;color:rgba(255,255,255,0.025);top:50%;right:5%;transform:translateY(-50%);pointer-events:none}
.hero-eyebrow{font-size:11px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;margin-bottom:12px}
.hero-title{font-family:"Noto Serif",serif;font-size:36px;color:#fff;font-weight:400;margin-bottom:10px}
.hero-sub{font-size:14px;color:#8BAACC;font-weight:300;line-height:1.7;max-width:560px}
.hero-stats{display:flex;gap:32px;margin-top:24px}
.hero-stat-n{font-family:"Noto Serif",serif;font-size:28px;color:#c9a84c}
.hero-stat-l{font-size:11px;color:#8BAACC;margin-top:2px}

/* SEARCH */
.search-bar{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:14px 40px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.search-input{flex:1;max-width:480px;padding:9px 14px;border:1px solid var(--border);font-size:13px;font-family:inherit;outline:none}
.search-input:focus{border-color:var(--navy)}
.search-count{font-size:12px;color:var(--text-lt);margin-left:auto}

/* TABS */
.tabs{display:flex;border-bottom:2px solid var(--border);background:var(--bg);padding:0 40px;overflow-x:auto;white-space:nowrap;gap:0}
.tab-btn{padding:13px 18px;border:none;background:none;font-family:inherit;font-size:13px;font-weight:600;color:var(--text-lt);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s;white-space:nowrap}
.tab-btn:hover{color:var(--text)}
.tab-btn.active{color:var(--red);border-bottom-color:var(--red)}
.tab-count{font-size:11px;font-weight:400;color:var(--text-lt);margin-left:4px}

/* BODY */
.page-body{flex:1;max-width:900px;margin:0 auto;padding:36px 40px 72px;width:100%}
.section-header{margin-bottom:14px}
.section-title{font-family:"Noto Serif",serif;font-size:22px;color:var(--navy);font-weight:400;margin-bottom:6px}
.section-sub{font-size:13px;color:var(--text-lt)}
.more-note{font-size:12px;color:var(--text-lt);background:var(--bg-soft);padding:8px 14px;border-left:3px solid var(--gold);margin-bottom:12px}

/* LIST */
.book-list{list-style:none;border:1px solid var(--border);overflow:hidden}
.book-item{display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border);transition:background .12s}
.book-item:last-child{border-bottom:none}
.book-item:hover{background:var(--bg-soft)}
.book-item.hidden{display:none}
.book-title{font-size:13px;color:var(--text);line-height:1.5;flex:1}
.book-title a{color:var(--blue);text-decoration:none}
.book-title a:hover{text-decoration:underline}

.tab-content{display:none}
.tab-content.active{display:block}

@media(max-width:700px){
  .hero{padding:36px 20px 28px}.hero-stats{gap:20px;flex-wrap:wrap}
  .search-bar,.tabs{padding-left:16px;padding-right:16px}
  .page-body{padding:24px 16px 48px}
  .hero-title{font-size:28px}
  .tab-btn{padding:11px 14px;font-size:12px}
}
</style>
<script src="/auth.js"></script>
</head>
<body>
<script src="/nav.js"></script>

<div class="hero">
  <div class="hero-eyebrow">Tra Cứu</div>
  <h1 class="hero-title">Tử Vi Đẩu Số</h1>
  <p class="hero-sub">Kho bài tra cứu tử vi đẩu số cổ pháp — tương hợp, vận hạn, ý nghĩa sao, chọn ngày tốt. Tổng hợp đầy đủ, cập nhật thường xuyên.</p>
  <div class="hero-stats">
    ${statsHTML}
    <div class="hero-stat"><div class="hero-stat-n">${totalCount.toLocaleString()}+</div><div class="hero-stat-l">Tổng số bài</div></div>
  </div>
</div>

<div class="search-bar">
  <input class="search-input" type="text" id="search-input" placeholder="Tìm kiếm bài viết..." oninput="filterItems()">
  <span class="search-count" id="search-count"></span>
</div>

<div class="tabs">
  ${tabBtns}
</div>

<div class="page-body">
  ${tabPanels}
</div>

<script>
var _currentTab = '${CAT_ORDER[0]}';

function switchTab(cat, btn) {
  document.querySelectorAll('.tab-content').forEach(function(el){ el.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(el){ el.classList.remove('active'); });
  var panel = document.getElementById('tab-' + cat);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  _currentTab = cat;
  filterItems();
}

function filterItems() {
  var q = document.getElementById('search-input').value.toLowerCase().trim();
  var panel = document.getElementById('tab-' + _currentTab);
  if (!panel) return;
  var items = panel.querySelectorAll('.book-item');
  var shown = 0;
  items.forEach(function(li) {
    var txt = li.textContent.toLowerCase();
    var match = !q || txt.indexOf(q) >= 0;
    li.classList.toggle('hidden', !match);
    if (match) shown++;
  });
  var countEl = document.getElementById('search-count');
  if (countEl) countEl.textContent = q ? (shown + ' kết quả') : '';
}

// Init counts
(function() {
  document.querySelectorAll('.tab-content').forEach(function(panel) {
    var items = panel.querySelectorAll('.book-item').length;
    // Already shown in tab-count spans
  });
})();
</script>

<script src="/footer.js"></script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800'
    }
  });
}
