// public/tools-shared/report-delivery.js
// ============================================================
// Thẻ "Báo cáo đã sẵn sàng" + luồng Tải PDF / Gửi email — MỘT nguồn hành vi
// dùng chung cho app-luan-giai.html (tool `laso`, 13 phần) và
// app-chu-trinh-cuoc-doi.html (tool `chu-trinh-cuoc-doi`, 11 phần), hai
// tool sinh nhiều phần cùng cần productize theo một khuôn (xem plan
// "Productize luận giải", 2026-09). CSS đứng ở shell.css (`.report-ready`).
//
// KHÔNG tự dựng HTML thẻ — mỗi trang khai TĨNH trong `<body>` (giữ CLS-safe,
// có mặt từ lần vẽ đầu, chỉ ẩn bằng `[hidden]`) rồi gọi `ReportDelivery.mount()`
// truyền đúng id các node đó. File này chỉ lo HÀNH VI: cập nhật trạng thái
// (đang dựng/đã xong), thu văn bản từ DOM, gọi API gửi email, và mở đúng cửa
// (đăng nhập / claim tài khoản ẩn danh) tuỳ trạng thái người dùng.
//
//   var rd = ReportDelivery.mount({
//     hostId: 'lgReportCard', titleId: 'lgReportTitle', subId: 'lgReportSub',
//     pdfBtnId: 'lgBtnPdf', pdfIconId: 'lgBtnPdfIcon', pdfLabelId: 'lgBtnPdfLabel',
//     mailBtnId: 'lgBtnEmail', mailLabelId: 'lgBtnEmailLabel',
//     tool: 'laso', total: TONG_PHAN,
//     getBoxId: function (p) { return 'claude-content-' + p; },
//     getLabel: function (p) { return (LuanGiaiCore.phanLabels(_astrolabe)||{})[p] || ('Phần '+p); },
//     getMeta: function () { return { hoTen: _hoTen, ngaySinh: [...].join('/'), gioiTinh: ... }; },
//   });
//   rd.tick(3, TONG_PHAN);   // đang dựng — 3/TONG_PHAN phần xong
//   rd.ready(TONG_PHAN);     // đủ phần — bật hai nút
// ============================================================
(function () {
  'use strict';

  var DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/></svg>';

  // Chuỗi hiển thị đi qua tools-shared/i18n.js (docs/luat/i18n.md). `fallback`
  // giữ đúng chuỗi tiếng Việt cũ phòng trang cache HTML chưa có script mới.
  function t(key, params, fallback) {
    var s = window.I18n && window.I18n.t ? window.I18n.t(key, params) : fallback;
    return s === key ? fallback : s; // I18n.t trả NGUYÊN khoá khi DICT chưa có
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // Loại tài khoản đang đăng nhập — quyết định câu "lần sau vào bằng gì":
  //   chat  = tài khoản tạo từ Zalo/Messenger/WhatsApp/Telegram (email bóng
  //           `<kênh>.<id>@chat.tuviminhbao.com`, KHÔNG có hộp thư — lib/channels/shadow-email.ts)
  //   anon  = phiên khách (guest checkout), mất khi xoá trình duyệt
  //   email = tài khoản email thật
  var CHAT_NAMES = { zalo: 'Zalo', messenger: 'Messenger', whatsapp: 'WhatsApp', telegram: 'Telegram' };
  function account() {
    var A = window.Auth;
    if (!A || !A.isLoggedIn || !A.isLoggedIn()) return { kind: 'none' };
    if (A.isAnonymous && A.isAnonymous()) return { kind: 'anon' };
    var email = String((A.getUser && A.getUser() && A.getUser().email) || '').toLowerCase();
    var m = email.match(/^([a-z0-9_-]+)\.[^@]*@chat\.tuviminhbao\.com$/);
    if (m) return { kind: 'chat', chatName: CHAT_NAMES[m[1].replace(/-.*$/, '')] || 'Zalo' };
    return { kind: 'email', email: email };
  }
  function authHeaders() {
    var s = window.Auth && window.Auth.getSession && window.Auth.getSession();
    var h = { 'Content-Type': 'application/json' };
    if (s && s.access_token) h.Authorization = 'Bearer ' + s.access_token;
    return h;
  }
  function postJson(url, body) {
    return fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        return { ok: res.ok && d.ok !== false, url: d.url, error: d.error };
      });
    });
  }

  function mount(opts) {
    var host = document.getElementById(opts.hostId);
    if (!host) return null;
    var titleEl   = document.getElementById(opts.titleId);
    var subEl     = document.getElementById(opts.subId);
    var pdfBtn    = document.getElementById(opts.pdfBtnId);
    var pdfIcon   = opts.pdfIconId && document.getElementById(opts.pdfIconId);
    var pdfLabel  = document.getElementById(opts.pdfLabelId);
    var mailBtn   = document.getElementById(opts.mailBtnId);
    var mailLabel = document.getElementById(opts.mailLabelId) || mailBtn;
    var sent = false;
    var shownTracked = false;

    function trackReady() {
      if (shownTracked) return;
      shownTracked = true;
      try { if (window.Track) window.Track.event('report_ready_shown', { tool_id: opts.tool }); } catch (e) { /* ignore */ }
    }

    // Báo trạng thái cho thanh "báo cáo" đầu khung chat (shell.js
    // `paintReportBar`) — một nguồn trạng thái cho cả thẻ trong trang lẫn rail.
    function emit(state, done, total) {
      try {
        window.dispatchEvent(new CustomEvent('tvmb:report', { detail: { tool: opts.tool, state: state, done: done, total: total } }));
      } catch (e) { /* trình duyệt quá cũ không có CustomEvent — thanh rail chỉ là trợ giúp */ }
    }

    function tick(done, total) {
      emit('building', done, total);
      host.hidden = false;
      host.classList.add('pending');
      if (titleEl) titleEl.textContent = t('report.building', null, 'Đang đóng bản báo cáo…');
      if (subEl) {
        subEl.textContent = t(
          'report.buildingSub',
          { done: done, total: total },
          done + ' / ' + total + ' phần đã xong'
        );
      }
    }

    // `o.announce` — CHỈ khi lượt này vừa luận xong thật (không phải mở lại
    // bản cũ): hiện popup "đã xong · lưu PDF · đã lưu vào tài khoản".
    function ready(total, o) {
      emit('ready', total, total);
      host.hidden = false;
      host.classList.remove('pending');
      if (titleEl) titleEl.textContent = t('report.readyTitle', null, '✦ Báo cáo của bạn đã sẵn sàng');
      if (subEl) {
        subEl.textContent = t(
          'report.readySub',
          { total: total },
          total + ' phần luận giải · tải PDF hoặc gửi vào email để giữ lại'
        );
      }
      if (pdfBtn) pdfBtn.disabled = false;
      if (pdfIcon) pdfIcon.innerHTML = DOWNLOAD_ICON;
      if (pdfLabel) pdfLabel.textContent = t('report.pdfLabel', null, 'Tải PDF');
      if (mailBtn && !sent) mailBtn.disabled = false;
      if (mailBtn && !sent && account().kind === 'chat') {
        mailLabel.textContent = t('report.chatLabel', { chat: account().chatName }, 'Gửi PDF vào ' + account().chatName);
      }
      trackReady();
      if (o && o.announce) announce(total);
    }

    // Nguồn PDF dựng ở server — cho trình duyệt nhúng (Zalo/FB…), nơi
    // `window.print()` không chạy (shell.js `inAppPdf`). Chỉ khi trang khai
    // `getSlug` (Luận Giải · Chu Trình — lib/pdf/paid-reports.ts). Chờ
    // `opts.saved()` (POST /api/save-laso đang bay) để server đọc được bản mới.
    function afterSave() {
      var p = opts.saved && opts.saved();
      return (p && p.then ? p : Promise.resolve()).catch(function () { /* lưu hỏng thì server tự báo thiếu */ });
    }
    function serverOpen() {
      return afterSave().then(function () { return postJson('/api/luan-giai/pdf', { slug: opts.getSlug() }); });
    }
    function serverToChat() {
      return afterSave().then(function () { return postJson('/api/channels/send-pdf', { slug: opts.getSlug() }); });
    }
    if (opts.getSlug && window.Shell && window.Shell.setServerPdf) {
      window.Shell.setServerPdf({
        open: serverOpen,
        get toChat() { return account().kind === 'chat' ? serverToChat : null; },
        get chatName() { return account().chatName; },
      });
    }

    // Popup "đã luận giải xong" — một lần cho mỗi bản (sessionStorage). Nói rõ
    // bản đã nằm trong tài khoản + LẦN SAU VÀO BẰNG GÌ, vì khách tới từ Zalo
    // đang dùng tài khoản bóng không có email/mật khẩu để nhớ.
    function announce(total) {
      var key = 'tvmb_done_' + opts.tool + '_' + ((opts.getSlug && opts.getSlug()) || location.search);
      try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (e) { /* chế độ riêng tư — vẫn hiện */ }
      var acc = account();
      var note = acc.kind === 'chat'
        ? 'Tài khoản này gắn với ' + acc.chatName + ' của bạn. Lần sau chỉ cần nhắn thầy qua ' + acc.chatName + ' là mở lại được; trên máy khác thì chọn Đăng nhập → “Đăng nhập bằng tin nhắn”.'
        : acc.kind === 'anon'
          ? 'Bạn đang dùng phiên khách — bản này chỉ nằm trên trình duyệt này. Lưu tài khoản (email + mật khẩu) để không mất và mở lại trên máy khác.'
          : acc.kind === 'email'
            ? 'Đăng nhập bằng ' + acc.email + ' trên bất kỳ máy nào để xem lại.'
            : '';
      var canShare = window.Shell && window.Shell.hasResult && window.Shell.hasResult();
      var wrap = document.createElement('div');
      wrap.className = 'sh-share-modal';
      wrap.innerHTML =
        '<div class="ssm-card" role="dialog" aria-modal="true">' +
          '<button class="ssm-x" aria-label="Đóng">✕</button>' +
          '<div class="ssm-t">' + esc(t('report.doneTitle', null, '✦ Luận giải đã hoàn tất')) + '</div>' +
          '<div class="ssm-d">' + esc(t('report.doneDesc', { total: total }, 'Bản báo cáo ' + total + ' phần đã được lưu vào tài khoản của bạn — xem lại bất cứ lúc nào ở mục Báo cáo.')) + '</div>' +
          (note ? '<div class="ssm-note">' + esc(note) + '</div>' : '') +
          '<div class="ssm-acts">' +
            (acc.kind === 'anon' && window.showClaimModal ? '<button type="button" class="ssm-act pri" data-a="claim">Lưu tài khoản</button>' : '') +
            '<button type="button" class="ssm-act' + (acc.kind === 'anon' ? '' : ' pri') + '" data-a="pdf">Lưu PDF</button>' +
            (canShare ? '<button type="button" class="ssm-act" data-a="share">Chia sẻ</button>' : '') +
            '<a class="ssm-act" href="/app/bao-cao" data-a="list">Xem ở mục Báo cáo</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(wrap);
      function onEsc(e) { if (e.key === 'Escape') close(); }
      function close() { document.removeEventListener('keydown', onEsc); wrap.remove(); }
      document.addEventListener('keydown', onEsc);
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      wrap.querySelector('.ssm-x').addEventListener('click', close);
      wrap.querySelectorAll('[data-a]').forEach(function (b) {
        b.addEventListener('click', function () {
          var a = b.getAttribute('data-a');
          try { if (window.Track) window.Track.event('report_done_action', { tool_id: opts.tool, meta: { action: a, account: acc.kind } }); } catch (e) { /* ignore */ }
          if (a === 'list') return; // để link tự điều hướng
          close();
          if (a === 'pdf') { if (window.Shell && window.Shell.printNow) window.Shell.printNow(); else window.print(); }
          else if (a === 'share') window.Shell.shareNow();
          else if (a === 'claim') window.showClaimModal({
            title: t('report.claimTitle', null, 'Nhận báo cáo qua email'),
            desc: t('report.claimDesc', null, 'Thêm email + mật khẩu để tụi mình gửi bản PDF báo cáo về hộp thư — đây cũng là tài khoản để bạn đăng nhập lại và xem lại báo cáo bất cứ lúc nào.'),
            submitLabel: t('report.claimSubmit', null, 'Nhận báo cáo →'),
            callback: runSend,
          });
        });
      });
      try { if (window.Track) window.Track.event('report_done_shown', { tool_id: opts.tool, meta: { account: acc.kind } }); } catch (e) { /* ignore */ }
    }

    // Nhặt lại đúng nội dung ĐÃ HIỂN THỊ trên trang — không gọi lại LLM,
    // không tính lại gì. Bỏ qua ô đang ẩn (`display:none`, phần lỗi/chưa mở).
    // `.ux-share-bar` (nút "Sao chép phần này" gắn thêm trong mỗi ô) bị loại
    // trước khi lấy `innerText` — cùng cách luan-giai.html (bản cũ) đã làm.
    function collectPhans() {
      var out = [];
      for (var p = 1; p <= opts.total; p++) {
        var box = document.getElementById(opts.getBoxId(p));
        if (!box || box.style.display === 'none') continue;
        var clone = box.cloneNode(true);
        var bars = clone.querySelectorAll('.ux-share-bar');
        for (var i = 0; i < bars.length; i++) bars[i].remove();
        var text = clone.innerText.trim();
        if (text) out.push({ title: opts.getLabel(p), text: text });
      }
      return out;
    }

    function doSend() {
      var token = window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn()
        ? window.Auth.getSession().access_token : null;
      if (!token) return Promise.reject(new Error('Chưa đăng nhập'));
      var phans = collectPhans();
      if (!phans.length) return Promise.reject(new Error('Chưa có nội dung để gửi'));
      var meta = opts.getMeta() || {};
      try { if (window.Track) window.Track.event('report_email_click', { tool_id: opts.tool }); } catch (e) { /* ignore */ }
      return fetch('/api/luan-giai/email-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          toolId: opts.tool,
          hoTen: meta.hoTen || '', ngaySinh: meta.ngaySinh || '', gioiTinh: meta.gioiTinh || '',
          phans: phans,
        }),
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          return { ok: res.ok && d.ok !== false, error: d.error };
        });
      });
    }

    function runSend() {
      var origLabel = mailLabel.textContent;
      mailBtn.disabled = true;
      mailLabel.textContent = t('report.sending', null, 'Đang gửi...');
      doSend().then(function (r) {
        if (r.ok) {
          sent = true;
          mailBtn.classList.add('sent');
          mailLabel.textContent = t('report.sent', null, '✓ Đã gửi email');
          try { if (window.Track) window.Track.event('report_email_sent', { tool_id: opts.tool }); } catch (e) { /* ignore */ }
        } else {
          mailBtn.disabled = false;
          mailLabel.textContent = origLabel;
          var errMsg = r.error || t('report.sendFailUnknown', null, 'lỗi không rõ');
          alert(t('report.sendFail', { error: errMsg }, 'Gửi email chưa thành công: ' + errMsg + '. Thử lại sau ít phút.'));
        }
      }).catch(function (e) {
        mailBtn.disabled = false;
        mailLabel.textContent = origLabel;
        alert(t('report.sendError', { error: e.message }, 'Gửi email lỗi: ' + e.message));
      });
    }

    // Ba nhánh theo trạng thái người dùng — CÙNG đích `runSend()`:
    //   chưa đăng nhập gì cả  → showAuthModal (hiếm gặp thật, paywall đã bắt
    //                           đăng nhập/ẩn danh từ trước khi tới đây)
    //   phiên ẨN DANH (guest checkout) → showClaimModal với copy "nhận báo
    //                           cáo" — claimAccount xong mới gửi, vì gửi cần
    //                           MỘT email thật để nhận, phiên ẩn danh không có
    //   đã có tài khoản thật  → gửi thẳng
    function runChatSend() {
      var origLabel = mailLabel.textContent;
      mailBtn.disabled = true;
      mailLabel.textContent = t('report.sending', null, 'Đang gửi...');
      serverToChat().then(function (r) {
        if (r.ok) {
          sent = true;
          mailBtn.classList.add('sent');
          mailLabel.textContent = '✓ Đã gửi vào ' + account().chatName;
        } else {
          mailBtn.disabled = false;
          mailLabel.textContent = origLabel;
          alert(r.error || 'Chưa gửi được, thử lại sau ít phút.');
        }
      }, function () {
        mailBtn.disabled = false;
        mailLabel.textContent = origLabel;
        alert('Lỗi mạng, thử lại sau ít phút.');
      });
    }

    function onMailClick() {
      if (sent) return;
      // Tài khoản từ kênh chat chỉ có email BÓNG (send.ts chặn gửi) — gửi
      // thẳng bản PDF vào Zalo/Messenger của họ thay vì hỏi email.
      if (opts.getSlug && account().kind === 'chat') { runChatSend(); return; }
      var isLoggedIn = !!(window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn());
      var isAnon = isLoggedIn && window.Auth.isAnonymous && window.Auth.isAnonymous();
      if (!isLoggedIn) {
        if (window.showAuthModal) window.showAuthModal(runSend);
        return;
      }
      if (isAnon) {
        if (window.showClaimModal) {
          window.showClaimModal({
            title: t('report.claimTitle', null, 'Nhận báo cáo qua email'),
            desc: t(
              'report.claimDesc',
              null,
              'Thêm email + mật khẩu để tụi mình gửi bản PDF báo cáo về hộp thư — đây cũng là tài khoản để bạn đăng nhập lại và xem lại báo cáo bất cứ lúc nào.'
            ),
            submitLabel: t('report.claimSubmit', null, 'Nhận báo cáo →'),
            callback: runSend,
          });
        }
        return;
      }
      runSend();
    }

    if (pdfBtn) pdfBtn.addEventListener('click', function () {
      try { if (window.Track) window.Track.event('pdf_download', { tool_id: opts.tool, meta: { from: 'report_ready' } }); } catch (e) { /* ignore */ }
      if (window.Shell && window.Shell.printNow) window.Shell.printNow();
      else window.print();
    });
    if (mailBtn) mailBtn.addEventListener('click', onMailClick);

    return { tick: tick, ready: ready };
  }

  window.ReportDelivery = { mount: mount };
})();
