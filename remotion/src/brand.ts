// remotion/src/brand.ts
// ============================================================
// Bảng màu + hằng số hình ảnh, CHÉP từ `public/shell.css` và `public/poster.js`.
//
// ⚠️ CỐ Ý chép giá trị chứ không import CSS: Remotion render trong một cây DOM
// độc lập, không nạp `shell.css` của app. Nhưng vì là bản chép nên **đổi màu
// thương hiệu thì phải sửa cả hai chỗ** — đó là cái giá đã biết, đổi lại là
// video không phụ thuộc vào bất kỳ file nào của app đang chạy.
//
// Nguồn gốc từng giá trị:
//   --navy #061A2E · --gold #C9A84C · --gold-lt #F9F4EB  ← public/shell.css:17-18
//   khổ 1080×1920, seal + tên miền ở chân trang          ← public/poster.js
// ============================================================

export const BRAND = {
  navy: '#061A2E',
  navy2: '#0A2540',
  gold: '#C9A84C',
  goldLt: '#F9F4EB',
  paper: '#FFFFFF',
  textOnNavy: '#F9F4EB',
  textMuted: '#9FB0C0',
} as const;

/** Khổ dọc chuẩn cho TikTok / Reels / Shorts. Cùng khổ với poster 9:16. */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/**
 * Font chữ: cùng bộ với toàn site (Noto Serif cho tiêu đề).
 * Remotion nạp qua @fontsource hoặc CSS — ở đây dùng font-family chuỗi và để
 * `loadFont()` trong Root lo phần tải. Sans mặc định của hệ dùng cho phụ đề vì
 * phụ đề cần đọc nhanh, serif ở cỡ nhỏ trên điện thoại khó đọc hơn.
 */
export const FONT = {
  serif: '"Noto Serif", Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;
