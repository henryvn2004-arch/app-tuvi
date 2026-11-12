/* ============================================================
   tools-shared/hoang-lich.js — LỚP BỔ SUNG hoàng lịch đầy đủ.

   Nguồn DUY NHẤT dùng chung: trang standalone /tools/hoang-dao.html,
   /tools/ngay-tot.html VÀ shell /app/hoang-dao, /app/ngay-tot.

   🔑 ĐÂY LÀ LỚP CHỒNG LÊN, KHÔNG THAY THẾ `HoangDaoTool`.
   `hoang-dao.js` vẫn tính can chi + 12 giờ hoàng đạo NGAY TẠI MÁY người dùng,
   không cần mạng — và nó cũng là đường lùi của thẻ "Vận hôm nay" ngoài trang
   chủ. File này chỉ gọi thêm `/api/almanac` để lấy phần repo không tự tính
   được (nghi/kỵ · thần sát · Bành Tổ · cửu tinh · xung sát · hướng năm).

   ⇒ API chết thì trang VẪN chạy đúng như trước, chỉ thiếu phần bổ sung.
   Đây là ràng buộc thiết kế, đừng đảo lại thành "chờ API rồi mới vẽ".
   ============================================================ */
(function () {
  var CACHE = {};

  // ── i18n (W28) — VĂN ENGINE SERVER: /api/almanac trả chữ Việt (lib/almanac/terms.ts) KÈM mã Hán `ma`/`*Ma`.
  // Chỉ đổi ở chỗ VẼ (html/napThang): bản dịch theo mã ở /tools-shared/i18n-long/<locale>/almanac.js
  // (docs/i18n/QUY-UOC.md "Văn engine server"); chữ khung qua I18n.tv (js.shellui.hl-*); trực/tú/can chi/chi
  // qua glossary. `tra`/`railData`/`railThang`/`xepHang` GIỮ chữ Việt (rail/prompt — luật SERVER_BOUND).
  // vi / trang không nạp i18n ⇒ mọi hàm dưới trả nguyên chữ Việt (byte-giống bản cũ).
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('almanac');
  function _long(ns, key, vi) {
    var I = window.I18n;
    return I && I.long ? I.long(ns, key, vi) : vi;
  }
  function _tv(key, vi, vars) {
    var I = window.I18n;
    if (I && I.tv) return I.tv(key, vi, vars);
    return vars ? vi.replace(/\{(\w+)\}/g, function (x, n) { return vars[n] !== undefined ? vars[n] : x; }) : vi;
  }
  function _g(kind, v) {
    var g = window.TuviGlossary;
    return g && v ? g.t(kind, v) : v;
  }
  /** Mục có mã ⇒ tra bản dịch; thiếu mã (payload cũ trong CDN) ⇒ chữ Việt. */
  function _m(prefix, ma, vi) { return ma ? _long('almanac', prefix + ma, vi) : vi; }
  // 12 thần trực nhật (saoNgay) — cùng khoá với hoang-dao.js; 3 ngày kỵ do lib/almanac/day.ts đặt tên.
  var THAN_KEY = {
    'Thanh Long': 'js.shellui.hdt-tl', 'Minh Đường': 'js.shellui.hdt-md', 'Thiên Hình': 'js.shellui.hdt-th',
    'Châu Tước': 'js.shellui.hdt-ct', 'Kim Quỹ': 'js.shellui.hdt-kq', 'Thiên Đức': 'js.shellui.hdt-td',
    'Bạch Hổ': 'js.shellui.hdt-bh', 'Ngọc Đường': 'js.shellui.hdt-nd', 'Thiên Lao': 'js.shellui.hdt-tlao',
    'Huyền Vũ': 'js.shellui.hdt-hv', 'Tư Mệnh': 'js.shellui.hdt-tm', 'Câu Trận': 'js.shellui.hdt-cht'
  };
  var KY_KEY = {
    'Tam Nương': 'js.shellui.ngt-tam-nuong', 'Nguyệt Kỵ': 'js.shellui.hl-nguyet-ky',
    'Dương Công Kỵ Nhật': 'js.shellui.hl-duong-cong-ky-nhat'
  };
  var NHAN_KEY = { 'Tốt': 'js.shellui.ngt-tot', 'Xấu': 'js.shellui.hl-xau', 'Bình': 'js.shellui.mn-binh',
    'Kỵ khởi sự': 'js.shellui.hl-ky-khoi-su' };
  var THU_KEY = { 'Chủ nhật': 'js.shellui.hl-thu-0', 'Thứ hai': 'js.shellui.hl-thu-1', 'Thứ ba': 'js.shellui.hl-thu-2',
    'Thứ tư': 'js.shellui.hl-thu-3', 'Thứ năm': 'js.shellui.hl-thu-4', 'Thứ sáu': 'js.shellui.hl-thu-5',
    'Thứ bảy': 'js.shellui.hl-thu-6' };
  function _k(map, vi) { return map[vi] ? _tv(map[vi], vi) : vi; }
  function _viec(v) { return { ten: _m('viec.', v.ma && v.ma + '.ten', v.ten), nghia: v.nghia ? _m('viec.', v.ma && v.ma + '.nghia', v.nghia) : '' }; }

  // CSS đi KÈM module thay vì nằm trong tools.css: trang standalone dùng
  // tools.css còn shell dùng shell.css — để ở một trong hai thì bên kia mất
  // sạch định dạng. Tiêm đúng một lần, dùng biến màu sẵn có của cả hai theme.
  var CSS =
    '.hl-tags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}' +
    '.hl-chip{font-size:11px;font-weight:600;padding:4px 9px;border-radius:999px;border:1px solid}' +
    '.hl-cat{color:#1E6B3C;background:#eaf4ed;border-color:#c3e0cc}' +
    '.hl-hung{color:#C0392B;background:#fef0ef;border-color:#f5c0bc}' +
    '.hl-binh{color:#6b5b2e;background:#faf5e6;border-color:#e6dcbf}' +
    '.hl-block{margin:16px 0}' +
    '.hl-block-t{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-lt,#8a8f98);margin-bottom:8px}' +
    '.hl-viecs{display:flex;flex-wrap:wrap;gap:6px}' +
    '.hl-viec{font-size:12px;padding:5px 10px;border-radius:5px;border:1px solid var(--border-lt,#e3e5e8);display:inline-flex;flex-direction:column;line-height:1.35}' +
    '.hl-viec em{font-style:normal;font-size:10px;color:var(--text-lt,#8a8f98)}' +
    '.hl-nen .hl-viec{background:#eaf4ed;border-color:#c3e0cc}' +
    '.hl-kieng .hl-viec{background:#fef0ef;border-color:#f5c0bc}' +
    '.hl-bt{font-size:12px;color:var(--text-mid,#4a5058);margin:3px 0}' +
    '.hl-huong{font-size:12px;color:var(--text-mid,#4a5058);margin:3px 0}' +
    '.hl-loading{font-size:12px;color:var(--text-lt,#8a8f98);padding:10px 0}' +
    '.cd-tag.t-neutral{color:#6b5b2e;background:#faf5e6;border:1px solid #e6dcbf}';

  (function styleOnce() {
    if (typeof document === 'undefined' || document.getElementById('hl-css')) return;
    var s = document.createElement('style');
    s.id = 'hl-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  })();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /** Lấy hoàng lịch một ngày. Hỏng thì trả null — KHÔNG ném. */
  function tra(ngay, thang, nam) {
    var key = nam + '-' + pad(thang) + '-' + pad(ngay);
    if (CACHE[key]) return Promise.resolve(CACHE[key]);
    return fetch('/api/almanac?d=' + key)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok || !j.ngay || !j.ngay.length) return null;
        CACHE[key] = j.ngay[0];
        return CACHE[key];
      })
      .catch(function () { return null; });
  }

  function chip(text, muc) {
    var cls = muc === 'cat' || muc === 'cát' ? 'hl-cat' : muc === 'hung' ? 'hl-hung' : 'hl-binh';
    return '<span class="hl-chip ' + cls + '">' + esc(text) + '</span>';
  }

  function khoiViec(tieuDe, items, loai) {
    if (!items || !items.length) return '';
    var body = items
      .map(function (v0) {
        var v = _viec(v0);
        var t = esc(v.ten);
        return v.nghia
          ? '<span class="hl-viec" title="' + esc(v.nghia) + '">' + t +
            '<em>' + esc(v.nghia) + '</em></span>'
          : '<span class="hl-viec">' + t + '</span>';
      })
      .join('');
    return (
      '<div class="hl-block hl-' + loai + '">' +
      '<div class="hl-block-t">' + esc(tieuDe) + '</div>' +
      '<div class="hl-viecs">' + body + '</div></div>'
    );
  }

  /** Dựng HTML phần bổ sung. `d` là một phần tử của `/api/almanac`. */
  function html(d) {
    if (!d) return '';
    var out = [];

    // ── hàng nhãn cấu trúc ──
    var tags = [];
    tags.push(chip(_tv('js.shellui.hl-truc', 'Trực {x}', { x: _g('truc', d.truc.ten) }), d.truc.muc));
    tags.push(chip(_tv('js.shellui.hl-sao', 'Sao {x}', { x: _g('tu', d.tu.ten) }), d.tu.muc));
    tags.push(chip(_k(THAN_KEY, d.saoNgay.ten), d.saoNgay.hoangDao ? 'cat' : 'hung'));
    if (d.cuuTinh) tags.push(chip(_m('cuu.', d.cuuTinh.ma, d.cuuTinh.ten), 'binh'));
    if (d.tuoiXung) tags.push(chip(_tv('js.shellui.hl-xung-tuoi', 'Xung tuổi {x}', { x: _g('chi', d.tuoiXung) }), 'hung'));
    if (d.huongSat) tags.push(chip(_tv('js.shellui.hl-sat-huong', 'Sát hướng {x}', { x: _m('phuong.', d.huongSatMa, d.huongSat) }), 'hung'));
    (d.ngayKy || []).forEach(function (k) { tags.push(chip(_k(KY_KEY, k), 'hung')); });
    out.push('<div class="hl-tags">' + tags.join('') + '</div>');

    out.push(khoiViec(_tv('js.shellui.hl-nen-lam', 'Nên làm'), d.nen, 'nen'));
    out.push(khoiViec(_tv('js.shellui.hl-nen-kieng', 'Nên kiêng'), d.kieng, 'kieng'));

    // ── thần sát ──
    if (d.thanSat && d.thanSat.length) {
      var cat = d.thanSat.filter(function (t) { return t.muc === 'cat'; });
      var hung = d.thanSat.filter(function (t) { return t.muc === 'hung'; });
      out.push(
        '<div class="hl-block"><div class="hl-block-t">' + esc(_tv('js.shellui.hl-than-sat', 'Thần sát trực nhật')) + '</div><div class="hl-tags">' +
        cat.map(function (t) { return chip(_m('than.', t.ma, t.ten), 'cat'); }).join('') +
        hung.map(function (t) { return chip(_m('than.', t.ma, t.ten), 'hung'); }).join('') +
        '</div></div>'
      );
    }

    if (d.banhTo && d.banhTo.length) {
      out.push(
        '<div class="hl-block"><div class="hl-block-t">' + esc(_tv('js.shellui.hl-banh-to', 'Bành Tổ bách kỵ')) + '</div>' +
        d.banhTo.map(function (s, i) { return '<div class="hl-bt">' + esc(_m('bt.', (d.banhToMa || [])[i], s)) + '</div>'; }).join('') +
        '</div>'
      );
    }

    if (d.huongNam && d.huongNam.length) {
      var tot = d.huongNam.filter(function (h) { return h.muc === 'cat'; });
      var xau = d.huongNam.filter(function (h) { return h.muc === 'hung'; });
      out.push(
        '<div class="hl-block"><div class="hl-block-t">' + esc(_tv('js.shellui.hl-huong-nam', 'Hướng theo năm {x}', { x: _g('canchi', d.canChiNam) })) + '</div>' +
        '<div class="hl-huong"><b>' + esc(_tv('js.shellui.hl-nen-huong', 'Nên hướng:')) + '</b> ' +
        (tot.map(huongTxt).join(' · ') || '—') +
        '</div><div class="hl-huong"><b>' + esc(_tv('js.shellui.hl-nen-tranh', 'Nên tránh:')) + '</b> ' +
        (xau.map(huongTxt).join(' · ') || '—') +
        '</div></div>'
      );
    }
    return out.join('');
  }
  function huongTxt(h) {
    return esc(_m('nien.', h.ma && h.ma + '.ten', h.ten) + ' — ' + _m('phuong.', h.huongMa, h.huong));
  }

  /**
   * Gắn phần bổ sung vào một phần tử. Trả Promise<payload|null> để trang gọi
   * còn dùng được dữ liệu (ví dụ đưa vào rail).
   */
  function gan(el, ngay, thang, nam) {
    if (!el) return Promise.resolve(null);
    el.innerHTML = '<div class="hl-loading">' + esc(_tv('js.shellui.hl-dang-tra', 'Đang tra hoàng lịch…')) + '</div>';
    return tra(ngay, thang, nam).then(function (d) {
      el.innerHTML = d ? html(d) : '';
      return d;
    });
  }

  /** Tra trọn một tháng (≤31 ngày, đúng trần của route). */
  function traThang(thang, nam) {
    var cuoi = new Date(nam, thang, 0).getDate();
    var tu = nam + '-' + pad(thang) + '-01';
    var den = nam + '-' + pad(thang) + '-' + pad(cuoi);
    return fetch('/api/almanac?d=' + tu + '&den=' + den)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.ok ? j.ngay : null; })
      .catch(function () { return null; });
  }

  /**
   * XẾP HẠNG MỘT NGÀY — LUẬT NẰM ĐÚNG MỘT CHỖ.
   *
   * 🐞 Bài học từ thẻ "Vận hôm nay": huy hiệu "Ngày tốt" từng hiện ngay trên
   * dòng "hoãn việc trọng đại" vì hai chỗ chấm bằng hai luật khác nhau. Nên
   * hàm này là nguồn DUY NHẤT quyết một ngày là tốt/bình/xấu, và:
   *
   * 🔑 NGÀY KỴ CỔ TRUYỀN LÀ LUẬT KIÊNG KHỞI SỰ, KHÔNG PHẢI ĐIỂM TRỪ CỘNG DỒN.
   * Dính Tam Nương / Nguyệt Kỵ / Dương Công thì trần bị hạ xuống, dù trực và
   * sao trực nhật có đẹp tới đâu.
   */
  function xepHang(d) {
    if (d.ngayKy && d.ngayKy.length) {
      return { muc: 'bad', nhan: 'Kỵ khởi sự', vi: d.ngayKy.join(' · ') };
    }
    var diem = 0;
    if (d.truc.muc === 'cát') diem += 1;
    if (d.truc.muc === 'hung') diem -= 1;
    if (d.tu.muc === 'cát') diem += 1; else diem -= 1;
    if (d.saoNgay.hoangDao) diem += 1; else diem -= 1;
    if (diem >= 2) return { muc: 'good', nhan: 'Tốt', vi: '' };
    if (diem <= -2) return { muc: 'bad', nhan: 'Xấu', vi: '' };
    return { muc: 'warn', nhan: 'Bình', vi: '' };
  }

  /**
   * Nâng cấp lưới lịch tháng của `NgayTotTool` bằng dữ liệu hoàng lịch thật.
   * Hỏng thì KHÔNG đụng gì — lưới cơ bản giữ nguyên.
   */
  function napThang(container, thang, nam) {
    if (!container) return Promise.resolve(null);
    return traThang(thang, nam).then(function (ds) {
      if (!ds) return null;
      var byNgay = {};
      ds.forEach(function (d) { byNgay[parseInt(d.ngayDL, 10)] = d; });
      var cells = container.querySelectorAll('.cal-day:not(.empty)');
      cells.forEach(function (cell) {
        var so = parseInt((cell.querySelector('.cd-dl') || {}).textContent || '', 10);
        var d = byNgay[so];
        if (!d) return;
        var h = xepHang(d);
        cell.classList.remove('good', 'warn', 'bad');
        cell.classList.add(h.muc);
        var cls = h.muc === 'good' ? 't-good' : h.muc === 'bad' ? 't-bad' : 't-warn';
        var tags = cell.querySelector('.cd-tags');
        if (!tags) return;
        // h.vi = ngayKy nối ' · ' (chữ Việt cho rail) ⇒ vẽ lại từ từng mục đã dịch.
        tags.innerHTML =
          '<span class="cd-tag ' + cls + '">' + esc(_k(NHAN_KEY, h.nhan)) + '</span>' +
          '<span class="cd-tag t-neutral">' + esc(_g('truc', d.truc.ten)) + '</span>' +
          (h.vi ? '<span class="cd-tag t-bad">' + esc(d.ngayKy.map(function (k) { return _k(KY_KEY, k); }).join(' · ')) + '</span>' : '');
        cell.title = _tv('js.shellui.hl-o-ngay', '{thu} · ngày {cc} · trực {truc} · sao {tu}\nNên: {nen}\nKiêng: {kieng}', {
          thu: _k(THU_KEY, d.thu), cc: _g('canchi', d.canChiNgay), truc: _g('truc', d.truc.ten), tu: _g('tu', d.tu.ten),
          nen: d.nen.map(function (v) { return _viec(v).ten; }).join(', ') || '—',
          kieng: d.kieng.map(function (v) { return _viec(v).ten; }).join(', ') || '—'
        });
      });
      return ds;
    });
  }

  /** Gom cả tháng thành ngữ cảnh PHẲNG cho rail. */
  function railThang(ds) {
    if (!ds || !ds.length) return null;
    var nhom = { good: [], warn: [], bad: [] };
    ds.forEach(function (d) { nhom[xepHang(d).muc].push(parseInt(d.ngayDL, 10)); });
    return {
      ngayTot: nhom.good.join(', '),
      ngayBinh: nhom.warn.join(', '),
      ngayXau: nhom.bad.join(', '),
      chiTietTung: ds
        .map(function (d) {
          return (
            parseInt(d.ngayDL, 10) + '/' + d.amLich.thang + 'AL ' + d.canChiNgay +
            ' trực ' + d.truc.ten + ' sao ' + d.tu.ten +
            ' | nên: ' + (d.nen.map(function (v) { return v.ten; }).join('/') || '—') +
            ' | kiêng: ' + (d.kieng.map(function (v) { return v.ten; }).join('/') || '—')
          );
        })
        .join('\n'),
    };
  }

  /** Rút gọn cho rail/prompt — bỏ phần dài dòng, giữ thứ luận được. */
  function railData(d) {
    if (!d) return null;
    return {
      ngay: d.ngayDL + ' (' + d.thu + ')',
      amLich: d.amLich.ngay + '/' + d.amLich.thang + ' âm lịch',
      canChiNgay: d.canChiNgay,
      canChiThang: d.canChiThang,
      canChiNam: d.canChiNam,
      truc: d.truc.ten + ' (' + d.truc.muc + ')',
      nhiThapBatTu: d.tu.ten + ' (' + d.tu.muc + ')',
      saoTrucNhat: d.saoNgay.ten + (d.saoNgay.hoangDao ? ' — hoàng đạo' : ' — hắc đạo'),
      cuuTinh: d.cuuTinh ? d.cuuTinh.ten : '',
      nenLam: d.nen.map(function (v) { return v.ten + (v.nghia ? ' (' + v.nghia + ')' : ''); }).join(', '),
      nenKieng: d.kieng.map(function (v) { return v.ten + (v.nghia ? ' (' + v.nghia + ')' : ''); }).join(', '),
      thanSatCat: d.thanSat.filter(function (t) { return t.muc === 'cat'; }).map(function (t) { return t.ten; }).join(', '),
      thanSatHung: d.thanSat.filter(function (t) { return t.muc === 'hung'; }).map(function (t) { return t.ten; }).join(', '),
      banhToBachKy: d.banhTo.join(' · '),
      xungTuoi: d.tuoiXung,
      satHuong: d.huongSat,
      ngayKy: (d.ngayKy || []).join(', '),
      gioHoangDao: d.gioHoangDao.map(function (g) { return g.chi + ' (' + g.gio + ') ' + g.sao; }).join(', '),
    };
  }

  window.HoangLich = { tra: tra, html: html, gan: gan, railData: railData,
                       traThang: traThang, napThang: napThang, railThang: railThang, xepHang: xepHang };
})();
