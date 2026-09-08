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
   SẴN nội dung CK vào clipboard ngay khi bấm, trước khi mở app — khách dán
   thay vì phải nhớ/gõ tay. Đừng quảng cáo là "tự điền", chỉ là "mở app + đã
   copy nội dung".

   API: window.BankDeepLink.render(container, d, memo)
     - container: một <div> rỗng, module tự vẽ nhãn + hàng nút vào bên trong
       và tự ẩn/hiện (`container.hidden`) — trang gọi không cần dựng markup con.
     - d: { bankCode, accountNumber, accountName, amountVND } (từ response
       `action=create-bank`).
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
      '.bdl-app-btn img{width:36px;height:36px;border-radius:9px;object-fit:cover;border:1px solid #ccc}';
    document.head.appendChild(style);
  }

  function render(container, d, memo) {
    if (!container) return;
    if (!isLikelyPhone() || !d || !d.bankCode || !d.accountNumber) {
      container.hidden = true; container.innerHTML = ''; return;
    }
    injectStyleOnce();
    container.classList.add('bdl-wrap');
    var ba = encodeURIComponent(d.accountNumber) + '@' + d.bankCode;
    container.innerHTML =
      '<div class="bdl-label">Hoặc mở app ngân hàng (đã copy sẵn nội dung CK, dán vào app):</div>' +
      '<div class="bdl-row">' + BANK_APPS.map(function (b) {
        var href = 'https://dl.vietqr.io/pay?app=' + b.app + '&ba=' + ba
          + '&am=' + encodeURIComponent(d.amountVND) + '&tn=' + encodeURIComponent(memo)
          + '&bn=' + encodeURIComponent(d.accountName || '');
        return '<a class="bdl-app-btn" href="' + esc(href) + '" target="_blank" rel="noopener" data-memo="' + esc(memo) + '">'
          + '<img src="https://cdn.vietqr.io/img/' + b.logo + '.png" alt="' + esc(b.name) + '" loading="lazy">'
          + '<span>' + esc(b.name) + '</span></a>';
      }).join('') + '</div>';
    Array.prototype.forEach.call(container.querySelectorAll('.bdl-app-btn'), function (a) {
      a.addEventListener('click', function () {
        var label = a.querySelector('span');
        var original = label.textContent;
        copyToClipboard(a.getAttribute('data-memo')).then(function () {
          label.textContent = 'Đã copy ND';
          setTimeout(function () { label.textContent = original; }, 1500);
        }).catch(function () {});
      });
    });
    container.hidden = false;
  }

  root.BankDeepLink = { isLikelyPhone: isLikelyPhone, render: render };
})(typeof window !== 'undefined' ? window : globalThis);
