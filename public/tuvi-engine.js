// ============================================================
// TỬ VI ENGINE v1.0
// Rule-based engine for Tử Vi Đẩu Số analysis
// ============================================================

// ────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ────────────────────────────────────────────────────────────

const TAM_HOP_MAP = {
  'Thân': 'Thủy', 'Tý': 'Thủy', 'Thìn': 'Thủy',
  'Hợi': 'Mộc',  'Mão': 'Mộc',  'Mùi': 'Mộc',
  'Dần': 'Hỏa',  'Ngọ': 'Hỏa',  'Tuất': 'Hỏa',
  'Tỵ':  'Kim',  'Dậu': 'Kim',  'Sửu': 'Kim',
};

// Ngũ hành của địa chi (hành cung — dùng cho Địa Lợi)
const DIA_CHI_HANH = {
  'Tý': 'Thủy', 'Hợi': 'Thủy',
  'Dần': 'Mộc',  'Mão': 'Mộc',
  'Tỵ':  'Hỏa',  'Ngọ': 'Hỏa',
  'Thìn': 'Thổ', 'Tuất': 'Thổ', 'Sửu': 'Thổ', 'Mùi': 'Thổ',
  'Thân': 'Kim',  'Dậu': 'Kim',
};

// Bảng Nạp Âm — mệnh hành theo can chi năm sinh
const NAP_AM = {
  'Kim': [
    'Giáp Tý','Ất Sửu','Giáp Ngọ','Ất Mùi',
    'Nhâm Thân','Quý Dậu','Nhâm Dần','Quý Mão',
    'Canh Thìn','Tân Tỵ','Canh Tuất','Tân Hợi',
  ],
  'Mộc': [
    'Mậu Thìn','Kỷ Tỵ','Mậu Tuất','Kỷ Hợi',
    'Nhâm Ngọ','Quý Mùi','Nhâm Tý','Quý Sửu',
    'Canh Dần','Tân Mão','Canh Thân','Tân Dậu',
  ],
  'Thủy': [
    'Bính Tý','Đinh Sửu','Bính Ngọ','Đinh Mùi',
    'Giáp Thân','Ất Dậu','Giáp Dần','Ất Mão',
    'Nhâm Thìn','Quý Tỵ','Nhâm Tuất','Quý Hợi',
  ],
  'Hỏa': [
    'Bính Dần','Đinh Mão','Bính Thân','Đinh Dậu',
    'Giáp Tuất','Ất Hợi','Giáp Thìn','Ất Tỵ',
    'Mậu Ngọ','Kỷ Mùi','Mậu Tý','Kỷ Sửu',
  ],
  'Thổ': [
    'Canh Ngọ','Tân Mùi','Canh Tý','Tân Sửu',
    'Mậu Dần','Kỷ Mão','Mậu Thân','Kỷ Dậu',
    'Bính Tuất','Đinh Hợi','Bính Thìn','Đinh Tỵ',
  ],
};

// Ngũ hành sinh khắc
const NGU_HANH_SINH = {
  'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim',
  'Kim': 'Thủy', 'Thủy': 'Mộc',
};
const NGU_HANH_KHAC = {
  'Kim': 'Mộc', 'Mộc': 'Thổ', 'Thổ': 'Thủy',
  'Thủy': 'Hỏa', 'Hỏa': 'Kim',
};

// Bộ chính tinh cho Nhân Hòa
const BO_SAO = {
  'Sát_Phá_Tham_Liêm': ['Thất Sát', 'Phá Quân', 'Tham Lang', 'Liêm Trinh'],
  'Tử_Phủ_Vũ_Tướng':  ['Tử Vi', 'Thiên Phủ', 'Vũ Khúc', 'Thiên Tướng'],
  'Cự_Nhật':           ['Cự Môn', 'Thái Dương'],
  'Cơ_Nguyệt_Đồng_Lương': ['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương'],
};

// Tam phương tứ chính mapping (index 0-11, bắt đầu từ Dần)
// Thứ tự: Dần(0) Mão(1) Thìn(2) Tỵ(3) Ngọ(4) Mùi(5)
//         Thân(6) Dậu(7) Tuất(8) Hợi(9) Tý(10) Sửu(11)
const DIA_CHI_ORDER = ['Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi','Tý','Sửu'];

const TAM_HOP_GROUPS = [
  ['Dần','Ngọ','Tuất'],
  ['Thân','Tý','Thìn'],
  ['Hợi','Mão','Mùi'],
  ['Tỵ','Dậu','Sửu'],
];

// 14 Chính tinh + 6 Sát tinh
const CHINH_TINH = [
  'Tử Vi','Thiên Cơ','Thái Dương','Vũ Khúc','Thiên Đồng',
  'Liêm Trinh','Thiên Phủ','Thái Âm','Tham Lang','Cự Môn',
  'Thiên Tướng','Thiên Lương','Thất Sát','Phá Quân',
];
const SAT_TINH = ['Kình Dương','Đà La','Hỏa Tinh','Linh Tinh','Địa Không','Địa Kiếp'];
const CHINH_VA_SAT = [...CHINH_TINH, ...SAT_TINH];

// ────────────────────────────────────────────────────────────
// 2. HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────

/**
 * Lấy tất cả sao từ 1 palace object (iztro format)
 */
function getAllStars(palace) {
  if (!palace) return [];
  const stars = [];
  (palace.majorStars  || []).forEach(s => stars.push(s.name));
  (palace.minorStars  || []).forEach(s => stars.push(s.name));
  (palace.adjectiveStars || []).forEach(s => stars.push(s.name));
  return stars;
}

/**
 * Lấy hành của tam hợp chứa địa chi này
 */
function getTamHopHanh(diaChi) {
  return TAM_HOP_MAP[diaChi] || null;
}

/**
 * So sánh 2 hành theo quan hệ sinh khắc
 * Góc nhìn: hanhB tác động lên hanhA
 * Returns: { quan_he, score (thiên thời) }
 */
function soSanhHanh(hanhA, hanhB) {
  if (!hanhA || !hanhB) return { quan_he: 'unknown', score: 0 };
  if (hanhA === hanhB) return { quan_he: 'dong_hanh', score: 5 };
  if (NGU_HANH_SINH[hanhB] === hanhA) return { quan_he: 'sinh_nhap',  score: 4 }; // B sinh A
  if (NGU_HANH_SINH[hanhA] === hanhB) return { quan_he: 'sinh_xuat',  score: 1 }; // A sinh B (hao)
  if (NGU_HANH_KHAC[hanhA] === hanhB) return { quan_he: 'khac_xuat',  score: 2 }; // A khắc B
  if (NGU_HANH_KHAC[hanhB] === hanhA) return { quan_he: 'khac_nhap',  score: 0 }; // B khắc A
  return { quan_he: 'unknown', score: 0 };
}

/**
 * Tìm cung xung chiếu (đối diện, index + 6)
 */
function getCungXungChieu(palaces, targetDiaChi) {
  const idx = DIA_CHI_ORDER.indexOf(targetDiaChi);
  if (idx === -1) return null;
  const xungIdx = (idx + 6) % 12;
  const xungDiaChi = DIA_CHI_ORDER[xungIdx];
  return palaces.find(p => p.earthlyBranch === xungDiaChi) || null;
}

/**
 * Lấy tam phương tứ chính của 1 cung
 * Returns: { main, tamHop1, tamHop2, xungChieu }
 */
function getTamPhuongTuChinh(palaces, diaChi) {
  const mainPalace = palaces.find(p => p.earthlyBranch === diaChi);
  if (!mainPalace) return null;

  // Tìm nhóm tam hợp
  const tamHopGroup = TAM_HOP_GROUPS.find(g => g.includes(diaChi));
  const tamHopPalaces = tamHopGroup
    ? tamHopGroup
        .filter(dc => dc !== diaChi)
        .map(dc => palaces.find(p => p.earthlyBranch === dc))
        .filter(Boolean)
    : [];

  const xungChieu = getCungXungChieu(palaces, diaChi);

  return {
    main: mainPalace,
    tamHop1: tamHopPalaces[0] || null,
    tamHop2: tamHopPalaces[1] || null,
    xungChieu,
    all: [mainPalace, ...tamHopPalaces, xungChieu].filter(Boolean),
  };
}

/**
 * Lấy 2 cung giáp (kề 2 bên)
 */
function getGiapCung(palaces, diaChi) {
  const idx = DIA_CHI_ORDER.indexOf(diaChi);
  if (idx === -1) return [];
  const left  = DIA_CHI_ORDER[(idx + 11) % 12];
  const right = DIA_CHI_ORDER[(idx + 1) % 12];
  return [
    palaces.find(p => p.earthlyBranch === left),
    palaces.find(p => p.earthlyBranch === right),
  ].filter(Boolean);
}

/**
 * Xác định bộ sao chính của cung (dựa vào chính tinh)
 */
function getBoChinh(stars) {
  for (const [boName, boStars] of Object.entries(BO_SAO)) {
    if (boStars.some(s => stars.includes(s))) return boName;
  }
  return null;
}

/**
 * Lấy hành bản mệnh theo Nạp Âm từ can chi năm sinh
 * VD: "Giáp Tý" → "Kim" (Hải Trung Kim)
 * chineseDate format: "Giáp Tý - ..." → lấy phần đầu
 */
function getMenhHanh(chineseDate) {
  if (!chineseDate) return null;
  // Lấy can chi năm sinh (phần đầu trước dấu -)
  const namSinh = (chineseDate.split(/[-–]/)[0] || '').trim();
  for (const [hanh, danhSach] of Object.entries(NAP_AM)) {
    if (danhSach.some(cc => namSinh.includes(cc) || cc.includes(namSinh))) {
      return hanh;
    }
  }
  return null;
}

/**
 * Lấy địa chi năm sinh từ chineseDate
 * VD: "Giáp Tý - ..." → "Tý"
 */
function getNamSinhDiaChi(chineseDate) {
  if (!chineseDate) return null;
  const parts = chineseDate.split(/[-–]/);
  const namSinh = parts[0].trim(); // VD: "Giáp Tý"
  const diaChiMatch = namSinh.match(/(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)/);
  return diaChiMatch ? diaChiMatch[1] : null;
}

// ────────────────────────────────────────────────────────────
// 3. CÁCH CỤC ENGINE
// ────────────────────────────────────────────────────────────

/**
 * Check 1 cách cục có active không
 */
function checkCachCuc(cachCuc, mainPalace, tamPhuong) {
  const { sao, phamVi, daoNguoc } = cachCuc;

  // Trường hợp đặc biệt: vô chính diệu
  if (daoNguoc) {
    const mainStars = (mainPalace.majorStars || []).map(s => s.name);
    return mainStars.length === 0;
  }

  if (!sao || sao.length === 0) return false;

  const mainStars = getAllStars(mainPalace);
  const allStars4Cung = tamPhuong.all.flatMap(getAllStars);

  if (phamVi === 'dong_cung') {
    return sao.every(s => mainStars.includes(s));
  }

  if (phamVi === 'tam_hop') {
    return sao.every(s => allStars4Cung.includes(s));
  }

  if (phamVi === 'xung_chieu') {
    const xungStars = getAllStars(tamPhuong.xungChieu);
    const boSao = [...mainStars, ...xungStars];
    return sao.every(s => boSao.includes(s));
  }

  if (phamVi === 'giap_cung') {
    // giáp cung: chỉ 2 cung kề, KHÔNG tính chính cung
    return sao.every(s =>
      getAllStars(tamPhuong.tamHop1).includes(s) ||
      getAllStars(tamPhuong.tamHop2).includes(s)
    );
  }

  return false;
}

/**
 * Tìm tất cả cách cục active cho 1 cung
 */
function findActiveCachCuc(cachCucDB, cungName, mainPalace, tamPhuong, options = {}) {
  const { minDoManh = 3, limit = 20 } = options;

  const allStars = getAllStars(mainPalace);
  const hasChinhTinhOrSat = allStars.some(s => CHINH_VA_SAT.includes(s));

  return cachCucDB
    .filter(cc => cc.cung === cungName)
    .filter(cc => cc.doManh >= minDoManh)
    .filter(cc => {
      if (cc.daoNguoc) return true;
      if (!cc.sao || cc.sao.length === 0) return false;
      // Cách cục 3 vòng (ten bắt đầu bằng VONG_) → cho qua luôn
      if (cc.ten && cc.ten.startsWith('VONG_')) return true;
      // Còn lại phải có chính tinh hoặc sát tinh
      return cc.sao.some(s => CHINH_VA_SAT.includes(s));
    })
    .filter(cc => checkCachCuc(cc, mainPalace, tamPhuong))
    .sort((a, b) => b.doManh - a.doManh)
    .slice(0, limit);
}

// ────────────────────────────────────────────────────────────
// 4. SCORING ENGINE — ĐẠI VẬN
// ────────────────────────────────────────────────────────────

/**
 * Tính Thiên Thời
 * So tam hợp cung đại vận vs tam hợp năm sinh
 */
function tinhThienThoi(daiVanDiaChi, namSinhDiaChi) {
  const hanhDaiVan = getTamHopHanh(daiVanDiaChi);
  const hanhNamSinh = getTamHopHanh(namSinhDiaChi);

  if (!hanhDaiVan || !hanhNamSinh) {
    return { score: 0, quan_he: 'unknown', hanhDaiVan, hanhNamSinh };
  }

  const result = soSanhHanh(hanhNamSinh, hanhDaiVan); // B(đại vận) tác động lên A(tuổi)
  return {
    score: result.score,
    quan_he: result.quan_he,
    hanhDaiVan,
    hanhNamSinh,
    moTa: getThienThoiMoTa(result.quan_he),
  };
}

function getThienThoiMoTa(quan_he) {
  const map = {
    dong_hanh:  'Đồng hành — Đắc Thiên Thời, vận tối',
    sinh_nhap:  'Sinh nhập — Được Thiên Thời hỗ trợ',
    khac_xuat:  'Khắc xuất — Thiên Thời kém, phải chật vật',
    sinh_xuat:  'Sinh xuất — Hao lực, tiêu tán sức lực tiền bạc',
    khac_nhap:  'Khắc nhập — Mất Thiên Thời, hoàn cảnh thắng minh',
  };
  return map[quan_he] || 'Không xác định';
}

/**
 * Tính Địa Lợi
 * So hành cung đại vận vs hành bản mệnh
 */
function tinhDiaLoi(daiVanDiaChi, menhHanh) {
  const hanhCung = DIA_CHI_HANH[daiVanDiaChi];

  if (!hanhCung || !menhHanh) {
    return { score: 0, quan_he: 'unknown', hanhCung, menhHanh };
  }

  let score, quan_he;
  if (hanhCung === menhHanh) {
    score = 1.5; quan_he = 'dong_hanh';
  } else if (NGU_HANH_SINH[hanhCung] === menhHanh) {
    score = 2; quan_he = 'cung_sinh_menh'; // cung sinh mệnh → tốt nhất
  } else if (NGU_HANH_SINH[menhHanh] === hanhCung) {
    score = 1; quan_he = 'menh_sinh_cung'; // mệnh sinh cung → hao lực
  } else if (NGU_HANH_KHAC[menhHanh] === hanhCung) {
    score = 0.5; quan_he = 'menh_khac_cung'; // mệnh khắc cung → vất vả nhưng thắng
  } else if (NGU_HANH_KHAC[hanhCung] === menhHanh) {
    score = 0; quan_he = 'cung_khac_menh'; // cung khắc mệnh → rất xấu
  } else {
    score = 0; quan_he = 'unknown';
  }

  return {
    score,
    quan_he,
    hanhCung,
    menhHanh,
    moTa: getDiaLoiMoTa(quan_he),
  };
}

function getDiaLoiMoTa(quan_he) {
  const map = {
    cung_sinh_menh: 'Cung sinh Mệnh — Đắc Địa Lợi, hoàn cảnh ủng hộ',
    dong_hanh:      'Đồng hành — Có Địa Lợi, ổn định',
    menh_sinh_cung: 'Mệnh sinh Cung — Hao lực, có được nhưng tốn sức',
    menh_khac_cung: 'Mệnh khắc Cung — Vất vả nhưng có thể thắng',
    cung_khac_menh: 'Cung khắc Mệnh — Mất Địa Lợi, hoàn cảnh chế ngự',
  };
  return map[quan_he] || 'Không xác định';
}

/**
 * Tính Nhân Hòa
 * So bộ chính tinh tam hợp cung Mệnh vs bộ chính tinh tam hợp cung đại vận
 */
function tinhNhanHoa(menhTamPhuong, daiVanTamPhuong) {
  const menhStars = menhTamPhuong.all.flatMap(getAllStars);
  const vanStars = daiVanTamPhuong.all.flatMap(getAllStars);

  const boCungMenh = getBoChinh(menhStars);
  const boCungVan  = getBoChinh(vanStars);

  let score, ket_qua;

  if (!boCungMenh || !boCungVan) {
    score = 1.5; ket_qua = 'khong_xac_dinh';
  } else if (boCungMenh === boCungVan) {
    score = 3; ket_qua = 'hop_tot';
  } else if (
    (boCungMenh === 'Tử_Phủ_Vũ_Tướng' || boCungVan === 'Tử_Phủ_Vũ_Tướng')
  ) {
    score = 2; ket_qua = 'buffer'; // Tử Phủ Vũ Tướng làm đệm
  } else if (
    (boCungMenh === 'Cơ_Nguyệt_Đồng_Lương' && boCungVan === 'Sát_Phá_Tham_Liêm') ||
    (boCungMenh === 'Sát_Phá_Tham_Liêm' && boCungVan === 'Cơ_Nguyệt_Đồng_Lương')
  ) {
    score = 1; ket_qua = 'nguy_hiem'; // Chênh lệch cực đoan
  } else {
    score = 1.5; ket_qua = 'trung_binh';
  }

  return {
    score,
    ket_qua,
    boCungMenh,
    boCungVan,
    moTa: getNhanHoaMoTa(ket_qua),
  };
}

function getNhanHoaMoTa(ket_qua) {
  const map = {
    hop_tot:        'Cùng bộ sao — Nhân Hòa tốt, thuận chiều',
    buffer:         'Tử Phủ Vũ Tướng làm đệm — Nhân Hòa trung bình',
    nguy_hiem:      'Chênh lệch cực đoan — Nhân Hòa xấu, dễ họa',
    trung_binh:     'Khác bộ nhưng không cực đoan — Nhân Hòa trung bình',
    khong_xac_dinh: 'Không xác định được bộ sao',
  };
  return map[ket_qua] || 'Không xác định';
}

/**
 * Tính tổng điểm đại vận
 */
function scoringDaiVan(thienThoi, diaLoi, nhanHoa) {
  let total = thienThoi.score + diaLoi.score + nhanHoa.score;

  // Hard rule: Nhân Hòa < 1.5 → tổng max 6
  if (nhanHoa.score < 1.5) {
    total = Math.min(total, 6);
  }

  const flag = total >= 7 ? '🟢' : total >= 4 ? '🟠' : '🔴';
  const ketLuan = total >= 7 ? 'Vận tốt' : total >= 4 ? 'Vận trung bình' : 'Vận khó khăn';

  // Hard rule: Nhân Hòa xấu → không kết luận tốt
  const finalKetLuan = (nhanHoa.ket_qua === 'nguy_hiem' && total >= 7)
    ? 'Vận trung bình (Nhân Hòa xấu hạn chế)'
    : ketLuan;

  return {
    thienThoiScore: thienThoi.score,
    diaLoiScore: diaLoi.score,
    nhanHoaScore: nhanHoa.score,
    tongDiem: Math.round(total * 10) / 10,
    flag,
    ketLuan: finalKetLuan,
  };
}

// ────────────────────────────────────────────────────────────
// 5. TIỂU VẬN ENGINE
// ────────────────────────────────────────────────────────────

/**
 * Xác định cung tiểu vận dựa vào tuổi xem
 * iztro trả về palace.ages = array các tuổi tiểu hạn
 */
function findTieuVanPalace(palaces, tuoiXem) {
  for (const p of palaces) {
    const ages = p.ages || [];
    if (ages.includes(tuoiXem) || ages.includes(String(tuoiXem))) {
      return p;
    }
  }
  return null;
}

/**
 * Xác định cung đại vận dựa vào tuổi xem
 * iztro: palace.decadal.range = [tuoiDau, tuoiCuoi]
 */
function findDaiVanPalace(palaces, tuoiXem) {
  for (const p of palaces) {
    const range = p.decadal?.range;
    if (range && tuoiXem >= range[0] && tuoiXem <= range[1]) {
      return p;
    }
  }
  return null;
}

/**
 * Tính tuổi dựa vào năm sinh và năm xem
 */
function tinhTuoi(namSinh, namXem) {
  return namXem - namSinh + 1; // tuổi âm lịch (tính thêm 1)
}

// ────────────────────────────────────────────────────────────
// 6. MAIN ANALYSIS FUNCTION
// ────────────────────────────────────────────────────────────

/**
 * Phân tích toàn bộ lá số
 * @param {Object} astrolabe - iztro astrolabe object
 * @param {Array}  cachCucDB - mảng cách cục từ JSON
 * @param {number} namXem    - năm xem vận
 * @returns {Object} structured analysis result
 */
function analyzeLaSo(astrolabe, cachCucDB, namXem) {
  const { palaces, fiveElementsClass, chineseDate } = astrolabe;

  const menhHanh  = getMenhHanh(chineseDate); // Nạp Âm từ can chi năm sinh
  const namSinhDiaChi = getNamSinhDiaChi(chineseDate);

  // Lấy năm sinh
  const namSinhMatch = (chineseDate || '').match(/\d{4}/);
  const namSinh = namSinhMatch ? parseInt(namSinhMatch[0]) : null;
  const tuoiXem = namSinh ? tinhTuoi(namSinh, namXem) : null;

  // Cung Mệnh
  const menhPalace = palaces.find(p => p.name === 'Mệnh' || p.name === '命宫');

  // ── Phân tích từng cung ──
  const CUNG_NAMES = [
    'Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch',
    'Quan Lộc', 'Nô Bộc', 'Thiên Di', 'Tật Ách',
    'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ',
  ];

  const cungAnalysis = {};
  for (const cungName of CUNG_NAMES) {
    const palace = palaces.find(p => p.name === cungName);
    if (!palace) continue;

    const tamPhuong = getTamPhuongTuChinh(palaces, palace.earthlyBranch);
    const activeCachCuc = findActiveCachCuc(cachCucDB, cungName, palace, tamPhuong);

    cungAnalysis[cungName] = {
      diaChi: palace.earthlyBranch,
      chinhTinh: (palace.majorStars || []).map(s => ({
        name: s.name,
        brightness: s.brightness,
        mutagen: s.mutagen,
      })),
      cachCucActive: activeCachCuc,
      cachCucCount: activeCachCuc.length,
    };
  }

  // ── Phân tích đại vận & tiểu vận ──
  let daiVanAnalysis = null;
  let tieuVanAnalysis = null;

  if (tuoiXem && menhPalace) {
    const daiVanPalace = findDaiVanPalace(palaces, tuoiXem);
    const tieuVanPalace = findTieuVanPalace(palaces, tuoiXem);

    if (daiVanPalace) {
      const dvTamPhuong = getTamPhuongTuChinh(palaces, daiVanPalace.earthlyBranch);
      const thienThoi = tinhThienThoi(daiVanPalace.earthlyBranch, namSinhDiaChi);
      const diaLoi    = tinhDiaLoi(daiVanPalace.earthlyBranch, menhHanh);
      const nhanHoa   = tinhNhanHoa(menhTamPhuong, dvTamPhuong);
      const score     = scoringDaiVan(thienThoi, diaLoi, nhanHoa);

      const dvCachCuc = findActiveCachCuc(cachCucDB, 'Vận Hạn', daiVanPalace, dvTamPhuong);

      daiVanAnalysis = {
        diaChi: daiVanPalace.earthlyBranch,
        range: daiVanPalace.decadal?.range,
        thienThoi,
        diaLoi,
        nhanHoa,
        ...score,
        cachCucActive: dvCachCuc,
      };
    }

    if (tieuVanPalace) {
      const tvTamPhuong = getTamPhuongTuChinh(palaces, tieuVanPalace.earthlyBranch);
      const diaLoi  = tinhDiaLoi(tieuVanPalace.earthlyBranch, menhHanh);
      const nhanHoa = tinhNhanHoa(menhTamPhuong, tvTamPhuong);

      const tvCachCuc = findActiveCachCuc(cachCucDB, 'Vận Hạn', tieuVanPalace, tvTamPhuong);

      // Điểm tiểu vận (chỉ địa lợi + nhân hòa, max 5đ)
      const tvScore = diaLoi.score * (2/2) + nhanHoa.score;
      const tvFlag = tvScore >= 3.5 ? '🟢' : tvScore >= 2 ? '🟠' : '🔴';

      tieuVanAnalysis = {
        diaChi: tieuVanPalace.earthlyBranch,
        tuoiXem,
        diaLoi,
        nhanHoa,
        tieuVanScore: Math.round(tvScore * 10) / 10,
        tieuVanFlag: tvFlag,
        cachCucActive: tvCachCuc,
        // 70% đại vận, 30% tiểu vận
        ketLuanTongHop: daiVanAnalysis
          ? tinhKetLuanTongHop(daiVanAnalysis, tvScore)
          : null,
      };
    }
  }

  // ── Kết quả tổng hợp ──
  return {
    meta: {
      menhHanh,
      namSinhDiaChi,
      fiveElementsClass,
      tuoiXem,
      namXem,
    },
    cungAnalysis,
    daiVanAnalysis,
    tieuVanAnalysis,
  };
}

function tinhKetLuanTongHop(daiVan, tieuVanScore) {
  // 70% đại vận + 30% tiểu vận
  const tongHop = daiVan.tongDiem * 0.7 + tieuVanScore * 0.3;
  const flag = tongHop >= 7 ? '🟢' : tongHop >= 4 ? '🟠' : '🔴';
  return {
    diem: Math.round(tongHop * 10) / 10,
    flag,
    moTa: tongHop >= 7
      ? 'Năm thuận lợi'
      : tongHop >= 4
      ? 'Năm trung bình'
      : 'Năm khó khăn',
  };
}

// ────────────────────────────────────────────────────────────
// 7. FORMAT OUTPUT FOR CLAUDE
// ────────────────────────────────────────────────────────────

/**
 * Format kết quả engine thành text gửi Claude
 * Ngắn gọn, có cấu trúc — Claude chỉ cần diễn giải
 */
function formatForClaude(result, phan) {
  const { meta, cungAnalysis, daiVanAnalysis, tieuVanAnalysis } = result;
  const lines = [];

  lines.push(`=== ENGINE OUTPUT ===`);
  lines.push(`Mệnh: ${meta.fiveElementsClass} | Năm sinh: ${meta.namSinhDiaChi} | Tuổi xem: ${meta.tuoiXem}`);
  lines.push('');

  if (phan === 1) {
    // Phần 1: Tổng quan — cung Mệnh
    const menh = cungAnalysis['Mệnh'];
    if (menh) {
      lines.push(`CUNG MỆNH (${menh.diaChi}):`);
      lines.push(`Chính tinh: ${menh.chinhTinh.map(s => `${s.name}(${s.brightness||''}${s.mutagen?'/'+s.mutagen:''})`).join(', ') || '(vô chính diệu)'}`);
      lines.push(`Cách cục active (${menh.cachCucCount}):`);
      menh.cachCucActive.forEach(cc => {
        lines.push(`  [${cc.loai.toUpperCase()}/${cc.doManh}⭐] ${cc.ten} — ${cc.tomTat}`);
      });
    }
  }

  if (phan === 2) {
    // Phần 2: 12 cung
    for (const [cungName, data] of Object.entries(cungAnalysis)) {
      lines.push(`\n${cungName} (${data.diaChi}):`);
      lines.push(`  Chính tinh: ${data.chinhTinh.map(s => s.name).join(', ') || '(vô chính diệu)'}`);
      if (data.cachCucActive.length > 0) {
        lines.push(`  Cách cục (${data.cachCucActive.length}):`);
        data.cachCucActive.slice(0, 5).forEach(cc => {
          lines.push(`    [${cc.loai}/${cc.doManh}⭐] ${cc.ten} — ${cc.tomTat}`);
        });
      }
    }
  }

  if (phan === 3 && daiVanAnalysis) {
    // Phần 3: Đại vận scoring
    const dv = daiVanAnalysis;
    lines.push(`ĐẠI VẬN (${dv.diaChi}) tuổi ${dv.range?.[0]}–${dv.range?.[1]}:`);
    lines.push(`  Thiên Thời: ${dv.thienThoi.score}/5 — ${dv.thienThoi.moTa}`);
    lines.push(`  Địa Lợi:   ${dv.diaLoi.score}/2 — ${dv.diaLoi.moTa}`);
    lines.push(`  Nhân Hòa:  ${dv.nhanHoa.score}/3 — ${dv.nhanHoa.moTa}`);
    lines.push(`  Tổng: ${dv.tongDiem}/10 ${dv.flag} — ${dv.ketLuan}`);
    if (dv.cachCucActive.length > 0) {
      lines.push(`  Cách cục vận:`);
      dv.cachCucActive.forEach(cc => {
        lines.push(`    [${cc.loai}/${cc.doManh}⭐] ${cc.ten} — ${cc.tomTat}`);
      });
    }
  }

  if (phan === 4 && tieuVanAnalysis) {
    // Phần 4: Tiểu vận năm hiện tại
    const tv = tieuVanAnalysis;
    lines.push(`TIỂU VẬN năm ${meta.namXem} (cung ${tv.diaChi}, tuổi ${tv.tuoiXem}):`);
    lines.push(`  Địa Lợi:  ${tv.diaLoi.score}/2 — ${tv.diaLoi.moTa}`);
    lines.push(`  Nhân Hòa: ${tv.nhanHoa.score}/3 — ${tv.nhanHoa.moTa}`);
    lines.push(`  Tiểu vận: ${tv.tieuVanScore} ${tv.tieuVanFlag}`);
    if (tv.ketLuanTongHop) {
      lines.push(`  Tổng hợp (70% đại vận + 30% tiểu vận): ${tv.ketLuanTongHop.diem} ${tv.ketLuanTongHop.flag} — ${tv.ketLuanTongHop.moTa}`);
    }
    if (tv.cachCucActive.length > 0) {
      lines.push(`  Cách cục năm:`);
      tv.cachCucActive.forEach(cc => {
        lines.push(`    [${cc.loai}/${cc.doManh}⭐] ${cc.ten} — ${cc.tomTat}`);
      });
    }
  }

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────
// EXPORT
// ────────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = {
    analyzeLaSo,
    formatForClaude,
    findActiveCachCuc,
    getTamPhuongTuChinh,
    tinhThienThoi,
    tinhDiaLoi,
    tinhNhanHoa,
    scoringDaiVan,
    getAllStars,
    getMenhHanh,
    getNamSinhDiaChi,
    findDaiVanPalace,
    findTieuVanPalace,
    tinhTuoi,
  };
}
