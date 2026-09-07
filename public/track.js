/* ============================================================
   track.js — Beacon marketing/analytics (nguồn chung, không thư viện).
   • Sinh anon_id (localStorage) + session_id (sessionStorage).
   • Bắt UTM + referrer + landing path; lưu FIRST-TOUCH 1 lần, gửi kèm mỗi event.
   • Tự gửi page_view khi load; expose window.Track.event(type, props).
   • Gửi qua navigator.sendBeacon; nếu có token đăng nhập thì fetch keepalive
     (kèm Authorization để server gắn user_id + snapshot attribution).
   Cặp với /api/track (app/api/track/route.ts).
   ============================================================ */
(function () {
  'use strict';

  // CI (Playwright E2E — playwright.yml chạy trên MỌI push/PR, mặc định nhắm
  // thẳng https://www.tuviminhbao.com PROD THẬT trừ nhánh dev) tạo browser có
  // navigator.webdriver=true → nếu không chặn, mỗi lần CI chạy sẽ ghi page_view/
  // topup_start/... THẬT vào bảng events, làm lệch Funnel/DAU/topup_intent.
  // Không gửi gì cả (kể cả page_view tự động) khi phát hiện automation; Track
  // vẫn expose API no-op để code gọi Track.event(...) khắp site không cần đổi.
  if (navigator.webdriver) {
    window.Track = { event: function () {}, anonId: null, sessionId: null };
    return;
  }

  // Trang KỸ THUẬT (auth-callback.html) chỉ mượn Track để bắn MỘT event có chủ
  // đích rồi chuyển hướng đi ngay. Đặt window.TRACK_QUIET=true TRƯỚC thẻ script
  // này để tắt hai hành vi mặc định:
  //   • page_view tự động — đó là trạm trung chuyển OAuth, không phải lượt xem
  //     trang; đếm vào thì thổi phồng "khách ghé" và đẻ ra một landing path rác.
  //   • ghi FIRST-TOUCH — nguy hiểm hơn nhiều. Lúc đó referrer là
  //     accounts.google.com, nên nếu đây là trang đầu tiên có track.js mà trình
  //     duyệt chạm tới, MỌI user đăng nhập bằng Google sẽ bị quy về kênh "Google
  //     OAuth" vĩnh viễn (first-touch chỉ ghi một lần). Thà để trống — không
  //     biết nguồn còn hơn tin vào một nguồn sai.
  var quiet = !!window.TRACK_QUIET;

  var ANON_KEY = 'tvmb_anon', SID_KEY = 'tvmb_sid', FIRST_KEY = 'tvmb_attr_first';

  function uuid() {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'x' + Date.now() + Math.random().toString(36).slice(2);
  }
  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  var anonId = lget(ANON_KEY); if (!anonId) { anonId = uuid(); lset(ANON_KEY, anonId); }
  var sid = sget(SID_KEY); if (!sid) { sid = uuid(); sset(SID_KEY, sid); }

  function currentTouch() {
    var q = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; }); } catch (e) { /* ignore */ }
    // Google Ads auto-tagging (mặc định của tài khoản, KHÔNG cấu hình UTM thủ
    // công) chỉ gắn gclid/gad_source/gad_campaignid vào URL đích, không có
    // utm_source — thiếu dòng này thì mọi click Ads rơi lẫn vào "(none)" cùng
    // organic/direct thật, không cách nào tách lại được trong báo cáo
    // (marketing_campaigns/user_attribution). Suy ra utm_source=google/medium=cpc
    // khi có gclid mà chưa có utm_source (không ghi đè nếu trang đã tự gắn UTM).
    var utmSource = q.utm_source || null, utmMedium = q.utm_medium || null, utmCampaign = q.utm_campaign || null;
    if (!utmSource && q.gclid) {
      utmSource = 'google';
      utmMedium = 'cpc';
      utmCampaign = q.gad_campaignid || null;
    }
    return {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: q.utm_term || null,
      utm_content: q.utm_content || null,
      referrer: document.referrer || null,
      landing_path: location.pathname + location.search,
      seen_at: new Date().toISOString()
    };
  }
  var touch = currentTouch();

  // First-touch: ghi 1 lần duy nhất (giữ nguyên kênh đưa khách đến lần đầu).
  var first = null;
  try { first = JSON.parse(lget(FIRST_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (!first && !quiet) { first = touch; lset(FIRST_KEY, JSON.stringify(first)); }

  function authToken() {
    try {
      var s = JSON.parse(lget('tuvi_session') || 'null');
      return (s && s.access_token) || null;
    } catch (e) { return null; }
  }

  function send(events) {
    var url = '/api/track';
    var body = JSON.stringify({ events: events });
    var token = authToken();
    // Có token → fetch keepalive (sendBeacon không đặt được Authorization).
    if (token) {
      try {
        fetch(url, {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: body
        }).catch(function () {});
        return;
      } catch (e) { /* fallthrough */ }
    }
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch (e) { /* fallthrough */ }
    try {
      fetch(url, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: body }).catch(function () {});
    } catch (e) { /* ignore */ }
  }

  // ============================================================
  // Cầu nối sang GA4.
  // Trước đây KHÔNG nơi nào trong repo gọi gtag('event', ...) — nav.js và
  // lib/analytics/isr-tracking.ts chỉ chạy gtag('js') + gtag('config'), nên GA4
  // chỉ nhận được đúng mấy event TỰ ĐỘNG của nó (page_view, session_start,
  // first_visit, scroll, user_engagement). Hệ quả: mục "Key events" của GA4
  // vĩnh viễn bằng 0 vì không có event nghiệp vụ nào tồn tại bên đó để đánh
  // dấu. Toàn bộ tín hiệu thật (signup, topup_start, tool_run…) chỉ nằm trong
  // bảng events của Supabase. Gửi song song sang GA4 để bịt khoảng trống đó.
  //
  // Bảng events nội bộ vẫn là NGUỒN CHUẨN cho mọi báo cáo trong admin — GA4 chỉ
  // là bản sao để dùng công cụ của Google. Lượt gửi GA4 hỏng không được phép
  // ảnh hưởng lượt gửi /api/track, nên nó đứng sau send() và bọc try/catch.
  // ============================================================

  // page_view CỐ Ý không gửi: gtag('config') đã tự bắn một cái mỗi lần tải
  // trang. Gửi thêm là đếm đôi — đúng lỗi đã dính một lần khi GA4_TRACK_SNIPPET
  // vô tình kèm thẻ track.js trên trang /ket-qua.
  var GA4_SKIP = { page_view: 1 };
  // Đổi sang tên GA4 KHUYẾN NGHỊ ở những chỗ có tên tương đương, để event rơi
  // đúng báo cáo dựng sẵn của Google thay vì thành một event tự chế nằm rời.
  // 'login' và 'share' vốn đã trùng tên khuyến nghị nên không cần map.
  var GA4_RENAME = { signup: 'sign_up' };

  // GA4 từ chối cả event nếu tên tham số sai luật (chỉ chữ/số/gạch dưới, bắt
  // đầu bằng chữ cái, ≤40 ký tự) hoặc trùng tiền tố dành riêng của Google.
  function ga4Key(k) {
    var s = String(k).replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40);
    if (!/^[A-Za-z]/.test(s)) return null;
    if (/^(ga_|google_|firebase_)/.test(s)) return null;
    return s;
  }

  // Chỉ lấy giá trị vô hướng. props có thể mang object lồng (meta, first) mà
  // GA4 không nhận — nhét vào thì thành "[object Object]". Riêng meta được trải
  // PHẲNG một tầng vì đó là chỗ chứa phần có nghĩa nhất (medium của share,
  // from/need của topup_start). anon_id/session_id CỐ Ý bỏ: GA4 tự có định danh
  // riêng, đẩy thêm định danh của mình sang chỉ thừa.
  function ga4Params(props) {
    var out = {}, n = 0;
    function add(o) {
      for (var k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        if (k === 'meta' || k === 'first') continue;
        var v = o[k];
        if (v === null || v === undefined) continue;
        var t = typeof v;
        if (t !== 'string' && t !== 'number' && t !== 'boolean') continue;
        var key = ga4Key(k);
        if (!key || Object.prototype.hasOwnProperty.call(out, key)) continue;
        if (n >= 24) return; // GA4 cho tối đa 25 tham số/event, chừa 1 chỗ
        out[key] = t === 'string' ? v.slice(0, 100) : v;
        n++;
      }
    }
    add(props);
    if (props.meta && typeof props.meta === 'object') add(props.meta);
    return out;
  }

  // track.js được nạp NGAY TRƯỚC nav.js trên mọi trang có chrome, cả hai đều
  // defer nên chạy theo thứ tự tài liệu → lúc event đầu tiên bắn thì nav.js
  // CHƯA kịp định nghĩa window.gtag. Xếp hàng rồi xả khi gtag xuất hiện. Không
  // tự đẩy thẳng vào dataLayer: event lọt vào trước gtag('config') có thể bị
  // gtag.js bỏ qua. Bỏ cuộc sau ~10s — trang không có GA4 (admin.html) thì
  // không để một timer chạy mãi.
  var ga4Queue = [], ga4Timer = null, ga4Tries = 0;

  function ga4Flush() {
    if (typeof window.gtag !== 'function') return false;
    while (ga4Queue.length) {
      var item = ga4Queue.shift();
      try { window.gtag('event', item[0], item[1]); } catch (e) { /* ignore */ }
    }
    if (ga4Timer) { clearInterval(ga4Timer); ga4Timer = null; }
    return true;
  }

  function ga4Send(type, props) {
    if (GA4_SKIP[type]) return;
    var name = ga4Key(GA4_RENAME[type] || type);
    if (!name) return;
    ga4Queue.push([name, ga4Params(props)]);
    if (ga4Flush() || ga4Timer) return;
    ga4Timer = setInterval(function () {
      if (ga4Flush() || ++ga4Tries >= 25) {
        if (ga4Timer) { clearInterval(ga4Timer); ga4Timer = null; }
        if (ga4Tries >= 25) ga4Queue.length = 0;
      }
    }, 400);
  }

  // ============================================================
  // Cầu nối sang Meta Pixel (fbq) — Google Ads 2026-09 chạy sai mục tiêu
  // (click thay vì purchase) lộ ra một lỗ y hệt bên Meta: track.js CHƯA từng
  // gọi fbq('track', ...) cho bất kỳ event nghiệp vụ nào — nav.js chỉ tự bắn
  // 'PageView'. Không có tín hiệu tool_run/preview_shown/signup thì Meta chỉ
  // tối ưu được theo lượt xem trang, đúng gốc của 0,5-18% chạy tool trên 5.200
  // khách quảng cáo tuần 2026-08-29→09-01 mà 0đ doanh thu. Xem docs/nhat-ky/2026-09.md.
  //
  // Chỉ map 3 event có ý nghĩa phễu thật cho Meta (không đổ hết 24 loại event
  // sang — js_error/scroll_depth/page_dwell không phải tín hiệu tối ưu quảng
  // cáo), và ưu tiên STANDARD EVENT của Meta thay vì trackCustom: standard event
  // được xếp sẵn vào nhóm tối ưu hoá (Lead/CompleteRegistration/ViewContent),
  // Ads Manager mới dùng được làm Conversion goal ngay khi chọn objective.
  var FB_EVENTS = { tool_run: 'Lead', preview_shown: 'ViewContent', signup: 'CompleteRegistration' };
  var fbQueue = [], fbTimer = null, fbTries = 0;

  function fbFlush() {
    if (typeof window.fbq !== 'function') return false;
    while (fbQueue.length) {
      var name = fbQueue.shift();
      try { window.fbq('track', name); } catch (e) { /* ignore */ }
    }
    if (fbTimer) { clearInterval(fbTimer); fbTimer = null; }
    return true;
  }

  function fbSend(type) {
    var name = FB_EVENTS[type];
    if (!name) return;
    fbQueue.push(name);
    if (fbFlush() || fbTimer) return;
    fbTimer = setInterval(function () {
      if (fbFlush() || ++fbTries >= 25) {
        if (fbTimer) { clearInterval(fbTimer); fbTimer = null; }
        if (fbTries >= 25) fbQueue.length = 0;
      }
    }, 400);
  }

  function event(type, props) {
    props = props || {};
    var e = {
      type: type,
      anon_id: anonId,
      session_id: sid,
      platform: 'web',
      path: location.pathname + location.search,
      referrer: touch.referrer,
      utm_source: touch.utm_source,
      utm_medium: touch.utm_medium,
      utm_campaign: touch.utm_campaign,
      utm_term: touch.utm_term,
      utm_content: touch.utm_content,
      first: first
    };
    for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k)) e[k] = props[k]; }
    send([e]);
    try { ga4Send(type, props); } catch (err) { /* GA4 hỏng không được kéo theo beacon nội bộ */ }
    try { fbSend(type); } catch (err) { /* Meta Pixel hỏng không được kéo theo beacon nội bộ */ }
  }

  window.Track = { event: event, anonId: anonId, sessionId: sid };

  // ============================================================
  // js_error — bắt lỗi JS phía client, thay phần Sentry đang gỡ dần.
  // Sentry chỉ có mặt ở 7/89 trang (0 trang /app/*) và KHÔNG báo được lỗi chạy
  // trong trình duyệt — hai bug thật tìm được hôm nay (ảnh OG rỗng + timeout
  // /la-so) đều lộ ra qua log runtime Vercel (lỗi SERVER), không phải qua
  // Sentry. Track.js đã có sẵn đường /api/track → bảng events trên MỌI trang,
  // nên đây là chỗ rẻ nhất vá đúng lỗ còn thiếu: lỗi CHẠY TRÊN MÁY người dùng.
  //
  // Chống lũ: một vòng lặp render hỏng có thể ném hàng nghìn lỗi/giây. Trần
  // cứng mỗi lượt tải trang + gộp lỗi LẶP LẠI y hệt (cùng thông điệp+dòng)
  // thành một lượt gửi — không thì chính bản thân việc "báo lỗi" lại làm
  // nghẽn mạng của người dùng đang gặp lỗi.
  // ============================================================
  var JS_ERR_CAP = 8;
  var jsErrSent = 0;
  var jsErrSeen = {};

  function jsErrKey(msg, src, line) {
    return (msg || '') + '|' + (src || '') + '|' + (line || '');
  }

  // Nhiễu KHÔNG đáng báo — lọc TRƯỚC khi tính vào trần, không thì vài giây
  // đầu trang đã ăn hết CAP bằng rác không hành động được gì.
  function jsErrIsNoise(msg, src) {
    if (!msg) return true;
    // Cross-origin script (extension trình duyệt, thư viện bên thứ ba không
    // CORS) — trình duyệt cố ý giấu chi tiết, "Script error." trơ trụi không
    // nói được gì để hành động theo.
    if (/^script error\.?$/i.test(msg) && !src) return true;
    // Quirk vô hại của trình duyệt, không phải lỗi của mình — khuyến nghị
    // chuẩn của cả Sentry lẫn cộng đồng là bỏ qua nó.
    if (/ResizeObserver loop/i.test(msg)) return true;
    // Extension trình duyệt (AdBlock, Grammarly...) ném lỗi trong sandbox
    // riêng của nó, không phải code của site.
    if (src && /^(chrome|moz|safari)-extension:\/\//i.test(src)) return true;
    return false;
  }

  function reportJsError(kind, msg, src, line, col, stack) {
    if (jsErrIsNoise(msg, src)) return;
    var key = jsErrKey(msg, src, line);
    if (jsErrSeen[key]) return; // lỗi lặp lại y hệt trong cùng lượt tải trang — báo 1 lần là đủ
    jsErrSeen[key] = true;
    if (jsErrSent >= JS_ERR_CAP) return; // vòng lặp hỏng thì ngừng gửi, đừng nghẽn thêm mạng của người dùng
    jsErrSent++;
    event('js_error', {
      meta: {
        kind: kind, // 'error' | 'unhandledrejection'
        message: String(msg || '').slice(0, 300),
        src: src ? String(src).slice(0, 300) : null,
        line: line || null,
        col: col || null,
        stack: stack ? String(stack).slice(0, 1200) : null
      }
    });
  }

  window.addEventListener('error', function (e) {
    // Ảnh/CSS/script tải hỏng cũng nổ 'error' nhưng KHÔNG có message — đó là
    // lỗi TÀI NGUYÊN, không phải lỗi JS, và đã đo được ở nơi khác (log 404/500
    // phía server). Bỏ qua để không lẫn hai loại lỗi khác hẳn nhau.
    if (!e || !e.message) return;
    reportJsError('error', e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e && e.reason;
    var msg, stack;
    if (reason instanceof Error) { msg = reason.message; stack = reason.stack; }
    else { try { msg = JSON.stringify(reason); } catch (err) { msg = String(reason); } }
    reportJsError('unhandledrejection', msg, null, null, null, stack);
  });

  // ============================================================
  // ĐO MỨC ĐỌC — độ cuộn + thời gian ở lại (2026-09).
  //
  // VÌ SAO CẦN: trước đợt này track.js chỉ bắn page_view + tool_open, và CẢ HAI
  // đều bắn lúc TẢI TRANG. Hệ quả: người đọc 3 phút rồi bỏ đi và người bấm back
  // sau 1 giây cho ra dữ liệu Y HỆT NHAU. Đo được 2026-09-01: 114/162 khách
  // Google Ads chỉ có đúng 2 event đó — và tôi đã suýt đọc thành "khách rời sau
  // 0.1 giây" (SAI: 0.19s là khoảng cách giữa hai event lúc load, không phải
  // thời gian ở lại). Không có khối này thì mọi tranh luận "landing dở hay
  // landing chậm" đều là đoán, xem docs/nhat-ky/2026-09.md.
  //
  // 🪤 BẪY ĐÃ NÉ: trang /app/* KHÔNG cuộn window — chúng cuộn TRONG #ws (xem
  // shell.js, và bindJump() ở app-luan-giai.html nghe scroll trên chính #ws).
  // Gắn listener vào window là vĩnh viễn 0 trên đúng nhóm trang đang chạy
  // quảng cáo — đúng lớp lỗi "xanh oan" mà CLAUDE.md cảnh báo. Sự kiện scroll
  // KHÔNG nổi bọt, nhưng CÓ đi qua pha capture, nên nghe capture trên document
  // là bắt được cả window lẫn mọi phần tử con.
  //
  // NGÂN SÁCH EVENT: cố ý chỉ 2 dòng/lượt xem (một mốc 50% + một dòng tổng kết)
  // thay vì rải 25/50/75/100. `page_dwell` đã chở sẵn `max_pct` nên độ cuộn
  // chính xác nằm gọn trong MỘT dòng; mốc 50% giữ lại chỉ để còn dấu vết khi
  // lượt tổng kết không kịp gửi (trình duyệt bị OS giết).
  //
  // ⚠️ HẠN CHẾ ĐÃ BIẾT: chỉ chốt MỘT lần, ở lượt ẩn tab ĐẦU TIÊN. Người rời đi
  // rồi quay lại đọc tiếp thì phần sau không được cộng — cố ý đổi lấy "mỗi lượt
  // xem đúng một dòng". Đừng đọc `sec` thành tổng thời gian của cả phiên.
  // ============================================================
  if (!quiet) {
    var _dwellSent = false;
    var _maxPct = 0;
    var _half = false;
    var _visibleMs = 0;
    var _lastTick = Date.now();
    var _wasVisible = !document.hidden;

    // Cuộn tới đâu, tính theo MÉP DƯỚI khung nhìn (đọc hết trang = 100%).
    function _pctOf(el) {
      var st, sh, ch;
      if (!el || el === document || el === window || el === document.documentElement || el === document.body) {
        st = window.pageYOffset || document.documentElement.scrollTop || 0;
        sh = document.documentElement.scrollHeight || 0;
        ch = window.innerHeight || 0;
      } else {
        st = el.scrollTop; sh = el.scrollHeight; ch = el.clientHeight;
      }
      // Trang ngắn hơn khung nhìn thì KHÔNG cuộn được — trả 0, đừng trả 100:
      // "đọc hết" và "không có gì để cuộn" là hai chuyện khác hẳn nhau.
      if (!sh || sh <= ch) return 0;
      var p = Math.round(((st + ch) / sh) * 100);
      return p < 0 ? 0 : p > 100 ? 100 : p;
    }

    document.addEventListener('scroll', function (e) {
      var p = _pctOf(e.target);
      if (p > _maxPct) _maxPct = p;
      if (!_half && _maxPct >= 50) { _half = true; event('scroll_depth', { meta: { pct: 50 } }); }
    }, true);

    // Chỉ cộng thời gian lúc tab ĐANG HIỆN — tab nằm nền cả tiếng không phải là
    // "đọc một tiếng".
    //
    // 🪤 `_wasVisible` KHÔNG thừa, đừng rút gọn thành `if (!document.hidden)`:
    // lượt chốt cuối chạy TRONG handler visibilitychange, lúc đó `document.hidden`
    // ĐÃ = true rồi, nên đoạn vừa đọc xong sẽ không được cộng và MỌI lượt đo đều
    // ra sec=0. Khoảng thời gian vừa trôi thuộc về trạng thái TRƯỚC sự kiện, nên
    // phải nhớ trạng thái đó lại. Đã dính đúng lỗi này lúc thử bằng trình duyệt.
    function _tick() {
      var now = Date.now();
      if (_wasVisible) _visibleMs += now - _lastTick;
      _lastTick = now;
      _wasVisible = !document.hidden;
    }

    function _sendDwell() {
      if (_dwellSent) return;
      _tick();
      _dwellSent = true;
      event('page_dwell', { meta: { sec: Math.round(_visibleMs / 1000), max_pct: _maxPct } });
    }

    // visibilitychange là tín hiệu ĐÁNG TIN trên mobile; pagehide/unload nhiều
    // trình duyệt di động bỏ qua hẳn. Giữ cả hai, `_dwellSent` chống gửi đôi
    // (pagehide còn bắn lại khi trang vào bfcache).
    document.addEventListener('visibilitychange', function () {
      _tick();
      if (document.hidden) _sendDwell();
    });
    window.addEventListener('pagehide', _sendDwell);
  }

  // Tự động page_view mỗi lần tải trang (trừ trang kỹ thuật — xem TRACK_QUIET).
  if (!quiet) event('page_view');
})();
