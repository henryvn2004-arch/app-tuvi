/* ============================================================
   promo.js — MÃ KHUYẾN MÃI: bắt `?promo=`, đổi mã, hỏi mã tặng bao nhiêu.

   NGUỒN DUY NHẤT cho mọi bề mặt có ô nhập mã (modal đăng ký · trang nạp
   Lượng · sau này là chỗ nào cần). Bài học đã trả giá với referral: khối đó
   từng được CHÉP INLINE 2 bản nên trang /app và link chia sẻ hoàn toàn không
   bắt được mã, mà không có gì báo.

   Ba việc:
     capture()      — nhặt `?promo=CODE` khỏi URL rồi DỌN thanh địa chỉ.
     info(code)     — hỏi server mã đó tặng bao nhiêu Lượng (KHÔNG viết cứng
                      con số trên giao diện — xem chú thích ở `info`).
     redeem(code)   — đổi mã. Cần đã đăng nhập.

   ⚠️ KHÔNG có logic quyết định nào ở đây. Mã còn hạn không, đã đổi chưa, tài
   khoản có đủ mới không — TẤT CẢ do RPC `promo_code_redeem` dưới DB chốt.
   Client chỉ hỏi và hiện câu trả lời. Đây là đường phát tiền: kiểm ở hai tầng
   thì hai tầng sẽ trôi khỏi nhau.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'pending_promo_code';
  // Rộng hơn referral (`/^[A-Z0-9]{8}$/`) vì mã khuyến mãi do người đặt tên —
  // `TUVIMINHBAO` đã 11 ký tự. Khớp đúng luật server nhận.
  var CODE_RE = /^[A-Z0-9_-]{3,40}$/i;

  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function sdel(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }

  function norm(c) { return String(c || '').toUpperCase().trim(); }

  function capture() {
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
    var raw = q.get('promo');
    if (!raw || !CODE_RE.test(raw)) return;
    sset(KEY, norm(raw));
    try {
      var u = new URL(window.location.href);
      u.searchParams.delete('promo');
      window.history.replaceState({}, '', u.toString());
    } catch (e) { /* ignore */ }
  }

  function token() {
    if (!(window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn())) return null;
    var s = window.Auth.getSession && window.Auth.getSession();
    return (s && s.access_token) || null;
  }

  /**
   * Hỏi server mã tặng bao nhiêu Lượng.
   *
   * 🔑 Vì sao KHÔNG viết cứng "100 Lượng" lên giao diện: số Lượng nằm ở
   * `promo_codes.credits`, sửa được bằng một câu SQL không cần deploy. Chép
   * con số sang client là dựng bản thứ hai để rồi hứa sai — đúng lớp lỗi
   * `check:prices` sinh ra để chặn (đã có tiền lệ: trang nạp hứa "64 lá số"
   * khi mua được 16).
   */
  function info(code) {
    var c = norm(code);
    if (!CODE_RE.test(c)) return Promise.resolve({ found: false });
    return fetch('/api/payment?action=promo-info&code=' + encodeURIComponent(c))
      .then(function (r) { return r.json(); })
      .catch(function () { return { found: false }; });
  }

  var busy = false;

  function redeem(code) {
    var c = norm(code || sget(KEY) || '');
    if (!c) return Promise.resolve({ success: false, message: 'Chưa nhập mã.' });
    if (!CODE_RE.test(c)) return Promise.resolve({ success: false, message: 'Mã không hợp lệ.' });
    var t = token();
    if (!t) return Promise.resolve({ success: false, needLogin: true, message: 'Đăng nhập để đổi mã.' });
    if (busy) return Promise.resolve({ success: false, message: 'Đang xử lý…' });

    busy = true;
    return fetch('/api/payment?action=promo-redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify({ code: c }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        busy = false;
        d = d || {};
        // Xoá mã chờ khi server đã CHỐT xong lượt này — thành công, hoặc từ
        // chối vì một lý do thử lại cũng ra y hệt. Riêng lỗi hạ tầng (503) thì
        // GIỮ mã lại để lượt sau còn đổi được.
        var settled = d.success || (d.reason && d.reason !== 'invalid_input');
        if (settled) sdel(KEY);
        return d;
      })
      .catch(function (e) {
        busy = false;
        console.warn('[promo]', e);
        return { success: false, message: 'Lỗi mạng, thử lại giúp bạn.' };
      });
  }

  /**
   * Báo cho người dùng biết mã vừa ăn.
   *
   * 🔑 Cộng lén thì không ai biết mà cũng chẳng khuyến khích được ai — bài học
   * đã ghi ở nhiệm vụ onboarding (M3). Người xem clip gõ mã thì phải THẤY nó
   * ăn, nếu không họ tưởng gõ hụt và gõ lại (rồi nhận "đã dùng rồi").
   *
   * Keyframe khai NGAY TẠI ĐÂY chứ không mượn của file khác: `promo.js` nạp
   * được trên trang không có `auth.js`/`tuvi-paywall.js`, mà `animation:` trỏ
   * tới keyframe không tồn tại thì phần tử vẫn hiện — chỉ đứng im, không có gì
   * báo. Đúng lỗi `check:keyframes` sinh ra để bắt.
   */
  function banner(msg, good) {
    try {
      if (!document.getElementById('promo-fade-css')) {
        var st = document.createElement('style');
        st.id = 'promo-fade-css';
        st.textContent = '@keyframes promo-fade{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}';
        document.head.appendChild(st);
      }
      var old = document.getElementById('promo-banner');
      if (old) old.remove();
      var b = document.createElement('div');
      b.id = 'promo-banner';
      b.style.cssText =
        'position:fixed;top:70px;left:50%;transform:translateX(-50%);color:#fff;padding:14px 28px;' +
        'border-radius:10px;font-size:14px;font-weight:600;z-index:9999;max-width:92vw;text-align:center;' +
        'box-shadow:0 4px 20px rgba(0,0,0,.25);animation:promo-fade .3s ease;background:' +
        (good ? 'linear-gradient(135deg,#1E6B3C,#155d32)' : 'linear-gradient(135deg,#C0392B,#9c2d21)');
      b.textContent = msg;  // textContent: chuỗi tới từ server, không dựng HTML
      document.body.appendChild(b);
      setTimeout(function () { b.style.transition = 'opacity .6s'; b.style.opacity = '0'; }, 5000);
      setTimeout(function () { b.remove(); }, 5700);
      if (good) setTimeout(function () { window.refreshNavCredits && window.refreshNavCredits(); }, 800);
    } catch (e) { /* banner hỏng không được kéo theo việc đổi mã */ }
  }

  /** Tự đổi mã đang chờ, gọi sau khi đăng nhập/đăng ký xong. */
  function tryPending() {
    if (!sget(KEY) || !token()) return Promise.resolve(null);
    return redeem(null).then(function (d) {
      // Chỉ báo ca THÀNH CÔNG và ca "đã dùng rồi" — hai ca người dùng cần biết.
      // Mấy ca còn lại (mã sai/hết hạn) ở luồng TỰ ĐỘNG thì im lặng: người ta
      // không chủ động gõ mã lúc này, bật một banner đỏ là doạ người vô cớ.
      if (d && d.success) banner('🎉 ' + d.message, true);
      else if (d && d.reason === 'already_redeemed') banner(d.message, false);
      return d;
    });
  }

  window.Promo = {
    capture: capture,
    info: info,
    redeem: redeem,
    tryPending: tryPending,
    banner: banner,
    pendingCode: function () { return sget(KEY); },
    setPending: function (c) { if (CODE_RE.test(norm(c))) sset(KEY, norm(c)); },
    CODE_RE: CODE_RE,
  };

  capture();
  // Người đáp trang bằng link có `?promo=` mà đã đăng nhập sẵn thì đổi luôn.
  setTimeout(tryPending, 1500);
  if (window.Auth && window.Auth.onAuthChange) {
    window.Auth.onAuthChange(function (event) {
      if (event === 'SIGNED_IN') setTimeout(tryPending, 600);
    });
  }
})();
