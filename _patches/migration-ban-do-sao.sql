-- ============================================================
-- Bản Đồ Sao Lúc Sinh (natal chart, chiêm tinh phương Tây)
--
-- Tool MIỄN PHÍ. Chạy Ở SERVER (`/api/natal` → `lib/tayphuong/natal.ts` →
-- `celestine`, MIT) vì cần ephemeris thật cho 15 thiên thể + hệ nhà Placidus
-- phụ thuộc vĩ độ nơi sinh. Route không gọi LLM, không trừ Lượng; chỉ rail
-- mới tính theo `chat.cost` chung như mọi tool khác.
--
-- ⚠️ CỐ Ý enabled = FALSE (cùng lý do mai-hoa/ky-mon): cong-cu.html lọc
-- `enabled=eq.true`, bật trước deploy là thẻ tool hiện mà trang chưa tồn tại.
-- SAU KHI DEPLOY:
--   UPDATE public.tool_pricing SET enabled = true, updated_at = now()
--    WHERE tool_id = 'ban-do-sao';
--
-- 🔑 CATEGORY RIÊNG 'Chiêm Tinh Tây', cố ý KHÔNG nhét vào 'Huyền Học':
-- đây là môn khác hệ hẳn với cổ pháp Á Đông. Để lẫn thì người dùng tưởng hai
-- bên đọc chéo được nhau — chính hiểu nhầm mà trang và prompt đang phải đi
-- đính chính.
-- ============================================================

INSERT INTO public.tool_pricing
  (tool_id, label, description, category, icon, credits, is_free, enabled, sort_order)
VALUES
  ('ban-do-sao', 'Bản Đồ Sao Lúc Sinh',
   'Chiêm tinh Tây — cung Mọc, 12 nhà, góc chiếu; tải bánh xe về chia sẻ',
   'Chiêm Tinh Tây', '☉', 0, true, false, 70)
ON CONFLICT (tool_id) DO UPDATE
  SET label       = EXCLUDED.label,
      description = EXCLUDED.description,
      category    = EXCLUDED.category,
      icon        = EXCLUDED.icon,
      credits     = EXCLUDED.credits,
      is_free     = EXCLUDED.is_free,
      sort_order  = EXCLUDED.sort_order,
      updated_at  = now();
-- KHÔNG đặt `enabled` ở nhánh DO UPDATE: chạy lại migration sau khi đã bật
-- trên prod thì không được lặng lẽ tắt tool đi.

SELECT tool_id, label, category, icon, credits, is_free, enabled, sort_order
  FROM public.tool_pricing WHERE tool_id = 'ban-do-sao';
