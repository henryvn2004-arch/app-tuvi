// app/van-han/route.ts
// Hub page: list toàn bộ trang van-han cấp 1 (12 chi × 8 năm = 96 liên kết)
export const revalidate = false;

import { NextResponse } from 'next/server';
import { currentNamXem } from '@/lib/engine/namxem';
import { ORG_ID } from '@/lib/seo/entity';

const BASE      = 'https://www.tuviminhbao.com';
const CHI_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const CHI_SLUGS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
// 2023–2030: KHỚP ĐÚNG 8 năm mà `seo_pages` category 'van-han' đã phủ (60 can
// chi × 8 năm = 480 trang). Trước đây chỉ 3 năm nên 5 năm còn lại của họ URL kia
// không có đích để 301 về — gộp mà để hụt năm là biến 200 thành 404.
const NAM_XEMS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

function esc(s: unknown) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Năm đứng tên trong title/description. Trước đây là `NAM_XEMS[1]` — vị trí thứ
 * hai của mảng, chỉ đúng khi mảng có đúng 3 phần tử; mở mảng ra 8 năm là nó
 * lặng lẽ thành 2024. Neo vào NĂM HIỆN TẠI giờ VN (nguồn chung
 * `currentNamXem()`), kẹp vào dải để không bao giờ trỏ ra ngoài.
 */
function namChinh(): number {
  const y = currentNamXem();
  return Math.min(Math.max(y, NAM_XEMS[0]), NAM_XEMS[NAM_XEMS.length - 1]);
}

export async function GET() {
  const nam = namChinh();
  const title = `Vận Hạn Theo Tuổi — Tử Vi Đẩu Số ${nam}`;
  const desc  = `Xem vận hạn năm ${nam} theo tuổi (can chi) — phân tích cung mệnh, đại vận, cách cục đặc biệt cho 12 tuổi theo Tử Vi Đẩu Số cổ pháp.`;

  const yearBlocks = NAM_XEMS.map(namXem => `
    <div class="year-section">
      <h2>Vận Hạn Năm ${namXem}</h2>
      <div class="chi-grid">
        ${CHI_NAMES.map((chi, i) => `
          <a href="/van-han/tuoi-${CHI_SLUGS[i]}-nam-${namXem}" class="chi-card">
            <div class="chi-name">${esc(chi)}</div>
            <div class="chi-label">Tuổi ${esc(chi)} · ${namXem}</div>
          </a>`).join('')}
      </div>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${BASE}/van-han">
<link rel="canonical" href="${BASE}/van-han">
<link rel="icon" type="image/webp" href="/seal.webp">
<script type="application/ld+json">${JSON.stringify({
  '@context':'https://schema.org','@type':'CollectionPage',
  name: title, description: desc, url: `${BASE}/van-han`,
  inLanguage: 'vi',
  publisher: { '@type':'Organization', '@id': ORG_ID, name:'Tử Vi Minh Bảo', url: BASE },
})}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border:#CCCCCC;--border-lt:#E8E8E8;--bg:#fff;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.6}
.bc{background:var(--bg-soft);border-bottom:1px solid var(--border);padding:10px 40px;font-size:12px;color:var(--text-lt);display:flex;gap:8px}
.bc a{color:var(--text-lt)}.bc a:hover{color:var(--navy)}
.page{max-width:1000px;margin:0 auto;padding:0 40px 80px}
.hero{padding:48px 0 32px;border-bottom:2px solid var(--navy)}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
h1{font-size:36px;font-weight:400;color:var(--navy);margin-bottom:12px}
h1 em{font-style:italic;color:var(--gold)}
.hero p{font-size:16px;color:var(--text-mid);max-width:580px;line-height:1.8}
.year-section{padding:36px 0;border-bottom:1px solid var(--border-lt)}
.year-section h2{font-size:20px;font-weight:400;color:var(--navy);margin-bottom:20px}
.chi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.chi-card{display:flex;flex-direction:column;align-items:center;padding:16px 12px;background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:8px;text-decoration:none;transition:all .15s}
.chi-card:hover{border-color:var(--blue);background:#EEF4FF}
.chi-name{font-size:22px;font-weight:400;color:var(--navy);margin-bottom:4px}
.chi-label{font-size:11px;color:var(--text-lt)}
@media(max-width:700px){.page,.bc{padding-left:16px;padding-right:16px}.chi-grid{grid-template-columns:repeat(3,1fr)}.hero{padding:28px 0 20px}h1{font-size:26px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="bc"><a href="/">Trang Chủ</a><span>›</span><span>Vận Hạn Theo Tuổi</span></div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Tử Vi Đẩu Số · Vận Hạn</div>
    <h1>Vận Hạn Theo <em>Tuổi</em></h1>
    <p>Chọn tuổi (can chi) và năm để xem phân tích vận hạn — cung Mệnh, đại vận, cách cục đặc biệt theo Tử Vi Đẩu Số cổ pháp.</p>
  </div>
  ${yearBlocks}
</div>
<script src="/footer.js"></script>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=24" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
    },
  });
}
