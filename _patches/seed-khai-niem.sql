-- ============================================================
-- ĐÃ ÁP LÊN PRODUCTION 2026-09-19. Giữ lại làm hồ sơ, KHÔNG chạy lại —
-- ON CONFLICT DO UPDATE nên chạy lại vẫn an toàn (idempotent) nhưng không có
-- gì để chạy lại vì nguồn tái tạo được:
--
--   node scripts/seed-khai-niem.mjs --seed-out <path>
--
-- Kết quả: 54 dòng thu_vien_muc bo_suu_tap='khai-niem', publish_status mặc
-- định 'draft' — CHƯA public, chờ cron đắp văn qua cửa chất lượng. Danh sách
-- đã được Henry duyệt 2026-09-19 (glossary Claude Code dựng thủ công, đối
-- chiếu keyword_ideas để sắp ưu tiên, không dùng để chọn đề tài — loại trừ 4
-- mục đã có sẵn trong tu_dien: Tứ Hóa/Cách Cục/Đại Vận-Tiểu Vận/Vận Hạn Lưu
-- Niên).
-- ============================================================

-- Gieo thu_vien_muc bo_suu_tap=khai-niem (draft) — SINH TỰ ĐỘNG bởi scripts/seed-khai-niem.mjs.
-- publish_status giữ mặc định 'draft' — KHÔNG public cho tới khi cron đắp văn qua cửa chất lượng.
begin;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('cung-menh-la-gi', 'khai-niem', 'Cung Mệnh Là Gì', '{"nhom":"Cấu trúc lá số"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('cung-than-la-gi', 'khai-niem', 'Cung Thân Là Gì', '{"nhom":"Cấu trúc lá số"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('tam-phuong-tu-chinh', 'khai-niem', 'Tam Phương Tứ Chính Là Gì', '{"nhom":"Cấu trúc lá số"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('nhi-hop-cung', 'khai-niem', 'Nhị Hợp (Cung) Là Gì', '{"nhom":"Cấu trúc lá số"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('xung-chieu-la-gi', 'khai-niem', 'Xung Chiếu Là Gì', '{"nhom":"Cấu trúc lá số"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('dong-cung-la-gi', 'khai-niem', 'Đồng Cung Là Gì', '{"nhom":"Cấu trúc lá số"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('vo-chinh-dieu', 'khai-niem', 'Vô Chính Diệu Là Gì', '{"nhom":"Cấu trúc lá số"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('chinh-tinh-la-gi', 'khai-niem', 'Chính Tinh Là Gì', '{"nhom":"Phân loại sao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('phu-tinh-la-gi', 'khai-niem', 'Phụ Tinh Là Gì', '{"nhom":"Phân loại sao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('sat-tinh-la-gi', 'khai-niem', 'Sát Tinh Là Gì', '{"nhom":"Phân loại sao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('mieu-vuong-dac-ham', 'khai-niem', 'Miếu Vượng Đắc Hãm Là Gì', '{"nhom":"Phân loại sao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('luc-cat-tinh', 'khai-niem', 'Lục Cát Tinh Là Gì', '{"nhom":"Phân loại sao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('luc-sat-tinh', 'khai-niem', 'Lục Sát Tinh Là Gì', '{"nhom":"Phân loại sao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('vong-truong-sinh', 'khai-niem', 'Vòng Trường Sinh Là Gì', '{"nhom":"Vận hạn"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('thai-tue-la-gi', 'khai-niem', 'Thái Tuế Là Gì', '{"nhom":"Vận hạn"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('tuan-triet-la-gi', 'khai-niem', 'Tuần Triệt Là Gì', '{"nhom":"Vận hạn"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('han-cung-la-gi', 'khai-niem', 'Hạn Cung Là Gì', '{"nhom":"Vận hạn"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('thien-can-la-gi', 'khai-niem', 'Thiên Can Là Gì', '{"nhom":"Can Chi Ngũ Hành Âm Dương"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('dia-chi-la-gi', 'khai-niem', 'Địa Chi Là Gì', '{"nhom":"Can Chi Ngũ Hành Âm Dương"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('ngu-hanh-la-gi', 'khai-niem', 'Ngũ Hành Là Gì', '{"nhom":"Can Chi Ngũ Hành Âm Dương"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('am-duong-la-gi', 'khai-niem', 'Âm Dương Là Gì', '{"nhom":"Can Chi Ngũ Hành Âm Dương"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('tuong-sinh-la-gi', 'khai-niem', 'Ngũ Hành Tương Sinh Là Gì', '{"nhom":"Can Chi Ngũ Hành Âm Dương"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('tuong-khac-la-gi', 'khai-niem', 'Ngũ Hành Tương Khắc Là Gì', '{"nhom":"Can Chi Ngũ Hành Âm Dương"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('ban-menh-la-gi', 'khai-niem', 'Bản Mệnh Là Gì', '{"nhom":"Can Chi Ngũ Hành Âm Dương"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('cuc-trong-tu-vi', 'khai-niem', 'Cục Trong Tử Vi Là Gì', '{"nhom":"Cục trong Tử Vi"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('thuy-nhi-cuc', 'khai-niem', 'Thủy Nhị Cục Là Gì', '{"nhom":"Cục trong Tử Vi"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('moc-tam-cuc', 'khai-niem', 'Mộc Tam Cục Là Gì', '{"nhom":"Cục trong Tử Vi"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('kim-tu-cuc', 'khai-niem', 'Kim Tứ Cục Là Gì', '{"nhom":"Cục trong Tử Vi"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('tho-ngu-cuc', 'khai-niem', 'Thổ Ngũ Cục Là Gì', '{"nhom":"Cục trong Tử Vi"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('hoa-luc-cuc', 'khai-niem', 'Hỏa Lục Cục Là Gì', '{"nhom":"Cục trong Tử Vi"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('bat-tu-la-gi', 'khai-niem', 'Bát Tự (Tứ Trụ) Là Gì', '{"nhom":"Bát Tự Tử Bình"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('tu-binh-la-gi', 'khai-niem', 'Tử Bình Là Gì', '{"nhom":"Bát Tự Tử Bình"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('nhat-chu-la-gi', 'khai-niem', 'Nhật Chủ Là Gì', '{"nhom":"Bát Tự Tử Bình"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('thap-than-la-gi', 'khai-niem', 'Thập Thần Là Gì', '{"nhom":"Bát Tự Tử Bình"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('dung-than-la-gi', 'khai-niem', 'Dụng Thần Là Gì', '{"nhom":"Bát Tự Tử Bình"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('dai-van-bat-tu', 'khai-niem', 'Đại Vận Trong Bát Tự Là Gì', '{"nhom":"Bát Tự Tử Bình"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('than-sat-la-gi', 'khai-niem', 'Thần Sát Là Gì', '{"nhom":"Bát Tự Tử Bình"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('ky-mon-don-giap', 'khai-niem', 'Kỳ Môn Độn Giáp Là Gì', '{"nhom":"Kỳ Môn Lục Nhâm Dịch"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('cuu-cung-la-gi', 'khai-niem', 'Cửu Cung Là Gì', '{"nhom":"Kỳ Môn Lục Nhâm Dịch"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('bat-mon-la-gi', 'khai-niem', 'Bát Môn Là Gì', '{"nhom":"Kỳ Môn Lục Nhâm Dịch"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('luc-nham-la-gi', 'khai-niem', 'Lục Nhâm Là Gì', '{"nhom":"Kỳ Môn Lục Nhâm Dịch"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('mai-hoa-dich-so', 'khai-niem', 'Mai Hoa Dịch Số Là Gì', '{"nhom":"Kỳ Môn Lục Nhâm Dịch"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('que-dich-bat-quai', 'khai-niem', 'Quẻ Dịch, Bát Quái Là Gì', '{"nhom":"Kỳ Môn Lục Nhâm Dịch"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('ngay-hoang-dao', 'khai-niem', 'Ngày Hoàng Đạo Là Gì', '{"nhom":"Hoàng lịch Chiêm tinh"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('ngay-hac-dao', 'khai-niem', 'Ngày Hắc Đạo Là Gì', '{"nhom":"Hoàng lịch Chiêm tinh"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('nhi-thap-bat-tu', 'khai-niem', 'Nhị Thập Bát Tú Là Gì', '{"nhom":"Hoàng lịch Chiêm tinh"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('thap-nhi-truc', 'khai-niem', '12 Trực (Kiến Trừ) Là Gì', '{"nhom":"Hoàng lịch Chiêm tinh"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('gio-hoang-dao', 'khai-niem', 'Giờ Hoàng Đạo Là Gì', '{"nhom":"Hoàng lịch Chiêm tinh"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('cung-hoang-dao-tay', 'khai-niem', 'Cung Hoàng Đạo (Tây Phương) Là Gì', '{"nhom":"Hoàng lịch Chiêm tinh"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('12-con-giap', 'khai-niem', '12 Con Giáp Là Gì', '{"nhom":"Hoàng lịch Chiêm tinh"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('luc-hai-dia-chi', 'khai-niem', 'Lục Hại Là Gì', '{"nhom":"Địa chi nâng cao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('hinh-xung-khac-hai', 'khai-niem', 'Hình Xung Khắc Hại Là Gì', '{"nhom":"Địa chi nâng cao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('tam-hop-cuc-dia-chi', 'khai-niem', 'Tam Hợp Cục (Địa Chi) Là Gì', '{"nhom":"Địa chi nâng cao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
insert into public.thu_vien_muc (slug, bo_suu_tap, ten, xuong) values ('giap-cung-la-gi', 'khai-niem', 'Giáp Cung Là Gì', '{"nhom":"Địa chi nâng cao"}'::jsonb) on conflict (slug) do update set ten = excluded.ten, xuong = excluded.xuong;
commit;