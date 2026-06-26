-- migration-chat-profiles.sql
-- ============================================================
-- "SỔ LÁ SỐ" đa-nền-tảng — lưu nhiều lá số ĐẶT TÊN cho mỗi người dùng
-- của một kênh chat (Telegram / Messenger / WhatsApp / Zalo…).
--
-- Bối cảnh: Messenger/WhatsApp/Telegram KHÔNG tách nhiều phiên như web, nên
-- khi 1 người hỏi nhiều lá số (anh Tony, con gái…) dễ bị lẫn. Bảng này cho
-- mỗi (platform, chat_id) một SỔ các lá số có tên; user "xem lá số Tony" là
-- mở đúng lá số đó, hết nhiễm chéo.
--
-- AN TOÀN: chỉ THÊM bảng mới, KHÔNG đụng chat_sessions/chat_links… nên bot
-- Telegram đang LIVE chạy bình thường kể cả trước khi chạy migration này
-- (lib/channels/store đọc/ghi best-effort: bảng chưa có → trả rỗng, không sập).
--
-- "Lá số đang xem" vẫn là chat_sessions.birth như cũ — KHÔNG thêm cột. Tên
-- lá số đang xem được suy ra bằng cách dò birth khớp trong sổ này.
-- ============================================================

create table if not exists public.chat_profiles (
  id          bigint generated always as identity primary key,
  platform    text        not null,
  chat_id     text        not null,
  name        text        not null,
  birth       jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1 người (platform, chat_id) không có 2 lá số trùng tên (so KHÔNG phân biệt
-- hoa/thường để "Tony" và "tony" là một). Upsert dựa trên index này.
create unique index if not exists chat_profiles_owner_name_uq
  on public.chat_profiles (platform, chat_id, lower(name));

-- Liệt kê sổ của 1 người nhanh.
create index if not exists chat_profiles_owner_idx
  on public.chat_profiles (platform, chat_id);

-- Service key (server) bỏ qua RLS; bật RLS + KHÔNG policy để chặn anon/auth
-- đọc trực tiếp (giống các bảng chat_* khác do server-side quản).
alter table public.chat_profiles enable row level security;
