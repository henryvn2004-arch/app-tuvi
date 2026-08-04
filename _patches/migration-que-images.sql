-- _patches/migration-que-images.sql
-- Cổng cho route sinh bộ tranh 64 quẻ: app/api/admin/que-images
--
-- VÌ SAO LÀ CỜ DƯỚI DB CHỨ KHÔNG PHẢI SECRET TRÊN URL: route được gọi bằng một
-- cú GET trần (công cụ gọi được dùng không gắn được header). Nhét `?secret=`
-- vào URL thì cái secret nằm lại trong log truy cập, trong lịch sử hội thoại,
-- trong bất cứ chỗ nào chép cái URL đó — đúng thứ đã phải rotate service_role
-- key Supabase một lần vì nó. Cờ dưới DB chỉ sửa được bằng service key.
--
-- TẮT là mặc định, và route fail-CLOSED: đọc config hỏng cũng coi như tắt.
insert into public.app_config (key, value)
values (
  'que_images.gen',
  '{"enabled": false, "budget": 5, "size": "1024x1536", "quality": "medium"}'::jsonb
)
on conflict (key) do nothing;

-- Bật để chạy MỘT lượt:
--   update app_config set value = jsonb_set(value, '{enabled}', 'true')
--    where key = 'que_images.gen';
--
-- Xong thì TẮT LẠI NGAY — khi cổng mở thì ai biết URL cũng gọi được, và mỗi
-- lượt gọi là tiền model thật:
--   update app_config set value = jsonb_set(value, '{enabled}', 'false')
--    where key = 'que_images.gen';
--
-- `budget` = trần số bức MỖI LƯỢT GỌI. Để 5 cho vòng duyệt phong cách; nâng
-- lên 64 khi đã ưng và muốn dựng trọn bộ.
