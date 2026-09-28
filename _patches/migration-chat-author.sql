-- _patches/migration-chat-author.sql
-- ============================================================
-- Kênh chat webhook (Zalo/Telegram/Messenger/WhatsApp): nhớ THẦY đang tiếp
-- chuyện theo từng cuộc trò chuyện — web giữ ở localStorage (`tvc_author_v1`),
-- kênh không có trình duyệt nên giữ ở đây. Khớp `master_profiles.id` /
-- `lib/agent/personas.ts`. NULL = chưa chọn → kênh tự gán một thầy cố định.
-- Additive, chạy TRƯỚC deploy được (code đọc hụt cột thì rơi về thầy mặc định).
-- ============================================================
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS author_id TEXT;
