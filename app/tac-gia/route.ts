// app/tac-gia/route.ts — All authors listing page
export const revalidate = 86400;
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE   = 'https://www.tuviminhbao.com';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHTML(masters: any[]) {
  const url = `${BASE}/tac-gia`;

  const schemas = JSON.stringify([
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: 'Tác Giả Nghiên Cứu Tử Vi', url,
      description: 'Danh sách các học giả nghiên cứu Tử Vi Đẩu Số với kho tàng bài viết từ tập san Khoa Học Huyền Bí',
      inLanguage: 'vi',
      hasPart: masters.map(m => ({
        '@type': 'Person',
        name: m.display_name,
        url: `${BASE}/tac-gia/${m.id}`,
        description: m.bio || '',
        knowsAbout: ['Tử Vi Đẩu Số', ...(Array.isArray(m.specialty_topics) ? m.specialty_topics : [])],
      })),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Tác Giả', item: url },
      ],
    },
  ]);

  const cards = masters.map(m => {
    const specialty: string[] = Array.isArray(m.specialty_topics) ? m.specialty_topics.slice(0, 3) : [];
    return `<a href="/tac-gia/${esc(m.id)}" class="author-card">
  <div class="author-avatar" data-init="${esc(String(m.display_name || '?')[0])}">
    <img src="/authors/${esc(m.id)}.jpg" alt="${esc(m.display_name)}"
      onerror="this.closest('.author-avatar').innerHTML=this.closest('.author-avatar').dataset.init">
  </div>
  <div class="author-body">
    <div class="author-name">${esc(m.display_name)}</div>
    ${m.bio ? `<div class="author-bio">${esc(m.bio)}</div>` : ''}
    <div class="author-footer">
      <span class="author-count">${m.article_count || 0} bài</span>
      ${specialty.map((s: string) => `<span class="spec-chip">${esc(s)}</span>`).join('')}
    </div>
  </div>
</a>`;
  }).join('\n');

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Tác Giả Nghiên Cứu Tử Vi — Tử Vi Minh Bảo</title>
<meta name="description" content="Danh sách các tác giả nghiên cứu Tử Vi Đẩu Số — bộ sưu tập bài viết chiêm nghiệm và luận giải từ nhóm học giả uyên thâm.">
<meta property="og:title" content="Tác Giả Nghiên Cứu Tử Vi — Tử Vi Minh Bảo">
<meta property="og:description" content="15 học giả nghiên cứu Tử Vi Đẩu Số uyên thâm">
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
.page-header p{font-size:14px;color:rgba(255,255,255,.6);line-height:1.7;max-width:600px}
.main{flex:1;max-width:900px;margin:0 auto;padding:40px 40px 80px;width:100%}
.intro-box{background:var(--gold-lt);border:1px solid #e6d9c0;border-radius:8px;padding:20px 24px;margin-bottom:32px;font-size:14px;color:var(--text-mid);line-height:1.8}
.intro-box strong{color:var(--navy)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:20px}
.author-card{display:flex;gap:16px;padding:20px;border:1px solid var(--border-lt);border-radius:10px;text-decoration:none;color:inherit;background:var(--bg);transition:all .12s;align-items:flex-start}
.author-card:hover{border-color:var(--gold);background:var(--gold-lt);box-shadow:0 2px 12px rgba(154,123,58,.1)}
.author-avatar{width:52px;height:52px;border-radius:50%;background:var(--navy);color:var(--gold-bright);font-family:'Noto Serif',serif;font-size:22px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
.author-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.author-body{flex:1;min-width:0}
.author-name{font-family:'Noto Serif',serif;font-size:16px;font-weight:600;color:var(--navy);margin-bottom:6px}
.author-bio{font-size:13px;color:var(--text-lt);line-height:1.65;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.author-footer{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.author-count{font-size:11px;font-weight:600;color:var(--gold);background:#fff;border:1px solid #e6d9c0;padding:2px 8px;border-radius:10px}
.spec-chip{font-size:10px;color:var(--text-lt);background:var(--bg-soft);padding:2px 7px;border-radius:8px}
@media(max-width:700px){.breadcrumb,.main{padding-left:16px;padding-right:16px}.page-header{padding:24px 16px}.grid{grid-template-columns:1fr}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="breadcrumb"><a href="/">Trang Chủ</a><span>›</span><span>Tác Giả</span></div>
<div class="page-header">
  <h1>Tác Giả Nghiên Cứu Tử Vi</h1>
  <p>Bộ sưu tập bài viết chiêm nghiệm và luận giải Tử Vi Đẩu Số từ nhóm tác giả — mỗi người một góc nhìn, một giọng văn, nhưng cùng chung một mối đam mê khám phá bí ẩn của mệnh lý</p>
</div>
<main class="main">
  <div class="intro-box">
    Những tác giả dưới đây là các <strong>học giả và người chiêm nghiệm Tử Vi Đẩu Số</strong> — mỗi người mang một góc nhìn riêng, từ lý luận học thuật đến những câu chuyện sống thực rút ra từ hàng ngàn lá số. Mỗi bài viết là một hành trình khám phá, không chỉ về mệnh lý mà về con người.
  </div>
  <div class="grid">${cards}</div>
</main>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=26" defer></script>
</body></html>`;
}

export async function GET() {
  const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };

  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/master_profiles?select=id,display_name,bio,specialty_topics,article_count,primary_article_type&order=article_count.desc`,
      { headers: sbHeaders }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const masters: any[] = res.ok ? await res.json() : [];

    const html = buildHTML(masters);
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
