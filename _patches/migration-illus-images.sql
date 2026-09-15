-- _patches/migration-illus-images.sql
-- Cổng cho route sinh THƯ VIỆN HÌNH MINH HOẠ: app/api/admin/illus-images
-- (13 khía cạnh × 3 sắc thái × 2 giới, Tier A của các phần luận giải)
--
-- Cùng lý do `que_images.gen` đã dùng: route được gọi bằng một cú GET trần,
-- nên cổng là CỜ DƯỚI DB chứ không phải secret trên URL — secret trên URL nằm
-- lại trong log truy cập / lịch sử hội thoại, đúng thứ đã phải rotate
-- service_role key một lần vì nó.
--
-- TẮT là mặc định, và route fail-CLOSED: đọc config hỏng cũng coi như tắt.
insert into public.app_config (key, value)
values (
  'illus_images.gen',
  '{"enabled": false, "budget": 20, "size": "1536x1024", "quality": "medium"}'::jsonb
)
on conflict (key) do nothing;

-- Bật để chạy MỘT lượt:
--   update app_config set value = jsonb_set(value, '{enabled}', 'true')
--    where key = 'illus_images.gen';
--
-- Xong thì TẮT LẠI NGAY — khi cổng mở thì ai biết URL cũng gọi được, và mỗi
-- lượt gọi là tiền model thật:
--   update app_config set value = jsonb_set(value, '{enabled}', 'false')
--    where key = 'illus_images.gen';
--
-- `budget` = trần số bức MỖI LƯỢT GỌI. Để 20 cho vòng duyệt lô nhỏ; nâng lên
-- 78 khi cần dựng trọn Tier A (13 khía × 3 sắc × 2 giới, v1).
