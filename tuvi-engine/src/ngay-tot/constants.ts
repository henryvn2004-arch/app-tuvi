// ============================================================
// NGÀY TỐT — LOOKUP TABLES & CONSTANTS
// ============================================================
// Quy tắc cổ truyền: 12 trực, hoàng-hắc đạo, 28 nhị thập bát tú,
// Tam Nương / Nguyệt Kỵ / Dương Công kỵ nhật.
// Nhiều quy tắc có biến thể giữa các trường phái — code này dùng
// hệ phổ biến nhất trong lịch vạn niên Việt Nam.

import type { DiaChi } from '../types.js';

// ─── 12 Địa Chi (Tý → Hợi) ───────────────────────────────────
export const CHI_LIST: readonly DiaChi[] = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ',
  'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi',
] as const;

// ─── 12 TRỰC (Kiến Trừ Mãn Bình Định Chấp Phá Nguy Thành Thu Khai Bế) ─
export const TRUC_LIST = [
  'Kiến', 'Trừ', 'Mãn', 'Bình', 'Định', 'Chấp',
  'Phá', 'Nguy', 'Thành', 'Thu', 'Khai', 'Bế',
] as const;
export type Truc = typeof TRUC_LIST[number];

// Tính chất chung 12 trực (truyền thống)
export const TRUC_TINH_CHAT: Record<Truc, 'cát' | 'hung' | 'bình'> = {
  'Kiến': 'cát',    // tốt cho khai trương, xuất hành (nhưng kỵ động thổ)
  'Trừ': 'bình',    // tốt cho trừ tà, cúng tế, chữa bệnh
  'Mãn': 'cát',     // tốt cho cầu tài, khai trương, nhập trạch
  'Bình': 'cát',    // tốt cho động thổ, sửa nhà, dựng cột
  'Định': 'cát',    // tốt cho cưới hỏi, ký kết
  'Chấp': 'bình',   // tốt cho thu hoạch, cầu phúc
  'Phá': 'hung',    // kỵ mọi việc lớn (chỉ tốt phá dỡ)
  'Nguy': 'hung',   // kỵ xuất hành, khởi sự
  'Thành': 'cát',   // tốt cho mọi việc (cưới, khai trương, nhập trạch)
  'Thu': 'bình',    // tốt cho cầu tài, thu hoạch
  'Khai': 'cát',    // tốt cho khai trương, xuất hành, nhập học
  'Bế': 'hung',     // kỵ khởi sự (chỉ tốt đắp đê, lấp lỗ)
};

// Tháng âm 1-12 → chi tháng (quy ước cổ truyền, bỏ qua tiết khí)
// Tháng 1 âm = Dần (Lập Xuân), T2 = Mão, ..., T11 = Tý, T12 = Sửu
export const THANG_AM_TO_CHI: Record<number, DiaChi> = {
  1: 'Dần', 2: 'Mão', 3: 'Thìn', 4: 'Tỵ', 5: 'Ngọ', 6: 'Mùi',
  7: 'Thân', 8: 'Dậu', 9: 'Tuất', 10: 'Hợi', 11: 'Tý', 12: 'Sửu',
};

// ─── 28 NHỊ THẬP BÁT TÚ ──────────────────────────────────────
// Thứ tự cổ truyền: 4 phương × 7 tú
// Đông (Thanh Long): Giác, Cang, Đê, Phòng, Tâm, Vĩ, Cơ
// Bắc (Huyền Vũ):    Đẩu, Ngưu, Nữ, Hư, Nguy, Thất, Bích
// Tây (Bạch Hổ):     Khuê, Lâu, Vị, Mão, Tất, Chủy, Sâm
// Nam (Chu Tước):    Tỉnh, Quỷ, Liễu, Tinh, Trương, Dực, Chẩn
export const NHI_THAP_BAT_TU = [
  'Giác', 'Cang', 'Đê', 'Phòng', 'Tâm', 'Vĩ', 'Cơ',
  'Đẩu', 'Ngưu', 'Nữ', 'Hư', 'Nguy', 'Thất', 'Bích',
  'Khuê', 'Lâu', 'Vị', 'Mão', 'Tất', 'Chủy', 'Sâm',
  'Tỉnh', 'Quỷ', 'Liễu', 'Tinh', 'Trương', 'Dực', 'Chẩn',
] as const;
export type Tu = typeof NHI_THAP_BAT_TU[number];

// VERIFY: cát/hung của 28 tú có nhiều biến thể. Dùng hệ phổ biến:
// Cát (10): Phòng, Vĩ, Cơ, Đẩu, Thất, Bích, Lâu, Vị, Tất, Sâm, Tỉnh, Trương, Chẩn
// Hung: phần còn lại
export const TU_TINH_CHAT: Record<Tu, 'cát' | 'hung'> = {
  'Giác': 'cát',   'Cang': 'hung',  'Đê': 'hung',    'Phòng': 'cát',
  'Tâm': 'hung',   'Vĩ': 'cát',     'Cơ': 'cát',
  'Đẩu': 'cát',    'Ngưu': 'hung',  'Nữ': 'hung',    'Hư': 'hung',
  'Nguy': 'hung',  'Thất': 'cát',   'Bích': 'cát',
  'Khuê': 'hung',  'Lâu': 'cát',    'Vị': 'cát',     'Mão': 'hung',
  'Tất': 'cát',    'Chủy': 'hung',  'Sâm': 'cát',
  'Tỉnh': 'cát',   'Quỷ': 'hung',   'Liễu': 'hung',  'Tinh': 'hung',
  'Trương': 'cát', 'Dực': 'hung',   'Chẩn': 'cát',
};

// Epoch verified qua xemlicham.com (2026-05-25):
//   - 1/6/2026 = sao Tâm (idx 4)  → backsolve cho 1/1/2024 = idx 18 (Tất)
//   - 25/12/2026 = sao Lâu (idx 15) → cross-check ✓
export const TU_EPOCH = {
  year: 2024,
  month: 1,
  day: 1,
  tuIndex: 18, // 'Tất'
};

// ─── HOÀNG ĐẠO / HẮC ĐẠO ─────────────────────────────────────
// 12 sao xen kẽ (6 hoàng + 6 hắc), theo thứ tự:
// Thanh Long (hoàng), Minh Đường (hoàng), Thiên Hình (hắc), Châu Tước (hắc),
// Kim Quỹ (hoàng), Thiên Đức (hoàng), Bạch Hổ (hắc), Ngọc Đường (hoàng),
// Thiên Lao (hắc), Huyền Vũ (hắc), Tư Mệnh (hoàng), Câu Trận (hắc)
export const HOANG_HAC_SAO = [
  { name: 'Thanh Long', type: 'hoàng' as const, meaning: 'Sao tốt nhất, lợi mọi việc' },
  { name: 'Minh Đường', type: 'hoàng' as const, meaning: 'Lợi cầu tài, gặp quý nhân' },
  { name: 'Thiên Hình', type: 'hắc' as const,   meaning: 'Kỵ kiện tụng, tranh chấp' },
  { name: 'Châu Tước',  type: 'hắc' as const,   meaning: 'Kỵ tranh cãi, kiện tụng' },
  { name: 'Kim Quỹ',    type: 'hoàng' as const, meaning: 'Lợi cưới hỏi, khai trương' },
  { name: 'Thiên Đức',  type: 'hoàng' as const, meaning: 'Lợi mọi việc thiện, lễ bái' },
  { name: 'Bạch Hổ',    type: 'hắc' as const,   meaning: 'Kỵ xuất hành, tang tế' },
  { name: 'Ngọc Đường', type: 'hoàng' as const, meaning: 'Lợi khai trương, nhập học' },
  { name: 'Thiên Lao',  type: 'hắc' as const,   meaning: 'Kỵ kiện tụng, giam cầm' },
  { name: 'Huyền Vũ',   type: 'hắc' as const,   meaning: 'Kỵ trộm cắp, mất của' },
  { name: 'Tư Mệnh',    type: 'hoàng' as const, meaning: 'Lợi cầu phúc, cưới hỏi' },
  { name: 'Câu Trận',   type: 'hắc' as const,   meaning: 'Kỵ thưa kiện, tranh chấp' },
] as const;

// Sao Thanh Long rơi vào chi nào tùy theo chi tháng (theo "Hoàng Đạo Hắc Đạo Quyết")
// Tháng Dần/Thân  → Thanh Long tại ngày Tý
// Tháng Mão/Dậu   → Thanh Long tại ngày Dần
// Tháng Thìn/Tuất → Thanh Long tại ngày Thìn
// Tháng Tỵ/Hợi    → Thanh Long tại ngày Ngọ
// Tháng Ngọ/Tý    → Thanh Long tại ngày Thân
// Tháng Mùi/Sửu   → Thanh Long tại ngày Tuất
export const THANG_CHI_TO_THANHLONG_DAY_CHI: Record<DiaChi, DiaChi> = {
  'Dần': 'Tý',   'Thân': 'Tý',
  'Mão': 'Dần',  'Dậu': 'Dần',
  'Thìn': 'Thìn','Tuất': 'Thìn',
  'Tỵ': 'Ngọ',   'Hợi': 'Ngọ',
  'Ngọ': 'Thân', 'Tý': 'Thân',
  'Mùi': 'Tuất', 'Sửu': 'Tuất',
};

// ─── GIỜ HOÀNG ĐẠO theo chi ngày ────────────────────────────
// Hardcode 6 patterns từ "Nhật thần Hoàng đạo Quyết", verified qua
// xemlicham.com (2026-05-25): 9 ngày sample khớp hoàn toàn.
//   - Tý/Ngọ   → Tý, Sửu, Mão, Ngọ, Thân, Dậu
//   - Sửu/Mùi  → Dần, Mão, Tỵ, Thân, Tuất, Hợi
//   - Dần/Thân → Tý, Sửu, Thìn, Tỵ, Mùi, Tuất
//   - Mão/Dậu  → Tý, Dần, Mão, Ngọ, Mùi, Dậu
//   - Thìn/Tuất→ Dần, Thìn, Tỵ, Thân, Dậu, Hợi
//   - Tỵ/Hợi   → Sửu, Thìn, Ngọ, Mùi, Tuất, Hợi
export const GIO_HOANG_DAO_BY_DAY_CHI: Record<DiaChi, readonly DiaChi[]> = {
  'Tý':   ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
  'Ngọ':  ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
  'Sửu':  ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
  'Mùi':  ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
  'Dần':  ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
  'Thân': ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
  'Mão':  ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'],
  'Dậu':  ['Tý', 'Dần', 'Mão', 'Ngọ', 'Mùi', 'Dậu'],
  'Thìn': ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
  'Tuất': ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
  'Tỵ':   ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'],
  'Hợi':  ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'],
};

// Tên 6 sao hoàng đạo (cát) — gán theo thứ tự xuất hiện trong giờ hoàng đạo
export const HOANG_DAO_SAO_NAMES = [
  'Thanh Long', 'Minh Đường', 'Kim Quỹ', 'Thiên Đức', 'Ngọc Đường', 'Tư Mệnh',
] as const;

// Tên 6 sao hắc đạo (hung) — gán theo thứ tự xuất hiện trong giờ hắc đạo
export const HAC_DAO_SAO_NAMES = [
  'Thiên Hình', 'Châu Tước', 'Bạch Hổ', 'Thiên Lao', 'Huyền Vũ', 'Câu Trận',
] as const;

// ─── NGÀY KỴ (âm lịch) ──────────────────────────────────────
// TAM NƯƠNG: mùng 3, 7, 13, 18, 22, 27 ÂM LỊCH — kỵ làm việc lớn
export const TAM_NUONG_AL = new Set([3, 7, 13, 18, 22, 27]);

// NGUYỆT KỴ: mùng 5, 14, 23 ÂM LỊCH — kỵ xuất hành, khởi sự
export const NGUYET_KY_AL = new Set([5, 14, 23]);

// DƯƠNG CÔNG KỴ NHẬT: 13 ngày cố định trong năm âm lịch (format: "month-day")
// Theo Dương Công kỵ ngày — kỵ mọi việc lớn (cưới, dựng nhà, an táng)
export const DUONG_CONG_KY = new Set<string>([
  '1-13', '2-11', '3-9', '4-7', '5-5', '6-3', '7-29',
  '7-28', '8-26', '9-24', '10-22', '11-20', '12-18',
]);

// ─── ACTIVITY METADATA ──────────────────────────────────────
export type ActivityKey =
  | 'cuoi-hoi'
  | 'khoi-cong'
  | 'khai-truong'
  | 'nhap-trach'
  | 'xuat-hanh'
  | 'cau-tai'
  | 'sinh-con'
  | 'an-tang'
  | 'dao-gieng'
  | 'sua-nha';

export const ACTIVITY_LIST: ActivityKey[] = [
  'cuoi-hoi', 'khoi-cong', 'khai-truong', 'nhap-trach', 'xuat-hanh',
  'cau-tai', 'sinh-con', 'an-tang', 'dao-gieng', 'sua-nha',
];

export const ACTIVITY_META: Record<ActivityKey, {
  name: string;
  shortName: string;
  desc: string;
  seoTitle: (year: number, month: number) => string;
}> = {
  'cuoi-hoi': {
    name: 'Cưới hỏi',
    shortName: 'Cưới',
    desc: 'Ngày tốt làm lễ cưới, đính hôn, ăn hỏi, dạm ngõ',
    seoTitle: (y, m) => `Ngày tốt cưới hỏi tháng ${m}/${y} — Xem ngày đẹp kết hôn`,
  },
  'khoi-cong': {
    name: 'Khởi công xây dựng',
    shortName: 'Khởi công',
    desc: 'Ngày tốt động thổ, đặt móng, khởi công công trình',
    seoTitle: (y, m) => `Ngày tốt khởi công tháng ${m}/${y} — Xem ngày động thổ xây nhà`,
  },
  'khai-truong': {
    name: 'Khai trương',
    shortName: 'Khai trương',
    desc: 'Ngày tốt khai trương cửa hàng, ra mắt kinh doanh',
    seoTitle: (y, m) => `Ngày tốt khai trương tháng ${m}/${y} — Xem ngày mở cửa hàng`,
  },
  'nhap-trach': {
    name: 'Nhập trạch',
    shortName: 'Nhập trạch',
    desc: 'Ngày tốt dọn về nhà mới, vào nhà mới',
    seoTitle: (y, m) => `Ngày tốt nhập trạch tháng ${m}/${y} — Xem ngày dọn về nhà mới`,
  },
  'xuat-hanh': {
    name: 'Xuất hành',
    shortName: 'Xuất hành',
    desc: 'Ngày tốt đi xa, công tác, du lịch, khởi hành',
    seoTitle: (y, m) => `Ngày tốt xuất hành tháng ${m}/${y} — Xem ngày đi xa, du lịch`,
  },
  'cau-tai': {
    name: 'Cầu tài',
    shortName: 'Cầu tài',
    desc: 'Ngày tốt cầu may tài lộc, ký hợp đồng, đầu tư',
    seoTitle: (y, m) => `Ngày tốt cầu tài tháng ${m}/${y} — Xem ngày ký hợp đồng, đầu tư`,
  },
  'sinh-con': {
    name: 'Sinh con',
    shortName: 'Sinh con',
    desc: 'Ngày giờ tốt mổ sinh, định giờ chào đời cho con',
    seoTitle: (y, m) => `Ngày tốt sinh con tháng ${m}/${y} — Chọn ngày giờ sinh con đẹp`,
  },
  'an-tang': {
    name: 'An táng',
    shortName: 'An táng',
    desc: 'Ngày tốt chôn cất, di mộ, cải táng',
    seoTitle: (y, m) => `Ngày tốt an táng tháng ${m}/${y} — Xem ngày chôn cất, cải táng`,
  },
  'dao-gieng': {
    name: 'Đào giếng',
    shortName: 'Đào giếng',
    desc: 'Ngày tốt khoan giếng, đào ao, đặt thủy đạo',
    seoTitle: (y, m) => `Ngày tốt đào giếng tháng ${m}/${y} — Xem ngày khoan giếng`,
  },
  'sua-nha': {
    name: 'Sửa nhà',
    shortName: 'Sửa nhà',
    desc: 'Ngày tốt sửa chữa, cải tạo, dựng cột, lợp mái',
    seoTitle: (y, m) => `Ngày tốt sửa nhà tháng ${m}/${y} — Xem ngày tu sửa, cải tạo`,
  },
};
