// app/xong-dat/route.ts
// ============================================================
// TRANG TRỤ "TUỔI XÔNG ĐẤT" — mục #13/14, pháo Tết.
//
// 🔑 MỘT trang mạnh, KHÔNG phải một đợt gen trang. Bài học #358 đã trả giá:
// 438K trang mỏng cho ra 612 trang có hiển thị / 16 nhấp, vì nút thắt là
// THẨM QUYỀN TÊN MIỀN chứ không phải số lượng trang. Khuôn đúng là #361
// (`/kim-lau`): một trang trụ + một công cụ thật.
//
// ⏰ Hạn tháng 11 là hạn THẬT: Tết 2027 rơi vào 06/02/2027, nhu cầu tìm dồn
// vào quãng tháng 12–1, nên trang phải kịp index TRƯỚC quãng đó.
//
// Trang phục vụ được cả khi TẮT JS: bảng tra 12 con giáp × năm là HTML tĩnh
// dựng ở server. Công cụ cá nhân hoá (nhập năm sinh chủ nhà) là lớp chồng
// lên, không phải điều kiện để trang có nội dung — Google và người không bấm
// gì vẫn đọc được thứ đáng đọc.
// ============================================================
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { computeXongDat, VERDICT_LABEL, XONG_DAT_YEARS, nextTetYear } from '@/lib/engine/xong-dat';
import { ccInfo } from '@/lib/engine/diachi';
import { SEO_BASE as BASE, ORG_ID } from '@/lib/seo/entity';

const URL_SELF = `${BASE}/xong-dat`;

function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET() {
  const namXem = nextTetYear();
  const nam = ccInfo(namXem)!;
  // Bảng tĩnh: chấm 12 con giáp so với NĂM (không có chủ nhà) — đây là phần
  // trả lời được cho mọi người, và là phần Google đọc.
  const probe = computeXongDat(namXem - 40, namXem)!; // chủ nhà bất kỳ, chỉ lấy Tết + can chi
  const tet = probe.tetDate;

  // Với mỗi con giáp, lấy quan hệ với năm — dùng lại engine bằng cách chấm
  // MỘT ứng viên đại diện của chi đó trên một chủ nhà TRUNG TÍNH thì sẽ lẫn
  // điểm chủ nhà vào. Nên bảng năm tự tính quan hệ chi–năm, đúng phạm vi.
  const chiRows = Array.from({ length: 12 }, (_, i) => {
    const same = i === nam.chiIdx;
    const xung = (i + 6) % 12 === nam.chiIdx;
    const hopPairs: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
    const lucHop = hopPairs[i] === nam.chiIdx;
    const tamHop = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]].some((g) => g.includes(i) && g.includes(nam.chiIdx));
    const label = same
      ? ['Nên tránh', 'Năm tuổi — phạm Thái Tuế', 'r']
      : xung
        ? ['Nên tránh', `Xung năm ${nam.chi} — Tuế Phá`, 'r']
        : lucHop
          ? ['Hợp năm', `Lục Hợp với năm ${nam.chi}`, 'g']
          : tamHop
            ? ['Hợp năm', `Tam Hợp với năm ${nam.chi}`, 'g']
            : ['Bình thường', 'Không xung không hợp với năm', 'n'];
    return { chi: ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'][i], label };
  });

  const tblYear = chiRows
    .map(
      (r) => `<tr><td>${esc(r.chi)}</td><td><span class="v v-${r.label[2]}">${esc(r.label[0])}</span></td><td>${esc(r.label[1])}</td></tr>`,
    )
    .join('');

  const faq = [
    {
      q: `Tết ${namXem} là ngày nào dương lịch?`,
      a: `Mùng Một Tết ${namXem} rơi vào ngày ${tet} dương lịch. Năm ${namXem} là năm ${nam.canChi}, mệnh ${nam.napAm} (hành ${nam.hanh}).`,
    },
    {
      q: 'Chọn tuổi xông đất dựa vào đâu?',
      a: `Ba tầng, xét theo thứ tự. Một là tuổi người xông đất so với tuổi CHỦ NHÀ: lục hợp hoặc tam hợp thì tốt, lục xung hoặc tam hình thì kiêng. Hai là tuổi đó so với năm: cùng con giáp với năm (${nam.chi}) là phạm Thái Tuế, xung với năm là Tuế Phá, cả hai đều nên tránh. Ba là nạp âm ngũ hành: mệnh người xông đất sinh mệnh chủ nhà là tốt nhất, khắc thì nên tránh.`,
    },
    {
      q: 'Người hợp tuổi nhưng đang có tang thì có mời được không?',
      a: 'Theo lệ thì không. Đây là điều bảng tra theo tuổi không nói được: cổ pháp xét cả hoàn cảnh người xông đất trong năm đó — có tang chế không, gia cảnh có thuận không, tính nết có hoà nhã vui vẻ không. Hợp tuổi chỉ là một vế.',
    },
    {
      q: 'Chủ nhà tự xông đất nhà mình được không?',
      a: 'Được, và đây là cách nhiều gia đình chọn khi không tìm được người hợp tuổi. Lệ gọi là tự xông đất: trước giao thừa chủ nhà ra khỏi nhà, sau giao thừa tự bước vào trước tiên. Cách này tránh được rủi ro nhờ nhầm người.',
    },
    {
      q: 'Xông đất và xuất hành có phải một không?',
      a: 'Không. Xông đất là chuyện ai bước vào nhà mình đầu tiên sau giao thừa. Xuất hành là chuyện chính mình rời nhà đi đâu, giờ nào, hướng nào trong ngày đầu năm. Hai việc xét theo hai bộ quy tắc khác nhau.',
    },
  ];

  const schema = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Tuổi Xông Đất Tết ${namXem} (${nam.canChi}) — Chọn Theo Tuổi Chủ Nhà`,
      description: `Cách chọn tuổi xông đất Tết ${namXem}: xét tuổi chủ nhà, Thái Tuế năm ${nam.chi} và nạp âm ngũ hành. Bảng tra 12 con giáp và công cụ chấm theo năm sinh của gia chủ.`,
      inLanguage: 'vi',
      mainEntityOfPage: URL_SELF,
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Chọn Ngày', item: `${BASE}/chon-ngay` },
        { '@type': 'ListItem', position: 3, name: `Xông Đất ${namXem}`, item: URL_SELF },
      ],
    },
  ]);

  const title = `Tuổi Xông Đất Tết ${namXem} (${nam.canChi}) — Tra Theo Tuổi Gia Chủ`;
  const desc = `Tết ${namXem} vào ${tet}. Chọn tuổi xông đất theo tuổi chủ nhà, tránh Thái Tuế năm ${nam.chi} và xét nạp âm ngũ hành. Bảng tra 12 con giáp + công cụ chấm theo năm sinh.`;

  const faqHtml = faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${URL_SELF}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${URL_SELF}">
<meta property="og:image" content="${BASE}/seal.webp">
<script type="application/ld+json">${schema}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#061A2E;--blue:#1455A4;--gold:#9A7B3A;--red:#B03A2E;--green:#1E6B3C;--text:#1a1a1a;--text-mid:#444;--text-lt:#777;--border-lt:#E8E8E8;--bg-soft:#F5F4F0}
body{font-family:Arial,sans-serif;color:var(--text);font-size:16px;line-height:1.6;background:#fff}
a{color:var(--blue)}
.page{max-width:880px;margin:0 auto;padding:0 40px 80px}
.hero{padding:48px 0 26px;border-bottom:2px solid var(--navy)}
.eyebrow{font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:12px}
h1{font-size:31px;font-weight:400;color:var(--navy);margin-bottom:10px}
h1 em{font-style:italic;color:var(--gold)}
section{padding:26px 0;border-bottom:1px solid var(--border-lt)}
h2{font-size:19px;font-weight:400;color:var(--navy);margin-bottom:8px}
h3{font-size:15px;font-weight:600;color:var(--navy);margin:18px 0 6px}
p{color:var(--text-mid);margin-bottom:8px}
.table-wrap{overflow-x:auto;margin-top:8px}
table{width:100%;min-width:400px;border-collapse:collapse;font-size:14px}
th,td{border:1px solid var(--border-lt);padding:7px 9px;text-align:left}
th{background:var(--bg-soft);font-weight:600;color:var(--navy)}
.v{font-weight:600}.v-g{color:var(--green)}.v-r{color:var(--red)}.v-n{color:var(--text-lt)}
.warn{background:#FDF6E7;border-left:3px solid var(--gold);padding:12px 14px;font-size:14px;margin:12px 0}
.tool{background:var(--bg-soft);border:1px solid var(--border-lt);border-radius:10px;padding:16px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
label{display:block;font-size:12px;font-weight:600;color:var(--navy);margin-bottom:4px}
input,select{padding:9px 10px;border:1px solid var(--border-lt);border-radius:7px;font-size:16px;font-family:inherit;background:#fff;color:var(--text)}
button{padding:10px 20px;border:none;border-radius:7px;background:var(--navy);color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}
details{border:1px solid var(--border-lt);border-radius:8px;padding:10px 12px;margin-bottom:8px}
summary{cursor:pointer;font-weight:600;color:var(--navy);font-size:15px}
details p{margin:8px 0 0}
ul{margin:0 0 10px 20px;color:var(--text-mid)}li{margin-bottom:5px}
#xdOut{margin-top:14px}
@media(max-width:700px){.page{padding-left:16px;padding-right:16px}h1{font-size:25px}}
</style>
<script src="/auth.js" defer></script>
</head>
<body>
<div id="nav-ph" style="height:60px;background:#061A2E"></div>
<div class="page">
  <div class="hero">
    <div class="eyebrow">Tết ${namXem} · ${esc(nam.canChi)} · mùng Một ${esc(tet)}</div>
    <h1>Tuổi <em>Xông Đất</em> Tết ${namXem}</h1>
    <p>Người bước vào nhà đầu tiên sau giao thừa. Chọn đúng thì hợp tuổi gia chủ, không phạm Thái Tuế năm ${esc(nam.chi)}, và nạp âm ngũ hành tương sinh — ba tầng đó tra được, và trang này tra hết cho bạn.</p>
  </div>

  <section>
    <h2>Tra theo tuổi gia chủ</h2>
    <p>Nhập năm sinh của người đứng tên gia chủ. Kết quả xếp hạng theo cổ pháp, có cả tuổi <b>nên tránh</b>.</p>
    <div class="tool">
      <div class="row">
        <div><label for="xdNam">Năm sinh gia chủ (dương lịch)</label>
          <input id="xdNam" type="number" inputmode="numeric" min="1930" max="${namXem - 18}" placeholder="VD: 1985" style="width:160px"></div>
        <div><label for="xdYear">Tết năm</label>
          <select id="xdYear">${XONG_DAT_YEARS.map((y) => `<option value="${y}"${y === namXem ? ' selected' : ''}>${y}</option>`).join('')}</select></div>
        <button id="xdGo" type="button">Tra tuổi xông đất</button>
      </div>
      <div id="xdOut"></div>
    </div>
    <div class="warn" id="xdCaveat">${esc(probe.caveat)}</div>
  </section>

  <section>
    <h2>Bảng 12 con giáp so với năm ${esc(nam.canChi)}</h2>
    <p>Tầng này không phụ thuộc gia chủ — nó nói tuổi nào <b>không nên</b> xông đất trong năm ${namXem} dù hợp với ai.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Tuổi</th><th>So với năm</th><th>Vì sao</th></tr></thead>
      <tbody>${tblYear}</tbody>
    </table></div>
    <p style="font-size:13px;color:var(--text-lt);margin-top:8px">Qua được tầng này chưa đủ — còn phải hợp với tuổi gia chủ. Dùng công cụ bên trên để xét cả hai.</p>
  </section>

  <section>
    <h2>Ba tầng chọn tuổi xông đất</h2>
    <h3>1. Hợp với tuổi gia chủ — nặng nhất</h3>
    <p>Khách bước vào nhà <b>của gia chủ</b>, nên đây là tầng xét trước. Lục Hợp là tốt nhất, kế đến Tam Hợp. Lục Xung với tuổi gia chủ thì kiêng, Tam Hình thì nên tránh.</p>
    <h3>2. Không phạm Thái Tuế của năm</h3>
    <p>Người cùng con giáp với năm (năm ${namXem} là tuổi ${esc(nam.chi)}) phạm Thái Tuế; người xung với năm phạm Tuế Phá. Cả hai đều kiêng xông đất, kể cả khi hợp tuổi gia chủ.</p>
    <h3>3. Nạp âm ngũ hành tương sinh</h3>
    <p>Mệnh nạp âm của khách <b>sinh</b> mệnh gia chủ là tốt nhất; cùng hành cũng được; <b>khắc</b> mệnh gia chủ thì nên tránh. Tầng này nhẹ hơn hai tầng trên, dùng để phân định khi có nhiều người cùng hợp tuổi.</p>
  </section>

  <section>
    <h2>Câu hỏi thường gặp</h2>
    ${faqHtml}
  </section>

  <section style="border-bottom:none">
    <h2>Xem thêm cho đầu năm</h2>
    <ul>
      <li><a href="/ngay-tot">Tra ngày tốt xấu</a> — chọn ngày khai trương, xuất hành đầu năm.</li>
      <li><a href="/kim-lau">Xem tuổi làm nhà (Kim Lâu)</a> — nếu năm mới định động thổ.</li>
      <li><a href="/app/tuong-hop">Xem tuổi hợp nhau</a> · <a href="/app/la-so">Lập lá số đầu năm</a></li>
    </ul>
  </section>
</div>
<script src="/footer.js"></script>
<script>
(function () {
  var LB = ${JSON.stringify(VERDICT_LABEL)};
  var CLS = { 'rat-hop': 'g', hop: 'g', binh: 'n', 'nen-tranh': 'r' };
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var out = document.getElementById('xdOut');
  document.getElementById('xdGo').addEventListener('click', function () {
    var y = parseInt(document.getElementById('xdNam').value, 10);
    var year = parseInt(document.getElementById('xdYear').value, 10);
    if (!y || y < 1930 || y > year - 18) { out.innerHTML = '<p style="color:#B03A2E">Nhập năm sinh gia chủ (1930 tới ' + (year - 18) + ').</p>'; return; }
    out.innerHTML = '<p>Đang tra…</p>';
    fetch('/api/xong-dat?nam=' + y + '&namXem=' + year)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.candidates) { out.innerHTML = '<p style="color:#B03A2E">Không tra được, thử lại giúp.</p>'; return; }
        var good = d.candidates.filter(function (c) { return c.verdict === 'rat-hop' || c.verdict === 'hop'; }).slice(0, 10);
        var bad = d.candidates.filter(function (c) { return c.verdict === 'nen-tranh'; }).slice(0, 8);
        function tbl(rows, why) {
          return '<div class="table-wrap"><table><thead><tr><th>Tuổi mụ</th><th>Năm sinh</th><th>Can chi</th><th>Đánh giá</th><th>' + why + '</th></tr></thead><tbody>' +
            rows.map(function (c) {
              return '<tr><td>' + c.tuoi + '</td><td>' + c.namSinh + '</td><td>' + esc(c.canChi) + '</td>' +
                '<td><span class="v v-' + CLS[c.verdict] + '">' + esc(LB[c.verdict]) + '</span></td>' +
                '<td>' + esc((why === 'Vì sao hợp' ? c.reasons : c.warnings).join('; ')) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        }
        var h = '<h3>Gia chủ ' + esc(d.chuNha.canChi) + ' — mệnh ' + esc(d.chuNha.napAm) + ' (' + esc(d.chuNha.hanh) + ')</h3>';
        if (d.chuNhaNote && d.chuNhaNote.length) h += '<p style="color:#B03A2E">' + esc(d.chuNhaNote.join(' ')) + '</p>';
        h += '<h3>Nên mời</h3>' + (good.length ? tbl(good, 'Vì sao hợp') : '<p>Không có tuổi nào thật sự hợp trong dải 18–70.</p>');
        h += '<h3>Nên tránh</h3>' + (bad.length ? tbl(bad, 'Vì sao tránh') : '<p>Không có tuổi nào phải tránh.</p>');
        out.innerHTML = h;
      })
      .catch(function () { out.innerHTML = '<p style="color:#B03A2E">Không tra được, thử lại giúp.</p>'; });
  });
})();
</script>
<script src="/track.js?v=3" defer></script><script src="/nav.js?v=20" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
