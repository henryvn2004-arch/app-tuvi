/* global _tvmbG */
// public/tools-shared/cach-cuc.js — MỘT nơi dịch câu "ý nghĩa từng cung" của lá số (W30f-5).
//
// Engine lõi `tuvi-ansao-engine.js` (`phanTichCungYNghia`) sinh `ls.cachCucTungCung[cung][]` = các câu Việt dựng bằng ~375 lệnh
// `out.push('…')` — KHÔNG có id và KHÔNG được sửa (mọi lá số đi qua nó). Nên khoá bản dịch = hash FNV-1a của CHÍNH câu Việt
// (`s.<hash>`, ns `cach-cuc` — ngoại lệ có chủ đích của quy ước "khoá = id", xem docs/i18n/QUY-UOC.md). 4 mẫu Tuần/Triệt có biến địa
// chi (`Tuần lâm hỏa địa (Tỵ)…`) nhận bằng regex rồi tra `t.<tên>.<on|off>` và thế `{dc}`.
//   TuviCachCuc.t('Tử Vi sáng: thân hình đẫy đà, thông minh, phúc thọ')   → /ja: bản dịch (không có ⇒ NGUYÊN câu Việt)
//   TuviCachCuc.list(arr, '; ')                                           → nối các câu đã dịch; vi = arr.join(sep) (byte-giống)
// Chỉ gọi ở chỗ VẼ — câu gửi LLM/rail giữ tiếng Việt. Hash PHẢI khớp `fnvVi` trong lib/i18n/long.mjs (check:enginema chạy file này).
(function () {
  'use strict';

  function viet() {
    var l = window.I18n && window.I18n.locale;
    return !l || l === 'vi';
  }
  function fnv(t) {
    var h = 0x811c9dc5;
    t = String(t);
    for (var i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('cach-cuc');
  function L(key) {
    return window.I18n && window.I18n.long ? window.I18n.long('cach-cuc', key, null) : null;
  }
  function chi(dc) {
    var g = window.TuviGlossary;
    return g && g.t ? g.t('chi', dc, { short: true }) : dc;
  }

  var XAU = 'giảm tính xấu của sao xấu, tăng tính tốt của sao tốt trong cung';
  var TOT_XAU = 'giảm tính chất tốt/xấu các sao trong cung';
  // [regex, tên, hàm → 'on'|'off', hàm → địa chi (hoặc null)]
  var MAU = [
    [new RegExp('^Tuần lâm hỏa địa \\(([^)]+)\\)( \\[chưa tác dụng — dưới 30 tuổi\\])?: ' + XAU + '$'), 'tuan-hoa', function (m) { return m[2] ? 'off' : 'on'; }, 1],
    [new RegExp('^Triệt đáo kim cung \\(([^)]+)\\)( \\[hết tác dụng — trên 30 tuổi\\])?: ' + XAU + '$'), 'triet-kim', function (m) { return m[2] ? 'off' : 'on'; }, 1],
    [new RegExp('^Tuần án ngữ( \\[chưa tác dụng — dưới 30 tuổi\\])?: ' + TOT_XAU + ' 50%( \\(đang tác dụng\\))?$'), 'tuan-an', function (m) { return m[1] ? 'off' : 'on'; }, 0],
    [new RegExp('^Triệt án ngữ( \\[hết tác dụng — trên 30 tuổi\\])?: ' + TOT_XAU + ' 80%( \\(đang tác dụng\\))?$'), 'triet-an', function (m) { return m[1] ? 'off' : 'on'; }, 0],
  ];

  function t(s) {
    if (viet() || s == null) return s;
    var s0 = String(s);
    var r = L('s.' + fnv(s0));
    if (r != null) return r;
    for (var i = 0; i < MAU.length; i++) {
      var m = MAU[i][0].exec(s0);
      if (!m) continue;
      var k = L('t.' + MAU[i][1] + '.' + MAU[i][2](m));
      if (k == null) return s;
      return MAU[i][3] ? k.replace(/\{dc\}/g, chi(m[1])) : k;
    }
    return s;
  }
  function list(arr, sep) {
    return (arr || []).map(t).join(sep == null ? ', ' : sep);
  }

  window.TuviCachCuc = { t: t, list: list, fnv: fnv };
})();
