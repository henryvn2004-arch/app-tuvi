// app/nghien-cuu/[slug]/route.ts — Article detail page for master-written articles
export const revalidate = 86400;
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderMarkdown(text: string) {
  if (!text) return '<p>Nội dung đang được cập nhật.</p>';
  let src = text.replace(/\\n/g, '\n');
  src = src.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  src = src.replace(/`(.+?)`/g, '<code>$1</code>');
  src = src.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" rel="noopener">$1</a>');

  const lines = src.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const l = raw.trimEnd();
    const t = l.trim();
    if (!t) { if (inList) { out.push('</ul>'); inList = false; } continue; }
    if (/^### (.+)$/.test(t)) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h3>${t.slice(4)}</h3>`); }
    else if (/^## (.+)$/.test(t)) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h2>${t.slice(3)}</h2>`); }
    else if (/^# (.+)$/.test(t)) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<h1>${t.slice(2)}</h1>`); }
    else if (/^[-*] (.+)$/.test(t)) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${t.slice(2)}</li>`); }
    else if (/^\d+\. (.+)$/.test(t)) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${t.replace(/^\d+\. /, '')}</li>`); }
    else if (/^> (.+)$/.test(t)) { if (inList) { out.push('</ul>'); inList = false; } out.push(`<blockquote>${t.slice(2)}</blockquote>`); }
    else if (t === '---') { if (inList) { out.push('</ul>'); inList = false; } out.push('<hr>'); }
    else if (/^<(h[123]|ul|ol|li|blockquote|hr|div)/.test(t)) { out.push(t); }
    else { if (inList) { out.push('</ul>'); inList = false; } out.push(`<p>${t}</p>`); }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

const CAT_LABEL: Record<string, string> = {
  'hoc-thuat': 'Học Thuật', 'luan-la-so': 'Luận Lá Số',
  'chiem-nghiem': 'Chiêm Nghiệm', 'thuc-hanh': 'Thực Hành', 'ly-luan': 'Lý Luận',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHTML(article: any, master: any, related: any[], slug: string) {
  const url      = `${BASE}/nghien-cuu/${slug}`;
  const title    = esc(article.title);
  const desc     = esc(article.excerpt || article.title);
  const catLabel = CAT_LABEL[article.category] || esc(article.category) || 'Nghiên Cứu';
  const tags     = (Array.isArray(article.tags) ? article.tags : []).slice(0, 4) as string[];
  const body     = renderMarkdown(article.content || '');
  const img      = `${BASE}/api/og?${new URLSearchParams({ title: String(article.title || '').slice(0, 80), sub: master?.display_name || 'Nghiên Cứu Tử Vi' }).toString()}`;

  const masterName = master?.display_name || '';
  const masterId   = master?.id || article.master_id || '';
  const masterUrl  = masterId ? `${BASE}/tac-gia/${masterId}` : '';

  const schemas = JSON.stringify([
    {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: article.title, description: article.excerpt || '',
      url, datePublished: article.created_at, inLanguage: 'vi',
      wordCount: article.word_count || 0,
      author: masterName
        ? { '@type': 'Person', name: masterName, url: masterUrl, description: master?.bio || '' }
        : { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE },
      publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE, logo: { '@type': 'ImageObject', url: BASE + '/seal.webp' } },
      image: { '@type': 'ImageObject', url: img },
      about: { '@type': 'Thing', name: 'Tử Vi Đẩu Số' },
      isPartOf: { '@type': 'Blog', name: 'Nghiên Cứu Tử Vi', url: BASE + '/nghien-cuu' },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Nghiên Cứu', item: BASE + '/nghien-cuu' },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ]);

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — Tử Vi Minh Bảo</title>
<meta name="description" content="${desc}">
${tags.length ? `<meta name="keywords" content="${esc(tags.join(', '))}">` : ''}
<meta property="og:title" content="${title} — Tử Vi Minh Bảo">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title} — Tử Vi Minh Bảo">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
<script type="application/ld+json">${schemas}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--navy-mid:#0D3B5E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--gold-bright:#D4A843;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.breadcrumb a{color:var(--text-lt);text-decoration:none}.breadcrumb a:hover{color:var(--navy)}.breadcrumb span{color:var(--border)}
.article-wrap{flex:1;max-width:760px;margin:0 auto;padding:48px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px}
.meta-cat{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.meta-date{font-size:11px;color:var(--text-lt)}
.meta-tag{font-size:10px;background:var(--bg-soft);color:var(--text-lt);padding:2px 8px;border-radius:4px}
.article-title{font-family:'Noto Serif',serif;font-size:32px;color:var(--navy);font-weight:600;line-height:1.3;margin-bottom:14px}
.article-excerpt{font-size:16px;color:var(--text-lt);line-height:1.75;font-weight:300;font-style:italic;margin-bottom:32px;padding-bottom:32px;border-bottom:2px solid var(--border)}
.author-box{display:flex;align-items:flex-start;gap:16px;background:var(--gold-lt);border:1px solid #e6d9c0;border-radius:8px;padding:18px 20px;margin-bottom:32px}
.author-avatar{width:44px;height:44px;border-radius:50%;background:var(--navy);color:var(--gold-bright);font-family:'Noto Serif',serif;font-size:18px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.author-info{flex:1}
.author-name{font-family:'Noto Serif',serif;font-size:15px;font-weight:600;color:var(--navy);margin-bottom:3px}
.author-name a{color:var(--navy);text-decoration:none}.author-name a:hover{color:var(--blue)}
.author-bio{font-size:13px;color:var(--text-lt);line-height:1.6}
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
.article-sig{margin-top:40px;padding-top:20px;border-top:1px dashed var(--border);text-align:right;font-family:'Noto Serif',serif;font-style:italic;color:var(--text-lt);font-size:14px}
.article-nav{display:flex;justify-content:space-between;margin-top:48px;padding-top:24px;border-top:1px solid var(--border)}
.article-nav a{font-size:13px;color:var(--blue);text-decoration:none}
.related-section{margin-top:48px;padding-top:32px;border-top:2px solid var(--border)}
.related-title{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--text-lt);margin-bottom:16px}
.related-list{list-style:none;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.related-item{border-bottom:1px solid var(--border)}.related-item:last-child{border-bottom:none}
.related-item a{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;text-decoration:none;font-size:13px;color:var(--navy);gap:12px;transition:background .12s}
.related-item a:hover{background:var(--bg-soft);color:var(--blue)}
.related-item .rel-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.related-item .rel-author{font-size:11px;color:var(--gold);flex-shrink:0}
@media(max-width:700px){.breadcrumb,.article-wrap{padding-left:16px;padding-right:16px}.article-title{font-size:24px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="breadcrumb">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/nghien-cuu">Nghiên Cứu</a><span>›</span>
  <span>${title}</span>
</div>
<article class="article-wrap">
  <div class="article-meta">
    <span class="meta-cat">${catLabel}</span>
    ${article.created_at ? `<span class="meta-date">${formatDate(article.created_at)}</span>` : ''}
    ${tags.map((t: string) => `<span class="meta-tag">${esc(t)}</span>`).join('')}
  </div>
  <h1 class="article-title">${title}</h1>
  ${article.excerpt ? `<div class="article-excerpt">${esc(article.excerpt)}</div>` : ''}
  ${masterName ? `<div class="author-box">
    <div class="author-avatar">${esc(masterName[0] || '?')}</div>
    <div class="author-info">
      <div class="author-name">${masterUrl ? `<a href="${esc(masterUrl)}">${esc(masterName)}</a>` : esc(masterName)}</div>
      ${master?.bio ? `<div class="author-bio">${esc(master.bio)}</div>` : ''}
    </div>
  </div>` : ''}
  <div class="article-body">${body}</div>
  ${masterName ? `<div class="article-sig">— ${esc(masterName)}</div>` : ''}
  <div class="article-nav">
    <a href="/nghien-cuu">← Về Nghiên Cứu</a>
    ${masterUrl ? `<a href="${esc(masterUrl)}">Bài khác của ${esc(masterName)} →</a>` : ''}
  </div>
  ${related.length ? `<div class="related-section">
    <div class="related-title">Bài Viết Liên Quan</div>
    <ul class="related-list">${related.map((r) => `<li class="related-item">
      <a href="/nghien-cuu/${esc(r.slug)}">
        <span class="rel-title">${esc(r.title)}</span>
        ${r.display_name ? `<span class="rel-author">${esc(r.display_name)}</span>` : ''}
      </a></li>`).join('')}
    </ul>
  </div>` : ''}
</article>
<script src="/related-tools.js"></script>
<script src="/testimonials.js"></script>
<script src="/nav.js?v=14" defer></script>
</body></html>`;
}

function buildNotFound() {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<title>Không tìm thấy — Tử Vi Minh Bảo</title>
<link rel="icon" type="image/webp" href="/seal.webp">
<script src="/auth.js" defer></script>
</head><body style="font-family:sans-serif;text-align:center;padding:80px">
<h1 style="color:#061A2E;font-family:Georgia,serif;margin-bottom:16px">Không tìm thấy bài viết</h1>
<p style="color:#777;margin-bottom:24px">Bài viết không tồn tại hoặc đã bị xóa.</p>
<a href="/nghien-cuu" style="color:#1455A4">← Về Nghiên Cứu</a>
<script src="/nav.js?v=14" defer></script>
</body></html>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.redirect(new URL('/nghien-cuu', BASE));

  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/master_articles?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      { headers: sbHeaders }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await r.json() as any[];
    if (!rows?.length) {
      return new NextResponse(buildNotFound(), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const article = rows[0];

    // Fetch master profile and related articles in parallel
    const [masterRes, relatedRes] = await Promise.all([
      article.master_id
        ? fetch(`${SB_URL}/rest/v1/master_profiles?id=eq.${encodeURIComponent(article.master_id)}&select=id,display_name,bio&limit=1`, { headers: sbHeaders })
        : Promise.resolve(null),
      fetch(
        `${SB_URL}/rest/v1/master_articles?slug=neq.${encodeURIComponent(slug)}&category=eq.${encodeURIComponent(article.category || '')}&select=slug,title,master_id&order=created_at.desc&limit=5`,
        { headers: sbHeaders }
      ),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const masterRows = masterRes ? (masterRes.ok ? await masterRes.json() as any[] : []) : [];
    const master = masterRows[0] || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let related: any[] = relatedRes.ok ? await relatedRes.json() : [];

    // Enrich related with master display_names
    if (related.length) {
      const masterIds = Array.from(new Set(related.map((r) => r.master_id).filter(Boolean)));
      if (masterIds.length) {
        const mpRes = await fetch(
          `${SB_URL}/rest/v1/master_profiles?id=in.(${masterIds.map(encodeURIComponent).join(',')})&select=id,display_name`,
          { headers: sbHeaders }
        );
        if (mpRes.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mpRows = await mpRes.json() as any[];
          const mpMap = Object.fromEntries(mpRows.map((m) => [m.id, m.display_name]));
          related = related.map((r) => ({ ...r, display_name: mpMap[r.master_id] || '' }));
        }
      }
    }

    const html = buildHTML(article, master, related, slug);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e: unknown) {
    return new NextResponse(`<h1>Lỗi: ${(e as Error).message}</h1>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
