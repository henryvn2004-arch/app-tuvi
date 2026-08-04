/* ============================================================
   tools-shared/ky-mon.js — KỲ MÔN ĐỘN GIÁP: bàn 9 cung.
   Nguồn DUY NHẤT: dùng chung /tools/ky-mon.html VÀ shell /app/ky-mon.

   ⚠️ KHÁC MỌI MODULE tools-shared KHÁC: module này KHÔNG tự tính. Bàn Kỳ Môn
   dựng ở SERVER (`/api/qimen` → `lib/qimen/board.ts`) vì định cục cần tiết khí
   thật, phù đầu, thượng/trung/hạ nguyên — chép sang vanilla JS là gần như chắc
   chắn sai ở đâu đó mà bàn VẪN RA, không cách nào phát hiện. Ở đây chỉ vẽ.

   Bàn vẽ theo Lạc Thư với NAM Ở TRÊN (lối vẽ cổ), thứ tự lấy từ `luoi` do
   server trả — không viết cứng ở client để hai bên không trôi khỏi nhau.

   API: window.KyMonTool = { boardHTML, chiTietHTML, posterDraw, posterOpts }
   ============================================================ */
(function (root) {
  'use strict';

  var MUC_MAU = { cat: '#2F7D52', hung: '#A33B2A', binh: '#8A8F98' };
  var MUC_NHAN = { cat: 'Cát', hung: 'Tránh', binh: 'Bình' };
  var HANH_MAU = { Kim: '#C9A84C', Mộc: '#4E9A6A', Thủy: '#3E7CB1', Hỏa: '#C0553F', Thổ: '#A98352' };

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function _byId(b) {
    var m = {};
    (b.cungs || []).forEach(function (c) { m[c.so] = c; });
    return m;
  }

  /** Lưới 3×3. Nam ở trên — có nhãn nói rõ, vì người quen bản đồ sẽ đọc nhầm. */
  function boardHTML(b) {
    if (!b || !b.ok) return '';
    var m = _byId(b);
    var cells = (b.luoi || []).map(function (so) {
      var c = m[so];
      if (!c) return '<div class="km-o km-trong"></div>';
      var giua = so === 5;
      var mau = MUC_MAU[c.muc];
      return (
        '<div class="km-o km-' + c.muc + (giua ? ' km-giua' : '') + '" style="--km-mau:' + mau + '">' +
        '<div class="km-o-top">' +
        '<span class="km-huong">' + _esc(c.huong) + '</span>' +
        (giua ? '' : '<span class="km-hang">#' + c.hang + '</span>') +
        '</div>' +
        (c.cua
          ? '<div class="km-cua" style="color:' + MUC_MAU[c.cua.muc] + '">' + _esc(c.cua.ten) + '</div>'
          : '<div class="km-cua km-khong">không cửa</div>') +
        '<div class="km-dong">' +
        (c.sao ? '<span class="km-sao">' + _esc(c.sao.ten) + '</span>' : '') +
        (c.than ? '<span class="km-than">' + _esc(c.than.ten) + '</span>' : '') +
        '</div>' +
        '<div class="km-can">' +
        (c.canThien ? '<b>' + _esc(c.canThien) + '</b>' : '') +
        (c.canDia ? '<i>' + _esc(c.canDia) + '</i>' : '') +
        (c.tamKy ? '<span class="km-ky">' + _esc(c.tamKy) + '</span>' : '') +
        '</div>' +
        '<div class="km-cung">' + _esc(c.ten) + ' · ' + _esc(c.hanh) + '</div>' +
        '</div>'
      );
    });
    return (
      '<div class="km-ban">' + cells.join('') + '</div>' +
      '<div class="km-chu">Bàn vẽ theo Lạc Thư, <b>Nam ở trên</b> — đúng lối vẽ cổ pháp, ngược với bản đồ thường. ' +
      'Mỗi ô: cửa (dòng lớn) · sao thiên bàn và thần · can thiên bàn (<b>đậm</b>) trên can địa bàn (<i>nghiêng</i>). ' +
      '<b>#n</b> là thứ hạng tương đối trong chín cung, không phải phán cát hung.</div>'
    );
  }

  /** Bảng xếp hạng + lý do, đặt dưới bàn. */
  function chiTietHTML(b) {
    if (!b || !b.ok) return '';
    var xep = (b.cungs || []).filter(function (c) { return c.so !== 5; })
      .sort(function (x, y) { return x.hang - y.hang; });
    var rows = xep.map(function (c) {
      return (
        '<tr class="km-r-' + c.muc + '">' +
        '<td class="km-t-hang">' + c.hang + '</td>' +
        '<td><b>' + _esc(c.huong) + '</b><span class="km-t-cung">' + _esc(c.ten) + '</span></td>' +
        '<td>' + (c.cua ? _esc(c.cua.ten) : '—') + '</td>' +
        '<td class="km-t-diem">' + (c.diem > 0 ? '+' : '') + c.diem + '</td>' +
        '<td><span class="km-pill" style="background:' + MUC_MAU[c.muc] + '">' + MUC_NHAN[c.muc] + '</span></td>' +
        '<td class="km-t-ly">' + (c.viec ? _esc(c.viec) + '. ' : '') +
        (c.lyDo || []).map(function (l) {
          return '<span class="km-ly" style="border-color:' + MUC_MAU[l.muc] + ';color:' + MUC_MAU[l.muc] + '">' + _esc(l.ten) + '</span>';
        }).join('') + '</td>' +
        '</tr>'
      );
    }).join('');
    return (
      '<div class="km-bang-wrap"><table class="km-bang">' +
      '<thead><tr><th>#</th><th>Hướng</th><th>Cửa</th><th>Điểm</th><th>Engine</th><th>Vì sao</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<div class="km-chu">Cột <b>Engine</b> là phán quyết cát/hung của thuật toán cổ pháp. Cột <b>Điểm</b> là xếp hạng ' +
      'tương đối do trang tính, để luôn chỉ ra được hướng đỡ nhất — công thức: cửa cát +3 / hung −3, sao và thần ±2, ' +
      'Tam Kỳ +2, mỗi cát cách +1 và mỗi hung cách −1. Đo trên 366 bàn cả năm thì chỉ 26,5% số bàn có cung được engine ' +
      'chấm cát, nên nếu chỉ đọc cột Engine thì phần lớn thời gian bàn nói "đi đâu cũng xấu".</div>'
    );
  }

  // ── Ảnh chia sẻ ─────────────────────────────────────────────────────────
  /** Trả `draw(ctx, box)` vẽ bàn 9 cung vào vùng nghệ thuật của Poster. */
  function posterDraw(b) {
    var T = (root.Poster && root.Poster.THEME) || {};
    var NAVY = T.NAVY || '#061A2E';
    var GOLD = T.GOLD || '#C9A84C';
    var SERIF = T.SERIF || 'Georgia, serif';
    var SANS = T.SANS || 'system-ui, sans-serif';
    var m = _byId(b);

    return function (ctx, box) {
      ctx.fillStyle = NAVY;
      ctx.fillRect(box.x, box.y, box.w, box.h);

      var pad = 62;
      var head = 108;
      var side = box.w - pad * 2;
      var cell = side / 3;
      var top = box.y + head + 46;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Nhãn "NAM Ở TRÊN" — không có nó thì người xem ảnh đọc ngược bàn.
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '600 26px ' + SANS;
      ctx.fillText('NAM', box.x + box.w / 2, box.y + head - 6);

      (b.luoi || []).forEach(function (so, i) {
        var c = m[so];
        var cx = box.x + pad + (i % 3) * cell;
        var cy = top + Math.floor(i / 3) * cell;
        var giua = so === 5;
        var mau = c ? MUC_MAU[c.muc] : MUC_MAU.binh;

        // Nền ô: tô theo cát/hung nhưng RẤT nhạt — đậm lên thì chữ trắng trên
        // đỏ/xanh mất tương phản, mà ảnh này người ta xem trên màn hình bé.
        ctx.fillStyle = giua ? 'rgba(255,255,255,0.04)' : mau === MUC_MAU.cat ? 'rgba(47,125,82,0.24)'
          : mau === MUC_MAU.hung ? 'rgba(163,59,42,0.20)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(cx + 4, cy + 4, cell - 8, cell - 8);
        ctx.strokeStyle = 'rgba(201,168,76,0.34)';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 4, cy + 4, cell - 8, cell - 8);

        if (!c) return;
        var mid = cx + cell / 2;

        ctx.fillStyle = 'rgba(255,255,255,0.56)';
        ctx.font = '600 23px ' + SANS;
        ctx.fillText(c.huong, mid, cy + 46);

        if (giua) {
          ctx.fillStyle = 'rgba(255,255,255,0.34)';
          ctx.font = '400 25px ' + SANS;
          ctx.fillText('Trung cung', mid, cy + cell / 2 + 12);
          return;
        }

        ctx.fillStyle = c.cua ? MUC_MAU[c.cua.muc] : 'rgba(255,255,255,0.4)';
        ctx.font = '700 40px ' + SERIF;
        ctx.fillText(c.cua ? c.cua.ten : '—', mid, cy + 100);

        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = '400 24px ' + SANS;
        ctx.fillText((c.sao ? c.sao.ten : '') + (c.than ? ' · ' + c.than.ten : ''), mid, cy + 138);

        ctx.fillStyle = c.tamKy ? GOLD : 'rgba(255,255,255,0.45)';
        ctx.font = (c.tamKy ? '700 ' : '400 ') + '24px ' + SANS;
        ctx.fillText(
          (c.canThien || '') + (c.canDia ? '/' + c.canDia : '') + (c.tamKy ? ' ' + c.tamKy : ''),
          mid, cy + 174
        );
      });
    };
  }

  function posterOpts(b) {
    var doNhat = (b.cungs || []).filter(function (c) { return c.hang === 1; })[0];
    var T = (root.Poster && root.Poster.THEME) || {};
    return {
      title: 'Kỳ Môn — ' + b.cuc,
      subtitle: b.tietKhi + ' ' + b.nguyen + ' · giờ ' + b.canChi.gio + ' ngày ' + b.canChi.ngay,
      quote: doNhat
        ? 'Hướng đỡ nhất canh giờ này: ' + doNhat.huong + ' — cửa ' + (doNhat.cua ? doNhat.cua.ten : '—') +
          (doNhat.cua ? ', ' + doNhat.cua.nghia.toLowerCase() : '') + '.'
        : '',
      fonts: ['700 40px ' + (T.SERIF || 'serif'), '600 23px ' + (T.SANS || 'sans-serif')],
    };
  }

  var API = { boardHTML: boardHTML, chiTietHTML: chiTietHTML, posterDraw: posterDraw, posterOpts: posterOpts, MUC_MAU: MUC_MAU, HANH_MAU: HANH_MAU };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.KyMonTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
