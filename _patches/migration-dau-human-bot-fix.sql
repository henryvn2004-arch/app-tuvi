-- P0 — dau_human_daily() và tool_funnel() bỏ sót bộ lọc fleet bot hành vi.
--
-- marketing_funnel().visitors_human ĐÃ dùng đúng bot_anon_ids() (fleet phát
-- hiện qua hành vi: nhiều anon_id cùng một UA, mỗi anon chỉ 1 pageview, không
-- referrer, không tương tác — KHÁC hẳn events.is_bot vốn chỉ bắt UA tự nhận
-- diện tĩnh kiểu AhrefsBot). dau_human_daily() lại chỉ lọc theo is_bot, nên
-- panel DAU/WAU/MAU và cảnh báo sụt-DAU đang đọc số bị thổi phồng 2–23 lần/ngày
-- (đo 20 ngày gần nhất, 2026-08-20): cùng một fleet UA chiếm 86,9% tổng
-- anon_id nhưng KHÔNG một anon nào trong đó từng mở một tool nào cả — page_view
-- của chúng 100% chỉ chạm path "/".
--
-- Fix: mirror ĐÚNG cái pattern đã đúng sẵn trong marketing_funnel, không dựng
-- cơ chế phát hiện mới. tool_funnel() thêm cùng bộ lọc mang tính PHÒNG THỦ —
-- đo hiện tại fleet chưa từng lọt tới tool_open (0% nhiễm), nhưng hàm phục vụ
-- dữ liệu gắn liền doanh thu nên không có lý do để hở.

CREATE OR REPLACE FUNCTION public.dau_human_daily(p_days integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with bounds as (
    select date_trunc('day', (now() at time zone 'Asia/Ho_Chi_Minh'))::date as last_day,
           date_trunc('day', (now() at time zone 'Asia/Ho_Chi_Minh'))::date
             - (greatest(coalesce(p_days, 8), 1) - 1) as first_day
  ),
  win as (
    select (b.first_day::timestamp at time zone 'Asia/Ho_Chi_Minh') as ts_from,
           ((b.last_day + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh') as ts_to
    from bounds b
  ),
  bots as (
    select bai as anon_id
    from win w, public.bot_anon_ids(w.ts_from, w.ts_to) bai
  ),
  d as (
    select generate_series(b.first_day, b.last_day, interval '1 day')::date as day
    from bounds b
  ),
  e as (
    select (ev.ts at time zone 'Asia/Ho_Chi_Minh')::date as day,
           coalesce(ev.user_id::text, ev.anon_id) as who,
           (coalesce(ev.is_bot, false)
             or (ev.anon_id is not null and ev.anon_id in (select anon_id from bots))
           ) as is_bot
    from events ev, bounds b
    where ev.ts >= (b.first_day::timestamp at time zone 'Asia/Ho_Chi_Minh')
      and coalesce(ev.user_id::text, ev.anon_id) is not null
  )
  select jsonb_build_object(
    'days',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'day', to_char(x.day, 'YYYY-MM-DD'),
          'dau_all', x.dau_all,
          'dau_human', x.dau_human
        ) order by x.day
      ),
      '[]'::jsonb
    )
  )
  from (
    select d.day,
           count(distinct e.who) as dau_all,
           count(distinct e.who) filter (where not e.is_bot) as dau_human
    from d left join e on e.day = d.day
    group by d.day
  ) x;
$function$;

CREATE OR REPLACE FUNCTION public.tool_funnel(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(tool_id text, nhan text, gia integer, mo bigint, chay bigint, thu bigint, bam_mo bigint, mua bigint, luot_mua bigint, luong bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with ev as (
    select tool_canon(e.tool_id) as tool_id, e.event_type,
           coalesce(e.user_id::text, e.anon_id) as ai
      from events e
     where e.ts >= p_from and e.ts < p_to
       and e.tool_id is not null
       and coalesce(e.user_id::text, e.anon_id) is not null
       and e.event_type in ('tool_open', 'tool_run', 'preview_shown', 'unlock_click')
       and (e.anon_id is null
            or e.anon_id not in (select public.bot_anon_ids(p_from, p_to)))
  ),
  tra as (
    select tool_canon(c.type) as tool_id, c.user_id::text as ai, c.amount
      from credit_transactions c
     where c.created_at >= p_from and c.created_at < p_to
       and c.amount < 0
       and (c.type like 'use\_%' or c.type = 'chat')
  ),
  ds as (
    select p.tool_id, p.label, p.credits
      from tool_pricing p
     where p.tool_id in (select tool_id from ev union select tool_id from tra)
  )
  select d.tool_id, d.label, d.credits,
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_open'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_run'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'preview_shown'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'unlock_click'),
         (select count(distinct ai) from tra where tra.tool_id = d.tool_id),
         (select count(*) from tra where tra.tool_id = d.tool_id),
         (select coalesce(sum(-amount), 0)::bigint from tra where tra.tool_id = d.tool_id)
    from ds d
   order by 4 desc nulls last, 10 desc;
$function$;
