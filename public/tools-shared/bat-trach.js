/* tools-shared/bat-trach.js — Module DÙNG CHUNG tool Hướng Bát Trạch.
   Nguồn DUY NHẤT cho standalone /tools/bat-trach.html + shell /app/bat-trach +
   server (`lib/engine/bat-trach.ts`, đúng tiền lệ `kim-lau.js`↔`kim-lau.ts`) +
   4 trang Vision phong thủy (`phong-thuy.html`, `cua-hang-phong-thuy.html`,
   `ban-lam-viec.html`, `huong-nha-phong-thuy.html` + 3 bản shell `app-*`).
   window.BatTrachTool = { compute, duNienStars, getCungMenh, CUNG_NAME, CUNG_HANH, CUNG_DIR }

   ── 2026-08 — BẢNG DU NIÊN SINH BẰNG THUẬT TOÁN, GỠ 3 BẢN CHÉP TAY MÂU THUẪN
   Repo có 3 bản Du Niên chép tay độc lập (`bat-trach.js` cũ, `GUA_DATA` lặp ở
   6 trang Vision, `GUA` trong `app/api/phong-thuy/route.ts`) — cả 3 bản đều
   TỰ MÂU THUẪN (không đối xứng: cung A nhìn cung B ra sao X nhưng cung B nhìn
   cung A lại ra sao khác), sai khác nhau: bản cũ sai 15/64 ô, `GUA_DATA`/
   route.ts sai 12/64 ô — không thể xác định do gõ nhầm khi chép tay hay do
   COPY nguồn khác nhau; đằng nào bảng cũng phải SINH RA chứ không chép nữa.
   Không "sửa mò" — bảng Du Niên suy được từ đúng MỘT phép toán cổ pháp (phép
   biến hào 游年歌訣): so hào của quái mình với quái đối chiếu bằng XOR nhị
   phân 3-bit (dưới-giữa-trên), mẫu hào ĐỘNG (bit khác) quyết định sao nào ra.
   XOR giao hoán ⇒ đối xứng tự động, không cần bảng đối chiếu ngoài. Đã verify
   khớp 8/8 với bảng cặp số Bát Tinh lưu hành (14/28/39/67=Sinh Khí…) và khớp
   nguyên trạng cung 1 của bản cũ (cung duy nhất bản cũ tình cờ đúng cả 8 sao).
   `scripts/check-bat-trach.mjs` (chạy trong CI lint) chặn bảng hằng tái xuất. */
(function (root) {
  // ⚠️ 2026-08 — VÁ: thiếu nhánh trước/sau năm 2000. Công thức Cung Phi rút
  // gọn (2 chữ số cuối năm) đổi HẰNG SỐ theo thế kỷ — nam trước 2000 dùng
  // 10−s, từ 2000 dùng 9−s; nữ trước 2000 dùng s+5, từ 2000 dùng s+6. Bản cũ
  // luôn dùng 10−s/s+5 bất kể năm nào ⇒ SAI 100% cho người sinh ≥2000. Verify
  // 2 nguồn độc lập (VN + quốc tế): nam 1990 phải ra cung 1 Khảm — khớp.
  function getCungMenh(nam, gioitinh) {
    var s = 0, y = nam % 100; if (y === 0) y = 100;
    while (y > 9) { s = 0; while (y > 0) { s += y % 10; y = Math.floor(y / 10); } y = s; }
    var truoc2000 = nam < 2000;
    var cung;
    if (gioitinh === 'nam') {
      cung = (truoc2000 ? 10 : 9) - y;
      if (cung <= 0) cung += 9;
      if (cung === 5) cung = 2;
    } else {
      cung = y + (truoc2000 ? 5 : 6);
      while (cung > 9) cung -= 9;
      if (cung === 5) cung = 8;
    }
    return cung;
  }
  var CUNG_NAME = ['', 'Khảm', 'Khôn', 'Chấn', 'Tốn', 'Trung Cung', 'Càn', 'Đoài', 'Cấn', 'Ly'];
  var CUNG_HANH = ['', 'Thủy', 'Thổ', 'Mộc', 'Mộc', 'Thổ', 'Kim', 'Kim', 'Thổ', 'Hỏa'];
  var CUNG_DIR = ['', 'N', 'SW', 'E', 'SE', '—', 'NW', 'W', 'NE', 'S'];
  var NHOM = ['', 'Đông', 'Tây', 'Đông', 'Đông', 'Tây', 'Tây', 'Tây', 'Tây', 'Đông'];

  // Mã nhị phân quái (bit dưới-giữa-trên), theo Hậu Thiên Bát Quái/Lạc Thư —
  // đúng thứ tự CUNG_DIR ở trên (1 Khảm=Bắc … 9 Ly=Nam).
  var GUA_BIN = { 1: 0x2, 2: 0x0, 3: 0x1, 4: 0x6, 6: 0x7, 7: 0x3, 8: 0x4, 9: 0x5 };
  // Mẫu hào ĐỘNG (XOR 3-bit) → tên sao Du Niên. Suy trực tiếp từ phép biến
  // hào: hào nào khác giữa 2 quái thì "động"; TOÀN BỘ 8 mẫu (000–111) dùng
  // hết đúng 1 lần — tự chứng minh không sót/không trùng sao nào.
  var STAR_BY_XOR = {
    0x0: 'Phục Vị', 0x1: 'Họa Hại', 0x2: 'Tuyệt Mệnh', 0x3: 'Thiên Y',
    0x4: 'Sinh Khí', 0x5: 'Lục Sát', 0x6: 'Ngũ Quỷ', 0x7: 'Diên Niên',
  };
  var CAT_NAMES = ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'];
  var HUNG_NAMES = ['Họa Hại', 'Lục Sát', 'Ngũ Quỷ', 'Tuyệt Mệnh'];
  var CAT_SET = { 'Sinh Khí': 1, 'Thiên Y': 1, 'Diên Niên': 1, 'Phục Vị': 1 };
  var CUNGS = [1, 2, 3, 4, 6, 7, 8, 9];

  // Sinh bảng Du Niên cho MỘT cung — { good:{sao:hướng×4}, bad:{sao:hướng×4} }.
  // Đây là hàm DUY NHẤT tính ra sao gì ở hướng nào; mọi nơi khác gọi lại hàm
  // này, không được chép kết quả thành hằng số.
  function duNienStars(cung) {
    var good = {}, bad = {};
    for (var i = 0; i < CUNGS.length; i++) {
      var k = CUNGS[i];
      var star = STAR_BY_XOR[GUA_BIN[cung] ^ GUA_BIN[k]];
      var dir = CUNG_DIR[k];
      if (CAT_SET[star]) good[star] = dir; else bad[star] = dir;
    }
    return { good: good, bad: bad };
  }

  // Sao Du Niên giữa HAI CUNG bất kỳ (1-4, 6-9), không cần đi qua hướng —
  // dùng cho `tools-shared/so-dep.js` (quét cặp chữ số liền kề, mỗi cặp là
  // một cặp "cung" theo Lạc Thư, không phải một hướng cố định). Trả về null
  // nếu a hoặc b không phải cung hợp lệ (0 và 5/trung cung không có mã quái).
  function starBetween(a, b) {
    if (!GUA_BIN.hasOwnProperty(a) || !GUA_BIN.hasOwnProperty(b)) return null;
    return STAR_BY_XOR[GUA_BIN[a] ^ GUA_BIN[b]];
  }

  // Mảng thứ tự cũ [Sinh Khí, Thiên Y, Diên Niên, Phục Vị, Họa Hại, Lục Sát,
  // Ngũ Quỷ, Tuyệt Mệnh] — giữ để compute() bên dưới không phải viết lại.
  function duNienArr(cung) {
    var t = duNienStars(cung);
    return CAT_NAMES.concat(HUNG_NAMES).map(function (s) { return t.good[s] || t.bad[s]; });
  }

  var TRIGRAM_ICON = { 1: '☵', 2: '☷', 3: '☳', 4: '☴', 6: '☰', 7: '☱', 8: '☶', 9: '☲' };

  // Bảng đủ 8 cung theo shape CŨ { cung: {name, elem, icon, good:{hướng:sao},
  // bad:{hướng:sao}} } — 7 trang Vision phong thủy (phong-thuy.html,
  // cua-hang-phong-thuy.html, ban-lam-viec.html + 3 bản shell + huong-nha-
  // phong-thuy.html) từng chép tay hằng số này 7 LẦN, sai 12/64 ô giống hệt
  // nhau (bằng chứng chép cùng 1 nguồn lỗi). Gọi hàm này thay vì chép nữa.
  function guaDataLegacy() {
    var out = {};
    for (var i = 0; i < CUNGS.length; i++) {
      var c = CUNGS[i];
      var t = duNienStars(c);
      var good = {}, bad = {};
      for (var s in t.good) good[t.good[s]] = s;
      for (var s2 in t.bad) bad[t.bad[s2]] = s2;
      out[c] = { name: CUNG_NAME[c], elem: CUNG_HANH[c], icon: TRIGRAM_ICON[c], good: good, bad: bad };
    }
    return out;
  }
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
    var dirs = duNienArr(cung);
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

  var API = {
    compute: compute,
    getCungMenh: getCungMenh,
    duNienStars: duNienStars,
    duNienArr: duNienArr,
    starBetween: starBetween,
    guaDataLegacy: guaDataLegacy,
    TRIGRAM_ICON: TRIGRAM_ICON,
    CUNG_NAME: CUNG_NAME,
    CUNG_HANH: CUNG_HANH,
    CUNG_DIR: CUNG_DIR,
    NHOM: NHOM,
    CAT_NAMES: CAT_NAMES,
    HUNG_NAMES: HUNG_NAMES,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BatTrachTool = API;
})(typeof window !== 'undefined' ? window : globalThis);
