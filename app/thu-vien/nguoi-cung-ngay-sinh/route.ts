// app/thu-vien/nguoi-cung-ngay-sinh/route.ts — hub lịch 366 ngày, trỏ vào
// từng trang [ngay] (xem file đó để hiểu vì sao KHÔNG có trang riêng cho
// từng người trong 272.783 dòng celeb_births).
export const revalidate = 604800;

import { NextResponse } from 'next/server';
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

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const TEN_THANG = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

/** Đếm tổng người CHƯA bị chặn — HEAD + count=exact, không kéo dữ liệu.
 * Đếm hụt (lỗi mạng) → null, trang vẫn dựng nhưng ẩn số thay vì bịa. */
async function demCeleb(): Promise<number | null> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/celeb_births?blocked=is.false&select=id`, {
      method: 'HEAD',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: 'count=exact' },
    });
    if (!res.ok) return null;
    const range = res.headers.get('content-range');
    const total = range?.split('/')[1];
    return total ? parseInt(total, 10) : null;
  } catch (e) {
    console.error('[nguoi-cung-ngay-sinh] đếm hỏng', e);
    return null;
  }
}

/** "Hôm nay" theo giờ VN — chỉ để làm nút tắt, không ảnh hưởng dữ liệu. */
function homNayVN(): { m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const m = Number(parts.find((p) => p.type === 'month')?.value || 1);
  const d = Number(parts.find((p) => p.type === 'day')?.value || 1);
  return { m, d };
}

export async function GET(): Promise<Response> {
  const [tong, today] = await Promise.all([demCeleb(), Promise.resolve(homNayVN())]);
  const todayNgay = `${String(today.m).padStart(2, '0')}-${String(today.d).padStart(2, '0')}`;

  const months = TEN_THANG.map((tenThang, i) => {
    const m = i + 1;
    const days = MONTH_DAYS[i];
    const cells = Array.from({ length: days }, (_, j) => {
      const d = j + 1;
      const ngay = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = ngay === todayNgay;
      return `<a class="cal-day${isToday ? ' cal-today' : ''}" href="/thu-vien/nguoi-cung-ngay-sinh/${ngay}">${d}</a>`;
    }).join('');
    return `<section class="cal-month">
      <h2 class="cal-month-title">${esc(tenThang)}</h2>
      <div class="cal-grid">${cells}</div>
    </section>`;
  }).join('');

  const url = `${BASE}/thu-vien/nguoi-cung-ngay-sinh`;
  const desc = `Tra người nổi tiếng sinh cùng ngày dương lịch với bạn — chọn ngày để xem danh sách, cung hoàng đạo và số người ghi nhận, dữ liệu từ Wikidata${tong ? ` (${tong.toLocaleString('vi-VN')} người)` : ''}.`;

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Người Nổi Tiếng Cùng Ngày Sinh',
      description: desc,
      url,
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Thư Viện', item: `${BASE}/thu-vien` },
        { '@type': 'ListItem', position: 3, name: 'Người Cùng Ngày Sinh', item: url },
      ],
    },
  ]);

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Người Nổi Tiếng Cùng Ngày Sinh | Thư Viện | Tử Vi Minh Bảo</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="Người Nổi Tiếng Cùng Ngày Sinh — Tử Vi Minh Bảo">
<meta property="og:description" content="${esc(desc)}">
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
.bst-hero-desc{font-size:14.5px;color:var(--text-mid);max-width:640px;margin:0 auto 22px;line-height:1.7}
.bst-hero-count{display:inline-block;background:#F9F4EB;border:1px solid #e8d9b0;color:var(--gold);padding:7px 18px;font-size:12.5px;font-weight:600}
.bst-body{max-width:1000px;margin:0 auto;padding:44px 40px 80px;width:100%;flex:1}
.cal-month{margin-bottom:28px}
.cal-month-title{font-family:var(--serif);font-size:16px;color:var(--navy);font-weight:600;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--border-lt)}
.cal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:6px}
.cal-day{display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;background:var(--bg-soft);border:1px solid var(--border-lt);color:var(--navy);text-decoration:none;font-size:12.5px;font-weight:600;border-radius:6px;transition:all .12s}
.cal-day:hover{border-color:var(--gold);background:#fff;color:var(--gold)}
.cal-today{background:var(--navy);color:#fff;border-color:var(--navy)}
.dob-search{max-width:1000px;margin:24px auto 0;padding:0 40px}
.dob-tabs{display:flex;gap:8px;margin-bottom:10px;justify-content:center}
.dob-tab{padding:7px 16px;border-radius:20px;border:1px solid var(--border-lt);background:#fff;color:var(--text-lt);font-size:12.5px;font-weight:600;cursor:pointer;transition:all .12s;font-family:inherit}
.dob-tab.active{background:var(--navy);color:#fff;border-color:var(--navy)}
.dob-tab:hover{border-color:var(--gold)}
.dob-form{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.dob-input{width:90px;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;text-align:center;font-family:inherit}
.dob-input:focus{outline:none;border-color:var(--gold)}
.dob-btn{padding:9px 22px;border:none;border-radius:8px;background:var(--gold-bright);color:var(--navy);font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
.dob-btn:hover{background:var(--gold)}
.dob-err{text-align:center;color:#C46A5E;font-size:12px;margin-top:6px}
@media(max-width:700px){.bc,.bst-hero,.bst-body,.dob-search{padding-left:20px;padding-right:20px}.bst-hero-title{font-size:26px}}
</style>
<script src="/auth.js?v=2"></script>
</head><body><div id="nav-ph" style="height:60px;background:#FBFAF6"></div>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=43" defer></script>
<div class="bc"><a href="/">Trang Chủ</a><span>›</span><a href="/thu-vien">Thư Viện</a><span>›</span><span>Người Cùng Ngày Sinh</span></div>

<div class="bst-hero">
  <div class="bst-hero-label">Thư Viện</div>
  <h1 class="bst-hero-title">Người Nổi Tiếng Cùng Ngày Sinh</h1>
  <p class="bst-hero-desc">Chọn ngày sinh dương lịch của bạn để xem ai cũng sinh ngày đó — kèm cung hoàng đạo. Dữ liệu tổng hợp từ Wikidata.</p>
  ${tong != null ? `<span class="bst-hero-count">${tong.toLocaleString('vi-VN')} người</span>` : ''}
</div>

<div class="dob-search">
  <div class="dob-tabs" role="tablist">
    <button type="button" class="dob-tab active" data-cal="duong" role="tab" aria-selected="true">Dương lịch</button>
    <button type="button" class="dob-tab" data-cal="am" role="tab" aria-selected="false">Âm lịch</button>
  </div>
  <form class="dob-form" id="dob-form">
    <input type="number" inputmode="numeric" name="d" class="dob-input" placeholder="Ngày" min="1" max="31" required>
    <input type="number" inputmode="numeric" name="m" class="dob-input" placeholder="Tháng" min="1" max="12" required>
    <button type="submit" class="dob-btn">Tra cứu →</button>
  </form>
  <p class="dob-err" id="dob-err" hidden>Ngày không hợp lệ.</p>
</div>
<script>
(function(){
  var cal = 'duong';
  var tabs = document.querySelectorAll('.dob-tab');
  var form = document.getElementById('dob-form');
  var dInput = form.querySelector('input[name=d]');
  var err = document.getElementById('dob-err');
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){x.classList.remove('active');x.setAttribute('aria-selected','false')});
      t.classList.add('active');
      t.setAttribute('aria-selected','true');
      cal = t.getAttribute('data-cal');
      dInput.max = cal === 'am' ? 30 : 31;
    });
  });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var d = parseInt(this.d.value, 10), m = parseInt(this.m.value, 10);
    var maxD = cal === 'am' ? 30 : 31;
    if (!d || !m || d < 1 || d > maxD || m < 1 || m > 12) { err.hidden = false; return; }
    err.hidden = true;
    var ngay = String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    location.href = '/thu-vien/nguoi-cung-ngay-sinh' + (cal === 'am' ? '-am-lich' : '') + '/' + ngay;
  });
})();
</script>

<div class="bst-body">${months}</div>

</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
    },
  });
}
