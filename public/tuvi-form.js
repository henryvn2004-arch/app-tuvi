/**
 * tuvi-form.js — Shared input form cho Tử Vi Minh Bảo
 *
 * Single person (luan-giai):
 *   TuviForm.render('container', { onSubmit, submitLabel })
 *   TuviForm.getData()
 *   TuviForm.setData(d)
 *
 * Multi-person (xem-tuoi) — prefix mode:
 *   TuviForm.render('container-a', { prefix:'a', mode:'person', label:'Người A', gioitinh:'nam' })
 *   TuviForm.render('container-b', { prefix:'b', mode:'person', label:'Người B', gioitinh:'nu' })
 *   TuviForm.getData('a')  → { hoten, ngay, thang, nam, gioIdx, gioHour, gioPhut, gioitinh }
 *   TuviForm.getData('b')
 *   TuviForm.setData(d, 'a')
 *
 * Compact (app-shell "/app/*" — chỉ các trường người, tái dùng .frow/.fg/.btn-go
 * đã có sẵn của trang gọi, KHÔNG có form-grid/cột/nút submit riêng):
 *   TuviForm.render('container', { prefix:'', mode:'compact', gioitinh:'nam' })
 *   TuviForm.getData()  → cùng shape với person/full ở trên
 */

window.TuviForm = (() => {
  const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const _updaters = {}; // prefix → update fn

  // ── Helpers ──────────────────────────────────────────────────
  function pid(id, prefix) { return prefix ? `${prefix}-${id}` : id; }
  function gel(id, prefix) { return document.getElementById(pid(id, prefix)); }

  // ── Múi giờ: NGUỒN DUY NHẤT là tools-shared/vn-timezone.js ──
  // Ba hàm này trước nằm ngay đây, trong closure, KHÔNG export ra
  // `window.TuviForm` — nên `scripts/import-celeb-births.mjs` (nhập ngày giờ
  // sinh người nổi tiếng) không gọi được, mà chép sang thì hai bản trôi khỏi
  // nhau IM LẶNG: canh giờ vẫn ra một con số trông hợp lệ, chỉ là sai hệ quy
  // chiếu. Người dùng và người nổi tiếng BẮT BUỘC đi qua cùng một phép quy đổi
  // thì phép so "trùng giờ sinh" mới có nghĩa. `npm run check:vntz` canh.
  // Thẻ <script src="/tools-shared/vn-timezone.js"> phải đứng TRƯỚC file này.
  if (!window.VnTimezone) {
    // Thà đỏ to tiếng còn hơn âm thầm tính sai canh giờ cho mọi lá số.
    throw new Error('tuvi-form.js: thiếu /tools-shared/vn-timezone.js — nạp nó TRƯỚC file này.');
  }
  const { toVnHour, hourMinToGioIdx } = window.VnTimezone;

  function updateGioAmDisplay(prefix = '') {
    const hh     = parseInt(gel('tvf-gio', prefix)?.value) || 0;
    const mm     = parseInt(gel('tvf-phut', prefix)?.value) || 0;
    const utcOff = parseInt(gel('tvf-utc', prefix)?.value ?? '420');
    const ngay   = parseInt(gel('ngay', prefix)?.value) || 1;
    const thang  = parseInt(gel('thang', prefix)?.value) || 1;
    const nam    = parseInt(gel('nam', prefix)?.value) || 0;
    const vn     = toVnHour(hh, mm, utcOff, ngay, thang, nam);
    const idx    = hourMinToGioIdx(vn.h, vn.m);
    const el     = gel('tvf-gio-am', prefix);
    const elVn   = gel('tvf-gio-vn', prefix);
    if (el)  el.textContent = 'Giờ âm: ' + CHI[idx];
    if (elVn) {
      if (utcOff !== 420) {
        elVn.textContent = `→ ${String(vn.h).padStart(2,'0')}:${String(vn.m).padStart(2,'0')} (VN)`;
        elVn.style.display = 'block';
      } else {
        elVn.style.display = 'none';
      }
    }
  }

  function toggleUtc(prefix = '') {
    const cb   = gel('tvf-foreign', prefix);
    const wrap = gel('tvf-utc-wrap', prefix);
    if (wrap) wrap.style.display = cb?.checked ? 'block' : 'none';
    if (!cb?.checked) {
      const sel = gel('tvf-utc', prefix);
      if (sel) sel.value = '420';
    }
    updateGioAmDisplay(prefix);
  }

  // Chạm-để-mở tooltip "Giờ sinh" trên mobile — CSS chỉ có :hover, vô dụng trên
  // cảm ứng. iconEl và hộp nội dung là hai con liền kề của .tvf-tooltip-wrap.
  function toggleTip(iconEl) {
    const box = iconEl && iconEl.nextElementSibling;
    if (!box || !box.classList || !box.classList.contains('tvf-tooltip-box')) return;
    const willOpen = !box.classList.contains('tvf-open');
    // Đóng MỌI hộp khác đang mở — hai hộp chồng lên nhau trên màn hình hẹp là
    // không đọc được cái nào.
    document.querySelectorAll('.tvf-tooltip-box.tvf-open').forEach((b) => b.classList.remove('tvf-open'));
    if (willOpen) box.classList.add('tvf-open');
  }
  if (!window.__tvfTipDocBound) {
    window.__tvfTipDocBound = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.tvf-tooltip-box.tvf-open').forEach((b) => b.classList.remove('tvf-open'));
    });
  }

  // ── Option lists ─────────────────────────────────────────────
  const UTC_OPTIONS = [
    {v:-720,l:'UTC−12'},{v:-660,l:'UTC−11'},{v:-600,l:'UTC−10'},{v:-570,l:'UTC−9:30'},
    {v:-540,l:'UTC−9'},{v:-480,l:'UTC−8'},{v:-420,l:'UTC−7'},{v:-360,l:'UTC−6'},
    {v:-300,l:'UTC−5'},{v:-240,l:'UTC−4'},{v:-210,l:'UTC−3:30'},{v:-180,l:'UTC−3'},
    {v:-120,l:'UTC−2'},{v:-60,l:'UTC−1'},{v:0,l:'UTC±0'},{v:60,l:'UTC+1'},
    {v:120,l:'UTC+2'},{v:180,l:'UTC+3'},{v:210,l:'UTC+3:30'},{v:240,l:'UTC+4'},
    {v:270,l:'UTC+4:30'},{v:300,l:'UTC+5'},{v:330,l:'UTC+5:30 (Ấn Độ)'},
    {v:345,l:'UTC+5:45 (Nepal)'},{v:360,l:'UTC+6'},{v:390,l:'UTC+6:30 (Myanmar)'},
    {v:420,l:'UTC+7 — Việt Nam ✓',selected:true},{v:480,l:'UTC+8 (Singapore, TQ)'},
    {v:525,l:'UTC+8:45'},{v:540,l:'UTC+9 (Nhật, Hàn)'},{v:570,l:'UTC+9:30'},
    {v:600,l:'UTC+10 (Úc)'},{v:630,l:'UTC+10:30'},{v:660,l:'UTC+11'},{v:720,l:'UTC+12'},
    {v:765,l:'UTC+12:45'},{v:780,l:'UTC+13'},{v:840,l:'UTC+14'},
  ];

  const TOOLTIP_CONTENT = `<div class="tvf-tooltip-box">
    <div class="tvf-tooltip-title"><span class="ic" data-icon="clock"></span> Lịch sử múi giờ Việt Nam</div>
    <p>Giờ gốc theo cổ pháp: giờ <b>Tý</b> = 23:00–00:59. Tuy nhiên trong lịch sử, VN đã nhiều lần thay đổi múi giờ:</p>
    <ul>
      <li><b>1942–09/3/1944</b> (UTC+8): giờ Tý = 00:00–01:59</li>
      <li><b>09/3/1944–02/9/1945</b> (UTC+9): giờ Tý = 01:00–02:59</li>
      <li><b>02/9/1945–18/12/1946</b> (UTC+7): giờ Tý = 23:00–00:59</li>
      <li><b>19/12/1946–30/6/1955</b> (UTC+8): giờ Tý = 00:00–01:59</li>
      <li><b>01/7/1955–31/12/1959</b> (UTC+7): giờ Tý = 23:00–00:59</li>
      <li><b>01/1/1960–30/4/1975</b> (UTC+8, miền Nam): giờ Tý = 00:00–01:59</li>
      <li><b>Từ 01/5/1975</b> (UTC+7): giờ Tý = 23:00–00:59</li>
    </ul>
    <p style="color:#888;font-size:11px;margin-top:8px">Hệ thống tự động điều chỉnh dựa trên ngày tháng năm sinh đã nhập.</p>
    <p style="margin-top:10px;padding-top:10px;border-top:1px solid #eee">
      <b>Không nhớ giờ sinh?</b> Rất nhiều người không nhớ chính xác — giờ sinh
      lại quyết định đúng nhiều tool khác trên trang này.
      <a href="/app/gio-sinh" target="_blank" style="color:#1455A4;font-weight:600">Xác định giờ sinh của bạn →</a>
    </p>
  </div>`;

  // ── Shared CSS (injected once) ────────────────────────────────
  let _cssInjected = false;
  function injectCss() {
    if (_cssInjected) return;
    _cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
.tvf-gio-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.tvf-gio-row select { flex:1; min-width:60px; }
.tvf-gio-am-wrap { display:flex; flex-direction:column; gap:2px; }
.tvf-gio-am { font-size:12px; color:var(--text-lt); white-space:nowrap; }
.tvf-gio-vn { font-size:11px; color:#1455A4; display:none; }
.tvf-tooltip-wrap { position:relative; display:inline-flex; align-items:center; margin-left:4px; cursor:help; }
.tvf-tooltip-icon { width:16px;height:16px;border-radius:50%;background:#e8e0d0;color:#9A7B3A;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1px solid #c9a84c;flex-shrink:0; }
.tvf-tooltip-box { display:none;position:absolute;left:0;top:22px;width:340px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:12px;line-height:1.7;color:var(--text-mid);box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:999; }
.tvf-tooltip-box ul { padding-left:16px; margin:6px 0; }
.tvf-tooltip-box li { margin-bottom:3px; }
.tvf-tooltip-title { font-weight:700; color:var(--navy); margin-bottom:8px; }
.tvf-tooltip-wrap:hover .tvf-tooltip-box { display:block; }
/* Chạm-để-mở cho mobile — hover không tồn tại trên cảm ứng, mà đa số lượt ghé
   là mobile. Lớp .tvf-open do TuviForm._toggleTip() gắn/gỡ khi bấm vào icon. */
.tvf-tooltip-box.tvf-open { display:block; }
@media(max-width:700px){.tvf-tooltip-box{left:auto;right:0;width:280px;}}
/* ── mode:'compact' (app-shell) — chỉ style phần KHÔNG có sẵn trong .frow/.fg của trang gọi ── */
.tvf-compact-foreign { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--text-mid); cursor:pointer; white-space:nowrap; padding-bottom:8px; }
.tvf-compact-foreign input { cursor:pointer; margin:0; }
.tvf-compact-utc { min-width:220px; }
`;
    document.head.appendChild(style);
  }

  // ── Build option strings (shared) ───────────────────────────
  function buildOptions() {
    let gioOpts = '', phutOpts = '', ngayOpts = '<option value="">Ngày</option>', thangOpts = '<option value="">Tháng</option>';
    for (let i = 0; i <= 23; i++) gioOpts  += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    for (let i = 0; i <= 59; i++) phutOpts += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    for (let i = 1; i <= 31; i++) ngayOpts  += `<option value="${i}">${i}</option>`;
    for (let i = 1; i <= 12; i++) thangOpts += `<option value="${i}">${i}</option>`;
    const utcOpts = UTC_OPTIONS.map(o => `<option value="${o.v}"${o.selected?' selected':''}>${o.l}</option>`).join('');
    return { gioOpts, phutOpts, ngayOpts, thangOpts, utcOpts };
  }

  // ── Person fields block (dùng chung cho cả full và person mode) ──
  function buildPersonFields(prefix, opts, defaultGioitinh = 'nam', showNameYear = true) {
    const { gioOpts, phutOpts, ngayOpts, thangOpts, utcOpts } = opts;
    const pf = prefix ? `'${prefix}'` : "''";
    return `
    ${showNameYear ? `
    <div class="form-group">
      <label class="form-label">Họ và tên</label>
      <input class="form-input" type="text" id="${pid('hoten',prefix)}" placeholder="Nguyễn Văn A" autocomplete="off" />
    </div>
    <div class="form-group">
      <label class="form-label">Giới tính</label>
      <select class="form-input" id="${pid('gioitinh',prefix)}">
        <option value="nam"${defaultGioitinh==='nam'?' selected':''}>Nam</option>
        <option value="nu"${defaultGioitinh==='nu'?' selected':''}>Nữ</option>
      </select>
    </div>` : ''}
    <div class="form-group">
      <label class="form-label">Ngày / Tháng / Năm sinh</label>
      <div class="form-row-3">
        <select class="form-input" id="${pid('ngay',prefix)}" oninput="TuviForm._update(${pf})">${ngayOpts}</select>
        <select class="form-input" id="${pid('thang',prefix)}" oninput="TuviForm._update(${pf})">${thangOpts}</select>
        <input class="form-input" type="number" id="${pid('nam',prefix)}" placeholder="1990" min="1900" max="2099" oninput="TuviForm._update(${pf})" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="${pid('tvf-foreign',prefix)}" onchange="TuviForm._toggleUtc(${pf})" style="cursor:pointer">
        <span>Sinh ở ngoài Việt Nam?</span>
      </label>
      <div id="${pid('tvf-utc-wrap',prefix)}" style="display:none;margin-top:6px">
        <label class="form-label">Múi giờ nơi sinh</label>
        <select class="form-input" id="${pid('tvf-utc',prefix)}" oninput="TuviForm._update(${pf})">${utcOpts}</select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:4px">
        Giờ sinh
        <span class="tvf-tooltip-wrap">
          <span class="tvf-tooltip-icon" onclick="event.stopPropagation();TuviForm._toggleTip(this)">?</span>
          ${TOOLTIP_CONTENT}
        </span>
      </label>
      <div class="tvf-gio-row">
        <select class="form-input" id="${pid('tvf-gio',prefix)}" oninput="TuviForm._update(${pf})">${gioOpts}</select>
        <select class="form-input" id="${pid('tvf-phut',prefix)}" oninput="TuviForm._update(${pf})">${phutOpts}</select>
        <div class="tvf-gio-am-wrap">
          <span class="tvf-gio-am" id="${pid('tvf-gio-am',prefix)}">Giờ âm: Tý</span>
          <span class="tvf-gio-vn" id="${pid('tvf-gio-vn',prefix)}"></span>
        </div>
      </div>
    </div>`;
  }

  // ── Compact fields (dùng .frow/.fg/.tooltip đã có sẵn của trang app-shell gọi) ──
  function buildCompactPersonFields(prefix, opts, defaultGioitinh = 'nam', showName = true, showNamXem = false) {
    const { gioOpts, phutOpts, ngayOpts, thangOpts, utcOpts } = opts;
    const pf = prefix ? `'${prefix}'` : "''";
    const namXemDefault = new Date().getFullYear();
    return `
    <div class="frow">
      ${showName ? `<div class="fg" style="flex:2;min-width:150px"><label>Họ và tên</label><input type="text" id="${pid('hoten',prefix)}" placeholder="Nguyễn Văn A" autocomplete="off"></div>` : ''}
      <div class="fg" style="width:90px"><label>Giới tính</label>
        <select id="${pid('gioitinh',prefix)}">
          <option value="nam"${defaultGioitinh==='nam'?' selected':''}>Nam</option>
          <option value="nu"${defaultGioitinh==='nu'?' selected':''}>Nữ</option>
        </select>
      </div>
      ${showNamXem ? `<div class="fg" style="width:90px"><label>Năm xem vận</label><input type="number" id="${pid('namXem',prefix)}" value="${namXemDefault}" min="1900" max="2100"></div>` : ''}
    </div>
    <div class="frow">
      <div class="fg" style="width:74px"><label>Ngày</label><select id="${pid('ngay',prefix)}" oninput="TuviForm._update(${pf})">${ngayOpts}</select></div>
      <div class="fg" style="width:82px"><label>Tháng</label><select id="${pid('thang',prefix)}" oninput="TuviForm._update(${pf})">${thangOpts}</select></div>
      <div class="fg" style="width:90px"><label>Năm</label><input type="number" id="${pid('nam',prefix)}" placeholder="1990" min="1900" max="2099" oninput="TuviForm._update(${pf})"></div>
      <div class="fg" style="width:70px"><label style="display:flex;align-items:center;gap:3px">Giờ<span class="tvf-tooltip-wrap"><span class="tvf-tooltip-icon" onclick="event.stopPropagation();TuviForm._toggleTip(this)">?</span>${TOOLTIP_CONTENT}</span></label><select id="${pid('tvf-gio',prefix)}" oninput="TuviForm._update(${pf})">${gioOpts}</select></div>
      <div class="fg" style="width:70px"><label>Phút</label><select id="${pid('tvf-phut',prefix)}" oninput="TuviForm._update(${pf})">${phutOpts}</select></div>
      <div class="tvf-gio-am-wrap"><span class="tvf-gio-am" id="${pid('tvf-gio-am',prefix)}">Giờ âm: Tý</span><span class="tvf-gio-vn" id="${pid('tvf-gio-vn',prefix)}"></span></div>
    </div>
    <div class="frow" style="align-items:flex-start">
      <label class="tvf-compact-foreign">
        <input type="checkbox" id="${pid('tvf-foreign',prefix)}" onchange="TuviForm._toggleUtc(${pf})">
        Sinh ở ngoài Việt Nam?
      </label>
      <div class="fg tvf-compact-utc" id="${pid('tvf-utc-wrap',prefix)}" style="display:none">
        <label>Múi giờ nơi sinh</label>
        <select id="${pid('tvf-utc',prefix)}" oninput="TuviForm._update(${pf})">${utcOpts}</select>
      </div>
    </div>`;
  }

  // ── render() ─────────────────────────────────────────────────
  function render(containerId, options = {}) {
    injectCss();
    const {
      onSubmit,
      submitLabel   = 'Luận Giải Lá Số →',
      prefix        = '',
      mode          = 'full',     // 'full' | 'person' | 'compact'
      label         = mode === 'person' ? 'Thông Tin' : 'Cá Nhân',
      gioitinh      = 'nam',
      showSample    = true,
      showName      = true,       // mode:'compact' only — false nếu tool không cần Họ và tên
      showNamXem    = false,      // mode:'compact' only — true nếu tool cần Năm xem vận (khớp field mode:'full')
    } = options;

    const namXemDefault = new Date().getFullYear();
    const opts = buildOptions();
    const pf = prefix ? `'${prefix}'` : "''";

    let html = '';

    if (mode === 'compact') {
      // ── App-shell: chỉ trường người, tái dùng .frow/.fg/.btn-go sẵn có của trang gọi ──
      html = buildCompactPersonFields(prefix, opts, gioitinh, showName, showNamXem);
    } else if (mode === 'person') {
      // ── Compact: chỉ 1 cột — dùng cho xem-tuoi (2 người cạnh nhau) ──
      html = `<div class="form-col" style="border-right:1px solid var(--border)">
        <div class="form-col-title">${label}</div>
        ${buildPersonFields(prefix, opts, gioitinh, true)}
      </div>`;
    } else {
      // ── Full: 3-column layout — dùng cho luan-giai ──
      html = `<div class="form-grid">
        <div class="form-col">
          <div class="form-col-title">Cá Nhân</div>
          <div class="form-group">
            <label class="form-label">Họ và tên</label>
            <input class="form-input" type="text" id="${pid('hoten',prefix)}" placeholder="Nguyễn Văn A" autocomplete="name" />
          </div>
          <div class="form-group-row">
            <div class="form-group">
              <label class="form-label">Giới tính</label>
              <select class="form-input" id="${pid('gioitinh',prefix)}">
                <option value="nam">Nam</option>
                <option value="nu">Nữ</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Năm xem vận</label>
              <input class="form-input" type="number" id="${pid('namXem',prefix)}" value="${namXemDefault}" min="1900" max="2100" />
            </div>
          </div>
        </div>

        <div class="form-col">
          <div class="form-col-title">Ngày Sinh Dương Lịch</div>
          ${buildPersonFields(prefix, opts, gioitinh, false)}
        </div>

        <div class="form-col">
          <div class="form-col-title">Thực Thi</div>
          <p style="font-size:14px;color:var(--text-lt);line-height:1.7;margin-bottom:28px;font-style:italic">
            Điền đầy đủ thông tin bên trái — ngày tháng năm sinh dương lịch và giờ sinh — rồi bấm luận giải.
          </p>
          <div class="btn-group-submit">
            <button class="btn-submit" id="${pid('tvf-submit-btn',prefix)}">${submitLabel}</button>
            ${showSample ? `<div style="text-align:center;margin-top:10px">
              <a href="https://dciwkfdqhhddeymlisey.supabase.co/storage/v1/object/public/samples/mau-luan-giai-la-so.pdf"
                 target="_blank" rel="noopener"
                 style="font-size:12px;color:var(--gold);text-decoration:none;display:inline-flex;align-items:center;gap:5px;opacity:0.8;transition:opacity 0.15s"
                 onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                <span class="ic" data-icon="chevron-down"></span><span>Xem mẫu luận giải PDF</span>
              </a>
            </div>` : ''}
          </div>
        </div>
      </div>`;
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
      // Icon trong TOOLTIP_CONTENT/liên kết mẫu PDF được dựng bằng `<span
      // data-icon>` chứ không nội suy trực tiếp `window.iconHtml()` — file này
      // (const TOOLTIP_CONTENT ở top-level) chạy TRƯỚC khi nav.js kịp thực thi
      // ở nhiều trang (tuvi-form.js nạp sớm hơn nav.js trong HTML), nên gọi
      // `iconHtml` ngay lúc parse module sẽ luôn ra rỗng. Mount LẠI ở đây, sau
      // khi DOM đã tồn tại thật, để không phụ thuộc thứ tự nạp script.
      if (window.mountIcons) window.mountIcons(container);
      // 🔑 Form TỰ KHAI mình là form lá số, kèm prefix. `user-charts.js` dò theo
      // dấu này để gắn thanh "Sổ lá số".
      //
      // Trước đây nó dò theo TÊN id (`/formhost/i`) — mà tên là thứ mỗi trang tự
      // đặt, nên `app-xem-tuoi` (id `a-fields`/`b-fields`) dùng đúng khuôn
      // TuviForm mà vẫn KHÔNG có sổ, và không có gì báo. Chú thích của chính bộ
      // dò cũ đã lo đúng chuyện đó ("trang nào quên là trang đó âm thầm không có
      // sổ") rồi lại dò theo tên — tức tái tạo đúng cái hố nó muốn tránh.
      //
      // Đặt SAU `innerHTML`: dấu chỉ xuất hiện khi các field đã tồn tại thật.
      container.setAttribute('data-tvf-form', prefix);
      const btn = document.getElementById(pid('tvf-submit-btn', prefix));
      if (btn && onSubmit) btn.addEventListener('click', onSubmit);
      _updaters[prefix] = () => updateGioAmDisplay(prefix);
      updateGioAmDisplay(prefix);
    }
  }

  // ── getData(prefix) ──────────────────────────────────────────
  function getData(prefix = '') {
    const hh     = parseInt(gel('tvf-gio', prefix)?.value) || 0;
    const mm     = parseInt(gel('tvf-phut', prefix)?.value) || 0;
    const utcOff = parseInt(gel('tvf-utc', prefix)?.value ?? '420');
    const ngay   = parseInt(gel('ngay', prefix)?.value) || 0;
    const thang  = parseInt(gel('thang', prefix)?.value) || 0;
    const nam    = parseInt(gel('nam', prefix)?.value) || 0;
    const vn     = toVnHour(hh, mm, utcOff, ngay, thang, nam);
    return {
      hoten:    (gel('hoten', prefix)?.value || '').trim(),
      ngay, thang, nam,
      gioIdx:   hourMinToGioIdx(vn.h, vn.m),
      gioHour:  vn.h,
      gioPhut:  vn.m,
      gioitinh: gel('gioitinh', prefix)?.value || 'nam',
      namXem:   parseInt(gel('namXem', prefix)?.value) || new Date().getFullYear(),
    };
  }

  // ── setData(d, prefix) ───────────────────────────────────────
  function setData(d, prefix = '') {
    if (!d) return;
    const s = (id, val) => { const el = gel(id, prefix); if (el && val !== undefined) el.value = val; };
    s('hoten',    d.hoten);
    s('ngay',     d.ngay);
    s('thang',    d.thang);
    s('nam',      d.nam);
    s('gioitinh', d.gioitinh);
    s('namXem',   d.namXem);
    if (d.gioHour !== undefined) {
      s('tvf-gio',  d.gioHour);
      s('tvf-phut', d.gioPhut ?? 0);
    } else if (d.gioIdx !== undefined) {
      // 🐞 Bản cũ dùng `gioIdx*2 + 1` → LỆCH ĐÚNG MỘT CHI, im lặng: địa chi k phủ
      // khung giờ [2k−1, 2k+1) (Tý = 23–01, Sửu = 01–03), nên giờ đại diện là
      // 2k, không phải 2k+1. Với k=0 nó điền 01:00 → hourMinToGioIdx trả 1 = Sửu.
      // Nhánh này lâu nay KHÔNG có ai đi vào (mọi nơi gọi setData đều truyền
      // gioHour) nên lỗi nằm im — `xem-tuoi.html` khi phải tự quy đổi cũng viết
      // `gioA*2`, tức đúng công thức này.
      s('tvf-gio',  (d.gioIdx * 2) % 24);
      s('tvf-phut', 0);
    }
    updateGioAmDisplay(prefix);
  }

  // Xoá NGƯỜI, giữ NGÀY LUẬN (namXem) — namXem là thiết lập của trang (năm
  // đang xem), không phải dữ kiện của người đang nhập, đổi chủ thể không nên
  // đụng vào. Dùng khi form cần trống để nhập một người KHÁC (vd tool đang
  // xem xong lá số vợ, giờ nhập tiếp cho bố mẹ).
  function clear(prefix = '') {
    setData({ hoten: '', ngay: '', thang: '', nam: '', gioitinh: 'nam', gioHour: 0, gioPhut: 0 }, prefix);
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    render,
    getData,
    setData,
    clear,
    _update:    (prefix = '') => { (_updaters[prefix] || _updaters[''] || (() => {}))(); },
    _toggleUtc: (prefix = '') => toggleUtc(prefix),
    _toggleTip: (iconEl) => toggleTip(iconEl),
  };
})();
