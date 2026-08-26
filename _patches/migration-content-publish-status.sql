-- ============================================================
-- TRẠNG THÁI XUẤT BẢN cho `khao_luan` + `master_articles`
-- ============================================================
-- Trước migration này, hai bảng đó KHÔNG có cột trạng thái: cron LLM insert
-- xong là bài lên thẳng web, không ai gỡ xuống được từ admin và gate
-- brand-check là lớp QC DUY NHẤT. 691 bài đang ở tình trạng đó.
--
-- 🔑 MẶC ĐỊNH 'published' — KHÔNG được để 'draft'.
-- 691 bài hiện có phải giữ nguyên trên web sau lượt deploy. Đặt mặc định
-- 'draft' là toàn bộ nội dung biến mất khỏi trang trong một nhịp, đúng loại
-- hỏng im lặng mà cả track này đi vá.
--
-- 🔑 BA trạng thái, KHÔNG phải hai:
--   published — đang hiện trên web (mặc định)
--   hidden    — người gỡ xuống (bài sai, bài trùng)
--   draft     — máy vừa viết, CHỜ DUYỆT
-- `draft` chỉ được dùng khi bật cờ `content.require_review`; chưa bật thì cron
-- vẫn insert thẳng 'published' như cũ. Cần gạt để sẵn, đổi bằng một câu SQL
-- chứ không phải một lượt deploy.
-- ============================================================

alter table public.khao_luan
  add column if not exists publish_status text not null default 'published',
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by text;

alter table public.master_articles
  add column if not exists publish_status text not null default 'published',
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'khao_luan_publish_status_chk') then
    alter table public.khao_luan add constraint khao_luan_publish_status_chk
      check (publish_status in ('published', 'draft', 'hidden'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'master_articles_publish_status_chk') then
    alter table public.master_articles add constraint master_articles_publish_status_chk
      check (publish_status in ('published', 'draft', 'hidden'));
  end if;
end $$;

-- Mọi trang công khai lọc `publish_status=eq.published` ⇒ index đúng cột đó.
create index if not exists khao_luan_pub_idx       on public.khao_luan (publish_status, created_at desc);
create index if not exists master_articles_pub_idx on public.master_articles (publish_status, created_at desc);

-- Cờ chờ duyệt. Mặc định TẮT: bật lên là mỗi ngày phải có người bấm duyệt,
-- không duyệt thì trang đứng im — đó là quyết định của Henry, không phải mặc
-- định của hệ thống.
insert into public.app_config (key, value, note)
values ('content.require_review', 'false'::jsonb,
        'true = bài cron viết ra nằm ở draft chờ duyệt; false = đăng thẳng như trước')
on conflict (key) do nothing;

-- ── Kho đọc thêm trạng thái ──
-- `create or replace view` chỉ cho THÊM cột ở CUỐI.
create or replace view public.content_catalog as
  select
    'khao-luan'::text        as kind,
    'khao_luan'::text        as source_table,
    kl.id::text              as source_id,
    kl.title                 as title,
    ('/khao-luan/' || kl.slug)::text as url,
    kl.created_at            as created_at,
    coalesce(kl.category, '')::text  as bucket,
    length(coalesce(kl.content, '')) as chars,
    kl.publish_status        as publish_status,
    true                     as editable
  from public.khao_luan kl
union all
  select 'nghien-cuu', 'master_articles', ma.id::text, ma.title,
         '/nghien-cuu/' || ma.slug, ma.created_at,
         coalesce(ma.category, ''), length(coalesce(ma.content, '')),
         ma.publish_status, true
  from public.master_articles ma
union all
  -- `van_dap` có trang soạn riêng (YouTube Studio) nên Kho KHÔNG cho sửa —
  -- dựng bộ sửa thứ hai cho cùng dữ liệu là hai bản trôi khỏi nhau.
  select 'video-hoi-dap', 'van_dap', vd.id::text, vd.title,
         coalesce(vd.yt_url, ''), vd.created_at,
         coalesce(vd.chu_de, ''), length(coalesce(vd.script_final, '')),
         coalesce(vd.publish_status, 'published'), false
  from public.van_dap vd
union all
  select 'tu-dien', 'tu_dien', td.id::text, td.ten,
         '/tu-dien/' || td.slug, td.created_at,
         coalesce(td.loai, ''), length(coalesce(td.content, '')),
         'published', true
  from public.tu_dien td
union all
  select 'tai-lieu', 'tai_lieu', tl.id::text, tl.title,
         '/tai-lieu/' || tl.slug, tl.created_at,
         coalesce(tl.category, ''), length(coalesce(tl.content, '')),
         'published', true
  from public.tai_lieu tl
union all
  select 'sach', 'sach_library', sl.id::text, sl.title,
         '/tai-lieu/sach/' || sl.slug, sl.created_at,
         coalesce(sl.author, ''), length(coalesce(sl.content, '')),
         'published', true
  from public.sach_library sl;

revoke all on public.content_catalog from anon, authenticated;
grant  select on public.content_catalog to service_role;
