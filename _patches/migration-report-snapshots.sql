-- 2026-09-28: bảng report_snapshots — BẢN CHỤP báo cáo cho trang Báo cáo
-- (`/app/bao-cao`). Henry: "báo cáo là những bản user đã bấm gen (kể cả xem
-- trước lẫn đầy đủ); bấm vào phải HIỆN RA báo cáo, không phải quay về form;
-- chưa lưu thì bỏ dòng đó".
--
-- Nguồn ghi DUY NHẤT: shell.js (`saveReportSnapshot`) → POST /api/reports/snapshot.
-- Shell chụp ĐÚNG payload của nút Chia sẻ (`currentShare()`): các khối
-- {header,image,text} mà tool tự khai qua `Shell.setShareable`, hoặc shell tự
-- suy từ DOM vùng kết quả — đã bỏ sẵn phần đang khoá paywall (`SHARE_SKIP_SEL`),
-- nên bản chụp là đúng những gì người dùng ĐANG THẤY: xem trước thì lưu xem
-- trước, mở khoá rồi thì lượt chụp sau ghi đè bằng bản đầy đủ.
--
-- Một dòng cho mỗi (user, tool, chủ thể) — `subject_key` = sha256 của lá số
-- dùng để luận (hoặc tiêu đề khi tool không có lá số), tính Ở SERVER.
-- Chạy lại cùng lá số = cập nhật dòng cũ, không đẻ dòng mới.
--
-- Riêng tư: KHÔNG có policy SELECT — chỉ đọc qua /api/reports (service key,
-- tự lọc theo user đã xác thực). Khác `shared_results` (link công khai).

create table if not exists public.report_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  tool_id     text not null,
  subject_key text not null,
  tool_label  text,
  title       text not null,
  subtitle    text,
  image_url   text,
  blocks      jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, tool_id, subject_key)
);

create index if not exists report_snapshots_user_idx on public.report_snapshots (user_id, updated_at desc);

alter table public.report_snapshots enable row level security;
revoke all on public.report_snapshots from anon, authenticated;
