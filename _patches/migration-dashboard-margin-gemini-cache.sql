-- migration-dashboard-margin-gemini-cache.sql
-- ============================================================
-- `dashboard_margin.chat_cost_vnd` phải cộng CẢ phí cache tường minh Gemini.
--
-- Rail chat có HAI dòng chi phí trong `events` (event_type='llm_usage'):
--   · tool_id='chat'         — mỗi lời gọi model (input/cache-read/output)
--   · tool_id='gemini-cache' — phí LƯU cache `cachedContents`, ghi một lần lúc
--                              tạo (`logGeminiCacheStorage`, lib/agent/usage.ts).
-- Cache này CHỈ phục vụ rail chat (`getOrCreateGeminiCache` chỉ được gọi từ
-- lib/agent/providers/gemini.ts), nhưng bản cũ chỉ cộng `tool_id='chat'`.
-- Đo 23–25/09/2026 (sau bản vá sổ token #chunk): chat 3.415đ + cache 4.979đ
-- cho 36 lượt ⇒ bản cũ bỏ sót ~59% giá vốn chat, báo biên LN cao hơn thật.
-- `autopilot-price.ts` và `anomaly-alerts.ts` đều đọc `chat_cost_vnd`.
--
-- Thân hàm lấy NGUYÊN VĂN bản đang chạy trên prod (pg_get_functiondef,
-- 2026-09-26) — bản đó có khoá `vnd_per_credit` mà KHÔNG file nào trong
-- _patches/ còn chứa (migration-pricing-v2.sql là bản cũ hơn). File này là
-- nguồn mới nhất của hàm; chạy lại pricing-v2.sql sau file này là hồi quy.
-- Chỉ đổi DUY NHẤT điều kiện tool_id của `chat_cost_vnd`. Giữ nguyên chữ ký
-- (đổi chữ ký là tạo overload thứ hai, không thay bản cũ).
--
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- Chạy xong ĐỌC NGƯỢC lại bằng pg_get_functiondef trước khi báo xong.
-- ============================================================

create or replace function public.dashboard_margin(p_from timestamp with time zone, p_to timestamp with time zone)
returns json
language sql
security definer
set search_path = public, pg_temp
as $function$
  select json_build_object(
    'chat_cost_vnd', (
      select coalesce(sum((meta->>'cost_vnd')::numeric), 0)
      from events
      where event_type = 'llm_usage' and tool_id in ('chat', 'gemini-cache') and ts >= p_from and ts < p_to
    ),
    'chat_revenue_vnd', (
      select coalesce(sum(-amount), 0) * credit_vnd()
      from credit_transactions
      where type = 'chat' and amount < 0 and created_at >= p_from and created_at < p_to
    ),
    'vnd_per_credit', credit_vnd(),
    'by_tool', (
      select coalesce(json_agg(t order by t.cost_vnd desc), '[]'::json) from (
        select tool_id, count(*)::bigint as requests, sum((meta->>'cost_vnd')::numeric)::bigint as cost_vnd
        from events
        where event_type = 'llm_usage' and ts >= p_from and ts < p_to
        group by tool_id
      ) t
    )
  );
$function$;

revoke all on function public.dashboard_margin(timestamp with time zone, timestamp with time zone) from public, anon, authenticated;
grant execute on function public.dashboard_margin(timestamp with time zone, timestamp with time zone) to service_role;
