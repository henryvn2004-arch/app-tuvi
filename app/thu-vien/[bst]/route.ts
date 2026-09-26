// app/thu-vien/[bst]/route.ts — hub cho MỘT bộ sưu tập của thu_vien_muc
// ('sao-cung' | 'khai-niem' | 'nap-am'). Chỉ đọc dòng publish_status=published
// — dòng draft (chưa qua cron đắp văn ở app/api/cron/thu-vien-build) không
// hiện ở đây, tránh lộ nội dung rỗng/chưa soát ra trang công khai.
export const revalidate = 3600;

import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';
import { PUBLISHED_ONLY } from '@/lib/content/publish-filter';

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

interface Row {
  slug: string;
  ten: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  xuong: any;
}

interface BstConfig {
  label: string;
  title: string;
  desc: string;
  /** Khoá trong `xuong` dùng để nhóm thẻ trên trang — mỗi bộ sưu tập một trục. */
  groupKey: (row: Row) => string;
  groupOrder?: string[];
}

const BST_CONFIG: Record<string, BstConfig> = {
  'sao-cung': {
    label: 'Sao × Cung',
    title: 'Sao An Tại Từng Cung',
    desc: 'Tra cứu ý nghĩa từng chính tinh khi an tại một cung cụ thể trong lá số — tổng hợp cách cục cổ văn ghi lại cho đúng tổ hợp đó.',
    groupKey: (r) => String(r.xuong?.sao || 'Khác'),
  },
  'khai-niem': {
    label: 'Khái Niệm',
    title: 'Khái Niệm Tử Vi & Huyền Học',
    desc: 'Thuật ngữ nền tảng của Tử Vi Đẩu Số, Bát Tự, Kỳ Môn Độn Giáp, Lục Nhâm và Hoàng lịch — giải thích ngắn gọn, có ví dụ.',
    groupKey: (r) => String(r.xuong?.nhom || 'Khác'),
  },
  'nap-am': {
    label: 'Nạp Âm',
    title: 'Nạp Âm Lục Thập Hoa Giáp',
    desc: '30 tên nạp âm, mỗi tên phủ 2 năm can chi liền kề trong chu kỳ 60 năm — ngũ hành và ý nghĩa của từng nạp âm.',
    groupKey: (r) => String(r.xuong?.hanh || 'Khác'),
    groupOrder: ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'],
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bst: string }> },
): Promise<Response> {
  const { bst } = await params;
  const cfg = BST_CONFIG[bst];
  if (!cfg) return NextResponse.redirect(`${BASE}/thu-vien`);

  const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const res = await fetch(
    `${SB_URL}/rest/v1/thu_vien_muc?bo_suu_tap=eq.${bst}&${PUBLISHED_ONLY}&select=slug,ten,xuong&order=ten.asc&limit=500`,
    { headers, cache: 'no-store' },
  );
  const rows: Row[] = res.ok ? await res.json() : [];

  const grouped: Record<string, Row[]> = {};
  for (const r of rows) {
    const g = cfg.groupKey(r);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(r);
  }
  const groupNames = cfg.groupOrder
    ? cfg.groupOrder.filter((g) => grouped[g]?.length)
    : Object.keys(grouped).sort((a, b) => a.localeCompare(b, 'vi'));

  const url = `${BASE}/thu-vien/${bst}`;
  const totalCount = rows.length;

  const bodyHTML = !rows.length
    ? `<div class="bst-empty">Nội dung bộ sưu tập này đang được biên soạn — quay lại sau nhé.</div>`
    : groupNames
        .map((g) => {
          const items = grouped[g];
          const cards = items
            .map((r) => `<a class="bst-card" href="/thu-vien/${bst}/${esc(r.slug)}">${esc(r.ten)}</a>`)
            .join('');
          return `<section class="bst-section">
        <h2 class="bst-sec-title">${esc(g)}</h2>
        <div class="bst-grid">${cards}</div>
      </section>`;
        })
        .join('');

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: cfg.title,
      description: cfg.desc,
      url,
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      hasDefinedTerm: rows.map((r) => ({
        '@type': 'DefinedTerm',
        name: r.ten,
        url: `${url}/${r.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Thư Viện', item: `${BASE}/thu-vien` },
        { '@type': 'ListItem', position: 3, name: cfg.label, item: url },
      ],
    },
  ]);

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(cfg.title)} | Thư Viện | Tử Vi Minh Bảo</title>
<meta name="description" content="${esc(cfg.desc)}">
<meta property="og:title" content="${esc(cfg.title)} — Tử Vi Minh Bảo">
<meta property="og:description" content="${esc(cfg.desc)}">
<meta property="og:image" content="${BASE}/seal.webp">
<meta property="og:url" content="${url}">
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
:root{--navy:#0F2A3D;--gold:#7C6942;--gold-bright:#C8A96A;--text:#1a1a1a;--text-mid:#4a4a4a;--text-lt:#6b6b6b;--border:#D8D4CB;--border-lt:#E8E8E8;--bg:#fff;--bg-soft:#F4F2EC;--serif:'Noto Serif',Georgia,serif}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;flex-direction:column;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px;align-items:center}
.bc a{color:var(--text-lt);text-decoration:none}.bc a:hover{color:var(--navy)}.bc span{color:var(--border)}
.bst-hero{background:var(--bg-soft);color:var(--navy);padding:56px 40px 40px;text-align:center;border-bottom:3px solid var(--gold-bright)}
.bst-hero-label{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
.bst-hero-title{font-family:var(--serif);font-size:32px;font-weight:600;margin-bottom:14px;line-height:1.25}
.bst-hero-desc{font-size:14.5px;color:var(--text-mid);max-width:600px;margin:0 auto 22px;line-height:1.7}
.bst-hero-count{display:inline-block;background:#F9F4EB;border:1px solid #e8d9b0;color:var(--gold);padding:7px 18px;font-size:12.5px;font-weight:600}
.bst-body{max-width:1000px;margin:0 auto;padding:44px 40px 80px;width:100%;flex:1}
.bst-section{margin-bottom:40px}
.bst-sec-title{font-family:var(--serif);font-size:18px;color:var(--navy);font-weight:600;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid var(--border-lt)}
.bst-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.bst-card{display:block;padding:12px 15px;background:var(--bg-soft);border:1px solid var(--border-lt);text-decoration:none;color:var(--navy);font-size:13.5px;font-weight:600;transition:all .12s}
.bst-card:hover{border-color:var(--gold);background:#fff;color:var(--gold)}
.bst-empty{text-align:center;color:var(--text-lt);font-size:14px;padding:40px 0}
@media(max-width:700px){.bc,.bst-hero,.bst-body{padding-left:20px;padding-right:20px}.bst-hero-title{font-size:26px}}
</style>
<script src="/auth.js?v=4"></script>
</head><body><div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=44" defer></script>
<div class="bc"><a href="/">Trang Chủ</a><span>›</span><a href="/thu-vien">Thư Viện</a><span>›</span><span>${esc(cfg.label)}</span></div>

<div class="bst-hero">
  <div class="bst-hero-label">Thư Viện</div>
  <h1 class="bst-hero-title">${esc(cfg.title)}</h1>
  <p class="bst-hero-desc">${esc(cfg.desc)}</p>
  ${totalCount > 0 ? `<span class="bst-hero-count">${totalCount} mục</span>` : ''}
</div>

<div class="bst-body">${bodyHTML}</div>

</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
