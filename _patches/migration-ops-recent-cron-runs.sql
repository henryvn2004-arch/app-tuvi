-- _patches/migration-ops-recent-cron-runs.sql
-- ============================================================
-- Sổ job đọc `cron_runs` bằng MỘT query "top N dòng gần nhất TOÀN BẢNG"
-- (CRON_RUNS_LIMIT=1000, xem lib/ops/jobs.ts). Đó đúng theo thiết kế hôm
-- 30/07, nhưng từ đó tới nay thêm 3 job chạy mỗi 15 phút (error-alerts,
-- tool-usage-alerts, email-broadcast-drain) — riêng ba job này đã sinh
-- ~250 dòng/ngày. Job TUẦN (autopilot-nudge, autopilot-promo, growth-accounts,
-- backlink-broken-links, cron-khao-luan-tamly...) có lượt cách nhau 3-7 ngày
-- bị đẩy ra NGOÀI 1000 dòng đó dù lượt gần nhất vẫn `ok` — `evaluateJobs` đọc
-- thành "CHƯA HỀ chạy". Đo trên prod 15/09: autopilot-nudge chạy `ok` đều đặn
-- mỗi thứ Sáu (gần nhất 11/09) nhưng bị báo động sai.
--
-- 1000 là trần `db-max-rows` của PostgREST — xin hơn cũng chỉ được 1000, dù
-- lọc theo thời gian hay không. Không sửa được bằng cách nới limit; phải đổi
-- sang lấy N dòng gần nhất CHO MỖI job_key (window function) thay vì N dòng
-- gần nhất của TOÀN BẢNG — job ồn ào không còn đẩy được job hiếm ra ngoài.
-- ============================================================

create or replace function public.ops_recent_cron_runs(p_per_job int default 50)
returns table (
  job_key    text,
  status     text,
  started_at timestamptz,
  note       text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select job_key, status, started_at, note
  from (
    select
      job_key, status, started_at, note,
      row_number() over (partition by job_key order by started_at desc) as rn
    from public.cron_runs
  ) t
  where rn <= greatest(1, least(p_per_job, 200));
$$;

comment on function public.ops_recent_cron_runs(int) is
  'COO S4: N dòng cron_runs gần nhất CHO MỖI job_key — tránh job ồn ào (chạy mỗi 15p) đẩy job hiếm (chạy mỗi tuần) ra khỏi cửa sổ.';

revoke all on function public.ops_recent_cron_runs(int) from public, anon, authenticated;
grant execute on function public.ops_recent_cron_runs(int) to service_role;
