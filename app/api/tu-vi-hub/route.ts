// app/api/tu-vi-hub/route.ts
// Category hub pages: /phong-thuy, /xem-tuong, /chon-ngay, /lam-dep, /dat-ten, /kien-thuc-tuvi
export const maxDuration = 15;
import { NextRequest, NextResponse } from 'next/server';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHub(cat: string, meta: typeof CAT_META[string], pages: any[]) {
  const url = `${BASE_URL}/${cat}`;
  const grouped: Record<string, typeof pages> = {};
  for (const p of pages) {
    const g = p.category || 'other';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(p);
  }

  const gridHtml = Object.entries(grouped).map(([grpCat, grpPages]) => `
    <section class="hub-section">
      <h2 class="hub-section-title">${esc(CAT_LABEL[grpCat] || grpCat)} <span class="hub-count">${grpPages.length} bài</span></h2>
      <div class="hub-grid">
        ${grpPages.slice(0,60).map(p => `
          <a class="hub-card" href="${BASE_URL}/tu-vi/${esc(p.slug)}">
            <div class="hub-card-title">${esc(p.h1 || p.title)}</div>
            <div class="hub-card-meta">${esc((p.meta_description||'').slice(0,80))}…</div>
          </a>`).join('')}
      </div>
      ${grpPages.length > 60 ? `<p class="hub-more">Và ${grpPages.length - 60} bài viết khác trong chủ đề này.</p>` : ''}
    </section>`).join('');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.desc,
    url,
    publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE_URL },
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
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500&display=swap" rel="stylesheet">
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
.hub-more{font-size:13px;color:#999;margin-top:10px;font-style:italic}
@media(max-width:700px){.hub-hero,.breadcrumb{padding-left:16px;padding-right:16px}.hub-wrap{padding:24px 12px 60px}.hub-grid{grid-template-columns:1fr}.hub-hero h1{font-size:22px}}
</style>
<script src="/auth.js"></script>
</head>
<body>
<script src="/nav.js"></script>
<div class="breadcrumb"><a href="/">Trang Chủ</a> › <span>${esc(meta.h1)}</span></div>
<div class="hub-hero">
  <div class="hub-hero-icon">${meta.icon}</div>
  <h1>${esc(meta.h1)}</h1>
  <p>${esc(meta.desc)}</p>
  <a class="hub-hero-cta" href="/">Xem Tử Vi Của Bạn →</a>
</div>
<div class="hub-wrap">${gridHtml}</div>
<script src="/footer.js"></script>
</body></html>`;
}

export async function GET(request: NextRequest) {
  const cat = new URL(request.url).searchParams.get('cat') || '';
  const meta = CAT_META[cat];
  if (!meta) return NextResponse.redirect(new URL('/', BASE_URL));

  const catFilter = meta.cats.map(c => `category.eq.${c}`).join(',');
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_pages?or=(${encodeURIComponent(catFilter)})&select=slug,h1,title,meta_description,category&order=category.asc,id.asc&limit=2000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const pages = await r.json();
  const html = buildHub(cat, meta, Array.isArray(pages) ? pages : []);
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
