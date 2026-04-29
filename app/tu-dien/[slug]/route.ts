// app/tu-dien/[slug]/route.ts
export const revalidate = 86400;
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function renderMarkdown(text: string) {
  if (!text) return '';
  let h = text;
  h = h.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g,'<em>$1</em>');
  return h.split('\n').filter(l=>l.trim()).map(l=>{
    const t = l.trim();
    if (/^<(h[123]|ul|ol|li|blockquote|hr|div)/.test(t)) return t;
    return `<p>${t}</p>`;
  }).join('\n');
}

const LOAI_LABEL: Record<string,string> = {
  'sao-tu-vi': 'Sao Tử Vi',
  'cung-tu-vi': 'Cung Tử Vi',
  'khai-niem': 'Khái Niệm',
  'tuong-phap': 'Tướng Pháp',
  'ngay-tot': 'Ngày Tốt',
  'ngu-hanh': 'Ngũ Hành',
  'khac': 'Từ Điển',
};

const HUB_URLS: Record<string,string> = {
  'sao-tu-vi': `${BASE}/kien-thuc-tuvi`,
  'cung-tu-vi': `${BASE}/kien-thuc-tuvi`,
  'khai-niem': `${BASE}/kien-thuc-tuvi`,
  'tuong-phap': `${BASE}/xem-tuong`,
  'ngay-tot': `${BASE}/chon-ngay`,
  'ngu-hanh': `${BASE}/kien-thuc-tuvi`,
  'khac': `${BASE}/kien-thuc-tuvi`,
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return NextResponse.redirect(`${BASE}/kien-thuc-tuvi`);

  const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` };
  const res = await fetch(
    `${SB_URL}/rest/v1/tu_dien?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers }
  );
  if (!res.ok) return NextResponse.redirect(`${BASE}/kien-thuc-tuvi`);
  const rows = await res.json();
  if (!rows?.length) return NextResponse.redirect(`${BASE}/kien-thuc-tuvi`);
  const row = rows[0];

  // Fetch related items
  let relatedHTML = '';
  if (row.related_ids?.length) {
    const relRes = await fetch(
      `${SB_URL}/rest/v1/tu_dien?id=in.(${row.related_ids.join(',')})&select=slug,ten,loai&limit=8`,
      { headers }
    );
    if (relRes.ok) {
      const relRows = await relRes.json();
      if (relRows?.length) {
        relatedHTML = `<div class="rel-wrap">
          <div class="rel-title">Xem Thêm Trong Từ Điển</div>
          <div class="rel-grid">${relRows.map((r: Record<string,string>) =>
            `<a class="rel-item" href="/tu-dien/${esc(r.slug)}">${esc(r.ten)}</a>`
          ).join('')}</div>
        </div>`;
      }
    }
  }

  const url   = `${BASE}/tu-dien/${slug}`;
  const loai  = String(row.loai || 'khac');
  const title = esc(row.seo_title || `${row.ten} — ${LOAI_LABEL[loai] || 'Từ Điển Cổ Học'} — Tử Vi Minh Bảo`);
  const desc  = esc(row.seo_desc || `Tìm hiểu về ${row.ten} theo cổ pháp tử vi và đông phương học.`);
  const hubUrl = HUB_URLS[loai] || `${BASE}/kien-thuc-tuvi`;
  const hubName = LOAI_LABEL[loai] || 'Tử Vi';

  const schema = JSON.stringify([
    {'@context':'https://schema.org','@type':'Article',headline:esc(row.ten),description:desc,url,inLanguage:'vi',
     author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE},
     publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE,logo:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
     image:{'@type':'ImageObject',url:`${BASE}/seal.webp`}},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:hubName,item:hubUrl},
      {'@type':'ListItem',position:3,name:esc(row.ten),item:url}]},
  ]);

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
${(row.tags||[]).length ? `<meta name="keywords" content="${esc(row.tags.join(', '))}">` : ''}
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
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
.article-wrap{flex:1;max-width:760px;margin:0 auto;padding:48px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px}
.meta-loai{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.meta-han{font-size:13px;color:var(--text-lt);font-style:italic}
.article-title{font-family:'Noto Serif',serif;font-size:32px;color:var(--navy);font-weight:600;line-height:1.3;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid var(--border)}
.article-body{font-size:16px;line-height:1.9;color:var(--text-mid);font-weight:300}
.article-body h2{font-family:'Noto Serif',serif;color:var(--navy);font-weight:600;font-size:20px;margin:36px 0 14px;padding-top:24px;border-top:1px solid var(--border)}
.article-body h3{font-size:17px;font-weight:600;color:var(--text);margin:24px 0 10px}
.article-body p{margin-bottom:16px}
.article-body strong{color:var(--text);font-weight:600}
.article-body em{color:var(--text-mid);font-style:italic}
.cta-box{margin-top:40px;padding:28px 24px;background:linear-gradient(135deg,#171a4a,#2d2060);border-radius:12px;color:#fff;text-align:center}
.cta-box h3{font-family:'Noto Serif',serif;font-size:20px;margin-bottom:10px;font-weight:600}
.cta-box p{font-size:14px;opacity:.85;margin-bottom:20px;line-height:1.6}
.cta-btn{display:inline-block;background:#8b6dff;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}
.rel-wrap{margin-top:32px;padding-top:24px;border-top:1px solid var(--border-lt)}
.rel-title{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#999;margin-bottom:12px}
.rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.rel-item{display:block;padding:10px 12px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:6px;font-size:12px;color:var(--navy);text-decoration:none;line-height:1.4;transition:all .12s}
.rel-item:hover{border-color:var(--blue);color:var(--blue)}
@media(max-width:700px){.bc,.article-wrap{padding-left:16px;padding-right:16px}.article-title{font-size:26px}}
</style>
<script src="/auth.js"></script>
</head><body>
<script src="/nav.js"></script>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="${hubUrl}">${esc(hubName)}</a><span>›</span>
  <span>${esc(row.ten)}</span>
</div>
<article class="article-wrap">
  <div class="article-meta">
    <span class="meta-loai">${esc(LOAI_LABEL[loai] || loai)}</span>
    ${row.ten_han ? `<span class="meta-han">${esc(row.ten_han)}</span>` : ''}
  </div>
  <h1 class="article-title">${esc(row.ten)}</h1>
  <div class="article-body">${renderMarkdown(String(row.content||''))}</div>
  ${relatedHTML}
  <div class="cta-box">
    <h3>Xem Lá Số Của Bạn</h3>
    <p>Áp dụng kiến thức cổ pháp vào lá số cá nhân — luận giải AI chi tiết 24 phần.</p>
    <a class="cta-btn" href="/">Xem Tử Vi →</a>
  </div>
</article>
<script src="/footer.js"></script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800'
    }
  });
}
