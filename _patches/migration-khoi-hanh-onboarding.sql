-- "Khởi Hành" — thay 3 nhiệm vụ M3 độc lập bằng chuỗi 3 bước + thưởng gộp.
-- Xem lib/onboarding/tasks.ts đầu file cho toàn bộ bối cảnh (M3 chỉ 4 lượt
-- nhận / 2 người trong 66 tài khoản — docs/QUEST-PLAN.md §2/§3/§4).
--
-- KHÔNG có bảng/RPC mới: `onboarding_tasks` + `onboarding_task_claim` từ
-- _patches/migration-onboarding-tasks.sql dùng NGUYÊN VẸN — `task_key` chỉ là
-- một chuỗi, 'khoi_hanh' là một khoá mới như bất kỳ khoá nào khác. Chỉ đổi
-- MỨC THƯỞNG trong app_config (sửa bằng SQL, không cần deploy).
--
-- `luu_la_so` (10 Lượng, khoá riêng) bị XOÁ khỏi bảng thưởng vì bước "lập lá
-- số" giờ nằm TRONG chuỗi Khởi Hành (bằng chứng vẫn là `user_charts`, dùng
-- chung) — không xoá dòng lịch sử `onboarding_tasks` của người đã nhận cũ,
-- chỉ đơn giản không còn khoá thưởng riêng cho nó nữa. `bat_thong_bao` và
-- `lien_ket_kenh` giữ nguyên mức 10, chỉ đổi tầng hiển thị (xem app-home.html).
update public.app_config
set value = '{"khoi_hanh": 15, "bat_thong_bao": 10, "lien_ket_kenh": 10}'::jsonb,
    note  = 'Khởi Hành — 15 Lượng khi xong CẢ 3 bước (lập lá số/hỏi Thầy/thử 1 công cụ), một dòng onboarding_tasks khoá khoi_hanh. bat_thong_bao/lien_ket_kenh giữ 10 mỗi cái, tầng "kênh liên lạc" riêng. Đặt 0 để tắt.'
where key = 'onboarding.task_rewards';

-- Idempotent: chạy lại không đổi gì thêm (UPDATE ghi đè cùng giá trị).
