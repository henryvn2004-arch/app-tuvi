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
  // Unescape literal \n stored in DB
  let src = text.replace(/\\n/g, '\n');
  // Bold/italic
  src = src.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  src = src.replace(/\*(.+?)\*/g, '<em>$1</em>');

  const lines = src.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const l = raw.trimEnd();
    const t = l.trim();
    if (!t) {
      if (inList) { out.push('</ul>'); inList = false; }
      continue;
    }
    if (/^### (.+)$/.test(t)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3>${t.slice(4)}</h3>`);
    } else if (/^## (.+)$/.test(t)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2>${t.slice(3)}</h2>`);
    } else if (/^# (.+)$/.test(t)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1>${t.slice(2)}</h1>`);
    } else if (/^[-*] (.+)$/.test(t)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${t.slice(2)}</li>`);
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p>${t}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}


const LOAI_LABEL: Record<string,string> = {
  'sao-tu-vi':  'Sao Tử Vi',
  'cung-tu-vi': 'Cung Tử Vi',
  'khai-niem':  'Khái Niệm Tử Vi',
  'tuong-phap': 'Tướng Pháp',
  'ngay-tot':   'Chọn Ngày Tốt',
  'ngu-hanh':   'Ngũ Hành',
  'lam-dep':    'Làm Đẹp Theo Mệnh',
  'dat-ten':    'Đặt Tên',
  'phong-thuy': 'Phong Thủy',
  'khac':       'Từ Điển',
};

const HUB_URLS: Record<string,string> = {
  'sao-tu-vi':  `${BASE}/kien-thuc-tuvi`,
  'cung-tu-vi': `${BASE}/kien-thuc-tuvi`,
  'khai-niem':  `${BASE}/kien-thuc-tuvi`,
  'tuong-phap': `${BASE}/xem-tuong`,
  'ngay-tot':   `${BASE}/chon-ngay`,
  'ngu-hanh':   `${BASE}/kien-thuc-tuvi`,
  'lam-dep':    `${BASE}/lam-dep`,
  'dat-ten':    `${BASE}/dat-ten`,
  'phong-thuy': `${BASE}/phong-thuy`,
  'khac':       `${BASE}/tu-dien`,
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
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}.bc span{color:var(--border)}
.article-wrap{flex:1;max-width:760px;margin:0 auto;padding:56px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
.meta-loai{font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.meta-han{font-size:13px;color:var(--text-lt);font-style:italic}
.article-title{font-family:'Noto Serif',serif;font-size:30px;color:var(--navy);font-weight:600;line-height:1.25;margin-bottom:36px;padding-bottom:24px;border-bottom:2px solid var(--border);letter-spacing:-0.2px}
.article-body{font-size:16px;line-height:1.8;color:var(--text-mid);font-weight:400}
.article-body h2{font-family:Arial,sans-serif;color:var(--navy);font-weight:400;font-size:20px;margin:36px 0 14px;padding-top:24px;border-top:1px solid var(--border-lt)}
.article-body h3{font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:var(--text);margin:24px 0 10px}
.article-body p{margin-bottom:14px;max-width:680px}
.article-body ul{margin:12px 0 20px 0;padding-left:0;list-style:none;max-width:680px}
.article-body ul li{position:relative;padding:7px 12px 7px 28px;margin-bottom:4px;background:var(--bg-soft);border-left:2px solid var(--border-lt);font-size:15px;line-height:1.6;color:var(--text-mid)}
.article-body ul li::before{content:'—';position:absolute;left:10px;color:var(--gold);font-weight:700}
.article-body ul li strong{color:var(--navy)}
.article-body strong{color:var(--text);font-weight:600}
.article-body em{color:var(--text-mid);font-style:italic}
.article-body table{width:100%;border-collapse:collapse;margin:20px 0 28px;font-size:14px}
.article-body th{background:var(--navy);color:#fff;padding:11px 14px;text-align:left;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase}
.article-body td{padding:10px 14px;border-bottom:1px solid var(--border-lt);color:var(--text-mid)}
.article-body tr:nth-child(even) td{background:var(--bg-soft)}
.cta-box{margin-top:48px;padding:36px 32px;background:var(--navy);border:2px solid var(--gold);color:#fff;text-align:center}
.cta-box-label{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin-bottom:10px}
.cta-box h3{font-family:'Noto Serif',serif;font-size:22px;margin-bottom:10px;font-weight:600;color:#fff}
.cta-box p{font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:22px;line-height:1.6}
.cta-btn{display:inline-block;background:transparent;color:#c9a84c;border:2px solid #c9a84c;padding:13px 36px;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;transition:all .18s}
.cta-btn:hover{background:#c9a84c;color:var(--navy)}
.rel-wrap{margin-top:40px;padding-top:28px;border-top:1px solid var(--border-lt)}
.rel-title{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--text-lt);margin-bottom:14px}
.rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.rel-item{display:block;padding:11px 14px;background:var(--bg-soft);border:1px solid var(--border-lt);font-size:13px;color:var(--navy);text-decoration:none;line-height:1.4;transition:all .12s}
.rel-item:hover{border-color:var(--blue);background:#fff;color:var(--blue)}
@media(max-width:700px){.bc,.article-wrap{padding-left:20px;padding-right:20px}.article-title{font-size:28px}.article-body{font-size:16px}}
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
    <div class="cta-box-label">Tử Vi Minh Bảo</div>
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
