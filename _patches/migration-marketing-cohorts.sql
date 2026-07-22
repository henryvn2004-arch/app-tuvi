-- migration-marketing-cohorts.sql  (Marketing Sprint 4 — cohort retention)
-- ============================================================
-- RPC cohort giữ chân cho dashboard Marketing. security definer + grant service_role.
--   • marketing_cohorts(weeks): mỗi cohort = TUẦN đăng ký; retention = số user của
--     cohort có hoạt động (events) ở tuần offset 0..weeks-1. Trả JSON mảng
--     [{cohort_week, size, retention:{woff:count}}] — UI quy ra %.
-- LTV theo kênh KHÔNG cần RPC riêng — tính client từ marketing_sources
-- (revenue_credits / signups). Export CSV cũng thuần client.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create or replace function public.marketing_cohorts(p_weeks int default 8)
returns json
language sql
security definer
set search_path = public
as $$
  with cohort as (
    select ua.user_id, (date_trunc('week', ua.signup_at))::date as cw
    from user_attribution ua
    where ua.signup_at >= (date_trunc('week', now()))::date - ((p_weeks - 1) * 7)
  ),
  act as (
    select distinct
      c.cw,
      c.user_id,
      (((date_trunc('week', e.ts))::date - c.cw) / 7)::int as woff
    from cohort c
    join events e on e.user_id = c.user_id and e.ts >= c.cw
  )
  select coalesce(json_agg(r order by r.cohort_week desc), '[]'::json)
  from (
    select
      c.cw as cohort_week,
      count(distinct c.user_id) as size,
      (
        select coalesce(json_object_agg(x.woff, x.cnt), '{}'::json)
        from (
          select a.woff, count(distinct a.user_id) as cnt
          from act a
          where a.cw = c.cw and a.woff between 0 and p_weeks - 1
          group by a.woff
        ) x
      ) as retention
    from cohort c
    group by c.cw
  ) r;
$$;

grant execute on function public.marketing_cohorts(int) to service_role;
