-- migration-campaign-funnel-daily.sql
-- ============================================================
-- Bậc 4 (Tầng 2 — Nối) của docs/GROWTH-DATA-PLAN.md. RPC MỘT hàm gộp cả
-- traffic + tiền theo (ngày, utm_campaign) — cái "chỗ khó thật" mà
-- Windsor.ai không làm được: nối ad spend (ext_metrics_daily, đọc ở phía
-- TypeScript — lib/growth/engine.ts) với phễu NỘI BỘ theo đúng campaign.
--
-- KHOÁ JOIN: `events.utm_campaign` — track.js đã tự suy
-- `utm_campaign=gad_campaignid` cho click Google Ads auto-tagging (xem
-- nhat-ky/2026-09.md "Google Ads có traffic thật, 0 sign up", 2026-09-01),
-- nên với Google Ads, `utm_campaign` KHỚP đúng `entity` mà bậc 1 lưu ở
-- `ext_metrics_daily(source='ga4_ads')`. ⚠️ Với Meta Ads, KHÔNG có patch
-- tương tự — `utm_campaign` cho traffic từ Facebook/Instagram Ads phụ
-- thuộc HOÀN TOÀN vào việc dán tay UTM param có khớp đúng campaign ID mà
-- Meta Insights API trả về hay không, và điều đó CHƯA được xác nhận. Ghi
-- lại đúng luật "nghi sai thì ghi lại, không sửa mò" — không tự chế thêm
-- một tầng suy diễn nào ở đây; phía gọi (engine.ts) phải tự xử lý phần
-- spend không khớp được bằng nhãn `unattributed`, không âm thầm bỏ.
--
-- BA NGUỒN SỰ THẬT KHÁC NHAU, snapshot theo NGÀY của mỗi nguồn:
--   • traffic  — events, per-EVENT utm_campaign (không phải first-touch),
--     lọc bot đúng pattern ĐÃ CÓ của dau_human_daily/marketing_funnel
--     (bot_anon_ids() theo hành vi, KHÔNG chỉ events.is_bot tự khai).
--   • signup   — auth.users (ĐẾM THẬT, không qua funnel) join
--     user_attribution.first_utm_campaign — cùng khuôn marketing_campaigns()
--     đã có, vì campaign chỉ gắn được vào một user ở mốc first-touch.
--   • money    — credit_transactions (type='topup') join CÙNG khoá
--     first_utm_campaign, trả `revenue_credits` (Lượng, CHƯA quy đổi VNĐ)
--     — quy đổi làm ở TypeScript qua vndPerCredit() (lib/billing/packages.ts),
--     đúng luật "MỘT hàm quy đổi" mà tool-profit.ts (PR #865) đã đặt ra.
--
-- Ba nguồn full-outer-join theo (day, campaign) — ngày/campaign chỉ có ở
-- MỘT nguồn (vd traffic có mà chưa ai mua) vẫn phải hiện ra, không rơi mất.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create or replace function public.campaign_funnel_daily(p_from timestamptz, p_to timestamptz)
returns table(
  day             date,
  campaign        text,
  visitors_human  bigint,
  tool_run        bigint,
  preview_shown   bigint,
  signup          bigint,
  purchase        bigint,
  revenue_credits bigint
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with bots as (
    select bai as anon_id from public.bot_anon_ids(p_from, p_to) bai
  ),
  traffic as (
    select
      (e.ts at time zone 'Asia/Ho_Chi_Minh')::date as t_day,
      e.utm_campaign as t_campaign,
      count(distinct coalesce(e.user_id::text, e.anon_id)) as t_visitors_human,
      count(distinct coalesce(e.user_id::text, e.anon_id))
        filter (where e.event_type in ('tool_open', 'tool_run')) as t_tool_run,
      count(distinct coalesce(e.user_id::text, e.anon_id))
        filter (where e.event_type = 'preview_shown') as t_preview_shown
    from public.events e
    where e.ts >= p_from and e.ts < p_to
      and coalesce(e.utm_campaign, '') <> ''
      and not coalesce(e.is_bot, false)
      and (e.anon_id is null or e.anon_id not in (select anon_id from bots))
    group by 1, 2
  ),
  signups as (
    select
      (u.created_at at time zone 'Asia/Ho_Chi_Minh')::date as s_day,
      ua.first_utm_campaign as s_campaign,
      count(*) as s_signup
    from auth.users u
    join public.user_attribution ua on ua.user_id = u.id
    where u.created_at >= p_from and u.created_at < p_to
      and coalesce(ua.first_utm_campaign, '') <> ''
    group by 1, 2
  ),
  money as (
    select
      (ct.created_at at time zone 'Asia/Ho_Chi_Minh')::date as m_day,
      ua.first_utm_campaign as m_campaign,
      count(*) filter (where ct.type = 'topup') as m_purchase,
      coalesce(sum(ct.amount) filter (where ct.type = 'topup'), 0) as m_revenue_credits
    from public.credit_transactions ct
    join public.user_attribution ua on ua.user_id = ct.user_id
    where ct.created_at >= p_from and ct.created_at < p_to
      and coalesce(ua.first_utm_campaign, '') <> ''
    group by 1, 2
  )
  select
    coalesce(traffic.t_day, signups.s_day, money.m_day) as day,
    coalesce(traffic.t_campaign, signups.s_campaign, money.m_campaign) as campaign,
    coalesce(traffic.t_visitors_human, 0) as visitors_human,
    coalesce(traffic.t_tool_run, 0) as tool_run,
    coalesce(traffic.t_preview_shown, 0) as preview_shown,
    coalesce(signups.s_signup, 0) as signup,
    coalesce(money.m_purchase, 0) as purchase,
    coalesce(money.m_revenue_credits, 0) as revenue_credits
  from traffic
  full outer join signups on signups.s_day = traffic.t_day and signups.s_campaign = traffic.t_campaign
  full outer join money
    on money.m_day = coalesce(traffic.t_day, signups.s_day)
    and money.m_campaign = coalesce(traffic.t_campaign, signups.s_campaign)
$$;

-- Postgres cấp EXECUTE cho PUBLIC theo mặc định trên hàm mới (đúng lỗ đã cắn
-- ở marketing_signup_truth, xem migration-revoke-signup-truth.sql) — revoke
-- tường minh, không chỉ trông chờ vào việc chỉ grant cho service_role.
revoke execute on function public.campaign_funnel_daily(timestamptz, timestamptz)
  from public, anon, authenticated;

grant execute on function public.campaign_funnel_daily(timestamptz, timestamptz) to service_role;
