// lib/agent/thay-theo-chu-de.ts
// ============================================================
// Trang chủ chat: câu hỏi ĐẦU TIÊN của khách → thầy phụ trách trong hội đồng
// 15 thầy (`master_profiles.id`, ảnh `public/authors/<id>.jpg`).
//
// Chủ đề lấy từ `cacChuDe()` (luan-chu-de.ts) — CÙNG bộ nhận chủ đề rail đang
// dùng để chọn cung, không dò chuỗi riêng ở client (dò chữ tiếng Việt thô là
// sai lớp, xem CLAUDE.md "Tiếng Việt"). Câu hỏi không rõ chủ đề, hoặc chủ đề
// chưa gán thầy → Thái Hư, người tiếp khách ở trang chủ.
//
// Thêm chủ đề mới vào `CHU_DE` thì gán thầy ở đây luôn — thiếu thì chủ đề đó
// rơi về Thái Hư (không hỏng, chỉ không chuyển đúng người).
// ============================================================

import { cacChuDe } from '@/lib/agent/luan-chu-de';
import { chuanHoaDauThanh } from '@/lib/vn-text';

export const THAY_TIEP_KHACH = 'thai-hu';

/** `CHU_DE[*].id` → `master_profiles.id` (môn chuyên xem `discipline`). */
export const THAY_THEO_CHU_DE: Record<string, string> = {
  'su-nghiep': 'dieu-khong', // Sự nghiệp & Tiền bạc
  'tai-chinh': 'dieu-khong',
  'tinh-duyen': 'dau-nam', // Tình duyên & Hôn nhân
  'con-cai': 'thien-an', // Đặt Tên & Dạy Con
  'nha-dat': 'huyen-khong', // Phong Thủy
  'ban-be': 'linh-son', // Nhân mạch
  'cha-me': 'co-nguyet', // Tử Vi gốc — đọc cung của người thân
  'anh-em': 'co-nguyet',
  'ho-hang': 'co-nguyet',
  'suc-khoe': 'co-nguyet',
  'di-xa': 'co-nguyet',
};

/**
 * Việc cần CÔNG CỤ, không phải một cung (2026-09-26, màn chat `/app`): "chọn
 * ngày khai trương", "đặt tên cho con", "rút một lá tarot"… `cacChuDe` đọc theo
 * cung nên những câu này đều rơi về Thái Hư. Xét TRƯỚC chủ đề cung.
 * Mẫu là CỤM ĐỦ NGHĨA, không phải từ đơn (xem CLAUDE.md "Tiếng Việt": `con`
 * khớp cả "con vật", `ngày` khớp cả "mấy ngày nay"). Thầy khớp
 * `master_profiles.tool_ids` của môn đó. `nghia` là cụm nói với khách.
 */
const VIEC: { cum: string[]; thay: string; nghia: string }[] = [
  { cum: ['chọn ngày', 'ngày tốt', 'ngày đẹp', 'ngày khai trương', 'ngày cưới', 'ngày động thổ', 'ngày nhập trạch', 'giờ hoàng đạo', 'giờ tốt', 'kim lâu', 'tam tai'], thay: 'nhat-nguyen', nghia: 'chọn ngày giờ' },
  { cum: ['hôm nay nên', 'hôm nay có nên', 'vận hôm nay', 'vận ngày'], thay: 'nhat-nguyen', nghia: 'vận hôm nay' },
  { cum: ['đặt tên', 'tên cho con', 'tên cho bé', 'tên công ty', 'tên doanh nghiệp', 'tên cửa hàng', 'dạy con', 'nuôi dạy'], thay: 'thien-an', nghia: 'đặt tên, dạy con' },
  { cum: ['tarot', 'thần số', 'số chủ đạo', 'bói bài', 'rút bài', 'lá bài'], thay: 'thanh-hu', nghia: 'bói bài, thần số' },
  { cum: ['xem tướng', 'nhân tướng', 'tướng mặt', 'khuôn mặt', 'chỉ tay', 'bàn tay', 'nốt ruồi', 'chữ ký', 'khí sắc'], thay: 'bac-minh', nghia: 'xem tướng' },
  { cum: ['kinh dịch', 'gieo quẻ', 'xin quẻ', 'mai hoa', 'lục nhâm'], thay: 'linh-co', nghia: 'gieo quẻ' },
  { cum: ['bát tự', 'tứ trụ', 'tử bình', 'kỳ môn'], thay: 'tam-kinh', nghia: 'Bát Tự' },
  { cum: ['chiêm tinh', 'bản đồ sao', 'cung hoàng đạo'], thay: 'tinh-quang', nghia: 'chiêm tinh' },
  { cum: ['phong thủy', 'hướng nhà', 'hướng bàn', 'bàn làm việc', 'bát trạch', 'hướng cửa'], thay: 'huyen-khong', nghia: 'phong thủy' },
  { cum: ['hợp tuổi', 'xem tuổi', 'tuổi vợ chồng', 'duyên nợ', 'tiền kiếp'], thay: 'ngoc-tinh', nghia: 'tương hợp' },
];
const norm = (x: string) => chuanHoaDauThanh(x.toLowerCase().normalize('NFC'));
const THAY_THEO_VIEC = VIEC.map((v) => ({ ...v, cum: v.cum.map(norm) }));

export function thayChoCauHoi(question: string): { thay: string; chuDe: string | null; nghiaViec?: string } {
  const q = norm(String(question || ''));
  const viec = THAY_THEO_VIEC.find((v) => v.cum.some((c) => q.includes(c)));
  if (viec) return { thay: viec.thay, chuDe: null, nghiaViec: viec.nghia };
  const chuDe = cacChuDe(question).find((id) => THAY_THEO_CHU_DE[id]) || null;
  return { thay: chuDe ? THAY_THEO_CHU_DE[chuDe] : THAY_TIEP_KHACH, chuDe };
}
