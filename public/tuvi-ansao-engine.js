
// ============================================================
// DƯƠNG LỊCH → ÂM LỊCH (converted from Python)
// ============================================================

const _CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const _CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// ─── LUNAR CALENDAR (Ho Ngoc Duc algorithm) ─────────────────
function _jdFromDate(dd, mm, yy) {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

function _sunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525.0;
  const T2 = T * T;
  const dr = Math.PI / 180.0;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
  const DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
           + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
           + 0.000290 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  const omega = 125.04 - 1934.136 * T;
  L = L - 0.00569 - 0.00478 * Math.sin(omega * dr);
  L = L - Math.floor(L / 360) * 360;
  if (L < 0) L += 360;
  return Math.floor(L / 30);
}

function _newMoonD(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180.0;
  let Jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  Jd += (0.1734 - 0.000393 * T) * Math.sin(M * dr)
      + 0.0021 * Math.sin(2 * M * dr)
      - 0.4068 * Math.sin(Mpr * dr)
      + 0.0161 * Math.sin(2 * Mpr * dr)
      - 0.0004 * Math.sin(3 * Mpr * dr)
      + 0.0104 * Math.sin(2 * F * dr)
      - 0.0051 * Math.sin((M + Mpr) * dr)
      - 0.0074 * Math.sin((M - Mpr) * dr)
      + 0.0004 * Math.sin((2 * F + M) * dr)
      - 0.0004 * Math.sin((2 * F - M) * dr)
      - 0.0006 * Math.sin((2 * F + Mpr) * dr)
      + 0.0010 * Math.sin((2 * F - Mpr) * dr)
      + 0.0005 * Math.sin((M + 2 * Mpr) * dr);
  return Jd;
}

function _getNewMoonDay(k, tz) {
  return Math.floor(_newMoonD(k) + 0.5 + tz / 24);
}

function _getLunarMonth11(yy, tz) {
  const off = _jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = _getNewMoonDay(k, tz);
  const sunLong = _sunLongitude(nm);
  if (sunLong >= 9) nm = _getNewMoonDay(k - 1, tz);
  return nm;
}

function solarToLunar(dd, mm, yy, tz = 7) {
  const dayNumber = _jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = _getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = _getNewMoonDay(k, tz);

  let a11 = _getLunarMonth11(yy, tz);
  let b11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = _getLunarMonth11(yy - 1, tz);
    b11 = _getLunarMonth11(yy, tz);
  } else {
    lunarYear = yy + 1;
    b11 = _getLunarMonth11(yy + 1, tz);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarMonth = diff + 11;
  if (lunarMonth > 12) lunarMonth -= 12;

  // Detect leap month
  const leapOff = Math.floor((a11 - 2415021.076998695) / 29.530588853);
  let leapMonth = 0;
  const hasLeap = Math.floor((b11 - a11) / 29) === 13; // 13 tháng âm = có tháng nhuận
  if (hasLeap) {
    for (let i = 0; i < 14; i++) {
      const nm1 = _getNewMoonDay(leapOff + i, tz);
      if (nm1 < a11) continue;
      if (nm1 >= b11) break;
      const nm2 = _getNewMoonDay(leapOff + i + 1, tz);
      // Tháng nhuận không chứa trung khí: sunLong(nm1) === sunLong(nm2-1)
      if (_sunLongitude(nm1) === _sunLongitude(nm2 - 1)) {
        leapMonth = i;
        break;
      }
    }
    if (leapMonth > 0 && diff >= leapMonth) {
      lunarMonth = diff + 10;
      if (lunarMonth > 12) lunarMonth -= 12;
    }
  }

  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear };
}

function hourToChi(hour) {
  return _CHI[Math.floor((hour + 1) / 2) % 12];
}

function yearCanChi(year) {
  return _CAN[(year + 6) % 10] + ' ' + _CHI[(year + 8) % 12];
}

function dayCanChi(dd, mm, yy) {
  const jd = _jdFromDate(dd, mm, yy);
  return _CAN[(jd + 9) % 10] + ' ' + _CHI[(jd + 1) % 12];
}

function hourCanChi(hour, dayCanStr) {
  const chiIndex = Math.floor((hour + 1) / 2) % 12;
  const canIndex = (_CAN.indexOf(dayCanStr.split(' ')[0]) * 2 + chiIndex) % 10;
  return _CAN[canIndex] + ' ' + _CHI[chiIndex];
}

function convertDuongToAm(dd, mm, yy, hour) {
  const amLich = solarToLunar(dd, mm, yy);
  const gioChi = hourToChi(hour);
  const gioIdx = _CHI.indexOf(gioChi);
  const namCanChi = yearCanChi(amLich.year);
  const ngayCanChi = dayCanChi(dd, mm, yy);
  const gioCanChi = hourCanChi(hour, ngayCanChi);
  const canNam = namCanChi.split(' ')[0];
  const chiNam = namCanChi.split(' ')[1];
  return {
    amLich,
    canChi: { year: namCanChi, day: ngayCanChi, hour: gioCanChi },
    gioChi,
    gioIdx,
    canNam,
    chiNam,
  };
}

// ============================================================
// TỬ VI AN SAO ENGINE v1.0
// Complete rule-based engine - no external dependencies
// ============================================================

const DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const THIEN_CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const TEN_CUNG = ['Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc','Nô Bộc',
                  'Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'];

function mod12(n) { return ((n % 12) + 12) % 12; }
function dcIdx(dc) { return DIA_CHI.indexOf(dc); }

// ─── NẠP ÂM ────────────────────────────────────────────────
const NAP_AM = {
  'Giáp Tý':'Kim','Ất Sửu':'Kim','Bính Dần':'Hỏa','Đinh Mão':'Hỏa',
  'Mậu Thìn':'Mộc','Kỷ Tỵ':'Mộc','Canh Ngọ':'Thổ','Tân Mùi':'Thổ',
  'Nhâm Thân':'Kim','Quý Dậu':'Kim','Giáp Tuất':'Hỏa','Ất Hợi':'Hỏa',
  'Bính Tý':'Thủy','Đinh Sửu':'Thủy','Mậu Dần':'Thổ','Kỷ Mão':'Thổ',
  'Canh Thìn':'Kim','Tân Tỵ':'Kim','Nhâm Ngọ':'Mộc','Quý Mùi':'Mộc',
  'Giáp Thân':'Thủy','Ất Dậu':'Thủy','Bính Tuất':'Thổ','Đinh Hợi':'Thổ',
  'Mậu Tý':'Hỏa','Kỷ Sửu':'Hỏa','Canh Dần':'Mộc','Tân Mão':'Mộc',
  'Nhâm Thìn':'Thủy','Quý Tỵ':'Thủy','Giáp Ngọ':'Kim','Ất Mùi':'Kim',
  'Bính Thân':'Hỏa','Đinh Dậu':'Hỏa','Mậu Tuất':'Mộc','Kỷ Hợi':'Mộc',
  'Canh Tý':'Thổ','Tân Sửu':'Thổ','Nhâm Dần':'Kim','Quý Mão':'Kim',
  'Giáp Thìn':'Hỏa','Ất Tỵ':'Hỏa','Bính Ngọ':'Thủy','Đinh Mùi':'Thủy',
  'Mậu Thân':'Thổ','Kỷ Dậu':'Thổ','Canh Tuất':'Kim','Tân Hợi':'Kim',
  'Nhâm Tý':'Mộc','Quý Sửu':'Mộc','Giáp Dần':'Thủy','Ất Mão':'Thủy',
  'Bính Thìn':'Thổ','Đinh Tỵ':'Thổ','Mậu Ngọ':'Hỏa','Kỷ Mùi':'Hỏa',
  'Canh Thân':'Mộc','Tân Dậu':'Mộc','Nhâm Tuất':'Thủy','Quý Hợi':'Thủy',
};

// ─── LẬP CỤC ────────────────────────────────────────────────
// Dùng trực tiếp địa chi cung Mệnh + can năm sinh
const LAP_CUC_RULES = [
  { cung: ['Tý','Sửu'],             can: ['Giáp','Kỷ'],   cuc: 'Thủy Nhị Cục' },
  { cung: ['Tý','Sửu'],             can: ['Ất','Canh'],   cuc: 'Hỏa Lục Cục'  },
  { cung: ['Tý','Sửu'],             can: ['Bính','Tân'],  cuc: 'Thổ Ngũ Cục'  },
  { cung: ['Tý','Sửu'],             can: ['Đinh','Nhâm'], cuc: 'Mộc Tam Cục'  },
  { cung: ['Tý','Sửu'],             can: ['Mậu','Quý'],   cuc: 'Kim Tứ Cục'   },
  { cung: ['Dần','Mão','Tuất','Hợi'], can: ['Giáp','Kỷ'],   cuc: 'Hỏa Lục Cục'  },
  { cung: ['Dần','Mão','Tuất','Hợi'], can: ['Ất','Canh'],   cuc: 'Thổ Ngũ Cục'  },
  { cung: ['Dần','Mão','Tuất','Hợi'], can: ['Bính','Tân'],  cuc: 'Mộc Tam Cục'  },
  { cung: ['Dần','Mão','Tuất','Hợi'], can: ['Đinh','Nhâm'], cuc: 'Kim Tứ Cục'   },
  { cung: ['Dần','Mão','Tuất','Hợi'], can: ['Mậu','Quý'],   cuc: 'Thủy Nhị Cục' },
  { cung: ['Thìn','Tỵ'],            can: ['Giáp','Kỷ'],   cuc: 'Mộc Tam Cục'  },
  { cung: ['Thìn','Tỵ'],            can: ['Ất','Canh'],   cuc: 'Kim Tứ Cục'   },
  { cung: ['Thìn','Tỵ'],            can: ['Bính','Tân'],  cuc: 'Thủy Nhị Cục' },
  { cung: ['Thìn','Tỵ'],            can: ['Đinh','Nhâm'], cuc: 'Hỏa Lục Cục'  },
  { cung: ['Thìn','Tỵ'],            can: ['Mậu','Quý'],   cuc: 'Thổ Ngũ Cục'  },
  { cung: ['Ngọ','Mùi'],            can: ['Giáp','Kỷ'],   cuc: 'Thổ Ngũ Cục'  },
  { cung: ['Ngọ','Mùi'],            can: ['Ất','Canh'],   cuc: 'Mộc Tam Cục'  },
  { cung: ['Ngọ','Mùi'],            can: ['Bính','Tân'],  cuc: 'Kim Tứ Cục'   },
  { cung: ['Ngọ','Mùi'],            can: ['Đinh','Nhâm'], cuc: 'Thủy Nhị Cục' },
  { cung: ['Ngọ','Mùi'],            can: ['Mậu','Quý'],   cuc: 'Hỏa Lục Cục'  },
  { cung: ['Thân','Dậu'],           can: ['Giáp','Kỷ'],   cuc: 'Kim Tứ Cục'   },
  { cung: ['Thân','Dậu'],           can: ['Ất','Canh'],   cuc: 'Thủy Nhị Cục' },
  { cung: ['Thân','Dậu'],           can: ['Bính','Tân'],  cuc: 'Hỏa Lục Cục'  },
  { cung: ['Thân','Dậu'],           can: ['Đinh','Nhâm'], cuc: 'Thổ Ngũ Cục'  },
  { cung: ['Thân','Dậu'],           can: ['Mậu','Quý'],   cuc: 'Mộc Tam Cục'  },
];

function lapCuc(canNam, menhDiaChi) {
  for (const rule of LAP_CUC_RULES) {
    if (rule.cung.includes(menhDiaChi) && rule.can.includes(canNam)) {
      return { cuc: rule.cuc, canMenh: null };
    }
  }
  return { cuc: null, canMenh: null };
}

// ─── AN CUNG MỆNH / THÂN ────────────────────────────────────
function dinhCungMenh(thangAL, gioIdx) {
  // Dần = tháng 1, đếm thuận đến tháng → đó là giờ Tý
  const cungThang = mod12(dcIdx('Dần') + thangAL - 1);
  // Đếm nghịch đến giờ
  return mod12(cungThang - gioIdx);
}
function dinhCungThan(thangAL, gioIdx) {
  const cungThang = mod12(dcIdx('Dần') + thangAL - 1);
  return mod12(cungThang + gioIdx);
}

// ─── BẢNG AN TỬ VI (cung → [ngày]) ──────────────────────────
const TU_VI_BANG = {
  'Thủy Nhị Cục': {'Tỵ':[8,9],'Ngọ':[10,11],'Mùi':[12,13],'Thân':[14,15],'Dậu':[16,17],'Tuất':[18,19],'Hợi':[20,21],'Tý':[22,23],'Sửu':[1,24,25],'Dần':[2,3,26,27],'Mão':[4,5,28,29],'Thìn':[6,7,30]},
  'Mộc Tam Cục':  {'Tỵ':[4,12,14],'Ngọ':[7,15,17],'Mùi':[10,18,20],'Thân':[13,21,23],'Dậu':[16,24,26],'Tuất':[19,27,29],'Hợi':[22,30],'Tý':[25],'Sửu':[2,28],'Dần':[3,5],'Mão':[6,8],'Thìn':[1,9,11]},
  'Kim Tứ Cục':   {'Tỵ':[6,16,19,25],'Ngọ':[10,20,23,29],'Mùi':[14,24,27],'Thân':[18,28],'Dậu':[22],'Tuất':[26],'Hợi':[1,30],'Tý':[5],'Sửu':[3,9],'Dần':[4,7,13],'Mão':[8,11,17],'Thìn':[2,12,15,21]},
  'Thổ Ngũ Cục':  {'Tỵ':[8,20,24],'Ngọ':[1,13,25,29],'Mùi':[6,18,30],'Thân':[11,23],'Dậu':[16,28],'Tuất':[21],'Hợi':[2,26],'Tý':[7],'Sửu':[4,12],'Dần':[5,9,17],'Mão':[10,14,22],'Thìn':[3,15,19,27]},
  'Hỏa Lục Cục':  {'Tỵ':[10,24,29],'Ngọ':[2,16,30],'Mùi':[8,22],'Thân':[14,28],'Dậu':[1,20],'Tuất':[7,26],'Hợi':[3,13],'Tý':[9,19],'Sửu':[5,15,25],'Dần':[6,11,21],'Mão':[12,17,27],'Thìn':[4,18,23]},
};

// Thiên Phủ đối xứng với Tử Vi qua trục Ngọ-Tý
// Công thức: idxThienPhu = (12 - idxTuVi + 2) % 12
// Hoặc dùng bảng tra chính xác
const THIEN_PHU_FROM_TUVI = {
  'Tý':'Thìn','Sửu':'Mão','Dần':'Dần','Mão':'Sửu','Thìn':'Tý','Tỵ':'Hợi',
  'Ngọ':'Tuất','Mùi':'Dậu','Thân':'Thân','Dậu':'Mùi','Tuất':'Ngọ','Hợi':'Tỵ',
};

// ─── 14 CHÍNH TINH ──────────────────────────────────────────
function anChinhTinh(ngayAL, cuc) {
  // Tra cung Tử Vi: duyệt từng cung, tìm cung có ngày AL trong danh sách
  const cucTable = TU_VI_BANG[cuc];
  if (!cucTable) return null;
  let tuViDC = null;
  for (const [cung, days] of Object.entries(cucTable)) {
    if (days.includes(ngayAL)) { tuViDC = cung; break; }
  }
  if (!tuViDC) return null;

  const tv = dcIdx(tuViDC);
  // Tử Vi hệ (Bắc Đẩu) - đếm thuận với offset
  const liemTrinh  = mod12(tv + 4);
  const thienDong  = mod12(liemTrinh + 3);
  const vuKhuc     = mod12(thienDong + 1);
  const thaiDuong  = mod12(vuKhuc + 1);
  const thienCo    = mod12(thaiDuong + 2);

  // Thiên Phủ hệ (Nam Đẩu)
  const thienPhuDC = THIEN_PHU_FROM_TUVI[tuViDC];
  const tp = dcIdx(thienPhuDC);
  const thaiAm     = mod12(tp + 1);
  const thamLang   = mod12(thaiAm + 1);
  const cuMon      = mod12(thamLang + 1);
  const thienTuong = mod12(cuMon + 1);
  const thienLuong = mod12(thienTuong + 1);
  const thatSat    = mod12(thienLuong + 1);
  const phaQuan    = mod12(thatSat + 4);

  return {
    'Tử Vi': tv, 'Liêm Trinh': liemTrinh, 'Thiên Đồng': thienDong,
    'Vũ Khúc': vuKhuc, 'Thái Dương': thaiDuong, 'Thiên Cơ': thienCo,
    'Thiên Phủ': tp, 'Thái Âm': thaiAm, 'Tham Lang': thamLang,
    'Cự Môn': cuMon, 'Thiên Tướng': thienTuong, 'Thiên Lương': thienLuong,
    'Thất Sát': thatSat, 'Phá Quân': phaQuan,
  };
}

// ─── VÒNG THÁI TUẾ ──────────────────────────────────────────
const THAI_TUE_SEQ = ['Thái Tuế','Thiếu Dương','Tang Môn','Thiếu Âm','Quan Phù',
  'Tử Phù','Tuế Phá','Long Đức','Bạch Hổ','Phúc Đức','Điếu Khách','Trực Phù'];



const THAI_TUE_NHOM = {
  'Thái Tuế':    1, 'Quan Phù':   1, 'Bạch Hổ':    1,
  'Thiếu Dương': 2, 'Tử Phù':     2, 'Phúc Đức':   2,
  'Tang Môn':    3, 'Tuế Phá':    3, 'Điếu Khách': 3,
  'Thiếu Âm':   4, 'Long Đức':   4, 'Trực Phù':   4,
};

const THAI_TUE_NHOM_Y_NGHIA = {
  1: { ten: 'Nhóm 1 — Thái Tuế · Quan Phù · Bạch Hổ',
       yNghia: 'Người có lý tưởng, tính tình ngay thẳng, đàng hoàng, có tư cách. Dễ thành đạt, làm được việc hợp sở thích. Được người xung quanh yêu chuộng, mến trọng.' },
  2: { ten: 'Nhóm 2 — Thiếu Dương · Tử Phù · Phúc Đức',
       yNghia: 'Sáng suốt nhưng hay cạnh tranh lấn át người khác. Nếu dùng thủ đoạn để thắng thì dù thành công cũng dễ hỏng, thậm chí mắc họa. Có Phúc Đức khuyên nhủ làm việc lành — nếu làm được vậy thì vận mạng yên ổn.' },
  3: { ten: 'Nhóm 3 — Tang Môn · Tuế Phá · Điếu Khách',
       yNghia: 'Xung phá, đối kháng với Thái Tuế. Gặp khó khăn trong việc đạt chí nguyện, thường làm công việc không đúng sở nguyện. Bù lại thông minh, tháo vát, hoạt bát — mạng ở thế đối kháng Thái Tuế thường có Thiên Mã.' },
  4: { ten: 'Nhóm 4 — Thiếu Âm · Long Đức · Trực Phù',
       yNghia: 'Thế của người làm công hoặc phụ thuộc người khác. Thường làm thành công nhưng không được hưởng lợi xứng đáng, dễ bị bạc đãi. Tuy nhiên được hưởng phúc, an lành nhờ Long Đức — một số còn được hưởng cả Lộc Tồn.' },
};


function anThaiTue(chiNam) {
  const start = dcIdx(chiNam);
  const r = {};
  THAI_TUE_SEQ.forEach((s,i) => r[s] = mod12(start+i));
  return r;
}

// ─── VÒNG LỘC TỒN ───────────────────────────────────────────
const LOC_TON_START = {
  'Giáp':'Dần','Ất':'Mão','Bính':'Tỵ','Đinh':'Ngọ',
  'Mậu':'Tỵ','Kỷ':'Ngọ','Canh':'Thân','Tân':'Dậu',
  'Nhâm':'Hợi','Quý':'Tý',
};
const LOC_TON_SEQ = ['Lộc Tồn','Lực Sỹ','Thanh Long','Tiểu Hao','Tướng Quân',
  'Tấu Thư','Phi Liêm','Hỷ Thần','Bệnh Phù','Đại Hao','Phục Binh','Quan Phù'];

function anLocTon(canNam, amDuong, gioitinh) {
  const start = dcIdx(LOC_TON_START[canNam]);
  const thuận = (amDuong==='dương'&&gioitinh==='nam')||(amDuong==='âm'&&gioitinh==='nu');
  const r = {};
  LOC_TON_SEQ.forEach((s,i) => {
    r[s] = thuận ? mod12(start+i) : mod12(start-i);
  });
  return r;
}

// ─── VÒNG TRÀNG SINH ────────────────────────────────────────
const TRANG_SINH_START = {
  'Thủy Nhị Cục':'Thân','Mộc Tam Cục':'Hợi',
  'Kim Tứ Cục':'Tỵ','Thổ Ngũ Cục':'Thân','Hỏa Lục Cục':'Dần',
};
const TRANG_SINH_SEQ = ['Tràng Sinh','Mộc Dục','Quan Đới','Lâm Quan','Đế Vượng',
  'Suy','Bệnh','Tử','Mộ','Tuyệt','Thai','Dưỡng'];

function anTrangSinh(cuc, amDuong, gioitinh) {
  const start = dcIdx(TRANG_SINH_START[cuc]);
  const thuận = (amDuong==='dương'&&gioitinh==='nam')||(amDuong==='âm'&&gioitinh==='nu');
  const r = {};
  TRANG_SINH_SEQ.forEach((s,i) => {
    r[s] = thuận ? mod12(start+i) : mod12(start-i);
  });
  return r;
}

// ─── LỤC SÁT TINH ───────────────────────────────────────────
const HOA_LINH_KHOI = {
  'Tý':{'hoa':'Dần','linh':'Tuất'},'Sửu':{'hoa':'Mão','linh':'Dậu'},
  'Dần':{'hoa':'Sửu','linh':'Mão'},'Mão':{'hoa':'Dần','linh':'Tuất'},
  'Thìn':{'hoa':'Tỵ','linh':'Hợi'},'Tỵ':{'hoa':'Ngọ','linh':'Tý'},
  'Ngọ':{'hoa':'Thân','linh':'Dần'},'Mùi':{'hoa':'Mùi','linh':'Sửu'},
  'Thân':{'hoa':'Tuất','linh':'Thìn'},'Dậu':{'hoa':'Dậu','linh':'Mão'},
  'Tuất':{'hoa':'Hợi','linh':'Tỵ'},'Hợi':{'hoa':'Tý','linh':'Ngọ'},
};

function anLucSat(canNam, chiNam, gioIdx, locTonIdx, amDuong, gioitinh) {
  const thuận = (amDuong==='dương'&&gioitinh==='nam')||(amDuong==='âm'&&gioitinh==='nu');

  // Kình Dương: trước Lộc Tồn 1
  const kinhDuong = mod12(locTonIdx + 1);
  // Đà La: sau Lộc Tồn 1
  const daLa = mod12(locTonIdx - 1);
  // Địa Kiếp: Hợi=Tý, đếm thuận đến giờ
  const diaKiep = mod12(dcIdx('Hợi') + gioIdx);
  // Địa Không: Hợi=Tý, đếm nghịch đến giờ
  const diaKhong = mod12(dcIdx('Hợi') - gioIdx);  // Hợi=Tý đếm nghịch ✅
  // Hỏa Tinh & Linh Tinh từ bảng khởi theo chi năm
  const hoaStart = dcIdx(HOA_LINH_KHOI[chiNam].hoa);
  const linhStart = dcIdx(HOA_LINH_KHOI[chiNam].linh);
  const hoaTinh = thuận ? mod12(hoaStart + gioIdx) : mod12(hoaStart - gioIdx);
  const linhTinh = thuận ? mod12(linhStart - gioIdx) : mod12(linhStart + gioIdx);

  return { 'Kình Dương':kinhDuong,'Đà La':daLa,'Địa Kiếp':diaKiep,
           'Địa Không':diaKhong,'Hỏa Tinh':hoaTinh,'Linh Tinh':linhTinh };
}

// ─── PHỤ TINH ────────────────────────────────────────────────
function anPhuTinh(canNam, chiNam, thangAL, ngayAL, gioIdx, locTonIdx) {
  // Tả Phụ: Thìn=T1, thuận đến tháng
  const taPhu = mod12(dcIdx('Thìn') + thangAL - 1);
  // Hữu Bật: Tuất=T1, nghịch đến tháng
  const huuBat = mod12(dcIdx('Tuất') - thangAL + 1);
  // Văn Xương: Tuất=Tý, nghịch đến giờ
  const vanXuong = mod12(dcIdx('Tuất') - gioIdx);
  // Văn Khúc: Thìn=Tý, thuận đến giờ
  const vanKhuc = mod12(dcIdx('Thìn') + gioIdx);
  // Long Trì: Thìn=Tý, thuận đến năm (chi năm)
  const chiNamIdx = dcIdx(chiNam);
  const longTri = mod12(dcIdx('Thìn') + chiNamIdx);
  // Phượng Các: Tuất=Tý, nghịch đến năm
  const phuongCac = mod12(dcIdx('Tuất') - chiNamIdx);
  // Thiên Khốc: Ngọ=Tý, nghịch
  const thienKhoc = mod12(dcIdx('Ngọ') - chiNamIdx);
  // Thiên Hư: Ngọ=Tý, thuận
  const thienHu = mod12(dcIdx('Ngọ') + chiNamIdx);
  // Tam Thai: từ Tả Phụ + ngày
  const tamThai = mod12(taPhu + ngayAL - 1);
  // Bát Tọa: từ Hữu Bật - ngày
  const batToa = mod12(huuBat - ngayAL + 1);
  // Ân Quang: từ Văn Xương + ngày - 1
  const anQuang = mod12(vanXuong + ngayAL - 2);  // Văn Xương=ngày1, thuận tới ngày, -1
  // Thiên Quý: Văn Khúc=ngày1, nghịch tới ngày, +1
  const THIEN_QUY_MAP = {'Thân':'Thìn','Tý':'Thìn','Thìn':'Thìn','Dần':'Tuất','Ngọ':'Tuất','Tuất':'Tuất','Tỵ':'Sửu','Dậu':'Sửu','Sửu':'Sửu','Hợi':'Mùi','Mão':'Mùi','Mùi':'Mùi'};
  const thienQuy = mod12(vanKhuc - ngayAL + 2);  // Văn Khúc=ngày1, nghịch tới ngày, +1

  // Thiên Khôi & Thiên Việt
  const KHOI = {'Giáp':'Sửu','Ất':'Tý','Bính':'Hợi','Đinh':'Hợi','Mậu':'Sửu','Kỷ':'Tý','Canh':'Ngọ','Tân':'Ngọ','Nhâm':'Mão','Quý':'Mão'};
  const VIET = {'Giáp':'Mùi','Ất':'Thân','Bính':'Dậu','Đinh':'Dậu','Mậu':'Mùi','Kỷ':'Thân','Canh':'Dần','Tân':'Dần','Nhâm':'Tỵ','Quý':'Tỵ'};
  const thienKhoi = dcIdx(KHOI[canNam]);
  const thienViet = dcIdx(VIET[canNam]);

  // Đào Hoa
  const DAO_HOA = {'Tý':'Dậu','Ngọ':'Mão','Mão':'Tý','Dậu':'Ngọ','Dần':'Mão','Thân':'Dậu','Tỵ':'Ngọ','Hợi':'Tý','Thìn':'Sửu','Tuất':'Mùi','Sửu':'Tuất','Mùi':'Thìn'};
  const daoHoa = dcIdx(DAO_HOA[chiNam] || 'Tý');

  // Thiên Mã
  const THIEN_MA = {'Dần':'Thân','Ngọ':'Thân','Tuất':'Thân','Thân':'Dần','Tý':'Dần','Thìn':'Dần','Hợi':'Tỵ','Mão':'Tỵ','Mùi':'Tỵ','Tỵ':'Hợi','Dậu':'Hợi','Sửu':'Hợi'};
  const thienMa = dcIdx(THIEN_MA[chiNam] || 'Tý');

  // Kiếp Sát
  const KIEP_SAT = {'Tỵ':'Dần','Dậu':'Dần','Sửu':'Dần','Dần':'Hợi','Ngọ':'Hợi','Tuất':'Hợi','Hợi':'Thân','Mão':'Thân','Mùi':'Thân','Thân':'Tỵ','Tý':'Tỵ','Thìn':'Tỵ'};
  const kiepSat = dcIdx(KIEP_SAT[chiNam] || 'Tý');

  // Phá Toái
  const PHA_TOAI = {'Tý':'Tỵ','Ngọ':'Tỵ','Mão':'Tỵ','Dậu':'Tỵ','Dần':'Dậu','Thân':'Dậu','Tỵ':'Dậu','Hợi':'Dậu','Thìn':'Sửu','Tuất':'Sửu','Sửu':'Sửu','Mùi':'Sửu'};
  const phaToai = dcIdx(PHA_TOAI[chiNam] || 'Tý');

  // Hoa Cái
  const HOA_CAI = {'Tý':'Thìn','Ngọ':'Thìn','Mão':'Mùi','Dậu':'Mùi','Dần':'Tuất','Thân':'Tuất','Tỵ':'Sửu','Hợi':'Sửu','Thìn':'Thìn','Tuất':'Thìn','Sửu':'Mùi','Mùi':'Mùi'};
  const hoaCai = dcIdx(HOA_CAI[chiNam] || 'Tý');

  // Lưu Hà
  const LUU_HA = {'Giáp':'Dậu','Ất':'Tuất','Bính':'Mùi','Đinh':'Thân','Mậu':'Tỵ','Kỷ':'Ngọ','Canh':'Thìn','Tân':'Mão','Nhâm':'Tý','Quý':'Hợi'};
  const luuHa = dcIdx(LUU_HA[canNam] || 'Tý');

  // Thiên Trù
  const THIEN_TRU = {'Giáp':'Tỵ','Ất':'Ngọ','Bính':'Mùi','Đinh':'Thân','Mậu':'Dậu','Kỷ':'Tuất','Canh':'Hợi','Tân':'Tý','Nhâm':'Sửu','Quý':'Dần'};
  const thienTru = dcIdx(THIEN_TRU[canNam] || 'Tý');


  // ── Bổ sung sao theo chi năm ──
  const THIEN_DUC    = {'Tý':'Dậu','Sửu':'Tuất','Dần':'Hợi','Mão':'Tý','Thìn':'Sửu','Tỵ':'Dần','Ngọ':'Mão','Mùi':'Thìn','Thân':'Tỵ','Dậu':'Ngọ','Tuất':'Mùi','Hợi':'Thân'};
  const NGUYET_DUC   = {'Tý':'Tỵ','Sửu':'Ngọ','Dần':'Mùi','Mão':'Thân','Thìn':'Dậu','Tỵ':'Tuất','Ngọ':'Hợi','Mùi':'Tý','Thân':'Sửu','Dậu':'Dần','Tuất':'Mão','Hợi':'Thìn'};
  const HONG_LOAN    = {'Tý':'Mão','Sửu':'Dần','Dần':'Sửu','Mão':'Tý','Thìn':'Hợi','Tỵ':'Tuất','Ngọ':'Dậu','Mùi':'Thân','Thân':'Mùi','Dậu':'Ngọ','Tuất':'Tỵ','Hợi':'Thìn'};
  const THIEN_HY     = {'Tý':'Dậu','Sửu':'Thân','Dần':'Mùi','Mão':'Ngọ','Thìn':'Tỵ','Tỵ':'Thìn','Ngọ':'Mão','Mùi':'Dần','Thân':'Sửu','Dậu':'Tý','Tuất':'Hợi','Hợi':'Tuất'};
  const CO_THAN      = {'Tý':'Dần','Sửu':'Dần','Dần':'Tỵ','Mão':'Tỵ','Thìn':'Tỵ','Tỵ':'Thân','Ngọ':'Thân','Mùi':'Thân','Thân':'Hợi','Dậu':'Hợi','Tuất':'Hợi','Hợi':'Dần'};
  const QUA_TU       = {'Tý':'Tuất','Sửu':'Tuất','Dần':'Sửu','Mão':'Sửu','Thìn':'Sửu','Tỵ':'Thìn','Ngọ':'Thìn','Mùi':'Thìn','Thân':'Mùi','Dậu':'Mùi','Tuất':'Mùi','Hợi':'Tuất'};

  const thienDuc   = dcIdx(THIEN_DUC[chiNam]   || 'Tý');
  const nguyetDuc  = dcIdx(NGUYET_DUC[chiNam]  || 'Tý');
  const hongLoan   = mod12(dcIdx('Mão') - dcIdx(chiNam));  // Mão=Tý đếm nghịch tới chi năm
  const thienHy    = mod12(hongLoan + 6);  // xung chiếu Hồng Loan
  const coThan     = dcIdx(CO_THAN[chiNam]     || 'Tý');
  const quaTu      = dcIdx(QUA_TU[chiNam]      || 'Tý');

  // ── Bổ sung sao theo can năm ──
  const THIEN_QUAN = {'Giáp':'Mùi','Ất':'Mùi','Bính':'Thìn','Đinh':'Dần','Mậu':'Mão','Kỷ':'Dậu','Canh':'Hợi','Tân':'Dậu','Nhâm':'Tuất','Quý':'Ngọ'};
  const THIEN_PHUC = {'Giáp':'Dậu','Ất':'Dậu','Bính':'Thân','Đinh':'Hợi','Mậu':'Mão','Kỷ':'Dần','Canh':'Ngọ','Tân':'Tỵ','Nhâm':'Ngọ','Quý':'Tỵ'};
  const thienQuan  = dcIdx(THIEN_QUAN[canNam] || 'Tý');
  const thienPhuc  = dcIdx(THIEN_PHUC[canNam] || 'Tý');
  const thienKhong = mod12(dcIdx('Hợi') + dcIdx(chiNam));  // Hợi=Tý đếm thuận tới năm sinh

  // ── Sao theo cung Mệnh/Thân ──
  // Thiên Tài: xung chiếu với cung Mệnh (menhIdx)
  // Thiên Thọ: xung chiếu với cung Thân (thanIdx)
  // Cần menhIdx và thanIdx — truyền vào qua params
  // Tạm tính từ thangAL và gioIdx
  const _menhIdx = dinhCungMenh(thangAL, gioIdx);
  const _thanIdx = dinhCungThan(thangAL, gioIdx);
  const thienTai   = mod12(_menhIdx + dcIdx(chiNam));  // Mệnh=Tý đếm thuận tới chi năm
  const thienTho   = mod12(_thanIdx + dcIdx(chiNam));  // Thân=Tý đếm thuận tới chi năm
  const thienThuong = mod12(_menhIdx + 5);  // cố định tại cung Nô Bộc
  const thienSu    = mod12(_menhIdx + 7);  // cố định tại cung Tật Ách
  // Đẩu Quân: từ Thái Tuế=T1 đếm nghịch tới tháng → từ đó=Tý đếm thuận tới giờ
  const _thaiTueIdx = dcIdx(chiNam);  // Thái Tuế tại cung trùng chi năm
  const _dauQuanBase = mod12(_thaiTueIdx - (thangAL - 1));
  const dauQuan      = mod12(_dauQuanBase + gioIdx);
  const luuNienVanTinh = mod12(locTonIdx + 3);  // cách Lộc Tồn 3 cung về phía trước

  // ── Sao theo tháng ──
  const thienGiai  = mod12(dcIdx('Thân') + thangAL - 1);  // Thân=T1 thuận
  const diaGiai = mod12(dcIdx('Mùi') + thangAL - 1);  // Mùi=T1 đếm thuận tới tháng
  const thienHinh  = mod12(dcIdx('Dậu') + thangAL - 1);   // Dậu=T1 thuận
  const thienRieu  = mod12(dcIdx('Sửu') + thangAL - 1);  // Sửu=T1 đếm thuận tới tháng
  const thienY     = mod12(dcIdx('Sửu') + thangAL - 1);  // Sửu=T1 thuận, đồng cung Thiên Riêu
  const thaiPhu = mod12(dcIdx('Ngọ') + gioIdx);  // Ngọ=Tý đếm thuận tới giờ
  const phongCao   = mod12(dcIdx('Dần') + gioIdx);  // Dần=Tý đếm thuận tới giờ

  // ── Sao theo Lộc Tồn ──
  const giaiThan = phuongCac;  // đồng cung Phượng Các
  const QUOC_AN_MAP = {'Thân':'Tuất','Tý':'Tuất','Thìn':'Tuất','Dần':'Thìn','Ngọ':'Thìn','Tuất':'Thìn','Tỵ':'Mùi','Dậu':'Mùi','Sửu':'Mùi','Hợi':'Sửu','Mão':'Sửu','Mùi':'Sửu'};
  const quocAn     = dcIdx(QUOC_AN_MAP[chiNam] || 'Tuất');
  const duongPhu = mod12(locTonIdx - 7);  // Lộc Tồn=T1, đếm nghịch tới T8
  const bacSy    = locTonIdx;             // Bác Sỹ = cùng cung Lộc Tồn

  // ── Sao cố định ──
  const thienLa    = dcIdx('Thìn');  // cố định tại Thìn
  const diaVong    = dcIdx('Tuất');  // cố định tại Tuất

  return {
    'Tả Phụ':taPhu,'Hữu Bật':huuBat,'Văn Xương':vanXuong,'Văn Khúc':vanKhuc,
    'Long Trì':longTri,'Phượng Các':phuongCac,'Thiên Khốc':thienKhoc,'Thiên Hư':thienHu,
    'Tam Thai':tamThai,'Bát Tọa':batToa,'Ân Quang':anQuang,'Thiên Quý':thienQuy,
    'Thiên Khôi':thienKhoi,'Thiên Việt':thienViet,'Đào Hoa':daoHoa,
    'Thiên Mã':thienMa,'Kiếp Sát':kiepSat,'Phá Toái':phaToai,'Hoa Cái':hoaCai,
    'Lưu Hà':luuHa,'Thiên Trù':thienTru,
    'Thiên Đức':thienDuc,'Nguyệt Đức':nguyetDuc,'Hồng Loan':hongLoan,'Thiên Hỷ':thienHy,
    'Cô Thần':coThan,'Quả Tú':quaTu,
    'Thiên Quan':thienQuan,'Thiên Phúc':thienPhuc,'Thiên Không':thienKhong,'Thiên Thương':thienThuong,'Thiên Sứ':thienSu,'Đẩu Quân':dauQuan,'Lưu Niên Văn Tinh':luuNienVanTinh,
    'Thiên Tài':thienTai,'Thiên Thọ':thienTho,
    'Thiên Giải':thienGiai,'Địa Giải':diaGiai,'Giải Thần':giaiThan,
    'Thiên Hình':thienHinh,'Thiên Riêu':thienRieu,'Thiên Y':thienY,
    'Thai Phụ':thaiPhu,'Phong Cáo':phongCao,
    'Quốc Ấn':quocAn,'Đường Phù':duongPhu,'Bác Sỹ':bacSy,
    'Thiên La':thienLa,'Địa Võng':diaVong,
  };
}

// ─── TỨ HÓA ─────────────────────────────────────────────────
const TU_HOA = {
  'Giáp': {'Lộc':'Liêm Trinh','Quyền':'Phá Quân','Khoa':'Vũ Khúc','Kỵ':'Thái Dương'},
  'Ất':   {'Lộc':'Thiên Cơ','Quyền':'Thiên Lương','Khoa':'Tử Vi','Kỵ':'Thái Âm'},
  'Bính': {'Lộc':'Thiên Đồng','Quyền':'Thiên Cơ','Khoa':'Văn Xương','Kỵ':'Liêm Trinh'},
  'Đinh': {'Lộc':'Thái Âm','Quyền':'Thiên Đồng','Khoa':'Thiên Cơ','Kỵ':'Cự Môn'},
  'Mậu': {'Lộc':'Tham Lang','Quyền':'Thái Âm','Khoa':'Hữu Bật','Kỵ':'Thiên Cơ'},
  'Kỷ':  {'Lộc':'Vũ Khúc','Quyền':'Tham Lang','Khoa':'Thiên Lương','Kỵ':'Văn Khúc'},
  'Canh': {'Lộc':'Thái Dương','Quyền':'Vũ Khúc','Khoa':'Thái Âm','Kỵ':'Thiên Đồng'},
  'Tân': {'Lộc':'Cự Môn','Quyền':'Thái Dương','Khoa':'Văn Khúc','Kỵ':'Văn Xương'},
  'Nhâm': {'Lộc':'Thiên Lương','Quyền':'Tử Vi','Khoa':'Tả Phụ','Kỵ':'Vũ Khúc'},
  'Quý': {'Lộc':'Phá Quân','Quyền':'Cự Môn','Khoa':'Thái Âm','Kỵ':'Tham Lang'},
};

// ─── TUẦN & TRIỆT ────────────────────────────────────────────
const TUAN_BANG = {
  'Giáp Tý':['Tuất','Hợi'],'Giáp Tuất':['Thân','Dậu'],'Giáp Thân':['Ngọ','Mùi'],
  'Giáp Ngọ':['Thìn','Tỵ'],'Giáp Thìn':['Dần','Mão'],'Giáp Dần':['Tý','Sửu'],
};
const TRIET_BANG = {
  'Giáp':['Thân','Dậu'],'Ất':['Ngọ','Mùi'],'Bính':['Thìn','Tỵ'],
  'Đinh':['Dần','Mão'],'Mậu':['Tý','Sửu'],'Kỷ':['Thân','Dậu'],
  'Canh':['Ngọ','Mùi'],'Tân':['Thìn','Tỵ'],'Nhâm':['Dần','Mão'],'Quý':['Tý','Sửu'],
};

function getTuanTriet(canChi, canNam) {
  // Tìm tuần
  let tuan = null;
  for (const [key, val] of Object.entries(TUAN_BANG)) {
    const canTuan = key.split(' ')[0];
    const chiList = DIA_CHI.slice(DIA_CHI.indexOf(key.split(' ')[1]));
    if (canChi.includes(key.split(' ')[1]) || true) {
      // Đơn giản: tìm nhóm 10 năm chứa can chi năm sinh
      const chiNam = canChi.split(' ')[1];
      const tuanChi = key.split(' ')[1];
      const tuanIdx = dcIdx(tuanChi);
      const chiNamIdx = dcIdx(chiNam);
      const diff = mod12(chiNamIdx - tuanIdx);
      const canDiff = THIEN_CAN.indexOf(canChi.split(' ')[0]) - THIEN_CAN.indexOf(canTuan);
      if (diff < 10 && diff >= 0 && ((canDiff % 10 + 10) % 10) === diff % 10) {
        tuan = val.map(dcIdx);
        break;
      }
    }
  }
  const triet = (TRIET_BANG[canNam] || []).map(dcIdx);
  return { tuan: tuan || [], triet };
}

// ─── ĐẠI VẬN ─────────────────────────────────────────────────
function tinhDaiVan(menhIdx, cuc, amDuong, gioitinh) {
  const cucSo = {'Thủy Nhị Cục':2,'Mộc Tam Cục':3,'Kim Tứ Cục':4,'Thổ Ngũ Cục':5,'Hỏa Lục Cục':6}[cuc];
  const thuận = (amDuong==='dương'&&gioitinh==='nam')||(amDuong==='âm'&&gioitinh==='nu');
  const vans = [];
  for (let i = 0; i < 12; i++) {
    const cungIdx = thuận ? mod12(menhIdx + i) : mod12(menhIdx - i);
    const tuoiStart = i === 0 ? cucSo : vans[i-1].tuoiEnd + 1;
    const tuoiEnd = tuoiStart + 9;
    vans.push({ cungIdx, diaChi: DIA_CHI[cungIdx], tuoiStart, tuoiEnd });
  }
  return vans;
}

// ─── TIỂU HẠN ────────────────────────────────────────────────
// Lưu niên tiểu vận
const TIEU_HAN_KHOI = {
  'nam': {'Tý':'Tuất','Sửu':'Dậu','Dần':'Thân','Mão':'Mùi','Thìn':'Ngọ','Tỵ':'Tỵ',
          'Ngọ':'Thìn','Mùi':'Mão','Thân':'Dần','Dậu':'Sửu','Tuất':'Tý','Hợi':'Hợi'},
  'nu':  {'Tý':'Thìn','Sửu':'Tỵ','Dần':'Ngọ','Mão':'Mùi','Thìn':'Thân','Tỵ':'Dậu',
          'Ngọ':'Tuất','Mùi':'Hợi','Thân':'Tý','Dậu':'Sửu','Tuất':'Dần','Hợi':'Mão'},
};

function tinhTieuHan(chiNamSinh, gioitinh, tuoiXem) {
  // Cung khởi = tuổi 1, đếm thuận (nam) / nghịch (nữ) theo tuổi
  const startDC = TIEU_HAN_KHOI[gioitinh][chiNamSinh];
  const startIdx = dcIdx(startDC);
  const offset = (tuoiXem - 1) % 12;
  return gioitinh === 'nam' ? mod12(startIdx + offset) : mod12(startIdx - offset);
}

// Lưu đại hạn
// ageIndex = tuổi đang xem - tuổi bắt đầu đại vận (0-based, 0..9)
// Pattern Dương Nam / Âm Nữ: self, xung, xung-1, xung, xung+1, +2, +3, +4, +5, +6
// Pattern Âm Nam / Dương Nữ: self, xung, xung+1, xung, xung-1, -2, -3, -4, -5, -6
function tinhLuuDaiHan(daiVanCungIdx, ageIndex, amDuong, gioitinh) {
  const s = daiVanCungIdx;        // self
  const x = mod12(s + 6);         // xung chiếu
  const duongNam_amNu = (amDuong === 'dương' && gioitinh === 'nam') ||
                        (amDuong === 'âm'    && gioitinh === 'nu');
  if (duongNam_amNu) {
    // self, xung, xung-1, xung, xung+1, xung+2, xung+3, xung+4, xung+5, xung+6
    const map = [s, x, mod12(x-1), x, mod12(x+1), mod12(x+2), mod12(x+3), mod12(x+4), mod12(x+5), mod12(x+6)];
    return map[ageIndex] ?? s;
  } else {
    // self, xung, xung+1, xung, xung-1, xung-2, xung-3, xung-4, xung-5, xung-6
    const map = [s, x, mod12(x+1), x, mod12(x-1), mod12(x-2), mod12(x-3), mod12(x-4), mod12(x-5), mod12(x-6)];
    return map[ageIndex] ?? s;
  }
}


// ─── CÁCH CỤC ENGINE ─────────────────────────────────────────
// Rule-based analysis chạy sau anSaoLaSo()
// Trả về array các nhận định để feed cho Claude

// ── Helper functions ──────────────────────────────────────────

function hasSao(palace, tenSao) {
  if (!palace) return false;
  return palace.stars.some(s => s.ten === tenSao);
}

function hasHoa(palace, loaiHoa) {
  // loaiHoa: 'Lộc', 'Quyền', 'Khoa', 'Kỵ' (viết hoa đúng theo s.hoa field)
  if (!palace) return false;
  return palace.stars.some(s => s.hoa === loaiHoa);
}

function hasHoaInTuChinh(palace) {
  // Check Hóa Lộc, Khoa, Quyền trong palace và tamHopCungs + xung chiếu
  const all = [palace, ...(palace?.tamHopCungs||[]), palace?.xungChieuCung].filter(Boolean);
  return {
    loc:    all.some(p => hasHoa(p, 'Lộc')),
    quyen:  all.some(p => hasHoa(p, 'Quyền')),
    khoa:   all.some(p => hasHoa(p, 'Khoa')),
    ky:     all.some(p => hasHoa(p, 'Kỵ')),
    locTon: all.some(p => hasSao(p, 'Lộc Tồn')),
  };
}

function hasSaoNhom(palace, nhom) {
  if (!palace) return false;
  return palace.stars.some(s => s.nhom === nhom);
}

function getSaoChinh(palace) {
  if (!palace) return [];
  return palace.majorStars.map(s => s.ten);
}

function getSaoAll(palace) {
  if (!palace) return [];
  return palace.stars.map(s => s.ten);
}

function getBrightness(palace, tenSao) {
  if (!palace) return '';
  const s = palace.stars.find(s => s.ten === tenSao);
  return s?.brightness || '';
}

function isSangSua(palace, tenSao) {
  // Sáng sủa = Miếu hoặc Vượng hoặc Đắc
  const b = getBrightness(palace, tenSao);
  return ['Miếu','Vượng','Đắc'].includes(b);
}

function isMoAm(palace, tenSao) {
  return getBrightness(palace, tenSao) === 'Hãm';
}

function hasTuan(palace) {
  return palace?.stars.some(s => s.nhom === 'tuan_triet' && s.ten === 'Tuần');
}

function hasTriet(palace) {
  return palace?.stars.some(s => s.nhom === 'tuan_triet' && s.ten === 'Triệt');
}

function hasTuanOrTriet(palace) {
  return hasTuan(palace) || hasTriet(palace);
}

function isVoChinhDieu(palace) {
  return !palace || palace.majorStars.length === 0;
}

function getPalace(ls, cungName) {
  return ls.palaces.find(p => p.cungName === cungName);
}

function getMenh(ls) { return ls.palaces.find(p => p.isMenh); }
function getThan(ls)  { return ls.palaces.find(p => p.isThan); }

// Sat tinh & Bai tinh sets
const SAT_TINH = new Set(['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp']);
const BAI_TINH = new Set(['Kiếp Sát','Phá Toái','Đại Hao','Tiểu Hao','Bệnh Phù','Phục Binh',
  'Quan Phù','Thiên Hình','Thiên Riêu','Thiên Khốc','Thiên Hư']);
const VAN_TINH = new Set(['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phụ','Hữu Bật',
  'Long Trì','Phượng Các']);
const TAM_KHONG = new Set(['Địa Không','Địa Kiếp','Tuần','Triệt']);

function countSatTinh(palace) {
  return palace?.stars.filter(s => SAT_TINH.has(s.ten)).length || 0;
}

function hasSatTinh(palace) { return countSatTinh(palace) > 0; }

function hasSatTinhSangSua(palace) {
  return palace?.stars.some(s => SAT_TINH.has(s.ten) && isSangSua(palace, s.ten));
}

function isAmDuong(diaChi) {
  // Dương: Tý Dần Thìn Ngọ Thân Tuất (chẵn trong DIA_CHI)
  const DUONG_DC = new Set(['Tý','Dần','Thìn','Ngọ','Thân','Tuất']);
  return DUONG_DC.has(diaChi) ? 'dương' : 'âm';
}

function isGiapCung(ls, cungName, sao1, sao2) {
  // Kiểm tra sao1 và sao2 giáp 2 bên cungName
  const p = getPalace(ls, cungName);
  if (!p) return false;
  const DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const idx = DIA_CHI.indexOf(p.diaChi);
  const left  = ls.palaces.find(x => x.diaChi === DIA_CHI[(idx+11)%12]);
  const right = ls.palaces.find(x => x.diaChi === DIA_CHI[(idx+1)%12]);
  return (hasSao(left,sao1) && hasSao(right,sao2)) ||
         (hasSao(left,sao2) && hasSao(right,sao1));
}

function getNhiHop(ls, diaChi) {
  // Nhị hợp: Tý-Sửu, Dần-Hợi, Mão-Tuất, Thìn-Dậu, Tỵ-Thân, Ngọ-Mùi
  const NHI_HOP = {
    'Tý':'Sửu','Sửu':'Tý','Dần':'Hợi','Hợi':'Dần','Mão':'Tuất','Tuất':'Mão',
    'Thìn':'Dậu','Dậu':'Thìn','Tỵ':'Thân','Thân':'Tỵ','Ngọ':'Mùi','Mùi':'Ngọ'
  };
  const dc2 = NHI_HOP[diaChi];
  return dc2 ? ls.palaces.find(p => p.diaChi === dc2) : null;
}

// ── MAIN FUNCTION ─────────────────────────────────────────────

function phanTichCachCuc(ls, gioitinh) {
  const results = [];
  const add = (loai, ten, moTa, chiTiet, cung='') => results.push({ loai, ten, moTa, chiTiet, cung });

  const menh = getMenh(ls);
  const menhDC = ls.menhDC;
  const thanDC = ls.thanDC;
  const napAmHanh = ls.napAmHanh;

  const p_menh    = getPalace(ls, 'Mệnh');
  // p_than: dùng thanDC để tìm đúng cung Thân (không dùng isThan vì chỉ set khi Mệnh=Thân)
  const p_than    = ls.palaces.find(p => p.diaChi === thanDC) || null;
  const p_quan    = getPalace(ls, 'Quan Lộc');
  const p_tai     = getPalace(ls, 'Tài Bạch');
  const p_dien    = getPalace(ls, 'Điền Trạch');
  const p_phuc    = getPalace(ls, 'Phúc Đức');
  const p_phu     = getPalace(ls, 'Phụ Mẫu');
  const p_huynh   = getPalace(ls, 'Huynh Đệ');
  const p_phuThe  = getPalace(ls, 'Phu Thê');
  const p_tuTuc   = getPalace(ls, 'Tử Tức');
  const p_tat     = getPalace(ls, 'Tật Ách');
  const p_thienDi = getPalace(ls, 'Thiên Di');
  const p_no      = getPalace(ls, 'Nô Bộc');

  // ═══════════════════════════════════════════════
  // 1. NHẬN ĐỊNH CƠ BẢN CUNG MỆNH / THÂN
  // ═══════════════════════════════════════════════

  // Thuận/Nghịch lý (Âm Dương cư vị)
  const menhAmDuong = isAmDuong(menhDC);
  const namSinhAmDuong = ls.amDuong; // âm/dương của năm sinh
  if (namSinhAmDuong === menhAmDuong) {
    add('menh_co_ban','Thuận Lý — Dương cư Dương vị / Âm cư Âm vị',
      'Năm sinh và cung Mệnh cùng âm dương → thuận lý, độ số gia tăng.',
      `Năm sinh ${namSinhAmDuong}, cung Mệnh ${menhDC} cũng ${menhAmDuong}.`, 'Mệnh');
  } else {
    add('menh_co_ban','Nghịch Lý — Dương cư Âm vị / Âm cư Dương vị',
      'Năm sinh và cung Mệnh trái âm dương → nghịch lý, độ số giảm thiểu.',
      `Năm sinh ${namSinhAmDuong}, cung Mệnh ${menhDC} lại ${menhAmDuong}.`, 'Mệnh');
  }

  // Sinh/Vượng/Bại/Tuyệt địa
  const SINH_VUONG_BAI_TUYET = {
    'Kim':  { sinh:'Tỵ', vuong:'Dậu', bai:'Ngọ', tuyet:'Dần' },
    'Mộc':  { sinh:'Hợi', vuong:'Mão', bai:'Tý', tuyet:'Thân' },
    'Hỏa':  { sinh:'Dần', vuong:'Ngọ', bai:'Mão', tuyet:'Hợi' },
    'Thủy': { sinh:'Thân', vuong:'Tý', bai:'Dậu', tuyet:'Tỵ' },
    'Thổ':  { sinh:'Thân', vuong:'Tý', bai:'Dậu', tuyet:'Tỵ' },
  };
  const svbt = SINH_VUONG_BAI_TUYET[napAmHanh];
  if (svbt) {
    if (menhDC === svbt.sinh) {
      add('menh_co_ban','Sinh Địa',
        `Cung Mệnh là Sinh địa của bản mệnh → rất tốt, phát triển bền vững.`,
        `Mệnh ${napAmHanh} tại ${menhDC} = Sinh địa.`, 'Mệnh');
    } else if (menhDC === svbt.vuong) {
      add('menh_co_ban','Vượng Địa',
        `Cung Mệnh là Vượng địa của bản mệnh → được nhiều lợi ích.`,
        `Mệnh ${napAmHanh} tại ${menhDC} = Vượng địa.`, 'Mệnh');
    } else if (menhDC === svbt.bai) {
      add('menh_co_ban','Bại Địa',
        `Cung Mệnh là Bại địa → dù gặp vận tốt cũng chẳng bền lâu, như hoa sớm nở tối tàn.`,
        `Mệnh ${napAmHanh} tại ${menhDC} = Bại địa.`, 'Mệnh');
    } else if (menhDC === svbt.tuyet) {
      // Kiểm tra có chính tinh sinh được bản mệnh không (Tuyệt xứ phùng sinh)
      const NGU_HANH_SINH = {'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc'};
      const STAR_HANH = {
        'Tử Vi':'Thổ','Thiên Cơ':'Mộc','Thái Dương':'Hỏa','Vũ Khúc':'Kim',
        'Thiên Đồng':'Thủy','Liêm Trinh':'Hỏa','Thiên Phủ':'Thổ','Thái Âm':'Thủy',
        'Tham Lang':'Mộc','Cự Môn':'Thủy','Thiên Tướng':'Thủy','Thiên Lương':'Thổ',
        'Thất Sát':'Kim','Phá Quân':'Thủy',
      };
      const cinhTinhCuuGiai = getSaoChinh(p_menh).find(s => {
        const starHanh = STAR_HANH[s];
        return starHanh && NGU_HANH_SINH[starHanh] === napAmHanh;
      });
      if (cinhTinhCuuGiai) {
        add('menh_co_ban','Tuyệt Xứ Phùng Sinh',
          `Cung Mệnh là Tuyệt địa nhưng có chính tinh sinh được bản mệnh → như cành hoa tuy mong manh nhưng lâu tàn, không đáng lo ngại nhiều.`,
          `Mệnh ${napAmHanh} tại ${menhDC} (Tuyệt địa), được ${cinhTinhCuuGiai} cứu giải.`, 'Mệnh');
      } else {
        const hoaKhoa = hasSao(p_menh,'Hóa Khoa')||hasSao(p_menh,'Hóa Quyền')||hasSao(p_menh,'Hóa Lộc');
        add('menh_co_ban','Tuyệt Địa',
          `Cung Mệnh là Tuyệt địa → rất đáng lo ngại. Cần chính tinh sáng sủa hoặc Hóa Khoa/Quyền/Lộc cứu giải.`,
          `Mệnh ${napAmHanh} tại ${menhDC} = Tuyệt địa. ${hoaKhoa?'Có Hóa tinh cứu giải phần nào.':'Chưa có cứu giải.'}`, 'Mệnh');
      }
    }
  }

  // Vô chính diệu
  if (isVoChinhDieu(p_menh)) {
    const coTuanTriet = hasTuanOrTriet(p_menh);
    const coDiaKhong = hasSao(p_menh,'Địa Không') || hasSao(p_menh,'Thiên Không');
    add('menh_co_ban','Mệnh Vô Chính Diệu',
      'Cung Mệnh không có chính tinh tọa thủ. Người rất khôn ngoan sắc sảo, thường hay đau yếu sức khỏe suy kém lúc thiếu thời, dễ phiêu bạt vô sở định.',
      `${coTuanTriet?'Có Tuần/Triệt án ngữ cứu giải.':'Cần Tuần/Triệt hoặc nhiều chính tinh sáng sủa hội chiếu.'} ${coDiaKhong?'Có Địa Không/Thiên Không hội hợp.':''}`, 'Mệnh');
  }

  // Mệnh Thân đồng cung
  if (menhDC === thanDC) {
    const TU_MO = new Set(['Thìn','Tuất','Sửu','Mùi']);
    const voChinhDieu = isVoChinhDieu(p_menh);
    if (TU_MO.has(menhDC) && voChinhDieu) {
      add('menh_co_ban','Mệnh Thân Đồng Cung — Tứ Mộ Vô Chính Diệu',
        'Mệnh Thân đồng cung tại Tứ Mộ vô chính diệu → cùng khổ và giảm thọ. Cần Tuần/Triệt án ngữ hoặc sao sáng sủa cứu giải.',
        `Mệnh Thân tại ${menhDC}.`, 'Mệnh');
    } else if ((menhDC==='Tý'||menhDC==='Ngọ') && voChinhDieu) {
      const hoaLoc = hasSao(p_menh,'Hóa Lộc');
      add('menh_co_ban','Mệnh Thân Đồng Cung — Tý/Ngọ Vô Chính Diệu',
        hoaLoc ? 'Mệnh Thân đồng cung tại Tý/Ngọ vô chính diệu, có Hóa Lộc → giàu nhưng giảm thọ.'
                : 'Mệnh Thân đồng cung tại Tý/Ngọ vô chính diệu → cần đề phòng nghèo khổ hoặc chết non nếu nhiều sát tinh hội hợp.',
        `Mệnh Thân tại ${menhDC}.`, 'Mệnh');
    } else {
      add('menh_co_ban','Mệnh Thân Đồng Cung',
        'Mệnh và Thân đồng cung → cần xem xét kỹ tổng thể sao hội hợp.',
        `Mệnh Thân tại ${menhDC}.`, 'Mệnh');
    }
  }

  // Mệnh Tuần Thân Triệt / Mệnh Triệt Thân Tuần
  const menhTuan = hasTuan(p_menh), menhTriet = hasTriet(p_menh);
  const thanTuan = hasTuan(p_than), thanTriet = hasTriet(p_than);
  if (menhTuan && thanTriet) {
    add('menh_co_ban','Mệnh Tuần Thân Triệt',
      'Cần Cơ/Nguyệt/Đồng/Lương sáng sủa hội hợp mới xứng ý toại lòng. Về già mới có danh giá an nhàn.',
      'Mệnh có Tuần, Thân có Triệt án ngữ.', 'Mệnh');
  }
  if (menhTriet && thanTuan) {
    add('menh_co_ban','Mệnh Triệt Thân Tuần',
      'Cung Mệnh và Thân cần vô chính diệu mới được xứng ý toại lòng, tăng thọ và về già sung sướng.',
      'Mệnh có Triệt, Thân có Tuần án ngữ.', 'Mệnh');
  }

  // Mệnh Không Thân Kiếp / Mệnh Kiếp Thân Không
  const menhKhong = hasSao(p_menh,'Địa Không');
  const menhKiep  = hasSao(p_menh,'Địa Kiếp');
  const thanKhong = hasSao(p_than,'Địa Không');
  const thanKiep  = hasSao(p_than,'Địa Kiếp');
  if (menhKhong && thanKiep) {
    add('menh_co_ban','Mệnh Không Thân Kiếp',
      'Người rất khôn ngoan sắc sảo. Vui ít buồn nhiều, mưu sự thành bại thất thường, làm gì cũng chẳng lâu bền.',
      'Địa Không tại Mệnh, Địa Kiếp tại Thân.', 'Mệnh');
  }
  if (menhKiep && thanKhong) {
    add('menh_co_ban','Mệnh Kiếp Thân Không',
      'Người rất khôn ngoan sắc sảo. Vui ít buồn nhiều, mưu sự thành bại bất thường, làm gì cũng chẳng lâu bền.',
      'Địa Kiếp tại Mệnh, Địa Không tại Thân.', 'Mệnh');
  }

  // Thân cư Thiên Di
  if (thanDC === p_thienDi?.diaChi) {
    if (!hasSatTinh(p_thienDi) && !hasTuanOrTriet(p_thienDi)) {
      add('than_cu','Thân Cư Thiên Di — Lập Nghiệp Phương Xa',
        'Nhiều sao sáng sủa hội hợp → lập nghiệp ở phương xa, rất thịnh vượng.','', 'Thiên Di');
    } else if (hasTuanOrTriet(p_thienDi) || countSatTinh(p_thienDi) >= 2) {
      add('than_cu','Thân Cư Thiên Di — Chết Xa Nhà',
        'Tuần/Triệt hoặc nhiều sát tinh hội hợp → có khả năng chết ở xa nhà.','', 'Thiên Di');
    }
  }

  // Thân cư Phu Thê
  if (thanDC === p_phuThe?.diaChi) {
    if (hasSao(p_phuThe,'Thái Âm')) {
      add('than_cu','Thân Cư Phu Thê — Sợ Vợ',
        'Thái Âm tọa thủ → sợ vợ, thường phải nhờ vả nhà vợ.','', 'Phu Thê');
    }
    if (hasTuanOrTriet(p_phuThe)) {
      add('than_cu','Thân Cư Phu Thê — Trắc Trở Hôn Phối',
        'Tuần/Triệt án ngữ → trắc trở về hôn phối.','', 'Phu Thê');
    }
  }

  // Thân cư Phúc Đức
  if (thanDC === p_phuc?.diaChi) {
    const satTinh = hasSatTinh(p_phuc);
    if (!satTinh) {
      add('than_cu','Thân Cư Phúc Đức — Phúc Thọ',
        'Phúc Đức sáng sủa tốt đẹp → được hưởng phúc, sống lâu, tránh được nhiều tai họa.','', 'Phúc Đức');
    } else {
      add('than_cu','Thân Cư Phúc Đức — Giảm Thọ',
        'Phúc Đức mờ ám xấu xa → khó tránh tai họa, giảm thọ dù cung Mệnh có sáng sủa.','', 'Phúc Đức');
    }
  }

  // ═══════════════════════════════════════════════
  // 2. PHÚ CỤC (19.1)
  // ═══════════════════════════════════════════════
  const PHU_QUAN = [p_menh, p_dien, p_tai]; // Phú cục check Mệnh, Điền, Tài

  // 19.1.1 Tài Ấm Giáp Ấn
  for (const p of PHU_QUAN) {
    if (!p) continue;
    // Thiên Tướng tọa thủ, có Thiên Lương ở 1 trong 2 cung kề
    const DIA_CHI_TAIA = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
    const taia_idx = DIA_CHI_TAIA.indexOf(p.diaChi);
    const taia_L = ls.palaces.find(x=>x.diaChi===DIA_CHI_TAIA[(taia_idx+11)%12]);
    const taia_R = ls.palaces.find(x=>x.diaChi===DIA_CHI_TAIA[(taia_idx+1)%12]);
    if (hasSao(p,'Thiên Tướng') && isSangSua(p,'Thiên Tướng') &&
        (hasSao(taia_L,'Thiên Lương') || hasSao(taia_R,'Thiên Lương'))) {
      add('phu_cuc','Tài Ấm Giáp Ấn',
        'Thiên Tướng sáng sủa tọa thủ, có Thiên Lương giáp cung → phú quý song toàn.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.1.2 Phủ Ấn Củng Thân  
  if (p_than) {
    const xungThan = p_than.xungChieuCung;
    // Phủ và Tướng hội chiếu: cùng cung Thân, hoặc Phủ tại Thân Tướng tại xung, hoặc ngược lại
    // Hoặc Phủ và Tướng nằm trong tam phương tứ chính của cung Thân
    const thanAllStars = [p_than, ...(p_than.tamHopCungs||[]), xungThan].filter(Boolean).flatMap(p=>p.majorStars.map(s=>s.ten));
    if (thanAllStars.includes('Thiên Phủ') && thanAllStars.includes('Thiên Tướng')) {
      add('phu_cuc','Phủ Ấn Củng Thân',
        'Cung Thân có Thiên Phủ và Thiên Tướng hội chiếu → giàu có bền vững.',
        `Tại cung Thân (${thanDC}).`, 'Thân');
    }
  }

  // 19.1.3 Kim Sán Quang Huy
  for (const p of PHU_QUAN) {
    if (p?.diaChi==='Ngọ' && hasSao(p,'Thái Dương') && isSangSua(p,'Thái Dương')) {
      add('phu_cuc','Kim Sán Quang Huy',
        'Thái Dương sáng sủa tọa thủ tại Ngọ → rực rỡ như vàng sáng, phú quý hiển hách.',
        `Tại cung ${p.cungName}(Ngọ).`, p.cungName); break;
    }
  }

  // 19.1.4 Nhật Nguyệt Giáp Tài
  for (const p of PHU_QUAN) {
    if (p?.diaChi==='Sửu' && hasSao(p,'Tham Lang') && hasSao(p,'Vũ Khúc')) {
      add('phu_cuc','Nhật Nguyệt Giáp Tài',
        'Tham Lang và Vũ Khúc đồng cung tại Sửu, có Nhật Nguyệt giáp cung → đại phú.',
        `Tại cung ${p.cungName}(Sửu).`, p.cungName); break;
    }
    if (p?.diaChi==='Mùi' && hasSao(p,'Thiên Phủ') && isGiapCung(ls,p.cungName,'Thái Dương','Thái Âm')) {
      add('phu_cuc','Nhật Nguyệt Giáp Tài',
        'Thiên Phủ tại Mùi có Nhật Nguyệt giáp cung → đại phú.',
        `Tại cung ${p.cungName}(Mùi).`, p.cungName); break;
    }
  }

  // 19.1.5 Nhật Nguyệt Chiếu Bích
  for (const p of PHU_QUAN) {
    if (!p) continue;
    const xung = p.xungChieuCung;
    // Mệnh/Điền/Tài tại Sửu, cung xung (Mùi) có cả Nhật lẫn Nguyệt đồng cung
    // Mệnh/Điền/Tài tại Mùi, cung xung (Sửu) có cả Nhật lẫn Nguyệt đồng cung
    if ((p.diaChi==='Sửu'&&xung?.diaChi==='Mùi'&&hasSao(xung,'Thái Dương')&&hasSao(xung,'Thái Âm')) ||
        (p.diaChi==='Mùi'&&xung?.diaChi==='Sửu'&&hasSao(xung,'Thái Dương')&&hasSao(xung,'Thái Âm'))) {
      add('phu_cuc','Nhật Nguyệt Chiếu Bích',
        'Nhật và Nguyệt đồng cung tại cung xung chiếu → sáng như nhật nguyệt chiếu bích, phú quý hiển hách.',
        `Cung ${p.cungName}(${p.diaChi}), Nhật Nguyệt đồng cung tại ${xung?.diaChi}.`, p.cungName); break;
    }
  }

  // 19.1.6 Tài Lộc Giáp Mã
  for (const p of PHU_QUAN) {
    if (!p || !hasSao(p,'Vũ Khúc')) continue;
    if (isGiapCung(ls,p.cungName,'Lộc Tồn','Thiên Mã') || isGiapCung(ls,p.cungName,'Hóa Lộc','Thiên Mã')) {
      add('phu_cuc','Tài Lộc Giáp Mã',
        'Vũ Khúc tọa thủ có Lộc/Mã giáp cung → tài lộc dồi dào, giàu có lâu bền.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // ═══════════════════════════════════════════════
  // 3. QUÝ CỤC (19.2)
  // ═══════════════════════════════════════════════
  const QUY_QUAN = [p_menh, p_quan]; // Quý cục check Mệnh và Quan Lộc

  // 19.2.1 Kim Dư Phù Giá
  for (const p of QUY_QUAN) {
    if (!p || !hasSao(p,'Tử Vi') || !isSangSua(p,'Tử Vi')) continue;
    const DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
    const idx = DIA_CHI.indexOf(p.diaChi);
    const left  = ls.palaces.find(x=>x.diaChi===DIA_CHI[(idx+11)%12]);
    const right = ls.palaces.find(x=>x.diaChi===DIA_CHI[(idx+1)%12]);
    const hasThieuDuong = hasSao(left,'Thiếu Dương')||hasSao(right,'Thiếu Dương');
    const hasThieuAm    = hasSao(left,'Thiếu Âm')||hasSao(right,'Thiếu Âm');
    const hasTaPhu = hasSao(left,'Tả Phụ')||hasSao(right,'Tả Phụ')||hasSao(left,'Hữu Bật')||hasSao(right,'Hữu Bật');
    if (hasThieuDuong && hasThieuAm || hasTaPhu) {
      add('quy_cuc','Kim Dư Phù Giá',
        'Tử Vi sáng sủa có Tả/Hữu, Thiếu Dương/Âm giáp cung → như xe vàng phò vua, quyền quý hiển hách.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.2 Tử Phủ Triều Viên
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const xung = p.xungChieuCung;
    if ((hasSao(p,'Tử Vi')&&isSangSua(p,'Tử Vi')&&hasSao(xung,'Thiên Phủ')) ||
        (hasSao(p,'Thiên Phủ')&&isSangSua(p,'Thiên Phủ')&&hasSao(xung,'Tử Vi'))) {
      add('quy_cuc','Tử Phủ Triều Viên',
        'Tử Vi và Thiên Phủ triều viên → địa vị cao sang, quyền quý.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.3 Phụ Bật Củng Chủ
  for (const p of QUY_QUAN) {
    if (!p||!hasSao(p,'Tử Vi')||!isSangSua(p,'Tử Vi')) continue;
    const xung = p.xungChieuCung;
    const DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
    const idx = DIA_CHI.indexOf(p.diaChi);
    const left  = ls.palaces.find(x=>x.diaChi===DIA_CHI[(idx+11)%12]);
    const right = ls.palaces.find(x=>x.diaChi===DIA_CHI[(idx+1)%12]);
    const allPalaces = [p, xung, left, right, ...p.tamHopCungs||[]].filter(Boolean);
    const hasTa  = allPalaces.some(x=>hasSao(x,'Tả Phụ'));
    const hasHuu = allPalaces.some(x=>hasSao(x,'Hữu Bật'));
    if (hasTa && hasHuu) {
      add('quy_cuc','Phụ Bật Củng Chủ',
        'Tử Vi sáng sủa có Tả Phụ và Hữu Bật hội chiếu → được phò tá đắc lực, quyền quý.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.5 Phủ Tướng Triều Viên
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const xung = p.xungChieuCung;
    // Phủ và Tướng trong tam phương tứ chính của cung (không nhất thiết trực xung)
    const allPTV = [p, ...(p.tamHopCungs||[]), xung].filter(Boolean);
    const hasPhu = allPTV.some(x=>hasSao(x,'Thiên Phủ'));
    const hasTuong = allPTV.some(x=>hasSao(x,'Thiên Tướng'));
    const phuSangSua = allPTV.some(x=>hasSao(x,'Thiên Phủ')&&isSangSua(x,'Thiên Phủ'));
    const tuongSangSua = allPTV.some(x=>hasSao(x,'Thiên Tướng')&&isSangSua(x,'Thiên Tướng'));
    if (hasPhu && hasTuong && (phuSangSua || tuongSangSua)) {
      add('quy_cuc','Phủ Tướng Triều Viên',
        'Thiên Phủ và Thiên Tướng triều viên → phú quý song toàn, địa vị cao.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.6 Vũ Khúc Thủ Viên
  if (p_menh?.diaChi==='Mão' && hasSao(p_menh,'Vũ Khúc')) {
    add('quy_cuc','Vũ Khúc Thủ Viên','Vũ Khúc thủ Mệnh tại Mão → quyền quý, quan chức.','');
  }

  // 19.2.7 Cự Cơ Mão Dậu
  for (const p of QUY_QUAN) {
    if (!p) continue;
    if ((p.diaChi==='Mão'||p.diaChi==='Dậu') && hasSao(p,'Cự Môn') && hasSao(p,'Thiên Cơ')) {
      add('quy_cuc','Cự Cơ Mão Dậu','Cự Môn và Thiên Cơ đồng cung tại Mão/Dậu → quyền quý, thông minh, nổi tiếng.',
        `Tại cung ${p.cungName}(${p.diaChi}).`, p.cungName); break;
    }
  }

  // 19.2.8 Thất Sát Triều Đẩu
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const xung = p.xungChieuCung;
    if ((p.diaChi==='Dần'||p.diaChi==='Thân') && hasSao(p,'Thất Sát') &&
        xung && hasSao(xung,'Tử Vi') && hasSao(xung,'Thiên Phủ')) {
      add('quy_cuc','Thất Sát Triều Đẩu','Thất Sát tại Dần/Thân, Tử Phủ đồng cung xung chiếu → uy quyền lớn, chỉ huy xuất sắc.',
        `Tại cung ${p.cungName}(${p.diaChi}).`, p.cungName); break;
    }
  }

  // 19.2.9 Tham Hỏa Tương Phùng
  const TU_MO = new Set(['Thìn','Tuất','Sửu','Mùi']);
  for (const p of QUY_QUAN) {
    if (!p) continue;
    if (TU_MO.has(p.diaChi) && hasSao(p,'Tham Lang') && hasSao(p,'Hỏa Tinh')) {
      add('quy_cuc','Tham Hỏa Tương Phùng','Tham Lang gặp Hỏa Tinh đồng cung tại Tứ Mộ → bạo phát, giàu to, quan chức lớn.',
        `Tại cung ${p.cungName}(${p.diaChi}).`, p.cungName); break;
    }
  }

  // 19.2.10 Nhật Xuất Phù Tang
  for (const p of QUY_QUAN) {
    if (p?.diaChi==='Mão' && hasSao(p,'Thái Dương')) {
      add('quy_cuc','Nhật Xuất Phù Tang','Thái Dương tọa thủ tại Mão → như mặt trời mọc, sáng láng quyền quý.',
        `Tại cung ${p.cungName}(Mão).`, p.cungName); break;
    }
  }

  // 19.2.11 Nguyệt Lãng Thiên Môn
  for (const p of QUY_QUAN) {
    if (p?.diaChi==='Hợi' && hasSao(p,'Thái Âm')) {
      add('quy_cuc','Nguyệt Lãng Thiên Môn','Thái Âm tọa thủ tại Hợi → như trăng sáng trên thiên môn, thanh cao quyền quý.',
        `Tại cung ${p.cungName}(Hợi).`, p.cungName); break;
    }
  }

  // 19.2.13 Nguyệt Sinh Thương Hải
  for (const p of QUY_QUAN) {
    if (p?.diaChi==='Tý' && hasSao(p,'Thái Âm')) {
      add('quy_cuc','Nguyệt Sinh Thương Hải','Thái Âm tọa thủ tại Tý → như trăng sinh trên biển, quyền quý hiển đạt.',
        `Tại cung ${p.cungName}(Tý).`, p.cungName); break;
    }
  }

  // 19.2.17 Lộc Mã Bội Ấn
  for (const p of QUY_QUAN) {
    if (!p||!hasSao(p,'Thiên Tướng')||!isSangSua(p,'Thiên Tướng')) continue;
    if (isGiapCung(ls,p.cungName,'Lộc Tồn','Thiên Mã') || isGiapCung(ls,p.cungName,'Hóa Lộc','Thiên Mã')) {
      add('quy_cuc','Lộc Mã Bội Ấn','Thiên Tướng sáng sủa có Lộc/Mã giáp cung → lộc quyền cùng phát, hiển hách.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.19 Mã Đầu Đới Kiếm
  for (const p of QUY_QUAN) {
    if (!p||p.diaChi!=='Ngọ'||!hasSao(p,'Kình Dương')) continue;
    const xung = p.xungChieuCung;
    const DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
    const idx = DIA_CHI.indexOf(p.diaChi);
    const left  = ls.palaces.find(x=>x.diaChi===DIA_CHI[(idx+11)%12]);
    const right = ls.palaces.find(x=>x.diaChi===DIA_CHI[(idx+1)%12]);
    const allNearby = [xung,left,right,...p.tamHopCungs||[]].filter(Boolean);
    if (allNearby.some(x=>hasSao(x,'Thiên Hình')) && allNearby.some(x=>hasSao(x,'Thiên Mã'))) {
      add('quy_cuc','Mã Đầu Đới Kiếm','Kình Dương tại Ngọ có Thiên Hình và Thiên Mã hội chiếu → võ công lừng lẫy, uy quyền.',
        `Tại cung ${p.cungName}(Ngọ).`, p.cungName); break;
    }
  }

  // 19.2.20 Kình Dương Nhập Mệnh
  for (const p of QUY_QUAN) {
    if (!p||!TU_MO.has(p.diaChi)||!hasSao(p,'Kình Dương')) continue;
    const tuoiTuMo = TU_MO.has(ls.chiNam);
    add('quy_cuc','Kình Dương Nhập Mệnh',
      tuoiTuMo ? 'Kình Dương tại Tứ Mộ, tuổi Tứ Mộ → rất tốt, quyền quý hiển hách.'
               : 'Kình Dương tại Tứ Mộ → có chức quyền, nhưng tốt nhất với tuổi Tứ Mộ.',
      `Tại cung ${p.cungName}(${p.diaChi}).`, p.cungName); break;
  }

  // 19.2.21 Tọa Quý Hưởng Quý
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const xung = p.xungChieuCung;
    if ((hasSao(p,'Thiên Khôi')&&hasSao(xung,'Thiên Việt')) ||
        (hasSao(p,'Thiên Việt')&&hasSao(xung,'Thiên Khôi'))) {
      add('quy_cuc','Tọa Quý Hưởng Quý','Thiên Khôi và Thiên Việt chiếu nhau → quý nhân phù trợ, danh vọng hiển đạt.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.22 Văn Tinh Ám Củng
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const xung = p.xungChieuCung;
    if ((hasSao(p,'Văn Xương')&&hasSao(xung,'Văn Khúc')) ||
        (hasSao(p,'Văn Khúc')&&hasSao(xung,'Văn Xương'))) {
      add('quy_cuc','Văn Tinh Ám Củng','Văn Xương và Văn Khúc chiếu nhau → văn chương xuất sắc, công danh rực rỡ.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.23 Khoa Quyền Lộc Củng
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const h = hasHoaInTuChinh(p);
    if (h.khoa && h.quyen && h.loc) {
      add('quy_cuc','Khoa Quyền Lộc Củng','Hóa Khoa, Hóa Quyền, Hóa Lộc hội chiếu → tam hóa tốt, công danh phú quý tột đỉnh.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.26 Minh Lộc Ám Lộc
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const nhiHop = getNhiHop(ls, p.diaChi);
    if ((hasHoa(p,'Lộc')&&hasSao(nhiHop,'Lộc Tồn')) ||
        (hasSao(p,'Lộc Tồn')&&hasHoa(nhiHop,'Lộc'))) {
      add('quy_cuc','Minh Lộc Ám Lộc','Hóa Lộc và Lộc Tồn nhị hợp → lộc song trùng, tài lộc vượng phát.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // ═══════════════════════════════════════════════
  // 4. BẦN TIỆN CỤC (19.3)
  // ═══════════════════════════════════════════════

  // 19.3.1 Sinh Bất Phùng Thời
  if (p_menh && hasSao(p_menh,'Liêm Trinh') &&
      (p_menh.diaChi==='Dần'||p_menh.diaChi==='Thân') && hasTuanOrTriet(p_menh)) {
    add('ban_tien_cuc','Sinh Bất Phùng Thời',
      'Liêm Trinh thủ Mệnh tại Dần/Thân gặp Tuần/Triệt → tài năng nhưng không gặp thời.','', 'Mệnh');
  }

  // 19.3.2 Nhất Sinh Cô Bần
  if (p_menh && hasSao(p_menh,'Phá Quân') &&
      (p_menh.diaChi==='Dần'||p_menh.diaChi==='Thân') && hasSatTinh(p_menh)) {
    add('ban_tien_cuc','Nhất Sinh Cô Bần',
      'Phá Quân thủ Mệnh tại Dần/Thân gặp nhiều sát tinh mờ ám → suốt đời cô độc nghèo khổ.','', 'Mệnh');
  }

  // 19.3.3 Tài Dữ Tù Cừu
  if (p_menh) {
    const vuLiem = getSaoChinh(p_menh).filter(s=>s==='Vũ Khúc'||s==='Liêm Trinh');
    if (vuLiem.length > 0 && vuLiem.every(s=>isMoAm(p_menh,s)) && hasSatTinh(p_menh)) {
      add('ban_tien_cuc','Tài Dữ Tù Cừu',
        'Vũ Khúc hoặc Liêm Trinh mờ ám thủ Mệnh, gặp nhiều sát tinh → tiền tài như kẻ thù, tài lộc bị phá.','', 'Mệnh');
    }
  }

  // 19.3.4 Nhật Nguyệt Tàng Hung
  if (p_menh) {
    const nhat = hasSao(p_menh,'Thái Dương'), nguyet = hasSao(p_menh,'Thái Âm');
    if ((nhat&&isMoAm(p_menh,'Thái Dương')) || (nguyet&&isMoAm(p_menh,'Thái Âm'))) {
      add('ban_tien_cuc','Nhật Nguyệt Tàng Hung',
        'Thái Dương hoặc Thái Âm mờ ám thủ Mệnh → vận trình tối tăm, tiền đồ trắc trở.','', 'Mệnh');
    }
  }

  // 19.3.6 Lộc Phùng Lưỡng Sát
  if (p_menh) {
    const hasLoc = hasSao(p_menh,'Lộc Tồn')||hasSao(p_menh,'Hóa Lộc');
    if (hasLoc && hasSao(p_menh,'Địa Không') && hasSao(p_menh,'Địa Kiếp')) {
      add('ban_tien_cuc','Lộc Phùng Lưỡng Sát',
        'Lộc Tồn/Hóa Lộc thủ Mệnh gặp Địa Không và Địa Kiếp đồng cung → lộc bị phá, tài lộc hao tán.','', 'Mệnh');
    }
  }

  // 19.3.8 Mã Lạc Không Vong
  if (p_menh && hasSao(p_menh,'Thiên Mã') && hasTuanOrTriet(p_menh)) {
    add('ban_tien_cuc','Mã Lạc Không Vong',
      'Thiên Mã thủ Mệnh gặp Tuần/Triệt án ngữ → ngựa sa vào chỗ không, bôn ba vô ích.','', 'Mệnh');
  }

  // ═══════════════════════════════════════════════
  // 5. TẠP CỤC (19.4) - Tính từ đại vận scoring
  // ═══════════════════════════════════════════════
  const dvs = ls.daiVans?.slice(0,9) || [];
  const menhXau = hasSatTinh(p_menh) && countSatTinh(p_menh) >= 2;
  const menhTot = getSaoChinh(p_menh).length > 0 && !menhXau;

  // 19.4.1 Cẩm Thượng Thiêm Hoa — Mệnh Thân tốt + đại vận hiện tại tốt
  const dvHT = ls.daiVanHienTai;
  if (dvHT?.scoring?.tong >= 7 && menhTot) {
    add('tap_cuc','Cẩm Thượng Thiêm Hoa',
      'Cung Mệnh/Thân sáng sủa, vận hạn lại rực rỡ → như gấm thêu hoa, vận trình viên mãn.',
      `Đại vận hiện tại ${dvHT.scoring.tong}đ.`);
  }
  // 19.4.2/3 Phong Vân Tế Hội / Khô Mộc Phùng Xuân
  if (dvHT?.scoring?.tong >= 7 && menhXau) {
    add('tap_cuc','Phong Vân Tế Hội',
      'Cung Mệnh/Thân mờ ám nhưng vận hạn tốt → như rồng mây gặp hội, vận đến bù đắp.',
      `Đại vận hiện tại ${dvHT.scoring.tong}đ.`);
  }
  // 19.3.8 Lộc Xung Mã Khổn
  if (dvHT?.scoring) {
    const dvPalace = ls.palaces[dvHT.cungIdx];
    if (dvPalace && hasSao(dvPalace,'Thiên Mã') &&
        (hasSao(dvPalace,'Địa Không')||hasSao(dvPalace,'Địa Kiếp')||hasTuanOrTriet(dvPalace))) {
      add('tap_cuc','Lộc Xung Mã Khổn',
        'Đại vận gặp Sát/Lộc/Mã hội hợp cùng Tam Không → Lộc Mã bị nguy khốn, hạn xấu cần đề phòng.',
        `Đại vận ${dvHT.diaChi}.`);
    }
  }

  return results;
}

// ─── SCORING ENGINE ──────────────────────────────────────────

const TAM_HOP_HANH = {
  'Thân':'Thủy','Tý':'Thủy','Thìn':'Thủy',
  'Hợi':'Mộc', 'Mão':'Mộc', 'Mùi':'Mộc',
  'Dần':'Hỏa', 'Ngọ':'Hỏa', 'Tuất':'Hỏa',
  'Tỵ':'Kim',  'Dậu':'Kim', 'Sửu':'Kim',
};

const DC_HANH = {
  'Tý':'Thủy','Hợi':'Thủy',
  'Dần':'Mộc','Mão':'Mộc',
  'Tỵ':'Hỏa','Ngọ':'Hỏa',
  'Thìn':'Thổ','Tuất':'Thổ','Sửu':'Thổ','Mùi':'Thổ',
  'Thân':'Kim','Dậu':'Kim',
};

const NGU_HANH_SINH = {'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc'};
const NGU_HANH_KHAC = {'Kim':'Mộc','Mộc':'Thổ','Thổ':'Thủy','Thủy':'Hỏa','Hỏa':'Kim'};

// Nạp Âm bản mệnh

const BO_CHINH_TINH = {
  'TPVT': ['Tử Vi','Thiên Phủ','Vũ Khúc','Thiên Tướng'],
  'CNDL': ['Thiên Cơ','Thái Âm','Thiên Đồng','Thiên Lương'],
  'SPT':  ['Thất Sát','Phá Quân','Tham Lang','Liêm Trinh'],
  'CN':   ['Cự Môn','Thái Dương'],
};

function getNapAm(canChi) {
  if (!canChi) return null;
  const key = canChi.trim();
  // Direct lookup: NAP_AM['Giáp Tý'] = 'Kim'
  if (NAP_AM[key]) return NAP_AM[key];
  // Fallback: try partial match
  for (const [cc, hanh] of Object.entries(NAP_AM)) {
    if (key.includes(cc) || cc.includes(key)) return hanh;
  }
  return null;
}

function soSanhHanh(hanhA, hanhB) {
  // hanhB tác động lên hanhA
  if (!hanhA || !hanhB) return 0;
  if (hanhA === hanhB) return 'dong_hanh';
  if (NGU_HANH_SINH[hanhB] === hanhA) return 'sinh_nhap';   // B sinh A
  if (NGU_HANH_SINH[hanhA] === hanhB) return 'sinh_xuat';   // A sinh B
  if (NGU_HANH_KHAC[hanhA] === hanhB) return 'khac_xuat';   // A khắc B
  if (NGU_HANH_KHAC[hanhB] === hanhA) return 'khac_nhap';   // B khắc A
  return 'unknown';
}

function tinhThienThoi(daiVanDC, chiNamSinh) {
  const hDV = TAM_HOP_HANH[daiVanDC];
  const hNS = TAM_HOP_HANH[chiNamSinh];
  const qh = soSanhHanh(hNS, hDV);
  const scoreMap = {dong_hanh:5, sinh_nhap:4, khac_xuat:2, sinh_xuat:1, khac_nhap:0, unknown:0};
  return { score: scoreMap[qh] ?? 0, qh, hDV, hNS };
}

function tinhDiaLoi(daiVanDC, napAmHanh) {
  const hCung = DC_HANH[daiVanDC];
  const hMenh = napAmHanh;
  if (!hCung || !hMenh) return { score: 0.5, qh: 'unknown' };
  let score, qh;
  if (hCung === hMenh)                        { score=0.75; qh='dong_hanh'; }
  else if (NGU_HANH_SINH[hCung] === hMenh)   { score=1;    qh='cung_sinh_menh'; }
  else if (NGU_HANH_SINH[hMenh] === hCung)   { score=0.5;  qh='menh_sinh_cung'; }
  else if (NGU_HANH_KHAC[hMenh] === hCung)   { score=0.25; qh='menh_khac_cung'; }
  else if (NGU_HANH_KHAC[hCung] === hMenh)   { score=0;    qh='cung_khac_menh'; }
  else                                         { score=0.5;  qh='unknown'; }
  return { score, qh, hCung, hMenh };
}

function getBoSao(palaceStars) {
  const names = palaceStars.map(s => s.ten);
  for (const [bo, list] of Object.entries(BO_CHINH_TINH)) {
    if (list.some(s => names.includes(s))) return bo;
  }
  return null;
}

function tinhNhanHoa(menhStars, vanStars, dvPalace, dvTuoiStart, dvTuoiEnd) {
  const boMenh = getBoSao(menhStars);
  const boVan  = getBoSao(vanStars);

  // ── Phần 1: So sánh bộ Mệnh vs bộ Đại Vận (max 2 điểm) ──
  const SCORE_BO = {
    'TPVT:TPVT':2, 'CNDL:CNDL':2, 'SPT:SPT':2, 'CN:CN':2,
    'TPVT:SPT':1.5, 'SPT:TPVT':1.5,
    'TPVT:CNDL':1,  'CNDL:TPVT':1.5,
    'TPVT:CN':0,    'CN:TPVT':1,
    'CNDL:SPT':0.5, 'SPT:CNDL':0.5,
    'CNDL:CN':0.5,  'CN:CNDL':1.5,
    'SPT:CN':0,     'CN:SPT':0,
  };
  const key = boMenh && boVan ? boMenh + ':' + boVan : null;
  const scoreBo = key ? (SCORE_BO[key] ?? 1) : 1;

  // ── Phần 2: Sát/Bại tinh trong tam phương tứ chính cung ĐV (max 2 điểm) ──
  const SAT_TINH  = ['Địa Không','Địa Kiếp','Kình Dương','Đà La','Linh Tinh','Hỏa Tinh'];
  const BAI_TINH  = ['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
  const ALL_BAD   = [...SAT_TINH, ...BAI_TINH];

  let scoreSat = 2;
  if (dvPalace) {
    // Check Triệt trong cung đại vận — nếu active thì sát tinh tam hợp/xung không tác dụng
    const dvHasTriet = dvPalace.stars.some(s => s.ten === 'Triệt');
    const dvHasTuan  = dvPalace.stars.some(s => s.ten === 'Tuần');
    // Triệt active khi dvTuoiEnd <= 30 (đại vận kết thúc trước 30)
    // Tuần active khi dvTuoiStart >= 30 (đại vận bắt đầu sau 30)
    const trietActive = dvHasTriet && dvTuoiEnd != null && dvTuoiEnd <= 30;
    const tuanActive  = dvHasTuan  && dvTuoiStart != null && dvTuoiStart >= 30;

    let allStars;
    if (trietActive) {
      // Triệt chặn sát tinh từ tam hợp/xung chiếu — chỉ tính sao trong cung DV
      allStars = dvPalace.stars.map(s => s.ten);
    } else {
      allStars = [dvPalace, ...(dvPalace.tamHopCungs||[]), dvPalace.xungChieuCung]
        .filter(Boolean).flatMap(c => c.stars.map(s => s.ten));
    }

    let badCount = ALL_BAD.filter(s => allStars.includes(s)).length;

    // Tuần lâm hỏa địa (Tỵ/Ngọ) hoặc Triệt đáo kim cung (Thân/Dậu) — giảm tác hại sát tinh
    const dc = dvPalace.diaChi;
    if ((tuanActive && (dc === 'Tỵ' || dc === 'Ngọ')) ||
        (trietActive && (dc === 'Thân' || dc === 'Dậu'))) {
      badCount = Math.floor(badCount / 2); // giảm 50% số sao xấu tính
    }

    scoreSat = Math.max(0, 2 - badCount * 0.15);
    scoreSat = Math.round(scoreSat * 100) / 100;
  }

  const total = Math.round((scoreBo + scoreSat) * 100) / 100;
  const countXau = dvPalace ? ALL_BAD.filter(s =>
    [dvPalace,...(dvPalace.tamHopCungs||[]),dvPalace.xungChieuCung]
    .filter(Boolean).flatMap(c=>c.stars.map(x=>x.ten)).includes(s)).length : 0;
  return { score: total, scoreBo, scoreSat, boMenh, boVan, countXau };
}

function scoreDaiVan(tt, dl, nh) {
  // Nhân Hòa là điều kiện tiên quyết:
  // Tổng = NH + (NH/4)*DL + (NH/4)*TT
  // Max: 4 + (4/4)*1 + (4/4)*5 = 10
  const nhRatio = nh.score / 4;
  const total = nh.score + nhRatio * dl.score + nhRatio * tt.score;
  const flag = total >= 7 ? '🟢' : total >= 4 ? '🟡' : '🔴';
  return {
    thienThoi: { score: tt.score, qh: tt.qh },
    diaLoi:    { score: dl.score, qh: dl.qh },
    nhanHoa:   { score: nh.score, scoreBo: nh.scoreBo, scoreSat: nh.scoreSat, boMenh: nh.boMenh, boVan: nh.boVan },
    tong: Math.round(total * 10) / 10, flag,
  };
}

function tinhScoringAllDaiVan(daiVans, palaces, canChiNam, chiNam, napAm, chiNamSinh) {
  const menhPalace = palaces.find(p => p.isMenh);
  if (!menhPalace) return daiVans;
  const ls_ctx = { palaces, napAmHanh: napAm, chiNamSinh };

  // Dùng tuChinhStars đã tính sẵn lúc an sao
  const menhStars = menhPalace.tuChinhStars || menhPalace.majorStars;

  return daiVans.map((dv, i) => {
    if (i >= 9) return dv;
    const dvPalace = palaces[dv.cungIdx];
    if (!dvPalace) return dv;

    const dvStars = dvPalace.tuChinhStars || dvPalace.majorStars;

    const tt = tinhThienThoi(dv.diaChi, chiNam);
    const dl = tinhDiaLoi(dv.diaChi, napAm);
    const nh = tinhNhanHoa(menhStars, dvStars, dvPalace, dv.tuoiStart, dv.tuoiEnd);
    const sc = scoreDaiVan(tt, dl, nh);

    const dvRules = phanTichDaiVanRules(dvPalace, menhPalace, { ...ls_ctx, napAmHanh: napAm });
    return { ...dv, scoring: sc, rules: dvRules };
  });
}


// ─── TAM PHƯƠNG TỨ CHÍNH (theo tên cung) ────────────────────
const TAM_PHUONG_TU_CHINH = {
  'Mệnh':      { tamHop: ['Tài Bạch','Quan Lộc'],       xung: 'Thiên Di' },
  'Huynh Đệ':  { tamHop: ['Điền Trạch','Tật Ách'],      xung: 'Nô Bộc' },
  'Phu Thê':   { tamHop: ['Phúc Đức','Thiên Di'],        xung: 'Quan Lộc' },
  'Tử Tức':    { tamHop: ['Phụ Mẫu','Nô Bộc'],          xung: 'Điền Trạch' },
  'Tài Bạch':  { tamHop: ['Mệnh','Quan Lộc'],            xung: 'Phúc Đức' },
  'Tật Ách':   { tamHop: ['Huynh Đệ','Điền Trạch'],     xung: 'Phụ Mẫu' },
  'Thiên Di':  { tamHop: ['Phúc Đức','Phu Thê'],         xung: 'Mệnh' },
  'Nô Bộc':    { tamHop: ['Phụ Mẫu','Tử Tức'],          xung: 'Huynh Đệ' },
  'Quan Lộc':  { tamHop: ['Mệnh','Tài Bạch'],            xung: 'Phu Thê' },
  'Điền Trạch':{ tamHop: ['Huynh Đệ','Tật Ách'],        xung: 'Tử Tức' },
  'Phúc Đức':  { tamHop: ['Thiên Di','Phu Thê'],         xung: 'Tài Bạch' },
  'Phụ Mẫu':   { tamHop: ['Nô Bộc','Tử Tức'],           xung: 'Tật Ách' },
};


// ─── VÒNG THÁI TUẾ — PHÂN NHÓM TẠI CUNG MỆNH ───────────────

function anSaoLaSo({ ngayAL, thangAL, namAL, canNam, chiNam, gioIdx, gioitinh, namXem }) {
  const amDuong = ['Giáp','Bính','Mậu','Canh','Nhâm'].includes(canNam) ? 'dương' : 'âm';
  const canChiNam = `${canNam} ${chiNam}`;
  const napAm = NAP_AM[canChiNam] || '?';

  // 1. Cung Mệnh & Thân
  const menhIdx = dinhCungMenh(thangAL, gioIdx);
  const thanIdx = dinhCungThan(thangAL, gioIdx);
  const menhDC = DIA_CHI[menhIdx];
  const thanDC = DIA_CHI[thanIdx];

  // 2. Lập cục
  const { cuc, canMenh } = lapCuc(canNam, menhDC);

  // 3. An sao
  const chinhTinh = anChinhTinh(ngayAL, cuc);
  if (!chinhTinh) throw new Error(`Không tìm thấy bảng Tử Vi ngày ${ngayAL} cục ${cuc}`);

  const thaiTue = anThaiTue(chiNam);
  const locTon = anLocTon(canNam, amDuong, gioitinh);
  const trangSinh = anTrangSinh(cuc, amDuong, gioitinh);
  const locTonIdx = locTon['Lộc Tồn'];
  const lucSat = anLucSat(canNam, chiNam, gioIdx, locTonIdx, amDuong, gioitinh);
  const phuTinh = anPhuTinh(canNam, chiNam, thangAL, ngayAL, gioIdx, locTonIdx);

  // 4. Tứ hóa
  const tuHoa = TU_HOA[canNam] || {};

  // 5. Tuần Triệt
  const tuanTriet = getTuanTriet(canChiNam, canNam);

  // 6. Đại vận
  const daiVans = tinhDaiVan(menhIdx, cuc, amDuong, gioitinh);

  // 7. Tiểu hạn & tuổi xem
  const namSinhDL = namAL; // placeholder
  const tuoiXem = namXem - namSinhDL + 1;
  // Chi năm xem
  const chiNamXem = DIA_CHI[(namXem + 8) % 12];
  const tieuHanIdx = tinhTieuHan(chiNam, gioitinh, tuoiXem);
  // Lưu niên đại hạn: từ cung ĐV hiện tại đếm tới chi năm xem
  const daiVanHienTaiObj = daiVans.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd);
  const ageIndex = daiVanHienTaiObj ? tuoiXem - daiVanHienTaiObj.tuoiStart : 0;
  const luuNienDaiHanIdx = daiVanHienTaiObj
    ? tinhLuuDaiHan(daiVanHienTaiObj.cungIdx, ageIndex, amDuong, gioitinh)
    : 0;
  const daiVanHienTai = daiVans.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd);

  // 8. Build palaces
  const allStars = { ...chinhTinh, ...thaiTue, ...locTon, ...trangSinh, ...lucSat, ...phuTinh };

  // Apply tứ hóa labels
  const tuHoaMap = {}; // starName → hoa
  for (const [hoa, star] of Object.entries(tuHoa)) tuHoaMap[star] = hoa;

  const palaces = DIA_CHI.map((dc, idx) => {
    const offset = mod12(idx - menhIdx);
    const cungName = TEN_CUNG[offset];
    const stars = [];
    for (const [ten, cidx] of Object.entries(allStars)) {
      if (cidx === idx) {
        const hoa = tuHoaMap[ten];
        const nhom = chinhTinh[ten] !== undefined ? 'chinh' :
                thaiTue[ten] !== undefined ? 'thai_tue' :
                locTon[ten] !== undefined ? 'loc_ton' :
                trangSinh[ten] !== undefined ? 'trang_sinh' :
                lucSat[ten] !== undefined ? 'luc_sat' : 'phu';
        const brightness = getStarBrightness(ten, dc);
        stars.push({ ten, hoa: hoa || null, nhom, brightness });
      }
    }
    // Tuần Triệt — mỗi cung chỉ push 1 lần
    const hasTuan = tuanTriet.tuan.includes(idx);
    const hasTriet = tuanTriet.triet.includes(idx);
    if (hasTuan && hasTriet) stars.push({ ten:'Tuần+Triệt', nhom:'tuan_triet', brightness:'' });
    else if (hasTuan)  stars.push({ ten:'Tuần',  nhom:'tuan_triet', brightness:'' });
    else if (hasTriet) stars.push({ ten:'Triệt', nhom:'tuan_triet', brightness:'' });

    // Đại vận range
    const van = daiVans[offset];

    return {
      idx, diaChi: dc, cungName,
      isMenh: idx === menhIdx,
      isThan: idx === thanIdx,
      isBodyPalace: idx === thanIdx,
      stars,
      majorStars: stars.filter(s=>s.nhom==='chinh'),
      minorStars: stars.filter(s=>['loc_ton','luc_sat','phu'].includes(s.nhom)),
      adjectiveStars: stars.filter(s=>['thai_tue','trang_sinh','tuan_triet'].includes(s.nhom)),
      decadal: van ? { range: [van.tuoiStart, van.tuoiEnd] } : null,
      earthlyBranch: dc,
      name: cungName,
    };
  });

  // Gắn tam phương tứ chính vào từng cung
  for (const p of palaces) {
    const tp = TAM_PHUONG_TU_CHINH[p.cungName];
    if (tp) {
      p.tamHopCungs = tp.tamHop
        .map(name => palaces.find(x => x.cungName === name))
        .filter(Boolean);
      p.xungChieuCung = palaces.find(x => x.cungName === tp.xung) || null;
      // Tất cả sao trong 4 cung (chính + 2 tam hợp + 1 xung)
      p.tuChinhStars = [p, ...p.tamHopCungs, p.xungChieuCung]
        .filter(Boolean)
        .flatMap(c => c.majorStars);
    }
  }

  // Vòng Thái Tuế tại cung Mệnh và cung Thân — tính bằng offset (chi năm SINH)
  const menhP = palaces.find(p => p.isMenh);
  const thanP  = palaces.find(p => p.diaChi === thanDC);
  const startIdxTT = DIA_CHI.indexOf(chiNam);

  if (menhP) {
    const offset = ((DIA_CHI.indexOf(menhP.diaChi) - startIdxTT) % 12 + 12) % 12;
    const sao = THAI_TUE_SEQ[offset];
    const nhom = THAI_TUE_NHOM[sao];
    if (nhom !== undefined) {
      menhP.thaiTueNhom = { sao, nhom, ...THAI_TUE_NHOM_Y_NGHIA[nhom] };
    }
  }

  // Thân cung (cung an Thân, không phải địa chi Thân) trong vòng Thái Tuế
  if (thanP) {
    const offset = ((DIA_CHI.indexOf(thanP.diaChi) - startIdxTT) % 12 + 12) % 12;
    const sao = THAI_TUE_SEQ[offset];
    const nhom = THAI_TUE_NHOM[sao];
    if (nhom !== undefined) {
      thanP.thaiTueNhom = { sao, nhom, ...THAI_TUE_NHOM_Y_NGHIA[nhom] };
    }
  }

  // Vị trí cung Mệnh trong vòng Thái Tuế
  const menhPalaceRef = palaces.find(p => p.isMenh);
  let menhThaiTue = null;
  if (menhPalaceRef) {
    const thaiTueSaoTaiMenh = menhPalaceRef.stars.find(s => s.nhom === 'thai_tue');
    if (thaiTueSaoTaiMenh) {
      const info = THAI_TUE_NHOM[thaiTueSaoTaiMenh.ten];
      if (info) {
        menhThaiTue = {
          sao: thaiTueSaoTaiMenh.ten,
          nhom: info.nhom,
          y_nghia: info.y_nghia,
        };
      }
    }
  }

  // Tính scoring cho 9 đại vận
  const napAmHanh = getNapAm(canChiNam);
  const daiVansScored = tinhScoringAllDaiVan(daiVans, palaces, canChiNam, chiNam, napAmHanh, chiNam);

  return {
    canChiNam, napAm, amDuong, cuc, canMenh,
    menhDC, thanDC, menhIdx, thanIdx,
    napAmHanh,
    fiveElementsClass: cuc,
    earthlyBranchOfSoulPalace: menhDC,
    earthlyBranchOfBodyPalace: thanDC,
    chineseDate: canChiNam,
    palaces,
    menhThaiTue,
    daiVans: daiVansScored,
    daiVanHienTai: daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd) || daiVanHienTai,
    tieuHanIdx,
    tuoiXem,
    chiNamXem,
    luuNienDaiHanIdx,
    cachCuc: (() => {
      const _ls = { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam,
        daiVans: daiVansScored,
        daiVanHienTai: daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd),
      };
      return phanTichCachCuc(_ls, gioitinh);
    })(),
    cachCucTungCung: phanTichCungYNghia(
      { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam },
      gioitinh, gioIdx, canNam, chiNam, tuoiXem
    ),
    cungScores: tinhCungScores(
      {
        palaces,
        cachCuc: (() => {
          const _ls = { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam,
            daiVans: daiVansScored,
            daiVanHienTai: daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd),
          };
          return phanTichCachCuc(_ls, gioitinh);
        })(),
        cachCucTungCung: phanTichCungYNghia(
          { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam },
          gioitinh, gioIdx, canNam, chiNam, tuoiXem
        ),
      },
      napAmHanh, tuoiXem
    ),
    tieuVanScores: tinhTieuVanScores(
      { palaces, daiVans: daiVansScored },
      gioitinh, amDuong, chiNam, namSinhDL
    ),
  };
}


// ─── TÍNH CHẤT SAO ───────────────────────────────────────────
const STAR_DATA = {
  'Tử Vi':       { type:'chính tinh', element:'thổ',   yin_yang:'dương', weight:10, traits:['uy quyền','tài lộc','phúc đức'],    positions:{mien:['Tỵ','Ngọ','Dần','Thân'],vuong:['Thìn','Tuất'],dac:['Sửu','Mùi'],binh:['Hợi','Tý','Mão','Dậu']} },
  'Liêm Trinh':  { type:'chính tinh', element:'hỏa',   yin_yang:'âm',    weight:8,  traits:['quan lộc','hình ngục','đào hoa'],   positions:{mien:['Thìn','Tuất'],vuong:['Tý','Ngọ','Dần','Thân'],dac:['Sửu','Mùi'],ham:['Tỵ','Hợi','Mão','Dậu']} },
  'Thiên Đồng':  { type:'chính tinh', element:'thủy',  yin_yang:'dương', weight:7,  traits:['phúc thọ','hiền hòa'],              positions:{mien:['Dần','Thân'],vuong:['Tý'],dac:['Mão','Tỵ','Hợi'],ham:['Ngọ','Dậu','Thìn','Tuất','Sửu','Mùi']} },
  'Vũ Khúc':     { type:'chính tinh', element:'kim',   yin_yang:'âm',    weight:9,  traits:['tài lộc','cương nghị'],             positions:{mien:['Thìn','Tuất','Sửu','Mùi'],vuong:['Dần','Thân','Tý','Ngọ'],dac:['Mão','Dậu'],ham:['Tỵ','Hợi']} },
  'Thái Dương':  { type:'chính tinh', element:'hỏa',   yin_yang:'dương', weight:9,  traits:['quan lộc','uy quyền'],              positions:{mien:['Tỵ','Ngọ'],vuong:['Dần','Mão','Thìn'],dac:['Sửu','Mùi'],ham:['Thân','Dậu','Tuất','Hợi','Tý']} },
  'Thiên Cơ':    { type:'chính tinh', element:'mộc',   yin_yang:'âm',    weight:8,  traits:['trí tuệ','mưu cơ'],                 positions:{mien:['Thìn','Tuất','Mão','Dậu'],vuong:['Tỵ','Thân'],dac:['Tý','Ngọ','Sửu','Mùi'],ham:['Dần','Hợi']} },
  'Thiên Phủ':   { type:'chính tinh', element:'thổ',   yin_yang:'âm',    weight:9,  traits:['kho tàng','tài lộc'],               positions:{mien:['Dần','Thân','Tý','Ngọ'],vuong:['Thìn','Tuất'],dac:['Tỵ','Hợi','Mùi'],binh:['Mão','Dậu','Sửu']} },
  'Thái Âm':     { type:'chính tinh', element:'thủy',  yin_yang:'âm',    weight:9,  traits:['điền trạch','phú quý'],             positions:{mien:['Dậu','Tuất','Hợi'],vuong:['Thân','Tý'],dac:['Sửu','Mùi'],ham:['Dần','Mão','Thìn','Tỵ','Ngọ']} },
  'Tham Lang':   { type:'chính tinh', element:'thủy',  yin_yang:'âm',    weight:8,  traits:['dục vọng','tài lộc'],               positions:{mien:['Sửu','Mùi'],vuong:['Thìn','Tuất'],dac:['Dần','Thân'],ham:['Tỵ','Hợi','Tý','Ngọ','Mão','Dậu']} },
  'Cự Môn':      { type:'chính tinh', element:'thủy',  yin_yang:'âm',    weight:8,  traits:['thị phi','ngôn ngữ'],               positions:{mien:['Mão','Dậu'],vuong:['Tý','Ngọ','Dần'],dac:['Thân','Hợi'],ham:['Thìn','Tuất','Sửu','Mùi','Tỵ']} },
  'Thiên Tướng': { type:'chính tinh', element:'thủy',  yin_yang:'dương', weight:8,  traits:['phò tá','quan lộc'],                positions:{mien:['Dần','Thân'],vuong:['Thìn','Tuất','Tý','Ngọ'],dac:['Sửu','Mùi','Tỵ','Hợi'],ham:['Mão','Dậu']} },
  'Thiên Lương': { type:'chính tinh', element:'mộc',   yin_yang:'âm',    weight:8,  traits:['phúc thọ','giải ách'],              positions:{mien:['Ngọ','Thìn','Tuất'],vuong:['Tý','Mão','Dần','Thân'],dac:['Sửu','Mùi'],ham:['Dậu','Tỵ','Hợi']} },
  'Thất Sát':    { type:'chính tinh', element:'kim',   yin_yang:'dương', weight:9,  traits:['sát phạt','quyền lực'],             positions:{mien:['Dần','Thân','Tý','Ngọ'],vuong:['Tỵ','Hợi'],dac:['Sửu','Mùi'],ham:['Mão','Dậu','Thìn','Tuất']} },
  'Phá Quân':    { type:'chính tinh', element:'thủy',  yin_yang:'âm',    weight:9,  traits:['phá tán','biến động'],              positions:{mien:['Tý','Ngọ'],vuong:['Sửu','Mùi'],dac:['Thìn','Tuất'],ham:['Mão','Dậu','Dần','Thân','Tỵ','Hợi']} },
  'Kình Dương':  { type:'sát tinh',   element:'kim',   yin_yang:'dương', weight:10, traits:['sát phạt','bạo lực'],               positions:{dac:['Thìn','Tuất','Sửu','Mùi'],ham:['Tý','Dần','Mão','Tỵ','Ngọ','Thân','Dậu','Hợi']} },
  'Đà La':       { type:'sát tinh',   element:'kim',   yin_yang:'âm',    weight:10, traits:['tai họa','bệnh tật'],               positions:{dac:['Thìn','Tuất','Sửu','Mùi'],ham:['Tý','Dần','Mão','Tỵ','Ngọ','Thân','Dậu','Hợi']} },
  'Hỏa Tinh':    { type:'sát tinh',   element:'hỏa',   yin_yang:'dương', weight:9,  traits:['bạo phát','tai họa'],               positions:{dac:['Dần','Mão','Thìn','Tỵ','Ngọ'],ham:['Tý','Sửu','Mùi','Thân','Dậu','Tuất','Hợi']} },
  'Linh Tinh':   { type:'sát tinh',   element:'hỏa',   yin_yang:'âm',    weight:9,  traits:['đột biến','tai họa'],               positions:{dac:['Dần','Mão','Thìn','Tỵ','Ngọ'],ham:['Tý','Sửu','Mùi','Thân','Dậu','Tuất','Hợi']} },
  'Kiếp Sát':    { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['đâm chém','tai họa'],     positions:{dac:['Dần','Thân','Tỵ','Hợi'],ham:['Tý','Sửu','Mão','Thìn','Ngọ','Mùi','Dậu','Tuất']} },
  'Lưu Hà':      { type:'sát tinh',   element:'thủy',  weight:9,  traits:['máu huyết','tai nạn'] },
  'Thiên Hình':  { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['hình pháp','dao kéo'],    positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Thiên Riêu':  { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['phong lưu','tình ái'],    positions:{dac:['Dần','Mão','Thân','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Thiên La':    { type:'hung tinh',  element:'thổ',   weight:7,  traits:['giam hãm','rắc rối'] },
  'Địa Võng':    { type:'hung tinh',  element:'thổ',   weight:7,  traits:['giam hãm','rắc rối'] },
  'Thiên Thương':{ type:'hung tinh',  element:'thổ',   weight:7,  traits:['tai họa','tang thương'] },
  'Thiên Sứ':    { type:'hung tinh',  element:'thủy',  weight:7,  traits:['tai họa','tang thương'] },
  'Hóa Lộc':     { type:'hóa tinh',   element:'mộc',   weight:9,  traits:['tài lộc','phúc'] },
  'Hóa Quyền':   { type:'hóa tinh',   element:'mộc',   weight:9,  traits:['quyền lực'] },
  'Hóa Khoa':    { type:'hóa tinh',   element:'mộc',   weight:8,  traits:['trí tuệ','giải ách'] },
  'Hóa Kỵ':      { type:'hóa tinh',   element:'thủy',  weight:9,  traits:['tai họa','thị phi'],      positions:{dac:['Thìn','Tuất','Sửu','Mùi'],ham:['Tý','Dần','Mão','Tỵ','Ngọ','Thân','Dậu','Hợi']} },
  'Lộc Tồn':     { type:'quý tinh',   element:'thổ',   weight:8,  traits:['tài lộc','phúc thọ'] },
  'Thiên Mã':    { type:'phụ tinh',   element:'hỏa',   weight:7,  traits:['di chuyển','thay đổi'],   positions:{dac:['Tỵ','Dần']} },
  'Đào Hoa':     { type:'phụ tinh',   element:'mộc',   weight:6,  traits:['tình duyên'] },
  'Hồng Loan':   { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['hôn nhân'] },
  'Thiên Hỷ':    { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['niềm vui'] },
  'Tả Phụ':      { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['trợ lực','phò tá'] },
  'Hữu Bật':     { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['trợ lực','phò tá'] },
  'Văn Xương':   { type:'phụ tinh',   element:'kim',   weight:7,  traits:['văn học','thi cử'],       positions:{dac:['Thìn','Tuất','Sửu','Mùi','Tỵ','Hợi'],ham:['Dần','Ngọ','Tuất']} },
  'Văn Khúc':    { type:'phụ tinh',   element:'thủy',  weight:7,  traits:['văn học','nghệ thuật'],   positions:{dac:['Hợi','Tuất','Tỵ','Mùi','Sửu','Thìn'],ham:['Thân','Dần','Tý','Ngọ']} },
  'Long Trì':    { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['phúc','quý nhân'] },
  'Phượng Các':  { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['phúc','quý nhân'] },
  'Thiên Khốc':  { type:'bại tinh',   element:'thủy',  weight:7,  traits:['buồn khổ'],               positions:{dac:['Tý','Ngọ','Dần','Thân'],ham:['Sửu','Mão','Thìn','Tỵ','Mùi','Dậu','Tuất','Hợi']} },
  'Thiên Hư':    { type:'bại tinh',   element:'thủy',  weight:7,  traits:['sầu não'],                positions:{dac:['Tý','Ngọ','Dần','Thân'],ham:['Sửu','Mão','Thìn','Tỵ','Mùi','Dậu','Tuất','Hợi']} },
  'Tam Thai':    { type:'phụ tinh',   element:'thủy',  weight:5,  traits:['uy nghi','phúc'] },
  'Bát Tọa':     { type:'phụ tinh',   element:'mộc',   weight:5,  traits:['uy nghi','phúc'] },
  'Ân Quang':    { type:'phụ tinh',   element:'mộc',   weight:6,  traits:['quý nhân','giải hạn'] },
  'Thiên Quý':   { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['quý nhân','giải hạn'] },
  'Thiên Khôi':  { type:'phụ tinh',   element:'hỏa',   weight:7,  traits:['quý nhân'] },
  'Thiên Việt':  { type:'phụ tinh',   element:'hỏa',   weight:7,  traits:['quý nhân'] },
  'Thiên Tài':   { type:'phụ tinh',   element:'thổ',   weight:5,  traits:['điều hòa cát hung'] },
  'Thiên Thọ':   { type:'phúc tinh',  element:'thổ',   weight:6,  traits:['tăng phúc thọ'] },
  'Thiên Giải':  { type:'phúc tinh',  element:'hỏa',   weight:6,  traits:['giải hạn','cứu nguy'] },
  'Địa Giải':    { type:'phúc tinh',  element:'thổ',   weight:6,  traits:['giải hạn','cứu nguy'] },
  'Giải Thần':   { type:'phúc tinh',  element:'mộc',   weight:6,  traits:['giải trừ tai họa'] },
  'Thiên Đức':   { type:'phúc tinh',  element:'hỏa',   weight:6,  traits:['đức độ','giải hạn'] },
  'Nguyệt Đức':  { type:'phúc tinh',  element:'hỏa',   weight:6,  traits:['đức độ','giải hạn'] },
  'Thiên Y':     { type:'phúc tinh',  element:'thủy',  weight:6,  traits:['y dược','cứu bệnh'] },
  'Thiên Quan':  { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['quý nhân'] },
  'Thiên Phúc':  { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['quý nhân'] },
  'Cô Thần':     { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['cô độc'] },
  'Quả Tú':      { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['cô độc'] },
  'Hoa Cái':     { type:'phụ tinh',   element:'kim',   weight:6,  traits:['phú quý','tâm linh'] },
  'Thiên Trù':   { type:'phụ tinh',   element:'thổ',   weight:5,  traits:['ẩm thực','tài lộc'] },
  'Lưu Hà':      { type:'sát tinh',   element:'thủy',  weight:9,  traits:['tai họa','máu'] },
  'Phá Toái':    { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['phá tán','trở ngại'] },
  'Quốc Ấn':     { type:'phụ tinh',   element:'thổ',   weight:7,  traits:['quyền ấn','chức vị'] },
  'Đường Phù':   { type:'phụ tinh',   element:'mộc',   weight:6,  traits:['uy nghi','công danh'] },
  'Thái Tuế':    { type:'tuế_tinh',   element:'hỏa',   weight:7,  traits:['uy quyền','thị phi'] },
  'Thiếu Dương': { type:'tuế_tinh',   element:'hỏa',   weight:5,  traits:['thông minh','may mắn'] },
  'Tang Môn':    { type:'bại tinh',   element:'mộc',   weight:8,  traits:['tang thương'],            positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Thiếu Âm':    { type:'tuế_tinh',   element:'thủy',  weight:5,  traits:['nhân hậu','may mắn'] },
  'Quan Phù':    { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['thị phi','kiện cáo'] },
  'Tử Phù':      { type:'hung tinh',  element:'hỏa',   weight:6,  traits:['tang thương','ngăn trở'] },
  'Tuế Phá':     { type:'tuế_tinh',   element:'hỏa',   weight:7,  traits:['phá tán','ngang ngược'] },
  'Long Đức':    { type:'phúc tinh',  element:'thủy',  weight:6,  traits:['đức độ','giải hạn'] },
  'Bạch Hổ':     { type:'bại tinh',   element:'kim',   weight:8,  traits:['tai nạn'] },
  'Phúc Đức':    { type:'phúc tinh',  element:'thổ',   weight:6,  traits:['đức độ','phúc thọ'] },
  'Điếu Khách':  { type:'bại tinh',   element:'hỏa',   weight:6,  traits:['tai nạn','bệnh tật'] },
  'Trực Phù':    { type:'hung tinh',  element:'hỏa',   weight:6,  traits:['tang thương','ngăn trở'] },
  'Lộc Tồn':     { type:'quý tinh',   element:'thổ',   weight:8,  traits:['tài lộc','phúc thọ'] },
  'Lực Sỹ':      { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['sức mạnh','uy lực'] },
  'Thanh Long':  { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['may mắn','công danh'] },
  'Tiểu Hao':    { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['hao tài'],                positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Tướng Quân':  { type:'phụ tinh',   element:'mộc',   weight:7,  traits:['quyền lực','lãnh đạo'] },
  'Tấu Thư':     { type:'phụ tinh',   element:'kim',   weight:5,  traits:['văn học','đàm luận'] },
  'Phi Liêm':    { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['nhanh nhẹn','biến động'] },
  'Hỷ Thần':     { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['niềm vui','hỷ sự'] },
  'Đại Hao':     { type:'bại tinh',   element:'hỏa',   weight:8,  traits:['hao tài'],                positions:{dac:['Dần','Thân','Mão','Dậu'],ham:['Tý','Sửu','Thìn','Tỵ','Ngọ','Mùi','Tuất','Hợi']} },
  'Địa Không':   { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['hao tổn','bất thành'],       positions:{dac:['Dần','Thân','Tỵ','Hợi'],ham:['Tý','Sửu','Mão','Thìn','Ngọ','Mùi','Dậu','Tuất']} },
  'Địa Kiếp':    { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['kiếp tài','hung hiểm'],      positions:{dac:['Dần','Thân','Tỵ','Hợi'],ham:['Tý','Sửu','Mão','Thìn','Ngọ','Mùi','Dậu','Tuất']} },
  'Bệnh Phù':    { type:'bại tinh',   element:'thổ',   weight:6,  traits:['bệnh tật'] },
  'Phục Binh':   { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['ám hại','lừa đảo'] },
  'Đẩu Quân':    { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['nghiêm nghị','giữ của'] },
  'Bác Sỹ':      { type:'phụ tinh',   element:'thủy',  weight:5,  traits:['trí tuệ'] },
  'Tràng Sinh':  { type:'vòng_trang_sinh', element:'thủy', weight:7, traits:['sinh trưởng'] },
  'Mộc Dục':     { type:'vòng_trang_sinh', element:'thủy', weight:6, traits:['thay đổi'] },
  'Quan Đới':    { type:'vòng_trang_sinh', element:'kim',  weight:7, traits:['danh vọng'] },
  'Lâm Quan':    { type:'vòng_trang_sinh', element:'kim',  weight:7, traits:['thịnh đạt'] },
  'Đế Vượng':    { type:'vòng_trang_sinh', element:'kim',  weight:8, traits:['cực thịnh'] },
  'Suy':         { type:'vòng_trang_sinh', element:'thủy', weight:4, traits:['suy yếu'] },
  'Bệnh':        { type:'vòng_trang_sinh', element:'hỏa',  weight:3, traits:['bệnh tật'] },
  'Tử':          { type:'vòng_trang_sinh', element:'thủy', weight:2, traits:['chết'] },
  'Mộ':          { type:'vòng_trang_sinh', element:'thổ',  weight:3, traits:['chôn cất'] },
  'Tuyệt':       { type:'vòng_trang_sinh', element:'thổ',  weight:2, traits:['bế tắc'] },
  'Thai':        { type:'vòng_trang_sinh', element:'thổ',  weight:5, traits:['sinh'] },
  'Dưỡng':       { type:'vòng_trang_sinh', element:'mộc',  weight:6, traits:['nuôi dưỡng'] },
  'Tuần':        { type:'tuan_triet', weight:5, traits:['hạn chế','trống không'] },
  'Triệt':       { type:'tuan_triet', weight:5, traits:['hạn chế','trống không'] },
  'Thiên Không': { type:'sát tinh',  element:'hỏa', weight:9, traits:['hư vô','phá tán','mất mát bất ngờ'] },
  'Thiên Quan':  { type:'phúc tinh', element:'hỏa', weight:6, traits:['quý nhân','giải hạn','cứu nguy'] },
  'Thiên Phúc':  { type:'phúc tinh', element:'thổ', weight:6, traits:['phúc đức','quý nhân trợ giúp'] },
};

/**
 * Lấy tính chất sao
 */
function getStarData(tenSao) {
  return STAR_DATA[tenSao] || { type:'phụ tinh', weight:5, traits:[] };
}

/**
 * Lấy độ sáng (brightness) của chính tinh tại địa chi
 */
function getStarBrightness(tenSao, diaChi) {
  const data = STAR_DATA[tenSao];
  if (!data || !data.positions) return '';
  if (data.positions.mien?.includes(diaChi))  return 'Miếu';
  if (data.positions.vuong?.includes(diaChi)) return 'Vượng';
  if (data.positions.dac?.includes(diaChi))   return 'Đắc';
  if (data.positions.binh?.includes(diaChi))  return 'Bình';
  if (data.positions.ham?.includes(diaChi))   return 'Hãm';
  return 'Bình';
}

// Export
if (typeof module !== 'undefined') module.exports = { anSaoLaSo, STAR_DATA, getStarData, getStarBrightness };
// ─── MAIN ENGINE ─────────────────────────────────────────────
function anSaoLaSo({ ngayAL, thangAL, namAL, canNam, chiNam, gioIdx, gioitinh, namXem }) {
  const amDuong = ['Giáp','Bính','Mậu','Canh','Nhâm'].includes(canNam) ? 'dương' : 'âm';
  const canChiNam = `${canNam} ${chiNam}`;
  const napAm = NAP_AM[canChiNam] || '?';

  // 1. Cung Mệnh & Thân
  const menhIdx = dinhCungMenh(thangAL, gioIdx);
  const thanIdx = dinhCungThan(thangAL, gioIdx);
  const menhDC = DIA_CHI[menhIdx];
  const thanDC = DIA_CHI[thanIdx];

  // 2. Lập cục
  const { cuc, canMenh } = lapCuc(canNam, menhDC);

  // 3. An sao
  const chinhTinh = anChinhTinh(ngayAL, cuc);
  if (!chinhTinh) throw new Error(`Không tìm thấy bảng Tử Vi ngày ${ngayAL} cục ${cuc}`);

  const thaiTue = anThaiTue(chiNam);
  const locTon = anLocTon(canNam, amDuong, gioitinh);
  const trangSinh = anTrangSinh(cuc, amDuong, gioitinh);
  const locTonIdx = locTon['Lộc Tồn'];
  const lucSat = anLucSat(canNam, chiNam, gioIdx, locTonIdx, amDuong, gioitinh);
  const phuTinh = anPhuTinh(canNam, chiNam, thangAL, ngayAL, gioIdx, locTonIdx);

  // 4. Tứ hóa
  const tuHoa = TU_HOA[canNam] || {};

  // 5. Tuần Triệt
  const tuanTriet = getTuanTriet(canChiNam, canNam);

  // 6. Đại vận
  const daiVans = tinhDaiVan(menhIdx, cuc, amDuong, gioitinh);

  // 7. Tiểu hạn & tuổi xem
  const namSinhDL = namAL; // placeholder
  const tuoiXem = namXem - namSinhDL + 1;
  // Chi năm xem
  const chiNamXem = DIA_CHI[(namXem + 8) % 12];
  const tieuHanIdx = tinhTieuHan(chiNam, gioitinh, tuoiXem);
  // Lưu niên đại hạn: từ cung ĐV hiện tại đếm tới chi năm xem
  const daiVanHienTaiObj = daiVans.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd);
  const ageIndex = daiVanHienTaiObj ? tuoiXem - daiVanHienTaiObj.tuoiStart : 0;
  const luuNienDaiHanIdx = daiVanHienTaiObj
    ? tinhLuuDaiHan(daiVanHienTaiObj.cungIdx, ageIndex, amDuong, gioitinh)
    : 0;
  const daiVanHienTai = daiVans.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd);

  // 8. Build palaces
  const allStars = { ...chinhTinh, ...thaiTue, ...locTon, ...trangSinh, ...lucSat, ...phuTinh };

  // Apply tứ hóa labels
  const tuHoaMap = {}; // starName → hoa
  for (const [hoa, star] of Object.entries(tuHoa)) tuHoaMap[star] = hoa;

  const palaces = DIA_CHI.map((dc, idx) => {
    const offset = mod12(idx - menhIdx);
    const cungName = TEN_CUNG[offset];
    const stars = [];
    for (const [ten, cidx] of Object.entries(allStars)) {
      if (cidx === idx) {
        const hoa = tuHoaMap[ten];
        const nhom = chinhTinh[ten] !== undefined ? 'chinh' :
                thaiTue[ten] !== undefined ? 'thai_tue' :
                locTon[ten] !== undefined ? 'loc_ton' :
                trangSinh[ten] !== undefined ? 'trang_sinh' :
                lucSat[ten] !== undefined ? 'luc_sat' : 'phu';
        const brightness = getStarBrightness(ten, dc);
        stars.push({ ten, hoa: hoa || null, nhom, brightness });
      }
    }
    // Tuần Triệt — mỗi cung chỉ push 1 lần
    const hasTuan = tuanTriet.tuan.includes(idx);
    const hasTriet = tuanTriet.triet.includes(idx);
    if (hasTuan && hasTriet) stars.push({ ten:'Tuần+Triệt', nhom:'tuan_triet', brightness:'' });
    else if (hasTuan)  stars.push({ ten:'Tuần',  nhom:'tuan_triet', brightness:'' });
    else if (hasTriet) stars.push({ ten:'Triệt', nhom:'tuan_triet', brightness:'' });

    // Đại vận range
    const van = daiVans[offset];

    return {
      idx, diaChi: dc, cungName,
      isMenh: idx === menhIdx,
      isThan: idx === thanIdx,
      isBodyPalace: idx === thanIdx,
      stars,
      majorStars: stars.filter(s=>s.nhom==='chinh'),
      minorStars: stars.filter(s=>['loc_ton','luc_sat','phu'].includes(s.nhom)),
      adjectiveStars: stars.filter(s=>['thai_tue','trang_sinh','tuan_triet'].includes(s.nhom)),
      decadal: van ? { range: [van.tuoiStart, van.tuoiEnd] } : null,
      earthlyBranch: dc,
      name: cungName,
    };
  });

  // Gắn tam phương tứ chính vào từng cung
  for (const p of palaces) {
    const tp = TAM_PHUONG_TU_CHINH[p.cungName];
    if (tp) {
      p.tamHopCungs = tp.tamHop
        .map(name => palaces.find(x => x.cungName === name))
        .filter(Boolean);
      p.xungChieuCung = palaces.find(x => x.cungName === tp.xung) || null;
      // Tất cả sao trong 4 cung (chính + 2 tam hợp + 1 xung)
      p.tuChinhStars = [p, ...p.tamHopCungs, p.xungChieuCung]
        .filter(Boolean)
        .flatMap(c => c.majorStars);
    }
  }

  // Vòng Thái Tuế tại cung Mệnh và cung Thân — tính bằng offset (chi năm SINH)
  const menhP = palaces.find(p => p.isMenh);
  const thanP  = palaces.find(p => p.diaChi === thanDC);
  const startIdxTT = DIA_CHI.indexOf(chiNam);

  if (menhP) {
    const offset = ((DIA_CHI.indexOf(menhP.diaChi) - startIdxTT) % 12 + 12) % 12;
    const sao = THAI_TUE_SEQ[offset];
    const nhom = THAI_TUE_NHOM[sao];
    if (nhom !== undefined) {
      menhP.thaiTueNhom = { sao, nhom, ...THAI_TUE_NHOM_Y_NGHIA[nhom] };
    }
  }

  // Thân cung (cung an Thân, không phải địa chi Thân) trong vòng Thái Tuế
  if (thanP) {
    const offset = ((DIA_CHI.indexOf(thanP.diaChi) - startIdxTT) % 12 + 12) % 12;
    const sao = THAI_TUE_SEQ[offset];
    const nhom = THAI_TUE_NHOM[sao];
    if (nhom !== undefined) {
      thanP.thaiTueNhom = { sao, nhom, ...THAI_TUE_NHOM_Y_NGHIA[nhom] };
    }
  }

  // Vị trí cung Mệnh trong vòng Thái Tuế
  const menhPalaceRef = palaces.find(p => p.isMenh);
  let menhThaiTue = null;
  if (menhPalaceRef) {
    const thaiTueSaoTaiMenh = menhPalaceRef.stars.find(s => s.nhom === 'thai_tue');
    if (thaiTueSaoTaiMenh) {
      const info = THAI_TUE_NHOM[thaiTueSaoTaiMenh.ten];
      if (info) {
        menhThaiTue = {
          sao: thaiTueSaoTaiMenh.ten,
          nhom: info.nhom,
          y_nghia: info.y_nghia,
        };
      }
    }
  }

  // Tính scoring cho 9 đại vận
  const napAmHanh = getNapAm(canChiNam);
  const daiVansScored = tinhScoringAllDaiVan(daiVans, palaces, canChiNam, chiNam, napAmHanh, chiNam);

  return {
    canChiNam, napAm, amDuong, cuc, canMenh,
    menhDC, thanDC, menhIdx, thanIdx,
    napAmHanh,
    fiveElementsClass: cuc,
    earthlyBranchOfSoulPalace: menhDC,
    earthlyBranchOfBodyPalace: thanDC,
    chineseDate: canChiNam,
    palaces,
    menhThaiTue,
    daiVans: daiVansScored,
    daiVanHienTai: daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd) || daiVanHienTai,
    tieuHanIdx,
    tuoiXem,
    chiNamXem,
    luuNienDaiHanIdx,
    cachCuc: (() => {
      const _ls = { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam,
        daiVans: daiVansScored,
        daiVanHienTai: daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd),
      };
      return phanTichCachCuc(_ls, gioitinh);
    })(),
    cachCucTungCung: phanTichCungYNghia(
      { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam },
      gioitinh, gioIdx, canNam, chiNam, tuoiXem
    ),
    cungScores: tinhCungScores(
      {
        palaces,
        cachCuc: (() => {
          const _ls = { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam,
            daiVans: daiVansScored,
            daiVanHienTai: daiVansScored.find(v => tuoiXem >= v.tuoiStart && tuoiXem <= v.tuoiEnd),
          };
          return phanTichCachCuc(_ls, gioitinh);
        })(),
        cachCucTungCung: phanTichCungYNghia(
          { palaces, menhDC, thanDC, amDuong, napAmHanh, chiNam },
          gioitinh, gioIdx, canNam, chiNam, tuoiXem
        ),
      },
      napAmHanh, tuoiXem
    ),
    tieuVanScores: tinhTieuVanScores(
      { palaces, daiVans: daiVansScored },
      gioitinh, amDuong, chiNam, namSinhDL
    ),
  };
}


// ─── TÍNH CHẤT SAO ───────────────────────────────────────────

// Export

// ================================================================
// PHÂN TÍCH CUNG Ý NGHĨA — Rule-based module
// Gắn vào anSaoLaSo, chạy sau an sao
// Output: ls.cachCucTungCung[] → feed vào formatLaSoV2 → Claude
// ================================================================

function phanTichCungYNghia(ls, gioitinh, gioIdx, canNam, chiNam, tuoiXem) {
  const { palaces } = ls;

  // ─── HELPERS ──────────────────────────────────────────────────

  const DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  const TU_MO   = ['Thìn','Tuất','Sửu','Mùi'];
  const TU_SINH = ['Dần','Thân','Tỵ','Hợi'];

  const SAT_TINH = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
  const CAT_TINH = ['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật',
                    'Hóa Khoa','Hóa Quyền','Hóa Lộc','Thiên Phủ','Tử Vi'];

  // Normalize tên sao (handle aliases)
  const ALIAS = {
    'Tả Phụ':'Tả Phù','Hữu Bật':'Hữu Bật',
    'Văn Xương':'Văn Xương','Văn Khúc':'Văn Khúc',
  };
  function normName(n) { return ALIAS[n] || n; }

  // Lấy tất cả sao trong cung (tên chuẩn)
  function getAllStars(p) {
    return p.stars.map(s => normName(s.ten));
  }

  // Check sao có trong cung không (đồng cung)
  function hasSao(p, name) {
    return getAllStars(p).includes(normName(name));
  }

  // Check có ít nhất 1 trong nhóm sao
  function hasAny(p, names) {
    const allS = getAllStars(p);
    return names.some(n => allS.includes(normName(n)));
  }

  // Brightness của sao
  function getBrightness(p, starName) {
    const s = p.stars.find(s => normName(s.ten) === normName(starName));
    return s ? s.brightness : null;
  }

  // Check sao sáng (Miếu/Vượng/Đắc)
  function isSang(p, starName) {
    return ['Miếu','Vượng','Đắc'].includes(getBrightness(p, starName));
  }

  // Check sao hãm
  function isHam(p, starName) {
    return getBrightness(p, starName) === 'Hãm';
  }

  // Check có sát tinh
  function hasSatTinh(p) {
    return SAT_TINH.some(s => hasSao(p, s));
  }

  // Check có cát tinh
  function hasCatTinh(p) {
    return CAT_TINH.some(s => hasSao(p, s));
  }

  // Địa chi của cung
  function getDC(p) { return p.diaChi; }

  // Check địa chi
  function inDC(p, dcs) { return dcs.includes(getDC(p)); }

  // Check đơn thủ (1 chính tinh)
  function isDonThu(p) {
    return p.majorStars.length === 1;
  }

  // Check đồng cung nhiều sao
  function dongCung(p, names) {
    return names.every(n => hasSao(p, n));
  }

  // Check có bất kỳ sao trong nhóm (tam phương tứ chính)
  function hasAnyInTPTC(p, names) {
    const allS = [p, ...(p.tamHopCungs||[]), p.xungChieuCung]
      .filter(Boolean).flatMap(c => getAllStars(c));
    return names.some(n => allS.includes(normName(n)));
  }

  // Sinh ban đêm: gioIdx 0-5 = Tý(0),Sửu(1),Dần(2) là ban đêm
  // Đêm: Tý(0),Sửu(1),Hợi(11),Tuất(10) → gioIdx 0,1,10,11
  function isSinhDem() {
    return [0,1,10,11].includes(gioIdx);
  }

  // Giáp: 2 cung kề 2 bên đều có sao X
  function giapCung(p, name) {
    const idx = p.idx;
    const left  = palaces[(idx - 1 + 12) % 12];
    const right = palaces[(idx + 1) % 12];
    return hasSao(left, name) || hasSao(right, name);
  }

  // Vô chính diệu
  function isVoChinhDieu(p) {
    return p.majorStars.length === 0;
  }

  // Lấy cung by name
  function getCungByName(name) {
    return palaces.find(p => p.cungName === name);
  }

  // Nhật Nguyệt sáng/mờ
  function nhatSang()   { const p2=getCungByName('Phụ Mẫu'); return p2 && isSang(p2,'Thái Dương'); }
  function nguyetSang() { const p2=getCungByName('Phụ Mẫu'); return p2 && isSang(p2,'Thái Âm'); }

  // ─── TUẦN / TRIỆT HELPERS ────────────────────────────────────

  // Check cung có Tuần không
  function hasTuan(p) {
    return p.stars.some(s => s.ten === 'Tuần');
  }
  // Check cung có Triệt không
  function hasTriet(p) {
    return p.stars.some(s => s.ten === 'Triệt');
  }

  // Tuần/Triệt có đang active không theo tuổi xem
  // tuoiXem = 0 → không xét active (bản mệnh), chỉ dùng cho cung đại vận
  function tuanActive(tuoiStart, tuoiEnd) {
    // Tuần tác dụng sau 30 tuổi
    if (!tuoiXem) return true; // bản mệnh: luôn note
    return tuoiXem > 30;
  }
  function trietActive(tuoiStart, tuoiEnd) {
    // Triệt tác dụng 0-30 tuổi
    if (!tuoiXem) return true; // bản mệnh: luôn note
    return tuoiXem <= 30;
  }

  // Annotation Tuần/Triệt cho 1 cung (bản mệnh — không có tuổi đại vận)
  function tuanTrietNote(p, tuoiStart, tuoiEnd) {
    const notes = [];
    const dc = getDC(p);
    const isVCD = isVoChinhDieu(p);

    if (hasTuan(p)) {
      const active = tuanActive(tuoiStart, tuoiEnd);
      if (dc === 'Tỵ' || dc === 'Ngọ') {
        // Tuần lâm hỏa địa — đặc biệt tốt
        notes.push(`Tuần lâm hỏa địa (${dc})${active ? '' : ' [chưa tác dụng — dưới 30 tuổi]'}: giảm tính xấu của sao xấu, tăng tính tốt của sao tốt trong cung`);
      } else {
        notes.push(`Tuần án ngữ${active ? '' : ' [chưa tác dụng — dưới 30 tuổi]'}: giảm tính chất tốt/xấu các sao trong cung 50%${active ? ' (đang tác dụng)' : ''}`);
      }
      if (isVCD) notes.push('Vô chính diệu có Tuần: rất tốt — Tuần giải trừ cung trống');
    }

    if (hasTriet(p)) {
      const active = trietActive(tuoiStart, tuoiEnd);
      if (dc === 'Thân' || dc === 'Dậu') {
        // Triệt đáo kim cung — đặc biệt tốt
        notes.push(`Triệt đáo kim cung (${dc})${active ? '' : ' [hết tác dụng — trên 30 tuổi]'}: giảm tính xấu của sao xấu, tăng tính tốt của sao tốt trong cung`);
      } else {
        notes.push(`Triệt án ngữ${active ? '' : ' [hết tác dụng — trên 30 tuổi]'}: giảm tính chất tốt/xấu các sao trong cung 80%${active ? ' (đang tác dụng)' : ''}`);
      }
      if (isVCD) notes.push('Vô chính diệu có Triệt: rất tốt — Triệt giải trừ cung trống');
    }

    return notes;
  }

  // ──────────────────────────────────────────────────────────────

  // Collect results
  const results = {};

  // ─── CUNG MỆNH ────────────────────────────────────────────────
  (function() {
    const p = palaces.find(x => x.isMenh);
    if (!p) return;
    const out = [];

    // ── Tử Vi ──
    if (hasSao(p,'Tử Vi')) {
      if (isSang(p,'Tử Vi')) out.push('Tử Vi sáng: thân hình đẫy đà, thông minh, phúc thọ');
      if (getBrightness(p,'Tử Vi')==='Bình hòa') out.push('Tử Vi bình hòa: cuộc đời ổn định, sống lâu');
      if (hasAny(p,['Tuần','Triệt'])) out.push('Tử Vi gặp Tuần/Triệt: thiếu thời khó khăn, dễ bệnh');
      if (hasAny(p,['Địa Không','Địa Kiếp'])) out.push('Tử Vi gặp Không/Kiếp: lao tâm, công danh trắc trở');
      if (hasSao(p,'Tham Lang') && inDC(p,['Mão','Dậu'])) out.push('Tử Vi Tham tại Mão/Dậu: yếm thế, thiên hướng tu hành');
      if (hasAny(p,['Văn Xương','Văn Khúc'])) out.push('Tử Vi gặp Xương/Khúc: giàu sang');
      if (dongCung(p,['Tử Vi','Tả Phù','Hữu Bật'])||dongCung(p,['Tử Vi','Tả Phù'])||dongCung(p,['Tử Vi','Hữu Bật'])) out.push('Tử Vi Tả/Hữu: uy quyền lớn');
      if (hasAny(p,['Hóa Khoa','Hóa Quyền','Hóa Lộc'])) out.push('Tử Vi gặp Khoa/Quyền/Lộc: phú quý');
    }

    // ── Tử Phủ ──
    if (hasSao(p,'Tử Vi') && hasSao(p,'Thiên Phủ')) {
      if (!hasSatTinh(p)) out.push('Tử Phủ đồng cung vô sát: phú quý hưởng phúc trọn đời');
      if (hasSao(p,'Kình Dương')) out.push('Tử Phủ gặp Kình: giàu do kinh doanh');
    }

    // ── Liêm Trinh ──
    if (hasSao(p,'Liêm Trinh')) {
      if (isSang(p,'Liêm Trinh')) out.push('Liêm Trinh sáng: liêm khiết, thẳng thắn, giàu sang, sống lâu');
      if (isHam(p,'Liêm Trinh')) {
        out.push('Liêm Trinh hãm: vất vả, bệnh tật, dễ gặp tai nạn');
        if (hasSatTinh(p)) out.push('Liêm Trinh hãm + sát: cùng khốn, cô đơn, nhiều tai nạn');
        if (hasAny(p,['Phá Quân','Hỏa Tinh'])) out.push('Liêm Phá Hỏa hãm: tự tử hoặc chết thê thảm [hung nặng]');
      }
      if (hasAny(p,['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh'])) out.push('Liêm Trinh gặp tứ sát: dễ tù tội, ám sát');
      if (hasSao(p,'Bạch Hổ')) out.push('Liêm Trinh Bạch Hổ: khó tránh hình ngục');
      if (hasSao(p,'Thiên Tướng')) out.push('Liêm Trinh Thiên Tướng: dũng mãnh');
      if (dongCung(p,['Liêm Trinh','Văn Khúc'])) out.push('Liêm Trinh Văn Khúc: bôn ba, di chuyển nhiều');
      if (inDC(p,['Thân','Mùi']) && !hasSatTinh(p)) out.push('Liêm Trinh tại Thân/Mùi vô sát: phú quý lớn');
    }

    // ── Thiên Đồng ──
    if (hasSao(p,'Thiên Đồng')) {
      if (isSang(p,'Thiên Đồng')) out.push('Thiên Đồng sáng: thông minh, nhân hậu, giàu sang, sống lâu');
      if (isHam(p,'Thiên Đồng')) {
        out.push('Thiên Đồng hãm: vất vả, hay thay đổi, dễ thị phi');
        if (hasSatTinh(p)) out.push('Thiên Đồng hãm + sát: lang bạt, bệnh tật, tai nạn, giảm thọ');
        if (hasCatTinh(p)) out.push('Thiên Đồng hãm + cát: vẫn có công danh tiền tài');
      }
      if (hasSatTinh(p)) out.push('Thiên Đồng + sát: lao tâm, sức khỏe kém, bệnh mắt/tiêu hóa');
      if (dongCung(p,['Thiên Đồng','Thiên Lương'])) out.push('Đồng Lương đồng cung: phú quý, phúc thọ');
      if (hasCatTinh(p) && !isHam(p,'Thiên Đồng')) out.push('Thiên Đồng + cát tinh: phú quý, uy danh');
      if (canNam === 'Đinh') {
        if (inDC(p,['Tuất'])) out.push('Thiên Đồng tại Tuất tuổi Đinh: quý hiển');
        if (isHam(p,'Thiên Đồng') && inDC(p,['Ngọ','Tuất'])) out.push('Thiên Đồng hãm Ngọ/Tuất tuổi Đinh: khá giả');
      }
    }

    // ── Vũ Khúc ──
    if (hasSao(p,'Vũ Khúc')) {
      if (isSang(p,'Vũ Khúc')) out.push('Vũ Khúc sáng: thông minh, có chí, giỏi kinh doanh, giàu sang, sống lâu');
      if (inDC(p,['Sửu','Mùi']) && isSang(p,'Vũ Khúc')) out.push('Vũ Khúc miếu Sửu/Mùi: tiền vận trắc trở, hậu vận giàu');
      if (isHam(p,'Vũ Khúc')) {
        out.push('Vũ Khúc hãm: khó khăn, tham lận, ly tổ, giảm thọ');
        if (hasSatTinh(p)) out.push('Vũ Khúc hãm + sát: cùng khổ, tai nạn, tù tội, yểu');
        if (hasCatTinh(p)) out.push('Vũ Khúc hãm + cát: chuyển kinh doanh/kỹ nghệ, khá giả');
        if (hasAny(p,['Địa Kiếp','Kình Dương'])) out.push('Vũ Khúc hãm + Kiếp/Kình: nguy hiểm vì tiền, hung ác');
      }
      if (dongCung(p,['Vũ Khúc','Phá Quân'])) {
        out.push('Vũ Phá: phá sản, ly tổ, lao khổ');
        if (hasAny(p,['Văn Xương','Văn Khúc'])) out.push('Vũ Phá + Xương/Khúc: thông minh, khéo tay, kỹ nghệ');
      }
      if (hasSao(p,'Văn Khúc')) out.push('Vũ Khúc + Văn Khúc: học rộng, đa tài');
      if (isSang(p,'Vũ Khúc') && hasAny(p,['Thiên Khôi','Thiên Việt'])) out.push('Vũ Khúc sáng + Khôi/Việt: quan tài chính');
      if (hasAny(p,['Hóa Lộc','Thiên Mã'])) out.push('Vũ Khúc + Lộc Mã: lập nghiệp xa, giàu');
      if (inDC(p,['Dần','Thân']) && hasAny(p,['Hóa Lộc','Hóa Quyền'])) out.push('Vũ Khúc Dần/Thân + Lộc/Quyền: rất giàu');
    }

    // ── Thái Dương ──
    if (hasSao(p,'Thái Dương')) {
      if (isSang(p,'Thái Dương')) {
        out.push('Thái Dương sáng: thông minh, uy nghi, giàu sang, sống lâu');
        if (isSinhDem()) out.push('Thái Dương sáng nhưng sinh ban đêm: kém tốt đẹp');
      }
      if (isHam(p,'Thái Dương')) {
        out.push('Thái Dương hãm: yếu, bệnh tật, khó khăn');
        if (hasSatTinh(p)) out.push('Thái Dương hãm + sát: cùng khốn, bệnh nặng, dễ mù, yểu');
        if (hasCatTinh(p)) out.push('Thái Dương hãm + cát: có công danh, tăng thọ');
        if (inDC(p,['Hợi','Tý'])) out.push('Thái Dương hãm Hợi/Tý: thanh cao, thích triết lý');
      }
      if (hasSao(p,'Thiên Hình')) out.push('Thái Dương + Thiên Hình: mắt có tật');
      if (inDC(p,['Ngọ'])) out.push('Thái Dương tại Ngọ: rất sáng, phú quý');
      if (hasCatTinh(p) && !isHam(p,'Thái Dương')) out.push('Thái Dương + nhiều cát tinh: phú quý, uy quyền, danh tiếng');
      if (hasAny(p,['Tuần','Triệt'])) {
        if (isSang(p,'Thái Dương')) out.push('Thái Dương sáng + Tuần/Triệt: sức khỏe kém, công danh khó');
        else out.push('Thái Dương đắc + Tuần/Triệt: có bệnh nhưng vẫn phú quý');
      }
    }

    // ── Thiên Cơ ──
    if (hasSao(p,'Thiên Cơ')) {
      if (isSang(p,'Thiên Cơ')) out.push('Thiên Cơ sáng: thông minh, mưu trí, giàu sang, sống lâu');
      if (isHam(p,'Thiên Cơ')) {
        out.push('Thiên Cơ hãm: gian xảo, vất vả, buôn bán');
        if (hasSatTinh(p)) out.push('Thiên Cơ hãm + sát: tàn tật, tai họa, yểu');
      }
      if (hasAny(p,['Tuần','Triệt'])) out.push('Thiên Cơ gặp Tuần/Triệt: ly tổ, vất vả, tai nạn');
      if (dongCung(p,['Thiên Cơ','Thiên Lương']) && inDC(p,['Thìn','Tuất'])) out.push('Cơ Lương Thìn/Tuất: phúc thọ, nhân hậu');
      if (inDC(p,['Mão','Dậu']) && hasSao(p,'Song Hao')) out.push('Thiên Cơ Mão/Dậu + Song Hao: đa tài, phú quý');
    }

    // ── Thiên Phủ ──
    if (hasSao(p,'Thiên Phủ')) {
      out.push('Thiên Phủ thủ Mệnh: nhân hậu, giàu sang, sống lâu');
      if (hasAny(p,['Tuần','Triệt','Địa Không','Địa Kiếp'])) out.push('Thiên Phủ + Tuần/Triệt/Không/Kiếp: túng thiếu, giảm thọ');
      if (hasSatTinh(p)) out.push('Thiên Phủ + sát: gian trá');
      if (hasSao(p,'Thiên Tướng')) out.push('Thiên Phủ + Thiên Tướng: có chức quyền, sung túc');
      if (hasCatTinh(p)) out.push('Thiên Phủ + cát tinh: phú quý, sống lâu');
    }

    // ── Thái Âm ──
    if (hasSao(p,'Thái Âm')) {
      if (isSang(p,'Thái Âm')) {
        out.push('Thái Âm sáng: thông minh, nhân hậu, giàu sang, sống lâu');
        if (isSinhDem()) out.push('Thái Âm sáng + sinh đêm: rất tốt, toàn mỹ');
        else out.push('Thái Âm sáng + sinh ngày: kém tốt');
      }
      if (isHam(p,'Thái Âm')) {
        out.push('Thái Âm hãm: vất vả, bệnh tật, ly tổ');
        if (hasSatTinh(p)) out.push('Thái Âm hãm + sát: cùng khổ, bệnh nặng, dễ mù, yểu');
      }
      if (hasSao(p,'Thiên Hình')) out.push('Thái Âm + Thiên Hình: mắt có tật');
      if (inDC(p,['Hợi'])) out.push('Thái Âm tại Hợi: quyền lớn, phú quý');
      if (getBrightness(p,'Thái Âm')==='Đắc' && hasSao(p,'Hóa Kỵ') && !hasSatTinh(p)) out.push('Thái Âm đắc + Kỵ vô sát: phú quý lớn');
    }

    // ── Tham Lang ──
    if (hasSao(p,'Tham Lang')) {
      if (isSang(p,'Tham Lang')) out.push('Tham Lang sáng: giàu sang, sống lâu — tiền vận vất vả hậu vận giàu');
      if (isHam(p,'Tham Lang')) {
        out.push('Tham Lang hãm: gian tham, vất vả, nhiều dục');
        if (hasSatTinh(p)) out.push('Tham Lang hãm + sát: cùng khổ, bệnh tật, tai họa, yểu');
        if (inDC(p,['Mão','Dậu'])) out.push('Tham Lang hãm Mão/Dậu: yếm thế, nên tu hành');
      }
      if (isSang(p,'Tham Lang') && hasAny(p,['Hỏa Tinh','Linh Tinh'])) out.push('Tham Lang sáng + Hỏa/Linh: rất giàu, có quyền');
      if (dongCung(p,['Tham Lang','Liêm Trinh'])) out.push('Liêm Tham đồng cung: phong lưu, dâm');
      if (inDC(p,['Tỵ','Hợi'])) out.push('Tham Lang tại Tỵ/Hợi: dễ tù tội');
      if (hasAny(p,['Hóa Kỵ','Thiên Riêu'])) out.push('Tham Lang + Kỵ/Riêu: dễ tù tội hoặc tai nạn sông nước');
      if (dongCung(p,['Tham Lang','Vũ Khúc']) && inDC(p,['Sửu','Mùi'])) out.push('Tham Vũ Sửu/Mùi: tiền nghèo hậu giàu');
    }

    // ── Cự Môn ──
    if (hasSao(p,'Cự Môn')) {
      if (isSang(p,'Cự Môn')) out.push('Cự Môn sáng: thông minh, giỏi lý luận, giàu sang, sống lâu');
      if (isHam(p,'Cự Môn')) {
        out.push('Cự Môn hãm: gian quyệt, thị phi, vất vả');
        if (hasSatTinh(p)) out.push('Cự Môn hãm + sát: cùng khổ, tù tội, tai nạn nặng, yểu');
      }
      if (hasSatTinh(p)) out.push('Cự Môn + sát: thị phi, kiện cáo, bệnh tật');
      if (hasSao(p,'Hóa Kỵ')) out.push('Cự Môn + Kỵ: tai nạn sông nước hoặc xe cộ');
      if (inDC(p,['Tý','Ngọ'])) out.push('Cự Môn Tý/Ngọ: học rộng tài cao');
      if (dongCung(p,['Cự Môn','Thái Dương'])) out.push('Nhật Cự đồng cung: gia đình danh giá, có phúc');
      if (hasAny(p,['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Hóa Khoa'])) out.push('Cự Môn + văn tinh: văn tài, hùng biện, hợp chính trị/tư pháp');
    }

    // ── Thiên Lương ──
    if (hasSao(p,'Thiên Lương')) {
      out.push('Thiên Lương thủ Mệnh: khoan hòa, sống lâu');
      if (isSang(p,'Thiên Lương')) out.push('Thiên Lương sáng: thông minh, nhân hậu, giàu sang');
      if (isHam(p,'Thiên Lương')) {
        out.push('Thiên Lương hãm: bôn ba, bất ổn, dễ gặp tai họa');
        if (inDC(p,['Tỵ','Hợi'])) out.push('Thiên Lương hãm Tỵ/Hợi: kém thông minh, ăn chơi, phiêu bạt');
        if (hasAny(p,['Hỏa Tinh','Linh Tinh'])) out.push('Thiên Lương hãm + Hỏa/Linh: tật bệnh, cùng khổ, yểu');
      }
      if (hasSao(p,'Thiên Mã')) out.push('Thiên Lương + Thiên Mã: phiêu bạt, thay đổi liên tục');
      if (inDC(p,['Ngọ'])) out.push('Thiên Lương tại Ngọ: quý hiển, có chức quyền');
    }

    // ── Thất Sát ──
    if (hasSao(p,'Thất Sát')) {
      out.push('Thất Sát thủ Mệnh: nóng nảy, cương, thân hình thô');
      if (isSang(p,'Thất Sát')) out.push('Thất Sát sáng: dũng mãnh, thông minh, giàu sang nhưng thăng trầm');
      if (inDC(p,['Dần','Thân']) && isSang(p,'Thất Sát')) out.push('Thất Sát miếu Dần/Thân: quý hiển');
      if (isHam(p,'Thất Sát')) {
        out.push('Thất Sát hãm: hung bạo, gian quyệt, nghề thấp, khó sống lâu');
        if (hasSao(p,'Thiên Hình')) out.push('Thất Sát hãm + Hình: tù tội hoặc chết vì tai nạn');
        if (hasSatTinh(p)) out.push('Thất Sát hãm + sát: cùng khổ, tù tội, tai nạn, yểu tử');
      }
      if (hasAny(p,['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh'])) out.push('Thất Sát + tứ sát: tật lưng, nguy hiểm, dễ chết trận');
      if (hasSao(p,'Thiên Hình') && !isHam(p,'Thất Sát')) out.push('Thất Sát + Thiên Hình: có tài quân sự, uy võ');
      if (dongCung(p,['Thất Sát','Liêm Trinh']) && inDC(p,['Sửu','Mùi'])) out.push('Thất Sát Liêm Trinh Sửu/Mùi: chết vì tai nạn [đại hung]');
    }

    // ── Phá Quân ──
    if (hasSao(p,'Phá Quân')) {
      out.push('Phá Quân thủ Mệnh: cương, hiếu thắng, thích biến động');
      if (isSang(p,'Phá Quân')) {
        out.push('Phá Quân sáng: thông minh, dũng mãnh, giàu sang nhưng thăng trầm');
        if (hasAny(p,['Văn Xương','Văn Khúc','Tả Phù','Hữu Bật','Hóa Khoa','Hóa Quyền','Hóa Lộc','Kình Dương','Đà La','Địa Không','Địa Kiếp'])) out.push('Phá Quân sáng + cát/sát: đại phú quý, uy quyền lớn');
      }
      if (isHam(p,'Phá Quân')) {
        out.push('Phá Quân hãm: hung ác, vất vả, nhiều tai ách');
        if (hasSatTinh(p)) out.push('Phá Quân hãm + sát nặng: cùng khổ, tàn tật, tù tội, yểu tử');
      }
      if (isDonThu(p)) out.push('Phá Quân độc thủ: không sáng suốt, dễ bị nịnh');
      if (inDC(p,['Tý','Ngọ'])) out.push('Phá Quân tại Tý/Ngọ: phú quý nhưng cô độc, khắc thân');
      if (dongCung(p,['Phá Quân','Kình Dương']) && inDC(p,['Mão','Dậu'])) out.push('Phá Quân Kình Mão/Dậu: độc ác [đại hung]');
      if (inDC(p,TU_MO)) out.push('Phá Quân tại Tứ Mộ: cương quả, gặp thời loạn phát');
    }

    // ── Phụ tinh: Văn Xương / Văn Khúc ──
    if (hasAny(p,['Văn Xương','Văn Khúc'])) {
      out.push('Xương/Khúc thủ Mệnh: diện mạo thanh tú, thông minh, năng khiếu văn chương/âm nhạc');
      if (isSang(p,'Văn Xương')||isSang(p,'Văn Khúc')) out.push('Xương/Khúc đắc địa: tài văn học, uy danh, sống lâu');
      if (hasAny(p,['Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'])||hasAny(p,['Tuần','Triệt'])) out.push('Xương/Khúc + sát/Tuần/Triệt: công danh trắc trở, tai họa, tù tội');
      if (dongCung(p,['Phá Quân','Văn Xương'])||dongCung(p,['Phá Quân','Văn Khúc'])) out.push('Xương/Khúc + Phá Quân: đời nhiều khổ tâm, dễ bị bắt bớ');
      const giapMenh = palaces[(p.idx-1+12)%12].stars.concat(palaces[(p.idx+1)%12].stars).map(s=>s.ten);
      if (giapMenh.includes('Văn Xương')||giapMenh.includes('Văn Khúc')) out.push('Xương/Khúc giáp Mệnh: rất thông minh, được quý mến, gặp quý nhân');
    }

    // ── Thiên Khôi / Thiên Việt ──
    if (hasAny(p,['Thiên Khôi','Thiên Việt'])) {
      out.push('Khôi/Việt thủ Mệnh: thường trưởng tử, diện mạo thanh tú, thông minh, cao thượng');
      if (hasCatTinh(p)) out.push('Khôi/Việt + cát tinh: tài văn võ, lãnh đạo giỏi, sớm hiển đạt, phú quý sống lâu');
      if (hasSatTinh(p)||hasAny(p,['Tuần','Triệt'])) out.push('Khôi/Việt + sát/Tuần/Triệt: công danh trắc trở, tai họa, giảm thọ');
    }

    // ── Lộc Tồn ──
    if (hasSao(p,'Lộc Tồn')) {
      out.push('Lộc Tồn thủ Mệnh: thông minh, nhân hậu, tài tổ chức, giàu sang, được kính trọng, sống lâu');
      if (hasCatTinh(p)) out.push('Lộc Tồn + cát tinh: phú quý trọn đời, uy quyền, tăng thọ');
      if (hasAny(p,['Địa Không','Địa Kiếp','Đại Hao','Hóa Kỵ'])) out.push('Lộc Tồn + hung tinh: ích kỷ, ly tổ, công danh trắc trở, dễ mất tiền');
      if (hasSao(p,'Hóa Lộc')) out.push('Song Lộc thủ Mệnh: giàu sang trọn đời, quyền lực, lãnh đạo');
      if (hasSao(p,'Thiên Mã')) out.push('Lộc Mã giao trì: dễ kiếm tiền, giàu sang, được yêu mến');
    }

    // ── Tả Phù / Hữu Bật ──
    if (hasAny(p,['Tả Phù','Hữu Bật'])) {
      out.push('Tả/Hữu thủ Mệnh: nhân hậu, khoan hòa, thẳng thắn, có mưu trí — sớm ly tổ tự lập');
      if (hasCatTinh(p)) out.push('Tả/Hữu + cát tinh: phú quý trọn đời, danh tiếng, tăng thọ');
      if (hasSatTinh(p)) out.push('Tả/Hữu + hung tinh: nhiều rỗ sẹo, gian trá, cô đơn, tai họa');
      if (inDC(p,TU_MO)) out.push('Tả/Hữu tại Tứ Mộ: rất quý hiển');
    }

    // ── Kình Dương ──
    if (hasSao(p,'Kình Dương')) {
      if (isSang(p,'Kình Dương')) out.push('Kình Dương đắc: cương cường, dũng mãnh, quyết đoán, nhiều mưu');
      if (isHam(p,'Kình Dương')) out.push('Kình Dương hãm: hung bạo, liều lĩnh, bướng bỉnh, gian trá');
      if (inDC(p,TU_MO) && hasCatTinh(p)) out.push('Kình Dương Tứ Mộ + cát: phú quý, danh tiếng');
      if (hasAny(p,['Đà La','Hỏa Tinh','Linh Tinh'])) out.push('Kình Đà Hỏa Linh hội: tật lưng, cô độc, nguy hiểm');
      if (inDC(p,['Ngọ'])) out.push('Kình Dương tại Ngọ (Mã đầu đới kiếm): nguy hiểm lớn — nếu cát: võ nghiệp hiển đạt');
      if (gioitinh === 'nu') {
        if (isSang(p,'Kình Dương')) out.push('Nữ mệnh Kình đắc: giàu có, vượng phu ích tử');
        else out.push('Nữ mệnh Kình hãm: hạ tiện, dâm dật, khắc chồng con');
      } else {
        if (isSang(p,'Kình Dương')) out.push('Nam mệnh Kình đắc: hợp quân sự, uy quyền lớn');
        else out.push('Nam mệnh Kình hãm: nhiều tai họa, đời khổ, giảm thọ');
      }
    }

    // ── Đà La ──
    if (hasSao(p,'Đà La')) {
      if (isSang(p,'Đà La')) out.push('Đà La đắc: can đảm, thâm trầm, có mưu cơ');
      if (isHam(p,'Đà La')) {
        out.push('Đà La hãm: hung bạo, gian hiểm, độc ác');
        if (hasSatTinh(p)) out.push('Đà La hãm + hung tinh: cùng khổ, lang thang, đau răng/mắt, tù tội, tai nạn, yểu');
      }
    }

    // ── Hỏa Tinh / Linh Tinh ──
    if (hasAny(p,['Hỏa Tinh','Linh Tinh'])) {
      if (isSang(p,'Hỏa Tinh')||isSang(p,'Linh Tinh')) {
        out.push('Hỏa/Linh đắc: can đảm, dũng mãnh, chí khí hiên ngang');
        if (hasCatTinh(p)) out.push('Hỏa/Linh đắc + cát tinh: giàu sang trọn đời');
      }
      if (isHam(p,'Hỏa Tinh')||isHam(p,'Linh Tinh')) {
        out.push('Hỏa/Linh hãm: thâm hiểm, bệnh thần kinh, cùng khổ, dễ tai họa, tật/yểu');
      }
      if (dongCung(p,['Hỏa Tinh','Linh Tinh']) && inDC(p,TU_MO) && hasAny(p,['Tham Lang','Vũ Khúc'])) {
        out.push('Hỏa/Linh Tứ Mộ + Tham/Vũ: văn võ toàn tài, uy quyền, phú quý trọn đời');
      }
    }

    // ── Địa Không / Địa Kiếp ──
    if (hasAny(p,['Địa Không','Địa Kiếp'])) {
      if (isSang(p,'Địa Không')||isSang(p,'Địa Kiếp')) out.push('Không/Kiếp đắc: kín đáo, có mưu trí, can đảm — sự nghiệp thăng trầm');
      if (isHam(p,'Địa Không')||isHam(p,'Địa Kiếp')) out.push('Không/Kiếp hãm: gian tà, ích kỷ, cuộc đời bất như ý, mang tật');
      if (dongCung(p,['Địa Không','Địa Kiếp']) && inDC(p,['Tỵ','Hợi'])) out.push('Không Kiếp đồng cung Tỵ/Hợi: sớm thành công nhưng không bền');
      if (hasAny(p,['Đào Hoa','Hồng Loan'])) out.push('Không/Kiếp + Đào/Hồng: tình duyên dang dở, dễ kết hôn nhiều lần, giảm thọ');
      if (gioitinh === 'nu' && hasAny(p,['Đào Hoa','Hồng Loan'])) out.push('Nữ mệnh Không/Kiếp + Đào/Hồng: khó giữ danh tiết, hồng nhan bạc mệnh');
    }

    // ── Hóa Lộc ──
    if (hasSao(p,'Hóa Lộc')) {
      out.push('Hóa Lộc thủ Mệnh: thông minh, lương thiện, thích hưởng thụ');
      if (hasCatTinh(p)) out.push('Hóa Lộc + cát tinh: giàu sang trọn đời');
      if (hasAny(p,['Đại Hao','Tiểu Hao'])) out.push('Hóa Lộc + Song Hao: tiêu xài hoang phí, khó giữ tiền');
    }

    // ── Hóa Quyền ──
    if (hasSao(p,'Hóa Quyền')) {
      out.push('Hóa Quyền thủ Mệnh: tính kiêu căng, có uy thế');
      if (hasAny(p,['Tử Vi','Thiên Phủ'])) out.push('Hóa Quyền + Tử/Phủ: có chức quyền, uy thế lớn');
      if (hasSatTinh(p)) out.push('Hóa Quyền + sát: liều lĩnh, dễ thất bại, tai họa, kiện tụng');
    }

    // ── Hóa Khoa ──
    if (hasSao(p,'Hóa Khoa')) {
      out.push('Hóa Khoa thủ Mệnh: thanh tú, nhân hậu, thông minh');
      if (hasCatTinh(p)) out.push('Hóa Khoa + cát tinh: thi đỗ cao, có chức quyền, danh tiếng');
    }

    // ── Hóa Kỵ ──
    if (hasSao(p,'Hóa Kỵ')) {
      out.push('Hóa Kỵ thủ Mệnh: dễ tật chân/tay/mắt, tính nông nổi, hay sai lầm, thị phi');
      if (hasAny(p,['Thái Dương','Thái Âm'])) out.push('Hóa Kỵ + Nhật/Nguyệt: mắt kém, hay đau mắt');
      if (hasAny(p,['Cự Môn','Tham Lang'])) out.push('Hóa Kỵ + Cự/Tham: tai nạn sông nước, tù tội');
      if (hasSatTinh(p)) out.push('Hóa Kỵ + sát: phát nhanh rồi phá, bôn ba');
    }

    // ── Tam Hoa (Khoa Quyền Lộc) ──
    if (hasAny(p,['Hóa Khoa','Hóa Quyền']) && hasSao(p,'Hóa Lộc')) {
      out.push('Khoa Quyền Lộc hội Mệnh: phú quý song toàn');
      if (hasCatTinh(p)) out.push('Khoa Quyền Lộc + cát tinh: uy quyền lớn, danh tiếng lừng lẫy');
    }

    // ── Song Hao ──
    if (hasAny(p,['Đại Hao','Tiểu Hao'])) {
      out.push('Song Hao thủ Mệnh: tiêu hóa kém, thích chơi bời, tiêu tiền nhiều, túng thiếu, ly tổ');
      if (isSang(p,'Đại Hao')||isSang(p,'Tiểu Hao')) out.push('Song Hao đắc: thông minh, ham học, thích khám phá');
    }

    // ── Tang Môn / Bạch Hổ ──
    if (hasAny(p,['Tang Môn','Bạch Hổ'])) {
      out.push('Tang Môn/Bạch Hổ thủ Mệnh: can đảm, cương nghị, bệnh khí huyết/xương khớp');
      if (isSang(p,'Bạch Hổ')||isSang(p,'Tang Môn')) out.push('Tang Hổ đắc: tài thao lược, giỏi lý luận, thích chính trị');
      if (hasSatTinh(p)) out.push('Tang Hổ + sát: bạo ngược, cô đơn, khắc gia đình, tai họa, tù tội, giảm thọ');
    }

    // ── Thiên Khốc / Thiên Hư ──
    if (hasAny(p,['Thiên Khốc','Thiên Hư'])) {
      out.push('Khốc/Hư thủ Mệnh: đa sầu đa cảm, ưu phiền');
      if (isSang(p,'Thiên Khốc')||isSang(p,'Thiên Hư')) out.push('Khốc/Hư đắc: chí lớn, văn tài, hùng biện, thích chính trị');
      if (isHam(p,'Thiên Khốc')||isHam(p,'Thiên Hư')) out.push('Khốc/Hư hãm: khốn khổ, buồn nhiều hơn vui');
    }

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Mệnh'] = out;
  })();

  // ─── CUNG PHỤ MẪU ─────────────────────────────────────────────
  (function() {
    const p = getCungByName('Phụ Mẫu');
    if (!p) return;
    const out = [];

    // Nhật/Nguyệt
    const nhat = hasSao(p,'Thái Dương');
    const nguyet = hasSao(p,'Thái Âm');
    if (nhat && nguyet) {
      const ns = isSang(p,'Thái Dương'), ngs = isSang(p,'Thái Âm');
      if (ns && !ngs) out.push('Nhật sáng Nguyệt mờ: mẹ mất trước cha');
      else if (!ns && ngs) out.push('Nhật mờ Nguyệt sáng: cha mất trước mẹ');
      else if (ns && ngs) out.push(isSinhDem() ? 'Nhật Nguyệt đều sáng + sinh đêm: mẹ mất trước cha' : 'Nhật Nguyệt đều sáng + sinh ngày: cha mất trước mẹ');
      else out.push(isSinhDem() ? 'Nhật Nguyệt đều mờ + sinh đêm: cha mất trước mẹ' : 'Nhật Nguyệt đều mờ + sinh ngày: mẹ mất trước cha');
    } else if (nhat) {
      out.push(isSang(p,'Thái Dương') ? 'Thái Dương sáng: cha mẹ giàu sang, quý hiển, sống lâu — lợi từ cha' : 'Thái Dương mờ: cha mẹ vất vả, sớm xa cách — nên làm con nuôi');
    } else if (nguyet) {
      out.push(isSang(p,'Thái Âm') ? 'Thái Âm sáng: cha mẹ giàu sang' : 'Thái Âm mờ: cha mẹ vất vả');
    }

    // Tử Vi
    if (hasSao(p,'Tử Vi')) {
      if (inDC(p,['Ngọ'])) out.push('Tử Vi tại Ngọ: cha mẹ giàu, quý hiển, sống lâu');
      if (dongCung(p,['Tử Vi','Thiên Phủ'])) out.push('Tử Phủ tại Phụ Mẫu: cha mẹ giàu sang, được thừa hưởng');
      if (hasSao(p,'Phá Quân')) out.push('Tử Vi + Phá Quân tại Phụ Mẫu: bất hòa, sớm xa cách');
    }

    // Liêm Trinh
    if (hasSao(p,'Liêm Trinh')) {
      if (inDC(p,['Dần','Thân'])) out.push('Liêm Trinh Dần/Thân tại Phụ Mẫu: cha mẹ nghèo, có đức, sớm xa cách');
      if (dongCung(p,['Liêm Trinh','Thiên Phủ'])) out.push('Liêm Phủ tại Phụ Mẫu: cha mẹ giàu nhưng bất hòa');
      if (hasSao(p,'Thất Sát')) out.push('Liêm Trinh + Thất Sát tại Phụ Mẫu: sớm khắc thân, bất hòa, tai họa');
    }

    // Hóa sao
    if (hasSao(p,'Hóa Lộc')) out.push('Hóa Lộc tại Phụ Mẫu: cha mẹ có của');
    if (hasSao(p,'Hóa Quyền')) out.push('Hóa Quyền tại Phụ Mẫu: cha mẹ có quyền');
    if (hasSao(p,'Hóa Khoa')) out.push('Hóa Khoa tại Phụ Mẫu: cha mẹ thông minh, có danh');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Phụ Mẫu: bất hòa, không hợp tình');
    if (hasAny(p,['Tuần','Triệt'])) out.push('Tuần/Triệt tại Phụ Mẫu: sớm khắc thân, xa cách, có thể con nuôi');
    if (isVoChinhDieu(p)) out.push('Phụ Mẫu vô chính diệu: lấy chiếu từ cung xung');

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Phụ Mẫu'] = out;
  })();

  // ─── CUNG PHÚC ĐỨC ────────────────────────────────────────────
  (function() {
    const p = getCungByName('Phúc Đức');
    if (!p) return;
    const out = [];

    if (hasSao(p,'Tử Vi')) {
      if (inDC(p,['Ngọ']) && isDonThu(p)) out.push('Tử Vi đơn thủ Ngọ: hưởng phúc lâu dài, họ hàng quý hiển');
      if (dongCung(p,['Tử Vi','Thiên Phủ'])||dongCung(p,['Tử Vi','Thiên Tướng'])) out.push('Tử Vi + Phủ/Tướng: xứng ý toại lòng, sống lâu, nhiều người giàu sang');
      if (hasSao(p,'Phá Quân')) out.push('Tử Vi + Phá Quân: lao tâm khổ tứ, phải xa quê — họ hàng ly tán');
    }

    if (hasSao(p,'Liêm Trinh')) {
      if (dongCung(p,['Liêm Trinh','Thiên Phủ'])) out.push('Liêm Phủ tại Phúc Đức: sung sướng, phúc thọ song toàn');
      if (dongCung(p,['Liêm Trinh','Phá Quân'])) out.push('Liêm Phá tại Phúc Đức: vất vả, phải xa quê mới sống lâu');
    }

    if (hasSao(p,'Thiên Đồng')) {
      if (inDC(p,['Mão'])) out.push('Thiên Đồng tại Mão Phúc Đức: hưởng phúc sống lâu, họ hàng có thần đồng');
      if (inDC(p,['Dậu'])) out.push('Thiên Đồng tại Dậu Phúc Đức: giảm thọ, lao tâm, ly tán');
    }

    if (hasSao(p,'Thái Dương')) {
      if (isSang(p,'Thái Dương')) out.push('Thái Dương sáng tại Phúc Đức: hưởng phúc, sống lâu, họ hàng quý hiển');
      else out.push('Thái Dương mờ tại Phúc Đức: bạc phúc, giảm thọ, họ hàng sa sút');
    }

    if (hasSao(p,'Hóa Lộc')) out.push('Hóa Lộc tại Phúc Đức: được hưởng phúc, không lo túng thiếu, họ hàng giàu có');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Phúc Đức: giảm thọ, họ hàng ly tán tranh chấp');
    if (hasAny(p,['Đại Hao','Tiểu Hao'])) out.push('Song Hao tại Phúc Đức: giảm thọ, phải xa gia đình, họ hàng nghèo ly tán');
    if (hasSao(p,'Thiên Mã')) out.push('Thiên Mã tại Phúc Đức: tăng thọ, xa quê càng tốt');
    if (hasAny(p,['Tuần','Triệt'])) out.push('Tuần/Triệt án ngữ Phúc Đức: xa quê lập nghiệp, họ hàng ly tán');
    if (isVoChinhDieu(p)) {
      if (hasAny(p,['Địa Không','Địa Kiếp'])) out.push('Phúc Đức vô chính diệu + Không/Kiếp: hưởng phúc sống lâu');
      else out.push('Phúc Đức vô chính diệu: kém phúc');
    }

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Phúc Đức'] = out;
  })();

  // ─── CUNG ĐIỀN TRẠCH ──────────────────────────────────────────
  (function() {
    const p = getCungByName('Điền Trạch');
    if (!p) return;
    const out = [];

    if (hasSao(p,'Tử Vi')) {
      if (dongCung(p,['Tử Vi','Thiên Phủ'])||dongCung(p,['Tử Vi','Thiên Tướng'])) out.push('Tử Vi + Phủ/Tướng tại Điền Trạch: rất nhiều nhà đất, cơ nghiệp thịnh vượng');
      if (hasSao(p,'Phá Quân')) out.push('Tử Phá tại Điền Trạch: phá tan tổ nghiệp, lập nghiệp xa quê');
      if (hasSao(p,'Tham Lang')) out.push('Tử Tham tại Điền Trạch: không giữ được tổ nghiệp, về sau sa sút');
    }

    if (hasSao(p,'Liêm Trinh')) {
      if (inDC(p,['Dần','Thân'])) out.push('Liêm Trinh Dần/Thân tại Điền Trạch: phá tan tổ nghiệp, không được thụ hưởng');
      if (dongCung(p,['Liêm Trinh','Thiên Tướng'])) out.push('Liêm Tướng tại Điền Trạch: nhà đất trước ít sau nhiều');
      if (hasSao(p,'Phá Quân')) out.push('Liêm Phá tại Điền Trạch: lập nghiệp đầu thất bại, sau bền');
    }

    if (hasSao(p,'Thiên Đồng')) {
      if (inDC(p,['Mão'])) out.push('Thiên Đồng tại Mão Điền Trạch: giàu có lớn');
      if (inDC(p,['Dậu'])) out.push('Thiên Đồng tại Dậu Điền Trạch: thành bại thất thường');
      if (dongCung(p,['Thiên Đồng','Thiên Lương'])) out.push('Đồng Lương tại Điền Trạch: về sau có nhiều nhà đất');
    }

    if (hasSao(p,'Vũ Khúc')) {
      if (inDC(p,['Thìn','Tuất'])) out.push('Vũ Khúc Thìn/Tuất tại Điền Trạch: tổ nghiệp lớn, ngày càng thịnh');
      if (dongCung(p,['Vũ Khúc','Thiên Phủ'])) out.push('Vũ Phủ tại Điền Trạch: giữ được tổ nghiệp, phát đạt');
      if (hasSao(p,'Phá Quân')) out.push('Vũ Phá tại Điền Trạch: phá tan rồi mới ổn định');
    }

    if (hasSao(p,'Thái Dương')) {
      if (isSang(p,'Thái Dương')) out.push('Thái Dương sáng tại Điền Trạch: tổ nghiệp lớn nhưng giảm dần');
      else out.push('Thái Dương mờ tại Điền Trạch: không có nhà đất');
      if (hasSao(p,'Thái Âm')) out.push('Nhật Nguyệt hội Điền Trạch: rất nhiều nhà đất');
    }

    if (hasSao(p,'Thiên Phủ')) {
      out.push('Thiên Phủ tại Điền Trạch: được hưởng tổ nghiệp');
      if (dongCung(p,['Thiên Phủ','Tử Vi'])) out.push('Tử Phủ tại Điền Trạch: rất nhiều nhà đất');
      if (dongCung(p,['Thiên Phủ','Vũ Khúc'])) out.push('Vũ Phủ tại Điền Trạch: phát đạt mạnh');
    }

    if (hasSao(p,'Thái Âm')) {
      if (isSang(p,'Thái Âm')) out.push('Thái Âm sáng tại Điền Trạch: tự lập nghiệp thành công');
      else out.push('Thái Âm mờ tại Điền Trạch: không có nhà đất');
    }

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Điền Trạch'] = out;
  })();

  // ─── CUNG QUAN LỘC ────────────────────────────────────────────
  (function() {
    const p = getCungByName('Quan Lộc');
    if (!p) return;
    const out = [];

    if (hasSao(p,'Tử Vi')) {
      if (dongCung(p,['Tử Vi','Thiên Tướng'])) out.push('Tử Vi Thiên Tướng: văn võ toàn tài, tổ chức giỏi, lắm quyền');
      if (hasSao(p,'Thất Sát')) out.push('Tử Sát: có uy quyền, phù hợp quân sự');
      if (hasSao(p,'Phá Quân')) out.push('Tử Phá: võ nghiệp thành công, thăng giáng thất thường, kinh doanh tốt');
      if (hasSao(p,'Tham Lang')) out.push('Tử Tham: công danh bình thường, nếu rực rỡ dễ gặp họa');
    }

    if (hasSao(p,'Liêm Trinh')) {
      if (inDC(p,['Dần','Thân'])) out.push('Liêm Trinh Dần/Thân: võ nghiệp hiển đạt, có uy quyền, chính trị');
      if (dongCung(p,['Liêm Trinh','Thiên Phủ'])) out.push('Liêm Phủ: phú quý song toàn, lập chiến công, uy quyền');
      if (hasSao(p,'Thất Sát')) out.push('Liêm Sát: quân sự thăng giáng thất thường, nhiều rủi ro');
      if (hasSao(p,'Tham Lang')) out.push('Liêm Tham: võ chức nhỏ, công danh trở ngại, nhiều tai họa');
    }

    if (hasSao(p,'Thiên Đồng')) {
      if (inDC(p,['Mão'])) out.push('Thiên Đồng Mão: văn võ kiêm toàn, hay thay đổi công việc');
      if (inDC(p,['Dậu'])) out.push('Thiên Đồng Dậu: công danh muộn nhỏ, hay thay đổi, hợp thương mại');
    }

    if (hasSao(p,'Vũ Khúc')) {
      if (inDC(p,['Thìn','Tuất'])) out.push('Vũ Khúc Thìn/Tuất: võ nghiệp hiển đạt, kinh doanh tốt');
      if (dongCung(p,['Vũ Khúc','Thiên Phủ'])) out.push('Vũ Phủ: công danh hoành đạt, văn võ kiêm toàn, tài chính');
      if (hasSao(p,'Tham Lang')) out.push('Vũ Tham: giàu có, kinh doanh từ 30 tuổi mới tốt');
    }

    if (hasAny(p,['Văn Xương','Văn Khúc'])) out.push('Xương/Khúc tại Quan Lộc: công danh hiển đạt, văn tài lỗi lạc');
    if (hasAny(p,['Thiên Khôi','Thiên Việt'])) out.push('Khôi/Việt tại Quan Lộc: có danh chức lớn, lãnh đạo');
    if (hasAny(p,['Tả Phù','Hữu Bật'])) out.push('Tả/Hữu tại Quan Lộc: được nhiều người giúp đỡ công danh');
    if (hasSao(p,'Lộc Tồn')) out.push('Lộc Tồn tại Quan Lộc: có danh chức và tài lộc, tổ chức tốt');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Quan Lộc: công danh trắc trở, dễ gặp phiền lòng');
    if (hasAny(p,['Hóa Khoa','Hóa Quyền','Hóa Lộc'])) out.push('Khoa/Quyền/Lộc tại Quan Lộc: tài lộc, uy quyền, danh chức tăng mạnh');
    if (hasSao(p,'Thiên Mã')) out.push('Thiên Mã tại Quan Lộc: công danh hiển đạt, công việc lưu động');
    if (dongCung(p,['Lộc Tồn','Thiên Mã'])) out.push('Lộc Mã Quan Lộc: danh chức lớn, tài lộc tăng tiến, kinh doanh tốt');
    if (isVoChinhDieu(p)) {
      if (hasSao(p,'Thái Dương')||hasSao(p,'Thái Âm')) out.push('Quan Lộc vô chính diệu có Nhật/Nguyệt: công danh rực rỡ, uy quyền hiển hách');
      else if (hasAny(p,['Tuần','Triệt'])) out.push('Quan Lộc vô chính diệu + Tuần/Triệt: khó đầu sau hiển đạt nhưng không bền');
      else out.push('Quan Lộc vô chính diệu: công danh bình thường, không hiển đạt');
    }

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Quan Lộc'] = out;
  })();

  // ─── CUNG NÔ BỘC ──────────────────────────────────────────────
  (function() {
    const p = getCungByName('Nô Bộc');
    if (!p) return;
    const out = [];

    const menhP = palaces.find(x => x.isMenh);
    const menhGood = menhP && (menhP.majorStars.some(s => ['Tử Vi','Thiên Phủ','Cự Môn','Thái Dương','Thiên Cơ','Thái Âm','Thiên Đồng','Thiên Lương'].includes(s.ten)));

    if (hasAny(p,['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt'])) {
      if (isSang(p,'Văn Xương')||isSang(p,'Văn Khúc')||isSang(p,'Thiên Khôi')||isSang(p,'Thiên Việt')) out.push('Xương/Khúc/Khôi/Việt sáng tại Nô Bộc: bạn bè có danh chức, kết giao người quyền thế');
      else out.push('Xương/Khúc/Khôi/Việt mờ tại Nô Bộc: người có danh giá dễ làm hại');
    }

    if (hasAny(p,['Tả Phù','Hữu Bật'])) {
      if (isSang(p,'Tả Phù')||isSang(p,'Hữu Bật')) out.push('Tả/Hữu sáng tại Nô Bộc: người giúp việc đắc lực, bạn bè tốt');
      else out.push('Tả/Hữu mờ tại Nô Bộc: người giúp việc lừa đảo, bạn bè gian');
    }

    if (hasSao(p,'Lộc Tồn')) out.push('Lộc Tồn tại Nô Bộc: ít người giúp việc, ít bạn bè');
    if (hasAny(p,['Hóa Khoa','Hóa Quyền','Hóa Lộc'])) out.push('Khoa/Quyền/Lộc tại Nô Bộc: người giúp việc lắm quyền, bạn bè quý hiển');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Nô Bộc: bị nói xấu, oan trách');
    if (hasAny(p,['Đại Hao','Tiểu Hao'])) out.push('Song Hao tại Nô Bộc: người giúp việc gian giảo, bạn bè du đãng');
    if (hasAny(p,['Thiên Khốc','Thiên Hư'])) out.push('Khốc/Hư tại Nô Bộc: bị người giúp việc oan trách');
    if (hasAny(p,['Tuần','Triệt'])) out.push('Tuần/Triệt tại Nô Bộc: trước khó sau dễ, không bền');
    if (hasSao(p,'Đào Hoa')) out.push('Đào Hoa tại Nô Bộc: mang lụy vì tình');
    if (dongCung(p,['Tả Phù','Hữu Bật','Địa Không','Địa Kiếp'])) out.push('Tả/Hữu + Không/Kiếp: gian quyệt, lừa đảo');

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Nô Bộc'] = out;
  })();

  // ─── CUNG THIÊN DI ────────────────────────────────────────────
  (function() {
    const p = getCungByName('Thiên Di');
    if (!p) return;
    const out = [];

    if (hasSao(p,'Tử Vi')) {
      if (dongCung(p,['Tử Vi','Thiên Phủ']) && inDC(p,['Ngọ'])) out.push('Tử Phủ Ngọ tại Thiên Di: gặp quý nhân, hành thông, xa nhà tốt hơn');
      if (hasSao(p,'Phá Quân')) out.push('Tử Phá tại Thiên Di: hay ra ngoài, gặp quý nhân nhưng chết xa nhà');
      if (hasSao(p,'Tham Lang')) out.push('Tử Tham tại Thiên Di: phiền lòng, tiểu nhân quấy rối, may ít rủi nhiều');
      if (hasAny(p,['Thiên Tướng','Thất Sát'])) out.push('Tử Vi + Tướng/Sát tại Thiên Di: được kính nể, gần quyền quý, có tài lộc');
    }

    if (hasSao(p,'Liêm Trinh')) {
      if (inDC(p,['Dần','Thân'])) out.push('Liêm Trinh Dần/Thân tại Thiên Di: gặp quý nhân, được kính trọng, hành thông');
      if (hasSao(p,'Phá Quân')) out.push('Liêm Phá tại Thiên Di: xa nhà bất lợi, may ít rủi nhiều, chết xa nhà');
      if (hasSao(p,'Thất Sát')) out.push('Liêm Sát tại Thiên Di: tai nạn đường xa, nguy hiểm vũ khí, chết nơi tạm');
      if (hasSao(p,'Tham Lang')) out.push('Liêm Tham tại Thiên Di: tai họa, hình ngục, kiện tụng, ít gặp quý nhân');
    }

    if (hasSao(p,'Thiên Đồng')) {
      if (inDC(p,['Mão'])) out.push('Thiên Đồng Mão tại Thiên Di: xa nhà hành thông, gặp quý nhân, không ổn định nơi ở');
      if (inDC(p,['Dậu'])) out.push('Thiên Đồng Dậu tại Thiên Di: xa nhà phiền lòng, chết xa nhà');
    }

    if (hasAny(p,['Lộc Tồn','Hóa Lộc'])) out.push('Lộc tại Thiên Di: dễ kiếm tiền, gặp may mắn, buôn bán phát tài');
    if (hasAny(p,['Hóa Khoa','Hóa Quyền'])) out.push('Khoa/Quyền tại Thiên Di: có danh giá, được kính trọng, gần quyền quý');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Thiên Di: thị phi, phiền lòng khi ra ngoài');
    if (hasSao(p,'Thiên Mã')) out.push('Thiên Mã tại Thiên Di: di chuyển nhiều, được yêu thích');
    if (hasAny(p,['Địa Không','Địa Kiếp'])) out.push('Không/Kiếp tại Thiên Di: bị lừa đảo, bị hãm hại, chết xa nhà');
    if (hasAny(p,['Tả Phù','Hữu Bật'])) out.push('Tả/Hữu tại Thiên Di: được giúp đỡ khi ra ngoài');
    if (hasAny(p,['Kình Dương','Đà La'])) out.push('Kình/Đà tại Thiên Di: tai nạn, chết xa nhà');
    if (hasAny(p,['Tuần','Triệt'])) out.push('Tuần/Triệt tại Thiên Di: phiền lòng, chết xa nhà');
    if (isVoChinhDieu(p)) out.push('Thiên Di vô chính diệu: lấy chiếu từ cung xung');

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Thiên Di'] = out;
  })();

  // ─── CUNG TẬT ÁCH ─────────────────────────────────────────────
  (function() {
    const p = getCungByName('Tật Ách');
    if (!p) return;
    const out = [];

    // Giải trừ
    if (hasSao(p,'Hóa Khoa')) out.push('Hóa Khoa tại Tật Ách: giảm nguy hiểm, gặp người cứu/thầy thuốc');
    if (hasAny(p,['Tuần','Triệt'])) out.push('Tuần/Triệt tại Tật Ách: ít bệnh tật suốt đời');
    if (hasAny(p,['Tả Phù','Hữu Bật']) && hasCatTinh(p)) out.push('Tả/Hữu + cát tại Tật Ách: có người giúp lúc nguy');
    if (hasAny(p,['Tả Phù','Hữu Bật']) && hasSatTinh(p)) out.push('Tả/Hữu + sát tại Tật Ách: rất nguy nan');

    // Bệnh theo sao
    if (hasSao(p,'Liêm Trinh')) out.push('Liêm Trinh tại Tật Ách: tỳ vết chân tay lưng');
    if (dongCung(p,['Liêm Trinh','Tham Lang'])) {
      out.push('Liêm Tham tại Tật Ách: mắt kém, tự tối');
      if (hasAny(p,['Địa Không','Địa Kiếp'])) out.push('Liêm Tham + Không/Kiếp tại Tật Ách: chết thảm khốc');
    }
    if (hasSao(p,'Thiên Đồng')) out.push('Thiên Đồng tại Tật Ách: bệnh tiêu hóa');
    if (dongCung(p,['Thiên Đồng','Cự Môn'])) out.push('Đồng Cự tại Tật Ách: bệnh tâm khí');
    if (hasSao(p,'Vũ Khúc')) out.push('Vũ Khúc tại Tật Ách: bệnh da, tỳ vết chân tay');
    if (hasSao(p,'Thái Dương')) out.push('Thái Dương tại Tật Ách: đau đầu, căng mạch máu');
    if (hasSao(p,'Thiên Cơ')) out.push('Thiên Cơ tại Tật Ách: bệnh da, tê thấp');
    if (hasSao(p,'Thái Âm') && isHam(p,'Thái Âm')) out.push('Thái Âm mờ tại Tật Ách: bệnh phổi');
    if (hasSao(p,'Tham Lang') && inDC(p,['Dần','Thân'])) out.push('Tham Lang Dần/Thân tại Tật Ách: bệnh chân');
    if (hasSao(p,'Cự Môn')) out.push('Cự Môn tại Tật Ách: bệnh hạ bộ, mụn nhọt');
    if (hasSao(p,'Thất Sát')) out.push('Thất Sát tại Tật Ách: mặt có vết, sức khỏe kém');
    if (hasSao(p,'Phá Quân')) out.push('Phá Quân tại Tật Ách: mụn nhọt, tai nạn xe cộ, tự tối');
    if (hasSao(p,'Kình Dương')) out.push('Kình Dương tại Tật Ách: bệnh tai, trĩ, tỳ vết chân');
    if (hasSao(p,'Đà La')) out.push('Đà La tại Tật Ách: đau răng, tỳ vết đầu mặt');
    if ((hasSao(p,'Hỏa Tinh')||hasSao(p,'Linh Tinh')) && (isHam(p,'Hỏa Tinh')||isHam(p,'Linh Tinh'))) out.push('Hỏa/Linh mờ tại Tật Ách: bệnh nóng lạnh');
    if (hasAny(p,['Địa Không','Địa Kiếp'])) out.push('Không/Kiếp tại Tật Ách: mụn nhọt chốc lở');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Tật Ách: đau bụng, khó sinh');
    if (dongCung(p,['Thiên Mã','Thiên Hình'])) out.push('Mã Hình tại Tật Ách: tai nạn xe cộ');
    if (hasAny(p,['Đại Hao','Tiểu Hao'])) out.push('Song Hao tại Tật Ách: bệnh tiêu hóa');
    if (hasSao(p,'Tang Môn')) out.push('Tang Môn tại Tật Ách: bệnh khí huyết, tim yếu');
    if (hasSao(p,'Bạch Hổ')) out.push('Bạch Hổ tại Tật Ách: máu xấu, đau xương');
    if (hasSao(p,'Thiên Hình')) out.push('Thiên Hình tại Tật Ách: bệnh phong, dao kéo');

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Tật Ách'] = out;
  })();

  // ─── CUNG TÀI BẠCH ────────────────────────────────────────────
  (function() {
    const p = getCungByName('Tài Bạch');
    if (!p) return;
    const out = [];

    if (hasSao(p,'Tử Vi')) {
      if (dongCung(p,['Tử Vi','Thiên Phủ'])) out.push('Tử Phủ tại Tài Bạch: rất nhiều của cải, giữ kho tài chính');
      if (hasSao(p,'Thất Sát')) out.push('Tử Sát tại Tài Bạch: kiếm tiền nhanh, làm giàu nhanh');
      if (hasSao(p,'Phá Quân')) out.push('Tử Phá tại Tài Bạch: đầu khổ sau dễ kiếm tiền, sung túc');
      if (hasSao(p,'Tham Lang')) out.push('Tử Tham tại Tài Bạch: bình thường, hưởng thừa kế, suy giảm về sau');
    }

    if (hasSao(p,'Liêm Trinh')) {
      if (dongCung(p,['Liêm Trinh','Thiên Phủ'])) out.push('Liêm Phủ tại Tài Bạch: giàu lớn, giữ của bền');
      if (hasSao(p,'Thất Sát')) out.push('Liêm Sát tại Tài Bạch: kiếm tiền thời loạn, tai họa đi kèm');
      if (hasSao(p,'Phá Quân')) out.push('Liêm Phá tại Tài Bạch: tiền thất thường, hao tán');
      if (hasSao(p,'Tham Lang')) out.push('Liêm Tham tại Tài Bạch: túng thiếu, khổ sở vì tiền, kiện tụng hình ngục');
    }

    if (hasSao(p,'Vũ Khúc')) {
      if (inDC(p,['Thìn','Tuất'])) out.push('Vũ Khúc Thìn/Tuất tại Tài Bạch: giàu lớn');
      if (dongCung(p,['Vũ Khúc','Thiên Phủ'])) out.push('Vũ Phủ tại Tài Bạch: rất giàu, giữ của bền');
      if (dongCung(p,['Vũ Khúc','Thiên Tướng'])) out.push('Vũ Tướng tại Tài Bạch: của cải chồng chất, gặp quý nhân');
    }

    if (hasSao(p,'Thái Dương')) {
      if (isSang(p,'Thái Dương')) out.push('Thái Dương sáng tại Tài Bạch: giàu lớn, dễ kiếm tiền');
      else out.push('Thái Dương mờ tại Tài Bạch: kiếm tiền khó, về già sung túc');
    }

    if (hasSao(p,'Thái Âm')) {
      if (isSang(p,'Thái Âm')) out.push('Thái Âm sáng tại Tài Bạch: tự lập nghiệp thành công');
      else out.push('Thái Âm mờ tại Tài Bạch: không có nhà đất');
    }

    if (dongCung(p,['Lộc Tồn','Hóa Lộc'])) out.push('Song Lộc tại Tài Bạch: dễ kiếm tiền, sung túc');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Tài Bạch: tán tài');
    if (hasSao(p,'Thiên Mã')) out.push('Thiên Mã tại Tài Bạch: kiếm tiền phương xa');
    if (hasAny(p,['Đại Hao','Tiểu Hao'])) out.push('Song Hao tại Tài Bạch: tiêu hoang, hao tán, thích cờ bạc');
    if (isSang(p,'Địa Không')||isSang(p,'Địa Kiếp')) out.push('Không/Kiếp đắc tại Tài Bạch: hoạnh phát hoạnh phá');
    else if (hasSao(p,'Địa Không')||hasSao(p,'Địa Kiếp')) out.push('Không/Kiếp tại Tài Bạch: túng thiếu, cùng khốn');
    if (dongCung(p,['Lộc Tồn','Thiên Mã'])) out.push('Lộc Mã giao trì Tài Bạch: của đến tận tay, kinh doanh phát đạt');
    if (dongCung(p,['Lộc Tồn','Đại Hao'])) out.push('Lộc + Hao tại Tài Bạch: kiếm tiền ít, tiêu nhiều, hao tán');
    if (isVoChinhDieu(p)) {
      if (hasSao(p,'Thái Dương')||hasSao(p,'Thái Âm')) out.push('Tài Bạch vô chính diệu có Nhật/Nguyệt sáng: giàu lớn');
      else if (hasAny(p,['Tuần','Triệt'])) out.push('Tài Bạch vô chính diệu + Tuần/Triệt: đầu khổ sau sung túc');
      else out.push('Tài Bạch vô chính diệu: phụ thuộc cung xung chiếu');
    }

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Tài Bạch'] = out;
  })();

  // ─── CUNG TỬ TỨC ──────────────────────────────────────────────
  // (Không có data riêng — skip, Claude tự luận từ laSoText)

  // ─── CUNG PHU THÊ ─────────────────────────────────────────────
  (function() {
    const p = getCungByName('Phu Thê');
    if (!p) return;
    const out = [];

    if (hasSao(p,'Tử Vi')) {
      if (dongCung(p,['Tử Vi','Thiên Phủ']) && inDC(p,['Ngọ'])) out.push('Tử Phủ Ngọ: vợ chồng hòa hợp đến bạc đầu, giàu sang');
      if (dongCung(p,['Tử Vi','Thiên Tướng'])) out.push('Tử Tướng: vợ chồng cứng cỏi, dễ xích mích về sau — nên chênh lệch tuổi');
      if (hasSao(p,'Thất Sát')) out.push('Tử Sát: trước trở sau thành, nên muộn hôn nhân, tránh chia ly');
      if (hasSao(p,'Phá Quân')) out.push('Tử Phá: hình khắc, chia ly, bất hòa — nên lấy người lớn tuổi hơn');
      if (hasSao(p,'Tham Lang')) out.push('Tử Tham: nên muộn hôn nhân, dễ ghen tuông, bất hòa');
    }

    if (hasSao(p,'Liêm Trinh')) {
      if (dongCung(p,['Liêm Trinh','Thiên Phủ'])) out.push('Liêm Phủ: nên muộn hôn nhân, vợ chồng cương cường, sống đến bạc đầu, gia đình sung túc');
      if (dongCung(p,['Liêm Trinh','Thiên Tướng'])) out.push('Liêm Tướng: bất hòa, sinh ly hoặc tử biệt');
      if (inDC(p,['Dần','Thân'])) out.push('Liêm Trinh Dần/Thân: nhiều lần hôn nhân, nam khó lấy vợ, nữ lấy chồng nghèo');
    }

    if (hasSao(p,'Thiên Đồng')) {
      if (inDC(p,['Mão'])) out.push('Thiên Đồng Mão: nên muộn hôn nhân, vợ đẹp hiền, sống đến bạc đầu');
      if (inDC(p,['Dậu'])) out.push('Thiên Đồng Dậu: bất hòa, xa cách');
    }

    if (hasSao(p,'Vũ Khúc') && inDC(p,['Thìn','Tuất'])) out.push('Vũ Khúc Thìn/Tuất: nên muộn hôn nhân, vợ chồng gần tuổi, giàu sang');
    if (hasSao(p,'Thái Dương')) {
      if (isSang(p,'Thái Dương')) out.push('Thái Dương sáng: phú quý, vinh hiển, sống đến bạc đầu');
      else out.push('Thái Dương mờ: hôn nhân trở ngại, nên muộn hôn nhân');
    }
    if (hasSao(p,'Thái Âm')) {
      if (isSang(p,'Thái Âm')) out.push('Thái Âm sáng: vợ chồng quý hiển, hòa thuận, giàu sang');
      else out.push('Thái Âm mờ: bất hòa, hôn nhân trở ngại, dễ chia ly');
    }
    if (hasSao(p,'Thiên Phủ') && inDC(p,['Tỵ','Hợi'])) out.push('Thiên Phủ Tỵ/Hợi: vợ chồng hòa thuận, khá giả, sống đến bạc đầu');
    if (hasSao(p,'Tham Lang') && inDC(p,['Thìn','Tuất'])) out.push('Tham Lang Thìn/Tuất: vợ chồng tài giỏi, dễ ghen tuông, nên muộn');
    if (hasSao(p,'Thất Sát') && inDC(p,['Dần','Thân'])) out.push('Thất Sát Dần/Thân: nên muộn, vợ chồng cứng cỏi, dễ ghen — nên chênh lệch tuổi');
    if (hasSao(p,'Phá Quân') && inDC(p,['Tý','Ngọ'])) out.push('Phá Quân Tý/Ngọ: khá giả, nên muộn hôn nhân, dễ xa cách');

    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Phu Thê: vợ chồng bất hòa');
    if (hasSao(p,'Lộc Tồn')) out.push('Lộc Tồn tại Phu Thê: nên muộn hôn nhân, tránh bất hòa');
    if (hasSao(p,'Thiên Mã')) out.push('Thiên Mã tại Phu Thê: gặp nhau nơi xa, kết hôn xa quê');
    if (hasAny(p,['Cô Thần','Quả Tú'])) out.push('Cô Thần/Quả Tú: bất hòa, xa cách');
    if (hasAny(p,['Đào Hoa','Hồng Loan'])) out.push('Đào Hoa/Hồng Loan tại Phu Thê: vợ đẹp, ngoại tình, tình cảm phức tạp');
    if (hasAny(p,['Tuần','Triệt'])) out.push('Tuần/Triệt tại Phu Thê: nên muộn hôn nhân, dễ chia ly, nhiều lần trắc trở');

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Phu Thê'] = out;
  })();

  // ─── CUNG HUYNH ĐỆ ────────────────────────────────────────────
  (function() {
    const p = getCungByName('Huynh Đệ');
    if (!p) return;
    const out = [];

    // Tính nam/nữ nhiều hơn theo chính diệu
    const namGroup = ['Thiên Phủ','Thiên Tướng','Thiên Lương','Thất Sát','Thiên Đồng','Thái Dương','Thiên Cơ'];
    const nuGroup  = ['Thái Âm','Tham Lang','Cự Môn','Liêm Trinh','Vũ Khúc','Phá Quân'];
    if (p.majorStars.some(s => namGroup.includes(s.ten))) out.push('Huynh Đệ có nhiều sao dương: anh/em trai nhiều hơn chị/em gái');
    else if (p.majorStars.some(s => nuGroup.includes(s.ten))) out.push('Huynh Đệ có nhiều sao âm: chị/em gái nhiều hơn anh/em trai');

    if (hasSao(p,'Tử Vi')) {
      if (inDC(p,['Ngọ']) && isDonThu(p)) out.push('Tử Vi đơn Ngọ tại Huynh Đệ: có anh trên, anh chị em khá giả');
      if (dongCung(p,['Tử Vi','Thiên Phủ'])) out.push('Tử Phủ tại Huynh Đệ: >=3 anh chị em, nhiều người quý hiển');
      if (hasSao(p,'Phá Quân')) out.push('Tử Phá tại Huynh Đệ: <=3 anh chị em, di bào, xa cách sớm, bất hòa');
      if (hasSao(p,'Tham Lang')) out.push('Tử Tham tại Huynh Đệ: <=3 anh chị em, ly tán, vất vả');
    }

    if (hasAny(p,['Văn Xương','Văn Khúc'])) {
      if (isSang(p,'Văn Xương')||isSang(p,'Văn Khúc')) out.push('Xương/Khúc sáng tại Huynh Đệ: +3 anh chị em, thông minh, quý hiển');
      else out.push('Xương/Khúc mờ tại Huynh Đệ: không có anh chị em');
    }
    if (hasAny(p,['Thiên Khôi','Thiên Việt'])) out.push('Khôi/Việt tại Huynh Đệ: anh chị em quý hiển');
    if (hasAny(p,['Tả Phù','Hữu Bật'])) {
      if (isSang(p,'Tả Phù')||isSang(p,'Hữu Bật')) out.push('Tả/Hữu sáng tại Huynh Đệ: +3 anh chị em, hỗ trợ nhau');
      else out.push('Tả/Hữu mờ tại Huynh Đệ: +1 anh chị em');
    }
    if (hasSao(p,'Lộc Tồn')) out.push('Lộc Tồn tại Huynh Đệ: ít anh chị em, xa cách sớm, bất hòa');
    if (hasAny(p,['Hóa Khoa','Hóa Quyền','Hóa Lộc'])) out.push('Khoa/Quyền/Lộc tại Huynh Đệ: anh chị em giàu quý, thông minh');
    if (hasSao(p,'Hóa Kỵ')) out.push('Hóa Kỵ tại Huynh Đệ: bất hòa, xa cách');
    if (hasAny(p,['Đại Hao','Tiểu Hao'])) out.push('Song Hao tại Huynh Đệ: giảm số anh chị em, bất hòa, xa cách');
    if (hasAny(p,['Tuần','Triệt'])) out.push('Tuần/Triệt tại Huynh Đệ: anh cả chết non, bất hòa, xa cách');
    if (hasSatTinh(p)) out.push('Sát tinh tại Huynh Đệ: giảm số anh chị em, bất hòa, có tật');
    if (isVoChinhDieu(p)) out.push('Huynh Đệ vô chính diệu: lấy chiếu từ cung xung');

    tuanTrietNote(p).forEach(n => out.push(n));
    if (out.length > 0) results['Huynh Đệ'] = out;
  })();

  return results;
}


// ================================================================
// TÍNH CUNG SCORES — 6 metrics per cung cho radar chart
// Metrics: Tiềm Năng, Bền Vững, Rủi Ro, Quý Nhân, Minh Bạch, Tương Hợp
// Output: ls.cungScores = { [cungName]: { tiemNang, benVung, ruiRo, quyNhan, minhBach, tuongHop } }
// ================================================================

function tinhCungScores(ls, napAmHanh, tuoiXem) {
  const { palaces, cachCuc, cachCucTungCung } = ls;

  // ─── CONSTANTS ────────────────────────────────────────────────
  const SAT_TINH  = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
  const BAI_TINH  = ['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao'];
  const CAT_TINH  = ['Văn Xương','Văn Khúc','Thiên Khôi','Thiên Việt','Tả Phù','Hữu Bật','Lộc Tồn','Hóa Lộc'];
  const BIEN_DONG = ['Thiên Mã','Phá Quân','Tham Lang'];

  const STAR_HANH = {
    'Tử Vi':'Thổ','Thiên Cơ':'Mộc','Thái Dương':'Hỏa','Vũ Khúc':'Kim',
    'Thiên Đồng':'Thủy','Liêm Trinh':'Hỏa','Thiên Phủ':'Thổ','Thái Âm':'Thủy',
    'Tham Lang':'Thủy','Cự Môn':'Thổ','Thiên Tướng':'Thủy','Thiên Lương':'Mộc',
    'Thất Sát':'Kim','Phá Quân':'Thủy',
  };

  const NGU_HANH_SINH_MAP = {'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc'};
  const NGU_HANH_KHAC_MAP = {'Mộc':'Thổ','Thổ':'Thủy','Thủy':'Hỏa','Hỏa':'Kim','Kim':'Mộc'};

  // Loai cachCuc → điểm (positive = tốt)
  const LOAI_SCORE = {
    'quy_cuc': 3,    // cách quý
    'phu_cuc': 2.5,  // cách phú
    'ban_tien_cuc': 2,
    'tap_cuc': 1.5,
    'than_cu': 1,
    'menh_co_ban': 0.5,
  };

  // ─── HELPERS ──────────────────────────────────────────────────
  function clamp(v, min=0, max=10) { return Math.max(min, Math.min(max, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }

  function getAllStars(p) {
    return [p, ...(p.tamHopCungs||[]), p.xungChieuCung]
      .filter(Boolean).flatMap(c => c.stars.map(s => s.ten));
  }
  function getOwnStars(p) { return p.stars.map(s => s.ten); }

  function brightScore(brightness) {
    return { 'Miếu':10, 'Vượng':8, 'Đắc':6, 'Bình':4, 'Hãm':2 }[brightness] ?? 4;
  }

  function hasSao(p, name) { return p.stars.some(s => s.ten === name); }
  function hasSaoTPTC(allStars, name) { return allStars.includes(name); }

  function isVoChinhDieu(p) { return p.majorStars.length === 0; }

  function tuanActive(p) {
    if (!hasSao(p,'Tuần')) return false;
    return !tuoiXem || tuoiXem > 30;
  }
  function trietActive(p) {
    if (!hasSao(p,'Triệt')) return false;
    return !tuoiXem || tuoiXem <= 30;
  }
  function tuanLamHoaDia(p) {
    return hasSao(p,'Tuần') && (p.diaChi === 'Tỵ' || p.diaChi === 'Ngọ');
  }
  function trietDaoKimCung(p) {
    return hasSao(p,'Triệt') && (p.diaChi === 'Thân' || p.diaChi === 'Dậu');
  }

  // Bộ sao chính tinh
  const BO_MAP = {
    'TPVT': ['Tử Vi','Thiên Phủ','Vũ Khúc','Thiên Tướng'],
    'CNDL': ['Thiên Cơ','Thái Âm','Thiên Đồng','Thiên Lương'],
    'SPT':  ['Thất Sát','Phá Quân','Tham Lang','Liêm Trinh'],
    'CN':   ['Cự Môn','Thái Dương'],
  };
  const SCORE_BO_MAP = {
    'TPVT:TPVT':2,'CNDL:CNDL':2,'SPT:SPT':2,'CN:CN':2,
    'TPVT:SPT':1.5,'SPT:TPVT':1.5,
    'TPVT:CNDL':1,'CNDL:TPVT':1.5,
    'TPVT:CN':0,'CN:TPVT':1,
    'CNDL:SPT':0.5,'SPT:CNDL':0.5,
    'CNDL:CN':0.5,'CN:CNDL':1.5,
    'SPT:CN':0,'CN:SPT':0,
  };
  function getBo(stars) {
    const names = stars.map(s => s.ten);
    for (const [bo, list] of Object.entries(BO_MAP)) {
      if (list.some(s => names.includes(s))) return bo;
    }
    return null;
  }

  // Mệnh palace info
  const menhP = palaces.find(p => p.isMenh);
  const boMenh = menhP ? getBo(menhP.majorStars) : null;

  // cachCuc per cung (good loais)
  const cachCucByCung = {};
  for (const cc of (cachCuc || [])) {
    if (!cachCucByCung[cc.cung]) cachCucByCung[cc.cung] = [];
    cachCucByCung[cc.cung].push(cc);
  }

  // cachCucTungCung tag scoring
  function getYNghiaTags(cungName) {
    const items = (cachCucTungCung || {})[cungName] || [];
    let catScore = 0, hungScore = 0;
    for (const s of items) {
      if (s.includes('đại cát')) catScore += 1.5;
      else if (s.includes('[cát]') || s.includes('cát') && !s.includes('không') && !s.includes('kém')) catScore += 0.5;
      if (s.includes('đại hung')) hungScore += 2;
      else if (s.includes('hung') && !s.includes('đại hung') && !s.includes('giảm hung')) hungScore += 1;
    }
    return { catScore: Math.min(catScore, 4), hungScore: Math.min(hungScore, 4) };
  }

  // ─── PER CUNG SCORING ─────────────────────────────────────────
  const scores = {};

  for (const p of palaces) {
    const cungName = p.cungName;
    const dc = p.diaChi;
    const allTPTC = getAllStars(p);
    const ownStars = getOwnStars(p);
    const isVCD = isVoChinhDieu(p);
    const tuanOn = tuanActive(p);
    const trietOn = trietActive(p);
    const tuanHoa = tuanLamHoaDia(p);
    const trietKim = trietDaoKimCung(p);
    const ynTags = getYNghiaTags(cungName);
    const ccList = cachCucByCung[cungName] || [];

    // ── 1. TIỀM NĂNG (0-10) ──────────────────────────────────────
    let tiemNang = 0;
    if (isVCD) {
      // Mượn cung xung chiếu
      const xung = p.xungChieuCung;
      if (xung && xung.majorStars.length > 0) {
        const xungBright = xung.majorStars[0].brightness;
        tiemNang = brightScore(xungBright) * 0.7;
      } else {
        tiemNang = 4;
      }
    } else {
      // Chính tinh sáng nhất
      const mainStar = p.majorStars[0];
      if (mainStar) {
        tiemNang = brightScore(mainStar.brightness);
        // Hóa
        if (mainStar.hoa === 'Lộc') tiemNang += 2;
        else if (mainStar.hoa === 'Quyền') tiemNang += 1.5;
        else if (mainStar.hoa === 'Khoa') tiemNang += 1;
        else if (mainStar.hoa === 'Kỵ') tiemNang -= 2;
      }
    }
    // Hóa trong TPTC
    if (allTPTC.includes('Hóa Lộc') && !p.stars.some(s=>s.ten==='Hóa Lộc' && s.hoa)) tiemNang += 1;
    if (allTPTC.includes('Lộc Tồn')) tiemNang += 1;
    // cachCuc đặc biệt
    for (const cc of ccList) {
      tiemNang += LOAI_SCORE[cc.loai] ?? 0;
    }
    tiemNang += ynTags.catScore * 0.5;
    tiemNang -= ynTags.hungScore * 0.5;
    // Tuần/Triệt ảnh hưởng tiềm năng
    if (tuanOn && !tuanHoa) tiemNang *= 0.8;
    if (trietOn && !trietKim) tiemNang *= 0.6;
    if (tuanHoa || trietKim) tiemNang = Math.min(tiemNang * 1.1, 10);
    tiemNang = r1(clamp(tiemNang));

    // ── 2. BỀN VỮNG (0-10) ───────────────────────────────────────
    let benVung = 8;
    // Biến động stars
    for (const s of BIEN_DONG) {
      if (allTPTC.includes(s)) benVung -= 1.5;
    }
    // Sát tinh
    for (const s of SAT_TINH) {
      if (allTPTC.includes(s)) benVung -= 0.8;
    }
    // Ổn định
    if (allTPTC.includes('Lộc Tồn')) benVung += 1.5;
    if (p.majorStars.some(s=>['Thiên Phủ','Thiên Tướng'].includes(s.ten))) benVung += 1;
    if (tuanOn) benVung += 0.5; // Tuần giảm biến động
    // Hãm chính tinh → bất ổn
    if (p.majorStars.some(s=>s.brightness==='Hãm')) benVung -= 1;
    benVung = r1(clamp(benVung));

    // ── 3. AN TOÀN (0-10, cao = tốt) ───────────────────────────
    // Tính ngược từ Rủi Ro: anToan = 10 - ruiRo
    let _ruiRo = 2;
    for (const s of SAT_TINH) {
      if (allTPTC.includes(s)) _ruiRo += 1.2;
    }
    for (const s of BAI_TINH) {
      if (ownStars.includes(s)) _ruiRo += 0.7;
    }
    if (allTPTC.includes('Hóa Kỵ')) _ruiRo += 1.5;
    if (allTPTC.includes('Thiên Hình')) _ruiRo += 1;
    if (p.majorStars.some(s=>['Thiên Phủ','Thiên Tướng'].includes(s.ten))) _ruiRo -= 1;
    if (allTPTC.includes('Lộc Tồn')) _ruiRo -= 1;
    for (const cc of ccList) {
      if (['quy_cuc','phu_cuc'].includes(cc.loai)) _ruiRo -= 0.5;
    }
    _ruiRo += ynTags.hungScore * 0.4;
    _ruiRo -= ynTags.catScore * 0.2;
    if (trietOn) _ruiRo *= 0.3;
    else if (tuanOn && !tuanHoa) _ruiRo *= 0.5;
    if (tuanHoa || trietKim) _ruiRo *= 0.7;
    const anToan = r1(clamp(10 - _ruiRo));

    // ── 4. QUÝ NHÂN (0-10) ───────────────────────────────────────
    let quyNhan = 2;
    if (allTPTC.includes('Tả Phù')) quyNhan += 1.5;
    if (allTPTC.includes('Hữu Bật')) quyNhan += 1.5;
    if (allTPTC.includes('Thiên Khôi')) quyNhan += 1.5;
    if (allTPTC.includes('Thiên Việt')) quyNhan += 1.5;
    if (allTPTC.includes('Văn Xương')) {
      const wx = p.tamHopCungs?.flatMap(c=>c.stars).concat(p.stars)
        .find(s=>s.ten==='Văn Xương');
      if (wx && ['Miếu','Vượng','Đắc'].includes(wx.brightness)) quyNhan += 1;
      else quyNhan += 0.5;
    }
    if (allTPTC.includes('Văn Khúc')) quyNhan += 0.8;
    if (allTPTC.includes('Hóa Khoa')) quyNhan += 1;
    if (allTPTC.includes('Thiên Mã') && !allTPTC.includes('Hóa Kỵ')) quyNhan += 0.5;
    // Sát tinh giảm quý nhân
    if (allTPTC.includes('Địa Không')) quyNhan -= 1;
    if (allTPTC.includes('Địa Kiếp')) quyNhan -= 1;
    if (allTPTC.includes('Hóa Kỵ')) quyNhan -= 1;
    // cachCuc
    for (const cc of ccList) {
      if (['quy_cuc','phu_cuc'].includes(cc.loai)) quyNhan += 1;
    }
    quyNhan = r1(clamp(quyNhan));

    // ── 5. MINH BẠCH (0-10) ──────────────────────────────────────
    let minhBach = 8;
    if (isVCD) minhBach -= 2;
    if (tuanOn && !tuanHoa) minhBach -= 1.5;
    if (trietOn && !trietKim) minhBach -= 2.5;
    if (tuanHoa || trietKim) minhBach += 1;
    // Mâu thuẫn: vừa có cát cục vừa có hung cục
    const hasDaiCat = (cachCucTungCung?.[cungName]||[]).some(s=>s.includes('đại cát'));
    const hasDaiHung = (cachCucTungCung?.[cungName]||[]).some(s=>s.includes('đại hung'));
    if (hasDaiCat && hasDaiHung) minhBach -= 2;
    // Sao hãm và sao miếu cùng cung → mâu thuẫn
    const hasMieu = p.majorStars.some(s=>['Miếu','Vượng'].includes(s.brightness));
    const hasHam  = p.majorStars.some(s=>s.brightness==='Hãm');
    if (hasMieu && hasHam) minhBach -= 1;
    // Nhiều sát tinh trong cung → rối
    const ownSatCount = SAT_TINH.filter(s=>ownStars.includes(s)).length;
    minhBach -= ownSatCount * 0.5;
    minhBach = r1(clamp(minhBach));

    // ── 6. TƯƠNG HỢP (0-10) ──────────────────────────────────────
    let tuongHop = 5;
    // Ngũ hành chính tinh vs nạp âm bản mệnh
    const mainStarName = p.majorStars[0]?.ten;
    const starHanh = STAR_HANH[mainStarName];
    const menhHanh = napAmHanh;
    if (starHanh && menhHanh) {
      if (starHanh === menhHanh)                           tuongHop += 3;   // đồng hành
      else if (NGU_HANH_SINH_MAP[starHanh] === menhHanh)  tuongHop += 5;   // sinh nhập
      else if (NGU_HANH_SINH_MAP[menhHanh] === starHanh)  tuongHop += 1;   // sinh xuất
      else if (NGU_HANH_KHAC_MAP[menhHanh] === starHanh)  tuongHop -= 1;   // khắc xuất
      else if (NGU_HANH_KHAC_MAP[starHanh] === menhHanh)  tuongHop -= 3;   // khắc nhập
    }
    // Bộ sao cung vs bộ sao Mệnh
    const boCung = getBo(p.majorStars);
    if (boMenh && boCung) {
      const boKey = boMenh + ':' + boCung;
      const boScoreRaw = SCORE_BO_MAP[boKey] ?? 1;
      // scale 0-2 → -2 to +3
      tuongHop += (boScoreRaw - 1) * 2;
    }
    tuongHop = r1(clamp(tuongHop));

    scores[cungName] = {
      tiemNang,
      benVung,
      anToan,
      quyNhan,
      minhBach,
      tuongHop,
    };
  }

  return scores;
}







// ================================================================
// PHÂN TÍCH ĐẠI VẬN RULES — text labels cho phần A pre-generated
// Input: dvPalace (cung đại vận), menhPalace, ls (lá số đầy đủ)
// Output: array of { text, type } — type: 'tot'|'xau'|'trung'|'canh_bao'
// ================================================================

function phanTichDaiVanRules(dvPalace, menhPalace, ls) {
  if (!dvPalace || !menhPalace) return [];

  const results = [];
  function add(text, type='trung') { results.push({ text, type }); }

  // ─── STAR NAME ALIASES (rules shortcode → engine name) ──────
  const ALIAS = {
    'tu':'Tử Vi','phu':'Thiên Phủ','co':'Thiên Cơ','nhat':'Thái Dương',
    'nguyet':'Thái Âm','dong':'Thiên Đồng','liem':'Liêm Trinh',
    'tham':'Tham Lang','cu':'Cự Môn','tuong':'Thiên Tướng',
    'luong':'Thiên Lương','sat':'Thất Sát','pha':'Phá Quân','vu':'Vũ Khúc',
    'kinh':'Kình Dương','da':'Đà La','hoa':'Hỏa Tinh','linh':'Linh Tinh',
    'khong':'Địa Không','kiep':'Địa Kiếp',
    'ta':'Tả Phụ','huu':'Hữu Bật','khoi':'Thiên Khôi','viet':'Thiên Việt',
    'xuong':'Văn Xương','khuc':'Văn Khúc','loc':'Lộc Tồn','ma':'Thiên Mã',
    'hinh':'Thiên Hình','rieu':'Thiên Riêu',
    'hoa_loc':'Hóa Lộc','quyen':'Hóa Quyền','khoa':'Hóa Khoa','ky':'Hóa Kỵ',
    'tang':'Tang Môn','ho':'Bạch Hổ','khoc':'Thiên Khốc','hu':'Thiên Hư',
    'long':'Long Trì','phuong':'Phượng Các','hong':'Hồng Loan','dao':'Đào Hoa',
    'hi':'Thiên Hỷ','thai':'Thai','tue':'Thái Tuế','dieu':'Điếu Khách',
    'moc':'Mộc Dục','tuyet':'Tuyệt','suy':'Suy','benh':'Bệnh',
    'phu_benh':'Bệnh Phù','phi':'Phi Liêm','tau':'Tấu Thư',
    'quang':'Ân Quang','quy':'Thiên Quý',
    'giai':'Thiên Giải','dia_giai':'Địa Giải','giai_than':'Giải Thần',
    'thien_khong':'Thiên Không',
    'hao':'Đại Hao','tieu_hao':'Tiểu Hao',
    'thanh_long':'Thanh Long','thai_toa':'Thái Tọa',
    'tuong_quan':'Tướng Quân','phuc_binh':'Phục Binh',
    'quoc_an':'Quốc Ấn','duong_phu':'Đường Phù',
    'thai_cao':'Thái Cao','la':'Đà La',
    'vuong':'Đế Vượng','sinh':'Tràng Sinh',
    'phuong_cac':'Phượng Các',
    'an':'Ân Quang', 'khach':'Điếu Khách',
    'phuc':'Phục Binh','thuong':'Thiên Thương',
    'qua':'Quả Tú','rieu':'Thiên Riêu',
  };

  // ─── HELPERS ────────────────────────────────────────────────
  const DC_HANH_LOCAL = {
    'Tý':'Thủy','Hợi':'Thủy','Dần':'Mộc','Mão':'Mộc',
    'Tỵ':'Hỏa','Ngọ':'Hỏa','Thìn':'Thổ','Tuất':'Thổ','Sửu':'Thổ','Mùi':'Thổ',
    'Thân':'Kim','Dậu':'Kim',
  };
  const NGU_HANH_SINH_LOCAL = {'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc'};
  const NGU_HANH_KHAC_LOCAL = {'Kim':'Mộc','Mộc':'Thổ','Thổ':'Thủy','Thủy':'Hỏa','Hỏa':'Kim'};

  // All TPTC stars (tam phương tứ chính) of dvPalace
  const tptcPalaces = [dvPalace, ...(dvPalace.tamHopCungs||[]), dvPalace.xungChieuCung].filter(Boolean);
  const tptcStarNames = tptcPalaces.flatMap(p => (p.stars||[]).map(s => s.ten));
  const ownStarNames  = (dvPalace.stars||[]).map(s => s.ten);

  function hasSao(name) { return tptcStarNames.includes(ALIAS[name] || name); }
  function hasSaoOwn(name) { return ownStarNames.includes(ALIAS[name] || name); }
  function hasAny(arr) { return arr.some(n => hasSao(n)); }
  function hasAll(arr) { return arr.every(n => hasSao(n)); }

  // Sao tốt / sao xấu in TPTC
  const SAT_TINH = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
  const BAI_TINH = ['Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao','Hóa Kỵ'];
  const CAT_TINH = ['Tả Phụ','Hữu Bật','Thiên Khôi','Thiên Việt','Văn Xương','Văn Khúc',
                    'Lộc Tồn','Hóa Lộc','Hóa Quyền','Hóa Khoa','Thiên Mã'];
  const satCount = SAT_TINH.filter(s => tptcStarNames.includes(s)).length;
  const baiCount = BAI_TINH.filter(s => tptcStarNames.includes(s)).length;
  const catCount = CAT_TINH.filter(s => tptcStarNames.includes(s)).length;
  const nhieuSaoTot = catCount >= 3;
  const nhieuSaoXau = (satCount + baiCount) >= 3;

  // Chính tinh đại vận
  const dvMajor = dvPalace.majorStars || [];
  const dvMainStar = dvMajor[0];
  const dvStarName = dvMainStar?.ten;
  const dvBright = dvMainStar?.brightness;
  const isSang = ['Miếu','Vượng','Đắc'].includes(dvBright);
  const isMoAm = ['Hãm'].includes(dvBright);
  const isVCD = dvMajor.length === 0;

  // Chính tinh Mệnh
  const menhMajor = menhPalace.majorStars || [];
  const menhMainStar = menhMajor[0];
  const menhStarName = menhMainStar?.ten;
  const menhBright = menhMainStar?.brightness;
  const isMenhSang = ['Miếu','Vượng','Đắc'].includes(menhBright);
  const isMenhMoAm = menhBright === 'Hãm';
  const isMenhVCD = menhMajor.length === 0;

  // Tuần/Triệt in dvPalace
  const hasTuan = ownStarNames.includes('Tuần');
  const hasTriet = ownStarNames.includes('Triệt');
  const hasTuanTriet = hasTuan || hasTriet;
  const dvDC = dvPalace.diaChi;
  const tuanLamHoa = hasTuan && (dvDC === 'Tỵ' || dvDC === 'Ngọ');
  const trietKimCung = hasTriet && (dvDC === 'Thân' || dvDC === 'Dậu');

  // Ngũ hành
  const dvHanh = DC_HANH_LOCAL[dvDC];
  const menhHanh = ls.napAmHanh;
  const chiNamSinh = ls.chiNamSinh || ls._conv?.chiNam;

  // Tứ Mộ
  const TU_MO = ['Thìn','Tuất','Sửu','Mùi'];
  const isDVTuMo = TU_MO.includes(dvDC);

  // Bộ sao groups
  const BO_MAP = {
    TPVT: ['Tử Vi','Thiên Phủ','Vũ Khúc','Thiên Tướng'],
    CNDL: ['Thiên Cơ','Thái Âm','Thiên Đồng','Thiên Lương'],
    SPT:  ['Thất Sát','Phá Quân','Tham Lang','Liêm Trinh'],
    CN:   ['Cự Môn','Thái Dương'],
  };
  function getBo(starName) {
    for (const [bo, list] of Object.entries(BO_MAP)) {
      if (list.includes(starName)) return bo;
    }
    return null;
  }
  const menhBo = getBo(menhStarName);
  const dvBo = getBo(dvStarName);

  // Tương sinh/khắc TPTC vs bản mệnh ngũ hành
  let tuongSinhCount = 0, tuongKhacCount = 0;
  for (const p of tptcPalaces) {
    const h = DC_HANH_LOCAL[p.diaChi];
    if (!h || !menhHanh) continue;
    if (NGU_HANH_SINH_LOCAL[h] === menhHanh || NGU_HANH_SINH_LOCAL[menhHanh] === h) tuongSinhCount++;
    if (NGU_HANH_KHAC_LOCAL[h] === menhHanh || NGU_HANH_KHAC_LOCAL[menhHanh] === h) tuongKhacCount++;
  }

  // ─── FILE 1: ĐÁNH GIÁ TỔNG QUAN VẬN HẠN ────────────────────
  if (tuongSinhCount >= 2 && tuongKhacCount === 0) add('Tam phương tứ chính tương sinh nhiều — đại vận tốt đẹp', 'tot');
  if (tuongKhacCount >= 2) add('Tam phương tứ chính tương khắc nhiều — đại vận xấu xa', 'xau');

  // Ngũ hành cung nhập hạn sinh chính diệu nhập hạn & chính diệu sinh bản mệnh
  if (dvHanh && dvStarName && menhHanh) {
    const STAR_HANH_LOCAL = {
      'Tử Vi':'Thổ','Thiên Cơ':'Mộc','Thái Dương':'Hỏa','Vũ Khúc':'Kim',
      'Thiên Đồng':'Thủy','Liêm Trinh':'Hỏa','Thiên Phủ':'Thổ','Thái Âm':'Thủy',
      'Tham Lang':'Thủy','Cự Môn':'Thổ','Thiên Tướng':'Thủy','Thiên Lương':'Mộc',
      'Thất Sát':'Kim','Phá Quân':'Thủy',
    };
    const starH = STAR_HANH_LOCAL[dvStarName];
    if (NGU_HANH_SINH_LOCAL[dvHanh] === starH && NGU_HANH_SINH_LOCAL[starH] === menhHanh) {
      add('Cung nhập hạn sinh chính diệu, chính diệu sinh bản mệnh — thuận lý', 'tot');
    }
  }

  // Tỉ lệ sao tốt/xấu
  if (nhieuSaoTot && !nhieuSaoXau) add('Sao tốt vượng trội trong tam phương tứ chính — hạn tốt', 'tot');
  if (nhieuSaoXau && !nhieuSaoTot) add('Sao xấu áp đảo trong tam phương tứ chính — hạn xấu', 'xau');

  // ─── FILE 2: QUAN HỆ BẢN MỆNH VS CUNG NHẬP HẠN ─────────────
  // Ngũ hành bản mệnh vs cung nhập hạn (R5-R9)
  if (menhHanh && dvDC) {
    if (menhHanh === 'Kim' && dvDC === 'Tý')
      add('Bản mệnh Kim — hạn đến cung Tý (Thủy): hao tổn thương, tai ương đáng lo', 'canh_bao');
    if (menhHanh === 'Mộc' && dvDC === 'Ngọ')
      add('Bản mệnh Mộc — hạn đến cung Ngọ (Hỏa): sáng sủa nhưng không lâu bền, khó tránh tai ương', 'canh_bao');
    if (menhHanh === 'Thủy' && dvDC === 'Dần')
      add('Bản mệnh Thủy — hạn đến cung Dần (Mộc): bế tắc, mọi việc trắc trở không xứng ý', 'xau');
    if (menhHanh === 'Hỏa' && dvDC === 'Dậu')
      add('Bản mệnh Hỏa — hạn đến cung Dậu (Kim): nguy khốn, khó tránh tai ương khủng khiếp', 'canh_bao');
    if (menhHanh === 'Thổ' && dvDC === 'Mão')
      add('Bản mệnh Thổ — hạn đến cung Mão (Mộc): suy nhược, bị hoài thương, dễ mắc bệnh nguy hiểm', 'canh_bao');
  }

  // Tuần/Triệt hoặc nhiều sao tốt giải trừ
  if (hasTuanTriet && nhieuSaoTot)
    add('Tuần/Triệt cùng nhiều sao tốt: giải trừ một phần lớn sự chẳng lành', 'tot');

  // ─── FILE 2: NHÓM SAO MỆNH vs NHÓM SAO ĐẠI VẬN ─────────────
  if (menhBo && dvBo) {
    const TPVT_CNDL = ['TPVT','CNDL','CN'];
    const SPT_GROUP = ['SPT'];
    const isM_TPVT_CN = TPVT_CNDL.includes(menhBo);
    const isM_SPT = menhBo === 'SPT';
    const isV_TPVT_CN = TPVT_CNDL.includes(dvBo);
    const isV_SPT = dvBo === 'SPT';

    if (isM_TPVT_CN && isV_TPVT_CN)
      add(`Mệnh ${menhBo} — Hạn ${dvBo}: hiển hách xứng ý toại lòng`, 'tot');
    if (isM_SPT && isV_SPT)
      add('Mệnh Sát Phá Tham — Hạn cùng bộ: hanh thông danh tài hưng vượng', 'tot');
    if (isM_TPVT_CN && isV_SPT)
      add(`Mệnh ${menhBo} — Hạn Sát Phá Tham: trong may có rủi, cần đề phòng`, 'canh_bao');
    if (isM_SPT && isV_TPVT_CN)
      add(`Mệnh Sát Phá Tham — Hạn ${dvBo}: khá giả nhưng chưa toại nguyện`, 'trung');
  }

  // R19-R20: Vũ Tướng
  const menhHasVuTuong = menhMajor.some(s => ['Vũ Khúc','Thiên Tướng'].includes(s.ten));
  const dvHasVuTuong = dvMajor.some(s => ['Vũ Khúc','Thiên Tướng'].includes(s.ten));
  if (menhHasVuTuong && isSang)
    add('Mệnh Vũ/Tướng — Hạn sao tốt: phát đạt tài quan sống mỹ', 'tot');
  if (dvHasVuTuong && isMenhSang)
    add('Hạn Vũ/Tướng — Mệnh tốt: danh tài hoạnh phát', 'tot');

  // R21-R24: vô chính diệu
  if (isMenhVCD && dvBo === 'SPT')
    add('Mệnh vô chính diệu — Hạn Sát Phá Tham: trước khó sau dễ', 'trung');
  if (isMenhVCD && isVCD)
    add('Cả Mệnh lẫn Hạn vô chính diệu: bế tắc thành ít bại nhiều', 'xau');
  if (isVCD && hasTuanTriet)
    add('Hạn vô chính diệu có Tuần/Triệt: hanh thông danh tài hưng vượng', 'tot');

  // ─── FILE 3: RULES THEO TUỔI CHI ────────────────────────────
  if (chiNamSinh) {
    const chi = chiNamSinh;
    if (chi === 'Tý' && (dvDC === 'Dần' || dvDC === 'Thân'))
      add('Tuổi Tý — hạn đến Dần/Thân: kỵ năm hạn và năm xung', 'canh_bao');
    if ((chi === 'Sửu' || chi === 'Ngọ') && (dvDC === 'Sửu' || dvDC === 'Ngọ') && nhieuSaoXau)
      add('Tuổi Sửu/Ngọ — hạn đến Sửu/Ngọ: rất đáng lo ngại nếu có sát nhập hạn', 'canh_bao');
    if ((chi === 'Dần' || chi === 'Mão') && (dvDC === 'Tý' || dvDC === 'Hợi'))
      add('Tuổi Dần/Mão — hạn đến Tý/Hợi: kỵ năm hạn và năm xung', 'canh_bao');
    if (chi === 'Thìn' && (dvDC === 'Thìn' || dvDC === 'Tuất'))
      add('Tuổi Thìn — hạn đến Thìn/Tuất: rất kỵ, cần xem xét cung An Thân', 'canh_bao');
    if (chi === 'Tỵ' && (dvDC === 'Tỵ' || dvDC === 'Hợi'))
      add('Tuổi Tỵ — hạn đến Tỵ/Hợi: rất kỵ, cần xem xét cung An Thân', 'canh_bao');
    if (chi === 'Mùi' && (dvDC === 'Dậu' || dvDC === 'Hợi') && nhieuSaoXau)
      add('Tuổi Mùi — hạn đến Dậu/Hợi: rất đáng lo ngại', 'canh_bao');
    if (chi === 'Thân' && (dvDC === 'Ngọ') && nhieuSaoXau)
      add('Tuổi Thân — hạn đến Ngọ: rất kỵ gặp Hỏa Linh nhập hạn', 'canh_bao');
    if (chi === 'Dậu' && (dvDC === 'Dậu' || dvDC === 'Mão') && nhieuSaoXau)
      add('Tuổi Dậu — hạn đến Dậu/Mão: rất kỵ gặp Kình Đà nhập hạn', 'canh_bao');
    if (chi === 'Tuất' && (dvDC === 'Tý') && nhieuSaoXau)
      add('Tuổi Tuất — hạn đến Tý: rất kỵ, cần xem cung Thìn/Tuất và An Thân', 'canh_bao');
    if (chi === 'Hợi' && (dvDC === 'Hợi' || dvDC === 'Tỵ') && nhieuSaoXau)
      add('Tuổi Hợi — hạn đến Hợi/Tỵ: rất kỵ gặp Kình Đà nhập hạn', 'canh_bao');
  }

  // ─── FILE 4: CHÍNH TINH CUNG ĐẠI VẬN ───────────────────────

  // THAM LANG
  if (dvStarName === 'Tham Lang') {
    if (isSang) add('Tham Lang sáng — hạn hanh thông, có công danh, có hoạnh tài', 'tot');
    if (isSang && isDVTuMo) add('Tham Lang sáng ở Tứ Mộ — phát đạt hiển hách', 'tot');
    if (isSang && hasAny(['hoa','linh'])) add('Tham Lang sáng hội Hỏa/Linh — hoạnh phát danh tài', 'tot');
    if (isMoAm) add('Tham Lang mờ — hao tài phóng đãng, bế tắc, truất quan', 'xau');
    if (hasAll(['vu','loc','ma'])) add('Tham Lang hội Vũ Lộc Mã — có danh chức tài lộc', 'tot');
    if (hasAny(['hong','dao'])) add('Tham Lang hội Hồng/Đào — thành gia thất', 'trung');
    if (hasAll(['luong','ky'])) add('Tham Lang hội Lương Kỵ — vật rơi gây thương tích', 'canh_bao');
    if (hasAll(['rieu','ky'])) add('Tham Lang hội Thiên Riêu Hóa Kỵ — tai nạn sông nước, khẩu thiệt kiện tụng', 'canh_bao');
    if (hasAny(['khong','kiep'])) add('Tham Lang hội Không/Kiếp — bế tắc hao tài truất quan', 'xau');
    if (hasSao('ho')) add('Tham Lang hội Bạch Hổ — bị súc vật cắn hoặc tai nạn xe cộ', 'canh_bao');
  }

  // CỰ MÔN
  if (dvStarName === 'Cự Môn') {
    if (isSang) add('Cự Môn sáng — toại lòng, hoạnh phát danh tài, thắng tranh chấp', 'tot');
    if (isSang && dvDC === 'Hợi' && hasSao('loc')) add('Cự Môn sáng ở Hợi hội Lộc — không nên mưu việc lớn để tránh thất bại', 'canh_bao');
    if (isMoAm) add('Cự Môn mờ — phiền lòng thị phi kiện cáo hao tài đau ốm có tang', 'xau');
    if (isMoAm && isDVTuMo && nhieuSaoXau) add('Cự Môn mờ ở Tứ Mộ hạn xấu — nguy hiểm tính mạng', 'canh_bao');
    if (hasSao('ky')) add('Cự Môn hội Hóa Kỵ — tai nạn sông nước, thị phi', 'canh_bao');
    if (hasSao('tang')) add('Cự Môn hội Tang Môn — đau ốm nặng, có tang lớn', 'xau');
    if (hasAll(['tang','hoa','linh'])) add('Cự Môn hội Tang Hỏa Linh — đau ốm tán tài, có tang hoặc cháy nhà', 'canh_bao');
  }

  // THIÊN TƯỚNG
  if (dvStarName === 'Thiên Tướng') {
    if (isSang) add('Thiên Tướng sáng — toại lòng danh tài hưng vượng, có hoạnh tài', 'tot');
    if (isMoAm && nhieuSaoXau) add('Thiên Tướng mờ hội sát tinh — kiện cáo đau ốm, mắc lừa', 'xau');
    if (isMoAm && nhieuSaoXau && nhieuSaoXau) add('Thiên Tướng mờ hội sát tinh hạn xấu — tính mạng lâm nguy', 'canh_bao');
    if (hasAny(['khong','kiep'])) add('Thiên Tướng hội Không/Kiếp — rắc rối bị ám hại, không đáng lo', 'trung');
    if (hasAll(['khoi','hinh'])) add('Thiên Tướng hội Khôi Hình — tai nạn đao thương, đau mắt bệnh', 'canh_bao');
    if (hasTuanTriet) add('Thiên Tướng gặp Tuần/Triệt — đau ốm, tai nạn xe cộ, đao thương, công danh trắc trở', 'canh_bao');
  }

  // THIÊN LƯƠNG
  if (dvStarName === 'Thiên Lương') {
    add('Thiên Lương — có khả năng giải trừ tai họa', 'tot');
    if (isSang) add('Thiên Lương sáng — danh tài hưng vượng, gặp quý nhân', 'tot');
    if (isMoAm) add('Thiên Lương mờ — hao tài, sức khỏe kém', 'xau');
    if (isMoAm && (dvDC === 'Tý' || dvDC === 'Hợi')) add('Thiên Lương mờ ở Tý/Hợi — đi xa hoặc thay đổi công việc', 'trung');
    if (nhieuSaoXau) add('Thiên Lương hội nhiều sát tinh — khuynh gia bại sản', 'canh_bao');
  }

  // THẤT SÁT
  if (dvStarName === 'Thất Sát') {
    if (isSang) add('Thất Sát sáng — hòa khí danh tài hưng vượng', 'tot');
    if (isSang && (dvDC === 'Dần' || dvDC === 'Thân')) add('Thất Sát sáng ở Dần/Thân — tài quan sống mỹ, mưu sự nhanh thành', 'tot');
    if (isMoAm) add('Thất Sát mờ — buồn bực đau ốm có tang, thất bại', 'xau');
    if (isMoAm && nhieuSaoXau) add('Thất Sát mờ hội sát tinh — tai nạn xe cộ đao thương', 'canh_bao');
    if (isDVTuMo && nhieuSaoXau) add('Thất Sát ở Tứ Mộ hạn xấu — nguy hiểm tính mạng', 'canh_bao');
    if (hasAll(['liem','tham','phuong'])) add('Thất Sát hội Liêm Tham Phượng — bị trách oan', 'xau');
    if (hasAll(['pha','hinh'])) add('Thất Sát hội Phá Quân Hình — tù tội', 'canh_bao');
    if (hasAll(['pha','hao'])) add('Thất Sát hội Phá Mộc Dục Hóa Kỵ — ung thư mụn nhọt, phẫu thuật', 'canh_bao');
    if (hasAll(['kinh','khong','hoa','linh','ky','kiep'])) add('Thất Sát hội đủ sát tinh — tính mạng lâm nguy', 'canh_bao');
    if (hasSao('ky')) add('Thất Sát hội Hóa Kỵ — đau đớn nhục nhã', 'xau');
  }

  // PHÁ QUÂN
  if (dvStarName === 'Phá Quân') {
    if (isSang) add('Phá Quân sáng — tài lộc công danh hiển đạt', 'tot');
    if (isSang && hasAll(['xuong','khuc','khoi','viet'])) add('Phá Quân sáng hội Xương Khúc Khôi Việt — tài quan sống mỹ phú quý', 'tot');
    if (isMoAm) add('Phá Quân mờ — đau ốm tù tội có tang, truất quan', 'xau');
    if (isMoAm && nhieuSaoXau) add('Phá Quân mờ hội sát tinh hạn xấu — tính mạng lâm nguy', 'canh_bao');
    if (hasAll(['liem','hoa'])) add('Phá Quân hội Liêm Hỏa — hao tài tù tội', 'canh_bao');
    if (hasAll(['hinh','linh','hoa','viet'])) add('Phá Quân hội Hình Linh Hỏa Việt — điện giật, sét đánh, đao thương', 'canh_bao');
    if (hasSao('phuong')) add('Phá Quân hội Phượng Các — bị trách oan', 'xau');
    if (hasSao('tue')) add('Phá Quân hội Thái Tuế — kiện tụng', 'xau');
    if (hasSao('qua')) add('Phá Quân hội Quả Tú — tai nạn đơn độc trên đường', 'canh_bao');
    if (hasAll(['phuc','tuong','rieu','thai'])) add('Phá Quân hội Phục/Tướng/Riêu/Thai — rắc rối tình duyên', 'trung');
  }

  // ─── FILE 5: PHỤ TINH ───────────────────────────────────────

  // LINH TINH
  if (hasSao('linh')) {
    if (isSang || nhieuSaoTot) add('Linh Tinh sáng — danh tài hưng vượng nổi tiếng xa gần', 'tot');
    else add('Linh Tinh mờ — đau yếu phát điên, tai nạn đao súng điện lửa, kiện tụng có tang', 'xau');
    if (hasAll(['xuong','vu','la'])) add('Linh Tinh hội Xương Vũ Đà — chết đuối hoặc tù tội', 'canh_bao');
    if (hasAll(['sat','pha'])) add('Linh Tinh hội Thất Sát Phá Quân — tù tội', 'canh_bao');
    if (hasSao('viet')) add('Linh Tinh hội Thiên Việt — sét đánh', 'canh_bao');
  }

  // KHÔNG/KIẾP
  if (hasAny(['khong','kiep'])) {
    if (nhieuSaoTot) add('Địa Không/Kiếp hội nhiều sao tốt — mưu sự nhanh thành, hoạnh phát danh tài, dễ đau yếu mụn nhọt', 'trung');
    else add('Địa Không/Kiếp hội sao xấu — bệnh khí huyết, mất của, truất quan', 'xau');
    if (hasSao('tham')) add('Không/Kiếp hội Tham Lang — bế tắc hao tài', 'xau');
    if (hasAny(['ta','huu'])) add('Không/Kiếp hội Tả/Hữu — bị lừa bởi người khác', 'canh_bao');
    if (hasAll(['hoa','linh','ky','tue'])) add('Không/Kiếp hội Hỏa Linh Kỵ Tuế — tai nạn nguy hiểm hoặc bị giết', 'canh_bao');
    if (hasSao('quyen')) add('Không/Kiếp hội Hóa Quyền — công danh trắc trở bị gièm pha', 'xau');
  }

  // LỘC TỒN
  if (hasSao('loc')) {
    add('Lộc Tồn — hanh thông danh tài hưng vượng, gặp quý nhân', 'tot');
    if (hasAll(['khoa','quyen','ta','huu'])) add('Lộc Tồn hội Khoa Quyền Tả Hữu — hoạnh phát phú quý', 'tot');
    if (hasSao('hoa_loc')) add('Lộc Tồn hội Hóa Lộc cùng cung — tốt đẹp bị chiết giảm', 'trung');
    if (hasSao('ma')) add('Lộc Tồn hội Thiên Mã — mưu sự toại lòng, buôn bán phát đạt', 'tot');
    if (hasAny(['khong','kiep'])) add('Lộc Tồn hội Không/Kiếp — đau yếu mất của', 'xau');
    if (hasAll(['khong','kiep','tue'])) add('Lộc Tồn hội Không Kiếp Tuế — tính mạng lâm nguy hoặc tù tội', 'canh_bao');
  }

  // TẢ/HỮU
  if (hasAny(['ta','huu'])) {
    if (nhieuSaoTot) add('Tả Phụ/Hữu Bật hội nhiều sao tốt — hanh thông hoạnh phát gặp quý nhân', 'tot');
    if (nhieuSaoXau) add('Tả Phụ/Hữu Bật hội nhiều sao xấu — nhân ly tài tán đau yếu buồn phiền', 'xau');
    if (hasAll(['khoa','quyen','loc'])) add('Tả/Hữu hội Khoa Quyền Lộc — cao thăng gần nguyên thủ, tài lộc phong túc', 'tot');
    if (nhieuSaoXau) add('Tả/Hữu hội sát tinh — có tang mất của bế tắc', 'xau');
  }

  // XƯƠNG/KHÚC
  if (hasAny(['xuong','khuc'])) {
    if (isSang || nhieuSaoTot) add('Văn Xương/Khúc sáng — toại lòng, đỗ đạt cao', 'tot');
    else add('Văn Xương/Khúc mờ — sức khỏe kém, hao tài kiện tụng', 'xau');
    if (hasAll(['dong','ta','huu'])) add('Xương/Khúc hội Đồng Tả Hữu — tài lộc dồi dào', 'tot');
    if (hasAll(['liem','kinh','da'])) add('Xương/Khúc hội Liêm Kình Đà — tai nạn khủng khiếp hoặc tù tội', 'canh_bao');
    if (hasSao('ky')) add('Xương/Khúc hội Hóa Kỵ — công danh trắc trở có tang', 'xau');
    if (hasSao('tue')) add('Xương/Khúc hội Thái Tuế — có quan chức lớn', 'tot');
    if (nhieuSaoXau) add('Xương/Khúc hội sát tinh — tai nạn hoặc kiện cáo hao tài', 'canh_bao');
  }

  // HÓA LỘC
  if (hasSao('hoa_loc')) {
    add('Hóa Lộc — giải trừ tai họa, tài lộc phong túc', 'tot');
    if (hasAny(['tham','vu'])) add('Hóa Lộc hội Tham/Vũ — hanh thông phát đạt', 'tot');
  }

  // HÓA QUYỀN
  if (hasSao('quyen')) {
    if (nhieuSaoTot) add('Hóa Quyền hội nhiều sao tốt — khỏe mạnh hoạnh phát có uy quyền', 'tot');
    if (nhieuSaoXau) add('Hóa Quyền hội nhiều sao xấu — tai họa liên miên, công danh trắc trở', 'xau');
    if (hasAny(['tham','vu'])) add('Hóa Quyền hội Tham/Vũ — toại lòng có uy quyền', 'tot');
    if (hasTuanTriet) add('Hóa Quyền gặp Tuần/Triệt — công danh trắc trở bị gièm pha', 'canh_bao');
  }

  // HÓA KHOA
  if (hasSao('khoa')) {
    add('Hóa Khoa — giải trừ tai họa, hanh thông', 'tot');
    if (hasAll(['khoi','viet','xuong','khuc'])) add('Hóa Khoa hội Khôi Việt Xương Khúc — đỗ đạt cao, cao thăng', 'tot');
  }

  // HÓA KỴ
  if (hasSao('ky')) {
    if (isSang || nhieuSaoTot) add('Hóa Kỵ sáng cung — hanh thông nhưng kém sức khỏe, thị phi', 'trung');
    else add('Hóa Kỵ mờ — đau yếu mất của kiện cáo truất quan', 'xau');
    if (hasAll(['pha','tue'])) add('Hóa Kỵ hội Phá Quân Thái Tuế — cãi nhau đánh lộn', 'xau');
    if (hasAll(['pha','kinh'])) add('Hóa Kỵ hội Phá Kình — đánh lộn bị thương', 'canh_bao');
    if (hasAll(['sat','da'])) add('Hóa Kỵ hội Thất Sát Đà La — đau yếu nhục nhã', 'xau');
    if (hasAll(['da','ho'])) add('Hóa Kỵ hội Đà Bạch Hổ — tai nạn khủng khiếp', 'canh_bao');
    if (hasAll(['hinh','kiep'])) add('Hóa Kỵ hội Hình Kiếp — đao thương mổ xe', 'canh_bao');
    if (hasAny(['hong','dao'])) add('Hóa Kỵ hội Hồng/Đào — tình duyên rắc rối', 'trung');
    if (hasAny(['khong','kiep'])) add('Hóa Kỵ hội Không/Kiếp — tai nạn liên miên mất của truất quan', 'canh_bao');
  }

  // SONG HAO (Đại Hao + Tiểu Hao)
  if (hasSao('hao')) {
    add('Song Hao — thay đổi chỗ ở, công việc hoặc xa nhà', 'trung');
    if (nhieuSaoTot) add('Song Hao hội nhiều sao tốt — hoạnh phát dễ kiếm tiền', 'tot');
    if (nhieuSaoXau) add('Song Hao hội nhiều sao xấu — mất của đau yếu buồn phiền', 'xau');
    if (hasSao('pha')) add('Song Hao hội Phá Quân — hao tài tung thiếu', 'xau');
    if (hasAll(['hinh','kiep'])) add('Song Hao hội Hình Kiếp — đau yếu mổ xe hoặc mất cắp', 'canh_bao');
    if (hasSao('tuyet')) add('Song Hao hội Tuyệt — phá sản', 'canh_bao');
  }

  // TANG MÔN
  if (hasSao('tang')) {
    add('Tang Môn — có tang, đau yếu, mất của, tù tội', 'xau');
    if (hasAll(['ho','khoc'])) add('Tang Môn hội Bạch Hổ Thiên Khốc — người chết hao tài', 'xau');
    if (hasAll(['ho','khoc','hu'])) add('Tang Môn hội Hổ Khốc Hư — bệnh phổi buồn phiền', 'xau');
    if (hasAll(['hinh','dieu'])) add('Tang Môn hội Hình Điếu Khách — tang lớn tai nạn xe cộ', 'canh_bao');
    if (hasSao('hoa')) add('Tang Môn hội Hỏa Tinh — cháy nhà', 'canh_bao');
  }

  // ─── FILE 6: PHỤ TINH TIẾP ──────────────────────────────────

  // BẠCH HỔ
  if (hasSao('ho')) {
    add('Bạch Hổ — có tang, mất của, đau yếu, bệnh khí huyết xương cốt', 'xau');
    if (hasSao('tham')) add('Bạch Hổ hội Tham Lang — tai nạn xe cộ hoặc bị ác thú cắn', 'canh_bao');
    if (hasSao('sat')) add('Bạch Hổ hội Thất Sát — tai nạn đao thương hoặc tù tội', 'canh_bao');
    if (hasAll(['hinh','kiep'])) add('Bạch Hổ hội Hình Kiếp — tai nạn xe cộ hoặc ngã đầu', 'canh_bao');
    if (hasSao('khoc')) add('Bạch Hổ hội Thiên Khốc — chó cắn', 'canh_bao');
    if (hasSao('phi')) add('Bạch Hổ hội Phi Liêm — hanh thông hoạnh tài có việc vui', 'tot');
    if (hasSao('tau')) add('Bạch Hổ hội Tấu Thư — toại lòng cao thăng đỗ đạt', 'tot');
  }

  // LONG TRÌ / PHƯỢNG CÁC
  if (hasAny(['long','phuong'])) {
    add('Long Trì/Phượng Các — có việc vui', 'tot');
    if (hasSao('hi')) add('Long/Phượng hội Thiên Hỷ — nên duyên vợ chồng', 'tot');
    if (hasAll(['ma'])) add('Long/Phượng hội Thiên Mã — có con', 'tot');
    if (hasSao('thai')) add('Long/Phượng hội Thai — có tin mang thai', 'tot');
    if (hasAll(['rieu','hi'])) add('Long/Phượng hội Thiên Riêu Hỷ — hanh thông hỷ khí đầy nhà', 'tot');
    if (hasAll(['long','khong','kiep'])) add('Long Trì hội Không/Kiếp — nạn sông nước', 'canh_bao');
    if (hasAll(['long','dieu'])) add('Long Trì hội Điếu Khách — ngã xuống sông ao', 'canh_bao');
    if (hasAll(['phuong','khong','kiep'])) add('Phượng Các hội Không/Kiếp — bị trách oan hoặc bệnh tai', 'xau');
  }

  // ĐÀO HOA
  if (hasSao('dao')) {
    if (nhieuSaoTot) add('Đào Hoa hội nhiều sao tốt — hanh thông danh tài hỷ khí', 'tot');
    if (nhieuSaoXau) add('Đào Hoa hội nhiều sao xấu — có tang đau yếu tình duyên rắc rối', 'xau');
    if (hasAll(['sat','pha','liem','tham','hong'])) add('Đào Hoa hội Sát Phá Liêm Tham Hồng — nên duyên vợ chồng', 'tot');
    if (hasAll(['hong','hi','rieu'])) add('Đào Hoa hội Hồng Hỷ Riêu — có nhân tình', 'trung');
    if (hasAll(['khong','kiep','benh'])) add('Đào Hoa hội Không Kiếp Bệnh Phù — bệnh phong tình', 'canh_bao');
  }

  // HỒNG LOAN
  if (hasSao('hong')) {
    if (nhieuSaoTot) add('Hồng Loan hội nhiều sao tốt — hanh thông thăng tiến hỷ khí', 'tot');
    if (nhieuSaoXau) add('Hồng Loan hội nhiều sao xấu — đau yếu buồn phiền có tang', 'xau');
    if (hasAll(['ta','huu','long','phuong','rieu'])) add('Hồng Loan hội Tả Hữu Long Phượng Riêu — hoạnh phát có việc mừng', 'tot');
    if (hasSao('thanh_long')) add('Hồng Loan hội Thanh Long — tai nạn bất ngờ', 'canh_bao');
  }

  // THIÊN MÃ
  if (hasSao('ma')) {
    add('Thiên Mã — thay đổi chỗ ở, công việc', 'trung');
    if (hasAll(['tu','phu'])) add('Thiên Mã hội Tử Phủ — phú quý', 'tot');
    if (hasAll(['khong','kiep','tue'])) add('Thiên Mã hội Không Kiếp Tuế — tai nạn nghiêm trọng hoặc chết', 'canh_bao');
    if (hasAll(['da','thai'])) add('Thiên Mã hội Đà La Thai — bôn ba tai nạn thương tích', 'canh_bao');
    if (hasAll(['hinh'])) add('Thiên Mã hội Thiên Hình — tai nạn xe cộ đao thương', 'canh_bao');
    if (hasSao('tuyet')) add('Thiên Mã hội Tuyệt — bế tắc đau yếu mất của', 'xau');
    if (hasTuanTriet) add('Thiên Mã gặp Tuần/Triệt — bế tắc truất quan tai nạn', 'canh_bao');
  }

  // TUẦN/TRIỆT trong cung đại vận
  if (hasTuan) {
    if (nhieuSaoTot) add('Tuần án ngữ hội nhiều sao tốt — hạn xấu, bế tắc', 'xau');
    if (nhieuSaoXau) add('Tuần án ngữ hội nhiều sao xấu — hạn tốt gặp trở ngại đầu', 'trung');
    if (tuanLamHoa) add('Tuần lâm Hỏa địa (Tỵ/Ngọ) — đặc cách tốt, giảm tính xấu, tăng tính tốt', 'tot');
  }
  if (hasTriet) {
    if (nhieuSaoTot) add('Triệt án ngữ hội nhiều sao tốt — hạn xấu thất bại', 'xau');
    if (nhieuSaoXau) add('Triệt án ngữ hội nhiều sao xấu — hạn tốt gặp trở ngại đầu', 'trung');
    if (trietKimCung) add('Triệt đáo Kim cung (Thân/Dậu) — đặc cách tốt, giảm tính xấu, tăng tính tốt', 'tot');
  }

  return results;
}




// ================================================================
// TÍNH TIỂU VẬN SCORE — candlestick data cho từng năm
// Output: ls.tieuVanScores = array of {
//   nam, tuoi, diaChi, dvIdx,
//   mainScore, maxScore, minScore,
//   direction: 'up'|'down'|'flat',
//   satCount, catCount
// }
// ================================================================

function tinhTieuVanScores(ls, gioitinh, amDuong, chiNam, namSinhDL) {
  const { palaces, daiVans } = ls;
  if (!daiVans || !palaces) return [];

  const DIA_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function dcIdx(dc) { return DIA_CHI.indexOf(dc); }

  // ── Star lists ────────────────────────────────────────────────
  const CAT_TINH = ['Tả Phụ','Hữu Bật','Thiên Khôi','Thiên Việt','Văn Xương','Văn Khúc',
                    'Lộc Tồn','Hóa Lộc','Hóa Quyền','Hóa Khoa','Thiên Mã','Thiên Lương',
                    'Thiên Phúc','Thiên Thọ','Long Trì','Phượng Các','Ân Quang','Thiên Quý'];
  const SAT_BAI  = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp',
                    'Thiên Khốc','Thiên Hư','Tang Môn','Bạch Hổ','Đại Hao','Tiểu Hao',
                    'Hóa Kỵ','Thiên Hình','Thiên Riêu'];

  // ── Spline helper: cubic hermite interpolation ─────────────────
  // Given extrema at midpoints of each DV, interpolate score for any year
  function buildSplinePoints(dvs) {
    // Each DV: extrema at year 5 (0-based: tuoiStart+4)
    // Boundary between DVs: avg of adjacent DV scores
    const pts = []; // {tuoi, score}

    dvs.forEach((dv, i) => {
      const mid = dv.tuoiStart + 4;
      pts.push({ tuoi: mid, score: dv.scoring?.tong || 5 });
    });

    // Add boundary points (avg of adjacent)
    const boundaries = [];
    for (let i = 0; i < dvs.length - 1; i++) {
      const boundaryTuoi = dvs[i].tuoiEnd;
      const boundaryScore = ((dvs[i].scoring?.tong || 5) + (dvs[i+1].scoring?.tong || 5)) / 2;
      boundaries.push({ tuoi: boundaryTuoi, score: boundaryScore });
    }

    // Merge and sort all control points
    const allPts = [...pts, ...boundaries].sort((a,b) => a.tuoi - b.tuoi);
    return allPts;
  }

  function interpolate(allPts, tuoi) {
    if (allPts.length === 0) return 5;
    if (tuoi <= allPts[0].tuoi) return allPts[0].score;
    if (tuoi >= allPts[allPts.length-1].tuoi) return allPts[allPts.length-1].score;

    // Find surrounding points
    let i = 0;
    while (i < allPts.length - 1 && allPts[i+1].tuoi < tuoi) i++;
    const p0 = allPts[Math.max(0, i-1)];
    const p1 = allPts[i];
    const p2 = allPts[i+1];
    const p3 = allPts[Math.min(allPts.length-1, i+2)];

    // Catmull-Rom spline
    const t = (tuoi - p1.tuoi) / (p2.tuoi - p1.tuoi);
    const t2 = t*t, t3 = t2*t;
    const score =
      0.5 * ((2*p1.score) +
      (-p0.score + p2.score) * t +
      (2*p0.score - 5*p1.score + 4*p2.score - p3.score) * t2 +
      (-p0.score + 3*p1.score - 3*p2.score + p3.score) * t3);

    return Math.max(0, Math.min(10, score));
  }

  // ── Lưu niên đại hạn cung index per year ─────────────────────
  function getLuuNienCungIdx(dvCungIdx, ageIndex) {
    const s = dvCungIdx;
    const x = mod12(s + 6);
    const duongNam_amNu = (amDuong === 'dương' && gioitinh === 'nam') ||
                          (amDuong === 'âm'    && gioitinh === 'nu');
    const ai = Math.min(ageIndex, 9);
    if (duongNam_amNu) {
      const map = [s, x, mod12(x-1), x, mod12(x+1), mod12(x+2), mod12(x+3), mod12(x+4), mod12(x+5), mod12(x+6)];
      return map[ai];
    } else {
      const map = [s, x, mod12(x+1), x, mod12(x-1), mod12(x-2), mod12(x-3), mod12(x-4), mod12(x-5), mod12(x-6)];
      return map[ai];
    }
  }

  // Tiểu hạn cung per year
  const TIEU_HAN_KHOI = {
    'nam': { 'Tý':'Dần','Sửu':'Sửu','Dần':'Tý','Mão':'Hợi','Thìn':'Tuất','Tỵ':'Dậu',
             'Ngọ':'Thân','Mùi':'Mùi','Thân':'Ngọ','Dậu':'Tỵ','Tuất':'Thìn','Hợi':'Mão' },
    'nu':  { 'Tý':'Thân','Sửu':'Dậu','Dần':'Tuất','Mão':'Hợi','Thìn':'Tý','Tỵ':'Sửu',
             'Ngọ':'Dần','Mùi':'Mão','Thân':'Thìn','Dậu':'Tỵ','Tuất':'Ngọ','Hợi':'Mùi' },
  };
  function getTieuHanCungIdx(tuoi) {
    const startDC = TIEU_HAN_KHOI[gioitinh]?.[chiNam] || 'Dần';
    const startI  = dcIdx(startDC);
    const offset  = (tuoi - 1) % 12;
    return gioitinh === 'nam' ? mod12(startI + offset) : mod12(startI - offset);
  }

  // ── Build spline ──────────────────────────────────────────────
  const dvs = daiVans.slice(0, 9);
  const splinePts = buildSplinePoints(dvs);

  // ── Build tiểu vận scores ─────────────────────────────────────
  const results = [];

  dvs.forEach((dv, dvIdx) => {
    const dvPalace = palaces[dv.cungIdx];
    if (!dvPalace) return;

    for (let yr = 0; yr < 10; yr++) {
      const tuoi = dv.tuoiStart + yr;
      const nam  = namSinhDL + tuoi - 1;
      const ageIndex = yr;

      // Main score from spline
      const mainScore = Math.round(interpolate(splinePts, tuoi) * 10) / 10;

      // Tiểu hạn cung
      const tieuHanIdx  = getTieuHanCungIdx(tuoi);
      const tieuHanP    = palaces[tieuHanIdx];

      // Lưu niên đại hạn cung
      const luuNienIdx  = getLuuNienCungIdx(dv.cungIdx, ageIndex);
      const luuNienP    = palaces[luuNienIdx];

      // Collect all stars from 3 cung: dvPalace + tieuHanP + luuNienP
      const allStarNames = new Set();
      [dvPalace, tieuHanP, luuNienP].filter(Boolean).forEach(p => {
        (p.stars || []).forEach(s => allStarNames.add(s.ten));
      });

      const catCount = CAT_TINH.filter(s => allStarNames.has(s)).length;
      const satCount = SAT_BAI.filter(s => allStarNames.has(s)).length;
      const total    = catCount + satCount;

      // Volatility — cap at 5 stars each
      const catCapped = Math.min(catCount, 5);
      const satCapped = Math.min(satCount, 5);
      const upAdj   = catCapped / 5 * 0.30 * 10;  // max +3 points (30% of scale 10)
      const downAdj = satCapped / 5 * 0.30 * 10;

      const maxScore = Math.min(10, Math.round((mainScore + upAdj) * 10) / 10);
      const minScore = Math.max(0,  Math.round((mainScore - downAdj) * 10) / 10);

      const direction = catCount > satCount ? 'up' : catCount < satCount ? 'down' : 'flat';

      // DiaChị năm (chi năm dương lịch)
      const diaChi = DIA_CHI[(nam + 8) % 12];

      results.push({
        nam, tuoi, dvIdx, diaChi,
        mainScore, maxScore, minScore, direction,
        catCount, satCount,
        tieuHanCung: tieuHanP?.cungName || '',
        luuNienCung: luuNienP?.cungName || '',
      });
    }
  });

  return results;
}


if (typeof module !== 'undefined') module.exports = { anSaoLaSo, convertDuongToAm, STAR_DATA, getStarData, getStarBrightness };
