-- migration-marketing-acquisition.sql  (Marketing Sprint 3 — acquisition + campaign + traffic detail)
-- ============================================================
-- 3 RPC bổ sung cho dashboard Marketing (đọc events + user_attribution +
-- credit_transactions). security definer + grant service_role. Gọi từ /api/payment
-- (service key) qua action admin-marketing.
--   • marketing_acquisition(from,to): signup theo NGÀY × KÊNH first-touch (chart).
--   • marketing_campaigns(from,to): gom theo utm_campaign (chỉ dòng có campaign)
--     → signup / paid / doanh thu.
--   • marketing_traffic(from,to): JSON {top_paths, top_referrers} (page_view visitors).
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

-- Acquisition: mỗi (ngày, kênh) → số đăng ký. Nuôi biểu đồ signups/ngày theo kênh.
create or replace function public.marketing_acquisition(p_from timestamptz, p_to timestamptz)
returns table(day date, source text, signups bigint)
language sql
security definer
set search_path = public
as $$
  select
    (date_trunc('day', ua.signup_at))::date as day,
    coalesce(
      nullif(ua.first_utm_source, ''),
      case when coalesce(ua.first_referrer, '') <> '' then 'referral' else 'direct' end
    ) as source,
    count(*)::bigint as signups
  from user_attribution ua
  where ua.signup_at >= p_from and ua.signup_at < p_to
  group by 1, 2
  order by 1;
$$;

-- Campaign UTM: chỉ user có first_utm_campaign. Signup / paid / doanh thu theo campaign.
create or replace function public.marketing_campaigns(p_from timestamptz, p_to timestamptz)
returns table(campaign text, source text, signups bigint, paid bigint, revenue_credits bigint)
language sql
security definer
set search_path = public
as $$
  select
    ua.first_utm_campaign as campaign,
    coalesce(nullif(ua.first_utm_source, ''), '—') as source,
    count(*)::bigint as signups,
    count(*) filter (where p.paid_credits > 0)::bigint as paid,
    coalesce(sum(p.paid_credits), 0)::bigint as revenue_credits
  from user_attribution ua
  left join lateral (
    select coalesce(sum(ct.amount), 0) as paid_credits
    from credit_transactions ct
    where ct.user_id = ua.user_id and ct.type = 'topup'
  ) p on true
  where ua.signup_at >= p_from and ua.signup_at < p_to
    and coalesce(ua.first_utm_campaign, '') <> ''
  group by 1, 2
  order by signups desc;
$$;

-- Traffic detail: top landing paths + top referrers (theo distinct visitor page_view).
create or replace function public.marketing_traffic(p_from timestamptz, p_to timestamptz)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'top_paths', (
      select coalesce(json_agg(t), '[]'::json) from (
        select path, count(distinct coalesce(anon_id, user_id::text)) as visitors
        from events
        where event_type = 'page_view' and ts >= p_from and ts < p_to and coalesce(path, '') <> ''
        group by path order by visitors desc limit 15
      ) t
    ),
    'top_referrers', (
      select coalesce(json_agg(t), '[]'::json) from (
        select referrer, count(distinct coalesce(anon_id, user_id::text)) as visitors
        from events
        where event_type = 'page_view' and ts >= p_from and ts < p_to and coalesce(referrer, '') <> ''
        group by referrer order by visitors desc limit 15
      ) t
    )
  );
$$;

grant execute on function public.marketing_acquisition(timestamptz, timestamptz) to service_role;
grant execute on function public.marketing_campaigns(timestamptz, timestamptz)   to service_role;
grant execute on function public.marketing_traffic(timestamptz, timestamptz)     to service_role;
