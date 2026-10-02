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

// Tìm kiếm + lọc chữ cái chạy phía SERVER (?q= · ?chu=) — không cần JS, chạy được với hàng nghìn hồ sơ,
// và trang chữ cái là URL thật cho máy tìm kiếm đọc. So khớp bỏ dấu (đ → d).
const khongDau = (s: string) =>
  s
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const CHU_CAI = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const chuDau = (ten: string) => {
  const c = khongDau(ten).trim().charAt(0).toUpperCase();
  return CHU_CAI.includes(c) ? c : '#';
};

export async function trangHub(req: NextRequest, muc: Muc): Promise<Response> {
  const C = CHU[muc];
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim().slice(0, 60);
  const chuRaw = (sp.get('chu') || '').toUpperCase();
  const chu = CHU_CAI.includes(chuRaw) || chuRaw === '#' ? chuRaw : '';
  const tatCa = danhMuc()
    .filter((x) => !!x.gioDoan === (muc === 'xac-dinh-gio-sinh'))
    .sort((a, b) => khongDau(a.ten).localeCompare(khongDau(b.ten)));
  const soTheoChu = new Map<string, number>();
  for (const x of tatCa) soTheoChu.set(chuDau(x.ten), (soTheoChu.get(chuDau(x.ten)) || 0) + 1);
  let dm = chu ? tatCa.filter((x) => chuDau(x.ten) === chu) : tatCa;
  if (q) {
    const k = khongDau(q);
    dm = dm.filter((x) => khongDau(`${x.ten} ${x.ngheNghiep}`).includes(k));
  }
  const soTrang = Math.max(1, Math.ceil(dm.length / MOI_TRANG));
  const trang = Math.min(soTrang, Math.max(1, Number(sp.get('trang')) || 1));
  const items = dm.slice((trang - 1) * MOI_TRANG, trang * MOI_TRANG);
  const hubUrl = `${BASE}/${muc}`;
  /** Link giữ nguyên bộ lọc đang chọn; `undefined` = giữ, `''` = bỏ. */
  const lien = (o: { q?: string; chu?: string; trang?: number }) => {
    const u = new URLSearchParams();
    const qq = o.q ?? q;
    const cc = o.chu ?? chu;
    if (qq) u.set('q', qq);
    if (cc) u.set('chu', cc);
    if (o.trang && o.trang > 1) u.set('trang', String(o.trang));
    const t = u.toString();
    return `/${muc}${t ? `?${t}` : ''}`;
  };
  const url = `${BASE}${lien({ q: '', trang })}`;
  // Số trang: 1 … (trang-2..trang+2) … cuối — đủ gọn khi kho lên hàng nghìn hồ sơ.
  const soHien = [...new Set([1, trang - 2, trang - 1, trang, trang + 1, trang + 2, soTrang])]
    .filter((n) => n >= 1 && n <= soTrang)
    .sort((x, y) => x - y);
  const pager = `<nav class="pg" aria-label="Phân trang">${trang > 1 ? `<a href="${esc(lien({ trang: trang - 1 }))}" rel="prev">← Trước</a>` : '<span></span>'}<span class="so">${soHien
    .map((n, i) => `${i && n - soHien[i - 1] > 1 ? '<span class="gap">…</span>' : ''}${n === trang ? `<b>${n}</b>` : `<a href="${esc(lien({ trang: n }))}">${n}</a>`}`)
    .join('')}</span>${trang < soTrang ? `<a href="${esc(lien({ trang: trang + 1 }))}" rel="next">Sau →</a>` : '<span></span>'}</nav>`;
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
<meta name="robots" content="${q ? 'noindex, follow' : 'index, follow'}">
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
.tim{display:flex;gap:8px;margin:0 0 14px}.tim input{flex:1;min-width:0;font:inherit;font-size:15px;padding:11px 14px;border:1px solid var(--border);border-radius:10px;background:#fff;color:inherit}.tim input:focus{outline:2px solid var(--gold-b);outline-offset:1px}.tim button{font:inherit;font-weight:600;font-size:14px;padding:0 18px;border:0;border-radius:10px;background:var(--navy);color:#fff;cursor:pointer}
.az{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 22px}.az a,.az span{min-width:32px;height:32px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none}.az a{color:var(--navy);background:var(--soft);border:1px solid var(--blt)}.az a:hover{border-color:var(--gold-b)}.az a.on{background:var(--navy);color:#fff;border-color:var(--navy)}.az span{color:#c4beb2;border:1px dashed var(--blt)}
.rong{padding:28px;text-align:center;color:var(--lt);background:var(--soft);border-radius:14px}.rong a{color:var(--navy);font-weight:600}
.pg .so{display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:center}.pg .so a,.pg .so b{min-width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px}.pg .so a{background:var(--soft);border:1px solid var(--blt)}.pg .so b{background:var(--navy);color:#fff}.pg .gap{color:var(--lt);padding:0 2px}
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
  <form class="tim" action="/${muc}" method="get" role="search">
    <input type="search" name="q" value="${esc(q)}" placeholder="Tìm theo tên hoặc nghề nghiệp…" aria-label="Tìm người nổi tiếng" autocomplete="off">
    ${chu ? `<input type="hidden" name="chu" value="${esc(chu)}">` : ''}
    <button type="submit">Tìm</button>
  </form>
  <nav class="az" aria-label="Lọc theo chữ cái đầu">
    <a href="${lien({ chu: '', trang: 1 })}"${chu ? '' : ' class="on"'}>Tất cả</a>
    ${[...CHU_CAI, '#'].map((c) => (soTheoChu.get(c) ? `<a href="${esc(lien({ chu: c, trang: 1 }))}"${c === chu ? ' class="on"' : ''}>${c}</a>` : `<span aria-hidden="true">${c}</span>`)).join('')}
  </nav>
  <p class="lede" style="margin:-8px 0 18px">${q || chu ? `${dm.length.toLocaleString('vi-VN')} / ${tatCa.length.toLocaleString('vi-VN')} hồ sơ${q ? ` khớp “${esc(q)}”` : ''}${chu ? ` · chữ ${esc(chu)}` : ''}` : `${tatCa.length.toLocaleString('vi-VN')} hồ sơ, xếp theo tên A–Z`}${soTrang > 1 ? ` · trang ${trang}/${soTrang}` : ''}</p>
  ${items.length ? `<div class="grid">${cards}</div>` : `<div class="rong">Chưa có hồ sơ nào khớp. <a href="/${muc}">Xem tất cả</a></div>`}
  ${
    soTrang > 1
      ? pager
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
