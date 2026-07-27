-- ============================================================================
-- S1/S2 (track COO) — RPC đọc sức khoẻ tool cho panel Vận Hành trong admin
-- ============================================================================
-- Đọc `events` (event_type='tool_outcome') do lib/ops/tool-outcome.ts ghi.
-- Cùng khuôn `channel_error_rate` (D2) đang nuôi panel "Sức Khỏe Kênh Chat".
--
-- MẪU SỐ CỦA TỶ LỆ LỖI — chỗ dễ làm sai nhất:
-- lỗi NGƯỜI DÙNG (nhập thiếu ngày sinh, chưa đăng nhập, chưa thanh toán) bị
-- loại khỏi CẢ tử số LẪN mẫu số. Tỷ lệ trả về là "trong những lượt LẼ RA phải
-- chạy được, bao nhiêu phần trăm hỏng". Nếu để lỗi người dùng trong mẫu số thì
-- một tool đang hỏng 100% nhưng có nhiều lượt nhập sai sẽ hiện ra tỷ lệ lỗi
-- thấp giả tạo, và ngược lại tool lành mà nhiều người nhập sai sẽ trông như
-- đang cháy.
-- ============================================================================

create or replace function public.tool_health(p_hours int default 24)
returns table(
  tool_id       text,
  total         bigint,   -- tổng lượt ghi nhận
  user_errors   bigint,   -- lỗi phía người dùng (KHÔNG phải sự cố)
  attempts      bigint,   -- lượt lẽ ra phải chạy được = total - user_errors
  errors        bigint,   -- lỗi HỆ THỐNG
  error_rate    numeric,  -- errors / attempts * 100
  p95_ms        integer,
  last_error    text,
  last_error_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with e as (
    select
      coalesce(nullif(tool_id, ''), '(không rõ)') as tool_id,
      (meta->>'ok') = 'true'          as ok,
      (meta->>'user_fault') = 'true'  as user_fault,
      nullif(meta->>'duration_ms', '')::numeric as dur,
      meta->>'detail'                 as detail,
      ts
    from events
    where event_type = 'tool_outcome'
      and ts >= now() - (p_hours || ' hours')::interval
  )
  select
    e.tool_id,
    count(*)::bigint                                            as total,
    count(*) filter (where e.user_fault)::bigint                as user_errors,
    count(*) filter (where not e.user_fault)::bigint            as attempts,
    count(*) filter (where not e.ok and not e.user_fault)::bigint as errors,
    case
      when count(*) filter (where not e.user_fault) > 0
      then round(
        count(*) filter (where not e.ok and not e.user_fault)::numeric
        / count(*) filter (where not e.user_fault) * 100, 1)
      else 0
    end                                                          as error_rate,
    coalesce(
      percentile_cont(0.95) within group (order by e.dur)
      filter (where e.dur is not null), 0)::integer              as p95_ms,
    (array_remove(array_agg(e.detail order by e.ts desc)
       filter (where not e.ok and not e.user_fault), null))[1]   as last_error,
    max(e.ts) filter (where not e.ok and not e.user_fault)       as last_error_at
  from e
  group by e.tool_id
  order by errors desc, total desc;
$$;

-- ── PHÂN QUYỀN — phải revoke CẢ BA, không thiếu cái nào ────────────────────
--
-- Trong dự án này, hàm mới bị hở cho client qua HAI đường KHÁC NHAU:
--
--   1. PUBLIC — Postgres mặc định cấp EXECUTE cho PUBLIC với mọi hàm mới.
--      Đây là đường đã làm hở add_credits/deduct_credits (ACL "=X/postgres",
--      grantee rỗng). Xem _patches/migration-revoke-credit-rpc.sql.
--
--   2. anon + authenticated — schema `public` của Supabase có sẵn
--      ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO anon,
--      authenticated, service_role (kiểm bằng `select * from pg_default_acl`
--      → objtype='f'). Nên hàm mới nhận grant RIÊNG cho hai role đó, và
--      `revoke ... from public` KHÔNG gỡ được.
--
-- Tự dính đúng bẫy này lúc tạo hàm: chỉ revoke PUBLIC, kiểm lại thấy
-- has_function_privilege('anon', ...) VẪN true. Phải revoke đủ ba mới sạch.
--
-- ⚠️ Đây là CĂN NGUYÊN HỆ THỐNG của 23 hàm SECURITY DEFINER đang hở cho anon
-- (đếm ở S0), không phải sự cẩu thả từng hàm. Vá tận gốc là đổi chính
-- ALTER DEFAULT PRIVILEGES để hàm mới mặc định an toàn — nhưng việc đó ảnh
-- hưởng mọi hàm CÓ CHỦ ĐÍCH cho client gọi, nên phải rà từng cái: để sprint
-- S6 (rà bảo mật định kỳ), không làm lén ở đây.
revoke execute on function public.tool_health(int) from public, anon, authenticated;
grant  execute on function public.tool_health(int) to service_role;

-- ĐÃ CHẠY PROD 2026-07-27 qua Supabase MCP. Kiểm chứng:
--   proacl = {postgres=X/postgres, service_role=X/postgres}
--   anon=false · authenticated=false · service_role=true
