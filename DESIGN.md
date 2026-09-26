---
name: Tử Vi Minh Bảo
description: Mệnh lý cổ pháp trên nền giấy sáng, chữ serif, điểm vàng đồng — điềm đạm, không huyền bí hoá.
colors:
  navy: "#0F2A3D"
  navy-2: "#13354F"
  navy-3: "#164B6D"
  gold: "#C8A96A"
  gold-soft: "#7C6942"
  gold-lt: "#F9F4EB"
  blue: "#1455A4"
  red: "#C46A5E"
  green: "#7FA7A3"
  ink: "#1A1A1A"
  ink-mid: "#4A4A4A"
  ink-lt: "#666666"
  line: "#E6E3DC"
  line-2: "#D8D4CB"
  paper: "#FBFAF7"
  paper-2: "#F4F2EC"
  white: "#FFFFFF"
typography:
  heading:
    fontFamily: "'Noto Serif', Georgia, serif"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  ui-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    fontSize: "12.5px"
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "16px"
  pill: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  gutter-mobile: "16px"
components:
  button-send:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    size: "33px"
  button-go:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy}"
    rounded: "{rounded.lg}"
    padding: "13px 20px"
  hero-card:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.gold-lt}"
    rounded: "{rounded.lg}"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-mid}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
---

# Tử Vi Minh Bảo: hệ thiết kế đang chạy

> File này **ghi lại** hệ đang có. Nó không phải đề xuất làm mới. Nguồn token là
> `:root` của `public/shell.css` (khung `/app/*`) và `public/theme.css` (các trang
> ngoài khung). Hai file đó thắng nếu lệch với file này. Mọi việc chỉnh giao diện
> chạy ở chế độ **tinh chỉnh** (xem `docs/UX-AUDIT-PLAN.md` mục 6).

## Overview

- Nền giấy sáng, chữ đầu mục serif (Noto Serif), vàng đồng làm điểm nhấn, navy làm
  mặt phẳng lớn: sidebar, thẻ hero, tab bar.
- Tinh thần: một cuốn sách cổ được in lại sạch sẽ. Điềm đạm, không huyền bí hoá,
  không tím-xanh "vũ trụ".
- Chế độ tối có thật (`:root[data-theme="dark"]`), không phải đảo màu tự động.

## Colors

- **Màu thương hiệu là màu MẶT NỀN, không phải màu chữ.**
  - `navy`: nền sidebar, thẻ hero.
  - `red`: nền nút gửi và CTA mở khoá (`.send`, `.stm-btn`). `.btn-go` là gradient
    `gold` → `gold-soft`, chữ navy, serif.
  - `green`, `blue`: nền huy hiệu và thanh điểm.
  - Cần chữ màu thương hiệu thì dùng `--heading` / `--tx-*`, vì bộ này có bản sáng ở
    dark. Dùng thẳng `--navy` làm chữ ở dark chỉ đạt tương phản 1,04:1.
- `gold` sáng, chỉ dùng trên nền tối. Chữ vàng trên nền giấy dùng `gold-soft`.

## Typography

- Tiêu đề: Noto Serif, phủ subset tiếng Việt. Thân và UI: font hệ thống.
- **Không** rơi về Arial làm font chính. Arial chỉ là dự phòng cuối trong chuỗi.
- Chữ UI trong khung app nhỏ (11–13,5px). Chữ thân để đọc (bản luận, bong bóng
  chat) ≥16px trên mobile.

## Layout

- Desktop: `sidebar 246px | .ws 1fr | rail var(--rail-w)=336px`. Ở chế độ chat-first,
  cột artifact là `var(--art-w)=420px`.
- Khối nằm trong `.ws` co theo **bề rộng cột**, không theo viewport. Dùng
  `container-type` + `@container`, đừng dùng `@media(max-width)`. Luật đầy đủ ở
  `CLAUDE.md`.
- Mobile: tab bar 5 mục ở đáy: Trang chủ · Các Thầy · **Hỏi Thầy** (nút giữa) · Nạp
  Lượng · Hồ Sơ. Phải khớp landing: `npm run check:tabbar`.

## Elevation & Depth

- `--shadow`: nâng nhẹ cho thẻ. `--shadow-lg`: overlay và modal. Bóng pha navy,
  không dùng đen thuần.
- Kính mờ (`backdrop-filter`) chỉ ở vài chỗ. Không mở rộng thêm.

## Shapes

- Bo góc hay dùng: 8px (thẻ, nút), 16px (khối lớn), 20px (chip dạng viên thuốc),
  6px (ô nhỏ).

## Components

- **Chip gợi ý** trong rail (`.chip`): viên thuốc nền giấy, viền `line-2`, chữ 12px.
  Bấm là hỏi ngay.
- **Thẻ gợi ý tool/report** (`.tool-suggest`): tên, một câu lý do, nút "Mở". Thẻ này
  **không có giá**.
- **Tường trả phí**: nút ghi số Lượng. VNĐ chỉ nằm ở tờ nạp gói (đang chuyển theo
  `docs/CHAT-FIRST-NAP-GOI-PLAN.md`).
- **Icon**: bộ SVG dùng chung trong `public/nav.js` (`data-icon="…"`). Không dùng
  emoji màu.

## Do's and Don'ts

- **Nên:**
  - dùng token (`var(--…)`), không gõ hex mới vào trang;
  - bọc `:hover` trong `@media (hover:hover)`;
  - tôn trọng `prefers-reduced-motion`;
  - transition ghi rõ thuộc tính và easing.
- **Nên:** giữ khung chờ cố định để tránh CLS. Khối xuất hiện ở lần vẽ đầu thì dựng
  tĩnh trong HTML.
- **Không:**
  - `transition: all`;
  - `scale(0)`;
  - `ease-in` cho thứ xuất hiện;
  - gradient tím-xanh;
  - chữ "AI" như điểm nổi bật;
  - hai tên cho cùng một thứ.
- **Không:** đổi bố cục hay phong cách để "cho khác". Site đã có bản sắc; sửa là tinh
  chỉnh.
