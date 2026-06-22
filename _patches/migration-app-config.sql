-- _patches/migration-app-config.sql
-- ============================================================
-- Sprint 0.3 — bảng cấu hình runtime cho agent chat.
-- Chỉnh prompt / model / giá Lượng ở ĐÂY, không cần deploy lại.
-- Đọc bởi lib/config/appConfig.ts (cache TTL 60s).
-- Chạy 1 lần trong Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  note       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: chỉ service_role đọc/ghi (route server dùng service key).
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Seed giá trị mặc định (khớp DEFAULTS trong appConfig.ts).
-- value là JSONB: chuỗi để trong nháy kép, số để trần.
INSERT INTO app_config (key, value, note) VALUES
  ('chat.system_prompt',
   to_jsonb(''::text),
   'Override prompt — để TRỐNG = dùng template chung lib/agent/prompts; điền để ghi đè không cần deploy'),
  ('chat.model',       to_jsonb('claude-sonnet-4-6'::text), 'Model Anthropic'),
  ('chat.max_rounds',  to_jsonb(4),    'Số vòng tool-use tối đa'),
  ('chat.max_tokens',  to_jsonb(1500), 'max_tokens mỗi lượt'),
  ('chat.cost',        to_jsonb(5),    'Giá Lượng trừ cho 1 lượt trả lời (0 = miễn phí)')
ON CONFLICT (key) DO NOTHING;
