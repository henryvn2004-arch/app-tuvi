-- C3 — Thư viện chung (gallery) cho `shared_results`.
--
-- Henry chốt: **AUTO OPT-IN, trừ khi người dùng chọn ẩn đi.** Nên cột mang
-- nghĩa "người dùng đã CHỌN ẩn", mặc định `false` = có mặt trong thư viện.
-- Đặt tên theo hành động của người dùng chứ không phải theo trạng thái hiển
-- thị: `listed=true` thì một dòng cũ chưa backfill sẽ mặc định BIẾN MẤT khỏi
-- thư viện, còn `gallery_opt_out=false` thì mặc định đúng ý đã chốt.
--
-- ⚠️ 38 dòng hiện có đều của MỘT chủ (bản test của Henry, đã kiểm) nên việc bật
-- hồi tố không chạm người dùng thật nào.
alter table public.shared_results
  add column if not exists gallery_opt_out boolean not null default false;

-- Chỉ mục cho lượt đọc của trang thư viện: lọc hai cờ rồi sắp theo thời gian.
create index if not exists shared_results_gallery_idx
  on public.shared_results (created_at desc)
  where revoked = false and gallery_opt_out = false;

comment on column public.shared_results.gallery_opt_out is
  'Người tạo link đã chọn ẩn bản này khỏi Thư viện chung (/thu-vien). Mặc định false = auto opt-in.';
