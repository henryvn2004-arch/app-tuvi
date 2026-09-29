-- _patches/migration-chat-nudge.sql
-- ============================================================
-- Kênh chat webhook: (1) nhớ trạng thái NÚT GỢI Ý giữa các lượt — lần cuối hiện
-- nút sản phẩm, nút tính năng vừa hiện, nhãn các nút vừa gửi (để đếm lượt bấm);
-- (2) TIN NHẮC CHỦ ĐỘNG (cron /api/cron/chat-nudge) — lần nhắc cuối, số lần nhắc
-- liên tiếp khách không trả lời, khách đã gõ "tắt nhắc" chưa.
-- Xem lib/channels/goi-y.ts và lib/channels/nudge.ts.
--
-- Additive, chạy TRƯỚC deploy được: code đọc hụt cột thì nút gợi ý chạy không
-- nhớ khoảng cách (vẫn chỉ hiện ở thời điểm nóng), còn cron nhắc thì bỏ qua cả
-- lượt (lỗi truy vấn ⇒ không gửi gì) — thiếu cột KHÔNG bao giờ thành gửi tràn.
-- ============================================================
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS goi_y JSONB;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS nudged_at TIMESTAMPTZ;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS nudge_miss INT NOT NULL DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS nudge_off BOOLEAN NOT NULL DEFAULT FALSE;

-- Cron quét theo (platform, updated_at) mỗi giờ.
CREATE INDEX IF NOT EXISTS chat_sessions_platform_updated_idx ON chat_sessions (platform, updated_at);
