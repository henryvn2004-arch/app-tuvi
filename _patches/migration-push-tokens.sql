-- migration-push-tokens.sql
-- Lưu device token push (FCM/APNs) của app native để gửi "Vận hôm nay" mỗi sáng.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
--
-- user_id: gắn nếu đã đăng nhập (để cá nhân hoá push theo lá số), NULL nếu khách.
-- token:   DUY NHẤT — app đăng ký lại thì upsert theo token (không nhân bản).
-- platform:'android' | 'ios' | 'web'.
-- birth:   lá số đã nhớ (tùy chọn) để cron cá nhân hoá nội dung push.

create table if not exists public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  token      text not null unique,
  platform   text not null default 'android',
  birth      jsonb,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx    on public.push_tokens(user_id);
create index if not exists push_tokens_enabled_idx  on public.push_tokens(enabled) where enabled;

-- RLS bật, KHÔNG policy → chỉ service_role (server) đọc/ghi. Client không truy cập
-- trực tiếp; mọi thao tác qua /api/push/register (server dùng SUPABASE_SERVICE_KEY).
alter table public.push_tokens enable row level security;
