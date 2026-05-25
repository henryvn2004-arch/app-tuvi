// scripts/tuvi-compat/can-chi.mjs
// Dữ liệu cố định: 10 Thiên Can, 12 Địa Chi, 60 Hoa Giáp + Nạp Âm
// Nguồn: Tam Mệnh Thông Hội, Hiệp Kỷ Biện Phương Thư, Tử Vi Đẩu Số Toàn Thư

// ── Thiên Can: tên, slug, ngũ hành, âm/dương ───────────────────────────────────
export const CAN = {
  giap:  { name: 'Giáp',  hanh: 'Mộc',  am: false },
  at:    { name: 'Ất',    hanh: 'Mộc',  am: true  },
  binh:  { name: 'Bính',  hanh: 'Hỏa',  am: false },
  dinh:  { name: 'Đinh',  hanh: 'Hỏa',  am: true  },
  mau:   { name: 'Mậu',   hanh: 'Thổ',  am: false },
  ky:    { name: 'Kỷ',    hanh: 'Thổ',  am: true  },
  canh:  { name: 'Canh',  hanh: 'Kim',  am: false },
  tan:   { name: 'Tân',   hanh: 'Kim',  am: true  },
  nham:  { name: 'Nhâm',  hanh: 'Thủy', am: false },
  quy:   { name: 'Quý',   hanh: 'Thủy', am: true  },
};

// ── Địa Chi: tên, slug, ngũ hành, âm/dương, mùa, tháng ─────────────────────────
export const CHI = {
  ty:   { name: 'Tý',   hanh: 'Thủy', am: false, mua: 'Đông',  thang: 11, gio: '23-1'  },
  suu:  { name: 'Sửu',  hanh: 'Thổ',  am: true,  mua: 'Đông',  thang: 12, gio: '1-3'   },
  dan:  { name: 'Dần',  hanh: 'Mộc',  am: false, mua: 'Xuân',  thang: 1,  gio: '3-5'   },
  mao:  { name: 'Mão',  hanh: 'Mộc',  am: true,  mua: 'Xuân',  thang: 2,  gio: '5-7'   },
  thin: { name: 'Thìn', hanh: 'Thổ',  am: false, mua: 'Xuân',  thang: 3,  gio: '7-9'   },
  ti:   { name: 'Tỵ',   hanh: 'Hỏa',  am: true,  mua: 'Hạ',    thang: 4,  gio: '9-11'  },
  ngo:  { name: 'Ngọ',  hanh: 'Hỏa',  am: false, mua: 'Hạ',    thang: 5,  gio: '11-13' },
  mui:  { name: 'Mùi',  hanh: 'Thổ',  am: true,  mua: 'Hạ',    thang: 6,  gio: '13-15' },
  than: { name: 'Thân', hanh: 'Kim',  am: false, mua: 'Thu',   thang: 7,  gio: '15-17' },
  dau:  { name: 'Dậu',  hanh: 'Kim',  am: true,  mua: 'Thu',   thang: 8,  gio: '17-19' },
  tuat: { name: 'Tuất', hanh: 'Thổ',  am: false, mua: 'Thu',   thang: 9,  gio: '19-21' },
  hoi:  { name: 'Hợi',  hanh: 'Thủy', am: true,  mua: 'Đông',  thang: 10, gio: '21-23' },
};

// ── 60 Hoa Giáp với Nạp Âm ─────────────────────────────────────────────────────
// Mỗi cặp can-chi đứng cạnh nhau (chu kỳ 60) có cùng nạp âm
// Format: [canSlug, chiSlug, napAmName, napAmHanh]
const HOA_GIAP_RAW = [
  ['giap','ty',   'Hải Trung Kim',    'Kim'],   // 1
  ['at',  'suu',  'Hải Trung Kim',    'Kim'],   // 2
  ['binh','dan',  'Lư Trung Hỏa',     'Hỏa'],   // 3
  ['dinh','mao',  'Lư Trung Hỏa',     'Hỏa'],   // 4
  ['mau', 'thin', 'Đại Lâm Mộc',      'Mộc'],   // 5
  ['ky',  'ti',   'Đại Lâm Mộc',      'Mộc'],   // 6
  ['canh','ngo',  'Lộ Bàng Thổ',      'Thổ'],   // 7
  ['tan', 'mui',  'Lộ Bàng Thổ',      'Thổ'],   // 8
  ['nham','than', 'Kiếm Phong Kim',   'Kim'],   // 9
  ['quy', 'dau',  'Kiếm Phong Kim',   'Kim'],   // 10
  ['giap','tuat', 'Sơn Đầu Hỏa',      'Hỏa'],   // 11
  ['at',  'hoi',  'Sơn Đầu Hỏa',      'Hỏa'],   // 12
  ['binh','ty',   'Giản Hạ Thủy',     'Thủy'],  // 13
  ['dinh','suu',  'Giản Hạ Thủy',     'Thủy'],  // 14
  ['mau', 'dan',  'Thành Đầu Thổ',    'Thổ'],   // 15
  ['ky',  'mao',  'Thành Đầu Thổ',    'Thổ'],   // 16
  ['canh','thin', 'Bạch Lạp Kim',     'Kim'],   // 17
  ['tan', 'ti',   'Bạch Lạp Kim',     'Kim'],   // 18
  ['nham','ngo',  'Dương Liễu Mộc',   'Mộc'],   // 19
  ['quy', 'mui',  'Dương Liễu Mộc',   'Mộc'],   // 20
  ['giap','than', 'Tuyền Trung Thủy', 'Thủy'],  // 21
  ['at',  'dau',  'Tuyền Trung Thủy', 'Thủy'],  // 22
  ['binh','tuat', 'Ốc Thượng Thổ',    'Thổ'],   // 23
  ['dinh','hoi',  'Ốc Thượng Thổ',    'Thổ'],   // 24
  ['mau', 'ty',   'Tích Lịch Hỏa',    'Hỏa'],   // 25
  ['ky',  'suu',  'Tích Lịch Hỏa',    'Hỏa'],   // 26
  ['canh','dan',  'Tùng Bách Mộc',    'Mộc'],   // 27
  ['tan', 'mao',  'Tùng Bách Mộc',    'Mộc'],   // 28
  ['nham','thin', 'Trường Lưu Thủy',  'Thủy'],  // 29
  ['quy', 'ti',   'Trường Lưu Thủy',  'Thủy'],  // 30
  ['giap','ngo',  'Sa Trung Kim',     'Kim'],   // 31
  ['at',  'mui',  'Sa Trung Kim',     'Kim'],   // 32
  ['binh','than', 'Sơn Hạ Hỏa',       'Hỏa'],   // 33
  ['dinh','dau',  'Sơn Hạ Hỏa',       'Hỏa'],   // 34
  ['mau', 'tuat', 'Bình Địa Mộc',     'Mộc'],   // 35
  ['ky',  'hoi',  'Bình Địa Mộc',     'Mộc'],   // 36
  ['canh','ty',   'Bích Thượng Thổ',  'Thổ'],   // 37
  ['tan', 'suu',  'Bích Thượng Thổ',  'Thổ'],   // 38
  ['nham','dan',  'Kim Bạch Kim',     'Kim'],   // 39
  ['quy', 'mao',  'Kim Bạch Kim',     'Kim'],   // 40
  ['giap','thin', 'Phú Đăng Hỏa',     'Hỏa'],   // 41
  ['at',  'ti',   'Phú Đăng Hỏa',     'Hỏa'],   // 42
  ['binh','ngo',  'Thiên Hà Thủy',    'Thủy'],  // 43
  ['dinh','mui',  'Thiên Hà Thủy',    'Thủy'],  // 44
  ['mau', 'than', 'Đại Trạch Thổ',    'Thổ'],   // 45
  ['ky',  'dau',  'Đại Trạch Thổ',    'Thổ'],   // 46
  ['canh','tuat', 'Thoa Xuyến Kim',   'Kim'],   // 47
  ['tan', 'hoi',  'Thoa Xuyến Kim',   'Kim'],   // 48
  ['nham','ty',   'Tang Đố Mộc',      'Mộc'],   // 49
  ['quy', 'suu',  'Tang Đố Mộc',      'Mộc'],   // 50
  ['giap','dan',  'Đại Khê Thủy',     'Thủy'],  // 51
  ['at',  'mao',  'Đại Khê Thủy',     'Thủy'],  // 52
  ['binh','thin', 'Sa Trung Thổ',     'Thổ'],   // 53
  ['dinh','ti',   'Sa Trung Thổ',     'Thổ'],   // 54
  ['mau', 'ngo',  'Thiên Thượng Hỏa', 'Hỏa'],   // 55
  ['ky',  'mui',  'Thiên Thượng Hỏa', 'Hỏa'],   // 56
  ['canh','than', 'Thạch Lựu Mộc',    'Mộc'],   // 57
  ['tan', 'dau',  'Thạch Lựu Mộc',    'Mộc'],   // 58
  ['nham','tuat', 'Đại Hải Thủy',     'Thủy'],  // 59
  ['quy', 'hoi',  'Đại Hải Thủy',     'Thủy'],  // 60
];

// Map "canSlug-chiSlug" → { napAm, napAmHanh, index }
export const HOA_GIAP = {};
for (let i = 0; i < HOA_GIAP_RAW.length; i++) {
  const [c, ch, name, hanh] = HOA_GIAP_RAW[i];
  HOA_GIAP[`${c}-${ch}`] = { napAm: name, napAmHanh: hanh, index: i + 1 };
}

// ── Mô tả thi vị mỗi nạp âm (tham khảo cổ điển) ─────────────────────────────────
// Dùng để render câu "Lư Trung Hỏa là lửa trong lò, ấm áp nhưng cần củi giữ"
export const NAP_AM_DESC = {
  'Hải Trung Kim':    'vàng dưới đáy biển, ẩn tàng và quý hiếm, cần thời gian để lộ rạng',
  'Lư Trung Hỏa':     'lửa trong lò luyện, ấm áp bền bỉ nhưng cần củi và gió giữ',
  'Đại Lâm Mộc':      'cây trong rừng lớn, vững chãi và sinh sôi, ưa đất rộng để phát',
  'Lộ Bàng Thổ':      'đất bên đường đi, mộc mạc và dày dặn, gánh chở mọi bước chân',
  'Kiếm Phong Kim':   'vàng mũi gươm, sắc bén dứt khoát, hợp dùng vào việc lớn',
  'Sơn Đầu Hỏa':      'lửa đỉnh núi, rực rỡ trên cao, sáng tỏ nhưng dễ bị gió thổi',
  'Giản Hạ Thủy':     'nước khe nhỏ chảy róc rách, mềm mại bền bỉ, nuôi dưỡng âm thầm',
  'Thành Đầu Thổ':    'đất xây thành lũy, kiên cố và che chở, gánh trách nhiệm lớn',
  'Bạch Lạp Kim':     'vàng chân nến trắng, mảnh mai mà sáng tỏ, ấm áp lễ độ',
  'Dương Liễu Mộc':   'cây dương liễu ven sông, mềm dẻo và duyên dáng, ưa nước',
  'Tuyền Trung Thủy': 'nước suối nguồn, trong lành tinh khiết, chảy đều không vơi',
  'Ốc Thượng Thổ':    'đất trên nóc nhà, vừa che mưa nắng vừa cao xa, ưa khô ráo',
  'Tích Lịch Hỏa':    'lửa sấm sét, bùng phát mãnh liệt, có sức công phá lớn',
  'Tùng Bách Mộc':    'cây tùng cây bách, chịu được sương tuyết, bốn mùa xanh tốt',
  'Trường Lưu Thủy':  'nước sông dài chảy, không bao giờ ngừng, bền và mạnh',
  'Sa Trung Kim':     'vàng lẫn trong cát, cần đãi lọc kỹ mới hiện ra giá trị',
  'Sơn Hạ Hỏa':       'lửa chân núi, ẩn dưới rừng cây, cháy âm ỉ lâu dài',
  'Bình Địa Mộc':     'cây mọc ở đồng bằng, rễ rộng tán xòe, hợp đất phẳng và ẩm',
  'Bích Thượng Thổ':  'đất trên vách tường, mỏng mà chắc, làm điểm tựa vững',
  'Kim Bạch Kim':     'vàng pha bạch, mềm mại và tinh khiết, ưa được mài giũa',
  'Phú Đăng Hỏa':     'lửa đèn lớn, soi tỏ một góc, ấm và rõ nhưng cần dầu giữ',
  'Thiên Hà Thủy':    'nước thiên hà từ trên trời, dội xuống mạnh và rộng khắp',
  'Đại Trạch Thổ':    'đất nền lớn, làm cơ sở vững chãi cho mọi công trình',
  'Thoa Xuyến Kim':   'vàng làm trang sức, đẹp tinh tế, được nâng niu gìn giữ',
  'Tang Đố Mộc':      'cây dâu tằm, vừa cho lá nuôi tằm vừa cho quả ngọt, hữu ích',
  'Đại Khê Thủy':     'nước khe lớn, chảy xiết mạnh mẽ, ào ạt và phóng khoáng',
  'Sa Trung Thổ':     'đất pha cát, vừa giữ vừa thoát nước, linh hoạt mềm dẻo',
  'Thiên Thượng Hỏa': 'lửa mặt trời trên trời cao, sáng tỏ và soi đường thiên hạ',
  'Thạch Lựu Mộc':    'cây lựu mọc trên đá, kiên cường mà cho quả ngọt đỏ',
  'Đại Hải Thủy':     'nước biển lớn mênh mông, bao dung và sâu thẳm khôn lường',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
export function tuoiName(canSlug, chiSlug) {
  return `${CAN[canSlug]?.name || canSlug} ${CHI[chiSlug]?.name || chiSlug}`;
}

export function napAm(canSlug, chiSlug) {
  return HOA_GIAP[`${canSlug}-${chiSlug}`] || null;
}
