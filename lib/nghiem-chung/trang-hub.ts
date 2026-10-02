// lib/nghiem-chung/trang-hub.ts — hub cho CẢ HAI mục (/nghiem-chung, /xac-dinh-gio-sinh); trước là hub mục Nghiệm Chứng: danh sách hồ sơ lá số
// người nổi tiếng đối chiếu với đời thật. Đọc thẳng HO_SO (lib/nghiem-chung),
// số khớp/trượt đếm bằng `dem()` — cùng hàm trang chi tiết dùng.
import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';
import { celebPhoto } from '@/lib/celeb/photo';
import { danhMuc } from '@/lib/nghiem-chung/store';
import type { Muc } from '@/lib/nghiem-chung/trang-ho-so';

const MOI_TRANG = 48;

const BASE = 'https://www.tuviminhbao.com';

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CHU = {
  'nghiem-chung': {
    ten: 'Nghiệm Chứng',
    title: 'Nghiệm Chứng: Lá Số Tử Vi Người Nổi Tiếng Đối Chiếu Đời Thật | Tử Vi Minh Bảo',
    desc: 'Lá số Tử Vi của người nổi tiếng có giờ sinh kiểm chứng, đặt cạnh cuộc đời thật của họ — từng mục khớp, khớp một phần và trượt đều được ghi rõ, có nguồn.',
    h1: 'Lá số Tử Vi người nổi tiếng, đặt cạnh cuộc đời thật',
    lede: 'Mỗi hồ sơ lấy một người có giờ sinh đã kiểm chứng, lập lá số theo cổ pháp rồi đối chiếu từng nhận định với những gì thực sự xảy ra trong đời họ. Chỗ khớp và chỗ trượt đều được ghi rõ, kèm nguồn.',
    the: 'Lá số Tử Vi',
    how: 'Lá số được chấm trước, đời thật đặt sau — không chỉnh lá số cho vừa sự kiện. <a href="/phuong-phap">Xem phương pháp</a>. Người chưa công bố giờ sinh: <a href="/xac-dinh-gio-sinh">Xác định giờ sinh qua 12 lá số</a>.',
  },
  'xac-dinh-gio-sinh': {
    ten: 'Xác Định Giờ Sinh',
    title: 'Xác Định Giờ Sinh Người Nổi Tiếng Theo Tử Vi: 12 Lá Số, Giờ Nào Khớp Đời Nhất | Tử Vi Minh Bảo',
    desc: 'Người nổi tiếng chưa công bố giờ sinh: lập đủ 12 lá số theo 12 canh giờ, đối chiếu với cuộc đời thật để tìm giờ khớp nhất. Ghi rõ đây là giờ xác định, không phải giờ khai sinh, kèm điểm từng giờ và nguồn.',
    h1: 'Người nổi tiếng sinh giờ nào? Tử Vi xác định qua 12 lá số',
    lede: 'Với người chưa công bố giờ sinh, hệ thống lập đủ 12 lá số theo 12 canh giờ rồi chấm xem lá số giờ nào khớp cuộc đời thật nhất — nặng nhất là các đại vận có rơi đúng giai đoạn thăng trầm hay không. Kết quả là giờ do hệ thống xác định (không phải giờ khai sinh), ghi rõ độ tin cậy.',
    the: 'Giờ sinh',
    how: 'Giờ được xác định bằng cách đối chiếu với chính đời thật, nên đây không phải phép thử độc lập. Muốn xem lá số người có giờ sinh kiểm chứng đặt cạnh đời thật: <a href="/nghiem-chung">Nghiệm Chứng</a>.',
  },
};

export async function trangHub(req: NextRequest, muc: Muc): Promise<Response> {
  const C = CHU[muc];
  const dm = danhMuc().filter((x) => !!x.gioDoan === (muc === 'xac-dinh-gio-sinh'));
  const soTrang = Math.max(1, Math.ceil(dm.length / MOI_TRANG));
  const trang = Math.min(soTrang, Math.max(1, Number(req.nextUrl.searchParams.get('trang')) || 1));
  const items = dm.slice((trang - 1) * MOI_TRANG, trang * MOI_TRANG);
  const hubUrl = `${BASE}/${muc}`;
  const url = trang > 1 ? `${hubUrl}?trang=${trang}` : hubUrl;
  const { title, desc } = C;
  const { commonsThumb } = celebPhoto();

  const cards = items.map((h) => {
    const anh = h.anhCommons ? commonsThumb(h.anhCommons, 240) : null;
    return `<a class="card" href="/${muc}/${esc(h.slug)}">
  ${anh ? `<img src="${esc(anh)}" alt="${esc(h.ten)}" width="72" height="72" loading="lazy" referrerpolicy="no-referrer">` : `<div class="ph">${esc(h.ten.slice(0, 1))}</div>`}
  <div>
    <div class="nm">${C.the} ${esc(h.ten)}</div>
    <div class="mt">${esc(h.ngheNghiep)} · sinh ${h.namSinh}</div>
    <div class="st">${h.gioDoan ? `<span>Xác định giờ sinh: giờ ${esc(h.gioDoan)}</span>` : `<span>Con người: khớp ${h.tyLeBM == null ? '—' : h.tyLeBM + '%'}</span><span>Đại vận: khớp ${h.tyLeDV == null ? '—' : h.tyLeDV + '%'}</span>`}</div>
  </div>
</a>`;
  }).join('');

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: C.title.split(' | ')[0],
      description: desc,
      url,
      inLanguage: 'vi',
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: dm.length,
        itemListElement: items.map((h, i) => ({
          '@type': 'ListItem',
          position: (trang - 1) * MOI_TRANG + i + 1,
          url: `${hubUrl}/${h.slug}`,
          name: `${C.the} ${h.ten}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: C.ten, item: hubUrl },
      ],
    },
  ]).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(trang > 1 ? title.replace(' | ', ` — trang ${trang} | `) : title)}</title>
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
.pg{display:flex;justify-content:space-between;align-items:center;margin-top:24px;font-size:14px;color:var(--lt)}.pg a{color:var(--navy);font-weight:600;text-decoration:none}
.how{margin-top:40px;background:var(--soft);border-left:3px solid var(--gold-b);padding:16px 20px;font-size:14.5px;color:var(--mid)}
.how a{color:var(--navy);font-weight:600}
@media(max-width:700px){.bc,.wrap{padding-left:16px;padding-right:16px}h1{font-size:25px}.grid{grid-template-columns:1fr}}
</style>
<script src="/auth.js?v=6"></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=47" defer></script>
<nav class="bc" aria-label="Breadcrumb"><a href="/">Trang Chủ</a><span>›</span><span>${C.ten}</span></nav>
<main class="wrap">
  <div class="eyebrow">${C.ten}</div>
  <h1>${C.h1}</h1>
  <p class="lede">${C.lede}</p>
  <p class="lede" style="margin-top:-14px">${dm.length.toLocaleString('vi-VN')} hồ sơ${soTrang > 1 ? ` · trang ${trang}/${soTrang}` : ''}</p>
  <div class="grid">${cards}</div>
  ${
    soTrang > 1
      ? `<nav class="pg" aria-label="Phân trang">${trang > 1 ? `<a href="/${muc}${trang > 2 ? `?trang=${trang - 1}` : ''}">← Trang trước</a>` : '<span></span>'}<span>${trang}/${soTrang}</span>${trang < soTrang ? `<a href="/${muc}?trang=${trang + 1}">Trang sau →</a>` : '<span></span>'}</nav>`
      : ''
  }
  <div class="how">${C.how}</div>
</main>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
