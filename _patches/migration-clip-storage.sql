-- Kho chứa clip dọc 9:16 dựng từ GitHub Actions.
--
-- 🔑 VÌ SAO CẦN: clip render xong ở Actions hiện chỉ nằm trong *artifact*, mà
-- artifact hết hạn sau 14 ngày. Không có bước này thì mỗi lượt dựng là một lượt
-- đốt CPU rồi vứt đi — và không có URL công khai nào để khâu đăng lấy file.
--
-- Bucket CÔNG KHAI vì mọi đường đăng đều cần một URL tải được từ bên ngoài:
-- YouTube (edge function tải file về rồi đẩy lên), và cả Instagram/Threads vốn
-- BẮT BUỘC ảnh/video phải có URL công khai. Cùng lối `van-dap-media` đang dùng
-- cho video vấn đáp.
--
-- ⚠️ Trần 60MB và chỉ nhận `video/mp4`: clip 9:16 hiện ~4MB, trần rộng gấp 15
-- lần là đủ chỗ cho bản dài hơn về sau mà vẫn chặn được ca ghi nhầm cả thư mục
-- vào đây. Bucket không giới hạn kiểu file là một bucket sớm muộn chứa đủ thứ.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', true, 62914560, array['video/mp4'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 🔐 KHÔNG tạo policy nào cho `anon`/`authenticated`.
--
-- Bucket công khai nghĩa là ĐỌC được qua URL; GHI thì vẫn phải qua service key.
-- Đường ghi duy nhất là edge function `clip-ingest` (giữ service key ở phía
-- server) — xem `_patches/edge-clip-ingest.deno.ts`. Nhờ vậy GitHub Actions chỉ
-- cầm một khoá HẸP làm được đúng một việc là nộp clip, thay vì cầm
-- `SUPABASE_SERVICE_KEY` vốn mở toang cả DB (khoá đó đã phải xoay một lần vì lộ).
