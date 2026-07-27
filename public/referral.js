/* ============================================================
   referral.js — bắt ?ref=CODE trên MỌI trang → sessionStorage → tự gọi
   /api/payment?action=referral-register ngay khi người dùng đăng nhập/đăng ký.

   Trước đây khối này được CHÉP INLINE 2 bản (index.html + cong-cu.html) nên
   link chia sẻ /ket-qua và các trang /app hoàn toàn không bắt được mã. Đây là
   NGUỒN DUY NHẤT; shell.js nạp động cho mọi trang /app (ensureReferralJs).

   Ngoài mã, còn nhớ luôn "mã tới từ đâu" (utm_campaign = tool_id của link chia
   sẻ, utm_source) và gửi kèm khi đăng ký → server ghi event referral_signup có
   tool_id thật, nhờ đó panel Vòng Lặp Viral tính được K-factor TỪNG TOOL. Nếu
   chỉ dựa vào user_attribution.first_utm_* thì trình duyệt nào đã ghé site
   trước đó sẽ mãi mang first-touch cũ, không quy được về tool nào.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'pending_ref_code';
  var SRC_KEY = 'pending_ref_src';
  var CODE_RE = /^[A-Z0-9]{8}$/i;

  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function sdel(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }

  // Bắt ?ref= (+ nguồn) rồi DỌN khỏi thanh địa chỉ — người dùng copy URL đang
  // đọc không vô tình phát tán mã của người khác. utm_* giữ nguyên trong URL
  // vì track.js đọc chúng để dựng first-touch.
  function capture() {
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
    var raw = q.get('ref');
    if (!raw || !CODE_RE.test(raw)) return;
    sset(KEY, raw.toUpperCase());
    sset(SRC_KEY, JSON.stringify({
      tool: q.get('utm_campaign') || null,
      source: q.get('utm_source') || null,
    }));
    try {
      var u = new URL(window.location.href);
      u.searchParams.delete('ref');
      window.history.replaceState({}, '', u.toString());
    } catch (e) { /* ignore */ }
  }

  var busy = false;

  function tryRegister() {
    var refCode = sget(KEY);
    if (!refCode || busy) return Promise.resolve(null);
    if (!(window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn())) return Promise.resolve(null);
    var sess = window.Auth.getSession && window.Auth.getSession();
    var token = sess && sess.access_token;
    if (!token) return Promise.resolve(null);

    var src = {};
    try { src = JSON.parse(sget(SRC_KEY) || '{}') || {}; } catch (e) { /* ignore */ }

    busy = true;
    return fetch('/api/payment?action=referral-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ refCode: refCode, srcTool: src.tool || null, srcSource: src.source || null }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        busy = false;
        // Xoá mã khi server đã CHỐT xong lượt này (ghi nhận, đã có sẵn, hoặc bị
        // từ chối vì không phải tài khoản mới) — thử lại cũng ra cùng kết quả.
        if (data && (data.success || data.settled)) { sdel(KEY); sdel(SRC_KEY); }
        return data;
      })
      .catch(function (e) { busy = false; console.warn('[referral]', e); return null; });
  }

  window.Referral = {
    capture: capture,
    tryRegister: tryRegister,
    pendingCode: function () { return sget(KEY); },
  };
  // Tên cũ — index.html/cong-cu.html từng khai global này, giữ để không gãy.
  window.tryRegisterReferral = tryRegister;

  capture();
  setTimeout(tryRegister, 1500);
  if (window.Auth && window.Auth.onAuthChange) {
    window.Auth.onAuthChange(function (event) {
      if (event === 'SIGNED_IN') setTimeout(tryRegister, 500);
    });
  }
})();
