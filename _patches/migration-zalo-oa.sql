-- _patches/migration-zalo-oa.sql
-- ============================================================
-- KÊNH ZALO OA — nơi giữ cặp token OAuth của Official Account.
--
-- VÌ SAO LÀ BẢNG, không phải env Vercel: access token Zalo sống ~25h, còn
-- refresh token là loại DÙNG MỘT LẦN — mỗi lần làm mới, Zalo trả về một
-- refresh token MỚI và vô hiệu cái cũ. Env Vercel không tự ghi lại được, nên
-- để ở env thì lần làm mới thứ hai chắc chắn chết. Bảng một dòng (id=1).
--
-- Phiên/liên kết/lượt free của Zalo dùng CHUNG bảng generic chat_* với
-- platform='zalo-oa' (migration-channels-multiplatform.sql) — không cần bảng mới.
--
-- RLS bật, KHÔNG policy + REVOKE → chỉ service_role (route server) chạm được.
-- Migration an toàn, chạy TRƯỚC deploy được (chưa có dòng nào thì adapter
-- chỉ log lỗi và không gửi được tin).
-- ============================================================

CREATE TABLE IF NOT EXISTS zalo_oa_tokens (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE zalo_oa_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON zalo_oa_tokens FROM public, anon, authenticated;

-- ── Nạp cặp token ĐẦU TIÊN (chạy tay, một lần) ─────────────────
-- Lấy access_token + refresh_token từ developers.zalo.me → API Explorer
-- (loại "OA Access Token"), rồi thay 2 chuỗi dưới đây và chạy:
--
-- INSERT INTO zalo_oa_tokens (id, access_token, refresh_token, expires_at)
-- VALUES (1, '<ACCESS_TOKEN>', '<REFRESH_TOKEN>', NOW() + INTERVAL '1 hour')
-- ON CONFLICT (id) DO UPDATE
--   SET access_token = EXCLUDED.access_token,
--       refresh_token = EXCLUDED.refresh_token,
--       expires_at = EXCLUDED.expires_at,
--       updated_at = NOW();
--
-- expires_at để 1 giờ cho chắc: lần gửi tin đầu sau 1 giờ sẽ tự làm mới và
-- ghi lại hạn thật do Zalo trả về.
