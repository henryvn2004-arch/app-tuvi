/* global _tvmbG */
// public/tools-shared/star-label.js — MỘT nơi dịch NHÃN SAO do engine dựng (W30f).
//
// Engine (`starLabel` ở lib/engine/cong-so.ts) viết nhãn sao thành chuỗi Việt:  `Tên (độ sáng) [Hóa X]`
// ("Vũ Khúc (Miếu) [Hóa Khoa]"). Tra NGUYÊN chuỗi đó vào glossary là trượt (glossary chỉ có tên trần) ⇒ /ja vẫn
// ra chữ Việt + console.warn. Hàm này tách bằng regex rồi tra từng phần: tên ← 'chinh'/'sao', độ sáng ← 'sang',
// Hóa X ← 'sao'. Chuỗi KHÔNG khớp khuôn (tên trần, "A + B", rỗng) trả qua glossary như cũ.
//   TuviStarLabel.t('Thiên Lương (Đắc địa) [Hóa Lộc]')   → /ja: '天梁 (得) [化祿]'
//   TuviStarLabel.list(['Tử Vi (Miếu)', 'Thiên Phủ'])    → 'Tử Vi (Miếu), Thiên Phủ' · tham số 2 = dấu nối (mặc định ', ')
// 'vi' trả NGUYÊN chuỗi vào (byte-giống bản cũ). Chỉ gọi ở chỗ VẼ — chuỗi gửi LLM giữ tiếng Việt.
(function () {
  'use strict';

  // Engine ghi 'Đắc địa' / 'Bình hòa' ở vài chỗ; glossary 'sang' chỉ có dạng ngắn (cùng nghĩa).
  var SANG_ALIAS = { 'Đắc địa': 'Đắc', 'Bình hòa': 'Bình', 'Bình hoà': 'Bình' };

  function viet() {
    var l = window.I18n && window.I18n.locale;
    return !l || l === 'vi';
  }
  function G(kind, v) {
    return typeof _tvmbG === 'function' && v ? _tvmbG(kind, v) : v;
  }

  function t(x) {
    if (viet()) return x;
    var m = /^(.+?)(?: \((.+?)\))?(?: \[Hóa (.+?)\])?$/.exec(String(x == null ? '' : x));
    if (!m) return x;
    return (
      G(['chinh', 'sao'], m[1]) +
      (m[2] ? ' (' + G('sang', SANG_ALIAS[m[2]] || m[2]) + ')' : '') +
      (m[3] ? ' [' + G('sao', 'Hóa ' + m[3]) + ']' : '')
    );
  }

  function list(arr, sep) {
    return (arr || []).map(t).join(sep == null ? ', ' : sep);
  }

  window.TuviStarLabel = { t: t, list: list };
})();
