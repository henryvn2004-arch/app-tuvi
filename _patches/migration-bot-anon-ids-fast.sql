-- migration-bot-anon-ids-fast.sql  (2026-10-06)
--
-- VÌ SAO: cron `cmo-digest` chết 4 ngày liền (02→05/10) vì RPC `marketing_funnel`
-- dính `57014 statement timeout`. Từ 30/09 có đợt bot ~30–43k event/ngày (11–14k
-- anon_id/ngày, ~99% is_bot) nên `bot_anon_ids()` — vốn có subquery đặt trong
-- `HAVING bool_or(ua IN (select bot_ua_fleets())) OR anon_id IN (select
-- bot_phantom_anon_ids())` — bị tính LẶP: một lần gọi 7 ngày mất ~15 s (từng phần
-- riêng: fleets 1,4 s · phantom 0,7 s · gom is_bot 0,25 s), mà `marketing_funnel`
-- lại gọi nó HAI lần.
--
-- SỬA: (1) `bot_anon_ids` tính fleets + phantom ĐÚNG MỘT LẦN bằng CTE MATERIALIZED
-- rồi mới gom nhóm — kết quả giống hệt bản cũ (đối chiếu 73.308 id, 0 lệch hai
-- chiều). (2) `marketing_funnel` tính tập bot MỘT lần cho cả visitors_human lẫn
-- visitors_bot. Chữ ký, SECURITY DEFINER, search_path, quyền: GIỮ NGUYÊN.

create or replace function public.bot_anon_ids(p_from timestamptz, p_to timestamptz)
returns setof text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with fleets as materialized (
    select public.bot_ua_fleets() as ua
  ),
  phantom as materialized (
    select public.bot_phantom_anon_ids(p_from, p_to) as id
  ),
  w as (
    select e.anon_id,
           bool_or(e.is_bot)                       as b,
           bool_or(e.ua in (select ua from fleets)) as fl
      from public.events e
     where e.ts >= p_from and e.ts < p_to
       and e.anon_id is not null
     group by e.anon_id
  )
  select w.anon_id
    from w
   where w.b or w.fl
      or w.anon_id in (select id from phantom)
$$;

create or replace function public.marketing_funnel(p_from timestamptz, p_to timestamptz)
returns json
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with bots as materialized (
    select public.bot_anon_ids(p_from, p_to) as anon_id
  )
  select json_build_object(
    'visitors', (
      select count(distinct coalesce(anon_id, user_id::text))
      from events where event_type = 'page_view' and ts >= p_from and ts < p_to
    ),
    'visitors_human', (
      select count(distinct coalesce(e.anon_id, e.user_id::text))
      from events e
      where e.event_type = 'page_view' and e.ts >= p_from and e.ts < p_to
        and (e.anon_id is null
             or e.anon_id not in (select anon_id from bots))
    ),
    'visitors_bot', (
      select count(distinct e.anon_id)
      from events e
      where e.event_type = 'page_view' and e.ts >= p_from and e.ts < p_to
        and e.anon_id in (select anon_id from bots)
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

-- Giữ nguyên quyền (CREATE OR REPLACE không đổi ACL, ghi lại cho chắc).
revoke all on function public.bot_anon_ids(timestamptz, timestamptz)       from public, anon, authenticated;
revoke all on function public.marketing_funnel(timestamptz, timestamptz)   from public, anon, authenticated;
grant execute on function public.marketing_funnel(timestamptz, timestamptz) to service_role;
