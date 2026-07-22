-- migration-marketing-rpcs.sql  (Marketing Sprint 2 — RPC tổng hợp cho dashboard)
-- ============================================================
-- Hàm aggregate cho trang admin Marketing (đọc events + user_attribution +
-- credit_transactions). Gọi từ server /api/payment (service key) — KHÔNG expose
-- trực tiếp cho client. security definer + grant service_role.
--   • marketing_funnel(from,to): đếm từng bước funnel trong cửa sổ thời gian.
--   • marketing_sources(from,to): gom theo KÊNH (first-touch) → signup / paid / doanh thu.
-- "paid" & doanh thu lấy từ credit_transactions (type=topup) — nguồn tiền thật sẵn có.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

-- Funnel: mỗi bước là 1 lát cắt trong cửa sổ [from,to). Không phải cohort chặt —
-- là "stage snapshot" (chuẩn cho dashboard tổng quan).
create or replace function public.marketing_funnel(p_from timestamptz, p_to timestamptz)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'visitors', (
      select count(distinct coalesce(anon_id, user_id::text))
      from events where event_type = 'page_view' and ts >= p_from and ts < p_to
    ),
    'signups', (
      select count(*) from user_attribution
      where signup_at >= p_from and signup_at < p_to
    ),
    'activated', (
      select count(distinct user_id) from events
      where event_type = 'tool_run' and user_id is not null and ts >= p_from and ts < p_to
    ),
    'topup_intent', (
      select count(distinct coalesce(user_id::text, anon_id)) from events
      where event_type = 'topup_start' and ts >= p_from and ts < p_to
    ),
    'paid', (
      select count(distinct user_id) from credit_transactions
      where type = 'topup' and created_at >= p_from and created_at < p_to
    ),
    'returned', (
      select count(*) from (
        select user_id from events
        where user_id is not null and ts >= p_from and ts < p_to
        group by user_id having count(distinct date_trunc('day', ts)) >= 2
      ) t
    )
  );
$$;

-- Sources: gom user đăng ký trong cửa sổ theo KÊNH first-touch, kèm số đã nạp +
-- tổng Lượng nạp (doanh thu quy đổi ở UI: 1 Lượng ≈ 2.500đ).
create or replace function public.marketing_sources(p_from timestamptz, p_to timestamptz)
returns table(source text, signups bigint, paid bigint, revenue_credits bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(
      nullif(ua.first_utm_source, ''),
      case when coalesce(ua.first_referrer, '') <> '' then 'referral' else 'direct' end
    ) as source,
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
  group by 1
  order by signups desc;
$$;

grant execute on function public.marketing_funnel(timestamptz, timestamptz)  to service_role;
grant execute on function public.marketing_sources(timestamptz, timestamptz) to service_role;
