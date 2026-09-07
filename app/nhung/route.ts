// app/nhung/route.ts
// ============================================================
// TRANG TỰ PHỤC VỤ lấy mã nhúng — CỐ Ý KHÔNG có bước duyệt.
//
// Ai cũng lấy được, không cần xin phép, không cần đăng ký. Đó là điều kiện
// để nó lan: mỗi bước xét duyệt là một chỗ rơi, mà bên kia vốn chỉ đang tò
// mò xem có tiện không. Rủi ro của việc mở toang gần bằng 0 — widget chỉ
// đọc, tra bảng thuần, không phiên đăng nhập, không tốn lượt model nào.
//
// Danh sách widget đọc từ EMBED_TOOLS (lib/growth/embeds.ts) — cùng nguồn
// với route /embed/[tool], không chép tay lần hai.
// ============================================================
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { EMBED_TOOLS, embedSnippet } from '@/lib/growth/embeds';
import { SEO_BASE } from '@/lib/seo/entity';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET() {
  const blocks = EMBED_TOOLS.map((t, i) => {
    const code = embedSnippet(t);
    return `<section>
      <h2>${esc(t.label)}</h2>
      <p>${esc(t.desc)}</p>
      <div class="demo"><iframe src="${SEO_BASE}/embed/${t.slug}" width="100%" height="${t.height}" style="border:1px solid #e5e5e5;border-radius:10px;max-width:520px" loading="lazy" title="${esc(t.label)}"></iframe></div>
      <h3>Mã nhúng</h3>
      <textarea id="c${i}" readonly rows="6">${esc(code)}</textarea>
      <button class="cp" data-t="c${i}">Sao chép mã</button>
    </section>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nhúng Công Cụ Miễn Phí — Tử Vi Minh Bảo</title>
<meta name="description" content="Lấy mã nhúng công cụ tử vi miễn phí cho website hoặc blog của bạn: xem tuổi làm nhà (Kim Lâu), tra mệnh nạp âm. Không cần đăng ký.">
<link rel="canonical" href="${SEO_BASE}/nhung">
<meta property="og:title" content="Nhúng Công Cụ Tử Vi Miễn Phí">
<meta property="og:description" content="Mã nhúng sẵn, không cần đăng ký. Dán vào blog là chạy.">
<meta property="og:url" content="${SEO_BASE}/nhung">
<meta property="og:image" content="${SEO_BASE}/seal.webp">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border-lt:#E8E8E8;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;color:var(--text);font-size:16px;line-height:1.6;background:#fff}
a{color:var(--blue)}
.page{max-width:860px;margin:0 auto;padding:0 40px 80px}
.hero{padding:48px 0 28px;border-bottom:2px solid var(--navy)}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
h1{font-size:34px;font-weight:400;color:var(--navy);margin-bottom:10px}
h1 em{font-style:italic;color:var(--gold)}
section{padding:30px 0;border-bottom:1px solid var(--border-lt)}
h2{font-size:20px;font-weight:400;color:var(--navy);margin-bottom:6px}
h3{font-size:13px;font-weight:600;color:var(--navy);margin:16px 0 6px}
p{color:var(--text-mid);margin-bottom:10px}
.demo{margin:12px 0}
textarea{width:100%;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;padding:10px;border:1px solid var(--border-lt);border-radius:8px;background:var(--bg-soft);resize:vertical}
button{margin-top:8px;padding:8px 16px;border:none;border-radius:7px;background:var(--navy);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.note{background:var(--bg-soft);border-left:3px solid var(--gold);padding:12px 14px;font-size:14px;margin-top:10px}
ul{margin:0 0 10px 20px;color:var(--text-mid)}li{margin-bottom:5px}
@media(max-width:700px){.page{padding-left:16px;padding-right:16px}h1{font-size:26px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Dành cho chủ website &amp; blog</div>
    <h1>Nhúng Công Cụ <em>Miễn Phí</em></h1>
    <p>Copy đoạn mã, dán vào bài viết hoặc sidebar — công cụ chạy ngay trên trang của bạn. Miễn phí, không cần đăng ký, không quảng cáo chèn vào.</p>
  </div>

  <section style="border-bottom:none;padding-bottom:8px">
    <div class="note">
      <b>Đổi lại một điều duy nhất:</b> xin giữ nguyên dòng ghi nguồn nằm dưới khung công cụ. Đó là phần duy nhất chúng tôi nhận lại, và nó nằm ngoài khung nên bạn sửa được kiểu chữ cho hợp trang.
    </div>
    <ul style="margin-top:14px">
      <li>Không chèn quảng cáo, không đòi người đọc đăng nhập.</li>
      <li>Chạy hoàn toàn trong khung, không đụng gì tới trang của bạn.</li>
      <li>Muốn tự dựng giao diện riêng? Có <a href="/api-docs">API âm lịch miễn phí, không cần key</a>.</li>
      <li>Cần widget cho công cụ khác? Viết cho <a href="mailto:contact@tuviminhbao.com">contact@tuviminhbao.com</a>.</li>
    </ul>
  </section>

  ${blocks}
</div>
<script>
document.addEventListener('click', function (e) {
  var b = e.target.closest('.cp'); if (!b) return;
  var ta = document.getElementById(b.dataset.t); if (!ta) return;
  ta.select();
  var done = function () { var o = b.textContent; b.textContent = 'Đã sao chép ✓'; setTimeout(function () { b.textContent = o; }, 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, done);
  else { try { document.execCommand('copy'); } catch (err) {} done(); }
});
</script>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=26" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
