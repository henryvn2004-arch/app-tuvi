-- migration-provider-rail-gemini-only.sql
-- ============================================================
-- Chốt Henry 2026-08-24 (VÁ cùng ngày, ngay sau migration-provider-kimi-last.sql):
--   "Toàn bộ chat rail dùng gemini flash hết. Ko có opus luôn. Vì phần chat
--    nó user dùng nhiều. Mà opus api thì mắc lắm"
--
-- migration-provider-kimi-last.sql (chạy trước đó cùng ngày) đã ép 7 kịch
-- bản "luận giải" quan trọng trong RAIL CHAT (lib/agent/run.ts, /api/v1/chat)
-- sang 'anthropic' (Opus 5 đứng đầu). Henry sau đó chốt: rail chat có LƯU
-- LƯỢNG cao hơn hẳn các route luận giải một-lần (mỗi phiên user hỏi-đáp lặp
-- lại nhiều lượt) → Opus API đứng đầu ở đây tốn quá nhiều. Gỡ TOÀN BỘ carve-out
-- 'anthropic' trong `chat.provider_routes`, quay về 'gemini' cho MỌI kịch bản.
--
-- KHÔNG đụng:
--   - `chat.standalone_provider` (mặc định toàn site cho route STANDALONE —
--     cron/tuong-mat/phong-thuy — vẫn 'gemini', không đổi).
--   - `provider:'anthropic'` ép CỨNG tại lệnh gọi trong code của các route
--     luận giải MỘT-LẦN: lasotuvi/tubinh (16-phần)/xem-tuoi (9-phần)/
--     van-han-nam/day-con/huong-nghiep-tre — đây là luận giải, không phải
--     "chat", tần suất thấp hơn nhiều so với rail. KHÔNG đọc
--     `chat.provider_routes` nên migration này không ảnh hưởng chúng.
--   - Opus 5 KHÔNG bị gỡ khỏi hệ thống — vẫn là lưới đỡ NGAY SAU nếu Gemini
--     lỗi giữa chừng rail (xem lib/agent/run.ts "FALLBACK NGƯỢC"), Kimi K3
--     luôn đứng cuối cùng.
--
-- CODE ĐI KÈM (đổi cùng đợt, deploy TRƯỚC khi chạy SQL — nếu không rail vẫn
-- ép Opus primary cho 7 kịch bản đó vì DEFAULTS trong code fallback về giá
-- trị cũ khi Supabase không đọc được, dù hiếm khi xảy ra):
--   lib/config/appConfig.ts — DEFAULTS.providerRoutes: 7 khoá 'anthropic'
--                              → 'gemini'
--   lib/agent/run.ts         — cập nhật comment PROVIDER ROUTING cho khớp
--
-- Chạy lại AN TOÀN (idempotent — chỉ UPDATE/INSERT-nếu-thiếu, không xoá gì).
-- ============================================================

update app_config set value = '{
  "_default": "gemini",
  "laso": "gemini",
  "cong-so": "gemini",
  "day-con": "gemini",
  "huong-nghiep-tre": "gemini",
  "than-so-hoc": "gemini",
  "tu-binh": "gemini",
  "xem-tuoi": "gemini",
  "xem-lam-an": "gemini"
}'::jsonb
 where key = 'chat.provider_routes';
insert into app_config(key, value)
  select 'chat.provider_routes', '{
    "_default": "gemini",
    "laso": "gemini",
    "cong-so": "gemini",
    "day-con": "gemini",
    "huong-nghiep-tre": "gemini",
    "than-so-hoc": "gemini",
    "tu-binh": "gemini",
    "xem-tuoi": "gemini",
    "xem-lam-an": "gemini"
  }'::jsonb
 where not exists (select 1 from app_config where key = 'chat.provider_routes');

-- Verify: SELECT value FROM app_config WHERE key = 'chat.provider_routes';
--   → {"_default":"gemini","laso":"gemini","cong-so":"gemini","day-con":"gemini",
--      "huong-nghiep-tre":"gemini","than-so-hoc":"gemini","tu-binh":"gemini",
--      "xem-tuoi":"gemini","xem-lam-an":"gemini"}
