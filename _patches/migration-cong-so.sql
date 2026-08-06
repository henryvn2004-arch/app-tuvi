-- ============================================================
-- Tử Vi Công Sở — đọc lá số bằng ngôn ngữ công việc
--
-- Tool MIỄN PHÍ. Chạy Ở SERVER (`/api/cong-so` → `lib/engine/cong-so.ts`),
-- THUẦN deterministic: tra bảng + đọc lại số engine đã tính (`cungScores`,
-- `daiVans[].scoring`, `tieuVanScores`). KHÔNG gọi LLM, KHÔNG trừ Lượng, 0đ
-- mỗi lượt. Chỉ rail mới tính theo `chat.cost` chung như mọi tool khác.
--
-- 🔑 VÌ SAO ĐỂ MIỄN PHÍ dù đây là loại tool bán chạy nhất ở thị trường ngoài:
-- nó là tool ĐẦU PHỄU — không đòi tiền ai để họ biết mình thuộc kiểu gì, rồi
-- bán chiều sâu ở rail và ở bản Luận Giải đầy đủ. Muốn đổi ý thì chỉ cần một
-- câu UPDATE dưới DB, không phải deploy:
--   UPDATE public.tool_pricing SET credits = 15, is_free = false, updated_at = now()
--    WHERE tool_id = 'cong-so';
--
-- ⚠️ CỐ Ý enabled = FALSE (cùng lý do mai-hoa / ky-mon / ban-do-sao):
-- cong-cu.html lọc `enabled=eq.true`, bật trước deploy là thẻ tool hiện trên
-- trang Công Cụ trong khi đường dẫn chưa tồn tại → 404 cho người thật.
-- SAU KHI DEPLOY:
--   UPDATE public.tool_pricing SET enabled = true, updated_at = now()
--    WHERE tool_id = 'cong-so';
--
-- Category 'Luận Giải' để thẻ rơi đúng tab "Tử Vi" trên /cong-cu — đây LÀ một
-- bản đọc lá số Tử Vi, chỉ khác lăng kính. Không phải môn riêng như Kỳ Môn hay
-- chiêm tinh Tây, nên KHÔNG mở category mới.
-- ============================================================

INSERT INTO public.tool_pricing
  (tool_id, label, description, category, icon, credits, is_free, enabled, sort_order)
VALUES
  ('cong-so', 'Tử Vi Công Sở',
   'Kiểu người của bạn ở chỗ làm, 12 mặt đời đi làm, 4 chặng 40 năm, nên ghép đội với ai',
   'Luận Giải', 'briefcase', 0, true, false, 12)
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
  FROM public.tool_pricing WHERE tool_id = 'cong-so';
