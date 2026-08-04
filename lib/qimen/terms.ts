/**
 * lib/qimen/terms.ts — TẦNG DỊCH của Kỳ Môn Độn Giáp.
 *
 * `mingyu-core` (MIT) lo phần KHÓ: định cục, an thiên/địa/nhân/thần bàn, tìm
 * trực phù trực sử. Nhưng nó trả TOÀN BỘ bằng chữ Hán. File này là lớp duy
 * nhất biết chữ Hán, đổi sang tiếng Việt trước khi bất cứ đâu khác chạm tới.
 *
 * 🔑 HAI CÁCH DỊCH, DÙNG CHO HAI LOẠI THUẬT NGỮ KHÁC NHAU:
 *
 * 1. Tầng CẤU TRÚC (8 môn · 8 sao · 8 thần · 9 cung · 10 can · 5 hành · 9
 *    phương) — bó hẹp, đo được đúng 63 mục trên 4.380 bàn quét cả năm. Dịch
 *    TAY, kèm luôn NGHĨA để trang tự giải thích được mà không cần LLM.
 *
 * 2. Tầng CÁCH CỤC (格) — 123 tên cách trên cùng lượt quét. KHÔNG dịch nghĩa
 *    từng cái: nhiều cách rất hiểm (织女寻牛, 华盖孛师…) mà bịa nghĩa cho một
 *    thuật ngữ cổ pháp còn tệ hơn để nguyên. Thay vào đó PHIÊN HÁN-VIỆT theo
 *    từng chữ — và đây không phải giải pháp chữa cháy: sách Kỳ Môn tiếng Việt
 *    vốn gọi đúng bằng tên Hán-Việt ("Thanh Long Phản Thủ", "Phi Điểu Điệt
 *    Huyệt"), nên phiên âm CHÍNH LÀ tên đúng. Phiên âm là xác định, không phải
 *    suy đoán.
 *
 * Cát/hung thì đã có sẵn trong chính chuỗi (`吉格:` / `凶格:`) nên không phải
 * đoán — chỉ tách tiền tố.
 */

/** 8 cửa (八門) — trục quan trọng nhất khi chọn hướng/giờ hành sự. */
export const CUA: Record<string, { ten: string; muc: 'cat' | 'hung' | 'binh'; nghia: string }> = {
  开门: { ten: 'Khai Môn', muc: 'cat', nghia: 'Mở ra, khởi sự, giao dịch, gặp người có quyền' },
  休门: { ten: 'Hưu Môn', muc: 'cat', nghia: 'Nghỉ ngơi, hòa hợp, cầu người giúp, việc êm' },
  生门: { ten: 'Sinh Môn', muc: 'cat', nghia: 'Sinh lợi, cầu tài, mua bán, khai trương' },
  伤门: { ten: 'Thương Môn', muc: 'hung', nghia: 'Tổn thương, tranh chấp, đòi nợ, kiện tụng' },
  杜门: { ten: 'Đỗ Môn', muc: 'binh', nghia: 'Bế tắc, che giấu, trốn tránh, hợp việc kín' },
  景门: { ten: 'Cảnh Môn', muc: 'binh', nghia: 'Phô bày, văn thư, thi cử, tin tức, quảng cáo' },
  死门: { ten: 'Tử Môn', muc: 'hung', nghia: 'Đình trệ, tang sự, chôn cất, việc chết cứng' },
  惊门: { ten: 'Kinh Môn', muc: 'hung', nghia: 'Kinh sợ, thị phi, khẩu thiệt, việc bất ngờ' },
};

/** 9 sao (九星) — mingyu chỉ trả 8 vì Thiên Cầm gửi ở trung cung. */
export const SAO: Record<string, { ten: string; muc: 'cat' | 'hung' | 'binh'; nghia: string }> = {
  天蓬: { ten: 'Thiên Bồng', muc: 'hung', nghia: 'Thủy, chủ trộm cắp, mưu ngầm, phiêu bạt' },
  天芮: { ten: 'Thiên Nhuế', muc: 'hung', nghia: 'Thổ, chủ bệnh tật, tai ách; nhưng hợp việc học' },
  天冲: { ten: 'Thiên Xung', muc: 'binh', nghia: 'Mộc, chủ động, xông pha, thích hợp ra quân' },
  天辅: { ten: 'Thiên Phụ', muc: 'cat', nghia: 'Mộc, chủ văn chương, giáo dục, được phù trợ' },
  天禽: { ten: 'Thiên Cầm', muc: 'cat', nghia: 'Thổ, ở trung cung, chủ trung chính, bao dung' },
  天心: { ten: 'Thiên Tâm', muc: 'cat', nghia: 'Kim, chủ y dược, mưu lược, người trên giúp' },
  天柱: { ten: 'Thiên Trụ', muc: 'hung', nghia: 'Kim, chủ ngăn trở, thủ thế, tranh biện' },
  天任: { ten: 'Thiên Nhậm', muc: 'cat', nghia: 'Thổ, chủ gánh vác, ruộng đất, việc bền' },
  天英: { ten: 'Thiên Anh', muc: 'binh', nghia: 'Hỏa, chủ rực rỡ nhất thời, hư danh, nóng vội' },
};

/** 8 thần (八神). */
export const THAN: Record<string, { ten: string; muc: 'cat' | 'hung' | 'binh'; nghia: string }> = {
  值符: { ten: 'Trực Phù', muc: 'cat', nghia: 'Thần đứng đầu, quý nhân, mọi việc được che chở' },
  螣蛇: { ten: 'Đằng Xà', muc: 'hung', nghia: 'Quái dị, hư kinh, việc xoắn xuýt không rõ' },
  太阴: { ten: 'Thái Âm', muc: 'cat', nghia: 'Âm thầm, mưu kín, được người ngầm giúp' },
  六合: { ten: 'Lục Hợp', muc: 'cat', nghia: 'Hòa hợp, hôn nhân, hợp tác, trung gian' },
  白虎: { ten: 'Bạch Hổ', muc: 'hung', nghia: 'Hung dữ, tranh đấu, đường xá, tai nạn' },
  玄武: { ten: 'Huyền Vũ', muc: 'hung', nghia: 'Trộm cắp, lừa dối, mất mát ngầm' },
  九地: { ten: 'Cửu Địa', muc: 'cat', nghia: 'Bền vững, ẩn giấu, phòng thủ, giữ của' },
  九天: { ten: 'Cửu Thiên', muc: 'cat', nghia: 'Cao rộng, tiến thủ, xuất hành, dương danh' },
};

/** 10 thiên can. Giáp ẩn trong lục nghi nên bàn hiếm khi hiện 甲. */
export const CAN: Record<string, string> = {
  甲: 'Giáp', 乙: 'Ất', 丙: 'Bính', 丁: 'Đinh', 戊: 'Mậu',
  己: 'Kỷ', 庚: 'Canh', 辛: 'Tân', 壬: 'Nhâm', 癸: 'Quý',
};

/** 12 địa chi. */
export const CHI: Record<string, string> = {
  子: 'Tý', 丑: 'Sửu', 寅: 'Dần', 卯: 'Mão', 辰: 'Thìn', 巳: 'Tỵ',
  午: 'Ngọ', 未: 'Mùi', 申: 'Thân', 酉: 'Dậu', 戌: 'Tuất', 亥: 'Hợi',
};

/** 24 tiết khí — engine trả tên tiết đang trị, dùng để định cục. */
export const TIET_KHI: Record<string, string> = {
  立春: 'Lập Xuân', 雨水: 'Vũ Thủy', 惊蛰: 'Kinh Trập', 春分: 'Xuân Phân',
  清明: 'Thanh Minh', 谷雨: 'Cốc Vũ', 立夏: 'Lập Hạ', 小满: 'Tiểu Mãn',
  芒种: 'Mang Chủng', 夏至: 'Hạ Chí', 小暑: 'Tiểu Thử', 大暑: 'Đại Thử',
  立秋: 'Lập Thu', 处暑: 'Xử Thử', 白露: 'Bạch Lộ', 秋分: 'Thu Phân',
  寒露: 'Hàn Lộ', 霜降: 'Sương Giáng', 立冬: 'Lập Đông', 小雪: 'Tiểu Tuyết',
  大雪: 'Đại Tuyết', 冬至: 'Đông Chí', 小寒: 'Tiểu Hàn', 大寒: 'Đại Hàn',
};

/** Thượng/trung/hạ nguyên — mỗi tiết khí chia ba nguyên, mỗi nguyên một cục. */
export const NGUYEN: Record<string, string> = {
  上元: 'thượng nguyên', 中元: 'trung nguyên', 下元: 'hạ nguyên',
};

/**
 * Đổi một cặp can chi Hán ("丙午") sang tiếng Việt ("Bính Ngọ").
 *
 * 🐞 Vì sao có hàm RIÊNG chứ không dùng `phienAm`: bảng `HAN_VIET` dựng từ chữ
 * trong TÊN CÁCH CỤC, mà địa chi thì không xuất hiện ở đó — nên `phienAm` trả
 * ra "Bính 午", chữ Hán lọt thẳng ra giao diện. Bắt được khi gọi route thật.
 */
export function canChiViet(han: string): string {
  const s = String(han || '');
  const out = Array.from(s).map((c) => CAN[c] || CHI[c] || HAN_VIET[c] || c);
  return out.join(' ').trim();
}

/** Ất Bính Đinh = TAM KỲ, trục cát lợi nhất của môn này. */
export const TAM_KY: Record<string, string> = {
  乙: 'Nhật Kỳ', 丙: 'Nguyệt Kỳ', 丁: 'Tinh Kỳ',
};

export const HANH: Record<string, string> = {
  水: 'Thủy', 土: 'Thổ', 木: 'Mộc', 金: 'Kim', 火: 'Hỏa',
};

export const PHUONG: Record<string, string> = {
  正北: 'Chính Bắc', 东北: 'Đông Bắc', 正东: 'Chính Đông', 东南: 'Đông Nam',
  中央: 'Trung cung', 西南: 'Tây Nam', 正西: 'Chính Tây', 西北: 'Tây Bắc',
  正南: 'Chính Nam',
};

export const CUNG: Record<string, string> = {
  坎一宫: 'Khảm 1', 坤二宫: 'Khôn 2', 震三宫: 'Chấn 3', 巽四宫: 'Tốn 4',
  中五宫: 'Trung 5', 乾六宫: 'Càn 6', 兑七宫: 'Đoài 7', 艮八宫: 'Cấn 8',
  离九宫: 'Ly 9',
};

/**
 * Bảng phiên HÁN-VIỆT — phủ đúng 145 chữ đo được trong 123 tên cách cục trên
 * 4.380 bàn quét cả năm 2026. Thêm vài chữ dự phòng.
 *
 * Chữ nào KHÔNG có trong bảng thì giữ nguyên (xem `phienAm`) — thà lộ ra một
 * chữ Hán để lần sau bổ sung, còn hơn nuốt mất rồi tên cách cụt đi mà không ai
 * biết.
 */
export const HAN_VIET: Record<string, string> = {
  星: 'Tinh', 奇: 'Kỳ', 受: 'Thụ', 制: 'Chế', 时: 'Thời', 干: 'Can', 勃: 'Bột',
  格: 'Cách', 己: 'Kỷ', 击: 'Kích', 刑: 'Hình', 月: 'Nguyệt', 日: 'Nhật',
  伏: 'Phục', 太: 'Thái', 白: 'Bạch', 狱: 'Ngục', 入: 'Nhập', 自: 'Tự',
  门: 'Môn', 迫: 'Bách', 地: 'Địa', 网: 'Võng', 四: 'Tứ', 张: 'Trương',
  天: 'Thiên', 墓: 'Mộ', 乙: 'Ất', 岁: 'Tuế', 辛: 'Tân', 蛇: 'Xà', 螣: 'Đằng',
  飞: 'Phi', 空: 'Không', 龙: 'Long', 遁: 'Độn', 生: 'Sinh', 宫: 'Cung',
  朱: 'Chu', 雀: 'Tước', 江: 'Giang', 庚: 'Canh', 荧: 'Huỳnh', 骑: 'Kỵ',
  青: 'Thanh', 罗: 'La', 壬: 'Nhâm', 丙: 'Bính', 牢: 'Lao', 小: 'Tiểu',
  亭: 'Đình', 阴: 'Âm', 中: 'Trung', 返: 'Phản', 阳: 'Dương', 虎: 'Hổ',
  伤: 'Thương', 魂: 'Hồn', 神: 'Thần', 丁: 'Đinh', 夭: 'Yểu', 矫: 'Kiểu',
  冶: 'Dã', 炉: 'Lô', 猖: 'Xương', 狂: 'Cuồng', 戊: 'Mậu', 符: 'Phù',
  逃: 'Đào', 走: 'Tẩu', 孛: 'Bột', 乱: 'Loạn', 来: 'Lai', 临: 'Lâm',
  高: 'Cao', 投: 'Đầu', 合: 'Hợp', 惑: 'Hoặc', 癸: 'Quý', 织: 'Chức',
  女: 'Nữ', 寻: 'Tầm', 牛: 'Ngưu', 万: 'Vạn', 事: 'Sự', 皆: 'Giai',
  屯: 'Truân', 华: 'Hoa', 盖: 'Cái', 师: 'Sư', 玄: 'Huyền', 武: 'Vũ',
  不: 'Bất', 明: 'Minh', 困: 'Khốn', 遭: 'Tao', 复: 'Phục', 见: 'Kiến',
  大: 'Đại', 人: 'Nhân', 真: 'Chân', 诈: 'Trá', 为: 'Vi', 遮: 'Già',
  蔽: 'Tế', 使: 'Sứ', 同: 'Đồng', 出: 'Xuất', 户: 'Hộ', 逢: 'Phùng',
  鬼: 'Quỷ', 凶: 'Hung', 火: 'Hỏa', 三: 'Tam', 游: 'Du', 六: 'Lục',
  仪: 'Nghi', 相: 'Tương', 佐: 'Tá', 首: 'Thủ', 雾: 'Vụ', 重: 'Trùng',
  升: 'Thăng', 殿: 'Điện', 之: 'Chi', 勾: 'Câu', 化: 'Hóa', 直: 'Trực',
  得: 'Đắc', 休: 'Hưu', 木: 'Mộc', 宝: 'Bảo', 鉴: 'Giám', 鸟: 'Điểu',
  跌: 'Điệt', 穴: 'Huyệt', 灵: 'Linh', 云: 'Vân', 守: 'Thủ', 玉: 'Ngọc',
  耀: 'Diệu', 光: 'Quang', 精: 'Tinh', 佑: 'Hựu', 浮: 'Phù',
  // dự phòng cho chữ có thể xuất hiện ở năm khác
  甲: 'Giáp', 开: 'Khai', 景: 'Cảnh', 死: 'Tử', 惊: 'Kinh', 杜: 'Đỗ',
  水: 'Thủy', 金: 'Kim', 土: 'Thổ', 值: 'Trực', 九: 'Cửu', 五: 'Ngũ',
};

/** Phiên một chuỗi Hán sang Hán-Việt, cách nhau bằng dấu cách. */
export function phienAm(han: string): string {
  return Array.from(String(han || ''))
    .map((c) => HAN_VIET[c] || c)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách một `reason` của mingyu thành mục đọc được.
 * Dạng gặp: `吉格:青龙返首` · `凶格:门迫` · `惊门` · `空亡` · `值九天`.
 */
export function docReason(raw: string): { ten: string; muc: 'cat' | 'hung' | 'binh' } {
  const s = String(raw || '');
  const i = s.indexOf(':');
  if (i > 0) {
    const dau = s.slice(0, i);
    const ten = s.slice(i + 1);
    return { ten: phienAm(ten), muc: dau === '吉格' ? 'cat' : dau === '凶格' ? 'hung' : 'binh' };
  }
  if (CUA[s]) return { ten: CUA[s].ten, muc: CUA[s].muc };
  if (THAN[s]) return { ten: THAN[s].ten, muc: THAN[s].muc };
  if (SAO[s]) return { ten: SAO[s].ten, muc: SAO[s].muc };
  if (s === '空亡') return { ten: 'Tuần Không', muc: 'hung' };
  if (s.startsWith('值')) {
    const g = s.slice(1);
    const th = Object.values(THAN).find((t) => t.ten === phienAm(g));
    return { ten: 'Trực ' + (th ? th.ten : phienAm(g)), muc: 'binh' };
  }
  return { ten: phienAm(s), muc: 'binh' };
}

/** Nhóm việc mingyu gợi ý cho một phương — dịch sang lời thường. */
export const VIEC: Record<string, string> = {
  '宜避之方': 'Nên tránh hướng này',
  '求官/事业/求职': 'Cầu quan chức, sự nghiệp, xin việc',
  '休养/安宁/关系': 'Nghỉ dưỡng, cầu an, hàn gắn quan hệ',
  '求财/合作/投资': 'Cầu tài, hợp tác, đầu tư',
  '休养/安宁/关系/急难见贵': 'Nghỉ dưỡng, cầu an, quan hệ; gặp nạn thì cầu quý nhân',
  '求官/事业/求职/急难见贵': 'Cầu quan chức, sự nghiệp, xin việc; gặp nạn thì cầu quý nhân',
  '求财/合作/投资/急难见贵': 'Cầu tài, hợp tác, đầu tư; gặp nạn thì cầu quý nhân',
};

export function docViec(raw: string): string {
  return VIEC[String(raw || '')] || phienAm(String(raw || ''));
}
