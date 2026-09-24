// public/tools-shared/i18n.js
// ============================================================
// Khung i18n TỐI THIỂU — Đợt 5 hellobot-ui-redesign: chuẩn bị nền, CHƯA bật
// chọn ngôn ngữ cho khách (site vẫn mặc định 'vi'). Nguồn DUY NHẤT tra chuỗi
// dùng chung khi thêm ngôn ngữ khác — không tự tạo dict thứ hai ở nơi khác.
// Vì sao không dùng next-intl/i18next: docs/luat/i18n.md.
//
//   I18n.t('report.building')
//   I18n.t('report.buildingSub', { done: 3, total: 13 })
// ============================================================
(function () {
  'use strict';

  var LOCALE = 'vi'; // TODO đợt sau: đọc từ <html lang>/cookie/query khi có nhu cầu thật

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

  window.I18n = { locale: LOCALE, t: t };
})();
