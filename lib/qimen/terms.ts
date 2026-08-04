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
import { HAN_VIET, phienAm, canChiViet } from '../hanviet';

// Bảng phiên Hán-Việt nay nằm ở `lib/hanviet.ts` (dùng chung với Hoàng Lịch).
// Re-export để mọi nơi đang import từ đây không phải sửa.
export { HAN_VIET, phienAm, canChiViet };


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
