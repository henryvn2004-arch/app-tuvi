-- _patches/migration-seeding-groups.sql
-- ============================================================
-- Trợ lý seeding group — soạn sẵn bài cho từng group, KHÔNG tự đăng.
--
-- VÌ SAO KHÔNG PHẢI BOT TỰ ĐĂNG: Meta gỡ Groups API khỏi MỌI phiên bản từ
-- 22/04/2024, xoá luôn permission `publish_to_groups`. Không còn đường hợp lệ
-- nào để một app đăng bài vào group. Đường duy nhất còn lại là lái tài khoản cá
-- nhân bằng trình duyệt giả lập — tức là lách đúng biện pháp chống spam mà Meta
-- dựng lên, và cái mất khi bị bắt KHÔNG phải một tài khoản mà là `tuviminhbao.com`
-- bị gắn cờ ở tầng tên miền: lúc đó Page, Instagram và cả link do người thật
-- chia sẻ đều chết theo. Nên máy làm hết phần soạn, người bấm Đăng.
--
-- VÌ SAO KHÔNG DÙNG CHUNG `media_posts`/`media_assets` (M2+M3):
--   · `publishQueue()` quét MỌI dòng `queued` rồi tìm adapter theo `channel`;
--     gặp channel lạ nó đánh dấu `error` (publish.ts, nhánh `!adapter`). Nhét
--     draft group vào đó là mỗi sáng vài chục bài bị báo lỗi oan.
--   · `usedSourceIds()` trong build.ts lọc theo `source_type` chứ KHÔNG theo
--     `variant` — bài nào seeding chạm vào sẽ biến mất khỏi hàng đợi đăng Page.
-- Hai bảng dưới đây trả lời câu hỏi khác hẳn: "group nào, tới lượt chưa, bài
-- soạn xong chưa" — không phải "asset này là gì, đã lên kênh nào".
--
-- RLS: bật, KHÔNG policy nào → chỉ service key chạm được (tiền lệ
-- `portrait_cache`, `media_posts`). Admin đọc qua route server đã dùng service
-- key nên không cần mở cửa cho anon/authenticated.
-- ============================================================

create table if not exists public.seeding_groups (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- facebook | zalo | reddit … — để mở, nhưng hôm nay chỉ có facebook
  platform       text not null default 'facebook',
  name           text not null,
  url            text not null,
  -- Chủ đề group, dùng làm ngữ cảnh cho caption ("hội phong thuỷ nhà cửa" viết
  -- khác "hội tử vi học thuật") — KHÔNG dùng để lọc nguồn, kho bài quá nhỏ để
  -- chia ngăn.
  topic          text,
  -- Góc tiếp cận RIÊNG của group này, đưa thẳng vào prompt viết caption. Đây là
  -- thứ khiến hai group không nhận hai bài giống hệt nhau — người ở cả hai
  -- group là người nhận ra spam đầu tiên.
  angle          text,
  -- Nhịp: N ngày mới seed group này một lần. Mặc định 7 = 1 bài/tuần/group.
  -- Đây là biến quyết định việc này bền hay bị admin group ban trong 3 ngày.
  every_days     int  not null default 7,
  enabled        boolean not null default true,
  member_count   int,
  notes          text,
  -- Đặt khi người thật bấm "Đã đăng" — mốc để tính lượt kế tiếp. Cố ý KHÔNG đặt
  -- lúc soạn xong: bài soạn ra mà không ai dán thì group đó chưa hề được seed.
  last_posted_at timestamptz,
  constraint seeding_groups_url_uniq  unique (platform, url),
  constraint seeding_groups_every_ck  check (every_days between 1 and 60)
);

create index if not exists seeding_groups_due_idx
  on public.seeding_groups (enabled, last_posted_at nulls first);

create table if not exists public.seeding_drafts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  group_id     uuid not null references public.seeding_groups (id) on delete cascade,
  -- khao_luan | nghien_cuu — cùng bộ khoá với media_assets.source_type
  source_type  text not null,
  source_id    text not null,
  title        text,
  quote        text,
  caption      text not null default '',
  hashtags     text[] not null default '{}',
  -- đã gắn UTM riêng từng group → bảng "Chiến dịch UTM" trong admin nói được
  -- group nào kéo người thật về, group nào chỉ tốn công dán
  link_url     text,
  -- URL /api/og/social — URL CHÍNH LÀ FILE, ảnh render on-demand bằng Satori,
  -- không bucket, không tốn tiền model
  image_url    text,
  -- ready = soạn xong, chờ người dán · posted = đã dán thật · skipped = bỏ
  status       text not null default 'ready',
  posted_at    timestamptz,
  meta         jsonb not null default '{}'::jsonb,
  constraint seeding_drafts_status_ck check (status in ('ready', 'posted', 'skipped')),
  -- Một bài viết chỉ vào một group ĐÚNG MỘT LẦN. Cho phép cùng bài đó đi group
  -- khác (kho chỉ có ~630 bài), nhưng đăng lại vào chính group cũ là dấu hiệu
  -- spam rõ nhất và cũng là thứ admin group để ý đầu tiên.
  constraint seeding_drafts_once_uniq unique (group_id, source_type, source_id)
);

create index if not exists seeding_drafts_status_idx on public.seeding_drafts (status, created_at desc);
create index if not exists seeding_drafts_group_idx  on public.seeding_drafts (group_id, created_at desc);

alter table public.seeding_groups enable row level security;
alter table public.seeding_drafts enable row level security;

-- Trần bài soạn mỗi lượt cron. 5 chứ không phải 20–30: nhịp bền của seeding là
-- ~1 bài/group/tuần, nên con số này chỉ nên bằng số group tới lượt trong ngày.
-- Đặt cao hơn không làm ra nhiều người đọc hơn, chỉ làm nhiều group ban hơn.
insert into public.app_config (key, value)
values ('seeding.daily_cap', '5'::jsonb)
on conflict (key) do nothing;
