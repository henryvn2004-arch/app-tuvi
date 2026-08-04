/* ============================================================
   tools-shared/dai-luc-nham.js — hiển thị khóa Đại Lục Nhâm (大六壬).
   Nguồn DUY NHẤT: dùng chung /tools/luc-nham.html VÀ shell /app/luc-nham.

   🔴 VÌ SAO THAY HẲN BẢN CŨ, KHÔNG CHỒNG LÊN:
   `luc-nham.js` quay 12 thiên tướng bằng `startOffset = (canNgay*2)%12` — công
   thức không khớp cổ pháp nào và CLAUDE.md đã ghi rõ là CHƯA VERIFY ĐƯỢC. Cổ
   pháp thật: vị Quý Nhân do can ngày + ngày/đêm quyết định, rồi 11 tướng còn
   lại đi thuận hay nghịch tùy Quý Nhân rơi bên nào trục Mão–Dậu.

   Nên ở đây KHÔNG có "đường lùi hiện tạm bản cũ" như tool Giờ Hoàng Đạo: hiện
   một thần tướng SAI mà trông rất tự tin còn tệ hơn báo thẳng là chưa lập được
   khóa. Mất mạng thì nói mất mạng.
   ============================================================ */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var CSS =
    '.lnk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;margin:10px 0}' +
    '.lnk-cell{padding:9px 8px;border-radius:6px;border:1px solid var(--border-lt,#e3e5e8);text-align:center}' +
    '.lnk-cell.cat{background:#eaf4ed;border-color:#c3e0cc}.lnk-cell.hung{background:#fef0ef;border-color:#f5c0bc}' +
    '.lnk-cell b{display:block;font-size:13px;color:var(--navy,#061A2E)}' +
    '.lnk-cell span{font-size:10.5px;color:var(--text-lt,#8a8f98)}' +
    '.lnk-h{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-lt,#8a8f98);margin:18px 0 8px}' +
    '.lnk-row{display:flex;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--text-mid,#4a5058);margin:4px 0}' +
    '.lnk-row b{color:var(--navy,#061A2E)}' +
    '.lnk-tt{display:flex;gap:8px;flex-wrap:wrap}' +
    '.lnk-tt>div{flex:1 1 150px;padding:11px 12px;border-radius:8px;border:1px solid var(--border-lt,#e3e5e8)}' +
    '.lnk-tt .st{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-lt,#8a8f98)}' +
    '.lnk-tt .ch{font-size:19px;font-weight:700;color:var(--navy,#061A2E);margin:3px 0}' +
    '.lnk-tt .mt{font-size:11px;color:var(--text-mid,#4a5058);line-height:1.5}' +
    '.lnk-chip{display:inline-block;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;margin:2px 3px 2px 0;border:1px solid}' +
    '.lnk-chip.cat{color:#1E6B3C;background:#eaf4ed;border-color:#c3e0cc}' +
    '.lnk-chip.hung{color:#C0392B;background:#fef0ef;border-color:#f5c0bc}' +
    '.lnk-chip.binh{color:#6b5b2e;background:#faf5e6;border-color:#e6dcbf}' +
    '.lnk-note{font-size:11.5px;color:var(--text-lt,#8a8f98);line-height:1.6;margin-top:6px}' +
    '.lnk-msg{font-size:13px;color:var(--text-mid,#4a5058);padding:14px 0}';

  (function styleOnce() {
    if (typeof document === 'undefined' || document.getElementById('lnk-css')) return;
    var s = document.createElement('style');
    s.id = 'lnk-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  })();

  function lap(khi) {
    var q = khi ? '?t=' + encodeURIComponent(khi.toISOString()) : '';
    return fetch('/api/liuren' + q)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.ok ? j : null; })
      .catch(function () { return null; });
  }

  function chip(t, m) {
    return '<span class="lnk-chip ' + (m || 'binh') + '">' + esc(t) + '</span>';
  }

  function html(k) {
    var o = [];
    o.push(
      '<div class="lnk-row"><span>Ngày <b>' + esc(k.canChi.ngay) + '</b></span>' +
      '<span>Giờ <b>' + esc(k.canChi.gio) + '</b></span>' +
      '<span>Tháng <b>' + esc(k.canChi.thang) + '</b></span>' +
      '<span><b>' + esc(k.truDem) + '</b></span></div>'
    );
    o.push(
      '<div class="lnk-row"><span>Nguyệt tướng <b>' + esc(k.nguyetTuong) +
      '</b> gia lên giờ chiêm <b>' + esc(k.chiemThoi) + '</b></span>' +
      '<span>Quý Nhân <b>' + esc(k.quyNhan.thienBan) + '</b> trên <b>' + esc(k.quyNhan.diaBan) + '</b></span>' +
      '<span>Tuần Không <b>' + esc(k.tuanKhong.join(', ')) + '</b></span></div>'
    );

    // ── tứ khóa ──
    o.push('<div class="lnk-h">Tứ khóa</div><div class="lnk-grid">');
    k.tuKhoa.forEach(function (x) {
      o.push(
        '<div class="lnk-cell ' + x.muc + '"><b>' + esc(x.tren) + ' / ' + esc(x.duoi) + '</b>' +
        '<span>' + esc(x.ten) + ' · ' + esc(x.tuong) + '<br>' + esc(x.quanHe) + '</span></div>'
      );
    });
    o.push('</div>');

    // ── tam truyền ──
    o.push('<div class="lnk-h">Tam truyền</div><div class="lnk-tt">');
    k.tamTruyen.forEach(function (x) {
      o.push(
        '<div class="lnk-cell ' + x.muc + '" style="text-align:left">' +
        '<div class="st">' + esc(x.ten) + '</div>' +
        '<div class="ch">' + esc(x.chi) + ' · ' + esc(x.tuong) + '</div>' +
        '<div class="mt">Hành ' + esc(x.hanh) + ' — ' + esc(x.vuongSuy) +
        (x.tuanKhong ? ' · <b>rơi Tuần Không</b>' : '') +
        '<br>Với can ngày: ' + esc(x.quanHeCanNgay) + '</div></div>'
      );
    });
    o.push('</div>');

    o.push('<div class="lnk-h">Phép thủ truyền</div>');
    o.push('<div class="lnk-row"><span><b>' + esc(k.phap.ten) + '</b> — ' + esc(k.phap.nghia) + '</span></div>');
    o.push('<div class="lnk-row"><span><b>' + esc(k.dangTruyen.ten) + '</b> — ' + esc(k.dangTruyen.nghia) + '</span></div>');

    if (k.khoaThe && k.khoaThe.length) {
      o.push('<div class="lnk-h">Khóa thể</div><div>' +
        k.khoaThe.map(function (t) { return chip(t, 'binh'); }).join('') + '</div>');
    }
    if (k.thanSat && k.thanSat.length) {
      o.push('<div class="lnk-h">Thần sát</div><div>' +
        k.thanSat.map(function (s) { return chip(s.ten, s.muc); }).join('') + '</div>');
    }

    // ── thiên địa bàn ──
    o.push('<div class="lnk-h">Thiên bàn gia địa bàn</div><div class="lnk-grid">');
    k.thienBan.forEach(function (x) {
      o.push(
        '<div class="lnk-cell ' + x.muc + '"><b>' + esc(x.thien) + '</b>' +
        '<span>trên ' + esc(x.dia) + '<br>' + esc(x.tuong) + '</span></div>'
      );
    });
    o.push('</div>');
    o.push('<div class="lnk-note">Nguyệt tướng gia lên giờ chiêm để quay thiên bàn; 12 thiên tướng an theo vị Quý Nhân của can ngày (ngày dùng Quý Nhân ban ngày, đêm dùng Quý Nhân ban đêm).</div>');
    return o.join('');
  }

  /** Lập rồi vẽ vào `el`. Trả Promise<payload|null>. */
  function ve(el, khi) {
    if (!el) return Promise.resolve(null);
    el.innerHTML = '<div class="lnk-msg">Đang lập khóa Lục Nhâm…</div>';
    return lap(khi).then(function (j) {
      if (!j) {
        el.innerHTML = '<div class="lnk-msg">Chưa lập được khóa lúc này — vui lòng thử lại. ' +
          '(Khóa Lục Nhâm phải lập ở máy chủ vì cần nguyệt tướng theo tiết khí thật.)</div>';
        return null;
      }
      el.innerHTML = html(j.khoa);
      return j;
    });
  }

  window.DaiLucNham = { lap: lap, html: html, ve: ve };
})();
