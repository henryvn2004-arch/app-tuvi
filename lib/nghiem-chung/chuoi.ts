// lib/nghiem-chung/chuoi.ts — CHỮ KHUNG của hai trang Nghiệm Chứng / Xác Định Giờ Sinh (hồ sơ + hub), 6 ngôn ngữ (W6).
//
// "Chữ khung" = nút, tiêu đề mục, nhãn bảng, câu phương pháp… — KHÔNG gồm văn xuôi từng hồ sơ (đó là
// `nc_ho_so_i18n`, xem lib/nghiem-chung/i18n/prose.ts) và KHÔNG gồm tên cung/sao do engine trả (đó là
// bảng thuật ngữ lib/i18n/glossary). Một mẫu chuỗi dùng `{ten}` kiểu thế chỗ; HTML nội tuyến (<b>, <a>) là
// của MÌNH, giá trị thế vào do trang gọi `esc()` trước.
//
// 🔑 `vi` PHẢI giữ nguyên từng chữ của trang gốc (trang tiếng Việt không được đổi một byte nào khi refactor).
// `zh-cn` KHÔNG viết tay: sinh từ `zh-tw` bằng OpenCC (tw→cn) → `chuoi.zh-cn.generated.mjs`
// (`node scripts/gen-nc-chuoi.mjs`). `npm run check:ncchuoi` bắt thiếu khoá / lệch chỗ thế `{…}` / zh-cn lỗi thời.
// Tên thương hiệu viết theo bản địa; "chờ duyệt" cùng bảng thuật ngữ.
import type { Locale } from '@/lib/i18n/locales';
import zhCn from './chuoi.zh-cn.generated.mjs';
import { vi, en, ja, ko, zhTw } from './chuoi-data.mjs';

export type ChuoiKey = keyof typeof vi;
export type Chuoi = Record<ChuoiKey, string>;

export const CHUOI_BASE: Record<'vi' | 'en' | 'ja' | 'ko' | 'zh-tw', Chuoi> = { vi, en, ja, ko, 'zh-tw': zhTw };

/** Chữ khung theo ngôn ngữ. `zh-cn` đọc từ file SINH bằng OpenCC (không viết tay). */
export function chuoi(locale: Locale): Chuoi {
  if (locale === 'zh-cn') return zhCn as Chuoi;
  return CHUOI_BASE[locale];
}

/** Thế `{khoá}` trong mẫu chuỗi. Giá trị đã được người gọi escape nếu cần. Khoá thiếu → để nguyên `{khoá}` (lộ lỗi, không nuốt). */
export function fmt(tpl: string, v: Record<string, string | number> = {}): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
}
