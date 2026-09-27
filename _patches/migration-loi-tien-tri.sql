-- ============================================================
-- SỔ TIÊN TRI (docs/DAC-TRUNG-PLAN.md) — những điều thầy phán CÓ MỐC THỜI GIAN
--
-- Model ghi qua tool `ghi_so_tien_tri` ngay lúc phán ("cuối tháng 10 âm dễ hao
-- tài vì bạn bè rủ rê"), kèm NGÀY HỎI LẠI (dương lịch, ngay sau khi mốc qua).
-- Đến hạn, thầy hỏi lại trong chat ("chuyện đó thế nào rồi?") và khách bấm
-- Đúng / Chưa thấy gì. Kết quả chỉ để ĐO NỘI BỘ (Henry chốt 2026-09-27: không
-- công khai tỉ lệ trúng, đo 2 tháng rồi mới quyết).
--
--   · RLS bật, chủ sở hữu chỉ được ĐỌC. Không policy INSERT/UPDATE/DELETE —
--     mọi lượt ghi đi qua server (service key), nơi có kiểm độ dài, hạn ngày
--     và trần số mục. Khách bấm Đúng/Chưa cũng qua API server.
--   · on delete cascade — xoá tài khoản là bay sạch.
-- ============================================================

create table if not exists public.loi_tien_tri (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- Lời phán, ngôi thứ hai như thầy nói với khách. Kiểm ≤300 ký tự ở tầng app.
  noi_dung      text not null,
  -- Ngày (dương lịch, giờ VN) thầy hỏi lại — sau khi mốc trong lời phán đã qua.
  hoi_lai_ngay  date not null,
  -- Thầy nào phán + phiên nào — để lúc hỏi lại dùng đúng giọng/chân dung.
  author_id     text,
  session_id    text,
  -- cho = chưa tới hạn / chưa hỏi · da_hoi = khách đã trả lời.
  trang_thai    text not null default 'cho' check (trang_thai in ('cho', 'da_hoi')),
  -- dung = khách xác nhận đúng · chua = chưa thấy gì · null = chưa trả lời.
  ket_qua       text check (ket_qua in ('dung', 'chua')),
  -- Lần cuối hệ thống CHỦ ĐỘNG nhắn (Telegram / web push) — để cron không
  -- nhắn hai lần cho cùng một lời phán. null = chưa nhắn qua kênh ngoài.
  nhac_at       timestamptz,
  answered_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists loi_tien_tri_user_idx
  on public.loi_tien_tri (user_id, hoi_lai_ngay);

-- Cron "thầy tự nhắn" quét theo ngày đến hạn trên các mục CHƯA trả lời.
create index if not exists loi_tien_tri_due_idx
  on public.loi_tien_tri (hoi_lai_ngay) where trang_thai = 'cho';

-- Model hay gọi lặp lại cùng một lời phán qua nhiều lượt — chặn trùng nguyên
-- văn ở tầng DB (lower+trim), cùng lối `user_memory_dedupe_idx`.
create unique index if not exists loi_tien_tri_dedupe_idx
  on public.loi_tien_tri (user_id, lower(btrim(noi_dung)));

alter table public.loi_tien_tri enable row level security;

drop policy if exists loi_tien_tri_owner_read on public.loi_tien_tri;
create policy loi_tien_tri_owner_read on public.loi_tien_tri
  for select using (auth.uid() = user_id);
