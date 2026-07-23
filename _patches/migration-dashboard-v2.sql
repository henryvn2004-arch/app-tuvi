-- migration-dashboard-v2.sql  (Dashboard revamp — Engagement + Content Revenue + At-risk)
-- ============================================================
-- 3 RPC cho Dashboard tổng quan (đọc events + user_attribution + credit_transactions
-- + user_credits + auth.users). security definer + grant service_role. Gọi từ
-- /api/payment (service key) qua action admin-dashboard-v2.
--   • dashboard_engagement(days): DAU mỗi ngày (mảng) + DAU/WAU/MAU hiện tại
--     + kỳ trước liền kề (để tính % thay đổi) + stickiness (DAU/MAU).
--   • dashboard_content_revenue(from,to): doanh thu tiền thật quy theo trang
--     landing lúc đăng ký (first_landing_path) — la-so/* gộp chung (438K trang
--     SEO), còn lại (khảo luận/nghiên cứu/trang chủ...) giữ path riêng.
--   • dashboard_at_risk(idle_days,min_events,limit): user còn số dư > 0, từng
--     hoạt động đủ (chống noise 1-lần-rồi-thôi), nhưng im lặng idle_days+ ngày.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create or replace function public.dashboard_engagement(p_days int default 30)
returns json
language sql
security definer
set search_path = public
as $$
  with daily as (
    select
      (date_trunc('day', ts))::date as day,
      count(distinct coalesce(user_id::text, anon_id)) as dau
    from events
    where ts >= (current_date - (p_days - 1)) and ts < (current_date + 1)
    group by 1
  ),
  days_series as (
    select gs::date as day
    from generate_series(current_date - (p_days - 1), current_date, interval '1 day') gs
  ),
  filled as (
    select ds.day, coalesce(d.dau, 0) as dau
    from days_series ds
    left join daily d on d.day = ds.day
    order by ds.day
  )
  select json_build_object(
    'days', (select coalesce(json_agg(json_build_object('day', day, 'dau', dau) order by day), '[]'::json) from filled),
    'dau_today', (select count(distinct coalesce(user_id::text, anon_id)) from events where ts >= current_date and ts < current_date + 1),
    'dau_yesterday', (select count(distinct coalesce(user_id::text, anon_id)) from events where ts >= current_date - 1 and ts < current_date),
    'wau', (select count(distinct coalesce(user_id::text, anon_id)) from events where ts >= current_date - 6 and ts < current_date + 1),
    'wau_prev', (select count(distinct coalesce(user_id::text, anon_id)) from events where ts >= current_date - 13 and ts < current_date - 6),
    'mau', (select count(distinct coalesce(user_id::text, anon_id)) from events where ts >= current_date - 29 and ts < current_date + 1),
    'mau_prev', (select count(distinct coalesce(user_id::text, anon_id)) from events where ts >= current_date - 59 and ts < current_date - 29)
  );
$$;

create or replace function public.dashboard_content_revenue(p_from timestamptz, p_to timestamptz)
returns table(landing text, signups bigint, paid bigint, revenue_vnd bigint)
language sql
security definer
set search_path = public
as $$
  select
    case
      when ua.first_landing_path like '/la-so/%' then '/la-so/* (438K trang SEO)'
      when coalesce(ua.first_landing_path, '') in ('', '/') then '/ (Trang chủ)'
      else ua.first_landing_path
    end as landing,
    count(*)::bigint as signups,
    count(*) filter (where r.vnd > 0)::bigint as paid,
    coalesce(sum(r.vnd), 0)::bigint as revenue_vnd
  from user_attribution ua
  left join lateral (
    select coalesce(sum(coalesce(ct.amount_vnd, ct.amount * 2500)), 0) as vnd
    from credit_transactions ct
    where ct.user_id = ua.user_id and ct.type = 'topup'
  ) r on true
  where ua.signup_at >= p_from and ua.signup_at < p_to
  group by 1
  order by revenue_vnd desc
  limit 10;
$$;

create or replace function public.dashboard_at_risk(p_idle_days int default 14, p_min_events int default 3, p_limit int default 20)
returns table(user_id uuid, email text, balance int, last_active timestamptz, event_count bigint)
language sql
security definer
set search_path = public
as $$
  select uc.user_id, u.email, uc.balance, ea.last_active, ea.cnt
  from user_credits uc
  join auth.users u on u.id = uc.user_id
  join lateral (
    select max(e.ts) as last_active, count(*) as cnt
    from events e where e.user_id = uc.user_id
  ) ea on true
  where uc.balance > 0
    and ea.cnt >= p_min_events
    and ea.last_active < now() - (p_idle_days || ' days')::interval
  order by uc.balance desc
  limit p_limit;
$$;

grant execute on function public.dashboard_engagement(int) to service_role;
grant execute on function public.dashboard_content_revenue(timestamptz, timestamptz) to service_role;
grant execute on function public.dashboard_at_risk(int, int, int) to service_role;
