/**
 * lib/liuren/terms.ts — tầng DỊCH của Đại Lục Nhâm (大六壬).
 *
 * Bề mặt đo được trên 4.380 quẻ (cả năm 2026 × 12 khung giờ):
 * 12 thiên tướng · 12 pháp thủ truyền · 4 dạng truyền · 49 khóa thể ·
 * 13 thần sát · 5 vượng suy · 11 quan hệ ngũ hành.
 *
 * Cùng hai cách dịch như Kỳ Môn và Hoàng Lịch: thuật ngữ CẤU TRÚC dịch kèm
 * nghĩa; TÊN RIÊNG khóa thể thì phiên theo chữ (sách Lục Nhâm tiếng Việt vốn
 * gọi đúng tên đó).
 */
import { phienAm, canChiViet } from '../hanviet';

export { phienAm, canChiViet };

export type Muc = 'cat' | 'hung' | 'binh';

/**
 * 12 THIÊN TƯỚNG.
 *
 * 🔑 Tên + mô tả LẤY NGUYÊN từ `public/tools-shared/luc-nham.js` (bản đang
 * chạy) chứ không viết lại — người dùng cũ đọc quen bộ chữ đó, và hai bản mô tả
 * song song thì sớm muộn cũng trôi khỏi nhau.
 */
export const THIEN_TUONG: Record<string, { ten: string; muc: Muc; nghia: string }> = {
  贵人: { ten: 'Quý Nhân', muc: 'cat', nghia: 'Quý nhân xuất hiện, được giúp đỡ, vạn sự đại lợi' },
  螣蛇: { ten: 'Đằng Xà', muc: 'hung', nghia: 'Biến động bất ngờ, lo lắng, sự việc xoắn xuýt' },
  朱雀: { ten: 'Chu Tước', muc: 'hung', nghia: 'Khẩu thiệt, thị phi, văn thư rắc rối' },
  六合: { ten: 'Lục Hợp', muc: 'cat', nghia: 'Hợp tác, ký kết, hôn nhân thuận lợi' },
  勾陈: { ten: 'Câu Trần', muc: 'hung', nghia: 'Cản trở, trì trệ, mắc kẹt; kỵ tranh kiện' },
  青龙: { ten: 'Thanh Long', muc: 'cat', nghia: 'Tài lộc dồi dào, phú quý, mọi việc hanh thông' },
  天空: { ten: 'Thiên Không', muc: 'hung', nghia: 'Hư không, thất thoát, lời hứa không thành' },
  白虎: { ten: 'Bạch Hổ', muc: 'hung', nghia: 'Sát khí, tai họa, bệnh tật; cẩn thận đi lại' },
  太常: { ten: 'Thái Thường', muc: 'cat', nghia: 'Tài lộc ổn định, hội hợp vui vẻ, ẩm thực' },
  玄武: { ten: 'Huyền Vũ', muc: 'hung', nghia: 'Trộm cắp, gian lận, bí mật bị lộ' },
  太阴: { ten: 'Thái Âm', muc: 'cat', nghia: 'Bí mật thuận lợi, nữ giới phù trợ, lợi mưu kế lâu dài' },
  天后: { ten: 'Thiên Hậu', muc: 'cat', nghia: 'Phúc đức, thuận hòa, vạn vật phát triển' },
};

/** 9 tông môn thủ truyền + biến thể phản ngâm. */
export const PHAP_THU_TRUYEN: Record<string, { ten: string; nghia: string }> = {
  贼克: { ten: 'Tặc Khắc', nghia: 'tứ khóa có trên dưới tương khắc — dưới khắc trên là Trùng Thẩm, trên khắc dưới là Nguyên Thủ' },
  元首: { ten: 'Nguyên Thủ', nghia: 'trên khắc dưới, việc thuận chiều, chủ động' },
  重审: { ten: 'Trùng Thẩm', nghia: 'dưới khắc trên, việc nghịch chiều, phải xét lại' },
  比用: { ten: 'Tỷ Dụng', nghia: 'nhiều chỗ khắc, lấy chỗ cùng âm dương với can ngày' },
  知一: { ten: 'Tri Nhất', nghia: 'cùng phép Tỷ Dụng — chọn một mối trong nhiều mối' },
  '知一/比用': { ten: 'Tri Nhất / Tỷ Dụng', nghia: 'nhiều chỗ khắc, chọn chỗ cùng âm dương với can ngày' },
  涉害: { ten: 'Thiệp Hại', nghia: 'so mức chịu khắc sâu nông, lấy chỗ hại nặng nhất' },
  遥克: { ten: 'Dao Khắc', nghia: 'tứ khóa không có khắc trực tiếp, lấy chỗ khắc xa can ngày' },
  昴星: { ten: 'Mão Tinh', nghia: 'không có khắc nào, lấy theo phép Mão Tinh (dương ngày lấy Dậu, âm ngày lấy Mão)' },
  别责: { ten: 'Biệt Trách', nghia: 'tứ khóa khuyết, phải mượn chỗ khác phát dụng' },
  八专: { ten: 'Bát Chuyên', nghia: 'can chi cùng nhà, việc rối trong ngoài không rõ' },
  伏吟: { ten: 'Phục Ngâm', nghia: 'thiên bàn trùng địa bàn — việc đứng im, nên thủ không nên động' },
  返吟: { ten: 'Phản Ngâm', nghia: 'thiên bàn xung địa bàn — việc đảo lộn, đi lại đổi dời' },
};

export const DANG_TRUYEN: Record<string, { ten: string; nghia: string }> = {
  递传: { ten: 'Đệ truyền', nghia: 'ba truyền nối tiếp một mạch, việc diễn tiến tuần tự' },
  伏吟: { ten: 'Phục ngâm', nghia: 'ba truyền dẫm chỗ, việc giậm chân tại chỗ' },
  反吟: { ten: 'Phản ngâm', nghia: 'ba truyền xung nhau, việc đảo chiều' },
  回环: { ten: 'Hồi hoàn', nghia: 'ba truyền quay vòng, việc lặp lại chỗ cũ' },
};

/**
 * 40 khóa thể + 12 dạng "X phát dụng".
 *
 * ⚠️ Phải phủ TRỌN danh sách khóa thể tam truyền nguồn khai (13 quái/khóa) và
 * trọn bộ pháp thủ truyền cửu tông môn. `check:terms` đối chiếu tự động —
 * xem mục `tuvung-luc-nham`. Đừng thêm bằng cách chạy vài lá số rồi thấy đủ:
 * `铸印卦` từng lọt qua 4.392 khóa mẫu mà không lá nào sinh ra nó.
 */
export const KHOA_THE: Record<string, string> = {
  元首: 'Nguyên Thủ', 重审: 'Trùng Thẩm', 比用: 'Tỷ Dụng', 涉害: 'Thiệp Hại',
  别责: 'Biệt Trách', 八专: 'Bát Chuyên', 伏吟: 'Phục Ngâm', 反吟: 'Phản Ngâm',
  遥克: 'Dao Khắc', 昴星: 'Mão Tinh',
  返吟比用: 'Phản Ngâm Tỷ Dụng', 返吟重审: 'Phản Ngâm Trùng Thẩm',
  返吟元首: 'Phản Ngâm Nguyên Thủ', 返吟涉害: 'Phản Ngâm Thiệp Hại',
  遥克比用: 'Dao Khắc Tỷ Dụng', 遥克涉害: 'Dao Khắc Thiệp Hại',
  递传: 'Đệ Truyền', 回环: 'Hồi Hoàn',
  自任: 'Tự Nhiệm', 自信: 'Tự Tín', 无依: 'Vô Y', 无禄卦: 'Vô Lộc',
  蒿矢: 'Cao Thỉ', 弹射: 'Đạn Xạ', 虎视: 'Hổ Thị', 冬蛇掩目: 'Đông Xà Yểm Mục',
  三交卦: 'Tam Giao', 玄胎卦: 'Huyền Thai', 励德卦: 'Lệ Đức', 龙德课: 'Long Đức',
  斫轮卦: 'Chước Luân', 高盖乘轩卦: 'Cao Cái Thừa Hiên', 铸印卦: 'Chú Ấn',
  曲直卦: 'Khúc Trực', 炎上卦: 'Viêm Thượng', 稼穑卦: 'Giá Sắc',
  从革卦: 'Tòng Cách', 润下卦: 'Nhuận Hạ',
  传不逢空: 'Truyền không gặp Không', 空亡入传: 'Không Vong nhập truyền',
};

export const THAN_SAT: Record<string, { ten: string; muc: Muc; nghia: string }> = {
  驿马: { ten: 'Dịch Mã', muc: 'binh', nghia: 'đi lại, chuyển dời, thay đổi' },
  支马: { ten: 'Chi Mã', muc: 'binh', nghia: 'động theo chi ngày, việc phải đi' },
  天马: { ten: 'Thiên Mã', muc: 'cat', nghia: 'tin vui đến nhanh, việc chuyển động thuận' },
  劫煞: { ten: 'Kiếp Sát', muc: 'hung', nghia: 'mất mát, bị cướp đoạt' },
  亡神: { ten: 'Vong Thần', muc: 'hung', nghia: 'hao hụt ngầm, việc trôi mất' },
  咸池: { ten: 'Hàm Trì', muc: 'hung', nghia: 'tình cảm rối, tửu sắc' },
  破碎: { ten: 'Phá Toái', muc: 'hung', nghia: 'đổ vỡ, dở dang' },
  天罗: { ten: 'Thiên La', muc: 'hung', nghia: 'lưới trời, bị vây khốn' },
  地网: { ten: 'Địa Võng', muc: 'hung', nghia: 'lưới đất, khó thoát ra' },
  天德: { ten: 'Thiên Đức', muc: 'cat', nghia: 'phúc trời che chở, hóa hung' },
  月德: { ten: 'Nguyệt Đức', muc: 'cat', nghia: 'đức tháng phù trợ, giải hung' },
  日德: { ten: 'Nhật Đức', muc: 'cat', nghia: 'đức ngày phù trợ' },
  日禄: { ten: 'Nhật Lộc', muc: 'cat', nghia: 'lộc của can ngày, có phần hưởng' },
};

export const VUONG_SUY: Record<string, string> = {
  旺: 'vượng', 相: 'tướng', 休: 'hưu', 囚: 'tù', 死: 'tử',
};

export const HANH: Record<string, string> = {
  木: 'Mộc', 火: 'Hỏa', 土: 'Thổ', 金: 'Kim', 水: 'Thủy',
};

export const KHOA_TEN: Record<string, string> = {
  一课: 'Khóa 1', 二课: 'Khóa 2', 三课: 'Khóa 3', 四课: 'Khóa 4',
};

export const TRUYEN_TEN: Record<string, string> = {
  初传: 'Sơ truyền', 中传: 'Trung truyền', 末传: 'Mạt truyền',
};

/** `土生金` · `火克金` · `比和` → tiếng Việt. */
export function docQuanHe(raw: string): string {
  const s = String(raw || '');
  if (s === '比和') return 'tỷ hòa (cùng hành)';
  const m = /^(.)(生|克)(.)$/.exec(s);
  if (m) return `${HANH[m[1]!] || m[1]} ${m[2] === '生' ? 'sinh' : 'khắc'} ${HANH[m[3]!] || m[3]}`;
  return phienAm(s);
}

/**
 * Khóa thể: tra bảng, riêng dạng `X发用` thì ghép từ tên thiên tướng.
 *
 * 🐞 `mingyu-core` 0.1.24 sinh khóa thể GHÉP mới `伏吟重审` mà bảng không có ⇒
 * rơi về phiên âm từng chữ và lọt nguyên chữ `审` ra giao diện (*"Phục Ngâm
 * Trùng 审"*). Đây là lần thứ TƯ của cùng một họ lỗi trong track `mingyu-core`,
 * và `docPhap` ngay dưới đã phải vá đúng như vậy — chỉ `docKhoaThe` bị bỏ quên.
 * ⇒ Tách GHÉP TỔNG QUÁT: thử mọi chỗ cắt thành hai khóa thể đã biết. Nhờ vậy
 * `伏吟重审` đọc thành *"Phục Ngâm Trùng Thẩm"*, và lượt bump SAU có đẻ thêm
 * dạng ghép nào thì cũng đã có đường đọc.
 *
 * ⚠️ Bảng vẫn giữ mấy dạng ghép khai sẵn (`返吟重审`, `遥克涉害`…): tra đúng
 * nguyên chuỗi chạy TRƯỚC nên chúng vẫn thắng, và `返吟` không phải khóa đứng
 * một mình (bảng có `反吟`, khác chữ) nên bộ tách không thay chúng được.
 */
export function docKhoaThe(raw: string): string {
  const s = String(raw || '');
  if (KHOA_THE[s]) return KHOA_THE[s];
  if (s.endsWith('发用')) {
    const g = THIEN_TUONG[s.slice(0, -2)];
    return (g ? g.ten : phienAm(s.slice(0, -2))) + ' phát dụng';
  }
  for (let i = 1; i < s.length; i++) {
    const a = KHOA_THE[s.slice(0, i)];
    const b = KHOA_THE[s.slice(i)];
    if (a && b) return `${a} ${b}`;
  }
  return phienAm(s);
}

/**
 * `遥克法` → tên + nghĩa của phép thủ truyền. Bỏ hậu tố 法.
 *
 * 🐞 Bản đầu chỉ tách tiền tố `返吟` nên `遥克比用` / `遥克涉害` lọt chữ Hán ra
 * giao diện (bộ dò bắt được 146 + 12 lượt trên 4.380 khóa). Nay tách GHÉP
 * TỔNG QUÁT: thử mọi chỗ cắt thành hai phép đã biết. Đúng bài học #408 — bảng
 * dựng từ danh sách quan sát được thì phải chịu được cả dạng ghép của chúng.
 */
export function docPhap(raw: string): { ten: string; nghia: string } {
  const s = String(raw || '').replace(/法$/, '');
  if (PHAP_THU_TRUYEN[s]) return PHAP_THU_TRUYEN[s];
  for (let i = 1; i < s.length; i++) {
    const a = PHAP_THU_TRUYEN[s.slice(0, i)];
    const b = PHAP_THU_TRUYEN[s.slice(i)];
    if (a && b) return { ten: `${a.ten} ${b.ten}`, nghia: `${a.nghia}; kết hợp ${b.nghia}` };
  }
  return { ten: phienAm(s), nghia: '' };
}

export function docThanSat(raw: string): { ten: string; muc: Muc; nghia: string } {
  return THAN_SAT[raw] || { ten: phienAm(raw), muc: 'binh', nghia: '' };
}
