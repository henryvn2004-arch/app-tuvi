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
 */

const TuviForm = (() => {
  const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const _updaters = {}; // prefix → update fn

  // ── Helpers ──────────────────────────────────────────────────
  function pid(id, prefix) { return prefix ? `${prefix}-${id}` : id; }
  function gel(id, prefix) { return document.getElementById(pid(id, prefix)); }

  function hourMinToGioIdx(h, m) {
    return Math.floor(((h * 60 + m + 60) % (24 * 60)) / 120) % 12;
  }

  function getVnUtcOffset(ngay, thang, nam) {
    if (!nam) return 420;
    const d = new Date(nam, thang - 1, ngay || 1);
    const t = d.getTime();
    const D = (y, m, d) => new Date(y, m - 1, d).getTime();
    if (t >= D(1942,1,1)  && t < D(1944,3,9))   return 480;
    if (t >= D(1944,3,9)  && t < D(1945,9,2))   return 540;
    if (t >= D(1945,9,2)  && t < D(1946,12,19)) return 420;
    if (t >= D(1946,12,19)&& t < D(1955,7,1))   return 480;
    if (t >= D(1955,7,1)  && t < D(1960,1,1))   return 420;
    if (t >= D(1960,1,1)  && t < D(1975,5,1))   return 480;
    return 420;
  }

  function toVnHour(hh, mm, utcOffset, ngay, thang, nam) {
    const vnOffset = getVnUtcOffset(ngay, thang, nam);
    let totalMin = hh * 60 + mm + (vnOffset - utcOffset);
    totalMin = ((totalMin % 1440) + 1440) % 1440;
    return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
  }

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
    <div class="tvf-tooltip-title">⏰ Lịch sử múi giờ Việt Nam</div>
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
@media(max-width:700px){.tvf-tooltip-box{left:auto;right:0;width:280px;}}
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
          <span class="tvf-tooltip-icon">?</span>
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

  // ── render() ─────────────────────────────────────────────────
  function render(containerId, options = {}) {
    injectCss();
    const {
      onSubmit,
      submitLabel   = 'Luận Giải Lá Số →',
      prefix        = '',
      mode          = 'full',     // 'full' | 'person'
      label         = mode === 'person' ? 'Thông Tin' : 'Cá Nhân',
      gioitinh      = 'nam',
      showSample    = true,
    } = options;

    const namXemDefault = new Date().getFullYear();
    const opts = buildOptions();
    const pf = prefix ? `'${prefix}'` : "''";

    let html = '';

    if (mode === 'person') {
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
                <span>⬇</span><span>Xem mẫu luận giải PDF</span>
              </a>
            </div>` : ''}
          </div>
        </div>
      </div>`;
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
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
      s('tvf-gio',  (d.gioIdx * 2 + 1) % 24);
      s('tvf-phut', 0);
    }
    updateGioAmDisplay(prefix);
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    render,
    getData,
    setData,
    _update:    (prefix = '') => { (_updaters[prefix] || _updaters[''] || (() => {}))(); },
    _toggleUtc: (prefix = '') => toggleUtc(prefix),
  };
})();
