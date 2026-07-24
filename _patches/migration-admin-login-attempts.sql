-- migration-admin-login-attempts.sql
-- Ghi lại MỌI lượt đăng nhập admin (thành công/thất bại/bị chặn) để: (1) rate
-- limit chống brute-force trên /api/admin/login (đếm thất bại gần đây theo
-- IP/email trước khi cho thử tiếp — trước PR này KHÔNG có giới hạn nào ngoài
-- rate-limit mặc định của Supabase Auth); (2) audit log cho panel "Quản Trị
-- Viên" xem lại ai đăng nhập/thử đăng nhập, từ đâu, khi nào.

create table if not exists admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text,
  ip text,
  success boolean not null,
  method text not null default 'password', -- 'password' | 'google'
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_login_attempts_email on admin_login_attempts (lower(email), created_at desc);
create index if not exists idx_admin_login_attempts_ip on admin_login_attempts (ip, created_at desc);
create index if not exists idx_admin_login_attempts_created on admin_login_attempts (created_at desc);

alter table admin_login_attempts enable row level security;

-- Chỉ owner mới đọc (chứa email/IP thử đăng nhập — nhạy cảm hơn các bảng
-- admin-read khác). Ghi CHỈ qua service key (route login/oauth-verify).
drop policy if exists admin_login_attempts_owner_read on admin_login_attempts;
create policy admin_login_attempts_owner_read on admin_login_attempts for select
  using (
    exists(
      select 1 from admin_users
      where email = (auth.jwt() ->> 'email') and active = true and role = 'owner'
    )
  );
