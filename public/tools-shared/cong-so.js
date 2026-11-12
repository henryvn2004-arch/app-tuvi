/* global Poster, _tvmbT, _tvmbG */
// ============================================================
// tools-shared/cong-so.js — Tử Vi Công Sở (dùng chung)
//
// NGUỒN DUY NHẤT cho phần vẽ + render của tool. Trang shell `/app/cong-so`
// nạp file này; trang standalone (nếu làm sau) nạp CÙNG file, không chép lại —
// hai bản render sẽ trôi khỏi nhau, đúng bệnh đã phải đi vá ở batch-2.
//
// Mọi con số do `/api/cong-so` trả về. Module này KHÔNG tự tính điểm, KHÔNG tự
// phân kiểu — nó chỉ vẽ.
// ============================================================
(function () {
  'use strict';

  var KIEU_MAU = {
    'khai-sang': '#B03A2E',
    'lanh-dao': '#1455A4',
    'ho-tro': '#B7791F',
    'hop-tac': '#2C7A5A',
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Chỗ HIỂN THỊ: tên sao/cung qua glossary (vi trả nguyên), tên kiểu qua id (server trả chữ Việt).
  function G(kind, v) { return typeof _tvmbG === 'function' && v ? _tvmbG(kind, v) : v; }
  // Nhãn sao do engine dựng `Tên (độ sáng) [Hóa X]` — tách ra dịch từng phần ở MỘT nơi: tools-shared/star-label.js.
  function starT(x) { return window.TuviStarLabel ? window.TuviStarLabel.t(x) : x; }
  // `nganh.sao` (past-life.ts) là tên sao HOẶC cặp 'A + B' kèm đuôi ' đồng cung' — tách từng tên rồi ghép lại.
  function saoNganh(x) {
    var m = /^(.*?)( đồng cung)?$/.exec(String(x == null ? '' : x));
    return m[1].split(' + ').map(starT).join(' + ') + (m[2] ? _tvmbT('js.cs.dong-cung', ' đồng cung') : '');
  }
  function GS(arr) { return (arr || []).map(starT).join(', '); }
  var KIEU_TEN = {
    'khai-sang': function () { return _tvmbT('js.cs.khai-sang', 'Khai sáng'); },
    'lanh-dao': function () { return _tvmbT('js.cs.lanh-dao', 'Lãnh đạo'); },
    'ho-tro': function () { return _tvmbT('js.cs.ho-tro', 'Hỗ trợ'); },
    'hop-tac': function () { return _tvmbT('js.cs.hop-tac', 'Hợp tác'); },
  };
  function kieuTen(k) { return k ? (KIEU_TEN[k.id] ? KIEU_TEN[k.id]() : k.ten) : ''; }
  // ── i18n (W30b) — VĂN ENGINE SERVER: /api/cong-so trả chữ Việt (lib/engine/cong-so.ts) KÈM mã tra additive
  // (`luanMa`, `goiYMa`, `nganh.domainMa/quyMoMa`; còn lại tra theo id sẵn có: kieu.id · trangThai · cung · stt).
  // Dịch ở CHỖ VẼ, ns 'cong-so' (/tools-shared/i18n-long/<locale>/cong-so.js, docs/i18n/QUY-UOC.md "Văn engine
  // server"); thiếu mã/bản dịch ⇒ chữ Việt (vi không nạp gì ⇒ byte-giống). Dữ liệu gửi server/rail GIỮ chữ Việt.
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('cong-so');
  function L(key, vi, vars) {
    return window.I18n && window.I18n.long ? window.I18n.long('cong-so', key, vi, vars) : vi;
  }
  /** Mục có mã ⇒ tra theo `<bảng>.<mã>`; thiếu mã (payload cũ trong CDN) ⇒ chữ Việt. */
  // ── i18n (W30f-3) — chữ do past-life.ts viết (bậc · khoản chấm · chức phận cổ · trích dẫn · sắc thái · tư cách Mệnh):
  // `ho.nganh.ma` / `ho.vaiTroMa` là MÃ tra ns `past-life`; thiếu mã/bản dịch ⇒ giữ NGUYÊN câu Việt (vi byte-giống).
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('past-life');
  function PL(key, vi, vars) {
    return key && window.I18n && window.I18n.long ? window.I18n.long('past-life', key, vi, vars) : vi;
  }
  function viet() { var l = window.I18n && window.I18n.locale; return !l || l === 'vi'; }
  function GN(arr) { return (arr || []).map(function (x) { return G(['chinh', 'sao'], x); }).join('/'); }
  // Một khoản chấm bậc: `±n` + lời. Mảng `bacChiTiet` và `ma.bd` song song (cùng chỉ số).
  function bdKhoan(m, vi) {
    if (viet() || !m) return vi;
    var sign = (m.n > 0 ? '+' : '') + m.n + ' ';
    var tpl = function (k, d, v) { return PL('bd.' + k, d, v); };
    if (m.k === 'chinh') return sign + (m.ten ? G(['chinh', 'sao'], m.ten) : tpl('chinhtinh', 'chính tinh')) + (m.sang ? ' ' + G('sang', m.sang) : '');
    if (m.k === 'hoa') return sign + tpl('hoa', '{ten} hóa {hoa}', { ten: G(['chinh', 'sao'], m.ten), hoa: G('sao', 'Hóa ' + m.hoa) });
    if (m.k === 'tuan-giai') return sign + tpl('tuan-giai', 'Tuần/Triệt án ngữ (giải hãm)');
    if (m.k === 'tuan-pha') return sign + tpl('tuan-pha', 'Tuần/Triệt án ngữ (phá cách tốt)');
    if (m.k === 'cat' || m.k === 'sat') return sign + GN(m.ds);
    if (m.k === 'cach') return sign + tpl('cach', 'cách {ten}', { ten: m.ten });
    return vi;
  }
  function bdList(ng) { return (ng.bacChiTiet || []).map(function (v, i) { return bdKhoan(ng.ma && ng.ma.bd && ng.ma.bd[i], v); }); }
  // Sắc thái nghề: `Tên/Tên → câu` (phụ tinh) hoặc `Tên hóa X → câu` (tứ hóa); `ma.notes` song song `sacThai`.
  function sacThaiList(ng) {
    return (ng.sacThai || []).map(function (v, i) {
      var m = ng.ma && ng.ma.notes && ng.ma.notes[i];
      if (viet() || !m) return v;
      var cau = PL(m.k, null);
      if (cau == null) return v;
      var dau = m.ds ? GN(m.ds) : PL('bd.hoa', '{ten} hóa {hoa}', { ten: G(['chinh', 'sao'], m.ten), hoa: G('sao', 'Hóa ' + m.k.split('.')[2]) });
      return dau + ' → ' + cau;
    });
  }
  // ── i18n (W30f-4) — tầng nhánh nghề (nghe-nghiep.ts): nhánh tra theo `lĩnh vực.id` (id chỉ duy nhất TRONG lĩnh vực),
  // trục theo id (`viMa` · `chatNguoi[].id` · `neTranh[].id`). Thiếu mã/bản dịch ⇒ NGUYÊN câu Việt (vi byte-giống).
  if (window.I18n && window.I18n.loadLong) window.I18n.loadLong('nghe-nghiep');
  function NN(key, vi) {
    return window.I18n && window.I18n.long ? window.I18n.long('nghe-nghiep', key, vi) : vi;
  }
  function trucTen(id, vi, cach) { return id ? NN('truc.' + id + '.' + cach, vi) : vi; }
  function LM(prefix, ma, vi, suffix) { return ma ? L(prefix + ma + (suffix || ''), vi) : vi; }
  /** Chữ của KIỂU người theo id (kieu.<id>.<trường>). */
  function KF(k, f, vi) { return k && k.id ? L('kieu.' + k.id + '.' + f, vi) : vi; }
  function KL(k, f, arr) { return (arr || []).map(function (v, i) { return KF(k, f + '.' + i, v); }); }
  // Câu khuôn: biến lấy từ id có sẵn trong payload (stt · kieu · nenTim); tên kiểu qua `js.cs.*`, viết thường.
  function luanNac(n) {
    return n.luanMa ? L('luan.' + n.luanMa, n.luan, { nac: L('nac.' + n.stt, n.nac).toLowerCase() }) : n.luan;
  }
  function goiYGhep(d) {
    var ten = function (id) { return id ? kieuTen({ id: id }).toLowerCase() : ''; };
    return d.goiYMa ? L('ghep.' + d.goiYMa, d.goiY, { kieu: ten(d.kieu), nen: ten(d.nenTim) }) : d.goiY;
  }
  function radarNhan(it) { return LM('radar.', it.cung, it.nhan, '.nhan'); }
  function cungTen(c) { return _tvmbT('js.cs.cung-name', 'cung {name}', { name: G('cung', c) }); }

  function dpiFit(canvas, w, h) {
    var r = window.devicePixelRatio || 1;
    canvas.width = w * r;
    canvas.height = h * r;
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return ctx;
  }

  // ── Biểu đồ TOẠ ĐỘ (4 góc phần tư) ─────────────────────────
  // Đây là hình đọc được trong một giây bởi người không biết gì về tử vi: bốn ô
  // có tên, một chấm chỉ chỗ đứng. Chính nó là thứ mang lên poster.
  //
  // ⚠️ Trục Y trên MÀN HÌNH ngược trục Y toán học: yNorm càng lớn ("xông") thì
  // càng phải vẽ LÊN TRÊN. Quên đảo dấu là bốn nhãn vẫn đúng chỗ mà cái chấm
  // rơi vào ô đối diện — sai im lặng, nhìn không ra.
  function veToaDo(ctx, box, ho, opt) {
    opt = opt || {};
    var fg = opt.fg || '#1A1A1A';
    var line = opt.line || 'rgba(0,0,0,.16)';
    var dim = opt.dim || 'rgba(0,0,0,.45)';
    var pad = Math.round(Math.min(box.w, box.h) * 0.13);
    var x0 = box.x + pad,
      y0 = box.y + pad;
    var s = Math.min(box.w, box.h) - pad * 2;
    var cx = x0 + s / 2,
      cy = y0 + s / 2;

    var quads = [
      { id: 'khai-sang', ten: _tvmbT('js.cs.khai-sang', 'Khai sáng'), qx: 1, qy: 1 },
      { id: 'lanh-dao', ten: _tvmbT('js.cs.lanh-dao', 'Lãnh đạo'), qx: 1, qy: -1 },
      { id: 'ho-tro', ten: _tvmbT('js.cs.ho-tro', 'Hỗ trợ'), qx: -1, qy: 1 },
      { id: 'hop-tac', ten: _tvmbT('js.cs.hop-tac', 'Hợp tác'), qx: -1, qy: -1 },
    ];

    quads.forEach(function (q) {
      var rx = q.qx > 0 ? cx : x0;
      var ry = q.qy > 0 ? y0 : cy; // qy>0 = "xông" = nửa TRÊN màn hình
      ctx.fillStyle = q.id === ho.kieu.id ? hexA(KIEU_MAU[q.id], 0.14) : hexA(KIEU_MAU[q.id], 0.04);
      ctx.fillRect(rx, ry, s / 2, s / 2);
    });

    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, s, s);
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.lineTo(cx, y0 + s);
    ctx.moveTo(x0, cy);
    ctx.lineTo(x0 + s, cy);
    ctx.stroke();

    var fs = Math.max(11, Math.round(s * 0.052));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    quads.forEach(function (q) {
      var lx = cx + (q.qx * s) / 4;
      var ly = cy - (q.qy * s) / 4;
      var on = q.id === ho.kieu.id;
      ctx.font = (on ? '700 ' : '400 ') + fs + 'px ' + (opt.serif || 'Georgia, serif');
      ctx.fillStyle = on ? KIEU_MAU[q.id] : dim;
      ctx.fillText(q.ten, lx, ly);
    });

    // Nhãn trục — nói bằng tiếng người, không bằng thuật ngữ tứ tượng.
    var af = Math.max(9, Math.round(s * 0.038));
    ctx.font = af + 'px ' + (opt.sans || 'system-ui, sans-serif');
    ctx.fillStyle = dim;
    ctx.fillText(_tvmbT('js.cs.xong-pha', 'xông pha'), cx, y0 - af * 0.9);
    ctx.fillText(_tvmbT('js.cs.tram-on', 'trầm ổn'), cx, y0 + s + af * 0.9);
    ctx.save();
    ctx.translate(x0 - af * 0.9, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(_tvmbT('js.cs.nhuong', 'nhường'), 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(x0 + s + af * 0.9, cy);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(_tvmbT('js.cs.tranh', 'tranh'), 0, 0);
    ctx.restore();

    // Chấm vị trí — bán kính vẽ theo nửa cạnh, kẹp trong khung.
    var px = cx + (ho.phan.xNorm * s) / 2;
    var py = cy - (ho.phan.yNorm * s) / 2;
    var r = Math.max(5, Math.round(s * 0.028));
    ctx.beginPath();
    ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = hexA(KIEU_MAU[ho.kieu.id], 0.22);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = KIEU_MAU[ho.kieu.id];
    ctx.fill();
    ctx.strokeStyle = opt.dot || '#fff';
    ctx.lineWidth = Math.max(2, r * 0.35);
    ctx.stroke();
    ctx.fillStyle = fg;
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // Gãy nhãn thành TỐI ĐA 2 dòng, chọn chỗ ngắt cho hai dòng CÂN NHAU nhất
  // thay vì ngắt tham lam: "Đường / công danh" gọn hơn "Đường công / danh",
  // mà bề rộng của dòng dài nhất mới là thứ quyết định bán kính bên dưới.
  function wrap2(ctx, text, maxW) {
    var s = String(text || '');
    if (ctx.measureText(s).width <= maxW) return [s];
    var words = s.split(' ');
    if (words.length < 2) return [s];
    var best = null;
    for (var k = 1; k < words.length; k++) {
      var a = words.slice(0, k).join(' ');
      var b = words.slice(k).join(' ');
      var m = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (!best || m < best.m) best = { m: m, lines: [a, b] };
    }
    return best.lines;
  }

  // ── Radar 12 chiều ─────────────────────────────────────────
  function veRadar(ctx, box, ho, opt) {
    opt = opt || {};
    var fg = opt.fg || '#1A1A1A';
    var dim = opt.dim || 'rgba(0,0,0,.45)';
    var grid = opt.line || 'rgba(0,0,0,.13)';
    var items = ho.radar;
    var n = items.length;
    var cx = box.x + box.w / 2;
    var cy = box.y + box.h / 2;
    var side = Math.min(box.w, box.h);

    var ang = function (i) {
      return (Math.PI * 2 * i) / n - Math.PI / 2;
    };

    // ── Cỡ chữ + bán kính: ĐO nhãn rồi mới chốt, không chừa lề cố định ──
    // Bản cũ lấy cỡ chữ theo bán kính (R*0.115 ⇒ 20px ở khổ 520) rồi chừa một
    // lề cứng max(46, side*0.17) cho nhãn. Lề đó hẹp hơn bề rộng chữ THẬT của
    // những nhãn dài nhất ("Đồng sự ngang hàng", "Nền tảng hậu phương") nên
    // đuôi nhãn tràn khỏi canvas và bị cắt cụt. Nay: chốt cỡ chữ theo KHỔ vẽ,
    // gãy nhãn dài xuống 2 dòng, rồi giải ngược R từ bề rộng đo được — bán
    // kính tự co lại vừa đủ, không nhãn nào chạm mép dù nhãn có đổi.
    var fs = Math.max(9, Math.min(12, Math.round(side * 0.021)));
    ctx.font = fs + 'px ' + (opt.sans || 'system-ui, sans-serif');
    var lh = fs * 1.25;

    var labs = items.map(function (it) {
      return wrap2(ctx, radarNhan(it), side * 0.145);
    });
    var labW = labs.map(function (ls) {
      return ls.reduce(function (m, s) {
        return Math.max(m, ctx.measureText(s).width);
      }, 0);
    });

    var R = side / 2 - fs * 2;
    for (var q = 0; q < n; q++) {
      var aq = ang(q);
      var cq = Math.abs(Math.cos(aq));
      var sq = Math.abs(Math.sin(aq));
      // Nhãn trên/dưới căn giữa nên chỉ ăn NỬA bề rộng về mỗi phía.
      var halfW = cq < 0.25 ? labW[q] / 2 : labW[q];
      var halfH = ((labs[q].length - 1) * lh) / 2 + fs * 0.7;
      if (cq > 0.02) R = Math.min(R, (box.w / 2 - 3 - halfW) / cq - fs * 1.5);
      if (sq > 0.02) R = Math.min(R, (box.h / 2 - 3 - halfH) / sq - fs * 1.1);
    }
    if (R <= 10) return;

    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var a = ang(i);
        var x = cx + Math.cos(a) * R * t;
        var y = cy + Math.sin(a) * R * t;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = grid;
      ctx.stroke();
    });
    for (var i = 0; i < n; i++) {
      var a = ang(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.strokeStyle = grid;
      ctx.stroke();
    }

    ctx.beginPath();
    items.forEach(function (it, i) {
      var t = Math.max(0, Math.min(1, it.diem / 10));
      var a = ang(i);
      var x = cx + Math.cos(a) * R * t;
      var y = cy + Math.sin(a) * R * t;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = hexA(KIEU_MAU[ho.kieu.id], 0.2);
    ctx.fill();
    ctx.strokeStyle = KIEU_MAU[ho.kieu.id];
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textBaseline = 'middle';
    items.forEach(function (it, i) {
      var a = ang(i);
      var lx = cx + Math.cos(a) * (R + fs * 1.5);
      var ly = cy + Math.sin(a) * (R + fs * 1.1);
      var c = Math.cos(a);
      ctx.textAlign = Math.abs(c) < 0.25 ? 'center' : c > 0 ? 'left' : 'right';
      ctx.fillStyle = it.namNay ? KIEU_MAU[ho.kieu.id] : dim;
      var lines = labs[i];
      var y0 = ly - ((lines.length - 1) * lh) / 2;
      lines.forEach(function (s, k) {
        ctx.fillText(s, lx, y0 + k * lh);
      });
      // Chấm điểm ngay trên đỉnh — để đọc được con số mà không cần bảng.
      var t = Math.max(0, Math.min(1, it.diem / 10));
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * t, cy + Math.sin(a) * R * t, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = KIEU_MAU[ho.kieu.id];
      ctx.fill();
    });
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
  }

  function veToaDoCanvas(canvas, ho) {
    if (!canvas || !ho) return;
    var w = canvas.parentElement ? canvas.parentElement.clientWidth : 420;
    w = Math.max(240, Math.min(w, 460));
    var ctx = dpiFit(canvas, w, w);
    ctx.clearRect(0, 0, w, w);
    veToaDo(ctx, { x: 0, y: 0, w: w, h: w }, ho, {});
  }

  function veRadarCanvas(canvas, ho) {
    if (!canvas || !ho) return;
    var w = canvas.parentElement ? canvas.parentElement.clientWidth : 460;
    w = Math.max(280, Math.min(w, 520));
    var ctx = dpiFit(canvas, w, w);
    ctx.clearRect(0, 0, w, w);
    veRadar(ctx, { x: 0, y: 0, w: w, h: w }, ho, {});
  }

  // ── Poster 9:16 ────────────────────────────────────────────
  // Vẽ biểu đồ toạ độ trên nền navy. CỐ Ý chọn toạ độ chứ không chọn radar:
  // radar 12 nhãn nhỏ li ti, qua một lượt nén của mạng xã hội là không đọc
  // được; bốn ô có tên thì còn đọc được ở cỡ thumbnail.
  function posterDraw(ho) {
    return function (ctx, box) {
      var T = (typeof Poster !== 'undefined' && Poster.THEME) || {};
      var gold = T.GOLD || '#C9A227';
      var serif = T.SERIF || 'Georgia, serif';
      var sans = T.SANS || 'system-ui, sans-serif';

      ctx.textAlign = 'center';
      ctx.fillStyle = gold;
      ctx.font = '600 30px ' + sans;
      ctx.fillText(_tvmbT('js.cs.kieu-nguoi-o-cho-lam', 'KIỂU NGƯỜI Ở CHỖ LÀM'), box.x + box.w / 2, box.y + 74);

      ctx.fillStyle = '#fff';
      ctx.font = '700 76px ' + serif;
      ctx.fillText(kieuTen(ho.kieu), box.x + box.w / 2, box.y + 158);

      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.font = '28px ' + sans;
      ctx.fillText(KF(ho.kieu, 'tuTuong', ho.kieu.tuTuong), box.x + box.w / 2, box.y + 206);

      var side = Math.min(box.w - 150, box.h - 400);
      veToaDo(
        ctx,
        { x: box.x + (box.w - side) / 2, y: box.y + 250, w: side, h: side },
        ho,
        { fg: '#fff', dim: 'rgba(255,255,255,.62)', line: 'rgba(255,255,255,.22)', dot: '#0B1B33', serif: serif, sans: sans }
      );

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = '30px ' + sans;
      var y = box.y + 250 + side + 56;
      wrapCenter(ctx, KF(ho.kieu, 'motCau', ho.kieu.motCau), box.x + box.w / 2, y, box.w - 160, 42, 2);
      ctx.textAlign = 'left';
    };
  }

  function wrapCenter(ctx, text, cx, y, maxW, lh, maxLines) {
    var words = String(text || '').split(/\s+/);
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = words[i];
        if (lines.length >= maxLines) break;
      } else cur = t;
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    lines.forEach(function (l, i) {
      ctx.fillText(l, cx, y + i * lh);
    });
  }

  // ── Render HTML kết quả ────────────────────────────────────
  //
  // Tách HEAD (kiểu người — tên + tư tưởng + một câu) khỏi BODY (mọi thứ còn
  // lại: 6 thẻ · mạnh/yếu · ngành nghề · radar 12 mặt · lộ trình 4 chặng ·
  // ghép đội · cơ sở). Khách CHƯA đăng ký chỉ được xem HEAD — đó là "phần đầu"
  // đủ để thấy tool ĐÚNG là đang đọc lá số của họ, còn BODY gộp vào cùng tấm
  // khoá với tầng nhánh trả tiền (`dungTuong` bên `app-cong-so.html`).
  function headHTML(ho) {
    var mau = KIEU_MAU[ho.kieu.id];
    var k = ho.kieu;
    return (
      '<div class="cs-head" style="border-left:4px solid ' + mau + '">' +
        '<div class="cs-kieu" style="color:' + mau + '">' + esc(kieuTen(k)) + '</div>' +
        '<div class="cs-tt">' + esc(KF(k, 'tuTuong', k.tuTuong)) + ' · ' + esc((k.saoNhom || []).map(starT).join(' · ')) + '</div>' +
        '<div class="cs-mot">' + esc(KF(k, 'motCau', k.motCau)) + '</div>' +
        (ho.phan.lai && ho.kieuPhu
          ? ('<div class="cs-lai">' + _tvmbT('js.cs.kieu-lai-toa-do-cua-ban', '⚠ <b>Kiểu lai.</b> Toạ độ của bạn nằm sát ranh giới nên nghiêng <b>')) +
            esc(kieuTen(k)) + _tvmbT('js.cs.nhung-pha-kha-ro', '</b> nhưng pha khá rõ <b>') + esc(kieuTen(ho.kieuPhu)) +
            _tvmbT('js.cs.doc-ca-hai-phan-dung-ep', '</b>. Đọc cả hai phần, đừng ép mình vào một ô.</div>')
          : '') +
        '</div>'
    );
  }

  function bodyHTML(ho) {
    var mau = KIEU_MAU[ho.kieu.id];
    var k = ho.kieu;
    var h = [];

    h.push(
      '<div class="cs-grid">' +
        card(_tvmbT('js.cs.cai-thuc-ban-di', 'Cái thúc bạn đi'), esc(KF(k, 'dongLuc', k.dongLuc))) +
        card(_tvmbT('js.cs.nhan-ra-o-cho-lam', 'Nhận ra ở chỗ làm'), esc(KF(k, 'datChat', k.datChat))) +
        card(_tvmbT('js.cs.cau-hoi-chay-ngam-trong-dau', 'Câu hỏi chạy ngầm trong đầu'), '<ul class="cs-ul"><li>' + KL(k, 'cauHoi', k.cauHoi).map(esc).join('</li><li>') + '</li></ul>') +
        card(_tvmbT('js.cs.khi-duoc-giao-quyen', 'Khi được giao quyền'), esc(KF(k, 'kieuDan', k.kieuDan))) +
        card(_tvmbT('js.cs.moi-truong-hop', 'Môi trường hợp'), esc(KF(k, 'moiTruongHop', k.moiTruongHop))) +
        card(_tvmbT('js.cs.moi-truong-ky', 'Môi trường kỵ'), esc(KF(k, 'moiTruongKy', k.moiTruongKy))) +
        '</div>'
    );

    h.push(
      '<div class="cs-two">' +
        ('<div class="cs-box cs-ok">' + _tvmbT('js.cs.manh-nhat-gixi', '<b>Mạnh nhất</b>') + '<p>') + esc(KF(k, 'manh', k.manh)) + '</p></div>' +
        ('<div class="cs-box cs-no">' + _tvmbT('js.cs.cho-hay-vap', '<b>Chỗ hay vấp</b>') + '<p>') + esc(KF(k, 'yeu', k.yeu)) + '</p></div>' +
        '</div>'
    );

    // NGÀNH NGHỀ — đặt ngay sau khối kiểu người vì "tôi hợp làm gì" là câu
    // người ta mở tool để hỏi. Ba trục hiện tách bạch để đọc được vì sao ra
    // gợi ý này: lĩnh vực (cung Quan Lộc) × vai trò (kiểu người) × quy mô (bậc).
    var ng = ho.nganh;
    h.push(
      ('<div class="cs-sec"><h3>' + _tvmbT('js.cs.ban-hop-lam-gi', 'Bạn hợp làm gì') + '</h3>') +
        '<div class="cs-linhvuc" style="border-color:' + mau + '">' +
        '<div class="cs-lv-ten">' + esc(LM('nganh.', ng.domainMa, ng.linhVuc, '.linhVuc')) + '</div>' +
        '<div class="cs-lv-chat">' + esc(LM('nganh.', ng.domainMa, ng.chatViec, '.chatViec')) + '</div>' +
        '<ul class="cs-nganh">' + ng.nganh.map(function (x, i) { return '<li>' + esc(LM('nganh.', ng.domainMa, x, '.n.' + i)) + '</li>'; }).join('') + '</ul>' +
        '</div>' +
        '<div class="cs-grid" style="margin-top:11px">' +
        card(_tvmbT('js.cs.vai-ban-nen-nhan-trong-nganh', 'Vai bạn nên nhận trong ngành đó'), esc(L('vai.' + ho.kieu.id, ng.vaiTro))) +
        card(_tvmbT('js.cs.quy-mo-ganh-duoc-bac', 'Quy mô gánh được — bậc ') + esc(PL(ng.ma && ng.ma.tier, ng.bac)), esc(LM('quymo.', ng.quyMoMa, ng.quyMo))) +
        '</div>' +
        // ⚠️ Sắc thái phụ tinh THU HẸP TRONG lĩnh vực, KHÔNG thay lĩnh vực. Không
        // nói rõ chỗ này thì nó đọc thành mâu thuẫn ngay trên màn hình: lĩnh vực
        // ghi "chăm sóc thân thể" mà ngay dưới ghi "ngả hẳn về đường văn chương".
        // Đọc đúng thì đó là nhánh giảng dạy / nghiên cứu / viết chuyên môn CỦA
        // chính ngành đó — và đấy mới là chi tiết đáng tiền.
        (ng.sacThai.length
          ? ('<div class="cs-card" style="margin-bottom:11px">' + _tvmbT('js.cs.trong-linh-vuc-do-ban-nghieng', '<b>Trong lĩnh vực đó, bạn nghiêng về nhánh nào</b>')) +
            '<div style="font-size:12px;color:var(--text-lt);line-height:1.65;margin-bottom:7px">' +
            _tvmbT('js.cs.phu-tinh-dong-tai-cung-quan', 'Phụ tinh đóng tại cung Quan Lộc <b>thu hẹp bên trong</b> lĩnh vực trên, không thay nó. ') +
            _tvmbT('js.cs.vi-du-nghieng-chu-nghia-trong', 'Ví dụ nghiêng “chữ nghĩa” trong ngành y là nhánh giảng dạy, nghiên cứu, viết chuyên môn — vẫn là ngành y.') +
            '</div>' +
            '<ul class="cs-ul"><li>' + sacThaiList(ng).map(esc).join('</li><li>') + '</li></ul></div>'
          : '') +
        ('<p class="cs-note">' + _tvmbT('js.cs.day-la-goi-y-huong-khong', 'Đây là gợi ý HƯỚNG, không phải chỉ định nghề. Cổ thư nói về <b>chất việc</b>') + ' ') +
        _tvmbT('js.cs.doi-mat-hay-ban-giay-cam', '(đối mặt hay bàn giấy, cầm người hay cầm nghề); danh sách ngành hiện đại ở trên là phần trang quy chiếu ra. ') +
        _tvmbT('js.cs.khong-co-ten-nganh-ban-dang', 'Không có tên ngành bạn đang làm trong danh sách <b>không</b> có nghĩa là bạn đang làm sai — hãy đối chiếu ') +
        _tvmbT('js.cs.chat-viec-thay-vi-doi-chieu', '<i>chất việc</i> thay vì đối chiếu tên ngành.</p>') +
        '</div>'
    );

    // Lời theo tình trạng nghề — đặt CAO trên trang vì đây là phần người ta
    // thấy "nói đúng mình" nhất, và nó phụ thuộc ô người dùng vừa tự khai.
    h.push(
      ('<div class="cs-sec"><h3>' + _tvmbT('js.cs.cho-nguoi-dang-o-vi-tri', 'Cho người đang ở vị trí:') + ' ') + esc(L('tt.' + ho.trangThai, ho.trangThaiLabel)) + '</h3>' +
        '<p class="cs-lead">' + esc(L('loi.' + ho.trangThai + '.' + ho.kieu.id, ho.loiTrangThai)) + '</p></div>'
    );

    h.push(
      ('<div class="cs-sec"><h3>' + _tvmbT('js.cs.bon-viec-phai-hoc-khi-bat', 'Bốn việc phải học khi bắt đầu cầm người') + '</h3>') +
        '<ol class="cs-ol"><li>' + KL(k, 'baiHoc', k.baiHoc).map(esc).join('</li><li>') + '</li></ol></div>'
    );

    // Radar
    var top = ho.radar.slice().sort(function (a, b) { return b.diem - a.diem; });
    h.push(
      ('<div class="cs-sec"><h3>' + _tvmbT('js.cs.muoi-hai-mat-cua-doi-di-gqoe', 'Mười hai mặt của đời đi làm') + '</h3>') +
        ('<p class="cs-note">' + _tvmbT('js.cs.diem-do-engine-cham-tren-chinh', 'Điểm do engine chấm trên chính lá số của bạn (thang 10).') + ' ') +
        _tvmbT('js.cs.day-la-the-manh-tuong-doi', 'Đây là <b>thế mạnh tương đối giữa các mặt</b> của riêng bạn, không phải điểm so với người khác.</p>') +
        '<div class="cs-canvas-wrap"><canvas id="csRadar"></canvas></div>' +
        ('<table class="cs-tb"><thead><tr><th>' + _tvmbT('js.cs.mat', 'Mặt') + '</th><th>' + _tvmbT('js.cs.diem-8vmw', 'Điểm') + '</th><th>' + _tvmbT('js.cs.no-noi-ve', 'Nó nói về') + '</th></tr></thead><tbody>') +
        top
          .map(function (r) {
            var badge = r.namNay
              ? '<span class="cs-badge">' +
                (r.namNay === 'ca-hai' ? _tvmbT('js.cs.nam-nay-chieu-kep', 'năm nay chiếu kép') : r.namNay === 'tieu-han' ? _tvmbT('js.cs.tieu-han-nam-nay', 'tiểu hạn năm nay') : _tvmbT('js.cs.luu-nien-nam-nay', 'lưu niên năm nay')) +
                '</span>'
              : '';
            return (
              '<tr><td><b>' + esc(radarNhan(r)) + '</b> ' + badge + '<div class="cs-sub">' + esc(cungTen(r.cung)) +
              (r.sao.length ? ' · ' + esc(GS(r.sao)) : _tvmbT('js.cs.vo-chinh-dieu', ' · vô chính diệu')) + '</div></td>' +
              '<td class="cs-num">' + esc(r.diem) + '</td><td class="cs-sm">' + esc(LM('radar.', r.cung, r.y, '.y')) + '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>'
    );

    // Lộ trình
    h.push(
      ('<div class="cs-sec"><h3>' + _tvmbT('js.cs.bon-muoi-nam-di-lam-chia-90zk', 'Bốn mươi năm đi làm, chia làm bốn chặng') + '</h3>') +
        ('<p class="cs-note">' + _tvmbT('js.cs.bon-dai-van-lien-tiep-phu', 'Bốn đại vận liên tiếp phủ quãng đi làm. Điểm là điểm đại vận do engine chấm;') + ' ') +
        _tvmbT('js.cs.thuan-da-nguoc-da-la-so', '“thuận đà / ngược đà” là so tính âm–dương của đại vận với kiểu bản mệnh của bạn.</p>') +
        '<div class="cs-lo">' +
        ho.loTrinh
          .map(function (n) {
            return (
              '<div class="cs-nac' + (n.dangChay ? ' now' : '') + '">' +
              '<div class="cs-nac-top"><b>' + esc(LM('nac.', n.stt, n.nac)) + '</b>' + (n.dangChay ? ('<span class="cs-badge">' + _tvmbT('js.cs.dang-o-day', 'đang ở đây') + '</span>') : '') + '</div>' +
              '<div class="cs-sub">' + esc(n.tuoiStart) + '–' + esc(n.tuoiEnd) + _tvmbT('js.cs.tuoi', ' tuổi') +
              (n.namStart ? ' · ' + esc(n.namStart) + '–' + esc(n.namEnd) : '') +
              ' · ' + esc(cungTen(n.cung)) + (n.diem != null ? ' · <b>' + esc(n.diem) + '/10</b> ' + esc(n.flag) : '') + '</div>' +
              '<div class="cs-sub">' + (n.sao.length ? esc(GS(n.sao)) + (n.muon ? _tvmbT('js.cs.muon-xung-chieu', ' (mượn xung chiếu)') : '') : _tvmbT('js.cs.vo-chinh-dieu-pwt9', 'vô chính diệu')) +
              (n.hopMenh === null ? '' : n.hopMenh ? (' · <span class="cs-ok-t">' + _tvmbT('js.cs.thuan-da', 'thuận đà') + '</span>') : (' · <span class="cs-no-t">' + _tvmbT('js.cs.nguoc-da', 'ngược đà') + '</span>')) + '</div>' +
              '<p>' + esc(luanNac(n)) + '</p></div>'
            );
          })
          .join('') +
        '</div></div>'
    );

    // Ghép đội
    h.push(
      ('<div class="cs-sec"><h3>' + _tvmbT('js.cs.ghep-doi-ai-do-duoc-ban', 'Ghép đội — ai đỡ được bạn') + '</h3>') +
        ('<p class="cs-note">' + _tvmbT('js.cs.doc-theo-co-phap-phu-mau', 'Đọc theo cổ pháp: <b>Phụ Mẫu</b> là bề trên, <b>Huynh Đệ</b> là người ngang hàng,') + ' ') +
        _tvmbT('js.cs.no-boc-la-thuoc-ha-va', '<b>Nô Bộc</b> là thuộc hạ và bạn nghề. Luật bù là âm ghép dương.</p>') +
        '<div class="cs-grid">' +
        ho.doi
          .map(function (d) {
            return card(
              esc(LM('doi.', d.cung, d.vai)) + ' <span class="cs-sub">(' + esc(cungTen(d.cung)) + ')</span>',
              '<div class="cs-sub" style="margin-bottom:6px">' +
                (d.sao.length ? esc(GS(d.sao)) + (d.muon ? _tvmbT('js.cs.muon-xung-chieu', ' (mượn xung chiếu)') : '') : _tvmbT('js.cs.vo-chinh-dieu-pwt9', 'vô chính diệu')) +
                '</div>' + esc(goiYGhep(d))
            );
          })
          .join('') +
        '</div></div>'
    );

    // Cơ sở
    h.push(
      ('<div class="cs-sec"><h3>' + _tvmbT('js.cs.co-so-trong-la-so', 'Cơ sở trong lá số') + '</h3><div class="cs-basis">') +
        row(_tvmbT('js.cs.chinh-tinh-cung-menh', 'Chính tinh cung Mệnh'), (GS(ho.phan.saoMenh) || _tvmbT('js.cs.vo-chinh-dieu-pwt9', 'vô chính diệu')) + (ho.phan.muonMenh ? _tvmbT('js.cs.muon-cung-xung-chieu', ' — mượn cung xung chiếu') : '')) +
        row(_tvmbT('js.cs.chinh-tinh-cung-quan-loc', 'Chính tinh cung Quan Lộc'), (GS(ho.phan.saoQuan) || _tvmbT('js.cs.vo-chinh-dieu-pwt9', 'vô chính diệu')) + (ho.phan.muonQuan ? _tvmbT('js.cs.muon-cung-xung-chieu', ' — mượn cung xung chiếu') : '')) +
        row(_tvmbT('js.cs.toa-do', 'Toạ độ'), _tvmbT('js.cs.tranh-nhuong', 'tranh ↔ nhường: ') + ho.phan.x + _tvmbT('js.cs.xong-tram', ' · xông ↔ trầm: ') + ho.phan.y) +
        (ho.phan.vaiTro ? row(_tvmbT('js.cs.tu-cach-theo-cung-menh', 'Tư cách theo cung Mệnh'), PL(ho.vaiTroMa, ho.phan.vaiTro.role)) : '') +
        row(_tvmbT('js.cs.sao-quyet-dinh-linh-vuc', 'Sao quyết định lĩnh vực'), saoNganh(ho.nganh.sao) + (ho.nganh.laCap ? _tvmbT('js.cs.doc-theo-cap-dong-cung', ' — đọc theo CẶP đồng cung') : '') + (ho.nganh.muon ? _tvmbT('js.cs.muon-cung-xung-chieu', ' — mượn cung xung chiếu') : '')) +
        row(_tvmbT('js.cs.bac-chuc-phan', 'Bậc chức phận'), PL(ho.nganh.ma && ho.nganh.ma.tier, ho.nganh.bac) + _tvmbT('js.cs.diem', ' · điểm ') + ho.nganh.bacDiem + (ho.nganh.bacChiTiet.length ? ' (' + bdList(ho.nganh).join(', ') + ')' : '')) +
        row(_tvmbT('js.cs.chuc-phan-theo-loi-co', 'Chức phận theo lối cổ'), PL(ho.nganh.ma && ho.nganh.ma.desc, ho.nganh.chucPhanCo)) +
        row(_tvmbT('js.cs.trich-dan-co-thu', 'Trích dẫn cổ thư'), PL(ho.nganh.ma && ho.nganh.ma.src, ho.nganh.nguon)) +
        (ho.quanLoc.cachCuc.length ? row(_tvmbT('js.cs.cach-cuc-tai-cung-quan-loc', 'Cách cục tại cung Quan Lộc'), ho.quanLoc.cachCuc.join(' · ')) : '') +
        (ho.vanNam
          ? row(
              _tvmbT('js.cs.van-nam', 'Vận năm ') + ho.vanNam.nam,
              (ho.vanNam.diem != null ? ho.vanNam.diem + '/10 · ' : '') +
                _tvmbT('js.cs.tieu-han-o-cung', 'tiểu hạn ở cung ') + (G('cung', ho.vanNam.tieuHanCung) || '—') + _tvmbT('js.cs.luu-nien-o-cung', ' · lưu niên ở cung ') + (G('cung', ho.vanNam.luuNienCung) || '—')
            )
          : '') +
        row(_tvmbT('js.cs.nguon-cach-chia-bon-kieu', 'Nguồn cách chia bốn kiểu'), KF(ho.kieu, 'source', ho.kieu.source)) +
        '</div></div>'
    );

    return h.join('');
  }

  /** Bản gộp — dùng khi KHÔNG cần tách head/body (vd người đã đăng nhập). */
  function bangHTML(ho) {
    return headHTML(ho) + bodyHTML(ho);
  }

  function card(t, body) {
    return '<div class="cs-card"><b>' + t + '</b><div>' + body + '</div></div>';
  }
  function row(k, v) {
    return '<div class="cs-row"><span>' + esc(k) + '</span><div>' + esc(v) + '</div></div>';
  }

  // ── TẦNG NHÁNH (phần trả tiền) ─────────────────────────────
  // Chỉ dựng được khi payload đến từ POST — lượt GET tính thử KHÔNG mang
  // `hoSo.nhanh` (server gỡ bằng `hoSoTinhThu`). Nên hàm này tự trả '' nếu
  // không có dữ liệu, thay vì dựng khung rỗng trông như hỏng.
  function nhanhHTML(ho) {
    var nh = ho && ho.nhanh;
    if (!nh || !nh.goiY || !nh.goiY.length) return '';
    var dom = ho.nganh && ho.nganh.domainMa; // khoá nhánh = <lĩnh vực>.<id>
    var h = [];

    h.push(('<div class="cs-sec"><h3>' + _tvmbT('js.cs.nhanh-nghe-hop-voi-ban', 'Nhánh nghề hợp với bạn') + '</h3>'));
    h.push(
      ('<p class="cs-note">' + _tvmbT('js.cs.ba-tang-o-tren-noi-ban', 'Ba tầng ở trên nói bạn hợp <b>lĩnh vực</b> nào và') + ' ') +
        _tvmbT('js.cs.o-quy-mo-nao-phan-nay', 'ở <b>quy mô</b> nào. Phần này nói <b>nhánh cụ thể</b> bên trong lĩnh vực đó — ') +
        _tvmbT('js.cs.cung-mot-nganh-nhung-moi-nhanh', 'cùng một ngành nhưng mỗi nhánh cần một chất người khác hẳn.</p>')
    );

    if (nh.moNhat) {
      h.push(
        ('<div class="cs-warn">' + _tvmbT('js.cs.la-so-cua-ban-khong-chi', 'Lá số của bạn <b>không chỉ ra một nhánh nào nổi bật</b>') + ' ') +
          _tvmbT('js.cs.trong-linh-vuc-nay-noi-thang', 'trong lĩnh vực này. Nói thẳng là chưa đủ tín hiệu để chốt — phần dưới chỉ là ') +
          _tvmbT('js.cs.huong-tham-khao-dung-doc-nhu', 'hướng tham khảo, đừng đọc như một lời khẳng định.</div>')
      );
    }
    if (nh.lechBac) {
      h.push(
        ('<div class="cs-warn">' + _tvmbT('js.cs.cac-nhanh-duoi-day-hop-voi', 'Các nhánh dưới đây hợp với <b>chất người</b> của bạn nhưng') + ' ') +
          _tvmbT('js.cs.chua-khop-bac-chuc-phan-hien', '<b>chưa khớp bậc chức phận hiện tại</b>. Đọc chúng như HƯỚNG ĐI, không phải chỗ ') +
          _tvmbT('js.cs.dung-ngay-bay-gio', 'đứng ngay bây giờ.</div>')
      );
    }

    nh.goiY.forEach(function (g, i) {
      h.push(
        '<div class="cs-nhanh' + (g.phoThong ? ' cs-nhanh-pt' : '') + '">' +
          '<div class="cs-nhanh-top">' +
            '<span class="cs-nhanh-ten">' + (i + 1) + '. ' + esc(NN('nhanh.' + dom + '.' + g.id + '.ten', g.ten)) + '</span>' +
            // Nhánh phổ thông KHÔNG hiện % — con số ở đó vô nghĩa vì nghề không
            // đòi một chất người đặc thù nào, bày ra là giả vờ có kết luận.
            (g.phoThong ? '' : ('<span class="cs-nhanh-diem">' + _tvmbT('js.cs.khop', 'khớp') + ' ') + esc(String(g.diem)) + '%</span>') +
          '</div>' +
          '<div class="cs-nhanh-chat">' + esc(NN('nhanh.' + dom + '.' + g.id + '.chat', g.chat)) + '</div>' +
          (g.vi && g.vi.length
            ? ('<div class="cs-nhanh-vi">' + _tvmbT('js.cs.vi-sao-hop', '<b>Vì sao hợp:</b>') + ' ') + g.vi.map(function (v, k) {
                var id = g.viMa && g.viMa[k];
                var tt = id && NN('truc.' + id + '.ten', null);
                var tc = id && NN('truc.' + id + '.cao', null);
                return esc(tt != null && tc != null ? tt + ' — ' + tc : v);
              }).join(' · ') + '</div>'
            : '') +
          '<ul class="cs-nganh">' + g.viec.map(function (v, k) { return '<li>' + esc(NN('nhanh.' + dom + '.' + g.id + '.viec.' + k, v)) + '</li>'; }).join('') + '</ul>' +
          (g.hopBac ? '' : ('<div class="cs-nhanh-bac">' + _tvmbT('js.cs.nhanh-nay-thuong-o-bac-khac', 'Nhánh này thường ở bậc khác với bậc chức phận lá số đang chỉ ra.') + '</div>')) +
        '</div>'
      );
    });

    if (nh.chatNguoi && nh.chatNguoi.length) {
      h.push(
        '<div class="cs-grid">' +
          row(_tvmbT('js.cs.chat-nguoi-noi-bat', 'Chất người nổi bật'), nh.chatNguoi.map(function (t) { return trucTen(t.id, t.ten, 'ten') + ' — ' + trucTen(t.id, t.cao, 'cao'); }).join(' · ')) +
          // ⚠️ Nhãn PHẢI là "nghề không đòi hỏi", KHÔNG được viết thành "bạn
          // thiếu". Đây là chỗ duy nhất trong tool có thể xúc phạm người dùng
          // bằng một dòng nhãn, và không test nào bắt được.
          (nh.neTranh && nh.neTranh.length
            ? row(_tvmbT('js.cs.nghe-hop-voi-ban-thuong-khong', 'Nghề hợp với bạn thường KHÔNG đòi hỏi'), nh.neTranh.map(function (t) { return trucTen(t.id, t.ten, 'ten') + ' — ' + trucTen(t.id, t.thap, 'thap'); }).join(' · '))
            : '') +
        '</div>'
      );
    }

    h.push(
      // "tvmb-src-note" + data-share-skip: đánh dấu để shell.js không tự chèn
      // chồng thêm một khối nguồn thứ hai (xem `maybeAppendSrcNote` trong
      // shell.js), và loại khối này khỏi bản chia sẻ tự suy.
      ('<p class="cs-note tvmb-src-note" data-share-skip>' + _tvmbT('js.cs.nguon-theo-tu-vi-dau-so', '📚 <b>Nguồn:</b> Theo <i>Tử Vi Đẩu Số Tân Biên</i>') + ' ') +
        _tvmbT('js.cs.van-dang-thai-thu-lang-va', '(Vân Đằng Thái Thứ Lang) và <i>Trung Châu Phái — Lục Thập Tinh Hệ</i> (Vương Đình Chi). ') +
        _tvmbT('js.cs.bon-kieu-nguoi-va-cach-goi', 'Bốn kiểu người và cách gợi ngành là phương pháp riêng do <b>đội ngũ chuyên gia Tử Vi Minh Bảo</b> xây dựng.<br><br>') +
        _tvmbT('js.cs.con-so-phan-tram-la-do', 'Con số phần trăm là độ <b>khớp giữa chất người và chất việc</b>, ') +
        _tvmbT('js.cs.khong-phai-kha-nang-thanh-cong', '<b>không phải</b> khả năng thành công. Danh sách nghề là quy chiếu của trang cho ') +
        _tvmbT('js.cs.boi-canh-viet-nam-dang-lam', 'bối cảnh Việt Nam; đang làm nghề không có trong danh sách thì đối chiếu theo ') +
        _tvmbT('js.cs.chat-viec-dung-doc-thanh-ban', '<b>chất việc</b>, đừng đọc thành “bạn đang làm sai nghề”. ') +
        // Đường dẫn ghi công — giấy phép CC BY của bộ dữ liệu dùng để CHẤM đòi
        // ghi công, nhưng bản đọc KHÔNG nêu tên nguồn (xem CLAUDE.md). Một link
        // ở cuối phần là chỗ đúng: không chen vào nội dung, mà vẫn có đường tới.
        ('<a href="/nguon-du-lieu.html" target="_blank" rel="noopener">' + _tvmbT('js.cs.nguon-du-lieu', 'Nguồn dữ liệu →') + '</a></p></div>')
    );
    return h.join('');
  }

  // ── Gọi API ────────────────────────────────────────────────
  function lap(p) {
    var q = new URLSearchParams({
      d: p.ngay, m: p.thang, y: p.nam, gio: p.gio,
      gt: p.gioiTinh === 'nu' ? 'nu' : 'nam',
      am: p.amLich ? '1' : '0',
      tt: p.trangThai || 'nhan-vien',
    });
    return fetch('/api/cong-so?' + q.toString())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.ok ? j : null; })
      .catch(function () { return null; });
  }

  /**
   * Mở TẦNG NHÁNH — đường TRẢ TIỀN. POST chứ không GET vì lượt này động tới ví.
   * `slug` PHẢI bắt đầu bằng đúng `cong-so`: `hasRecentToolPayment` lọc
   * `slug=like.<tool_id>*`, slug ngắn hơn thì lưới đỡ "đã trả tiền mà vẫn ăn
   * 402" chết im lặng — đã trả giá một lần ở Duyên Nợ.
   */
  function moNhanh(p, slug, token) {
    var head = { 'Content-Type': 'application/json' };
    if (token) head.Authorization = 'Bearer ' + token;
    return fetch('/api/cong-so', {
      method: 'POST',
      headers: head,
      body: JSON.stringify({
        d: p.ngay, m: p.thang, y: p.nam, gio: p.gio,
        gt: p.gioiTinh === 'nu' ? 'nu' : 'nam',
        am: p.amLich ? '1' : '0',
        tt: p.trangThai || 'nhan-vien',
        slug: slug,
      }),
    }).then(function (r) {
      return r.json().then(function (j) {
        // Trả cả status để trang phân biệt "chưa trả tiền" (402 → dựng lại
        // tường) với lỗi thật (500 → báo lỗi). Nuốt hết thành null là người
        // dùng vừa trả tiền xong lại thấy một câu lỗi chung chung.
        return { ok: r.ok && j && j.ok, status: r.status, data: j };
      });
    });
  }

  window.CongSoTool = {
    lap: lap,
    kieuTen: kieuTen,
    moNhanh: moNhanh,
    headHTML: headHTML,
    bodyHTML: bodyHTML,
    bangHTML: bangHTML,
    nhanhHTML: nhanhHTML,
    veToaDoCanvas: veToaDoCanvas,
    veRadarCanvas: veRadarCanvas,
    posterDraw: posterDraw,
    MAU: KIEU_MAU,
  };
})();
