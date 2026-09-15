-- migration-email-broadcast-queue.sql
-- ============================================================
-- Hàng đợi broadcast EMAIL — admin bấm gửi (handleAdminChannelBroadcast,
-- platform='email') chỉ NẠP hàng đợi (nhanh, một lượt GoTrue pagination),
-- cron `email-broadcast-drain` mới THỰC SỰ gửi theo lô. Lý do tách hai bước:
-- route admin (`app/api/payment`) có maxDuration=30s — gửi thẳng cho hàng
-- nghìn user trong MỘT request chắc chắn timeout giữa chừng, sổ email_log thì
-- vẫn ghi 'pending' cho phần dở dang mà không ai chốt.
--
-- `recipients` chốt cứng lúc NẠP (snapshot email lúc bấm gửi) — user mới đăng
-- ký sau khi bấm gửi không nhận được, ĐÚNG Ý: một chiến dịch phải có tập nhận
-- cố định để "đã gửi bao nhiêu/còn bao nhiêu" có nghĩa.
-- ============================================================

create table if not exists public.email_broadcast_queue (
  id           bigint generated always as identity primary key,
  subject      text not null,
  html         text not null,
  created_by   text,
  created_at   timestamptz not null default now(),
  status       text not null default 'pending',  -- pending | done
  recipients   jsonb not null,                     -- [{"email":"...","user_id":"..."}]
  total        int not null,
  cursor_pos   int not null default 0,
  sent         int not null default 0,
  failed       int not null default 0,
  finished_at  timestamptz
);

alter table public.email_broadcast_queue enable row level security;
-- Không policy nào — chỉ service_role (bypass RLS) chạm bảng này.
