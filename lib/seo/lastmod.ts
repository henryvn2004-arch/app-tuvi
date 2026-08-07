// lib/seo/lastmod.ts — NGUỒN DUY NHẤT của <lastmod> cho mọi sitemap.
//
// 🔑 Vì sao có file này: `lastmod` là trường DUY NHẤT Google còn đọc trong
// sitemap (`changefreq` và `priority` đã bị bỏ qua từ lâu). Đổi lại, nó chỉ
// được đọc KHI CHÍNH XÁC — đóng dấu ngày hôm nay cho một trang không hề đổi
// thì Google học cách bỏ qua `lastmod` của CẢ SITE, kéo theo mấy nghìn trang
// có ngày thật cũng mất tín hiệu theo.
//
// Đó đúng là chuyện đã xảy ra ở đây: `app/api/sitemap/route.ts` từng phát
// `new Date()` làm lastmod cho ~90 trang tĩnh + 576 trang van-han, MỖI NGÀY,
// trong khi 8.478 trang `seo_pages` cạnh đó có `created_at` thật.
//
// ⚖️ LUẬT CỦA FILE NÀY: KHÔNG BIẾT ⇒ KHÔNG PHÁT.
// Thiếu `lastmod` là trung tính (nó vốn là trường tuỳ chọn); `lastmod` sai là
// nhiễu độc. Đừng bao giờ lấp chỗ trống bằng `new Date()` cho tiện.

/**
 * Chuẩn hoá một mốc thời gian bất kỳ về dạng W3C date `YYYY-MM-DD`.
 * Trả `null` nếu không phải ngày đọc được — để nơi gọi bỏ hẳn thẻ, chứ KHÔNG
 * rơi về ngày hôm nay.
 */
export function toLastmod(value?: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Dòng `<lastmod>` đã thụt lề sẵn cho `urlEntry`, hoặc chuỗi RỖNG khi không có
 * ngày đáng tin. Nơi gọi chỉ việc nối vào, không phải tự nhớ luật.
 */
export function lastmodLine(value?: string | null, indent = '    '): string {
  const d = toLastmod(value);
  return d ? `\n${indent}<lastmod>${d}</lastmod>` : '';
}

/**
 * Ngày nội dung của các HỌ TRANG SINH BẰNG THUẬT TOÁN — chúng không có dòng DB
 * nào để hỏi `created_at`, mà chỉ đổi khi TEMPLATE hoặc ENGINE đổi. Vì vậy giá
 * trị ở đây phải sửa TAY.
 *
 * ⚠️ CHỈ bump khi output THẬT SỰ đổi (sửa engine, viết lại template, đổi hằng
 * số như `NAM_XEM`). Bump theo mỗi lần deploy là quay lại đúng lỗi vừa vá.
 *
 * `null` = chưa xác định được ngày đáng tin ⇒ CỐ Ý không phát `lastmod`.
 * Điền vào khi có một mốc bảo vệ được, đừng đoán.
 */
export const CONTENT_REV: Record<string, string | null> = {
  // Engine ngày-tốt sửa công thức 12 trực (lấy chi tháng theo TIẾT KHÍ thay vì
  // tháng âm) → nội dung đổi trên 26,8% số ngày, tức gần 8.500 trang
  // `/ngay-tot/*` đều khác đi. Đây là mốc đổi nội dung lớn nhất của họ trang
  // này và có ghi lại trong CLAUDE.md.
  'ngay-tot': '2026-08-04',

  // Chưa có mốc nào bảo vệ được (lịch sử git trong container là bản shallow,
  // ngày commit đọc ra chỉ là mốc cắt của bản clone chứ không phải ngày sửa).
  // Để `null` cho tới khi có người biết chắc — xem luật ở đầu file.
  'menh-kho': null,
  'van-han': null,
  'static': null,
};

/** Lấy mốc nội dung của một họ trang sinh bằng thuật toán. */
export function revOf(family: keyof typeof CONTENT_REV | string): string | null {
  return CONTENT_REV[family] ?? null;
}
