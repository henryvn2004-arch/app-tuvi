-- _patches/migration-backlinks-guest.sql — thêm loại cơ hội 'guest_blog' (2026-08-23)
--
-- Mục #4+#6/14 track Digital Marketing. Henry xếp riêng "PR dạng blog nhỏ
-- (cheap guest post)" thành một tầng khác với guest post biên tập thật.
--
-- VÌ SAO LÀ MỘT `kind` RIÊNG chứ không phải nhét dấu vào `topic`/`notes`:
-- hai tầng này cần HAI kiểu thư khác hẳn nhau — blog cá nhân thì thư ngắn,
-- xưng hô với một người; toà soạn thì thư trang trọng, có outline. Nếu cùng
-- một `kind` thì tầng soạn nội dung phải DÒ CHUỖI trong ghi chú để biết viết
-- kiểu nào — đúng lớp lỗi repo đã trả giá nhiều lần (`\bcon\b` khớp "con
-- vật", `quan` khớp "tổng quan"). Cho nó một giá trị enum riêng thì việc
-- chọn đúng thư là tra bảng, không phải đoán.
--
-- CHỈ nới CHECK constraint — không thêm cột, không đụng dòng nào đang có.
begin;

alter table public.backlink_prospects
  drop constraint if exists backlink_prospects_kind_check;

alter table public.backlink_prospects
  add constraint backlink_prospects_kind_check
  check (kind = any (array[
    'directory',
    'resource_page',
    'broken_link',
    'guest_post',        -- blog/tạp chí CÓ ban biên tập, cần pitch trang trọng
    'guest_blog',        -- blog cá nhân/nhỏ, biên tập lỏng, thư ngắn (MỚI)
    'web2',
    'social_profile',
    'unlinked_mention',
    'other'
  ]));

-- Tầng nội dung: thêm loại thư tương ứng (lib/backlinks/content.ts::draftBlogPitch).
alter table public.backlink_content
  drop constraint if exists backlink_content_kind_check;

alter table public.backlink_content
  add constraint backlink_content_kind_check
  check (kind = any (array[
    'directory_listing',
    'web2_article',
    'guest_pitch',
    'blog_pitch',       -- thư ngắn gửi blog cá nhân (MỚI)
    'outreach_email',
    'broken_link_pitch'
  ]));

commit;
