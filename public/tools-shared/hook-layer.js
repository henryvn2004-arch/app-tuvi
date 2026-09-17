/**
 * hook-layer.js — Tử Vi Minh Bảo
 * `HookLayer.mount(host, spec)` — dựng khối hook (fact + chart + gate) lên
 * đầu trang. Load SAU `hook-charts.js` (không bắt buộc `hook-facts.js`, vì
 * `spec.facts`/`spec.charts` có thể đến thẳng từ field `hook` server trả về).
 *
 * `HookLayer.upgrade(host, spec, data)` — NÂNG CẤP khối vừa `mount()` xong
 * (fact card khô) thành template "Preview Highlight" (banner + 3 box kể
 * chuyện), gọi SAU khi `POST /api/hook-narrative` trả về `data` (xem
 * `mountHook()` ở app-luan-giai.html). CỐ Ý là bước RIÊNG, không gộp vào
 * `mount()`: `mount()` phải chạy XONG và HIỆN NGAY (0 mạng, đúng luật cũ),
 * `upgrade()` chỉ thay ruột nếu/khi tầng kể chuyện (có gọi LLM, có thể hết
 * quota/lỗi mạng/parse hỏng) trả về được. Hỏng thì `upgrade()` không được gọi
 * — khối cũ đứng nguyên, KHÔNG bao giờ trắng trang.
 *
 * `data.boxes` PHẢI cùng độ dài và ĐÚNG THỨ TỰ với `spec.facts` đã đưa cho
 * `/api/hook-narrative` — `upgrade()` ghép `data.boxes[i]` với `spec.facts[i]`
 * để suy icon (server không trả icon, xem `_iconFor`).
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

  // `f.source` (vd "engine · cungScores['Tử Tức'].tong") KHÔNG còn render —
  // Henry chỉ ra 2026-08-28 nó đọc như code bị lộ ra ngoài chứ không như một
  // trích dẫn đáng tin (nhiều chỗ còn tệ hơn, vd "NH_COLORS['+na+']" — lộ cả
  // dấu nối chuỗi). ~20 file `mountHook()` khắp site vẫn truyền field này vào
  // `facts` — CỐ Ý không dọn, vì field vô hại khi không ai đọc nó nữa (chỉ
  // nằm trong object JS, không vào DOM); dọn hết 20 chỗ ngoài phạm vi việc
  // đang sửa. Field mới thêm SAU NGÀY NÀY thì khỏi cần viết `source` nữa.
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

  // Tên cung → icon `nav.js` (bộ 88 icon lucide-static đã có sẵn trong repo,
  // KHÔNG bịa icon ngoài bộ này — xem CLAUDE.md luật Icon). Đúng CHÍNH TẢ
  // `TEN_CUNG` của public/tuvi-ansao-engine.js — sai một dấu là rơi về mặc định.
  var CUNG_ICON = {
    'Mệnh': 'user', 'Phụ Mẫu': 'users', 'Phúc Đức': 'sparkles', 'Điền Trạch': 'home',
    'Quan Lộc': 'briefcase', 'Nô Bộc': 'handshake', 'Thiên Di': 'compass',
    'Tật Ách': 'shield-check', 'Tài Bạch': 'dollar-sign', 'Tử Tức': 'baby',
    'Phu Thê': 'heart', 'Huynh Đệ': 'users',
  };
  var KIND_ICON = { 'cach-cuc-hiem': 'sparkles', 'daivan-dinh': 'trending-up', 'daivan-day': 'compass' };
  function _iconFor(f) {
    if (!f) return 'sparkles';
    if (f.cungTen && CUNG_ICON[f.cungTen]) return CUNG_ICON[f.cungTen];
    if (f.kind && KIND_ICON[f.kind]) return KIND_ICON[f.kind];
    return 'sparkles';
  }

  /**
   * Dựng template "Preview Highlight" — banner (tag/tiêu đề/quote) + N box.
   * `data` = kết quả `POST /api/hook-narrative` (đã qua allowlist server, chỉ
   * còn chuỗi). `facts`/`toolLabel`/`illus` đến từ chính `spec` mà `mount()`
   * đã nhận — dùng lại chứ không suy thêm gì mới ở đây.
   */
  function _narrativeHtml(data, facts, toolLabel, illus) {
    var boxesHtml = (data.boxes || []).map(function (b, i) {
      var f = facts[i];
      return (
        '<div class="hkl-nb-box">' +
          '<div class="hkl-nb-box-head">' +
            '<span class="hkl-nb-ic" data-icon="' + esc(_iconFor(f)) + '"></span>' +
            '<span class="hkl-nb-no">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<b>' + esc(b.tieuDe || '') + '</b>' +
          '</div>' +
          '<div class="hkl-nb-hook">' + esc(b.hookNgan || '') + '</div>' +
          '<div class="hkl-nb-mota">' + esc(b.moTa || '') + '</div>' +
        '</div>'
      );
    }).join('');
    var illusHtml = illus
      ? '<img class="hkl-nb-illus" src="' + esc(illus.url) + '" alt="" loading="lazy" onerror="this.remove()">'
      : '';
    return (
      '<div class="hkl-nb-banner">' +
        '<div class="hkl-nb-left">' +
          '<span class="hkl-nb-tag">' + esc(data.tagHook || '') + '</span>' +
          '<div class="hkl-nb-title">' +
            '<div>' + esc(data.hookTitleLine1 || '') + '</div>' +
            (data.hookTitleLine2 ? '<div>' + esc(data.hookTitleLine2) + '</div>' : '') +
            (data.hookTitleHighlight ? '<div class="hkl-nb-hl">' + esc(data.hookTitleHighlight) + '</div>' : '') +
          '</div>' +
          (data.introText ? '<p class="hkl-nb-intro">' + esc(data.introText) + '</p>' : '') +
        '</div>' +
        '<div class="hkl-nb-right">' +
          illusHtml +
          (data.quoteHook
            ? '<div class="hkl-nb-quote"><span>“' + esc(data.quoteHook) + '”</span><b>— ' + esc(toolLabel) + '</b></div>'
            : '') +
        '</div>' +
      '</div>' +
      '<div class="hkl-nb-section-t">' + facts.length + ' điều quan trọng nhất trong ' + esc(toolLabel) +
        ' của bạn <span>(xem trước)</span></div>' +
      '<div class="hkl-nb-grid">' + boxesHtml + '</div>'
    );
  }

  /** Xem chú thích đầu file. `illus` (tuỳ chọn) = `{url}` do trang tự tính
   *  (vd `IllusMatch.illusUrlForPhan`) — file này không tự suy ảnh minh hoạ. */
  function upgrade(host, spec, data) {
    if (!host || !spec || !data || !Array.isArray(data.boxes)) return;
    var facts = (Array.isArray(spec.facts) ? spec.facts : []).filter(Boolean);
    if (data.boxes.length !== facts.length) return; // shape lệch — giữ nguyên khối cũ, không đoán ghép
    _ensureCss();
    _ensureNarrativeCss();
    var gateHtml = _gate(spec.gate, spec.tool);
    host.innerHTML = '<div class="hkl-block hkl-narrative">' +
      _narrativeHtml(data, facts, spec.toolLabel || spec.tool || '', spec.illus) +
      gateHtml +
    '</div>';

    if (window.mountIcons) window.mountIcons(host);
    if (window.TuviPaywall && typeof window.TuviPaywall.fillPriceSlots === 'function') {
      window.TuviPaywall.fillPriceSlots(host);
    }
    var btn = host.querySelector('[data-hkl-unlock]');
    if (btn && spec.gate && typeof spec.gate.onUnlock === 'function') {
      btn.addEventListener('click', function () {
        try {
          if (window.Track) window.Track.event('unlock_click', { tool_id: spec.tool || '', meta: { from: 'hook-narrative' } });
        } catch (e) { /* đo hỏng không được chặn lượt mua */ }
        spec.gate.onUnlock();
      });
    }
    // KHÔNG bắn lại `preview_shown` — `mount()` đã bắn đúng một lần cho lượt
    // xem này; `upgrade()` chỉ đổi RUỘT của cùng một lượt hiện, bắn thêm là đếm trùng.
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
      '.hkl-gate{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line-2)}' +
      '.hkl-gate b{font-family:var(--serif);font-size:14.5px;font-weight:600;display:block;margin-bottom:8px;color:var(--text)}' +
      '.hkl-gate-ul{margin:0 0 12px;padding-left:18px;font-size:13px;color:var(--text-mid);line-height:1.65}' +
      '.hkl-gate-btn{display:inline-block;background:var(--red);color:#fff;border:none;border-radius:8px;' +
        'padding:10px 20px;font-family:var(--serif);font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}' +
      '.hkl-gate-btn:hover{opacity:.92}';
    document.head.appendChild(st);
  }

  // CSS riêng cho template "Preview Highlight" (`upgrade()`) — tách khỏi
  // `_ensureCss()` để khối fact-card cũ (`mount()`) không phải tải thêm CSS nó
  // không dùng khi tầng kể chuyện chưa kịp trả về (đường phổ biến nhất).
  var _narrativeCssInjected = false;
  function _ensureNarrativeCss() {
    if (_narrativeCssInjected) return;
    _narrativeCssInjected = true;
    var st = document.createElement('style');
    st.textContent =
      '.hkl-narrative{max-width:none}' +
      '.hkl-nb-banner{display:flex;flex-wrap:wrap;gap:20px;margin-bottom:18px}' +
      '.hkl-nb-left{flex:1 1 320px;min-width:0}' +
      '.hkl-nb-tag{display:inline-block;background:var(--gold-lt);color:var(--gold-soft);' +
        'font-family:var(--sans);font-size:11.5px;font-weight:700;letter-spacing:.03em;' +
        'padding:4px 12px;border-radius:99px;margin-bottom:10px}' +
      '.hkl-nb-title{font-family:var(--serif);font-weight:700;font-size:21px;line-height:1.4;color:var(--heading)}' +
      '.hkl-nb-hl{color:var(--gold-soft)}' +
      '.hkl-nb-intro{margin:12px 0 0;font-size:13.5px;color:var(--text-mid);line-height:1.7}' +
      '.hkl-nb-right{flex:0 0 auto;width:100%;max-width:260px;display:flex;flex-direction:column;gap:10px}' +
      '.hkl-nb-illus{width:100%;border-radius:10px;display:block;object-fit:cover;aspect-ratio:4/3}' +
      '.hkl-nb-quote{background:var(--paper);border:1px solid var(--line);border-radius:9px;' +
        'padding:12px 14px;font-family:var(--serif);font-style:italic;font-size:13px;color:var(--text-mid);line-height:1.6}' +
      '.hkl-nb-quote span{display:block;margin-bottom:6px}' +
      '.hkl-nb-quote b{display:block;font-style:normal;font-size:11.5px;color:var(--gold-soft);text-align:right}' +
      '@media(max-width:640px){.hkl-nb-right{max-width:none;flex-direction:row}.hkl-nb-illus{max-width:120px;aspect-ratio:1/1}}' +
      '.hkl-nb-section-t{font-family:var(--serif);font-weight:700;font-size:15px;color:var(--heading);' +
        'margin:4px 0 12px;padding-top:14px;border-top:1px dashed var(--line-2)}' +
      '.hkl-nb-section-t span{font-family:var(--sans);font-weight:400;font-size:12px;color:var(--text-lt)}' +
      '.hkl-nb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}' +
      '.hkl-nb-box{border:1px solid var(--line);border-radius:10px;padding:14px 15px;background:var(--paper)}' +
      '.hkl-nb-box-head{display:flex;align-items:center;gap:8px;margin-bottom:9px}' +
      '.hkl-nb-ic{flex:0 0 auto;color:var(--gold-soft);display:flex}' +
      '.hkl-nb-ic svg{width:18px;height:18px}' +
      '.hkl-nb-no{font-family:var(--mono,ui-monospace,monospace);font-size:11px;color:var(--text-lt);flex:0 0 auto}' +
      '.hkl-nb-box-head b{font-family:var(--serif);font-size:13.5px;font-weight:600;color:var(--text);min-width:0}' +
      '.hkl-nb-hook{font-family:var(--serif);font-size:14px;font-weight:600;color:var(--text);line-height:1.55;margin-bottom:6px}' +
      '.hkl-nb-mota{font-size:12.5px;color:var(--text-mid);line-height:1.65}';
    document.head.appendChild(st);
  }

  return { mount: mount, upgrade: upgrade, loadCensus: loadCensus };
})();
