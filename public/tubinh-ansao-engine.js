// ============================================================
// TỬ BÌNH BÁT TỰ — AN SAO ENGINE v1.0
// Mirror style của tuvi-ansao-engine.js
// Source rules: Tử Bình Chân Thuyên (Thẩm Hiếu Chiêm) +
//               Trích Thiên Tủy + thông lệ Việt Nam.
// ============================================================

const _CAN_TB = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const _CHI_TB = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// ─── ASTRONOMY (copy từ tuvi engine — Jean Meeus simplified) ─
function _jdFromDate_TB(dd, mm, yy) {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

// Trả về solar longitude theo độ (0-360), không phải /30 như tuvi engine
function _sunLongitudeDeg(jdn) {
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
  return L;
}

// Tìm JDN khi sun longitude lần đầu vượt qua targetDeg trong năm yy
// targetDeg: 315 = Lập Xuân, 345 = Kinh Trập, ... (12 tiết khí chính)
function _findTietKhiJDN(yy, targetDeg) {
  // Tiết khí chính của tháng dương lịch tương ứng:
  // Lập Xuân (315°) ~ Feb 4, Kinh Trập (345°) ~ Mar 6, Thanh Minh (15°) ~ Apr 5,
  // Lập Hạ (45°) ~ May 6, Mang Chủng (75°) ~ Jun 6, Tiểu Thử (105°) ~ Jul 7,
  // Lập Thu (135°) ~ Aug 8, Bạch Lộ (165°) ~ Sep 8, Hàn Lộ (195°) ~ Oct 8,
  // Lập Đông (225°) ~ Nov 8, Đại Tuyết (255°) ~ Dec 7, Tiểu Hàn (285°) ~ Jan 6 (năm sau)
  const TIET_TO_MONTH = {
    315: { mm: 2, baseDay: 4 }, 345: { mm: 3, baseDay: 6 },
    15:  { mm: 4, baseDay: 5 }, 45:  { mm: 5, baseDay: 6 },
    75:  { mm: 6, baseDay: 6 }, 105: { mm: 7, baseDay: 7 },
    135: { mm: 8, baseDay: 8 }, 165: { mm: 9, baseDay: 8 },
    195: { mm: 10, baseDay: 8 }, 225: { mm: 11, baseDay: 8 },
    255: { mm: 12, baseDay: 7 }, 285: { mm: 1, baseDay: 6 }, // Tiểu Hàn thuộc năm sau
  };
  const info = TIET_TO_MONTH[targetDeg];
  if (!info) return null;

  // Search trong cửa sổ ±5 ngày quanh baseDay của month tương ứng
  const searchYear = (targetDeg === 285) ? yy + 1 : yy;
  for (let dayOffset = -5; dayOffset <= 5; dayOffset++) {
    const dd = info.baseDay + dayOffset;
    const jd1 = _jdFromDate_TB(Math.max(1, dd), info.mm, searchYear);
    const jd2 = jd1 + 1;
    const L1 = _sunLongitudeDeg(jd1);
    const L2 = _sunLongitudeDeg(jd2);

    // Normalize: shift để vùng quanh targetDeg liền mạch (xử lý wraparound 360→0)
    const norm = (x) => {
      let v = x - targetDeg;
      if (v > 180) v -= 360;
      if (v < -180) v += 360;
      return v;
    };
    const n1 = norm(L1), n2 = norm(L2);
    if (n1 < 0 && n2 >= 0) {
      // Sun đã vượt qua targetDeg giữa jd1 và jd2 → lấy jd2 làm JDN bắt đầu tiết khí
      return jd2;
    }
  }
  return null;
}

// ============================================================
// CONSTANTS
// ============================================================

const THIEN_CAN_TB = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const DIA_CHI_TB   = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

// Âm/dương
const _CAN_DUONG = new Set(['Giáp','Bính','Mậu','Canh','Nhâm']);
const _CHI_DUONG = new Set(['Tý','Dần','Thìn','Ngọ','Thân','Tuất']);

function amDuongCan(c) { return _CAN_DUONG.has(c) ? 'dương' : 'âm'; }
function amDuongChi(c) { return _CHI_DUONG.has(c) ? 'dương' : 'âm'; }

// Ngũ hành
const NGU_HANH_CAN_TB = {
  'Giáp':'Mộc','Ất':'Mộc',
  'Bính':'Hỏa','Đinh':'Hỏa',
  'Mậu':'Thổ','Kỷ':'Thổ',
  'Canh':'Kim','Tân':'Kim',
  'Nhâm':'Thủy','Quý':'Thủy',
};
const NGU_HANH_CHI_TB = {
  'Tý':'Thủy','Hợi':'Thủy',
  'Dần':'Mộc','Mão':'Mộc',
  'Tỵ':'Hỏa','Ngọ':'Hỏa',
  'Thân':'Kim','Dậu':'Kim',
  'Sửu':'Thổ','Thìn':'Thổ','Mùi':'Thổ','Tuất':'Thổ',
};
const NGU_HANH_SINH_TB = {'Mộc':'Hỏa','Hỏa':'Thổ','Thổ':'Kim','Kim':'Thủy','Thủy':'Mộc'};
const NGU_HANH_KHAC_TB = {'Kim':'Mộc','Mộc':'Thổ','Thổ':'Thủy','Thủy':'Hỏa','Hỏa':'Kim'};
// KHAC_BY_TB: hành X bị hành nào khắc (kỵ thần thực sự)
// 'Mộc':'Kim' nghĩa là Mộc bị Kim khắc → kỵ thần của dụng thần Mộc là Kim
const KHAC_BY_TB = {'Mộc':'Kim','Hỏa':'Thủy','Thổ':'Mộc','Kim':'Hỏa','Thủy':'Thổ'};

// ─── TÀNG CAN ──────────────────────────────────────────────
// Mỗi chi chứa: chính khí (bản khí), trung khí, dư khí.
// Trọng số: chính khí 1.0, trung khí 0.5, dư khí 0.3 (chuẩn Tử Bình Chân Thuyên).
const TANG_CAN = {
  'Tý':   [{ can: 'Quý',  weight: 1.0 }],
  'Sửu':  [{ can: 'Kỷ',   weight: 1.0 }, { can: 'Quý', weight: 0.5 }, { can: 'Tân', weight: 0.3 }],
  'Dần':  [{ can: 'Giáp', weight: 1.0 }, { can: 'Bính', weight: 0.5 }, { can: 'Mậu', weight: 0.3 }],
  'Mão':  [{ can: 'Ất',   weight: 1.0 }],
  'Thìn': [{ can: 'Mậu',  weight: 1.0 }, { can: 'Ất', weight: 0.5 }, { can: 'Quý', weight: 0.3 }],
  'Tỵ':   [{ can: 'Bính', weight: 1.0 }, { can: 'Canh', weight: 0.5 }, { can: 'Mậu', weight: 0.3 }],
  'Ngọ':  [{ can: 'Đinh', weight: 1.0 }, { can: 'Kỷ', weight: 0.5 }],
  'Mùi':  [{ can: 'Kỷ',   weight: 1.0 }, { can: 'Đinh', weight: 0.5 }, { can: 'Ất', weight: 0.3 }],
  'Thân': [{ can: 'Canh', weight: 1.0 }, { can: 'Nhâm', weight: 0.5 }, { can: 'Mậu', weight: 0.3 }],
  'Dậu':  [{ can: 'Tân',  weight: 1.0 }],
  'Tuất': [{ can: 'Mậu',  weight: 1.0 }, { can: 'Tân', weight: 0.5 }, { can: 'Đinh', weight: 0.3 }],
  'Hợi':  [{ can: 'Nhâm', weight: 1.0 }, { can: 'Giáp', weight: 0.5 }],
};

// ─── THIÊN CAN HỢP / KHẮC ──────────────────────────────────
const THIEN_CAN_HOP = {
  'Giáp-Kỷ':'Thổ', 'Kỷ-Giáp':'Thổ',
  'Ất-Canh':'Kim', 'Canh-Ất':'Kim',
  'Bính-Tân':'Thủy','Tân-Bính':'Thủy',
  'Đinh-Nhâm':'Mộc','Nhâm-Đinh':'Mộc',
  'Mậu-Quý':'Hỏa', 'Quý-Mậu':'Hỏa',
};

// ─── TAM HỢP / LỤC HỢP / LỤC XUNG / LỤC HẠI / TAM HÌNH ────
const TAM_HOP = [
  { chis: ['Thân','Tý','Thìn'], hanh: 'Thủy' },
  { chis: ['Hợi','Mão','Mùi'],  hanh: 'Mộc'  },
  { chis: ['Dần','Ngọ','Tuất'], hanh: 'Hỏa'  },
  { chis: ['Tỵ','Dậu','Sửu'],   hanh: 'Kim'  },
];
const LUC_HOP = [
  { chis: ['Tý','Sửu'],   hanh: 'Thổ' },
  { chis: ['Dần','Hợi'],  hanh: 'Mộc' },
  { chis: ['Mão','Tuất'], hanh: 'Hỏa' },
  { chis: ['Thìn','Dậu'], hanh: 'Kim' },
  { chis: ['Tỵ','Thân'],  hanh: 'Thủy' },
  { chis: ['Ngọ','Mùi'],  hanh: 'Hỏa-Thổ' }, // Ngọ Mùi tương hợp (Thái Dương Thái Âm)
];
const LUC_XUNG = [
  ['Tý','Ngọ'],['Sửu','Mùi'],['Dần','Thân'],
  ['Mão','Dậu'],['Thìn','Tuất'],['Tỵ','Hợi'],
];
const LUC_HAI = [
  ['Tý','Mùi'],['Sửu','Ngọ'],['Dần','Tỵ'],
  ['Mão','Thìn'],['Thân','Hợi'],['Dậu','Tuất'],
];
const TAM_HINH = [
  { chis: ['Dần','Tỵ','Thân'], type: 'vô ân' },
  { chis: ['Sửu','Tuất','Mùi'], type: 'vô lễ' },
  { chis: ['Tý','Mão'], type: 'vô lễ' },
];
const TU_HINH = ['Thìn','Ngọ','Dậu','Hợi']; // tự hình khi có 2 cùng chi

// ─── NẠP ÂM (60 hoa giáp) — copy từ tuvi engine ──────────
const NAP_AM_TB = {
  'Giáp Tý':'Hải Trung Kim','Ất Sửu':'Hải Trung Kim',
  'Bính Dần':'Lư Trung Hỏa','Đinh Mão':'Lư Trung Hỏa',
  'Mậu Thìn':'Đại Lâm Mộc','Kỷ Tỵ':'Đại Lâm Mộc',
  'Canh Ngọ':'Lộ Bàng Thổ','Tân Mùi':'Lộ Bàng Thổ',
  'Nhâm Thân':'Kiếm Phong Kim','Quý Dậu':'Kiếm Phong Kim',
  'Giáp Tuất':'Sơn Đầu Hỏa','Ất Hợi':'Sơn Đầu Hỏa',
  'Bính Tý':'Giản Hạ Thủy','Đinh Sửu':'Giản Hạ Thủy',
  'Mậu Dần':'Thành Đầu Thổ','Kỷ Mão':'Thành Đầu Thổ',
  'Canh Thìn':'Bạch Lạp Kim','Tân Tỵ':'Bạch Lạp Kim',
  'Nhâm Ngọ':'Dương Liễu Mộc','Quý Mùi':'Dương Liễu Mộc',
  'Giáp Thân':'Tuyền Trung Thủy','Ất Dậu':'Tuyền Trung Thủy',
  'Bính Tuất':'Ốc Thượng Thổ','Đinh Hợi':'Ốc Thượng Thổ',
  'Mậu Tý':'Tích Lịch Hỏa','Kỷ Sửu':'Tích Lịch Hỏa',
  'Canh Dần':'Tùng Bách Mộc','Tân Mão':'Tùng Bách Mộc',
  'Nhâm Thìn':'Trường Lưu Thủy','Quý Tỵ':'Trường Lưu Thủy',
  'Giáp Ngọ':'Sa Trung Kim','Ất Mùi':'Sa Trung Kim',
  'Bính Thân':'Sơn Hạ Hỏa','Đinh Dậu':'Sơn Hạ Hỏa',
  'Mậu Tuất':'Bình Địa Mộc','Kỷ Hợi':'Bình Địa Mộc',
  'Canh Tý':'Bích Thượng Thổ','Tân Sửu':'Bích Thượng Thổ',
  'Nhâm Dần':'Kim Bạc Kim','Quý Mão':'Kim Bạc Kim',
  'Giáp Thìn':'Phú Đăng Hỏa','Ất Tỵ':'Phú Đăng Hỏa',
  'Bính Ngọ':'Thiên Hà Thủy','Đinh Mùi':'Thiên Hà Thủy',
  'Mậu Thân':'Đại Trạch Thổ','Kỷ Dậu':'Đại Trạch Thổ',
  'Canh Tuất':'Thoa Xuyến Kim','Tân Hợi':'Thoa Xuyến Kim',
  'Nhâm Tý':'Tang Đố Mộc','Quý Sửu':'Tang Đố Mộc',
  'Giáp Dần':'Đại Khê Thủy','Ất Mão':'Đại Khê Thủy',
  'Bính Thìn':'Sa Trung Thổ','Đinh Tỵ':'Sa Trung Thổ',
  'Mậu Ngọ':'Thiên Thượng Hỏa','Kỷ Mùi':'Thiên Thượng Hỏa',
  'Canh Thân':'Thạch Lựu Mộc','Tân Dậu':'Thạch Lựu Mộc',
  'Nhâm Tuất':'Đại Hải Thủy','Quý Hợi':'Đại Hải Thủy',
};

// ─── NGŨ HỔ NGUYÊN ĐỘN (năm can → tháng Dần can) ───────────
// Năm Giáp/Kỷ → Bính Dần; Ất/Canh → Mậu Dần; Bính/Tân → Canh Dần;
// Đinh/Nhâm → Nhâm Dần; Mậu/Quý → Giáp Dần
const NGU_HO_DAN_CAN = {
  'Giáp':'Bính','Kỷ':'Bính',
  'Ất':'Mậu','Canh':'Mậu',
  'Bính':'Canh','Tân':'Canh',
  'Đinh':'Nhâm','Nhâm':'Nhâm',
  'Mậu':'Giáp','Quý':'Giáp',
};

// ============================================================
// HELPERS
// ============================================================

function _canIdx(c) { return THIEN_CAN_TB.indexOf(c); }
function _chiIdx(c) { return DIA_CHI_TB.indexOf(c); }
function _mod(n, m) { return ((n % m) + m) % m; }

function _napAm(can, chi) { return NAP_AM_TB[`${can} ${chi}`] || '—'; }

// ─── THẬP THẦN ─────────────────────────────────────────────
// So sánh otherCan với refCan (Nhật Can) → trả về tên thập thần.
// Rule: dựa trên ngũ hành (sinh khắc) + cùng/khác âm dương.
function thapThan(refCan, otherCan) {
  if (!refCan || !otherCan) return '—';
  const refH = NGU_HANH_CAN_TB[refCan];
  const othH = NGU_HANH_CAN_TB[otherCan];
  const sameAD = amDuongCan(refCan) === amDuongCan(otherCan);

  if (refH === othH) {
    return sameAD ? 'Tỷ Kiên' : 'Kiếp Tài';
  }
  // Nhật can sinh other (nhật can sinh ra) → Thực Thương
  if (NGU_HANH_SINH_TB[refH] === othH) {
    return sameAD ? 'Thực Thần' : 'Thương Quan';
  }
  // Nhật can khắc other → Tài
  if (NGU_HANH_KHAC_TB[refH] === othH) {
    return sameAD ? 'Thiên Tài' : 'Chính Tài';
  }
  // Other khắc nhật can → Quan Sát
  if (NGU_HANH_KHAC_TB[othH] === refH) {
    return sameAD ? 'Thất Sát' : 'Chính Quan';
  }
  // Other sinh nhật can → Ấn
  if (NGU_HANH_SINH_TB[othH] === refH) {
    return sameAD ? 'Kiêu Thần' : 'Chính Ấn';
  }
  return '—';
}

// Nhóm thập thần: Tỷ Kiếp / Thực Thương / Tài / Quan Sát / Ấn Kiêu
function nhomThapThan(tt) {
  if (['Tỷ Kiên','Kiếp Tài'].includes(tt)) return 'Tỷ Kiếp';
  if (['Thực Thần','Thương Quan'].includes(tt)) return 'Thực Thương';
  if (['Chính Tài','Thiên Tài'].includes(tt)) return 'Tài';
  if (['Chính Quan','Thất Sát'].includes(tt)) return 'Quan Sát';
  if (['Chính Ấn','Kiêu Thần'].includes(tt)) return 'Ấn Kiêu';
  return '—';
}

// ============================================================
// PILLAR CONVERSION
// ============================================================

// Năm trụ — đã tính tới Lập Xuân
function _yearPillarBySolarYear(solarYear) {
  // Năm Giáp Tý = năm 4 (theo lịch can chi). Common formula: can = (year - 4) % 10, chi = (year - 4) % 12
  // Verify: 1984 → can=(1984-4)%10=0=Giáp, chi=(1984-4)%12=0=Tý → Giáp Tý ✓
  const canIdx = _mod(solarYear - 4, 10);
  const chiIdx = _mod(solarYear - 4, 12);
  return { can: THIEN_CAN_TB[canIdx], chi: DIA_CHI_TB[chiIdx] };
}

// Tháng trụ — từ năm can + tháng chi (theo Ngũ Hổ Nguyên Độn)
function _monthPillarByYearCanAndMonthChi(yearCan, monthChi) {
  const danCan = NGU_HO_DAN_CAN[yearCan];
  const danIdx = _canIdx(danCan); // can của tháng Dần
  const monthOffset = _mod(_chiIdx(monthChi) - _chiIdx('Dần'), 12); // 0=Dần, 1=Mão...
  const monthCanIdx = _mod(danIdx + monthOffset, 10);
  return { can: THIEN_CAN_TB[monthCanIdx], chi: monthChi };
}

// Ngày trụ — JDN modulo (formula đã verify trong tuvi engine)
function _dayPillarByJDN(jdn) {
  return {
    can: THIEN_CAN_TB[_mod(jdn + 9, 10)],
    chi: DIA_CHI_TB[_mod(jdn + 1, 12)],
  };
}

// Giờ trụ — từ ngày can + giờ chi (Ngũ Tý Nguyên Độn)
function _hourPillarByDayCanAndHourChi(dayCan, hourChi) {
  const dayCanIdx = _canIdx(dayCan);
  const hourChiIdx = _chiIdx(hourChi);
  // Giờ Tý của ngày Giáp = Giáp Tý → hour can = (dayCanIdx*2 + hourChiIdx) % 10
  const hourCanIdx = _mod(dayCanIdx * 2 + hourChiIdx, 10);
  return { can: THIEN_CAN_TB[hourCanIdx], chi: hourChi };
}

// Convert hour 0-23 → giờ chi
// Giờ Tý = 23-0:59 (tức 23:00-00:59)
function _hourToChi(hour) {
  return DIA_CHI_TB[Math.floor((hour + 1) / 2) % 12];
}

// Chi index của tháng theo solar longitude
// Sun longitude 315°=Lập Xuân (start Dần), 345°=Kinh Trập (start Mão), ...
// Mỗi tháng = 30°. Index 0=Dần, 1=Mão, ..., 11=Sửu.
function _monthChiBySunLongitude(L) {
  // Shift để Lập Xuân = 0
  const shifted = _mod(L - 315, 360);
  const monthOffset = Math.floor(shifted / 30); // 0-11
  // Map: 0→Dần, 1→Mão, 2→Thìn, ..., 10→Tý, 11→Sửu
  const monthChiOrder = ['Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi','Tý','Sửu'];
  return monthChiOrder[monthOffset];
}

// ============================================================
// MAIN ENTRY 1: convertDuongToBatTu
// ============================================================
// Input: dd, mm, yy (dương lịch), hour (0-23, default 12)
// Output: { tuTru[4], canChiNamSinh, gioChi, jdn, lapXuanJDN }
function convertDuongToBatTu(dd, mm, yy, hour = 12) {
  const jdnRaw = _jdFromDate_TB(dd, mm, yy);

  // Day boundary: hour 23-23:59 thuộc giờ Tý ngày sau
  // → ngày trụ dùng jdn+1 nếu hour >= 23
  const jdnDay = (hour >= 23) ? jdnRaw + 1 : jdnRaw;

  // ─── Năm trụ: Lập Xuân của yy
  const lapXuanJDN = _findTietKhiJDN(yy, 315);
  let solarYear = yy;
  if (lapXuanJDN && jdnRaw < lapXuanJDN) {
    // Sinh trước Lập Xuân → năm trụ thuộc năm trước
    solarYear = yy - 1;
  }
  const yearP = _yearPillarBySolarYear(solarYear);
  yearP.napAm = _napAm(yearP.can, yearP.chi);

  // ─── Tháng trụ: dựa vào sun longitude tại jdnRaw
  const L = _sunLongitudeDeg(jdnRaw);
  const monthChi = _monthChiBySunLongitude(L);
  const monthP = _monthPillarByYearCanAndMonthChi(yearP.can, monthChi);
  monthP.napAm = _napAm(monthP.can, monthP.chi);

  // ─── Ngày trụ: JDN modulo
  const dayP = _dayPillarByJDN(jdnDay);
  dayP.napAm = _napAm(dayP.can, dayP.chi);

  // ─── Giờ trụ: từ ngày can + giờ chi
  const gioChi = _hourToChi(hour);
  const hourP = _hourPillarByDayCanAndHourChi(dayP.can, gioChi);
  hourP.napAm = _napAm(hourP.can, hourP.chi);

  // ─── Tàng can cho mỗi trụ
  function withTangCan(p) {
    return { ...p, tangCan: TANG_CAN[p.chi] || [] };
  }

  return {
    tuTru: [
      { ten: 'Năm',   ...withTangCan(yearP) },
      { ten: 'Tháng', ...withTangCan(monthP) },
      { ten: 'Ngày',  ...withTangCan(dayP) },  // Nhật trụ
      { ten: 'Giờ',   ...withTangCan(hourP) },
    ],
    canChiNamSinh: { can: yearP.can, chi: yearP.chi },
    gioChi,
    jdn: jdnRaw,
    jdnDay,
    lapXuanJDN,
    sunLongitudeDeg: L,
    solarYearAdjusted: (solarYear !== yy),
  };
}

// ============================================================
// CƯỜNG NHƯỢC NHẬT CAN
// ============================================================
// Điểm cường nhược 0-10:
// - Đắc lệnh (sinh tháng có hành sinh hoặc cùng nhật can): +3
// - Đắc địa (root in chi: tàng can có hành cùng nhật can): +1 mỗi chi (max 4)
// - Đắc thế (thiên can khác trong tứ trụ có hành cùng hoặc sinh nhật can): +0.5 mỗi can
// - Bị tiết/khắc (chi có hành nhật can sinh ra hoặc khắc nhật can): -0.5 mỗi chi
function _tinhCuongNhuoc(tuTru, nhatCan) {
  const nhatHanh = NGU_HANH_CAN_TB[nhatCan];
  const monthChi = tuTru[1].chi;
  const monthHanh = NGU_HANH_CHI_TB[monthChi];

  // Đắc lệnh
  let dacLenh = false;
  let lenhScore = 0;
  if (monthHanh === nhatHanh) { dacLenh = true; lenhScore = 3; } // tỷ kiếp tháng
  else if (NGU_HANH_SINH_TB[monthHanh] === nhatHanh) { dacLenh = true; lenhScore = 2.5; } // ấn tháng
  else if (NGU_HANH_SINH_TB[nhatHanh] === monthHanh) { lenhScore = -1.5; } // thực thương tháng
  else if (NGU_HANH_KHAC_TB[monthHanh] === nhatHanh) { lenhScore = -2; } // quan sát tháng
  else if (NGU_HANH_KHAC_TB[nhatHanh] === monthHanh) { lenhScore = -1; } // tài tháng

  // Đắc địa: chi (4 chi) chứa tàng can có hành cùng nhật can
  let dacDia = 0;
  let dacDiaDetails = [];
  tuTru.forEach((tru, i) => {
    const tcs = TANG_CAN[tru.chi] || [];
    tcs.forEach(tc => {
      if (NGU_HANH_CAN_TB[tc.can] === nhatHanh) {
        dacDia += tc.weight;
        dacDiaDetails.push(`${tru.ten} (${tru.chi}/${tc.can})`);
      }
    });
  });

  // Đắc thế: thiên can khác (3 can: năm, tháng, giờ — không tính nhật can)
  let dacThe = 0;
  let dacTheDetails = [];
  [tuTru[0], tuTru[1], tuTru[3]].forEach(tru => {
    const h = NGU_HANH_CAN_TB[tru.can];
    if (h === nhatHanh) { dacThe += 1; dacTheDetails.push(`${tru.ten} (${tru.can}/Tỷ Kiếp)`); }
    else if (NGU_HANH_SINH_TB[h] === nhatHanh) { dacThe += 0.7; dacTheDetails.push(`${tru.ten} (${tru.can}/Ấn)`); }
  });

  // Tiết/khắc từ thiên can khác
  let tietKhac = 0;
  [tuTru[0], tuTru[1], tuTru[3]].forEach(tru => {
    const h = NGU_HANH_CAN_TB[tru.can];
    if (NGU_HANH_SINH_TB[nhatHanh] === h) tietKhac += 0.4; // thực thương
    else if (NGU_HANH_KHAC_TB[nhatHanh] === h) tietKhac += 0.4; // tài
    else if (NGU_HANH_KHAC_TB[h] === nhatHanh) tietKhac += 0.6; // quan sát
  });

  // Tổng điểm: base 5, + lệnh, + đắc địa, + đắc thế, - tiết khắc
  let raw = 5 + lenhScore + dacDia * 0.7 + dacThe - tietKhac;
  raw = Math.max(0, Math.min(10, raw));

  let label;
  if (raw >= 8.5) label = 'Cực vượng';
  else if (raw >= 6.5) label = 'Vượng';
  else if (raw >= 4.5) label = 'Bình hòa';
  else if (raw >= 2.5) label = 'Nhược';
  else label = 'Cực nhược';

  return {
    score: Math.round(raw * 10) / 10,
    label,
    dacLenh,
    lenhScore: Math.round(lenhScore * 10) / 10,
    dacDia: Math.round(dacDia * 10) / 10,
    dacDiaDetails,
    dacThe: Math.round(dacThe * 10) / 10,
    dacTheDetails,
    tietKhac: Math.round(tietKhac * 10) / 10,
  };
}

// ============================================================
// NGŨ HÀNH BALANCE
// ============================================================
function _tinhNguHanhBalance(tuTru) {
  const counts = { 'Mộc': 0, 'Hỏa': 0, 'Thổ': 0, 'Kim': 0, 'Thủy': 0 };
  const weighted = { 'Mộc': 0, 'Hỏa': 0, 'Thổ': 0, 'Kim': 0, 'Thủy': 0 };

  tuTru.forEach(tru => {
    // Thiên can: weight 1.0
    const canHanh = NGU_HANH_CAN_TB[tru.can];
    counts[canHanh] += 1;
    weighted[canHanh] += 1.0;

    // Tàng can với weight
    (TANG_CAN[tru.chi] || []).forEach(tc => {
      const h = NGU_HANH_CAN_TB[tc.can];
      counts[h] += 1; // count thô (mỗi tàng can = 1)
      weighted[h] += tc.weight;
    });
  });

  // Round weighted
  Object.keys(weighted).forEach(k => weighted[k] = Math.round(weighted[k] * 10) / 10);

  // Dominant & deficient
  const sorted = Object.entries(weighted).sort((a, b) => b[1] - a[1]);
  return {
    counts,
    weighted,
    dominant: sorted[0][0],
    deficient: sorted[sorted.length - 1][0],
    sorted,
  };
}

// ============================================================
// DỤNG THẦN (PHÙ ỨC + ĐIỀU HẬU)
// ============================================================
function _chonDungThan(cuongNhuoc, nhatCan, tuTru, nguHanh) {
  const nhatHanh = NGU_HANH_CAN_TB[nhatCan];
  const monthChi = tuTru[1].chi;
  const monthHanh = NGU_HANH_CHI_TB[monthChi];

  let primary, secondary, method, rationale;

  // Tòng cách check (cực nhược, không có gốc, tứ trụ toàn 1 nhóm đối lập)
  // Đơn giản hóa: nếu cuongNhuoc.score < 2 và đắc địa = 0 → tòng cách
  const isTong = cuongNhuoc.score < 2 && cuongNhuoc.dacDia === 0;

  // Chuyên vượng (nhất hành đắc khí): cực vượng + tứ trụ toàn 1 hành
  const isChuyenVuong = cuongNhuoc.score > 8.5 && nguHanh.weighted[nhatHanh] >= 5;

  if (isTong) {
    // Tòng theo hành mạnh nhất (không phải nhật can hành)
    const sortedNonSelf = nguHanh.sorted.filter(([h]) => h !== nhatHanh);
    primary = sortedNonSelf[0][0];
    secondary = NGU_HANH_SINH_TB[primary] || sortedNonSelf[1][0];
    method = 'tòng-cách';
    rationale = `Nhật Can ${nhatCan} cực nhược, không có gốc trong tứ trụ — tòng theo hành ${primary} đang vượng nhất.`;
  } else if (isChuyenVuong) {
    primary = nhatHanh;
    secondary = NGU_HANH_SINH_TB[nhatHanh]; // hành mà nhật can sinh ra
    method = 'chuyên-vượng';
    rationale = `Nhật Can ${nhatCan} cực vượng, tứ trụ chuyên một hành — thuận theo thế chuyên vượng, dụng hành ${primary}.`;
  } else if (cuongNhuoc.score >= 6.5) {
    // Vượng → khắc/tiết/hao thân
    const quanSatHanh = KHAC_BY_TB[nhatHanh];           // hành khắc nhật can = Quan Sát (FIX)
    const tietHanh    = NGU_HANH_SINH_TB[nhatHanh];     // hành nhật can sinh = Thực Thương
    const taiHanh     = NGU_HANH_KHAC_TB[nhatHanh];     // hành nhật can khắc = Tài
    // Cổ pháp ưu tiên: Quan Sát có gốc → dụng; nếu không, Thực Thương; phụ là Tài (sinh Quan)
    if (nguHanh.weighted[quanSatHanh] >= 1.5) {
      primary = quanSatHanh; secondary = taiHanh; // Tài sinh Quan
    } else if (nguHanh.weighted[tietHanh] >= 1.5) {
      primary = tietHanh; secondary = taiHanh;    // Thực tiết khí + Tài
    } else {
      primary = taiHanh; secondary = tietHanh;    // Tài hao thân + Thực sinh Tài
    }
    method = 'phù-ức (chế)';
    rationale = `Nhật Can ${nhatCan} ${cuongNhuoc.label.toLowerCase()} (đắc lệnh tháng ${monthHanh}, đắc địa ${cuongNhuoc.dacDia}, đắc thế ${cuongNhuoc.dacThe}). Cần ${primary} để chế, hỉ thần ${secondary}.`;
  } else if (cuongNhuoc.score < 4.5) {
    // Nhược → sinh/phù
    const anHanh = nhatHanh === 'Mộc' ? 'Thủy' :
                   nhatHanh === 'Hỏa' ? 'Mộc' :
                   nhatHanh === 'Thổ' ? 'Hỏa' :
                   nhatHanh === 'Kim' ? 'Thổ' : 'Kim';
    const tyKiepHanh = nhatHanh;
    if (nguHanh.weighted[anHanh] >= 1) {
      primary = anHanh; secondary = tyKiepHanh;
    } else {
      primary = tyKiepHanh; secondary = anHanh;
    }
    method = 'phù-ức (phù)';
    rationale = `Nhật Can ${nhatCan} ${cuongNhuoc.label.toLowerCase()} (đắc địa chỉ ${cuongNhuoc.dacDia}). Cần ${primary} để sinh phù, hỉ thần ${secondary}.`;
  } else {
    // Bình hòa → trung dung, dùng hành đang yếu nhất để cân bằng
    primary = nguHanh.deficient;
    secondary = nguHanh.sorted[3][0]; // hành yếu thứ 2
    method = 'điều-hậu/cân-bằng';
    rationale = `Nhật Can ${nhatCan} bình hòa. Tứ trụ thiếu ${primary} → dụng để cân bằng.`;
  }

  // ─── Điều hậu adjustment ──
  // Mùa đông (tháng Tý/Sửu/Hợi): khí lạnh, cần Hỏa
  // Mùa hè (tháng Tỵ/Ngọ/Mùi): khí nóng, cần Thủy
  const isWinter = ['Tý','Sửu','Hợi'].includes(monthChi);
  const isSummer = ['Tỵ','Ngọ','Mùi'].includes(monthChi);
  let dieuHau = null;
  if (isWinter && nguHanh.weighted['Hỏa'] < 1) {
    dieuHau = 'Hỏa';
    rationale += ` Sinh tháng ${monthChi} (đông), thiếu Hỏa → cần Hỏa điều hậu.`;
  } else if (isSummer && nguHanh.weighted['Thủy'] < 1) {
    dieuHau = 'Thủy';
    rationale += ` Sinh tháng ${monthChi} (hè), thiếu Thủy → cần Thủy điều hậu.`;
  }

  return { primary, secondary, method, rationale, dieuHau, isTong, isChuyenVuong };
}

// ============================================================
// CÁCH CỤC (8 chính cách + biệt cách)
// ============================================================
function _xacDinhCachCuc(tuTru, nhatCan, dungThan) {
  const monthChi = tuTru[1].chi;
  const monthCan = tuTru[1].can;
  const yearCan = tuTru[0].can;
  const hourCan = tuTru[3].can;
  const tcsMonth = TANG_CAN[monthChi] || [];
  const cachs = [];

  // Biệt cách trước (override chính cách)
  if (dungThan.isTong) {
    // Tòng cách
    const tongHanh = dungThan.primary;
    let tongType = 'Tòng cách';
    // Phân loại sub: Tòng Tài / Tòng Sát / Tòng Nhi / Tòng Cường / Tòng Vượng
    const nhatHanh = NGU_HANH_CAN_TB[nhatCan];
    if (NGU_HANH_KHAC_TB[nhatHanh] === tongHanh) tongType = 'Tòng Tài cách';
    else if (NGU_HANH_KHAC_TB[tongHanh] === nhatHanh) tongType = 'Tòng Sát cách';
    else if (NGU_HANH_SINH_TB[nhatHanh] === tongHanh) tongType = 'Tòng Nhi cách (tòng thực thương)';
    return {
      primary: tongType,
      type: 'biệt-cách',
      thanhPhaCach: 'thành cách',
      note: `Nhật Can ${nhatCan} cực nhược, tứ trụ tòng theo ${tongHanh}.`,
    };
  }
  if (dungThan.isChuyenVuong) {
    const nhatHanh = NGU_HANH_CAN_TB[nhatCan];
    const map = {
      'Mộc':'Khúc Trực cách', 'Hỏa':'Viêm Thượng cách',
      'Thổ':'Giá Sắc cách', 'Kim':'Tòng Cách cách', 'Thủy':'Nhuận Hạ cách',
    };
    return {
      primary: map[nhatHanh] || 'Chuyên Vượng cách',
      type: 'biệt-cách',
      thanhPhaCach: 'thành cách',
      note: `Tứ trụ chuyên một hành ${nhatHanh}, nhật can vượng cực — Nhất Hành Đắc Khí.`,
    };
  }

  // Chính cách: dựa vào tàng can nguyệt lệnh
  const monthHanh = NGU_HANH_CHI_TB[monthChi];
  const nhatHanh = NGU_HANH_CAN_TB[nhatCan];

  // Lộc Kiếp cách: nguyệt chi là tỷ kiếp (lộc/nhận của nhật can)
  if (monthHanh === nhatHanh) {
    // Phân biệt Lộc cách vs Nhận cách
    const monthChiTangChinh = tcsMonth[0]?.can;
    const nhatADChi = (monthChiTangChinh && amDuongCan(monthChiTangChinh) === amDuongCan(nhatCan));
    cachs.push({
      primary: nhatADChi ? 'Lộc cách' : 'Nhận cách (Dương Nhẫn)',
      type: 'biệt-cách',
      thanhPhaCach: 'thường cách',
      note: `Nguyệt chi ${monthChi} là ${nhatADChi ? 'lộc' : 'nhận'} của Nhật Can ${nhatCan}. Cách này không lấy nguyệt lệnh thấu can — cần dụng thần khác.`,
    });
  } else {
    // 8 chính cách: tàng can nguyệt chi thấu lên thiên can năm/tháng/giờ → cách cục theo tàng can đó
    const truThauCan = [yearCan, monthCan, hourCan];
    let foundChinhCach = null;
    for (const tc of tcsMonth) {
      if (truThauCan.includes(tc.can)) {
        const tt = thapThan(nhatCan, tc.can);
        const cachMap = {
          'Chính Quan': 'Chính Quan cách',
          'Thất Sát':   'Thất Sát cách (Thiên Quan)',
          'Chính Tài':  'Chính Tài cách',
          'Thiên Tài':  'Thiên Tài cách',
          'Chính Ấn':   'Chính Ấn cách',
          'Kiêu Thần':  'Thiên Ấn cách (Kiêu Thần)',
          'Thực Thần':  'Thực Thần cách',
          'Thương Quan':'Thương Quan cách',
        };
        if (cachMap[tt]) {
          foundChinhCach = { name: cachMap[tt], thauCan: tc.can, thapThan: tt, weight: tc.weight };
          break; // chính khí ưu tiên
        }
      }
    }

    if (foundChinhCach) {
      cachs.push({
        primary: foundChinhCach.name,
        type: 'chính-cách',
        thanhPhaCach: 'thành cách',
        note: `Tàng can ${foundChinhCach.thauCan} (${foundChinhCach.weight === 1 ? 'chính khí' : 'tàng khí'}) trong nguyệt chi ${monthChi} thấu lên thiên can — thập thần ${foundChinhCach.thapThan}.`,
      });
    } else {
      // Không thấu → lấy theo chính khí nguyệt lệnh
      const benKhiCan = tcsMonth[0]?.can;
      if (benKhiCan) {
        const tt = thapThan(nhatCan, benKhiCan);
        const cachMap = {
          'Chính Quan':'Chính Quan cách','Thất Sát':'Thất Sát cách',
          'Chính Tài':'Chính Tài cách','Thiên Tài':'Thiên Tài cách',
          'Chính Ấn':'Chính Ấn cách','Kiêu Thần':'Thiên Ấn cách',
          'Thực Thần':'Thực Thần cách','Thương Quan':'Thương Quan cách',
          'Tỷ Kiên':'Lộc cách','Kiếp Tài':'Nhận cách',
        };
        cachs.push({
          primary: cachMap[tt] || 'Cách cục mơ hồ',
          type: 'chính-cách',
          thanhPhaCach: 'thường cách',
          note: `Tàng can chính ${benKhiCan} không thấu lên thiên can — lấy theo bản khí nguyệt lệnh, thập thần ${tt}.`,
        });
      }
    }
  }

  // Hóa cách check: nhật can hợp với can liền kề (tháng or giờ) và hành hóa được tứ trụ ủng hộ
  const adjacentCans = [
    { ten: 'Tháng', can: monthCan },
    { ten: 'Giờ', can: hourCan },
  ];
  for (const adj of adjacentCans) {
    const key = `${nhatCan}-${adj.can}`;
    if (THIEN_CAN_HOP[key]) {
      const hoaHanh = THIEN_CAN_HOP[key];
      cachs.push({
        primary: `Hóa ${hoaHanh} cách (tiềm năng)`,
        type: 'biệt-cách',
        thanhPhaCach: 'cần verify',
        note: `Nhật Can ${nhatCan} hợp với ${adj.ten} can ${adj.can} → có thể hóa ${hoaHanh} (chỉ thành cách khi hành hóa vượng + không bị xung phá).`,
      });
    }
  }

  return cachs[0] || {
    primary: 'Cách cục không rõ',
    type: 'không-xác-định',
    thanhPhaCach: 'không-xác-định',
    note: 'Không tìm thấy cách cục chuẩn — luận theo cường nhược + dụng thần.',
  };
}

// ============================================================
// ĐẠI VẬN
// ============================================================
function _tinhDaiVan(tuTru, nhatCan, gioitinh, jdnRaw, dungThan, namSinhDL, cuongNhuoc, cachCuc) {
  const yearCan = tuTru[0].can;
  const monthCan = tuTru[1].can;
  const monthChi = tuTru[1].chi;
  const nhatHanh = NGU_HANH_CAN_TB[nhatCan];
  const nhatChi = tuTru[2].chi;

  // Chiều: Dương Nam / Âm Nữ → thuận; Âm Nam / Dương Nữ → nghịch
  const yearAD = amDuongCan(yearCan);
  const isThuan = (yearAD === 'dương' && gioitinh === 'nam') ||
                  (yearAD === 'âm'    && gioitinh === 'nu');

  // Khởi vận age: đếm ngày từ sinh đến tiết khí gần nhất theo chiều
  const TIET_DEGS = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];
  let nearestForward = null, nearestBackward = null;
  for (const yy of [namSinhDL - 1, namSinhDL, namSinhDL + 1]) {
    for (const deg of TIET_DEGS) {
      const tjdn = _findTietKhiJDN(yy, deg);
      if (!tjdn) continue;
      if (tjdn > jdnRaw && (!nearestForward || tjdn < nearestForward)) nearestForward = tjdn;
      if (tjdn < jdnRaw && (!nearestBackward || tjdn > nearestBackward)) nearestBackward = tjdn;
    }
  }

  let daysDiff;
  if (isThuan) daysDiff = nearestForward ? (nearestForward - jdnRaw) : 5;
  else         daysDiff = nearestBackward ? (jdnRaw - nearestBackward) : 5;
  const tuoiKhoiVan = Math.max(1, Math.round(daysDiff / 3));

  // Thập thần Tỷ Kiếp / Ấn vs Quan Sát / Thực Thương / Tài
  const TT_PHU_THAN  = ['Tỷ Kiên','Kiếp Tài','Chính Ấn','Kiêu Thần']; // sinh-phù nhật can
  const TT_KHAC_THAN = ['Chính Quan','Thất Sát','Thực Thần','Thương Quan','Chính Tài','Thiên Tài']; // chế-tiết-hao nhật can
  const TT_QUANSAT   = ['Chính Quan','Thất Sát'];
  const TT_THUCTHUONG= ['Thực Thần','Thương Quan'];
  const TT_AN        = ['Chính Ấn','Kiêu Thần'];
  const TT_TYKIEP    = ['Tỷ Kiên','Kiếp Tài'];

  // Tứ trụ chi để check hợp/xung
  const truChis = tuTru.map(t => t.chi);
  const truTens = tuTru.map(t => t.ten);
  const truCans = tuTru.map(t => t.can);

  // Vượng nhược context
  const isVuong  = cuongNhuoc.score >= 6.5 || cuongNhuoc.label === 'Vượng' || cuongNhuoc.label === 'Cực vượng';
  const isNhuoc  = cuongNhuoc.score < 4.5  || cuongNhuoc.label === 'Nhược' || cuongNhuoc.label === 'Cực nhược';

  // Sequence: từ tháng trụ
  const monthCanIdx = _canIdx(monthCan);
  const monthChiIdx = _chiIdx(monthChi);
  const dvs = [];

  for (let i = 1; i <= 9; i++) {
    const offset = isThuan ? i : -i;
    const dvCan = THIEN_CAN_TB[_mod(monthCanIdx + offset, 10)];
    const dvChi = DIA_CHI_TB[_mod(monthChiIdx + offset, 12)];
    const tuoiStart = tuoiKhoiVan + (i - 1) * 10;
    const tuoiEnd = tuoiStart + 9;
    const namStart = namSinhDL + tuoiStart - 1;
    const namEnd = namSinhDL + tuoiEnd - 1;

    const dvHanhCan = NGU_HANH_CAN_TB[dvCan];
    const dvHanhChi = NGU_HANH_CHI_TB[dvChi];
    const ttCan = thapThan(nhatCan, dvCan);
    const ttChi = thapThan(nhatCan, _bankhi(dvChi));  // thập thần của bản khí địa chi

    // ─── Score breakdown — factors[] cho từng yếu tố ───
    const factors = [];
    let score = 5;  // base trung dung

    // 1) Affinity với dụng thần (chi quan trọng hơn can — chunk 165)
    const kyThan = KHAC_BY_TB[dungThan.primary];  // hành khắc dụng thần (FIX bug cũ)
    if (dvHanhChi === dungThan.primary) {
      score += 3.0; factors.push({ type:'dụng thần', text:`Chi ${dvChi} hành ${dvHanhChi} = dụng thần`, delta: 3.0 });
    } else if (dvHanhCan === dungThan.primary) {
      score += 2.0; factors.push({ type:'dụng thần', text:`Can ${dvCan} hành ${dvHanhCan} = dụng thần`, delta: 2.0 });
    }
    if (dvHanhChi === dungThan.secondary && dvHanhChi !== dungThan.primary) {
      score += 1.5; factors.push({ type:'hỉ thần', text:`Chi ${dvChi} = hỉ thần ${dungThan.secondary}`, delta: 1.5 });
    } else if (dvHanhCan === dungThan.secondary && dvHanhCan !== dungThan.primary) {
      score += 1.0; factors.push({ type:'hỉ thần', text:`Can ${dvCan} = hỉ thần ${dungThan.secondary}`, delta: 1.0 });
    }
    if (dvHanhChi === kyThan) {
      score -= 3.0; factors.push({ type:'kỵ thần', text:`Chi ${dvChi} hành ${kyThan} = kỵ thần (khắc dụng)`, delta: -3.0 });
    } else if (dvHanhCan === kyThan) {
      score -= 2.0; factors.push({ type:'kỵ thần', text:`Can ${dvCan} hành ${kyThan} = kỵ thần`, delta: -2.0 });
    }

    // 2) Điều hậu
    if (dungThan.dieuHau && (dvHanhCan === dungThan.dieuHau || dvHanhChi === dungThan.dieuHau)) {
      score += 1.0;
      factors.push({ type:'điều hậu', text:`Bù ${dungThan.dieuHau} điều hậu`, delta: 1.0 });
    }

    // 3) Đại vận chi VS tứ trụ chi: xung / hợp / hình / hại
    truChis.forEach((tchi, idx) => {
      // Lục xung
      if (LUC_XUNG.some(([a,b]) => (a===dvChi && b===tchi) || (b===dvChi && a===tchi))) {
        const isNhatXung = idx === 2;
        const delta = isNhatXung ? -1.5 : -1.0;
        score += delta;
        factors.push({ type:'xung', text:`Chi ĐV ${dvChi} xung ${truTens[idx]} ${tchi}${isNhatXung?' (xung Nhật Chi — biến động lớn)':''}`, delta });
      }
      // Lục hợp
      if (LUC_HOP.some(h => h.chis.includes(dvChi) && h.chis.includes(tchi) && dvChi !== tchi)) {
        const hopHanh = LUC_HOP.find(h => h.chis.includes(dvChi) && h.chis.includes(tchi)).hanh;
        let delta = 0.3;
        if (hopHanh === dungThan.primary) delta = 1.5;
        else if (hopHanh === kyThan)      delta = -1.5;
        score += delta;
        factors.push({ type:'lục hợp', text:`Chi ĐV ${dvChi} hợp ${truTens[idx]} ${tchi} → hóa ${hopHanh}`, delta });
      }
      // Tam hình
      if (TAM_HINH.some(th => th.chis.includes(dvChi) && th.chis.includes(tchi) && dvChi !== tchi)) {
        score -= 0.5;
        factors.push({ type:'hình', text:`Chi ĐV ${dvChi} hình ${truTens[idx]} ${tchi}`, delta: -0.5 });
      }
      // Lục hại
      if (LUC_HAI.some(([a,b]) => (a===dvChi && b===tchi) || (b===dvChi && a===tchi))) {
        score -= 0.3;
        factors.push({ type:'hại', text:`Chi ĐV ${dvChi} hại ${truTens[idx]} ${tchi}`, delta: -0.3 });
      }
    });

    // 4) Tam hợp với 2 chi tứ trụ → tạo cục
    TAM_HOP.forEach(th => {
      if (!th.chis.includes(dvChi)) return;
      const matchInTru = th.chis.filter(c => c !== dvChi && truChis.includes(c));
      if (matchInTru.length >= 2) {
        // 3-chi: dvChi + 2 trụ → tam hợp trọn cục
        let delta = 0.8;
        if (th.hanh === dungThan.primary)     delta = 2.0;
        else if (th.hanh === kyThan)          delta = -2.0;
        else if (th.hanh === dungThan.secondary) delta = 1.0;
        score += delta;
        factors.push({ type:'tam hợp', text:`Chi ĐV ${dvChi} cùng ${matchInTru.join(',')} tam hợp → ${th.hanh}`, delta });
      } else if (matchInTru.length === 1) {
        // bán hợp
        let delta = 0.3;
        if (th.hanh === dungThan.primary) delta = 0.8;
        else if (th.hanh === kyThan)       delta = -0.8;
        score += delta;
        factors.push({ type:'bán hợp', text:`Chi ĐV ${dvChi} bán hợp ${matchInTru[0]} → ${th.hanh}`, delta });
      }
    });

    // 5) Can hợp giữa thiên can ĐV và can nhật/tháng/giờ
    truCans.forEach((tcan, idx) => {
      if (idx === 0) return; // bỏ can năm vì xa
      const k = `${dvCan}-${tcan}`;
      const hoaHanh = THIEN_CAN_HOP[k] || THIEN_CAN_HOP[`${tcan}-${dvCan}`];
      if (hoaHanh) {
        const isNhat = idx === 2;
        let delta = isNhat ? 0.5 : 0.3;
        if (hoaHanh === dungThan.primary)      delta = isNhat ? 1.5 : 0.8;
        else if (hoaHanh === kyThan)           delta = isNhat ? -1.5 : -0.8;
        score += delta;
        factors.push({ type:'can hợp', text:`Can ĐV ${dvCan} hợp ${truTens[idx]} ${tcan} → hóa ${hoaHanh}${isNhat?' (hợp Nhật Can)':''}`, delta });
      }
    });

    // 6) Asymmetric reading theo vượng/nhược (cổ pháp chunk 224 + 30)
    if (isVuong) {
      // Vượng → thích Quan/Sát/Thực/Thương/Tài (chế-tiết-hao)
      if (TT_QUANSAT.includes(ttCan) || TT_QUANSAT.includes(ttChi)) {
        score += 1.0; factors.push({ type:'thập thần ĐV', text:`${ttCan}/Sát chế Nhật Can vượng — thuận`, delta: 1.0 });
      } else if (TT_THUCTHUONG.includes(ttCan)) {
        score += 0.8; factors.push({ type:'thập thần ĐV', text:`${ttCan} tiết khí thừa — thuận`, delta: 0.8 });
      } else if (['Chính Tài','Thiên Tài'].includes(ttCan)) {
        score += 0.6; factors.push({ type:'thập thần ĐV', text:`${ttCan} hao thân (vừa phải) — thuận`, delta: 0.6 });
      }
      // Nghịch: Tỷ Kiếp / Ấn → vượng càng vượng
      if (TT_TYKIEP.includes(ttCan)) {
        score -= 1.0; factors.push({ type:'thập thần ĐV', text:`${ttCan} thêm gốc cho Nhật Can vượng — nghịch`, delta: -1.0 });
      } else if (TT_AN.includes(ttCan)) {
        score -= 1.2; factors.push({ type:'thập thần ĐV', text:`${ttCan} sinh phù Nhật Can vượng — nghịch`, delta: -1.2 });
      }
    } else if (isNhuoc) {
      // Nhược → thích Ấn / Tỷ Kiếp (sinh-phù)
      if (TT_AN.includes(ttCan)) {
        score += 1.2; factors.push({ type:'thập thần ĐV', text:`${ttCan} sinh phù Nhật Can nhược — thuận`, delta: 1.2 });
      } else if (TT_TYKIEP.includes(ttCan)) {
        score += 1.0; factors.push({ type:'thập thần ĐV', text:`${ttCan} hỗ trợ Nhật Can nhược — thuận`, delta: 1.0 });
      }
      // Đặc biệt: nhược + tài/quan đè (chunk 30 cảnh báo)
      if (TT_QUANSAT.includes(ttCan)) {
        const taiNhieu = (cuongNhuoc.dacThe||0) === 0 || cuongNhuoc.score < 3;
        const delta = taiNhieu ? -1.8 : -1.0;
        score += delta;
        factors.push({ type:'thập thần ĐV', text:`${ttCan} khắc Nhật Can nhược${taiNhieu?' — nguy (vận quan họa tương trục)':' — nghịch'}`, delta });
      } else if (['Chính Tài','Thiên Tài'].includes(ttCan)) {
        score -= 0.8; factors.push({ type:'thập thần ĐV', text:`${ttCan} hao Nhật Can vốn nhược — nghịch`, delta: -0.8 });
      } else if (TT_THUCTHUONG.includes(ttCan)) {
        score -= 0.6; factors.push({ type:'thập thần ĐV', text:`${ttCan} tiết khí Nhật Can nhược — nghịch nhẹ`, delta: -0.6 });
      }
    }

    // 7) Cách cục interaction
    if (cachCuc?.primary) {
      const cc = cachCuc.primary;
      // Chính Quan cách + ĐV Thương Quan = phá cách
      if (cc.includes('Chính Quan') && ttCan === 'Thương Quan') {
        score -= 1.5; factors.push({ type:'phá cách', text:`Cách Chính Quan gặp ĐV Thương Quan → phá cách`, delta: -1.5 });
      }
      // Thất Sát cách + ĐV Thực Thần = thành cách (chế Sát)
      if (cc.includes('Thất Sát') && ttCan === 'Thực Thần') {
        score += 1.2; factors.push({ type:'thành cách', text:`Cách Thất Sát gặp ĐV Thực Thần (chế Sát) → thành`, delta: 1.2 });
      }
      // Thực Thần cách + ĐV Kiêu Thần = đoạt Thực
      if (cc.includes('Thực Thần') && ttCan === 'Kiêu Thần') {
        score -= 1.2; factors.push({ type:'phá cách', text:`Cách Thực Thần gặp ĐV Kiêu Thần (đoạt Thực) → phá`, delta: -1.2 });
      }
      // Tài cách + ĐV Tỷ Kiếp/Kiếp Tài = đoạt Tài
      if ((cc.includes('Chính Tài') || cc.includes('Thiên Tài')) && TT_TYKIEP.includes(ttCan)) {
        score -= 1.2; factors.push({ type:'phá cách', text:`Cách Tài gặp ĐV ${ttCan} (đoạt Tài) → phá`, delta: -1.2 });
      }
      // Ấn cách + ĐV Tài = phá Ấn
      if ((cc.includes('Chính Ấn') || cc.includes('Kiêu Thần')) && ['Chính Tài','Thiên Tài'].includes(ttCan)) {
        score -= 1.0; factors.push({ type:'phá cách', text:`Cách Ấn gặp ĐV ${ttCan} (phá Ấn) → phá cách`, delta: -1.0 });
      }
    }

    // ─── Clamp & label ───
    score = Math.max(0, Math.min(10, score));
    const scoreRounded = Math.round(score * 10) / 10;
    let label;
    if (scoreRounded >= 6.5)      label = 'thuận';
    else if (scoreRounded >= 4.0) label = 'trung';
    else                          label = 'nghịch';

    dvs.push({
      idx: i - 1,
      can: dvCan,
      chi: dvChi,
      napAm: _napAm(dvCan, dvChi),
      thapThanCan: ttCan,
      thapThanChi: ttChi,
      hanhCan: dvHanhCan,
      hanhChi: dvHanhChi,
      tuoiStart, tuoiEnd, namStart, namEnd,
      score: scoreRounded,
      label,
      factors,  // breakdown chi tiết
    });
  }

  return { daiVans: dvs, tuoiKhoiVan, isThuan, daysDiff };
}

// Helper: bản khí của 1 địa chi (can chính tàng)
function _bankhi(chi) {
  const tang = TANG_CAN[chi];
  return tang && tang.length > 0 ? tang[0].can : null;
}

// ============================================================
// LƯU NIÊN (năm xem)
// ============================================================
function _tinhLuuNien(namXem, nhatCan, tuTru, dungThan, cuongNhuoc, cachCuc, dvHienTai) {
  const yp = _yearPillarBySolarYear(namXem);
  const ttCan = thapThan(nhatCan, yp.can);
  const ttChi = thapThan(nhatCan, _bankhi(yp.chi));
  const hanhCan = NGU_HANH_CAN_TB[yp.can];
  const hanhChi = NGU_HANH_CHI_TB[yp.chi];

  const TT_QUANSAT    = ['Chính Quan','Thất Sát'];
  const TT_THUCTHUONG = ['Thực Thần','Thương Quan'];
  const TT_AN         = ['Chính Ấn','Kiêu Thần'];
  const TT_TYKIEP     = ['Tỷ Kiên','Kiếp Tài'];

  const isVuong = cuongNhuoc?.score >= 6.5 || cuongNhuoc?.label === 'Vượng' || cuongNhuoc?.label === 'Cực vượng';
  const isNhuoc = cuongNhuoc?.score < 4.5 || cuongNhuoc?.label === 'Nhược' || cuongNhuoc?.label === 'Cực nhược';

  const truChis = tuTru.map(t => t.chi);
  const truTens = tuTru.map(t => t.ten);
  const truCans = tuTru.map(t => t.can);

  // Relations với tứ trụ (giữ structure cũ cho backward compat)
  const relations = { hopVoi: [], xungVoi: [], hinhVoi: [], haiVoi: [], canHopVoi: [], canKhacVoi: [] };
  tuTru.forEach(tru => {
    if (LUC_XUNG.some(([a,b]) => (a===yp.chi && b===tru.chi) || (b===yp.chi && a===tru.chi))) {
      relations.xungVoi.push(`${tru.ten} (${tru.chi})`);
    }
    if (LUC_HOP.some(h => h.chis.includes(yp.chi) && h.chis.includes(tru.chi) && yp.chi !== tru.chi)) {
      relations.hopVoi.push(`${tru.ten} (${tru.chi})`);
    }
    if (LUC_HAI.some(([a,b]) => (a===yp.chi && b===tru.chi) || (b===yp.chi && a===tru.chi))) {
      relations.haiVoi.push(`${tru.ten} (${tru.chi})`);
    }
    if (TAM_HINH.some(th => th.chis.includes(yp.chi) && th.chis.includes(tru.chi) && yp.chi !== tru.chi)) {
      relations.hinhVoi.push(`${tru.ten} (${tru.chi})`);
    }
    const k1 = `${yp.can}-${tru.can}`, k2 = `${tru.can}-${yp.can}`;
    if (THIEN_CAN_HOP[k1] || THIEN_CAN_HOP[k2]) {
      const h = THIEN_CAN_HOP[k1] || THIEN_CAN_HOP[k2];
      relations.canHopVoi.push(`${tru.ten} (${tru.can}) → hóa ${h}`);
    }
    const yh = NGU_HANH_CAN_TB[yp.can], th = NGU_HANH_CAN_TB[tru.can];
    if (NGU_HANH_KHAC_TB[yh] === th || NGU_HANH_KHAC_TB[th] === yh) {
      relations.canKhacVoi.push(`${tru.ten} (${tru.can})`);
    }
  });

  // ─── Score breakdown ───
  const factors = [];
  let score = 5;
  const kyThan = KHAC_BY_TB[dungThan.primary];

  // 1) Affinity với dụng thần — chunk 165: thái tuế CAN > CHI (đảo lại với đại vận)
  if (hanhCan === dungThan.primary) {
    score += 2.5; factors.push({ type:'dụng thần', text:`Can ${yp.can} = dụng thần`, delta: 2.5 });
  } else if (hanhChi === dungThan.primary) {
    score += 1.5; factors.push({ type:'dụng thần', text:`Chi ${yp.chi} = dụng thần`, delta: 1.5 });
  }
  if (hanhCan === dungThan.secondary && hanhCan !== dungThan.primary) {
    score += 1.0; factors.push({ type:'hỉ thần', text:`Can ${yp.can} = hỉ thần`, delta: 1.0 });
  } else if (hanhChi === dungThan.secondary && hanhChi !== dungThan.primary) {
    score += 0.6; factors.push({ type:'hỉ thần', text:`Chi ${yp.chi} = hỉ thần`, delta: 0.6 });
  }
  if (hanhCan === kyThan) {
    score -= 2.5; factors.push({ type:'kỵ thần', text:`Can ${yp.can} hành ${kyThan} = kỵ thần`, delta: -2.5 });
  } else if (hanhChi === kyThan) {
    score -= 1.5; factors.push({ type:'kỵ thần', text:`Chi ${yp.chi} hành ${kyThan} = kỵ thần`, delta: -1.5 });
  }

  // 2) Hợp/Xung/Hình/Hại với 4 chi tứ trụ
  truChis.forEach((tchi, idx) => {
    if (LUC_XUNG.some(([a,b]) => (a===yp.chi && b===tchi) || (b===yp.chi && a===tchi))) {
      const isNhatXung = idx === 2;
      const delta = isNhatXung ? -1.2 : -0.8;
      score += delta;
      factors.push({ type:'xung', text:`Năm xung ${truTens[idx]} ${tchi}${isNhatXung?' (xung Nhật Chi)':''}`, delta });
    }
    if (LUC_HOP.some(h => h.chis.includes(yp.chi) && h.chis.includes(tchi) && yp.chi !== tchi)) {
      const hopHanh = LUC_HOP.find(h => h.chis.includes(yp.chi) && h.chis.includes(tchi)).hanh;
      let delta = 0.2;
      if (hopHanh === dungThan.primary) delta = 1.0;
      else if (hopHanh === kyThan)      delta = -1.0;
      score += delta;
      factors.push({ type:'lục hợp', text:`Chi năm ${yp.chi} hợp ${truTens[idx]} ${tchi} → ${hopHanh}`, delta });
    }
    if (TAM_HINH.some(th => th.chis.includes(yp.chi) && th.chis.includes(tchi) && yp.chi !== tchi)) {
      score -= 0.4;
      factors.push({ type:'hình', text:`Năm hình ${truTens[idx]} ${tchi}`, delta: -0.4 });
    }
  });

  // 3) Tam hợp năm xem với 2 chi tứ trụ
  TAM_HOP.forEach(th => {
    if (!th.chis.includes(yp.chi)) return;
    const matchInTru = th.chis.filter(c => c !== yp.chi && truChis.includes(c));
    if (matchInTru.length >= 2) {
      let delta = 0.6;
      if (th.hanh === dungThan.primary) delta = 1.5;
      else if (th.hanh === kyThan)       delta = -1.5;
      score += delta;
      factors.push({ type:'tam hợp', text:`Chi năm tam hợp ${matchInTru.join(',')} → ${th.hanh}`, delta });
    }
  });

  // 4) Can hợp với can nhật/tháng/giờ
  truCans.forEach((tcan, idx) => {
    if (idx === 0) return;
    const k1 = `${yp.can}-${tcan}`, k2 = `${tcan}-${yp.can}`;
    const hoa = THIEN_CAN_HOP[k1] || THIEN_CAN_HOP[k2];
    if (hoa) {
      const isNhat = idx === 2;
      let delta = isNhat ? 0.3 : 0.2;
      if (hoa === dungThan.primary) delta = isNhat ? 1.0 : 0.5;
      else if (hoa === kyThan)       delta = isNhat ? -1.0 : -0.5;
      score += delta;
      factors.push({ type:'can hợp', text:`Can năm ${yp.can} hợp ${truTens[idx]} ${tcan} → ${hoa}${isNhat?' (hợp Nhật Can)':''}`, delta });
    }
  });

  // 5) Asymmetric theo vượng/nhược (cùng pattern đại vận, weight nhẹ hơn)
  if (isVuong) {
    if (TT_QUANSAT.includes(ttCan) || TT_THUCTHUONG.includes(ttCan)) {
      score += 0.6; factors.push({ type:'thập thần năm', text:`${ttCan} chế/tiết Nhật Can vượng — thuận`, delta: 0.6 });
    } else if (TT_AN.includes(ttCan) || TT_TYKIEP.includes(ttCan)) {
      score -= 0.7; factors.push({ type:'thập thần năm', text:`${ttCan} thêm khí cho Nhật Can vượng — nghịch`, delta: -0.7 });
    }
  } else if (isNhuoc) {
    if (TT_AN.includes(ttCan) || TT_TYKIEP.includes(ttCan)) {
      score += 0.7; factors.push({ type:'thập thần năm', text:`${ttCan} sinh phù Nhật Can nhược — thuận`, delta: 0.7 });
    } else if (TT_QUANSAT.includes(ttCan)) {
      score -= 1.0; factors.push({ type:'thập thần năm', text:`${ttCan} khắc Nhật Can nhược — nguy`, delta: -1.0 });
    } else if (['Chính Tài','Thiên Tài'].includes(ttCan)) {
      score -= 0.5; factors.push({ type:'thập thần năm', text:`${ttCan} hao Nhật Can vốn nhược`, delta: -0.5 });
    } else if (TT_THUCTHUONG.includes(ttCan)) {
      score -= 0.4; factors.push({ type:'thập thần năm', text:`${ttCan} tiết khí Nhật Can nhược`, delta: -0.4 });
    }
  }

  // 6) Tương tác với đại vận hiện tại (chunk 234: lưu niên + đại vận hợp lại để dự đoán)
  if (dvHienTai) {
    // Năm xem chi xung đại vận chi
    if (LUC_XUNG.some(([a,b]) => (a===yp.chi && b===dvHienTai.chi) || (b===yp.chi && a===dvHienTai.chi))) {
      score -= 0.8; factors.push({ type:'tuế-vận', text:`Năm xem xung Đại Vận hiện tại ${dvHienTai.chi} — biến động`, delta: -0.8 });
    }
    // Năm xem hợp với đại vận
    if (LUC_HOP.some(h => h.chis.includes(yp.chi) && h.chis.includes(dvHienTai.chi))) {
      score += 0.5; factors.push({ type:'tuế-vận', text:`Năm xem hợp Đại Vận hiện tại ${dvHienTai.chi}`, delta: 0.5 });
    }
    // Đại vận đẹp + năm đẹp = nhân đôi; đại vận xấu + năm xấu = đáy
    if (dvHienTai.label === 'thuận' && score > 5) {
      score += 0.3; factors.push({ type:'tuế-vận', text:`Đại vận thuận + năm thuận → nhân đôi may mắn`, delta: 0.3 });
    } else if (dvHienTai.label === 'nghịch' && score < 5) {
      score -= 0.3; factors.push({ type:'tuế-vận', text:`Đại vận nghịch + năm nghịch → giai đoạn khó`, delta: -0.3 });
    }
  }

  // ─── Clamp & label ───
  score = Math.max(0, Math.min(10, score));
  const scoreRounded = Math.round(score * 10) / 10;
  let label;
  if (scoreRounded >= 6.5)      label = 'thuận';
  else if (scoreRounded >= 4.0) label = 'trung';
  else                          label = 'nghịch';

  return {
    nam: namXem,
    can: yp.can,
    chi: yp.chi,
    napAm: _napAm(yp.can, yp.chi),
    thapThanCan: ttCan,
    thapThanChi: ttChi,
    hanhCan, hanhChi,
    relations,
    score: scoreRounded,
    label,
    factors,
  };
}

// ============================================================
// HỢP / XUNG / HẠI / HÌNH TRONG TỨ TRỤ
// ============================================================
function _tinhHinhXungHaiHop(tuTru) {
  const result = {
    tamHop: [], lucHop: [], lucXung: [], lucHai: [], tamHinh: [], tuHinh: [],
    canHop: [], canKhac: [],
  };
  const chis = tuTru.map(t => t.chi);
  const cans = tuTru.map(t => t.can);
  const tens = tuTru.map(t => t.ten);

  // Tam hợp
  TAM_HOP.forEach(th => {
    const matched = th.chis.filter(c => chis.includes(c));
    if (matched.length >= 2) {
      result.tamHop.push({
        chis: matched,
        full: matched.length === 3,
        hanh: th.hanh,
        positions: matched.map(c => tens[chis.indexOf(c)]),
      });
    }
  });

  // Lục hợp (cặp)
  LUC_HOP.forEach(lh => {
    const [a, b] = lh.chis;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if ((chis[i] === a && chis[j] === b) || (chis[i] === b && chis[j] === a)) {
          result.lucHop.push({
            cungA: tens[i], chiA: chis[i],
            cungB: tens[j], chiB: chis[j],
            hanh: lh.hanh,
          });
        }
      }
    }
  });

  // Lục xung
  LUC_XUNG.forEach(([a, b]) => {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if ((chis[i] === a && chis[j] === b) || (chis[i] === b && chis[j] === a)) {
          result.lucXung.push({
            cungA: tens[i], chiA: chis[i],
            cungB: tens[j], chiB: chis[j],
          });
        }
      }
    }
  });

  // Lục hại
  LUC_HAI.forEach(([a, b]) => {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if ((chis[i] === a && chis[j] === b) || (chis[i] === b && chis[j] === a)) {
          result.lucHai.push({
            cungA: tens[i], chiA: chis[i],
            cungB: tens[j], chiB: chis[j],
          });
        }
      }
    }
  });

  // Tam hình
  TAM_HINH.forEach(th => {
    const matched = th.chis.filter(c => chis.includes(c));
    if (matched.length >= 2) {
      result.tamHinh.push({
        chis: matched,
        type: th.type,
        full: matched.length === th.chis.length,
      });
    }
  });

  // Tự hình
  TU_HINH.forEach(c => {
    const count = chis.filter(x => x === c).length;
    if (count >= 2) {
      result.tuHinh.push({ chi: c, count });
    }
  });

  // Thiên can hợp
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const k = `${cans[i]}-${cans[j]}`;
      if (THIEN_CAN_HOP[k]) {
        result.canHop.push({
          cungA: tens[i], canA: cans[i],
          cungB: tens[j], canB: cans[j],
          hanh: THIEN_CAN_HOP[k],
        });
      }
    }
  }

  // Thiên can khắc
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const ha = NGU_HANH_CAN_TB[cans[i]];
      const hb = NGU_HANH_CAN_TB[cans[j]];
      if (NGU_HANH_KHAC_TB[ha] === hb || NGU_HANH_KHAC_TB[hb] === ha) {
        result.canKhac.push({
          cungA: tens[i], canA: cans[i],
          cungB: tens[j], canB: cans[j],
        });
      }
    }
  }

  return result;
}

// ============================================================
// THẦN SÁT
// ============================================================
// Mỗi entry trong dict thần sát: function (nhatCan, nhatChi, namChi, tuTru) → array of expected chi
// Engine kiểm tra xem chi đó có trong tứ trụ không.

const THAN_SAT_RULES = {
  // Thiên Ất Quý Nhân — theo Nhật Can
  'Thiên Ất Quý Nhân': {
    by: 'nhật-can',
    map: {
      'Giáp':['Sửu','Mùi'],'Mậu':['Sửu','Mùi'],'Canh':['Sửu','Mùi'],
      'Ất':['Tý','Thân'],'Kỷ':['Tý','Thân'],
      'Bính':['Hợi','Dậu'],'Đinh':['Hợi','Dậu'],
      'Tân':['Dần','Ngọ'],
      'Nhâm':['Mão','Tỵ'],'Quý':['Mão','Tỵ'],
    },
  },
  // Thiên Đức Quý Nhân — theo nguyệt chi (đơn giản hóa)
  'Thiên Đức Quý Nhân': {
    by: 'nguyệt-chi',
    map: {
      'Dần':['Đinh'],'Mão':['Thân'],'Thìn':['Nhâm'],'Tỵ':['Tân'],
      'Ngọ':['Hợi'],'Mùi':['Giáp'],'Thân':['Quý'],'Dậu':['Dần'],
      'Tuất':['Bính'],'Hợi':['Ất'],'Tý':['Tỵ'],'Sửu':['Canh'],
    },
    target: 'mixed', // có thể là can hoặc chi
  },
  // Nguyệt Đức Quý Nhân — theo nguyệt chi
  'Nguyệt Đức Quý Nhân': {
    by: 'nguyệt-chi',
    map: {
      'Dần':['Bính'],'Ngọ':['Bính'],'Tuất':['Bính'],
      'Thân':['Nhâm'],'Tý':['Nhâm'],'Thìn':['Nhâm'],
      'Tỵ':['Canh'],'Dậu':['Canh'],'Sửu':['Canh'],
      'Hợi':['Giáp'],'Mão':['Giáp'],'Mùi':['Giáp'],
    },
    target: 'can',
  },
  // Văn Xương Quý Nhân — theo Nhật Can (sao học vấn)
  'Văn Xương': {
    by: 'nhật-can',
    map: {
      'Giáp':['Tỵ'],'Ất':['Ngọ'],'Bính':['Thân'],'Mậu':['Thân'],
      'Đinh':['Dậu'],'Kỷ':['Dậu'],'Canh':['Hợi'],'Tân':['Tý'],
      'Nhâm':['Dần'],'Quý':['Mão'],
    },
  },
  // Học Đường — theo Nhật Can (tương tự Văn Xương nhưng formula khác)
  'Học Đường': {
    by: 'nhật-can',
    map: {
      'Giáp':['Hợi'],'Ất':['Ngọ'],'Bính':['Dần'],'Đinh':['Dậu'],
      'Mậu':['Dần'],'Kỷ':['Dậu'],'Canh':['Tỵ'],'Tân':['Tý'],
      'Nhâm':['Thân'],'Quý':['Mão'],
    },
  },
  // Đào Hoa — theo niên chi or nhật chi (tam hợp cục → đào hoa)
  // Thân Tý Thìn → Dậu; Tỵ Dậu Sửu → Ngọ; Dần Ngọ Tuất → Mão; Hợi Mão Mùi → Tý
  'Đào Hoa': {
    by: 'niên-chi', // phái Đài Loan dùng nhật chi; Việt Nam thường dùng niên
    map: {
      'Thân':['Dậu'],'Tý':['Dậu'],'Thìn':['Dậu'],
      'Tỵ':['Ngọ'],'Dậu':['Ngọ'],'Sửu':['Ngọ'],
      'Dần':['Mão'],'Ngọ':['Mão'],'Tuất':['Mão'],
      'Hợi':['Tý'],'Mão':['Tý'],'Mùi':['Tý'],
    },
  },
  // Dịch Mã — theo niên chi (tam hợp cục → dịch mã)
  // Thân Tý Thìn → Dần; Tỵ Dậu Sửu → Hợi; Dần Ngọ Tuất → Thân; Hợi Mão Mùi → Tỵ
  'Dịch Mã': {
    by: 'niên-chi',
    map: {
      'Thân':['Dần'],'Tý':['Dần'],'Thìn':['Dần'],
      'Tỵ':['Hợi'],'Dậu':['Hợi'],'Sửu':['Hợi'],
      'Dần':['Thân'],'Ngọ':['Thân'],'Tuất':['Thân'],
      'Hợi':['Tỵ'],'Mão':['Tỵ'],'Mùi':['Tỵ'],
    },
  },
  // Hồng Diễm — theo Nhật Can (sao đào hoa, ngoại tình)
  // Nguồn: Tử Bình Chân Thuyên + Trích Thiên Tủy. Có nhiều biến thể, tao chọn 1 phổ biến VN.
  'Hồng Diễm': {
    by: 'nhật-can',
    map: {
      'Giáp':['Ngọ'],'Ất':['Ngọ'],'Bính':['Dần'],'Đinh':['Mùi'],
      'Mậu':['Thìn'],'Kỷ':['Thìn'],'Canh':['Tuất'],'Tân':['Dậu'],
      'Nhâm':['Tý'],'Quý':['Thân'],
    },
  },
  // Dương Nhẫn (Kình Dương) — theo Nhật Can (chi sau lộc 1 cung)
  // Giáp lộc Dần → nhẫn Mão; Ất lộc Mão → nhẫn Thìn (phái Đài Loan); v.v.
  // Phái Việt Nam thường chỉ áp dụng cho dương can.
  'Dương Nhẫn': {
    by: 'nhật-can',
    map: {
      'Giáp':['Mão'],'Bính':['Ngọ'],'Mậu':['Ngọ'],'Canh':['Dậu'],'Nhâm':['Tý'],
      // Âm can (Ất, Đinh, Kỷ, Tân, Quý): không có Dương Nhẫn theo phái cổ
    },
  },
  // Cô Thần — theo Niên Chi (theo tam hợp tứ chi, Cô Thần là chi sau)
  // Hợi Tý Sửu → Cô Dần; Dần Mão Thìn → Cô Tỵ; Tỵ Ngọ Mùi → Cô Thân; Thân Dậu Tuất → Cô Hợi
  'Cô Thần': {
    by: 'niên-chi',
    map: {
      'Hợi':['Dần'],'Tý':['Dần'],'Sửu':['Dần'],
      'Dần':['Tỵ'],'Mão':['Tỵ'],'Thìn':['Tỵ'],
      'Tỵ':['Thân'],'Ngọ':['Thân'],'Mùi':['Thân'],
      'Thân':['Hợi'],'Dậu':['Hợi'],'Tuất':['Hợi'],
    },
  },
  // Quả Tú — theo Niên Chi (Quả Tú là chi trước)
  // Hợi Tý Sửu → Quả Tuất; Dần Mão Thìn → Quả Sửu; Tỵ Ngọ Mùi → Quả Thìn; Thân Dậu Tuất → Quả Mùi
  'Quả Tú': {
    by: 'niên-chi',
    map: {
      'Hợi':['Tuất'],'Tý':['Tuất'],'Sửu':['Tuất'],
      'Dần':['Sửu'],'Mão':['Sửu'],'Thìn':['Sửu'],
      'Tỵ':['Thìn'],'Ngọ':['Thìn'],'Mùi':['Thìn'],
      'Thân':['Mùi'],'Dậu':['Mùi'],'Tuất':['Mùi'],
    },
  },
};

function _tinhThanSat(tuTru, nhatCan) {
  const chis = tuTru.map(t => t.chi);
  const cans = tuTru.map(t => t.can);
  const tens = tuTru.map(t => t.ten);
  const namChi = tuTru[0].chi;
  const monthChi = tuTru[1].chi;
  const nhatChi = tuTru[2].chi;

  const result = {};
  for (const [name, rule] of Object.entries(THAN_SAT_RULES)) {
    let expected;
    if (rule.by === 'nhật-can') expected = rule.map[nhatCan] || [];
    else if (rule.by === 'niên-chi') expected = rule.map[namChi] || [];
    else if (rule.by === 'nhật-chi') expected = rule.map[nhatChi] || [];
    else if (rule.by === 'nguyệt-chi') expected = rule.map[monthChi] || [];
    else expected = [];

    const found = [];
    expected.forEach(target => {
      // Check trong cans hay chis tùy target type (mặc định chi nếu không thấy)
      // Đa số thần sát tìm trong địa chi; Thiên/Nguyệt Đức tìm trong thiên can
      const positionsCan = cans.map((c, i) => c === target ? tens[i] : null).filter(Boolean);
      const positionsChi = chis.map((c, i) => c === target ? tens[i] : null).filter(Boolean);
      if (positionsCan.length > 0) found.push({ at: target, type: 'can', positions: positionsCan });
      if (positionsChi.length > 0) found.push({ at: target, type: 'chi', positions: positionsChi });
    });

    result[name] = {
      found: found.length > 0,
      expected,
      details: found,
    };
  }

  // Không Vong (Tuần) — theo Nhật trụ (tuần lục giáp của ngày sinh)
  // Lục giáp: Giáp Tý → không Tuất Hợi; Giáp Tuất → không Thân Dậu; Giáp Thân → không Ngọ Mùi;
  // Giáp Ngọ → không Thìn Tỵ; Giáp Thìn → không Dần Mão; Giáp Dần → không Tý Sửu.
  const dayCanIdx = _canIdx(tuTru[2].can);
  const dayChiIdx = _chiIdx(tuTru[2].chi);
  // Tìm Giáp đầu tuần: lùi từ ngày trụ về cho đến canIdx = 0 (Giáp)
  // Trong 60 hoa giáp: position = (chiIdx - canIdx + 12) % 12 gives chi offset
  // Tuần Giáp Tý (positions 0-9), Giáp Tuất (10-19), Giáp Thân (20-29), Giáp Ngọ (30-39), Giáp Thìn (40-49), Giáp Dần (50-59)
  const dayPos60 = ((dayCanIdx - dayChiIdx + 60) % 60 === 0) ? dayCanIdx :
                    // Find position in 60 cycle: find the unique k where (k % 10 === canIdx) && (k % 12 === chiIdx)
                    (() => {
                      for (let k = 0; k < 60; k++) {
                        if (k % 10 === dayCanIdx && k % 12 === dayChiIdx) return k;
                      }
                      return -1;
                    })();
  const tuanStart = Math.floor(dayPos60 / 10) * 10;
  // Không Vong = chi tại positions tuanStart+10 và tuanStart+11 (mod 12)
  const khongVongChis = [
    DIA_CHI_TB[(tuanStart + 10) % 12],
    DIA_CHI_TB[(tuanStart + 11) % 12],
  ];
  const khongVongFound = [];
  chis.forEach((c, i) => {
    if (khongVongChis.includes(c)) {
      khongVongFound.push({ at: c, positions: [tens[i]] });
    }
  });
  result['Không Vong'] = {
    found: khongVongFound.length > 0,
    expected: khongVongChis,
    details: khongVongFound,
    note: `Nhật trụ ${tuTru[2].can} ${tuTru[2].chi} thuộc tuần Giáp ${DIA_CHI_TB[tuanStart % 12]} → Không Vong tại ${khongVongChis.join(', ')}`,
  };

  return result;
}

// ============================================================
// MAIN ENTRY 2: tinhBatTu
// ============================================================
// Input: { ngayDL, thangDL, namDL, gio (0-23), gioitinh ('nam'|'nu'), namXem }
// Output: full Tử Bình analysis object
function tinhBatTu({ ngayDL, thangDL, namDL, gio = 12, gioitinh = 'nam', namXem }) {
  const namXemFinal = namXem || new Date().getFullYear();

  // Step 1: Convert sang Bát Tự
  const conv = convertDuongToBatTu(ngayDL, thangDL, namDL, gio);
  const tuTru = conv.tuTru;
  const nhatCan = tuTru[2].can;
  const nhatChi = tuTru[2].chi;

  // Step 2: Thập thần cho mỗi can (so với nhật can)
  const thapThanData = {};
  ['Năm','Tháng','Ngày','Giờ'].forEach((tenTru, i) => {
    const tru = tuTru[i];
    thapThanData[tenTru] = {
      thienCan: i === 2 ? '—' : thapThan(nhatCan, tru.can),
      tangCan: {},
    };
    (tru.tangCan || []).forEach(tc => {
      thapThanData[tenTru].tangCan[tc.can] = (i === 2 && tc.can === nhatCan)
        ? '—'
        : thapThan(nhatCan, tc.can);
    });
  });

  // Step 3: Cường nhược nhật can
  const cuongNhuoc = _tinhCuongNhuoc(tuTru, nhatCan);

  // Step 4: Ngũ hành balance
  const nguHanh = _tinhNguHanhBalance(tuTru);

  // Step 5: Dụng thần
  const dungThan = _chonDungThan(cuongNhuoc, nhatCan, tuTru, nguHanh);

  // Step 6: Cách cục
  const cachCuc = _xacDinhCachCuc(tuTru, nhatCan, dungThan);

  // Step 7: Đại vận (cần cuongNhuoc + cachCuc cho asymmetric reading + interaction)
  const dvData = _tinhDaiVan(tuTru, nhatCan, gioitinh, conv.jdn, dungThan, namDL, cuongNhuoc, cachCuc);

  // Step 8: Đại vận hiện tại + kế tiếp
  const tuoiXem = namXemFinal - namDL + 1; // Vietnamese age (tuổi mụ)
  let dvHienTai = null, dvKeTiep = null;
  for (let i = 0; i < dvData.daiVans.length; i++) {
    const dv = dvData.daiVans[i];
    if (tuoiXem >= dv.tuoiStart && tuoiXem <= dv.tuoiEnd) {
      dvHienTai = dv;
      dvKeTiep = dvData.daiVans[i + 1] || null;
      break;
    }
  }
  // Nếu chưa vào đại vận đầu (tuổi nhỏ hơn khởi vận)
  if (!dvHienTai && tuoiXem < dvData.tuoiKhoiVan) {
    dvKeTiep = dvData.daiVans[0];
  }

  // Step 9: Lưu niên (cần cuongNhuoc, cachCuc, đại vận hiện tại)
  const luuNien = _tinhLuuNien(namXemFinal, nhatCan, tuTru, dungThan, cuongNhuoc, cachCuc, dvHienTai);

  // Step 10: Hợp/Xung/Hại/Hình
  const hinhXungHaiHop = _tinhHinhXungHaiHop(tuTru);

  // Step 11: Thần Sát
  const thanSat = _tinhThanSat(tuTru, nhatCan);

  return {
    // Input
    input: { ngayDL, thangDL, namDL, gio, gioitinh, namXem: namXemFinal },

    // 4 trụ
    tuTru,
    nhatCan,
    nhatChi,
    nhatCanHanh: NGU_HANH_CAN_TB[nhatCan],
    nhatCanAmDuong: amDuongCan(nhatCan),

    // Thập thần
    thapThan: thapThanData,

    // Cường nhược
    cuongNhuoc,

    // Ngũ hành balance
    nguHanh,

    // Dụng thần
    dungThan,

    // Cách cục
    cachCuc,

    // Đại vận
    daiVans: dvData.daiVans,
    tuoiKhoiVan: dvData.tuoiKhoiVan,
    daiVanThuan: dvData.isThuan,
    daiVanHienTai: dvHienTai,
    daiVanKeTiep: dvKeTiep,

    // Lưu niên
    luuNien,

    // Hợp/Xung/Hại/Hình
    hinhXungHaiHop,

    // Thần Sát
    thanSat,

    // Metadata
    canChiNamSinh: conv.canChiNamSinh,
    solarYearAdjusted: conv.solarYearAdjusted, // true nếu sinh trước Lập Xuân
    gioChi: conv.gioChi,
    tuoiXem,
    truongPhai: 'Tử Bình Chân Thuyên + Trích Thiên Tủy',
    engineVersion: '1.0',
  };
}

// ============================================================
// BACKTEST API: tinhBatTuFromTuTru
// Bypass dương → âm conversion. Caller provides tứ trụ trực tiếp.
// Used for backtest harness against historical case studies.
// ============================================================
function tinhBatTuFromTuTru({ tuTru: tuTruInput, gioitinh = 'nam', namSinhDL = 1950, namXem }) {
  if (!tuTruInput || tuTruInput.length !== 4) {
    throw new Error('tuTru must be array of 4 {can, chi}');
  }

  // Synthesize full tuTru with tangCan + ten
  const TEN_TRU = ['Năm', 'Tháng', 'Ngày', 'Giờ'];
  const tuTru = tuTruInput.map((t, i) => ({
    ten: TEN_TRU[i],
    can: t.can,
    chi: t.chi,
    napAm: _napAm(t.can, t.chi),
    tangCan: TANG_CAN[t.chi] || [],
  }));
  const nhatCan = tuTru[2].can;
  const nhatChi = tuTru[2].chi;
  const namXemFinal = namXem || new Date().getFullYear();

  // Synthesize a JDN for đại vận khởi vận age. Without exact dương lịch,
  // we use Jan 1 of namSinhDL as a proxy. This affects tuoiKhoiVan by ±5 years
  // but does NOT affect đại vận sequence (which depends only on tháng pillar).
  const jdnRaw = _jdFromDate_TB(1, 1, namSinhDL);

  // Step 2: Thập thần
  const thapThanData = {};
  TEN_TRU.forEach((tenTru, i) => {
    const tru = tuTru[i];
    thapThanData[tenTru] = {
      thienCan: i === 2 ? '—' : thapThan(nhatCan, tru.can),
      tangCan: {},
    };
    (tru.tangCan || []).forEach(tc => {
      thapThanData[tenTru].tangCan[tc.can] = (i === 2 && tc.can === nhatCan)
        ? '—'
        : thapThan(nhatCan, tc.can);
    });
  });

  // Step 3-6: Cường nhược, ngũ hành, dụng thần, cách cục
  const cuongNhuoc = _tinhCuongNhuoc(tuTru, nhatCan);
  const nguHanh = _tinhNguHanhBalance(tuTru);
  const dungThan = _chonDungThan(cuongNhuoc, nhatCan, tuTru, nguHanh);
  const cachCuc = _xacDinhCachCuc(tuTru, nhatCan, dungThan);

  // Step 7: Đại vận
  const dvData = _tinhDaiVan(tuTru, nhatCan, gioitinh, jdnRaw, dungThan, namSinhDL, cuongNhuoc, cachCuc);

  // Step 8: Đại vận hiện tại
  const tuoiXem = namXemFinal - namSinhDL + 1;
  let dvHienTai = null, dvKeTiep = null;
  for (let i = 0; i < dvData.daiVans.length; i++) {
    const dv = dvData.daiVans[i];
    if (tuoiXem >= dv.tuoiStart && tuoiXem <= dv.tuoiEnd) {
      dvHienTai = dv;
      dvKeTiep = dvData.daiVans[i + 1] || null;
      break;
    }
  }

  // Step 9-11: Lưu niên, hợp/xung, thần sát
  const luuNien = _tinhLuuNien(namXemFinal, nhatCan, tuTru, dungThan, cuongNhuoc, cachCuc, dvHienTai);
  const hinhXungHaiHop = _tinhHinhXungHaiHop(tuTru);
  const thanSat = _tinhThanSat(tuTru, nhatCan);

  return {
    input: { tuTru: tuTruInput, gioitinh, namSinhDL, namXem: namXemFinal, _bypass: true },
    tuTru,
    nhatCan,
    nhatChi,
    nhatCanHanh: NGU_HANH_CAN_TB[nhatCan],
    nhatCanAmDuong: amDuongCan(nhatCan),
    thapThan: thapThanData,
    cuongNhuoc,
    nguHanh,
    dungThan,
    cachCuc,
    daiVans: dvData.daiVans,
    tuoiKhoiVan: dvData.tuoiKhoiVan,
    daiVanThuan: dvData.isThuan,
    daiVanHienTai: dvHienTai,
    daiVanKeTiep: dvKeTiep,
    luuNien,
    hinhXungHaiHop,
    thanSat,
    canChiNamSinh: { can: tuTru[0].can, chi: tuTru[0].chi },
    solarYearAdjusted: false,
    gioChi: tuTru[3].chi,
    tuoiXem,
    truongPhai: 'Tử Bình Chân Thuyên + Trích Thiên Tủy',
    engineVersion: '1.0-bypass',
  };
}

// ============================================================
// EXPORTS
// ============================================================
if (typeof module !== 'undefined') {
  module.exports = {
    convertDuongToBatTu,
    tinhBatTu,
    tinhBatTuFromTuTru,
    thapThan,
    nhomThapThan,
    amDuongCan,
    amDuongChi,
    // Constants for downstream use
    THIEN_CAN_TB,
    DIA_CHI_TB,
    NGU_HANH_CAN_TB,
    NGU_HANH_CHI_TB,
    NGU_HANH_SINH_TB,
    NGU_HANH_KHAC_TB,
    TANG_CAN,
    NAP_AM_TB,
    THIEN_CAN_HOP,
    TAM_HOP,
    LUC_HOP,
    LUC_XUNG,
    LUC_HAI,
    TAM_HINH,
    THAN_SAT_RULES,
  };
}
