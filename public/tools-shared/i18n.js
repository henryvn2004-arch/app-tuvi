// public/tools-shared/i18n.js
// ============================================================
// Khung i18n phía CLIENT. Nguồn DUY NHẤT tra chuỗi
// dùng chung khi thêm ngôn ngữ khác — không tự tạo dict thứ hai ở nơi khác.
// Vì sao không dùng next-intl/i18next: docs/luat/i18n.md.
//
//   I18n.t('report.building')
//   I18n.t('report.buildingSub', { done: 3, total: 13 })
// ============================================================
(function () {
  'use strict';
  // Trang /<locale>/ được server chèn file này vào <head>; trang tự nạp thêm lần nữa thì giữ bản đầu.
  if (window.I18n && window.I18n.tv) return;

  // Ngôn ngữ trang: server (lib/i18n/render.mjs) ghi <html lang> theo HREFLANG của
  // lib/i18n/locales.ts. Đọc NGƯỢC từ đó — client KHÔNG tự đoán từ URL/cookie, để
  // một trang chỉ có một nguồn ngôn ngữ. Bảng dưới phải khớp HREFLANG.
  var FROM_HREFLANG = {
    vi: 'vi',
    en: 'en',
    ja: 'ja',
    ko: 'ko',
    'zh-hant-tw': 'zh-tw',
    'zh-hans-cn': 'zh-cn',
  };
  var LOCALE = 'vi';
  try {
    var hl = String(document.documentElement.getAttribute('lang') || '').toLowerCase();
    LOCALE = FROM_HREFLANG[hl] || 'vi';
  } catch (e) {
    LOCALE = 'vi';
  }

  var DICT = {
    'report.building': { vi: 'Đang đóng bản báo cáo…' },
    'report.buildingSub': { vi: '{done} / {total} phần đã xong' },
    'report.readyTitle': { vi: '✦ Báo cáo của bạn đã sẵn sàng' },
    'report.readySub': { vi: '{total} phần luận giải · tải PDF hoặc gửi vào email để giữ lại' },
    'report.pdfLabel': { vi: 'Tải PDF' },
    'report.sending': { vi: 'Đang gửi...' },
    'report.sent': { vi: '✓ Đã gửi email' },
    'report.sendFail': { vi: 'Gửi email chưa thành công: {error}. Thử lại sau ít phút.' },
    'report.sendFailUnknown': { vi: 'lỗi không rõ' },
    'report.sendError': { vi: 'Gửi email lỗi: {error}' },
    'report.claimTitle': { vi: 'Nhận báo cáo qua email' },
    'report.claimDesc': {
      vi: 'Thêm email + mật khẩu để tụi mình gửi bản PDF báo cáo về hộp thư — đây cũng là tài khoản để bạn đăng nhập lại và xem lại báo cáo bất cứ lúc nào.',
    },
    'report.claimSubmit': { vi: 'Nhận báo cáo →' },
  };

  function t(key, params) {
    var entry = DICT[key];
    var s = (entry && (entry[LOCALE] || entry.vi)) || key;
    if (params) {
      for (var k in params) {
        if (Object.prototype.hasOwnProperty.call(params, k)) {
          s = s.split('{' + k + '}').join(params[k]);
        }
      }
    }
    return s;
  }

  /** Đường dẫn cùng ngôn ngữ: I18n.href('/topup.html') → '/ja/topup.html' (vi giữ nguyên). */
  function href(path) {
    if (LOCALE === 'vi' || typeof path !== 'string' || path.charAt(0) !== '/' || path.charAt(1) === '/')
      return path; // vi · link ngoài · //host
    if (/^\/(en|ja|ko|zh-tw|zh-cn)(\/|$|\?|#)/.test(path)) return path; // đã có tiền tố
    return '/' + LOCALE + (path === '/' ? '' : path);
  }

  // ── Chữ do JS dựng (W13): khoá `js.*` của i18n/<locale>.json ────────────────
  // Server (lib/i18n/render.mjs) nhúng bản dịch các khoá trang cần vào
  // <script id="tvmb-i18n"> trong <head> — CÙNG từ điển với chữ HTML, không có dict
  // thứ hai ở client. Trang vi không có node đó ⇒ 0 byte, trả chữ Việt mặc định.
  var SERVER = null;
  function serverDict() {
    if (SERVER) return SERVER;
    SERVER = {};
    try {
      var node = document.getElementById('tvmb-i18n');
      if (node) SERVER = JSON.parse(node.textContent).dict || {};
    } catch (e) {
      SERVER = {};
    }
    return SERVER;
  }
  function fill(s, vars) {
    if (!vars) return s;
    return String(s).replace(/\{(\w+)\}/g, function (x, k) {
      return vars[k] !== undefined && vars[k] !== null ? vars[k] : x;
    });
  }
  /**
   * I18n.tv('js.paywall.nap-luong', 'Nạp Lượng →', {n: 3}) — bản dịch nếu có, không thì chữ
   * Việt truyền vào (locale chưa dịch rơi về vi, không vỡ). Link nội bộ `href="/…"` trong
   * mảnh HTML được đưa về cùng ngôn ngữ.
   */
  function tv(key, vi, vars) {
    var d = LOCALE === 'vi' ? null : serverDict();
    var s = d && Object.prototype.hasOwnProperty.call(d, key) ? d[key] : vi;
    if (s == null) s = key;
    s = fill(s, vars);
    if (LOCALE !== 'vi' && s.indexOf('href="/') >= 0)
      s = s.replace(/(\shref=")(\/[^"]*)"/g, function (m, a, p) {
        return a + href(p) + '"';
      });
    return s;
  }

  window.I18n = { locale: LOCALE, t: t, tv: tv, href: href };
})();
