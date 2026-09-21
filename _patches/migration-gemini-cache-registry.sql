-- ============================================================
-- gemini_cache_registry — sổ tay cache "cachedContents" của Gemini cho rail
-- ============================================================
-- Bối cảnh: Sprint 0 đo được rail chat tốn TB 219k token/lượt khi route qua
-- Gemini (so với 4,9k token/lượt bên Anthropic nhờ cache_control ttl:1h đã
-- có sẵn) — vì đường Gemini KHÔNG hề tạo cache tường minh, chỉ trông chờ
-- cache ngầm của Google (đo hit-rate thật ~7%). Bảng này là nơi NHỚ cache
-- handle giữa các request, vì /api/v1/chat là API STATELESS (mỗi POST độc
-- lập, client tự gửi lại messages — xem lib/channels/gate.ts) nên không có
-- chỗ nào khác để giữ `cachedContents/xxxx` sống giữa hai lượt hỏi của cùng
-- một người.
--
-- Đã TRA THẬT (không đoán) qua source Google chính chủ (raw.githubusercontent.com
-- — ai.google.dev/cloud.google.com bị egress proxy chặn trong môi trường build
-- này): trần tối thiểu 2.048 token để tạo cache; TTL mặc định 60 phút; JSON
-- wire format là camelCase (`systemInstruction`, `ttl`, `model`); tham chiếu
-- lại qua field `cachedContent` (string = tên resource) trong generateContent.
--
-- Khoá theo `system_hash` — sha256(model|system text), CÙNG Ý TƯỞNG `lasoKey()`
-- (lib/portraits/cache.ts): system prompt của rail (extractLasoContext full=true)
-- ổn định trong CÙNG MỘT NGÀY cho cùng một lá số (chỉ đổi khi timeContext() sang
-- ngày mới) — nên cache tự nhiên hết hạn/tạo lại đúng nhịp ngày, khớp hệt cách
-- cache_control bên Anthropic đang vận hành (system TRỌN VẸN nằm trong MỘT
-- breakpoint, timeContext() nằm TRƯỚC breakpoint đó).
--
-- Race 2 request cùng tạo cache cho cùng lá số cùng lúc: chấp nhận — bản về
-- đích trước thắng (`resolution=ignore-duplicates`, giống portrait_cache),
-- bản thua vẫn có cache THẬT bên Google (không hỏng gì), chỉ hơi phí một dòng
-- token lưu trữ tới khi hết TTL — rẻ hơn nhiều so với việc chặn nhau bằng lock.
--
-- Không cron dọn `expires_at` đã qua — dòng cũ chỉ đơn thuần không được coi là
-- "còn dùng được" (lookup lọc `expires_at > now()`), không tốn gì thêm ngoài
-- vài KB một dòng. Dọn định kỳ là việc CÓ THỂ làm sau nếu bảng phình, không
-- chặn PR này.
create table if not exists public.gemini_cache_registry (
  id bigint generated always as identity primary key,
  system_hash text not null,
  model text not null,
  cache_name text not null,
  -- Token count THẬT do Google trả về lúc tạo cache — NULL nếu response
  -- không kèm usageMetadata (không đoán số để tính phí lưu trữ khi thiếu,
  -- xem lib/agent/providers/gemini-cache.ts).
  token_count integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create unique index if not exists gemini_cache_registry_hash_model_idx
  on public.gemini_cache_registry (system_hash, model);

create index if not exists gemini_cache_registry_expires_idx
  on public.gemini_cache_registry (expires_at);

-- Bảng thô, KHÔNG RPC (giống ai_crawler_hits): chỉ service role ghi. RLS bật +
-- không policy ⇒ khoá mặc định cho anon/authenticated.
alter table public.gemini_cache_registry enable row level security;

-- ── Kiểm sau khi chạy ────────────────────────────────────────────────────────
-- select count(*), count(*) filter (where expires_at > now()) as con_song
--   from gemini_cache_registry;
