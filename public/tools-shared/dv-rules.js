// public/tools-shared/dv-rules.js — MỘT nơi dịch câu "Luận đoán vận hạn" của đại vận (W32A).
//
// Engine lõi `tuvi-ansao-engine.js` (`phanTichDaiVanRules`) sinh `dv.rules[].text` = câu Việt dựng bằng ~171 lệnh `add('…')` —
// KHÔNG có id và KHÔNG được sửa. Cùng lối ns `cach-cuc` (W30f-5): khoá = FNV-1a của CHÍNH câu Việt (`s.<hash>`, ns `dv-rules`).
// 3 mẫu có biến `${menhBo}`/`${dvBo}` chỉ nhận mã bộ sao hữu hạn ⇒ nguồn liệt kê đủ biến thể, ở đây tra như câu thường.
//   TuviDvRules.t('Thiên Lương — có khả năng giải trừ tai họa')   → /ja: bản dịch (không có ⇒ NGUYÊN câu Việt)
// Chỉ gọi ở chỗ VẼ (luan-giai-core.js) — lá-số-text gửi LLM (tuvi-laso-format.js) giữ tiếng Việt.
// Hash PHẢI khớp `fnvVi` trong lib/i18n/long.mjs (check:enginema chạy file này).
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
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('dv-rules');

  function t(s) {
    if (viet() || s == null || !window.I18n || !window.I18n.long) return s;
    return window.I18n.long('dv-rules', 's.' + fnv(s), String(s));
  }

  window.TuviDvRules = { t: t, fnv: fnv };
})();
