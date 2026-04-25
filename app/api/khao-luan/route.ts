// app/api/khao-luan/route.ts
// SSR: /khao-luan/:slug → HTML đầy đủ cho SEO
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
  h = h.replace(/`(.+?)`/g,'<code>$1</code>').replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>').replace(/^---$/gm,'<hr>');
  h = h.replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/^[\*\-] (.+)$/gm,'<li>$1</li>').replace(/^(\d+)\. (.+)$/gm,'<li>$2</li>');
  h = h.replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>');
  return h.split('\n').filter(l=>l.trim()).map(l=>{
    const t=l.trim();
    if(/^<(h[123]|ul|ol|li|blockquote|hr|div)/.test(t)) return t;
    return `<p>${t}</p>`;
  }).join('\n');
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN',{year:'numeric',month:'long',day:'numeric'});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHTML(article: any, slug: string, related: any[]) {
  const url   = `${BASE_URL}/khao-luan/${slug}`;
  const title = escHtml(article.title);
  const desc  = escHtml(article.excerpt || article.title);
  const tags  = (article.tags||[]).slice(0,3) as string[];
  const body  = renderMarkdown(article.content||'');
  const cat   = escHtml(article.category||'');

  const schemas = JSON.stringify([
    { '@context':'https://schema.org','@type':'Article', headline:article.title, description:article.excerpt||'', url, datePublished:article.created_at, inLanguage:'vi',
      author:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE_URL},
      publisher:{'@type':'Organization',name:'Tử Vi Minh Bảo',url:BASE_URL,logo:{'@type':'ImageObject',url:BASE_URL+'/seal.webp'}},
      image:{'@type':'ImageObject',url:BASE_URL+'/seal.webp'} },
    { '@context':'https://schema.org','@type':'BreadcrumbList', itemListElement:[
      {'@type':'ListItem',position:1,name:'Trang Chủ',item:BASE_URL+'/'},
      {'@type':'ListItem',position:2,name:'Khảo Luận',item:BASE_URL+'/blog.html'},
      {'@type':'ListItem',position:3,name:article.title,item:url}] },
  ]);

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — Tử Vi Minh Bảo</title>
<meta name="description" content="${desc}">
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
<script type="application/ld+json">${schemas}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--gold-bright:#D4A843;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0;--red:#C0392B;--green:#1E6B3C}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.breadcrumb a{color:var(--text-lt);text-decoration:none}.breadcrumb a:hover{color:var(--navy)}
.breadcrumb span{color:var(--border)}
.article-wrap{flex:1;max-width:760px;margin:0 auto;padding:48px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px}
.meta-cat{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.meta-date{font-size:11px;color:var(--text-lt)}
.meta-tag{font-size:10px;background:var(--bg-soft);color:var(--text-lt);padding:2px 8px;border-radius:4px}
.article-title{font-family:'Noto Serif',serif;font-size:32px;color:var(--navy);font-weight:600;line-height:1.3;margin-bottom:14px}
.article-excerpt{font-size:16px;color:var(--text-lt);line-height:1.75;font-weight:300;font-style:italic;margin-bottom:32px;padding-bottom:32px;border-bottom:2px solid var(--border)}
.article-body{font-size:16px;line-height:1.9;color:var(--text-mid);font-weight:300}
.article-body h1,.article-body h2{font-family:'Noto Serif',serif;color:var(--navy);font-weight:600;margin:36px 0 14px}
.article-body h1{font-size:26px}.article-body h2{font-size:21px;padding-top:24px;border-top:1px solid var(--border)}
.article-body h3{font-size:17px;font-weight:600;color:var(--text);margin:24px 0 10px}
.article-body p{margin-bottom:16px}.article-body strong{color:var(--text);font-weight:600}
.article-body em{color:var(--gold);font-style:italic}
.article-body ul,.article-body ol{margin:12px 0 16px 24px}.article-body li{margin-bottom:6px;line-height:1.7}
.article-body blockquote{border-left:3px solid var(--gold);padding:12px 20px;margin:20px 0;background:var(--gold-lt);color:var(--text-mid);font-style:italic;border-radius:0 6px 6px 0}
.article-body code{background:var(--bg-soft);padding:2px 6px;border-radius:3px;font-family:monospace;font-size:13px;color:var(--blue)}
.article-body hr{border:none;border-top:1px solid var(--border);margin:32px 0}
.article-body a{color:var(--blue);text-decoration:underline}
.article-nav{display:flex;justify-content:space-between;margin-top:48px;padding-top:24px;border-top:1px solid var(--border)}
.article-nav a{font-size:13px;color:var(--blue);text-decoration:none}
.related-section{margin-top:48px;padding-top:32px;border-top:2px solid var(--border)}
.related-title{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--text-lt);margin-bottom:16px}
.related-list{list-style:none;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.related-item{border-bottom:1px solid var(--border)}.related-item:last-child{border-bottom:none}
.related-item a{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;text-decoration:none;font-size:13px;color:var(--navy);transition:background .12s;gap:12px}
.related-item a:hover{background:var(--bg-soft);color:var(--blue)}
.related-item .rel-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.related-item .rel-cat{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:700px){.breadcrumb,.article-wrap{padding-left:16px;padding-right:16px}.article-title{font-size:26px}}
</style>
<script src="/auth.js"></script>
<script src="/nav.js"></script>
</head>
<body>
<div class="breadcrumb"><a href="/">Trang Chủ</a><span>›</span><a href="/blog.html">Khảo Luận</a><span>›</span><span>${title}</span></div>
<article class="article-wrap">
  <div class="article-meta">
    ${article.category?`<span class="meta-cat">${cat}</span>`:''}
    ${article.created_at?`<span class="meta-date">${formatDate(article.created_at)}</span>`:''}
    ${tags.map((t:string)=>`<span class="meta-tag">${escHtml(t)}</span>`).join('')}
  </div>
  <h1 class="article-title">${title}</h1>
  ${article.excerpt?`<div class="article-excerpt">${escHtml(article.excerpt)}</div>`:''}
  <div class="article-body">${body}</div>
  <div class="article-nav"><a href="/blog.html">← Về Khảo Luận</a></div>
  ${related.length?`<div class="related-section"><div class="related-title">Bài Viết Liên Quan</div><ul class="related-list">${
    related.map((r:any)=>`<li class="related-item"><a href="/khao-luan/${r.slug}"><span class="rel-title">${escHtml(r.title)}</span>${r.category?`<span class="rel-cat">${escHtml(r.category)}</span>`:''}</a></li>`).join('')
  }</ul></div>`:''}
</article>
<script>
// Expose article data for related-tools.js
window._articleData = { category: ${JSON.stringify(article.category||'')}, tags: ${JSON.stringify(article.tags||[])} };
</script>
<script src="/related-tools.js"></script>
<script src="/testimonials.js"></script>
</body></html>`;
}

function buildNotFound() {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<title>Không tìm thấy — Tử Vi Minh Bảo</title>
<link rel="icon" type="image/webp" href="/seal.webp">
<script src="/auth.js"></script>
<script src="/nav.js"></script>
</head>
<body style="font-family:sans-serif;text-align:center;padding:80px">
<h1 style="color:#061A2E;font-family:Georgia,serif;margin-bottom:16px">Không tìm thấy bài viết</h1>
<p style="color:#777;margin-bottom:24px">Bài viết không tồn tại hoặc đã bị xóa.</p>
<a href="/blog.html" style="color:#1455A4">← Về Khảo Luận</a>
</body></html>`;
}

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url);
  const pathSlug = pathname.split('/').filter(Boolean).pop() || '';
  const slug = pathSlug === 'khao-luan' ? '' : (pathSlug || searchParams.get('slug') || '');

  if (!slug) return NextResponse.redirect(new URL('/blog.html', BASE_URL));

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/khao_luan?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json() as any[];
    if (!rows?.length) return new NextResponse(buildNotFound(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

    let related: any[] = [];
    try {
      const cat = rows[0].category || '';
      const rRes = await fetch(`${SUPABASE_URL}/rest/v1/khao_luan?select=slug,title,category&order=created_at.desc&limit=20`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      const rRows = await rRes.json() as any[];
      const same  = rRows.filter((r:any) => r.slug !== slug && r.category === cat);
      const other = rRows.filter((r:any) => r.slug !== slug && r.category !== cat);
      related = [...same, ...other].slice(0, 5);
    } catch { /* ignore */ }

    const html = buildHTML(rows[0], slug, related);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch(e:unknown) {
    return new NextResponse(`<h1>Lỗi: ${(e as Error).message}</h1>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
