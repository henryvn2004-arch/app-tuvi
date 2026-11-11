// lib/i18n/single-locale.mjs — trang CHỈ có MỘT ngôn ngữ (vd `public/tokushoho.html`: 特定商取引法
// 表記, chỉ tiếng Nhật, không có data-i18n). Một chỗ duy nhất; proxy.ts đọc danh sách này.
//   · `/<đúng ngôn ngữ>/<path>` → phục vụ NGUYÊN FILE (không dịch, không chèn/xoá canonical,
//     robots, hreflang — trang tự khai); header x-tvmb-locale vẫn gắn.
//   · `/<ngôn ngữ khác>/<path>` → 404 (không bao giờ phục vụ trang Nhật dưới /en).
//   · `/<path>` không tiền tố → 308 về `/<ngôn ngữ>/<path>` (trang không có bản vi).
//   · Không vào availability.json ⇒ không hreflang chéo, không lên sitemap của ngôn ngữ khác.
// Mỗi file HTML phải tự khai `<meta name="tvmb-single-locale" content="ja">` khớp danh sách
// này (check:i18n soi CẢ HAI CHIỀU: file có meta mà không trong danh sách, và ngược lại).
export const SINGLE_LOCALE_PAGES = { '/tokushoho.html': 'ja' };

export function singleLocaleOf(p) {
  return Object.prototype.hasOwnProperty.call(SINGLE_LOCALE_PAGES, p)
    ? SINGLE_LOCALE_PAGES[p]
    : null;
}
