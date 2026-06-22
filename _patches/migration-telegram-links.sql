-- _patches/migration-telegram-links.sql
-- ============================================================
-- LIÊN KẾT TÀI KHOẢN TELEGRAM ↔ VÍ LƯỢNG (Supabase)
-- ------------------------------------------------------------
-- Mục tiêu: user nạp Lượng trên web rồi chat qua Telegram vẫn
-- dùng CHUNG một ví. Telegram chỉ đưa telegram_user_id (con số);
-- bảng này map nó về user_id (tài khoản Supabase = nguồn ví duy
-- nhất). Sau khi link, adapter Telegram tính phí trên ví đó y hệt
-- web (lib/billing/credits.ts).
--
-- Luồng link (one-time):
--   web (đã đăng nhập) → POST /api/channels/telegram/link → sinh
--   token 1 lần (telegram_link_tokens) → mở t.me/<bot>?start=<token>
--   → bot nhận /start <token> → đối chiếu token → lưu telegram_links.
--
-- Free cap: user CHƯA link chat qua bot được N lượt free/ngày
--   (chống đốt token); telegram_usage đếm theo ngày, RPC tăng atomic.
--
-- RLS bật, KHÔNG policy cho anon/authenticated → chỉ service_role
-- (route server dùng SERVICE KEY) đọc/ghi. Chạy 1 lần trong Supabase
-- SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

-- 1. Map telegram_user_id → tài khoản Supabase (ví Lượng dùng chung)
CREATE TABLE IF NOT EXISTS telegram_links (
  telegram_user_id TEXT PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- tra ngược (user_id → các Telegram đã link) cho trang quản lý
CREATE INDEX IF NOT EXISTS telegram_links_user_id_idx ON telegram_links (user_id);

ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;

-- 2. Token liên kết 1 lần (web sinh, bot tiêu thụ). Hết hạn ngắn.
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS telegram_link_tokens_expires_idx ON telegram_link_tokens (expires_at);

ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Đếm lượt free/ngày cho Telegram CHƯA link (chống đốt token)
CREATE TABLE IF NOT EXISTS telegram_usage (
  telegram_user_id TEXT NOT NULL,
  day              DATE NOT NULL,
  count            INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_user_id, day)
);

ALTER TABLE telegram_usage ENABLE ROW LEVEL SECURITY;

-- 4. RPC tăng lượt free atomic → trả về count mới (gọi SAU khi trả lời
--    thành công). Upsert + increment trong 1 câu, tránh race.
CREATE OR REPLACE FUNCTION tg_incr_free_usage(p_tid TEXT, p_day DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_count INTEGER;
BEGIN
  INSERT INTO telegram_usage (telegram_user_id, day, count)
  VALUES (p_tid, p_day, 1)
  ON CONFLICT (telegram_user_id, day)
  DO UPDATE SET count = telegram_usage.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;
