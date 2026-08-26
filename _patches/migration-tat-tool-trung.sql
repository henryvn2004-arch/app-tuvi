-- migration-tat-tool-trung.sql — ✅ ĐÃ CHẠY PROD 2026-08-10
--
-- Tắt 6 công cụ TRÙNG LẶP khỏi danh mục. Đây là `enabled=false`, KHÔNG xoá:
-- trang `/tools/<id>.html` vẫn còn trên đĩa, vẫn mở được bằng URL, vẫn nằm
-- trong sitemap — chỉ thôi hiện ở `/cong-cu`, sidebar Luận Đường và dashboard
-- `/app` (cả ba bề mặt đều lọc `enabled=eq.true`). Bật lại là một câu SQL.
--
-- VÌ SAO 6 CÁI NÀY:
--   sao-nam · cach-cuc · dai-van · van-thang — bốn trang CÙNG hỏi một bộ ngày
--     sinh, CÙNG gọi `anSaoLaSo` lập lá số ĐẦY ĐỦ, rồi mỗi trang chỉ hiện MỘT
--     mảnh. Bốn slot danh mục cho một việc mà `an-sao` đã làm trọn.
--   han-nam — bảng tra hạn thuần, không dùng engine; trùng dai-van/van-thang.
--   tu-tru — bản miễn phí mỏng của `tu-binh` (50 Lượng), cùng engine bát tự.
--
-- ⚠️ `an-sao` CỐ Ý GIỮ: nó là lá số đầy đủ và là cửa miễn phí DUY NHẤT còn
-- trong danh mục — `/app/la-so` đã gộp vào `luan-giai` và không còn dòng nào
-- trong `tool_pricing`, tức nó đang là trang mồ côi không hiện ở đâu cả.
-- Tắt nốt `an-sao` là khu miễn phí mất hẳn đường lập lá số.
--
-- Kết quả đo sau khi chạy: 61 → 54 công cụ bật (18 miễn phí).

update public.tool_pricing
   set enabled = false, updated_at = now()
 where tool_id in ('sao-nam', 'cach-cuc', 'dai-van', 'van-thang', 'han-nam', 'tu-tru');

-- Lùi lại (nếu thấy hụt):
-- update public.tool_pricing set enabled = true, updated_at = now()
--  where tool_id in ('sao-nam','cach-cuc','dai-van','van-thang','han-nam','tu-tru');
