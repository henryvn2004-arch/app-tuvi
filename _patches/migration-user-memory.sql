-- ============================================================
-- TẦNG 2 của rail — hồ sơ "Thầy nhớ gì về con"
--
-- Model tự rút ra trong lúc trò chuyện (tool ghi_nho / quen_di), người dùng
-- xem–sửa–xoá được trong trang Tài khoản. Nội dung ở đây nhạy hơn hẳn ngày
-- sinh (chuyện mất việc, ly hôn, bệnh tật), nên:
--   · RLS bật, CHỈ chủ sở hữu đọc/sửa/xoá.
--   · KHÔNG có policy INSERT → chỉ service key (đường ghi của tool) chèn được.
--   · on delete cascade — xoá tài khoản là bay sạch, không để lại mảnh.
--
-- ⚠️ Dữ liệu bảng này TUYỆT ĐỐI không được đi vào link chia sẻ (/ket-qua,
-- /luan-duong), poster, hay meta của `events`. Nó chỉ chảy vào system prompt
-- của chính chủ.
-- ============================================================

create table if not exists public.user_memory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Nhóm để hiện cho người dùng đọc, KHÔNG dùng cho logic. Chuỗi tự do có
  -- kiểm ở tầng app (MEMORY_KINDS) — đặt enum ở DB thì thêm nhóm phải migrate.
  loai        text not null default 'khac',
  noi_dung    text not null,
  -- 'thay' = model tự rút ra · 'nguoi' = người dùng tự sửa/thêm.
  -- Để phân biệt được cái nào máy đoán, cái nào chính chủ xác nhận.
  nguon       text not null default 'thay',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists user_memory_user_idx
  on public.user_memory (user_id, updated_at desc);

-- Chống ghi trùng NGUYÊN VĂN ở tầng DB thay vì bắt mã ứng dụng nhớ hộ —
-- model sẽ gọi ghi_nho lặp lại cùng một điều qua nhiều lượt. Chuẩn hoá
-- lower+trim để "Đang tìm việc" và "đang tìm việc " là một.
create unique index if not exists user_memory_dedupe_idx
  on public.user_memory (user_id, lower(btrim(noi_dung)));

alter table public.user_memory enable row level security;

drop policy if exists user_memory_owner_read on public.user_memory;
create policy user_memory_owner_read on public.user_memory
  for select using (auth.uid() = user_id);

drop policy if exists user_memory_owner_update on public.user_memory;
create policy user_memory_owner_update on public.user_memory
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_memory_owner_delete on public.user_memory;
create policy user_memory_owner_delete on public.user_memory
  for delete using (auth.uid() = user_id);

-- CỐ Ý không có policy INSERT: đường ghi duy nhất là tool phía server (service
-- key). Người dùng thêm tay cũng đi qua API server, không ghi thẳng từ trình
-- duyệt — để mọi lượt ghi đều qua một cửa có kiểm độ dài và trần số mục.
