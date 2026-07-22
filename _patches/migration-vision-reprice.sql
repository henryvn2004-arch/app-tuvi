-- migration-vision-reprice.sql
-- ============================================================
-- Điều chỉnh giá các tool VISION / SINH ẢNH / AUDIO cho hợp chi phí + định vị.
--   • Vision phân tích (ảnh vào → chữ ra): giá vốn thấp, nâng vì ĐỊNH VỊ/value.
--   • Sinh ảnh (try-on / render) + audio (TTS): giá vốn CAO thật → nâng theo cost.
-- Deep tử vi/tử bình/xem-tuổi/đặt-tên/chọn-ngày GIỮ NGUYÊN (không phải vision).
--
-- Nguồn sự thật = bảng public.tool_pricing (paywall.js đọc live; fallback hardcode
-- trong paywall.js đã sync khớp). Chạy trong Supabase SQL Editor (idempotent).
-- ============================================================

-- Vision phân tích (ảnh → chữ): nâng định vị
UPDATE public.tool_pricing SET credits = 10, updated_at = now() WHERE tool_id IN ('dien-tuong','nhan-tuong','thu-tuong');
UPDATE public.tool_pricing SET credits = 8,  updated_at = now() WHERE tool_id IN ('kieu-toc-phan-tich','trang-diem-phan-tich','personal-color');
UPDATE public.tool_pricing SET credits = 12, updated_at = now() WHERE tool_id = 'mau-sac-hop-menh';
UPDATE public.tool_pricing SET credits = 15, updated_at = now() WHERE tool_id = 'da-lieu-ai';
UPDATE public.tool_pricing SET credits = 20, updated_at = now() WHERE tool_id = 'khi-sac';

-- Vision phân tích dài (phong thủy, ảnh → báo cáo dài)
UPDATE public.tool_pricing SET credits = 50, updated_at = now() WHERE tool_id IN ('phong-thuy','cua-hang-phong-thuy');
UPDATE public.tool_pricing SET credits = 40, updated_at = now() WHERE tool_id = 'ban-lam-viec';

-- Sinh ảnh / try-on (ảnh RA — cost gen cao)
UPDATE public.tool_pricing SET credits = 25, updated_at = now() WHERE tool_id IN ('kieu-toc-tryon','trang-phuc-tryon','trang-diem-tryon','personal-color-tryon');
UPDATE public.tool_pricing SET credits = 45, updated_at = now() WHERE tool_id = 'phong-thuy-render';

-- Audio / TTS (cost giọng nói)
UPDATE public.tool_pricing SET credits = 12, updated_at = now() WHERE tool_id = 'thanh-tuong';
UPDATE public.tool_pricing SET credits = 18, updated_at = now() WHERE tool_id = 'thanh-tuong-pro';
