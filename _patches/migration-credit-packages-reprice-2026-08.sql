-- migration-credit-packages-reprice-2026-08.sql
-- ============================================================
-- Tăng giá 4 gói nạp (yêu cầu Henry 2026-08-30): Khởi Đầu 99k→199k, Phổ Thông
-- 199k→399k, Cao Cấp 499k→699k, VIP giữ nguyên 999k. Số Lượng mỗi gói tính lại
-- để giữ đường cong chiết khấu tăng dần theo bậc (giống hình dạng bảng cũ:
-- 990/829/713/624đ mỗi Lượng), neo vào đúng 250 Lượng cho gói Khởi Đầu — bằng
-- CHÍNH giá tool đắt nhất site (chu-trinh-cuoc-doi/van-han-nam, 250 Lượng),
-- để gói rẻ nhất đủ mở một lượt ngay từ lượt mua đầu tiên (xem PR #654 — trước
-- đó gói 199k chỉ có 240 Lượng, THIẾU 10 so với giá tool, khách mua vẫn bị
-- chặn khi quay lại).
--
--   Gói        | Giá cũ → mới      | Lượng cũ → mới | đ/Lượng mới
--   Khởi Đầu   | 99.000 → 199.000  | 100  → 250      | 796,0
--   Phổ Thông  | 199.000 → 399.000 | 240  → 600      | 665,0
--   Cao Cấp    | 499.000 → 699.000 | 700  → 1200     | 582,5
--   VIP        | 999.000 → 999.000 | 1600 → 2000     | 499,5
--
-- Nguồn sự thật = bảng public.credit_packages (client đọc live qua ToolPrices;
-- fallback hardcode trong lib/billing/packages.ts đã sync khớp — xem file đó).
-- `vndPerCredit()`/`credit_vnd()` SUY TỪ bảng này (gói bậc hai = Phổ Thông) nên
-- tự đổi theo, KHÔNG cần sửa gì thêm ở đơn giá quy đổi. Chạy trong Supabase SQL
-- Editor (idempotent — set thẳng giá trị đích, chạy lại vô hại).
-- ============================================================

UPDATE public.credit_packages SET credits = 250,  amount_vnd = 199000, amount_usd = 8.00,  updated_at = now() WHERE package_id = '50';
UPDATE public.credit_packages SET credits = 600,  amount_vnd = 399000, amount_usd = 16.00, updated_at = now() WHERE package_id = '120';
UPDATE public.credit_packages SET credits = 1200, amount_vnd = 699000, amount_usd = 28.00, updated_at = now() WHERE package_id = '350';
UPDATE public.credit_packages SET credits = 2000, amount_vnd = 999000, amount_usd = 40.00, updated_at = now() WHERE package_id = '800';
