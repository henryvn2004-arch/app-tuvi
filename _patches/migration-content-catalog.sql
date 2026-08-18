-- ============================================================
-- KHO NỘI DUNG — gom 6 bảng nội dung về MỘT chỗ đọc
-- ============================================================
-- Henry: "kho content hiện giờ đang lưu ở đâu? … tao muốn 1 nơi để quản lý hết"
-- Chốt: kho chỉ ĐỌC (có dashboard theo dõi), không sửa ngược.
--
-- 🔑 VÌ SAO LÀ VIEW CHỨ KHÔNG PHẢI BẢNG `content_items`:
-- Bảng vật lý cần backfill + trigger/cron giữ đồng bộ với 6 bảng nguồn ⇒ hai
-- nguồn sự thật, và repo này đã trả giá nhiều lần cho đúng lớp lỗi đó (giá Lượng
-- chép hai nơi, formatLaSoV2 hai bản, hash hai bản). Phạm vi chỉ-đọc thì VIEW
-- luôn đúng theo định nghĩa và tốn 0 dòng đồng bộ. Khi nào cần gắn metadata
-- RIÊNG cho tác phẩm (nhãn biên tập, lịch sản xuất) mới cần bảng thật.
--
-- ⛔ CỐ Ý KHÔNG đưa `seo_pages` (8.958 dòng) vào kho: đó là trang SINH TỰ ĐỘNG
-- theo lá số, không phải tác phẩm biên tập. Đưa vào là 8.958 dòng nuốt sạch
-- 1.163 dòng thật và kho hết đọc được.
-- ============================================================

-- ── VIEW 1: tác phẩm gốc ("1 nguồn" trong mô hình nguồn → lát cắt → kênh) ──
create or replace view public.content_catalog as
  select
    'khao-luan'::text        as kind,
    'khao_luan'::text        as source_table,
    kl.id::text              as source_id,
    kl.title                 as title,
    ('/khao-luan/' || kl.slug)::text as url,
    kl.created_at            as created_at,
    coalesce(kl.category, '')::text  as bucket,
    length(coalesce(kl.content, '')) as chars
  from public.khao_luan kl
union all
  select 'nghien-cuu', 'master_articles', ma.id::text, ma.title,
         '/nghien-cuu/' || ma.slug, ma.created_at,
         coalesce(ma.category, ''), length(coalesce(ma.content, ''))
  from public.master_articles ma
union all
  -- Video hỏi–đáp: `url` là link YouTube (nếu đã lên); chưa lên thì rỗng, cột
  -- kênh bên dưới mới là chỗ nói nó đang nằm ở đâu.
  select 'video-hoi-dap', 'van_dap', vd.id::text, vd.title,
         coalesce(vd.yt_url, ''), vd.created_at,
         coalesce(vd.chu_de, ''), length(coalesce(vd.script_final, ''))
  from public.van_dap vd
union all
  select 'tu-dien', 'tu_dien', td.id::text, td.ten,
         '/tu-dien/' || td.slug, td.created_at,
         coalesce(td.loai, ''), length(coalesce(td.content, ''))
  from public.tu_dien td
union all
  select 'tai-lieu', 'tai_lieu', tl.id::text, tl.title,
         '/tai-lieu/' || tl.slug, tl.created_at,
         coalesce(tl.category, ''), length(coalesce(tl.content, ''))
  from public.tai_lieu tl
union all
  select 'sach', 'sach_library', sl.id::text, sl.title,
         '/tai-lieu/sach/' || sl.slug, sl.created_at,
         coalesce(sl.author, ''), length(coalesce(sl.content, ''))
  from public.sach_library sl;

-- ── VIEW 2: tác phẩm đó đã ra kênh nào ──
-- Điều kiện vào là CÓ URL/ID thật, không phải chuỗi status: status là thứ code
-- ghi ra, còn URL là bằng chứng nó đã ra ngoài đời.
create or replace view public.content_distribution as
  select 'van_dap'::text as source_table, vd.id::text as source_id,
         'youtube'::text as channel, vd.yt_url as external_url,
         vd.yt_published_at as published_at, 'live'::text as status
  from public.van_dap vd where coalesce(vd.yt_url, '') <> ''
union all
  select 'van_dap', vd.id::text, 'tiktok', vd.tt_url, vd.updated_at, 'live'
  from public.van_dap vd where coalesce(vd.tt_url, '') <> ''
union all
  select 'van_dap', vd.id::text, 'facebook', vd.fb_url, vd.updated_at, 'live'
  from public.van_dap vd where coalesce(vd.fb_url, '') <> ''
union all
  -- Đường media_posts: giữ NGUYÊN status (queued/publishing/live/error) vì kho
  -- phải phân biệt được "đã đăng" với "đang xếp hàng" — 30 bài facebook đang
  -- kẹt hàng đợi chính là thứ cần nhìn thấy.
  select ma.source_type, ma.source_id, mp.channel, mp.external_url,
         mp.published_at, mp.status
  from public.media_posts mp
  join public.media_assets ma on ma.id = mp.asset_id
union all
  select sd.source_type, sd.source_id, 'fb-group', sd.link_url, sd.posted_at,
         case when sd.posted_at is not null then 'live' else sd.status end
  from public.seeding_drafts sd;

-- ── RPC: thống kê ──
create or replace function public.content_catalog_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with dist as (
    select source_table, source_id, bool_or(status = 'live') as has_live
    from content_distribution group by 1, 2
  ),
  cc as (
    select c.kind, coalesce(d.has_live, false) as has_live
    from content_catalog c
    left join dist d on d.source_table = c.source_table and d.source_id = c.source_id
  )
  select jsonb_build_object(
    'total', (select count(*) from cc),
    'published_total', (select count(*) from cc where has_live),
    'by_kind', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'n', n, 'published', p) order by n desc), '[]'::jsonb)
      from (select kind, count(*) n, count(*) filter (where has_live) p from cc group by 1) x
    ),
    'by_channel', (
      select coalesce(jsonb_agg(jsonb_build_object('channel', channel, 'status', status, 'n', n) order by n desc), '[]'::jsonb)
      from (select channel, status, count(*) n from content_distribution group by 1, 2) y
    )
  );
$$;

-- ── RPC: danh sách có lọc + phân trang ──
create or replace function public.content_catalog_list(
  p_kind    text default null,
  p_channel text default null,
  p_status  text default null,   -- published | unpublished | queued
  p_q       text default null,
  p_limit   int  default 50,
  p_offset  int  default 0
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
  base as (
    select c.*,
           coalesce(d.channels, '[]'::jsonb) as channels,
           coalesce(d.has_live, false)   as has_live,
           coalesce(d.has_queued, false) as has_queued
    from content_catalog c
    left join dist d on d.source_table = c.source_table and d.source_id = c.source_id
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
      select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at desc), '[]'::jsonb)
      from (
        select * from filtered
        order by created_at desc
        limit  greatest(1, least(coalesce(p_limit, 50), 200))
        offset greatest(0, coalesce(p_offset, 0))
      ) f
    )
  );
$$;

-- ── Khoá cửa ──
-- View trong PG15+ mặc định chạy quyền OWNER (bỏ qua RLS), và EXECUTE cho PUBLIC
-- là dựng sẵn của Postgres ⇒ không revoke tường minh là hàm/view mới nào cũng hở
-- cho anon. Bài học này repo đã bắt được hai lượt (marketing_signup_truth,
-- anon_rail_*) nên làm luôn tại đây.
revoke all on public.content_catalog     from anon, authenticated;
revoke all on public.content_distribution from anon, authenticated;
grant  select on public.content_catalog     to service_role;
grant  select on public.content_distribution to service_role;

revoke execute on function public.content_catalog_stats()                       from public, anon, authenticated;
revoke execute on function public.content_catalog_list(text, text, text, text, int, int) from public, anon, authenticated;
grant  execute on function public.content_catalog_stats()                       to service_role;
grant  execute on function public.content_catalog_list(text, text, text, text, int, int) to service_role;
