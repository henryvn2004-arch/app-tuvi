-- ============================================================
-- SÀN GIÁ 50.000đ/tool (Henry chốt 2026-09-07)
-- ============================================================
-- "rà soát lại giá (lượng, VNĐ) của các tool, giá tối thiểu của mỗi tool phải
--  là 50,000VNĐ, tool nào giá VNĐ đang dưới 50,000 thì nâng lên thành 50,000VND"
--
-- Tỉ giá đang chạy (bậc hai `credit_packages` theo sort_order, xem
-- `vndPerCredit()` — lib/billing/packages.ts): 399.000đ / 800 Lượng = 499đ/Lượng.
-- 100 Lượng × 499đ = 49.900đ → làm tròn lên nghìn ở UI (`ToolPrices.vndLabel`)
-- ra đúng "~50.000đ". Mọi tool đang trả VNĐ < 50.000đ được nâng thẳng lên
-- credits = 100 — KHÔNG áp lên tool MIỄN PHÍ (`is_free = true`, 25 tool) và
-- KHÔNG áp lên `rail-message` (giá một tin nhắn chat, không phải một lượt
-- "tool" bán trọn — nâng lên 100 Lượng/tin sẽ phá cả rail chat).
--
-- Bốn tool CHỮ dài (`chu-trinh-cuoc-doi` 250, `laso` 150, `van-han-nam` 250,
-- `tu-binh` 200) đã ở trên 50.000đ, giữ nguyên — không đụng `parts`/
-- `credits_per_part` của chúng (bán theo phần là chiết khấu có chủ đích, không
-- phải giá "một tool", xem lib/billing/pricing.ts `ToolParts`).
--
-- ⚠️ Tỉ giá 499đ/Lượng có thể đổi nếu admin sửa `credit_packages` — sàn 50.000đ
-- này là quyết định TẠI THỜI ĐIỂM 2026-09-07, không tự điều chỉnh theo tỉ giá
-- sau này.
-- ============================================================

begin;

update public.tool_pricing
   set credits = 100, updated_at = now()
 where tool_id in (
   'but-tuong',
   'chon-ngay-tot', 'cong-so', 'dat-ten-con', 'dat-ten-dn', 'mau-sac-hop-menh',
   'nhan-mach', 'personal-color', 'trang-diem-phan-tich', 'trang-phuc-theo-ngay',
   'nguoi-khac',
   'ban-lam-viec', 'chan-dung-vo-chong', 'cua-hang-phong-thuy', 'da-lieu-ai',
   'kieu-toc-tryon', 'personal-color-tryon', 'phong-thuy', 'trang-diem-tryon',
   'trang-phuc-tryon',
   'chan-dung-tien-kiep', 'gio-sinh', 'kieu-toc-phan-tich', 'thanh-tuong',
   'dien-tuong', 'duyen-no-tien-kiep', 'nhan-tuong',
   'thanh-tuong-pro', 'thu-tuong', 'xem-lam-an', 'xem-tuoi',
   'phong-thuy-render',
   'day-con', 'huong-nghiep-tre', 'khi-sac'
 )
 and credits < 100;

commit;
