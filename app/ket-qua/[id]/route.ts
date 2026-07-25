// app/ket-qua/[id]/route.ts
// Trang CÔNG KHAI read-only của 1 kết quả khung giữa (workspace) được chia sẻ —
// feature "Chia sẻ" dùng chung cho mọi tool /app (ảnh AI hoặc trích kết quả
// text). Server-render để OG unfurl chạy trên FB/Zalo. Snapshot lưu ở bảng
// shared_results (POST tạo ở app/api/share-result/route.ts).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SITE = 'https://www.tuviminhbao.com';

interface ShareRow {
  tool_id: string;
  kind: 'image' | 'text';
  title: string;
  image_url: string | null;
  text_content: string | null;
  revoked: boolean;
}

function esc(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function page404(): Response {
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Không tìm thấy kết quả</title>
<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#F4F2EC;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:20px}a{color:#9A7B3A}</style></head>
<body><div><h1 style="font-family:Georgia,serif">Kết quả không tồn tại</h1><p>Link chia sẻ đã bị gỡ hoặc không đúng.</p><p><a href="${SITE}/app">Vào Luận Đường →</a></p></div></body></html>`;
  return new Response(html, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!id || !/^[A-Za-z0-9]{6,16}$/.test(id)) return page404();

  let row: ShareRow | null = null;
  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data } = await sb.from('shared_results')
      .select('tool_id,kind,title,image_url,text_content,revoked').eq('id', id).single();
    row = (data as ShareRow) || null;
    if (row && !row.revoked) {
      sb.rpc('incr_shared_result_view', { p_id: id }).then(() => {}, () => {});
    }
  } catch {
    /* fall through → 404 */
  }
  if (!row || row.revoked) return page404();

  const title = esc(row.title || 'Kết quả Luận Đường');
  const url = `${SITE}/ket-qua/${esc(id)}`;
  const isImage = row.kind === 'image' && row.image_url;

  const teaser = isImage
    ? 'Xem kết quả AI luận từ lá số Tử Vi — Tử Vi Minh Bảo.'
    : (row.text_content || '').replace(/[*#\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
  const desc = esc(teaser || 'Luận giải Tử Vi bởi Tử Vi Minh Bảo.');

  // OG image: kind=image → dùng THẲNG ảnh AI (thumbnail đẹp có sẵn, không cần
  // render lại). kind=text → tái dùng card satori sẵn có (ctx=title, q=trích).
  const ogImg = isImage
    ? esc(row.image_url as string)
    : esc(`${SITE}/api/og/luan-duong?${new URLSearchParams({ ctx: row.title || '', thay: 'Tử Vi Minh Bảo', q: teaser.slice(0, 150) }).toString()}`);

  const ctaRoute = `/app/${row.tool_id}`;

  const body = isImage
    ? `<img class="res-img" src="${esc(row.image_url as string)}" alt="${title}">`
    : `<div class="res-text">${esc(row.text_content || '').split(/\n{2,}/).map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('')}</div>`;

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — Tử Vi Minh Bảo</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${title} — Tử Vi Minh Bảo">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${ogImg}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogImg}">
<meta name="robots" content="noindex, follow">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
:root{--navy:#061A2E;--gold:#C9A84C;--gold-soft:#9A7B3A;--gold-lt:#F9F4EB;--red:#C0392B;--paper:#FBFAF7;--paper2:#F4F2EC;--white:#fff;--text:#1a1a1a;--text-mid:#4a4a4a;--text-lt:#7a7a7a;--line:#E6E3DC;--serif:'Noto Serif',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--sans);background:var(--paper2);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:640px;margin:0 auto;min-height:100vh;background:var(--paper);box-shadow:0 0 40px rgba(6,26,46,.06)}
.top{background:linear-gradient(180deg,var(--navy),#0A2540);color:#fff;padding:18px 20px;display:flex;align-items:center;gap:13px}
.top .t{flex:1;min-width:0}
.top .t b{font-family:var(--serif);font-size:16px;display:block}
.top .t span{font-size:12px;color:var(--gold)}
.top .brand{font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);opacity:.85;text-align:right}
.body{padding:20px}
.res-img{display:block;width:100%;border-radius:12px;box-shadow:0 8px 24px rgba(6,26,46,.16)}
.res-text{font-size:14.5px;color:var(--text)}
.res-text p{margin-bottom:12px}
.cta{padding:6px 20px 24px}
.cta-card{background:var(--white);border:1px solid var(--gold-soft);border-radius:14px;padding:16px 18px;box-shadow:0 8px 28px rgba(6,26,46,.12);text-align:center}
.cta-card b{font-family:var(--serif);font-size:16px;display:block;margin-bottom:5px}
.cta-card p{font-size:13px;color:var(--text-mid);margin-bottom:13px}
.cta-card .pill{display:inline-block;background:var(--gold-lt);color:var(--gold-soft);border:1px solid var(--gold-soft);border-radius:20px;font-size:11.5px;padding:2px 10px;margin-bottom:11px}
.cta-btn{display:inline-block;background:var(--red);color:#fff;text-decoration:none;font-family:var(--serif);font-weight:600;font-size:15px;padding:11px 26px;border-radius:9px}
.foot{text-align:center;padding:16px;font-size:11px;color:var(--text-lt)}
.foot a{color:var(--gold-soft)}
</style></head>
<body>
<div class="wrap">
  <div class="top">
    <div class="t"><b>${title}</b><span>Tử Vi Minh Bảo · Luận Đường</span></div>
    <div class="brand">紫微<br>明寶</div>
  </div>
  <div class="body">${body}</div>
  <div class="cta">
    <div class="cta-card">
      <span class="pill">✦ Tặng Lượng miễn phí khi đăng ký</span>
      <b>Muốn xem kết quả của riêng bạn?</b>
      <p>Đăng ký để tự lập lá số và dùng công cụ này — miễn phí.</p>
      <a class="cta-btn" href="${SITE}${ctaRoute}">Thử ngay →</a>
    </div>
  </div>
  <div class="foot">© 2026 Tử Vi Minh Bảo · <a href="${SITE}/app">tuviminhbao.com</a> — Lá số lập bằng engine cổ pháp, AI chỉ luận, không bịa sao.</div>
</div>
</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}
