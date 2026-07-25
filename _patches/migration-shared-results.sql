-- migration-shared-results.sql
-- Bảng lưu kết quả CÔNG KHAI của khung giữa (workspace) app-shell để chia sẻ ra
-- ngoài (Facebook/Zalo/WhatsApp) — feature "Chia sẻ" DÙNG CHUNG cho MỌI tool
-- trong /app (khác hẳn shared_sessions vốn chỉ chia sẻ TRANSCRIPT rail, không
-- mang ảnh). Tool gọi Shell.setShareable({kind,title,imageUrl|text}) → nút
-- "Chia sẻ" tự hiện trong ws-actions → POST /api/share-result → permalink
-- /ket-qua/<id> công khai, OG:image thật (ảnh AI hoặc thẻ dựng từ text) để
-- preview đẹp khi paste link vào mạng xã hội.
--
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).

create table if not exists public.shared_results (
  id            text primary key,                 -- slug ngắn (base62 ~10 ký tự) do API sinh
  owner_user_id uuid references auth.users(id) on delete set null,  -- null = khách chưa đăng nhập
  tool_id       text not null,                     -- 'chan-dung-vo-chong' | 'phong-thuy' | ...
  kind          text not null,                     -- 'image' | 'text'
  title         text not null default 'Kết quả Luận Đường',
  image_url     text,                               -- bắt buộc nếu kind='image' (Supabase Storage public)
  text_content  text,                               -- bắt buộc nếu kind='text' (trích kết quả để dựng OG card)
  view_count    integer not null default 0,
  revoked       boolean not null default false,     -- owner có thể gỡ (chưa có UI gỡ ở MVP)
  created_at    timestamptz not null default now()
);

create index if not exists shared_results_owner_idx on public.shared_results(owner_user_id);
create index if not exists shared_results_created_idx on public.shared_results(created_at desc);
create index if not exists shared_results_tool_idx on public.shared_results(tool_id);

-- RLS: đọc công khai (trang /ket-qua/<id> ai cũng xem được); tạo mới cho mọi
-- người (kể cả khách). Không mở update/delete từ client (giống shared_sessions).
alter table public.shared_results enable row level security;

drop policy if exists shared_results_read on public.shared_results;
create policy shared_results_read on public.shared_results
  for select using (revoked = false);

drop policy if exists shared_results_insert on public.shared_results;
create policy shared_results_insert on public.shared_results
  for insert with check (true);

-- RPC security-definer để +1 view_count (RLS chặn UPDATE trực tiếp từ client).
create or replace function public.incr_shared_result_view(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shared_results set view_count = coalesce(view_count, 0) + 1 where id = p_id;
end;
$$;

grant execute on function public.incr_shared_result_view(text) to anon, authenticated, service_role;
