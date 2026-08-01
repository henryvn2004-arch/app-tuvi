-- _patches/migration-media-posts.sql
-- ============================================================
-- M2 (track Media Pipeline) — xương sống phân phối đa kênh.
--
-- HAI BẢNG, tách theo đúng câu hỏi chúng trả lời:
--   media_assets — "FILE này là gì, dựng từ đâu"   (1 dòng / biến thể ảnh)
--   media_posts  — "bài đăng này lên KÊNH nào, tới đâu rồi" (1 dòng / kênh)
-- Một asset → nhiều post (cùng một ảnh đăng được cả FB, IG, Threads).
--
-- VÌ SAO KHÔNG mở rộng `van_dap` (nó đã sẵn cột fb_*/tt_* chưa ai ghi vào):
-- mấy cột đó chính là cái bẫy — thêm một kênh là thêm 3 cột, thêm một định dạng
-- lại 3 cột nữa. Và `van_dap` là bảng của MỘT loại nội dung (vấn đáp video),
-- trong khi nguồn ở đây gồm khảo luận, nghiên cứu, trang SEO, tool, chân dung.
--
-- RLS: bật, KHÔNG policy nào → chỉ service key chạm được (tiền lệ
-- `portrait_cache`). Admin đọc qua route server đã dùng service key, nên không
-- cần mở thêm cửa nào cho anon/authenticated.
-- ============================================================

create table if not exists public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  -- khao_luan | nghien_cuu | seo_page | share | van_dap | tool
  source_type text not null,
  source_id   text not null,
  -- quote_4x5 (1080×1350, feed) | story_9x16 (1080×1920, story/reels)
  variant     text not null,
  -- URL CÔNG KHAI, ổn định. Ảnh render on-demand bằng Satori qua
  -- /api/og/social?... nên KHÔNG cần bucket lưu file: mỗi URL tự nó là công
  -- thức dựng lại bức ảnh. Instagram đòi ảnh phải có URL công khai — điều kiện
  -- đó thoả sẵn, không phải upload đi đâu.
  url         text not null,
  width       int,
  height      int,
  meta        jsonb not null default '{}'::jsonb,
  -- Một nguồn + một biến thể = một asset. Đây cũng là cơ chế chống dựng trùng:
  -- cron chạy lại vẫn không đẻ thêm ảnh cho bài đã làm.
  constraint media_assets_uniq unique (source_type, source_id, variant)
);

create index if not exists media_assets_source_idx on public.media_assets (source_type, created_at desc);

create table if not exists public.media_posts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  asset_id     uuid not null references public.media_assets (id) on delete cascade,
  -- facebook | instagram | threads | youtube | tiktok | telegram
  channel      text not null,
  caption      text not null default '',
  hashtags     text[] not null default '{}',
  -- đã gắn sẵn UTM — bảng "Chiến dịch UTM" trong admin đang trống, đây là thứ
  -- làm nó có số, và là cách duy nhất biết kênh nào đáng làm tiếp
  link_url     text,
  -- queued (chờ Henry duyệt) → approved → publishing → live | error | skipped
  status       text not null default 'queued',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_id  text,
  external_url text,
  error        text,
  meta         jsonb not null default '{}'::jsonb,
  constraint media_posts_status_ck
    check (status in ('queued', 'approved', 'publishing', 'live', 'error', 'skipped'))
);

create index if not exists media_posts_status_idx  on public.media_posts (status, created_at desc);
create index if not exists media_posts_channel_idx on public.media_posts (channel, created_at desc);
-- Một asset chỉ lên mỗi kênh một lần. Chốt chặn cuối chống đăng trùng: dù cron
-- có chạy lặp hay ai bấm hai lần, DB vẫn từ chối dòng thứ hai.
create unique index if not exists media_posts_asset_channel_uniq
  on public.media_posts (asset_id, channel);

alter table public.media_assets enable row level security;
alter table public.media_posts  enable row level security;

-- Công tắc: mặc định TẮT tự đăng (tiền lệ shadow-mode M0.6). Cron vẫn dựng ảnh
-- + viết caption + xếp hàng đợi như thường — chỉ dừng ở chỗ chờ người duyệt.
insert into public.app_config (key, value)
values
  ('social.autopost_enabled', 'false'::jsonb),
  ('social.build_daily', '3'::jsonb),
  ('social.channels', '["facebook"]'::jsonb)
on conflict (key) do nothing;
