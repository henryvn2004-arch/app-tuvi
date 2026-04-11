/**
 * tuvi-form.js — Shared input form cho Tử Vi Minh Bảo
 * Include vào trang, rồi gọi TuviForm.render('container-id', { onSubmit })
 *
 * API:
 *   TuviForm.render(containerId, options)
 *   TuviForm.getData()       → { hoten, ngay, thang, nam, gioIdx, gioitinh, namXem }
 *   TuviForm.setData(data)   → fill form từ data object
 *   TuviForm.getGioIdx()     → gioIdx (0-11) từ giờ+phút hiện tại
 */

const TuviForm = (() => {
  const CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

  function hourMinToGioIdx(h, m) {
    return Math.floor(((h * 60 + m + 60) % (24 * 60)) / 120) % 12;
  }

  function updateGioAmDisplay() {
    const hh = parseInt(document.getElementById('tvf-gio')?.value) || 0;
    const pp = parseInt(document.getElementById('tvf-phut')?.value) || 0;
    const idx = hourMinToGioIdx(hh, pp);
    const el = document.getElementById('tvf-gio-am');
    if (el) el.textContent = 'Giờ âm: ' + CHI[idx];
  }

  function render(containerId, options = {}) {
    const { onSubmit, submitLabel = 'Luận Giải Lá Số →' } = options;
    const now = new Date();
    const namXemDefault = now.getFullYear();

    // Build giờ options
    let gioOptions = '';
    for (let i = 0; i <= 23; i++) {
      gioOptions += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    }
    // Build phút options
    let phutOptions = '';
    for (let i = 0; i <= 59; i++) {
      phutOptions += `<option value="${i}">${String(i).padStart(2,'0')}</option>`;
    }
    // Build ngày/tháng options
    let ngayOptions = '<option value="">Ngày</option>';
    for (let i = 1; i <= 31; i++) ngayOptions += `<option value="${i}">${i}</option>`;
    let thangOptions = '<option value="">Tháng</option>';
    for (let i = 1; i <= 12; i++) thangOptions += `<option value="${i}">${i}</option>`;

    const html = `
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
        <select class="form-input" id="ngay">${ngayOptions}</select>
        <select class="form-input" id="thang">${thangOptions}</select>
        <input class="form-input" type="number" id="nam" placeholder="1990" min="1900" max="2099" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Giờ sinh</label>
      <div class="form-row-3">
        <select class="form-input" id="tvf-gio" oninput="TuviForm._update()">${gioOptions}</select>
        <select class="form-input" id="tvf-phut" oninput="TuviForm._update()">${phutOptions}</select>
        <div style="display:flex;align-items:center;font-size:12px;color:var(--text-lt);padding:0 4px;white-space:nowrap" id="tvf-gio-am">Giờ âm: Tý</div>
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
      // Bind submit button
      document.getElementById('tvf-submit-btn').addEventListener('click', () => {
        if (onSubmit) onSubmit();
      });
      // Init display
      updateGioAmDisplay();
    }
  }

  function getData() {
    const hh = parseInt(document.getElementById('tvf-gio')?.value) || 0;
    const pp = parseInt(document.getElementById('tvf-phut')?.value) || 0;
    return {
      hoten:    (document.getElementById('hoten')?.value || '').trim(),
      ngay:     parseInt(document.getElementById('ngay')?.value) || 0,
      thang:    parseInt(document.getElementById('thang')?.value) || 0,
      nam:      parseInt(document.getElementById('nam')?.value) || 0,
      gioIdx:   hourMinToGioIdx(hh, pp),
      gioHour:  hh,
      gioPhut:  pp,
      gioitinh: document.getElementById('gioitinh')?.value || 'nam',
      namXem:   parseInt(document.getElementById('namXem')?.value) || new Date().getFullYear(),
    };
  }

  function setData(d) {
    if (!d) return;
    if (d.hoten    !== undefined) document.getElementById('hoten').value    = d.hoten;
    if (d.ngay     !== undefined) document.getElementById('ngay').value     = d.ngay;
    if (d.thang    !== undefined) document.getElementById('thang').value    = d.thang;
    if (d.nam      !== undefined) document.getElementById('nam').value      = d.nam;
    if (d.gioitinh !== undefined) document.getElementById('gioitinh').value = d.gioitinh;
    if (d.namXem   !== undefined) document.getElementById('namXem').value   = d.namXem;
    // giờ+phút: nếu có gioHour/gioPhut dùng trực tiếp, nếu chỉ có gioIdx thì tính mid-hour
    if (d.gioHour !== undefined) {
      document.getElementById('tvf-gio').value  = d.gioHour;
      document.getElementById('tvf-phut').value = d.gioPhut ?? 0;
    } else if (d.gioIdx !== undefined) {
      // convert gioIdx → mid-hour của canh giờ đó
      const midHour = (d.gioIdx * 2 + 1) % 24;
      document.getElementById('tvf-gio').value  = midHour;
      document.getElementById('tvf-phut').value = 0;
    }
    updateGioAmDisplay();
  }

  function getGioIdx() {
    const hh = parseInt(document.getElementById('tvf-gio')?.value) || 0;
    const pp = parseInt(document.getElementById('tvf-phut')?.value) || 0;
    return hourMinToGioIdx(hh, pp);
  }

  return {
    render,
    getData,
    setData,
    getGioIdx,
    _update: updateGioAmDisplay, // called by oninput
  };
})();
