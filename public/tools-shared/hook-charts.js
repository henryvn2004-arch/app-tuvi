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
    if (flag === '🟢') return 'var(--green)';
    if (flag === '🔴') return 'var(--red)';
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
      ':root[data-theme="dark"] .hc-marker-line{stroke:#fff}';
    document.head.appendChild(st);
  }

  return { lifeArc, hexRadar, rarityDots, percentileBar, flagColor };
})();
