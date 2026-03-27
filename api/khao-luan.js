// api/khao-luan.js
// SSR endpoint: /khao-luan/:slug → HTML đầy đủ, Google có thể index
// Cache: Vercel Edge 1h, stale-while-revalidate 24h

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BASE_URL = 'https://www.tuviminhbao.com';

function escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMarkdown(text) {
  if (!text) return '<p>Nội dung đang được cập nhật.</p>';
  let html = text;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  const lines = html.split('\n');
  const result = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^<(h[123]|ul|ol|li|blockquote|hr|div)/.test(t)) result.push(t);
    else result.push(`<p>${t}</p>`);
  }
  return result.join('\n');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { year:'numeric', month:'long', day:'numeric' });
}

function buildSchemas(article, url) {
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt || '',
      url,
      datePublished: article.created_at,
      dateModified: article.updated_at || article.created_at,
      inLanguage: 'vi',
      author: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE_URL },
      publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE_URL, logo: { '@type': 'ImageObject', url: BASE_URL + '/seal.webp' } },
      keywords: (article.tags || []).join(', '),
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      image: { '@type': 'ImageObject', url: BASE_URL + '/seal.webp' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: 'Khảo Luận', item: BASE_URL + '/blog.html' },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ];

  // FAQPage nếu có heading câu hỏi
  const faqMatches = [...(article.content || '').matchAll(/#{2,3} (.+\?)\n+([\s\S]+?)(?=\n#{2,3}|$)/g)];
  if (faqMatches.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqMatches.map(m => ({
        '@type': 'Question',
        name: m[1].trim(),
        acceptedAnswer: { '@type': 'Answer', text: m[2].replace(/\*\*/g,'').trim().slice(0, 300) },
      })),
    });
  }

  return schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n');
}

function buildHTML(article, slug) {
  const url = `${BASE_URL}/khao-luan/${slug}`;
  const title = escHtml(article.title);
  const desc  = escHtml(article.excerpt || article.title);
  const tags  = (article.tags || []).slice(0,3);
  const contentHtml = renderMarkdown(article.content || '');
  const schemas = buildSchemas(article, url);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Tử Vi Minh Bảo</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${title} — Tử Vi Minh Bảo">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${BASE_URL}/seal.webp">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Tử Vi Minh Bảo">
<meta property="og:locale" content="vi_VN">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
${schemas}
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.topnav{position:sticky;top:0;z-index:200;background:var(--navy);display:flex;align-items:center;height:60px;padding:0 40px;gap:32px}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.nav-logo img{width:38px;height:38px;object-fit:contain;border-radius:5px}
.nav-logo .name{font-size:16px;font-weight:700;color:#CC2200;font-family:Georgia,serif}
.nav-logo .url{font-size:10px;color:#aaa;letter-spacing:.07em;text-transform:uppercase}
.nav-links{display:flex;align-items:center;gap:4px}
.nav-link{color:#8BAACC;font-size:13px;text-decoration:none;padding:6px 12px;border-radius:6px;transition:all .15s}
.nav-link:hover{color:#fff;background:rgba(255,255,255,.07)}
.nav-link.active{color:#c9a84c}
.nav-hamburger{display:none;background:none;border:none;color:#8BAACC;cursor:pointer;padding:8px;font-size:20px}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.breadcrumb a{color:var(--text-lt);text-decoration:none}
.breadcrumb a:hover{color:var(--navy)}
.article-wrap{flex:1;max-width:760px;margin:0 auto;padding:48px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px}
.meta-cat{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.meta-date{font-size:11px;color:var(--text-lt)}
.meta-tag{font-size:10px;background:var(--bg-soft);color:var(--text-lt);padding:2px 8px;border-radius:4px}
.article-title{font-family:'Noto Serif',serif;font-size:32px;color:var(--navy);font-weight:600;line-height:1.3;margin-bottom:14px}
.article-excerpt{font-size:16px;color:var(--text-lt);line-height:1.75;font-weight:300;font-style:italic;margin-bottom:32px;padding-bottom:32px;border-bottom:2px solid var(--border)}
.article-body{font-size:16px;line-height:1.9;color:var(--text-mid);font-weight:300}
.article-body h1,.article-body h2{font-family:'Noto Serif',serif;color:var(--navy);font-weight:600;margin:36px 0 14px}
.article-body h1{font-size:26px}
.article-body h2{font-size:21px;padding-top:24px;border-top:1px solid var(--border)}
.article-body h3{font-size:17px;font-weight:600;color:var(--text);margin:24px 0 10px}
.article-body p{margin-bottom:16px}
.article-body strong{color:var(--text);font-weight:600}
.article-body em{color:var(--gold);font-style:italic}
.article-body ul,.article-body ol{margin:12px 0 16px 24px}
.article-body li{margin-bottom:6px;line-height:1.7}
.article-body blockquote{border-left:3px solid var(--gold);padding:12px 20px;margin:20px 0;background:var(--gold-lt);color:var(--text-mid);font-style:italic;border-radius:0 6px 6px 0}
.article-body code{background:var(--bg-soft);padding:2px 6px;border-radius:3px;font-family:monospace;font-size:13px;color:var(--blue)}
.article-body hr{border:none;border-top:1px solid var(--border);margin:32px 0}
.article-body a{color:var(--blue);text-decoration:underline}
.article-nav{display:flex;justify-content:space-between;align-items:center;margin-top:48px;padding-top:24px;border-top:1px solid var(--border);gap:16px;flex-wrap:wrap}
.article-nav a{font-size:13px;color:var(--blue);text-decoration:none}
.article-nav a:hover{color:var(--navy)}
.site-footer{background:#1A1210;color:rgba(255,255,255,.5);padding:36px 32px 24px;margin-top:auto}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(255,255,255,.25)}
.footer-bottom img{width:20px;height:20px;object-fit:contain;opacity:.3;border-radius:3px}
@media(max-width:700px){
  .topnav{padding:0 16px}
  .nav-links{display:none;position:absolute;top:60px;left:0;right:0;background:var(--navy);flex-direction:column;padding:8px 0 16px;gap:0;border-bottom:1px solid #1a2a3a}
  .nav-links.open{display:flex}
  .nav-link{padding:10px 24px;border-radius:0;width:100%}
  .nav-hamburger{display:block;margin-left:auto}
  .breadcrumb,.article-wrap{padding-left:16px;padding-right:16px}
  .article-title{font-size:26px}
}
</style>
<script src="/auth.js"></script>
</head>
<body>
<nav class="topnav">
  <a class="nav-logo" href="/">
    <img src="/seal.webp" alt="Tử Vi Minh Bảo">
    <div><div class="name">Tử Vi Minh Bảo</div><div class="url">Tri mệnh lý – Thuận thế hành</div></div>
  </a>
  <div class="nav-links" id="nav-links">
    <a class="nav-link" href="/">Trang Chủ</a>
    <a class="nav-link" href="/about.html">Giới Thiệu</a>
    <a class="nav-link" href="/resources.html">Tài Liệu</a>
    <a class="nav-link active" href="/blog.html">Khảo Luận</a>
    <a class="nav-link" href="/menh-kho.html">Mệnh Khố</a>
    <a class="nav-link" href="/contact.html">Liên Hệ</a>
  </div>
  <div id="nav-auth-area"></div>
  <button class="nav-hamburger" onclick="document.getElementById('nav-links').classList.toggle('open')">☰</button>
</nav>

<div class="breadcrumb">
  <a href="/">Trang Chủ</a>
  <span>›</span>
  <a href="/blog.html">Khảo Luận</a>
  <span>›</span>
  <span>${title}</span>
</div>

<article class="article-wrap">
  <div class="article-meta">
    ${article.category ? `<span class="meta-cat">${escHtml(article.category)}</span>` : ''}
    ${article.created_at ? `<span class="meta-date">${formatDate(article.created_at)}</span>` : ''}
    ${tags.map(t => `<span class="meta-tag">${escHtml(t)}</span>`).join('')}
  </div>
  <h1 class="article-title">${title}</h1>
  ${article.excerpt ? `<div class="article-excerpt">${escHtml(article.excerpt)}</div>` : ''}
  <div class="article-body">${contentHtml}</div>
  <div class="article-nav">
    <a href="/blog.html">← Về Khảo Luận</a>
  </div>
</article>

<footer class="site-footer">
  <div class="footer-bottom">
    <span>© 2026 tuviminhbao.com — All rights reserved</span>
    <img src="/seal.webp" alt="">
  </div>
</footer>
</body>
</html>`;
}

module.exports = async (req, res) => {
  // Lấy slug từ path /khao-luan/:slug hoặc query ?slug=
  const pathParts = (req.url || '').split('?')[0].split('/').filter(Boolean);
  const slug = pathParts[pathParts.length - 1] || req.query?.slug || '';

  if (!slug || slug === 'khao-luan') {
    return res.redirect(302, '/blog.html');
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/khao_luan?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const rows = await r.json();
    if (!rows?.length) {
      return res.status(404).send(buildNotFound());
    }

    const html = buildHTML(rows[0], slug);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch(e) {
    return res.status(500).send(`<h1>Lỗi: ${e.message}</h1>`);
  }
};

function buildNotFound() {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Không tìm thấy — Tử Vi Minh Bảo</title></head>
<body style="font-family:sans-serif;text-align:center;padding:80px">
<h1 style="color:#061A2E">Không tìm thấy bài viết</h1>
<a href="/blog.html" style="color:#1455A4">← Về Khảo Luận</a>
</body></html>`;
}
