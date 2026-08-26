-- _patches/migration-backlinks-crm.sql — press pitch + CRM-lite (2026-08-23)
--
-- Mục #11 và #14/14 track Digital Marketing, gộp một migration vì cùng nới
-- một bảng và cùng một lượt chạy.
--
-- 🔴 PHẦN #11 LÀ VÁ MỘT LỖ ĐÃ SHIP: `lib/backlinks/content.ts` đã phát
-- kind='press' và content kind='press_pitch', nhưng CHECK constraint dưới DB
-- chưa biết hai giá trị đó ⇒ mọi lượt chèn cơ hội báo chí sẽ bị DB từ chối.
-- Đây là mặt NGƯỢC của bài học "dữ liệu đi SAU giao diện": lần đó bật dữ liệu
-- trước khi có route; lần này code đi trước ràng buộc. Cùng một cái giá.
--
-- PHẦN #14 — CRM-lite. CỐ Ý KHÔNG dựng bảng "partners" riêng: một người/một
-- site đều là MỘT CƠ HỘI có tên, có link, có trạng thái — tách hai bảng thì
-- hai bên trôi khỏi nhau và tầng soạn nội dung phải hỏi hai chỗ. Thứ thật sự
-- còn thiếu không phải một bảng mới mà là NHỊP THEO DÕI: gửi thư xong không
-- ghi ngày thì danh sách outreach mục ra mà không ai biết ai đáng nhắc lại.
begin;

-- ── #11: nới CHECK cho cơ hội báo chí + #14: KOL/đối tác ──
alter table public.backlink_prospects
  drop constraint if exists backlink_prospects_kind_check;

alter table public.backlink_prospects
  add constraint backlink_prospects_kind_check
  check (kind = any (array[
    'directory',
    'resource_page',
    'broken_link',
    'guest_post',        -- blog/tạp chí CÓ ban biên tập
    'guest_blog',        -- blog cá nhân/nhỏ, thư ngắn
    'press',             -- toà soạn/nhà báo — thư ĐƯA TIN kèm số liệu (MỚI #11)
    'kol',               -- người có ảnh hưởng: TikToker, YouTuber, admin group (MỚI #14)
    'partner',           -- site/app muốn đổi giá trị qua lại, không phải xin link (MỚI #14)
    'web2',
    'social_profile',
    'unlinked_mention',
    'other'
  ]));

alter table public.backlink_content
  drop constraint if exists backlink_content_kind_check;

alter table public.backlink_content
  add constraint backlink_content_kind_check
  check (kind = any (array[
    'directory_listing',
    'web2_article',
    'guest_pitch',
    'blog_pitch',
    'press_pitch',      -- thư gửi toà soạn, mở bằng con số (MỚI #11)
    'outreach_email',
    'broken_link_pitch'
  ]));

-- ── #14: ba cột nhịp theo dõi ──
-- `last_contacted_at` do NGƯỜI đánh dấu (máy không gửi gì — xem đầu
-- migration-backlinks.sql), nên nó là dấu vết của việc tay, không phải log.
alter table public.backlink_prospects
  add column if not exists last_contacted_at timestamptz,
  add column if not exists follow_up_at      date,
  -- 'none' = chưa hồi âm · 'positive'/'negative' = đã trả lời · 'later' = hẹn dịp khác.
  -- Tách khỏi `status`: status nói VIỆC CỦA MÌNH tới đâu, reply nói HỌ nói gì.
  -- Gộp một cột thì không phân biệt được "mình chưa gửi" với "gửi rồi họ im".
  add column if not exists reply text not null default 'none'
    check (reply in ('none', 'positive', 'negative', 'later'));

-- Chỉ mục cho đúng câu hỏi panel hỏi: "hôm nay cần nhắc ai".
create index if not exists backlink_prospects_followup_idx
  on public.backlink_prospects (follow_up_at)
  where follow_up_at is not null;

commit;
