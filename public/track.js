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
  if (!first) { first = touch; lset(FIRST_KEY, JSON.stringify(first)); }

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
  }

  window.Track = { event: event, anonId: anonId, sessionId: sid };

  // Tự động page_view mỗi lần tải trang.
  event('page_view');
})();
