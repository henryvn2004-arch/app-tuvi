-- ============================================================
-- Mai Hoa Dịch Số (梅花易數) — đăng ký tool vào bảng giá.
--
-- Tool MIỄN PHÍ, deterministic, chạy hoàn toàn ở client
-- (`public/tools-shared/mai-hoa.js`) → 0 lượt LLM, 0 lượt mạng, 0đ.
-- Chỉ rail "hỏi trợ lý" mới tốn Lượng, và nó tính theo `chat.cost` chung
-- như mọi tool khác — không có khoản phí riêng nào ở đây.
--
-- ⚠️ CỐ Ý đặt enabled = FALSE. `cong-cu.html` và `tuvi-paywall.js` đều lọc
-- `enabled=eq.true`; bật TRƯỚC khi deploy thì thẻ tool hiện trên trang Công Cụ
-- trong khi `/tools/mai-hoa.html` chưa tồn tại → 404 cho người dùng thật.
-- Đây đúng tiền lệ đã áp cho `chan-dung-tien-kiep`.
--
-- SAU KHI DEPLOY XONG mới chạy:
--   UPDATE public.tool_pricing SET enabled = true, updated_at = now()
--    WHERE tool_id = 'mai-hoa';
--
-- icon '🌸' — nav.js đã map sẵn 🌸 → icon Lucide 'flower' trong
-- EMOJI_TO_ICON, nên không phải thêm icon mới.
-- sort_order 62: ngay sau kinh-dich (60) và than-so-hoc (61) trong nhóm
-- Huyền Học, để hai tool gieo quẻ đứng cạnh nhau.
-- ============================================================

INSERT INTO public.tool_pricing
  (tool_id, label, description, category, icon, credits, is_free, enabled, sort_order)
VALUES
  ('mai-hoa', 'Mai Hoa Dịch Số',
   'Gieo quẻ bằng số hoặc theo giờ — Thể, Dụng, ba chặng',
   'Huyền Học', '🌸', 0, true, false, 62)
ON CONFLICT (tool_id) DO UPDATE
  SET label       = EXCLUDED.label,
      description = EXCLUDED.description,
      category    = EXCLUDED.category,
      icon        = EXCLUDED.icon,
      credits     = EXCLUDED.credits,
      is_free     = EXCLUDED.is_free,
      sort_order  = EXCLUDED.sort_order,
      updated_at  = now();
-- KHÔNG đặt `enabled` trong nhánh DO UPDATE: chạy lại migration sau khi đã bật
-- tool trên prod thì không được lặng lẽ tắt nó đi.

-- Verify
SELECT tool_id, label, category, icon, credits, is_free, enabled, sort_order
  FROM public.tool_pricing
 WHERE tool_id = 'mai-hoa';
