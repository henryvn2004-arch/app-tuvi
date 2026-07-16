-- migration-shared-sessions.sql
-- Bảng lưu SNAPSHOT phiên Luận Đường được chia sẻ (share full session như link ChatGPT).
-- Người share bấm "Chia sẻ phiên" → lưu 1 bản chụp read-only (lá số context + toàn bộ
-- hội thoại với thầy) → permalink /luan-duong/<id> công khai. Người nhận đọc free →
-- CTA đăng ký để hỏi thầy tiếp (nối tiếp phiên — PR2).
--
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).

create table if not exists public.shared_sessions (
  id           text primary key,                 -- slug ngắn (base62 ~10 ký tự) do API sinh
  owner_user_id uuid references auth.users(id) on delete set null,  -- null = khách chưa đăng nhập
  tool_id      text not null,                     -- 'laso' | 'xem-tuoi' | 'bat-tu' | ...
  title        text not null default 'Luận Đường',
  ctx_label    text,                              -- vd "Nguyễn Văn A · 03/06/1998 · Nam"
  thay         jsonb,                             -- { id, name } persona thầy
  messages     jsonb not null default '[]',       -- [{ role:'user'|'assistant', content }]
  view_count   integer not null default 0,
  signup_count integer not null default 0,        -- đo phễu: bao nhiêu người signup từ link này
  revoked      boolean not null default false,    -- owner có thể gỡ
  created_at   timestamptz not null default now()
);

create index if not exists shared_sessions_owner_idx on public.shared_sessions(owner_user_id);
create index if not exists shared_sessions_created_idx on public.shared_sessions(created_at desc);

-- RLS: đọc công khai (trang share ai cũng xem được); tạo mới cho mọi người (kể cả khách
-- — sharer thường đã đăng nhập nhưng không bắt buộc). Cập nhật/xoá chặn ở client (chỉ
-- API service-side hoặc owner làm — MVP chưa mở update từ client).
alter table public.shared_sessions enable row level security;

drop policy if exists shared_sessions_read on public.shared_sessions;
create policy shared_sessions_read on public.shared_sessions
  for select using (revoked = false);

drop policy if exists shared_sessions_insert on public.shared_sessions;
create policy shared_sessions_insert on public.shared_sessions
  for insert with check (true);
