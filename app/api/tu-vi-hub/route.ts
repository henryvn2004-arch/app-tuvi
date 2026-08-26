// app/api/tu-vi-hub/route.ts
// Category hub pages: /phong-thuy, /xem-tuong, /chon-ngay, /lam-dep, /dat-ten, /kien-thuc-tuvi
export const maxDuration = 15;
import { NextRequest, NextResponse } from 'next/server';
import { ORG_ID } from '@/lib/seo/entity';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const BASE_URL = 'https://www.tuviminhbao.com';

const CAT_META: Record<string, { title: string; desc: string; h1: string; icon: string; cats: string[] }> = {
  'phong-thuy': {
    icon: '🧭',
    title: 'Phong Thủy Theo Mệnh & Tuổi — Hướng Nhà, Màu Sắc, Số Nhà Hợp',
    desc: 'Xem phong thủy theo mệnh ngũ hành: hướng nhà hợp tuổi, màu sắc tốt, số nhà may mắn, bài trí phòng ngủ, bếp, văn phòng. Tổng hợp kiến thức phong thủy đầy đủ.',
    h1: 'Phong Thủy Theo Mệnh & Tuổi',
    cats: ['phong-thuy'],
  },
  'xem-tuong': {
    icon: '👁️',
    title: 'Xem Tướng Số — Tướng Mặt, Mắt, Mũi, Nốt Ruồi, Chỉ Tay',
    desc: 'Luận giải nhân tướng học: tướng khuôn mặt, tướng mắt, tướng mũi, tướng môi, tướng tai, lông mày, nốt ruồi và chỉ tay. Khám phá vận mệnh qua tướng số.',
    h1: 'Xem Tướng Số — Nhân Tướng Học Toàn Diện',
    cats: ['xem-tuong'],
  },
  'chon-ngay': {
    icon: '📅',
    title: 'Chọn Ngày Tốt — Cưới Hỏi, Khai Trương, Làm Nhà, Xuất Hành',
    desc: 'Tổng hợp ngày tốt theo lịch vạn niên: cưới hỏi, khai trương, làm nhà, xuất hành, ký hợp đồng, chuyển nhà. Ngày Hoàng Đạo và giờ tốt theo tháng.',
    h1: 'Chọn Ngày Tốt Theo Lịch Vạn Niên',
    cats: ['chon-ngay'],
  },
  'lam-dep': {
    icon: '💄',
    title: 'Làm Đẹp Theo Mệnh — Màu Tóc, Son, Đá Phong Thủy, Nước Hoa',
    desc: 'Tư vấn làm đẹp theo ngũ hành: màu tóc hợp mệnh, màu son hợp tuổi, đá phong thủy, trang sức và nước hoa theo mệnh. Đẹp và hợp phong thủy.',
    h1: 'Làm Đẹp Theo Mệnh & Ngũ Hành',
    cats: ['lam-dep'],
  },
  'dat-ten': {
    icon: '✍️',
    title: 'Đặt Tên Con, Tên Công Ty Theo Mệnh & Ngũ Hành',
    desc: 'Gợi ý tên đẹp cho con trai, con gái theo mệnh ngũ hành. Tên hợp tuổi cha mẹ, tên đẹp theo họ, và đặt tên công ty theo phong thủy.',
    h1: 'Đặt Tên Con & Tên Công Ty Theo Ngũ Hành',
    cats: ['dat-ten'],
  },
  'kien-thuc-tuvi': {
    icon: '⭐',
    title: 'Kiến Thức Tử Vi Đẩu Số — Ý Nghĩa Sao, Cung, Vận Hạn',
    desc: 'Tra cứu kiến thức Tử Vi Đẩu Số: ý nghĩa 14 chính tinh, 12 cung mệnh, vận hạn theo năm, tương hợp hôn nhân và làm ăn theo tuổi. Tài liệu tử vi đầy đủ.',
    h1: 'Kiến Thức Tử Vi Đẩu Số',
    cats: ['tu-vi-nam-sinh','y-nghia-sao','van-han','tuong-hop-hon-nhan','tuong-hop-lam-an'],
  },
};

const CAT_LABEL: Record<string, string> = {
  'tu-vi-nam-sinh': 'Tử Vi Theo Năm Sinh',
  'y-nghia-sao': 'Ý Nghĩa Sao',
  'van-han': 'Vận Hạn Theo Năm',
  'tuong-hop-hon-nhan': 'Tương Hợp Hôn Nhân',
  'tuong-hop-lam-an': 'Tương Hợp Làm Ăn',
  'phong-thuy': 'Phong Thủy',
  'xem-tuong': 'Xem Tướng',
  'chon-ngay': 'Chọn Ngày',
  'lam-dep': 'Làm Đẹp',
  'dat-ten': 'Đặt Tên',
};

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

interface HubPaging {
  page: number;
  totalPages: number;
  totals: Record<string, number>;
}

/** Dải số trang quanh trang hiện tại + luôn có trang đầu/cuối, tránh in 59 số. */
function pageWindow(page: number, totalPages: number): number[] {
  const out = new Set<number>([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) out.add(p);
  return [...out].sort((a, b) => a - b);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHub(cat: string, meta: typeof CAT_META[string], pages: any[], paging: HubPaging) {
  const base = `${BASE_URL}/${cat}`;
  /** Trang 1 = URL gốc (không có /trang/1) để khỏi đẻ ra hai URL cùng nội dung. */
  const pageUrl = (p: number) => (p === 1 ? base : `${base}/trang/${p}`);
  // Trang 2+ tự trỏ canonical về CHÍNH nó, không gộp về trang 1: gộp thì Google
  // coi 58 trang kia là bản sao của trang 1 và bỏ qua toàn bộ liên kết trên đó —
  // đúng thứ đang cần chúng mang.
  const url = pageUrl(paging.page);
  const grouped: Record<string, typeof pages> = {};
  for (const p of pages) {
    const g = p.category || 'other';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  }

  // Duyệt theo THỨ TỰ KHAI trong meta.cats, không theo thứ tự dữ liệu trả về:
  // chuyên mục hết bài ở trang cuối vẫn giữ đúng chỗ, không nhảy lung tung giữa
  // các trang.
  const gridHtml = meta.cats
    .filter((grpCat) => (grouped[grpCat] || []).length > 0)
    .map((grpCat) => {
      const grpPages = grouped[grpCat];
      const total = paging.totals[grpCat] || grpPages.length;
      return `
    <section class="hub-section">
      <h2 class="hub-section-title">${esc(CAT_LABEL[grpCat] || grpCat)} <span class="hub-count">${total} bài</span></h2>
      <div class="hub-grid">
        ${grpPages.map((p: any) => `
          <a class="hub-card" href="${BASE_URL}/tu-vi/${esc(p.slug)}">
            <div class="hub-card-title">${esc(p.h1 || p.title)}</div>
            <div class="hub-card-meta">${esc((p.meta_description||'').slice(0,80))}…</div>
          </a>`).join('')}
      </div>
    </section>`;
    })
    .join('');

  const pagerHtml = paging.totalPages > 1 ? `
    <nav class="hub-pager" aria-label="Phân trang">
      ${paging.page > 1 ? `<a class="pg" href="${pageUrl(paging.page - 1)}" rel="prev">‹ Trước</a>` : ''}
      ${pageWindow(paging.page, paging.totalPages).map((p) =>
        p === paging.page
          ? `<span class="pg pg-cur">${p}</span>`
          : `<a class="pg" href="${pageUrl(p)}">${p}</a>`,
      ).join('')}
      ${paging.page < paging.totalPages ? `<a class="pg" href="${pageUrl(paging.page + 1)}" rel="next">Sau ›</a>` : ''}
    </nav>
    <p class="hub-more">Trang ${paging.page} / ${paging.totalPages}</p>` : '';

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.desc,
    url,
    publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE_URL },
  });

  return `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(meta.title)} — Tử Vi Minh Bảo</title>
<meta name="description" content="${esc(meta.desc)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:image" content="${BASE_URL}/seal.webp">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet"></noscript>
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--purple:#8b6dff;--text:#1a1a1a;--bg:#fff;--bg-soft:#F5F4F0;--border:#e8e8e8}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text)}
.breadcrumb{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:10px 40px;font-size:12px;color:#888}
.breadcrumb a{color:#888;text-decoration:none}.breadcrumb a:hover{color:var(--navy)}
.hub-hero{background:linear-gradient(135deg,#061A2E 0%,#0D3B5E 100%);color:#fff;padding:48px 40px 40px;text-align:center}
.hub-hero-icon{font-size:40px;margin-bottom:12px}
.hub-hero h1{font-family:'Noto Serif',serif;font-size:30px;font-weight:600;margin-bottom:12px}
.hub-hero p{font-size:14px;opacity:.8;max-width:600px;margin:0 auto 24px;line-height:1.7}
.hub-hero-cta{display:inline-block;background:var(--purple);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
.hub-wrap{max-width:1100px;margin:0 auto;padding:40px 24px 80px}
.hub-section{margin-bottom:48px}
.hub-section-title{font-family:'Noto Serif',serif;font-size:18px;color:var(--navy);margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid var(--border);display:flex;align-items:center;gap:12px}
.hub-count{font-size:11px;font-weight:400;background:#f0f0f0;color:#888;padding:2px 8px;border-radius:20px;font-family:'Be Vietnam Pro',sans-serif}
.hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}
.hub-card{display:block;padding:12px 14px;border:1px solid var(--border);border-radius:8px;text-decoration:none;color:var(--text);transition:all .15s}
.hub-card:hover{border-color:var(--purple);box-shadow:0 2px 10px rgba(139,109,255,.12);transform:translateY(-1px)}
.hub-card-title{font-size:13px;font-weight:500;color:var(--navy);margin-bottom:4px;line-height:1.4}
.hub-card-meta{font-size:11px;color:#999;line-height:1.4}
.hub-more{font-size:13px;color:#999;margin-top:10px;font-style:italic;text-align:center}
.hub-pager{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:32px}
.pg{display:inline-block;min-width:34px;text-align:center;padding:7px 10px;border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--navy);font-size:13px}
.pg:hover{border-color:var(--purple)}
.pg-cur{background:var(--navy);color:#fff;border-color:var(--navy)}
@media(max-width:700px){.hub-hero,.breadcrumb{padding-left:16px;padding-right:16px}.hub-wrap{padding:24px 12px 60px}.hub-grid{grid-template-columns:1fr}.hub-hero h1{font-size:22px}}
</style>
<script src="/auth.js"></script>
</head>
<body>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=24"></script>
<div class="breadcrumb"><a href="/">Trang Chủ</a> › <span>${esc(meta.h1)}</span></div>
<div class="hub-hero">
  <div class="hub-hero-icon"><span class="ic-inline" data-icon-emoji="${meta.icon}" style="display:inline-flex;width:1em;height:1em;vertical-align:-2px;color:#9A7B3A">${meta.icon}</span></div>
  <h1>${esc(meta.h1)}</h1>
  <p>${esc(meta.desc)}</p>
  <a class="hub-hero-cta" href="/">Xem Tử Vi Của Bạn →</a>
</div>
<div class="hub-wrap">${gridHtml}${pagerHtml}</div>
<script src="/footer.js"></script>
</body></html>`;
}

// Số liên kết hiển thị cho MỖI chuyên mục trên MỖI trang hub. Giữ đúng 60 như
// bản cũ (mật độ hiển thị không đổi) — cái đổi là 60 tiếp theo nay đi sang trang
// 2 chứ không biến mất.
const PER_CAT = 60;

/** Đếm chính xác số bài mỗi chuyên mục (`count=exact`, không tải dòng nào). */
async function countCat(c: string): Promise<number> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/seo_pages?category=eq.${encodeURIComponent(c)}&select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: 'count=exact',
          Range: '0-0',
        },
        cache: 'no-store',
      },
    );
    // content-range: "0-0/3540"
    const total = Number((res.headers.get('content-range') || '').split('/')[1]);
    return Number.isFinite(total) ? total : 0;
  } catch {
    return 0;
  }
}

/** Lấy đúng một lát của MỘT chuyên mục. */
async function fetchCatSlice(c: string, offset: number): Promise<unknown[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/seo_pages?category=eq.${encodeURIComponent(c)}` +
        `&select=slug,h1,title,meta_description,category&order=id.asc&limit=${PER_CAT}&offset=${offset}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const cat = sp.get('cat') || '';
  const meta = CAT_META[cat];
  if (!meta) return NextResponse.redirect(new URL('/', BASE_URL));

  const page = Math.max(1, Math.floor(Number(sp.get('page')) || 1));
  const offset = (page - 1) * PER_CAT;

  // ── Truy vấn TỪNG chuyên mục, không gộp một trần chung ──────────────────────
  // Bản cũ hỏi cả 5 chuyên mục trong MỘT lượt `or=(…)&limit=2000`, sắp theo
  // category rồi id. Trần 2000 bị hai chuyên mục đầu ăn hết ⇒ ba chuyên mục sau
  // render ĐÚNG 0 mục, tuần nào cũng vậy. Đo trên prod:
  //   tu-vi-nam-sinh 120/120 · tuong-hop-hon-nhan 1.880/3.540
  //   tuong-hop-lam-an 0/3.540 · van-han 0/480 · y-nghia-sao 0/168
  // Hỏi riêng từng chuyên mục thì trần của mục này không thể nuốt mục kia.
  const [counts, slices] = await Promise.all([
    Promise.all(meta.cats.map(countCat)),
    Promise.all(meta.cats.map((c) => fetchCatSlice(c, offset))),
  ]);

  const totals: Record<string, number> = {};
  meta.cats.forEach((c, i) => (totals[c] = counts[i]));
  const pages = slices.flat();

  // Tổng số trang hub = theo chuyên mục ĐÔNG NHẤT. Đây mới là thứ khiến 7.080
  // trang tương hợp có đường vào: trước đây hub phát đúng 120 liên kết cho
  // 7.848 trang, phần còn lại chỉ có sitemap dẫn tới.
  const totalPages = Math.max(1, ...meta.cats.map((c) => Math.ceil((totals[c] || 0) / PER_CAT)));
  if (page > totalPages) return NextResponse.redirect(new URL(`/${cat}`, BASE_URL));

  const html = buildHub(cat, meta, pages, { page, totalPages, totals });
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
