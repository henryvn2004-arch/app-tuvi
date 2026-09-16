-- migration-tool-viewcount.sql
-- ============================================================
-- "Bằng chứng xã hội cạnh nút mua" — số người ĐÃ MỞ trang tool trong 30 ngày
-- qua, dùng cho badge công khai "N người đã xem tháng này" (public/tools-
-- shared/tool-popularity.js). Số THẬT, không bịa:
--   - event_type = 'tool_open' (đúng "mở trang tool", KHÔNG dùng 'page_view'
--     — event đó bắn cho MỌI trang, không tách được theo tool_id).
--   - `tool_canon()` (đã có, migration-tool-funnel.sql) quy tool_id về ĐÚNG
--     id trong tool_pricing — cùng lỗi 3-hệ-tên mà tool_funnel() đã né.
--   - distinct theo coalesce(user_id, anon_id) — không đếm trùng refresh.
--   - `coalesce(is_bot, false) = false` — ĐÚNG luật "_human" (CLAUDE.md
--     "Traffic: luôn dùng bản _human"). tool_funnel() KHÔNG lọc is_bot (đo
--     phễu tổng hợp cho admin, khác ngữ cảnh) — hàm NÀY áp lọc riêng vì kết
--     quả hiện thẳng ra công khai cho khách, sai một ly là nói dối khách.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_tool_viewcount(p_tool_id text, p_days int DEFAULT 30)
RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT count(DISTINCT coalesce(user_id::text, anon_id))::int
    FROM events
   WHERE event_type = 'tool_open'
     AND ts >= now() - (p_days || ' days')::interval
     AND coalesce(is_bot, false) = false
     AND tool_id IS NOT NULL
     AND tool_canon(tool_id) = tool_canon(p_tool_id);
$$;

REVOKE ALL ON FUNCTION public.dashboard_tool_viewcount(text, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_tool_viewcount(text, int) TO service_role;

COMMIT;
