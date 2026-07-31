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
    return {
      utm_source: q.utm_source || null,
      utm_medium: q.utm_medium || null,
      utm_campaign: q.utm_campaign || null,
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
  }

  window.Track = { event: event, anonId: anonId, sessionId: sid };

  // Tự động page_view mỗi lần tải trang (trừ trang kỹ thuật — xem TRACK_QUIET).
  if (!quiet) event('page_view');
})();
