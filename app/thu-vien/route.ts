// app/thu-vien/route.ts
// ============================================================
// C3 — THƯ VIỆN CHUNG: những bản luận người dùng đã bấm "Chia sẻ".
//
// Henry chốt **AUTO OPT-IN, trừ khi người dùng chọn ẩn** (`gallery_opt_out`).
//
// 🔴 `noindex, follow` — CỐ Ý, và đây là quyết định TÁCH BIỆT với chuyện có mặt
// trong thư viện:
//   • Liệt kê trong site = thứ Henry vừa duyệt.
//   • Đẩy tên người thật vào Google = một quyết định khác hẳn, và khó lùi hơn
//     nhiều (gỡ khỏi index mất hàng tuần, còn gỡ khỏi thư viện là tức thì).
//   • Chính `/ket-qua/[id]` — thứ trang này trỏ tới — ĐÃ `noindex, follow` từ
//     trước. Một trang hub index được mà trỏ vào toàn trang noindex thì phần
//     index chỉ còn là danh sách tên người, tức đúng phần đáng ngại nhất mà
//     không kèm phần đáng giá nào.
// Muốn mở index thì đổi ĐÚNG một dòng `ROBOTS` bên dưới.
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createClient } from '@supabase/supabase-js';
import { GA4_TRACK_SNIPPET } from '@/lib/analytics/isr-tracking';

const SB_URL = process.env.SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SITE = 'https://www.tuviminhbao.com';

/** Đổi thành 'index, follow' nếu Henry chốt cho Google đọc. Xem chú thích đầu file. */
const ROBOTS = 'noindex, follow';

/**
 * Số dòng ĐỌC lên. Phải lớn hơn hẳn `MAX_CARDS` vì hai bộ lọc bên dưới cắt đi
 * rất nhiều: đo trên prod, 50 dòng chỉ còn 34 thẻ nhìn khác nhau, và sau khi
 * chặn trần mỗi tool thì còn 23.
 */
const FETCH = 200;
/** Trần số thẻ vẽ ra. */
const MAX_CARDS = 60;
/**
 * Trần mỗi tool.
 *
 * 🔑 Đây là lá chắn CHÍNH, và nó phải theo TOOL chứ không theo NGƯỜI. Đo trên
 * prod: **27/50 dòng là ẩn danh** (`owner_user_id` NULL) ⇒ cap theo người
 * không với tới quá nửa dữ liệu. Mà người xem cũng không biết ai tạo thẻ nào —
 * thứ họ thấy là *"lại Chân Dung Vợ Chồng nữa"*: sau khi gộp trùng, tool đó
 * vẫn chiếm **12/34 = 35%** lưới.
 *
 * 4 là đủ để thấy một tool ra được nhiều kiểu kết quả khác nhau, mà không để
 * tool nào chiếm quá ~1/5 lưới.
 */
const MAX_PER_TOOL = 4;

interface Row {
  id: string;
  tool_id: string;
  kind: 'image' | 'text';
  title: string;
  image_url: string | null;
  text_content: string | null;
  blocks: { header: string | null; image: string | null; text: string | null }[] | null;
  created_at: string;
}

function esc(s: string): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function page(bodyHtml: string, count: number): Response {
  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Thư Viện Luận Đường — những bản luận đã được chia sẻ | Tử Vi Minh Bảo</title>
<meta name="description" content="Những bản luận Tử Vi do chính người dùng bấm chia sẻ — chân dung, cẩm nang ứng xử, luận giải lá số. Xem thử rồi tự lập lá số của bạn.">
<meta name="robots" content="${ROBOTS}">
<link rel="canonical" href="${SITE}/thu-vien">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,600;0,700&display=swap" rel="stylesheet"></noscript>
<style>
:root{--navy:#061A2E;--gold:#9A7B3A;--gold-soft:#C9AE6A;--gold-lt:#F9F4EB;--paper:#F4F2EC;
--white:#fff;--text:#1a1a1a;--text-mid:#4a4a4a;--text-lt:#6b6b6b;--line:#E8E8E8;--red:#C0392B;
--serif:'Noto Serif',Georgia,serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6}
.wrap{max-width:1000px;margin:0 auto;padding:0 16px 40px}
.top{display:flex;align-items:center;gap:12px;padding:18px 0 6px}
.top img{width:40px;height:40px;border-radius:8px}
.top b{font-family:var(--serif);font-size:19px;display:block;color:var(--navy)}
.top span{font-size:12.5px;color:var(--text-mid)}
.lead{font-size:14px;color:var(--text-mid);margin:12px 0 20px;max-width:640px}
.lead b{color:var(--text)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.card{display:block;text-decoration:none;color:inherit;background:var(--white);border:1px solid var(--line);
border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(6,26,46,.06)}
.card .ph{aspect-ratio:3/4;background:var(--gold-lt);display:block;width:100%;object-fit:cover}
.card .ph.txt{display:flex;align-items:center;justify-content:center;aspect-ratio:16/10;
font-family:var(--serif);font-size:13px;color:var(--gold);padding:14px;text-align:center;line-height:1.6}
.card .meta{padding:11px 13px}
.card .t{font-family:var(--serif);font-size:14px;font-weight:600;color:var(--navy);
display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .s{font-size:11.5px;color:var(--text-lt);margin-top:4px}
.cta{margin:26px 0 0;background:var(--white);border:1px solid var(--gold-soft);border-radius:14px;
padding:18px;text-align:center}
.cta b{font-family:var(--serif);font-size:16px;display:block;margin-bottom:5px;color:var(--navy)}
.cta p{font-size:13px;color:var(--text-mid);margin-bottom:13px}
.cta a{display:inline-block;background:var(--red);color:#fff;text-decoration:none;font-family:var(--serif);
font-weight:600;font-size:15px;padding:11px 26px;border-radius:9px}
.empty{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:26px;text-align:center;color:var(--text-mid);font-size:14px}
.foot{margin-top:26px;font-size:11.5px;color:var(--text-lt);text-align:center;line-height:1.8}
.foot a{color:var(--gold)}
@media(max-width:520px){.grid{grid-template-columns:1fr 1fr;gap:10px}.card .t{font-size:13px}}
</style></head>
<body><div class="wrap">
  <div class="top">
    <img src="/seal.webp" alt="Tử Vi Minh Bảo" width="40" height="40">
    <div><b>Thư Viện Luận Đường</b><span>${count} bản luận người dùng đã chia sẻ</span></div>
  </div>
  <p class="lead">Đây là những bản luận do <b>chính người dùng bấm "Chia sẻ"</b> — không phải mẫu dựng sẵn. Mở một bản bất kỳ để xem tool đọc được gì từ một lá số thật.</p>
  ${bodyHtml}
  <div class="cta">
    <b>Muốn xem bản của chính bạn?</b>
    <p>Nhập ngày sinh — xem ngay, không cần đăng ký.</p>
    <a href="${SITE}/app?utm_source=thu-vien&utm_medium=internal&utm_campaign=gallery">Vào Luận Đường →</a>
  </div>
  <div class="foot">
    Mỗi bản ở đây do người tạo tự chia sẻ và có thể tự ẩn đi bất cứ lúc nào.<br>
    © 2026 Tử Vi Minh Bảo · <a href="${SITE}/app">tuviminhbao.com</a>
  </div>
</div>${GA4_TRACK_SNIPPET}
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Trang đọc dữ liệu người dùng vừa chia sẻ/vừa ẩn → cache ngắn ở CDN cho
      // rẻ, nhưng đừng lâu tới mức người bấm "Ẩn" xong vẫn thấy bản của mình.
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

const TOOL_NHAN: Record<string, string> = {
  'chan-dung-vo-chong': 'Chân Dung Vợ Chồng',
  'chan-dung-tien-kiep': 'Chân Dung Tiền Kiếp',
  'duyen-no-tien-kiep': 'Duyên Nợ Tiền Kiếp',
  'nguoi-khac': 'Lá Số Người Khác',
  'day-con': 'Dạy Con Theo Lá Số',
  'nhan-mach': 'Sổ Nhân Mạch',
  'luan-giai': 'Luận Giải Lá Số',
  'cong-so': 'Tử Vi Công Sở',
  'kinh-dich': 'Gieo Quẻ Kinh Dịch',
  // Ba cái dưới đây thiếu từ đầu nên vẫn đang hiện nhãn chung "Luận Đường" —
  // phát hiện khi đếm phân bố tool trên prod, không phải khi đọc code.
  // ⚠️ Bảng này là bản CHÉP TAY và sẽ trôi khỏi `tool_pricing.label`. Cố ý
  // không đọc thẳng DB: `shared_results.tool_id` dùng id của shell
  // (`luan-giai`) còn bảng giá dùng id khác (`laso`), nối được thì phải kéo
  // theo `tool_canon()` — không đáng cho một cái nhãn.
  'van-han-nam': 'Vận Hạn 12 Tháng Tới',
  'hoang-dao': 'Giờ Hoàng Đạo',
  'but-tuong': 'Bút Tướng — Xem Chữ Ký',
};

/**
 * Ảnh đại diện của một thẻ. Dùng CHUNG cho khoá gộp trùng và cho thẻ vẽ ra —
 * hai bên mà tính khác nhau thì gộp theo một đằng, hiện theo một nẻo.
 */
function anhCua(r: Row): string {
  return (
    r.image_url || (Array.isArray(r.blocks) ? r.blocks.find((b) => b && b.image)?.image : '') || ''
  );
}

/**
 * Gộp thẻ TRÙNG NHÌN + chặn trần mỗi tool.
 *
 * 🔑 Khoá gộp là thứ NGƯỜI XEM NHÌN THẤY (`tool_id` + ảnh, hoặc tiêu đề khi
 * không có ảnh), KHÔNG phải chủ sở hữu. Hai thẻ trông y hệt thì thẻ thứ hai
 * không nói thêm được gì cho người xem, bất kể ai tạo ra nó — mà người xem
 * cũng không có cách nào biết ai tạo.
 *
 * Giữ bản MỚI NHẤT của mỗi khoá (`rows` đã sắp giảm dần theo `created_at`).
 */
function locThe(rows: Row[]): Row[] {
  const daThay = new Set<string>();
  const demTool = new Map<string, number>();
  const ra: Row[] = [];
  for (const r of rows) {
    if (ra.length >= MAX_CARDS) break;
    const nhinThay = anhCua(r) || (r.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
    // Không có cả ảnh lẫn tiêu đề thì không gộp được theo cái gì — lấy `id` để
    // nó không bao giờ đụng khoá của dòng khác (thà thừa còn hơn nuốt nhầm).
    const khoa = r.tool_id + '|' + (nhinThay || 'id:' + r.id);
    if (daThay.has(khoa)) continue;
    const n = demTool.get(r.tool_id) || 0;
    if (n >= MAX_PER_TOOL) continue;
    daThay.add(khoa);
    demTool.set(r.tool_id, n + 1);
    ra.push(r);
  }
  return ra;
}

export async function GET(): Promise<Response> {
  let rows: Row[] = [];
  try {
    const sb = createClient(SB_URL, SB_KEY, {
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const { data } = await sb
      .from('shared_results')
      .select('id,tool_id,kind,title,image_url,text_content,blocks,created_at')
      .eq('revoked', false)
      .eq('gallery_opt_out', false)
      .order('created_at', { ascending: false })
      .limit(FETCH);
    rows = locThe((data as Row[]) || []);
  } catch (e) {
    console.error('[thu-vien] đọc hỏng', e);
    // Đọc hụt → trang vẫn dựng, chỉ là rỗng. KHÔNG 500: đây là trang công khai
    // và một nhịp Supabase chớp không đáng làm nó chết hẳn.
  }

  if (!rows.length) {
    return page(
      '<div class="empty">Chưa có bản luận nào được chia sẻ. Bạn có thể là người đầu tiên.</div>',
      0,
    );
  }

  const cards = rows
    .map((r) => {
      const img = anhCua(r);
      const nhan = TOOL_NHAN[r.tool_id] || 'Luận Đường';
      // Thẻ không ảnh: lấy câu đầu làm nền chữ. Cắt sạch markdown + xuống dòng.
      const teaser =
        (Array.isArray(r.blocks) ? r.blocks.find((b) => b && b.text)?.text || '' : '') ||
        r.text_content ||
        '';
      const cut = teaser.replace(/[*#\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
      const ph = img
        ? `<img class="ph" src="${esc(img)}" alt="" loading="lazy" width="220" height="293">`
        : `<div class="ph txt">${esc(cut || nhan)}</div>`;
      return `<a class="card" href="/ket-qua/${esc(r.id)}?utm_source=thu-vien&utm_medium=internal">
      ${ph}
      <div class="meta"><div class="t">${esc(r.title || nhan)}</div><div class="s">${esc(nhan)}</div></div>
    </a>`;
    })
    .join('\n');

  return page(`<div class="grid">${cards}</div>`, rows.length);
}
