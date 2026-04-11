/**
 * tuvi-form.js — Shared input form cho Tử Vi Minh Bảo
 * TuviForm.render(containerId, options)
 * TuviForm.getData()   → { hoten, ngay, thang, nam, gioIdx, gioHour, gioPhut, gioitinh, namXem }
 * TuviForm.setData(d)  → fill form
 */

const TuviForm = (() => {
  const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

  // Convert giờ+phút → gioIdx (0-11), sau khi đã điều chỉnh về giờ VN
  function hourMinToGioIdx(h, m) {
    return Math.floor(((h * 60 + m + 60) % (24 * 60)) / 120) % 12;
  }

  // Lấy offset UTC+7 thực tế dựa vào lịch sử giờ VN
  // Trả về số phút chênh lệch so với UTC+7 cần CỘNG VÀO để ra giờ VN thật
  function getVnUtcOffset(ngay, thang, nam) {
    // Lịch sử múi giờ Việt Nam (tất cả so với UTC):
    // Mặc định UTC+7 (offset = 7*60 = 420 phút)
    if (!nam) return 420;
    const d = new Date(nam, thang - 1, ngay || 1);
    const t = d.getTime();
    const D = (y,m,d) => new Date(y,m-1,d).getTime();

    if (t >= D(1942,1,1) && t < D(1944,3,9))   return 480; // UTC+8
    if (t >= D(1944,3,9) && t < D(1945,9,2))   return 540; // UTC+9
    if (t >= D(1945,9,2) && t < D(1946,12,19)) return 420; // UTC+7
    if (t >= D(1946,12,19) && t < D(1955,7,1)) return 480; // UTC+8
    if (t >= D(1955,7,1) && t < D(1960,1,1))   return 420; // UTC+7
    if (t >= D(1960,1,1) && t < D(1975,5,1))   return 480; // UTC+8 (miền Nam)
    return 420; // UTC+7 từ 1/5/1975
  }

  // Chuyển giờ local (UTC+x) về giờ VN thực tế
  function toVnHour(hh, mm, utcOffset, ngay, thang, nam) {
    const vnOffset = getVnUtcOffset(ngay, thang, nam);
    const diffMin = vnOffset - utcOffset; // số phút cần cộng thêm
    let totalMin = hh * 60 + mm + diffMin;
    totalMin = ((totalMin % 1440) + 1440) % 1440;
    return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
  }

  function updateGioAmDisplay() {
    const hh      = parseInt(document.getElementById('tvf-gio')?.value) || 0;
    const mm      = parseInt(document.getElementById('tvf-phut')?.value) || 0;
    const utcOff  = parseInt(document.getElementById('tvf-utc')?.value ?? '420');
    const ngay    = parseInt(document.getElementById('ngay')?.value) || 1;
    const thang   = parseInt(document.getElementById('thang')?.value) || 1;
    const nam     = parseInt(document.getElementById('nam')?.value) || 0;
    const vn      = toVnHour(hh, mm, utcOff, ngay, thang, nam);
    const idx     = hourMinToGioIdx(vn.h, vn.m);
    const el      = document.getElementById('tvf-gio-am');
    const elVn    = document.getElementById('tvf-gio-vn');
    if (el) el.textContent = 'Giờ âm: ' + CHI[idx];
    if (elVn) {
      if (utcOff !== 420) {
        elVn.textContent = `→ ${String(vn.h).padStart(2,'0')}:${String(vn.m).padStart(2,'0')} (VN)`;
        elVn.style.display = 'block';
      } else {
        elVn.style.display = 'none';
      }
    }
  }

  const UTC_OPTIONS = [
    { v: -720, l: 'UTC−12' }, { v: -660, l: 'UTC−11' }, { v: -600, l: 'UTC−10' },
    { v: -570, l: 'UTC−9:30' }, { v: -540, l: 'UTC−9' }, { v: -480, l: 'UTC−8' },
    { v: -420, l: 'UTC−7' }, { v: -360, l: 'UTC−6' }, { v: -300, l: 'UTC−5' },
    { v: -240, l: 'UTC−4' }, { v: -210, l: 'UTC−3:30' }, { v: -180, l: 'UTC−3' },
    { v: -120, l: 'UTC−2' }, { v: -60,  l: 'UTC−1' }, { v: 0,    l: 'UTC±0' },
    { v: 60,   l: 'UTC+1' }, { v: 120,  l: 'UTC+2' }, { v: 180,  l: 'UTC+3' },
    { v: 210,  l: 'UTC+3:30' }, { v: 240, l: 'UTC+4' }, { v: 270, l: 'UTC+4:30' },
    { v: 300,  l: 'UTC+5' }, { v: 330,  l: 'UTC+5:30 (Ấn Độ)' },
    { v: 345,  l: 'UTC+5:45 (Nepal)' }, { v: 360, l: 'UTC+6' },
    { v: 390,  l: 'UTC+6:30 (Myanmar)' },
    { v: 420,  l: 'UTC+7 — Việt Nam ✓', selected: true },
    { v: 480,  l: 'UTC+8 (Singapore, TQ)' }, { v: 525, l: 'UTC+8:45' },
    { v: 540,  l: 'UTC+9 (Nhật, Hàn)' }, { v: 570, l: 'UTC+9:30' },
    { v: 600,  l: 'UTC+10 (Úc)' }, { v: 630, l: 'UTC+10:30' },
    { v: 660,  l: 'UTC+11' }, { v: 720, l: 'UTC+12' },
    { v: 765,  l: 'UTC+12:45' }, { v: 780, l: 'UTC+13' }, { v: 840, l: 'UTC+14' },
  ];

  const TOOLTIP_CONTENT = `<div class="tvf-tooltip-box">
    <div class="tvf-tooltip-title">⏰ Lịch sử múi giờ Việt Nam</div>
    <p>Giờ gốc theo cổ pháp: giờ <b>Tý</b> = 23:00–00:59. Tuy nhiên trong lịch sử, VN đã nhiều lần thay đổi múi giờ, làm lệch canh giờ âm lịch:</p>
    <ul>
      <li><b>1942–09/3/1944</b> (UTC+8): giờ Tý = 00:00–01:59</li>
      <li><b>09/3/1944–02/9/1945</b> (UTC+9): giờ Tý = 01:00–02:59</li>
      <li><b>02/9/1945–18/12/1946</b> (UTC+7): giờ Tý = 23:00–00:59</li>
      <li><b>19/12/1946–30/6/1955</b> (UTC+8): giờ Tý = 00:00–01:59</li>
      <li><b>01/7/1955–31/12/1959</b> (UTC+7): giờ Tý = 23:00–00:59</li>
      <li><b>01/1/1960–30/4/1975</b> (UTC+8, miền Nam): giờ Tý = 00:00–01:59</li>
      <li><b>Từ 01/5/1975</b> (UTC+7): giờ Tý = 23:00–00:59 — ổn định đến nay</li>
    </ul>
    <p style="color:#888;font-size:11px;margin-top:8px">Lưu ý: Người sinh tại <b>miền Bắc</b> sau 20/7/1954–30/4/1975 nên kiểm tra riêng múi giờ áp dụng tại địa phương. Hệ thống tự động điều chỉnh dựa trên ngày tháng năm sinh đã nhập.</p>
  </div>`;

  function render(containerId, options = {}) {
    const { onSubmit, submitLabel = 'Luận Giải Lá Số →' } = options;
    const namXemDefault = new Date().getFullYear();

    let gioOpts = '', phutOpts = '', ngayOpts = '<option value="">Ngày</option>', thangOpts = '<option value="">Tháng</option>';
    for (let i = 0; i <= 23; i++) gioOpts  += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    for (let i = 0; i <= 59; i++) phutOpts += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    for (let i = 1; i <= 31; i++) ngayOpts  += `<option value="${i}">${i}</option>`;
    for (let i = 1; i <= 12; i++) thangOpts += `<option value="${i}">${i}</option>`;
    const utcOpts = UTC_OPTIONS.map(o => `<option value="${o.v}"${o.selected?' selected':''}>${o.l}</option>`).join('');

    const html = `
<style>
.tvf-gio-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.tvf-gio-row select { flex:1; min-width:60px; }
.tvf-gio-am-wrap { display:flex; flex-direction:column; gap:2px; }
.tvf-gio-am { font-size:12px; color:var(--text-lt); white-space:nowrap; }
.tvf-gio-vn { font-size:11px; color:#1455A4; display:none; }
.tvf-tooltip-wrap { position:relative; display:inline-flex; align-items:center; margin-left:4px; cursor:help; }
.tvf-tooltip-icon { width:16px; height:16px; border-radius:50%; background:#e8e0d0; color:#9A7B3A; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1px solid #c9a84c; flex-shrink:0; }
.tvf-tooltip-box { display:none; position:absolute; left:0; top:22px; width:340px; background:#fff; border:1px solid var(--border); border-radius:8px; padding:14px 16px; font-size:12px; line-height:1.7; color:var(--text-mid); box-shadow:0 4px 16px rgba(0,0,0,.12); z-index:999; }
.tvf-tooltip-box ul { padding-left:16px; margin:6px 0; }
.tvf-tooltip-box li { margin-bottom:3px; }
.tvf-tooltip-title { font-weight:700; color:var(--navy); margin-bottom:8px; }
.tvf-tooltip-wrap:hover .tvf-tooltip-box { display:block; }
@media(max-width:700px) { .tvf-tooltip-box { left:auto; right:0; width:280px; } }
</style>
<div class="form-grid">
  <div class="form-col">
    <div class="form-col-title">Cá Nhân</div>
    <div class="form-group">
      <label class="form-label">Họ và tên</label>
      <input class="form-input" type="text" id="hoten" placeholder="Nguyễn Văn A" autocomplete="name" />
    </div>
    <div class="form-group">
      <label class="form-label">Giới tính</label>
      <select class="form-input" id="gioitinh">
        <option value="nam">Nam</option>
        <option value="nu">Nữ</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Năm xem vận</label>
      <input class="form-input" type="number" id="namXem" value="${namXemDefault}" min="1900" max="2100" />
    </div>
  </div>

  <div class="form-col">
    <div class="form-col-title">Ngày Sinh Dương Lịch</div>
    <div class="form-group">
      <label class="form-label">Ngày / Tháng / Năm</label>
      <div class="form-row-3">
        <select class="form-input" id="ngay" oninput="TuviForm._update()">${ngayOpts}</select>
        <select class="form-input" id="thang" oninput="TuviForm._update()">${thangOpts}</select>
        <input class="form-input" type="number" id="nam" placeholder="1990" min="1900" max="2099" oninput="TuviForm._update()" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" style="display:flex;align-items:center;gap:4px">
        Múi giờ nơi sinh
      </label>
      <select class="form-input" id="tvf-utc" oninput="TuviForm._update()">${utcOpts}</select>
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
        <select class="form-input" id="tvf-gio" oninput="TuviForm._update()">${gioOpts}</select>
        <select class="form-input" id="tvf-phut" oninput="TuviForm._update()">${phutOpts}</select>
        <div class="tvf-gio-am-wrap">
          <span class="tvf-gio-am" id="tvf-gio-am">Giờ âm: Tý</span>
          <span class="tvf-gio-vn" id="tvf-gio-vn"></span>
        </div>
      </div>
    </div>
  </div>

  <div class="form-col">
    <div class="form-col-title">Thực Thi</div>
    <p style="font-size:14px;color:var(--text-lt);line-height:1.7;margin-bottom:28px;font-family:'Source Serif 4',serif;font-style:italic">
      Điền đầy đủ thông tin bên trái — ngày tháng năm sinh dương lịch và giờ sinh — rồi bấm luận giải.
    </p>
    <div class="btn-group-submit">
      <button class="btn-submit" id="tvf-submit-btn">${submitLabel}</button>
    </div>
  </div>
</div>`;

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
      document.getElementById('tvf-submit-btn').addEventListener('click', () => { if (onSubmit) onSubmit(); });
      updateGioAmDisplay();
    }
  }

  function getData() {
    const hh     = parseInt(document.getElementById('tvf-gio')?.value) || 0;
    const mm     = parseInt(document.getElementById('tvf-phut')?.value) || 0;
    const utcOff = parseInt(document.getElementById('tvf-utc')?.value ?? '420');
    const ngay   = parseInt(document.getElementById('ngay')?.value) || 0;
    const thang  = parseInt(document.getElementById('thang')?.value) || 0;
    const nam    = parseInt(document.getElementById('nam')?.value) || 0;
    const vn     = toVnHour(hh, mm, utcOff, ngay, thang, nam);
    return {
      hoten:    (document.getElementById('hoten')?.value || '').trim(),
      ngay, thang, nam,
      gioIdx:   hourMinToGioIdx(vn.h, vn.m),
      gioHour:  vn.h,
      gioPhut:  vn.m,
      gioitinh: document.getElementById('gioitinh')?.value || 'nam',
      namXem:   parseInt(document.getElementById('namXem')?.value) || new Date().getFullYear(),
    };
  }

  function setData(d) {
    if (!d) return;
    if (d.hoten    !== undefined && document.getElementById('hoten'))    document.getElementById('hoten').value    = d.hoten;
    if (d.ngay     !== undefined && document.getElementById('ngay'))     document.getElementById('ngay').value     = d.ngay;
    if (d.thang    !== undefined && document.getElementById('thang'))    document.getElementById('thang').value    = d.thang;
    if (d.nam      !== undefined && document.getElementById('nam'))      document.getElementById('nam').value      = d.nam;
    if (d.gioitinh !== undefined && document.getElementById('gioitinh')) document.getElementById('gioitinh').value = d.gioitinh;
    if (d.namXem   !== undefined && document.getElementById('namXem'))   document.getElementById('namXem').value   = d.namXem;
    // Giờ: ưu tiên gioHour/gioPhut, fallback từ gioIdx
    if (d.gioHour !== undefined && document.getElementById('tvf-gio')) {
      document.getElementById('tvf-gio').value  = d.gioHour;
      document.getElementById('tvf-phut').value = d.gioPhut ?? 0;
    } else if (d.gioIdx !== undefined && document.getElementById('tvf-gio')) {
      document.getElementById('tvf-gio').value  = (d.gioIdx * 2 + 1) % 24;
      document.getElementById('tvf-phut').value = 0;
    }
    updateGioAmDisplay();
  }

  return {
    render,
    getData,
    setData,
    _update: updateGioAmDisplay,
  };
})();
