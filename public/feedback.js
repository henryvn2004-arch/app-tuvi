/* ============================================================
   feedback.js — nút 👍/👎 gắn NGAY dưới một bản luận giải
   ============================================================
   Vì sao có, khi ĐÃ có hộp thư trong Tài khoản: hai thứ thu hai loại tín hiệu
   khác hẳn. Hộp thư nhận "app hay lắm" / "sao đắt thế" — đọc thì vui, sửa thì
   không biết sửa đâu. Cái nút đặt ngay cuối bản luận giải nói được BẢN NÀO dở,
   vì nó TỰ mang theo tool_id + đúng URL của bản đó. Người dùng không phải mô
   tả gì, và đó là lý do nó thu được gấp nhiều lần.

   CÁCH DÙNG — KHÔNG phải sửa trang nào cả. `shell.js` nạp file này (chỉ khi
   đã đăng nhập), widget tự tìm vùng kết quả rồi tự chèn ngay dưới nó.

   Vùng kết quả tìm theo ĐÚNG giao ước sẵn có của shell — `[data-ws-result]`,
   lùi về `#resPanel` / `#resultCard` — tức CÙNG một khối mà nút "Chia sẻ" đã
   bám (`wsResultHost()` trong shell.js). Cố ý không tự chế bản đồ 36 trang:
   bản đồ chép tay là thứ trôi lệch ngay lượt sau, còn giao ước này đã có
   `npm run check:share` canh cho trang shell mới khỏi quên khai.

   Tuỳ chọn, khi cần đặt vào chỗ khác:
     <script src="/feedback.js?v=1" data-tvfb-watch="lgBody"></script>
     <div data-tvfb data-tvfb-watch="lgBody"></div>
   `data-tvfb`  (tuỳ chọn) tool_id. Bỏ trống ⇒ lấy TuviPaywall.getProduct() —
                CÙNG nguồn mà paywall vừa trừ Lượng, nên không thể lệch giữa
                "trừ Lượng của tool A" và "chê tool B".

   Widget TỰ ẩn cho tới khi khối được canh thật sự có một bản luận giải. Vì
   sao không gắn thẳng vào hàm render của từng trang: có 36 trang có tường trả
   phí, mỗi trang một tên khối (`lgBody` · `resPanel` · `aiResult` ·
   `results-section`…) và một luồng render riêng. Sửa 36 chỗ là 36 dịp làm sai;
   canh nội dung thì chỉ một chỗ để sai, và chỗ đó kiểm được bằng trình duyệt.

   🪤 Dùng `innerText` (KHÔNG phải `textContent`) có chủ ý: `innerText` trả ''
   cho phần tử đang `display:none`, nên khối kết quả còn ẩn thì widget cũng ẩn
   theo — miễn phí, không phải tự dò khả kiến.

   Icon: hai dấu 👍/👎 vẽ inline ngay tại đây, KHÔNG đi qua bộ icon của nav.js.
   Lý do: nav.js chưa có `thumbs-*`, mà thêm vào đó thì theo luật phải bump
   `nav.js?v=` trên 89 file — một diff cơ học khổng lồ chỉ để lấy hai hình.
   Đây vẫn là MỘT nguồn: mọi trang dùng chung đúng file này.
   ============================================================ */
(function () {
  'use strict';

  var MIN_CHARS = 200;   // CHỈ dùng cho đường lùi khi không có shell — xem hasReading()
  var DEBOUNCE = 400;
  var _cssDone = false;

  var IC_UP =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"/></svg>';
  var IC_DOWN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"/></svg>';

  function css() {
    if (_cssDone) return;
    _cssDone = true;
    var s = document.createElement('style');
    // Bám token của shell.css (mọi trang app-* đều nạp) nên tự đúng cả light
    // lẫn dark; vẫn kèm giá trị lùi phòng khi được nhúng ở trang khác.
    s.textContent = [
      '.tvfb{margin:1.5rem 0 .5rem;padding:1rem 1.15rem;border:1px solid var(--line,#E6E3DC);',
      'border-radius:8px;background:var(--paper-2,#F4F2EC);font-size:.88rem;color:var(--text,#1a1a1a)}',
      '.tvfb[hidden]{display:none}',
      '.tvfb-q{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}',
      '.tvfb-q b{font-weight:600;color:var(--heading,#061A2E)}',
      '.tvfb-btns{display:flex;gap:.5rem;margin-left:auto}',
      '.tvfb-b{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .9rem;border-radius:999px;',
      'border:1px solid var(--line-2,#D8D4CB);background:var(--white,#fff);color:var(--text-mid,#4a4a4a);',
      'font:inherit;font-size:.84rem;font-weight:600;cursor:pointer;transition:all .15s}',
      '.tvfb-b:hover{border-color:var(--gold-soft,#9A7B3A);color:var(--heading,#061A2E)}',
      '.tvfb-b:disabled{opacity:.55;cursor:default}',
      '.tvfb-b svg{width:15px;height:15px}',
      '.tvfb-b.on[data-v="up"]{border-color:var(--tx-green,#1E6B3C);color:var(--tx-green,#1E6B3C)}',
      '.tvfb-b.on[data-v="down"]{border-color:var(--tx-red,#C0392B);color:var(--tx-red,#C0392B)}',
      '.tvfb-more{margin-top:.85rem}',
      '.tvfb-more[hidden]{display:none}',
      '.tvfb-more textarea{width:100%;padding:.6rem .75rem;border:1px solid var(--line-2,#D8D4CB);',
      'border-radius:6px;background:var(--white,#fff);color:var(--text,#1a1a1a);font:inherit;',
      'font-size:.86rem;line-height:1.6;resize:vertical}',
      '.tvfb-more textarea:focus{outline:2px solid var(--gold-soft,#9A7B3A);border-color:var(--gold-soft,#9A7B3A)}',
      '.tvfb-row{display:flex;align-items:center;gap:.6rem;margin-top:.5rem}',
      '.tvfb-send{padding:.45rem 1.1rem;border:none;border-radius:6px;background:var(--navy,#061A2E);',
      'color:#fff;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer}',
      '.tvfb-send:disabled{opacity:.55;cursor:default}',
      '.tvfb-skip{background:none;border:none;color:var(--text-lt,#7a7a7a);font:inherit;font-size:.8rem;cursor:pointer;text-decoration:underline}',
      '.tvfb-note{font-size:.8rem;color:var(--text-lt,#7a7a7a);line-height:1.6}',
      '@media(max-width:560px){.tvfb-btns{margin-left:0;width:100%}.tvfb-b{flex:1;justify-content:center}}',
    ].join('');
    document.head.appendChild(s);
  }

  function loggedIn() {
    try { return !!(window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn()); }
    catch (e) { return false; }
  }

  async function token() {
    try {
      if (window.Auth && window.Auth.getFreshToken) return (await window.Auth.getFreshToken()) || null;
      return (window.Auth && window.Auth.getSession && window.Auth.getSession().access_token) || null;
    } catch (e) { return null; }
  }

  /** URL định danh bản luận giải. Bỏ hash và tham số theo dõi: cùng một bản
   *  đến từ link quảng cáo phải tính là MỘT, nếu không mốc một-người-một-phiếu
   *  vỡ và bảng xếp hạng đếm trùng. */
  function pageKey() {
    try {
      var u = new URL(window.location.href);
      u.hash = '';
      Array.prototype.slice.call(u.searchParams.keys()).forEach(function (k) {
        if (/^utm_/i.test(k) || /^(fbclid|gclid|ref|from)$/i.test(k)) u.searchParams.delete(k);
      });
      return u.toString();
    } catch (e) { return window.location.href; }
  }

  function toolIdFor(anchor) {
    var v = (anchor.getAttribute('data-tvfb') || '').trim();
    if (v) return v;
    try { if (window.TuviPaywall && window.TuviPaywall.getProduct) return window.TuviPaywall.getProduct(); }
    catch (e) { /* paywall chưa init trên trang này */ }
    return null;
  }

  /** Vùng kết quả của workspace — GIỮ ĐỒNG BỘ với `wsResultHost()` trong
   *  shell.js. Cùng một khối mà nút Chia sẻ đã bám, nên trang nào chia sẻ
   *  được thì trang đó góp ý được, không cần khai thêm gì. */
  function wsResultHost() {
    return document.querySelector('[data-ws-result]')
      || document.getElementById('resPanel')
      || document.getElementById('resultCard');
  }

  /** Khối cần canh. Nhận danh sách id/selector cách nhau dấu phẩy, lấy cái
   *  ĐẦU TIÊN có thật; rỗng thì rơi về vùng kết quả theo giao ước shell. */
  function resolveWatch(sel) {
    var parts = String(sel || '').split(',');
    for (var i = 0; i < parts.length; i++) {
      var one = parts[i].trim();
      if (!one) continue;
      var el = document.getElementById(one) || document.querySelector(one);
      if (el) return el;
    }
    return wsResultHost();
  }

  function watchedNode(anchor) {
    return resolveWatch((anchor.getAttribute('data-tvfb-watch') || '').trim());
  }

  /**
   * Vùng kết quả đã có một bản luận giải THẬT chưa.
   *
   * Nguồn CHÍNH là `Shell.hasResult()` — cùng ngưỡng nút Chia sẻ / Lưu PDF đã
   * dùng, tức `domShareText()` đã bỏ nút, ô nhập, thẻ giới thiệu, tường trả
   * phí và mọi thứ đang ẩn.
   *
   * 🪤 Bản đầu của hàm này đếm `innerText` TRẦN và đo được là hỏng ở 18/36
   * trang: widget hiện NGAY KHI TẢI, mời người ta chấm điểm một bản luận giải
   * chưa hề tồn tại. Nguyên nhân: `innerText` đếm luôn chữ trên nút và trong
   * thẻ giới thiệu, mà nhiều trang để khung kết quả HIỆN SẴN (`#resPanel`
   * không có `display:none`). Ngưỡng ký tự không cứu được — vấn đề là đếm
   * NHẦM THỨ, không phải đếm sai mức.
   *
   * Đường lùi `innerText` chỉ dùng khi KHÔNG có shell (feedback.js nạp ngoài
   * trang shell). Giữ nguyên bẫy cũ ở đó là chấp nhận được: đường đó hiện
   * không có người dùng, và thà hiện thừa còn hơn câm hẳn nếu sau này có.
   */
  function hasReading(node) {
    try {
      if (window.Shell && typeof window.Shell.hasResult === 'function') return !!window.Shell.hasResult();
    } catch (e) { console.error('[tvfb] Shell.hasResult', e); }
    if (!node) return false;
    try { return (node.innerText || '').trim().length >= MIN_CHARS; }
    catch (e) { return false; }
  }

  function build(anchor, state) {
    css();
    anchor.classList.add('tvfb');
    anchor.hidden = true;
    anchor.innerHTML =
      '<div class="tvfb-q">' +
        '<b>Bản luận giải này có đúng với bạn không?</b>' +
        '<span class="tvfb-btns">' +
          '<button type="button" class="tvfb-b" data-v="up">' + IC_UP + 'Đúng</button>' +
          '<button type="button" class="tvfb-b" data-v="down">' + IC_DOWN + 'Chưa đúng</button>' +
        '</span>' +
      '</div>' +
      '<div class="tvfb-more" hidden>' +
        '<textarea rows="3" maxlength="2000"></textarea>' +
        '<div class="tvfb-row">' +
          '<button type="button" class="tvfb-send">Gửi</button>' +
          '<button type="button" class="tvfb-skip">Bỏ qua</button>' +
          '<span class="tvfb-note"></span>' +
        '</div>' +
      '</div>';

    var more = anchor.querySelector('.tvfb-more');
    var ta = anchor.querySelector('textarea');
    var note = anchor.querySelector('.tvfb-note');

    anchor.querySelectorAll('.tvfb-b').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-v');
        anchor.querySelectorAll('.tvfb-b').forEach(function (b) { b.classList.toggle('on', b === btn); });
        state.rating = v;
        // GỬI NGAY lá phiếu, không đợi người ta gõ gì. Phần lớn sẽ không gõ —
        // đợi là mất chính cái tín hiệu đông nhất. Ô chữ bên dưới, nếu có
        // dùng, sẽ GHI ĐÈ đúng dòng đó (route lo phần một-người-một-phiếu).
        send(state, '', note);
        ta.placeholder = v === 'down'
          ? 'Chỗ nào chưa đúng? (không bắt buộc — nhưng một câu thôi cũng giúp chúng tôi sửa)'
          : 'Điều gì đúng nhất với bạn? (không bắt buộc)';
        more.hidden = false;
        ta.focus();
      });
    });

    anchor.querySelector('.tvfb-send').addEventListener('click', function () {
      send(state, ta.value, note, more);
    });
    anchor.querySelector('.tvfb-skip').addEventListener('click', function () {
      more.hidden = true;
      note.textContent = 'Đã ghi nhận — cảm ơn bạn.';
    });
  }

  async function send(state, message, note, more) {
    var body = {
      kind: 'noi_dung',
      source: 'reading',
      rating: state.rating,
      tool_id: state.toolId,
      page_url: state.pageUrl,
      message: (message || '').trim(),
      meta: state.meta,
    };
    if (note) note.textContent = 'Đang gửi…';
    try {
      var res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()) },
        body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        if (note) note.textContent = data.error || 'Không gửi được — xin thử lại.';
        return;
      }
      if (note) note.textContent = body.message ? 'Đã gửi — cảm ơn bạn.' : 'Đã ghi nhận.';
      if (more && body.message) more.hidden = true;
    } catch (e) {
      console.error('[tvfb] gửi hỏng', e);
      if (note) note.textContent = 'Lỗi mạng — xin thử lại.';
    }
  }

  function wire(anchor) {
    if (anchor.dataset.tvfbReady) return;
    anchor.dataset.tvfbReady = '1';

    var state = { rating: null, toolId: null, pageUrl: pageKey(), meta: {} };
    try {
      state.meta.screen = window.innerWidth + 'x' + window.innerHeight;
      state.meta.theme = document.documentElement.getAttribute('data-theme') || 'light';
    } catch (e) { console.error('[tvfb] meta', e); }

    build(anchor, state);

    var node = watchedNode(anchor);
    var t = null;
    function recheck() {
      // Chỉ hiện cho người ĐÃ đăng nhập: gần như mọi bản luận giải đều nằm sau
      // tường trả phí nên họ đã đăng nhập sẵn, còn hiện nút cho khách vãng lai
      // là mời họ bấm để ăn 401.
      state.toolId = state.toolId || toolIdFor(anchor);
      anchor.hidden = !(loggedIn() && hasReading(node));
    }
    function schedule() { clearTimeout(t); t = setTimeout(recheck, DEBOUNCE); }

    if (node && window.MutationObserver) {
      new MutationObserver(schedule).observe(node, { childList: true, subtree: true, characterData: true });
    }
    recheck();
    // auth.js khôi phục phiên không đồng bộ với lượt vẽ đầu, và vài trang dựng
    // sẵn kết quả từ cache trước khi script này chạy. Soát thêm vài nhịp —
    // cùng lối `TuviPaywall.init` đã dùng cho gợi ý giá.
    [800, 1800, 4000].forEach(function (ms) { setTimeout(recheck, ms); });
  }

  /** Dựng neo từ thẻ <script src="/feedback.js" data-tvfb-watch="..."> —
   *  đặt ngay SAU khối được canh, để widget nằm đúng dưới bản luận giải. */
  function autoAnchor() {
    var tag = document.querySelector('script[src*="feedback.js"]');
    if (!tag || tag.dataset.tvfbAnchored) return;
    var node = resolveWatch(tag.getAttribute('data-tvfb-watch'));
    // Khối chưa có trong DOM lúc này (trang dựng muộn) → thử lại vài nhịp thay
    // vì bỏ luôn. Không đánh dấu `tvfbAnchored` để lượt sau còn vào được.
    if (!node || !node.parentNode) return;
    tag.dataset.tvfbAnchored = '1';
    var div = document.createElement('div');
    div.setAttribute('data-tvfb', tag.getAttribute('data-tvfb') || '');
    div.setAttribute('data-tvfb-watch', tag.getAttribute('data-tvfb-watch') || '');
    node.parentNode.insertBefore(div, node.nextSibling);
  }

  function init() {
    autoAnchor();
    document.querySelectorAll('[data-tvfb]').forEach(wire);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // Khối kết quả của vài trang chỉ được dựng sau khi script của trang chạy
  // xong. Soát lại vài nhịp — rẻ, và bỏ đi thì đúng những trang đó mất widget.
  [800, 2000, 5000].forEach(function (ms) { setTimeout(init, ms); });

  window.TuviFeedback = { init: init, mount: wire };
})();
