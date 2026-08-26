-- migration-js-error.sql (Dashboard v2 — Lỗi JS Client, thay Sentry ở tầng client)
-- ============================================================
-- track.js bắt window.onerror + unhandledrejection, gửi event_type='js_error'
-- qua /api/track (meta jsonb = {kind,message,src,line,col,stack}); đã lọc nhiễu
-- (ResizeObserver/extension/cross-origin "Script error.") + trần 8 lỗi/lượt
-- tải trang + gộp lỗi lặp y hệt ở PHÍA CLIENT trước khi gửi. RPC này GOM lại
-- theo (message, path, kind) để admin đọc được "lỗi nào đang lặp, ở đâu" thay
-- vì cuộn qua từng dòng thô.
--   • js_error_top(hours, limit): top lỗi theo số lượt, cửa sổ giờ gần nhất.
--     Lọc is_bot=false (khớp index idx_events_real_ts đã có, không quét thừa
--     dòng bot UA tự khai — chúng hiếm khi chạy đủ JS để văng lỗi thật).
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create or replace function public.js_error_top(p_hours int default 24, p_limit int default 30)
returns table(
  message text,
  path text,
  kind text,
  occurrences bigint,
  users bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(meta->>'message', '(không có thông điệp)') as message,
    coalesce(path, '(không rõ trang)') as path,
    coalesce(meta->>'kind', 'error') as kind,
    count(*) as occurrences,
    count(distinct coalesce(anon_id, user_id::text)) as users,
    min(ts) as first_seen,
    max(ts) as last_seen
  from events
  where event_type = 'js_error'
    and is_bot = false
    and ts >= now() - (p_hours || ' hours')::interval
  group by 1, 2, 3
  order by occurrences desc
  limit p_limit;
$$;

-- `grant ... to service_role` KHÔNG tự gỡ quyền PUBLIC — Postgres cấp EXECUTE
-- cho PUBLIC ngay lúc CREATE FUNCTION, và grant thêm chỉ CỘNG chứ không THAY.
-- Thiếu dòng revoke này thì anon/authenticated vẫn gọi được hàm qua
-- /rest/v1/rpc/js_error_top — đúng lớp lỗi đã cắn `marketing_signup_truth` và
-- `anon_rail_*`. Đã vá trực tiếp trên prod (2026-08-19); dòng này để lần chạy
-- lại migration không tái mở lỗ hổng.
revoke execute on function public.js_error_top(int, int) from public, anon, authenticated;
grant execute on function public.js_error_top(int, int) to service_role;
