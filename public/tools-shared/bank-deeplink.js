/* tools-shared/bank-deeplink.js — Module DÙNG CHUNG cho khối "mở app ngân
   hàng" bên dưới QR chuyển khoản. Dùng ở CẢ `topup.html` (điều hướng sang
   trang riêng) LẪN `tuvi-paywall.js` (popup QR tại chỗ trên trang tool,
   PR #760) — một nguồn, sửa 1 chỗ 2 nơi cập nhật, tránh lặp lại bug từng vá
   ở nơi này mà quên nơi kia.

   🔑 VietQR TỰ NHẬN deep link `dl.vietqr.io/pay` HIỆN CHƯA điền được số
   TK/số tiền/nội dung vào app ngân hàng (tài liệu chính thức, mục "Deeplink
   App ngân hàng" — trích: "hiện tại sẽ chưa thể tự động điền các thông tin
   người nhận tiền và số tiền"). Đã đo thật trên máy: bấm vào app KHÔNG có gì
   được điền sẵn, kể cả 5 app JSON báo cờ `autofill:1`. Vì vậy nút ở đây COPY
   SẴN SỐ TÀI KHOẢN vào clipboard ngay khi bấm, trước khi mở app — khách dán
   thay vì phải nhớ/gõ tay số TK dài, ngẫu nhiên, mỗi đơn một số khác nhau.

   🔑 KHÔNG copy nội dung CK: `app/api/bank-webhook/route.ts` + RPC
   `bank_settle_topup` chốt đơn CHỈ bằng `orderCode` (PayOS tự khớp qua SỐ TÀI
   KHOẢN ẢO — mỗi đơn một số riêng, KHÔNG dùng chung) và số tiền — không đọc
   nội dung CK ở đâu cả. Nội dung CK mặc định của app ngân hàng vẫn chốt được
   bình thường, nên số TK (định tuyến tiền đúng đơn) mới là thứ BẮT BUỘC đúng,
   không phải nội dung. Đừng quảng cáo là "tự điền", chỉ là "mở app + đã copy
   số TK để dán".

   🔑 ĐƯỜNG TỰ ĐIỀN ĐỦ 100% DUY NHẤT trên CÙNG một điện thoại là chính MÃ QR:
   mọi app ngân hàng VN đều có "Quét QR → chọn ẢNH từ thư viện", và QR VietQR
   mang sẵn số TK + số tiền + nội dung. Nên nút ĐẦU TIÊN ở đây là "Lưu ảnh QR"
   (iOS/Android: share sheet → "Lưu hình ảnh" vào Ảnh; máy không có Web Share
   file thì tải PNG về) — khách mở app → Quét QR → chọn ảnh, không gõ gì cả.
   Ảnh vẽ tại máy từ chuỗi `qrCode` payOS trả về (đúng chuỗi cổng thanh toán
   phát ra, không tự dựng lại), bằng bộ mã QR của `poster.js` (nạp lười, không
   chép bộ mã sang đây). Dựng blob TRƯỚC khi khách bấm: `navigator.share` đòi
   cú bấm còn "nóng" — chờ tải script/vẽ canvas SAU cú bấm là iOS từ chối.

   API: window.BankDeepLink.render(container, d, memo)
     - container: một <div> rỗng, module tự vẽ nhãn + hàng nút vào bên trong
       và tự ẩn/hiện (`container.hidden`) — trang gọi không cần dựng markup con.
     - d: { bankCode, accountNumber, accountName, amountVND, qrCode? } (từ
       response `action=create-bank`; thiếu `qrCode` thì chỉ ẩn nút lưu ảnh).
     - memo: nội dung CK hiển thị cho khách (PHẢI là chuỗi server đã khai với
       payOS — không tự dựng lại, cùng luật đã ghi ở nơi gọi). */
(function (root) {
  // 🪤 UA giả: iPadOS Safari mặc định vờ là Mac, "Request Desktop Site" trên
  // Android Chrome bỏ luôn chữ "Android" khỏi UA — cả hai vẫn là máy chạm
  // thật. Dò thêm `pointer: coarse` (ngón tay, không phải chuột) để không ăn
  // theo UA giả và ẩn oan khối này trên điện thoại thật.
  function isLikelyPhone() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
  }

  // Danh sách app phổ biến nhất (xếp theo lượt tải hàng tháng, nguồn
  // api.vietqr.io/v2/android-app-deeplinks). `app` là mã app VietQR dùng để
  // dựng deep link — KHÁC bảng tên hiển thị ngân hàng nhận tiền.
  var BANK_APPS = [
    { app: 'mb',   name: 'MB Bank',     logo: 'MB' },
    { app: 'vcb',  name: 'Vietcombank', logo: 'VCB' },
    { app: 'vba',  name: 'Agribank',    logo: 'VBA' },
    { app: 'icb',  name: 'VietinBank',  logo: 'ICB' },
    { app: 'bidv', name: 'BIDV',        logo: 'BIDV' },
    { app: 'tcb',  name: 'Techcombank', logo: 'TCB' },
    { app: 'vpb',  name: 'VPBank',      logo: 'VPB' },
    { app: 'acb',  name: 'ACB',         logo: 'ACB' },
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    } catch (e) { /* ignore — bấm vẫn mở app, chỉ mất phần copy */ }
    return Promise.reject(new Error('no clipboard'));
  }

  function injectStyleOnce() {
    if (document.getElementById('bdl-style')) return;
    var style = document.createElement('style');
    style.id = 'bdl-style';
    style.textContent =
      '.bdl-wrap{margin-bottom:14px}' +
      '.bdl-label{font-size:.72rem;color:#888;margin-bottom:7px;text-align:left}' +
      '.bdl-row{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}' +
      '.bdl-app-btn{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:4px;' +
        'width:56px;text-decoration:none;color:#555;font-size:.66rem;line-height:1.2}' +
      '.bdl-app-btn img{width:36px;height:36px;border-radius:9px;object-fit:cover;border:1px solid #ccc}' +
      '.bdl-save{display:block;width:100%;margin-bottom:6px;padding:11px 12px;border:0;border-radius:10px;' +
        'background:#1455A4;color:#fff;font-size:.88rem;font-weight:600;cursor:pointer}' +
      '.bdl-save[disabled]{opacity:.55;cursor:default}' +
      '.bdl-save-hint{font-size:.72rem;color:#555;line-height:1.45;margin-bottom:12px;text-align:left}';
    document.head.appendChild(style);
  }

  // Bộ mã QR nằm ở `poster.js` (đã đối chiếu byte-for-byte với gói `qrcode`) —
  // nạp lười 1 lần, trang nào đã có sẵn `window.Poster` thì dùng luôn.
  var _posterLoading = null;
  function loadPoster() {
    if (root.Poster && root.Poster.qrMatrix) return Promise.resolve();
    if (_posterLoading) return _posterLoading;
    _posterLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = '/poster.js?v=5';
      s.onload = function () {
        if (root.Poster && root.Poster.qrMatrix) return resolve();
        _posterLoading = null; reject(new Error('poster.js không có qrMatrix'));
      };
      s.onerror = function () { _posterLoading = null; reject(new Error('poster.js')); };
      document.head.appendChild(s);
    });
    return _posterLoading;
  }

  // Ảnh QR nền trắng + số tiền/số TK in to bên dưới để khách nhận ra đúng ảnh
  // trong thư viện. Vùng lặng 4 module — thiếu là nhiều app không bắt mã.
  function buildQrBlob(d, memo) {
    return loadPoster().then(function () {
      var q = root.Poster.qrMatrix(d.qrCode);
      if (!q) throw new Error('qr too long');
      var W = 720, total = q.size + 8, cell = Math.floor(600 / total), draw = cell * total;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = draw + 300;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#000000';
      var ox = Math.round((W - draw) / 2) + 4 * cell, oy = 60 + 4 * cell;
      for (var r = 0; r < q.size; r++)
        for (var c = 0; c < q.size; c++)
          if (q.modules[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1455A4';
      ctx.font = '600 30px system-ui, -apple-system, Roboto, sans-serif';
      ctx.fillText('tuviminhbao.com — Chuyển khoản', W / 2, 42);
      var y = 60 + draw + 56;
      ctx.fillStyle = '#111111';
      ctx.font = '700 44px system-ui, -apple-system, Roboto, sans-serif';
      ctx.fillText(new Intl.NumberFormat('vi-VN').format(d.amountVND) + ' đ', W / 2, y);
      ctx.font = '400 26px system-ui, -apple-system, Roboto, sans-serif';
      ctx.fillStyle = '#444444';
      ctx.fillText('Số TK ' + d.accountNumber + (d.accountName ? ' · ' + d.accountName : ''), W / 2, y + 48, W - 40);
      ctx.fillText('Nội dung: ' + memo, W / 2, y + 88, W - 40);
      ctx.fillText('Mở app ngân hàng → Quét QR → chọn ảnh này', W / 2, y + 128, W - 40);
      return new Promise(function (resolve, reject) {
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('toBlob')); }, 'image/png');
      });
    });
  }

  function saveQr(blob, filename) {
    var file = null;
    try { file = new File([blob], filename, { type: 'image/png' }); } catch (e) { /* Safari cũ không có File() */ }
    // Share sheet: iOS có "Lưu hình ảnh" (vào Ảnh — nơi app ngân hàng đọc), còn
    // tải thẳng trên iOS chỉ vào app Tệp, app ngân hàng không thấy.
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file] }).catch(function (e) {
        if (e && e.name === 'AbortError') throw e; // khách tự đóng share sheet
        root.Poster.saveBlob(blob, filename);
      });
    }
    root.Poster.saveBlob(blob, filename);
    return Promise.resolve();
  }

  function fireClick(container, bank) {
    try { container.dispatchEvent(new CustomEvent('bdl:click', { detail: { bank: bank } })); } catch (e) { /* CustomEvent hiếm khi thiếu, fail-open */ }
  }

  function render(container, d, memo) {
    if (!container) return;
    if (!isLikelyPhone() || !d || !d.bankCode || !d.accountNumber) {
      container.hidden = true; container.innerHTML = ''; return;
    }
    injectStyleOnce();
    container.classList.add('bdl-wrap');
    var ba = encodeURIComponent(d.accountNumber) + '@' + d.bankCode;
    var seq = (container._bdlSeq || 0) + 1;
    container._bdlSeq = seq;
    container.innerHTML =
      (d.qrCode
        ? '<button type="button" class="bdl-save" disabled>Đang chuẩn bị ảnh QR…</button>' +
          '<div class="bdl-save-hint">Lưu ảnh QR → mở app ngân hàng → <b>Quét QR</b> → chọn <b>ảnh</b> vừa lưu. ' +
            'Số TK, số tiền, nội dung tự điền sẵn — chỉ cần xác nhận.</div>'
        : '') +
      '<div class="bdl-label">Hoặc mở app ngân hàng (đã copy sẵn số TK, dán vào app):</div>' +
      '<div class="bdl-row">' + BANK_APPS.map(function (b) {
        var href = 'https://dl.vietqr.io/pay?app=' + b.app + '&ba=' + ba
          + '&am=' + encodeURIComponent(d.amountVND) + '&tn=' + encodeURIComponent(memo)
          + '&bn=' + encodeURIComponent(d.accountName || '');
        return '<a class="bdl-app-btn" href="' + esc(href) + '" target="_blank" rel="noopener" data-copy="' + esc(d.accountNumber) + '" data-bank="' + esc(b.app) + '">'
          + '<img src="https://cdn.vietqr.io/img/' + b.logo + '.png" alt="' + esc(b.name) + '" loading="lazy">'
          + '<span>' + esc(b.name) + '</span></a>';
      }).join('') + '</div>';
    Array.prototype.forEach.call(container.querySelectorAll('.bdl-app-btn'), function (a) {
      a.addEventListener('click', function () {
        var label = a.querySelector('span');
        var original = label.textContent;
        copyToClipboard(a.getAttribute('data-copy')).then(function () {
          label.textContent = 'Đã copy Số TK';
          setTimeout(function () { label.textContent = original; }, 1500);
        }).catch(function () {});
        // Pha 0 (vá phễu 2026-09) — báo cho nơi GỌI `render()` biết vừa có
        // click, KHÔNG tự gọi Track ở đây: module này dùng chung cho
        // topup.html lẫn tuvi-paywall.js, không có `tool_id`/product riêng
        // để gắn vào event. Nơi gọi tự nghe sự kiện này trên chính
        // `container` nếu muốn đo — bắn trước khi điều hướng (thẻ <a> vẫn
        // chạy tiếp bình thường, không `preventDefault`).
        fireClick(container, a.getAttribute('data-bank'));
      });
    });
    var saveBtn = container.querySelector('.bdl-save');
    if (saveBtn) {
      var filename = 'QR-chuyen-khoan-' + (memo || 'tuviminhbao') + '.png';
      buildQrBlob(d, memo).then(function (blob) {
        if (container._bdlSeq !== seq) return; // đã mở QR đơn khác
        saveBtn.disabled = false;
        saveBtn.textContent = 'Lưu ảnh QR để quét trong app ngân hàng';
        saveBtn.addEventListener('click', function () {
          fireClick(container, 'save-qr');
          saveQr(blob, filename).then(function () {
            saveBtn.textContent = '✓ Đã lưu — mở app ngân hàng → Quét QR → chọn ảnh';
          }).catch(function () {});
        });
      }).catch(function (e) {
        // Không dựng được ảnh thì bỏ nút, deep link + QR trên trang vẫn còn.
        console.error('[bank-deeplink] save-qr', e);
        if (container._bdlSeq !== seq) return;
        var hint = container.querySelector('.bdl-save-hint');
        saveBtn.remove(); if (hint) hint.remove();
      });
    }
    container.hidden = false;
  }

  root.BankDeepLink = { isLikelyPhone: isLikelyPhone, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
