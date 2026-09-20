// app/thu-vien/nguoi-cung-ngay-sinh/[ngay]/route.ts
// ============================================================
// Trang HUB theo NGÀY DƯƠNG LỊCH (366 trang tĩnh cố định: 01-01 → 12-31),
// KHÔNG phải một trang riêng cho từng người. 272.783 người trong
// `celeb_births` không đủ dày để đứng thành 272.783 trang riêng — thin
// content + index bloat chết chắc (đúng bẫy CLAUDE.md "seo-programmatic").
//
// Nguồn dữ liệu THUẦN TRUY VẤN, không LLM, không cron: `celeb_births.key_t0`
// (dạng "MM-DD", đã có sẵn index `celeb_births_t0_idx (key_t0, fame_score
// DESC) WHERE blocked=false`) — route này CHỈ lọc top N theo index có sẵn,
// không thêm cột/migration nào. `tra_loi_ngan`/FAQ là CHUỖI TEMPLATE ghép từ
// số liệu thật, không gọi model — khỏi tốn LLM cho 366 trang.
//
// `ngay` khớp NGUYÊN VĂN giá trị `key_t0` ("MM-DD", tháng trước ngày sau) —
// cố ý giữ đúng định dạng cột DB, không đảo thành "DD-MM" để tránh lỗi hoán
// đổi ngày/tháng khi đọc lại.
export const revalidate = 604800; // dữ liệu celeb_births gần như tĩnh — 7 ngày

import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';
import { celebPhoto } from '@/lib/celeb/photo';

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

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Toàn bộ 366 giá trị "MM-DD" hợp lệ, đúng thứ tự lịch — dùng để tính ngày
 * trước/sau (điều hướng) mà không cần Date object (né múi giờ/DST). */
const ALL_NGAY: string[] = (() => {
  const out: string[] = [];
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= MONTH_DAYS[m - 1]; d++) {
      out.push(`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
  }
  return out;
})();

function parseNgay(ngay: string): { m: number; d: number } | null {
  const mt = /^(\d{2})-(\d{2})$/.exec(ngay);
  if (!mt) return null;
  const m = Number(mt[1]);
  const d = Number(mt[2]);
  if (m < 1 || m > 12 || d < 1 || d > MONTH_DAYS[m - 1]) return null;
  return { m, d };
}

/** Cung hoàng đạo Tây phương theo ngày dương — bảng cố định, không suy đoán. */
const CUNG_HOANG_DAO: { ten: string; tu: [number, number]; den: [number, number] }[] = [
  { ten: 'Bạch Dương', tu: [3, 21], den: [4, 19] },
  { ten: 'Kim Ngưu', tu: [4, 20], den: [5, 20] },
  { ten: 'Song Tử', tu: [5, 21], den: [6, 20] },
  { ten: 'Cự Giải', tu: [6, 21], den: [7, 22] },
  { ten: 'Sư Tử', tu: [7, 23], den: [8, 22] },
  { ten: 'Xử Nữ', tu: [8, 23], den: [9, 22] },
  { ten: 'Thiên Bình', tu: [9, 23], den: [10, 22] },
  { ten: 'Bọ Cạp', tu: [10, 23], den: [11, 21] },
  { ten: 'Nhân Mã', tu: [11, 22], den: [12, 21] },
  { ten: 'Ma Kết', tu: [12, 22], den: [1, 19] },
  { ten: 'Bảo Bình', tu: [1, 20], den: [2, 18] },
  { ten: 'Song Ngư', tu: [2, 19], den: [3, 20] },
];

function zodiacOf(m: number, d: number): string {
  for (const c of CUNG_HOANG_DAO) {
    const [tm, td] = c.tu;
    const [dm, dd] = c.den;
    if (tm <= dm) {
      if ((m === tm && d >= td) || (m > tm && m < dm) || (m === dm && d <= dd)) return c.ten;
    } else {
      if ((m === tm && d >= td) || m > tm || m < dm || (m === dm && d <= dd)) return c.ten;
    }
  }
  return 'Không xác định';
}

interface Row {
  qid: string;
  name: string;
  occupation: string | null;
  country: string | null;
  wiki_url: string | null;
  image_file: string | null;
  image_url: string | null;
  birth_date: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ngay: string }> },
): Promise<Response> {
  const { ngay } = await params;
  const parsed = parseNgay(ngay);
  if (!parsed) return NextResponse.redirect(`${BASE}/thu-vien/nguoi-cung-ngay-sinh`);
  const { m, d } = parsed;

  const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const res = await fetch(
    `${SB_URL}/rest/v1/celeb_births` +
      `?key_t0=eq.${ngay}&blocked=is.false` +
      `&select=qid,name,occupation,country,wiki_url,image_file,image_url,birth_date` +
      `&order=fame_score.desc&limit=60`,
    { headers: { ...headers, Prefer: 'count=exact' }, cache: 'no-store' },
  );
  if (!res.ok) return NextResponse.redirect(`${BASE}/thu-vien/nguoi-cung-ngay-sinh`);
  const rows = (await res.json()) as Row[];
  const range = res.headers.get('content-range'); // "0-59/745"
  const tong = range ? parseInt(range.split('/')[1] || '0', 10) : rows.length;

  const { anhCho, commonsFilePage } = celebPhoto();
  const top3 = rows.slice(0, 3).map((r) => r.name);
  const cung = zodiacOf(m, d);
  const dmLabel = `${d} tháng ${m}`;

  const traLoiNgan = tong
    ? `Có ${tong} người nổi tiếng được ghi nhận sinh ngày ${d}/${m} (mọi năm), trong đó nổi bật nhất là ${top3.join(', ')}. Người sinh ngày này thuộc cung hoàng đạo ${cung} theo chiêm tinh phương Tây.`
    : `Chưa có dữ liệu người nổi tiếng sinh ngày ${d}/${m} trong kho. Người sinh ngày này thuộc cung hoàng đạo ${cung} theo chiêm tinh phương Tây.`;

  const cards = rows
    .map((r) => {
      const anh = anhCho(r);
      const year = r.birth_date ? r.birth_date.slice(0, 4) : '';
      const trangAnh = commonsFilePage(r.image_file);
      const anhTag = anh.url
        ? `<img class="pp-img" src="${esc(anh.url)}" alt="${esc(r.name)}" loading="lazy" width="120" height="120">`
        : `<div class="pp-img pp-img-ph">${esc(r.name.slice(0, 1))}</div>`;
      return `<a class="pp-card" href="${esc(r.wiki_url || trangAnh || '#')}" target="_blank" rel="noopener nofollow">
        ${anhTag}
        <div class="pp-name">${esc(r.name)}</div>
        <div class="pp-meta">${[r.occupation, r.country, year].filter(Boolean).map(esc).join(' · ')}</div>
      </a>`;
    })
    .join('');

  const idx = ALL_NGAY.indexOf(ngay);
  const prevNgay = ALL_NGAY[(idx - 1 + ALL_NGAY.length) % ALL_NGAY.length];
  const nextNgay = ALL_NGAY[(idx + 1) % ALL_NGAY.length];

  const faqs = [
    {
      q: `Ai là người nổi tiếng sinh ngày ${d}/${m}?`,
      a: tong
        ? `Có ${tong} người nổi tiếng được Wikidata ghi nhận sinh ngày ${d}/${m} (không phân biệt năm sinh), nổi bật nhất là ${top3.join(', ')}.`
        : `Hiện kho dữ liệu chưa có người nổi tiếng nào ghi nhận sinh ngày ${d}/${m}.`,
    },
    {
      q: `Sinh ngày ${d} tháng ${m} là cung hoàng đạo gì?`,
      a: `Người sinh ngày ${d}/${m} thuộc cung hoàng đạo ${cung} theo chiêm tinh phương Tây.`,
    },
    {
      q: `Cùng ngày sinh dương lịch có phải cùng lá số Tử Vi không?`,
      a: `Không. Tử Vi Đẩu Số an sao theo NGÀY GIỜ ÂM LỊCH, không phải ngày dương lịch — hai người cùng sinh nhật dương lịch nhưng khác năm sinh thường ra lá số khác nhau hoàn toàn. Muốn biết đúng cung Mệnh và sao chiếu của bạn, cần lập lá số theo đúng ngày giờ âm lịch.`,
    },
  ];

  const url = `${BASE}/thu-vien/nguoi-cung-ngay-sinh/${ngay}`;
  const hubUrl = `${BASE}/thu-vien/nguoi-cung-ngay-sinh`;
  const title = `Ai Sinh Ngày ${dmLabel}? ${tong} Người Nổi Tiếng Cùng Ngày Sinh | Tử Vi Minh Bảo`;
  const img = `${BASE}/api/og?${new URLSearchParams({ title: `Ngày ${dmLabel}`, sub: 'Người nổi tiếng cùng ngày sinh' }).toString()}`;

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Người nổi tiếng sinh ngày ${dmLabel}`,
      description: traLoiNgan,
      url,
      about: { '@type': 'Thing', name: `Ngày ${dmLabel} dương lịch` },
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: tong,
        itemListElement: rows.map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Person',
            name: r.name,
            ...(r.wiki_url ? { sameAs: r.wiki_url } : {}),
            ...(r.occupation ? { jobTitle: r.occupation } : {}),
          },
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Thư Viện', item: `${BASE}/thu-vien` },
        { '@type': 'ListItem', position: 3, name: 'Người Cùng Ngày Sinh', item: hubUrl },
        { '@type': 'ListItem', position: 4, name: `Ngày ${dmLabel}`, item: url },
      ],
    },
  ]);

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(traLoiNgan)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(traLoiNgan)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(traLoiNgan)}">
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
.article-wrap{flex:1;max-width:900px;margin:0 auto;padding:52px 40px 80px;width:100%}
.article-meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.meta-loai{font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold)}
.article-title{font-family:var(--serif);font-size:28px;color:var(--navy);font-weight:600;line-height:1.3;margin-bottom:20px}
.tln-box{background:var(--bg-soft);border-left:3px solid var(--gold-bright);padding:18px 22px;margin-bottom:32px;font-size:15.5px;line-height:1.7;color:var(--text-mid)}
.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-bottom:16px}
.pp-card{display:block;text-decoration:none;color:inherit;text-align:center}
.pp-img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;border:1px solid var(--border-lt);background:var(--bg-soft)}
.pp-img-ph{display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:32px;color:var(--gold);font-weight:600}
.pp-name{font-size:13px;font-weight:600;color:var(--navy);margin-top:7px;line-height:1.3}
.pp-meta{font-size:11.5px;color:var(--text-lt);margin-top:2px;line-height:1.3}
.pp-empty{text-align:center;color:var(--text-lt);font-size:14px;padding:40px 0}
.faq-wrap{margin-top:40px;padding-top:24px;border-top:1px solid var(--border-lt)}
.faq-title{font-family:var(--serif);font-size:19px;color:var(--navy);font-weight:600;margin-bottom:18px}
.faq-item{margin-bottom:16px}
.faq-q{font-size:14.5px;font-weight:600;color:var(--navy);margin-bottom:5px}
.faq-a{font-size:14px;color:var(--text-mid);line-height:1.6}
.day-nav{display:flex;justify-content:space-between;gap:12px;margin-top:36px;padding-top:24px;border-top:1px solid var(--border-lt)}
.day-nav a{font-size:13px;color:var(--navy);text-decoration:none;font-weight:600}
.day-nav a:hover{color:var(--gold)}
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
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=38" defer></script>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/thu-vien">Thư Viện</a><span>›</span>
  <a href="${hubUrl}">Người Cùng Ngày Sinh</a><span>›</span>
  <span>Ngày ${d}/${m}</span>
</div>
<article class="article-wrap">
  <div class="article-meta">
    <span class="meta-loai">Người Nổi Tiếng · Ngày ${d}/${m}</span>
  </div>
  <h1 class="article-title">Ai Sinh Ngày ${dmLabel}?</h1>
  <div class="tln-box">${esc(traLoiNgan)}</div>
  ${rows.length ? `<div class="pp-grid">${cards}</div>` : `<div class="pp-empty">Chưa có dữ liệu cho ngày này.</div>`}
  ${tong > rows.length ? `<p style="font-size:12.5px;color:var(--text-lt)">Hiện ${rows.length}/${tong} người nổi bật nhất theo mức độ nổi tiếng (Wikidata sitelinks).</p>` : ''}
  <div class="faq-wrap">
    <h2 class="faq-title">Câu Hỏi Thường Gặp</h2>
    ${faqs.map((f) => `<div class="faq-item"><div class="faq-q">${esc(f.q)}</div><div class="faq-a">${esc(f.a)}</div></div>`).join('')}
  </div>
  <div class="day-nav">
    <a href="${hubUrl}/${prevNgay}">← Ngày trước</a>
    <a href="${hubUrl}">Xem lịch cả năm</a>
    <a href="${hubUrl}/${nextNgay}">Ngày sau →</a>
  </div>
  <div class="cta-box">
    <div class="cta-box-label">Tử Vi Minh Bảo</div>
    <h3>Xem Lá Số Của Bạn</h3>
    <p>Ngày sinh dương lịch chỉ cho biết cung hoàng đạo — muốn biết cung Mệnh, chính tinh và vận trình thật, cần lập lá số theo đúng ngày giờ âm lịch.</p>
    <a class="cta-btn" href="/">Lập Lá Số →</a>
  </div>
</article>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
    },
  });
}
