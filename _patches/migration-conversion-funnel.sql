-- ============================================================
-- PHỄU CHUYỂN ĐỔI: khách vô danh 3 → 6 câu · đăng ký tặng 10 câu hỏi Thầy
-- ============================================================
-- Đo prod 30 ngày (2026-09-27):
--   • 96 khách vô danh thử rail → 43 (45%) hỏi HẾT 3 câu. Khách mới còn đang
--     thử "cái này có khác ChatGPT không" bằng câu chung chung; 5–7 câu mới đủ
--     thấy khác biệt (Henry chốt) → 6.
--   • Quà đăng ký 50 Lượng từng = 10 câu, nay = 5 câu vì giá rail tăng 5→10
--     (tuần 14/09) — bị cắt nửa IM LẶNG. 14 người tiêu hết quà rồi bỏ, 0 nạp.
--     Nay tặng thêm câu hỏi TÍNH BẰNG CÂU (`rail_free_turns`, cấp ở
--     /api/signup-signal) để quà không trôi theo giá.
-- Vốn thật: ~70–130đ/câu (events llm_usage tool_id='chat', Gemini Flash).
-- 6 câu × 200 trần/ngày toàn hệ thống vẫn dưới ~30.000đ/ngày.
--
-- An toàn chạy TRƯỚC deploy: code mặc định `rail.signup_free_turns`=10 khi
-- thiếu dòng; `anon.rail_trial_turns` chỉ là con số trần, không phụ thuộc code.
-- ============================================================

insert into public.app_config (key, value, note) values
  ('rail.signup_free_turns', to_jsonb(10),
   'Số câu hỏi Thầy TẶNG khi đăng ký (rail_free_turns), cấp 1 lần ở /api/signup-signal. 0 = tắt.')
on conflict (key) do nothing;

update public.app_config set value = to_jsonb(6) where key = 'anon.rail_trial_turns';
