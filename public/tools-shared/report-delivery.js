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
    return window.I18n && window.I18n.t ? window.I18n.t(key, params) : fallback;
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

    function tick(done, total) {
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

    function ready(total) {
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
      trackReady();
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
    function onMailClick() {
      if (sent) return;
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
