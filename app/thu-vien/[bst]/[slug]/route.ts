// app/thu-vien/[bst]/[slug]/route.ts — trang lẻ một mục thu_vien_muc.
//
// Bố cục theo đúng thiết kế AEO đã chốt: `tra_loi_ngan` (đoạn passage-first,
// 40-60 từ) đặt NGAY dưới H1 — đây là đoạn máy tìm kiếm/LLM khác trích dẫn —
// rồi mới tới `than` (thân giải thích) và `hoi_dap` (FAQPage thật).
export const revalidate = 86400;

import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE = 'https://www.tuviminhbao.com';

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** `than` là văn xuôi thuần (không markdown đầu mục/danh sách) — chỉ tách
 * đoạn + đổi **đậm** nếu model lỡ chèn, KHÔNG cần bộ dựng markdown đầy đủ
 * như tu-dien (nội dung khác định dạng, xem lib/content/brand-check.ts). */
function renderProse(text: string): string {
  const src = String(text || '').trim();
  if (!src) return '';
  const paras = src.split(/\n{2,}/).length > 1 ? src.split(/\n{2,}/) : src.split(/\n/);
  return paras
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('\n');
}

const BST_LABEL: Record<string, string> = {
  'sao-cung': 'Sao × Cung',
  'khai-niem': 'Khái Niệm',
  'nap-am': 'Nạp Âm',
};

interface Row {
  slug: string;
  bo_suu_tap: string;
  ten: string;
  ten_han: string | null;
  tra_loi_ngan: string | null;
  than: string | null;
  hoi_dap: Array<{ cau_hoi: string; tra_loi: string }> | null;
  lien_quan: string[] | null;
  created_at: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bst: string; slug: string }> },
): Promise<Response> {
  const { bst, slug } = await params;
  const label = BST_LABEL[bst];
  if (!label) return NextResponse.redirect(`${BASE}/thu-vien`);

  const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const res = await fetch(
    `${SB_URL}/rest/v1/thu_vien_muc?slug=eq.${encodeURIComponent(slug)}&bo_suu_tap=eq.${bst}&publish_status=eq.published&select=*&limit=1`,
    { headers, cache: 'no-store' },
  );
  if (!res.ok) return NextResponse.redirect(`${BASE}/thu-vien/${bst}`);
  const rows = (await res.json()) as Row[];
  if (!rows?.length) return NextResponse.redirect(`${BASE}/thu-vien/${bst}`);
  const row = rows[0];

  let relRows: Array<{ slug: string; ten: string; bo_suu_tap: string }> = [];
  if (row.lien_quan?.length) {
    const inList = row.lien_quan.map((s) => encodeURIComponent(s)).join(',');
    const relRes = await fetch(
      `${SB_URL}/rest/v1/thu_vien_muc?slug=in.(${inList})&publish_status=eq.published&select=slug,ten,bo_suu_tap&limit=8`,
      { headers, cache: 'no-store' },
    );
    if (relRes.ok) relRows = await relRes.json();
  }
  const relatedHTML = relRows.length
    ? `<div class="rel-wrap">
      <div class="rel-title">Xem Thêm</div>
      <div class="rel-grid">${relRows
        .map((r) => `<a class="rel-item" href="/thu-vien/${r.bo_suu_tap}/${esc(r.slug)}">${esc(r.ten)}</a>`)
        .join('')}</div>
    </div>`
    : '';

  const hoiDap = Array.isArray(row.hoi_dap) ? row.hoi_dap : [];
  const faqHTML = hoiDap.length
    ? `<div class="faq-wrap">
      <h2 class="faq-title">Câu Hỏi Thường Gặp</h2>
      ${hoiDap
        .map(
          (qa) => `<div class="faq-item">
        <div class="faq-q">${esc(qa.cau_hoi)}</div>
        <div class="faq-a">${esc(qa.tra_loi)}</div>
      </div>`,
        )
        .join('')}
    </div>`
    : '';

  const url = `${BASE}/thu-vien/${bst}/${slug}`;
  const hubUrl = `${BASE}/thu-vien/${bst}`;
  const title = `${row.ten} | ${label} | Thư Viện Tử Vi Minh Bảo`;
  const desc = row.tra_loi_ngan || `Tìm hiểu về ${row.ten} theo cổ pháp Tử Vi Đẩu Số.`;
  const img = `${BASE}/api/og?${new URLSearchParams({ title: row.ten.slice(0, 80), sub: label }).toString()}`;

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: row.ten,
      description: desc,
      url,
      inDefinedTermSet: hubUrl,
    },
    ...(hoiDap.length
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: hoiDap.map((qa) => ({
              '@type': 'Question',
              name: qa.cau_hoi,
              acceptedAnswer: { '@type': 'Answer', text: qa.tra_loi },
            })),
          },
        ]
      : []),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Thư Viện', item: `${BASE}/thu-vien` },
        { '@type': 'ListItem', position: 3, name: label, item: hubUrl },
        { '@type': 'ListItem', position: 4, name: row.ten, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: row.ten,
      description: desc,
      url,
      inLanguage: 'vi',
      datePublished: row.created_at ? String(row.created_at).slice(0, 10) : undefined,
      author: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      publisher: {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'Tử Vi Minh Bảo',
        url: BASE,
        logo: { '@type': 'ImageObject', url: `${BASE}/seal.webp` },
      },
      image: { '@type': 'ImageObject', url: img },
    },
  ]);

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preload" href="/fonts/noto-serif-latin-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-serif-vietnamese-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/noto-serif.css?v=1" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/fonts/noto-serif.css?v=1"></noscript>
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#0F2A3D;--gold:#7C6942;--gold-bright:#C8A96A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#D8D4CB;--border-lt:#E8E8E8;--bg:#FFFFFF;--bg-soft:#F4F2EC;--serif:'Noto Serif',Georgia,serif}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}.bc span{color:var(--border)}
.article-wrap{flex:1;max-width:720px;margin:0 auto;padding:52px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.meta-loai{font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.meta-han{font-size:13px;color:var(--text-lt);font-style:italic}
.article-title{font-family:var(--serif);font-size:28px;color:var(--navy);font-weight:600;line-height:1.3;margin-bottom:20px}
.tln-box{background:var(--bg-soft);border-left:3px solid var(--gold-bright);padding:18px 22px;margin-bottom:32px;font-size:15.5px;line-height:1.7;color:var(--text-mid)}
.article-body{font-size:16px;line-height:1.85;color:var(--text-mid);font-weight:400}
.article-body p{margin-bottom:15px;max-width:660px}
.article-body strong{color:var(--text);font-weight:600}
.faq-wrap{margin-top:40px;padding-top:24px;border-top:1px solid var(--border-lt)}
.faq-title{font-family:var(--serif);font-size:19px;color:var(--navy);font-weight:600;margin-bottom:18px}
.faq-item{margin-bottom:16px}
.faq-q{font-size:14.5px;font-weight:600;color:var(--navy);margin-bottom:5px}
.faq-a{font-size:14px;color:var(--text-mid);line-height:1.6}
.rel-wrap{margin-top:36px;padding-top:24px;border-top:1px solid var(--border-lt)}
.rel-title{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--text-lt);margin-bottom:12px}
.rel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.rel-item{display:block;padding:11px 14px;background:var(--bg-soft);border:1px solid var(--border-lt);font-size:13px;color:var(--navy);text-decoration:none;line-height:1.4;transition:all .12s}
.rel-item:hover{border-color:var(--gold);background:#fff;color:var(--gold)}
.cta-box{margin-top:44px;padding:32px;background:linear-gradient(135deg,#fdf6e9 0%,#fff9ef 100%);border:2px solid var(--gold-bright);color:var(--navy);text-align:center}
.cta-box-label{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:10px}
.cta-box h3{font-family:var(--serif);font-size:21px;margin-bottom:10px;font-weight:600;color:var(--navy)}
.cta-box p{font-size:13.5px;color:var(--text-mid);margin-bottom:20px;line-height:1.6}
.cta-btn{display:inline-block;background:var(--navy);color:var(--gold-bright);border:2px solid var(--gold-bright);padding:12px 32px;text-decoration:none;font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;transition:all .18s}
.cta-btn:hover{background:var(--gold-bright);color:var(--navy)}
@media(max-width:700px){.bc,.article-wrap{padding-left:20px;padding-right:20px}.article-title{font-size:24px}}
</style>
<script src="/auth.js?v=2"></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=43" defer></script>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/thu-vien">Thư Viện</a><span>›</span>
  <a href="${hubUrl}">${esc(label)}</a><span>›</span>
  <span>${esc(row.ten)}</span>
</div>
<article class="article-wrap">
  <div class="article-meta">
    <span class="meta-loai">${esc(label)}</span>
    ${row.ten_han ? `<span class="meta-han">${esc(row.ten_han)}</span>` : ''}
  </div>
  <h1 class="article-title">${esc(row.ten)}</h1>
  ${row.tra_loi_ngan ? `<div class="tln-box">${esc(row.tra_loi_ngan)}</div>` : ''}
  <div class="article-body">${renderProse(row.than || '')}</div>
  ${faqHTML}
  ${relatedHTML}
  <div class="cta-box">
    <div class="cta-box-label">Tử Vi Minh Bảo</div>
    <h3>Xem Lá Số Của Bạn</h3>
    <p>Áp dụng kiến thức cổ pháp vào lá số cá nhân — luận giải chuyên sâu chi tiết 24 phần.</p>
    <a class="cta-btn" href="/">Xem Tử Vi →</a>
  </div>
</article>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
