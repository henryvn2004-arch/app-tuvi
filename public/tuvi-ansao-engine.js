
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
  const T = k/1236.85;
  const T2 = T*T;
  const T3 = T2*T;
  let jd = 2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3;
  jd += 0.00033*Math.sin((166.56+132.87*T-0.009173*T2)*Math.PI/180);
  const M = 359.2242 + 29.10535608*k;
  const Mpr = 306.0253 + 385.81691806*k;
  let C1 = 0.1734*Math.sin(M*Math.PI/180);
  C1 -= 0.4068*Math.sin(Mpr*Math.PI/180);
  C1 += 0.0161*Math.sin(2*Mpr*Math.PI/180);
  return jd + C1;
}

function _getNewMoonDay(k, tz) {
  return Math.floor(_newMoon(k) + 0.5 + tz/24);
}

function _sunLongitude(jdn) {
  const T = (jdn - 2451545)/36525;
  const M = 357.52910 + 35999.05030*T;
  const L0 = 280.46645 + 36000.76983*T;
  const DL = 1.914600*Math.sin(M*Math.PI/180);
  let L = (L0 + DL)*Math.PI/180;
  L -= Math.PI*2*Math.floor(L/(Math.PI*2));
  return Math.floor(L/Math.PI*6);
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
  const anQuang = mod12(vanXuong + ngayAL - 1);
  // Thiên Quý: từ Văn Khúc - ngày + 1
  const THIEN_QUY_MAP = {'Thân':'Thìn','Tý':'Thìn','Thìn':'Thìn','Dần':'Tuất','Ngọ':'Tuất','Tuất':'Tuất','Tỵ':'Sửu','Dậu':'Sửu','Sửu':'Sửu','Hợi':'Mùi','Mão':'Mùi','Mùi':'Mùi'};
  const thienQuy = mod12(vanKhuc - ngayAL + 1);  // từ Văn Khúc đếm nghịch tới ngày

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
  const KIEP_SAT = {'Tý':'Tỵ','Ngọ':'Tỵ','Mão':'Thân','Dậu':'Thân','Dần':'Hợi','Thân':'Hợi','Tỵ':'Dần','Hợi':'Dần','Thìn':'Tỵ','Tuất':'Tỵ','Sửu':'Thân','Mùi':'Thân'};
  const kiepSat = dcIdx(KIEP_SAT[chiNam] || 'Tý');

  // Phá Toái
  const PHA_TOAI = {'Tý':'Sửu','Ngọ':'Sửu','Mão':'Thìn','Dậu':'Thìn','Dần':'Mùi','Thân':'Mùi','Tỵ':'Tuất','Hợi':'Tuất','Thìn':'Sửu','Tuất':'Sửu','Sửu':'Thìn','Mùi':'Thìn'};
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
  const duongPhu = mod12(locTonIdx + 1);  // sau Lộc Tồn 1 cung (= Kình Dương vị trí)

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
    'Quốc Ấn':quocAn,'Đường Phù':duongPhu,
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

  return {
    canChiNam, napAm, amDuong, cuc, canMenh,
    menhDC, thanDC, menhIdx, thanIdx,
    fiveElementsClass: cuc,
    earthlyBranchOfSoulPalace: menhDC,
    earthlyBranchOfBodyPalace: thanDC,
    chineseDate: canChiNam,
    palaces,
    daiVans,
    daiVanHienTai,
    tieuHanIdx,
    tuoiXem,
    chiNamXem,
    luuNienDaiHanIdx,
  };
}


// ─── TÍNH CHẤT SAO ───────────────────────────────────────────
const STAR_DATA = {
  'Tử Vi':       { type:'chính tinh', element:'thổ',   yin_yang:'dương', weight:10, traits:['uy quyền','tài lộc','phúc đức'],    positions:{mien:['Tỵ','Ngọ','Dần','Thân'],vuong:['Thìn','Tuất'],dac:['Sửu','Mùi'],binh:['Hợi','Tý','Mão','Dậu'],ham:[]} },
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
  'Kình Dương':  { type:'sát tinh',   element:'kim',   yin_yang:'dương', weight:10, traits:['sát phạt','bạo lực'],               positions:{dac:['Thìn','Tuất','Sửu','Mùi']} },
  'Đà La':       { type:'sát tinh',   element:'kim',   yin_yang:'âm',    weight:10, traits:['tai họa','bệnh tật'],               positions:{dac:['Thìn','Tuất','Sửu','Mùi']} },
  'Hỏa Tinh':    { type:'sát tinh',   element:'hỏa',   yin_yang:'dương', weight:9,  traits:['bạo phát','tai họa'],               positions:{dac:['Dần','Mão','Thìn','Tỵ','Ngọ']} },
  'Linh Tinh':   { type:'sát tinh',   element:'hỏa',   yin_yang:'âm',    weight:9,  traits:['đột biến','tai họa'],               positions:{dac:['Dần','Mão','Thìn','Tỵ','Ngọ']} },
  'Kiếp Sát':    { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['đâm chém','tai họa'],     positions:{dac:['Dần','Thân','Tỵ','Hợi'],ham:['Tý','Sửu','Mão','Thìn','Ngọ','Mùi','Dậu','Tuất']} },
  'Lưu Hà':      { type:'sát tinh',   element:'thủy',  weight:9,  traits:['máu huyết','tai nạn'] },
  'Thiên Hình':  { type:'sát tinh',   element:'hỏa',   weight:9,  traits:['hình pháp','dao kéo'],    positions:{dac:['Dần','Thân','Mão','Dậu']} },
  'Thiên Riêu':  { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['phong lưu','tình ái'],    positions:{dac:['Dần','Mão','Dậu','Tuất']} },
  'Thiên La':    { type:'hung tinh',  element:'thổ',   weight:7,  traits:['giam hãm','rắc rối'] },
  'Địa Võng':    { type:'hung tinh',  element:'thổ',   weight:7,  traits:['giam hãm','rắc rối'] },
  'Thiên Thương':{ type:'hung tinh',  element:'thổ',   weight:7,  traits:['tai họa','tang thương'] },
  'Thiên Sứ':    { type:'hung tinh',  element:'thủy',  weight:7,  traits:['tai họa','tang thương'] },
  'Hóa Lộc':     { type:'hóa tinh',   element:'mộc',   weight:9,  traits:['tài lộc','phúc'] },
  'Hóa Quyền':   { type:'hóa tinh',   element:'mộc',   weight:9,  traits:['quyền lực'] },
  'Hóa Khoa':    { type:'hóa tinh',   element:'mộc',   weight:8,  traits:['trí tuệ','giải ách'] },
  'Hóa Kỵ':      { type:'hóa tinh',   element:'thủy',  weight:9,  traits:['tai họa','thị phi'],      positions:{dac:['Thìn','Tuất','Sửu','Mùi']} },
  'Lộc Tồn':     { type:'quý tinh',   element:'thổ',   weight:8,  traits:['tài lộc','phúc thọ'] },
  'Thiên Mã':    { type:'phụ tinh',   element:'hỏa',   weight:7,  traits:['di chuyển','thay đổi'],   positions:{dac:['Tỵ','Dần']} },
  'Đào Hoa':     { type:'phụ tinh',   element:'mộc',   weight:6,  traits:['tình duyên'] },
  'Hồng Loan':   { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['hôn nhân'] },
  'Thiên Hỷ':    { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['niềm vui'] },
  'Tả Phụ':      { type:'phụ tinh',   element:'thổ',   weight:6,  traits:['trợ lực','phò tá'] },
  'Hữu Bật':     { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['trợ lực','phò tá'] },
  'Văn Xương':   { type:'phụ tinh',   element:'kim',   weight:7,  traits:['văn học','thi cử'],       positions:{dac:['Thìn','Tuất','Sửu','Mùi','Tỵ','Hợi']} },
  'Văn Khúc':    { type:'phụ tinh',   element:'thủy',  weight:7,  traits:['văn học','nghệ thuật'],   positions:{dac:['Thìn','Tuất','Sửu','Mùi','Tỵ','Hợi']} },
  'Long Trì':    { type:'phụ tinh',   element:'thủy',  weight:6,  traits:['phúc','quý nhân'] },
  'Phượng Các':  { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['phúc','quý nhân'] },
  'Thiên Khốc':  { type:'bại tinh',   element:'thủy',  weight:7,  traits:['buồn khổ'],               positions:{dac:['Tý','Ngọ','Mão','Dậu','Sửu','Mùi']} },
  'Thiên Hư':    { type:'bại tinh',   element:'thủy',  weight:7,  traits:['sầu não'],                positions:{dac:['Tý','Ngọ','Mão','Dậu','Sửu','Mùi']} },
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
  'Tang Môn':    { type:'bại tinh',   element:'mộc',   weight:8,  traits:['tang thương'],            positions:{dac:['Dần','Thân','Mão','Dậu']} },
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
  'Tiểu Hao':    { type:'bại tinh',   element:'hỏa',   weight:7,  traits:['hao tài'],                positions:{dac:['Dần','Thân','Mão','Dậu']} },
  'Tướng Quân':  { type:'phụ tinh',   element:'mộc',   weight:7,  traits:['quyền lực','lãnh đạo'] },
  'Tấu Thư':     { type:'phụ tinh',   element:'kim',   weight:5,  traits:['văn học','đàm luận'] },
  'Phi Liêm':    { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['nhanh nhẹn','biến động'] },
  'Hỷ Thần':     { type:'phụ tinh',   element:'hỏa',   weight:6,  traits:['niềm vui','hỷ sự'] },
  'Đại Hao':     { type:'bại tinh',   element:'hỏa',   weight:8,  traits:['hao tài'],                positions:{dac:['Dần','Thân','Mão','Dậu']} },
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
