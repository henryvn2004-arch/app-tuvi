-- ============================================================
-- migration-portrait-cache.sql
-- CACHE KẾT QUẢ 2 TOOL CHÂN DUNG THEO LÁ SỐ (vợ chồng · tiền kiếp)
--
-- Vì sao: mỗi lượt gen tốn ~$0.08–0.10 tiền model THẬT (ảnh gpt-image-1 +
-- 1–2 lượt LLM). Toàn bộ đầu vào của cả hai tool chỉ là LÁ SỐ (ngày/tháng/năm
-- + giờ sinh + giới tính + lịch âm-dương) — cùng lá số thì mọi thứ deterministic
-- phía engine (chức phận, nền văn minh, cung Phu Thê, hình thể) đều y hệt. Nên
-- chạy lại là trả tiền lần nữa cho đúng một kết quả.
--
-- Henry chốt 3 điều (2026-07-29), thiết kế dưới đây bám sát:
--   1. Cache DÙNG CHUNG TOÀN HỆ THỐNG — cùng lá số = cùng kết quả cho mọi
--      người. Ngoài tiền, cái được là NHẤT QUÁN: hai người bạn cùng ngày giờ
--      sinh mà ra hai nhân vật tiền kiếp khác nhau thì lộ ngay ra là máy bịa.
--   2. Ai ĐÃ trả cho lá số đó rồi thì xem lại MIỄN PHÍ; người chưa từng trả
--      vẫn trả đủ (mình không tốn tiền model → biên lợi nhuận lượt đó ~100%).
--   3. MỘT LÁ SỐ MỘT KẾT QUẢ — không có đường "vẽ lại". Thể hiện bằng
--      `ON CONFLICT DO NOTHING` khi ghi cache: bản ĐẦU TIÊN thắng vĩnh viễn.
--
-- Không đụng gì tới dữ liệu cũ: 2 bảng lịch sử chỉ thêm cột nullable.
-- ============================================================

-- ── 1. Kho cache ────────────────────────────────────────────
-- Vì sao bảng RIÊNG chứ không nhét vào 2 bảng lịch sử sẵn có:
--   · Bảng lịch sử là "ai đã sinh cái gì" (nhiều dòng/người, có user_id, RLS
--     đọc theo chủ sở hữu). Cache là "lá số này ra kết quả gì" (đúng 1 dòng,
--     không thuộc về ai). Trộn hai vai vào một bảng thì mọi truy vấn lịch sử
--     phải nhớ lọc thêm, sớm muộn cũng có chỗ quên.
--   · Tool tiền kiếp chạy HAI PHA SONG SONG (story ‖ image) — hai pha ghi hai
--     dòng khoá khác nhau nên không giẫm lên nhau. Nếu ghi chung một dòng lịch
--     sử thì hai request song song đua nhau ghi đè.
--   · `past_life_portraits` vốn KHÔNG lưu truyện (chỉ ảnh + chức phận + nền),
--     nên có muốn cache trong đó cũng không có chỗ chứa.
CREATE TABLE IF NOT EXISTS public.portrait_cache (
  tool_id    text        NOT NULL,          -- 'chan-dung-vo-chong' | 'chan-dung-tien-kiep'
  phase      text        NOT NULL,          -- 'main' | 'story' | 'image'
  laso_key   text        NOT NULL,          -- hash canonical của lá số (xem lib/portraits/cache.ts)
  -- Nguyên payload đã trả về cho người dùng ở lượt gen gốc, để lượt sau trả
  -- lại y hệt. Kèm `_row` = bộ cột cần ghi vào bảng lịch sử cho người dùng
  -- trúng cache (họ phải có dòng của riêng mình thì mục "Lịch sử" mới thấy).
  payload    jsonb       NOT NULL,
  created_by uuid,                          -- ai sinh ra bản gốc (chỉ để tra ngược)
  created_at timestamptz NOT NULL DEFAULT now(),
  hit_count  integer     NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  PRIMARY KEY (tool_id, phase, laso_key)
);

COMMENT ON TABLE public.portrait_cache IS
  'Kết quả 2 tool chân dung theo lá số, dùng chung toàn hệ thống. Bản đầu tiên thắng vĩnh viễn (một lá số một kết quả).';

-- RLS bật nhưng CỐ Ý KHÔNG có policy nào: chỉ service key (route API) chạm
-- được. Bảng này không có gì để client đọc trực tiếp — mọi đường vào đều phải
-- qua route, nơi có kiểm "người này đã trả tiền chưa".
ALTER TABLE public.portrait_cache ENABLE ROW LEVEL SECURITY;

-- ── 2. Khoá lá số trên 2 bảng lịch sử ───────────────────────
-- Dùng để trả lời ĐÚNG một câu: "người này đã từng trả tiền cho lá số này
-- chưa?" → có dòng ⇒ xem lại miễn phí. Dòng cũ (trước migration) để NULL,
-- nghĩa là những lượt Henry đã sinh trước đây sẽ không được nhận diện là "đã
-- trả" — chấp nhận được, và không bịa dữ liệu vì 2 bảng chưa từng lưu ngày sinh.
ALTER TABLE public.spouse_portraits    ADD COLUMN IF NOT EXISTS laso_key text;
ALTER TABLE public.past_life_portraits ADD COLUMN IF NOT EXISTS laso_key text;

CREATE INDEX IF NOT EXISTS idx_spouse_portraits_user_laso
  ON public.spouse_portraits (user_id, laso_key);
CREATE INDEX IF NOT EXISTS idx_past_life_portraits_user_laso
  ON public.past_life_portraits (user_id, laso_key);

-- ── 3. Đếm lượt trúng cache ─────────────────────────────────
-- RPC nhỏ thay vì PATCH từ route: cộng dồn phải ATOMIC, hai người cùng mở một
-- lá số nổi tiếng trong cùng một giây là chuyện bình thường. Đây cũng là chỗ
-- DUY NHẤT đo được cache có đang tiết kiệm tiền thật hay không.
CREATE OR REPLACE FUNCTION public.portrait_cache_touch(
  p_tool_id text, p_phase text, p_laso_key text
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.portrait_cache
     SET hit_count = hit_count + 1, last_hit_at = now()
   WHERE tool_id = p_tool_id AND phase = p_phase AND laso_key = p_laso_key;
$$;

REVOKE ALL ON FUNCTION public.portrait_cache_touch(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portrait_cache_touch(text, text, text) TO service_role;
