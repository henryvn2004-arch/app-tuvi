// app/api/tu-vi/route.ts
// SSR: /tu-vi/:slug → HTML đầy đủ cho SEO
export const maxDuration = 15;
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE_URL     = 'https://www.tuviminhbao.com';

function escHtml(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMarkdown(text: string) {
  if (!text) return '<p>Nội dung đang được cập nhật.</p>';
  let h = text;
  h = h.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');
  h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
  h = h.replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  return h.split('\n').filter(l=>l.trim()).map(l=>{
    const t=l.trim();
    if(/^<(h[123]|ul|ol|li|blockquote|hr|div)/.test(t)) return t;
    return `<p>${t}</p>`;
  }).join('\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHTML(page: any, slug: string, relatedHtml = '') {
  const url   = `${BASE_URL}/tu-vi/${slug}`;
  const title = escHtml(page.title);
  const desc  = escHtml(page.meta_description || page.title);
  const h1    = escHtml(page.h1 || page.title);
  const body  = renderMarkdown(page.content||'');
  const kws   = (page.keywords||[]).join(', ');

  const catHubUrl: Record<string, string> = {
    'tu-vi-nam-sinh': BASE_URL+'/kien-thuc-tuvi',
    'y-nghia-sao': BASE_URL+'/kien-thuc-tuvi',
    'van-han': BASE_URL+'/kien-thuc-tuvi',
    'tuong-hop-hon-nhan': BASE_URL+'/kien-thuc-tuvi',
    'tuong-hop-lam-an': BASE_URL+'/kien-thuc-tuvi',
    'phong-thuy': BASE_URL+'/phong-thuy',
    'xem-tuong': BASE_URL+'/xem-tuong',
    'chon-ngay': BASE_URL+'/chon-ngay',
    'lam-dep': BASE_URL+'/lam-dep',
    'dat-ten': BASE_URL+'/dat-ten',
  };
  const catHubName: Record<string, string> = {
    'tu-vi-nam-sinh': 'Tử Vi Đẩu Số', 'y-nghia-sao': 'Kiến Thức Tử Vi',
    'van-han': 'Vận Hạn', 'tuong-hop-hon-nhan': 'Tương Hợp Hôn Nhân',
    'tuong-hop-lam-an': 'Tương Hợp Làm Ăn', 'phong-thuy': 'Phong Thủy',
    'xem-tuong': 'Xem Tướng', 'chon-ngay': 'Chọn Ngày', 'lam-dep': 'Làm Đẹp', 'dat-ten': 'Đặt Tên',
  };
  const hubUrl  = catHubUrl[page.category]  || BASE_URL+'/kien-thuc-tuvi';
  const hubName = catHubName[page.category] || 'Tử Vi';

  const schema = JSON.stringify([
    { '@context':'https://schema.org','@type':'Article',
      headline: page.title, description: page.meta_description||'', url,
      inLanguage:'vi',
      author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE_URL},
      publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE_URL,
        logo:{'@type':'ImageObject',url:BASE_URL+'/seal.webp'}},
      image:{'@type':'ImageObject',url:BASE_URL+'/seal.webp'} },
    { '@context':'https://schema.org','@type':'BreadcrumbList', itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:BASE_URL+'/'},
      {'@type':'ListItem',position:2,name:hubName,item:hubUrl},
      {'@type':'ListItem',position:3,name:page.h1||page.title,item:url}] },
  ]);

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — Tử Vi Minh Bảo</title>
<meta name="description" content="${desc}">
${kws ? `<meta name="keywords" content="${escHtml(kws)}">` : ''}
<meta property="og:title" content="${title} — Tử Vi Minh Bảo">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${BASE_URL}/seal.webp">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="apple-touch-icon" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--gold-bright:#D4A843;--purple:#8b6dff;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.breadcrumb a{color:var(--text-lt);text-decoration:none}.breadcrumb a:hover{color:var(--navy)}
.breadcrumb span{color:var(--border)}
.article-wrap{flex:1;max-width:760px;margin:0 auto;padding:48px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px}
.meta-cat{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.article-title{font-family:'Noto Serif',serif;font-size:30px;color:var(--navy);font-weight:600;line-height:1.3;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid var(--border)}
.article-body{font-size:16px;line-height:1.9;color:var(--text-mid);font-weight:300}
.article-body h1,.article-body h2{font-family:'Noto Serif',serif;color:var(--navy);font-weight:600;margin:36px 0 14px}
.article-body h1{font-size:24px}.article-body h2{font-size:20px;padding-top:24px;border-top:1px solid var(--border)}
.article-body h3{font-size:17px;font-weight:600;color:var(--text);margin:24px 0 10px}
.article-body p{margin-bottom:16px}.article-body strong{color:var(--text);font-weight:600}
.article-body a{color:var(--blue);text-decoration:underline}
.cta-box{margin-top:40px;padding:28px 24px;background:linear-gradient(135deg,#171a4a 0%,#2d2060 100%);border-radius:12px;color:#fff;text-align:center}
.cta-box h3{font-family:'Noto Serif',serif;font-size:20px;margin-bottom:10px;font-weight:600}
.cta-box p{font-size:14px;opacity:.85;margin-bottom:20px;line-height:1.6}
.cta-btn{display:inline-block;background:var(--purple);color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;transition:opacity .15s}
.cta-btn:hover{opacity:.88}
@media(max-width:700px){.breadcrumb,.article-wrap{padding-left:16px;padding-right:16px}.article-title{font-size:24px}}
        .rel-wrap{margin-top:32px;padding-top:24px;border-top:1px solid var(--border-lt)}
        .rel-title{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#999;margin-bottom:12px}
        .rel-title a{color:var(--blue);text-decoration:none}.rel-title a:hover{text-decoration:underline}
        .rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
        .rel-item{display:block;padding:10px 12px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:6px;font-size:12px;color:var(--navy);text-decoration:none;line-height:1.4;transition:all .12s}
        .rel-item:hover{border-color:var(--blue);background:#fff;color:var(--blue)}
</style>
<script src="/auth.js"></script>
</head>
<body>
<script src="/nav.js"></script>
<div class="breadcrumb">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/tu-vi">Tử Vi</a><span>›</span>
  <span>${h1}</span>
</div>
<article class="article-wrap">
  <div class="article-meta">
    <span class="meta-cat">Tử Vi Theo Tuổi</span>
  </div>
  <h1 class="article-title">${h1}</h1>
  <div class="article-body">${body}</div>
  <div class="cta-box">
    <h3>Xem Lá Số Tử Vi Đầy Đủ Của Bạn</h3>
    <p>Luận giải AI chi tiết — tính cách, vận hạn, tình duyên, sự nghiệp theo giờ sinh cụ thể</p>
    <a class="cta-btn" href="/">Xem Tử Vi Minh Bảo →</a>
  </div>
  ${relatedHtml}
</article>
<script src="/footer.js"></script>
</body></html>`;
}

function buildNotFound() {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<title>Không tìm thấy — Tử Vi Minh Bảo</title>
<link rel="icon" type="image/webp" href="/seal.webp">
<script src="/auth.js"></script>
</head>
<body style="font-family:sans-serif;text-align:center;padding:80px">
<h1 style="color:#061A2E;font-family:Georgia,serif;margin-bottom:16px">Không tìm thấy trang</h1>
<p style="color:#777;margin-bottom:24px">Trang tử vi này không tồn tại hoặc đã được cập nhật.</p>
<a href="/" style="color:#1455A4">← Về Trang Chủ</a>
</body></html>`;
}

const CAT_HUB: Record<string, string> = {
  'tu-vi-nam-sinh': '/kien-thuc-tuvi', 'y-nghia-sao': '/kien-thuc-tuvi',
  'van-han': '/kien-thuc-tuvi', 'tuong-hop-hon-nhan': '/kien-thuc-tuvi',
  'tuong-hop-lam-an': '/kien-thuc-tuvi', 'phong-thuy': '/phong-thuy',
  'xem-tuong': '/xem-tuong', 'chon-ngay': '/chon-ngay',
  'lam-dep': '/lam-dep', 'dat-ten': '/dat-ten',
};
const CAT_LABEL: Record<string, string> = {
  'tu-vi-nam-sinh':'Tử Vi','y-nghia-sao':'Ý Nghĩa Sao','van-han':'Vận Hạn',
  'tuong-hop-hon-nhan':'Tương Hợp Hôn Nhân','tuong-hop-lam-an':'Tương Hợp Làm Ăn',
  'phong-thuy':'Phong Thủy','xem-tuong':'Xem Tướng','chon-ngay':'Chọn Ngày',
  'lam-dep':'Làm Đẹp','dat-ten':'Đặt Tên',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRelated(related: any[], category: string): string {
  if (!related?.length) return '';
  const hub = CAT_HUB[category] || '/kien-thuc-tuvi';
  const label = CAT_LABEL[category] || 'Xem Thêm';
  const links = related.map(r =>
    `<a class="rel-item" href="${BASE_URL}/tu-vi/${r.slug}">${r.h1 || r.title}</a>`
  ).join('');
  return `<div class="rel-wrap">
    <div class="rel-title">Bài Viết Liên Quan — <a href="${hub}">${label}</a></div>
    <div class="rel-grid">${links}</div>
  </div>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  if (!slug) return NextResponse.redirect(new URL('/', BASE_URL));

  try {
    const [pageRes, relRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/seo_pages?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }),
      // fetch 6 related from same category (random via limit+offset trick)
      fetch(`${SUPABASE_URL}/rest/v1/seo_pages?slug=neq.${encodeURIComponent(slug)}&select=slug,h1,title,category&limit=6&offset=${Math.floor(Math.random()*20)}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }),
    ]);
    const rows = await pageRes.json() as any[];
    if (!rows?.length) {
      return new NextResponse(buildNotFound(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    const related = await relRes.json() as any[];
    const page = rows[0];
    // Fetch same-category related
    const sameCatRes = await fetch(
      `${SUPABASE_URL}/rest/v1/seo_pages?slug=neq.${encodeURIComponent(slug)}&category=eq.${encodeURIComponent(page.category)}&select=slug,h1,title,category&limit=8`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const sameCat = await sameCatRes.json() as any[];
    const relatedHtml = buildRelated(sameCat.length ? sameCat.slice(0,8) : related.slice(0,8), page.category);
    const html = buildHTML(page, slug, relatedHtml);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch(e: unknown) {
    return new NextResponse(`<h1>Lỗi: ${(e as Error).message}</h1>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
