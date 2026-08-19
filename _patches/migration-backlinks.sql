-- ============================================================
-- migration-backlinks.sql — Track Backlink (2026-08-19)
--
-- Henry giao: hệ thống AI tự động xây backlink cho tuviminhbao.com,
-- "80-90% automation, hạn chế spam, giữ white-hat".
--
-- QUYẾT ĐỊNH KIẾN TRÚC — đọc trước khi đụng vào 3 bảng dưới đây:
--
-- KHÔNG tự động đăng/gửi bất cứ đâu (forum, directory, cold email).
-- Đây KHÔNG phải bỏ sót — đây là bài học đã trả giá thật ở
-- `lib/media/seeding.ts` (track Media Pipeline, cùng repo): yêu cầu ban đầu
-- ở đó cũng là "bot tự tìm group rồi tự đăng", và câu trả lời SAU KHI THỬ là
-- không làm được theo cách an toàn — Meta gỡ Groups API vì đúng lý do chống
-- spam, và đăng tay 20-30 bài/ngày cũng đủ bị ban trong vài ngày. Backlink
-- outreach tệ hơn nữa: auto cold-email từ domain kinh doanh thật (rủi ro
-- deliverability/spam-report kéo sập luôn email giao dịch), auto-post
-- Reddit/Quora/forum (các nền tảng này chủ động phát hiện + cấm bot quảng
-- cáo, và một domain bị đóng dấu spam trên Reddit rất khó gỡ). Cả hai đều
-- ĐI NGƯỢC chính yêu cầu "hạn chế spam, giữ white-hat" của Henry.
--
-- Nên 3 bảng này áp CHÍNH bài học đó: MÁY LÀM PHẦN TỐN SỨC (tìm cơ hội,
-- viết nội dung, theo dõi tình trạng link), NGƯỜI BẤM NÚT CUỐI (Copy → dán/
-- gửi tay → đánh dấu Đã dùng). Không có nút "Đăng"/"Gửi" nào gọi ra ngoài.
-- Điểm khác `seeding_groups`/`seeding_drafts`: backlink có THÊM một bảng thứ
-- ba (`backlink_links`) vì đây là quy trình 2 pha — soạn nội dung KHÔNG đồng
-- nghĩa với có backlink; phải theo dõi link có thật sự SỐNG sau khi người
-- dùng tự tay đăng/gửi hay không.
--
-- 0 policy = chỉ service_role chạm được (route admin đọc/ghi qua service
-- key), cùng lối `seeding_groups`/`content_metrics`. Client không bao giờ
-- gọi PostgREST trực tiếp cho 3 bảng này.
-- ============================================================

create table if not exists public.backlink_prospects (
  id          uuid primary key default gen_random_uuid(),
  -- 'directory'/'social_profile' → nộp hồ sơ; 'resource_page'/'broken_link'
  -- → trang liệt kê tài nguyên có thể chèn/đổi link; 'guest_post' → viết bài
  -- khách; 'web2' → Medium/Hashnode/Blogger; 'unlinked_mention' → nơi ĐÃ nhắc
  -- tên site mà chưa gắn link; 'other' → ghi tay không khớp loại nào.
  kind          text not null check (kind in (
                  'directory', 'resource_page', 'broken_link', 'guest_post',
                  'web2', 'social_profile', 'unlinked_mention', 'other'
                )),
  name          text not null,
  url           text not null,
  topic         text,               -- ngách/chủ đề để soạn nội dung đúng giọng
  contact_email text,
  notes         text,               -- vd: "link chết ở đoạn 'công cụ tử vi'
                                     -- trong bài X" cho broken_link
  -- 'new' → chưa soạn gì · 'content_ready' → đã có bản nháp chờ người duyệt
  -- · 'submitted' → người đã tự tay nộp/đăng/gửi · 'skipped' → bỏ qua ·
  -- 'dead' → cơ hội không còn giá trị (trang đã đóng, 404...).
  status        text not null default 'new' check (status in (
                  'new', 'content_ready', 'submitted', 'skipped', 'dead'
                )),
  priority      smallint not null default 0,
  -- 'manual' = Henry tự thêm · 'search' = prospecting cron tìm ra (Brave
  -- Search API, TUỲ CHỌN — xem lib/backlinks/prospecting.ts).
  source        text not null default 'manual' check (source in ('manual', 'search')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint backlink_prospects_url_uniq unique (url)
);

create index if not exists backlink_prospects_status_idx on public.backlink_prospects (status);
create index if not exists backlink_prospects_kind_idx   on public.backlink_prospects (kind);

alter table public.backlink_prospects enable row level security;
comment on table public.backlink_prospects is
  'Cơ hội backlink (directory/resource page/guest post/web2/mention chưa gắn link). 0 policy — chỉ service_role.';

create table if not exists public.backlink_content (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.backlink_prospects(id) on delete cascade,
  -- Khớp 1-1 với kind của prospect, xem lib/backlinks/content.ts::pickContentKind.
  kind        text not null check (kind in (
                'directory_listing', 'web2_article', 'guest_pitch',
                'outreach_email', 'broken_link_pitch'
              )),
  title       text,        -- tiêu đề bài (web2_article) hoặc subject (email)
  body        text not null,
  meta        jsonb not null default '{}'::jsonb,  -- {anchorText, targetPath, ...}
  -- 'draft' → chờ người duyệt/sửa · 'used' → đã Copy và tự tay dùng ·
  -- 'skipped' → không dùng bản này.
  status      text not null default 'draft' check (status in ('draft', 'used', 'skipped')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists backlink_content_prospect_idx on public.backlink_content (prospect_id);
create index if not exists backlink_content_status_idx   on public.backlink_content (status);

alter table public.backlink_content enable row level security;
comment on table public.backlink_content is
  'Nội dung AI soạn sẵn cho từng cơ hội (listing/bài web2/pitch/email) — DỪNG Ở BẢN NHÁP, người tự tay dùng. 0 policy — chỉ service_role.';

create table if not exists public.backlink_links (
  id              uuid primary key default gen_random_uuid(),
  -- Nullable: một link có thể được ghi tay (Henry tự thấy) mà không qua
  -- prospect nào — vd tình cờ thấy site khác đã dẫn link.
  prospect_id     uuid references public.backlink_prospects(id) on delete set null,
  source_url      text not null,     -- trang MANG backlink
  target_url      text not null default 'https://www.tuviminhbao.com/',  -- URL trên site mình được trỏ tới
  anchor_text     text,
  rel             text not null default 'unknown' check (rel in ('dofollow', 'nofollow', 'unknown')),
  -- 'unchecked' → mới thêm, chưa xác minh · 'alive' → cron xác nhận link
  -- CÒN TỒN TẠI trên source_url · 'dead' → không tìm thấy nữa (trang đổi,
  -- gỡ link, hoặc 404).
  status          text not null default 'unchecked' check (status in ('unchecked', 'alive', 'dead')),
  first_seen_at   timestamptz not null default now(),
  last_checked_at timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  constraint backlink_links_uniq unique (source_url, target_url)
);

create index if not exists backlink_links_status_idx        on public.backlink_links (status);
create index if not exists backlink_links_last_checked_idx  on public.backlink_links (last_checked_at nulls first);

alter table public.backlink_links enable row level security;
comment on table public.backlink_links is
  'Backlink THẬT ĐANG SỐNG (đã đăng/gửi xong), cron backlink-check re-fetch source_url định kỳ để cập nhật alive/dead + dofollow/nofollow. 0 policy — chỉ service_role.';
