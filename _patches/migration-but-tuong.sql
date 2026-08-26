-- ============================================================
-- Tool "Bút Tướng — Xem Chữ Ký" (but-tuong)
--
-- Khác các tool Vision khác trong nhóm "Xem Tướng" (dien-tuong/nhan-tuong/
-- thu-tuong): but-tuong KHÔNG gửi ảnh gốc lên server. Engine đo (6 trục
-- thần·khí·cốt·nhục·huyết·thế theo 蘇軾《論書》) chạy HẾT ở client
-- (`public/tools-shared/but-tuong.js`) — server chỉ nhận object số đã đo rồi
-- diễn giải bằng LLM (`app/api/but-tuong/route.js`). Không có bảng lịch sử
-- riêng — cố ý, vì chữ ký là dữ liệu có hiệu lực pháp lý, xem
-- docs/COPHAP-BUT-TUONG.md §9. `tuong_readings` (bảng lịch sử của
-- dien-tuong/nhan-tuong/thu-tuong/thanh-tuong) CÓ hỗ trợ 'but-tuong' qua
-- `app/api/history/route.ts` (chỉ lưu TEXT luận giải, không lưu chữ ký).
--
-- Giá 12 Lượng — giữa vision-đọc-ảnh thường (dien-tuong/nhan-tuong/thu-tuong
-- = 10) và mau-sac-hop-menh (12): but-tuong có thêm bước đo engine + đối
-- chiếu dụng thần, không chỉ đọc ảnh suông.
--
-- ⚠️ CỐ Ý `enabled=false` — `cong-cu.html` và `tuvi-paywall.js` đều lọc
-- `enabled=eq.true`, bật TRƯỚC khi deploy là người thật bấm vào trang chưa
-- tồn tại. Câu bật nằm ở cuối file, chạy SAU khi prod đã phục vụ được trang.
-- ============================================================

insert into public.tool_pricing
  (tool_id, label, credits, is_free, enabled, category, icon, sort_order,
   description, need_tags, question, app_path, page_path)
values
  ('but-tuong', 'Bút Tướng — Xem Chữ Ký', 12, false, false,
   'Xem Tướng', 'pen-line', 70,
   'Ký trực tiếp trên màn hình hoặc tải ảnh chữ ký lên — đo 6 trục Thần·Khí·Cốt·Nhục·Huyết·Thế theo cổ pháp thư pháp, đối chiếu ngũ hành nét với dụng thần bát tự nếu có ngày sinh.',
   'hieu-minh', 'Chữ ký của tôi nói lên điều gì?', '/app/but-tuong', '/tools/but-tuong-ai.html')
on conflict (tool_id) do update
  set label       = excluded.label,
      credits     = excluded.credits,
      is_free     = excluded.is_free,
      category    = excluded.category,
      icon        = excluded.icon,
      sort_order  = excluded.sort_order,
      description = excluded.description,
      need_tags   = excluded.need_tags,
      question    = excluded.question,
      app_path    = excluded.app_path,
      page_path   = excluded.page_path,
      updated_at  = now();
-- KHÔNG đặt `enabled` ở nhánh DO UPDATE: chạy lại migration sau khi đã bật
-- trên prod thì không được lặng lẽ tắt tool đi.

SELECT tool_id, label, category, icon, credits, is_free, enabled, sort_order, app_path, page_path
  FROM public.tool_pricing WHERE tool_id = 'but-tuong';

-- ── CHẠY SAU KHI DEPLOY XONG ────────────────────────────────
-- UPDATE public.tool_pricing SET enabled = true, updated_at = now()
--  WHERE tool_id = 'but-tuong';
