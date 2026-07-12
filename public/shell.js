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
    { group: 'Luận Đường', open: true, items: [
      { id: 'home',       label: 'Tổng quan',           href: '/app',            icon: 'home' },
    ] },
    { group: 'Tử Vi', open: true, items: [
      { id: 'la-so',      label: 'Lá số Tử Vi',         href: '/app/la-so',      icon: 'grid' },
      { id: 'luan-giai',  label: 'Luận giải chuyên sâu', href: '/app/luan-giai',  icon: 'doc', cost: 5 },
      { id: 'xem-tuoi',   label: 'Xem tuổi vợ chồng',   href: '/app/xem-tuoi',   icon: 'users' },
      { id: 'xem-lam-an', label: 'Xem tuổi làm ăn',     href: '/app/xem-lam-an', icon: 'briefcase' },
      { id: 'tuong-hop',  label: 'Tương hợp tuổi',      href: '/app/tuong-hop',  icon: 'heart' },
      { id: 'sinh-con',   label: 'Xem tuổi sinh con',   href: '/app/sinh-con',   icon: 'baby' },
    ] },
    { group: 'Tử Bình', open: true, items: [
      { id: 'bat-tu',     label: 'Lá số Bát Tự',        href: '/app/bat-tu',     icon: 'rows' },
    ] },
    { group: 'Xem Tướng', open: true, items: [
      { id: 'xem-tuong',  label: 'Xem tướng',           href: '/app/xem-tuong',  icon: 'eye' },
    ] },
    { group: 'Phong Thủy', open: true, items: [
      { id: 'phong-thuy', label: 'Phong thủy',          href: '/app/phong-thuy', icon: 'leaf' },
      { id: 'bat-trach',  label: 'Hướng Bát Trạch',     href: '/app/bat-trach',  icon: 'compass' },
    ] },
    { group: 'Chọn Ngày', open: true, items: [
      { id: 'chon-ngay',  label: 'Chọn ngày tốt',       href: '/app/chon-ngay',  icon: 'calendar' },
      { id: 'kim-lau',    label: 'Kim Lâu & Tam Tai',   href: '/app/kim-lau',    icon: 'calcheck' },
    ] },
    { group: 'Đặt Tên', open: true, items: [
      { id: 'dat-ten',    label: 'Đặt tên con',         href: '/app/dat-ten',    icon: 'tag' },
      { id: 'dat-ten-dn', label: 'Đặt tên doanh nghiệp', href: '/app/dat-ten-dn', icon: 'building' },
      { id: 'ngu-hanh-ten', label: 'Ngũ hành tên',      href: '/app/ngu-hanh-ten', icon: 'star' },
    ] },
    { group: 'Mệnh Lý', open: true, items: [
      { id: 'nap-am',     label: 'Nạp âm ngũ hành',     href: '/app/nap-am',     icon: 'wave' },
    ] },
    { group: 'Huyền Học', open: true, items: [
      { id: 'kinh-dich',  label: 'Kinh Dịch — Gieo quẻ', href: '/app/kinh-dich', icon: 'yin' },
      { id: 'than-so-hoc', label: 'Thần số học',        href: '/app/than-so-hoc', icon: 'hash' },
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
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5"/><path d="M18.5 20a6 6 0 0 0-3-5.2"/>',
    heart: '<path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
    baby: '<circle cx="12" cy="6" r="3"/><path d="M12 9v4"/><path d="M6 21c1.2-4.5 3.4-6.5 6-6.5s4.8 2 6 6.5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19c4-5 8-7 12-8"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    calcheck: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-3h4v3"/>',
    star: '<path d="m12 3 2.6 5.9 6.4.5-4.9 4.2 1.5 6.3L12 17l-5.6 3.4 1.5-6.3L3 9.9l6.4-.5z"/>',
    wave: '<path d="M2 12c2 0 2-6 4-6s2 12 4 12 2-12 4-12 2 6 4 6"/>',
    yin: '<circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9 9 9 0 0 1 0-18z"/><circle cx="12" cy="7.5" r="1"/><circle cx="12" cy="16.5" r="1"/>',
    hash: '<path d="M9 3 7 21M17 3l-2 18M4 8h16M3 16h16"/>',
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
    h += '<a class="sb-brand" href="/"><img class="seal" src="/seal.webp" alt="Tử Vi Minh Bảo"><div class="brand-txt"><b>Tử Vi Minh Bảo</b><span>Mệnh Lý AI</span></div></a>';
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
    h += '<button class="sb-theme" type="button" data-act="theme" title="Đổi nền sáng/tối">◐ Đổi nền</button>';
    h += '<a class="sb-foot" href="/profile"><div class="ava" id="sbAva">?</div><div><div class="nm" id="sbName">Khách</div><div class="sub" id="sbSub">Đăng nhập →</div></div></a>';
    host.innerHTML = h;
    var themeBtn = host.querySelector('[data-act="theme"]');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
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
      '<div class="rail-h"><img class="rail-ava" src="' + authorAva() + '" alt="Trợ lý Luận Đường">' +
      '<div><b>Trợ lý Luận Đường</b><span>' + esc(authorLabel()) + '</span></div>' +
      '<div class="tools">' +
        '<button class="rh-btn mobile-only" title="Đóng" data-act="rail-close">✕</button>' +
        (HIST_ON ? '<button class="rh-btn" title="Lịch sử hội thoại" data-act="history"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:15px;height:15px"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg></button>' : '') +
        '<button class="rh-btn" title="Hội thoại mới" data-act="newchat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:15px;height:15px"><path d="M12 5v14M5 12h14"/></svg></button>' +
      '</div></div>' +
      (HIST_ON ? '<div class="rail-hist" id="railHist" style="display:none"></div>' : '') +
      '<div class="ctx" id="railCtx" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;flex:0 0 auto"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg> <span id="railCtxTxt"></span></div>' +
      '<div class="chat" id="chat">' +
        '<div class="rail-empty" id="railEmpty"><div class="ei"><img src="' + authorAva() + '" alt=""></div><b>Chưa có lá số nào</b>' +
        '<p>Lập lá số ở khung giữa, rồi hỏi tôi bất cứ điều gì —<br>vận sự nghiệp, tình duyên, năm nay, tháng tới…</p></div>' +
      '</div>' +
      '<div class="rail-sugg" id="railSugg" style="display:none"></div>' +
      '<div class="rail-thumbs" id="railThumbs" style="display:none"></div>' +
      '<div class="rail-in">' +
        '<button class="rail-attach" id="railAttach" data-act="attach" title="Gửi ảnh" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:17px;height:17px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/></svg></button>' +
        '<input type="file" id="railFile" accept="image/*" multiple hidden>' +
        '<textarea id="railInput" rows="1" placeholder="Lập lá số để bắt đầu hỏi…" disabled></textarea>' +
        '<button class="send" id="railSend" disabled data-act="send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button></div>';
    host.querySelector('[data-act="send"]').addEventListener('click', sendMsg);
    host.querySelector('[data-act="newchat"]').addEventListener('click', newChat);
    var _hb = host.querySelector('[data-act="history"]'); if (_hb) _hb.addEventListener('click', toggleHistPanel);
    host.querySelector('[data-act="rail-close"]').addEventListener('click', function () { host.classList.remove('open'); syncBackdrop(); });
    host.querySelector('[data-act="attach"]').addEventListener('click', function () { var f = document.getElementById('railFile'); if (f) f.click(); });
    document.getElementById('railFile').addEventListener('change', onPickFiles);
    var ta = document.getElementById('railInput');
    ta.addEventListener('input', function () { autoGrow(ta); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  }

  // ── Ảnh đính kèm (vision): xem tướng / phong thủy qua ảnh ──
  var pendingImages = [];
  function onPickFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = '';
    files.slice(0, 4).forEach(function (f) {
      if (!/^image\//.test(f.type)) return;
      var rd = new FileReader();
      rd.onload = function () {
        var s = String(rd.result); var i = s.indexOf(',');
        pendingImages.push({ data: s.slice(i + 1), mediaType: f.type || 'image/jpeg', url: s });
        renderThumbs();
      };
      rd.readAsDataURL(f);
    });
  }
  function renderThumbs() {
    var host = document.getElementById('railThumbs'); if (!host) return;
    if (!pendingImages.length) { host.style.display = 'none'; host.innerHTML = ''; return; }
    host.style.display = '';
    host.innerHTML = pendingImages.map(function (im, i) {
      return '<div class="thumb"><img src="' + im.url + '" alt=""><button type="button" data-rm="' + i + '" aria-label="Bỏ ảnh">×</button></div>';
    }).join('');
    host.querySelectorAll('[data-rm]').forEach(function (b) {
      b.addEventListener('click', function () { pendingImages.splice(parseInt(b.getAttribute('data-rm')), 1); renderThumbs(); });
    });
  }

  // ── CHAT STATE ──
  var ctx = null;            // { birth } | { scenario }
  var ctxChips = [];         // gợi ý câu hỏi CÒN LẠI (đã bấm thì bỏ đi)
  var ctxChipsOrig = [];     // bản gốc để reset khi "hội thoại mới"
  var messages = [];
  var sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('s' + Date.now());
  var streaming = false;

  // ── LỊCH SỬ HỘI THOẠI (per-tool) ─────────────────────────────────────────
  // Lưu mỗi thread rail để sau quay lại xem/hỏi tiếp — như lịch sử ChatGPT.
  // 2 lớp: localStorage (mọi user, kể cả khách) + đồng bộ server khi ĐĂNG NHẬP
  // (tái dùng bảng tuvi_chats + REST /api/tuvi-chats sẵn có; type='app-'+toolId
  // để KHÔNG trộn với lịch sử trang legacy tuvi-chat.html). Khôi phục = tính
  // lại center (deterministic, FREE) + replay transcript đã lưu; KHÔNG gọi
  // /api/v1/chat, KHÔNG trừ Lượng. Chỉ câu hỏi MỚI sau khi khôi phục mới tính
  // phí. Bật per-tool bằng window.SHELL_HISTORY=true (tool đã hỗ trợ khôi phục).
  var HIST_ON = !!window.SHELL_HISTORY;
  var HIST_CAP = 40;
  var newId = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('s' + Date.now() + Math.random().toString(36).slice(2, 8)); };
  var curMeta = null; // {restore,title,createdAt} của thread đang mở
  function histKey(t) { return 'app_hist_v1_' + t; }
  function histLocal(t) { try { return JSON.parse(localStorage.getItem(histKey(t)) || '[]') || []; } catch (e) { return []; } }
  function histWrite(t, arr) { try { localStorage.setItem(histKey(t), JSON.stringify(arr.slice(0, HIST_CAP))); } catch (e) { /* quota */ } }
  function histLocalDelete(t, id) { histWrite(t, histLocal(t).filter(function (s) { return s.id !== id; })); }
  function birthSnapshot() { try { return JSON.parse(localStorage.getItem('app_birth') || 'null'); } catch (e) { return null; } }
  // Chụp toàn bộ input/select/textarea (trừ rail + command palette) để khôi phục
  // form của bất kỳ tool nào mà KHÔNG cần liệt kê id từng tool.
  function snapshotForm() {
    var out = {}, els = document.querySelectorAll('input[id],select[id],textarea[id]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest('#shell-rail') || el.closest('.cmdk-wrap')) continue;
      if (el.type === 'file' || el.type === 'button' || el.type === 'submit') continue;
      out[el.id] = el.value;
    }
    return out;
  }
  function stripImages(msgs) {
    var out = [];
    (msgs || []).forEach(function (m) {
      var c = m.content || (m.images && m.images.length ? '[đã gửi ảnh]' : '');
      if (c) out.push({ role: m.role, content: c });
    });
    return out;
  }
  function histLocalUpsert(rec) {
    var arr = histLocal(rec.toolId).filter(function (s) { return s.id !== rec.id; });
    arr.unshift(rec); histWrite(rec.toolId, arr);
  }
  // ── Đồng bộ server (best-effort, KHÔNG bao giờ ném lỗi vào tool) ──
  function histSrvUpsert(rec) {
    var tk = getToken(); if (!tk) return;
    try {
      fetch('/api/tuvi-chats', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk },
        body: JSON.stringify({ id: rec.id, label: rec.title || 'Phiên', type: 'app-' + rec.toolId, laso_data: rec.restore || null,
          messages: rec.messages || [], last_msg: rec.lastMsg || '', updated_at: new Date(rec.updatedAt).toISOString() }) }).catch(function () {});
    } catch (e) { /* ignore */ }
  }
  function histSrvDelete(id) {
    var tk = getToken(); if (!tk) return;
    try { fetch('/api/tuvi-chats?id=' + encodeURIComponent(id), { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + tk } }).catch(function () {}); } catch (e) { /* ignore */ }
  }
  function histSrvList(tool, cb) {
    var tk = getToken(); if (!tk) { cb(null); return; }
    try {
      fetch('/api/tuvi-chats', { headers: { 'Authorization': 'Bearer ' + tk } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || !j.chats) { cb(null); return; }
          var want = 'app-' + tool, out = [];
          j.chats.forEach(function (c) {
            if (c.type !== want) return;
            out.push({ id: c.id, toolId: tool, title: c.label, restore: c.laso_data, messages: c.messages || [],
              lastMsg: c.last_msg || '', createdAt: +new Date(c.created_at || c.updated_at), updatedAt: +new Date(c.updated_at) });
          });
          cb(out);
        }).catch(function () { cb(null); });
    } catch (e) { cb(null); }
  }
  function histMerge(local, server) {
    var map = {}, i, k, arr = [];
    for (i = 0; i < (local || []).length; i++) map[local[i].id] = local[i];
    for (i = 0; i < (server || []).length; i++) { var s = server[i], e = map[s.id]; if (!e || s.updatedAt >= e.updatedAt) map[s.id] = s; }
    for (k in map) if (map.hasOwnProperty(k)) arr.push(map[k]);
    arr.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    return arr;
  }
  // Liệt kê hợp nhất: cb chạy ngay với local, rồi chạy lại khi có server.
  function histList(tool, cb) {
    var local = histLocal(tool);
    cb(local);
    histSrvList(tool, function (srv) {
      if (!srv) return;
      var merged = histMerge(local, srv);
      histWrite(tool, merged);
      cb(merged);
    });
  }
  function histFind(tool, id, cb) {
    var hit = null; histLocal(tool).forEach(function (s) { if (s.id === id) hit = s; });
    if (hit) { cb(hit); return; }
    histSrvList(tool, function (srv) { var h = null; (srv || []).forEach(function (s) { if (s.id === id) h = s; }); cb(h); });
  }
  // Lưu thread hiện tại sau mỗi lượt trả lời xong.
  function saveCurrent() {
    if (!HIST_ON || !ACTIVE || !curMeta) return;
    var msgs = stripImages(messages);
    if (!msgs.length) return;
    var last = '';
    for (var i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'assistant') { last = msgs[i].content; break; } }
    var rec = { id: sessionId, toolId: ACTIVE, title: curMeta.title || 'Phiên', restore: curMeta.restore || null,
      messages: msgs, lastMsg: (last || '').slice(0, 140), createdAt: curMeta.createdAt || Date.now(), updatedAt: Date.now() };
    histLocalUpsert(rec); histSrvUpsert(rec);
    renderRecentAll();
  }
  function relTime(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    if (s < 2592000) return Math.floor(s / 86400) + ' ngày trước';
    return Math.floor(s / 2592000) + ' tháng trước';
  }
  function toolLabel(id) {
    var lb = id;
    TOOLS.forEach(function (g) { g.items.forEach(function (it) { if (it.id === id) lb = it.label; }); });
    return lb;
  }
  function replay(msgs) {
    var chat = document.getElementById('chat'); if (!chat) return;
    var html = '';
    (msgs || []).forEach(function (m) {
      if (m.role === 'user') html += '<div class="msg u">' + esc(m.content) + '</div>';
      else html += '<div class="msg a"><img class="msg-ava" src="' + authorAva() + '" alt=""><div class="msg-body"><p>' + mdLite(m.content) + '</p></div></div>';
    });
    chat.innerHTML = html; chat.scrollTop = chat.scrollHeight;
  }
  // Khôi phục 1 phiên: nạp lại center bằng cách reload trang với ?auto=1 (tính
  // lại deterministic, FREE), transcript đưa qua sessionStorage cho setContext.
  function restoreSession(id) {
    if (!ACTIVE) return;
    histFind(ACTIVE, id, function (sess) {
      if (!sess) return;
      try {
        sessionStorage.setItem('app_restore', JSON.stringify({ id: sess.id, toolId: ACTIVE }));
        sessionStorage.setItem('app_restore_data', JSON.stringify(sess));
      } catch (e) { /* ignore */ }
      if (sess.restore && sess.restore.birth) {
        try { localStorage.setItem('app_birth', JSON.stringify(sess.restore.birth)); } catch (e) { /* ignore */ }
      }
      var p = location.pathname, s = location.search;
      location.href = p + (/[?&]auto=1\b/.test(s) ? s : (s ? s + '&auto=1' : '?auto=1'));
    });
  }
  // ── UI: panel lịch sử trong rail ──
  function histPanelHTML(list) {
    if (!list.length) return '<div class="rh-empty">Chưa có phiên nào được lưu.</div>';
    return list.map(function (s) {
      return '<div class="rh-item" data-id="' + esc(s.id) + '">' +
        '<div class="rh-main"><div class="rh-t">' + esc(s.title || 'Phiên') + '</div>' +
        '<div class="rh-sub">' + esc(relTime(s.updatedAt)) + (s.lastMsg ? ' · ' + esc(s.lastMsg.slice(0, 44)) : '') + '</div></div>' +
        '<button class="rh-del" data-del="' + esc(s.id) + '" title="Xoá phiên" aria-label="Xoá">×</button></div>';
    }).join('');
  }
  function renderHistInto(el) {
    histList(ACTIVE, function (list) {
      el.innerHTML = '<div class="rh-head"><span>Lịch sử · ' + esc(toolLabel(ACTIVE)) + '</span><button class="rh-x" data-act="hist-close" aria-label="Đóng">×</button></div>' +
        '<div class="rh-list">' + histPanelHTML(list) + '</div>';
      wireHist(el);
    });
  }
  function wireHist(el) {
    el.querySelectorAll('.rh-item').forEach(function (it) {
      it.addEventListener('click', function (e) { if (e.target.getAttribute && e.target.getAttribute('data-del') != null) return; restoreSession(it.getAttribute('data-id')); });
    });
    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); var id = b.getAttribute('data-del'); histLocalDelete(ACTIVE, id); histSrvDelete(id); renderHistInto(el); renderRecentAll(); });
    });
    var x = el.querySelector('[data-act="hist-close"]'); if (x) x.addEventListener('click', function () { el.style.display = 'none'; });
  }
  function toggleHistPanel() {
    var el = document.getElementById('railHist'); if (!el) return;
    if (!el.style.display || el.style.display === 'none') { el.style.display = 'block'; renderHistInto(el); }
    else { el.style.display = 'none'; }
  }
  // ── UI: "Phiên gần đây" ở empty-state (tool đặt <div id="shellRecent">) ──
  function renderRecent(el) {
    if (!el || !ACTIVE || !HIST_ON) { if (el) { el.style.display = 'none'; el.innerHTML = ''; } return; }
    histList(ACTIVE, function (list) {
      if (!list.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
      el.style.display = '';
      el.innerHTML = '<div class="recent-h">Phiên gần đây</div><div class="recent-list">' +
        list.slice(0, 6).map(function (s) {
          return '<button class="recent-item" type="button" data-id="' + esc(s.id) + '">' +
            '<span class="ri-t">' + esc(s.title || 'Phiên') + '</span>' +
            '<span class="ri-s">' + esc(relTime(s.updatedAt)) + '</span></button>';
        }).join('') + '</div>';
      el.querySelectorAll('.recent-item').forEach(function (b) { b.addEventListener('click', function () { restoreSession(b.getAttribute('data-id')); }); });
    });
  }
  function renderRecentAll() { var el = document.getElementById('shellRecent'); if (el) renderRecent(el); }

  // ── Author persona (thầy) — CHUNG cơ chế + CHUNG localStorage key với
  // tuvi-chat: mỗi phiên/máy random 1 thầy (avatar /authors/<id>.jpg + văn
  // phong). Gửi authorName/authorStyle lên /api/v1/chat để đổi giọng luận. ──
  var AUTHOR_ROSTER = [
    { id: 'bac-minh',    name: 'Bắc Minh',    style: 'Hệ thống, rõ ràng, luôn giải thích nguyên lý nền tảng trước khi luận sao. Văn phong học thuật, chắc chắn, chỉn chu.' },
    { id: 'co-nguyet',   name: 'Cổ Nguyệt',   style: 'Nghiêng về vòng Tràng Sinh và triết học cổ đại. Văn phong sâu sắc, huyền bí nhưng có căn cứ, hay dẫn chiếu âm dương tiêu trưởng.' },
    { id: 'dau-nam',     name: 'Đẩu Nam',     style: 'Chuyên về tình cảm, hôn nhân, phu thê. Văn phong ấm áp, tinh tế, hay đặt mình vào vị trí người hỏi để cảm nhận.' },
    { id: 'dieu-khong',  name: 'Diệu Không',  style: 'Chuyên về nghề nghiệp, sự nghiệp, tài lộc. Văn phong thực tế, sắc sảo, đưa ra nhận định dứt khoát về hướng đi.' },
    { id: 'huyen-khong', name: 'Huyền Không', style: 'Nhìn tổng quan số mệnh, sắc bén và khái quát. Thường đánh giá toàn bộ lá số trước rồi mới đi vào chi tiết từng cung.' },
    { id: 'linh-co',     name: 'Linh Cơ',     style: 'Uyên thâm về Dịch lý, âm dương ngũ hành. Hay liên hệ cổ thư và nguyên lý căn bản khi luận giải.' },
    { id: 'linh-son',    name: 'Linh Sơn',    style: 'Kết hợp lá số với tướng số. Thực dụng, hay nhìn vào biểu hiện thực tế ngoài đời của sao tinh.' },
    { id: 'ngoc-tinh',   name: 'Ngọc Tinh',   style: 'Học thuật, nghiêng về lịch sử và nhân vật thật. Hay dẫn chứng ví dụ từ lịch sử Việt Nam và nhân vật nổi tiếng.' },
    { id: 'nhat-nguyen', name: 'Nhật Nguyên', style: 'Chính xác về vòng sao và chu kỳ vận hạn ngắn hạn. Hay luận cụ thể từng tháng từng năm trong đại vận và tiểu vận.' },
    { id: 'tam-kinh',    name: 'Tâm Kính',    style: 'Chú trọng thần khê và những điều ẩn khuất trong lá số. Hay để ý đến tâm lý chiều sâu và những gì không hiện rõ trên mặt sao.' },
    { id: 'thai-hu',     name: 'Thái Hư',     style: 'Logic chặt chẽ về tương quan sinh khắc giữa các sao. Văn phong triết học hệ thống, phân tích mối quan hệ đa chiều.' },
    { id: 'thanh-hu',    name: 'Thanh Hư',    style: 'Nhẹ nhàng, gần gũi, đôi khi dùng ví von hay chút hài hước nhẹ. Vẫn sâu sắc nhưng không cứng nhắc, tạo cảm giác gần gũi.' },
    { id: 'thien-an',    name: 'Thiên Ẩn',    style: 'Tỉ mỉ về ý nghĩa từng sao, giải thích có hệ thống. Hay đi từng sao một cách đầy đủ trước khi luận tổng hợp.' },
    { id: 'tinh-quang',  name: 'Tinh Quang',  style: 'Nhìn lá số như một chỉnh thể toàn diện. Ít khi tách rời từng cung riêng lẻ, hay tìm mối liên hệ xuyên suốt toàn bộ lá số.' },
    { id: 'tu-nguyen',   name: 'Tử Nguyên',   style: 'Súc tích, thực tế, đi thẳng vào vấn đề không vòng vo. Chuyên về đại vận và tiểu vận, đưa nhận định ngắn gọn rõ ràng.' },
  ];
  var _author = null;
  function pickAuthor() {
    try {
      var saved = localStorage.getItem('tvc_author_v1');
      if (saved) { var f = AUTHOR_ROSTER.filter(function (a) { return a.id === saved; })[0]; if (f) { _author = f; return; } }
      _author = AUTHOR_ROSTER[Math.floor(Math.random() * AUTHOR_ROSTER.length)];
      localStorage.setItem('tvc_author_v1', _author.id);
    } catch (e) { _author = AUTHOR_ROSTER[0]; }
  }
  function authorAva() { return _author ? '/authors/' + _author.id + '.jpg' : '/thay-tuvi.webp'; }
  function authorLabel() { return _author ? 'Thầy ' + _author.name : 'Hiểu đúng lá số đang mở'; }

  function autoGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 96) + 'px'; }
  function mdLite(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>'); }
  function getToken() { try { var s = window.Auth && Auth.getSession && Auth.getSession(); return s ? s.access_token : null; } catch (e) { return null; } }
  function setSend(on) { var s = document.getElementById('railSend'), i = document.getElementById('railInput'), a = document.getElementById('railAttach'); if (s) s.disabled = !on; if (a) a.disabled = !on; if (i) { i.disabled = !on; if (on) i.focus(); } }

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
    chat.innerHTML =
      '<div class="msg a"><img class="msg-ava" src="' + authorAva() + '" alt=""><div class="msg-body"><p>' + mdLite(o.greeting || 'Lá số đã sẵn sàng. Bạn muốn tôi soi điều gì trước?') + '</p></div></div>';
    // Gợi ý câu hỏi: hàng chip CỐ ĐỊNH trên ô nhập, còn suốt hội thoại (bấm
    // thì bớt dần), thay vì chỉ hiện 1 lần ở lời chào.
    if (o.chips !== undefined) { ctxChipsOrig = (o.chips || []).slice(); ctxChips = ctxChipsOrig.slice(); }
    renderSuggs();
  }

  // Hàng gợi ý trên ô nhập: ẩn khi đang trả lời / hết gợi ý / chưa có ngữ cảnh.
  function renderSuggs() {
    var host = document.getElementById('railSugg');
    if (!host) return;
    if (!ctx || streaming || !ctxChips.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = '';
    host.innerHTML = '<div class="sugg-row">' +
      ctxChips.map(function (c, i) { return '<button class="chip" type="button" data-i="' + i + '">' + esc(c) + '</button>'; }).join('') +
      '</div>';
    host.querySelectorAll('[data-i]').forEach(function (el) {
      el.addEventListener('click', function () {
        var i = +el.getAttribute('data-i'); var q = ctxChips[i];
        if (q == null) return;
        ctxChips.splice(i, 1); renderSuggs(); ask(q);
      });
    });
  }

  // ── PUBLIC API cho trang tool ──
  var Shell = {
    // Gắn ngữ cảnh (lá số / kịch bản) để bật rail chat.
    setContext: function (o) {
      // birth và scenario có thể đi CÙNG nhau: birth để engine server lập lá
      // số/bát tự, scenario.type để chọn ĐÚNG bộ não (vd 'tu-binh'). Trang Lá
      // số chỉ truyền birth; trang Bát Tự truyền cả hai.
      ctx = (o.birth || o.scenario) ? { birth: o.birth || null, scenario: o.scenario || null } : null;
      messages = [];
      sessionId = newId();
      // Meta cho thread mới: restore payload đủ để dựng lại center (mặc định =
      // snapshot birth đã nhớ + scenario), title lấy từ label.
      curMeta = { restore: Object.assign({ birth: birthSnapshot(), scenario: o.scenario || null, form: snapshotForm() }, o.restore || {}), title: o.title || o.label || 'Phiên', createdAt: Date.now() };
      var c = document.getElementById('railCtx'), t = document.getElementById('railCtxTxt');
      if (o.label) { c.style.display = ''; t.innerHTML = 'Đang gắn: <b>' + esc(o.label) + '</b>'; }
      var ta = document.getElementById('railInput');
      ta.disabled = false; ta.placeholder = o.placeholder || 'Hỏi bất cứ điều gì về lá số này…';
      document.getElementById('railSend').disabled = false;
      var att = document.getElementById('railAttach'); if (att) att.disabled = false;
      greet(o);
      // KHÔI PHỤC phiên đã lưu (đi qua sessionStorage khi bấm 1 mục lịch sử):
      // thay transcript + sessionId, replay — KHÔNG gọi API, KHÔNG trừ Lượng.
      if (HIST_ON) try {
        var rsMeta = JSON.parse(sessionStorage.getItem('app_restore') || 'null');
        var rs = JSON.parse(sessionStorage.getItem('app_restore_data') || 'null');
        if (rsMeta && rs && rsMeta.toolId === ACTIVE && rs.id) {
          sessionStorage.removeItem('app_restore'); sessionStorage.removeItem('app_restore_data');
          sessionId = rs.id;
          messages = (rs.messages || []).map(function (m) { return { role: m.role, content: m.content }; });
          curMeta = { restore: rs.restore || curMeta.restore, title: rs.title || curMeta.title, createdAt: rs.createdAt || Date.now() };
          replay(messages);
          Shell.openRail();
          return;
        }
      } catch (e) { /* ignore */ }
      // Pending-ask: câu hỏi mang từ trang chủ (hero "một cửa") vào — rail tự hỏi
      // ngay khi đã có ngữ cảnh. Chỉ dùng 1 lần, bỏ qua nếu quá cũ (>10 phút).
      try {
        var pa = JSON.parse(sessionStorage.getItem('app_pending_ask') || 'null');
        if (pa) sessionStorage.removeItem('app_pending_ask');
        if (pa && pa.q && (Date.now() - (pa.t || 0) < 600000)) ask(pa.q);
      } catch (e) { /* ignore */ }
    },
    ask: function (t) { ask(t); },
    openCmd: openCmd,
    toggleTheme: toggleTheme,
    openRail: function () { var r = document.getElementById('shell-rail'); if (r) { r.classList.add('open'); syncBackdrop(); } },
    // Empty-state "Phiên gần đây": tool đặt <div id="shellRecent"></div> ở khối
    // nhập rồi gọi Shell.renderRecent() (hoặc shell tự gọi lúc boot). No-op nếu
    // tool chưa bật window.SHELL_HISTORY.
    renderRecent: function () { renderRecentAll(); },
    // Trả restore payload đang chờ cho tool hiện tại (peek, KHÔNG xoá — setContext
    // sẽ xoá khi replay). Tool có form riêng gọi ở boot: nếu có → fillForm + chạy
    // lại hàm compute của tool (deterministic, FREE) → setContext tự replay rail.
    pendingRestore: function () {
      if (!HIST_ON) return null;
      try {
        var m = JSON.parse(sessionStorage.getItem('app_restore') || 'null');
        var d = JSON.parse(sessionStorage.getItem('app_restore_data') || 'null');
        if (m && d && m.toolId === ACTIVE && d.id) return d.restore || {};
      } catch (e) { /* ignore */ }
      return null;
    },
    // Điền lại form theo map {id:value} (dùng với pendingRestore().form).
    fillForm: function (map) {
      if (!map) return;
      Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el && map[id] != null) el.value = map[id]; });
    },
    // Nhớ thông tin sinh để chuyển tay giữa các tool trong shell (Lá số ↔ Luận giải)
    // fd chuẩn hoá: {name,gender,dd,mm,yyyy,hh,pp,namxem}. localStorage, không server.
    rememberBirth: function (fd) { try { localStorage.setItem('app_birth', JSON.stringify(fd)); } catch (e) { /* ignore */ } },
    getRememberedBirth: function () { try { return JSON.parse(localStorage.getItem('app_birth') || 'null'); } catch (e) { return null; } },
    // Điền sẵn form (các trang dùng chung ID input: inpName/inpGender/inpDd…).
    prefillForm: function () {
      var b = this.getRememberedBirth(); if (!b) return false;
      var set = function (id, v) { var el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
      set('inpName', b.name); set('inpGender', b.gender); set('inpDd', b.dd); set('inpMm', b.mm);
      set('inpYyyy', b.yyyy); set('inpHh', b.hh); set('inpPp', b.pp); set('inpNamxem', b.namxem);
      return true;
    },
    // true nếu URL có ?auto=1 (đến từ nút chuyển tay giữa tool) → trang tự chạy.
    autoRun: function () { return /[?&]auto=1\b/.test(window.location.search); },
    // ── Empty-state intro (hướng B): hiện giới thiệu ngắn cho người MỚI, tự
    // ẩn sau lần dùng đầu (nhớ qua localStorage) + nút ✕ tắt luôn. Gọi ở
    // init: introOnce('bat-tu', {title, desc}); gọi markIntroSeen sau lần chạy
    // đầu. Cần 1 phần tử #introHost trên trang (đặt trên form).
    introSeen: function (key) { try { return !!localStorage.getItem('app_intro_' + key); } catch (e) { return false; } },
    markIntroSeen: function (key) { try { localStorage.setItem('app_intro_' + key, '1'); } catch (e) { /* ignore */ } },
    introOnce: function (key, opts) {
      var host = document.getElementById('introHost');
      if (!host) return;
      if (this.introSeen(key)) { host.innerHTML = ''; return; }
      host.innerHTML = '<div class="intro-card"><button class="intro-x" type="button" aria-label="Ẩn giới thiệu">×</button>' +
        '<div class="intro-t"><span class="spark">✦</span> ' + esc(opts.title || '') + '</div>' +
        '<div class="intro-d">' + (opts.desc || '') + '</div></div>';
      var self = this;
      var x = host.querySelector('.intro-x');
      if (x) x.addEventListener('click', function () { self.markIntroSeen(key); host.innerHTML = ''; });
    },
    // Gọi khi trang đã chạy (có kết quả): nhớ đã xem + ẩn intro.
    dismissIntro: function (key) { this.markIntroSeen(key); var h = document.getElementById('introHost'); if (h) h.innerHTML = ''; },
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
    sessionId = newId();
    if (ctx) {
      // Thread mới cùng ngữ cảnh: giữ restore/title, đổi id để không đè phiên cũ.
      curMeta = { restore: (curMeta && curMeta.restore) || { birth: birthSnapshot(), scenario: ctx.scenario || null }, title: (curMeta && curMeta.title) || 'Phiên', createdAt: Date.now() };
      ctxChips = ctxChipsOrig.slice(); greet({ greeting: 'Bắt đầu hội thoại mới. Bạn muốn hỏi gì về lá số này?' });
    }
  }

  async function sendMsg() {
    if (streaming || !ctx) return;
    var input = document.getElementById('railInput');
    var text = input.value.trim();
    var imgs = pendingImages.slice();
    if (!text && !imgs.length) return;
    input.value = ''; autoGrow(input);
    var chat = document.getElementById('chat');
    var empty = document.getElementById('railEmpty'); if (empty) empty.remove();
    var u = document.createElement('div'); u.className = 'msg u';
    if (imgs.length) {
      u.innerHTML = '<div class="msg-imgs">' + imgs.map(function (im) { return '<img src="' + im.url + '" alt="">'; }).join('') + '</div>' + (text ? '<div>' + esc(text) + '</div>' : '');
    } else { u.textContent = text; }
    chat.appendChild(u);
    var um = { role: 'user', content: text };
    if (imgs.length) um.images = imgs.map(function (im) { return { data: im.data, mediaType: im.mediaType }; });
    messages.push(um);
    pendingImages = []; renderThumbs();
    var row = document.createElement('div'); row.className = 'msg a';
    var av = document.createElement('img'); av.className = 'msg-ava'; av.src = authorAva(); av.alt = '';
    var typing = document.createElement('div'); typing.className = 'msg-body';
    row.appendChild(av); row.appendChild(typing);
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
    streaming = true; setSend(false); renderSuggs();

    var acc = '';
    try {
      var headers = { 'Content-Type': 'application/json' };
      var token = getToken(); if (token) headers['Authorization'] = 'Bearer ' + token;
      var body = { session_id: sessionId, stream: true, messages: messages.slice(-12), client: { platform: 'web', version: '1.0.0' } };
      if (ctx.birth) body.birth = ctx.birth;
      if (ctx.scenario) body.scenario = ctx.scenario;
      // Văn phong thầy: gửi top-level (luồng lá số) + trong scenario (luồng kịch bản).
      if (_author) {
        body.authorName = _author.name; body.authorStyle = _author.style;
        if (body.scenario) { body.scenario = Object.assign({}, body.scenario, { authorName: _author.name, authorStyle: _author.style }); }
      }
      var res = await fetch('/api/v1/chat', { method: 'POST', headers: headers, body: JSON.stringify(body) });
      if (res.status === 401) {
        // Chưa đăng nhập → LƯU câu hỏi + đường quay lại (kèm ?auto=1 để tự lập
        // lại lá số) rồi mở đăng nhập. Email: đăng nhập tại chỗ → hỏi tiếp ngay.
        // OAuth: auth-callback đưa về đúng trang này, autoRun lập lại lá số,
        // setContext đọc app_pending_ask → tự hỏi tiếp. Không mất thông tin đã nhập.
        var _q = text;
        try {
          sessionStorage.setItem('app_pending_ask', JSON.stringify({ q: _q, t: Date.now() }));
          var _s = location.search;
          var _back = location.pathname + (/[?&]auto=1\b/.test(_s) ? _s : (_s ? _s + '&auto=1' : '?auto=1'));
          localStorage.setItem('auth_return_to', _back);
        } catch (e) { /* ignore */ }
        typing.innerHTML = '<p>Cần <a href="#" id="railLoginLink" style="color:var(--blue);font-weight:600">đăng nhập</a> để hỏi trợ lý — xong sẽ tự quay lại luận tiếp. Lá số vẫn xem miễn phí.</p>';
        var _openLogin = function () {
          if (window.Auth && Auth.require) {
            Auth.require(function () {
              // Đăng nhập bằng email (tại chỗ, không tải lại trang) → dọn cờ, hỏi lại ngay.
              try { sessionStorage.removeItem('app_pending_ask'); localStorage.removeItem('auth_return_to'); } catch (e) { /* ignore */ }
              ask(_q);
            });
          }
        };
        var _ll = document.getElementById('railLoginLink');
        if (_ll) _ll.addEventListener('click', function (ev) { ev.preventDefault(); _openLogin(); });
        _openLogin();
        streaming = false; setSend(true); messages.pop(); return;
      }
      if (res.status === 402) {
        typing.innerHTML = '<p>Bạn đã hết Lượng. <a href="/topup" style="color:var(--blue);font-weight:600">Nạp thêm</a> để hỏi trợ lý. Lá số vẫn xem miễn phí.</p>';
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
          else if (ev.name === 'done' && ev.data && ev.data.suggestions && ev.data.suggestions.length) { ctxChips = ev.data.suggestions.slice(0, 4); }
        }
      }
      if (!acc) acc = '(không có nội dung)';
      typing.innerHTML = '<p>' + mdLite(acc) + '</p>';
      messages.push({ role: 'assistant', content: acc });
      saveCurrent();
    } catch (e) {
      typing.innerHTML = '<p>Xin lỗi, kết nối trục trặc. Thử lại giúp tôi nhé.</p>';
      messages.pop();
      if (window.console) console.error('[shell.rail]', e);
    } finally {
      streaming = false; setSend(true); renderSuggs(); chat.scrollTop = chat.scrollHeight;
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
    pickAuthor();
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
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); var o = document.getElementById('cmdk'); (o && o.classList.contains('open')) ? closeCmd() : openCmd(); }
    });
    var tries = 0, t = setInterval(function () { paintAuth(); if (++tries > 20 || window.Auth) clearInterval(t); }, 300);
    // Empty-state intro (hướng B): trang khai window.SHELL_INTRO={key,title,desc}
    // + có #introHost → shell tự hiện cho người mới, ẩn sau lần dùng đầu.
    if (window.SHELL_INTRO && window.SHELL_INTRO.key) Shell.introOnce(window.SHELL_INTRO.key, window.SHELL_INTRO);
    renderRecentAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
