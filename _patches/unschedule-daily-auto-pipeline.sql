-- _patches/unschedule-daily-auto-pipeline.sql
-- ============================================================
-- GỠ LỊCH pg_cron `daily-auto-pipeline` (Pipeline YouTube, 07:00 VN hằng ngày).
--
-- ⚠️ KHÔNG tự chạy từ code. Chỉ chạy tay trong Supabase SQL editor, bởi người
-- có quyền, sau khi PR gỡ lịch được duyệt. Chạy trên prod là hành động khó
-- đảo ngược về mặt vận hành (muốn bật lại phải tự schedule lại đúng lịch cũ).
--
-- Trước khi chạy: chụp lại lịch + câu lệnh cũ để bật lại được (lịch và command
-- nằm ở cron.job, không nằm trong repo):
--   select jobid, jobname, schedule, command, active from cron.job
--    where jobname = 'daily-auto-pipeline';
-- Sau khi chạy: câu trên phải trả về 0 dòng.
-- ============================================================

select cron.unschedule('daily-auto-pipeline');
