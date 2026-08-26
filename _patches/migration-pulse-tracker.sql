-- ============================================================
-- migration-pulse-tracker.sql  (Tracker "đang online" trên shell)
--
-- RPC pulse_stats() → { online, prompts_today } cho ô tracker hiện ngay trên
-- thanh tìm công cụ ở sidebar `/app` (public/shell.js renderSidebar()).
--
-- SỐ THẬT, không mô phỏng — đúng luật "Giá Lượng: KHÔNG bịa số" áp rộng ra
-- cho MỌI con số hiện cho người dùng thấy, không riêng gì giá:
--   online        = số anon_id RIÊNG BIỆT có event trong 5 phút gần nhất
--                    (bảng events, MỌI event_type — kể cả bot, xem ghi chú dưới).
--   prompts_today = số dòng event_type='llm_usage' hôm nay theo giờ VN
--                    (mỗi dòng = một lượt gọi model thật, ghi bởi
--                    lib/agent/usage.ts logLlmUsage/logImageUsage).
--
-- CỐ Ý CHƯA lọc bot (khác che GIÁ TRỊ CÓ TIỀN mà `looksLikeBot` trong
-- app/api/track/route.ts đã lọc cho `traffic_quality()`): Henry chốt 2026-08-26
-- "trước mắt tính cả bot cho xôm tụ, có traffic thật rồi lọc sau" — số hiển thị
-- ở đây KHÔNG dùng để tính tiền/margin nên chấp nhận nới tạm. Muốn lọc sau chỉ
-- cần thêm `AND NOT is_bot` (cột boolean có sẵn trên `events`, xem
-- migration-traffic-quality.sql) rồi CREATE OR REPLACE lại hàm này — không cần deploy.
--
-- Không tạo bảng mới — đọc thẳng bảng `events` đã có (migration-events-tracking.sql).
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.pulse_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT json_build_object(
    'online', (
      SELECT count(DISTINCT anon_id)
        FROM public.events
       WHERE ts >= now() - interval '5 minutes'
         AND anon_id IS NOT NULL
    ),
    'prompts_today', (
      SELECT count(*)
        FROM public.events
       WHERE event_type = 'llm_usage'
         AND ts >= date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'
    )
  );
$$;

-- SECURITY DEFINER mới luôn sinh hở mặc định (EXECUTE cho PUBLIC là dựng sẵn
-- của Postgres) — thu hẹp lại: chỉ service key (route API) gọi được, không
-- cho client gọi RPC thẳng qua PostgREST.
REVOKE ALL ON FUNCTION public.pulse_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pulse_stats() TO service_role;
