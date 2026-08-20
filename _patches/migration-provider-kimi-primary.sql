-- migration-provider-kimi-primary.sql
-- ============================================================
-- Chốt Henry 2026-08-20: đổi chuỗi provider LLM sitewide sang
--   Kimi K3 (primary) → Claude Opus 5 (backup-1) → Gemini Flash (backup-2)
-- cho CẢ đường "standalone" (lib/llm/complete.ts: cron, /api/lasotuvi,
-- tuong-mat, phong-thuy, tubinh, xem-tuoi...) LẪN đường "rail chat"
-- (lib/agent/run.ts, /api/v1/chat — sidebar "Trợ lý Luận Đường").
--
-- ⚠️ ĐÃ CHẠY TRỰC TIẾP qua Supabase MCP lúc code — ghi lại đây để có bản
-- lịch sử trong repo, khớp quy ước các migration khác trong thư mục này.
-- Chạy lại AN TOÀN (idempotent — chỉ UPDATE giá trị, không tạo gì mới).
--
-- Kimi K3 (Moonshot AI, endpoint OpenAI-compatible, KHÔNG có field DB nào
-- điều khiển được) là provider CODE-LEVEL mới — chỉ có tác dụng SAU KHI
-- deploy nhánh mang lib/agent/providers/kimi.ts. Hai dòng UPDATE dưới đây
-- chỉ chỉnh phần backup-1/backup-2 (Opus 5 + tắt Gemini-làm-primary), phần
-- Kimi-primary nằm trong code (run.ts thử Kimi TRƯỚC mọi eligibility gate cũ,
-- không đọc app_config).
--
-- Việc tay Henry: đã set env `KIMIK3_API_KEY` trên Vercel — xác nhận key đó
-- có mặt (Production + Preview) trước khi merge, nếu không rail sẽ tự rơi
-- xuống chuỗi cũ (Opus 5 → Gemini) một cách an toàn nhưng Kimi sẽ chưa từng
-- được thử tới.
-- ============================================================

-- Backup-1: 'claude-sonnet-4-6' → 'claude-opus-5' cho rail chat
-- (lib/config/appConfig.ts DEFAULTS.model đổi song song trong code cho
-- lượt CHƯA đọc được DB, vd môi trường không có SUPABASE_SERVICE_KEY).
update app_config set value = to_jsonb('claude-opus-5'::text)
 where key = 'chat.model';

-- Backup-2 chỉ còn Gemini SAU KHI Anthropic (Opus 5) lỗi, cho MỌI kịch bản
-- (kể cả 'laso' — vương miện có paywall). Trước đây `_default='gemini'` làm
-- Gemini được thử TRƯỚC Anthropic cho 20 kịch bản prose — giờ Kimi đã đứng
-- trước tất cả nên không cần Gemini làm "backup-0" nữa; xếp nó xuống đúng vị
-- trí backup-2 cho ĐỒNG NHẤT giữa mọi kịch bản.
update app_config set value = '{"_default":"anthropic","laso":"anthropic"}'::jsonb
 where key = 'chat.provider_routes';

-- Verify: SELECT key, value FROM app_config WHERE key LIKE 'chat.%' ORDER BY key;
--   chat.model            → "claude-opus-5"
--   chat.provider_routes  → {"_default":"anthropic","laso":"anthropic"}
