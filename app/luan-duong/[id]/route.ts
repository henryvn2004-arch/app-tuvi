// app/luan-duong/[id]/route.ts
// Trang CÔNG KHAI read-only của một phiên Luận Đường được chia sẻ (như link ChatGPT).
// Server-render (để OG unfurl trên FB/Zalo chạy) transcript hội thoại với thầy +
// CTA "Đăng ký hỏi thầy tiếp". Snapshot lưu ở bảng shared_sessions.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GA4_TRACK_SNIPPET } from '@/lib/analytics/isr-tracking';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SITE = 'https://www.tuviminhbao.com';

interface ShareRow {
  tool_id: string;
  title: string;
  ctx_label: string | null;
  thay: { id?: string; name?: string } | null;
  messages: { role: string; content: string }[];
  revoked: boolean;
}

function esc(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Markdown TỐI GIẢN + AN TOÀN cho tin của thầy: escape hết trước, rồi mới cho phép
// **đậm**, *nghiêng*, xuống dòng, đoạn. Không cho HTML thô lọt qua (chống XSS).
function mdLite(s: string): string {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>');
  const paras = t.split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
  return paras;
}

// tool_id → route /app tương ứng (để CTA đưa người nhận tự xem).
const TOOL_ROUTE: Record<string, string> = {
  laso: '/app/la-so', 'luan-giai': '/app/la-so', 'bat-tu': '/app/bat-tu',
  'xem-tuoi': '/app/xem-tuoi', 'xem-lam-an': '/app/xem-lam-an', 'tuong-hop': '/app/tuong-hop',
};

function page404(): Response {
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Không tìm thấy phiên</title>
<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#F4F2EC;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:20px}a{color:#9A7B3A}</style></head>
<body><div><h1 style="font-family:Georgia,serif">Phiên không tồn tại</h1><p>Link chia sẻ đã bị gỡ hoặc không đúng.</p><p><a href="${SITE}/app">Vào Luận Đường →</a></p></div>
${GA4_TRACK_SNIPPET}
</body></html>`;
  return new Response(html, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!id || !/^[A-Za-z0-9]{6,16}$/.test(id)) return page404();

  let row: ShareRow | null = null;
  try {
    const sb = createClient(SB_URL, SB_KEY);
    const { data } = await sb.from('shared_sessions')
      .select('tool_id,title,ctx_label,thay,messages,revoked').eq('id', id).single();
    row = (data as ShareRow) || null;
    // Đếm view_count (đo phễu lan truyền) — fire-and-forget, không chặn render.
    if (row && !row.revoked) {
      sb.rpc('incr_shared_counter', { p_id: id, p_kind: 'view' }).then(
        () => {},
        () => {},
      );
    }
  } catch {
    /* fall through → 404 */
  }
  if (!row || row.revoked) return page404();

  const thayName = (row.thay && row.thay.name) || 'Thầy Luận Đường';
  const thayId = (row.thay && row.thay.id) || '';
  const ava = thayId ? `/authors/${esc(thayId)}.jpg` : '/thay-tuvi.webp';
  const title = esc(row.title || 'Luận Đường');
  const url = `${SITE}/luan-duong/${esc(id)}`;
  // teaser mô tả = tin đầu tiên của thầy (cắt gọn) → OG unfurl hấp dẫn.
  const firstThay = (row.messages || []).find((m) => m.role === 'assistant');
  const teaser = (firstThay?.content || 'Luận giải Tử Vi bởi thầy Luận Đường.').replace(/[*#\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
  const desc = esc(teaser);
  // OG card ĐỘNG cá nhân hoá (tên/ngày + thầy + trích lời thầy) → preview hấp dẫn
  // hơn ảnh seal tĩnh → tăng click vào phễu chia sẻ. (esc lần nữa cho ngoặc kép HTML.)
  const ogParams = new URLSearchParams({
    ctx: row.ctx_label || '',
    thay: thayName,
    q: teaser.slice(0, 150),
  }).toString();
  const ogImg = esc(`${SITE}/api/og/luan-duong?${ogParams}`);

  const bubbles = (row.messages || []).map((m) => {
    if (m.role === 'user') {
      return `<div class="m u"><div class="b">${esc(m.content)}</div></div>`;
    }
    return `<div class="m a"><img class="av" src="${esc(ava)}" alt="" loading="lazy"><div class="b">${mdLite(m.content)}</div></div>`;
  }).join('');

  const ctaRoute = TOOL_ROUTE[row.tool_id] || '/app';

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — Tử Vi Minh Bảo</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${title} — luận bởi ${esc(thayName)}">
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
.wrap{max-width:760px;margin:0 auto;min-height:100vh;background:var(--paper);box-shadow:0 0 40px rgba(6,26,46,.06)}
.top{background:linear-gradient(180deg,var(--navy),#0A2540);color:#fff;padding:18px 20px;display:flex;align-items:center;gap:13px}
.top img{width:44px;height:44px;border-radius:9px;object-fit:cover;border:1px solid rgba(201,168,76,.5);flex:0 0 auto}
.top .t{flex:1;min-width:0}
.top .t b{font-family:var(--serif);font-size:16px;display:block}
.top .t span{font-size:12px;color:var(--gold)}
.top .brand{width:40px;height:40px;flex:0 0 auto;object-fit:contain;opacity:.92}
.ctxbar{background:var(--gold-lt);border-bottom:1px solid var(--line);padding:9px 20px;font-size:12.5px;color:var(--text-mid)}
.ctxbar b{color:var(--text)}
.chat{padding:20px;display:flex;flex-direction:column;gap:16px}
.m{max-width:100%}
.m.u{align-self:flex-end;max-width:85%}
.m.u .b{background:var(--navy);color:#eef2f6;padding:9px 13px;border-radius:13px 13px 4px 13px;font-size:14px}
.m.a{display:flex;gap:9px;align-items:flex-start}
.m.a .av{width:28px;height:28px;border-radius:7px;object-fit:cover;flex:0 0 auto;margin-top:2px;border:1px solid rgba(201,168,76,.4)}
.m.a .b{flex:1;min-width:0;font-size:14.5px;color:var(--text)}
.m.a .b p{margin-bottom:9px}.m.a .b p:last-child{margin-bottom:0}
.m.a .b b{color:var(--text);font-weight:700}
.cta{position:sticky;bottom:0;background:linear-gradient(180deg,rgba(251,250,247,0),var(--paper) 34%);padding:22px 20px 24px}
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
    <img src="${esc(ava)}" alt="">
    <div class="t"><b>${title}</b><span>Luận bởi ${esc(thayName)} · Luận Đường</span></div>
    <img class="brand" src="/seal.webp" alt="Tử Vi Minh Bảo" width="40" height="40">
  </div>
  ${row.ctx_label ? `<div class="ctxbar">✦ <b>${esc(row.ctx_label)}</b></div>` : ''}
  <div class="chat">${bubbles}</div>
  <div class="cta">
    <div class="cta-card">
      <span class="pill">✦ Tặng Lượng miễn phí khi đăng ký</span>
      <b>Muốn hỏi thầy cho chính bạn?</b>
      <p>Đăng ký để hỏi tiếp thầy trong phiên này, hoặc tự lập lá số của riêng bạn — miễn phí.</p>
      <a class="cta-btn" href="${SITE}${ctaRoute}?fromshare=${esc(id)}">Hỏi Thầy ${esc(thayName)} →</a>
    </div>
  </div>
  <div class="foot">© 2026 Tử Vi Minh Bảo · <a href="${SITE}/app">tuviminhbao.com</a> — Lá số được lập bằng engine cổ pháp; phần luận giải do thầy thực hiện trên chính dữ liệu đó.</div>
</div>
${GA4_TRACK_SNIPPET}
</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}
