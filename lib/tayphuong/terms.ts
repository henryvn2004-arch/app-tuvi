/**
 * lib/tayphuong/terms.ts — thuật ngữ chiêm tinh Tây, tiếng Việt.
 *
 * ⚠️ ĐÂY LÀ MÔN KHÁC HẲN phần còn lại của site. Không có chữ Hán, không có cổ
 * pháp Á Đông — nên KHÔNG dùng `lib/hanviet.ts`. Nguyên tắc dịch cũng khác: tên
 * cung hoàng đạo và hành tinh đã có tên Việt phổ thông (Bạch Dương, Kim Tinh),
 * dùng đúng tên đó thay vì phiên âm.
 *
 * 🔑 NÓI RÕ ĐÂY KHÔNG PHẢI TỬ VI. Hai hệ dùng những chữ nghe giống nhau ("cung",
 * "nhà", "mệnh") nhưng chỉ những thứ hoàn toàn khác. Trang và prompt đều phải
 * nói thẳng để người đọc không đem đối chiếu với lá số Tử Vi của chính họ.
 */

export const CUNG: { ten: string; en: string; kyHieu: string; hanh: string; the: string }[] = [
  { ten: 'Bạch Dương', en: 'Aries', kyHieu: '♈', hanh: 'Hỏa', the: 'Khởi phát' },
  { ten: 'Kim Ngưu', en: 'Taurus', kyHieu: '♉', hanh: 'Thổ', the: 'Cố định' },
  { ten: 'Song Tử', en: 'Gemini', kyHieu: '♊', hanh: 'Khí', the: 'Biến đổi' },
  { ten: 'Cự Giải', en: 'Cancer', kyHieu: '♋', hanh: 'Thủy', the: 'Khởi phát' },
  { ten: 'Sư Tử', en: 'Leo', kyHieu: '♌', hanh: 'Hỏa', the: 'Cố định' },
  { ten: 'Xử Nữ', en: 'Virgo', kyHieu: '♍', hanh: 'Thổ', the: 'Biến đổi' },
  { ten: 'Thiên Bình', en: 'Libra', kyHieu: '♎', hanh: 'Khí', the: 'Khởi phát' },
  { ten: 'Thiên Yết', en: 'Scorpio', kyHieu: '♏', hanh: 'Thủy', the: 'Cố định' },
  { ten: 'Nhân Mã', en: 'Sagittarius', kyHieu: '♐', hanh: 'Hỏa', the: 'Biến đổi' },
  { ten: 'Ma Kết', en: 'Capricorn', kyHieu: '♑', hanh: 'Thổ', the: 'Khởi phát' },
  { ten: 'Bảo Bình', en: 'Aquarius', kyHieu: '♒', hanh: 'Khí', the: 'Cố định' },
  { ten: 'Song Ngư', en: 'Pisces', kyHieu: '♓', hanh: 'Thủy', the: 'Biến đổi' },
];

export const HANH_TINH: Record<string, { ten: string; kyHieu: string; nghia: string; chinh: boolean }> = {
  Sun: { ten: 'Mặt Trời', kyHieu: '☉', nghia: 'cái tôi cốt lõi, ý chí, hướng đi của đời', chinh: true },
  Moon: { ten: 'Mặt Trăng', kyHieu: '☽', nghia: 'cảm xúc, nhu cầu an toàn, phản xạ bản năng', chinh: true },
  Mercury: { ten: 'Sao Thủy', kyHieu: '☿', nghia: 'cách nghĩ, cách nói, học và trao đổi', chinh: true },
  Venus: { ten: 'Sao Kim', kyHieu: '♀', nghia: 'tình cảm, thẩm mỹ, tiền bạc, thứ mình quý', chinh: true },
  Mars: { ten: 'Sao Hỏa', kyHieu: '♂', nghia: 'động lực, hành động, cách tranh đấu', chinh: true },
  Jupiter: { ten: 'Sao Mộc', kyHieu: '♃', nghia: 'mở rộng, may mắn, niềm tin, tầm nhìn', chinh: true },
  Saturn: { ten: 'Sao Thổ', kyHieu: '♄', nghia: 'kỷ luật, giới hạn, trách nhiệm, bài học đời', chinh: true },
  Uranus: { ten: 'Thiên Vương', kyHieu: '♅', nghia: 'đột phá, khác người, thay đổi bất ngờ', chinh: true },
  Neptune: { ten: 'Hải Vương', kyHieu: '♆', nghia: 'mơ mộng, trực giác, ảo tưởng, tâm linh', chinh: true },
  Pluto: { ten: 'Diêm Vương', kyHieu: '♇', nghia: 'chuyển hóa tận gốc, quyền lực, ám ảnh', chinh: true },
  Chiron: { ten: 'Chiron', kyHieu: '⚷', nghia: 'vết thương cũ và khả năng chữa lành cho người khác', chinh: false },
  Ceres: { ten: 'Ceres', kyHieu: '⚳', nghia: 'nuôi dưỡng, chăm sóc', chinh: false },
  Pallas: { ten: 'Pallas', kyHieu: '⚴', nghia: 'trí lược, nhận dạng quy luật', chinh: false },
  Juno: { ten: 'Juno', kyHieu: '⚵', nghia: 'cam kết, hôn nhân', chinh: false },
  Vesta: { ten: 'Vesta', kyHieu: '⚶', nghia: 'sự tận hiến, thứ mình giữ lửa', chinh: false },
  // 🐞 Bốn tên dưới KHÔNG nằm trong danh sách `planets` mà chỉ xuất hiện trong
  // khía cạnh và hình thế — nên bản đầu để lọt "True North Node", "Mean Lilith"
  // ra giao diện tiếng Việt. Đúng bài học bảng dịch dựng từ MỘT nguồn thì chỉ
  // phủ nguồn đó; bộ dò rò rỉ chữ Anh nay quét cả hai chỗ.
  'True North Node': { ten: 'La Hầu', kyHieu: '☊', nghia: 'hướng đời cần đi tới', chinh: false },
  'True South Node': { ten: 'Kế Đô', kyHieu: '☋', nghia: 'thứ đã quen tay, dễ ỷ lại', chinh: false },
  'Mean Lilith': { ten: 'Lilith', kyHieu: '⚸', nghia: 'phần bị dồn nén, bản năng không được thừa nhận', chinh: false },
  'True Lilith': { ten: 'Lilith (chân)', kyHieu: '⚸', nghia: 'phần bị dồn nén, bản năng không được thừa nhận', chinh: false },
};

export const DIEM: Record<string, { ten: string; nghia: string }> = {
  Ascendant: { ten: 'Cung Mọc (ASC)', nghia: 'vẻ ngoài, ấn tượng đầu, cách mình bước vào đời' },
  Midheaven: { ten: 'Thiên Đỉnh (MC)', nghia: 'sự nghiệp, danh tiếng, điều mình hướng tới' },
  Descendant: { ten: 'Cung Lặn (DSC)', nghia: 'đối tác, người mình bị hút về' },
  'Imum Coeli': { ten: 'Thiên Để (IC)', nghia: 'gốc rễ, gia đình, chốn riêng tư' },
  'North Node': { ten: 'La Hầu (Bắc Giao Điểm)', nghia: 'hướng đời cần đi tới, việc còn phải học' },
  'South Node': { ten: 'Kế Đô (Nam Giao Điểm)', nghia: 'thứ đã quen tay, dễ ỷ lại' },
};

/** 12 nhà — lĩnh vực đời sống. */
export const NHA: { so: number; ten: string; nghia: string }[] = [
  { so: 1, ten: 'Nhà 1 — Bản thân', nghia: 'diện mạo, tính khí, cách khởi đầu' },
  { so: 2, ten: 'Nhà 2 — Tài sản', nghia: 'tiền tự kiếm, giá trị bản thân' },
  { so: 3, ten: 'Nhà 3 — Giao tiếp', nghia: 'anh em, học hành gần, đi lại ngắn' },
  { so: 4, ten: 'Nhà 4 — Gia đạo', nghia: 'cha mẹ, nhà cửa, cội rễ' },
  { so: 5, ten: 'Nhà 5 — Sáng tạo', nghia: 'tình yêu, con cái, vui chơi' },
  { so: 6, ten: 'Nhà 6 — Công việc', nghia: 'việc hằng ngày, sức khỏe, nề nếp' },
  { so: 7, ten: 'Nhà 7 — Hôn nhân', nghia: 'bạn đời, đối tác, hợp đồng' },
  { so: 8, ten: 'Nhà 8 — Biến hóa', nghia: 'tiền chung, thừa kế, khủng hoảng và tái sinh' },
  { so: 9, ten: 'Nhà 9 — Viễn du', nghia: 'học cao, xuất ngoại, tín ngưỡng' },
  { so: 10, ten: 'Nhà 10 — Sự nghiệp', nghia: 'chức phận, danh tiếng, thành tựu ngoài đời' },
  { so: 11, ten: 'Nhà 11 — Bạn bè', nghia: 'cộng đồng, hội nhóm, ước vọng' },
  { so: 12, ten: 'Nhà 12 — Ẩn tàng', nghia: 'tiềm thức, ẩn khuất, buông bỏ' },
];

export const GOC: Record<string, { ten: string; kyHieu: string; muc: 'hoa' | 'cang' | 'trung'; nghia: string }> = {
  conjunction: { ten: 'Trùng tụ', kyHieu: '☌', muc: 'trung', nghia: 'hai sao dính nhau — trộn tính chất, khuếch đại' },
  opposition: { ten: 'Đối xung', kyHieu: '☍', muc: 'cang', nghia: 'kéo hai đầu — phải cân bằng, dễ giằng co' },
  trine: { ten: 'Tam hợp', kyHieu: '△', muc: 'hoa', nghia: 'thuận, tài năng sẵn có, dễ đến mức dễ lười' },
  square: { ten: 'Vuông góc', kyHieu: '□', muc: 'cang', nghia: 'va chạm — sinh áp lực nhưng cũng sinh động lực' },
  sextile: { ten: 'Lục hợp', kyHieu: '⚹', muc: 'hoa', nghia: 'cơ hội, thuận nếu chủ động nắm' },
  quincunx: { ten: 'Bất hợp', kyHieu: '⚻', muc: 'cang', nghia: 'hai bên khó dung, phải liên tục chỉnh' },
  semisextile: { ten: 'Bán lục hợp', kyHieu: '⚺', muc: 'trung', nghia: 'liên hệ nhẹ, hơi khó chịu' },
  semisquare: { ten: 'Bán vuông', kyHieu: '∠', muc: 'cang', nghia: 'cọ xát nhỏ, gây bực' },
  sesquiquadrate: { ten: 'Vuông rưỡi', kyHieu: '⚼', muc: 'cang', nghia: 'căng thẳng dồn nén' },
  quintile: { ten: 'Ngũ phân', kyHieu: 'Q', muc: 'hoa', nghia: 'tài năng riêng, khiếu đặc biệt' },
  biquintile: { ten: 'Song ngũ phân', kyHieu: 'bQ', muc: 'hoa', nghia: 'khiếu riêng thể hiện gián tiếp' },
};

export const HANH_VI: Record<string, string> = {
  fire: 'Hỏa', earth: 'Thổ', air: 'Khí', water: 'Thủy',
};

export const THE_VI: Record<string, string> = {
  cardinal: 'Khởi phát', fixed: 'Cố định', mutable: 'Biến đổi',
};

export const PHAM_VI: Record<string, string> = {
  Domicile: 'Đắc địa (nhà mình)',
  Exaltation: 'Vượng địa',
  Detriment: 'Hãm địa',
  Fall: 'Thất thế',
  Peregrine: 'Bình thường',
};

export const HINH_THE: Record<string, { ten: string; nghia: string }> = {
  'Grand Trine': { ten: 'Đại Tam Hợp', nghia: 'ba sao hợp thành tam giác đều — tài năng sẵn, nhưng dễ ỷ vào nó' },
  'T-Square': { ten: 'Chữ T', nghia: 'hai sao đối xung cùng vuông góc sao thứ ba — nguồn căng thẳng chính của lá số' },
  'Grand Cross': { ten: 'Đại Thập Tự', nghia: 'bốn sao khóa nhau — áp lực bốn phía, bù lại rất bền' },
  Stellium: { ten: 'Chùm sao', nghia: 'ba sao trở lên dồn một chỗ — dồn sức mạnh vào đúng lĩnh vực đó' },
  Yod: { ten: 'Ngón tay Trời', nghia: 'hai sao lục hợp cùng bất hợp sao thứ ba — hướng đi bị vặn, thường lộ muộn' },
  'Mystic Rectangle': { ten: 'Hình chữ nhật', nghia: 'căng và thuận đan xen, có lối giải cho mâu thuẫn' },
  'Kite': { ten: 'Cánh diều', nghia: 'đại tam hợp có thêm điểm đối xung — tài năng có chỗ để phát ra' },
};

export function docCung(i: number) {
  return CUNG[((i % 12) + 12) % 12]!;
}

export function docHanhTinh(en: string) {
  return HANH_TINH[en] || { ten: en, kyHieu: '', nghia: '', chinh: false };
}

export function docGoc(t: string) {
  return GOC[t] || { ten: t, kyHieu: '', muc: 'trung' as const, nghia: '' };
}
