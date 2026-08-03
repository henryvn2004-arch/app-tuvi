// app/ket-qua/[id]/route.ts
// Trang CÔNG KHAI read-only của 1 kết quả khung giữa (workspace) được chia sẻ —
// feature "Chia sẻ" dùng chung cho mọi tool /app (ảnh AI hoặc trích kết quả
// text). Server-render để OG unfurl chạy trên FB/Zalo. Snapshot lưu ở bảng
// shared_results (POST tạo ở app/api/share-result/route.ts).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GA4_TRACK_SNIPPET } from '@/lib/analytics/isr-tracking';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SITE = 'https://www.tuviminhbao.com';

interface ShareBlock {
  header: string | null;
  image: string | null;
  text: string | null;
}

interface ShareRow {
  tool_id: string;
  kind: 'image' | 'text';
  title: string;
  image_url: string | null;
  text_content: string | null;
  blocks: ShareBlock[] | null;
  revoked: boolean;
}

function esc(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface SignupOffer { bonus: number | null; price: number | null; }

/** Quà đăng ký (mức thấp nhất trong các biến thể A/B) + giá tool đang chia sẻ.
 *  Best-effort: lỗi/thiếu dữ liệu → trả null, copy CTA lùi về câu chung chung. */
async function signupOffer(
  sb: SupabaseClient | null,
  toolId: string,
): Promise<SignupOffer> {
  if (!sb) return { bonus: null, price: null };
  try {
    const [cfg, price] = await Promise.all([
      sb.from('app_config').select('value').eq('key', 'credits.signup_bonus_variants').maybeSingle(),
      sb.from('tool_pricing').select('credits').eq('tool_id', toolId).maybeSingle(),
    ]);
    const raw = cfg.data?.value as unknown;
    const variants = (Array.isArray(raw) ? raw : [raw])
      .map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    const p = Number((price.data as { credits?: unknown } | null)?.credits);
    return {
      bonus: variants.length ? Math.min(...variants) : null,
      price: Number.isFinite(p) && p > 0 ? p : null,
    };
  } catch {
    return { bonus: null, price: null };
  }
}

function page404(): Response {
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Không tìm thấy kết quả</title>
<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#F4F2EC;color:#1a1a1a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:20px}a{color:#9A7B3A}</style></head>
<body><div><h1 style="font-family:Georgia,serif">Kết quả không tồn tại</h1><p>Link chia sẻ đã bị gỡ hoặc không đúng.</p><p><a href="${SITE}/app">Vào Luận Đường →</a></p></div>${GA4_TRACK_SNIPPET}
</body></html>`;
  return new Response(html, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!id || !/^[A-Za-z0-9]{6,16}$/.test(id)) return page404();

  let row: ShareRow | null = null;
  let sb: SupabaseClient | null = null;
  try {
    // `cache:'no-store'`: Next BỌC fetch toàn cục và ghi nhớ kết quả (kể cả với
    // `dynamic='force-dynamic'` — bắt được khi test: đổi giá trị dưới DB xong
    // trang vẫn trả số cũ). Với trang này thì cache là sai hẳn — link vừa bị gỡ
    // (revoked) phải 404 ngay, và câu chữ CTA phải bám giá/quà thật.
    sb = createClient(SB_URL, SB_KEY, {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data } = await sb.from('shared_results')
      .select('tool_id,kind,title,image_url,text_content,blocks,revoked').eq('id', id).single();
    row = (data as ShareRow) || null;
    if (row && !row.revoked) {
      sb.rpc('incr_shared_result_view', { p_id: id }).then(() => {}, () => {});
    }
  } catch {
    /* fall through → 404 */
  }
  if (!row || row.revoked) return page404();

  // Quà đăng ký + giá tool: đọc THẲNG từ nguồn thật (app_config/tool_pricing)
  // thay vì viết cứng con số vào copy. Quà hiện là A/B nhiều mức nên lấy mức
  // THẤP NHẤT — hứa cái ai cũng nhận được; nếu sau này Henry chốt một mức duy
  // nhất thì câu chữ tự khớp, không phải sửa code. Chỉ nói "đủ dùng thử ngay"
  // khi quà THẬT SỰ ≥ giá tool — hứa hụt ngay lần đầu là mất niềm tin.
  const offer = await signupOffer(sb, row.tool_id);

  const title = esc(row.title || 'Kết quả Luận Đường');
  const url = `${SITE}/ket-qua/${esc(id)}`;
  const isImage = row.kind === 'image' && row.image_url;
  const hasBlocks = Array.isArray(row.blocks) && row.blocks.length > 0;
  // **đậm** → <strong> (an toàn: escape TRƯỚC rồi mới thay thế) — khớp
  // mdBoldParas dùng ở workspace (vd luận giải cung Phu Thê có markdown bold).
  const textParas = (t: string) => t.split(/\n{2,}/).map((p) => '<p>' + esc(p).replace(/\n/g, '<br>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') + '</p>').join('');

  // Nguồn teaser/OG ưu tiên: block đầu có text > text_content phẳng > câu chung chung.
  const firstBlockText = hasBlocks ? (row.blocks as ShareBlock[]).find((b) => b.text)?.text || '' : '';
  const firstBlockImage = hasBlocks ? (row.blocks as ShareBlock[]).find((b) => b.image)?.image || '' : '';
  const teaserSrc = firstBlockText || row.text_content || '';
  const teaser = teaserSrc.replace(/[*#\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)
    || (isImage || firstBlockImage ? 'Xem kết quả AI luận từ lá số Tử Vi — Tử Vi Minh Bảo.' : '');
  const desc = esc(teaser || 'Luận giải Tử Vi bởi Tử Vi Minh Bảo.');

  // OG image: ưu tiên ảnh THẬT (block đầu có ảnh, hoặc image_url phẳng) — dùng
  // thẳng, không cần render lại. Chỉ dựng card satori khi hoàn toàn không có ảnh.
  const ogImgSrc = firstBlockImage || (isImage ? (row.image_url as string) : '');
  const ogImg = ogImgSrc
    ? esc(ogImgSrc)
    : esc(`${SITE}/api/og/luan-duong?${new URLSearchParams({ ctx: row.title || '', thay: 'Tử Vi Minh Bảo', q: teaser.slice(0, 150) }).toString()}`);

  // ── MẮT XÍCH VIRAL ──
  // shell.js gắn ?ref=<mã của người chia sẻ> vào link này. Trước đây trang chỉ
  // trỏ CTA sang /app/<tool> TRẦN → người mở link có đăng ký cũng không ai được
  // thưởng, hệ thống không biết họ tới từ đâu (bảng referrals đứng yên 0 dòng).
  // Nay chuyển tiếp mã + UTM sang CTA để referral.js bên /app bắt được.
  const refRaw = req.nextUrl.searchParams.get('ref') || '';
  const ref = /^[A-Za-z0-9]{8}$/.test(refRaw) ? refRaw.toUpperCase() : '';
  const ctaParams = new URLSearchParams({ utm_source: 'share', utm_medium: 'link', utm_campaign: row.tool_id });
  if (ref) ctaParams.set('ref', ref);
  const ctaRoute = `/app/${row.tool_id}?${ctaParams.toString()}`;

  const pillTxt = offer.bonus
    ? `✦ Đăng ký nhận ${offer.bonus} Lượng miễn phí`
    : '✦ Tặng Lượng miễn phí khi đăng ký';
  const ctaDesc = offer.bonus && offer.price && offer.bonus >= offer.price
    ? `Đăng ký nhận ${offer.bonus} Lượng — đủ dùng công cụ này cho lá số của chính bạn.`
    : offer.bonus
      ? `Đăng ký nhận ${offer.bonus} Lượng miễn phí để tự lập lá số và dùng công cụ này.`
      : 'Đăng ký để tự lập lá số và dùng công cụ này — miễn phí.';

  // Render Y HỆT layout card (.blk) của workspace khi có blocks có cấu trúc —
  // mỗi block là 1 card riêng (header + ảnh/text), giống hệt .res-block trong
  // app-*.html. Fallback về ảnh/text phẳng cho các share cũ trước khi có blocks.
  const renderBlock = (blk: ShareBlock): string => {
    const header = blk.header ? `<div class="blk-h">${esc(blk.header)}</div>` : '';
    const img = blk.image ? `<img class="blk-img" src="${esc(blk.image)}" alt="${title}">` : '';
    const txt = blk.text ? `<div class="res-text">${textParas(blk.text)}</div>` : '';
    const bodyInner = img && txt
      ? `<div class="blk-row">${img}<div class="blk-col">${txt}</div></div>`
      : img + txt;
    return `<div class="blk">${header}<div class="blk-b">${bodyInner}</div></div>`;
  };

  const body = hasBlocks
    ? (row.blocks as ShareBlock[]).map(renderBlock).join('')
    : isImage
      ? `<img class="res-img" src="${esc(row.image_url as string)}" alt="${title}">` +
        (row.text_content ? `<div class="res-text" style="margin-top:16px">${textParas(row.text_content)}</div>` : '')
      : `<div class="res-text">${textParas(row.text_content || '')}</div>`;

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
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet"></noscript>
<style>
:root{--navy:#061A2E;--gold:#C9A84C;--gold-soft:#9A7B3A;--gold-lt:#F9F4EB;--red:#C0392B;--paper:#FBFAF7;--paper2:#F4F2EC;--white:#fff;--text:#1a1a1a;--text-mid:#4a4a4a;--text-lt:#7a7a7a;--line:#E6E3DC;--serif:'Noto Serif',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--sans);background:var(--paper2);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:720px;margin:0 auto;min-height:100vh;background:var(--paper);box-shadow:0 0 40px rgba(6,26,46,.06)}
.top{background:linear-gradient(180deg,var(--navy),#0A2540);color:#fff;padding:18px 20px;display:flex;align-items:center;gap:13px}
.top .t{flex:1;min-width:0}
.top .t b{font-family:var(--serif);font-size:16px;display:block}
.top .t span{font-size:12px;color:var(--gold)}
.top .brand{width:40px;height:40px;flex:0 0 auto;object-fit:contain;opacity:.92}
.body{padding:20px}
.res-img{display:block;width:100%;border-radius:12px;box-shadow:0 8px 24px rgba(6,26,46,.16)}
.res-text{font-size:14.5px;color:var(--text)}
.res-text p{margin-bottom:12px}
.blk{border:1px solid var(--line);border-radius:10px;margin-bottom:16px;background:var(--white);overflow:hidden}
.blk-h{padding:12px 16px;background:#F5F4F0;border-bottom:1px solid var(--line);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--navy)}
.blk-b{padding:16px}
.blk-row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}
.blk-img{width:220px;max-width:100%;border-radius:10px;box-shadow:0 8px 24px rgba(6,26,46,.16);display:block;flex:0 0 auto}
.blk-col{flex:1;min-width:200px}
.blk-col .res-text{margin:0}
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
    <img class="brand" src="/seal.webp" alt="Tử Vi Minh Bảo" width="40" height="40">
  </div>
  <div class="body">${body}</div>
  <div class="cta">
    <div class="cta-card">
      <span class="pill">${esc(pillTxt)}</span>
      <b>Muốn xem kết quả của riêng bạn?</b>
      <p>${esc(ctaDesc)}</p>
      <a class="cta-btn" id="ctaBtn" href="${SITE}${ctaRoute}">Thử ngay →</a>
    </div>
  </div>
  <div class="foot">© 2026 Tử Vi Minh Bảo · <a href="${SITE}/app">tuviminhbao.com</a> — Lá số được lập bằng engine cổ pháp; phần luận giải do AI thực hiện trên chính dữ liệu đó.</div>
</div>
${GA4_TRACK_SNIPPET}
<script>
// Đo vòng lặp viral ở đúng khúc trước nay MÙ: người mở link chia sẻ (share_view)
// và người bấm CTA (cta_click). track.js đã được GA4_TRACK_SNIPPET nạp sẵn
// (defer) — KHÔNG thêm thẻ script thứ hai, nạp hai lần là page_view đếm đôi.
// defer chạy xong trước DOMContentLoaded → window.Track chắc chắn sẵn sàng.
document.addEventListener('DOMContentLoaded', function () {
  if (!window.Track || !window.Track.event) return;
  var t = ${JSON.stringify(row.tool_id)}, sid = ${JSON.stringify(id)};
  window.Track.event('share_view', { tool_id: t, slug: sid, meta: { with_ref: ${ref ? 'true' : 'false'} } });
  var b = document.getElementById('ctaBtn');
  if (b) b.addEventListener('click', function () {
    window.Track.event('cta_click', { tool_id: t, slug: sid, meta: { from: 'share', with_ref: ${ref ? 'true' : 'false'} } });
  });
});
</script>
</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}
