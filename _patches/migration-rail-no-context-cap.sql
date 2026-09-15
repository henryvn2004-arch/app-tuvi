-- ============================================================
-- BẬC 0 CỔNG RAIL — M1 track marketing "kiểu Shopee"
-- ============================================================
-- Vì sao: Henry mô tả "user vào là chat, trong khi còn chưa nhập thông tin"
-- — thói quen mở rail rồi hỏi chung chung, tốn cả ngân sách dùng thử (anon)
-- lẫn Lượng balance (logged-in) mà không bao giờ chạm tới một lá số thật.
--
-- KHÔNG chặn ngay tin đầu: `CHAT_SYSTEM_GENERAL` (lib/agent/prompts.ts) được
-- thiết kế để chủ động hỏi ngày sinh NGAY trong hội thoại rồi tự gọi
-- `lap_la_so` — chặn cứng từ tin đầu là đá vào chính cơ chế onboarding này.
-- Chỉ chặn khi đã quá `rail.no_context_msg_cap` tin mà vẫn chưa hội tụ về
-- một lá số/kịch bản.
--
-- Đặt ở app/api/v1/chat/route.ts, TRƯỚC paywall pre-check (anon-trial/balance)
-- — chặn ở đây tiết kiệm CẢ HAI ngân sách, chặn sau khi đã tiêu là quá muộn.
-- KHÔNG cần bảng/RPC mới: đếm trực tiếp trên `req.messages` (client đã resend
-- toàn bộ lịch sử hội thoại mỗi lượt), không cần đếm bền vững qua DB.
-- ============================================================

insert into public.app_config (key, value, note) values
  ('rail.no_context_msg_cap', to_jsonb(3),
   'Bậc 0 cổng rail: số tin nhắn user tối đa được hỏi chung chung (không birth/scenario) trước khi chặn, yêu cầu điền ngày sinh. 0 = tắt. Xem app/api/v1/chat/route.ts.')
on conflict (key) do nothing;
