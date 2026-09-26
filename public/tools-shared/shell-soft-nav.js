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
// Đợt 3 (2026-09-24) — thêm 4 trang miễn phí khác cùng tiêu chí: Bát Trạch ·
// Lục Nhâm · Ngày Tốt · Thần Số Học. Kiểm 8 ứng viên (thêm cả Kỳ Môn · Mai
// Hoa · Ngũ Hành Tên · Kinh Dịch) bằng double-run — 4 trong số đó ĐÃ FAIL:
// `let`/`const` khai ở TOP-LEVEL script (không bọc IIFE), redeclare khi
// điều hướng mềm ghé lại lần hai sẽ ném `SyntaxError` giữa chừng. CỐ Ý loại
// 4 trang đó ra khỏi Đợt 3 (Kỳ Môn/Mai Hoa/Ngũ Hành Tên/Kinh Dịch cần bọc
// lại IIFE trước, để đợt sau) thay vì sửa vội dưới áp lực thời gian.
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
    '/app/bat-trach': 1,
    '/app/luc-nham': 1,
    '/app/ngay-tot': 1,
    '/app/than-so-hoc': 1,
    '/app/ky-mon': 1,
    '/app/mai-hoa': 1,
    '/app/ngu-hanh-ten': 1,
    '/app/kinh-dich': 1,
    '/app/dat-ten': 1,
    '/app/dat-ten-dn': 1,
    '/app/chon-ngay': 1,
    '/app/cong-so': 1,
    '/app/nhan-mach': 1,
    '/app/gio-sinh': 1,
    '/app/huong-nghiep-tre': 1,
    '/app/but-tuong': 1,
    '/app/khi-sac': 1,
    '/app/trang-diem': 1,
    '/app/van-han-nam': 1,
    '/app/xem-tuoi': 1,
    '/app/xem-lam-an': 1,
    '/app/tuong-hop': 1,
    '/app/ban-lam-viec': 1,
    '/app/bat-tu': 1,
    '/app/boi-bai-tay': 1,
    '/app/chan-dung-tien-kiep': 1,
    '/app/chan-dung-vo-chong': 1,
    '/app/chu-trinh-cuoc-doi': 1,
    '/app/cua-hang-phong-thuy': 1,
    '/app/da-lieu-ai': 1,
    '/app/day-con': 1,
    '/app/dien-tuong': 1,
    '/app/duyen-no-tien-kiep': 1,
    '/app/kieu-toc': 1,
    '/app/la-so': 1,
    '/app/luan-giai': 1,
    '/app/mau-sac-hop-menh': 1,
    '/app/nguoi-khac': 1,
    '/app/nhan-tuong': 1,
    '/app/oracle': 1,
    '/app/personal-color': 1,
    '/app/phong-thuy': 1,
    '/app/tarot': 1,
    '/app/thanh-tuong': 1,
    '/app/thanh-tuong-pro': 1,
    '/app/thu-tuong': 1,
    '/app/trang-phuc-theo-ngay': 1,
    '/app/tai-khoan': 1,
    '/app/ho-so': 1,
  };
  var TIMEOUT_MS = 8000;
  var inflight = false;
  // Bấm khi `inflight` (soft-nav trước còn chưa xong) → rớt về full reload
  // (bên dưới). Nhưng `location.href=…` KHÔNG huỷ ngay promise chain của
  // go() đang chạy dở — tài liệu cũ (đang unload dần) vẫn còn JS sống trong
  // khoảng ngắn giữa lúc gọi và lúc trình duyệt thật sự điều hướng. Nếu
  // chain cũ tới đúng lúc đó mới `runInlineScript` → DOM đang bị trình
  // duyệt tháo dỡ dở, `getElementById` ra `null` giữa chừng (bắt được ở
  // stress test Đợt 9: `#shell-rail` biến mất hoàn toàn, `document.body`
  // cũng null). Cờ này bật NGAY khi gọi fullReload, mọi bước còn lại của
  // MỌI chain go() đang treo phải tự kiểm trước khi đụng DOM.
  var navigating = false;

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
    navigating = true;
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
    var syncedFlags = false;
    scripts.forEach(function (old) {
      p = p.then(function () {
        // Mỗi script trong dãy chờ script trước xong mới chạy (comment ở
        // trên) — nghĩa là CÓ những nhịp `await` giữa hai script liên tiếp,
        // đủ để một cú bấm khác rớt vào fullReload (`navigating=true`) trong
        // lúc dãy này còn chạy dở. Script sau không được đụng DOM nữa.
        if (navigating) return null;
        if (old.src) {
          if (loadedSrc[old.src]) return;
          loadedSrc[old.src] = true;
          var attrs = {};
          Array.prototype.forEach.call(old.attributes, function (a) { attrs[a.name] = a.value; });
          return loadExternalScript(attrs);
        }
        runInlineScript(old.textContent);
        // Script cờ per-trang (`window.SHELL_ACTIVE='...'`, luôn là script đầu
        // tiên KHÔNG-src của mỗi app-*.html — xem contract ở đầu shell.js) vừa
        // chạy xong: đồng bộ NGAY vào shell.js (biến ACTIVE/CHATFIRST/
        // CHAT_INTAKE/HIST_ON của nó "đóng băng" từ lượt tải trang đầu tiên,
        // xem `Shell._resyncTool`) TRƯỚC KHI script nội dung của trang (chạy
        // sau trong CHÍNH dãy này, vd renderChat/startIntake) kịp ghi vào
        // `#chat` — `_resyncTool` dọn `#chat` về rỗng, gọi sau nội dung sẽ
        // xoá mất nội dung vừa ghi.
        if (!syncedFlags && /window\.SHELL_ACTIVE\s*=/.test(old.textContent)) {
          syncedFlags = true;
          if (window.Shell && window.Shell._resyncTool) window.Shell._resyncTool();
          // Cùng thứ tự bắt buộc như trên: reset TRƯỚC khi trang đích tự gọi
          // `TuviForm.renderChat()` (script SAU trong CHÍNH dãy này) — xem
          // chú thích ở khai báo `_introShown` trong tuvi-form.js.
          if (window.TuviForm && window.TuviForm._resetIntro) window.TuviForm._resetIntro();
        }
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
  //
  // Ranh giới phân biệt "style riêng của trang" với "style DÙNG CHUNG do JS
  // chèn" (nav.js/auth.js/tuvi-paywall.js/tuvi-form.js/feedback.js/hook-*.js…
  // — mỗi module tự canh chèn-trùng bằng `document.getElementById(id)`) là
  // CÓ `id` hay KHÔNG: style riêng của trang luôn VÔ DANH, style dùng chung
  // luôn có `id` ổn định. KHÔNG dùng danh sách liệt kê tay (`KNOWN_SHARED_IDS`
  // cũ chỉ có 3 id) — bản đó bỏ sót `tvf-css`/`tvfb-css`/`hook-charts-css`/
  // `hook-layer-css` (chưa có id lúc viết luật này), khiến soft-nav gỡ mất
  // CSS `.tvf-ic`/`.tvf-chev`/`.tvf-pretty` ở lần đổi trang thứ hai — icon
  // phình to bằng kích thước SVG gốc (thiếu `width/height` khi mất CSS), lá
  // số/hook-chart mất luôn layout lưới, rơi về danh sách dọc mặc định của
  // trình duyệt. Henry báo thật 2026-09-26 (docs/nhat-ky). Quy tắc "có id"
  // tự phủ MỌI module tương lai theo đúng nếp đã có, không cần sửa lại đây.
  function markExistingHeadStyles() {
    var already = document.querySelectorAll('style[data-page-style]');
    if (already.length) return; // đã đánh dấu ở lượt soft-nav trước
    Array.prototype.forEach.call(document.querySelectorAll('head > style'), function (el) {
      if (el.id) return;
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

  // `<link rel="stylesheet">`/`<link rel="preload" as="style">` riêng của
  // trang (vd `/laso-chart.css` — chỉ các tool có lá số mới nạp) KHÔNG được
  // `go()` đối chiếu trước bản vá này: nó chỉ thay `#ws` + script, chưa từng
  // đụng `<link>`. Soft-nav TỚI một trang cần stylesheet mà trang NGUỒN chưa
  // từng nạp (vd từ Trang chủ bấm sang Chu Trình Cuộc Đời) thì stylesheet đó
  // vĩnh viễn không có mặt trong `<head>` — lá số/chart render ra danh sách
  // dọc mặc định của trình duyệt (mất toàn bộ CSS lưới định vị), giống hệt
  // vẻ ngoài "bể class" nhưng gốc rễ là THIẾU HẲN stylesheet, không phải mất
  // riêng lẻ vài rule. Henry báo thật 2026-09-26. Khớp theo `href` TUYỆT ĐỐI
  // (trình duyệt tự chuẩn hoá qua `.href`) nên không nạp trùng dù trang cũ
  // đã có; bỏ luôn cơ chế preload-rồi-đổi-rel (chỉ có tác dụng cho lượt vẽ
  // ĐẦU của toàn trang, đằng này trang đã vẽ xong từ lâu) — nạp thẳng
  // `rel="stylesheet"`, không chặn hiển thị gì thêm ở thời điểm này.
  function ensureHeadStylesheets(doc) {
    var seen = {};
    Array.prototype.forEach.call(document.querySelectorAll('head > link[rel]'), function (l) {
      var rel = (l.getAttribute('rel') || '').toLowerCase();
      if (rel === 'stylesheet' || rel === 'preload') seen[l.href] = true; // `.href` = URL tuyệt đối
    });
    Array.prototype.forEach.call(doc.querySelectorAll('head > link[rel]'), function (l) {
      var rel = (l.getAttribute('rel') || '').toLowerCase();
      var isStyle = rel === 'stylesheet' || (rel === 'preload' && (l.getAttribute('as') || '').toLowerCase() === 'style');
      if (!isStyle || seen[l.href]) return;
      seen[l.href] = true;
      var nl = document.createElement('link');
      nl.rel = 'stylesheet';
      nl.href = l.href;
      document.head.appendChild(nl);
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

  // Trang ĐANG vẽ trong #ws. popstate cùng pathname KHÔNG phải đổi trang: shell.js
  // tự pushState một mốc lịch sử (cùng URL) khi mở rail/sheet trên mobile rồi
  // `history.back()` lúc đóng — thiếu phép so này thì bấm "Kết quả" (đóng rail)
  // tải lại #ws và XOÁ TRẮNG kết quả khách vừa lập.
  var shownPath = location.pathname;
  function go(path, replaceHistory) {
    if (navigating) return; // đã có full reload thật đang chạy — đừng đụng gì thêm
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
        // Xem khai báo `navigating` ở đầu file: một cú bấm khác đã rớt vào
        // fullReload trong lúc fetch này còn bay — tài liệu hiện tại sắp bị
        // trình duyệt tháo dỡ thật, đừng vẽ/gắn gì vào đó nữa.
        if (navigating) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newWs = doc.querySelector('main#ws');
        var curWs = document.querySelector('main#ws');
        if (!newWs || !curWs) throw new Error('thiếu #ws ở trang đích');
        var bodyScripts = Array.prototype.slice.call(doc.querySelectorAll('body > script'));

        document.title = doc.title || document.title;
        swapHeadStyles(doc);
        ensureHeadStylesheets(doc);
        buryOldContent(curWs);
        curWs.innerHTML = newWs.innerHTML;
        shownPath = path;
        closeOverlays();
        if (!replaceHistory) history.pushState({ softNav: true }, '', path);
        window.scrollTo(0, 0);

        // Cờ per-trang (SHELL_ACTIVE/CHATFIRST/CHAT_INTAKE/HISTORY/INTRO) sống
        // trong `window`, KHÔNG theo `document` — về mặc định TRƯỚC khi script
        // của trang đích chạy. Thiếu bước này thì một trang không tự khai lại
        // đủ cờ (vd Trang chủ chỉ khai SHELL_ACTIVE, không khai CHATFIRST) sẽ
        // THỪA HƯỞNG cờ thật của trang vừa rời thay vì mặc định false/rỗng.
        window.SHELL_ACTIVE = ''; window.SHELL_CHATFIRST = false; window.SHELL_CHAT_INTAKE = false;
        window.SHELL_HISTORY = false; window.SHELL_INTRO = null;

        return runPageScripts(bodyScripts);
      })
      .then(function () {
        if (navigating) return;
        // nav.js đã nạp ⇒ runPageScripts bỏ qua nó, nên không ai gọi lại
        // mountIcons cho #ws vừa thay ⇒ mọi [data-icon] tĩnh ra ô trống.
        if (window.mountIcons) window.mountIcons(document.querySelector('main#ws'));
        updateTabbarActive(path);
        try { if (window.Track) window.Track.event('page_view', { meta: { from: 'soft_nav' } }); } catch (e) { /* ignore */ }
        document.dispatchEvent(new CustomEvent('tvmb:softnav', { detail: { path: path } }));
      })
      .catch(function () {
        if (!navigating) fullReload(path);
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
      if (location.pathname === shownPath) return; // mốc rail/sheet của shell.js, không phải đổi trang
      if (SOFT_PAGES[location.pathname]) go(location.pathname, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
