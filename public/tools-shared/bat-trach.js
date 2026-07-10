/* tools-shared/bat-trach.js — Module DÙNG CHUNG tool Hướng Bát Trạch.
   Nguồn DUY NHẤT cho standalone /tools/bat-trach.html + shell /app/bat-trach.
   Logic (getCungMenh + bảng du niên BT 8 hướng) + chuỗi render PORT NGUYÊN XI
   từ bản inline cũ — không đổi hành vi. window.BatTrachTool = { compute } */
(function (root) {
  function getCungMenh(nam, gioitinh) {
    var s = 0, y = nam % 100; if (y === 0) y = 100;
    while (y > 9) { s = 0; while (y > 0) { s += y % 10; y = Math.floor(y / 10); } y = s; }
    var cung;
    if (gioitinh === 'nam') { cung = 10 - y; if (cung === 0) cung = 9; if (cung === 5) cung = 2; }
    else { cung = y + 5; if (cung > 9) cung -= 9; if (cung === 5) cung = 8; }
    return cung;
  }
  var CUNG_NAME = ['', 'Khảm', 'Khôn', 'Chấn', 'Tốn', 'Trung Cung', 'Càn', 'Đoài', 'Cấn', 'Ly'];
  var CUNG_HANH = ['', 'Thủy', 'Thổ', 'Mộc', 'Mộc', 'Thổ', 'Kim', 'Kim', 'Thổ', 'Hỏa'];
  var CUNG_DIR = ['', 'N', 'SW', 'E', 'SE', '—', 'NW', 'W', 'NE', 'S'];
  var NHOM = ['', 'Đông', 'Tây', 'Đông', 'Đông', 'Tây', 'Tây', 'Tây', 'Tây', 'Đông'];
  // [Sinh Khí, Thiên Y, Diên Niên, Phục Vị, Họa Hại, Lục Sát, Ngũ Quỷ, Tuyệt Mệnh]
  var BT = {
    1: ['SE', 'E', 'S', 'N', 'W', 'NW', 'NE', 'SW'],
    2: ['NE', 'W', 'NW', 'SW', 'E', 'SE', 'S', 'N'],
    3: ['S', 'N', 'SE', 'E', 'SW', 'NE', 'W', 'NW'],
    4: ['N', 'S', 'E', 'SE', 'SW', 'NE', 'W', 'NW'],
    6: ['W', 'NE', 'SW', 'NW', 'SE', 'E', 'N', 'S'],
    7: ['NW', 'SW', 'NE', 'W', 'N', 'S', 'SE', 'E'],
    8: ['SW', 'NW', 'W', 'NE', 'S', 'N', 'E', 'SE'],
    9: ['E', 'SE', 'N', 'S', 'NE', 'SW', 'SW', 'NW'],
  };
  var CAT_NAMES = ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'];
  var HUNG_NAMES = ['Họa Hại', 'Lục Sát', 'Ngũ Quỷ', 'Tuyệt Mệnh'];
  var CAT_DESC = ['Tài lộc, sức khỏe, phát triển tốt nhất', 'Sức khỏe, trường thọ, y duyên', 'Hôn nhân, sự nghiệp bền vững', 'Bình ổn, an cư, giữ vững'];
  var HUNG_DESC = ['Hao tài, thị phi, chuyện không hay', 'Tình cảm trục trặc, sức khỏe suy', 'Tiểu nhân, phá hoại ngầm', 'Tuyệt vận, bệnh nặng, tai họa lớn'];
  var CAT_USE = ['Cửa chính, phòng ngủ, bàn làm việc', 'Phòng ngủ, hướng đầu giường', 'Bàn thờ, phòng khách, bàn ăn', 'Kho, nhà vệ sinh, phòng phụ'];
  var HUNG_USE = ['Tránh cửa chính, phòng ngủ', 'Tránh đặt bàn thờ, phòng ngủ', 'Tránh bếp, phòng chủ', 'Không đặt cửa, không kê giường'];
  var DIR_VI = { 'N': 'Bắc', 'S': 'Nam', 'E': 'Đông', 'W': 'Tây', 'NE': 'Đông Bắc', 'NW': 'Tây Bắc', 'SE': 'Đông Nam', 'SW': 'Tây Nam' };
  var DIR_POS = { 'N': { css: 'dir-N' }, 'S': { css: 'dir-S' }, 'E': { css: 'dir-E' }, 'W': { css: 'dir-W' }, 'NE': { css: 'dir-NE' }, 'NW': { css: 'dir-NW' }, 'SE': { css: 'dir-SE' }, 'SW': { css: 'dir-SW' } };

  function compute(year, gender) {
    if (!year || year < 1900 || year > 2010) {
      return { ok: false, error: 'Vui lòng nhập năm sinh hợp lệ (1900–2010).' };
    }
    var cung = getCungMenh(year, gender);
    if (cung === 5) cung = gender === 'nam' ? 2 : 8;
    var dirs = BT[cung];
    if (!dirs) return { ok: false, error: 'Không tính được cung mệnh.' };
    var nhom = NHOM[cung];
    var resTitleText = `Năm ${year} — Cung ${cung} ${CUNG_NAME[cung]} — ${nhom} Tứ Mệnh`;
    var resInfoHTML = `
    <div style="margin-bottom:16px"><span class="nhom-badge ${nhom === 'Đông' ? 'dong' : 'tay'}">${nhom} Tứ Mệnh</span></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div class="res-row"><span class="res-row-label">Cung Mệnh</span><span class="res-row-val">${cung} — ${CUNG_NAME[cung]}</span></div>
      <div class="res-row"><span class="res-row-label">Ngũ Hành</span><span class="res-row-val">${CUNG_HANH[cung]}</span></div>
      <div class="res-row"><span class="res-row-label">Vị Trí Cung</span><span class="res-row-val">${DIR_VI[CUNG_DIR[cung]] || 'Trung tâm'}</span></div>
      <div class="res-row" style="border:none"><span class="res-row-label">Nhóm</span><span class="res-row-val">${nhom === 'Đông' ? 'Đông Tứ Mệnh — hợp các hướng Đông, Đông Nam, Nam, Bắc' : 'Tây Tứ Mệnh — hợp các hướng Tây, Tây Bắc, Đông Bắc, Tây Nam'}</span></div>
    </div>`;
    var compassInner = Object.keys(DIR_POS).map(function (d) {
      var p = DIR_POS[d];
      var catIdx = dirs.slice(0, 4).indexOf(d);
      var hungIdx = dirs.slice(4).indexOf(d);
      var cls = 'dir-neu', label = '';
      if (catIdx >= 0) { cls = 'dir-good'; label = CAT_NAMES[catIdx]; }
      else if (hungIdx >= 0) { cls = 'dir-bad'; label = HUNG_NAMES[hungIdx]; }
      return `<div class="compass-dir ${p.css} ${cls}"><div>${DIR_VI[d]}</div><div class="dir-label">${label}</div></div>`;
    }).join('');
    var compassHTML = `<div class="compass-ring"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-lt);font-weight:600">CUNG ${cung}</div>${compassInner}`;
    var rows = dirs.slice(0, 4).map(function (d, i) {
      return `<tr class="good"><td><span class="dot-good"></span><strong>${DIR_VI[d]}</strong></td><td style="color:#1E6B3C;font-weight:600">${CAT_NAMES[i]}</td><td>${CAT_DESC[i]}</td><td style="font-size:12px">${CAT_USE[i]}</td></tr>`;
    }).concat(dirs.slice(4).map(function (d, i) {
      return `<tr class="bad"><td><span class="dot-bad"></span><strong>${DIR_VI[d]}</strong></td><td style="color:#C0392B;font-weight:600">${HUNG_NAMES[i]}</td><td>${HUNG_DESC[i]}</td><td style="font-size:12px;color:#999">${HUNG_USE[i]}</td></tr>`;
    }));
    var huongRowsHTML = rows.join('');

    return {
      ok: true,
      resTitleText: resTitleText,
      resInfoHTML: resInfoHTML,
      compassHTML: compassHTML,
      huongRowsHTML: huongRowsHTML,
      data: {
        nam: year,
        gioiTinh: gender,
        cung: cung,
        menhQuai: CUNG_NAME[cung],
        quaiHanh: CUNG_HANH[cung],
        nhom: nhom + ' Tứ Mệnh',
        huongTot: dirs.slice(0, 4).map(function (d, i) { return CAT_NAMES[i] + ': ' + DIR_VI[d]; }).join(', '),
        huongXau: dirs.slice(4).map(function (d, i) { return HUNG_NAMES[i] + ': ' + DIR_VI[d]; }).join(', '),
      },
    };
  }

  var API = { compute: compute };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BatTrachTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
