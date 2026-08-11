-- ============================================================
-- SỐ LIỆU NỀN TẢNG — view · like · comment · subscriber
-- ============================================================
-- Trước migration này site KHÔNG đo được một số liệu nào từ nền tảng: grep cả
-- repo ra 0 lượt gọi YouTube / Meta / TikTok API. 15 video đang live cũng chưa
-- bao giờ biết được bao nhiêu view.
--
-- 🔑 SỐ Ở ĐÂY LÀ TÍCH LUỸ, KHÔNG PHẢI THEO NGÀY. YouTube/Meta trả tổng lượt
-- xem từ lúc đăng. Nên lưu SNAPSHOT mỗi ngày rồi lấy hiệu hai ngày nếu muốn
-- biết "hôm nay thêm bao nhiêu". Đọc cột `views` như "tổng tới ngày đó".
--
-- Khoá chính (channel, external_id, stat_date) ⇒ chạy lại trong cùng ngày là
-- upsert đè, không đẻ dòng trùng. Để DB từ chối, đừng để mã ứng dụng nhớ hộ.
-- ============================================================

create table if not exists public.content_metrics (
  channel      text        not null,
  external_id  text        not null,
  stat_date    date        not null,
  views        bigint,
  likes        bigint,
  comments     bigint,
  shares       bigint,
  -- Trỏ ngược về tác phẩm để join thẳng với `content_catalog` mà không phải
  -- đi vòng qua `content_distribution` mỗi lượt đọc.
  source_table text,
  source_id    text,
  meta         jsonb       not null default '{}'::jsonb,
  fetched_at   timestamptz not null default now(),
  primary key (channel, external_id, stat_date)
);

create index if not exists content_metrics_src_idx  on public.content_metrics (source_table, source_id, stat_date desc);
create index if not exists content_metrics_date_idx on public.content_metrics (stat_date desc);

-- Số của cả KÊNH (subscriber/follower) — không gắn với tác phẩm nào.
create table if not exists public.channel_stats (
  channel     text        not null,
  stat_date   date        not null,
  followers   bigint,
  total_views bigint,
  item_count  bigint,
  meta        jsonb       not null default '{}'::jsonb,
  fetched_at  timestamptz not null default now(),
  primary key (channel, stat_date)
);

alter table public.content_metrics enable row level security;
alter table public.channel_stats   enable row level security;
-- CỐ Ý 0 policy: chỉ service key chạm được, cùng lối `seeding_groups`.

-- ── VIEW: bản đo MỚI NHẤT của mỗi bài ──
create or replace view public.content_metrics_latest as
  select distinct on (channel, external_id)
    channel, external_id, stat_date, views, likes, comments, shares,
    source_table, source_id, fetched_at
  from public.content_metrics
  order by channel, external_id, stat_date desc;

revoke all on public.content_metrics_latest from anon, authenticated;
grant  select on public.content_metrics_latest to service_role;

-- ── RPC: danh sách kho, NAY KÈM SỐ LIỆU ──
-- Thay bản cũ: thêm `views`/`likes` vào mỗi dòng và cho phép sắp theo lượt xem.
-- Thêm trường vào jsonb là thay đổi CỘNG THÊM — client cũ bỏ qua field lạ.
create or replace function public.content_catalog_list(
  p_kind    text default null,
  p_channel text default null,
  p_status  text default null,   -- published | unpublished | queued
  p_q       text default null,
  p_limit   int  default 50,
  p_offset  int  default 0,
  p_sort    text default null    -- views | null (mặc định: mới nhất trước)
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with dist as (
    select source_table, source_id,
           jsonb_agg(jsonb_build_object(
             'channel', channel, 'status', status,
             'url', external_url, 'at', published_at
           ) order by published_at desc nulls last) as channels,
           bool_or(status = 'live') as has_live,
           bool_or(status in ('queued', 'approved', 'publishing')) as has_queued
    from content_distribution group by 1, 2
  ),
  met as (
    select source_table, source_id,
           sum(views) as views, sum(likes) as likes, sum(comments) as comments
    from content_metrics_latest
    where source_table is not null and source_id is not null
    group by 1, 2
  ),
  base as (
    select c.*,
           coalesce(d.channels, '[]'::jsonb) as channels,
           coalesce(d.has_live, false)   as has_live,
           coalesce(d.has_queued, false) as has_queued,
           m.views    as views,
           m.likes    as likes,
           m.comments as comments
    from content_catalog c
    left join dist d on d.source_table = c.source_table and d.source_id = c.source_id
    left join met  m on m.source_table = c.source_table and m.source_id = c.source_id
  ),
  filtered as (
    select * from base b
    where (coalesce(p_kind, '')    = '' or b.kind = p_kind)
      and (coalesce(p_q, '')       = '' or b.title ilike '%' || p_q || '%')
      and (coalesce(p_channel, '') = '' or exists (
            select 1 from jsonb_array_elements(b.channels) e where e->>'channel' = p_channel))
      and (coalesce(p_status, '')  = ''
           or (p_status = 'published'   and b.has_live)
           or (p_status = 'unpublished' and not b.has_live)
           or (p_status = 'queued'      and b.has_queued))
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.ord), '[]'::jsonb)
      from (
        select *, row_number() over (
                 order by case when p_sort = 'views' then views end desc nulls last,
                          created_at desc
               ) as ord
        from filtered
        order by case when p_sort = 'views' then views end desc nulls last, created_at desc
        limit  greatest(1, least(coalesce(p_limit, 50), 200))
        offset greatest(0, coalesce(p_offset, 0))
      ) f
    )
  );
$$;

-- ── RPC: bảng hiệu suất kênh ──
create or replace function public.content_metrics_overview(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with d as (select greatest(1, least(coalesce(p_days, 30), 365)) as n),
  chan as (
    select distinct on (channel) channel, stat_date, followers, total_views, item_count
    from channel_stats order by channel, stat_date desc
  ),
  per_chan as (
    select channel,
           count(*)     as items,
           sum(views)   as views,
           sum(likes)   as likes,
           sum(comments) as comments
    from content_metrics_latest group by 1
  ),
  -- Chuỗi ngày để vẽ: tổng lượt xem tích luỹ theo từng ngày đo.
  series as (
    select stat_date, sum(views) as views
    from content_metrics, d
    where stat_date >= current_date - d.n
    group by 1 order by 1
  )
  select jsonb_build_object(
    'has_data', (select count(*) > 0 from content_metrics),
    'by_channel', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'channel', p.channel, 'items', p.items, 'views', p.views,
        'likes', p.likes, 'comments', p.comments,
        'followers', c.followers, 'stat_date', c.stat_date
      ) order by p.views desc nulls last), '[]'::jsonb)
      from per_chan p left join chan c on c.channel = p.channel
    ),
    'channels_without_items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'channel', c.channel, 'followers', c.followers, 'stat_date', c.stat_date)), '[]'::jsonb)
      from chan c where not exists (select 1 from per_chan p where p.channel = c.channel)
    ),
    'series', (select coalesce(jsonb_agg(jsonb_build_object('d', stat_date, 'views', views) order by stat_date), '[]'::jsonb) from series),
    'top', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select m.channel, m.external_id, m.views, m.likes, c.title, c.url
        from content_metrics_latest m
        left join content_catalog c on c.source_table = m.source_table and c.source_id = m.source_id
        order by m.views desc nulls last limit 10
      ) t
    ),
    'last_run', (select max(fetched_at) from content_metrics)
  );
$$;

revoke execute on function public.content_catalog_list(text, text, text, text, int, int, text) from public, anon, authenticated;
revoke execute on function public.content_metrics_overview(int)                                from public, anon, authenticated;
grant  execute on function public.content_catalog_list(text, text, text, text, int, int, text) to service_role;
grant  execute on function public.content_metrics_overview(int)                                to service_role;

-- Bản 6 tham số cũ nay thừa: giữ lại thì hai bản chồng nhau và PostgREST chọn
-- nhầm khi client gửi thiếu `p_sort`. Bỏ hẳn.
drop function if exists public.content_catalog_list(text, text, text, text, int, int);
