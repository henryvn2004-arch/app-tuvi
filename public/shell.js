/* ============================================================
   shell.js — Khung app-shell dùng chung cho mọi trang /app/*.
   Render sidebar + rail Trợ lý AI + command palette từ MỘT nguồn
   cấu hình TOOLS, lo chat SSE (/api/v1/chat), theme, mobile, auth.
   Trang tool chỉ cần: khai window.SHELL_ACTIVE = '<id>' rồi gọi
   Shell.setContext({...}) khi có lá số/kịch bản để bật rail.
   Cặp với shell.css. sourceType: script (không module).
   ============================================================ */
(function () {
  'use strict';

  // ── NGUỒN DUY NHẤT: danh sách công cụ (render cả sidebar lẫn Cmd+K) ──
  var TOOLS = [
    { group: 'Tử Vi · Tứ Trụ', open: true, items: [
      { id: 'la-so',      label: 'Lá số Tử Vi',         href: '/app',            icon: 'grid' },
      { id: 'bat-tu',     label: 'Lá số Bát Tự',        href: '/tu-binh.html',   icon: 'rows' },
      { id: 'luan-giai',  label: 'Luận giải chuyên sâu', href: '/app/luan-giai',  icon: 'doc', cost: 5 },
    ] },
    { group: 'Xem Tuổi · Đặt Tên', items: [
      { id: 'xem-tuoi',   label: 'Xem tuổi vợ chồng',   href: '/xem-tuoi.html' },
      { id: 'xem-lam-an', label: 'Xem tuổi làm ăn',     href: '/xem-lam-an.html' },
      { id: 'dat-ten',    label: 'Đặt tên con',         href: '/dat-ten' },
      { id: 'chon-ngay',  label: 'Chọn ngày tốt',       href: '/chon-ngay' },
    ] },
    { group: 'Phong Thủy · Tướng', items: [
      { id: 'phong-thuy', label: 'Phong thủy',          href: '/phong-thuy' },
      { id: 'xem-tuong',  label: 'Xem tướng',           href: '/xem-tuong' },
    ] },
    { group: 'Tài khoản', open: true, items: [
      { id: 'vi-luong',   label: 'Ví Lượng',            href: '/profile', icon: 'wallet', balance: true },
      { id: 'ho-so',      label: 'Hồ sơ của tôi',       href: '/profile', icon: 'user' },
    ] },
  ];

  var ICONS = {
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
    rows: '<path d="M4 5h16M4 12h16M4 19h16"/>',
    doc: '<path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 12h8"/>',
    wallet: '<path d="M2 7h20v12H2z"/><path d="M16 12h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    clock: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
    bolt: '<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>',
    dot: '<circle cx="12" cy="12" r="6"/>',
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + (ICONS[name] || ICONS.dot) + '</svg>';
  }
  var CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var ACTIVE = window.SHELL_ACTIVE || '';

  // ── RENDER SIDEBAR ──
  function renderSidebar() {
    var host = document.getElementById('shell-sidebar');
    if (!host) return;
    var h = '';
    h += '<a class="sb-brand" href="/"><div class="seal">寶</div><div class="brand-txt"><b>Tử Vi Minh Bảo</b><span>Mệnh Lý AI</span></div></a>';
    h += '<button class="kbtn" type="button" data-act="cmd">' +
         '<svg class="ic" style="opacity:.7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>' +
         ' Tìm công cụ, lệnh… <kbd>Ctrl K</kbd></button>';
    h += '<nav class="sb-nav">';
    TOOLS.forEach(function (g) {
      var hasActive = g.items.some(function (it) { return it.id === ACTIVE; });
      var closed = !(g.open || hasActive);
      h += '<div class="grp' + (closed ? ' closed' : '') + '"><div class="grp-h" data-act="grp">' + esc(g.group) + ' ' + CHEV + '</div>';
      g.items.forEach(function (it) {
        var active = it.id === ACTIVE ? ' active' : '';
        var pill = it.cost ? '<span class="pill cost">' + it.cost + '</span>'
          : it.balance ? '<span class="pill" id="sbBalance">—</span>' : '';
        h += '<a class="item' + active + '" href="' + it.href + '">' + (it.icon ? svg(it.icon) : '') + ' ' + esc(it.label) + ' ' + pill + '</a>';
      });
      h += '</div>';
    });
    h += '</nav>';
    h += '<a class="sb-foot" href="/profile"><div class="ava" id="sbAva">?</div><div><div class="nm" id="sbName">Khách</div><div class="sub" id="sbSub">Đăng nhập →</div></div></a>';
    host.innerHTML = h;
    // group collapse
    host.querySelectorAll('.grp-h').forEach(function (el) {
      el.addEventListener('click', function () { el.parentElement.classList.toggle('closed'); });
    });
    host.querySelector('[data-act="cmd"]').addEventListener('click', openCmd);
  }

  // ── RENDER RAIL ──
  function renderRail() {
    var host = document.getElementById('shell-rail');
    if (!host) return;
    host.innerHTML =
      '<div class="rail-h"><div class="spark">✦</div>' +
      '<div><b>Trợ lý Tử Vi</b><span>Hiểu đúng lá số đang mở</span></div>' +
      '<div class="tools">' +
        '<button class="rh-btn mobile-only" title="Đóng" data-act="rail-close">✕</button>' +
        '<button class="rh-btn" title="Hội thoại mới" data-act="newchat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:15px;height:15px"><path d="M12 5v14M5 12h14"/></svg></button>' +
      '</div></div>' +
      '<div class="ctx" id="railCtx" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;flex:0 0 auto"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg> <span id="railCtxTxt"></span></div>' +
      '<div class="chat" id="chat">' +
        '<div class="rail-empty" id="railEmpty"><div class="ei">✦</div><b>Chưa có lá số nào</b>' +
        '<p>Lập lá số ở khung giữa, rồi hỏi tôi bất cứ điều gì —<br>vận sự nghiệp, tình duyên, năm nay, tháng tới…</p></div>' +
      '</div>' +
      '<div class="rail-in"><textarea id="railInput" rows="1" placeholder="Lập lá số để bắt đầu hỏi…" disabled></textarea>' +
        '<button class="send" id="railSend" disabled data-act="send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button></div>';
    host.querySelector('[data-act="send"]').addEventListener('click', sendMsg);
    host.querySelector('[data-act="newchat"]').addEventListener('click', newChat);
    host.querySelector('[data-act="rail-close"]').addEventListener('click', function () { host.classList.remove('open'); syncBackdrop(); });
    var ta = document.getElementById('railInput');
    ta.addEventListener('input', function () { autoGrow(ta); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  }

  // ── CHAT STATE ──
  var ctx = null;            // { birth } | { scenario }
  var messages = [];
  var sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('s' + Date.now());
  var streaming = false;

  function autoGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 96) + 'px'; }
  function mdLite(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>'); }
  function getToken() { try { var s = window.Auth && Auth.getSession && Auth.getSession(); return s ? s.access_token : null; } catch (e) { return null; } }
  function setSend(on) { var s = document.getElementById('railSend'), i = document.getElementById('railInput'); if (s) s.disabled = !on; if (i) { i.disabled = !on; if (on) i.focus(); } }

  function parseSSE(block) {
    var name = null, data = null;
    block.split('\n').forEach(function (line) {
      if (line.indexOf('event:') === 0) name = line.slice(6).trim();
      else if (line.indexOf('data:') === 0) { try { data = JSON.parse(line.slice(5).trim()); } catch (e) { /* ignore */ } }
    });
    return name && data != null ? { name: name, data: data } : null;
  }

  function greet(o) {
    var chat = document.getElementById('chat');
    var chips = (o.chips || []).map(function (c) { return '<div class="chip" data-ask="' + esc(c) + '">' + esc(c) + '</div>'; }).join('');
    chat.innerHTML =
      '<div class="msg a"><p>' + mdLite(o.greeting || 'Lá số đã sẵn sàng. Bạn muốn tôi soi điều gì trước?') + '</p></div>' +
      (chips ? '<div class="chips-lbl">Gợi ý</div><div class="chips">' + chips + '</div>' : '');
    chat.querySelectorAll('[data-ask]').forEach(function (el) {
      el.addEventListener('click', function () { ask(el.getAttribute('data-ask')); });
    });
  }

  // ── PUBLIC API cho trang tool ──
  var Shell = {
    // Gắn ngữ cảnh (lá số / kịch bản) để bật rail chat.
    setContext: function (o) {
      ctx = o.birth ? { birth: o.birth } : o.scenario ? { scenario: o.scenario } : null;
      messages = [];
      sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('s' + Date.now());
      var c = document.getElementById('railCtx'), t = document.getElementById('railCtxTxt');
      if (o.label) { c.style.display = ''; t.innerHTML = 'Đang gắn: <b>' + esc(o.label) + '</b>'; }
      var ta = document.getElementById('railInput');
      ta.disabled = false; ta.placeholder = 'Hỏi bất cứ điều gì về lá số này…';
      document.getElementById('railSend').disabled = false;
      greet(o);
    },
    ask: function (t) { ask(t); },
    openCmd: openCmd,
    toggleTheme: toggleTheme,
    openRail: function () { var r = document.getElementById('shell-rail'); if (r) { r.classList.add('open'); syncBackdrop(); } },
  };
  window.Shell = Shell;

  function ask(text) {
    if (streaming || !ctx) return;
    var ta = document.getElementById('railInput');
    ta.value = text; sendMsg();
    Shell.openRail();
  }

  function newChat() {
    messages = [];
    sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('s' + Date.now());
    if (ctx) greet({ greeting: 'Bắt đầu hội thoại mới. Bạn muốn hỏi gì về lá số này?', chips: [] });
  }

  async function sendMsg() {
    if (streaming || !ctx) return;
    var input = document.getElementById('railInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = ''; autoGrow(input);
    var chat = document.getElementById('chat');
    var empty = document.getElementById('railEmpty'); if (empty) empty.remove();
    var u = document.createElement('div'); u.className = 'msg u'; u.textContent = text; chat.appendChild(u);
    messages.push({ role: 'user', content: text });
    var typing = document.createElement('div'); typing.className = 'msg a';
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; chat.appendChild(typing);
    chat.scrollTop = chat.scrollHeight;
    streaming = true; setSend(false);

    var acc = '';
    try {
      var headers = { 'Content-Type': 'application/json' };
      var token = getToken(); if (token) headers['Authorization'] = 'Bearer ' + token;
      var body = { session_id: sessionId, stream: true, messages: messages.slice(-12), client: { platform: 'web', version: '1.0.0' } };
      if (ctx.birth) body.birth = ctx.birth; else if (ctx.scenario) body.scenario = ctx.scenario;
      var res = await fetch('/api/v1/chat', { method: 'POST', headers: headers, body: JSON.stringify(body) });
      if (res.status === 401 || res.status === 402) {
        typing.innerHTML = '<p>Cần <a href="/profile" style="color:var(--blue);font-weight:600">đăng nhập</a> (và có Lượng) để hỏi trợ lý. Lá số vẫn xem miễn phí.</p>';
        streaming = false; setSend(true); messages.pop(); return;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      while (true) {
        var r = await reader.read(); if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        var parts = buf.split('\n\n'); buf = parts.pop();
        for (var i = 0; i < parts.length; i++) {
          var ev = parseSSE(parts[i]); if (!ev) continue;
          if (ev.name === 'text' && ev.data.delta) { acc += ev.data.delta; typing.innerHTML = '<p>' + mdLite(acc) + '</p>'; chat.scrollTop = chat.scrollHeight; }
          else if (ev.name === 'status' && !acc) { typing.innerHTML = '<span class="typing" style="gap:6px">' + esc(ev.data.text || 'Đang xem…') + ' <i></i><i></i><i></i></span>'; }
          else if (ev.name === 'error') { acc = acc || ('Xin lỗi, gặp trục trặc: ' + esc(ev.data.message || '')); }
        }
      }
      if (!acc) acc = '(không có nội dung)';
      typing.innerHTML = '<p>' + mdLite(acc) + '</p>';
      messages.push({ role: 'assistant', content: acc });
    } catch (e) {
      typing.innerHTML = '<p>Xin lỗi, kết nối trục trặc. Thử lại giúp tôi nhé.</p>';
      messages.pop();
      if (window.console) console.error('[shell.rail]', e);
    } finally {
      streaming = false; setSend(true); chat.scrollTop = chat.scrollHeight;
    }
  }

  // ── COMMAND PALETTE ──
  var CMDS = [];
  TOOLS.forEach(function (g) { g.items.forEach(function (it) { if (it.balance || it.id === 'ho-so') return; CMDS.push({ g: 'Công cụ', i: it.icon || 'grid', t: it.label, href: it.href, s: it.cost ? it.cost + ' Lượng' : '' }); }); });
  CMDS.push({ g: 'Hành động', i: 'bolt', t: 'Đổi nền sáng / tối', act: 'theme' });
  CMDS.push({ g: 'Hành động', i: 'bolt', t: 'Nạp Lượng', href: '/topup' });
  var cSel = 0, cShown = CMDS;
  function cmdIcon(n) { return '<svg class="ri" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + (ICONS[n] || ICONS.grid) + '</svg>'; }
  function cRender() {
    var el = document.getElementById('cmdkList'); if (!el) return;
    if (!cShown.length) { el.innerHTML = '<div class="cmdk-empty">Không tìm thấy.</div>'; return; }
    var h = '', lastG = '';
    cShown.forEach(function (c, idx) {
      if (c.g !== lastG) { h += '<div class="cmdk-grp">' + c.g + '</div>'; lastG = c.g; }
      var right = c.s ? '<span class="rsub">' + c.s + '</span>' : '';
      h += '<div class="row' + (idx === cSel ? ' sel' : '') + '" data-idx="' + idx + '">' + cmdIcon(c.i) + esc(c.t) + right + '</div>';
    });
    el.innerHTML = h;
    el.querySelectorAll('.row').forEach(function (row) {
      row.addEventListener('mousemove', function () { cSel = +row.getAttribute('data-idx'); paintSel(); });
      row.addEventListener('click', function () { cRun(+row.getAttribute('data-idx')); });
    });
  }
  function paintSel() { document.querySelectorAll('#cmdkList .row').forEach(function (r, i) { r.classList.toggle('sel', i === cSel); }); }
  function cRun(idx) { var c = cShown[idx]; if (!c) { closeCmd(); return; } closeCmd(); if (c.act === 'theme') toggleTheme(); else if (c.href) window.location.href = c.href; }
  function filterCmd(q) { q = q.trim().toLowerCase(); cShown = q ? CMDS.filter(function (c) { return c.t.toLowerCase().indexOf(q) >= 0; }) : CMDS; cSel = 0; cRender(); }
  function cmdKeys(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); cSel = Math.min(cSel + 1, cShown.length - 1); paintSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cSel = Math.max(cSel - 1, 0); paintSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); cRun(cSel); }
    else if (e.key === 'Escape') { closeCmd(); }
  }
  function ensureCmdk() {
    if (document.getElementById('cmdk')) return;
    var d = document.createElement('div');
    d.className = 'cmdk-wrap'; d.id = 'cmdk';
    d.innerHTML = '<div class="cmdk"><div class="cmdk-in">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>' +
      '<input id="cmdkInput" placeholder="Tìm công cụ, lệnh…"><span class="esc">Esc</span></div>' +
      '<div class="cmdk-list" id="cmdkList"></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) closeCmd(); });
    var inp = document.getElementById('cmdkInput');
    inp.addEventListener('input', function () { filterCmd(inp.value); });
    inp.addEventListener('keydown', cmdKeys);
  }
  function openCmd() { ensureCmdk(); document.getElementById('cmdk').classList.add('open'); var i = document.getElementById('cmdkInput'); i.value = ''; cShown = CMDS; cSel = 0; cRender(); setTimeout(function () { i.focus(); }, 30); }
  function closeCmd() { var c = document.getElementById('cmdk'); if (c) c.classList.remove('open'); }

  // ── THEME + MOBILE + AUTH ──
  function toggleTheme() { var r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('app_theme', r.dataset.theme); } catch (e) { /* ignore */ } }
  (function () { try { var t = localStorage.getItem('app_theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignore */ } })();
  function syncBackdrop() {
    var b = document.getElementById('shell-backdrop'); if (!b) return;
    var open = (document.getElementById('shell-sidebar') && document.getElementById('shell-sidebar').classList.contains('open')) ||
      (document.getElementById('shell-rail') && document.getElementById('shell-rail').classList.contains('open'));
    b.classList.toggle('on', open);
  }
  window.shellSyncBackdrop = syncBackdrop;
  function paintAuth() {
    try {
      var s = window.Auth && Auth.getSession && Auth.getSession();
      if (s && s.user) {
        var nm = (s.user.email || 'Bạn').split('@')[0];
        var e1 = document.getElementById('sbName'); if (e1) e1.textContent = nm;
        var e2 = document.getElementById('sbSub'); if (e2) e2.textContent = 'Xem hồ sơ →';
        var e3 = document.getElementById('sbAva'); if (e3) e3.textContent = (nm[0] || '?').toUpperCase();
      }
    } catch (e) { /* ignore */ }
  }

  // ── BOOT ──
  function boot() {
    renderSidebar();
    renderRail();
    ensureCmdk();
    if (!document.getElementById('shell-backdrop')) {
      var b = document.createElement('div'); b.className = 'backdrop'; b.id = 'shell-backdrop';
      b.addEventListener('click', function () {
        var sb = document.getElementById('shell-sidebar'), rl = document.getElementById('shell-rail');
        if (sb) sb.classList.remove('open'); if (rl) rl.classList.remove('open'); syncBackdrop();
      });
      document.body.appendChild(b);
    }
    if (!document.getElementById('shell-theme')) {
      var tg = document.createElement('button'); tg.className = 'theme-tog'; tg.id = 'shell-theme'; tg.textContent = '◐ Nền';
      tg.addEventListener('click', toggleTheme); document.body.appendChild(tg);
    }
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); var o = document.getElementById('cmdk'); (o && o.classList.contains('open')) ? closeCmd() : openCmd(); }
    });
    var tries = 0, t = setInterval(function () { paintAuth(); if (++tries > 20 || window.Auth) clearInterval(t); }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
