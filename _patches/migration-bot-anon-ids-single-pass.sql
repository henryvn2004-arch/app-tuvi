-- migration-bot-anon-ids-single-pass.sql  (2026-11-11, W2)
--
-- VÌ SAO: `bot_anon_ids()` là nền của MỌI số "khách thật" (marketing_funnel,
-- dashboard_engagement, dau_human_daily, tool_funnel...) và quét `events` BA lần
-- cho cùng một cửa sổ. EXPLAIN ANALYZE trên prod 2026-11-11, cửa sổ 60 ngày
-- (cách `dashboard_engagement` gọi), tổng 10,25 s:
--   bot_ua_fleets()           2,0 s   quét 30 ngày (toàn cục, KHÔNG phụ thuộc cửa sổ)
--   bot_phantom_anon_ids()    4,2 s   quét lại events 60 ngày, gom theo anon_id
--   gom is_bot/fleet          3,7 s   quét lần thứ ba, cũng gom theo anon_id
-- Hai lần gom theo anon_id trên cùng cửa sổ là LÃNG PHÍ: phantom chỉ cần thêm vài
-- cột tổng hợp trên chính các dòng đó.
--
-- SỬA: một lượt quét per-anon tính luôn cột phantom (chỉ trên event có ua khác
-- rỗng, đúng như `bot_phantom_anon_ids`), rồi gom cụm UA trong bộ nhớ (ngưỡng 8,
-- đúng mặc định `p_min_cluster`). `bot_ua_fleets()` giữ nguyên vì nó quét cửa sổ
-- KHÁC (30 ngày cố định). Kết quả TẬP id phải giống hệt bản cũ — xem "Kiểm".
-- Chữ ký, SECURITY DEFINER, search_path, quyền: GIỮ NGUYÊN.
-- `bot_phantom_anon_ids` vẫn còn nguyên cho `traffic_quality` dùng.
--
-- HOÀN TÁC: chạy lại `bot_anon_ids` trong migration-bot-anon-ids-fast.sql.

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
  per as materialized (
    select e.anon_id,
           bool_or(e.is_bot)                        as b,
           bool_or(e.ua in (select ua from fleets)) as fl,
           -- ── cột phantom: CHỈ tính trên event có ua (y như bot_phantom_anon_ids) ──
           max(e.ua) filter (where e.ua is not null and e.ua <> '')                           as p_ua,
           count(*)  filter (where e.ua is not null and e.ua <> '')                           as p_n,
           count(*)  filter (where e.ua is not null and e.ua <> '' and e.event_type = 'page_view') as p_pv,
           count(*)  filter (where e.ua is not null and e.ua <> ''
                               and e.event_type = 'tool_open' and e.tool_id = 'home')         as p_home,
           coalesce(bool_or(e.referrer is not null and e.referrer <> '')
                      filter (where e.ua is not null and e.ua <> ''), false)                  as p_ref,
           coalesce(bool_or(e.user_id is not null)
                      filter (where e.ua is not null and e.ua <> ''), false)                  as p_login,
           count(distinct e.ts::date) filter (where e.ua is not null and e.ua <> '')          as p_days
      from public.events e
     where e.ts >= p_from and e.ts < p_to
       and e.anon_id is not null
     group by e.anon_id
  ),
  shape as (
    select anon_id, p_ua
      from per
     where p_n = 2 and p_pv = 1 and p_home = 1
       and not p_ref and not p_login and p_days = 1
  ),
  phantom as (
    select s.anon_id
      from shape s
     where s.p_ua in (select p_ua from shape group by p_ua having count(*) >= 8)
  )
  select per.anon_id
    from per
   where per.b or per.fl
      or per.anon_id in (select anon_id from phantom)
$$;

revoke all on function public.bot_anon_ids(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.bot_anon_ids(timestamptz, timestamptz) to service_role;

-- ── Kiểm (chạy tay SAU khi áp; cả hai phải trả 0 dòng) ──────────────────────
-- Đối chiếu với định nghĩa CŨ viết inline (không phụ thuộc hàm vừa thay):
--   with old as (
--     with fleets as materialized (select public.bot_ua_fleets() as ua),
--     phantom as materialized (select public.bot_phantom_anon_ids(current_date-59, current_date+1) as id),
--     w as (select e.anon_id, bool_or(e.is_bot) b, bool_or(e.ua in (select ua from fleets)) fl
--             from public.events e
--            where e.ts >= current_date-59 and e.ts < current_date+1 and e.anon_id is not null
--            group by e.anon_id)
--     select anon_id from w where b or fl or anon_id in (select id from phantom)
--   ), new as (select public.bot_anon_ids(current_date-59, current_date+1) as anon_id)
--   (select anon_id from old except select anon_id from new)
--   union all
--   (select anon_id from new except select anon_id from old);
