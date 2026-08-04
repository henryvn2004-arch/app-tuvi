/* ============================================================
   tools-shared/ban-do-sao.js — vẽ BÁNH XE bản đồ sao (natal chart).
   Nguồn DUY NHẤT: dùng chung /tools/ban-do-sao.html VÀ shell /app/ban-do-sao.

   🔑 VÌ SAO TOOL NÀY ĐƯỢC CHỌN LÀM: cả track "ưu tiên tool có ảnh" nhắm loại
   ảnh DETERMINISTIC — vẽ bằng canvas ngay tại máy người dùng, 0 đồng, không
   qua model sinh ảnh, không đụng cầu dao `viral.free_gen_daily_cap`. Bánh xe
   natal là hình ảnh dễ nhận ra nhất của chiêm tinh Tây, và nó đọc được trong
   một giây kể cả với người không biết gì.

   Vẽ ở đây, tải về qua chế độ `draw` của `poster.js` (thêm ở S0) — cũng chính
   là lý do chế độ đó tồn tại.

   ⚠️ Hàm vẽ cho `poster.js` phải ĐỒNG BỘ. Không nạp ảnh, không await.
   ============================================================ */
(function () {
  var TAU = Math.PI * 2;
  var CUNG_KH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  // Màu theo NGUYÊN TỐ của cung — người đọc nhận ra nhóm ngay cả khi không biết
  // ký hiệu nào là cung nào.
  var HANH_MAU = ['#C0392B', '#6B8E4E', '#C9A227', '#2E6DA4'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * Đổi kinh độ hoàng đạo → góc vẽ trên canvas.
   * Quy ước chuẩn của bánh xe natal: CUNG MỌC nằm bên TRÁI (9 giờ) và các cung
   * chạy NGƯỢC chiều kim đồng hồ. Vẽ sai chiều thì bản đồ nhìn vẫn đẹp mà mọi
   * nhà đều lộn — không ai phát hiện bằng mắt.
   */
  function goc(kinhDo, ascKinhDo) {
    return ((180 - (kinhDo - ascKinhDo)) * Math.PI) / 180;
  }

  function toaDo(cx, cy, r, a) {
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  }

  /**
   * Vẽ bánh xe vào `ctx` trong khung vuông {x,y,w,h}.
   * `b` là `banDo` từ /api/natal. `opts.nen` = màu nền (poster dùng navy).
   */
  function veBanhXe(ctx, box, b, opts) {
    opts = opts || {};
    var toi = !!opts.toiNen;
    var mucChu = toi ? '#F4EBD6' : '#12263A';
    var mucMo = toi ? 'rgba(244,235,214,.45)' : 'rgba(18,38,58,.4)';
    var vien = toi ? 'rgba(244,235,214,.30)' : 'rgba(18,38,58,.18)';

    var size = Math.min(box.w, box.h);
    var cx = box.x + box.w / 2;
    var cy = box.y + box.h / 2;
    var R = size / 2 - size * 0.03;
    var rCung = R * 0.86; // vành trong của vòng cung hoàng đạo
    var rSao = R * 0.7; // vòng đặt hành tinh
    var rNha = R * 0.44; // vòng số nhà
    var rGoc = R * 0.4; // bán kính vẽ đường góc chiếu

    var asc = 0;
    for (var i = 0; i < (b.truc || []).length; i++) {
      if (b.truc[i].ten.indexOf('Cung Mọc') === 0) asc = b.truc[i].kinhDo;
    }

    ctx.save();
    ctx.lineCap = 'butt';

    // ── vành 12 cung hoàng đạo ──
    for (var s = 0; s < 12; s++) {
      var a1 = goc(s * 30, asc);
      var a2 = goc(s * 30 + 30, asc);
      ctx.beginPath();
      // cung đi ngược chiều kim đồng hồ trên màn hình ⇒ dùng anticlockwise=true
      ctx.arc(cx, cy, (R + rCung) / 2, -a1, -a2, true);
      ctx.strokeStyle = HANH_MAU[s % 4];
      ctx.globalAlpha = toi ? 0.55 : 0.4;
      ctx.lineWidth = R - rCung;
      ctx.stroke();
      ctx.globalAlpha = 1;

      var am = goc(s * 30 + 15, asc);
      var p = toaDo(cx, cy, (R + rCung) / 2, am);
      ctx.fillStyle = toi ? '#F4EBD6' : '#12263A';
      ctx.font = Math.round(size * 0.045) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(CUNG_KH[s], p[0], p[1]);
    }

    // ── vòng tròn ──
    [R, rCung, rSao, rNha].forEach(function (r) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.strokeStyle = vien;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // ── vạch đầu 12 nhà + số nhà ──
    (b.nha || []).forEach(function (h) {
      var a = goc(h.kinhDo, asc);
      var p1 = toaDo(cx, cy, rNha, a);
      var p2 = toaDo(cx, cy, rCung, a);
      var truc = h.so === 1 || h.so === 4 || h.so === 7 || h.so === 10;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = truc ? (toi ? '#C9A227' : '#B8912B') : vien;
      ctx.lineWidth = truc ? 2 : 1;
      ctx.stroke();
    });
    (b.nha || []).forEach(function (h, i) {
      var next = (b.nha[(i + 1) % 12] || h).kinhDo;
      var giua = h.kinhDo + (((next - h.kinhDo) % 360) + 360) % 360 / 2;
      var p = toaDo(cx, cy, rNha * 0.82, goc(giua, asc));
      ctx.fillStyle = mucMo;
      ctx.font = Math.round(size * 0.028) + 'px sans-serif';
      ctx.fillText(String(h.so), p[0], p[1]);
    });

    // ── đường góc chiếu (chỉ những góc mạnh, nếu không thì rối như tơ vò) ──
    (b.gocChieu || []).forEach(function (g) {
      if (g.manh < 55) return;
      var s1 = timSao(b, g.a);
      var s2 = timSao(b, g.b);
      if (!s1 || !s2) return;
      var p1 = toaDo(cx, cy, rGoc, goc(s1.kinhDo, asc));
      var p2 = toaDo(cx, cy, rGoc, goc(s2.kinhDo, asc));
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.strokeStyle = g.muc === 'cang' ? 'rgba(192,57,43,.55)' : g.muc === 'hoa' ? 'rgba(46,109,164,.55)' : mucMo;
      ctx.lineWidth = 1 + (g.manh - 55) / 45;
      ctx.stroke();
    });

    // ── hành tinh ──
    var datCho = [];
    (b.sao || []).concat(b.giaoDiem || []).forEach(function (sao) {
      var a = goc(sao.kinhDo, asc);
      // tránh chồng ký hiệu: nếu đã có sao rất gần thì đẩy ra ngoài một nấc
      var r = rSao;
      for (var k = 0; k < datCho.length; k++) {
        if (Math.abs(chenhLech(datCho[k].kd, sao.kinhDo)) < 6 && Math.abs(datCho[k].r - r) < 1) {
          r = rSao + size * 0.045;
        }
      }
      datCho.push({ kd: sao.kinhDo, r: r });
      var p = toaDo(cx, cy, r, a);
      ctx.fillStyle = sao.chinh ? mucChu : mucMo;
      ctx.font = Math.round(size * (sao.chinh ? 0.05 : 0.036)) + 'px serif';
      ctx.fillText(sao.kyHieu || '•', p[0], p[1]);
      if (sao.nghich) {
        var pr = toaDo(cx, cy, r - size * 0.032, a);
        ctx.font = Math.round(size * 0.022) + 'px sans-serif';
        ctx.fillStyle = toi ? 'rgba(201,162,39,.9)' : '#B8912B';
        ctx.fillText('℞', pr[0], pr[1]);
      }
      // vạch nhỏ chỉ đúng độ trên vành cung
      var q1 = toaDo(cx, cy, rCung, a);
      var q2 = toaDo(cx, cy, rCung - size * 0.018, a);
      ctx.beginPath();
      ctx.moveTo(q1[0], q1[1]);
      ctx.lineTo(q2[0], q2[1]);
      ctx.strokeStyle = mucMo;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // ── nhãn 4 trục ──
    (b.truc || []).forEach(function (t) {
      var nhan = t.ten.indexOf('Cung Mọc') === 0 ? 'ASC' : t.ten.indexOf('Thiên Đỉnh') === 0 ? 'MC'
        : t.ten.indexOf('Cung Lặn') === 0 ? 'DSC' : 'IC';
      var p = toaDo(cx, cy, R + size * 0.018, goc(t.kinhDo, asc));
      ctx.fillStyle = toi ? '#C9A227' : '#B8912B';
      ctx.font = '700 ' + Math.round(size * 0.026) + 'px sans-serif';
      ctx.fillText(nhan, p[0], p[1]);
    });

    ctx.restore();
  }

  function chenhLech(a, b) {
    var d = (((a - b) % 360) + 540) % 360 - 180;
    return d;
  }

  function timSao(b, ten) {
    var all = (b.sao || []).concat(b.giaoDiem || []);
    for (var i = 0; i < all.length; i++) if (all[i].ten === ten) return all[i];
    return null;
  }

  /** Vẽ vào một <canvas> trên trang (chế độ sáng). */
  function veVaoCanvas(canvas, b) {
    if (!canvas || !b) return;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 520;
    canvas.width = w * dpr;
    canvas.height = w * dpr;
    canvas.style.height = w + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, w);
    veBanhXe(ctx, { x: 0, y: 0, w: w, h: w }, b, { toiNen: false });
  }

  /** Hàm vẽ ĐỒNG BỘ cho `Poster.download` (nền navy ⇒ chế độ tối). */
  function posterDraw(b) {
    return function (ctx, box) {
      veBanhXe(ctx, box, b, { toiNen: true });
    };
  }

  /** Bảng chi tiết dưới bánh xe. */
  function bangHTML(b) {
    var o = [];
    var H = function (t) {
      return '<div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-lt,#8a8f98);margin:18px 0 8px">' + esc(t) + '</div>';
    };
    o.push(H('Bốn trục'));
    o.push('<div style="font-size:13px;line-height:1.9;color:var(--text-mid,#4a5058)">' +
      (b.truc || []).map(function (t) {
        return '<div><b>' + esc(t.ten) + '</b> — ' + esc(t.do) + '° ' + esc(t.cung) + ' · <span style="color:var(--text-lt,#8a8f98)">' + esc(t.nghia) + '</span></div>';
      }).join('') + '</div>');

    o.push(H('Hành tinh'));
    o.push('<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px">' +
      (b.sao || []).map(function (s) {
        return '<div style="padding:9px 11px;border:1px solid var(--border-lt,#e3e5e8);border-radius:6px' + (s.chinh ? '' : ';opacity:.7') + '">' +
          '<div style="font-size:14px;font-weight:700;color:var(--navy,#061A2E)">' + esc(s.kyHieu) + ' ' + esc(s.ten) +
          (s.nghich ? ' <span style="color:#B8912B;font-size:11px">℞ nghịch</span>' : '') + '</div>' +
          '<div style="font-size:12px;color:var(--text-mid,#4a5058)">' + esc(s.do) + '°' + esc(s.phut) + "' " + esc(s.cung) +
          ' · nhà ' + esc(s.nha == null ? '?' : s.nha) + (s.pham ? ' · ' + esc(s.pham) : '') + '</div>' +
          (s.nghia ? '<div style="font-size:10.5px;color:var(--text-lt,#8a8f98);line-height:1.45;margin-top:3px">' + esc(s.nghia) + '</div>' : '') +
          '</div>';
      }).join('') + '</div>');

    if ((b.gocChieu || []).length) {
      o.push(H('Góc chiếu nổi bật'));
      o.push('<div style="font-size:12.5px;line-height:1.8;color:var(--text-mid,#4a5058)">' +
        b.gocChieu.slice(0, 12).map(function (g) {
          var mau = g.muc === 'cang' ? '#C0392B' : g.muc === 'hoa' ? '#2E6DA4' : '#6b5b2e';
          return '<div><b>' + esc(g.a) + '</b> <span style="color:' + mau + '">' + esc(g.kyHieu) + ' ' + esc(g.loai) + '</span> <b>' + esc(g.b) + '</b>' +
            ' <span style="color:var(--text-lt,#8a8f98)">(lệch ' + esc(g.lech) + '°, mạnh ' + esc(g.manh) + '%) — ' + esc(g.nghia) + '</span></div>';
        }).join('') + '</div>');
    }
    if ((b.hinhThe || []).length) {
      o.push(H('Hình thế'));
      o.push('<div style="font-size:12.5px;line-height:1.8;color:var(--text-mid,#4a5058)">' +
        b.hinhThe.map(function (h) {
          return '<div><b>' + esc(h.ten) + '</b> [' + esc(h.sao.join(', ')) + '] — <span style="color:var(--text-lt,#8a8f98)">' + esc(h.nghia) + '</span></div>';
        }).join('') + '</div>');
    }
    o.push(H('Cân bằng'));
    o.push('<div style="font-size:12.5px;line-height:1.9;color:var(--text-mid,#4a5058)">' +
      '<div><b>Nguyên tố:</b> ' + esc((b.canBang.hanh || []).map(function (x) { return x.ten + ' ' + x.so; }).join(' · ')) + '</div>' +
      '<div><b>Thể:</b> ' + esc((b.canBang.the || []).map(function (x) { return x.ten + ' ' + x.so; }).join(' · ')) + '</div>' +
      '<div><b>Bán cầu:</b> ' + esc((b.canBang.banCau || []).map(function (x) { return x.ten + ' ' + x.so; }).join(' · ')) + '</div>' +
      '<div><b>Nghịch hành:</b> ' + esc((b.canBang.nghich || []).join(', ') || 'không có') + '</div></div>');
    return o.join('');
  }

  function lap(p) {
    var q = ['d=' + p.ngay, 'm=' + p.thang, 'y=' + p.nam, 'h=' + p.gio, 'mi=' + p.phut,
      'lat=' + p.vido, 'lon=' + p.kinhdo, 'tz=' + p.muiGio].join('&');
    return fetch('/api/natal?' + q)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.ok ? j : null; })
      .catch(function () { return null; });
  }

  window.BanDoSao = {
    lap: lap, veVaoCanvas: veVaoCanvas, posterDraw: posterDraw, bangHTML: bangHTML, veBanhXe: veBanhXe,
  };
})();
