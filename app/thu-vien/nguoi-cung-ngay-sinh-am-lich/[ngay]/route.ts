// app/thu-vien/nguoi-cung-ngay-sinh-am-lich/[ngay]/route.ts
// ============================================================
// Trang HUB theo NGÀY ÂM LỊCH (360 trang tĩnh cố định: 12 tháng × 30 ngày —
// KHÔNG phân biệt tháng nhuận, xem chú thích cột `key_t0_am` trong migration
// `celeb_births_key_t0_am`), ảnh song sinh của
// app/thu-vien/nguoi-cung-ngay-sinh (dương lịch, xem file đó cho lý do KHÔNG
// mở trang riêng từng người trong 272.783 dòng celeb_births).
//
// `key_t0_am` = tháng-ngày ÂM LỊCH (vd "02-23"), phái sinh từ `key_t1`
// ("<canChi>|<thángAL>|<ngàyAL>") NGAY TRONG POSTGRES (generated column,
// stored, có index riêng) — bỏ can-chi năm để group được "cùng ngày âm bất
// kể năm nào", đúng cách key_t0 đang làm cho ngày dương. 0 LLM, 0 cron.
export const revalidate = 604800;

import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';
import { celebPhoto } from '@/lib/celeb/photo';
import { parseKeyT1 } from '@/lib/celeb/lunar-key';

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

const TEN_THANG_AM = [
  'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp',
];

/** Toàn bộ 360 giá trị "MM-DD" (12 tháng × 30 ngày) — dùng để tính ngày âm
 * trước/sau. Không có tháng nhuận trong danh sách (xem chú thích đầu file). */
const ALL_NGAY_AM: string[] = (() => {
  const out: string[] = [];
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 30; d++) {
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
  if (m < 1 || m > 12 || d < 1 || d > 30) return null;
  return { m, d };
}

/** Định dạng `birth_date` ("YYYY-MM-DD") thành "dd/mm/yyyy" bằng string,
 * không qua Date object — né lệch múi giờ khi parse chuỗi ISO. */
function formatDuong(birthDate: string): string {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate || '');
  if (!mt) return '';
  return `${Number(mt[3])}/${Number(mt[2])}/${mt[1]}`;
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
  key_t1: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ngay: string }> },
): Promise<Response> {
  const { ngay } = await params;
  const parsed = parseNgay(ngay);
  if (!parsed) return NextResponse.redirect(`${BASE}/thu-vien/nguoi-cung-ngay-sinh-am-lich`);
  const { m, d } = parsed;

  const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const res = await fetch(
    `${SB_URL}/rest/v1/celeb_births` +
      `?key_t0_am=eq.${ngay}&blocked=is.false` +
      `&select=qid,name,occupation,country,wiki_url,image_file,image_url,birth_date,key_t1` +
      `&order=fame_score.desc&limit=60`,
    { headers: { ...headers, Prefer: 'count=exact' }, cache: 'no-store' },
  );
  if (!res.ok) return NextResponse.redirect(`${BASE}/thu-vien/nguoi-cung-ngay-sinh-am-lich`);
  const rows = (await res.json()) as Row[];
  const range = res.headers.get('content-range');
  const tong = range ? parseInt(range.split('/')[1] || '0', 10) : rows.length;

  const { anhCho, commonsFilePage } = celebPhoto();
  const top3 = rows.slice(0, 3).map((r) => r.name);
  const dmLabel = `${d} tháng ${TEN_THANG_AM[m - 1]}`;

  const traLoiNgan = tong
    ? `Có ${tong} người nổi tiếng được ghi nhận sinh ngày ${d} tháng ${m} ÂM LỊCH (bất kể năm can chi), trong đó nổi bật nhất là ${top3.join(', ')}. Ngày âm này rơi vào các ngày dương lịch khác nhau tuỳ năm sinh — xem chi tiết từng người bên dưới.`
    : `Chưa có dữ liệu người nổi tiếng sinh ngày ${d} tháng ${m} âm lịch trong kho.`;

  const cards = rows
    .map((r) => {
      const anh = anhCho(r);
      const al = parseKeyT1(r.key_t1);
      const trangAnh = commonsFilePage(r.image_file);
      const anhTag = anh.url
        ? `<img class="pp-img" src="${esc(anh.url)}" alt="${esc(r.name)}" loading="lazy" width="120" height="120">`
        : `<div class="pp-img pp-img-ph">${esc(r.name.slice(0, 1))}</div>`;
      return `<a class="pp-card" href="${esc(r.wiki_url || trangAnh || '#')}" target="_blank" rel="noopener nofollow">
        ${anhTag}
        <div class="pp-name">${esc(r.name)}</div>
        <div class="pp-meta">${[r.occupation, r.country].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="pp-lunar">Dương lịch: ${esc(formatDuong(r.birth_date))}${al ? ` · Năm ${esc(al.canChi)}` : ''}</div>
      </a>`;
    })
    .join('');

  const idx = ALL_NGAY_AM.indexOf(ngay);
  const prevNgay = ALL_NGAY_AM[(idx - 1 + ALL_NGAY_AM.length) % ALL_NGAY_AM.length];
  const nextNgay = ALL_NGAY_AM[(idx + 1) % ALL_NGAY_AM.length];

  const faqs = [
    {
      q: `Ai là người nổi tiếng sinh ngày ${d} tháng ${m} âm lịch?`,
      a: tong
        ? `Có ${tong} người nổi tiếng được ghi nhận sinh ngày ${d} tháng ${m} âm lịch (không phân biệt năm can chi), nổi bật nhất là ${top3.join(', ')}.`
        : `Hiện kho dữ liệu chưa có người nổi tiếng nào ghi nhận sinh ngày ${d} tháng ${m} âm lịch.`,
    },
    {
      q: `Ngày ${d} tháng ${m} âm lịch tương ứng ngày dương lịch nào?`,
      a: `Vì âm lịch không cố định theo dương lịch mỗi năm, ngày ${d} tháng ${m} âm có thể rơi vào các ngày dương khác nhau tuỳ năm sinh — xem ngày dương lịch cụ thể của từng người trong danh sách bên dưới.`,
    },
    {
      q: `Cùng ngày âm lịch nhưng khác năm can chi thì lá số Tử Vi có giống nhau không?`,
      a: `Không hẳn. An sao Tử Vi Đẩu Số cần đúng CẢ can chi năm sinh lẫn giờ sinh — hai người cùng ngày âm nhưng khác năm (khác tuổi) hoặc khác giờ sinh vẫn ra lá số khác nhau. Cùng ngày âm lịch chỉ là bước gần hơn so với chỉ cùng ngày dương, chưa đủ để kết luận cùng lá số.`,
    },
  ];

  const url = `${BASE}/thu-vien/nguoi-cung-ngay-sinh-am-lich/${ngay}`;
  const hubUrl = `${BASE}/thu-vien/nguoi-cung-ngay-sinh-am-lich`;
  const title = `Ai Sinh Ngày ${dmLabel} Âm Lịch? ${tong} Người Nổi Tiếng | Tử Vi Minh Bảo`;
  const img = `${BASE}/api/og?${new URLSearchParams({ title: `Ngày ${dmLabel} âm lịch`, sub: 'Người nổi tiếng cùng ngày sinh' }).toString()}`;

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Người nổi tiếng sinh ngày ${dmLabel} âm lịch`,
      description: traLoiNgan,
      url,
      about: { '@type': 'Thing', name: `Ngày ${dmLabel} âm lịch` },
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
        { '@type': 'ListItem', position: 3, name: 'Người Cùng Ngày Sinh Âm Lịch', item: hubUrl },
        { '@type': 'ListItem', position: 4, name: `Ngày ${dmLabel} âm`, item: url },
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
.tln-box{background:var(--bg-soft);border-left:3px solid var(--gold-bright);padding:18px 22px;margin-bottom:16px;font-size:15.5px;line-height:1.7;color:var(--text-mid)}
.switch-cal{font-size:12.5px;color:var(--text-lt);margin-bottom:24px}
.switch-cal a{color:var(--navy);font-weight:600;text-decoration:none}
.switch-cal a:hover{color:var(--gold)}
.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-bottom:16px}
.pp-card{display:block;text-decoration:none;color:inherit;text-align:center}
.pp-img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;border:1px solid var(--border-lt);background:var(--bg-soft)}
.pp-img-ph{display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:32px;color:var(--gold);font-weight:600}
.pp-name{font-size:13px;font-weight:600;color:var(--navy);margin-top:7px;line-height:1.3}
.pp-meta{font-size:11.5px;color:var(--text-lt);margin-top:2px;line-height:1.3}
.pp-lunar{font-size:11px;color:var(--gold);margin-top:2px;line-height:1.3}
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
<script src="/auth.js?v=3"></script>
</head><body>
<div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=44" defer></script>
<div class="bc">
  <a href="/">Trang Chủ</a><span>›</span>
  <a href="/thu-vien">Thư Viện</a><span>›</span>
  <a href="${hubUrl}">Người Cùng Ngày Sinh Âm Lịch</a><span>›</span>
  <span>Ngày ${d}/${m} âm</span>
</div>
<article class="article-wrap">
  <div class="article-meta">
    <span class="meta-loai">Người Nổi Tiếng · Âm Lịch ${d}/${m}</span>
  </div>
  <h1 class="article-title">Ai Sinh Ngày ${dmLabel} Âm Lịch?</h1>
  <div class="tln-box">${esc(traLoiNgan)}</div>
  <p class="switch-cal">Đang tra theo ngày <b>âm lịch</b>. Muốn tra theo <a href="${BASE}/thu-vien/nguoi-cung-ngay-sinh">ngày dương lịch</a> thay vào đó?</p>
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
    <p>Cùng ngày âm lịch mới chỉ gần đúng — muốn biết chính xác cung Mệnh, chính tinh và vận trình, cần lập lá số theo đúng ngày giờ và NĂM can chi của bạn.</p>
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
