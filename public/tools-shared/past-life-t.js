// public/tools-shared/past-life-t.js — dịch chữ do lib/engine/past-life.ts viết, hiện ở Chân Dung Tiền Kiếp (W30f).
//
// Payload `chan-dung-tien-kiep` được lưu `portrait_cache` (đổi cấu trúc ⇒ bump SHAPE), nên KHÔNG thêm mã vào payload: khoá suy từ
// trường SẴN CÓ — `era.id`, `occupation.star` + `occupation.tier` — rồi tra ns `past-life` (cùng bản dịch Công Sở đã dùng).
//   TuviPastLife.eraLine(era)          → 'Trung Hoa cổ · thời đế chế thống nhất' theo ngôn ngữ trang (.eraLabel = chỉ tên)
//   TuviPastLife.tier(o) / .desc(o) / .source(o)   (o = data.occupation)
// vi trả NGUYÊN chữ truyền vào (byte-giống); thiếu bản dịch ⇒ nguyên chữ Việt. Tên nhân vật/danh xưng KHÔNG dịch ở đây (xem nhật ký).
(function () {
  'use strict';
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('past-life');
  function PL(key, vi) {
    return window.I18n && window.I18n.long ? window.I18n.long('past-life', key, vi) : vi;
  }
  // `occupation.star`: "Tên", "A + B đồng cung" (cặp) hoặc "(vô chính diệu)" ⇒ khoá bảng `nghe.*` / `pair.*` / `nghe.default`.
  function base(o) {
    var s = String((o && o.star) || '');
    if (/ đồng cung$/.test(s)) return 'pair.' + s.replace(/ đồng cung$/, '').replace(' + ', '+');
    if (!s || s === '(vô chính diệu)') return 'nghe.default';
    return 'nghe.' + s;
  }
  function career(o, f, vi) {
    var b = base(o);
    return PL(b === 'nghe.default' ? b + '.' + f : b + '.' + o.tier + '.' + f, vi);
  }
  window.TuviPastLife = {
    eraLabel: function (e) {
      return e && e.id ? PL('era.' + e.id + '.label', e.label) : e && e.label;
    },
    eraLine: function (e) {
      e = e || {};
      var l = e.id ? PL('era.' + e.id + '.label', e.label) : e.label;
      var a = e.id && e.ageLabel ? PL('era.' + e.id + '.age', e.ageLabel) : e.ageLabel;
      return l + (a ? ' · ' + a : '');
    },
    tier: function (o) { return o && o.tier ? PL('tier.' + o.tier, o.tierLabel) : o && o.tierLabel; },
    desc: function (o) { return o && o.desc ? career(o, 'desc', o.desc) : o && o.desc; },
    source: function (o) { return o && o.source ? career(o, 'src', o.source) : o && o.source; },
  };
})();
