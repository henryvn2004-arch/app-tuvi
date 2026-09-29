-- _patches/migration-ban-tin.sql
-- ============================================================
-- Bản tin kinh tế – đời sống hằng ngày cho rail chat (lib/ban-tin.ts, cron
-- /api/cron/ban-tin). Một dòng mỗi ngày (giờ VN); ghi đè khi chạy lại cùng ngày.
-- Chỉ server (service key) đọc/ghi ⇒ bật RLS, KHÔNG policy nào cho anon/authenticated.
-- Additive, chạy TRƯỚC deploy được: thiếu bảng thì rail không chèn bản tin, cron báo lỗi.
-- ============================================================
CREATE TABLE IF NOT EXISTS ban_tin_ngay (
  ngay DATE PRIMARY KEY,
  noi_dung TEXT NOT NULL,
  nguon JSONB,
  so_truy_van INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE ban_tin_ngay ENABLE ROW LEVEL SECURITY;
