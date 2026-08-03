// app/kim-lau/route.ts
// ============================================================
// TRANG TRỤ cụm "kim lâu" — MỘT trang mạnh, cố ý KHÔNG phải cụm nhiều trang mỏng.
//
// Vì sao một trang: GSC 28 ngày cho thấy site đã có 616.715 URL nộp sitemap mà
// chỉ 612 trang từng hiện trong kết quả. Cụm nhiều trang mỏng đúng là thứ vừa
// phải gỡ ở #358. Toàn bộ nội dung mà 60 trang "tuổi X có phạm kim lâu không"
// định nói đều nằm gọn trong hai bảng tra dưới đây.
//
// Vì sao đáng làm: GSC xác nhận có cầu THẬT mà site gần như không có chữ nào —
// "cách tính kim lâu" hạng 92, "tính kim lâu làm nhà" 73, "tính tuổi kim lâu"
// 100; trong khi seo_pages 0 trang, master_articles 0, khao_luan 1.
//
// Công thức KHÔNG viết lại ở đây — nạp từ `public/tools-shared/kim-lau.js` qua
// lib/engine/kim-lau.ts, cùng file trình duyệt chạy. Trang trụ mà nói khác công
// cụ ngay bên cạnh thì hỏng cả hai.
// ============================================================
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { kimLauLoai, kimLauNamHienTai, KIM_LAU_HAI, KIM_LAU_DU, type KimLauLoai } from '@/lib/engine/kim-lau';

const BASE = 'https://www.tuviminhbao.com';
const URL_SELF = `${BASE}/kim-lau`;

function esc(s: unknown) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
function canChi(nam: number) {
  const i = (((nam - 4) % 60) + 60) % 60;
  return CAN[i % 10] + ' ' + CHI[i % 12];
}

const LOAI_LIST: KimLauLoai[] = ['Thân', 'Thê', 'Tử', 'Lục Súc'];

export async function GET() {
  const namXem = kimLauNamHienTai();
  const namXemCanChi = canChi(namXem);

  // ── Bảng tra theo NĂM SINH ───────────────────────────────────────────────────
  // Đây là bảng người ta thật sự cần: họ biết năm sinh, không biết tuổi ta.
  // Dải 18–80 tuổi ta (tuổi ta = năm xem − năm sinh + 1).
  const namSinhTu = namXem - 80 + 1;
  const namSinhDen = namXem - 18 + 1;
  const rowsNamSinh: string[] = [];
  let demPham = 0;
  for (let ns = namSinhDen; ns >= namSinhTu; ns--) {
    const tuoiTa = namXem - ns + 1;
    const loai = kimLauLoai(tuoiTa);
    if (loai) demPham++;
    rowsNamSinh.push(
      `<tr class="${loai ? 'r-bad' : 'r-ok'}"><td>${ns}</td><td>${esc(canChi(ns))}</td><td>${tuoiTa}</td><td>${
        loai ? `<b>Kim Lâu ${esc(loai)}</b> — ${esc(KIM_LAU_HAI[loai])}` : 'Không phạm'
      }</td></tr>`,
    );
  }

  // ── Bảng 4 loại ──────────────────────────────────────────────────────────────
  const rowsLoai = LOAI_LIST.map(
    (l) =>
      `<tr><td>${KIM_LAU_DU[l]}</td><td><b>Kim Lâu ${esc(l)}</b></td><td>${esc(KIM_LAU_HAI[l])}</td></tr>`,
  ).join('');

  // Ví dụ tính tay — lấy đúng năm sinh cho ra một tuổi CÓ phạm, để phép tính
  // trong ví dụ dẫn tới kết luận "phạm" (ví dụ ra "không phạm" thì người đọc
  // không thấy được cách đọc số dư).
  let viDuNamSinh = namXem - 37 + 1;
  for (let t = 30; t <= 45; t++) {
    if (kimLauLoai(t)) {
      viDuNamSinh = namXem - t + 1;
      break;
    }
  }
  const viDuTuoi = namXem - viDuNamSinh + 1;
  const viDuDu = viDuTuoi % 9;
  const viDuLoai = kimLauLoai(viDuTuoi)!;

  const faq = [
    {
      q: 'Kim Lâu là gì?',
      a: 'Kim Lâu là một quy ước trong tục xem tuổi của người Việt, dùng để chọn năm khởi công những việc hệ trọng — làm nhà, cưới hỏi, khai trương. Năm nào tuổi âm của gia chủ rơi vào Kim Lâu thì cổ tục khuyên hoãn hoặc mượn tuổi. Đây là tín ngưỡng dân gian, không phải kết luận khoa học.',
    },
    {
      q: 'Cách tính tuổi Kim Lâu thế nào?',
      a: `Lấy tuổi ÂM (tuổi ta, bằng năm xem trừ năm sinh cộng một) chia cho 9. Nếu số dư là 1, 3, 6 hoặc 8 thì phạm Kim Lâu. Thí dụ người sinh năm ${viDuNamSinh}, năm ${namXem} được ${viDuTuoi} tuổi ta; ${viDuTuoi} chia 9 dư ${viDuDu} nên phạm Kim Lâu ${viDuLoai}.`,
    },
    {
      q: 'Kim Lâu có mấy loại?',
      a: 'Bốn loại, ứng với bốn số dư. Dư 1 là Kim Lâu Thân, ảnh hưởng chính gia chủ. Dư 3 là Kim Lâu Thê, ảnh hưởng người vợ. Dư 6 là Kim Lâu Tử, ảnh hưởng con cái. Dư 8 là Kim Lâu Lục Súc, ảnh hưởng vật nuôi và tài sản.',
    },
    {
      q: 'Phạm Kim Lâu thì hóa giải bằng cách nào?',
      a: 'Cách phổ biến nhất là mượn tuổi: nhờ một người thân không phạm Kim Lâu đứng tên làm lễ động thổ, sau đó làm thủ tục chuộc nhà. Cách chắc chắn hơn là dời sang năm không phạm — bảng tra bên trên cho biết năm nào sạch. Cổ tục còn nói tới lễ cúng và làm việc thiện, nhưng đó thuộc phần tâm niệm.',
    },
    {
      q: 'Kim Lâu khác Hoang Ốc và Tam Tai ra sao?',
      a: 'Ba thứ khác nhau và tính theo ba cách riêng. Kim Lâu tính từ tuổi âm chia 9. Hoang Ốc là một vòng sáu trạng thái từ Nhất Cát tới Lục Hoang Ốc. Tam Tai là ba năm liên tiếp ứng với nhóm tam hợp của tuổi. Một năm có thể phạm cả ba, cũng có thể không phạm gì.',
    },
    {
      q: 'Nữ giới tính Kim Lâu có khác nam không?',
      a: 'Không. Cùng một phép chia 9 trên tuổi âm cho cả nam và nữ. Điều khác nhau nằm ở chỗ theo tục lệ, việc làm nhà thường xét tuổi người đứng tên gia chủ.',
    },
  ];

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Kim Lâu Là Gì? Cách Tính Tuổi Kim Lâu Năm ${namXem}`,
      description: `Cách tính tuổi Kim Lâu theo tuổi âm chia 9, bốn loại Thân Thê Tử Lục Súc, bảng tra đầy đủ theo năm sinh cho năm ${namXem} và cách hóa giải.`,
      inLanguage: 'vi',
      mainEntityOfPage: URL_SELF,
      publisher: { '@type': 'Organization', name: 'Tử Vi Minh Bảo', url: BASE },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Chọn Ngày', item: `${BASE}/chon-ngay` },
        { '@type': 'ListItem', position: 3, name: 'Kim Lâu', item: URL_SELF },
      ],
    },
  ]);

  const title = `Kim Lâu Là Gì? Cách Tính Tuổi Kim Lâu Năm ${namXem} — Bảng Tra Đầy Đủ`;
  const desc = `Cách tính tuổi Kim Lâu: lấy tuổi âm chia 9, dư 1/3/6/8 thì phạm. Bảng tra trọn năm sinh cho năm ${namXem} (${namXemCanChi}), bốn loại Thân Thê Tử Lục Súc và cách hóa giải khi làm nhà, cưới hỏi.`;

  const html = `<!DOCTYPE html><html lang="vi"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)} | Tử Vi Minh Bảo</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${URL_SELF}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${URL_SELF}">
<meta property="og:type" content="article">
<meta property="og:image" content="${BASE}/seal.webp">
<link rel="icon" type="image/webp" href="/seal.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" as="style" onload="this.rel='stylesheet'"><noscript><link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet"></noscript>
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--gold:#9A7B3A;--text:#1a1a1a;--mid:#555;--bg:#fff;--soft:#F5F4F0;--border:#e8e8e8;--bad:#B3261E;--ok:#1E6B3C}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);line-height:1.7}
.breadcrumb{background:var(--soft);border-bottom:1px solid var(--border);padding:10px 40px;font-size:12px;color:#888}
.breadcrumb a{color:#888;text-decoration:none}.breadcrumb a:hover{color:var(--navy)}
.hero{background:linear-gradient(135deg,#061A2E 0%,#0D3B5E 100%);color:#fff;padding:44px 40px 36px;text-align:center}
.hero h1{font-family:'Noto Serif',serif;font-size:29px;font-weight:600;margin-bottom:12px;line-height:1.35}
.hero p{font-size:14px;opacity:.85;max-width:660px;margin:0 auto;line-height:1.7}
.wrap{max-width:860px;margin:0 auto;padding:36px 24px 80px}
h2{font-family:'Noto Serif',serif;font-size:21px;color:var(--navy);margin:36px 0 14px;padding-bottom:9px;border-bottom:2px solid var(--border)}
h3{font-size:16px;color:var(--navy);margin:22px 0 8px}
p{margin-bottom:13px;font-size:15px}
.lead{font-size:16px;color:var(--mid)}
.formula{background:var(--soft);border-left:3px solid var(--gold);padding:16px 18px;border-radius:0 6px 6px 0;margin:16px 0;font-size:15px}
.formula b{color:var(--navy)}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--border)}
th{background:var(--soft);font-weight:600;color:var(--navy);font-size:13px;position:sticky;top:0}
.r-bad td{background:#fef7f6}.r-bad td:last-child{color:var(--bad)}
.r-ok td:last-child{color:var(--ok)}
.scroll{max-height:520px;overflow-y:auto;border:1px solid var(--border);border-radius:8px}
.cta{display:inline-block;background:var(--navy);color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:6px 8px 6px 0}
.cta.alt{background:#fff;color:var(--navy);border:1px solid var(--navy)}
.note{background:#f8f8f6;border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:13.5px;color:var(--mid);margin:18px 0}
.faq-q{font-weight:600;color:var(--navy);margin-top:16px;font-size:15px}
.rel{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.rel a{display:inline-block;padding:8px 13px;border:1px solid var(--border);border-radius:20px;text-decoration:none;color:var(--navy);font-size:13px}
.rel a:hover{border-color:var(--gold)}
@media(max-width:700px){.hero,.breadcrumb{padding-left:16px;padding-right:16px}.hero h1{font-size:22px}.wrap{padding:24px 14px 60px}th,td{padding:7px 6px;font-size:13px}}
</style>
<script src="/auth.js"></script>
</head>
<body>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=19"></script>
<div class="breadcrumb"><a href="/">Trang Chủ</a> › <a href="/chon-ngay">Chọn Ngày</a> › <span>Kim Lâu</span></div>

<div class="hero">
  <h1>Kim Lâu Là Gì? Cách Tính Tuổi Kim Lâu Năm ${namXem}</h1>
  <p>Lấy tuổi âm chia cho 9 — dư 1, 3, 6 hoặc 8 thì phạm Kim Lâu. Bên dưới là cách tính chi tiết, bảng tra trọn năm sinh cho năm ${namXem} (${esc(namXemCanChi)}) và cách hóa giải khi làm nhà, cưới hỏi.</p>
</div>

<div class="wrap">

<p class="lead">Kim Lâu là một quy ước trong tục xem tuổi của người Việt, dùng khi chọn năm khởi công những việc hệ trọng: dựng nhà, cưới hỏi, khai trương. Năm nào tuổi âm của gia chủ rơi vào Kim Lâu, cổ tục khuyên hoãn lại hoặc mượn tuổi người khác đứng ra làm lễ.</p>

<div class="note">Đây là tín ngưỡng dân gian được lưu truyền lâu đời, không phải kết luận khoa học. Trang này trình bày đúng cách tính đang được dùng phổ biến để tra cứu cho tiện, còn quyết định vẫn thuộc về gia chủ.</div>

<h2>Cách tính tuổi Kim Lâu</h2>
<p>Phép tính chỉ có một bước, nhưng phải dùng đúng <b>tuổi âm</b> (tuổi ta) chứ không phải tuổi dương:</p>
<div class="formula">
  <b>Tuổi ta</b> = năm xem − năm sinh + 1<br>
  Lấy <b>tuổi ta chia cho 9</b>. Số dư là <b>1, 3, 6 hoặc 8</b> → phạm Kim Lâu.<br>
  Các số dư còn lại (0, 2, 4, 5, 7) → không phạm.
</div>
<p><b>Thí dụ:</b> người sinh năm ${viDuNamSinh}, năm ${namXem} được <b>${viDuTuoi} tuổi ta</b>. Lấy ${viDuTuoi} chia 9 được dư <b>${viDuDu}</b> — rơi đúng vào nhóm phạm, thuộc loại <b>Kim Lâu ${esc(viDuLoai)}</b>, tức ${esc(KIM_LAU_HAI[viDuLoai])}.</p>

<h2>Bốn loại Kim Lâu</h2>
<p>Bốn số dư ứng với bốn loại, mỗi loại nói tới một đối tượng chịu ảnh hưởng khác nhau. Đây là chỗ nhiều bảng tra bỏ qua, trong khi nó quyết định mức độ hệ trọng: Kim Lâu Thê thì nên hoãn cưới, còn Lục Súc được xem là nhẹ hơn hẳn.</p>
<table>
  <thead><tr><th style="width:70px">Số dư</th><th>Loại</th><th>Ảnh hưởng tới</th></tr></thead>
  <tbody>${rowsLoai}</tbody>
</table>

<h2>Bảng tra Kim Lâu năm ${namXem} theo năm sinh</h2>
<p>Bảng dưới tra sẵn cho toàn bộ năm sinh ứng với tuổi ta từ 18 đến 80 trong năm ${namXem}. Trong dải này có <b>${demPham} năm sinh phạm Kim Lâu</b>.</p>
<div class="scroll">
<table>
  <thead><tr><th>Năm sinh</th><th>Can chi</th><th>Tuổi ta ${namXem}</th><th>Kết quả</th></tr></thead>
  <tbody>${rowsNamSinh.join('')}</tbody>
</table>
</div>
<p style="margin-top:14px"><a class="cta" href="/app/kim-lau">Tra theo năm sinh cụ thể →</a><a class="cta alt" href="/chon-ngay">Xem ngày tốt</a></p>
<p style="font-size:13.5px;color:var(--mid)">Công cụ tra cứu còn cho biết thêm Tam Tai, Hoang Ốc và bảng 20 năm tới, để tìm năm sạch gần nhất mà không phải dò tay.</p>

<h2>Hóa giải khi phạm Kim Lâu</h2>
<h3>Mượn tuổi</h3>
<p>Cách phổ biến nhất khi làm nhà. Nhờ một người thân hoặc bạn bè <b>không phạm Kim Lâu</b> trong năm đó đứng tên làm lễ động thổ, nhập trạch; xong việc thì gia chủ làm thủ tục chuộc lại nhà. Người được mượn tuổi nên là nam giới, hợp tuổi và còn đủ sức khỏe theo tục lệ.</p>
<h3>Dời sang năm không phạm</h3>
<p>Chắc chắn hơn cả, và không tốn gì. Bảng tra bên trên cho biết ngay năm nào sạch — vì Kim Lâu xoay theo chu kỳ 9 năm nên năm sạch gần nhất thường chỉ cách một tới hai năm.</p>
<h3>Lễ cúng và làm việc thiện</h3>
<p>Cổ tục còn nói tới lễ động thổ chu đáo và tích thiện để nhẹ bớt. Phần này thuộc về tâm niệm, không có cách nào đo được — nêu ra cho đủ, không khuyên nên xem đó là bảo đảm.</p>

<h2>Phân biệt Kim Lâu, Hoang Ốc và Tam Tai</h2>
<p>Ba thứ hay bị gộp làm một, nhưng tính theo ba cách hoàn toàn riêng. <b>Kim Lâu</b> lấy tuổi âm chia 9. <b>Hoang Ốc</b> là một vòng sáu trạng thái, từ Nhất Cát tới Lục Hoang Ốc. <b>Tam Tai</b> là ba năm liên tiếp ứng với nhóm tam hợp của tuổi. Một năm có thể phạm cả ba, cũng có thể không phạm gì cả — nên tra riêng từng thứ rồi mới kết luận.</p>

<h2>Câu hỏi thường gặp</h2>
${faq.map((f) => `<div class="faq-q">${esc(f.q)}</div><p>${esc(f.a)}</p>`).join('')}

<h2>Xem thêm</h2>
<div class="rel">
  <a href="/app/kim-lau">Công cụ Kim Lâu &amp; Tam Tai</a>
  <a href="/chon-ngay">Chọn ngày tốt</a>
  <a href="/van-han">Vận hạn theo tuổi</a>
  <a href="/app/bat-trach">Bát trạch — hướng nhà</a>
  <a href="/xem-tuoi.html">Xem tuổi vợ chồng</a>
  <a href="/luan-giai.html">Luận giải lá số</a>
</div>

</div>
<script src="/footer.js"></script>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
