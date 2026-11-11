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
//             'a' = đơn từ chỉ dò trong văn khi có NGỮ CẢNH (Tuần/Triệt: "Tuần/Triệt án ngữ"…; xem CONTEXT trong index.ts),
//             'n' = cho phép số chữ Hán ≠ số âm tiết (Tuần → 旬空),
//             'o' = sao/khái niệm RIÊNG của trường phái Việt (vnOnly): giữ chữ, người dịch phải GIẢI THÍCH, không tìm tương đương,
//             'v' = tên Việt KHÔNG phải phiên Hán-Việt của chữ Hán (Lá Số ↔ 命盤…) — bộ dò check:glossary bỏ qua và liệt kê.

export type TermKind =
  | 'cung' | 'chinh' | 'sao' | 'tuhoa' | 'sang' | 'cuc' | 'hanh' | 'khai'
  // W15b — ngoài Tử Vi: nạp âm 30 cặp, Kỳ Môn, Lục Nhâm, Hoàng Lịch (Kim Lâu…), Bát Trạch, tướng pháp, Mai Hoa.
  | 'napam' | 'kymon' | 'lucnham' | 'lich' | 'battrach' | 'tuong' | 'maihoa'
  // 28 tú (`NHI_THAP_BAT_TU`) và 12 trực (`TRUC_LIST`) của tuvi-engine/src/ngay-tot/constants.ts.
  | 'tu' | 'truc';

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
  // 飛廉 (không phải dị thể 蜚廉): trong vòng 博士十二神 sách và app Đài phần lớn dùng 飛廉 (chỉ huy duyệt 2026-11-11).
  ['sao', 'Phi Liêm', '飛廉'],
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
  // Sao RIÊNG của trường phái Việt, không có tương đương chuẩn bên Trung — cờ 'o': người dịch giải thích, đừng tìm từ tương đương.
  ['sao', 'Lưu Niên Văn Tinh', '流年文星', '', 'o'],
  ['sao', 'Thai Phụ', '台輔'],
  ['sao', 'Phong Cáo', '封誥'],
  ['sao', 'Tuần', '旬空', 'Xun Kong', 'na'],
  ['sao', 'Triệt', '截空', 'Jie Kong', 'na'],

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
  // ── Tên gọi chung theo cặp/bộ (W6b — W9-pilot thấy mỗi phiên dịch tự chọn một kiểu) ─────────────
  ['khai', 'Tuần Không', '旬空', 'Xun Kong'],
  ['khai', 'Triệt Không', '截空', 'Jie Kong'],
  ['khai', 'Triệt Lộ Không Vong', '截路空亡', 'Jie Lu Kong Wang'],
  ['khai', 'Tả Hữu', '左右', 'Zuo You'],
  ['khai', 'Xương Khúc', '昌曲', 'Chang Qu'],
  ['khai', 'Không Kiếp', '空劫', 'Kong Jie'],
  ['khai', 'Tử Phủ', '紫府', 'Zi Fu'],
  ['khai', 'Hổ Long Phượng', '虎龍鳳', 'Hu Long Feng'],
  ['khai', 'Nhật Nguyệt', '日月', 'Ri Yue'],
  ['khai', 'Tham Vũ', '貪武', 'Tan Wu'],
  ['khai', 'Phủ Tướng triều viên', '府相朝垣', 'Fu Xiang Chao Yuan'],
  // Thứ tự chữ đảo so với dạng chuẩn 府相朝垣 nhưng tên Việt viết cả hai kiểu — cùng một chữ Hán.
  ['khai', 'Tướng Phủ triều viên', '府相朝垣', 'Fu Xiang Chao Yuan'],
  ['khai', 'Cự Cơ Mão Dậu', '巨機卯酉', 'Ju Ji Mao You'],
  ['khai', 'Lưu Thái Tuế', '流太歲', 'Liu Tai Sui'],
  // ── Sao lưu năm xem (W15b) — tên đúng như engine `luuStars` trả. Hán = 流 + chữ Hán của sao gốc ở trên
  //    (không gõ chữ mới). Sách Hoa/Đài hay viết TẮT: 流祿 · 流羊 · 流陀 · 流馬 — chờ người duyệt chọn dạng hiển thị.
  ['khai', 'Lưu Lộc Tồn', '流祿存'],
  ['khai', 'Lưu Kình Dương', '流擎羊'],
  ['khai', 'Lưu Đà La', '流陀羅'],
  ['khai', 'Lưu Thiên Mã', '流天馬'],
  ['khai', 'Lưu Tang Môn', '流喪門'],
  ['khai', 'Lưu Bạch Hổ', '流白虎'],
  ['khai', 'Lưu Thiên Khốc', '流天哭'],
  ['khai', 'Lưu Thiên Hư', '流天虛'],
  ['khai', 'Lưu Hóa Lộc', '流化祿'],
  ['khai', 'Lưu Hóa Quyền', '流化權'],
  ['khai', 'Lưu Hóa Khoa', '流化科'],
  ['khai', 'Lưu Hóa Kỵ', '流化忌'],

  // ── 30 nạp âm (W15b) — tên đúng như khoá `NAP_AM_FULL` (phần trước ngoặc) của laso-chart.js / tuvi-grid.js ──
  ['napam', 'Hải Trung Kim', '海中金'],
  ['napam', 'Lô Trung Hỏa', '爐中火'],
  ['napam', 'Đại Lâm Mộc', '大林木'],
  ['napam', 'Lộ Bàng Thổ', '路旁土'],
  ['napam', 'Kiếm Phong Kim', '劍鋒金'],
  ['napam', 'Sơn Đầu Hỏa', '山頭火'],
  ['napam', 'Giản Hạ Thủy', '澗下水'],
  ['napam', 'Thành Đầu Thổ', '城頭土'],
  ['napam', 'Bạch Lạp Kim', '白蠟金'],
  ['napam', 'Dương Liễu Mộc', '楊柳木'],
  ['napam', 'Tuyền Trung Thủy', '泉中水'],
  ['napam', 'Ốc Thượng Thổ', '屋上土'],
  ['napam', 'Tích Lịch Hỏa', '霹靂火'],
  ['napam', 'Tùng Bách Mộc', '松柏木'],
  ['napam', 'Trường Lưu Thủy', '長流水'],
  ['napam', 'Sa Trung Kim', '沙中金'],
  ['napam', 'Sơn Hạ Hỏa', '山下火'],
  ['napam', 'Bình Địa Mộc', '平地木'],
  ['napam', 'Bích Thượng Thổ', '壁上土'],
  ['napam', 'Kim Bạch Kim', '金箔金'],
  ['napam', 'Phú Đăng Hỏa', '覆燈火'],
  ['napam', 'Thiên Hà Thủy', '天河水'],
  ['napam', 'Đại Dịch Thổ', '大驛土'],
  ['napam', 'Thoa Xuyến Kim', '釵釧金'],
  ['napam', 'Tang Đố Mộc', '桑柘木'],
  ['napam', 'Đại Khê Thủy', '大溪水'],
  ['napam', 'Sa Trung Thổ', '沙中土'],
  ['napam', 'Thiên Thượng Hỏa', '天上火'],
  ['napam', 'Thạch Lựu Mộc', '石榴木'],
  ['napam', 'Đại Hải Thủy', '大海水'],

  // ── Kỳ Môn (W15b) — engine lib/qimen trả chữ Hán 值符/值使; trùng tên Việt với sao Trực Phù (直符) của Tử Vi
  //    nên cờ 'x' (chỉ tra chính xác theo loại, không dò trong văn — văn có "Trực Phù" thì không biết là môn nào).
  ['kymon', 'Kỳ Môn Độn Giáp', '奇門遁甲', 'Qi Men Dun Jia'],
  //    ko: 值 (U+503C) không có kHangul trong Unihan; lấy kHangul của 値 (U+5024 — dạng chuẩn Nhật/Hàn của cùng chữ) = 치.
  ['kymon', 'Trực Phù', '值符', 'Zhi Fu (Chief)', 'x', { ko: '치부' }],
  // "Trực Sử" (值使) CHƯA đưa vào: Unihan chỉ ghi 使 = sứ, hanviet.ts cũng vậy ⇒ âm "sử" không kiểm được — chờ người duyệt.
  ['kymon', 'Cửu Tinh', '九星', 'Nine Stars'],
  ['kymon', 'Bát Môn', '八門', 'Eight Gates'],
  ['kymon', 'Bát Thần', '八神', 'Eight Deities'],

  // ── Đại Lục Nhâm (W15b) — engine lib/liuren/terms.ts: 初传/中传/末传 = Sơ/Trung/Mạt truyền; "phép THỦ truyền"
  //    = 12 pháp chọn truyền (贼克, 元首…) — 取 đọc "thủ", KHÁC "Sơ truyền". Không gộp hai mục.
  ['lucnham', 'Đại Lục Nhâm', '大六壬', 'Da Liu Ren'],
  ['lucnham', 'Tam Truyền', '三傳', 'Three Transmissions'],
  ['lucnham', 'Sơ truyền', '初傳', 'Initial Transmission'],
  ['lucnham', 'Trung truyền', '中傳', 'Middle Transmission'],
  ['lucnham', 'Mạt truyền', '末傳', 'Final Transmission'],
  ['lucnham', 'Thủ truyền', '取傳', 'transmission selection'],
  ['lucnham', 'Tứ Khóa', '四課', 'Four Lessons'],

  // ── Hoàng Lịch · làm nhà · cưới hỏi (W15b) ──
  ['lich', 'Hoàng Đạo', '黃道', 'auspicious (Huang Dao)'],
  ['lich', 'Hắc Đạo', '黑道', 'inauspicious (Hei Dao)'],
  ['lich', 'Kim Lâu', '金樓', 'Jin Lou'],
  ['lich', 'Hoang Ốc', '荒屋', 'Huang Wu'],
  ['lich', 'Tam Tai', '三災', 'Three Calamities (San Zai)'],

  // ── Bát Trạch + 8 du niên (W15b) — Thiên Y trùng tên sao Tử Vi (cùng chữ 天醫) ⇒ cờ 'x' ──
  ['battrach', 'Bát Trạch', '八宅', 'Eight Mansions (Ba Zhai)'],
  ['battrach', 'Bát Trạch Minh Kính', '八宅明鏡', 'Ba Zhai Ming Jing'],
  ['battrach', 'Bát Tinh', '八星', 'Eight Stars'],
  ['battrach', 'Sinh Khí', '生氣', 'Sheng Qi'],
  ['battrach', 'Thiên Y', '天醫', 'Tian Yi', 'x'],
  ['battrach', 'Diên Niên', '延年', 'Yan Nian'],
  ['battrach', 'Phục Vị', '伏位', 'Fu Wei'],
  ['battrach', 'Họa Hại', '禍害', 'Huo Hai'],
  ['battrach', 'Lục Sát', '六煞', 'Liu Sha'],
  ['battrach', 'Ngũ Quỷ', '五鬼', 'Wu Gui'],
  ['battrach', 'Tuyệt Mệnh', '絕命', 'Jue Ming'],

  // ── Tướng pháp: nhân tướng · khí sắc · thủ tướng · bút tướng (W15b) ──
  ['tuong', 'Ma Y Thần Tướng', '麻衣神相', 'Ma Yi Shen Xiang'],
  ['tuong', 'Ấn Đường', '印堂', 'Yin Tang (seal hall)'],
  ['tuong', 'Ngũ Quan', '五官', 'Five Features'],
  ['tuong', 'Ngũ Nhạc', '五嶽', 'Five Peaks'],
  ['tuong', 'Khí Sắc', '氣色', 'Qi Se (complexion)'],
  ['tuong', 'Thủ Tướng', '手相', 'palmistry'],
  ['tuong', 'Bút Tướng', '筆相', 'Bi Xiang (handwriting reading)'],

  // ── Mai Hoa Dịch Số (W15b) — Thể/Dụng đơn âm tiết ⇒ cờ 'x' ──
  ['maihoa', 'Thể', '體', 'Ti (Body)', 'x'],
  ['maihoa', 'Dụng', '用', 'Yong (Function)', 'x'],
  ['maihoa', 'Bản quái', '本卦', 'original hexagram'],
  ['maihoa', 'Biến quái', '變卦', 'changed hexagram'],
  ['maihoa', 'Hỗ quái', '互卦', 'nuclear hexagram'],
  ['maihoa', 'Động hào', '動爻', 'moving line'],

  // ── 28 tú (W15b) — tên đúng như engine `NHI_THAP_BAT_TU` (tuvi-engine/src/ngay-tot/constants.ts), đúng thứ tự.
  //    Đơn âm tiết, nhiều chữ trùng tên khác (Mão, Nguy, Tinh…) ⇒ cờ 'x': chỉ tra theo loại 'tu'.
  ['lich', 'Nhị Thập Bát Tú', '二十八宿', '28 Lunar Mansions'],
  ['tu', 'Giác', '角', '', 'x'],
  ['tu', 'Cang', '亢', '', 'x'],
  ['tu', 'Đê', '氐', '', 'x'],
  ['tu', 'Phòng', '房', '', 'x'],
  ['tu', 'Tâm', '心', '', 'x'],
  ['tu', 'Vĩ', '尾', '', 'x'],
  ['tu', 'Cơ', '箕', '', 'x'],
  ['tu', 'Đẩu', '斗', '', 'x'],
  ['tu', 'Ngưu', '牛', '', 'x'],
  ['tu', 'Nữ', '女', '', 'x'],
  ['tu', 'Hư', '虛', '', 'x'],
  ['tu', 'Nguy', '危', '', 'x'],
  ['tu', 'Thất', '室', '', 'x'],
  ['tu', 'Bích', '壁', '', 'x'],
  ['tu', 'Khuê', '奎', '', 'x'],
  ['tu', 'Lâu', '婁', '', 'x'],
  ['tu', 'Vị', '胃', '', 'x'],
  ['tu', 'Mão', '昴', '', 'x'],
  ['tu', 'Tất', '畢', '', 'x'],
  ['tu', 'Chủy', '觜', '', 'x'],
  ['tu', 'Sâm', '參', '', 'x'],
  ['tu', 'Tỉnh', '井', '', 'x'],
  ['tu', 'Quỷ', '鬼', '', 'x'],
  ['tu', 'Liễu', '柳', '', 'x'],
  ['tu', 'Tinh', '星', '', 'x'],
  ['tu', 'Trương', '張', '', 'x'],
  ['tu', 'Dực', '翼', '', 'x'],
  ['tu', 'Chẩn', '軫', '', 'x'],
  // ── 12 trực (W15b) — tên đúng như engine `TRUC_LIST`, đúng thứ tự Kiến…Bế. Đơn âm tiết ⇒ cờ 'x'.
  ['truc', 'Kiến', '建', '', 'x'],
  ['truc', 'Trừ', '除', '', 'x'],
  ['truc', 'Mãn', '滿', '', 'x'],
  ['truc', 'Bình', '平', '', 'x'],
  ['truc', 'Định', '定', '', 'x'],
  ['truc', 'Chấp', '執', '', 'x'],
  ['truc', 'Phá', '破', '', 'x'],
  ['truc', 'Nguy', '危', '', 'x'],
  ['truc', 'Thành', '成', '', 'x'],
  ['truc', 'Thu', '收', '', 'x'],
  ['truc', 'Khai', '開', '', 'x'],
  ['truc', 'Bế', '閉', '', 'x'],
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
