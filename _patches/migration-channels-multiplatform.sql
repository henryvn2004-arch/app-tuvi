-- _patches/migration-channels-multiplatform.sql
-- ============================================================
-- TỔNG QUÁT HÓA KÊNH CHAT THÀNH ĐA-NỀN-TẢNG (Telegram → +Messenger +WhatsApp …)
-- ------------------------------------------------------------
-- Trước đây mỗi thứ riêng cho Telegram (telegram_sessions / telegram_links /
-- telegram_link_tokens / telegram_usage). Khi ráp nền tảng thứ 2–3 (Messenger,
-- WhatsApp — cùng Meta Graph), ta KHÔNG đẻ bảng riêng từng kênh nữa mà gộp về
-- 1 bộ bảng generic có cột `platform` (theo kế hoạch CLAUDE.md: "thêm cột platform").
--
--   chat_sessions      — lịch sử hội thoại + lá số đã lập, khóa (platform, chat_id)
--   chat_links         — map external_id (id người dùng phía nền tảng) → ví Lượng
--   chat_link_tokens   — token liên kết 1 lần (web sinh, bot tiêu thụ)
--   chat_usage         — đếm lượt free/ngày cho user CHƯA link
--   chat_incr_free_usage(platform, ext, day) — RPC tăng lượt atomic
--
-- AN TOÀN VỚI BOT TELEGRAM ĐANG LIVE:
--   • Migration CHỈ THÊM (tạo bảng generic + COPY dữ liệu Telegram sang,
--     platform='telegram'). KHÔNG đụng / KHÔNG xóa bảng telegram_* cũ.
--   • Code đọc/ghi đều best-effort (lỗi → trả rỗng, không sập route).
--   • THỨ TỰ TRIỂN KHAI: chạy migration NÀY TRƯỚC, rồi mới merge/redeploy
--     code đọc bảng chat_*. Khi đó dữ liệu phiên/ví Telegram đã có sẵn → liền
--     mạch. Bảng telegram_* cũ thành "mồ côi", có thể DROP sau khi xác nhận OK.
--
-- RLS bật, KHÔNG policy cho anon/authenticated → chỉ service_role (route server
-- dùng SERVICE KEY) đọc/ghi. Chạy 1 lần trong Supabase SQL Editor
-- (project dciwkfdqhhddeymlisey).
-- ============================================================

-- 1. Phiên hội thoại (messages + lá số) theo (platform, chat_id)
CREATE TABLE IF NOT EXISTS chat_sessions (
  platform   TEXT NOT NULL,
  chat_id    TEXT NOT NULL,
  messages   JSONB NOT NULL DEFAULT '[]'::jsonb,
  birth      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (platform, chat_id)
);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Map external_id → tài khoản Supabase (ví Lượng dùng chung với web)
CREATE TABLE IF NOT EXISTS chat_links (
  platform    TEXT NOT NULL,
  external_id TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (platform, external_id)
);
CREATE INDEX IF NOT EXISTS chat_links_user_id_idx ON chat_links (user_id);
ALTER TABLE chat_links ENABLE ROW LEVEL SECURITY;

-- 3. Token liên kết 1 lần (web sinh, bot tiêu thụ). Hết hạn ngắn.
CREATE TABLE IF NOT EXISTS chat_link_tokens (
  token      TEXT PRIMARY KEY,
  platform   TEXT NOT NULL,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS chat_link_tokens_expires_idx ON chat_link_tokens (expires_at);
ALTER TABLE chat_link_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Đếm lượt free/ngày cho user CHƯA link (chống đốt token)
CREATE TABLE IF NOT EXISTS chat_usage (
  platform    TEXT NOT NULL,
  external_id TEXT NOT NULL,
  day         DATE NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (platform, external_id, day)
);
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

-- 5. RPC tăng lượt free atomic → trả về count mới (gọi SAU khi trả lời thành công)
CREATE OR REPLACE FUNCTION chat_incr_free_usage(p_platform TEXT, p_ext TEXT, p_day DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_count INTEGER;
BEGIN
  INSERT INTO chat_usage (platform, external_id, day, count)
  VALUES (p_platform, p_ext, p_day, 1)
  ON CONFLICT (platform, external_id, day)
  DO UPDATE SET count = chat_usage.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- ============================================================
-- 6. COPY dữ liệu Telegram đang có sang bảng generic (platform='telegram').
--    Idempotent: ON CONFLICT DO NOTHING → chạy lại không nhân đôi. Chỉ chạy
--    nếu bảng telegram_* tồn tại (DO block tránh lỗi khi đã dọn bảng cũ).
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.telegram_sessions') IS NOT NULL THEN
    INSERT INTO chat_sessions (platform, chat_id, messages, birth, updated_at)
    SELECT 'telegram', chat_id, messages, birth, updated_at FROM telegram_sessions
    ON CONFLICT (platform, chat_id) DO NOTHING;
  END IF;

  IF to_regclass('public.telegram_links') IS NOT NULL THEN
    INSERT INTO chat_links (platform, external_id, user_id, linked_at)
    SELECT 'telegram', telegram_user_id, user_id, linked_at FROM telegram_links
    ON CONFLICT (platform, external_id) DO NOTHING;
  END IF;

  IF to_regclass('public.telegram_link_tokens') IS NOT NULL THEN
    INSERT INTO chat_link_tokens (token, platform, user_id, created_at, expires_at, used_at)
    SELECT token, 'telegram', user_id, created_at, expires_at, used_at FROM telegram_link_tokens
    ON CONFLICT (token) DO NOTHING;
  END IF;

  IF to_regclass('public.telegram_usage') IS NOT NULL THEN
    INSERT INTO chat_usage (platform, external_id, day, count)
    SELECT 'telegram', telegram_user_id, day, count FROM telegram_usage
    ON CONFLICT (platform, external_id, day) DO NOTHING;
  END IF;
END $$;
