-- migration-chat-email-link.sql
-- ============================================================
-- GỘP TÀI KHOẢN WEB NGAY TRONG CHAT (Zalo OA · Messenger · WhatsApp · Telegram).
--
-- Người nhắn tin lần đầu có "tài khoản bóng" (migration-chat-accounts.sql).
-- Ai đã có tài khoản web thì trước đây phải lên web lấy mã rồi nhắn "/link
-- <mã>". Nay gộp ngay trong chat: nhắn email → hệ thống gửi mã 6 số vào email
-- đó → nhắn mã lại → gộp (chat_merge_shadow). Không mở trình duyệt nhúng —
-- nơi Google chặn đăng nhập và không có phiên web sẵn.
-- lib/channels/email-link.ts
--
-- File này thêm:
--   1. chat_real_user_id_by_email(email) — tài khoản web THẬT (không bóng,
--      không ẩn danh) theo email. Email không có tài khoản → null; chat vẫn trả
--      cùng một câu (không lộ email nào có tài khoản).
--   2. chat_email_links — mỗi lượt xin mã một dòng: mã băm, hạn 10 phút, đếm
--      lần nhập sai. Dòng của email KHÔNG có tài khoản vẫn được ghi (target
--      null) để trần số lượt xin mã áp như nhau.
--
-- Additive, chạy TRƯỚC deploy được (thiếu bảng thì lệnh gộp trả lỗi, kênh
-- không sập). Idempotent: chạy lại vô hại.
-- ============================================================

-- 1. Tài khoản web thật theo email --------------------------------------------
create or replace function public.chat_real_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and lower(u.email) not like '%@chat.tuviminhbao.com'
    and coalesce(u.is_anonymous, false) = false
  limit 1;
$$;
revoke all on function public.chat_real_user_id_by_email(text) from public, anon, authenticated;

-- 2. Lượt xin mã gộp ---------------------------------------------------------
create table if not exists public.chat_email_links (
  id             uuid primary key,
  platform       text not null,
  external_id    text not null,
  email          text not null,
  target_user_id uuid references auth.users(id) on delete cascade,
  code_hash      text not null,
  attempts       integer not null default 0,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  used_at        timestamptz
);
create index if not exists chat_email_links_chat_idx
  on public.chat_email_links (platform, external_id, created_at desc);
create index if not exists chat_email_links_email_idx
  on public.chat_email_links (email, created_at desc);
alter table public.chat_email_links enable row level security;
revoke all on table public.chat_email_links from public, anon, authenticated;
