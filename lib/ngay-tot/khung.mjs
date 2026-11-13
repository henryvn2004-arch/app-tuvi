// lib/ngay-tot/khung.mjs — CHỮ KHUNG của route SSR `/ngay-tot` (W33b): nhãn, tiêu đề, meta, og, JSON-LD.
// MỘT nguồn: route (`pages.ts` → `ctx.t(khoá, biến)`), `i18n/vi.json` (khoá `ssr-ngay-tot.<khoá>` — nguồn của bộ nhớ dịch) và bộ dò
// `check:i18n` (khối "ngay-tot": vi.json khớp bảng này, đủ bản dịch 5 ngôn ngữ, token {x} khớp) đều đọc đúng file này.
// JS thuần (không TS) để script Node import thẳng, không regex.
//
// Quy tắc: chữ Việt ở đây là CÂU GỐC byte-giống bản /ngay-tot cũ (golden). Biến `{x}` do route thay; HTML nội tuyến (`<em>`,
// `<strong>`) được phép — bản dịch phải giữ đúng thẻ. Đổi chữ Việt ⇒ `npm run i18n:next` + `i18n:save` dịch lại câu đó.
// KHÔNG nhét tên cổ pháp (trực/tú/can chi → glossary) hay văn engine (ns `ngay-tot` văn dài) vào đây.
export const KHUNG = {
  // ── dùng chung ──
  brand: 'Tử Vi Minh Bảo',
  home: 'Trang Chủ',
  'bc.root': 'Xem Ngày Tốt',
  'join.list': '{a}, {b}',
  'join.ly': '{a}; {b}',
  'm.cap': 'Tháng {m}',
  'm.my': 'Tháng {m} {y}',
  'y.label': 'Năm {y}',
  'date.full': '{thu}, {d}/{m}/{y}',
  'date.al': 'ÂL {d}/{m}',
  'date.dmy': '{d}/{m}/{y}',
  'hd.hoang': 'hoàng đạo',
  'hd.hac': 'hắc đạo',
  'tc.cat': 'cát',
  'tc.hung': 'hung',
  'tc.binh': 'bình',
  'dg.tot': 'tốt',
  'dg.xau': 'xấu',
  'dg.binh': 'bình',
  'level.rat-tot': 'rất tốt',
  'level.tot': 'tốt',
  'level.binh-thuong': 'bình thường',
  'level.xau': 'xấu',
  'level.rat-xau': 'rất xấu',
  'ky.tamnuong': 'Tam Nương',
  'ky.nguyetky': 'Nguyệt Kỵ',
  'ky.duongcong': 'Dương Công',
  'meta.canchi': 'Can chi: <strong>{v}</strong>',
  'meta.truc': 'Trực <strong>{v}</strong>',
  'meta.sao': 'Sao <strong>{sao}</strong> ({hd})',
  'meta.tu': 'Tú <strong>{v}</strong>',
  'meta.ky': 'Kỵ: {v}',
  'meta.totcho': '<strong>Tốt cho:</strong> {v}',
  'meta.lydo': '<strong>Lý do tốt:</strong> {v}',
  'meta.luuy': '<strong>Lưu ý:</strong> {v}',
  'meta.giohd': '<strong>Giờ hoàng đạo:</strong> {v}',
  'rel.other-days': 'Ngày khác',
  // ── /ngay-tot ──
  'hub.title': 'Xem Ngày Tốt — Lịch Vạn Niên 2020-2036 | {brand}',
  'hub.desc':
    'Tra cứu ngày tốt theo việc: cưới hỏi, khởi công, khai trương, nhập trạch, xuất hành, cầu tài, sinh con, an táng, đào giếng, sửa nhà. Cổ pháp 12 trực, 28 sao, hoàng đạo.',
  'hub.eyebrow': 'Lịch Vạn Niên · Cổ Pháp',
  'hub.h1': 'Xem <em>Ngày Tốt</em> 2020–2036',
  'hub.p':
    'Tra cứu ngày đẹp theo 10 loại việc — dựa trên 12 trực, 28 nhị thập bát tú, hoàng/hắc đạo và Tam Nương / Nguyệt Kỵ / Dương Công.',
  'hub.sec-viec': 'Xem Theo Việc',
  'hub.sec-nam': 'Xem Theo Năm',
  // ── /ngay-tot/<việc> ──
  'act.title': '{viec} — Ngày Tốt 2020-2036 | {brand}',
  'act.desc':
    'Tra cứu {viecl} theo từng tháng, từng năm 2020-2036. {mota}. Cổ pháp 12 trực, hoàng đạo, Tam Nương / Nguyệt Kỵ / Dương Công.',
  'act.tip': 'Tháng {m}/{y}: {good} ngày tốt, {bad} ngày kỵ (trên {total})',
  'act.mlabel': 'T{m}',
  'act.eyebrow': 'Ngày Tốt · {viec}',
  'act.h1': 'Ngày Tốt <em>{viec}</em>',
  'act.p':
    '{mota}. Chọn năm và tháng để xem top ngày đẹp với chi tiết trực, sao hoàng đạo, can chi và giờ đẹp.',
  'act.sec': 'Chọn Năm và Tháng',
  'act.lg-great': 'Nhiều ngày đẹp (≥ 8)',
  'act.lg-good': 'Có ngày đẹp (≥ 4)',
  'act.lg-soso': 'Ít ngày đẹp',
  'act.lg-bad': 'Hầu hết kỵ',
  'act.rel': 'Việc khác',
  // ── /ngay-tot/lich/<năm> ──
  'lichy.title': 'Lịch Ngày Tốt Năm {y} — Xem Ngày Đẹp Theo Tháng | {brand}',
  'lichy.desc':
    'Lịch vạn niên năm {y}: tra cứu ngày tốt theo từng tháng, đầy đủ 12 tháng. Cổ pháp 12 trực, 28 nhị thập bát tú, hoàng/hắc đạo.',
  'lichy.cell': 'Xem ngày đẹp tháng {m}',
  'lichy.eyebrow': 'Lịch Vạn Niên · Năm {y}',
  'lichy.h1': 'Lịch Ngày Tốt <em>Năm {y}</em>',
  'lichy.p':
    'Chọn tháng để xem các ngày đẹp dành cho cưới hỏi, khởi công, khai trương, nhập trạch và các việc trọng đại khác.',
  'lichy.sec': '12 Tháng Năm {y}',
  'lichy.rel': 'Năm khác',
  // ── /ngay-tot/lich/<năm>/thang-<m> ──
  'lichm.title': 'Ngày Tốt Tháng {m}/{y} — Lịch Vạn Niên | {brand}',
  'lichm.desc':
    'Tra cứu ngày tốt ngày xấu Tháng {m} năm {y} đầy đủ: can chi, trực, sao hoàng đạo, 28 tú và đánh giá 10 loại việc cho từng ngày.',
  'lichm.eyebrow': 'Lịch Vạn Niên · Tháng {m} {y}',
  'lichm.h1': 'Ngày Tốt <em>Tháng {m} {y}</em>',
  'lichm.p':
    'Bảng chi tiết {n} ngày trong tháng {m} năm {y}: can chi, trực, 28 tú, sao hoàng đạo, ngày kỵ và đánh giá 10 loại việc.',
  'lichm.sec-nhanh': 'Xem nhanh theo việc',
  'lichm.sec-ngay': '{n} ngày trong Tháng {m} {y}',
  'lichm.actlink': '{viec} Tháng {m}',
  'lichm.rel': 'Tháng khác',
  'lichm.toan-nam': 'Toàn năm {y}',
  // ── /ngay-tot/<việc>/<năm>/thang-<m> ──
  'actm.title': '{seo} | {brand}',
  'actm.desc':
    '{mota}. Top ngày đẹp nhất trong tháng {m} {y} kèm can chi, trực, sao hoàng đạo, giờ tốt và lý do chọn.',
  'actm.none-h': 'Không có ngày phù hợp',
  'actm.none-p':
    'Trong tháng {m} {y} không có ngày nào đạt điểm ≥ 6 cho việc {viecl}. Cân nhắc xem tháng khác.',
  'actm.score': '{score}/10 · {level}',
  'actm.intro':
    'Dưới đây là <strong>{n} ngày đẹp nhất</strong> trong tháng {m} năm {y} để {viecl}, được chấm điểm dựa trên 12 trực, 28 nhị thập bát tú, sao hoàng/hắc đạo, và các ngày kỵ cổ truyền (Tam Nương, Nguyệt Kỵ, Dương Công).',
  'actm.eyebrow': 'Ngày Tốt · {viec}',
  'actm.h1': 'Ngày Tốt <em>{viec}</em> Tháng {m} {y}',
  'actm.p': '{mota}. Top ngày đẹp nhất trong tháng {m} {y}.',
  'actm.sec': 'Top ngày đẹp {viecl} tháng {m} {y}',
  'actm.rel-thang': '{viec} ở tháng khác',
  'actm.rel-viec': 'Việc khác trong tháng {m} {y}',
  'actm.link-viec': '{viec} Tháng {m}/{y}',
  'actm.all-years': 'Tất cả năm',
  // ── /ngay-tot/ngay/<năm>/<m>/<d> ──
  'day.title': 'Ngày {d}/{m}/{y} có tốt không? — {thu}, {canchi}',
  'day.desc':
    'Phân tích chi tiết ngày {d}/{m}/{y} (ÂL {ad}/{am}, {canchi}): trực {truc}, sao {sao}, tú {tu}, đánh giá 10 loại việc.',
  'day.eyebrow': '{thu} · {canchi}',
  'day.h1': 'Ngày <em>{d}/{m}/{y}</em> có tốt không?',
  'day.p':
    'Phân tích chi tiết ngày {d}/{m}/{y} dương lịch (âm lịch {ad}/{am}/{ay}). Đánh giá cho 10 loại việc cổ truyền.',
  'day.c-tongquan': 'Tổng quan',
  'day.r-duong': 'Dương lịch',
  'day.r-am': 'Âm lịch',
  'day.nhuan': '(nhuận)',
  'day.r-thu': 'Thứ',
  'day.r-canchi': 'Can chi ngày',
  'day.r-chithang': 'Chi tháng',
  'day.r-chung': 'Đánh giá chung',
  'day.c-sao': 'Trực, Sao, Tú',
  'day.r-truc': '12 trực',
  'day.r-saongay': 'Sao ngày',
  'day.r-ynghia': 'Ý nghĩa',
  'day.r-tu': '28 Nhị Thập Bát Tú',
  'day.c-ky': 'Cấm kỵ',
  'day.r-duongcong': 'Dương Công kỵ nhật',
  'day.co-ky': 'CÓ — kỵ',
  'day.co-daiky': 'CÓ — đại kỵ',
  'day.khong': 'Không',
  'day.c-gio': '12 giờ — Hoàng đạo (xanh) / Hắc đạo (đỏ)',
  'day.c-viec': 'Đánh giá 10 loại việc',
  'day.sec-top3': '3 việc phù hợp nhất hôm nay',
  'day.top-head': '{viec} ({score}/10 — {level})',
  'day.tot': '<strong>Tốt:</strong> {v}',
  'day.luuy': '<strong>Lưu ý:</strong> {v}',
  'day.canhbao':
    '<strong>⚠️ Cảnh báo cấm kỵ:</strong> Ngày này rơi vào {v} — nên tránh các việc trọng đại như cưới hỏi, khai trương, nhập trạch, an táng.',
  'day.prev': '← Ngày {d}/{m}',
  'day.next': 'Ngày {d}/{m} →',
  'day.toan-thang': 'Toàn tháng {m}/{y}',
};
