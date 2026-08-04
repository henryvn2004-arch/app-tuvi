-- ============================================================
-- Kỳ Môn Độn Giáp (奇門遁甲) — đăng ký tool vào bảng giá.
--
-- Tool MIỄN PHÍ. Khác các tool free khác ở chỗ bàn dựng Ở SERVER
-- (`/api/qimen` → `lib/qimen/board.ts` → `mingyu-core`, MIT), vì định cục cần
-- tiết khí thật + phù đầu + thượng/trung/hạ nguyên — chép sang vanilla JS là
-- gần như chắc chắn sai ở đâu đó mà bàn VẪN RA, không cách nào phát hiện.
-- Route không gọi LLM, không trừ Lượng; chỉ rail mới tính theo `chat.cost`
-- chung như mọi tool khác.
--
-- ⚠️ CỐ Ý enabled = FALSE (cùng lý do với mai-hoa): cong-cu.html lọc
-- `enabled=eq.true`, bật trước deploy là thẻ tool hiện mà trang chưa tồn tại.
-- SAU KHI DEPLOY:
--   UPDATE public.tool_pricing SET enabled = true, updated_at = now()
--    WHERE tool_id = 'ky-mon';
--
-- icon '⧇' đã nằm trong EMOJI_TO_ICON của nav.js (8 ký tự dùng làm
-- tool_pricing.icon được map sẵn từ đợt #350) → không phải thêm icon mới.
-- sort_order 63: sau kinh-dich (60), than-so-hoc (61), mai-hoa (62).
-- ============================================================

INSERT INTO public.tool_pricing
  (tool_id, label, description, category, icon, credits, is_free, enabled, sort_order)
VALUES
  ('ky-mon', 'Kỳ Môn Độn Giáp',
   'Bàn 9 cung theo giờ — bát môn, cửu tinh, hướng nên đi',
   'Huyền Học', '⧇', 0, true, false, 63)
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
  FROM public.tool_pricing WHERE tool_id = 'ky-mon';
