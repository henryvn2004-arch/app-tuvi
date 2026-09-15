-- ============================================================================
-- Khuyến mãi giá tool — giảm giá CÓ THỜI HẠN, không đổi giá gốc `credits`
-- ----------------------------------------------------------------------------
-- Henry: thay vì hạ thẳng giá niêm yết (mất neo giá, khó tăng lại), muốn thử
-- discount % có hạn (VD 3 tuần/tháng), áp đồng loạt được cho MỌI tool chứ
-- không riêng Luận Giải — và tự chỉnh trong Admin, không cần Claude/deploy.
--
-- Cột MỚI, additive-only, NULL = không có khuyến mãi, KHÔNG đổi hành vi tool
-- nào chưa set. `sale_credits` là GIÁ THẬT (số Lượng cuối cùng), không lưu %:
-- lib/billing/pricing.ts đọc thẳng, không suy diễn phần trăm ở runtime — Admin
-- UI tự quy đổi % → sale_credits ngay lúc lưu (xem public/admin.html
-- `applySaleAll`).
--
-- `sale_ends_at` KHÔNG có nghĩa "để trống là an toàn" — để trống là KHÔNG bao
-- giờ tự hết hạn, phải tắt tay. Bulk-apply trong Admin bắt buộc nhập ngày kết
-- thúc đúng vì lý do này.
--
-- Đã CHẠY (2026-09-15, qua Supabase MCP `apply_migration`, tên
-- `tool_pricing_sale_columns`) — file này chỉ để lại BẢN GHI, không cần chạy
-- lại. Enforce giá thật ở `lib/billing/pricing.ts::getToolPrice` CÙNG PR.
-- ============================================================================

alter table public.tool_pricing
  add column if not exists sale_credits integer,
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz;

comment on column public.tool_pricing.sale_credits is
  'Giá KHUYẾN MÃI (Lượng) — CÓ THỜI HẠN, khác giá gốc credits. NULL = không có KM đang chạy. Số cuối cùng admin nhập (hoặc Admin UI tự quy đổi từ %), KHÔNG suy % ở runtime.';
comment on column public.tool_pricing.sale_starts_at is
  'KM bắt đầu lúc này (UTC). NULL = KM hiệu lực ngay khi sale_credits được set.';
comment on column public.tool_pricing.sale_ends_at is
  'KM kết thúc lúc này (UTC), giá về lại credits sau mốc này. NULL = KHÔNG tự hết hạn — phải tắt tay, tránh quên tắt KM.';

alter table public.tool_pricing
  drop constraint if exists tool_pricing_sale_credits_nonneg;
alter table public.tool_pricing
  add constraint tool_pricing_sale_credits_nonneg check (sale_credits is null or sale_credits >= 0);
