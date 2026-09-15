-- ============================================================
-- QUÀ RAIL KÈM MỖI LƯỢT MUA TOOL — M1 track marketing "kiểu Shopee"
-- ============================================================
-- Vì sao: Phòng lợi nhuận theo tool (lib/marketing/tool-profit.ts, PR #865)
-- lộ ra rail-message đang LỖ khi bán lẻ (~4.614đ chi phí/lượt gọi model vs
-- 2.500đ giá bán 5 Lượng). Đồng thời user hỏi "xem bằng engine này khác gì
-- ChatGPT" — câu trả lời tốt nhất là làm rail rõ ràng là QUÀ KÈM một sản
-- phẩm thật đã trả tiền, không phải một dịch vụ chat chung chung bán lẻ.
--
-- Giải pháp: KHÔNG cần bảng/RPC mới. `rail_free_turns` + `rail_free_grant`
-- (migration-viral-budget.sql) đã có sẵn, và RPC đã dùng `greatest()` khi
-- ghi — nghĩa là HAI nguồn cấp (viral loop ảnh free + quà mua tool) CỘNG
-- SINH an toàn trên CÙNG một bảng mà không cần sửa gì ở DB, không giẫm lên
-- nhau (nguồn nào cấp SAU không làm giảm số đã có từ nguồn TRƯỚC).
--
-- Chỉ cần MỘT khoá `app_config` mới + gọi `rail_free_grant` từ
-- `handleDeduct` (app/api/payment/route.ts) sau MỌI lượt mua tool thành
-- công — xem `railBonusTurnsPerPurchase()` (lib/billing/viral-budget.ts).
--
-- CỐ Ý KHÔNG dùng chung khoá `viral.free_rail_turns`: khoá đó là ngân sách
-- THÍ NGHIỆM CÓ TRẦN $15/tháng của viral loop (ảnh free, người CHƯA trả
-- tiền gì). Ở đây là quà kèm một lượt mua THẬT — đã có doanh thu đỡ, không
-- cần trần ngân sách riêng. Mặc định 5 lượt: ngay cả tool rẻ nhất đã đo
-- (laso, ~300đ chi phí/lượt) vẫn dư sức đỡ 5 lượt rail (~4.614đ/lượt) từ
-- biên đã thu.
--
-- CỐ Ý CHƯA đụng tới việc bán lẻ rail theo tin nhắn
-- (`tool_pricing['rail-message']`, trừ thẳng trong `/api/v1/chat`) — giữ
-- giá đã sửa hay bỏ hẳn đường bán lẻ là quyết định rộng hơn, cần Henry chốt
-- riêng trước khi đụng vào đường đang có doanh thu thật.
-- ============================================================

insert into public.app_config (key, value, note) values
  ('rail.purchase_bonus_turns', to_jsonb(5),
   'Số lượt rail TẶNG sau mỗi lượt mua tool thành công (handleDeduct). Khác viral.free_rail_turns (ngân sách $15/tháng của viral loop ảnh free) — đây là quà kèm mua THẬT, không cần trần ngân sách riêng vì đã có doanh thu đỡ. 0 = tắt.')
on conflict (key) do nothing;
