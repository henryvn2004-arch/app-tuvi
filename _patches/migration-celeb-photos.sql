-- ============================================================
-- Kéo ảnh người nổi tiếng về Supabase Storage
--
-- 🔴 VÌ SAO. Trước migration này DB chỉ lưu TÊN FILE Commons; trình duyệt của
-- mỗi người dùng tự gọi thẳng commons.wikimedia.org để lấy byte ảnh, mỗi lần
-- render. Ba cái giá:
--   1. Một cú redirect (Special:FilePath → upload.wikimedia.org) tới host
--      không có CDN gần Việt Nam.
--   2. Commons đổi tên / gỡ file thì `image_file` thành rác — thẻ IM LẶNG rơi
--      về avatar chữ cái, không gì báo.
--   3. Hotlink ở quy mô lớn là thứ Wikimedia có quyền chặn.
--
-- ⚠️ SỬA LẠI MỘT CON SỐ SAI. Chú thích cũ (`migration-celeb-births.sql` và
-- `route.ts`) viết "100k ảnh × 40KB ≈ 4GB" rồi bị sửa mẫu số thành 350k mà
-- GIỮ NGUYÊN tổng — 351.294 × 40KB là **14 GB**, không phải 4 GB. Nhưng chính
-- phép tính lại làm lộ ra là mẫu số cũng sai: tập ảnh có thể BAO GIỜ lên hình
-- bị chặn trên bởi số khoá T1 (21.379) × số ứng viên mỗi khoá, chứ không phải
-- toàn bộ kho. Xem `WARM_PER_KEY` trong `tools-shared/celeb-photo.js`.
--
-- ── GHI CÔNG ────────────────────────────────────────────────
-- Hotlink thì mình chỉ DẪN tới tác phẩm. Kéo về là mình PHÂN PHỐI nó, nên
-- nghĩa vụ ghi công của CC BY-SA áp thẳng vào mình. `image_credit` đã có sẵn
-- trong bảng nhưng CHƯA CHỖ NÀO GHI VÀO — migration này thêm `image_license`
-- và script đồng bộ lấp cả hai từ `extmetadata` của Commons API.
--
-- An toàn chạy TRƯỚC deploy: chỉ thêm cột nullable + bucket, không đụng dòng
-- nào đang có, không bật gì cho người dùng thấy.
-- ============================================================

alter table celeb_births
  -- URL công khai của bản đã kéo về. NULL = chưa đồng bộ ⇒ rơi về Commons.
  add column if not exists image_url       text,
  -- Tên license ngắn ("CC BY-SA 4.0", "Public domain") từ extmetadata.
  add column if not exists image_license   text,
  -- Mốc đồng bộ thành công gần nhất. NULL = chưa từng.
  add column if not exists image_synced_at timestamptz,
  -- Lý do lượt đồng bộ gần nhất THẤT BẠI. Giữ lại để script biết đường bỏ qua
  -- và để đếm được "hỏng vì cái gì" — thất bại không ghi lại thì mỗi lượt chạy
  -- lại húc vào đúng những file đã hỏng.
  add column if not exists image_sync_err  text;

-- Sổ việc của script đồng bộ: dòng có ảnh Commons mà chưa kéo về được.
-- Partial index — chỉ ghim đúng phần script phải quét, không phình theo bảng.
create index if not exists celeb_births_can_dong_bo_idx
  on celeb_births (key_t1, fame_score desc)
  where blocked = false and image_file is not null and image_url is null;

-- Đo được "đã phủ bao nhiêu %": không có index này thì câu hỏi đó phải seq scan.
create index if not exists celeb_births_da_dong_bo_idx
  on celeb_births (image_synced_at)
  where image_url is not null;

-- ── Bucket ──────────────────────────────────────────────────
-- Công khai: ảnh Commons vốn đã là license tự do, và thẻ phải hiện được cho
-- khách CHƯA đăng nhập. Trần 5MB + chỉ nhận ảnh, giống `wardrobe-items`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'celeb-photos', 'celeb-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
