-- _patches/migration-ops-pgcron-runs.sql
-- ============================================================
-- Sổ job (lib/ops/jobs.ts, track COO S4) phán "đã chạy hay chưa" bằng bảng
-- `cron_runs` — nhưng job `auto-pipeline` chạy bằng pg_cron, chỉ bắn
-- net.http_post tới edge function, KHÔNG đi qua withCronLog nên không để lại
-- dòng nào. Sổ coi vắng-log = chưa chạy → báo động MỖI NGÀY, VĨNH VIỄN, trong
-- khi tra cron.job_run_details thì nó chạy `succeeded` đủ 8/8 ngày.
--
-- Một cảnh báo sai lặp lại hằng ngày còn hại hơn không có cảnh báo: nó dạy
-- người ta bỏ qua kênh báo động. Mà bộ này dựng lên chính vì CMO Digest từng
-- chết 14 ngày không ai thấy.
--
-- Schema `cron` KHÔNG được PostgREST expose (chỉ `public`), nên cần một hàm
-- SECURITY DEFINER ở public làm cửa đọc. Hàm CHỈ ĐỌC, và trả về đúng shape
-- của `cron_runs` (job_key/status/started_at/note) để code gộp thẳng vào cùng
-- một mảng, không phải rẽ nhánh riêng.
-- ============================================================

create or replace function public.ops_pgcron_runs(p_limit int default 100)
returns table (
  job_key    text,
  status     text,
  started_at timestamptz,
  note       text
)
language sql
security definer
set search_path = public, cron
as $$
  select
    j.jobname::text as job_key,
    -- Quy về cùng bộ trạng thái với cron_runs: ok / error / (đang chạy).
    case d.status
      when 'succeeded' then 'ok'
      when 'failed'    then 'error'
      else 'running'
    end as status,
    d.start_time as started_at,
    nullif(d.return_message, '')::text as note
  from cron.job_run_details d
  join cron.job j on j.jobid = d.jobid
  order by d.start_time desc
  limit greatest(1, least(p_limit, 500));
$$;

comment on function public.ops_pgcron_runs(int) is
  'COO S4: đọc lịch sử chạy pg_cron cho sổ job. Chỉ đọc, trả shape giống cron_runs.';

revoke all on function public.ops_pgcron_runs(int) from public, anon, authenticated;
grant execute on function public.ops_pgcron_runs(int) to service_role;
