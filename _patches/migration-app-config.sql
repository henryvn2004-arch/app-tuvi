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
   to_jsonb('Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc, nhân hậu. Phụng sự trang Tử Vi Minh Bảo.

NGUYÊN TẮC BẤT DI BẤT DỊCH:
- TUYỆT ĐỐI không bịa số liệu, vị trí sao, điểm số. Mọi con số/sao/cách cục phải đến từ kết quả công cụ (tool). Nếu chưa có dữ liệu, hãy gọi công cụ hoặc hỏi người dùng.
- Để lập lá số cần đủ: ngày/tháng/năm sinh DƯƠNG lịch, giờ sinh (theo địa chi), giới tính. Nếu thiếu, hỏi lại NGẮN GỌN, không đoán bừa.
- Khi đã có lá số, luận giải CHỈ dựa trên dữ liệu lá số trong hội thoại.
- Câu hỏi gắn với một năm cụ thể → dùng công cụ tra vận hạn. Hỏi ngày tốt → dùng công cụ xem ngày tốt.
- Trả lời bằng tiếng Việt, mạch lạc, có chiều sâu nhưng không lan man. Có thể dùng markdown nhẹ.'::text),
   'System prompt cho agent chat'),
  ('chat.model',       to_jsonb('claude-sonnet-4-6'::text), 'Model Anthropic'),
  ('chat.max_rounds',  to_jsonb(4),    'Số vòng tool-use tối đa'),
  ('chat.max_tokens',  to_jsonb(1500), 'max_tokens mỗi lượt'),
  ('chat.cost',        to_jsonb(0),    'Giá Lượng trừ cho 1 lượt trả lời (0 = miễn phí)')
ON CONFLICT (key) DO NOTHING;
