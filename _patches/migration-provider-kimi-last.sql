-- migration-provider-kimi-last.sql
-- ============================================================
-- Chốt Henry 2026-08-24: Kimi K3 chạy KHÔNG ỔN ĐỊNH (hay chậm/timeout) →
-- đẩy xuống LƯỚI ĐỠ CUỐI CÙNG cho MỌI kịch bản, cả đường "standalone"
-- (lib/llm/complete.ts: cron, /api/lasotuvi, tuong-mat, phong-thuy, tubinh,
-- xem-tuoi, van-han-nam, day-con, huong-nghiep-tre...) LẪN đường "rail chat"
-- (lib/agent/run.ts, /api/v1/chat).
--
-- Mặc định TOÀN SITE (standalone lẫn rail):
--   Gemini Flash (primary) → Opus 5 → Kimi K3 (cuối cùng)
--
-- Riêng nhóm tool "luận giải" quan trọng — Xác Định Giờ Sinh (KHÔNG gọi LLM,
-- bỏ qua), Luận Giải Lá Số, Chu Trình Cuộc Đời, Tử Bình Bát Tự, Vận Hạn 12
-- Tháng Tới, Thần Số Học, Xem Tuổi Làm Ăn, Xem Tuổi Vợ Chồng, Tử Vi Công Sở &
-- Hướng Nghiệp, Dạy Con Theo Lá Số, Hướng Nghiệp Sớm Cho Con:
--   Opus 5 (primary) → Gemini Flash → Kimi K3 (cuối cùng)
--
-- ⚠️ CHƯA CHẠY được qua Supabase MCP trong phiên này (server MCP ngắt kết nối)
-- — Henry cần chạy tay (SQL editor / Supabase MCP phiên khác) HOẶC dán đúng
-- JSON bên dưới vào Admin → Cấu Hình Chat → "Provider Routes theo kịch bản"
-- (public/admin.html, field `chat.provider_routes`). File này ghi lại để có
-- bản lịch sử trong repo, khớp quy ước các migration khác trong thư mục này.
-- Chạy lại AN TOÀN (idempotent — chỉ UPDATE/INSERT-nếu-thiếu, không xoá gì).
--
-- CODE ĐI KÈM migration này (đã đổi trong cùng đợt, cần deploy TRƯỚC khi
-- chạy SQL — nếu không route standalone của các tool "luận giải" quan trọng
-- vẫn đi Gemini mặc định vì code chưa có `provider:'anthropic'` ở lệnh gọi):
--   lib/llm/complete.ts        — CANONICAL_ORDER đổi ['kimi','anthropic','gemini']
--                                 → ['anthropic','gemini','kimi'] (Kimi CỐ ĐỊNH cuối)
--   lib/agent/run.ts           — Kimi dời từ TRƯỚC Anthropic sang lưới đỡ
--                                 CUỐI CÙNG (trong nhánh lỗi của loop Anthropic)
--   lib/agent/providers/gemini.ts — thêm 'cong-so'/'day-con'/'huong-nghiep-tre'
--                                 vào GEMINI_PROSE_SCENARIOS (than-so-hoc đã có)
--   app/api/lasotuvi/route.ts, tubinh/route.ts, van-han-nam/route.ts,
--   xem-tuoi/route.ts, day-con/route.ts, huong-nghiep-tre/route.ts
--                                — thêm `provider:'anthropic'` vào ĐÚNG lệnh
--                                 gọi luận giải của từng tool quan trọng
-- ============================================================

-- Mặc định toàn site (route STANDALONE): Gemini Flash primary. Kimi K3 tự
-- xếp cuối nhờ CANONICAL_ORDER trong code (không có field DB riêng cho nó).
update app_config set value = to_jsonb('gemini'::text)
 where key = 'chat.standalone_provider';
insert into app_config(key, value)
  select 'chat.standalone_provider', to_jsonb('gemini'::text)
 where not exists (select 1 from app_config where key = 'chat.standalone_provider');

-- Rail chat (run.ts): '_default' + 'laso' giữ 'gemini' (không đổi); 7 kịch
-- bản "luận giải" quan trọng ép 'anthropic' để Opus 5 đứng đầu — Gemini vẫn
-- là lưới đỡ NGAY SAU nếu Opus chết (xem run.ts "FALLBACK NGƯỢC"), Kimi luôn
-- cuối cùng. GHI ĐÈ TOÀN BỘ map — provider_routes không merge theo khoá.
update app_config set value = '{
  "_default": "gemini",
  "laso": "gemini",
  "cong-so": "anthropic",
  "day-con": "anthropic",
  "huong-nghiep-tre": "anthropic",
  "than-so-hoc": "anthropic",
  "tu-binh": "anthropic",
  "xem-tuoi": "anthropic",
  "xem-lam-an": "anthropic"
}'::jsonb
 where key = 'chat.provider_routes';
insert into app_config(key, value)
  select 'chat.provider_routes', '{
    "_default": "gemini",
    "laso": "gemini",
    "cong-so": "anthropic",
    "day-con": "anthropic",
    "huong-nghiep-tre": "anthropic",
    "than-so-hoc": "anthropic",
    "tu-binh": "anthropic",
    "xem-tuoi": "anthropic",
    "xem-lam-an": "anthropic"
  }'::jsonb
 where not exists (select 1 from app_config where key = 'chat.provider_routes');

-- Verify: SELECT key, value FROM app_config WHERE key LIKE 'chat.%' ORDER BY key;
--   chat.standalone_provider → "gemini"
--   chat.provider_routes     → {"_default":"gemini","laso":"gemini","cong-so":"anthropic",
--                                "day-con":"anthropic","huong-nghiep-tre":"anthropic",
--                                "than-so-hoc":"anthropic","tu-binh":"anthropic",
--                                "xem-tuoi":"anthropic","xem-lam-an":"anthropic"}
