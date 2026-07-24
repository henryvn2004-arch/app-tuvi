-- migration-admin-users.sql
-- Multi-admin support (Google sign-in): admin_users table (email/role/team)
-- + is_admin() RLS helper. Replaces the single hardcoded admin@tuviminhbao.com
-- check across RLS policies so additional admins can read the same tables the
-- app-level verifyAdmin() lets them through — otherwise a second admin logging
-- in fine would still see empty panels wherever admin.html reads Supabase
-- directly with the user's own JWT (not proxied through the service-key API).

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  team text,                -- 'marketing' | 'finance' | 'operations' | null (owner = all teams)
  role text not null default 'member' check (role in ('owner', 'member')),
  active boolean not null default true,
  invited_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_users_email on admin_users (email);

create or replace function is_admin(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from admin_users where email = p_email and active = true
  );
$$;

grant execute on function is_admin(text) to authenticated, anon;

insert into admin_users (email, display_name, role, invited_by)
values
  ('admin@tuviminhbao.com', 'Admin (tài khoản cũ)', 'owner', 'system'),
  ('henryvn2004@gmail.com', 'Henry', 'owner', 'system'),
  ('kimdien.tran@gmail.com', 'Kim Diễn', 'owner', 'system')
on conflict (email) do nothing;

alter table admin_users enable row level security;

drop policy if exists admin_users_read on admin_users;
create policy admin_users_read on admin_users for select
  using (is_admin(auth.jwt() ->> 'email'));
-- Không cấp insert/update/delete cho authenticated/anon — chỉ server (service
-- role, qua /api/payment action=admin-users-*) mới ghi được.

-- ── Đổi các policy hiện có từ hardcode email → is_admin() ──
drop policy if exists app_config_admin_read on app_config;
create policy app_config_admin_read on app_config for select
  using (is_admin(auth.jwt() ->> 'email'));

drop policy if exists events_admin_read on events;
create policy events_admin_read on events for select
  using (is_admin(auth.jwt() ->> 'email'));

drop policy if exists admin_read_laso on laso_public;
create policy admin_read_laso on laso_public for select
  using (is_admin(auth.jwt() ->> 'email'));

drop policy if exists admin_read_purchases on purchases;
create policy admin_read_purchases on purchases for select
  using (is_admin(auth.jwt() ->> 'email'));

drop policy if exists spouse_portraits_admin_read on spouse_portraits;
create policy spouse_portraits_admin_read on spouse_portraits for select
  using (is_admin(auth.jwt() ->> 'email'));

drop policy if exists pricing_admin_write on tool_pricing;
create policy pricing_admin_write on tool_pricing for all
  using (is_admin(auth.jwt() ->> 'email'))
  with check (is_admin(auth.jwt() ->> 'email'));

drop policy if exists user_attribution_admin_read on user_attribution;
create policy user_attribution_admin_read on user_attribution for select
  using (is_admin(auth.jwt() ->> 'email'));
