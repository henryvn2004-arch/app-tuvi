-- _patches/migration-telegram-sessions.sql
-- ============================================================
-- Lưu lịch sử hội thoại bot Telegram theo chat_id (để slot-filling
-- ngày sinh chạy qua nhiều lượt). Đọc/ghi bằng SERVICE KEY ở
-- app/api/channels/telegram (RLS bật, chỉ service_role qua được).
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

CREATE TABLE IF NOT EXISTS telegram_sessions (
  chat_id    TEXT PRIMARY KEY,
  messages   JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lá số đã lập (BirthParams: day/month/year/hourBranch/gender) lưu theo
-- chat_id → các lượt sau truyền thẳng req.birth, bot KHÔNG quên khi thông
-- tin sinh trôi khỏi cửa sổ 12 tin. /new (clearSession) xóa luôn cột này.
-- Idempotent: an toàn chạy lại nếu bảng đã có từ trước.
ALTER TABLE telegram_sessions ADD COLUMN IF NOT EXISTS birth JSONB;

-- RLS bật, KHÔNG tạo policy cho anon/authenticated → chỉ service_role
-- (route server) đọc/ghi được. Người dùng cuối không truy cập bảng này.
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;
