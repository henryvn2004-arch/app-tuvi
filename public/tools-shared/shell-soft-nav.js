// public/tools-shared/shell-soft-nav.js
// ============================================================
// Tái cấu trúc tốc độ Đợt 1 (2026-09-24) — SPA-hoá 3/5 tab app-shell (Trang
// chủ · Các Thầy · Trò chuyện): bấm tab KHÔNG reload cả trang, chỉ thay nội
// dung `<main id="ws">` + chạy lại script riêng trang đó. Sidebar/tabbar/
// rail/backdrop GIỮ NGUYÊN — `shell.js` dựng chúng HOÀN TOÀN bằng JS (không
// đọc gì từ HTML tĩnh của từng trang, xem `renderSidebar`/`renderTabbar`/
// `renderRail`), nên không cần dựng lại giữa các trang này.
//
// Đợt 2 (2026-09-24) — mở rộng sang 5 trang công cụ MIỄN PHÍ, không paywall,
// không polling: Kim Lâu · Nạp Âm · Số Đẹp · Bản Đồ Sao · Hoàng Đạo. Chọn
// theo đúng quy trình `docs/luat/spa-nav.md`: không `tuvi-paywall.js` (module
// đó có `_qrTimer` — cùng họ `setInterval` chờ thanh toán như `topup.html`,
// rủi ro y hệt lý do loại Nạp Lượng ở Đợt 1) + không `setInterval` riêng +
// script trang double-run sạch (`node --check` trên bản NHÂN ĐÔI nội dung
// script, bắt lỗi redeclare `const/let/class` top-level) + stress test
// Playwright (bấm ngẫu nhiên xen kẽ, độ trễ đua nhau) không lỗi.
//
// CỐ Ý CHƯA áp dụng cho 2/5 tab còn lại:
// - `/app/nap-luong` (topup.html): có `setInterval` chờ thanh toán + lịch sử
//   bug đua nhau đã ghi trong docs/nhat-ky/2026-08.md ("Purchase từng bắn
//   trùng"). Soft-nav (không huỷ `document`) làm interval cũ có thể sống sót
//   qua lượt chuyển tab — rủi ro cao hơn lợi ích tốc độ.
// - `/app/ho-so` (app-tai-khoan.html + account-core.js, 1637 dòng, hàng chục
//   hàm async cho History/Ví/Kết nối/Nhiệm vụ): test cục bộ (Playwright, xem
//   docs/luat/spa-nav.md) bắt được thật một crash — `initProfile()` đợi
//   auth tối đa 1.5s rồi gọi `document.getElementById('authLoading').style`
//   KHÔNG kiểm null; điều hướng mềm rời trang TRONG lúc đợi làm `#ws` đã đổi
//   nội dung khi hàm tỉnh dậy → ném lỗi. Đã vá null-safe CHÍNH lỗi này, nhưng
//   không đủ thời gian dò hết vài chục hàm async còn lại (loadTelegramLink,
//   loadMcpKey, loadReferralPanel…) để chắc không còn lỗi cùng họ — cần môi
//   trường có Supabase/auth thật để test hết các tab của trang này.
//
// Cả hai đều là ranh giới AN TOÀN đã ĐO ĐƯỢC, không phải thiếu sót — bấm
// "Nạp Lượng"/"Hồ Sơ" vẫn full reload, y hệt hành vi cũ, cho tới khi có đợt
// sau audit xong. Xem docs/luat/spa-nav.md.
//
// NGUYÊN TẮC AN TOÀN — rớt về `location.href` (full reload, hành vi CŨ,
// luôn đúng) ngay khi có bất cứ điều gì khác thường: fetch lỗi, thiếu
// `#ws` ở trang đích, timeout. Không bao giờ để lỗi rơi vào im lặng.
// ============================================================
(function () {
  'use strict';

  var SOFT_PAGES = {
    '/app': 1,
    '/app/thay': 1,
    '/app/tro-chuyen': 1,
    '/app/kim-lau': 1,
    '/app/nap-am': 1,
    '/app/so-dep': 1,
    '/app/ban-do-sao': 1,
    '/app/hoang-dao': 1,
  };
  var TIMEOUT_MS = 8000;
  var inflight = false;

  // Script CHUNG đã nạp sẵn ở lượt tải trang ĐẦU (nav/auth/shell + mọi script
  // riêng của trang đầu tiên) — không nạp lại. Khoá theo URL đã chuẩn hoá
  // (absolute) để so khớp đúng dù HTML viết đường dẫn tương đối hay tuyệt đối.
  // Quét lúc DOMContentLoaded (KHÔNG phải ngay khi file này chạy) — file này
  // nằm giữa trang (ngay sau `shell.js`), script riêng của trang (vd
  // `account-core.js` ở app-tai-khoan.html) còn nằm PHÍA SAU trong HTML,
  // chưa kịp vào DOM nếu quét sớm hơn → soft-nav tưởng nó "chưa nạp" rồi
  // nạp lại lần hai khi quay lại đúng trang đó.
  var loadedSrc = {};
  function scanLoadedSrc() {
    Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
      loadedSrc[s.src] = true;
    });
  }

  function fullReload(href) {
    location.href = href;
  }

  function withTimeout(promise) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('soft-nav timeout')); }, TIMEOUT_MS);
      promise.then(
        function (v) { clearTimeout(t); resolve(v); },
        function (e) { clearTimeout(t); reject(e); }
      );
    });
  }

  function loadExternalScript(attrs) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) s.setAttribute(k, attrs[k]); });
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('load fail: ' + attrs.src)); };
      document.body.appendChild(s);
    });
  }

  function runInlineScript(text) {
    var s = document.createElement('script');
    s.textContent = text;
    document.body.appendChild(s);
    document.body.removeChild(s);
  }

  // Chạy TUẦN TỰ đúng thứ tự tài liệu — script sau có thể phụ thuộc script
  // trước (vd IIFE cuối trang gọi `ToolPrices`/`window.Shell` do script trước
  // đó định nghĩa). `<script src>` ĐÃ nạp (cùng URL) thì bỏ qua thẳng —
  // đường dẫn quan trọng nhất: nav.js/auth.js/shell.js LUÔN đã nạp từ lượt
  // tải trang đầu (URL kèm querystring version giống hệt nhau ở mọi trang
  // app-shell) nên KHÔNG BAO GIỜ bị chạy lại — chạy lại `shell.js` là double-
  // boot (đăng ký trùng listener `document`/`window`, dựng trùng DOM).
  function runPageScripts(scripts) {
    var p = Promise.resolve();
    scripts.forEach(function (old) {
      p = p.then(function () {
        if (old.src) {
          if (loadedSrc[old.src]) return;
          loadedSrc[old.src] = true;
          var attrs = {};
          Array.prototype.forEach.call(old.attributes, function (a) { attrs[a.name] = a.value; });
          return loadExternalScript(attrs);
        }
        runInlineScript(old.textContent);
        return null;
      });
    });
    return p;
  }

  // `<style>` riêng của TỪNG trang (mỗi app-*.html có ĐÚNG MỘT khối, đặt
  // trong `<head>`, ghi đè vài rule của `shell.css` — vd `.ws-body{padding:…}`
  // ở app-thay.html). Đánh dấu `data-page-style` để lượt sau biết gỡ ĐÚNG
  // khối cũ trước khi chèn khối mới — không đánh dấu thì rời trang A còn
  // rule của A đè lên trang B.
  function markExistingHeadStyles() {
    var already = document.querySelectorAll('style[data-page-style]');
    if (already.length) return; // đã đánh dấu ở lượt soft-nav trước
    var KNOWN_SHARED_IDS = { 'nav-css': 1, 'footer-css': 1, 'nav-view-transitions': 1 };
    Array.prototype.forEach.call(document.querySelectorAll('head > style'), function (el) {
      if (el.id && KNOWN_SHARED_IDS[el.id]) return;
      el.setAttribute('data-page-style', '1');
    });
  }

  function swapHeadStyles(doc) {
    Array.prototype.forEach.call(document.querySelectorAll('style[data-page-style]'), function (el) {
      el.parentNode.removeChild(el);
    });
    Array.prototype.forEach.call(doc.querySelectorAll('head > style'), function (el) {
      var s = document.createElement('style');
      s.setAttribute('data-page-style', '1');
      s.textContent = el.textContent;
      document.head.appendChild(s);
    });
  }

  function updateTabbarActive(path) {
    var tabbar = document.getElementById('shell-tabbar');
    if (!tabbar) return;
    Array.prototype.forEach.call(tabbar.querySelectorAll('a'), function (a) {
      a.classList.toggle('active', a.getAttribute('href') === path);
    });
  }

  function closeOverlays() {
    var sb = document.getElementById('shell-sidebar');
    var rl = document.getElementById('shell-rail');
    if (sb) sb.classList.remove('open');
    if (rl) rl.classList.remove('open');
    if (window.shellSyncBackdrop) { try { window.shellSyncBackdrop(); } catch (e) { /* ignore */ } }
  }

  // "Nghĩa địa" — mọi trang đều có Promise/callback đang bay (vd
  // `ToolPrices.load().then(...)` rồi gọi `document.getElementById('x').…`)
  // KHÔNG kiểm tồn tại trước khi dùng, vì viết ra vốn giả định "trang chỉ
  // rời đi bằng reload thật" (destroy toàn bộ). Soft-nav phá giả định đó —
  // callback trễ tỉnh dậy SAU khi `#ws` đã đổi nội dung thì phần tử id cũ
  // biến mất → `null.style`/`null.innerHTML` ném lỗi giữa chừng.
  //
  // Vá TẬN GỐC từng chỗ là việc vô hạn (dò hết hàng chục hàm async mỗi
  // trang, mỗi trang mới thêm vào Phase sau lại phải dò lại). Vá Ở ĐÂY một
  // lần: thay vì XOÁ hẳn `#ws` cũ, DỜI (không phải xoá) toàn bộ con của nó
  // sang một khối ẩn (`display:none`) vẫn còn gắn trong `document` — callback
  // trễ gọi `getElementById` vẫn ra một phần tử THẬT (id vẫn còn), chỉ là nó
  // giờ vô hình/vô hại, không còn ném lỗi. Sau một khoảng đủ lâu (callback
  // trễ thường tỉnh trong vài giây) mới gỡ hẳn — dọn bộ nhớ, và quan trọng
  // hơn: đặt nghĩa địa SAU `#ws` trong `<body>` (`appendChild`) để phần tử
  // SỐNG (trong `#ws` mới) luôn đứng TRƯỚC trong document order — trùng id
  // thật (hiếm, nhưng có thể xảy ra giữa hai trang khác nhau) thì
  // `getElementById` (trả về khớp ĐẦU TIÊN theo document order) vẫn ưu tiên
  // đúng phần tử sống, không bao giờ trả nhầm về xác chết.
  function buryOldContent(curWs) {
    var grave = document.createElement('div');
    grave.style.display = 'none';
    grave.setAttribute('aria-hidden', 'true');
    grave.setAttribute('data-softnav-grave', '1');
    while (curWs.firstChild) grave.appendChild(curWs.firstChild);
    document.body.appendChild(grave);
    setTimeout(function () {
      if (grave.parentNode) grave.parentNode.removeChild(grave);
    }, 15000);
  }

  function go(path, replaceHistory) {
    if (inflight) { fullReload(path); return; }
    inflight = true;
    markExistingHeadStyles();
    withTimeout(
      fetch(path, { credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        return r.text();
      })
    )
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newWs = doc.querySelector('main#ws');
        var curWs = document.querySelector('main#ws');
        if (!newWs || !curWs) throw new Error('thiếu #ws ở trang đích');
        var bodyScripts = Array.prototype.slice.call(doc.querySelectorAll('body > script'));

        document.title = doc.title || document.title;
        swapHeadStyles(doc);
        buryOldContent(curWs);
        curWs.innerHTML = newWs.innerHTML;
        closeOverlays();
        if (!replaceHistory) history.pushState({ softNav: true }, '', path);
        window.scrollTo(0, 0);

        return runPageScripts(bodyScripts);
      })
      .then(function () {
        updateTabbarActive(path);
        try { if (window.Track) window.Track.event('page_view', { meta: { from: 'soft_nav' } }); } catch (e) { /* ignore */ }
        document.dispatchEvent(new CustomEvent('tvmb:softnav', { detail: { path: path } }));
      })
      .catch(function () {
        fullReload(path);
      })
      .then(function () { inflight = false; });
  }

  function init() {
    scanLoadedSrc();
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!SOFT_PAGES[href]) return; // ngoài whitelist → để trình duyệt tự xử lý bình thường
      if (href === location.pathname) { e.preventDefault(); return; }
      e.preventDefault();
      go(href, false);
    });

    window.addEventListener('popstate', function () {
      if (SOFT_PAGES[location.pathname]) go(location.pathname, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
