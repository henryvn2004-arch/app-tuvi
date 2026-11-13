// public/tools-shared/to-hop.js — dịch tổ hợp sao chéo tầng cung hạn (Vận Hạn 12 Tháng, W32A-2).
//
// `/api/van-han-nam?action=khung` trả `thangs[].toHop[] = {ten, loai, tomTat}` lấy NGUYÊN chữ Việt từ `public/cach_cuc_all.json`
// (`lib/agent/vanHanCombos.ts`) — không id ⇒ khoá = FNV-1a của câu Việt (lối ns `cach-cuc`, W30f-5): `ten.<hash>` cho tên,
// `s.<hash>` cho tóm tắt. Tóm tắt nào trùng câu `CACH_CUC_DATA` thì đã có ở ns `cach-cuc` ⇒ tra đó trước.
//   TuviToHop.ten('Lộc Mã giao tri')   → /ja: bản dịch (không có ⇒ NGUYÊN chữ Việt)
//   TuviToHop.tomTat('…')               → cach-cuc → to-hop → nguyên câu
// Chỉ gọi ở chỗ VẼ — chữ vào prompt LLM giữ tiếng Việt. Hash PHẢI khớp `fnvVi` (lib/i18n/long.mjs; check:enginema chạy file này).
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
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('to-hop');
  function L(key, vi) {
    return window.I18n && window.I18n.long ? window.I18n.long('to-hop', key, vi) : vi;
  }

  function ten(s) {
    if (viet() || s == null) return s;
    return L('ten.' + fnv(s), String(s));
  }
  function tomTat(s) {
    if (viet() || s == null) return s;
    var cc = window.TuviCachCuc ? window.TuviCachCuc.t(s) : s;
    return cc !== s ? cc : L('s.' + fnv(s), String(s));
  }

  window.TuviToHop = { ten: ten, tomTat: tomTat, fnv: fnv };
})();
