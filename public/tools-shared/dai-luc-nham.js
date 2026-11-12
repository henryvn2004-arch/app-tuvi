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
  // Chữ HIỂN THỊ qua I18n.tv + glossary (trang /<locale>/); vi / trang không nạp ⇒ chữ Việt nguyên.
  function _tv(key, vi, vars) {
    var I = window.I18n;
    if (I && I.tv) return I.tv(key, vi, vars);
    return vars ? vi.replace(/\{(\w+)\}/g, function (x, n) { return vars[n] !== undefined ? vars[n] : x; }) : vi;
  }
  function _g(kind, v) {
    var g = window.TuviGlossary;
    return g && v ? g.t(kind, v) : v;
  }

  // ── Văn ENGINE theo ngôn ngữ (W28, lô E): `/api/liuren` trả chữ Việt + MÃ Hán (`ma`/`*Ma`) — dịch ở ĐÂY,
  // chỗ vẽ, qua văn dài ns `lucnham` (lib/i18n/long.mjs). Mảnh nào thiếu mã/bản dịch ⇒ giữ NGUYÊN câu Việt
  // của engine (vi không nạp gì nên byte-giống; payload cũ trong CDN thiếu `ma` cũng lùi về Việt).
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('lucnham');
  var NUL = '\u0000';
  function _long(ns, k) {
    var I = window.I18n;
    if (!I || !I.long) return null;
    var s = I.long(ns, k, NUL);
    return s === NUL ? null : s;
  }
  function _t(k) { return _long('lucnham', k); }
  function _khuon(n) { return _t('khuon.' + n); }
  function _fill(s, v) {
    return s.replace(/\{(\w+)\}/g, function (m, n) { return v[n] !== undefined ? v[n] : m; });
  }
  function _sp() { return /^(ja|zh)/.test((window.I18n && window.I18n.locale) || '') ? '' : ' '; }
  // Chữ Hán hành → tên Việt (khoá glossary `hanh`) — chỉ để dựng lại câu "A sinh/khắc B" theo ngôn ngữ.
  var HANH_VI = { '木': 'Mộc', '火': 'Hỏa', '土': 'Thổ', '金': 'Kim', '水': 'Thủy' };
  function tTuong(ma, vi) { return (ma && ma.tuong && _t('tuong.' + ma.tuong)) || vi; }
  function tQuanHe(raw, vi) {
    if (!raw) return vi;
    if (raw === '比和') return _khuon('tyHoa') || vi;
    var m = /^(.)(生|克)(.)$/.exec(raw);
    var k = m && _t(m[2] === '生' ? 'khuon.sinh' : 'khuon.khac');
    return k ? _fill(k, { a: _g('hanh', HANH_VI[m[1]] || m[1]), b: _g('hanh', HANH_VI[m[3]] || m[3]) }) : vi;
  }
  function tKhoaThe(p, vi) {
    if (!p || !p.length) return vi;
    if (p[1] === '发用') {
      var t = _t('tuong.' + p[0]), f = _khuon('phatDung');
      return t && f ? _fill(f, { tuong: t }) : vi;
    }
    var o = p.map(function (x) { return _t('khoathe.' + x); });
    return o.every(Boolean) ? o.join(_sp()) : vi;
  }
  function tPhap(ph) {
    var ma = ph && ph.ma;
    if (!ma || !ma.length) return ph;
    var t = ma.map(function (x) { return _t('phap.' + x + '.ten'); });
    var n = ma.map(function (x) { return _t('phap.' + x + '.nghia'); });
    if (!t.every(Boolean) || !n.every(Boolean)) return ph;
    if (ma.length === 1) return { ten: t[0], nghia: n[0] };
    var kh = _khuon('ketHop');
    return kh ? { ten: t.join(_sp()), nghia: _fill(kh, { a: n[0], b: n[1] }) } : ph;
  }
  function tDangTruyen(dt) {
    var ma = dt && dt.ma;
    var t = ma && _t('dt.' + ma + '.ten'), n = ma && _t('dt.' + ma + '.nghia');
    return t && n ? { ten: t, nghia: n } : dt;
  }
  function tTruDem(k) { return (k.truDemMa && _t('trudem.' + k.truDemMa)) || k.truDem; }
  function tVuongSuy(ma, vi) { return (ma && ma.vuongSuy && _t('vs.' + ma.vuongSuy)) || vi; }
  function tKhoaTen(ma, vi) { return (ma && ma.ten && _t('khoa.' + ma.ten)) || vi; }
  function tThanSat(s) { return (s.ma && _t('thansat.' + s.ma)) || s.ten; }
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
      '<div class="lnk-row"><span>' + _tv('js.shellui.dln-ngay-b', 'Ngày <b>{v}</b>', { v: esc(_g('canchi', k.canChi.ngay)) }) + '</span>' +
      '<span>' + _tv('js.shellui.dln-gio-b', 'Giờ <b>{v}</b>', { v: esc(_g('canchi', k.canChi.gio)) }) + '</span>' +
      '<span>' + _tv('js.shellui.dln-thang-b', 'Tháng <b>{v}</b>', { v: esc(_g('canchi', k.canChi.thang)) }) + '</span>' +
      '<span><b>' + esc(tTruDem(k)) + '</b></span></div>'
    );
    o.push(
      '<div class="lnk-row"><span>' + _tv('js.shellui.dln-nguyet-tuong', 'Nguyệt tướng <b>{nt}</b> gia lên giờ chiêm <b>{ct}</b>', { nt: esc(k.nguyetTuong), ct: esc(_g('chi', k.chiemThoi)) }) + '</span>' +
      '<span>' + _tv('js.shellui.dln-quy-nhan', 'Quý Nhân <b>{tb}</b> trên <b>{db}</b>', { tb: esc(_g('chi', k.quyNhan.thienBan)), db: esc(_g('chi', k.quyNhan.diaBan)) }) + '</span>' +
      '<span>' + _tv('js.shellui.dln-tuan-khong', 'Tuần Không <b>{v}</b>', { v: esc(k.tuanKhong.map(function (c) { return _g('chi', c); }).join(', ')) }) + '</span></div>'
    );

    // ── tứ khóa ──
    o.push('<div class="lnk-h">' + _tv('js.shellui.dln-tu-khoa', 'Tứ khóa') + '</div><div class="lnk-grid">');
    k.tuKhoa.forEach(function (x) {
      o.push(
        '<div class="lnk-cell ' + x.muc + '"><b>' + esc(_g('chi', x.tren)) + ' / ' + esc(_g('chi', x.duoi)) + '</b>' +
        '<span>' + esc(tKhoaTen(x.ma, x.ten)) + ' · ' + esc(tTuong(x.ma, x.tuong)) + '<br>' + esc(tQuanHe(x.ma && x.ma.quanHe, x.quanHe)) + '</span></div>'
      );
    });
    o.push('</div>');

    // ── tam truyền ──
    o.push('<div class="lnk-h">' + _tv('js.shellui.dln-tam-truyen', 'Tam truyền') + '</div><div class="lnk-tt">');
    k.tamTruyen.forEach(function (x) {
      o.push(
        '<div class="lnk-cell ' + x.muc + '" style="text-align:left">' +
        '<div class="st">' + esc(_g('lucnham', x.ten)) + '</div>' +
        '<div class="ch">' + esc(_g('chi', x.chi)) + ' · ' + esc(tTuong(x.ma, x.tuong)) + '</div>' +
        '<div class="mt">' + _tv('js.shellui.dln-hanh-vuong-suy', 'Hành {h} — {vs}', { h: esc(_g('hanh', x.hanh)), vs: esc(tVuongSuy(x.ma, x.vuongSuy)) }) +
        (x.tuanKhong ? ' · <b>' + _tv('js.shellui.dln-roi-tuan-khong', 'rơi Tuần Không') + '</b>' : '') +
        '<br>' + _tv('js.shellui.dln-voi-can-ngay', 'Với can ngày: {v}', { v: esc(tQuanHe(x.ma && x.ma.quanHeCanNgay, x.quanHeCanNgay)) }) + '</div></div>'
      );
    });
    o.push('</div>');

    o.push('<div class="lnk-h">' + _tv('js.shellui.dln-phep-thu-truyen', 'Phép thủ truyền') + '</div>');
    var ph = tPhap(k.phap), dt = tDangTruyen(k.dangTruyen);
    o.push('<div class="lnk-row"><span><b>' + esc(ph.ten) + '</b> — ' + esc(ph.nghia) + '</span></div>');
    o.push('<div class="lnk-row"><span><b>' + esc(dt.ten) + '</b> — ' + esc(dt.nghia) + '</span></div>');

    if (k.khoaThe && k.khoaThe.length) {
      o.push('<div class="lnk-h">' + _tv('js.shellui.dln-khoa-the', 'Khóa thể') + '</div><div>' +
        k.khoaThe.map(function (t, i) { return chip(tKhoaThe(k.khoaTheMa && k.khoaTheMa[i], t), 'binh'); }).join('') + '</div>');
    }
    if (k.thanSat && k.thanSat.length) {
      o.push('<div class="lnk-h">' + _tv('js.shellui.dln-than-sat', 'Thần sát') + '</div><div>' +
        k.thanSat.map(function (s) { return chip(tThanSat(s), s.muc); }).join('') + '</div>');
    }

    // ── thiên địa bàn ──
    o.push('<div class="lnk-h">' + _tv('js.shellui.dln-thien-ban-gia-dia-ban', 'Thiên bàn gia địa bàn') + '</div><div class="lnk-grid">');
    k.thienBan.forEach(function (x) {
      o.push(
        '<div class="lnk-cell ' + x.muc + '"><b>' + esc(_g('chi', x.thien)) + '</b>' +
        '<span>' + _tv('js.shellui.dln-tren', 'trên {v}', { v: esc(_g('chi', x.dia)) }) + '<br>' + esc(tTuong(x.ma, x.tuong)) + '</span></div>'
      );
    });
    o.push('</div>');
    o.push('<div class="lnk-note">' + _tv('js.shellui.dln-note', 'Nguyệt tướng gia lên giờ chiêm để quay thiên bàn; 12 thiên tướng an theo vị Quý Nhân của can ngày (ngày dùng Quý Nhân ban ngày, đêm dùng Quý Nhân ban đêm).') + '</div>');
    return o.join('');
  }

  /** Lập rồi vẽ vào `el`. Trả Promise<payload|null>. */
  function ve(el, khi) {
    if (!el) return Promise.resolve(null);
    el.innerHTML = '<div class="lnk-msg">' + _tv('js.shellui.dln-dang-lap', 'Đang lập khóa Lục Nhâm…') + '</div>';
    return lap(khi).then(function (j) {
      if (!j) {
        el.innerHTML = '<div class="lnk-msg">' + _tv('js.shellui.dln-chua-lap-duoc', 'Chưa lập được khóa lúc này — vui lòng thử lại. (Khóa Lục Nhâm phải lập ở máy chủ vì cần nguyệt tướng theo tiết khí thật.)') + '</div>';
        return null;
      }
      el.innerHTML = html(j.khoa);
      return j;
    });
  }

  // `tr`: dịch tên/cụm của khóa cho chỗ vẽ ngoài module (lời chào rail của trang) — cùng đường lùi Việt.
  window.DaiLucNham = {
    lap: lap, html: html, ve: ve,
    tr: { truDem: tTruDem, phap: tPhap, tuong: tTuong },
  };
})();
