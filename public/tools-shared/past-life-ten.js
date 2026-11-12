// public/tools-shared/past-life-ten.js — dịch TÊN NHÂN VẬT + DANH XƯNG NGHỀ của Chân Dung / Duyên Nợ Tiền Kiếp (W30f-8).
//
// Engine (`lib/engine/past-life.ts`) giữ trả chữ Việt NGUYÊN (còn vào prompt truyện, rail, `portrait_cache`) và gắn thêm MÃ tra:
//   characterMa = { ho: '<nền>.ho.<i>', ten: '<nền>.<nam|nu>.<i>' }   danhXungMa = { t: '<khoá bản gốc>.<nam|nu>', s: '<cung>.<nhóm>.<f|s>' | '' }
// (Duyên Nợ: `tenMa` / `danhXungMa` trên từng phần tử `nhanVats`). Bản dịch ns `past-life-ten`, khoá `name.*` · `fmt.name.<nền>` ·
// `title.*` · `suf.*` · `fmt.title`.
//   TuviPastLifeTen.name(viName, ma)     → tên theo ngôn ngữ trang (ghép họ + tên bằng khuôn của nền đó)
//   TuviPastLifeTen.title(viTitle, ma)   → danh xưng + hậu tố mảng đời theo ngôn ngữ trang
// vi / thiếu mã (payload cũ, mẫu tĩnh) / thiếu bản dịch ⇒ trả NGUYÊN chữ Việt truyền vào. CHỈ gọi ở chỗ VẼ + chia sẻ — chữ gửi
// server (prompt, rail, sổ) giữ tên Việt. Bản sao phía server (prompt truyện): lib/i18n/long-server.ts.
(function () {
  'use strict';
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('past-life-ten');
  var NS = 'past-life-ten';
  var K = { name: 'name.', title: 'title.', suf: 'suf.', fmt: 'fmt.' };
  var NONE = '\u0000';
  function vi() {
    return !window.I18n || !window.I18n.long || window.I18n.locale === 'vi';
  }
  /** Bản dịch của khoá, hoặc null khi chưa nạp/thiếu (khác `I18n.long` trả câu Việt dự phòng). */
  function get(key) {
    var s = window.I18n.long(NS, key, NONE);
    return s === NONE ? null : s;
  }
  function name(viName, ma) {
    if (vi() || !ma || !ma.ho || !ma.ten || !viName) return viName;
    var ho = get(K.name + ma.ho);
    var ten = get(K.name + ma.ten);
    var fmt = get(K.fmt + 'name.' + ma.ho.split('.')[0]);
    if (ho === null || ten === null || fmt === null) return viName;
    return fmt.replace(/\{(\w+)\}/g, function (m, n) {
      return n === 'ho' ? ho : n === 'ten' ? ten : m;
    });
  }
  function title(viTitle, ma) {
    if (vi() || !ma || !ma.t || !viTitle) return viTitle;
    var t = get(K.title + ma.t);
    if (t === null) return viTitle;
    if (!ma.s) return t;
    var s = get(K.suf + ma.s);
    var fmt = get(K.fmt + 'title');
    if (s === null || fmt === null) return viTitle;
    return fmt.replace(/\{(\w+)\}/g, function (m, n) {
      return n === 't' ? t : n === 's' ? s : m;
    });
  }
  window.TuviPastLifeTen = { name: name, title: title };
})();
