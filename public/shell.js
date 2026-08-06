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
      { id: 'luan-giai',  label: 'Luận giải Tử Vi',     href: '/app/luan-giai',  icon: 'grid' },
      { id: 'cong-so',    label: 'Tử Vi Công Sở',       href: '/app/cong-so',    icon: 'briefcase' },
      { id: 'xem-tuoi',   label: 'Xem tuổi vợ chồng',   href: '/app/xem-tuoi',   icon: 'users' },
      { id: 'xem-lam-an', label: 'Xem tuổi làm ăn',     href: '/app/xem-lam-an', icon: 'briefcase' },
      { id: 'tuong-hop',  label: 'Tương hợp tuổi',      href: '/app/tuong-hop',  icon: 'heart' },
      { id: 'sinh-con',   label: 'Xem tuổi sinh con',   href: '/app/sinh-con',   icon: 'baby' },
      { id: 'chan-dung-vo-chong', label: 'Chân dung vợ chồng', href: '/app/chan-dung-vo-chong', icon: 'image' },
      { id: 'chan-dung-tien-kiep', label: 'Chân dung tiền kiếp', href: '/app/chan-dung-tien-kiep', icon: 'temple' },
      { id: 'duyen-no-tien-kiep', label: 'Duyên nợ tiền kiếp', href: '/app/duyen-no-tien-kiep', icon: 'heart-handshake' },
    ] },
    { group: 'Tử Bình', open: false, items: [
      { id: 'bat-tu',     label: 'Lá số Bát Tự',        href: '/app/bat-tu',     icon: 'rows' },
    ] },
    { group: 'Xem Tướng', open: false, items: [
      { id: 'dien-tuong', label: 'Diện Tướng AI',       href: '/app/dien-tuong', icon: 'user' },
      { id: 'nhan-tuong', label: 'Nhãn Tướng AI',       href: '/app/nhan-tuong', icon: 'eye' },
      { id: 'thu-tuong',  label: 'Thủ Tướng AI',        href: '/app/thu-tuong',  icon: 'hand' },
      { id: 'thanh-tuong', label: 'Thanh Tướng AI',     href: '/app/thanh-tuong', icon: 'mic' },
      { id: 'thanh-tuong-pro', label: 'Thanh Tướng Pro', href: '/app/thanh-tuong-pro', icon: 'mic' },
    ] },
    { group: 'Phong Thủy', open: false, items: [
      { id: 'phong-thuy', label: 'Phong Thủy Nội Thất',  href: '/app/phong-thuy', icon: 'leaf' },
      { id: 'bat-trach',  label: 'Hướng Bát Trạch',     href: '/app/bat-trach',  icon: 'compass' },
    ] },
    { group: 'Chọn Ngày / Lịch', open: false, items: [
      { id: 'chon-ngay',  label: 'Chọn ngày tốt',       href: '/app/chon-ngay',  icon: 'calendar' },
      { id: 'kim-lau',    label: 'Kim Lâu & Tam Tai',   href: '/app/kim-lau',    icon: 'calcheck' },
      { id: 'ngay-tot',   label: 'Ngày tốt trong tháng', href: '/app/ngay-tot',  icon: 'calcheck' },
      { id: 'hoang-dao',  label: 'Giờ hoàng đạo',       href: '/app/hoang-dao',  icon: 'clock' },
    ] },
    { group: 'Đặt Tên', open: false, items: [
      { id: 'dat-ten',    label: 'Đặt tên con',         href: '/app/dat-ten',    icon: 'tag' },
      { id: 'dat-ten-dn', label: 'Đặt tên doanh nghiệp', href: '/app/dat-ten-dn', icon: 'building' },
      { id: 'ngu-hanh-ten', label: 'Ngũ hành tên',      href: '/app/ngu-hanh-ten', icon: 'star' },
    ] },
    { group: 'Mệnh Lý', open: false, items: [
      { id: 'nap-am',     label: 'Nạp âm ngũ hành',     href: '/app/nap-am',     icon: 'wave' },
    ] },
    { group: 'Huyền Học', open: false, items: [
      { id: 'kinh-dich',  label: 'Kinh Dịch — Gieo quẻ', href: '/app/kinh-dich', icon: 'yin' },
      { id: 'mai-hoa',    label: 'Mai Hoa Dịch Số',     href: '/app/mai-hoa',   icon: 'flower' },
      { id: 'ky-mon',     label: 'Kỳ Môn Độn Giáp',     href: '/app/ky-mon',    icon: 'grid' },
      { id: 'luc-nham',   label: 'Lục Nhâm Giản',       href: '/app/luc-nham',   icon: 'compass' },
      { id: 'than-so-hoc', label: 'Thần số học',        href: '/app/than-so-hoc', icon: 'hash' },
    ] },
    // Nhóm RIÊNG, cố ý không nhét vào "Huyền Học": chiêm tinh Tây khác hệ hẳn
    // với cổ pháp Á Đông, để lẫn thì người dùng tưởng đọc được chéo nhau.
    { group: 'Chiêm Tinh Tây', open: false, items: [
      { id: 'ban-do-sao', label: 'Bản đồ sao lúc sinh',  href: '/app/ban-do-sao', icon: 'star' },
    ] },
    { group: 'Tài khoản', open: true, items: [
      { id: 'vi-luong',   label: 'Ví Lượng',            href: '/app/tai-khoan#credits', icon: 'wallet', balance: true },
      { id: 'ho-so',      label: 'Hồ sơ của tôi',       href: '/app/tai-khoan', icon: 'user' },
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
    // Hoa mai năm cánh — Mai Hoa Dịch Số (梅花易數) lấy tên từ cành mai.
    flower: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8V4.6"/><path d="M14.1 10.7l3.7-3.7"/><path d="M14.2 13.3l4.9 1.6"/><path d="M10.8 14l-3 4.2"/><path d="M9.8 12.4L4.6 10.7"/>',
    yin: '<circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9 9 9 0 0 1 0-18z"/><circle cx="12" cy="7.5" r="1"/><circle cx="12" cy="16.5" r="1"/>',
    hash: '<path d="M9 3 7 21M17 3l-2 18M4 8h16M3 16h16"/>',
    hand: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V3.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V12m0 .5V10a1.5 1.5 0 0 1 3 0v5.5c0 3.6-2 6.5-6 6.5h-1.5c-2.6 0-3.6-.9-5.2-3.4L5 15c-.7-1.1.5-2.4 1.7-1.7L8 14"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5-9 9"/>',
    temple: '<path d="m12 3 8 5H4z"/><path d="M3 8h18"/><path d="M6 8v9M18 8v9"/><path d="M10 17v-5h4v5"/><path d="M3 21h18"/>',
    // Lấy ĐÚNG path của nav.js (bộ icon dùng chung) — sidebar và trang Công Cụ
    // phải vẽ cùng một glyph cho cùng một công cụ.
    'heart-handshake': '<path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762"/>',
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + (ICONS[name] || ICONS.dot) + '</svg>';
  }
  var CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var ACTIVE = window.SHELL_ACTIVE || '';

  // ── MARKETING TRACKING ──
  // Nạp /track.js (nếu trang chưa có) để có window.Track + page_view; phát các
  // event funnel (tool_open/tool_run/chat_msg) từ shell. Emit an toàn: nếu Track
  // chưa sẵn sàng thì xếp hàng, flush khi script tải xong. Không bao giờ ném lỗi.
  var _trackQ = [];
  function track(type, props) {
    try {
      if (window.Track && window.Track.event) window.Track.event(type, props || {});
      else { _trackQ.push([type, props || {}]); ensureTrackJs(); }
    } catch (e) { /* ignore */ }
  }
  function flushTrack() {
    if (!(window.Track && window.Track.event)) return;
    var q = _trackQ.splice(0);
    q.forEach(function (a) { try { window.Track.event(a[0], a[1]); } catch (e) { /* ignore */ } });
  }
  function ensureTrackJs() {
    if (window.Track) { flushTrack(); return; }
    if (document.getElementById('tvmb-track-js')) return;
    var s = document.createElement('script');
    s.id = 'tvmb-track-js'; s.src = '/track.js?v=3'; s.async = true;
    s.onload = flushTrack;
    (document.head || document.documentElement).appendChild(s);
  }

  // ── VÒNG LẶP GIỚI THIỆU (viral loop) ──
  // Người nhận link chia sẻ đáp xuống /app/<tool>?ref=CODE — trước đây CHỈ
  // homepage và /cong-cu bắt được ?ref=, nên mắt xích "A chia sẻ → B đăng ký →
  // A được thưởng" đứt ngay tại đây (bảng referrals 0 dòng dù backend thưởng đã
  // viết xong từ lâu). Nạp /referral.js để mọi trang /app bắt mã.
  function ensureReferralJs() {
    if (window.Referral) return;
    if (document.getElementById('tvmb-referral-js')) return;
    var s = document.createElement('script');
    s.id = 'tvmb-referral-js'; s.src = '/referral.js?v=1'; s.async = true;
    (document.head || document.documentElement).appendChild(s);
  }

  // SỔ LÁ SỐ theo tài khoản (U4) — nạp ĐỘNG và CHỈ khi đã đăng nhập.
  //
  // Vì sao không đưa thẻ <script> vào 7 trang có form: thêm tay thì sẽ sót, mà
  // sót trang nào là trang đó âm thầm không có sổ. Vì sao chỉ khi đăng nhập:
  // khách vãng lai không có sổ, nạp thêm một file cho họ là tốn băng thông đổi
  // lấy một thứ không dùng được.
  //
  // ⚠️ Toàn bộ phần này là LỚP THÊM. `rememberBirth`/`getRememberedBirth`/
  // `prefillForm` vẫn chạy đồng bộ trên localStorage y như trước — sổ hỏng,
  // mạng chết hay file không nạp được thì trang vẫn hoạt động nguyên vẹn.
  function ensureUserChartsJs() {
    if (!getToken()) return;
    var go = function () { try { window.UserCharts.mount(); } catch (e) { /* ignore */ } };
    if (window.UserCharts) return go();
    var el = document.getElementById('tvmb-charts-js');
    if (el) { el.addEventListener('load', go); return; }
    var s = document.createElement('script');
    s.id = 'tvmb-charts-js'; s.src = '/user-charts.js?v=1'; s.async = true;
    s.addEventListener('load', go);
    (document.head || document.documentElement).appendChild(s);
  }

  // Mã giới thiệu CỦA CHÍNH người đang đăng nhập — nạp sẵn để lúc bấm "Chia sẻ"
  // gắn được ?ref= vào link mà không phải chờ thêm một vòng mạng.
  var _refCode = null, _refCodeBusy = false;
  function loadRefCode() {
    if (_refCode || _refCodeBusy) return;
    var tk = getToken(); if (!tk) return;
    _refCodeBusy = true;
    fetch('/api/payment?action=my-referral', { headers: { 'Authorization': 'Bearer ' + tk } })
      .then(function (r) { return r.json(); })
      .then(function (j) { _refCodeBusy = false; if (j && j.code) _refCode = j.code; })
      .catch(function () { _refCodeBusy = false; });
  }

  // Gắn mã giới thiệu + UTM vào link chia sẻ. utm_campaign = tool_id để panel
  // "Vòng Lặp Viral" tách được K-factor từng tool; ?ref= để người mở link đăng
  // ký thì người chia sẻ được thưởng. Chưa đăng nhập (hoặc chưa kịp có mã) thì
  // vẫn chia sẻ được, chỉ là không quy về ai — KHÔNG chặn luồng chia sẻ.
  // `opts.source`/`opts.medium` để tách ĐƯỜNG lan: link chia sẻ là share/link,
  // còn mã QR in trong ảnh tải về là poster/image. Gộp chung thì không bao giờ
  // biết ảnh có kéo được người thật về hay không — mà đó chính là câu hỏi.
  function withViralParams(url, toolId, opts) {
    try {
      var o = opts || {};
      var u = new URL(url);
      u.searchParams.set('utm_source', o.source || 'share');
      u.searchParams.set('utm_medium', o.medium || 'link');
      if (toolId) u.searchParams.set('utm_campaign', toolId);
      if (_refCode) u.searchParams.set('ref', _refCode);
      return u.toString();
    } catch (e) { return url; }
  }

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
        var pill = it.balance ? '<span class="pill" id="sbBalance">—</span>' : '';
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
      '<div class="rail-h"><img class="rail-ava" src="' + authorAva() + '" alt="Trợ lý Luận Đường" title="Đổi thầy luận giải">' +
      '<div><b>Trợ lý Luận Đường</b><span>' + esc(authorLabel()) + '</span></div>' +
      '<div class="tools">' +
        '<button class="rh-btn mobile-only" title="Đóng" data-act="rail-close">✕</button>' +
        (HIST_ON ? '<button class="rh-btn" title="Lịch sử hội thoại" data-act="history"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:15px;height:15px"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg></button>' : '') +
        '<button class="rh-btn" title="Chia sẻ phiên" data-act="share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:15px;height:15px"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.7 7.4-4.4M8.3 13.3l7.4 4.4"/></svg></button>' +
        '<button class="rh-btn" title="Hội thoại mới" data-act="newchat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:15px;height:15px"><path d="M12 5v14M5 12h14"/></svg></button>' +
      '</div></div>' +
      (HIST_ON ? '<div class="rail-hist" id="railHist" style="display:none"></div>' : '') +
      '<div class="ctx" id="railCtx" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:13px;height:13px;flex:0 0 auto"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg> <span id="railCtxTxt"></span></div>' +
      '<div class="chat" id="chat">' +
        '<div class="rail-empty" id="railEmpty"><div class="ei"><img src="' + authorAva() + '" alt=""></div><b>Chưa có lá số nào</b>' +
        '<p>Lập lá số ở khung giữa, rồi hỏi tôi bất cứ điều gì —<br>vận sự nghiệp, tình duyên, năm nay, tháng tới…</p></div>' +
      '</div>' +
      '<div class="rail-meter" id="railMeter" style="display:none"></div>' +
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
    var _shb = host.querySelector('[data-act="share"]'); if (_shb) _shb.addEventListener('click', shareSession);
    host.querySelector('[data-act="rail-close"]').addEventListener('click', function () { host.classList.remove('open'); syncBackdrop(); });
    host.querySelector('.rail-ava').addEventListener('click', openAuthorModal);
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
  var ctx = null;            // { birth } | { scenario }  (+ wrap tùy chọn)
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
  var ctxCalls = 0;   // số lần tool đã gọi setContext (0 = trang chưa dựng được gì)
  // Tool đã gộp: đọc kèm phiên lịch sử của tool cũ (la-so đã gộp vào luan-giai).
  var HIST_ALIAS = { 'luan-giai': ['la-so'] };
  function histKey(t) { return 'app_hist_v1_' + t; }
  function histLocal(t) { try { return JSON.parse(localStorage.getItem(histKey(t)) || '[]') || []; } catch (e) { return []; } }
  function histWrite(t, arr) { try { localStorage.setItem(histKey(t), JSON.stringify(arr.slice(0, HIST_CAP))); } catch (e) { /* quota */ } }
  function histLocalDelete(t, id) { histWrite(t, histLocal(t).filter(function (s) { return s.id !== id; })); }
  // ── Chuẩn hoá NGÀY SINH về MỘT shape (shape của TuviForm) ──
  // Trong repo có 3 shape birth từng được lưu/truyền:
  //   (a) TuviForm  — {hoten,ngay,thang,nam,gioHour,gioPhut,gioIdx,gioitinh} ← chuẩn hiện tại
  //   (b) form cũ   — {name,dd,mm,yyyy,hh,pp,gender}   (trước khi 3 trang la-so/
  //                   luan-giai/bat-tu chuyển sang TuviForm dùng chung)
  //   (c) contract  — {name,day,month,year,hourBranch,gender} ← shape GỬI LÊN API
  // Phiên lịch sử lưu trước lúc chuyển sang TuviForm mang shape (b); đọc thẳng
  // bằng TuviForm.setData thì KHÔNG khớp field nào → form trống → trang không tự
  // luận lại được → bấm vào phiên cũ "không hiện gì". Nên MỌI lượt ĐỌC birth đều
  // đi qua đây; ghi vẫn ghi shape hiện tại.
  function normBirth(b) {
    if (!b || typeof b !== 'object') return b || null;
    var o = {}, k;
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
    var num = function (v) { var n = parseInt(v, 10); return isNaN(n) ? undefined : n; };
    if (o.ngay == null) o.ngay = num(b.dd != null ? b.dd : b.day);
    if (o.thang == null) o.thang = num(b.mm != null ? b.mm : b.month);
    if (o.nam == null) o.nam = num(b.yyyy != null ? b.yyyy : b.year);
    if (o.gioHour == null && b.hh != null) o.gioHour = num(b.hh);
    if (o.gioPhut == null && b.pp != null) o.gioPhut = num(b.pp);
    // hourBranch = chỉ số địa chi 0..11 (KHÁC giờ 0..23) → giữ đúng đường gioIdx.
    if (o.gioIdx == null && b.hourBranch != null && b.hourBranch >= 0) o.gioIdx = num(b.hourBranch);
    if (!o.hoten && b.name) o.hoten = b.name;
    if (!o.gioitinh && b.gender) o.gioitinh = b.gender;
    if (o.namxem == null && b.namXem != null) o.namxem = num(b.namXem);
    return o;
  }
  // Đổi sang shape contract để GỬI API (/api/v1/chat chỉ hiểu day/month/year/hourBranch).
  function birthToApi(b) {
    var n = normBirth(b);
    if (!n || !n.ngay || !n.thang || !n.nam) return null;
    var idx = n.gioIdx;
    if (idx == null && n.gioHour != null) idx = Math.floor(((+n.gioHour + 1) % 24) / 2);
    return { day: +n.ngay, month: +n.thang, year: +n.nam,
      hourBranch: (idx == null ? -1 : +idx), gender: n.gioitinh === 'nu' ? 'nu' : 'nam',
      name: n.hoten || undefined };
  }
  function birthSnapshot() { try { return normBirth(JSON.parse(localStorage.getItem('app_birth') || 'null')); } catch (e) { return null; } }
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
  // Như histList nhưng GỘP cả tool cũ đã sáp nhập (HIST_ALIAS) — histFind vốn đã
  // tra kèm alias, nhưng phần LIỆT KÊ thì chưa, nên phiên `la-so` cũ không bao
  // giờ hiện ra để mà bấm. Mỗi bucket vẫn ghi vào key riêng của nó.
  function histListAll(tool, cb) {
    var tools = [tool].concat(HIST_ALIAS[tool] || []);
    if (tools.length === 1) { histList(tool, cb); return; }
    var latest = {};
    tools.forEach(function (t) {
      histList(t, function (list) {
        latest[t] = list;
        var all = [];
        tools.forEach(function (x) { (latest[x] || []).forEach(function (s) { all.push(s); }); });
        cb(histMerge(all, []));
      });
    });
  }
  function histFind(tool, id, cb) {
    var tools = [tool].concat(HIST_ALIAS[tool] || []); // gồm cả tool cũ đã gộp
    var hit = null;
    tools.forEach(function (t) { histLocal(t).forEach(function (s) { if (s.id === id) hit = s; }); });
    if (hit) { cb(hit); return; }
    var idx = 0;
    (function next() {
      if (idx >= tools.length) { cb(null); return; }
      histSrvList(tools[idx++], function (srv) {
        var h = null; (srv || []).forEach(function (s) { if (s.id === id) h = s; });
        if (h) cb(h); else next();
      });
    })();
  }
  // Lưu thread hiện tại sau mỗi lượt trả lời xong.
  function saveCurrent() {
    if (!HIST_ON || !ACTIVE || !curMeta) return;
    var msgs = stripImages(messages);
    if (!msgs.length) return;
    var last = '';
    for (var i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'assistant') { last = msgs[i].content; break; } }
    // Tool thuần-rail (không form/birth/lines để dựng lại center — vd xem tướng /
    // phong thủy qua ảnh): title generic giống nhau → lấy CÂU HỎI ĐẦU làm title
    // cho dễ phân biệt phiên.
    var title = curMeta.title || 'Phiên', r = curMeta.restore || {};
    var hasCenter = (r.form && Object.keys(r.form).length) || r.birth || r.lines;
    if (!hasCenter) { for (var k = 0; k < msgs.length; k++) { if (msgs[k].role === 'user' && msgs[k].content) { title = msgs[k].content.slice(0, 50); break; } } }
    var rec = { id: sessionId, toolId: ACTIVE, title: title, restore: curMeta.restore || null,
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
      else html += '<div class="msg a"><img class="msg-ava" src="' + authorAva() + '" alt=""><div class="msg-body">' + mdLite(m.content) + '</div></div>';
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
      // Ghi lại đã CHUẨN HOÁ: phiên cũ lưu birth shape {dd,mm,yyyy} — để nguyên
      // thì prefillForm/TuviForm.setData không nhận ra field nào (xem normBirth).
      if (sess.restore && sess.restore.birth) {
        try { localStorage.setItem('app_birth', JSON.stringify(normBirth(sess.restore.birth))); } catch (e) { /* ignore */ }
      }
      // Reload về ?auto=1 SẠCH (bỏ mọi query cũ như ?restore) → tránh lặp khi
      // đến từ deep-link hub Tài khoản; tool tự tính lại center + setContext replay.
      location.href = location.pathname + '?auto=1';
    });
  }
  // ── Lưới an toàn: phiên đã bấm mà tool KHÔNG dựng lại được phần giữa ──
  // Đường khôi phục chuẩn là: reload ?auto=1 → tool tự tính lại center → gọi
  // setContext → setContext replay transcript. Nếu tool không tự chạy được
  // (form đổi id, phiên thiếu ngày sinh, tool cần thao tác tay như gieo quẻ)
  // thì KHÔNG có ai gọi setContext: trang đứng im hệt như chưa bấm gì, mà cờ
  // trong sessionStorage còn nguyên → lượt chạy SAU đó bị nó chiếm chỗ và
  // replay nhầm transcript cũ. Nên: mở lại hội thoại bằng chính dữ liệu đã lưu.
  function restorePendingFallback() {
    if (!HIST_ON || !ACTIVE || ctxCalls) return;
    var m = null, d = null;
    try {
      m = JSON.parse(sessionStorage.getItem('app_restore') || 'null');
      d = JSON.parse(sessionStorage.getItem('app_restore_data') || 'null');
    } catch (e) { return; }
    if (!m || !d || m.toolId !== ACTIVE || !d.id) return;
    var r = d.restore || {};
    Shell.setContext({ birth: r.birth ? birthToApi(r.birth) : null, scenario: r.scenario || null,
      label: d.title || 'Phiên đã lưu' });
    // Không đủ dữ liệu để hỏi tiếp (không có cả lá số lẫn kịch bản): cho xem lại
    // hội thoại nhưng nói THẲNG là phải chạy lại tool, đừng để ô nhập trông như
    // dùng được rồi bấm gửi không có gì xảy ra.
    if (!ctx) {
      var ta = document.getElementById('railInput'), sb = document.getElementById('railSend');
      if (ta) { ta.disabled = true; ta.placeholder = 'Chạy lại công cụ để hỏi tiếp về phiên này.'; }
      if (sb) sb.disabled = true;
    }
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
    histListAll(ACTIVE, function (list) {
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
      // Xoá cả ở bucket tool cũ đã sáp nhập — danh sách nay gộp cả phiên của nó.
      b.addEventListener('click', function (e) {
        e.stopPropagation(); var id = b.getAttribute('data-del');
        [ACTIVE].concat(HIST_ALIAS[ACTIVE] || []).forEach(function (t) { histLocalDelete(t, id); });
        histSrvDelete(id); renderHistInto(el); renderRecentAll();
      });
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
    histListAll(ACTIVE, function (list) {
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
  // Nạp lại lịch sử khi đăng nhập SẴN SÀNG. Token access ngắn hạn (~1h) nên khi
  // mở lại tab/hôm sau, lúc boot token thường HẾT HẠN → _session=null → lần nạp
  // đầu bỏ qua server (chỉ thấy local, mà iOS ITP hay xoá local) → tưởng "mất
  // lịch sử". Auth refresh bằng cookie chạy BẤT ĐỒNG BỘ; khi có token trở lại
  // ta nạp lại + merge server rồi vẽ lại cả "Phiên gần đây" lẫn panel lịch sử. ──
  function refreshHistoryUI() {
    if (!HIST_ON) return;
    renderRecentAll();
    var el = document.getElementById('railHist');
    if (el && el.style.display && el.style.display !== 'none') renderHistInto(el);
  }
  // Đẩy các phiên đang CHỈ có ở local (tạo lúc chưa đăng nhập) lên server sau khi
  // đăng nhập sẵn sàng → lịch sử bền vững qua thiết bị/khi iOS xoá local. Best-effort.
  function pushLocalToServer() {
    if (!HIST_ON || !ACTIVE || !getToken()) return;
    var tools = [ACTIVE].concat(HIST_ALIAS[ACTIVE] || []);
    tools.forEach(function (t) {
      histLocal(t).forEach(function (rec) { if (rec && rec.messages && rec.messages.length) histSrvUpsert(rec); });
    });
  }

  // ── Author persona (thầy) — CHUNG cơ chế + CHUNG localStorage key với
  // tuvi-chat: mỗi phiên/máy random 1 thầy (avatar /authors/<id>.jpg + văn
  // phong). Gửi authorName/authorStyle lên /api/v1/chat để đổi giọng luận. ──
  var AUTHOR_ROSTER = [
    { id: 'bac-minh',    name: 'Bắc Minh',    style: 'Hệ thống, rõ ràng, luôn giải thích nguyên lý nền tảng trước khi luận sao. Xuất thân dạy học lâu năm, quen nếp giảng có mở-thân-kết. Luôn có 1 câu khẳng định chắc nịch kiểu "quy luật là quy luật, không có ngoại lệ" — nghe hơi phũ nhưng đúng, không chừa đường lùi.' },
    { id: 'co-nguyet',   name: 'Cổ Nguyệt',   style: 'Nghiêng về vòng Tràng Sinh và triết học cổ đại, nghiên cứu Dịch lý/cổ thư nhiều năm, sống khép kín. Hay tung ra 1 câu nghịch lý gây sốc nhẹ kiểu "cái bạn tự hào nhất chính là thứ đang âm thầm hại bạn" khiến người nghe khựng lại.' },
    { id: 'dau-nam',     name: 'Đẩu Nam',     style: 'Chuyên về tình cảm, hôn nhân, phu thê. Mê văn học lãng mạn Việt Nam nhưng nhìn đời thực tế. Hay nói thẳng phũ phàng 1 sự thật ít ai muốn nghe về tình yêu (kiểu "nhiều khi người ta ở lại vì quen chứ chưa chắc vì yêu") rồi mới nhẹ nhàng gỡ lại.' },
    { id: 'dieu-khong',  name: 'Diệu Không',  style: 'Chuyên về nghề nghiệp, sự nghiệp, tài lộc. Từng làm kinh doanh/quản lý trước khi theo nghiệp xem số, ghét vòng vo. Phán thẳng 1 câu có thể gây khó chịu nhưng đúng trọng tâm, kiểu "đang lãng phí tài năng ở đúng vị trí này" — không nịnh, hơi sốc.' },
    { id: 'huyen-khong', name: 'Huyền Không', style: 'Nhìn tổng quan số mệnh, sắc bén và khái quát, từng làm hoạch định chiến lược. Luôn mở bằng 1 câu tóm cả vận mệnh nghe như phán quyết định mệnh, kiểu "đời là ván cờ mà đang tự thua vì nhìn sai quân cờ chính".' },
    { id: 'linh-co',     name: 'Linh Cơ',     style: 'Uyên thâm về Dịch lý, âm dương ngũ hành, nghiên cứu cổ thư sâu. Hay chốt mỗi đoạn bằng 1 câu ngắn kiểu tiên tri, hơi bí ẩn, đọc xong phải ngẫm 2 giây mới thấy đúng.' },
    { id: 'linh-son',    name: 'Linh Sơn',    style: 'Kết hợp lá số với tướng số, thực dụng, đi nhiều tiếp xúc đủ hạng người. Hay chỉ thẳng 1 tật xấu quen thuộc bằng giọng hài hước kiểu bạn bè trêu nhau, không nể nang.' },
    { id: 'ngoc-tinh',   name: 'Ngọc Tinh',   style: 'Học thuật, mê đọc truyện kiếm hiệp và nghiên cứu văn học/lịch sử. Hay so sánh với 1 hình mẫu mà người nghe không ngờ tới, tạo hiệu ứng "ơ mà đúng thật", thích kể chuyện hơn liệt kê khô khan.' },
    { id: 'nhat-nguyen', name: 'Nhật Nguyên', style: 'Chính xác về vòng sao và chu kỳ vận hạn ngắn hạn, tỉ mỉ với số liệu/lịch trình. Hay đếm ngược mốc thời gian như cảnh báo deadline gấp, tạo cảm giác khẩn trương phải hành động ngay.' },
    { id: 'tam-kinh',    name: 'Tâm Kính',    style: 'Chú trọng thần khê và những điều ẩn khuất trong lá số, có thời gian tu tập/thiền định. Dùng ẩn dụ nhẹ nhàng chậm rãi rồi kết bằng 1 câu bẻ lái bất ngờ khiến người nghe sững lại.' },
    { id: 'thai-hu',     name: 'Thái Hư',     style: 'Logic chặt chẽ về tương quan sinh khắc giữa các sao, thích phản biện/tranh biện. Hay mở đầu bằng cách bác thẳng giả định của người hỏi ("vấn đề không phải ở chỗ đó") trước khi đưa quan điểm riêng — hơi gắt nhưng cuốn.' },
    { id: 'thanh-hu',    name: 'Thanh Hư',    style: 'Nhẹ nhàng, gần gũi, trẻ trung, cập nhật xu hướng, hay xem phim/mạng xã hội hiện đại. Xưng hô gần gũi, chêm 1 câu troll dí dỏm kiểu bạn thân trêu chọc, không quá lố.' },
    { id: 'thien-an',    name: 'Thiên Ẩn',    style: 'Tỉ mỉ về ý nghĩa từng sao, cẩn thận kiểm định từng chi tiết. Liệt kê từng dấu hiệu tưởng vô hại rồi chốt 1 câu "nhưng gộp lại thì..." khiến người nghe bất ngờ vì không lường trước combo.' },
    { id: 'tinh-quang',  name: 'Tinh Quang',  style: 'Nhìn lá số như một chỉnh thể toàn diện, thích liên kết mọi thứ. Nói như vừa khám phá ra "bí mật lớn nhất" của cả lá số, giọng có phần long trọng, kịch tính.' },
    { id: 'tu-nguyen',   name: 'Tử Nguyên',   style: 'Súc tích, thực tế, chuyên về đại vận và tiểu vận, ưa hành động hơn lý thuyết. Chốt bằng 1 câu duy nhất như bản án, không giải thích thêm — ngắn, chắc, cực kỳ dễ trích dẫn.' },
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
  function setAuthor(id) {
    var f = AUTHOR_ROSTER.filter(function (a) { return a.id === id; })[0];
    if (!f) return;
    _author = f;
    try { localStorage.setItem('tvc_author_v1', id); } catch (e) { /* ignore */ }
    var host = document.getElementById('shell-rail'); if (!host) return;
    var ava = host.querySelector('.rail-ava'); if (ava) ava.src = authorAva();
    var lbl = host.querySelector('.rail-h span'); if (lbl) lbl.textContent = authorLabel();
    var emptyAva = host.querySelector('#railEmpty img'); if (emptyAva) emptyAva.src = authorAva();
  }
  function openAuthorModal() {
    var rows = AUTHOR_ROSTER.map(function (a) {
      var sel = _author && _author.id === a.id;
      var tagline = a.style.split(/\.\s/)[0] + '.';
      return '<button class="sam-row' + (sel ? ' sel' : '') + '" data-id="' + a.id + '">' +
        '<img class="sam-ava" src="/authors/' + a.id + '.jpg" alt="">' +
        '<div class="sam-info"><b>' + esc(a.name) + '</b><span>' + esc(tagline) + '</span></div>' +
        (sel ? '<svg class="sam-chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" style="width:16px;height:16px"><path d="M20 6 9 17l-5-5"/></svg>' : '') +
      '</button>';
    }).join('');
    var wrap = document.createElement('div');
    wrap.className = 'sh-share-modal';
    wrap.innerHTML =
      '<div class="sam-card">' +
        '<button class="ssm-x" aria-label="Đóng">✕</button>' +
        '<div class="ssm-t">Chọn thầy luận giải</div>' +
        '<div class="ssm-d">Mỗi thầy một văn phong riêng. Chọn thầy hợp gu, hoặc để hệ thống chọn ngẫu nhiên.</div>' +
        '<button class="sam-rand">🎲 Để hệ thống chọn ngẫu nhiên</button>' +
        '<div class="sam-list">' + rows + '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    var close = function () { wrap.remove(); };
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('.ssm-x').addEventListener('click', close);
    wrap.querySelector('.sam-rand').addEventListener('click', function () {
      var pool = AUTHOR_ROSTER.filter(function (a) { return !_author || a.id !== _author.id; });
      var pick = pool[Math.floor(Math.random() * pool.length)] || AUTHOR_ROSTER[0];
      setAuthor(pick.id);
      close();
    });
    wrap.querySelectorAll('.sam-row').forEach(function (btn) {
      btn.addEventListener('click', function () { setAuthor(btn.getAttribute('data-id')); close(); });
    });
  }

  // ── CHIA SẺ PHIÊN (share full session như link ChatGPT) ──
  function _birthLabel() {
    try {
      var r = (curMeta && curMeta.restore) || {};
      if (r.scenario && r.scenario.data && (r.scenario.data.nameA || r.scenario.data.nameB))
        return (r.scenario.data.nameA || 'A') + ' × ' + (r.scenario.data.nameB || 'B');
      var bd = r.birth;
      if (bd && bd.dd) {
        var g = bd.gender === 'nu' ? 'Nữ' : 'Nam';
        var d = [bd.dd, bd.mm, bd.yyyy].filter(Boolean).join('/');
        return [(bd.name || '').trim(), d, g].filter(Boolean).join(' · ');
      }
    } catch (e) { /* ignore */ }
    return '';
  }
  function shareSession() {
    if (!messages || !messages.length) { alert('Chưa có nội dung để chia sẻ — hãy hỏi thầy vài câu trước.'); return; }
    var btn = document.querySelector('[data-act="share"]'); if (btn) btn.disabled = true;
    var payload = {
      toolId: ACTIVE || 'laso',
      title: (curMeta && curMeta.title) || 'Luận Đường',
      ctxLabel: _birthLabel(),
      thay: _author ? { id: _author.id, name: _author.name } : null,
      // restore: khung giữa (lá số/kịch bản) để người nhận NỐI PHIÊN hỏi tiếp.
      restore: (curMeta && curMeta.restore) || null,
      messages: (messages || []).map(function (m) { return { role: m.role, content: String(m.content || '') }; })
    };
    var headers = { 'Content-Type': 'application/json' };
    var tk = getToken(); if (tk) headers['Authorization'] = 'Bearer ' + tk;
    fetch('/api/share-session', { method: 'POST', headers: headers, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (btn) btn.disabled = false;
        if (!j || !j.url) { alert('Không tạo được link chia sẻ, thử lại sau.'); return; }
        var sessTool = ACTIVE || 'laso';
        var url = withViralParams(location.origin + j.url, sessTool);
        var onMedium = function (m) { track('share', { tool_id: sessTool, meta: { medium: m, kind: 'session', with_ref: !!_refCode } }); };
        // Điện thoại (iOS/Android): mở SHARE SHEET native của hệ điều hành —
        // đủ WhatsApp, Messages, AirDrop, Zalo… đúng trải nghiệm quen thuộc.
        // Người dùng bấm ✕ (AbortError) thì thôi; lỗi khác → rơi về modal tự dựng.
        var titleTxt = (curMeta && curMeta.title) || 'Luận Đường';
        var modalOpts = { title: 'Chia sẻ phiên Luận Đường', desc: 'Ai có link đều đọc được lá số và toàn bộ hỏi đáp trong phiên này.', shareText: 'Xem phần luận giải của thầy cho lá số này: ' };
        shareLink(url, { title: titleTxt + ' — Tử Vi Minh Bảo', text: 'Xem phần luận giải của thầy cho lá số này:', url: url }, modalOpts, onMedium);
      })
      .catch(function () { if (btn) btn.disabled = false; alert('Lỗi mạng khi tạo link chia sẻ.'); });
  }
  // opts: {title, desc, shareText} — cho phép tái dùng modal cho cả "chia sẻ
  // phiên rail" (shareSession) lẫn "chia sẻ kết quả khung giữa" (shareWorkspace).
  // ── Chia sẻ: chọn giữa share sheet native và modal tự dựng ────────────
  // BUG đã sửa: trước đây chỉ hỏi `if (navigator.share)`. Trên DESKTOP Chrome
  // hàm đó VẪN TỒN TẠI, nhưng ta gọi nó SAU `await fetch` — lúc đó "user
  // gesture" của cú click đã hết hạn, nên trình duyệt từ chối. Nhánh catch lại
  // return im lặng khi gặp AbortError → bấm Chia sẻ trên desktop KHÔNG RA GÌ.
  //
  // Nay: share sheet native CHỈ dùng trên thiết bị cảm ứng (nơi nó thật sự
  // tiện — Zalo/Messages/AirDrop). Desktop luôn mở modal có nút Sao chép +
  // Facebook/Zalo/WhatsApp. Bọc thêm try/catch vì vài bản Chrome ném lỗi ĐỒNG
  // BỘ chứ không trả promise lỗi.
  // OR các tín hiệu, KHÔNG ưu tiên cái nào: `userAgentData.mobile` chỉ đáng
  // tin khi nó TRUE (nhiều môi trường không set UA-CH nên trả false trên đúng
  // máy mobile — tự tay dính lúc test). `pointer: coarse` là tín hiệu chắc
  // nhất cho điện thoại/tablet thật. CỐ Ý không xét maxTouchPoints: laptop
  // Windows có màn cảm ứng vẫn là desktop, chuột vẫn là con trỏ chính.
  function isTouchDevice() {
    try {
      if (navigator.userAgentData && navigator.userAgentData.mobile === true) return true;
    } catch (e) { /* ignore */ }
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }
  //
  // onMedium(medium): gọi khi người dùng THẬT SỰ chọn một kênh để phát tán
  // (share sheet native / sao chép / Facebook / Zalo / WhatsApp). Bắn event
  // 'share' ở ĐÂY chứ không phải lúc tạo link — số dòng shared_results đã đếm
  // sẵn "link đã tạo", nên đo thêm ở đây mới tách được "tạo rồi bỏ" với "chia
  // sẻ thật", và không đếm trùng một lượt thành hai.
  function shareLink(url, payload, modalOpts, onMedium) {
    if (!navigator.share || !isTouchDevice()) { openShareModal(url, modalOpts, onMedium); return; }
    try {
      var p = navigator.share(payload);
      if (p && p.then) {
        p.then(function () { if (onMedium) onMedium('native'); },
          function (e) { if (e && e.name === 'AbortError') return; openShareModal(url, modalOpts, onMedium); });
      }
    } catch (e) {
      openShareModal(url, modalOpts, onMedium);
    }
  }

  function openShareModal(url, opts, onMedium) {
    opts = opts || {};
    var medium = function (m) { try { if (onMedium) onMedium(m); } catch (e) { /* ignore */ } };
    var mTitle = opts.title || 'Chia sẻ';
    var mDesc = opts.desc || 'Ai có link đều xem được nội dung này.';
    var shareText = opts.shareText || '';
    var enc = encodeURIComponent(url);
    var wrap = document.createElement('div');
    wrap.className = 'sh-share-modal';
    wrap.innerHTML =
      '<div class="ssm-card">' +
        '<button class="ssm-x" aria-label="Đóng">✕</button>' +
        '<div class="ssm-t">' + esc(mTitle) + '</div>' +
        '<div class="ssm-d">' + esc(mDesc) + '</div>' +
        '<div class="ssm-row"><input class="ssm-in" readonly value="' + esc(url) + '"><button class="ssm-copy">Sao chép</button></div>' +
        '<div class="ssm-share">' +
          '<a class="ssm-b fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + enc + '">Facebook</a>' +
          '<a class="ssm-b zl" target="_blank" rel="noopener" href="https://zalo.me/share/link?u=' + enc + '">Zalo</a>' +
          '<a class="ssm-b wa" target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText + url) + '">WhatsApp</a>' +
          '<a class="ssm-b" target="_blank" rel="noopener" href="' + esc(url) + '">Mở ↗</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    var close = function () { wrap.remove(); };
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('.ssm-x').addEventListener('click', close);
    wrap.querySelectorAll('.ssm-b').forEach(function (a) {
      a.addEventListener('click', function () {
        medium(a.classList.contains('fb') ? 'facebook'
          : a.classList.contains('zl') ? 'zalo'
            : a.classList.contains('wa') ? 'whatsapp' : 'open');
      });
    });
    var inp = wrap.querySelector('.ssm-in');
    wrap.querySelector('.ssm-copy').addEventListener('click', function () {
      medium('copy');
      inp.select();
      var done = function () { var b = wrap.querySelector('.ssm-copy'); b.textContent = 'Đã chép ✓'; setTimeout(function () { b.textContent = 'Sao chép'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } });
      else { try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } }
    });
  }

  // ── CHIA SẺ KẾT QUẢ KHUNG GIỮA (workspace) — dùng chung cho MỌI tool ──
  // ── Tóm tắt lá số cho trang chia sẻ ──────────────────────────────────
  // Người nhận link /ket-qua không có ngữ cảnh gì: không nói rõ lá số nào thì
  // kết quả thành vô danh (Henry bắt được ở tool Chân Dung Tiền Kiếp). Nên MỌI
  // tool có ngữ cảnh lá số đều tự kèm một dòng tóm tắt ở đầu bản chia sẻ.
  //
  // Shape birth KHÔNG thống nhất giữa các tool (tool tử vi dùng
  // {day,month,year,hourBranch,gender}, TuviForm.getData trả
  // {ngay,thang,nam,gioIdx,gioitinh}, vài chỗ dùng {dd,mm,yyyy}) nên đọc theo
  // nhiều tên; thiếu ngày/tháng/năm thì trả '' và KHÔNG chèn gì — thà không có
  // còn hơn hiện nửa vời.
  var SHARE_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  var SHARE_GIO = ['23–01h','01–03h','03–05h','05–07h','07–09h','09–11h','11–13h','13–15h','15–17h','17–19h','19–21h','21–23h'];
  function pick2(o, a, b, c) {
    if (!o) return undefined;
    if (o[a] !== undefined && o[a] !== null && o[a] !== '') return o[a];
    if (o[b] !== undefined && o[b] !== null && o[b] !== '') return o[b];
    if (c && o[c] !== undefined && o[c] !== null && o[c] !== '') return o[c];
    return undefined;
  }
  function birthSummaryLine(b) {
    if (!b || typeof b !== 'object') return '';
    var d = Number(pick2(b, 'day', 'ngay', 'dd'));
    var m = Number(pick2(b, 'month', 'thang', 'mm'));
    var y = Number(pick2(b, 'year', 'nam', 'yyyy'));
    if (!d || !m || !y) return '';
    var g = pick2(b, 'gender', 'gioitinh');
    var parts = [];
    var nm = (b.hoten || b.name || '').trim();
    if (nm) parts.push(nm);
    if (g) parts.push(g === 'nu' ? 'Nữ' : 'Nam');
    var lunar = b.isLunar === true || b.amlich === true || b.duongLich === false;
    parts.push(('0' + d).slice(-2) + '/' + ('0' + m).slice(-2) + '/' + y + (lunar ? ' (âm lịch)' : ' (dương lịch)'));
    var hi = Number(pick2(b, 'hourBranch', 'gioIdx', 'gio'));
    if (hi >= 0 && hi < 12) parts.push('giờ ' + SHARE_CHI[hi] + ' (' + SHARE_GIO[hi] + ')');
    return parts.join(' · ');
  }

  // Tool gọi Shell.setShareable({kind:'image'|'text', title, imageUrl?, text?})
  // ngay sau khi có kết quả → nút "Chia sẻ" tự hiện trong .ws-actions (nếu
  // trang có toolbar đó), không cần tool tự vẽ nút/markup riêng. Khác
  // shareSession (chia sẻ transcript rail): cái này chia sẻ ĐÚNG kết quả
  // (ảnh AI hoặc trích văn bản) ra permalink /ket-qua/<id> có OG:image thật.
  var shareable = null;
  function renderShareBtn() {
    var host = document.querySelector('.ws-actions');
    var btn = document.getElementById('wsShareBtn');
    if (!shareable) { if (btn) btn.remove(); return; }
    if (!host) return; // trang chưa có toolbar .ws-actions → bỏ qua, không vỡ gì
    loadRefCode(); // lúc boot có thể chưa đăng nhập; thử lại khi sắp có nút Chia sẻ
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn'; btn.id = 'wsShareBtn';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.7 7.4-4.4M8.3 13.3l7.4 4.4"/></svg>Chia sẻ';
      btn.addEventListener('click', shareWorkspace);
      host.insertBefore(btn, host.firstChild);
    }
  }
  function shareWorkspace() {
    if (!shareable) return;
    var btn = document.getElementById('wsShareBtn'); if (btn) btn.disabled = true;
    var s = shareable;
    var reEnable = function () { if (btn) btn.disabled = false; };
    // Gửi kèm token: server ghi shared_results.owner_user_id → panel Vòng Lặp
    // Viral đếm được SỐ NGƯỜI chia sẻ (mẫu số của K-factor), không chỉ số link.
    var headers = { 'Content-Type': 'application/json' };
    var tk0 = getToken(); if (tk0) headers['Authorization'] = 'Bearer ' + tk0;
    fetch('/api/share-result', {
      method: 'POST', headers: headers,
      body: JSON.stringify({ toolId: s.toolId, kind: s.kind, title: s.title, imageUrl: s.imageUrl, text: s.text, blocks: s.blocks }),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        reEnable();
        if (!j || !j.url) { alert('Không tạo được link chia sẻ, thử lại sau.'); return; }
        var url = withViralParams(location.origin + j.url, s.toolId);
        var onMedium = function (m) { track('share', { tool_id: s.toolId, meta: { medium: m, kind: 'workspace', with_ref: !!_refCode } }); };
        var shareTxt = 'Xem kết quả này trên Tử Vi Minh Bảo:';
        var modalOpts = { title: 'Chia sẻ ' + s.title, desc: 'Ai có link đều xem được kết quả này.', shareText: shareTxt + ' ' };
        // LUÔN share dạng LINK (giống hệt shareSession ở rail) — KHÔNG share
        // file ảnh thô qua Web Share API level 2: nhiều app nhận file (Messenger,
        // Zalo…) BỎ LUÔN url đi kèm, người nhận chỉ thấy ảnh, không bấm vào đâu
        // được. Ảnh vẫn hiện đẹp nhờ OG:image khi link được unfurl.
        shareLink(url, { title: s.title + ' — Tử Vi Minh Bảo', text: shareTxt, url: url }, modalOpts, onMedium);
      })
      .catch(function () { reEnable(); alert('Lỗi mạng khi tạo link chia sẻ.'); });
  }

  // ── NỐI PHIÊN từ link chia sẻ (?fromshare=<id>) ──
  // Người nhận đọc /luan-duong/<id> rồi bấm "Hỏi thầy tiếp" → về /app/<tool>?fromshare=<id>.
  // Ta tải snapshot (khung giữa + transcript + thầy), NHÉT qua đúng kênh khôi phục
  // lịch sử (app_restore/app_restore_data + app_birth) rồi reload ?auto=1 — tool tự
  // dựng lại lá số của người chia sẻ (deterministic, FREE) + replay hỏi đáp, sẵn
  // sàng cho người nhận hỏi tiếp. Câu hỏi MỚI mới tính Lượng (401 → mời đăng nhập,
  // tặng Lượng tân thủ). Trả true nếu đã tiếp quản (boot dừng, trang sắp reload).
  var _fromshareId = null, _convFired = false;
  function consumeFromShare() {
    var m = (location.search.match(/[?&]fromshare=([A-Za-z0-9]{6,16})\b/) || [])[1];
    if (!m) return false;
    var toClean = function (withAuto) {
      var s = location.search.replace(/([?&])fromshare=[^&]*/g, '$1').replace(/[?&]+$/, '').replace(/\?&/, '?').replace(/&&/g, '&');
      if (withAuto && !/[?&]auto=1\b/.test(s)) s += (s.indexOf('?') >= 0 ? '&' : '?') + 'auto=1';
      location.replace(location.pathname + s);
    };
    fetch('/api/share-session?id=' + encodeURIComponent(m))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.id) { toClean(false); return; } // hỏng/gỡ → bỏ param, boot thường
        try {
          if (j.thay && j.thay.id) localStorage.setItem('tvc_author_v1', j.thay.id); // tiếp nối đúng thầy
          var restore = j.restore || {};
          if (restore.birth) localStorage.setItem('app_birth', JSON.stringify(restore.birth));
          var sess = {
            id: newId(), toolId: ACTIVE, restore: restore, title: j.title || 'Phiên',
            messages: (j.messages || []).map(function (mm) { return { role: mm.role, content: mm.content }; }),
            createdAt: Date.now(), updatedAt: Date.now(),
          };
          sessionStorage.setItem('app_restore', JSON.stringify({ id: sess.id, toolId: ACTIVE }));
          sessionStorage.setItem('app_restore_data', JSON.stringify(sess));
          sessionStorage.setItem('app_fromshare_id', m);
        } catch (e) { /* ignore */ }
        toClean(true);
      })
      .catch(function () { toClean(false); });
    return true;
  }
  // Beacon đo phễu: người nhận nối phiên và hỏi thật lần đầu → +1 signup_count.
  function trackConvert(id) {
    try {
      var body = JSON.stringify({ id: id, kind: 'signup' });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/share-session/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/share-session/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    } catch (e) { /* ignore */ }
  }

  // ══════════════════════════════════════════════════════════════
  // CONVERT TRONG RAIL — đếm bằng CÂU, mời bằng LÁ SỐ
  // ══════════════════════════════════════════════════════════════
  //
  // Bối cảnh (đo prod 2026-07-30): người dùng an sao xong (miễn phí) là qua rail
  // hỏi ngay — đó là khoảnh khắc quan tâm cao nhất trong cả phễu. Trước đây rail
  // KHÔNG nói gì về số lượt còn lại, rồi đến lúc cạn thì bật một modal đòi tiền.
  // Tức là bán đúng vào lúc người ta vừa mới bắt đầu tin.
  //
  // Bốn thay đổi, không cái nào cần thêm lượt LLM:
  //   1. Đồng hồ tính bằng CÂU, không bằng Lượng ("còn 12 câu hỏi").
  //   2. Thẻ mời sau câu thứ 3, gọi tên ĐÚNG CUNG theo chủ đề đã hỏi.
  //   3. Tường hết-lượt liệt kê CỤ THỂ mục chưa đọc trong 24 mục.
  //   4. Câu chữ nói bằng lá số, không bằng tiền.

  // 24 mục của Luận Giải — KHỚP `PHAN_LABELS` trong luan-giai.html. Dùng để nói
  // CỤ THỂ người ta đang bỏ lỡ cái gì; "nạp Lượng để xem thêm" thì không ai biết
  // thêm là thêm gì.
  var LG_PHAN = [
    'Tổng Quan Lá Số',
    'Cung Mệnh', 'Cung Phụ Mẫu', 'Cung Phúc Đức', 'Cung Điền Trạch',
    'Cung Quan Lộc', 'Cung Nô Bộc', 'Cung Thiên Di', 'Cung Tật Ách',
    'Cung Tài Bạch', 'Cung Tử Tức', 'Cung Phu Thê', 'Cung Huynh Đệ',
    'Tổng quan đại vận',
    'Đại Vận 1', 'Đại Vận 2', 'Đại Vận 3', 'Đại Vận 4', 'Đại Vận 5',
    'Đại Vận 6', 'Đại Vận 7', 'Đại Vận 8', 'Đại Vận 9',
    'Tiểu Vận năm nay',
  ];

  // Chủ đề câu hỏi → cung. Tra bằng TỪ KHOÁ, deterministic, 0 đồng — cố ý không
  // nhờ LLM phân loại: thêm một lượt model cho mỗi câu hỏi là chi phí thật, mà
  // thứ cần chỉ là gọi đúng tên một cung.
  var TOPIC_CUNG = [
    { cung: 'Cung Tài Bạch', kw: ['tiền', 'tài chính', 'giàu', 'lương', 'thu nhập', 'đầu tư', 'nợ', 'lỗ', 'lãi', 'buôn', 'kinh doanh'] },
    { cung: 'Cung Quan Lộc', kw: ['công việc', 'sự nghiệp', 'nghề', 'thăng tiến', 'chức', 'công danh', 'thi', 'việc làm', 'sếp', 'nghỉ việc'] },
    { cung: 'Cung Phu Thê', kw: ['vợ', 'chồng', 'hôn nhân', 'kết hôn', 'cưới', 'yêu', 'người ấy', 'tình duyên', 'ly hôn', 'bạn gái', 'bạn trai'] },
    { cung: 'Cung Tử Tức', kw: ['con', 'con cái', 'sinh con', 'thai', 'hiếm muộn'] },
    { cung: 'Cung Tật Ách', kw: ['bệnh', 'sức khỏe', 'tai nạn', 'mổ', 'ốm', 'thương tích'] },
    { cung: 'Cung Phụ Mẫu', kw: ['cha', 'mẹ', 'bố', 'ba mẹ', 'phụ mẫu', 'song thân'] },
    { cung: 'Cung Điền Trạch', kw: ['nhà', 'đất', 'bất động sản', 'mua nhà', 'xây nhà', 'chung cư'] },
    { cung: 'Cung Thiên Di', kw: ['nước ngoài', 'xuất ngoại', 'đi xa', 'di cư', 'chuyển chỗ', 'du học', 'định cư'] },
    { cung: 'Cung Nô Bộc', kw: ['bạn bè', 'đồng nghiệp', 'cấp dưới', 'nhân viên', 'đối tác'] },
    { cung: 'Cung Huynh Đệ', kw: ['anh', 'chị', 'em ruột', 'huynh đệ', 'anh em'] },
    { cung: 'Cung Phúc Đức', kw: ['phúc', 'tâm linh', 'bình an', 'tổ tiên', 'nghiệp'] },
    { cung: 'Cung Mệnh', kw: ['tính cách', 'bản thân', 'con người tôi', 'mệnh của tôi', 'tôi là người'] },
  ];
  function detectCung(txt) {
    var s = String(txt || '').toLowerCase();
    for (var i = 0; i < TOPIC_CUNG.length; i++) {
      var e = TOPIC_CUNG[i];
      for (var j = 0; j < e.kw.length; j++) if (s.indexOf(e.kw[j]) >= 0) return e.cung;
    }
    return null;
  }

  // Trạng thái ví cho rail. `price` để null nghĩa là CHƯA BIẾT giá → đồng hồ im
  // lặng thay vì đoán. Đoán giá rồi hiện sai số câu là nói sai với người dùng
  // ngay trên thứ họ dùng để quyết định.
  var _rc = { balance: null, price: null, freeTurns: 0, lasoPrice: null, vndPerCredit: 1000, loaded: false,
              anon: false, anonLeft: null, anonCap: 0 };

  // anon_id do track.js sinh (localStorage 'tvmb_anon'). Chỉ để đếm lượt DÙNG
  // THỬ cho khách chưa đăng nhập — KHÔNG phải danh tính, xoá localStorage là có
  // mã mới. Chống lạm dụng thật nằm ở trần theo IP/ngày + trần toàn hệ thống
  // phía server.
  function anonId() {
    try { return localStorage.getItem('tvmb_anon') || ''; } catch (e) { return ''; }
  }
  var _askCount = 0;      // số câu người dùng đã hỏi trong phiên này
  var _upsellShown = false;
  var _cungAsked = [];    // các cung đã chạm tới, theo thứ tự hỏi

  function railTurnsLeft() {
    // Khách chưa đăng nhập: đếm lượt DÙNG THỬ, không liên quan tới ví.
    if (_rc.anon) return _rc.anonLeft;
    if (_rc.price == null || _rc.balance == null) return null;
    if (_rc.price <= 0) return Infinity;
    return _rc.freeTurns + Math.floor(_rc.balance / _rc.price);
  }

  function loadRailStatus() {
    var token = getToken();
    var url = token
      ? '/api/payment?action=rail-status'
      : '/api/payment?action=rail-status&anon=' + encodeURIComponent(anonId());
    var opts = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
    fetch(url, opts)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        if (d.anon) {
          _rc.anon = true;
          _rc.anonLeft = typeof d.anonTrialLeft === 'number' ? d.anonTrialLeft : null;
          _rc.anonCap = d.anonTrialCap || 0;
          _rc.lasoPrice = typeof d.lasoPrice === 'number' ? d.lasoPrice : null;
          _rc.vndPerCredit = d.vndPerCredit || 1000;
          _rc.loaded = true;
          renderRailMeter();
          return;
        }
        _rc.anon = false;
        _rc.balance = typeof d.balance === 'number' ? d.balance : null;
        _rc.price = typeof d.railPrice === 'number' ? d.railPrice : null;
        _rc.lasoPrice = typeof d.lasoPrice === 'number' ? d.lasoPrice : null;
        _rc.freeTurns = d.freeTurns || 0;
        _rc.vndPerCredit = d.vndPerCredit || 1000;
        _rc.loaded = true;
        renderRailMeter();
      })
      .catch(function () { /* đồng hồ chỉ là trợ giúp — hỏng thì im lặng, không chặn hỏi */ });
  }

  // Đồng hồ đếm CÂU. "Còn 24 Lượng" là con số trừu tượng — không ai biết nhiều
  // hay ít. "Còn 12 câu hỏi" thì biết ngay.
  function renderRailMeter() {
    var el = document.getElementById('railMeter');
    if (!el) return;
    var n = railTurnsLeft();
    if (!ctx || n === null || n === Infinity) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    var cls = n === 0 ? ' out' : (n <= 3 ? ' low' : '');
    var txt, act = '';
    if (_rc.anon) {
      // Khách chưa đăng nhập: nói rõ đây là lượt DÙNG THỬ, và lối đi tiếp là
      // ĐĂNG KÝ (kèm con số cụ thể) chứ không phải nạp tiền — người chưa từng
      // dùng thì mời nạp tiền là mời quá sớm.
      txt = n === 0 ? 'Đã hết câu dùng thử' : 'Dùng thử: còn <b>' + n + '</b> câu';
      act = '<a class="rm-a" href="#" data-act="anon-signup">Đăng ký nhận thêm</a>';
    } else if (n === 0) {
      txt = 'Đã dùng hết lượt hỏi';
      act = '<a class="rm-a" href="/topup.html">Nạp thêm</a>';
    } else if (_rc.freeTurns > 0) {
      txt = 'Còn <b>' + n + '</b> câu hỏi <span class="rm-sub">(' + _rc.freeTurns + ' lượt tặng)</span>';
      if (n <= 3) act = '<a class="rm-a" href="/topup.html">Nạp thêm</a>';
    } else {
      txt = 'Còn <b>' + n + '</b> câu hỏi';
      if (n <= 3) act = '<a class="rm-a" href="/topup.html">Nạp thêm</a>';
    }
    el.className = 'rail-meter' + cls;
    el.innerHTML = '<span class="rm-t">' + txt + '</span>' + act;
    var su = el.querySelector('[data-act="anon-signup"]');
    if (su) su.addEventListener('click', function (ev) { ev.preventDefault(); openAnonSignupModal(); });
  }

  // Đọc lại ví từ event `done` của server — nguồn chính xác nhất, và không tốn
  // thêm một lượt mạng nào.
  // ── Tường ĐĂNG KÝ cho khách dùng thử ──
  // Khác hẳn tường hết-Lượng: người này CHƯA có tài khoản, nên lối đi tiếp là
  // đăng ký (miễn phí) chứ không phải nạp tiền. Con số quà đăng ký lấy từ
  // SERVER — hứa "25 Lượng" mà DB đổi thành số khác là hứa hụt ngay lần đầu,
  // đúng lỗi đã gặp ở topup.html.
  var _anonBonus = null; // Lượng quà đăng ký, đọc 1 lần
  function openAnonSignupModal() {
    if (document.querySelector('.sh-topup-modal')) return;
    var thay = authorLabel();
    var price = _rc.price;
    function build(bonus) {
      var câu = (bonus && price) ? Math.floor(bonus / price) : null;
      var wrap = document.createElement('div');
      wrap.className = 'sh-topup-modal';
      wrap.innerHTML =
        '<div class="stm-card">' +
          '<button class="stm-x" aria-label="Đóng">✕</button>' +
          '<img class="stm-ava" src="' + authorAva() + '" alt="">' +
          '<div class="stm-t">Hết phần dùng thử rồi…</div>' +
          '<div class="stm-d">' + esc(thay) + ' còn nhiều điều muốn nói về lá số này. ' +
            (câu ? 'Đăng ký (miễn phí) là được tặng <b>' + bonus + ' Lượng</b> — đủ hỏi thêm <b>' + câu + ' câu</b> nữa.'
                 : 'Đăng ký miễn phí để được tặng Lượng và hỏi tiếp.') +
            ' Lá số vẫn xem miễn phí, không mất gì.</div>' +
          '<button class="stm-btn" type="button" data-act="do-signup">Đăng ký miễn phí →</button>' +
          '<button class="stm-later" type="button">Để sau</button>' +
        '</div>';
      document.body.appendChild(wrap);
      var close = function () { wrap.remove(); };
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      wrap.querySelector('.stm-x').addEventListener('click', close);
      wrap.querySelector('.stm-later').addEventListener('click', close);
      wrap.querySelector('[data-act="do-signup"]').addEventListener('click', function () {
        close();
        try { track('cta_click', { tool_id: ACTIVE, meta: { from: 'anon_trial_wall' } }); } catch (e) { /* ignore */ }
        if (window.Auth && Auth.require) Auth.require(function () { loadRailStatus(); refreshHistoryUI && refreshHistoryUI(); });
      });
    }
    if (_anonBonus != null) { build(_anonBonus); return; }
    // Quà đăng ký nằm trong app_config `credits.signup_bonus_variants` (mảng) —
    // lấy mức THẤP NHẤT để không hứa quá.
    fetch('/api/payment?action=signup-bonus')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { _anonBonus = (d && d.bonus) || null; build(_anonBonus); })
      .catch(function () { build(null); });
  }

  function applyPaywallInfo(pw) {
    if (!pw) return;
    if (typeof pw.anonTrialLeft === 'number') { _rc.anon = true; _rc.anonLeft = pw.anonTrialLeft; }
    if (typeof pw.balance === 'number') _rc.balance = pw.balance;
    if (typeof pw.price === 'number') _rc.price = pw.price;
    if (typeof pw.freeTurns === 'number') _rc.freeTurns = pw.freeTurns;
    if (_rc.price != null && _rc.balance != null) _rc.loaded = true;
    renderRailMeter();
  }

  function creditVnd(c) {
    var v = Math.ceil((c * (_rc.vndPerCredit || 1000)) / 1000) * 1000;
    return v.toLocaleString('vi-VN') + 'đ';
  }

  // Thẻ mời — chèn vào giữa dòng hội thoại SAU câu thứ 3, gọi tên đúng cung mà
  // người ta vừa hỏi. Bán ở khoảnh khắc đã tỏ ý quan tâm, không phải lúc cạn ví.
  function maybeShowUpsell() {
    if (_upsellShown || !ctx || !ctx.birth) return;   // cần lá số thật mới mời Luận Giải
    if (ACTIVE === 'luan-giai') return;               // đang ở chính tool đó rồi
    if (_askCount < 3) return;
    if (_rc.lasoPrice == null) return;                // chưa biết giá thì không hứa gì
    _upsellShown = true;

    var cung = null;
    for (var i = _cungAsked.length - 1; i >= 0; i--) { if (_cungAsked[i]) { cung = _cungAsked[i]; break; } }
    var rest = LG_PHAN.filter(function (p) { return p !== cung; });
    var preview = rest.slice(0, 5).join(' · ');

    var lead = cung
      ? 'Mấy câu vừa rồi của bạn xoay quanh <b>' + esc(cung) + '</b>.'
      : 'Bạn đang hỏi khá sâu về lá số này.';

    var chat = document.getElementById('chat');
    if (!chat) return;
    var card = document.createElement('div');
    card.className = 'rail-upsell';
    card.innerHTML =
      '<div class="ru-t">' + lead + '</div>' +
      '<div class="ru-d">Bản <b>Luận Giải</b> soi trọn <b>' + LG_PHAN.length + ' mục</b> của chính lá số này — ' +
        (cung ? esc(cung) + ' có mục riêng, cùng ' : '') + rest.length + ' mục còn lại: ' +
        '<span class="ru-list">' + esc(preview) + '…</span></div>' +
      '<div class="ru-f">' +
        '<a class="ru-btn" href="/app/luan-giai">Xem trọn ' + LG_PHAN.length + ' mục — ' + _rc.lasoPrice + ' Lượng</a>' +
        '<span class="ru-price">≈ ' + creditVnd(_rc.lasoPrice) + '</span>' +
      '</div>';
    chat.appendChild(card);
    chat.scrollTop = chat.scrollHeight;
    try { track('cta_click', { tool_id: ACTIVE, meta: { from: 'rail_upsell_shown', cung: cung || null } }); } catch (e) { /* ignore */ }
    var btn = card.querySelector('.ru-btn');
    if (btn) btn.addEventListener('click', function () {
      try { track('cta_click', { tool_id: 'laso', meta: { from: 'rail_upsell', cung: cung || null } }); } catch (e) { /* ignore */ }
    });
  }

  // ── Modal HẾT LƯỢNG (giọng thầy) — bật khi rail nhận 402 ──
  function _viewerName() {
    try { var r = (curMeta && curMeta.restore) || {}; if (r.birth && r.birth.name) return String(r.birth.name).trim(); } catch (e) { /* ignore */ }
    return '';
  }
  // Tường hết-lượt. CỐ Ý nói bằng LÁ SỐ chứ không bằng tiền: dẫn bằng thứ người
  // ta nhận được (trọn 24 mục của CHÍNH lá số này, kể tên vài mục cụ thể), rồi
  // mới tới giá. Bản cũ chỉ nói "phần Lượng trong ví đã cạn — nạp thêm", tức là
  // đòi tiền mà không cho biết đang mua cái gì.
  function openTopupModal() {
    if (document.querySelector('.sh-topup-modal')) return;
    var nm = _viewerName(), thay = authorLabel();
    var hasLaso = !!(ctx && ctx.birth) && ACTIVE !== 'luan-giai' && _rc.lasoPrice != null;
    var preview = LG_PHAN.slice(1, 6).join(' · ');
    var wrap = document.createElement('div');
    wrap.className = 'sh-topup-modal';
    wrap.innerHTML =
      '<div class="stm-card">' +
        '<button class="stm-x" aria-label="Đóng">✕</button>' +
        '<img class="stm-ava" src="' + authorAva() + '" alt="">' +
        '<div class="stm-t">Quẻ còn dở, xin phép dừng ở đây…</div>' +
        (hasLaso
          ? '<div class="stm-d">' + esc(thay) + ' còn nhiều điều muốn tỏ tường' + (nm ? ' cho ' + esc(nm) : '') +
              '. Bản <b>Luận Giải</b> soi trọn <b>' + LG_PHAN.length + ' mục</b> của chính lá số này — ' +
              esc(preview) + '… — thay vì hỏi lẻ từng câu.</div>' +
            '<a class="stm-btn" href="/app/luan-giai">Xem trọn ' + LG_PHAN.length + ' mục — ' + _rc.lasoPrice + ' Lượng (≈ ' + creditVnd(_rc.lasoPrice) + ')</a>' +
            '<a class="stm-alt" href="/topup.html">Hoặc nạp Lượng để hỏi tiếp từng câu →</a>'
          : '<div class="stm-d">' + esc(thay) + ' còn nhiều điều muốn tỏ tường' + (nm ? ' cho ' + esc(nm) : '') +
              ', nhưng phần Lượng trong ví đã cạn. Nạp thêm để thầy luận tiếp mạch còn dang dở nhé.</div>' +
            '<a class="stm-btn" href="/topup.html">Nạp Lượng để hỏi tiếp →</a>') +
        '<button class="stm-later" type="button">Để sau</button>' +
      '</div>';
    document.body.appendChild(wrap);
    try { track('cta_click', { tool_id: ACTIVE, meta: { from: hasLaso ? 'rail_wall_laso' : 'rail_wall_topup' } }); } catch (e) { /* ignore */ }
    var close = function () { wrap.remove(); };
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('.stm-x').addEventListener('click', close);
    wrap.querySelector('.stm-later').addEventListener('click', close);
  }

  function autoGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 96) + 'px'; }
  // Render Markdown nhẹ cho rail: **đậm** + đoạn văn + BẢNG GFM (| ô | với hàng
  // phân cách ---) + list "- "/"* ". Trả về HTML KHỐI (tự bọc <p>/<table>/<ul>)
  // → nơi gọi KHÔNG bọc thêm <p>. Bảng/list chỉ hiện khi model xuất; mặc định
  // vẫn là văn xuôi nên hội thoại thường không đổi.
  function mdInline(t) { return esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }
  function mdRow(r) { return r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
  function mdLite(s) {
    var lines = String(s == null ? '' : s).split('\n');
    var out = [], para = [], i = 0;
    function flush() { if (para.length) { out.push('<p>' + para.map(mdInline).join('<br>') + '</p>'); para = []; } }
    while (i < lines.length) {
      var ln = lines[i];
      if (ln.trim() === '') { flush(); i++; continue; }
      // Bảng: dòng có '|' và dòng KẾ là hàng phân cách (chỉ - : | và khoảng trắng, có ≥1 '-').
      if (ln.indexOf('|') >= 0 && i + 1 < lines.length && /-/.test(lines[i + 1]) && /^[\s|:-]+$/.test(lines[i + 1])) {
        flush();
        var head = mdRow(ln); i += 2; var rows = [];
        while (i < lines.length && lines[i].indexOf('|') >= 0 && lines[i].trim() !== '') { rows.push(mdRow(lines[i])); i++; }
        out.push('<div class="md-tblwrap"><table class="md-tbl"><thead><tr>' +
          head.map(function (c) { return '<th>' + mdInline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + mdInline(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div>');
        continue;
      }
      // List "- " / "* ".
      if (/^\s*[-*]\s+/.test(ln)) {
        flush(); var items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push('<li>' + mdInline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>'); i++; }
        out.push('<ul class="md-ul">' + items.join('') + '</ul>');
        continue;
      }
      para.push(ln); i++;
    }
    flush();
    return out.join('');
  }
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
      '<div class="msg a"><img class="msg-ava" src="' + authorAva() + '" alt=""><div class="msg-body">' + mdLite(o.greeting || 'Lá số đã sẵn sàng. Bạn muốn tôi soi điều gì trước?') + '</div></div>';
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
      // wrap: vỏ bọc kể chuyện cho luồng lá số (hiện chỉ 'past-life' — rail
      // tool Chân Dung Tiền Kiếp trả lời qua nhân vật thay vì luận thẳng).
      // Chỉ là CỜ, nội dung nhân vật do server tự tính lại từ birth.
      // wrapBirthB: lá số NGƯỜI THỨ HAI, chỉ dùng cho wrap 'past-life-bond'
      // (tool Duyên Nợ Tiền Kiếp). Mối duyên và nền văn minh chung suy từ QUAN
      // HỆ giữa hai lá số — thiếu vế này thì rail kể một thế giới khác hẳn thế
      // giới đang hiện trên màn hình.
      ctx = (o.birth || o.scenario) ? { birth: o.birth || null, scenario: o.scenario || null, wrap: o.wrap || null, wrapBirthB: o.wrapBirthB || null } : null;
      ctxCalls++;
      // Funnel: tool đã tính ra kết quả + gắn ngữ cảnh = "đã dùng tool" (activation).
      try { track('tool_run', { tool_id: ACTIVE, slug: (o.scenario && o.scenario.type) || null }); } catch (e) { /* ignore */ }
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
      // Ngữ cảnh mới = phiên hỏi mới: đếm lại từ đầu và cho thẻ mời hiện lại.
      _askCount = 0; _upsellShown = false; _cungAsked = [];
      // Nạp ví để đồng hồ hiện "còn N câu" NGAY khi mở rail, chưa cần hỏi câu nào.
      loadRailStatus();
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
    // Nhớ thông tin sinh để chuyển tay giữa các tool trong shell (Lá số ↔ Luận giải ↔
    // Bát Tự) — fd = TuviForm.getData() (hoten/ngay/thang/nam/gioHour/gioPhut/gioitinh)
    // + namxem riêng của trang (năm luận, ngoài field TuviForm). localStorage, không server.
    // localStorage GIỮ NGUYÊN là đường ghi chính và ĐỒNG BỘ — mọi tool đọc lại
    // ngay ở lượt sau bằng getRememberedBirth(). Phần ghi lên sổ tài khoản là
    // BẮN-VÀ-QUÊN nằm sau: không await, không chặn, hỏng thì thôi. Đảo thứ tự
    // hai việc này là biến một hàm đồng bộ thành phụ thuộc mạng.
    rememberBirth: function (fd) {
      try { localStorage.setItem('app_birth', JSON.stringify(fd)); } catch (e) { /* ignore */ }
      try { if (window.UserCharts) window.UserCharts.save(fd, ''); } catch (e) { /* ignore */ }
    },
    getRememberedBirth: function () { return birthSnapshot(); },
    // Gắn UTM + mã giới thiệu vào một URL bất kỳ (dùng cho mã QR in trong ảnh
    // tải về — ảnh không mang link bấm được nên QR là đường đo duy nhất).
    viralUrl: function (url, toolId, opts) { return withViralParams(url, toolId, opts); },
    // Đổi birth (shape bất kỳ) sang shape contract để gửi Shell.setContext({birth}).
    birthToApi: function (b) { return birthToApi(b); },
    // Ngày sinh truyền THẲNG qua URL (?ngay=&thang=&nam=&gio=&gioitinh=&namxem=),
    // `gio` là giờ DƯƠNG 0–23 (không phải chỉ số địa chi) — khớp field gioHour của
    // TuviForm.setData, tránh nhánh gioIdx của nó.
    //
    // Dùng cho link từ các trang SEO tĩnh (/la-so/*): slug ĐÃ chứa đủ ngày/giờ/giới
    // nhưng trước đây CTA trỏ trơ tới /luan-giai.html, nên người đọc bị trả về một
    // form TRỐNG và phải gõ lại đúng cái ngày sinh vừa xem — đo 7 ngày (28/07):
    // 35 khách đọc trang SEO, đúng 1 người đi tiếp sang tool.
    _birthFromQuery: function () {
      var p, ngay, thang, nam, gio, nx, b;
      try { p = new URLSearchParams(window.location.search); } catch (e) { return null; }
      ngay = parseInt(p.get('ngay'), 10); thang = parseInt(p.get('thang'), 10); nam = parseInt(p.get('nam'), 10);
      // parseInt(null) = NaN → mọi so sánh false → thiếu tham số là tự loại.
      if (!(ngay >= 1 && ngay <= 31) || !(thang >= 1 && thang <= 12) || !(nam >= 1900 && nam <= 2100)) return null;
      b = { ngay: ngay, thang: thang, nam: nam, gioitinh: p.get('gioitinh') === 'nu' ? 'nu' : 'nam' };
      gio = parseInt(p.get('gio'), 10);
      if (gio >= 0 && gio <= 23) { b.gioHour = gio; b.gioPhut = 0; }
      nx = parseInt(p.get('namxem'), 10);
      if (nx >= 2000 && nx <= 2100) b.namxem = nx;
      return b;
    },
    // Điền sẵn form (3 trang la-so/luan-giai/bat-tu dùng chung TuviForm mode:'compact'
    // + input #inpNamxem riêng cho năm luận).
    // URL ĐÈ localStorage: người bấm một link lá số cụ thể muốn xem lá số TRONG link
    // đó, không phải lá số họ tra lần trước.
    prefillForm: function () {
      var b = this._birthFromQuery() || this.getRememberedBirth(); if (!b) return false;
      if (typeof TuviForm !== 'undefined') TuviForm.setData(b);
      var namxemEl = document.getElementById('inpNamxem');
      if (namxemEl && b.namxem != null && b.namxem !== '') namxemEl.value = b.namxem;
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
    // Chia sẻ kết quả khung giữa (workspace) — dùng chung cho mọi tool. Gọi
    // ngay sau khi có kết quả: Shell.setShareable({kind:'image'|'text', title,
    // imageUrl?, text?, blocks?}). blocks (tùy chọn) = mảng {header?,image?,text?}
    // để trang /ket-qua render lại y hệt layout card (.res-block) của workspace
    // thay vì chỉ ảnh+text phẳng — dùng khi kết quả có nhiều "thẻ" như workspace
    // (vd Cung Phu Thê / Chân Dung / Luận Giải). Gọi Shell.setShareable(null) để
    // ẩn nút (vd tool quay lại form nhập để làm mới kết quả).
    /** Một dòng tóm tắt lá số — trang tự render để hiện trên màn hình, dùng
     *  CHUNG chuỗi với bản chèn vào link chia sẻ (không lệch nhau). */
    birthSummary: function (b) { return birthSummaryLine(b); },
    setShareable: function (o) {
      if (!o) { shareable = null; renderShareBtn(); return; }
      var kind = o.kind === 'image' ? 'image' : 'text';
      var blocks = Array.isArray(o.blocks) ? o.blocks.slice() : null;
      var text = o.text || null;
      // Lá số của CHÍNH lượt này: tool truyền thẳng (o.birth) hoặc lấy từ ngữ
      // cảnh tool đã set. CỐ Ý không đụng birthSnapshot()/localStorage — lá số
      // còn sót từ tool khác sẽ gắn nhầm chủ nhân cho bản chia sẻ.
      var bLine = birthSummaryLine(o.birth || (ctx && ctx.birth) || null);
      if (bLine) {
        if (blocks) blocks.unshift({ header: 'Lá số dùng để luận', text: bLine });
        else if (kind === 'text') text = bLine + '\n\n' + (text || '');
        else blocks = [{ header: 'Lá số dùng để luận', text: bLine },
          { header: null, image: o.imageUrl || null, text: text }];
      }
      shareable = {
        kind: kind,
        toolId: o.toolId || ACTIVE || 'app',
        title: String(o.title || 'Kết quả Luận Đường').slice(0, 160),
        imageUrl: o.imageUrl || null,
        text: text,
        blocks: blocks,
      };
      renderShareBtn();
    },
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
      // Hội thoại mới → đếm lại câu, và cho thẻ mời có cơ hội hiện lại (một lần
      // mỗi hội thoại, không phải một lần mỗi phiên trình duyệt).
      _askCount = 0; _upsellShown = false; _cungAsked = [];
      renderRailMeter();
    }
  }

  async function sendMsg() {
    if (streaming || !ctx) return;
    var input = document.getElementById('railInput');
    var text = input.value.trim();
    var imgs = pendingImages.slice();
    if (!text && !imgs.length) return;
    try { track('chat_msg', { tool_id: ACTIVE, slug: (ctx && ctx.scenario && ctx.scenario.type) || null, meta: { has_img: imgs.length > 0 } }); } catch (e) { /* ignore */ }
    // Đếm câu + ghi nhận chủ đề (cho thẻ mời) TRƯỚC khi gọi API — chủ đề suy từ
    // chính câu hỏi, không cần đợi câu trả lời.
    _askCount++;
    _cungAsked.push(detectCung(text));
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
      // anon_id đi kèm để server đếm lượt DÙNG THỬ khi chưa đăng nhập. Người đã
      // đăng nhập vẫn gửi (vô hại — server bỏ qua vì có token).
      var body = { session_id: sessionId, stream: true, messages: messages.slice(-12), client: { platform: 'web', version: '1.0.0', anon_id: anonId() } };
      if (ctx.birth) body.birth = ctx.birth;
      if (ctx.scenario) body.scenario = ctx.scenario;
      if (ctx.wrap) body.wrap = ctx.wrap;
      if (ctx.wrapBirthB) body.wrapBirthB = ctx.wrapBirthB;
      // Văn phong thầy: gửi top-level (luồng lá số) + trong scenario (luồng kịch bản).
      if (_author) {
        body.authorName = _author.name; body.authorStyle = _author.style;
        if (body.scenario) { body.scenario = Object.assign({}, body.scenario, { authorName: _author.name, authorStyle: _author.style }); }
      }
      var res = await fetch('/api/v1/chat', { method: 'POST', headers: headers, body: JSON.stringify(body) });
      if (res.status === 401) {
        // Hết phần DÙNG THỬ (khách vô danh đã hỏi hết số câu được cấp) → tường
        // ĐĂNG KÝ, không phải hộp đăng nhập trơ. Người này chưa có tài khoản nên
        // phải cho họ thấy đăng ký đổi được gì.
        var _isTrial = false;
        try { var _ed = await res.clone().json(); _isTrial = _ed && _ed.code === 'anon_trial_exhausted'; } catch (e) { /* ignore */ }
        if (_isTrial) {
          _rc.anon = true; _rc.anonLeft = 0; renderRailMeter();
          typing.innerHTML = '<p>Hết phần dùng thử. <a href="#" id="railSignupLink" style="color:var(--blue);font-weight:600">Đăng ký miễn phí</a> để được tặng Lượng và hỏi tiếp — lá số vẫn xem miễn phí.</p>';
          var _sl = document.getElementById('railSignupLink');
          if (_sl) _sl.addEventListener('click', function (ev) { ev.preventDefault(); openAnonSignupModal(); });
          openAnonSignupModal();
          streaming = false; setSend(true); messages.pop(); return;
        }
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
              pushLocalToServer(); refreshHistoryUI(); // đăng nhập xong → giữ + nạp lại lịch sử
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
        // Đồng bộ ví từ chính lỗi 402 (server trả balance + price) → đồng hồ về 0
        // đúng lúc, không đợi lần tải sau.
        try {
          var _pd = await res.clone().json();
          if (_pd) applyPaywallInfo({ balance: _pd.balance, price: _pd.price });
        } catch (e) { /* ignore */ }
        typing.innerHTML = '<p>Đã hết lượt hỏi. Lá số vẫn xem miễn phí — bạn có thể xem <a href="/app/luan-giai" style="color:var(--blue);font-weight:600">bản Luận Giải trọn ' + LG_PHAN.length + ' mục</a> hoặc <a href="/topup.html" style="color:var(--blue);font-weight:600">nạp thêm</a> để hỏi tiếp.</p>';
        openTopupModal();
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
          if (ev.name === 'text' && ev.data.delta) { acc += ev.data.delta; typing.innerHTML = mdLite(acc); chat.scrollTop = chat.scrollHeight; }
          else if (ev.name === 'status' && !acc) { typing.innerHTML = '<span class="typing" style="gap:6px">' + esc(ev.data.text || 'Đang xem…') + ' <i></i><i></i><i></i></span>'; }
          else if (ev.name === 'error') { acc = acc || ('Xin lỗi, gặp trục trặc: ' + esc(ev.data.message || '')); }
          else if (ev.name === 'done' && ev.data) {
            if (ev.data.suggestions && ev.data.suggestions.length) ctxChips = ev.data.suggestions.slice(0, 4);
            applyPaywallInfo(ev.data.paywall);
          }
        }
      }
      if (!acc) acc = '(không có nội dung)';
      typing.innerHTML = mdLite(acc);
      messages.push({ role: 'assistant', content: acc });
      saveCurrent();
      // Thẻ mời SAU khi câu trả lời đã hiện xong — chèn trước lúc đó thì nó đứng
      // chen giữa lúc người ta đang đọc, thành quảng cáo cắt ngang.
      maybeShowUpsell();
      // Đến từ link chia sẻ + đã hỏi thật lần đầu → ghi nhận 1 lượt chuyển đổi.
      if (_fromshareId && !_convFired) { _convFired = true; trackConvert(_fromshareId); }
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
  TOOLS.forEach(function (g) { g.items.forEach(function (it) { if (it.balance || it.id === 'ho-so') return; CMDS.push({ g: 'Công cụ', i: it.icon || 'grid', t: it.label, href: it.href, s: '' }); }); });
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
    // Ẩn bottom tab khi drawer (sidebar/rail) đang mở để không đè input rail toàn màn.
    document.body.classList.toggle('drawer-open', open);
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

  // ── CHIỀU CAO THANH TIÊU ĐỀ → biến CSS --ws-top-h ──
  // .ws-top dính đỉnh khung workspace, nhưng CAO BAO NHIÊU thì tuỳ trang (số
  // nút hành động) và tuỳ bề ngang (điện thoại cho cụm nút xuống hàng thứ 2).
  // Trang nào có thanh phụ dính riêng — .jump (mục lục) của Luận Giải / Bát Tự
  // / Xem Tuổi — phải neo theo con số THẬT; trước đây chép cứng 51px nên thanh
  // mục lục nằm KHUẤT hẳn sau header ở MỌI bề ngang. Đo lại mỗi khi header đổi
  // kích thước (nút "Chia sẻ" chèn thêm sau khi có kết quả, xoay ngang máy…).
  function trackWsTopHeight() {
    var top = document.querySelector('.ws-top');
    if (!top) return;
    var apply = function () {
      var h = Math.round(top.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty('--ws-top-h', h + 'px');
    };
    apply();
    if (window.ResizeObserver) {
      try { new ResizeObserver(apply).observe(top); return; } catch (e) { /* ignore */ }
    }
    window.addEventListener('resize', apply);
  }

  // ── BOTTOM TAB BAR (mobile) ──
  // Chèn 1 lần vào body; CSS chỉ hiện ≤900px. Cho phép chạm 1 phát tới Trợ lý
  // (rail) và Công cụ (sidebar) thay vì chôn sau hamburger. Trang chủ / Tài
  // khoản là link điều hướng. Active theo trang đang mở.
  function renderTabbar() {
    if (document.getElementById('shell-tabbar')) return;
    var isHome = ACTIVE === 'home';
    var isAcct = ACTIVE === 'ho-so' || ACTIVE === 'vi-luong' || ACTIVE === 'tai-khoan';
    var isTool = !isHome && !isAcct;
    var TI = {
      home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
      chat: '<path d="M4 5h16v11H8l-4 4V5Z" stroke-linejoin="round"/>',
      grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
      user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0" stroke-linecap="round"/>',
    };
    function ti(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">' + TI[n] + '</svg>'; }
    var nav = document.createElement('nav');
    nav.className = 'tabbar'; nav.id = 'shell-tabbar';
    nav.innerHTML =
      '<a class="tab' + (isHome ? ' active' : '') + '" href="/app">' + ti('home') + 'Trang chủ</a>' +
      '<button class="tab" type="button" data-tab="rail">' + ti('chat') + 'Trợ lý</button>' +
      '<button class="tab' + (isTool ? ' active' : '') + '" type="button" data-tab="tools">' + ti('grid') + 'Công cụ</button>' +
      '<a class="tab' + (isAcct ? ' active' : '') + '" href="/app/tai-khoan">' + ti('user') + 'Tài khoản</a>';
    document.body.appendChild(nav);
    nav.querySelector('[data-tab="rail"]').addEventListener('click', function () {
      var r = document.getElementById('shell-rail'); if (r) { r.classList.add('open'); syncBackdrop(); }
    });
    nav.querySelector('[data-tab="tools"]').addEventListener('click', function () {
      var s = document.getElementById('shell-sidebar'); if (s) { s.classList.add('open'); syncBackdrop(); }
    });
  }

  // ── APP NATIVE (Capacitor): đăng ký PUSH ──
  // TRƠ ở trình duyệt thường (window.Capacitor undefined → return ngay). Trong
  // app native: xin quyền → lấy device token (FCM/APNs) → POST /api/push/register
  // để server lưu, phục vụ push "Vận hôm nay" mỗi sáng. Không đụng web thường.
  function registerNativePush() {
    var Cap = window.Capacitor;
    if (!Cap || !Cap.Plugins || !Cap.Plugins.PushNotifications) return;
    var PN = Cap.Plugins.PushNotifications;
    var platform = 'android';
    try { if (Cap.getPlatform) platform = Cap.getPlatform(); } catch (e) { /* ignore */ }
    var sendToken = function (token) {
      if (!token) return;
      var headers = { 'Content-Type': 'application/json' };
      var tk = getToken(); if (tk) headers['Authorization'] = 'Bearer ' + tk;
      var birth = null; try { birth = JSON.parse(localStorage.getItem('app_birth') || 'null'); } catch (e) { /* ignore */ }
      try {
        fetch('/api/push/register', { method: 'POST', headers: headers, keepalive: true,
          body: JSON.stringify({ token: token, platform: platform, birth: birth }) }).catch(function () {});
      } catch (e) { /* ignore */ }
    };
    try {
      PN.addListener('registration', function (t) { sendToken(t && t.value); });
      PN.addListener('registrationError', function (e) { if (window.console) console.error('[native-push]', e); });
      Promise.resolve(PN.checkPermissions()).then(function (p) {
        if (p && p.receive === 'granted') return PN.register();
        return Promise.resolve(PN.requestPermissions()).then(function (r) { if (r && r.receive === 'granted') return PN.register(); });
      }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }

  // ── BOOT ──
  function boot() {
    // Marketing: nạp track.js (page_view tự bắn) + đánh dấu mở tool trong shell.
    ensureTrackJs();
    // Viral: bắt ?ref= (người tới từ link chia sẻ) + nạp sẵn mã của chính mình.
    ensureReferralJs();
    loadRefCode();
    // Sổ lá số — đặt SAU prefillForm của trang (trang gọi ở init của chính nó,
    // đồng bộ) nên không có lượt nào đá nhau: sổ chỉ điền khi form còn trống.
    ensureUserChartsJs();
    try { track('tool_open', { tool_id: ACTIVE || 'app' }); } catch (e) { /* ignore */ }
    // Nối phiên từ link chia sẻ: tải snapshot rồi reload ?auto=1 (boot dừng ở đây).
    if (consumeFromShare()) return;
    // Sau reload: nhận cờ fromshare để bắn beacon chuyển đổi sau câu hỏi đầu tiên.
    try { _fromshareId = sessionStorage.getItem('app_fromshare_id') || null; if (_fromshareId) sessionStorage.removeItem('app_fromshare_id'); } catch (e) { /* ignore */ }
    pickAuthor();
    renderSidebar();
    renderRail();
    renderTabbar();
    trackWsTopHeight();
    registerNativePush();
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
    // Theo dõi phiên đăng nhập tới khi SẴN SÀNG (Auth có thể refresh token async
    // qua cookie): cập nhật avatar/tên + nạp lại lịch sử NGAY khi token xuất hiện.
    var tries = 0, hadTok = !!getToken();
    var t = setInterval(function () {
      paintAuth();
      var tok = !!getToken();
      if (tok && !hadTok) { hadTok = true; pushLocalToServer(); refreshHistoryUI(); } // đăng nhập vừa sẵn sàng → đẩy local + kéo lịch sử server về
      if (++tries > 30) clearInterval(t);
    }, 300);
    // Empty-state intro (hướng B): trang khai window.SHELL_INTRO={key,title,desc}
    // + có #introHost → shell tự hiện cho người mới, ẩn sau lần dùng đầu.
    if (window.SHELL_INTRO && window.SHELL_INTRO.key) Shell.introOnce(window.SHELL_INTRO.key, window.SHELL_INTRO);
    renderRecentAll();
    // Deep-link khôi phục từ hub Tài khoản: /app/<tool>?restore=<id> → khôi phục
    // đúng phiên (reload về ?auto=1 sạch trong restoreSession).
    if (HIST_ON) {
      var _rid = (location.search.match(/[?&]restore=([^&]+)/) || [])[1];
      if (_rid) { restoreSession(decodeURIComponent(_rid)); return; }
      // Chốt sau cùng cho lượt khôi phục: đợi tool tự dựng lại (đa số chạy đồng
      // bộ ngay trong DOMContentLoaded, vài tool phải fetch trước) rồi mới đỡ.
      setTimeout(restorePendingFallback, 2500);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
