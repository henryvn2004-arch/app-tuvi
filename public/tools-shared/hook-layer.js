/**
 * hook-layer.js — Tử Vi Minh Bảo
 * `HookLayer.mount(host, spec)` — dựng khối hook (fact + chart + gate) lên
 * đầu trang. Load SAU `hook-charts.js` (không bắt buộc `hook-facts.js`, vì
 * `spec.facts`/`spec.charts` có thể đến thẳng từ field `hook` server trả về).
 *
 * KHÔNG mở đường tiền mới: nút gate chỉ gọi `spec.gate.onUnlock()` — đúng quy
 * ước đã có ở `TuviPaywall.wireSectionLocks` (trang tự bọc `requireCredits`
 * bên trong `onUnlock`, xem `initiateLuanGiaiChuyenSau` ở app-luan-giai.html).
 * `HookLayer` không tự gọi `TuviPaywall.requireCredits` để khỏi có HAI chỗ
 * cùng quyết định slug/giá — dễ trôi khỏi nhau như đã cắn với giá hiển thị.
 *
 * `HookLayer.loadCensus()` nạp `public/laso-census.json` (một lần, cache theo
 * Promise) — trang tự gọi TRƯỚC khi tính `HookFacts.tuvi.cachCucHiem`/
 * `percentileOfDaiVan`, rồi mới `mount()`. `mount()` không tự await census để
 * giữ API đồng bộ và không ép mọi trang phải cần tới bảng này.
 */
window.HookLayer = (function () {
  'use strict';

  // ── Nạp public/laso-census.json (một lần, cache theo Promise) ──────────
  // File TĨNH sinh bởi `scripts/build-laso-census.mjs` — quét hết 518.400 lá
  // số có thể có, không phụ thuộc user nào, nên hợp browser HTTP cache như
  // mọi asset tĩnh khác (`public/cach_cuc_all.json` cùng kiểu). ĐÂY LÀ
  // `fetch()` CỦA TRÌNH DUYỆT cho một file public — KHÔNG phải fetch phía
  // server tới Supabase, nên luật "mọi GET Supabase phải cache:'no-store'"
  // của CLAUDE.md không áp ở đây; ngược lại, muốn trình duyệt TỰ cache lại
  // đúng file này giữa các lượt xem trang.
  var _censusPromise = null;
  function loadCensus() {
    if (!_censusPromise) {
      _censusPromise = fetch('/laso-census.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; }); // mạng hỏng → null, phía gọi tự ẩn khối cần census
    }
    return _censusPromise;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var TONE_CLASS = { good: 'hkl-good', bad: 'hkl-bad', neutral: 'hkl-neutral' };

  function _fact(f) {
    var toneCls = TONE_CLASS[f.tone] || TONE_CLASS.neutral;
    var score = typeof f.value === 'number'
      ? '<div class="hkl-score">' + esc(f.value.toFixed(1)) + (f.flag ? ' <span class="hkl-flag">' + esc(f.flag) + '</span>' : '') + '</div>'
      : (f.caption ? '<div class="hkl-score hkl-score-txt">' + esc(f.caption) + '</div>' : '');
    return (
      '<div class="hkl-fact ' + toneCls + '">' + score +
      '<div class="hkl-fact-b">' +
        '<b>' + esc(f.title || '') + '</b>' +
        (f.body ? '<span>' + esc(f.body) + '</span>' : '') +
        (f.source ? '<span class="hkl-src">' + esc(f.source) + '</span>' : '') +
      '</div></div>'
    );
  }

  // `c.data` truyền THẲNG làm tham số duy nhất cho `HookCharts[c.type]()` —
  // PHẢI đúng shape hàm đó đợi (đọc chữ ký từng hàm trong hook-charts.js),
  // KHÔNG phải mảng/giá trị thô:
  //   lifeArc:      { segments: [...] }
  //   hexRadar:     { dims: [...] }
  //   rarityDots:   { highlightIndex, caption }
  //   percentileBar:{ value, caption }
  // Bắt được đúng lỗi này khi test thật trên app-luan-giai.html: truyền
  // mảng thô → hàm đọc `o.segments`/`o.dims` ra `undefined` → tự trả rỗng,
  // KHÔNG throw — khối chart lặng lẽ biến mất mà không có lỗi console nào.
  function _chart(c) {
    if (!c || !c.data || !window.HookCharts || typeof window.HookCharts[c.type] !== 'function') return '';
    var svg = window.HookCharts[c.type](c.data);
    if (!svg) return '';
    return '<div class="hkl-chart-card">' + (c.title ? '<div class="hkl-chart-t">' + esc(c.title) + '</div>' : '') + svg + '</div>';
  }

  function _gate(g, toolId) {
    if (!g) return '';
    var items = Array.isArray(g.items) ? g.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') : '';
    var product = esc(g.product || toolId || '');
    var ctaLabel = esc(g.cta || 'Mở bản đầy đủ');
    var priceSpan = product ? ' — <span data-tvp-price="' + product + '">…</span> Lượng' : '';
    var inner =
      (g.tieuDe ? '<b>' + esc(g.tieuDe) + '</b>' : '') +
      (items ? '<ul class="hkl-gate-ul">' + items + '</ul>' : '');
    if (typeof g.href === 'string') {
      // Cầu nối sang tool khác (tool miễn phí, không có đường tiền để gọi) —
      // xem Pha 7 workplan. Không gắn `data-hkl-unlock`, không tính unlock_click.
      return '<div class="hkl-gate">' + inner + '<a class="hkl-gate-btn" href="' + esc(g.href) + '">' + ctaLabel + ' →</a></div>';
    }
    return '<div class="hkl-gate">' + inner +
      '<button type="button" class="hkl-gate-btn" data-hkl-unlock>' + ctaLabel + priceSpan + ' →</button></div>';
  }

  function mount(host, spec) {
    if (!host || !spec) return;
    var facts = (Array.isArray(spec.facts) ? spec.facts : []).filter(Boolean);
    var charts = (Array.isArray(spec.charts) ? spec.charts : []).map(_chart).filter(Boolean);
    var gateHtml = _gate(spec.gate, spec.tool);
    if (!facts.length && !charts.length && !gateHtml) { host.innerHTML = ''; return; }
    _ensureCss();
    var kicker = facts.length ? 'Đã lập xong lá số · ' + facts.length + ' điều đáng chú ý nhất' : '';
    host.innerHTML =
      '<div class="hkl-block">' +
        (kicker ? '<div class="hkl-kicker">' + esc(kicker) + '</div>' : '') +
        (charts.length ? '<div class="hkl-charts">' + charts.join('') + '</div>' : '') +
        (facts.length ? '<div class="hkl-facts">' + facts.map(_fact).join('') + '</div>' : '') +
        gateHtml +
      '</div>';

    if (window.TuviPaywall && typeof window.TuviPaywall.fillPriceSlots === 'function') {
      window.TuviPaywall.fillPriceSlots(host);
    }
    var btn = host.querySelector('[data-hkl-unlock]');
    if (btn && spec.gate && typeof spec.gate.onUnlock === 'function') {
      btn.addEventListener('click', function () {
        try {
          if (window.Track) window.Track.event('unlock_click', { tool_id: spec.tool || '', meta: { from: 'hook' } });
        } catch (e) { /* đo hỏng không được chặn lượt mua */ }
        spec.gate.onUnlock();
      });
    }
    // Khối hook dựng xong là hiện NGAY (không có trạng thái ẩn/hiện như
    // `sectionLockHtml`) — đúng thời điểm "tường đã hiện" để đo funnel.
    try {
      if (window.Track) window.Track.event('preview_shown', { tool_id: spec.tool || '', meta: { from: 'hook' } });
    } catch (e) { /* đo hỏng không được chặn hiện tường */ }
  }

  var _cssInjected = false;
  function _ensureCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    var st = document.createElement('style');
    st.textContent =
      '.hkl-block{background:var(--white);border:1px solid var(--line);border-radius:12px;' +
        'padding:18px 20px;box-shadow:var(--shadow);margin-bottom:18px;max-width:880px}' +
      '.hkl-kicker{font-family:var(--sans);font-size:11px;font-weight:600;letter-spacing:.04em;' +
        'text-transform:uppercase;color:var(--gold-soft);margin-bottom:14px}' +
      '.hkl-charts{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px}' +
      '.hkl-chart-card{background:var(--paper);border:1px solid var(--line);border-radius:9px;' +
        'padding:12px 14px;flex:1 1 240px;min-width:200px}' +
      '.hkl-chart-t{font-size:11.5px;color:var(--text-lt);margin-bottom:8px;font-weight:600}' +
      '.hkl-facts{display:flex;flex-direction:column;gap:9px}' +
      '.hkl-fact{display:flex;gap:13px;align-items:flex-start;padding:12px 14px;border:1px solid var(--line);' +
        'border-radius:9px;background:var(--paper);border-left-width:3px}' +
      '.hkl-fact.hkl-good{border-left-color:var(--green)}' +
      '.hkl-fact.hkl-bad{border-left-color:var(--red)}' +
      '.hkl-fact.hkl-neutral{border-left-color:var(--gold-soft)}' +
      '.hkl-score{font-family:var(--serif);font-size:19px;font-weight:700;flex:0 0 auto;min-width:44px;' +
        'text-align:center;line-height:1.2}' +
      '.hkl-score-txt{font-size:12.5px;font-weight:600;min-width:52px}' +
      '.hkl-fact.hkl-good .hkl-score{color:var(--tx-green)}' +
      '.hkl-fact.hkl-bad .hkl-score{color:var(--tx-red)}' +
      '.hkl-fact.hkl-neutral .hkl-score{color:var(--gold-soft)}' +
      '.hkl-flag{font-size:12px}' +
      '.hkl-fact-b{display:flex;flex-direction:column;gap:3px;min-width:0}' +
      '.hkl-fact-b b{font-family:var(--serif);font-size:14.5px;font-weight:600;color:var(--text)}' +
      '.hkl-fact-b span{font-size:13px;color:var(--text-mid);line-height:1.6}' +
      '.hkl-src{font-family:ui-monospace,monospace;font-size:10.5px;color:var(--text-lt)!important}' +
      '.hkl-gate{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line-2)}' +
      '.hkl-gate b{font-family:var(--serif);font-size:14.5px;font-weight:600;display:block;margin-bottom:8px;color:var(--text)}' +
      '.hkl-gate-ul{margin:0 0 12px;padding-left:18px;font-size:13px;color:var(--text-mid);line-height:1.65}' +
      '.hkl-gate-btn{display:inline-block;background:var(--red);color:#fff;border:none;border-radius:8px;' +
        'padding:10px 20px;font-family:var(--serif);font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}' +
      '.hkl-gate-btn:hover{opacity:.92}';
    document.head.appendChild(st);
  }

  return { mount: mount, loadCensus: loadCensus };
})();
