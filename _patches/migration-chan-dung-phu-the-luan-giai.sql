-- migration-chan-dung-phu-the-luan-giai.sql
-- ============================================================
-- Bổ sung cột "phu_the_luan_giai" cho bảng spouse_portraits — đoạn luận giải
-- cung Phu Thê đầy đủ (văn xuôi, ĐÚNG flow/văn phong tool luan-giai, xem
-- lib/agent/phu-the-luan-giai.ts), hiển thị bên dưới chân dung và cũng là
-- nguồn dữ liệu để suy đoán chênh lệch tuổi bạn đời chính xác hơn.
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

alter table public.spouse_portraits
  add column if not exists phu_the_luan_giai text;
