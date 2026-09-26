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

export function thayChoCauHoi(question: string): { thay: string; chuDe: string | null } {
  const chuDe = cacChuDe(question).find((id) => THAY_THEO_CHU_DE[id]) || null;
  return { thay: chuDe ? THAY_THEO_CHU_DE[chuDe] : THAY_TIEP_KHACH, chuDe };
}
