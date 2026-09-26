// app/ket-qua-laso/[token]/route.ts
// ============================================================
// Permalink RIÊNG TƯ xem báo cáo luận giải (Pha 5b productize, 2026-09-17) —
// mở bằng magic link gửi qua email `resend-pdf/route.ts`, KHÔNG cần đăng
// nhập (mở trên điện thoại khác máy đã đăng ký vẫn xem được).
//
// 🔑 KHÁC `/ket-qua/[id]` (tính năng "Chia sẻ" công khai có sẵn, bảng
// `shared_results`, id ngẫu nhiên nhưng bất kỳ ai cũng TỰ TẠO được bằng nút
// "Chia sẻ") — trang NÀY chỉ mở được bằng token do SERVER sinh khi gửi email,
// không có nút "tạo link" nào phía client. `noindex, nofollow` tuyệt đối —
// đây là link cá nhân, không phải nội dung công khai.
// 🔑 KHÁC `/la-so/[slug]` (trang SEO công khai có sẵn) — slug suy được từ
// ngày sinh (không bí mật), token ở đây là CSPRNG độc lập, không suy ngược
// được từ bất cứ dữ liệu công khai nào.
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GA4_TRACK_SNIPPET } from '@/lib/analytics/isr-tracking';
import { TOOL_META, type LuanGiaiToolId } from '@/lib/pdf/luan-giai';
import { buildPhans } from '@/lib/pdf/phan-labels';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SITE = 'https://www.tuviminhbao.com';

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// **đậm** → <strong> + đoạn văn theo dòng trống — khớp mdBoldParas dùng ở
// workspace (vd luận giải cung Phu Thê có markdown bold), cùng công thức
// `textParas` của app/ket-qua/[id]/route.ts (escape TRƯỚC rồi mới thay thế).
function textParas(t: string): string {
  return t.split(/\n{2,}/).map((p) =>
    '<p>' + esc(p).replace(/\n/g, '<br>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') + '</p>'
  ).join('');
}

function page404(): Response {
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Không tìm thấy báo cáo</title><meta name="robots" content="noindex, nofollow">
<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#F4F2EC;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:20px}a{color:#9A7B3A}</style></head>
<body><div><h1 style="font-family:Georgia,serif">Không tìm thấy báo cáo</h1><p>Link đã hết hạn hoặc không đúng — thử gửi lại PDF từ tài khoản của bạn (tab Lịch Sử).</p><p><a href="${SITE}/app">Hỏi Thầy →</a></p></div>
</body></html>`;
  return new Response(html, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token } = await ctx.params;
  // randomBytes(24).toString('base64url') = đúng 32 ký tự — validate SỚM để
  // không tốn một lượt Supabase cho input rác.
  if (!token || !/^[A-Za-z0-9_-]{32}$/.test(token)) return page404();

  const sb = createClient(SB_URL, SB_KEY, {
    // `cache:'no-store'`: Next bọc `fetch` toàn cục kể cả với `dynamic=
    // 'force-dynamic'` — link vừa hết hạn/xoá phải 404 ngay, không phải chờ
    // hết cache. Đúng bẫy đã ghi ở app/ket-qua/[id]/route.ts.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });

  const { data: link } = await sb.from('report_links')
    .select('slug, tool_id').eq('token', token).maybeSingle();
  if (!link) return page404();

  const toolId = link.tool_id as LuanGiaiToolId;
  const meta = TOOL_META[toolId];
  if (!meta) return page404();

  const { data: row } = await sb.from('laso_public')
    .select('person_name, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh, gio_chi, cung_menh, luan_giai')
    .eq('slug', link.slug).maybeSingle();
  if (!row) return page404();

  const phans = buildPhans(row.luan_giai as Record<string, unknown> | null);
  if (!phans.length) return page404();

  const hoTen = row.person_name ? esc(row.person_name) : '';
  const gioi = row.gioi_tinh === 'nam' ? 'Nam' : row.gioi_tinh === 'nu' ? 'Nữ' : '';
  const ngaySinh = [row.ngay_sinh, row.thang_sinh, row.nam_sinh].every((v) => v != null)
    ? `${row.ngay_sinh}/${row.thang_sinh}/${row.nam_sinh}` : '';
  const subtitle = [ngaySinh, row.gio_chi ? `giờ ${row.gio_chi}` : '', gioi].filter(Boolean).join(' · ');
  const title = `${meta.title}${hoTen ? ' — ' + hoTen : ''}`;

  const jumpNav = phans.map((p) => `<a href="#p${esc(p.key)}">${esc(p.title)}</a>`).join('');
  const sections = phans.map((p) => `<section class="phan" id="p${esc(p.key)}">
    <h2><span class="num">${esc(p.key)}</span>${esc(p.title)}</h2>
    <div class="res-text">${textParas(p.text)}</div>
  </section>`).join('');

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)} — Tử Vi Minh Bảo</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet"></noscript>
<style>
:root{--navy:#061A2E;--gold:#C9A84C;--gold-soft:#9A7B3A;--gold-lt:#F9F4EB;--paper:#FBFAF7;--paper2:#F4F2EC;--white:#fff;--text:#1a1a1a;--text-mid:#4a4a4a;--text-lt:#7a7a7a;--line:#E6E3DC;--serif:'Noto Serif',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--sans);background:var(--paper2);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:720px;margin:0 auto;min-height:100vh;background:var(--paper);box-shadow:0 0 40px rgba(6,26,46,.06)}
.top{background:linear-gradient(180deg,var(--navy),#0A2540);color:#fff;padding:22px 20px}
.top-row{display:flex;align-items:center;gap:13px;margin-bottom:2px}
.top .t{flex:1;min-width:0}
.top .t b{font-family:var(--serif);font-size:17px;display:block}
.top .t span{font-size:12px;color:var(--gold)}
.top .brand{width:40px;height:40px;flex:0 0 auto;object-fit:contain;opacity:.92}
.jump{display:flex;gap:6px;overflow-x:auto;padding:14px 20px 0;background:var(--paper);border-bottom:1px solid var(--line);scrollbar-width:none}
.jump a{flex:0 0 auto;font-size:12px;color:var(--gold-soft);text-decoration:none;background:var(--gold-lt);border:1px solid var(--line);border-radius:20px;padding:5px 12px;white-space:nowrap;margin-bottom:14px}
.body{padding:20px}
.phan{padding:18px 0;border-bottom:1px solid var(--line)}
.phan:last-child{border-bottom:0}
.phan h2{font-family:var(--serif);font-size:16px;color:var(--navy);display:flex;align-items:center;gap:9px;margin-bottom:10px}
.num{width:22px;height:22px;flex:0 0 auto;border-radius:5px;background:var(--navy);color:var(--gold);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.res-text{font-size:14.5px;color:var(--text)}
.res-text p{margin-bottom:12px}
.foot{text-align:center;padding:16px 20px 24px;font-size:11px;color:var(--text-lt)}
.foot a{color:var(--gold-soft)}
</style></head>
<body>
<div class="wrap">
  <div class="top">
    <div class="top-row">
      <div class="t"><b>${esc(title)}</b><span>${esc(subtitle || 'Tử Vi Minh Bảo · Hỏi Thầy')}</span></div>
      <img class="brand" src="/seal.webp" alt="Tử Vi Minh Bảo" width="40" height="40">
    </div>
  </div>
  <div class="jump">${jumpNav}</div>
  <div class="body">${sections}</div>
  <div class="foot">Báo cáo riêng tư — link này chỉ gửi cho bạn, đừng chia sẻ công khai.<br>
    © 2026 Tử Vi Minh Bảo · <a href="${SITE}/app">tuviminhbao.com</a></div>
</div>
${GA4_TRACK_SNIPPET}
<script>
document.addEventListener('DOMContentLoaded', function () {
  if (!window.Track || !window.Track.event) return;
  window.Track.event('report_link_view', { tool_id: ${JSON.stringify(toolId)} });
});
</script>
</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' },
  });
}
