/**
 * hook-charts.js — Tử Vi Minh Bảo
 * 4 khối trực quan cho tầng hook (xem docs/nhat-ky/README.md mục "Tầng hook —
 * workplan"): lifeArc, hexRadar, rarityDots, percentileBar.
 *
 * CỐ Ý không phụ thuộc Chart.js hay thư viện nào — mỗi hàm trả về một chuỗi
 * <svg> dựng bằng tay, ăn theo ĐÚNG biến màu của shell.css (`var(--red)`,
 * `var(--gold-soft)`, `var(--green)`, `var(--text-lt)`, `var(--line-2)`...)
 * nên tự đổi sáng/tối theo theme mà không cần khai lại màu ở đây. Chart.js@4
 * qua CDN chỉ nằm ở 4 trang cần biểu đồ tương tác sâu hơn (đường đại vận có
 * tooltip) — khối hook là teaser tĩnh phía TRÊN, không thay nó.
 *
 * QUY TẮC: hàm ở đây CHỈ vẽ. Không tự tính điểm/hạng/độ hiếm — số liệu do
 * `hook-facts.js` hoặc field `hook` từ API cấp. Vi phạm quy tắc này là lặp
 * lại đúng lỗi "LLM/UI tự bịa số" mà CLAUDE.md đã cấm.
 */
window.HookCharts = (function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Cờ engine (🔴🟡🟢, xem `scoreDaiVan()` trong tuvi-ansao-engine.js) → biến
  // màu shell.css. KHÔNG hardcode hex — 3 tông có sẵn trong bộ thương hiệu,
  // không cần bịa thêm "amber" hay tông nào khác.
  function flagColor(flag) {
    // 🔴 --tx-green/--tx-red chứ KHÔNG phải --green/--red. Hai bộ này TRÙNG
    // GIÁ TRỊ ở light (#1E6B3C / #C0392B) nên đổi sang không dịch một pixel
    // nào ở chế độ sáng — nhưng ở dark chỉ bộ --tx-* mới có bản sáng lên
    // (#5FBF87 / #F08A7A), còn --green giữ nguyên #1E6B3C và tô lên thẻ tối
    // thì đọc ra ĐEN. Đã thấy tận mắt trên `stageTimeline`: ba cột 7.5 · 7.4 ·
    // 8.1 ra đen sì trong khi 4.6 · 4.2 vẫn vàng. `lifeArc` dính cùng lỗi từ
    // trước, cùng hàm này nên vá một chỗ là hết cả hai. Cảnh báo đã ghi sẵn ở
    // đầu shell.css: --green/--red gánh mặt phẳng NỀN, cần màu nhìn thấy được
    // ở cả hai theme thì dùng bộ --tx-*.
    if (flag === '🟢') return 'var(--tx-green)';
    if (flag === '🔴') return 'var(--tx-red)';
    return 'var(--gold-soft)'; // 🟡 hoặc không rõ — mặc định tông trung tính của brand
  }

  let _uid = 0;
  function nextId(prefix) { _uid += 1; return prefix + '-' + _uid; }

  // Ước lượng bề rộng caption (~6.6px/ký tự ở cỡ chữ .hc-cap) để SVG tự NỚI
  // RỘNG thay vì cắt chữ ở viewBox — caption đến từ dữ liệu thật (tên cách
  // cục, tỉ lệ census) nên độ dài không cố định, không được coi là ngắn.
  function _capWidth(caption, padX) {
    if (!caption) return 0;
    return Math.ceil(String(caption).length * 6.6) + (padX || 0) * 2;
  }

  /**
   * Đường Đời — N thanh (thường 9 đại vận), thanh hiện tại viền vàng đứt.
   * segs: [{ tuoiStart, tuoiEnd, tong (0-10), flag ('🔴'|'🟡'|'🟢'), current }]
   */
  function lifeArc(o) {
    o = o || {};
    const segs = Array.isArray(o.segments) ? o.segments : [];
    if (!segs.length) return '';
    const w = o.width || 320, h = o.height || 128;
    const pad = 4, gap = 4;
    const n = segs.length;
    const barW = (w - pad * 2 - gap * (n - 1)) / n;
    const top = 14, bottom = h - 20; // chỗ cho nhãn số trên + nhãn tuổi dưới
    const scaleH = bottom - top;
    let bars = '', curX = null;
    segs.forEach((s, i) => {
      const v = Math.max(0, Math.min(10, Number(s.tong) || 0));
      const bh = (v / 10) * scaleH;
      const x = pad + i * (barW + gap);
      const y = bottom - bh;
      const col = flagColor(s.flag);
      const outline = s.current ? ' stroke="var(--gold)" stroke-width="2"' : '';
      if (s.current) curX = x + barW / 2;
      bars +=
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(bh, 2).toFixed(1) +
        '" rx="2" style="fill:' + col + '"' + outline + '></rect>' +
        '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" class="hc-num">' + esc(v.toFixed(1)) + '</text>' +
        '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (h - 6).toFixed(1) + '" text-anchor="middle" class="hc-lbl">' +
          esc((s.tuoiStart != null ? s.tuoiStart : '') + (s.tuoiEnd != null ? '–' + s.tuoiEnd : '')) + '</text>';
    });
    const marker = curX != null
      ? '<line x1="' + curX.toFixed(1) + '" y1="' + (top - 8) + '" x2="' + curX.toFixed(1) + '" y2="' + bottom +
        '" class="hc-marker"></line>' +
        '<text x="' + curX.toFixed(1) + '" y="' + (top - 10) + '" text-anchor="middle" class="hc-marker-t">bạn ở đây</text>'
      : '';
    const label = esc(o.ariaLabel || 'Biểu đồ đường đời qua các đại vận');
    return _wrap(w, h, label,
      '<g>' + bars + '</g>' + marker
    );
  }

  /**
   * Lục Giác N chiều (mặc định 6, dùng cho `cungScores` mỗi cung).
   * dims: [{ label, value (0-10) }, ...] — tối thiểu 3 trục.
   */
  function hexRadar(o) {
    o = o || {};
    const dims = Array.isArray(o.dims) ? o.dims.filter((d) => d && isFinite(Number(d.value))) : [];
    const n = dims.length;
    if (n < 3) return '';
    const size = o.size || 200;
    const cx = size / 2, cy = size / 2, R = size * 0.36;
    const max = o.max || 10;
    const pt = (i, val) => {
      const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
      const r = (Math.max(0, Math.min(max, val)) / max) * R;
      return [(cx + r * Math.cos(ang)).toFixed(1), (cy + r * Math.sin(ang)).toFixed(1)];
    };
    const ptOuter = (i, f) => {
      const ang = -Math.PI / 2 + i * (2 * Math.PI / n);
      return [(cx + R * f * Math.cos(ang)).toFixed(1), (cy + R * f * Math.sin(ang)).toFixed(1)];
    };
    const ring = (f) => dims.map((_, i) => ptOuter(i, f).join(',')).join(' ');
    const axes = dims.map((_, i) => {
      const [ox, oy] = ptOuter(i, 1);
      return '<line x1="' + cx + '" y1="' + cy + '" x2="' + ox + '" y2="' + oy + '" class="hc-grid"></line>';
    }).join('');
    const poly = dims.map((d, i) => pt(i, Number(d.value)).join(',')).join(' ');
    const labels = dims.map((d, i) => {
      const [lx, ly] = ptOuter(i, 1.16);
      return '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" class="hc-lbl">' + esc(d.label) + '</text>';
    }).join('');
    const label = esc(o.ariaLabel || ('Biểu đồ ' + n + ' chiều'));
    return _wrap(size, size, label,
      '<polygon points="' + ring(1) + '" class="hc-grid-fill"></polygon>' +
      '<polygon points="' + ring(0.66) + '" class="hc-grid-fill"></polygon>' +
      '<polygon points="' + ring(0.33) + '" class="hc-grid-fill"></polygon>' +
      axes +
      '<polygon points="' + poly + '" class="hc-radar-fill"></polygon>' +
      labels
    );
  }

  /**
   * Vành Hiếm — lưới chấm, 1 chấm nổi bật giữa đám chấm mờ. KHÔNG vẽ vòng
   * cung theo % — mắt không đo được cung tròn nhỏ (0,63% ~ 2° trên vòng
   * tròn), lưới chấm nhìn phát hiểu "hiếm" ngay mà không cần đọc số trước.
   * Số thật (vd "1 trong 158") luôn đi kèm trong `caption`, đọc từ
   * `laso_census` — hàm này không tự suy ra tỉ lệ.
   */
  function rarityDots(o) {
    o = o || {};
    const cols = o.cols || 10, rows = o.rows || 8;
    const total = cols * rows;
    let hi = Math.round(Number(o.highlightIndex));
    if (!isFinite(hi) || hi < 1 || hi > total) hi = Math.round(total / 2);
    const cell = o.cell || 16, oy = 10;
    const gridW = cols * cell + 20;
    const w = Math.max(gridW, _capWidth(o.caption, 10)), ox = (w - cols * cell) / 2;
    const h = oy * 2 + rows * cell + (o.caption ? 22 : 0);
    let dots = '', i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        i += 1;
        const cx = ox + c * cell + cell / 2, cy = oy + r * cell + cell / 2;
        const on = i === hi;
        dots += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (on ? 4.5 : 2.4) +
          '" class="' + (on ? 'hc-dot-hi' : 'hc-dot') + '"></circle>';
      }
    }
    const cap = o.caption
      ? '<text x="' + (w / 2) + '" y="' + (h - 6) + '" text-anchor="middle" class="hc-cap">' + esc(o.caption) + '</text>'
      : '';
    const label = esc(o.ariaLabel || o.caption || 'Độ hiếm');
    return _wrap(w, h, label, '<g>' + dots + '</g>' + cap);
  }

  /**
   * Thang Bách Phân — một vạch trên thang 0–max, tô theo cờ. Dùng cho "đỉnh
   * đời cao hơn X% lá số khác" hay bất kỳ điểm cần so với `laso_census`.
   */
  function percentileBar(o) {
    o = o || {};
    const max = o.max || 10;
    const v = Math.max(0, Math.min(max, Number(o.value) || 0));
    const w = Math.max(o.width || 280, _capWidth(o.caption, 10)), h = o.height || (o.caption ? 74 : 52);
    const trackY = 34, trackH = 10, padX = 10;
    const trackW = w - padX * 2;
    const mx = padX + (v / max) * trackW;
    const gid = nextId('hc-pg');
    const cap = o.caption
      ? '<text x="' + (w / 2) + '" y="' + (h - 6) + '" text-anchor="middle" class="hc-cap">' + esc(o.caption) + '</text>'
      : '';
    const label = esc(o.ariaLabel || o.caption || 'Vị trí trên thang điểm');
    return _wrap(w, h, label,
      '<defs><linearGradient id="' + gid + '" x1="0" x2="1">' +
        '<stop offset="0" style="stop-color:var(--red)"></stop>' +
        '<stop offset="50%" style="stop-color:var(--gold-soft)"></stop>' +
        '<stop offset="100%" style="stop-color:var(--green)"></stop>' +
      '</linearGradient></defs>' +
      '<rect x="' + padX + '" y="' + trackY + '" width="' + trackW + '" height="' + trackH +
        '" rx="' + (trackH / 2) + '" fill="url(#' + gid + ')" opacity="0.85"></rect>' +
      '<line x1="' + mx.toFixed(1) + '" y1="' + (trackY - 8) + '" x2="' + mx.toFixed(1) + '" y2="' + (trackY + trackH + 8) + '" class="hc-marker-line"></line>' +
      '<text x="' + mx.toFixed(1) + '" y="' + (trackY - 12) + '" text-anchor="middle" class="hc-num">' + esc(v.toFixed(1)) + '</text>' +
      '<text x="' + padX + '" y="' + (trackY + trackH + 22) + '" class="hc-lbl">0</text>' +
      '<text x="' + (w - padX) + '" y="' + (trackY + trackH + 22) + '" text-anchor="end" class="hc-lbl">' + max + '</text>' +
      cap
    );
  }

  function _wrap(w, h, ariaLabel, inner) {
    _ensureCss();
    return '<svg class="hc-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + ariaLabel + '" ' +
      'style="width:100%;height:auto;max-width:' + w + 'px" font-family="inherit">' + inner + '</svg>';
  }

  let _cssInjected = false;
  function _ensureCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    const st = document.createElement('style');
    st.textContent =
      '.hc-svg{display:block;margin:0 auto}' +
      '.hc-num{font-family:var(--mono,ui-monospace,monospace);font-size:10px;font-weight:600;fill:var(--text)}' +
      '.hc-lbl{font-family:var(--mono,ui-monospace,monospace);font-size:8.5px;fill:var(--text-lt)}' +
      '.hc-cap{font-family:var(--sans);font-size:11.5px;fill:var(--text-mid)}' +
      '.hc-grid{stroke:var(--line-2);stroke-width:1}' +
      '.hc-grid-fill{fill:none;stroke:var(--line-2);stroke-width:1}' +
      '.hc-radar-fill{fill:var(--gold-lt);stroke:var(--gold-soft);stroke-width:1.5;opacity:.92}' +
      '.hc-dot{fill:var(--line-2)}' +
      '.hc-dot-hi{fill:var(--gold);stroke:var(--gold-lt);stroke-width:1.2}' +
      '.hc-marker{stroke:var(--gold);stroke-width:1;stroke-dasharray:2 2}' +
      '.hc-marker-t{font-family:var(--mono,ui-monospace,monospace);font-size:8px;fill:var(--gold-soft)}' +
      '.hc-marker-line{stroke:var(--navy);stroke-width:3}' +
      '@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .hc-marker-line{stroke:#fff}}' +
      ':root[data-theme="dark"] .hc-marker-line{stroke:#fff}' +
      '.hc-tile{fill:var(--gold-lt);stroke:var(--line);stroke-width:1}' +
      '.hc-tile-now{stroke:var(--gold);stroke-width:2}' +
      '.hc-col-now{fill:var(--gold-lt)}' +
      '.hc-kw{font-family:var(--sans);font-size:11px;font-weight:700;fill:var(--heading)}' +
      '.hc-kw-sm{font-family:var(--sans);font-size:9px;font-weight:700;fill:var(--heading)}';
    document.head.appendChild(st);
  }

  /** Nhãn tính chất → biến màu shell.css. Cùng bộ 3 với `.fb-tot/.fb-canhbao/
   *  .fb-trungtinh` (shell.css) mà 16 trang luận giải đang dùng — KHÔNG bịa
   *  tông thứ tư ở đây, hai bộ màu lệch nhau thì cùng một tháng đọc ra hai
   *  màu tuỳ chỗ nhìn. */
  function mucColor(muc) {
    if (muc === 'TỐT') return 'var(--tx-green)';
    if (muc === 'CẢNH BÁO') return 'var(--tx-red)';
    return 'var(--gold-soft)';
  }

  // Ô/cột chỉ mang MỘT hình theo mức — mắt đọc hình trước khi đọc màu. Bắt
  // buộc có, không phải trang trí: cặp đỏ↔vàng của bộ thương hiệu chỉ cách
  // nhau ΔE 4,9 với người mù màu deutan (đo bằng validator), nên nếu mức chỉ
  // được mã hoá bằng MÀU thì hai mức đó là một với họ.
  function mucMark(muc, cx, cy, r) {
    // `muc` rỗng = CHƯA LUẬN (ô đã có mặt trên lưới nhưng phần chữ của tháng
    // đó chưa sinh xong). Vẽ vòng rỗng mờ, KHÔNG rơi về "trung tính" — trung
    // tính là một phán quyết, còn đây là chưa có phán quyết nào. Nhờ trạng
    // thái này mà lưới dựng được ngay lần vẽ ĐẦU với đủ số ô, rồi chỉ thay
    // ruột từng ô — khung không đổi kích thước nên không sinh CLS.
    if (!muc) {
      return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (r * 0.62).toFixed(1) +
        '" fill="none" stroke="var(--line-2)" stroke-width="1.4"></circle>';
    }
    var col = mucColor(muc);
    if (muc === 'TỐT') {
      // tia — hướng lên, đọc là "mở ra"
      var d = '';
      for (var i = 0; i < 4; i++) {
        var a = (-Math.PI / 2) + i * (Math.PI / 4);
        d += 'M' + (cx - r * Math.cos(a)).toFixed(1) + ',' + (cy - r * Math.sin(a)).toFixed(1) +
             'L' + (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1);
      }
      return '<path d="' + d + '" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round" fill="none"></path>';
    }
    if (muc === 'CẢNH BÁO') {
      // tam giác — hướng lên, đọc là "coi chừng"
      return '<path d="M' + cx.toFixed(1) + ',' + (cy - r).toFixed(1) +
        'L' + (cx + r).toFixed(1) + ',' + (cy + r * 0.8).toFixed(1) +
        'L' + (cx - r).toFixed(1) + ',' + (cy + r * 0.8).toFixed(1) + 'Z" fill="none" stroke="' + col +
        '" stroke-width="1.6" stroke-linejoin="round"></path>';
    }
    // gạch ngang — đọc là "giữ nguyên"
    return '<line x1="' + (cx - r).toFixed(1) + '" y1="' + cy.toFixed(1) + '" x2="' + (cx + r).toFixed(1) +
      '" y2="' + cy.toFixed(1) + '" stroke="' + col + '" stroke-width="1.8" stroke-linecap="round"></line>';
  }

  function _tspans(text, x, y, maxChars, lineH, cls, maxLines, fill) {
    var words = String(text == null ? '' : text).trim().split(/\s+/).filter(Boolean);
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (t.length > maxChars && cur) { lines.push(cur); cur = words[i]; } else cur = t;
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
    }
    var out = '';
    for (var j = 0; j < lines.length; j++) {
      out += '<text x="' + x + '" y="' + (y + j * lineH).toFixed(1) + '" text-anchor="middle" class="' + cls + '"' +
        (fill ? ' fill="' + fill + '"' : '') + '>' + esc(lines[j]) + '</text>';
    }
    return { html: out, lines: lines.length };
  }

  /**
   * Bản Đồ Tháng — lưới N ô, mỗi ô một tháng: nhãn tháng · hình theo mức · TỪ
   * KHOÁ. Dựng cho "Vận Hạn 12 Tháng Tới" nhưng không khoá vào 12.
   *
   * ⚠️ CỐ Ý KHÔNG có điểm/10 trên ô: `lib/engine/van-han-12.ts` chốt chỉ ĐẠI
   * VẬN mới có điểm thật, gán điểm cho tháng là bịa. Ô mang MỨC + TỪ KHOÁ, hai
   * thứ do phía gọi cấp (bóc từ nhãn `[TỐT|TỪ KHOÁ]` model đã viết), file này
   * không tự suy ra mức từ sao — đúng luật "chỉ vẽ" ở đầu file.
   *
   * items: [{ nhan, kw, muc ('TỐT'|'CẢNH BÁO'|'TRUNG TÍNH'), now }]
   */
  function monthGrid(o) {
    o = o || {};
    var items = Array.isArray(o.items) ? o.items : [];
    if (!items.length) return '';
    var cols = o.cols || 4;
    var rows = Math.ceil(items.length / cols);
    var cw = o.cellW || 132, ch = o.cellH || 108, gap = 7, pad = 4;
    var w = pad * 2 + cols * cw + (cols - 1) * gap;
    var h = pad * 2 + rows * ch + (rows - 1) * gap;
    var g = '';
    items.forEach(function (it, i) {
      var cx0 = pad + (i % cols) * (cw + gap);
      var cy0 = pad + Math.floor(i / cols) * (ch + gap);
      var midX = cx0 + cw / 2;
      g += '<rect x="' + cx0 + '" y="' + cy0 + '" width="' + cw + '" height="' + ch +
        '" rx="9" class="hc-tile' + (it.now ? ' hc-tile-now' : '') + '"></rect>';
      g += '<text x="' + midX + '" y="' + (cy0 + 19) + '" text-anchor="middle" class="hc-lbl">' +
        esc(it.nhan) + '</text>';
      g += mucMark(it.muc, midX, cy0 + 40, 8);
      var kw = _tspans(it.kw || '', midX, cy0 + 66, 15, 13, 'hc-kw', 3, mucColor(it.muc));
      g += kw.html;
      if (it.now) {
        g += '<text x="' + midX + '" y="' + (cy0 + ch - 8) + '" text-anchor="middle" class="hc-marker-t">bạn ở đây</text>';
      }
    });
    return _wrap(w, h, esc(o.ariaLabel || 'Bản đồ ' + items.length + ' tháng tới'), g);
  }

  /**
   * Chặng Đời — N cột, cột cao theo ĐIỂM THẬT của engine, mỗi cột một TỪ KHOÁ.
   * Dựng cho "Chu Trình Cuộc Đời" (9 đại vận).
   *
   * Khác `lifeArc` ở chỗ dùng: `lifeArc` là teaser NHỎ trên đầu trang (chỉ số +
   * tuổi, cao 128px); cái này là khối ĐỌC/CHIA SẺ trong thân bài, mang thêm từ
   * khoá và mức. Cùng dữ liệu, hai vai — CỐ Ý không gộp: gộp thì teaser phải
   * chờ có từ khoá (tức chờ trả tiền) mới vẽ được.
   *
   * HAI NGUỒN MÀU, CỐ Ý TÁCH: thân cột (chiều cao VÀ màu) đọc từ ENGINE
   * (`tong` + `flag`, ngưỡng của chính `scoreDaiVan`); dấu hình và từ khoá đọc
   * từ NHÃN model viết (`muc`). Trộn hai nguồn vào cùng MỘT kênh thì sinh ra
   * cảnh cột 6.7 tô đỏ đứng cạnh cột 7.0 tô xanh — người đọc thấy mâu thuẫn mà
   * không có cách nào biết đó là hai phép đo khác nhau.
   *
   * segs: [{ tuoiStart, tuoiEnd, tong (0-10), flag, kw, muc, current }]
   */
  function stageTimeline(o) {
    o = o || {};
    var segs = Array.isArray(o.segments) ? o.segments : [];
    if (!segs.length) return '';
    var n = segs.length;
    var colW = o.colW || 74, gap = 6, pad = 6;
    var plotH = o.plotH || 132;
    var topLbl = 34;                 // số thứ tự + tuổi
    var kwH = 30;                    // 2 dòng từ khoá
    var w = pad * 2 + n * colW + (n - 1) * gap;
    var h = pad + topLbl + kwH + plotH + 26;
    var base = pad + topLbl + kwH + plotH;
    var g = '';
    segs.forEach(function (s, i) {
      var x0 = pad + i * (colW + gap);
      var midX = x0 + colW / 2;
      if (s.current) {
        g += '<rect x="' + x0 + '" y="' + pad + '" width="' + colW + '" height="' + (h - pad - 6) +
          '" rx="8" class="hc-col-now"></rect>';
      }
      g += '<text x="' + midX + '" y="' + (pad + 14) + '" text-anchor="middle" class="hc-num">' + (i + 1) + '</text>';
      g += '<text x="' + midX + '" y="' + (pad + 27) + '" text-anchor="middle" class="hc-lbl">' +
        esc((s.tuoiStart != null ? s.tuoiStart : '') + (s.tuoiEnd != null ? '–' + s.tuoiEnd : '')) + '</text>';
      g += _tspans(s.kw || '', midX, pad + topLbl + 11, 11, 12, 'hc-kw-sm', 2, mucColor(s.muc)).html;
      var v = Math.max(0, Math.min(10, Number(s.tong) || 0));
      var bh = Math.max((v / 10) * plotH, 2);
      var barW = 18;
      g += '<rect x="' + (midX - barW / 2).toFixed(1) + '" y="' + (base - bh).toFixed(1) + '" width="' + barW +
        '" height="' + bh.toFixed(1) + '" rx="4" fill="' + flagColor(s.flag) + '" opacity="0.9"></rect>';
      g += '<text x="' + midX + '" y="' + (base - bh - 5).toFixed(1) + '" text-anchor="middle" class="hc-num">' +
        esc(v.toFixed(1)) + '</text>';
      g += mucMark(s.muc, midX, base + 14, 6);
    });
    return _wrap(w, h, esc(o.ariaLabel || 'Biểu đồ ' + n + ' chặng đời'), g);
  }

  return { lifeArc, hexRadar, rarityDots, percentileBar, flagColor, monthGrid, stageTimeline, mucColor };
})();
