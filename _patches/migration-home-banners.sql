-- ============================================================================
-- home_banners — banner trượt ngang trên Trang chủ (hellobot-ui-redesign, Đợt 2)
-- ----------------------------------------------------------------------------
-- Đợt 1 dựng khung 5 tab. Đợt 2 (phần 1, đã deploy) thêm lưới 8 Bộ môn ở
-- app-home.html. Bảng này phục vụ phần còn lại: banner trượt ngang ngay dưới
-- lưới Bộ môn — nội dung khuyến mãi/nổi bật, SỬA TRONG ADMIN, không cần
-- deploy (đúng nếp `tool_groups`/`tool_pricing`).
--
-- Cột chốt với Henry (2026-09-24): title, subtitle, image_url, cta_tool_id,
-- sort_order, enabled, starts_at, ends_at. `cta_tool_id` tham chiếu THẲNG
-- `tool_pricing.tool_id` — banner luôn dẫn tới một công cụ CÓ THẬT, không rơi
-- vào đường chết khi công cụ đó bị đổi tên/gỡ (FK giữ ràng buộc đó).
--
-- `starts_at`/`ends_at` cùng tên với `tool_pricing.sale_starts_at/ends_at` —
-- một banner còn hiệu lực khi `enabled` VÀ nằm trong khoảng đó (NULL = không
-- chặn đầu/cuối). So sánh bằng giờ UTC (timestamptz), không tự suy giờ VN.
-- ============================================================================

begin;

create table if not exists public.home_banners (
  id          bigint generated always as identity primary key,
  title       text not null,
  subtitle    text,
  image_url   text,
  cta_tool_id text references public.tool_pricing (tool_id) on delete set null,
  sort_order  int not null default 100,
  enabled     boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  updated_at  timestamptz default now()
);

alter table public.home_banners enable row level security;

-- Cùng khuôn với `tool_groups`: ai cũng ĐỌC được (Trang chủ đọc bằng anon
-- key qua GET no-store), chỉ admin GHI.
drop policy if exists home_banners_public_read on public.home_banners;
create policy home_banners_public_read on public.home_banners
  for select using (true);

drop policy if exists home_banners_admin_write on public.home_banners;
create policy home_banners_admin_write on public.home_banners
  for all using (public.is_admin((auth.jwt() ->> 'email')));

commit;
