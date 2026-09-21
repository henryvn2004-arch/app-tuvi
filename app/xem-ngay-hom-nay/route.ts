// app/xem-ngay-hom-nay/route.ts — trang HÔM NAY, hoàng lịch đầy đủ.
//
// Khác `/ngay-tot/ngay/[year]/[m]/[d]` (đánh giá 10 loại việc, dùng
// `computeNgayTot` — 12 trực/28 tú/giờ hoàng đạo): trang này lấy `dungMotNgay`
// (`lib/almanac/day.ts`), phần MINGYU CHƯA từng lên trang nào — Nghi/Kỵ, Thần
// Sát, Bành Tổ, Cửu Tinh, Xung Sát, Thần Niên. Xem chú thích đầu `day.ts`:
// "đây là phần người ta thực sự tra hoàng lịch để đọc" — chưa hề xuất bản.
//
// KHÔNG dùng LLM, 0đ — dựng câu bằng LUẬT giống `daily-message.ts`, vì trang
// này hiện ra CHO MỌI NGƯỜI mỗi ngày, không phải một lượt hỏi riêng của ai.
//
// ⚠️ BẮT BUỘC `force-dynamic` — route mặc định trả HÔM NAY; để Next coi là
// tĩnh thì mọi người sẽ xem chung tờ lịch của ngày build, sai âm thầm (đúng
// bẫy `app/api/almanac/route.ts` đã tránh, xem chú thích ở đó).
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { dungMotNgay } from '@/lib/almanac/day';
import { todayVN } from '@/lib/engine/van-ngay';
import { BASE, esc, renderPage } from '../ngay-tot/_shared';
import { ORG_ID } from '@/lib/seo/entity';

const MUC_PILL: Record<string, string> = { cat: 'good', hung: 'bad', binh: 'mid' };

export async function GET() {
  const { y, m, d } = todayVN();
  const today = new Date(Date.UTC(y, m - 1, d));
  const info = dungMotNgay(today);

  const title = `Xem ngày hôm nay ${d}/${m}/${y} — ${info.thu}, ${esc(info.canChiNgay)} | Tử Vi Minh Bảo`;
  const desc = `Hoàng lịch đầy đủ ngày ${d}/${m}/${y} (ÂL ${info.amLich.ngay}/${info.amLich.thang}/${info.amLich.nam}${info.amLich.nhuan ? ' nhuận' : ''}): trực ${esc(info.truc.ten)}, sao ${esc(info.saoNgay.ten)}, thần sát, cửu tinh, giờ hoàng đạo, nên làm — nên tránh.`;
  const url = `${BASE}/xem-ngay-hom-nay`;

  const cardOverall = `<div class="detail-card">
    <h3>Tổng quan</h3>
    <div class="row"><span>Dương lịch</span><strong>${info.ngayDL}</strong></div>
    <div class="row"><span>Âm lịch</span><strong>${info.amLich.ngay}/${info.amLich.thang}/${info.amLich.nam}${info.amLich.nhuan ? ' (nhuận)' : ''}</strong></div>
    <div class="row"><span>Thứ</span><strong>${esc(info.thu)}</strong></div>
    <div class="row"><span>Can chi ngày</span><strong>${esc(info.canChiNgay)}</strong></div>
    <div class="row"><span>Can chi tháng</span><strong>${esc(info.canChiThang)}</strong></div>
    <div class="row"><span>Can chi năm</span><strong>${esc(info.canChiNam)}</strong></div>
    <div class="row"><span>Đánh giá chung</span><strong>${esc(info.tongQuan)}</strong></div>
  </div>`;

  const cardStars = `<div class="detail-card">
    <h3>Trực, Sao, Tú</h3>
    <div class="row"><span>12 trực</span>
      <strong>${esc(info.truc.ten)} <span class="pill ${info.truc.muc === 'cát' ? 'good' : info.truc.muc === 'hung' ? 'bad' : 'mid'}">${esc(info.truc.muc)}</span></strong>
    </div>
    <div class="row"><span>Sao ngày</span>
      <strong>${esc(info.saoNgay.ten)} <span class="pill ${info.saoNgay.hoangDao ? 'good' : 'bad'}">${info.saoNgay.hoangDao ? 'hoàng đạo' : 'hắc đạo'}</span></strong>
    </div>
    <div class="row" style="display:block">
      <span style="display:block;margin-bottom:4px">Ý nghĩa</span>
      <strong style="font-weight:400;font-size:13px;color:var(--text-lt)">${esc(info.saoNgay.nghia)}</strong>
    </div>
    <div class="row"><span>28 Nhị Thập Bát Tú</span>
      <strong>${esc(info.tu.ten)} <span class="pill ${info.tu.muc === 'cát' ? 'good' : 'bad'}">${esc(info.tu.muc)}</span></strong>
    </div>
  </div>`;

  const nenRows = info.nen.map(v => `<div class="row"><span>${esc(v.ten)}</span><strong style="font-weight:400;color:var(--text-lt)">${esc(v.nghia)}</strong></div>`).join('');
  const kiengRows = info.kieng.map(v => `<div class="row"><span>${esc(v.ten)}</span><strong style="font-weight:400;color:var(--text-lt)">${esc(v.nghia)}</strong></div>`).join('');
  const cardNenKieng = `<div class="detail-card" style="grid-column:1/-1">
    <h3>Nên làm — Nên tránh</h3>
    <div class="detail-grid" style="grid-template-columns:1fr 1fr;gap:16px">
      <div><div class="sec-title" style="margin-top:0">Nên làm</div>${nenRows || '<div class="row"><span>Không có việc nào được khuyến nghị riêng hôm nay</span></div>'}</div>
      <div><div class="sec-title" style="margin-top:0">Nên tránh</div>${kiengRows || '<div class="row"><span>Không có việc nào bị kiêng riêng hôm nay</span></div>'}</div>
    </div>
  </div>`;

  const thanSatRows = info.thanSat
    .map(t => `<span class="pill ${MUC_PILL[t.muc] || 'mid'}" style="margin:2px">${esc(t.ten)}</span>`)
    .join(' ');
  const cardThanSat = `<div class="detail-card" style="grid-column:1/-1">
    <h3>Thần Sát</h3>
    <div class="row" style="display:block">${thanSatRows || '<span style="color:var(--text-lt)">Không có thần sát nổi bật hôm nay</span>'}</div>
  </div>`;

  const cardKhac = `<div class="detail-card">
    <h3>Bành Tổ Bách Kỵ</h3>
    <div class="row" style="display:block">
      ${info.banhTo.length ? info.banhTo.map(b => `<div style="margin-bottom:4px;font-size:13px">${esc(b)}</div>`).join('') : '<span style="color:var(--text-lt)">Không có</span>'}
    </div>
  </div>`;

  const cardCuuTinh = `<div class="detail-card">
    <h3>Cửu Tinh</h3>
    ${info.cuuTinh
      ? `<div class="row"><span>Sao bay</span><strong>${esc(info.cuuTinh.ten)} (hành ${esc(info.cuuTinh.hanh)})</strong></div>`
      : '<div class="row"><span>Không xác định được hôm nay</span></div>'}
  </div>`;

  const huongNamRows = info.huongNam
    .map(h => `<div class="row"><span>${esc(h.ten)} <span class="pill ${MUC_PILL[h.muc] || 'mid'}">${esc(h.muc)}</span></span><strong>${esc(h.huong)}</strong></div>
    <div class="row" style="display:block;margin-top:-6px"><span style="font-size:12px;color:var(--text-lt)">${esc(h.nghia)}</span></div>`)
    .join('');
  const cardXungHuong = `<div class="detail-card" style="grid-column:1/-1">
    <h3>Xung Tuổi — Hướng Thần</h3>
    <div class="row"><span>Tuổi xung hôm nay</span><strong>${esc(info.tuoiXung)}</strong></div>
    <div class="row"><span>Hướng xấu (Sát)</span><strong>${esc(info.huongSat)}</strong></div>
    ${huongNamRows}
  </div>`;

  const gioRows = (hh: typeof info.gioHoangDao, cls: string) => hh.map(g =>
    `<div class="gio-row ${cls}"><span><strong>${esc(g.chi)}</strong> ${esc(g.gio)}</span><span>${esc(g.sao)}</span></div>`
  ).join('');
  const cardGio = `<div class="detail-card" style="grid-column:1/-1">
    <h3>12 giờ — Hoàng đạo (xanh) / Hắc đạo (đỏ)</h3>
    <div class="gio-list">${gioRows(info.gioHoangDao, 'hoang')}${gioRows(info.gioHacDao, 'hac')}</div>
  </div>`;

  const body = `
    <div class="hero">
      <div class="eyebrow">${esc(info.thu)} · ${esc(info.canChiNgay)} · Hoàng lịch đầy đủ</div>
      <h1>Xem ngày <em>hôm nay</em> ${d}/${m}/${y}</h1>
      <p>Hoàng lịch đầy đủ hôm nay: trực, sao, thần sát, cửu tinh, Bành Tổ Bách Kỵ, xung tuổi, hướng thần — theo cổ pháp, tự động cập nhật mỗi ngày.</p>
    </div>
    <div class="detail-grid">${cardOverall}${cardStars}${cardNenKieng}${cardThanSat}${cardKhac}${cardCuuTinh}${cardXungHuong}${cardGio}</div>
    ${info.ngayKy.length ? `<div class="day-card bad"><strong>⚠️ Cảnh báo cấm kỵ:</strong> Hôm nay rơi vào ${esc(info.ngayKy.join(', '))} — nên tránh các việc trọng đại như cưới hỏi, khai trương, nhập trạch, an táng.</div>` : ''}
    <div class="rel-block">
      <div class="rel-title">Xem thêm</div>
      <div class="rel-grid">
        <a href="/ngay-tot/ngay/${y}/${m}/${d}" class="rel-item">Đánh giá 10 loại việc hôm nay →</a>
        <a href="/ngay-tot" class="rel-item">Tra ngày tốt theo việc</a>
      </div>
    </div>
  `;

  const html = renderPage({
    title, desc, canonical: url,
    schema: {
      '@context': 'https://schema.org', '@type': 'Article',
      headline: title, description: desc, datePublished: today.toISOString(),
      url, inLanguage: 'vi',
      publisher: { '@type': 'Organization', '@id': ORG_ID, name: 'Tử Vi Minh Bảo', url: BASE },
      breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang Chủ', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Xem Ngày Hôm Nay', item: url },
      ]},
    },
    breadcrumbs: [
      { name: 'Trang Chủ', url: '/' },
      { name: 'Xem Ngày Hôm Nay' },
    ],
    body,
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Tờ lịch chỉ đổi theo NGÀY — cache 1 giờ ở CDN là an toàn tuyệt đối,
      // KHÔNG dùng CACHE_HEADERS của _shared (s-maxage 1 năm, dành cho ngày
      // CỐ ĐỊNH trong quá khứ/tương lai — trang này luôn là HÔM NAY).
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
