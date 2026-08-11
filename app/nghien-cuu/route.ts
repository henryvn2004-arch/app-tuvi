// app/nghien-cuu/route.ts — Listing page for master-written research articles
export const revalidate = 3600;
import { NextRequest, NextResponse } from 'next/server';
import { PUBLISHED_ONLY } from '@/lib/content/publish-filter';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';
const PAGE_SIZE = 20;

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
}

const CAT_LABEL: Record<string, string> = {
  'hoc-thuat': 'Học Thuật', 'luan-la-so': 'Luận Lá Số',
  'chiem-nghiem': 'Chiêm Nghiệm', 'thuc-hanh': 'Thực Hành', 'ly-luan': 'Lý Luận',
};

const CATS = ['hoc-thuat', 'luan-la-so', 'chiem-nghiem', 'thuc-hanh', 'ly-luan'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHTML(articles: any[], masters: Record<string, any>, cat: string, page: number, total: number) {
  const url      = `${BASE}/nghien-cuu`;
  const catLabel = cat ? (CAT_LABEL[cat] || cat) : 'Tất Cả';
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const schemas = JSON.stringify([
    {
      '@context': 'https://schema.org', '@type': 'Blog',
      name: 'Nghiên Cứu Tử Vi Đẩu Số', url,
      description: 'Tập hợp các bài nghiên cứu học thuật về Tử Vi Đẩu Số từ các học giả uyên thâm',
      inLanguage: 'vi',
      publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Nghiên Cứu', item: url },
      ],
    },
  ]);

  const articleCards = articles.map(a => {
    const m = masters[a.master_id] || {};
    return `<article class="art-card">
  <div class="art-meta">
    <span class="art-cat">${esc(CAT_LABEL[a.category] || a.category || '')}</span>
    <span class="art-date">${formatDate(a.created_at)}</span>
  </div>
  <h2 class="art-title"><a href="/nghien-cuu/${esc(a.slug)}">${esc(a.title)}</a></h2>
  ${a.excerpt ? `<p class="art-excerpt">${esc(a.excerpt)}</p>` : ''}
  <div class="art-footer">
    ${m.id ? `<a href="/tac-gia/${esc(m.id)}" class="art-author">${esc(m.display_name || '')}</a>` : ''}
    ${a.word_count ? `<span class="art-words">${a.word_count} từ</span>` : ''}
  </div>
</article>`;
  }).join('\n');

  const filterLinks = ['', ...CATS].map(c => {
    const active = c === cat;
    const label  = c ? (CAT_LABEL[c] || c) : 'Tất Cả';
    const href   = c ? `/nghien-cuu?cat=${c}` : '/nghien-cuu';
    return `<a href="${href}" class="filter-btn${active ? ' active' : ''}">${label}</a>`;
  }).join('');

  const prevPage = page > 1 ? `<a href="/nghien-cuu?${cat ? `cat=${cat}&` : ''}page=${page - 1}" class="page-btn">← Trước</a>` : '<span></span>';
  const nextPage = page < totalPages ? `<a href="/nghien-cuu?${cat ? `cat=${cat}&` : ''}page=${page + 1}" class="page-btn">Tiếp →</a>` : '<span></span>';

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Nghiên Cứu Tử Vi Đẩu Số — Tử Vi Minh Bảo</title>
<meta name="description" content="Tập hợp các bài nghiên cứu học thuật về Tử Vi Đẩu Số từ các học giả uyên thâm — luận lá số, lý luận, chiêm nghiệm và thực hành.">
<meta property="og:title" content="Nghiên Cứu Tử Vi Đẩu Số — Tử Vi Minh Bảo">
<meta property="og:description" content="Nghiên cứu học thuật Tử Vi Đẩu Số từ các học giả uyên thâm">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet"></noscript>
<script type="application/ld+json">${schemas}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--gold-lt:#F9F4EB;--gold-bright:#D4A843;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F5F4F0}
body{font-family:'Be Vietnam Pro',Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.breadcrumb a{color:var(--text-lt);text-decoration:none}.breadcrumb a:hover{color:var(--navy)}.breadcrumb span{color:var(--border)}
.page-header{background:var(--navy);color:#fff;padding:40px 40px 32px}
.page-header h1{font-family:'Noto Serif',serif;font-size:28px;font-weight:600;margin-bottom:8px}
.page-header p{font-size:14px;color:rgba(255,255,255,.65);line-height:1.6}
.main{flex:1;max-width:900px;margin:0 auto;padding:40px 40px 80px;width:100%}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px}
.filter-btn{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;text-decoration:none;color:var(--text-lt);background:var(--bg-soft);border:1px solid var(--border);transition:all .12s}
.filter-btn:hover,.filter-btn.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.art-card{border-bottom:1px solid var(--border-lt);padding:28px 0;transition:background .12s}
.art-card:first-child{border-top:1px solid var(--border-lt)}
.art-meta{display:flex;gap:10px;align-items:center;margin-bottom:8px}
.art-cat{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold)}
.art-date{font-size:11px;color:var(--text-lt)}
.art-title{font-family:'Noto Serif',serif;font-size:20px;font-weight:600;margin-bottom:8px;line-height:1.35}
.art-title a{color:var(--navy);text-decoration:none}.art-title a:hover{color:var(--blue)}
.art-excerpt{font-size:14px;color:var(--text-lt);line-height:1.7;font-weight:300;margin-bottom:10px}
.art-footer{display:flex;justify-content:space-between;align-items:center}
.art-author{font-size:12px;color:var(--blue);text-decoration:none;font-style:italic}.art-author:hover{text-decoration:underline}
.art-words{font-size:11px;color:var(--text-lt)}
.pagination{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:24px;border-top:1px solid var(--border)}
.page-btn{font-size:13px;color:var(--blue);text-decoration:none;padding:6px 12px;border:1px solid var(--border-lt);border-radius:4px}
.page-btn:hover{background:var(--bg-soft)}
.page-info{font-size:12px;color:var(--text-lt)}
.author-shelf{background:var(--gold-lt);border:1px solid #e6d9c0;border-radius:8px;padding:20px 24px;margin-bottom:32px}
.author-shelf-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:12px}
.author-chips{display:flex;gap:8px;flex-wrap:wrap}
.author-chip{font-size:12px;font-family:'Noto Serif',serif;font-style:italic;color:var(--navy);text-decoration:none;padding:4px 12px;background:#fff;border:1px solid #e6d9c0;border-radius:16px;transition:all .12s}
.author-chip:hover{background:var(--navy);color:var(--gold-bright);border-color:var(--navy)}
.empty{text-align:center;padding:60px 0;color:var(--text-lt);font-style:italic}
@media(max-width:700px){.breadcrumb,.main{padding-left:16px;padding-right:16px}.page-header{padding:24px 16px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="breadcrumb"><a href="/">Trang Chủ</a><span>›</span><span>Nghiên Cứu</span></div>
<div class="page-header">
  <h1>Nghiên Cứu Tử Vi Đẩu Số</h1>
  <p>Các bài nghiên cứu học thuật về Tử Vi Đẩu Số — luận lá số, lý luận, chiêm nghiệm và thực hành từ các học giả uyên thâm</p>
</div>
<main class="main">
  <div class="author-shelf">
    <div class="author-shelf-title">Các Tác Giả</div>
    <div class="author-chips">
      ${Object.values(masters).map((m) => `<a href="/tac-gia/${esc(m.id)}" class="author-chip">${esc(m.display_name)}</a>`).join('')}
    </div>
  </div>
  <div class="filters">${filterLinks}</div>
  ${articles.length === 0 ? '<div class="empty">Chưa có bài viết nào.</div>' : articleCards}
  ${totalPages > 1 ? `<div class="pagination">${prevPage}<span class="page-info">Trang ${page}/${totalPages}</span>${nextPage}</div>` : ''}
</main>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=20" defer></script>
</body></html>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cat  = searchParams.get('cat') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

  let articleFilter = `select=slug,title,excerpt,category,master_id,word_count,created_at`;
  if (cat && CATS.includes(cat)) articleFilter += `&category=eq.${encodeURIComponent(cat)}`;

  try {
    const [articlesRes, mastersRes] = await Promise.all([
      fetch(
        `${SB_URL}/rest/v1/master_articles?${articleFilter}&${PUBLISHED_ONLY}&order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`,
        { headers: { ...sbHeaders, 'Prefer': 'count=exact', 'Range': `${offset}-${offset + PAGE_SIZE - 1}` } }
      ),
      fetch(`${SB_URL}/rest/v1/master_profiles?select=id,display_name&order=article_count.desc`, { headers: sbHeaders }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articles: any[] = articlesRes.ok ? await articlesRes.json() : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const masterList: any[] = mastersRes.ok ? await mastersRes.json() : [];

    // Parse total count from Content-Range header
    const contentRange = articlesRes.headers.get('Content-Range') || '';
    const total = parseInt(contentRange.split('/')[1] || '0', 10) || articles.length;

    const masters = Object.fromEntries(masterList.map(m => [m.id, m]));

    const html = buildHTML(articles, masters, cat, page, total);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e: unknown) {
    return new NextResponse(`<h1>Lỗi: ${(e as Error).message}</h1>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
