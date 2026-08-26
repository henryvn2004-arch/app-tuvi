// app/api-docs/route.ts
// ============================================================
// TÀI LIỆU API CÔNG KHAI — mục #8/14 (growth hack GH3a).
//
// Đây KHÔNG chỉ là trang tài liệu, nó là cả nước đi: chỗ trống thật sự trong
// `public-apis` (~360k sao) là "Vietnamese lunar calendar" — danh mục
// Calendar của họ gần như không có gì cho lịch âm Việt. Mỗi lập trình viên
// tích hợp là một khả năng có link trỏ về, và mọi danh bạ API đều đòi một
// trang tài liệu công khai trước khi nhận. Nộp ở đâu thì theo dõi trong sổ
// `growth_accounts` nhóm `registry` (public-apis, rapidapi…).
//
// 🔑 MẪU PHẢN HỒI DỰNG BẰNG CHÍNH BỘ DỰNG CỦA API (`lib/api/calendar-public.ts`),
// không gõ tay. Tài liệu gõ tay là tài liệu sẽ nói dối — chỉ cần một lượt đổi
// tên trường là người đọc viết code theo shape không còn tồn tại.
//
// Song ngữ CÓ CHỦ Ý: người nộp danh bạ quốc tế đọc tiếng Anh, còn cầu tìm
// kiếm ("api âm lịch", "api lịch việt nam") thì bằng tiếng Việt.
// ============================================================
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { buildLunar, buildAlmanac } from '@/lib/api/calendar-public';
import { MAX_RANGE_DAYS, MIN_YEAR, MAX_YEAR } from '@/lib/api/public';
import { SEO_BASE } from '@/lib/seo/entity';
import { orgNode } from '@/lib/seo/same-as';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Ngày mẫu CỐ ĐỊNH — lấy hôm nay thì trang đổi mỗi ngày, cache vô nghĩa và
 *  người đọc không so được với ví dụ họ vừa chạy. */
const DEMO = { y: 2026, m: 8, d: 23 };

export async function GET() {
  const lunar = JSON.stringify({ ok: true, ...buildLunar(DEMO) }, null, 2);
  const alm = buildAlmanac(DEMO);
  // Cắt còn 2 việc cho gọn — nói rõ là đã cắt, không để người đọc tưởng API
  // chỉ trả 2 mục.
  const almShort = JSON.stringify(
    { ok: true, ...alm, activities: alm.activities.slice(0, 2) }, null, 2,
  ).replace(/\n\s+\]\n\s+\}\n\}$/, '\n    … (đủ 10 loại việc)\n  ]\n}');

  const ENDPOINTS = [
    {
      path: '/api/public/v1/lunar',
      vi: 'Đổi ngày dương sang âm lịch, kèm can chi, con giáp, nạp âm và 12 giờ hoàng đạo/hắc đạo.',
      en: 'Gregorian → Vietnamese lunar date, sexagenary cycle, zodiac, nap-am element, and the 12 auspicious/inauspicious hours.',
      sample: lunar,
    },
    {
      path: '/api/public/v1/almanac',
      vi: 'Phán đoán ngày theo cổ pháp: 12 trực, 28 tú, sao hoàng/hắc đạo, ngày kỵ, và chấm điểm 10 loại việc.',
      en: 'Day divination: the 12 "truc" officers, 28 lunar mansions, day star, taboo days, and a 0–10 score for 10 kinds of activity.',
      sample: almShort,
    },
  ];

  const blocks = ENDPOINTS.map((e) => `
    <section>
      <h2><code class="ep">GET ${esc(e.path)}</code></h2>
      <p>${esc(e.vi)}</p>
      <p class="en">${esc(e.en)}</p>
      <h3>Thử ngay · Try it</h3>
      <ul class="try">
        <li><a href="${e.path}" target="_blank" rel="noopener">${esc(e.path)}</a> — hôm nay / today</li>
        <li><a href="${e.path}?date=2026-08-23" target="_blank" rel="noopener">${esc(e.path)}?date=2026-08-23</a> — một ngày / one day</li>
        <li><a href="${e.path}?from=2026-08-23&amp;to=2026-08-29" target="_blank" rel="noopener">${esc(e.path)}?from=…&amp;to=…</a> — dải ngày / date range</li>
      </ul>
      <h3>Phản hồi mẫu · Sample response</h3>
      <pre>${esc(e.sample)}</pre>
    </section>`).join('');

  const schema = [
    await orgNode({ standalone: true }),
    {
      '@context': 'https://schema.org', '@type': 'WebAPI',
      name: 'Vietnamese Lunar Calendar API — Tử Vi Minh Bảo',
      description: 'Free, no-key REST API for the Vietnamese lunar calendar: solar↔lunar conversion, sexagenary cycle, zodiac, and traditional day divination.',
      documentation: `${SEO_BASE}/api-docs`,
      termsOfService: `${SEO_BASE}/api-docs`,
      provider: { '@id': `${SEO_BASE}/bao-chi#organization` },
      inLanguage: ['vi', 'en'],
    },
  ];

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>API Âm Lịch Việt Nam Miễn Phí — Vietnamese Lunar Calendar API</title>
<meta name="description" content="API lịch âm Việt Nam miễn phí, không cần API key: đổi dương sang âm lịch, can chi, con giáp, nạp âm, giờ hoàng đạo, ngày tốt xấu. Free Vietnamese lunar calendar REST API, no key required, CORS enabled.">
<link rel="canonical" href="${SEO_BASE}/api-docs">
<meta property="og:title" content="API Âm Lịch Việt Nam Miễn Phí — Free Vietnamese Lunar Calendar API">
<meta property="og:description" content="Không cần API key, không giới hạn lượt, CORS mở. Solar↔lunar, sexagenary cycle, zodiac, day divination.">
<meta property="og:url" content="${SEO_BASE}/api-docs">
<meta property="og:image" content="${SEO_BASE}/seal.webp">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border-lt:#E8E8E8;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;color:var(--text);font-size:16px;line-height:1.6;background:#fff}
a{color:var(--blue)}
.page{max-width:880px;margin:0 auto;padding:0 40px 80px}
.hero{padding:48px 0 28px;border-bottom:2px solid var(--navy)}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
h1{font-size:32px;font-weight:400;color:var(--navy);margin-bottom:10px}
h1 em{font-style:italic;color:var(--gold)}
section{padding:28px 0;border-bottom:1px solid var(--border-lt)}
h2{font-size:19px;font-weight:400;color:var(--navy);margin-bottom:8px}
h3{font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-lt);margin:16px 0 6px}
p{color:var(--text-mid);margin-bottom:8px}
p.en{color:var(--text-lt);font-size:14px;font-style:italic}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;background:var(--bg-soft);padding:2px 6px;border-radius:4px}
code.ep{font-size:15px;color:var(--navy);font-weight:600}
pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;padding:12px;border:1px solid var(--border-lt);border-radius:8px;background:var(--bg-soft);overflow-x:auto}
ul{margin:0 0 10px 20px;color:var(--text-mid)}li{margin-bottom:5px}
ul.try{list-style:none;margin-left:0}ul.try li{font-size:14px}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
th,td{border:1px solid var(--border-lt);padding:6px 9px;text-align:left}
th{background:var(--bg-soft);font-weight:600;color:var(--navy)}
.note{background:var(--bg-soft);border-left:3px solid var(--gold);padding:12px 14px;font-size:14px;margin-top:12px}
@media(max-width:700px){.page{padding-left:16px;padding-right:16px}h1{font-size:25px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Free API · No key required</div>
    <h1>API Âm Lịch <em>Việt Nam</em></h1>
    <p>Đổi ngày dương sang âm lịch, can chi, con giáp, nạp âm, giờ hoàng đạo và ngày tốt xấu — miễn phí, <b>không cần API key</b>, không giới hạn lượt gọi, CORS mở nên gọi thẳng từ trình duyệt được.</p>
    <p class="en">Free REST API for the Vietnamese lunar calendar. No key, no registration, no rate limit, CORS enabled. Same engine that powers ${'8.958'} pages on this site.</p>
  </div>

  <section>
    <h2>Bắt đầu · Quick start</h2>
    <pre>curl "${SEO_BASE}/api/public/v1/lunar?date=2026-08-23"</pre>
    <div class="note">
      <b>Không cần đăng ký gì cả.</b> Nếu API giúp được bạn, một dòng ghi nguồn trỏ về
      <a href="${SEO_BASE}">tuviminhbao.com</a> là đủ — <b>không bắt buộc</b>.
      <span class="en">Attribution appreciated, never required.</span>
    </div>
  </section>

  <section>
    <h2>Tham số · Parameters</h2>
    <table>
      <thead><tr><th>Tham số</th><th>Mô tả</th><th>Mặc định</th></tr></thead>
      <tbody>
        <tr><td><code>date</code></td><td>Một ngày, dạng <code>YYYY-MM-DD</code>. Trong khoảng ${MIN_YEAR}–${MAX_YEAR}.</td><td>hôm nay (giờ VN)</td></tr>
        <tr><td><code>from</code> + <code>to</code></td><td>Dải ngày, tối đa <b>${MAX_RANGE_DAYS} ngày</b> một lượt. Trả về <code>{ days: [...] }</code>.</td><td>—</td></tr>
      </tbody>
    </table>
    <h3>Mô tả máy đọc được · Machine-readable spec</h3>
    <p><a href="/api/public/v1/openapi.json">openapi.json</a> — OpenAPI 3.1. Nạp vào Postman/Insomnia hoặc sinh SDK thẳng từ đó.</p>
    <h3>Lỗi · Errors</h3>
    <p>Mọi lỗi trả về cùng một hình dạng. Hãy bắt theo <code>error.code</code>, đừng bắt theo câu chữ — câu chữ có thể sửa, <code>code</code> thì không.</p>
    <pre>{ "ok": false, "error": { "code": "bad_date", "message": "…" } }</pre>
    <p class="en"><code>bad_date</code> · <code>bad_range</code> · <code>range_too_long</code> · <code>missing_param</code> · <code>conflicting_params</code> · <code>engine_error</code></p>
  </section>

  ${blocks}

  <section>
    <h2>Điều khoản · Terms</h2>
    <ul>
      <li>Miễn phí cho cả dự án cá nhân lẫn thương mại. <span class="en">Free for personal and commercial use.</span></li>
      <li>Không có SLA. Đây là dịch vụ tặng kèm, dùng cho hệ thống trọng yếu thì tự cache lại phía bạn. <span class="en">No SLA — cache on your side for anything critical.</span></li>
      <li>Chưa có giới hạn lượt gọi. Dữ liệu một ngày là bất biến nên đã cache rất mạnh ở CDN; xin đừng vô hiệu hoá cache. <span class="en">No rate limit today; please don't bypass caching.</span></li>
      <li>Tầng <i>phán đoán</i> (<code>/almanac</code>) theo một trường phái cổ pháp — là tra cứu văn hoá, không phải lời khuyên. <span class="en">Divination layer is cultural reference, not advice.</span></li>
      <li>Hỏng hoặc thiếu gì, viết cho <a href="mailto:contact@tuviminhbao.com">contact@tuviminhbao.com</a>.</li>
    </ul>
  </section>

  <section style="border-bottom:none">
    <h2>Xem thêm</h2>
    <ul>
      <li><a href="/mcp-server">MCP server tử vi miễn phí</a> — cắm thẳng vào Claude, Cursor, VS Code.</li>
      <li><a href="/nhung">Nhúng công cụ miễn phí vào website của bạn</a> — không cần code.</li>
      <li><a href="/du-lieu">Dữ liệu tử vi mở (CC BY 4.0)</a> — thống kê phân bố sao mệnh, cục, nạp âm; tải CSV/JSON.</li>
      <li><a href="/ngay-tot">Tra ngày tốt xấu</a> · <a href="/kim-lau">Xem tuổi làm nhà</a> · <a href="/bao-chi">Thông tin báo chí</a></li>
    </ul>
  </section>
</div>
<script src="/footer.js"></script>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=24" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
