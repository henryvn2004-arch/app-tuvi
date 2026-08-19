-- ============================================================
-- Tool MỚI: "Vận Hạn 12 Tháng Tới" (tool_id = van-han-nam)
--
-- Lát cắt SÂU của bản Luận Giải: chỉ tiểu vận năm + 12 nguyệt vận, tính từ
-- THÁNG NGƯỜI DÙNG ĐANG XEM. 16 phần = 4 phần đầu dùng lại NGUYÊN prompt của
-- Luận Giải (tổng quan lá số · hành trình đại vận · đại vận hiện tại · tiểu
-- vận năm nay) + 12 phần tháng mới.
--
-- ⚠️ KHÔNG có bảng mới: kết quả lưu vào `laso_public` như mọi tool luận giải,
-- phân biệt bằng TIỀN TỐ SLUG. Tiền tố ở đây MANG mốc tháng bắt đầu
-- (`van-han-nam-<YYYY>-<MM>-…`) vì sản phẩm neo theo cửa sổ 12 tháng: cùng lá
-- số nhưng mở ở tháng khác là một cửa sổ khác, dùng chung slug thì tháng sau
-- mở ra vẫn nhận bản luận của cửa sổ CŨ mà không có gì báo.
--
-- ⚠️ enabled = FALSE ở migration này LÀ CỐ Ý. `cong-cu.html` + `tool-prices.js`
-- lọc `enabled=eq.true`, nên bật TRƯỚC khi deploy là tool hiện trên trang Công
-- Cụ trong khi `/app/van-han-nam` còn 404 với người dùng thật. Bật SAU deploy:
--   update tool_pricing set enabled = true, updated_at = now()
--    where tool_id = 'van-han-nam';
-- ============================================================

insert into public.tool_pricing
  (tool_id, label, credits, is_free, enabled, category, app_path, page_path,
   icon, need_tags, sort_order, description, question)
values
  ('van-han-nam', 'Vận Hạn 12 Tháng Tới', 50, false, false, 'Luận Giải',
   '/app/van-han-nam', null,
   -- Tên icon (KHÔNG phải emoji): cả sidebar shell lẫn /cong-cu tra theo tên
   -- trong bộ icon dùng chung, emoji thì rơi về icon dự phòng.
   'calendar',
   -- Nhóm "Vận hạn theo thời gian" đang RỖNG (3 tool gán vào nó đều tắt từ đợt
   -- dọn tool trùng lặp) — tool này lấp đúng chỗ đó.
   'van-han,ban-than',
   5,
   'Tiểu vận năm và nguyệt vận từng tháng của đúng 12 tháng kể từ hôm nay — cung hạn, sao, cách cục vận, luận riêng từng tháng.',
   'Vận hạn 12 tháng tới của tôi thế nào?')
on conflict (tool_id) do update set
  label       = excluded.label,
  credits     = excluded.credits,
  is_free     = excluded.is_free,
  category    = excluded.category,
  app_path    = excluded.app_path,
  page_path   = excluded.page_path,
  icon        = excluded.icon,
  need_tags   = excluded.need_tags,
  sort_order  = excluded.sort_order,
  description = excluded.description,
  question    = excluded.question,
  updated_at  = now();
-- CỐ Ý không đụng cột `enabled` ở nhánh update: chạy lại migration không được
-- lật một tool đang tắt thành bật (hay ngược lại).
