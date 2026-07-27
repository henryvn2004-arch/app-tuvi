/* ============================================================
   invite-cta.js — "Mời bạn để có thêm lượt vẽ" (Viral Loop V2.3)

   Hiện NGAY SAU khi người dùng xem xong chân dung mà số dư KHÔNG còn đủ cho
   một lượt nữa. Đây là khoảnh khắc duy nhất trong cả vòng lặp mà người ta vừa
   thích thú vừa hụt hẫng cùng lúc — không có chỗ xin ở đây thì không ai mời.

   Ba luật về CÂU CHỮ (rút từ chính plan, đừng sửa nếu chưa đọc):
   1. Nói THẲNG con số: "mời 2 bạn = +30 Lượng = đủ thêm 1 lượt vẽ". Hứa lửng
      lơ kiểu "mời bạn để xem tiếp" là mất niềm tin ngay lần đầu.
   2. Mọi con số lấy từ SERVER (`my-referral`) chứ không viết cứng — thưởng/giá
      tool đều chỉnh được bằng SQL, viết cứng là sớm muộn cũng nói sai.
   3. Chạm trần lượt mời được thưởng thì NGỪNG hứa, nói thật là đã hết lượt
      trong tháng.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function token() {
    try {
      var s = window.Auth && window.Auth.getSession && window.Auth.getSession();
      return (s && s.access_token) || null;
    } catch (e) { return null; }
  }

  function track(type, props) {
    try { if (window.Track && window.Track.event) window.Track.event(type, props || {}); } catch (e) { /* ignore */ }
  }

  function css() {
    if (document.getElementById('_ivc_css')) return;
    var st = document.createElement('style');
    st.id = '_ivc_css';
    st.textContent =
      '.ivc{border:1px solid #C9A84C;background:linear-gradient(180deg,#FFFDF7,#F9F4EB);border-radius:12px;' +
        'padding:16px 18px;margin-top:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}' +
      '.ivc-t{font-family:"Noto Serif",Georgia,serif;font-size:15.5px;font-weight:700;color:#061A2E;margin-bottom:5px}' +
      '.ivc-d{font-size:13.5px;color:#4a4a4a;line-height:1.65;margin-bottom:12px}' +
      '.ivc-d b{color:#8a6d2f}' +
      '.ivc-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
      '.ivc-in{flex:1;min-width:180px;font-size:12.5px;padding:8px 10px;border:1px solid #E6E3DC;border-radius:7px;' +
        'background:#fff;color:#1a1a1a;font-family:ui-monospace,Menlo,monospace}' +
      '.ivc-b{border:none;cursor:pointer;font-weight:700;font-size:13px;padding:9px 15px;border-radius:7px;' +
        'background:#061A2E;color:#C9A84C;font-family:inherit}' +
      '.ivc-b.alt{background:#fff;color:#061A2E;border:1.5px solid #061A2E}' +
      '.ivc-p{margin-top:11px;padding-top:10px;border-top:1px dashed #E0DBCC;font-size:12px;color:#7a7a7a}' +
      '.ivc-p b{color:#061A2E}';
    document.head.appendChild(st);
  }

  /**
   * host    — phần tử sẽ chứa thẻ mời (thường là khu kết quả).
   * opts.toolId — tool vừa dùng, để dựng link mời trỏ thẳng vào chính nó.
   * opts.toolLabel — tên hiển thị ("lượt vẽ", "lượt xem"…), mặc định "lượt vẽ".
   *
   * KHÔNG hiện gì khi: chưa đăng nhập · không lấy được mã · vẫn còn đủ Lượng
   * cho một lượt nữa (chưa hụt thì chưa phải lúc xin).
   */
  async function mount(host, opts) {
    opts = opts || {};
    if (!host) return;
    var old = host.querySelector('.ivc'); if (old) old.remove();
    var tk = token(); if (!tk) return;

    var d;
    try {
      var r = await fetch('/api/payment?action=my-referral&tool=' + encodeURIComponent(opts.toolId || ''), {
        headers: { Authorization: 'Bearer ' + tk },
      });
      d = await r.json();
    } catch (e) { return; }
    if (!d || !d.code) return;

    var price = Number(d.toolPrice) || 0;
    var balance = Number(d.balance) || 0;
    var reward = Number(d.rewardPerInvite) || 0;
    var cap = Number(d.cap) || 0;
    var capLeft = Math.max(0, cap - (Number(d.rewardedRecent) || 0));
    var label = opts.toolLabel || 'lượt vẽ';

    // Còn đủ cho một lượt nữa → chưa hụt, chưa phải lúc xin.
    if (price > 0 && balance >= price) return;
    if (reward <= 0) return;

    var need = Math.max(0, price - balance);
    var invites = price > 0 ? Math.ceil(need / reward) : 1;

    var line;
    if (capLeft <= 0) {
      line = 'Bạn đã dùng hết lượt mời được thưởng trong 30 ngày qua. ' +
             'Nạp Lượng để dùng tiếp, hoặc quay lại tháng sau nhé.';
    } else if (price > 0 && invites <= capLeft) {
      line = 'Còn <b>' + balance + ' Lượng</b> — chưa đủ cho một ' + esc(label) + ' nữa (cần ' + price + ').<br>' +
             'Mời <b>' + invites + ' bạn</b> đăng ký → <b>+' + (invites * reward) + ' Lượng</b>, đủ thêm 1 ' + esc(label) + '.';
    } else if (price > 0) {
      line = 'Còn <b>' + balance + ' Lượng</b>. Mỗi bạn đăng ký qua link của bạn là <b>+' + reward + ' Lượng</b> ' +
             '(còn ' + capLeft + ' lượt mời được thưởng trong tháng này).';
    } else {
      line = 'Mỗi bạn đăng ký qua link của bạn là <b>+' + reward + ' Lượng</b> cho bạn.';
    }

    // Link mời trỏ thẳng vào CHÍNH tool vừa dùng, không phải trang chủ: người
    // được mời đáp xuống đúng thứ vừa khiến bạn mình khoe. referral.js ở trang
    // đích bắt ?ref= (cùng đường với link chia sẻ /ket-qua).
    var base = window.location.origin + (opts.toolId ? '/app/' + opts.toolId : '/');
    var url = base + '?ref=' + encodeURIComponent(d.code) +
      '&utm_source=invite&utm_medium=referral&utm_campaign=' + encodeURIComponent(opts.toolId || 'invite');

    css();
    var box = document.createElement('div');
    box.className = 'ivc';
    box.innerHTML =
      '<div class="ivc-t">✦ Mời bạn — nhận thêm Lượng</div>' +
      '<div class="ivc-d">' + line + '</div>' +
      '<div class="ivc-row">' +
        '<input class="ivc-in" readonly value="' + esc(url) + '">' +
        '<button class="ivc-b" type="button" data-act="copy">Sao chép link</button>' +
        '<button class="ivc-b alt" type="button" data-act="share">Chia sẻ</button>' +
      '</div>' +
      '<div class="ivc-p">Đã mời <b>' + (d.invited || 0) + '</b>' + (cap ? '/' + cap : '') +
        ' bạn · đã nhận <b>' + (d.creditsEarned || 0) + '</b> Lượng</div>';
    host.appendChild(box);

    var inp = box.querySelector('.ivc-in');
    box.querySelector('[data-act="copy"]').addEventListener('click', function (e) {
      var b = e.currentTarget;
      inp.select();
      var done = function () { b.textContent = 'Đã chép ✓'; setTimeout(function () { b.textContent = 'Sao chép link'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { try { document.execCommand('copy'); done(); } catch (e2) { /* ignore */ } });
      else { try { document.execCommand('copy'); done(); } catch (e2) { /* ignore */ } }
      track('cta_click', { tool_id: opts.toolId || null, meta: { from: 'invite', action: 'copy' } });
    });
    box.querySelector('[data-act="share"]').addEventListener('click', function () {
      track('cta_click', { tool_id: opts.toolId || null, meta: { from: 'invite', action: 'share' } });
      var payload = { title: 'Tử Vi Minh Bảo', text: 'Thử cái này xem, hay phết:', url: url };
      try {
        if (navigator.share) { var p = navigator.share(payload); if (p && p.catch) p.catch(function () {}); return; }
      } catch (e) { /* rơi xuống mở Facebook */ }
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener');
    });
  }

  window.InviteCta = { mount: mount };
})();
