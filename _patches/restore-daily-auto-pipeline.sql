-- _patches/restore-daily-auto-pipeline.sql
-- Bật lại pg_cron `daily-auto-pipeline` (Pipeline YouTube, 07:00 VN) đã gỡ ngày
-- 2026-11-11 (W1, #1207). Câu lệnh khôi phục từ cron.job_run_details (jobid 1)
-- vì không chụp lại cron.job trước khi gỡ. CHỈ chạy khi muốn bật lại.
select cron.schedule(
  'daily-auto-pipeline',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dciwkfdqhhddeymlisey.supabase.co/functions/v1/auto-pipeline',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
