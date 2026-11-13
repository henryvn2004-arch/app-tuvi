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
  // Route SSR chỉ có tiếng Việt (W31b) — bản sao của VI_ONLY_PREFIXES (lib/i18n/vi-only.mjs; check:i18n soi khớp).
  // Mục kết thúc '/' = chỉ trang con. Link tới đây giữ bản vi, không gắn tiền tố ngôn ngữ.
  var VI_ONLY = ['/van-dap', '/thu-vien', '/tu-dien', '/tac-gia', '/bao-chi', '/nghien-cuu', '/xem-ngay-hom-nay', '/kim-lau', '/menh-kho/', '/van-han', '/tu-vi', '/du-lieu', '/xong-dat'];
  function viOnly(path) {
    var p = path.replace(/[?#].*$/, '');
    for (var i = 0; i < VI_ONLY.length; i++) {
      var x = VI_ONLY[i];
      if (x.charAt(x.length - 1) === '/' ? p.indexOf(x) === 0 && p.length > x.length : p === x || p.indexOf(x + '/') === 0) return true;
    }
    return false;
  }
  function href(path) {
    if (LOCALE === 'vi' || typeof path !== 'string' || path.charAt(0) !== '/' || path.charAt(1) === '/')
      return path; // vi · link ngoài · //host
    if (/^\/(en|ja|ko|zh-tw|zh-cn)(\/|$|\?|#)/.test(path)) return path; // đã có tiền tố
    if (viOnly(path)) return path; // route SSR chỉ tiếng Việt
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

  /**
   * I18n.db('js.tool.laso', row.label) — chữ ĐỌC TỪ DB (tool_pricing.label, credit_packages.label,
   * master_profiles.discipline/greeting) theo ngôn ngữ trang (W27). Server nhúng kèm câu gốc tiếng Việt
   * của khoá (`src`, chỉ namespace DB_NS ở render.mjs); dịch CHỈ KHI chữ DB còn trùng câu gốc — Admin đổi
   * chữ ở DB thì hiện chữ DB mới, không hiện bản dịch của câu cũ. vi / thiếu khoá ⇒ chữ DB nguyên trạng.
   * CHỈ để HIỂN THỊ: `description` sổ tiền, prompt, khoá tra vẫn dùng chữ DB.
   */
  var SRC = null;
  function db(key, val) {
    if (LOCALE === 'vi' || val == null || val === '') return val;
    if (!SRC) {
      SRC = {};
      try {
        var node = document.getElementById('tvmb-i18n');
        if (node) SRC = JSON.parse(node.textContent).src || {};
      } catch (e) {
        SRC = {};
      }
    }
    if (!Object.prototype.hasOwnProperty.call(SRC, key) || SRC[key] !== String(val)) return val;
    return tv(key, String(val));
  }

  // ── Văn DÀI theo chỉ số (W16a): hào từ, lời khuyên quẻ, luận Thể–Dụng… ───────
  // Bản dịch KHÔNG nằm trong i18n/<locale>.json mà ở file riêng theo locale
  // /tools-shared/i18n-long/<locale>/<ns>.js (file tự gọi I18n.defineLong). Chỉ nạp file của
  // locale đang xem, chỉ khi module cần gọi loadLong(ns). Thiếu file/mục ⇒ trả chữ Việt truyền vào.
  var LONG = {};
  var LONG_ASKED = {};
  function defineLong(ns, data) {
    LONG[ns] = data;
  }
  function loadLong(ns) {
    if (LOCALE === 'vi' || LONG_ASKED[ns]) return;
    LONG_ASKED[ns] = 1;
    var src = '/tools-shared/i18n-long/' + LOCALE + '/' + ns + '.js';
    try {
      // Module đang được parser nạp ⇒ ghi thẳng để file bản dịch chạy TRƯỚC script kế tiếp (đồng bộ).
      if (document.readyState === 'loading') document.write('<script src="' + src + '"><\/script>');
      else {
        var el = document.createElement('script');
        el.src = src;
        el.async = true;
        document.head.appendChild(el);
      }
    } catch (e) {}
  }
  /**
   * I18n.long('kinh-dich-hao', 'hao.1.3', 'câu Việt'[, {x: …}]) — bản dịch nếu đã nạp, không thì câu Việt.
   * `vars` (W28, câu KHUÔN có biến của văn engine): thay `{x}` ở CẢ bản dịch lẫn câu Việt dự phòng.
   */
  function long(ns, key, vi, vars) {
    var d = LONG[ns];
    var e = d && Object.prototype.hasOwnProperty.call(d, key) ? d[key] : null;
    var s = e && e.t ? e.t : vi;
    return vars ? String(s).replace(/\{(\w+)\}/g, function (m, n) { return vars[n] !== undefined ? vars[n] : m; }) : s;
  }

  // ── Tên 15 thầy theo id (W19) — CHỈ để HIỂN THỊ ─────────────────────────────
  // ja/zh: chữ Hán của tên (ja dùng tân tự thể: 霊 隠 虚…, zh-cn giản thể); ko: âm Hán-Hàn;
  // en: tên Việt BỎ dấu ("Co Nguyet") — người đọc Latin không gõ được dấu, khớp bản `home.thay-*`
  // đã có. Hán tự là SUY RA từ âm Hán-Việt (chưa có nguồn gốc từ Henry) — xem nhật ký W19 "cần người
  // duyệt". Khoá tra bảng/prompt/`authorName` gửi server GIỮ tên Việt: đừng đưa kết quả vào đó.
  var MASTERS = {
    'co-nguyet':   { en: 'Co Nguyet',   ja: '古月', ko: '고월', 'zh-tw': '古月', 'zh-cn': '古月' },
    'tu-nguyen':   { en: 'Tu Nguyen',   ja: '紫元', ko: '자원', 'zh-tw': '紫元', 'zh-cn': '紫元' },
    'nhat-nguyen': { en: 'Nhat Nguyen', ja: '日元', ko: '일원', 'zh-tw': '日元', 'zh-cn': '日元' },
    'dau-nam':     { en: 'Dau Nam',     ja: '斗南', ko: '두남', 'zh-tw': '斗南', 'zh-cn': '斗南' },
    'ngoc-tinh':   { en: 'Ngoc Tinh',   ja: '玉星', ko: '옥성', 'zh-tw': '玉星', 'zh-cn': '玉星' },
    'dieu-khong':  { en: 'Dieu Khong',  ja: '妙空', ko: '묘공', 'zh-tw': '妙空', 'zh-cn': '妙空' },
    'tam-kinh':    { en: 'Tam Kinh',    ja: '心鏡', ko: '심경', 'zh-tw': '心鏡', 'zh-cn': '心镜' },
    'huyen-khong': { en: 'Huyen Khong', ja: '玄空', ko: '현공', 'zh-tw': '玄空', 'zh-cn': '玄空' },
    'bac-minh':    { en: 'Bac Minh',    ja: '北冥', ko: '북명', 'zh-tw': '北冥', 'zh-cn': '北冥' },
    'linh-son':    { en: 'Linh Son',    ja: '霊山', ko: '영산', 'zh-tw': '靈山', 'zh-cn': '灵山' },
    'thien-an':    { en: 'Thien An',    ja: '天隠', ko: '천은', 'zh-tw': '天隱', 'zh-cn': '天隐' },
    'linh-co':     { en: 'Linh Co',     ja: '霊機', ko: '영기', 'zh-tw': '靈機', 'zh-cn': '灵机' },
    'thanh-hu':    { en: 'Thanh Hu',    ja: '清虚', ko: '청허', 'zh-tw': '清虛', 'zh-cn': '清虚' },
    'thai-hu':     { en: 'Thai Hu',     ja: '太虚', ko: '태허', 'zh-tw': '太虛', 'zh-cn': '太虚' },
    'tinh-quang':  { en: 'Tinh Quang',  ja: '星光', ko: '성광', 'zh-tw': '星光', 'zh-cn': '星光' },
  };
  /** I18n.master('co-nguyet', 'Cổ Nguyệt') — tên thầy theo ngôn ngữ trang (vi / id lạ ⇒ chữ Việt truyền vào). */
  function master(id, vi) {
    var m = LOCALE === 'vi' ? null : MASTERS[id];
    return (m && m[LOCALE]) || vi;
  }
  /** I18n.masterTitle('co-nguyet', 'Cổ Nguyệt') — có danh hiệu: 古月先生 · 고월 선생님 · 古月老師 · Master Co Nguyet · Thầy Cổ Nguyệt. */
  function masterTitle(id, vi) {
    var n = master(id, vi);
    if (LOCALE === 'ja') return n + '先生';
    if (LOCALE === 'ko') return n + ' 선생님';
    if (LOCALE === 'zh-tw') return n + '老師';
    if (LOCALE === 'zh-cn') return n + '老师';
    if (LOCALE === 'en') return 'Master ' + n;
    return 'Thầy ' + n;
  }

  window.I18n = { locale: LOCALE, t: t, tv: tv, href: href, defineLong: defineLong, loadLong: loadLong, long: long, master: master, masterTitle: masterTitle, db: db };
})();
