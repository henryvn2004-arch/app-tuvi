-- migration-bot-filter.sql — bóc traffic MÁY khỏi traffic NGƯỜI ở tầng đo.
--
-- BỐI CẢNH (đo trên prod 18/08/2026, cửa sổ 30 ngày):
--   1.326 anon_id "ghé một lần" dùng CHUNG MỘT chuỗi User-Agent byte-for-byte
--   (Chrome/136.0.0.0 trên Mac). Mỗi anon đúng 1 event, 0 event nào khác
--   page_view, 0 referrer, 0 đăng nhập, và chỉ nện đúng đường dẫn `/`.
--   Nó KHÔNG tự khai `bot`/`HeadlessChrome` nên bộ lọc UA sẵn có (cột
--   events.is_bot, xem app/api/track/route.ts) không bắt được — cả đội rơi vào
--   bucket 'drive_by' và bị đếm như người thật. Ở tuần đo được, 477/537 khách
--   "ghé một lần" là NÓ ⇒ ~81% con số "visitors" của mọi báo cáo là máy.
--
-- LUẬT MỚI — "ĐỘI MÁY" (fleet), phát hiện bằng HÀNH VI chứ không bằng tên:
--   một chuỗi UA bị coi là đội máy khi ĐỒNG THỜI thoả 5 điều kiện. Cố ý bắt
--   phải thoả ĐỦ, vì gắn nhãn bot cho người thật là kiểu sai tệ nhất ở đây:
--     (a) ≥ p_min_anon anon_id khác nhau  → không phán từ mẫu lẻ
--     (b) số event / số anon < p_max_ratio → mỗi anon gần như chỉ sống 1 nhịp;
--         người thật dùng lại localStorage nên tỉ lệ này luôn ≥ 2
--     (c) CHƯA TỪNG có một event tương tác nào (chỉ page_view)
--     (d) CHƯA TỪNG mang referrer
--     (e) CHƯA TỪNG đăng nhập
--   Đo đối chứng trên chính prod: MỌI chuỗi UA của người thật đều trượt ít nhất
--   HAI điều kiện (tỉ lệ 2,8–45 event/anon, đều có tương tác VÀ có referrer),
--   còn Chrome/136 + AhrefsBot + meta-externalagent thoả cả năm. Tách sạch.
--
-- ⚠️ THIẾU UA thì KHÔNG đoán bừa: dữ liệu ghi trước khi cột `ua` tồn tại đều
--   trống UA, mà nhóm đó có 6,69 event/anon + 1.623 lượt tương tác — tức người
--   thật. Quy nhóm trống UA về bot là xoá sổ toàn bộ lịch sử.
--
-- TƯƠNG THÍCH: mọi khoá JSON cũ GIỮ NGUYÊN TÊN, chỉ THÊM khoá mới. Bề mặt nào
--   chưa biết khoá mới thì chạy y như trước.

-- ---------------------------------------------------------------------------
-- 1) Danh sách chuỗi UA bị coi là đội máy
-- ---------------------------------------------------------------------------
create or replace function public.bot_ua_fleets(
  p_days      integer default 30,
  p_min_anon  integer default 8,
  p_max_ratio numeric default 1.1
)
returns setof text
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.ua
    from public.events e
   where e.ts >= now() - make_interval(days => p_days)
     and e.ua is not null
     and e.ua <> ''
   group by e.ua
  having count(distinct e.anon_id) >= p_min_anon
     and count(*)::numeric / nullif(count(distinct e.anon_id), 0) < p_max_ratio
     and count(*) filter (where e.event_type not in ('page_view', 'other')) = 0
     and count(*) filter (where e.referrer is not null and e.referrer <> '') = 0
     and count(distinct e.user_id) = 0
$$;

-- ---------------------------------------------------------------------------
-- 2) Các anon_id là máy trong một khoảng — nguồn DUY NHẤT của phép lọc
-- ---------------------------------------------------------------------------
create or replace function public.bot_anon_ids(
  p_from timestamptz,
  p_to   timestamptz
)
returns setof text
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.anon_id
    from public.events e
   where e.ts >= p_from and e.ts < p_to
     and e.anon_id is not null
   group by e.anon_id
  having bool_or(e.is_bot)                                     -- UA tự khai
      or bool_or(e.ua in (select public.bot_ua_fleets()))      -- đội máy
$$;

-- ---------------------------------------------------------------------------
-- 3) traffic_quality — thêm bucket 'fleet_bot' + tổng 'human'
-- ---------------------------------------------------------------------------
create or replace function public.traffic_quality(
  p_from timestamptz,
  p_to   timestamptz
)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  with fleets as (select f as ua from public.bot_ua_fleets() f),
  per_anon as (
    select
      e.anon_id,
      bool_or(e.is_bot) as known_bot,
      bool_or(e.ua in (select ua from fleets)) as fleet_bot,
      count(*) as n_ev,
      count(*) filter (
        where e.event_type in (
          'tool_open', 'tool_run', 'tool_result', 'chat_msg', 'cta_click',
          'topup_start', 'topup_success', 'signup', 'login', 'share',
          'share_view', 'poster_download', 'referral_signup'
        )
      ) as n_interact,
      count(distinct (e.ts at time zone 'Asia/Ho_Chi_Minh')::date) as n_days
    from public.events e
    where e.ts >= p_from and e.ts < p_to and e.anon_id is not null
    group by e.anon_id
  ),
  bucketed as (
    select
      case
        when known_bot then 'known_bot'
        when fleet_bot then 'fleet_bot'
        when n_interact > 0 or n_days > 1 then 'engaged'
        when n_ev = 1 then 'drive_by'
        else 'browsed'
      end as bucket
    from per_anon
  )
  select json_build_object(
    'total',     (select count(*) from per_anon),
    'known_bot', (select count(*) from bucketed where bucket = 'known_bot'),
    'fleet_bot', (select count(*) from bucketed where bucket = 'fleet_bot'),
    'engaged',   (select count(*) from bucketed where bucket = 'engaged'),
    'drive_by',  (select count(*) from bucketed where bucket = 'drive_by'),
    'browsed',   (select count(*) from bucketed where bucket = 'browsed'),
    -- NGƯỜI = tất cả trừ hai nhóm máy. Đây là mẫu số đúng của mọi tỉ lệ.
    'human',     (select count(*) from bucketed where bucket not in ('known_bot', 'fleet_bot')),
    'fleet_uas', (select coalesce(json_agg(ua), '[]'::json) from fleets),
    'ua_coverage', (
      select json_build_object(
        'with_ua', count(*) filter (where ua is not null and ua <> ''),
        'total',   count(*)
      )
      from public.events
      where ts >= p_from and ts < p_to
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) marketing_funnel — THÊM visitors_human / visitors_bot
-- ---------------------------------------------------------------------------
create or replace function public.marketing_funnel(
  p_from timestamptz,
  p_to   timestamptz
)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select json_build_object(
    -- GIỮ NGUYÊN: số thô, có cả máy. Để so được với báo cáo cũ.
    'visitors', (
      select count(distinct coalesce(anon_id, user_id::text))
      from events where event_type = 'page_view' and ts >= p_from and ts < p_to
    ),
    -- MỚI: mẫu số đúng — đã trừ máy.
    'visitors_human', (
      select count(distinct coalesce(e.anon_id, e.user_id::text))
      from events e
      where e.event_type = 'page_view' and e.ts >= p_from and e.ts < p_to
        and (e.anon_id is null
             or e.anon_id not in (select public.bot_anon_ids(p_from, p_to)))
    ),
    'visitors_bot', (
      select count(distinct e.anon_id)
      from events e
      where e.event_type = 'page_view' and e.ts >= p_from and e.ts < p_to
        and e.anon_id in (select public.bot_anon_ids(p_from, p_to))
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

-- ---------------------------------------------------------------------------
-- 5) dashboard_engagement — THÊM bản đã lọc máy cho DAU/WAU/MAU
-- ---------------------------------------------------------------------------
-- ⚠️ GIỮ `default 30`: bản đang chạy có default, bỏ đi là Postgres từ chối
-- (42P13) và mọi lượt gọi không truyền tham số sẽ vỡ.
create or replace function public.dashboard_engagement(p_days integer default 30)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  with bots as (
    -- Một lượt duy nhất, phủ cả cửa sổ dài nhất (mau_prev = 60 ngày).
    select b as anon_id
    from public.bot_anon_ids(current_date - 59, current_date + 1) b
  ),
  ev as (
    select e.ts, e.user_id, e.anon_id,
           coalesce(e.user_id::text, e.anon_id) as who,
           (e.anon_id is not null and e.anon_id in (select anon_id from bots)) as is_machine
    from public.events e
    where e.ts >= current_date - 59 and e.ts < current_date + 1
  ),
  daily as (
    select (date_trunc('day', ts))::date as day,
           count(distinct who) as dau,
           count(distinct who) filter (where not is_machine) as dau_human
    from ev
    where ts >= (current_date - (p_days - 1))
    group by 1
  ),
  days_series as (
    select gs::date as day
    from generate_series(current_date - (p_days - 1), current_date, interval '1 day') gs
  ),
  filled as (
    select ds.day, coalesce(d.dau, 0) as dau, coalesce(d.dau_human, 0) as dau_human
    from days_series ds
    left join daily d on d.day = ds.day
    order by ds.day
  )
  select json_build_object(
    'days', (select coalesce(json_agg(json_build_object(
               'day', day, 'dau', dau, 'dau_human', dau_human) order by day), '[]'::json)
             from filled),
    'dau_today',     (select count(distinct who) from ev where ts >= current_date),
    'dau_yesterday', (select count(distinct who) from ev where ts >= current_date - 1 and ts < current_date),
    'wau',           (select count(distinct who) from ev where ts >= current_date - 6),
    'wau_prev',      (select count(distinct who) from ev where ts >= current_date - 13 and ts < current_date - 6),
    'mau',           (select count(distinct who) from ev where ts >= current_date - 29),
    'mau_prev',      (select count(distinct who) from ev where ts >= current_date - 59 and ts < current_date - 29),
    -- MỚI: cùng phép đo, đã trừ máy.
    'dau_today_human',     (select count(distinct who) from ev where ts >= current_date and not is_machine),
    'dau_yesterday_human', (select count(distinct who) from ev where ts >= current_date - 1 and ts < current_date and not is_machine),
    'wau_human',           (select count(distinct who) from ev where ts >= current_date - 6 and not is_machine),
    'wau_prev_human',      (select count(distinct who) from ev where ts >= current_date - 13 and ts < current_date - 6 and not is_machine),
    'mau_human',           (select count(distinct who) from ev where ts >= current_date - 29 and not is_machine),
    'mau_prev_human',      (select count(distinct who) from ev where ts >= current_date - 59 and ts < current_date - 29 and not is_machine)
  );
$$;

-- ---------------------------------------------------------------------------
-- 6) KHOÁ QUYỀN — mọi hàm mới sinh ra là EXECUTE cho PUBLIC (dựng sẵn của
--    Postgres). Không revoke thì anon key gọi thẳng được, đúng lỗ hổng đã phải
--    vá hai lần trước đây (_patches/migration-revoke-secdef-*.sql).
-- ---------------------------------------------------------------------------
revoke all on function public.bot_ua_fleets(integer, integer, numeric) from public, anon, authenticated;
revoke all on function public.bot_anon_ids(timestamptz, timestamptz)   from public, anon, authenticated;
revoke all on function public.traffic_quality(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.marketing_funnel(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.dashboard_engagement(integer)            from public, anon, authenticated;

grant execute on function public.bot_ua_fleets(integer, integer, numeric) to service_role;
grant execute on function public.bot_anon_ids(timestamptz, timestamptz)   to service_role;
grant execute on function public.traffic_quality(timestamptz, timestamptz) to service_role;
grant execute on function public.marketing_funnel(timestamptz, timestamptz) to service_role;
grant execute on function public.dashboard_engagement(integer)            to service_role;
