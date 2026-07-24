-- migration-chan-dung-meeting-context.sql
-- ============================================================
-- Bổ sung cột "meeting_context" (Hoàn cảnh gặp gỡ) cho bảng
-- spouse_portraits — LLM suy hoàn cảnh gặp gỡ nhiều khả năng nhất
-- (qua công việc, qua giới thiệu, ở nơi xa,...) dựa trên cách cục/ý
-- nghĩa cổ pháp tại Phu Thê, lưu kèm lịch sử mỗi lần sinh ảnh.
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

alter table public.spouse_portraits
  add column if not exists meeting_context text;
