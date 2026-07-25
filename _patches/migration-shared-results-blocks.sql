-- migration-shared-results-blocks.sql
-- Nối tiếp migration-shared-results.sql. Henry yêu cầu trang chia sẻ /ket-qua/<id>
-- hiện Y HỆT layout card (.res-block) của workspace, không chỉ ảnh+text phẳng.
-- Thêm cột `blocks` jsonb: mảng [{header?,image?,text?}] mô tả từng "thẻ" —
-- server render lại thành .res-block/.res-block-header/.res-block-body (CSS
-- server-side, KHÔNG nhận HTML thô từ client — tránh biến /ket-qua thành
-- host-HTML-tuỳ-ý cho phishing/XSS). Nullable, không phá dữ liệu cũ (các share
-- trước dùng image_url/text_content phẳng vẫn render như cũ — fallback).
--
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).

alter table public.shared_results
  add column if not exists blocks jsonb;
