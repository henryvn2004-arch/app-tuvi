/* i18n.js — phần CLIENT của đa ngôn ngữ (docs/i18n/QUY-UOC.md).
 *
 * ⚠️ File này KHÔNG phải nơi dịch trang. Chữ của trang được SERVER thay sẵn trong
 * HTML (lib/i18n/render.mjs) để crawler đọc được. Ở đây chỉ có:
 *   1. TVMB_I18N.t(key, viMặcĐịnh)  — chữ do JS dựng (shell, nav…). Server nhúng
 *      các khoá `js.*` vào <script id="tvmb-i18n">; trang vi không có ⇒ trả mặc định.
 *   2. Bộ chọn ngôn ngữ (quả địa cầu + tên bản ngữ, KHÔNG cờ) — mountSwitcher.
 *   3. Thanh gợi ý nhẹ "Xem bằng 日本語?" cho người mới (KHÔNG tự chuyển trang).
 *   4. Nhớ lựa chọn bằng cookie `tvmb_locale`.
 *   5. Sửa href nội bộ sang bản dịch khi link được JS dựng sau khi tải trang.
 * Đổi logic ở đây ⇒ bump `?v=` ở MỌI nơi gọi /i18n.js (render.mjs ASSET_V, nav.js, shell.js,
 * trang MVP) — `npm run check:i18n` soi.
 */
(function () {
  'use strict';
  if (window.TVMB_I18N && window.TVMB_I18N.ready) return;

  // Phải KHỚP lib/i18n/locales.ts (check:i18n so từng ký tự).
  var LOCALES = ['vi', 'en', 'ja', 'ko', 'zh-tw', 'zh-cn'];
  var LABEL = { vi: 'Tiếng Việt', en: 'English', ja: '日本語', ko: '한국어', 'zh-tw': '繁體中文', 'zh-cn': '简体中文' };
  var HREFLANG = { vi: 'vi', en: 'en', ja: 'ja', ko: 'ko', 'zh-tw': 'zh-Hant-TW', 'zh-cn': 'zh-Hans-CN' };
  var COOKIE = 'tvmb_locale';

  var data = {};
  try {
    var node = document.getElementById('tvmb-i18n');
    if (node) data = JSON.parse(node.textContent) || {};
  } catch (e) { data = {}; }

  var m = /^\/(en|ja|ko|zh-tw|zh-cn)(?=\/|$)/.exec(location.pathname);
  var locale = m ? m[1] : 'vi';
  var dict = data.dict || {};

  function t(key, fallback, vars) {
    var s = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : fallback;
    if (s == null) s = key;
    if (vars) s = String(s).replace(/\{(\w+)\}/g, function (x, k) { return vars[k] !== undefined ? vars[k] : x; });
    return s;
  }

  function norm(p) {
    p = String(p).split('#')[0].split('?')[0];
    if (p.charAt(0) !== '/') p = '/' + p;
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p || '/';
  }
  function pagePath() { return norm(location.pathname.replace(/^\/(en|ja|ko|zh-tw|zh-cn)(?=\/|$)/, '') || '/'); }
  function urlFor(loc, p) { p = norm(p); return (loc === 'vi' ? '' : '/' + loc) + (p === '/' ? '' : p) || '/'; }

  function getCookie() {
    var r = new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)').exec(document.cookie || '');
    return r && LOCALES.indexOf(r[1]) >= 0 ? r[1] : '';
  }
  function setCookie(loc) {
    try {
      document.cookie = COOKIE + '=' + loc + '; Path=/; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (e) { /* cookie bị chặn: bỏ qua */ }
  }
  // Đang ở URL có tiền tố = người dùng đã chọn ngôn ngữ đó.
  if (locale !== 'vi') setCookie(locale);

  // ── availability: trang nào đã dịch sang ngôn ngữ nào ───────────────────
  var avail = null;
  var waiters = [];
  function onAvail(fn) { if (avail) fn(avail); else waiters.push(fn); }
  function setAvail(a) {
    avail = a || {};
    var w = waiters; waiters = [];
    w.forEach(function (f) { try { f(avail); } catch (e) { /* một bên lỗi không kéo bên khác */ } });
  }
  (function loadAvail() {
    // Trang đã dịch: server nhúng sẵn alts của CHÍNH trang → không cần gọi mạng cho bộ chọn.
    var K = 'tvmb_avail_v1';
    try {
      var c = JSON.parse(sessionStorage.getItem(K) || 'null');
      if (c && Date.now() - c.t < 600000) return setAvail(c.d);
    } catch (e) { /* sessionStorage không dùng được */ }
    fetch('/api/i18n/availability', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) {
        try { sessionStorage.setItem(K, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* ignore */ }
        setAvail(d);
      })
      .catch(function () { setAvail({}); });
  })();

  /** Các ngôn ngữ (gồm vi) mà TRANG HIỆN TẠI có. */
  function localesHere(a) {
    var p = pagePath();
    var out = ['vi'];
    (a[p] || []).forEach(function (l) { if (out.indexOf(l) < 0) out.push(l); });
    var alts = data.alts || {};
    Object.keys(alts).forEach(function (l) { if (out.indexOf(l) < 0) out.push(l); });
    // Đang ở /<locale>/… (kể cả trang noindex chưa dịch đủ) luôn phải có đường quay về vi.
    if (locale !== 'vi' && out.indexOf(locale) < 0) out.push(locale);
    return LOCALES.filter(function (l) { return out.indexOf(l) >= 0; });
  }

  function localizeHref(href) {
    if (locale === 'vi' || !avail || typeof href !== 'string' || href.charAt(0) !== '/' || href.charAt(1) === '/') return href;
    var mm = /^([^?#]*)(.*)$/.exec(href);
    var p = norm(mm[1]);
    if (/^\/(en|ja|ko|zh-tw|zh-cn)(\/|$)/.test(p)) return href;
    return (avail[p] || []).indexOf(locale) >= 0 ? urlFor(locale, p) + mm[2] : href;
  }

  // ── bộ chọn ngôn ngữ ─────────────────────────────────────────────────────
  function injectCss() {
    if (document.getElementById('tvl-css')) return;
    var s = document.createElement('style');
    s.id = 'tvl-css';
    s.textContent =
      '.tvl{position:relative;display:inline-block;font:inherit}' +
      '.tvl-b{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}' +
      '.tvl-b:hover,.tvl-b[aria-expanded="true"]{background:rgba(127,127,127,.14)}' +
      '.tvl-b:focus-visible,.tvl-m a:focus-visible,.tvl-bar button:focus-visible,.tvl-bar a:focus-visible{outline:2px solid #1455A4;outline-offset:2px}' +
      '.tvl-ic{display:inline-flex;width:18px;height:18px}.tvl-ic svg{width:18px;height:18px}' +
      '.tvl-m{position:absolute;z-index:200;top:calc(100% + 4px);left:0;min-width:160px;max-width:calc(100vw - 16px);padding:6px;border:1px solid var(--line,#E6E3DC);border-radius:12px;background:var(--bg-elev,var(--sb-bg,#fff));color:var(--text,#1a1a1a);box-shadow:0 8px 28px rgba(0,0,0,.18)}' +
      '.tvl-m[hidden]{display:none}' +
      '.tvl-m a{display:block;padding:9px 12px;border-radius:8px;color:inherit;text-decoration:none;font-size:14px;line-height:1.3}' +
      '.tvl-m a:hover{background:rgba(127,127,127,.14)}' +
      '.tvl-m a[aria-current="true"]{font-weight:600;background:rgba(127,127,127,.1)}' +
      '.tvl[data-up="1"] .tvl-m{top:auto;bottom:calc(100% + 4px)}.tvl[data-end="1"] .tvl-m{left:auto;right:0}' +
      '.tvl-bar{position:fixed;z-index:150;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;max-width:calc(100vw - 32px);padding:10px 12px 10px 16px;border-radius:999px;background:#0F2A3D;color:#fff;font-size:14px;line-height:1.35;box-shadow:0 8px 28px rgba(0,0,0,.28)}' +
      '.tvl-bar a{flex:none;padding:6px 14px;border-radius:999px;background:#C8A96A;color:#0F2A3D;font-weight:600;text-decoration:none}' +
      '.tvl-bar button{flex:none;width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#fff;font-size:15px;cursor:pointer}' +
      '@media(max-width:520px){.tvl-bar{border-radius:16px;bottom:12px;flex-wrap:wrap;gap:8px}}';
    document.head.appendChild(s);
  }

  function globeSvg() {
    return (window.ICONS && window.ICONS.globe) || '';
  }

  function placeMenu(box, menu) {
    // Kẹp cứng menu vào vùng nhìn thấy SAU khi chọn trên/dưới (luật overlay trong CLAUDE.md).
    box.removeAttribute('data-up');
    box.removeAttribute('data-end');
    var vv = window.visualViewport;
    var vh = vv ? vv.height : window.innerHeight;
    var vw = vv ? vv.width : window.innerWidth;
    var r = menu.getBoundingClientRect();
    var br = box.getBoundingClientRect();
    if (r.bottom > vh - 8 && br.top - r.height - 4 > 8) box.setAttribute('data-up', '1');
    if (r.right > vw - 8) box.setAttribute('data-end', '1');
  }

  function mountSwitcher(host) {
    if (!host || host.getAttribute('data-tvl') === '1') return;
    host.setAttribute('data-tvl', '1');
    onAvail(function (a) {
      var here = localesHere(a);
      if (here.length < 2) { host.hidden = true; return; } // chưa có bản dịch nào cho trang này: ẩn
      injectCss();
      var up = host.getAttribute('data-dir') === 'up';
      var box = document.createElement('div');
      box.className = 'tvl';
      if (up) box.setAttribute('data-up', '1');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tvl-b';
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Language: ' + LABEL[locale]);
      btn.innerHTML = '<span class="tvl-ic" aria-hidden="true">' + globeSvg() + '</span><span class="tvl-t"></span>';
      btn.lastChild.textContent = LABEL[locale];
      var menu = document.createElement('div');
      menu.className = 'tvl-m';
      menu.hidden = true;
      var tail = location.search + location.hash;
      here.forEach(function (l) {
        var link = document.createElement('a');
        link.href = urlFor(l, pagePath()) + tail;
        link.textContent = LABEL[l];
        link.setAttribute('lang', HREFLANG[l]);
        link.setAttribute('hreflang', HREFLANG[l]);
        link.setAttribute('data-l', l);
        if (l === locale) link.setAttribute('aria-current', 'true');
        link.addEventListener('click', function () { setCookie(l); });
        menu.appendChild(link);
      });
      box.appendChild(btn);
      box.appendChild(menu);
      host.textContent = '';
      host.appendChild(box);
      host.hidden = false;

      function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
      function open() {
        menu.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        if (!up) placeMenu(box, menu);
      }
      btn.addEventListener('click', function (e) { e.stopPropagation(); if (menu.hidden) open(); else close(); });
      document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
    });
  }
  function mountAll() {
    var hosts = document.querySelectorAll('[data-lang-switcher]');
    for (var i = 0; i < hosts.length; i++) mountSwitcher(hosts[i]);
  }

  // ── thanh gợi ý ──────────────────────────────────────────────────────────
  var BAR = {
    en: ['This page is also available in English.', 'View in English'],
    ja: ['このページは日本語でもご覧いただけます。', '日本語で見る'],
    ko: ['이 페이지는 한국어로도 볼 수 있습니다.', '한국어로 보기'],
    'zh-tw': ['本頁也有繁體中文版。', '切換為繁體中文'],
    'zh-cn': ['本页也有简体中文版。', '切换为简体中文']
  };
  function browserLocale() {
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      var l = String(langs[i]).toLowerCase();
      if (l.indexOf('vi') === 0) return '';
      if (l.indexOf('ja') === 0) return 'ja';
      if (l.indexOf('ko') === 0) return 'ko';
      if (/^zh-(tw|hk|mo|hant)/.test(l)) return 'zh-tw';
      if (l.indexOf('zh') === 0) return 'zh-cn';
      if (l.indexOf('en') === 0) return 'en';
    }
    return '';
  }
  function suggest(a) {
    if (locale !== 'vi') return;
    var cookie = getCookie();
    if (cookie === 'vi') return; // đã chọn ở lại tiếng Việt
    var target = cookie || browserLocale();
    if (!target || !BAR[target]) return;
    try {
      if (!cookie && localStorage.getItem('tvmb_lang_dismiss') === '1') return;
      if (cookie && sessionStorage.getItem('tvmb_lang_dismiss') === '1') return;
    } catch (e) { /* ignore */ }
    var p = pagePath();
    if ((a[p] || []).indexOf(target) < 0) return;
    injectCss();
    var bar = document.createElement('div');
    bar.className = 'tvl-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('lang', HREFLANG[target]);
    bar.setAttribute('aria-label', 'Language');
    var msg = document.createElement('span');
    msg.textContent = BAR[target][0];
    var go = document.createElement('a');
    go.href = urlFor(target, p) + location.search + location.hash;
    go.textContent = BAR[target][1];
    go.setAttribute('hreflang', HREFLANG[target]);
    go.addEventListener('click', function () { setCookie(target); });
    var x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.textContent = '✕';
    x.addEventListener('click', function () {
      bar.remove();
      try { (cookie ? sessionStorage : localStorage).setItem('tvmb_lang_dismiss', '1'); } catch (e) { /* ignore */ }
    });
    bar.appendChild(msg); bar.appendChild(go); bar.appendChild(x);
    document.body.appendChild(bar);
  }

  // ── link do JS dựng sau khi tải trang ────────────────────────────────────
  function localizeLinks(root) {
    if (locale === 'vi' || !avail) return;
    var as = (root || document).querySelectorAll('a[href^="/"]');
    for (var i = 0; i < as.length; i++) {
      // Link trong bộ chọn ngôn ngữ / thanh gợi ý trỏ ĐÍCH DANH một ngôn ngữ — không được viết lại.
      if (as[i].hasAttribute('data-l') || as[i].hasAttribute('hreflang')) continue;
      var h = as[i].getAttribute('href');
      var n = localizeHref(h);
      if (n !== h) as[i].setAttribute('href', n);
    }
  }
  if (locale !== 'vi') {
    onAvail(function () {
      localizeLinks();
      if (window.MutationObserver) {
        var pend = false;
        new MutationObserver(function () {
          if (pend) return;
          pend = true;
          requestAnimationFrame(function () { pend = false; localizeLinks(); });
        }).observe(document.documentElement, { childList: true, subtree: true });
      }
    });
  }

  function init() {
    mountAll();
    onAvail(suggest);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.TVMB_I18N = {
    ready: true,
    locale: locale,
    t: t,
    LABEL: LABEL,
    pagePath: pagePath,
    urlFor: urlFor,
    localizeHref: localizeHref,
    onAvail: onAvail,
    mountSwitcher: mountSwitcher,
    mountAll: mountAll
  };
})();
