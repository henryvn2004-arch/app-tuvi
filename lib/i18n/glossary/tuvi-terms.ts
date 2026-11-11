// lib/i18n/glossary/tuvi-terms.ts — NGUỒN thuật ngữ Tử Vi cho mọi ngôn ngữ (W6).
//
// ĐÂY LÀ DỮ LIỆU GỐC DUY NHẤT, viết tay MỘT lần bằng chữ Hán PHỒN THỂ chuẩn của
// Tử Vi Đẩu Số. Mọi cột còn lại SINH tất định bằng `scripts/gen-glossary.mjs`
// → `terms.generated.mjs` (đừng sửa file đó bằng tay):
//   · zh-tw = chính chữ Hán ở đây
//   · zh-cn = OpenCC (tw→cn)               · ja = OpenCC (t→jp), tức 新字体: 祿→禄, 權→権, 數→数
//   · ko    = Unihan `kHangul` (+ luật đầu âm 두음법칙, chỉ áp cho âm tiết ĐẦU từ) — KHÔNG đoán
//   · en    = cột thứ tư ở đây nếu có; không thì pinyin sinh từ Unihan `kMandarin`
//             (⚠ CHỜ DUYỆT — Henry/người bản ngữ xem lại trước khi coi là chuẩn)
//
// Vì sao Hán viết tay mà không "lấy từ engine": engine (`public/tuvi-ansao-engine.js`)
// KHÔNG chứa chữ Hán nào — tên sao/cung ở đó là Hán-Việt viết sẵn bằng chữ Việt. Danh
// sách TÊN lấy từ chính `STAR_DATA` + `TEN_CUNG` + `TRANG_SINH_SEQ` của engine (không gõ
// thêm sao nào ngoài engine); chữ Hán thì tra sách. `scripts/gen-glossary.mjs` kiểm chéo
// số âm tiết Hán-Việt = số chữ Hán và đối chiếu Unihan `kVietnamese` để bắt gõ nhầm.
// Can/Chi lấy ĐẢO từ `lib/hanviet.ts` (CAN_HAN/CHI_HAN) — không gõ lại.
//
// Cờ (cột 5): 'x' = KHÔNG dò trong văn xuôi (đơn âm tiết mơ hồ: "Tử", "Mộ", "Bệnh"…),
//             'c' = chỉ dò khi có tiền tố "cung " ("cung Mệnh" chứ không phải "mệnh" thường),
//             'n' = cho phép số chữ Hán ≠ số âm tiết (Tuần → 旬空),
//             'v' = tên Việt KHÔNG phải phiên Hán-Việt của chữ Hán (Lá Số ↔ 命盤…) — bộ dò check:glossary bỏ qua và liệt kê.

export type TermKind = 'cung' | 'chinh' | 'sao' | 'tuhoa' | 'sang' | 'cuc' | 'hanh' | 'khai';

/** Ngoại lệ THEO NGÔN NGỮ khi cách dùng thật khác chữ Hán gốc (ghi nguyên chuỗi kết quả). */
export type TermOverride = Partial<Record<'ja' | 'ko' | 'zh-cn', string>>;

/** [loại, tiếng Việt, Hán phồn thể, en (tuỳ chọn, '' = sinh pinyin), cờ, ngoại lệ] */
export type TermRow = readonly [TermKind, string, string, string?, string?, TermOverride?];

export const TERMS: readonly TermRow[] = [
  // ── 12 cung (tên đúng như engine `TEN_CUNG`) ──────────────────────────────
  ['cung', 'Mệnh', '命宮', 'Life Palace', 'c'],
  ['cung', 'Phụ Mẫu', '父母宮', 'Parents Palace'],
  ['cung', 'Phúc Đức', '福德宮', 'Fortune Palace', 'c'],
  ['cung', 'Điền Trạch', '田宅宮', 'Property Palace'],
  ['cung', 'Quan Lộc', '官祿宮', 'Career Palace'],
  ['cung', 'Nô Bộc', '僕役宮', 'Friends Palace'],
  ['cung', 'Thiên Di', '遷移宮', 'Travel Palace'],
  ['cung', 'Tật Ách', '疾厄宮', 'Health Palace'],
  ['cung', 'Tài Bạch', '財帛宮', 'Wealth Palace'],
  ['cung', 'Tử Tức', '子女宮', 'Children Palace'],
  ['cung', 'Phu Thê', '夫妻宮', 'Spouse Palace'],
  ['cung', 'Huynh Đệ', '兄弟宮', 'Siblings Palace'],
  ['cung', 'Thân', '身宮', 'Body Palace', 'c'],

  // ── 14 chính tinh ────────────────────────────────────────────────────────
  ['chinh', 'Tử Vi', '紫微'],
  ['chinh', 'Liêm Trinh', '廉貞'],
  ['chinh', 'Thiên Đồng', '天同'],
  ['chinh', 'Vũ Khúc', '武曲'],
  ['chinh', 'Thái Dương', '太陽'],
  ['chinh', 'Thiên Cơ', '天機'],
  ['chinh', 'Thiên Phủ', '天府'],
  ['chinh', 'Thái Âm', '太陰'],
  ['chinh', 'Tham Lang', '貪狼'],
  ['chinh', 'Cự Môn', '巨門'],
  ['chinh', 'Thiên Tướng', '天相'],
  ['chinh', 'Thiên Lương', '天梁'],
  ['chinh', 'Thất Sát', '七殺'],
  ['chinh', 'Phá Quân', '破軍'],

  // ── phụ tinh · sát tinh · bại tinh (đúng thứ tự `STAR_DATA` của engine) ──
  ['sao', 'Kình Dương', '擎羊'],
  ['sao', 'Đà La', '陀羅'],
  ['sao', 'Hỏa Tinh', '火星'],
  ['sao', 'Linh Tinh', '鈴星'],
  ['sao', 'Kiếp Sát', '劫殺'],
  ['sao', 'Lưu Hà', '流霞'],
  ['sao', 'Thiên Hình', '天刑'],
  ['sao', 'Thiên Riêu', '天姚'],
  ['sao', 'Thiên La', '天羅'],
  ['sao', 'Địa Võng', '地網'],
  ['sao', 'Thiên Thương', '天傷'],
  ['sao', 'Thiên Sứ', '天使'],
  ['sao', 'Hóa Lộc', '化祿'],
  ['sao', 'Hóa Quyền', '化權'],
  ['sao', 'Hóa Khoa', '化科'],
  ['sao', 'Hóa Kỵ', '化忌'],
  ['sao', 'Lộc Tồn', '祿存'],
  ['sao', 'Thiên Mã', '天馬'],
  ['sao', 'Đào Hoa', '桃花'],
  ['sao', 'Hồng Loan', '紅鸞'],
  ['sao', 'Thiên Hỷ', '天喜'],
  ['sao', 'Tả Phụ', '左輔'],
  ['sao', 'Hữu Bật', '右弼'],
  ['sao', 'Văn Xương', '文昌'],
  ['sao', 'Văn Khúc', '文曲'],
  ['sao', 'Long Trì', '龍池'],
  ['sao', 'Phượng Các', '鳳閣'],
  ['sao', 'Thiên Khốc', '天哭'],
  ['sao', 'Thiên Hư', '天虛'],
  ['sao', 'Tam Thai', '三台'],
  ['sao', 'Bát Tọa', '八座'],
  ['sao', 'Ân Quang', '恩光'],
  ['sao', 'Thiên Quý', '天貴'],
  ['sao', 'Thiên Khôi', '天魁'],
  ['sao', 'Thiên Việt', '天鉞'],
  ['sao', 'Thiên Tài', '天才'],
  ['sao', 'Thiên Thọ', '天壽'],
  ['sao', 'Thiên Giải', '天解'],
  ['sao', 'Địa Giải', '地解'],
  ['sao', 'Giải Thần', '解神'],
  ['sao', 'Thiên Đức', '天德'],
  ['sao', 'Nguyệt Đức', '月德'],
  ['sao', 'Thiên Y', '天醫'],
  ['sao', 'Cô Thần', '孤辰'],
  ['sao', 'Quả Tú', '寡宿'],
  ['sao', 'Hoa Cái', '華蓋'],
  ['sao', 'Thiên Trù', '天廚'],
  ['sao', 'Phá Toái', '破碎'],
  ['sao', 'Quốc Ấn', '國印'],
  ['sao', 'Đường Phù', '唐符'],
  ['sao', 'Thái Tuế', '太歲'],
  ['sao', 'Thiếu Dương', '少陽'],
  ['sao', 'Tang Môn', '喪門', 'Sang Men'],
  ['sao', 'Thiếu Âm', '少陰'],
  ['sao', 'Quan Phù', '官符'],
  ['sao', 'Tử Phù', '死符'],
  ['sao', 'Tuế Phá', '歲破'],
  ['sao', 'Long Đức', '龍德'],
  ['sao', 'Bạch Hổ', '白虎'],
  ['sao', 'Phúc Đức', '福德'],
  ['sao', 'Điếu Khách', '弔客'],
  ['sao', 'Trực Phù', '直符'],
  ['sao', 'Lực Sỹ', '力士'],
  ['sao', 'Thanh Long', '青龍'],
  ['sao', 'Tiểu Hao', '小耗'],
  ['sao', 'Tướng Quân', '將軍'],
  ['sao', 'Tấu Thư', '奏書'],
  ['sao', 'Phi Liêm', '蜚廉'],
  ['sao', 'Hỷ Thần', '喜神'],
  ['sao', 'Đại Hao', '大耗'],
  ['sao', 'Địa Không', '地空'],
  ['sao', 'Địa Kiếp', '地劫'],
  ['sao', 'Bệnh Phù', '病符'],
  ['sao', 'Phục Binh', '伏兵'],
  ['sao', 'Đẩu Quân', '斗君'],
  ['sao', 'Bác Sỹ', '博士'],
  ['sao', 'Thiên Không', '天空'],
  ['sao', 'Thiên Quan', '天官'],
  ['sao', 'Thiên Phúc', '天福'],
  ['sao', 'Quan Phủ', '官府'],
  ['sao', 'Lưu Niên Văn Tinh', '流年文星'],
  ['sao', 'Thai Phụ', '台輔'],
  ['sao', 'Phong Cáo', '封誥'],
  ['sao', 'Tuần', '旬空', 'Xun Kong', 'xn'],
  ['sao', 'Triệt', '截空', 'Jie Kong', 'xn'],

  // ── vòng Tràng Sinh (engine `TRANG_SINH_SEQ`) ────────────────────────────
  ['sao', 'Tràng Sinh', '長生', 'Chang Sheng'],
  ['sao', 'Mộc Dục', '沐浴'],
  ['sao', 'Quan Đới', '冠帶'],
  ['sao', 'Lâm Quan', '臨官'],
  ['sao', 'Đế Vượng', '帝旺'],
  ['sao', 'Suy', '衰', '', 'x'],
  ['sao', 'Bệnh', '病', '', 'x'],
  ['sao', 'Tử', '死', '', 'x'],
  ['sao', 'Mộ', '墓', '', 'x'],
  ['sao', 'Tuyệt', '絕', '', 'x'],
  ['sao', 'Thai', '胎', '', 'x'],
  ['sao', 'Dưỡng', '養', '', 'x'],

  // ── Tứ Hóa (dạng đơn lẻ, như engine trả ở `hoa`) và độ sáng (`sang`) ────
  ['tuhoa', 'Lộc', '祿', 'Lu (Prosperity)', 'x'],
  ['tuhoa', 'Quyền', '權', 'Quan (Authority)', 'x'],
  ['tuhoa', 'Khoa', '科', 'Ke (Recognition)', 'x'],
  ['tuhoa', 'Kỵ', '忌', 'Ji (Obstruction)', 'x'],
  ['sang', 'Miếu', '廟', 'exalted', 'x'],
  ['sang', 'Vượng', '旺', 'prosperous', 'x'],
  ['sang', 'Đắc', '得', 'favorable', 'x'],
  ['sang', 'Bình', '平', 'neutral', 'x'],
  ['sang', 'Hãm', '陷', 'weak', 'x'],

  // ── Cục (engine `LAP_CUC_RULES`) và ngũ hành ─────────────────────────────
  ['cuc', 'Thủy Nhị Cục', '水二局', 'Water 2 Bureau'],
  ['cuc', 'Mộc Tam Cục', '木三局', 'Wood 3 Bureau'],
  ['cuc', 'Kim Tứ Cục', '金四局', 'Metal 4 Bureau'],
  ['cuc', 'Thổ Ngũ Cục', '土五局', 'Earth 5 Bureau'],
  ['cuc', 'Hỏa Lục Cục', '火六局', 'Fire 6 Bureau'],
  ['hanh', 'Kim', '金', 'Metal', 'x'],
  ['hanh', 'Mộc', '木', 'Wood', 'x'],
  ['hanh', 'Thủy', '水', 'Water', 'x'],
  ['hanh', 'Hỏa', '火', 'Fire', 'x'],
  ['hanh', 'Thổ', '土', 'Earth', 'x'],

  // ── Khái niệm (dùng trong văn xuôi) ──────────────────────────────────────
  ['khai', 'Tử Vi Đẩu Số', '紫微斗數', 'Zi Wei Dou Shu'],
  ['khai', 'Tứ Hóa', '四化', 'Si Hua (Four Transformations)'],
  ['khai', 'Tam Phương Tứ Chính', '三方四正', 'San Fang Si Zheng'],
  ['khai', 'Đại Vận', '大運', 'Major Cycle (Da Yun)'],
  ['khai', 'Tiểu Hạn', '小限', 'Annual Limit (Xiao Xian)'],
  ['khai', 'Lưu Niên', '流年', 'Annual Flow (Liu Nian)'],
  ['khai', 'Lưu Niên Tứ Hóa', '流年四化', 'Annual Si Hua'],
  ['khai', 'Chính Tinh', '主星', 'major stars', 'v'],
  ['khai', 'Phụ Tinh', '輔星', 'minor stars'],
  ['khai', 'Sát Tinh', '煞星', 'malefic stars'],
  ['khai', 'Lá Số', '命盤', 'natal chart', 'v'],
  ['khai', 'Can Chi', '干支', 'Stems and Branches'],
  ['khai', 'Ngũ Hành', '五行', 'Five Elements'],
  ['khai', 'Nạp Âm', '納音', 'Na Yin'],
  // Hàn dùng 음력 (陰曆), Nhật dùng 旧暦 — không phải chữ 農曆 của Trung/Đài.
  ['khai', 'Âm Lịch', '農曆', 'lunar calendar', 'v', { ko: '음력', ja: '旧暦' }],
  ['khai', 'Dương Lịch', '陽曆', 'solar calendar', '', { ja: '新暦' }],
  ['khai', 'Giờ Sinh', '生時', 'birth hour', 'v'],
  ['khai', 'Thiên Can', '天干', 'Heavenly Stems'],
  ['khai', 'Địa Chi', '地支', 'Earthly Branches'],
  ['khai', 'Sao Tử Vi', '紫微星', 'Zi Wei star', 'v'],
  ['khai', 'Vô Chính Diệu', '無正曜', 'no major star'],
  ['khai', 'Đại Hạn', '大限', 'Major Limit (Da Xian)'],
];

/** Địa chi: tiếng Việt → [con giáp en]. Chữ Hán lấy đảo từ `lib/hanviet.ts` CHI_HAN. */
export const CHI_EN: Record<string, string> = {
  Tý: 'Zi (Rat)', Sửu: 'Chou (Ox)', Dần: 'Yin (Tiger)', Mão: 'Mao (Rabbit)',
  Thìn: 'Chen (Dragon)', Tỵ: 'Si (Snake)', Ngọ: 'Wu (Horse)', Mùi: 'Wei (Goat)',
  Thân: 'Shen (Monkey)', Dậu: 'You (Rooster)', Tuất: 'Xu (Dog)', Hợi: 'Hai (Pig)',
};

/** Thiên can: tiếng Việt → pinyin. Chữ Hán lấy đảo từ `lib/hanviet.ts` CAN_HAN. */
export const CAN_EN: Record<string, string> = {
  Giáp: 'Jia', Ất: 'Yi', Bính: 'Bing', Đinh: 'Ding', Mậu: 'Wu',
  Kỷ: 'Ji', Canh: 'Geng', Tân: 'Xin', Nhâm: 'Ren', Quý: 'Gui',
};
