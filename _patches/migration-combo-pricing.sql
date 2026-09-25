-- Đợt 4 (phần 2, 2026-09-25): combo mua gộp nhiều tool, giá do Henry chốt
-- (335L cho laso+tu-binh; 610L cho trọn bộ 4 tool tính sau — xem PR riêng).
--
-- CHỈ thêm dòng vào tool_pricing (đã có sẵn cơ chế đọc giá generic qua
-- getToolPrice()/ToolPrices — không cần code nào khác biết "đây là combo"
-- ngoài whitelist COMBO_MEMBERS trong app/api/payment/route.ts).
--
-- ĐÃ ÁP DỤNG TRỰC TIẾP lên Supabase production — file này lưu lại theo quy
-- ước "mọi thay đổi schema nằm trong _patches/*.sql" của repo.

insert into public.tool_pricing (tool_id, credits, label, icon, category, sort_order, description, app_path, parts, enabled)
values (
  'combo-laso-tubinh',
  335,
  'Combo: Luận Giải + Tử Bình',
  '🎁',
  'Combo',
  500,
  'Mua trọn cả Luận Giải Tử Vi (13 phần) và Tử Bình Bát Tự cùng lúc, giá gộp rẻ hơn mua rời (380 → 335 Lượng). So hai trường phái luận giải trên cùng lá số.',
  '/app/combo-laso-tubinh',
  1,
  true
)
on conflict (tool_id) do nothing;
