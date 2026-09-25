-- Đợt 4 (phần 4, 2026-09-25): combo trọn bộ 4 tool. Henry chốt giá 610L
-- (mua rời cả 4 = 760L). Cùng mẫu combo-laso-tubinh (PR #1051) — chỉ thêm
-- dòng tool_pricing, whitelist COMBO_MEMBERS ở app/api/payment/route.ts lo
-- phần mở khoá.
--
-- ĐÃ ÁP DỤNG TRỰC TIẾP lên Supabase production — file này lưu lại theo quy
-- ước "mọi thay đổi schema nằm trong _patches/*.sql" của repo.

insert into public.tool_pricing (tool_id, credits, label, icon, category, sort_order, description, app_path, parts, enabled)
values (
  'combo-tron-bo',
  610,
  'Combo: Trọn Bộ 4 Tool',
  '🎁',
  'Combo',
  501,
  'Mua trọn cả 4: Luận Giải Tử Vi, Tử Bình Bát Tự, Chu Trình Cuộc Đời, Vận Hạn Năm — giá gộp rẻ hơn mua rời (760 → 610 Lượng).',
  '/app/combo-tron-bo',
  1,
  true
)
on conflict (tool_id) do nothing;
