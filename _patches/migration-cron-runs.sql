-- migration-cron-runs.sql
-- S2 Command Center · bảng log mỗi lần cron chạy (Vercel/pg_cron/edge).
-- Ghi bằng service role (lib/cron/log.ts withCronLog); admin đọc qua
-- /api/payment?action=admin-cron-runs. RLS bật, KHÔNG policy = khoá
-- anon/authenticated (chỉ service key qua server route mới thấy).
-- ĐÃ ÁP trên project dciwkfdqhhddeymlisey (Supabase MCP apply_migration).

create table if not exists public.cron_runs (
  id bigint generated always as identity primary key,
  job_key text not null,
  source text not null default 'vercel',   -- vercel | pgcron | edge
  status text not null default 'ok',        -- ok | error | skip | running
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists cron_runs_job_time_idx on public.cron_runs (job_key, started_at desc);
create index if not exists cron_runs_time_idx on public.cron_runs (started_at desc);
alter table public.cron_runs enable row level security;

comment on table public.cron_runs is 'Log mỗi lần cron chạy (Vercel/pg_cron/edge). Ghi bằng service role; admin đọc qua /api/payment?action=admin-cron-runs. RLS bật, không policy = khoá anon/authenticated.';
