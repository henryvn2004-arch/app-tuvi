/**
 * hook-layer.js — Tử Vi Minh Bảo
 *
 * `HookLayer.run(host, spec)` — CỬA DUY NHẤT cho tầng "hook kể chuyện":
 * hiện spinner chờ, gọi `POST /api/hook-narrative`, rồi rơi vào ĐÚNG MỘT
 * trong ba trạng thái cuối — KHÔNG còn khối fact-card deterministic cũ làm
 * trạng thái chờ/nền (Henry chốt 2026-09-21: "bỏ luôn cái highlight
 * deterministic cũ luôn đi" sau khi phát hiện quota-hết lặng lẽ lùi về đúng
 * khối đó, trông như tính năng mới chưa chạy):
 *   1. `allowed:true`  → template "Preview Highlight" (banner + N box kể
 *      chuyện) — xem `_renderNarrative`.
 *   2. `allowed:false` với `reason` là cầu dao lượt xem trước
 *      (`key_cap`/`ip_cap`/`global_cap`) → banner mời đăng ký (chưa đăng
 *      nhập) hoặc mời nạp Lượng (đã đăng nhập, hết lượt) — xem
 *      `_renderGateOnly`. KHÔNG BAO GIỜ gọi API lần hai tự động; bấm nút mới
 *      thử lại (đăng ký xong = user_id mới = quota mới).
 *   3. Mọi lý do khác (`llm_error`/`parse_error`/`disabled`/`error`/mạng
 *      hỏng) → ẨN HẲN khối, không hiện gì — đây là lớp NÓI THÊM tuỳ chọn,
 *      không phải nội dung cốt lõi, nên lỗi kỹ thuật thì lặng lẽ biến mất
 *      thay vì hiện một khối cũ trông như sản phẩm dở dang.
 *
 * Phía server (`app/api/hook-narrative/route.ts`) tự BỎ QUA cầu dao 3-lượt-
 * đời cho user đã đăng nhập VÀ còn số dư Lượng > 0 — không giới hạn, không
 * trừ tiền (tầng này là phần thưởng đi kèm, không phải sản phẩm bán riêng).
 * Cầu dao 3-lượt-đời (`preview.free_runs`, `app_config`) chỉ áp cho khách
 * CHƯA đăng nhập hoặc đã đăng nhập mà ví rỗng.
 *
 * `HookLayer.loadCensus()` nạp `public/laso-census.json` (một lần, cache theo
 * Promise) — trang tự gọi TRƯỚC khi tính `HookFacts.tuvi.cachCucHiem`/
 * `percentileOfDaiVan`, rồi mới build `spec.facts` cho `run()`.
 *
 * ⚠️ Chart (`spec.charts`, vd hexRadar/lifeArc) KHÔNG hiện lại ở bản kể
 * chuyện — tradeoff đã chấp nhận từ bản `upgrade()` cũ (xem git history
 * app-van-han-nam.html): văn xuôi tả lại đúng đỉnh/đáy đó, khỏi vẽ trùng.
 *
 * `HookLayer.mount(host, spec)` VẪN giữ (KHÔNG xoá) — 6 trang tướng thuật/
 * làm đẹp (da-lieu-ai, kieu-toc, mau-sac-hop-menh, personal-color, trang-diem,
 * trang-phuc-theo-ngay) dùng NÓ MỘT MÌNH, không ghép narrative, không có
 * paywall để hé — đổi hành vi của `mount()` là đổi luôn 6 trang đó ngoài ý
 * định. Phạm vi đổi lần này CHỈ nằm ở luồng `run()`.
 */
window.HookLayer = (function () {
  'use strict';

  // ── Nạp public/laso-census.json (một lần, cache theo Promise) ──────────
  var _censusPromise = null;
  function loadCensus() {
    if (!_censusPromise) {
      _censusPromise = fetch('/laso-census.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
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
      '</div></div>'
    );
  }

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
      return '<div class="hkl-gate">' + inner + '<a class="hkl-gate-btn" href="' + esc(g.href) + '">' + ctaLabel + ' →</a></div>';
    }
    return '<div class="hkl-gate">' + inner +
      '<button type="button" class="hkl-gate-btn" data-hkl-unlock>' + ctaLabel + priceSpan + ' →</button></div>';
  }

  var CUNG_ICON = {
    'Mệnh': 'user', 'Phụ Mẫu': 'users', 'Phúc Đức': 'sparkles', 'Điền Trạch': 'home',
    'Quan Lộc': 'briefcase', 'Nô Bộc': 'handshake', 'Thiên Di': 'compass',
    'Tật Ách': 'shield-check', 'Tài Bạch': 'dollar-sign', 'Tử Tức': 'baby',
    'Phu Thê': 'heart', 'Huynh Đệ': 'users',
  };
  var KIND_ICON = {
    'cach-cuc-hiem': 'sparkles', 'daivan-dinh': 'trending-up', 'daivan-day': 'compass',
    'tb-cuong-nhuoc': 'scale', 'tb-ngu-hanh': 'flame', 'tb-dung-than': 'compass',
  };
  function _iconFor(f) {
    if (!f) return 'sparkles';
    if (f.cungTen && CUNG_ICON[f.cungTen]) return CUNG_ICON[f.cungTen];
    if (f.kind && KIND_ICON[f.kind]) return KIND_ICON[f.kind];
    return 'sparkles';
  }

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
  function _renderNarrative(host, spec, data, facts) {
    if (!data || !Array.isArray(data.boxes) || data.boxes.length !== facts.length) {
      host.innerHTML = '';
      host.style.display = 'none';
      return;
    }
    _ensureNarrativeCss();
    var gateHtml = _gate(spec.gate, spec.tool);
    host.style.display = '';
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
    try {
      if (window.Track) window.Track.event('preview_shown', { tool_id: spec.tool || '', meta: { from: 'hook-narrative' } });
    } catch (e) { /* đo hỏng không được chặn hiện khối */ }
    // `spec.onNarrative` (tuỳ chọn) — trang tự làm thêm việc CHỈ khi bản kể
    // chuyện thật sự lên (vd app-luan-giai.html ẩn 2 box "Giới thiệu"/"Bản
    // luận giải mẫu" ở cột phụ vì đã có nội dung thật thay thế).
    if (typeof spec.onNarrative === 'function') {
      try { spec.onNarrative(); } catch (e) { /* lỗi ở trang gọi không được vỡ khối hook */ }
    }
  }

  /** Banner "hết lượt xem trước" — thay hẳn chỗ khối hook đứng, KHÔNG gọi lại
   *  API tự động. `loggedIn` quyết định lời mời: chưa đăng nhập → đăng ký
   *  (user_id mới = quota mới); đã đăng nhập (ví rỗng) → nạp Lượng (ví >0 thì
   *  route đã bỏ qua cầu dao này từ đầu, không bao giờ tới nhánh này). */
  function _gateOnlyHtml(loggedIn) {
    var title = loggedIn ? 'Đã dùng hết lượt xem trước miễn phí' : 'Đã dùng hết lượt xem trước miễn phí';
    var desc = loggedIn
      ? 'Nạp Lượng để xem phần mở đầu nổi bật này không giới hạn ở mọi công cụ trên trang.'
      : 'Đăng ký tài khoản miễn phí để có thêm lượt xem trước — hoặc nạp Lượng để xem không giới hạn ngay.';
    var ctaLabel = loggedIn ? 'Nạp Lượng →' : 'Đăng ký miễn phí →';
    var attr = loggedIn ? 'data-hkl-topup' : 'data-hkl-signup';
    return '<div class="hkl-block hkl-gateonly">' +
      '<div class="hkl-go-t"><span data-icon="sparkles"></span>' + esc(title) + '</div>' +
      '<div class="hkl-go-d">' + esc(desc) + '</div>' +
      '<button type="button" class="hkl-gate-btn" ' + attr + '>' + esc(ctaLabel) + '</button>' +
    '</div>';
  }

  function _renderGateOnly(host, spec) {
    _ensureNarrativeCss();
    var loggedIn = !!(window.Auth && window.Auth.isLoggedIn());
    host.style.display = '';
    host.innerHTML = _gateOnlyHtml(loggedIn);
    if (window.mountIcons) window.mountIcons(host);
    var btnSignup = host.querySelector('[data-hkl-signup]');
    if (btnSignup) {
      btnSignup.addEventListener('click', function () {
        if (window.Auth && typeof window.Auth.require === 'function') {
          window.Auth.require(function () { run(host, spec); }); // đăng ký xong = user_id mới = quota mới, thử lại luôn
        }
      });
    }
    var btnTopup = host.querySelector('[data-hkl-topup]');
    if (btnTopup) {
      btnTopup.addEventListener('click', function () { location.href = '/topup.html'; });
    }
  }

  function _pendingHtml() {
    return '<div class="hkl-pending"><span class="rr-spin"></span><span>Đang soạn phần mở đầu hấp dẫn hơn… (thường mất 5-8 giây)</span></div>';
  }

  // Tự nạp ai-loading-steps.js nếu trang chưa có — cùng lý do `_ensurePrices()`
  // ở tuvi-paywall.js: thêm tay thẻ <script> vào 21 trang gọi `run()` thì sẽ
  // sót (đã sót 10/21 lúc viết dòng này), sót trang nào là trang đó vẫn ăn
  // spinner nhỏ `.rr-spin` — đúng thứ Henry báo "nhỏ xíu, không ai thấy được,
  // không phải vòng tròn glowing quen thuộc" (2026-09-22).
  function _ensureAiLoadingSteps() {
    if (window.AiLoadingSteps) return Promise.resolve();
    return new Promise(function (resolve) {
      var el = document.getElementById('_tvmb_ai_loading_js');
      if (!el) {
        el = document.createElement('script');
        el.id = '_tvmb_ai_loading_js';
        el.src = '/tools-shared/ai-loading-steps.js';
        document.head.appendChild(el);
      }
      el.addEventListener('load', function () { resolve(); });
      el.addEventListener('error', function () { resolve(); }); // nạp hỏng → giữ nguyên spinner nhỏ
    });
  }

  /** Cửa DUY NHẤT cho tầng hook kể chuyện — xem chú thích đầu file. */
  function run(host, spec) {
    if (!host || !spec) return;
    var facts = (Array.isArray(spec.facts) ? spec.facts : []).filter(Boolean);
    if (facts.length < 2) { host.innerHTML = ''; host.style.display = 'none'; return; }
    _ensureNarrativeCss();
    host.style.display = '';
    host.innerHTML = _pendingHtml(); // giữ chỗ ngay — không đợi ai-loading-steps.js nạp xong

    // Orb glowing to (cùng bộ `AiLoadingSteps` dùng ở #lgPanel/pha vẽ ảnh) —
    // thay cho `.rr-spin` 15px NGAY KHI script nạp xong, nếu lúc đó lượt gọi
    // API bên dưới chưa xong. `done` chặn việc vẽ đè lên kết quả thật nếu
    // fetch xong TRƯỚC khi script kịp nạp (đường mạng chậm/race hai request).
    var done = false;
    var waitCtl = null;
    _ensureAiLoadingSteps().then(function () {
      if (done || !window.AiLoadingSteps || !window.AiLoadingSteps.mountWait) return;
      waitCtl = window.AiLoadingSteps.mountWait(host, {
        label: 'Đang soạn phần mở đầu hấp dẫn hơn…',
        center: true, orbSize: 96, fast: true,
        expectSec: 7, expectText: '5-8 giây',
      });
      waitCtl.start();
    });

    var tk = (window.Auth && window.Auth.isLoggedIn()) ? window.Auth.getSession().access_token : null;
    var headers = { 'Content-Type': 'application/json' };
    if (tk) headers['Authorization'] = 'Bearer ' + tk;
    var body = {
      toolId: spec.tool,
      toolLabel: spec.toolLabel || spec.tool,
      anonId: (window.TuviPaywall && window.TuviPaywall.previewAnonId) ? window.TuviPaywall.previewAnonId() : '',
      facts: facts.map(function (f) { return { title: f.title, body: f.body, tone: f.tone, caption: f.caption }; }),
    };
    fetch('/api/hook-narrative', { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        done = true;
        if (waitCtl) waitCtl.stop();
        if (data && data.allowed) {
          _renderNarrative(host, spec, data, facts);
        } else if (data && (data.reason === 'key_cap' || data.reason === 'ip_cap' || data.reason === 'global_cap')) {
          _renderGateOnly(host, spec);
        } else {
          host.innerHTML = '';
          host.style.display = 'none';
        }
      })
      .catch(function () {
        done = true;
        if (waitCtl) waitCtl.stop();
        host.innerHTML = '';
        host.style.display = 'none';
      });
  }

  /** GIỮ NGUYÊN cho 6 trang tướng thuật/làm đẹp dùng MỘT MÌNH (không ghép
   *  narrative) — xem chú thích đầu file. KHÔNG dùng hàm này cho luồng mới. */
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
    try {
      if (window.Track) window.Track.event('preview_shown', { tool_id: spec.tool || '', meta: { from: 'hook' } });
    } catch (e) { /* đo hỏng không được chặn hiện tường */ }
  }

  var _cssInjected = false;
  function _ensureCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    var st = document.createElement('style');
    // `id` là dấu hiệu DUY NHẤT `shell-soft-nav.js` dùng để biết đây là style
    // DÙNG CHUNG (đừng gỡ khi soft-nav đổi trang) — cùng họ bug đã vá ở
    // `tuvi-form.js` (docs/nhat-ky, Henry báo icon phình to 2026-09-26).
    st.id = 'hook-layer-css';
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

  // CSS cho `run()` (spinner chờ / banner mời đăng ký-nạp Lượng / template
  // "Preview Highlight") — dùng chung `.hkl-block`/`.hkl-gate*` của `_ensureCss()`
  // nên gọi cả hai, không lặp lại các rule đó ở đây.
  var _narrativeCssInjected = false;
  function _ensureNarrativeCss() {
    if (_narrativeCssInjected) return;
    _narrativeCssInjected = true;
    _ensureCss();
    var st = document.createElement('style');
    st.id = 'hook-layer-narrative-css'; // xem chú thích id ở `_ensureCss()` phía trên
    st.textContent =
      '.hkl-pending{display:flex;align-items:center;gap:10px;padding:24px 4px;color:var(--text-lt);font-size:13px}' +
      '.hkl-gateonly{text-align:center;padding:26px 20px}' +
      '.hkl-go-t{display:flex;align-items:center;justify-content:center;gap:8px;font-family:var(--serif);' +
        'font-size:15.5px;font-weight:700;color:var(--heading);margin-bottom:8px}' +
      '.hkl-go-t svg{width:18px;height:18px;color:var(--gold-soft)}' +
      '.hkl-go-d{font-size:13px;color:var(--text-mid);line-height:1.65;max-width:440px;margin:0 auto 16px}' +
      '.hkl-gateonly .hkl-gate-btn{padding:11px 26px}' +
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

  return { run: run, mount: mount, loadCensus: loadCensus };
})();
