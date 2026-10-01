// app/nghiem-chung/route.ts — hub mục Nghiệm Chứng: danh sách hồ sơ lá số
// người nổi tiếng đối chiếu với đời thật. Đọc thẳng HO_SO (lib/nghiem-chung),
// số khớp/trượt đếm bằng `dem()` — cùng hàm trang chi tiết dùng.
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';
import { celebPhoto } from '@/lib/celeb/photo';
import { HO_SO, dem } from '@/lib/nghiem-chung';

const BASE = 'https://www.tuviminhbao.com';

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(): Promise<Response> {
  const url = `${BASE}/nghiem-chung`;
  const title = 'Nghiệm Chứng: Lá Số Tử Vi Người Nổi Tiếng Đối Chiếu Đời Thật | Tử Vi Minh Bảo';
  const desc =
    'Lá số Tử Vi của người nổi tiếng có giờ sinh kiểm chứng, đặt cạnh cuộc đời thật của họ — từng mục khớp, khớp một phần và trượt đều được ghi rõ, có nguồn.';
  const { commonsThumb } = celebPhoto();

  const cards = HO_SO.map((h) => {
    const bm = dem(h.banMenh);
    const dv = dem(h.daiVan);
    const anh = h.anhCommons ? commonsThumb(h.anhCommons, 240) : null;
    return `<a class="card" href="/nghiem-chung/${esc(h.slug)}">
  ${anh ? `<img src="${esc(anh)}" alt="${esc(h.ten)}" width="72" height="72" loading="lazy">` : `<div class="ph">${esc(h.ten.slice(0, 1))}</div>`}
  <div>
    <div class="nm">Lá số Tử Vi ${esc(h.ten)}</div>
    <div class="mt">${esc(h.ngheNghiep)} · sinh ${esc(h.sinh.ngay.slice(0, 4))}</div>
    <div class="st"><span>Con người: khớp ${bm.tyLe == null ? '—' : bm.tyLe + '%'}</span><span>Đại vận: khớp ${dv.tyLe == null ? '—' : dv.tyLe + '%'}</span></div>
  </div>
</a>`;
  }).join('');

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Nghiệm Chứng — lá số Tử Vi người nổi tiếng đối chiếu đời thật',
      description: desc,
      url,
      inLanguage: 'vi',
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: HO_SO.length,
        itemListElement: HO_SO.map((h, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${url}/${h.slug}`,
          name: `Lá số Tử Vi ${h.ten}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Nghiệm Chứng', item: url },
      ],
    },
  ]).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
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
:root{--navy:#0F2A3D;--gold:#7C6942;--gold-b:#C8A96A;--mid:#444;--lt:#6b6b6b;--border:#D8D4CB;--blt:#E8E4DA;--soft:#F7F5EF;--serif:'Noto Serif',Georgia,serif}
body{font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.bc{background:var(--soft);border-bottom:1px solid var(--border);padding:12px 40px;font-size:12px;color:var(--lt);display:flex;gap:8px}
.bc a{color:var(--lt);text-decoration:none}.bc span{color:var(--border)}
.wrap{max-width:900px;margin:0 auto;padding:44px 40px 80px}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:2.4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
h1{font-family:var(--serif);font-size:32px;color:var(--navy);font-weight:600;line-height:1.25;margin-bottom:12px}
.lede{color:var(--mid);margin-bottom:28px;max-width:680px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.card{display:grid;grid-template-columns:72px 1fr;gap:14px;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--blt);border-radius:14px;padding:14px;background:#fff}
.card:hover{border-color:var(--gold-b)}
.card img,.ph{width:72px;height:72px;border-radius:10px;object-fit:cover;object-position:top;background:var(--soft)}
.ph{display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:28px;color:var(--gold)}
.nm{font-weight:600;color:var(--navy);line-height:1.3}
.mt{font-size:12.5px;color:var(--lt);margin-top:2px}
.st{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.st span{font-size:11.5px;background:var(--soft);border-radius:999px;padding:2px 9px;color:var(--mid)}
.how{margin-top:40px;background:var(--soft);border-left:3px solid var(--gold-b);padding:16px 20px;font-size:14.5px;color:var(--mid)}
.how a{color:var(--navy);font-weight:600}
@media(max-width:700px){.bc,.wrap{padding-left:16px;padding-right:16px}h1{font-size:25px}.grid{grid-template-columns:1fr}}
</style>
<script src="/auth.js?v=6"></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=45" defer></script>
<nav class="bc" aria-label="Breadcrumb"><a href="/">Trang Chủ</a><span>›</span><span>Nghiệm Chứng</span></nav>
<main class="wrap">
  <div class="eyebrow">Nghiệm Chứng</div>
  <h1>Lá số Tử Vi người nổi tiếng, đặt cạnh cuộc đời thật</h1>
  <p class="lede">Mỗi hồ sơ lấy một người có giờ sinh đã kiểm chứng, lập lá số theo cổ pháp rồi đối chiếu từng nhận định với những gì thực sự xảy ra trong đời họ. Chỗ khớp và chỗ trượt đều được ghi rõ, kèm nguồn.</p>
  <div class="grid">${cards}</div>
  <div class="how">Lá số được chấm trước, đời thật đặt sau — không chỉnh lá số cho vừa sự kiện. <a href="/phuong-phap">Xem phương pháp</a>.</div>
</main>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
