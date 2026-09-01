// app/du-lieu/route.ts
// ============================================================
// BỘ DỮ LIỆU MỞ — mục #10/14 (growth hack GH2).
//
// 🔑 Nước đi ở đây KHÔNG phải "có thêm một trang": nó là backlink đến từ
// ĐIỀU KIỆN SỬ DỤNG chứ không từ việc đi xin. CC BY 4.0 BUỘC người dùng lại
// dữ liệu phải ghi nguồn — mà nhà báo, blogger, sinh viên viết về tử vi đều
// cần một con số có nguồn, và hiện chưa ai công bố con số nào cả.
//
// ⚠️ Chỉ công bố thứ SUY RA TỪ ENGINE. Tuyệt đối không có dữ liệu người dùng
// — cùng luật đã ghi ở `app/bao-chi/route.ts`. Và câu cảnh báo "đây là phân
// bố trên KHÔNG GIAN GIỜ SINH, không phải phân bố dân số" phải đi kèm mọi
// con số: thiếu nó thì người ta trích thành "X% người Việt có mệnh Tử Vi",
// một câu mình không có dữ liệu để nói.
//
// Số trên trang ĐỌC THẲNG từ file dữ liệu đã sinh (`public/data/…json`),
// không gõ tay. Trang nói một đằng file tải về nói một nẻo là hỏng đúng thứ
// duy nhất bộ dữ liệu này bán: sự đáng tin.
// ============================================================
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEO_BASE, ORG_ID } from '@/lib/seo/entity';
import { orgNode } from '@/lib/seo/same-as';

function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Số thập phân theo lối Việt: DẤU PHẨY. Bắt buộc vì cùng trang đang dùng
// `toLocaleString('vi-VN')` cho số đếm → "96.480" (chấm = hàng nghìn). Để
// phần trăm ở "16.5" là cùng một dấu chấm mang hai nghĩa trong hai cột cạnh
// nhau — người đọc Việt hiểu nhầm ngay.
const pct = (n: number) => n.toFixed(1).replace('.', ',');

interface Item { value: string; count: number; percent: number }
interface Dist { label: string; note?: string; items?: Item[]; count?: number; percent?: number }
interface Dataset {
  version: string;
  generatedAt: string;
  method: { vi: string; en: string };
  caveat: { vi: string; en: string };
  totals: { charts: number; yearsCovered: number; dayStep: number };
  distributions: Record<string, Dist>;
}

function loadDataset(): Dataset | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'tuvi-dataset-v1.json'), 'utf8'));
  } catch {
    // Thiếu file thì ẨN phần số, KHÔNG dựng bảng rỗng — bảng toàn số 0 đọc ra
    // thành "dữ liệu nói không có gì", tệ hơn hẳn không có bảng.
    return null;
  }
}

const SHOW = [
  ['menhMajorStar', 14],
  ['cuc', 5],
  ['napAmElement', 5],
  ['thanPalace', 6],
  ['cachCuc', 12],
] as const;

export async function GET() {
  const d = loadDataset();

  const tables = d
    ? SHOW.map(([key, limit]) => {
        const dist = d.distributions[key];
        if (!dist?.items?.length) return '';
        const rows = dist.items.slice(0, limit).map((it) => `<tr>
            <td>${esc(it.value)}</td>
            <td class="num">${pct(it.percent)}%</td>
            <td class="num">${it.count.toLocaleString('vi-VN')}</td>
          </tr>`).join('');
        const more = dist.items.length > limit
          ? `<p class="more">…và ${dist.items.length - limit} mục nữa trong file tải về.</p>` : '';
        return `<h3>${esc(dist.label)}</h3>
          ${dist.note ? `<p class="note-sm">${esc(dist.note)}</p>` : ''}
          <div class="table-wrap"><table>
            <thead><tr><th>Giá trị</th><th class="num">Tỉ lệ</th><th class="num">Số lá số</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>${more}`;
      }).join('')
    : '<p><b>Bảng số đang được dựng lại.</b> File tải về bên dưới vẫn là bản mới nhất.</p>';

  const vcd = d?.distributions?.menhVoChinhDieu;

  const schema = [
    await orgNode({ standalone: true }),
    {
      '@context': 'https://schema.org', '@type': 'Dataset',
      name: 'Bộ dữ liệu thống kê Tử Vi Đẩu Số',
      alternateName: 'Zi Wei Dou Shu statistics dataset',
      description:
        'Phân bố chính tinh cung Mệnh, cục, nạp âm, cung an Thân và cách cục, tính trên toàn bộ không gian thời điểm sinh trong một vòng can chi 60 năm.',
      url: `${SEO_BASE}/du-lieu`,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      isAccessibleForFree: true,
      inLanguage: ['vi', 'en'],
      creator: { '@id': ORG_ID },
      ...(d ? { version: d.version, dateModified: d.generatedAt } : {}),
      distribution: [
        { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SEO_BASE}/data/tuvi-dataset-v1.json` },
        { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SEO_BASE}/data/tuvi-dataset-v1.csv` },
      ],
    },
  ];

  const cite = `Tử Vi Minh Bảo (${d?.generatedAt?.slice(0, 4) || new Date().getFullYear()}). Bộ dữ liệu thống kê Tử Vi Đẩu Số, phiên bản ${d?.version || '1.0.0'}. CC BY 4.0. https://www.tuviminhbao.com/du-lieu`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bộ Dữ Liệu Thống Kê Tử Vi — Tải Miễn Phí, CC BY 4.0</title>
<meta name="description" content="Số liệu thống kê Tử Vi Đẩu Số lần đầu công bố: chính tinh nào hay đóng cung Mệnh nhất, cục nào hiếm, cách cục nào bao nhiêu phần trăm. Tải JSON/CSV miễn phí, giấy phép CC BY 4.0.">
<link rel="canonical" href="${SEO_BASE}/du-lieu">
<meta property="og:title" content="Bộ Dữ Liệu Thống Kê Tử Vi — CC BY 4.0">
<meta property="og:description" content="Chính tinh nào hay đóng cung Mệnh nhất? Cục nào hiếm? Tải JSON/CSV miễn phí.">
<meta property="og:url" content="${SEO_BASE}/du-lieu">
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
h3{font-size:15px;font-weight:600;color:var(--navy);margin:22px 0 6px}
p{color:var(--text-mid);margin-bottom:8px}
.en{color:var(--text-lt);font-size:14px;font-style:italic}
p.note-sm{font-size:13px;color:var(--text-lt);margin-bottom:6px}
p.more{font-size:13px;color:var(--text-lt);margin-top:4px}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;background:var(--bg-soft);padding:2px 6px;border-radius:4px}
pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.5;padding:12px;border:1px solid var(--border-lt);border-radius:8px;background:var(--bg-soft);overflow-x:auto;white-space:pre-wrap}
.table-wrap{overflow-x:auto;margin-top:6px}
table{width:100%;min-width:380px;border-collapse:collapse;font-size:14px}
th,td{border:1px solid var(--border-lt);padding:6px 9px;text-align:left}
th{background:var(--bg-soft);font-weight:600;color:var(--navy)}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
ul{margin:0 0 10px 20px;color:var(--text-mid)}li{margin-bottom:5px}
.warn{background:#FDF6E7;border-left:3px solid var(--gold);padding:12px 14px;font-size:14px;margin:12px 0}
.dl{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.dl a{display:inline-block;padding:9px 18px;background:var(--navy);color:#fff;border-radius:7px;text-decoration:none;font-size:14px;font-weight:600}
@media(max-width:700px){.page{padding-left:16px;padding-right:16px}h1{font-size:25px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Dữ liệu mở · CC BY 4.0</div>
    <h1>Bộ Dữ Liệu <em>Thống Kê Tử Vi</em></h1>
    <p>Chính tinh nào hay đóng cung Mệnh nhất? Cục nào hiếm? Cách cục "Quân Thần Khánh Hội" thật ra bao nhiêu phần trăm? Đây là bộ số đầu tiên trả lời được — tính bằng engine cổ pháp trên${d ? ` <b>${d.totals.charts.toLocaleString('vi-VN')}</b> lá số` : ' toàn bộ không gian thời điểm sinh'}, tải về miễn phí.</p>
    <p class="en">Open dataset of Zi Wei Dou Shu chart statistics. Free, CC BY 4.0 — attribution required.</p>
    <div class="dl">
      <a href="/data/tuvi-dataset-v1.json" download>⬇ JSON</a>
      <a href="/data/tuvi-dataset-v1.csv" download>⬇ CSV (mở bằng Excel)</a>
    </div>
  </div>

  <section>
    <h2>Đọc con số này cho đúng</h2>
    <div class="warn">
      <b>Đây là phân bố trên KHÔNG GIAN THỜI ĐIỂM SINH, không phải phân bố dân số.</b>
      Không ai có dữ liệu giờ sinh thật của người Việt (mùa sinh và giờ sinh ngoài đời đều lệch),
      nên <b>không được</b> viết "X% người Việt có mệnh Tử Vi". Câu đúng là:
      <i>"trong các thời điểm sinh có thể có, X% cho ra cung Mệnh có Tử Vi"</i>.
      <span class="en">Distribution over possible birth times, not over a population.</span>
    </div>
    ${d ? `<p><b>Cách tính.</b> ${esc(d.method.vi)}</p>
    <p>Phủ trọn một vòng can chi 60 năm là có chủ ý: can chi năm lặp theo chu kỳ 60, nên lấy đúng một vòng thì ảnh hưởng của thiên can/địa chi năm được cân bằng theo cấu trúc, không cần trọng số nào.</p>` : ''}
  </section>

  <section>
    <h2>Vài con số${d ? ` <span style="font-weight:400;font-size:14px;color:var(--text-lt)">— bản ${esc(d.version)}, ${esc(d.generatedAt)}</span>` : ''}</h2>
    ${vcd ? `<p><b>Mệnh vô chính diệu:</b> ${pct(vcd.percent || 0)}% (${vcd.count?.toLocaleString('vi-VN')} lá số) — cung Mệnh không có chính tinh nào.</p>` : ''}
    ${tables}
  </section>

  <section>
    <h2>Giấy phép &amp; cách ghi nguồn</h2>
    <p>Dùng được cho <b>cả mục đích thương mại</b>, được sửa, được trộn với dữ liệu khác — theo
      <a href="https://creativecommons.org/licenses/by/4.0/deed.vi" target="_blank" rel="noopener">CC BY 4.0</a>.
      Điều kiện duy nhất: <b>ghi nguồn</b>.</p>
    <h3>Trích dẫn</h3>
    <pre>${esc(cite)}</pre>
    <h3>Nếu đăng trên web</h3>
    <pre>&lt;a href="https://www.tuviminhbao.com/du-lieu"&gt;Bộ dữ liệu thống kê Tử Vi — Tử Vi Minh Bảo&lt;/a&gt; (CC BY 4.0)</pre>
    <p class="note-sm">Dữ liệu miễn phí; ghi nguồn là phần chúng tôi nhận lại.</p>
  </section>

  <section style="border-bottom:none">
    <h2>Xem thêm</h2>
    <ul>
      <li><a href="/api-docs">API âm lịch miễn phí</a> — nếu bạn cần số liệu theo ngày thay vì bảng tổng hợp.</li>
      <li><a href="/mcp-server">MCP server tử vi</a> · <a href="/bao-chi">Thông tin báo chí</a> · <a href="/nguon-du-lieu.html">Nguồn tư liệu cổ pháp</a></li>
      <li>Cần cắt số theo chiều khác (theo năm, theo giới…)? Viết cho <a href="mailto:contact@tuviminhbao.com">contact@tuviminhbao.com</a>.</li>
    </ul>
  </section>
</div>
<script src="/footer.js"></script>
<script src="/track.js?v=4" defer></script><script src="/nav.js?v=24" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
