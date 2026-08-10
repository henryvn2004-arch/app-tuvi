-- _patches/migration-gio-sinh.sql
-- Tool "Xác Định Giờ Sinh" — đăng ký vào bảng giá.
--
-- ⚠️ THỨ TỰ BẮT BUỘC (bài học đã trả giá: 58 công cụ rơi vào nhóm "Khác" 4 phút
-- vì dữ liệu đi TRƯỚC giao diện):
--   1. Chạy migration này — AN TOÀN chạy TRƯỚC deploy, vì nó tạo dòng ở
--      `enabled = false` và `on conflict do update` CỐ Ý không đụng cột
--      `enabled` nên chạy lại không lật trạng thái.
--   2. Đợi production deploy READY, verify `/app/gio-sinh` trả 200
--      (mốc đối chứng: ngay trước deploy nó phải còn 404).
--   3. RỒI MỚI chạy câu bật ở cuối file.
-- Bật trước deploy là 404 cho người thật: `cong-cu.html` và sidebar đều lọc
-- `enabled = eq.true`.

insert into public.tool_pricing
  (tool_id, label, credits, is_free, enabled, category, icon, sort_order,
   description, question, app_path, page_path)
values (
  'gio-sinh',
  'Xác Định Giờ Sinh',
  -- 50 Lượng: Henry chốt. Ghi lại đánh đổi đã nêu lúc chốt để lần sau đọc lại
  -- không phải đoán — chi phí thật của tool này ≈ 0đ (0 lượt LLM, ~100ms tra
  -- bảng), nên 50 là giá theo GIÁ TRỊ chứ không theo chi phí. Rủi ro đã nêu:
  -- đây là CỬA VÀO của mọi tool tử vi khác, đặt cao thì chặn đúng đầu phễu.
  -- Con số cần nhìn sau 1–2 tuần: cột mở → tính thử → bấm mở trong panel
  -- "Phễu Theo Tool". Tỉ lệ bấm-mở thấp thì hạ giá bằng MỘT câu update, không
  -- cần deploy.
  50,
  false,
  false,   -- ⚠️ BẬT SAU KHI DEPLOY — xem câu cuối file
  'Luận Giải',
  '⏱',
  95,
  'Không nhớ giờ sinh? Lập cả 12 lá số khả nghi rồi thu hẹp bằng khảo sát về sức khoẻ và các giai đoạn đã sống qua.',
  'Tôi không nhớ giờ sinh thì làm sao xem tử vi?',
  '/app/gio-sinh',
  null
)
on conflict (tool_id) do update set
  label       = excluded.label,
  credits     = excluded.credits,
  is_free     = excluded.is_free,
  category    = excluded.category,
  icon        = excluded.icon,
  sort_order  = excluded.sort_order,
  description = excluded.description,
  question    = excluded.question,
  app_path    = excluded.app_path,
  page_path   = excluded.page_path,
  updated_at  = now();
-- ⛔ CỐ Ý KHÔNG cập nhật `enabled` ở khối trên: chạy lại file này không được
-- phép lật một tool đang bật thành tắt, hay bật một tool chưa deploy xong.

-- ── CHẠY SAU KHI DEPLOY READY ────────────────────────────────
-- update public.tool_pricing set enabled = true, updated_at = now()
--  where tool_id = 'gio-sinh';
