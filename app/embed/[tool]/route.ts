// app/embed/[tool]/route.ts
// ============================================================
// WIDGET NHÚNG — trang tối giản, cho phép đặt trong iframe của site khác.
// Xem lib/growth/embeds.ts để biết vì sao iframe KHÔNG phải backlink và
// phần nào mới thật sự là.
//
// Ba tính chất bắt buộc, đừng "dọn dẹp" mất:
//  1. `frame-ancestors *` — không có nó thì widget không nhúng được ở đâu cả,
//     tức cả tính năng vô nghĩa.
//  2. Tự chứa: chỉ nạp ĐÚNG một file tools-shared, không nav/footer/auth —
//     widget nằm trên trang người khác, kéo theo chrome của mình là vừa nặng
//     vừa vỡ bố cục của họ.
//  3. Ghi sổ ai đang nhúng bằng Referer, và ghi hỏng thì IM LẶNG bỏ qua —
//     một khung trắng trên trang đối tác tệ hơn nhiều so với mất một dòng
//     thống kê.
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { findEmbedTool, hostFromReferer, logEmbedHit } from '@/lib/growth/embeds';
import { SEO_BASE } from '@/lib/seo/entity';

function esc(s: unknown) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SHELL_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:15px;line-height:1.55;padding:14px}
.w{max-width:520px;margin:0 auto}
h2{font-size:16px;font-weight:600;color:#061A2E;margin-bottom:2px}
.sub{font-size:12px;color:#777;margin-bottom:12px}
form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
input{flex:1;min-width:120px;padding:9px 10px;border:1px solid #ccc;border-radius:7px;font-size:15px;font-family:inherit}
button{padding:9px 16px;border:none;border-radius:7px;background:#C0392B;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.err{color:#C0392B;font-size:13px}
.res{font-size:14px}
.res table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
.res th,.res td{border:1px solid #E8E8E8;padding:5px 7px;text-align:left}
.res th{background:#F5F4F0;font-weight:600}
.ft{margin-top:14px;padding-top:10px;border-top:1px solid #eee;font-size:12px;color:#777}
.ft a{color:#1455A4;font-weight:600;text-decoration:none}
`;

/** Đoạn script riêng của từng tool — gọi CHÍNH module tools-shared, không chép logic. */
const RUNNER: Record<string, string> = {
  'kim-lau': `
    var f=document.getElementById('f'),o=document.getElementById('o');
    f.addEventListener('submit',function(e){e.preventDefault();
      var r=window.KimLauTool.compute(parseInt(document.getElementById('y').value,10));
      if(!r.ok){o.innerHTML='<div class="err">'+r.error+'</div>';return;}
      o.innerHTML='<b>'+r.resTitleText+'</b>'+r.currentBoxHTML+'<table><thead><tr><th>Năm</th><th>Tuổi</th><th>Kim Lâu</th><th>Hoang Ốc</th><th>Tam Tai</th></tr></thead><tbody>'+r.rowsHTML+'</tbody></table>';
    });`,
  'nap-am': `
    var f=document.getElementById('f'),o=document.getElementById('o');
    f.addEventListener('submit',function(e){e.preventDefault();
      var r=window.NapAmTool.compute(parseInt(document.getElementById('y').value,10));
      if(!r.ok){o.innerHTML='<div class="err">'+r.error+'</div>';return;}
      o.innerHTML='<b>'+r.eyebrowText+'</b>'+r.resultHTML+window.NapAmTool.ungDungHTML(r.data,{});
    });`,
};

const FORM: Record<string, string> = {
  'kim-lau': '<input id="y" type="number" inputmode="numeric" placeholder="Năm sinh, vd 1990" required><button type="submit">Xem</button>',
  'nap-am': '<input id="y" type="number" inputmode="numeric" placeholder="Năm sinh, vd 1990" required><button type="submit">Tra</button>',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = findEmbedTool(tool);
  if (!t || !RUNNER[t.slug]) {
    return new NextResponse('Không có widget này', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const domain = hostFromReferer(_req.headers.get('referer'));
  // Await có chủ ý: trên serverless, "bắn rồi quên" hay bị cắt giữa chừng khi
  // response đã trả. Lượt ghi có hạn giờ 3s + chặn 1 lần/giờ mỗi domain nên
  // chi phí thực tế gần như bằng 0.
  await logEmbedHit(domain, t.slug);

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.label)}</title>
<meta name="robots" content="noindex, follow">
<style>${SHELL_CSS}</style>
</head>
<body>
<div class="w">
  <h2>${esc(t.label)}</h2>
  <div class="sub">${esc(t.desc)}</div>
  <form id="f">${FORM[t.slug]}</form>
  <div class="res" id="o"></div>
  <div class="ft">Công cụ bởi <a href="${SEO_BASE}${t.fullPath}" target="_blank" rel="noopener">Tử Vi Minh Bảo</a></div>
</div>
<script src="/tools-shared/${t.script}"></script>
<script>${RUNNER[t.slug]}</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Cho nhúng ở MỌI nơi — đó là cả mục đích. Widget chỉ đọc, không có
      // phiên đăng nhập nào để clickjack.
      'Content-Security-Policy': "frame-ancestors *",
      // Trang này là bản RÚT GỌN của công cụ thật (`/kim-lau`, `/tools/nap-am.html`).
      // Để Google index nó là tự tạo hai URL cùng nội dung rồi chúng cạnh tranh
      // nhau. Khai ở CẢ header lẫn thẻ <meta> — header còn ăn khi trang được
      // fetch mà không render.
      'X-Robots-Tag': 'noindex, follow',
      // 🔴 `private` CÓ CHỦ Ý — KHÔNG cho CDN giữ. Để CDN cache thì lượt tải
      // từ một domain MỚI không chạm origin, nên không bao giờ đọc được
      // Referer của họ ⇒ mất đúng vòng lặp tự-phát-hiện là cả lý do widget
      // này tồn tại. Trình duyệt vẫn cache 1 giờ nên người đọc không chịu
      // thiệt; cái phải trả là thêm invocation, chấp nhận được vì trang này
      // là HTML tĩnh rẻ và bộ chặn 1-lần/giờ đã lo phần ghi DB.
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
