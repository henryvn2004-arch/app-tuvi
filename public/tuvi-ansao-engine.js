
// ============================================================
// DƯƠNG LỊCH → ÂM LỊCH (converted from Python)
// ============================================================

const _CAN = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const _CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

function _jdFromDate(dd, mm, yy) {
  const a = Math.floor((14-mm)/12);
  const y = yy + 4800 - a;
  const m = mm + 12*a - 3;
  let jd = dd + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153*m+2)/5) + 365*y + Math.floor(y/4) - 32083;
  }
  return jd;
}

function _newMoon(k) {
  const T = k/1236.85; const T2=T*T; const T3=T2*T; const dr=Math.PI/180;
  let jd = 2415020.75933+29.53058868*k+0.0001178*T2-0.000000155*T3;
  jd += 0.00033*Math.sin((166.56+132.87*T-0.009173*T2)*dr);
  const M = (359.2242+29.10535608*k)*dr;
  const Mpr = (306.0253+385.81691806*k)*dr;
  const F = (21.2964+390.67050646*k)*dr;
  let C1 = (0.1734-0.000393*T)*Math.sin(M)+0.0021*Math.sin(2*M)
         - 0.4068*Math.sin(Mpr)+0.0161*Math.sin(2*Mpr)-0.0004*Math.sin(3*Mpr)
         + 0.0104*Math.sin(2*F)-0.0051*Math.sin(M+Mpr)-0.0074*Math.sin(M-Mpr)
         + 0.0004*Math.sin(2*F+M)-0.0004*Math.sin(2*F-M)
         - 0.0006*Math.sin(2*F+Mpr)+0.0010*Math.sin(2*F-Mpr)+0.0005*Math.sin(M+2*Mpr);
  return jd + C1;
}

function _getNewMoonDay(k, tz) {
  return Math.floor(_newMoon(k) + 0.5 + tz/24);
}

function _sunLongitude(jdn) {
  const T=(jdn-2451545.0)/36525; const dr=Math.PI/180;
  const M=(357.5291+35999.0503*T)*dr;
  const L0=280.46646+36000.76983*T+0.0003032*T*T;
  const DL=(1.9146-0.004817*T-0.000014*T*T)*Math.sin(M)+(0.019993-0.000101*T)*Math.sin(2*M)+0.00029*Math.sin(3*M);
  const theta=L0+DL; const omega=(125.04-1934.136*T)*dr;
  let lam=(theta-0.00569-0.00478*Math.sin(omega))*dr;
  lam -= Math.PI*2*Math.floor(lam/(Math.PI*2));
  if (lam<0) lam += Math.PI*2;
  return Math.floor(lam/dr/30);
}

function _getLunarMonth11(yy, tz) {
  const off = _jdFromDate(31,12,yy) - 2415021;
  const k = Math.floor(off/29.530588853);
  let nm = _getNewMoonDay(k, tz);
  if (_sunLongitude(nm) >= 9) nm = _getNewMoonDay(k-1, tz);
  return nm;
}

function solarToLunar(dd, mm, yy, tz=7) {
  const dayNumber = _jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695)/29.530588853);
  let monthStart = _getNewMoonDay(k+1, tz);
  if (monthStart > dayNumber) monthStart = _getNewMoonDay(k, tz);
  let a11 = _getLunarMonth11(yy, tz);
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = _getLunarMonth11(yy-1, tz);
  } else {
    lunarYear = yy + 1;
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11)/29);
  let lunarMonth = diff + 11;
  if (lunarMonth > 12) lunarMonth -= 12;
  // Xử lý tháng nhuận
  const leapOff = Math.floor((a11 - 2415021.076998695)/29.530588853);
  let leapM = 0;
  for (let i = 0; i < 14; i++) {
    const nm1 = _getNewMoonDay(leapOff + i, tz);
    const nm2 = _getNewMoonDay(leapOff + i + 1, tz);
    if (_sunLongitude(nm1) === _sunLongitude(nm2)) { leapM = i; break; }
  }
  // Fix: leapOff có thể trỏ trước a11 1 bước → cần điều chỉnh
  const nmA11Check = _getNewMoonDay(leapOff, tz);
  const offsetFix = nmA11Check < a11 ? 1 : 0;
  const leapMAdj = leapM - offsetFix;
  if (leapMAdj > 0 && diff >= leapMAdj) {
    lunarMonth = diff + 10;
    if (lunarMonth > 12) lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear };
}

function hourToChi(hour) {
  return _CHI[Math.floor((hour+1)/2) % 12];
}

function yearCanChi(year) {
  return _CAN[(year+6)%10] + ' ' + _CHI[(year+8)%12];
}

function dayCanChi(dd, mm, yy) {
  const jd = _jdFromDate(dd, mm, yy);
  return _CAN[(jd+9)%10] + ' ' + _CHI[(jd+1)%12];
}

function hourCanChi(hour, dayCanStr) {
  const chiIndex = Math.floor((hour+1)/2) % 12;
  const canIndex = (_CAN.indexOf(dayCanStr.split(' ')[0])*2 + chiIndex) % 10;
  return _CAN[canIndex] + ' ' + _CHI[chiIndex];
}

/**
 * Convert dương lịch → đầy đủ thông tin
 * @param {number} dd - ngày
 * @param {number} mm - tháng  
 * @param {number} yy - năm
 * @param {number} hour - giờ (0-23)
 * @returns {{ amLich, canChi, gioChi, gioIdx }}
 */
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
  'Kim Tứ Cục':   {'Tỵ':[6,16,19,25],'Ngọ':[10,20,23,29],'Mùi':[14,21,27],'Thân':[18,28],'Dậu':[22],'Tuất':[26],'Hợi':[1,30],'Tý':[5],'Sửu':[3,9],'Dần':[4,7,13],'Mão':[8,11,17],'Thìn':[2,12,15,21]},
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
  const than = getThan(ls);
  const menhDC = ls.menhDC;
  const thanDC = ls.thanDC;
  const napAmHanh = ls.napAmHanh;

  const p_menh    = getPalace(ls, 'Mệnh');
  const p_than    = than;
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
    if (hasSao(p,'Thiên Tướng') && isSangSua(p,'Thiên Tướng') && isGiapCung(ls,p.cungName,'Thiên Lương','Thiên Lương')) {
      add('phu_cuc','Tài Ấm Giáp Ấn',
        'Thiên Tướng sáng sủa tọa thủ, có Thiên Lương giáp cung → phú quý song toàn.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.1.2 Phủ Ấn Củng Thân  
  if (p_than && (hasSao(p_than,'Thiên Phủ')||hasSao(p_than?.xungChieuCung,'Thiên Phủ'))) {
    const xung = p_than?.xungChieuCung;
    if ((hasSao(p_than,'Thiên Phủ')&&hasSao(xung,'Thiên Tướng')) ||
        (hasSao(p_than,'Thiên Tướng')&&hasSao(xung,'Thiên Phủ')) ||
        (hasSao(p_than,'Thiên Phủ')&&hasSao(p_than,'Thiên Tướng'))) {
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
    if ((p.diaChi==='Sửu'&&hasSao(p,'Thái Dương')&&hasSao(p,'Thái Âm')&&xung?.diaChi==='Mùi') ||
        (p.diaChi==='Mùi'&&hasSao(p,'Thái Dương')&&hasSao(p,'Thái Âm')&&xung?.diaChi==='Sửu')) {
      add('phu_cuc','Nhật Nguyệt Chiếu Bích',
        'Nhật Nguyệt đồng cung xung chiếu nhau tại Sửu/Mùi → giàu có, sáng láng.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
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
    if ((hasSao(p,'Thiên Phủ')&&isSangSua(p,'Thiên Phủ')&&hasSao(xung,'Thiên Tướng')) ||
        (hasSao(p,'Thiên Tướng')&&isSangSua(p,'Thiên Tướng')&&hasSao(xung,'Thiên Phủ'))) {
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
    const allStars = [...getSaoAll(p), ...(p.tamHopCungs||[]).flatMap(getSaoAll), ...getSaoAll(p.xungChieuCung)];
    if (allStars.includes('Hóa Khoa') && allStars.includes('Hóa Quyền') && allStars.includes('Hóa Lộc')) {
      add('quy_cuc','Khoa Quyền Lộc Củng','Hóa Khoa, Hóa Quyền, Hóa Lộc hội chiếu → tam hóa tốt, công danh phú quý tột đỉnh.',
        `Tại cung ${p.cungName}.`, p.cungName); break;
    }
  }

  // 19.2.26 Minh Lộc Ám Lộc
  for (const p of QUY_QUAN) {
    if (!p) continue;
    const nhiHop = getNhiHop(ls, p.diaChi);
    if ((hasSao(p,'Hóa Lộc')&&hasSao(nhiHop,'Lộc Tồn')) ||
        (hasSao(p,'Lộc Tồn')&&hasSao(nhiHop,'Hóa Lộc'))) {
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
  'SPTL': ['Thất Sát','Phá Quân','Tham Lang','Liêm Trinh'],
  'TPVT': ['Tử Vi','Thiên Phủ','Vũ Khúc','Thiên Tướng'],
  'CNDL': ['Cự Môn','Thái Dương'],
  'CMDL': ['Thiên Cơ','Thái Âm','Thiên Đồng','Thiên Lương'],
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
  if (!hCung || !hMenh) return { score: 1, qh: 'unknown' };
  let score, qh;
  if (hCung === hMenh)                        { score=1.5; qh='dong_hanh'; }
  else if (NGU_HANH_SINH[hCung] === hMenh)   { score=2;   qh='cung_sinh_menh'; }
  else if (NGU_HANH_SINH[hMenh] === hCung)   { score=1;   qh='menh_sinh_cung'; }
  else if (NGU_HANH_KHAC[hMenh] === hCung)   { score=0.5; qh='menh_khac_cung'; }
  else if (NGU_HANH_KHAC[hCung] === hMenh)   { score=0;   qh='cung_khac_menh'; }
  else                                         { score=1;   qh='unknown'; }
  return { score, qh, hCung, hMenh };
}

function getBoSao(palaceStars) {
  const names = palaceStars.map(s => s.ten);
  for (const [bo, list] of Object.entries(BO_CHINH_TINH)) {
    if (list.some(s => names.includes(s))) return bo;
  }
  return null;
}

function tinhNhanHoa(menhStars, vanStars) {
  const boMenh = getBoSao(menhStars);
  const boVan  = getBoSao(vanStars);
  if (!boMenh || !boVan) return { score: 1.5, qh: 'unknown', boMenh, boVan };
  if (boMenh === boVan)  return { score: 3,   qh: 'hop_tot', boMenh, boVan };
  if (boMenh === 'TPVT' || boVan === 'TPVT') return { score: 2, qh: 'buffer', boMenh, boVan };
  if ((boMenh === 'CMDL' && boVan === 'SPTL') || (boMenh === 'SPTL' && boVan === 'CMDL'))
    return { score: 1, qh: 'nguy_hiem', boMenh, boVan };
  return { score: 1.5, qh: 'trung_binh', boMenh, boVan };
}

function scoreDaiVan(tt, dl, nh) {
  let total = tt.score + dl.score + nh.score;
  if (nh.score < 1.5) total = Math.min(total, 6);
  const flag = total >= 7 ? '🟢' : total >= 4 ? '🟡' : '🔴';
  return { thienThoi: tt.score, diaLoi: dl.score, nhanHoa: nh.score,
           tong: Math.round(total * 10) / 10, flag,
           qhTT: tt.qh, qhDL: dl.qh, qhNH: nh.qh,
           boMenh: nh.boMenh, boVan: nh.boVan };
}

function tinhScoringAllDaiVan(daiVans, palaces, canChiNam, chiNam, napAm) {
  const menhPalace = palaces.find(p => p.isMenh);
  if (!menhPalace) return daiVans;

  // Dùng tuChinhStars đã tính sẵn lúc an sao
  const menhStars = menhPalace.tuChinhStars || menhPalace.majorStars;

  return daiVans.map((dv, i) => {
    if (i >= 9) return dv;
    const dvPalace = palaces[dv.cungIdx];
    if (!dvPalace) return dv;

    const dvStars = dvPalace.tuChinhStars || dvPalace.majorStars;

    const tt = tinhThienThoi(dv.diaChi, chiNam);
    const dl = tinhDiaLoi(dv.diaChi, napAm);
    const nh = tinhNhanHoa(menhStars, dvStars);
    const sc = scoreDaiVan(tt, dl, nh);

    return { ...dv, scoring: sc };
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

  // Vòng Thái Tuế tại cung Mệnh — tính bằng offset (chi năm SINH vs địa chi Mệnh)
  const menhP = palaces.find(p => p.isMenh);
  if (menhP) {
    const startIdx = DIA_CHI.indexOf(chiNam); // năm sinh, không phải năm xem
    const menhDcIdx = DIA_CHI.indexOf(menhP.diaChi);
    const offset = ((menhDcIdx - startIdx) % 12 + 12) % 12;
    const saoTaiMenh = THAI_TUE_SEQ[offset];
    const nhom = THAI_TUE_NHOM[saoTaiMenh];
    if (nhom !== undefined) {
      menhP.thaiTueNhom = {
        sao: saoTaiMenh,
        nhom,
        ...THAI_TUE_NHOM_Y_NGHIA[nhom],
      };
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
  const daiVansScored = tinhScoringAllDaiVan(daiVans, palaces, canChiNam, chiNam, napAmHanh);

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

  // Vòng Thái Tuế tại cung Mệnh — tính bằng offset (chi năm SINH vs địa chi Mệnh)
  const menhP = palaces.find(p => p.isMenh);
  if (menhP) {
    const startIdx = DIA_CHI.indexOf(chiNam); // năm sinh, không phải năm xem
    const menhDcIdx = DIA_CHI.indexOf(menhP.diaChi);
    const offset = ((menhDcIdx - startIdx) % 12 + 12) % 12;
    const saoTaiMenh = THAI_TUE_SEQ[offset];
    const nhom = THAI_TUE_NHOM[saoTaiMenh];
    if (nhom !== undefined) {
      menhP.thaiTueNhom = {
        sao: saoTaiMenh,
        nhom,
        ...THAI_TUE_NHOM_Y_NGHIA[nhom],
      };
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
  const daiVansScored = tinhScoringAllDaiVan(daiVans, palaces, canChiNam, chiNam, napAmHanh);

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
  };
}


// ─── TÍNH CHẤT SAO ───────────────────────────────────────────

// Export
if (typeof module !== 'undefined') module.exports = { anSaoLaSo, STAR_DATA, getStarData, getStarBrightness };
