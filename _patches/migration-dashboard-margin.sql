-- migration-dashboard-margin.sql  (Dashboard v2 — Biên Lợi Nhuận Theo Tool)
-- ============================================================
-- Log chi phí LLM (`lib/agent/usage.ts` logLlmUsage, gọi cuối `runAgent` trong
-- `lib/agent/run.ts` — best-effort, không chặn trả lời) vào `events`
-- (event_type='llm_usage', tool_id=<scenario.type|'chat'>, meta={model,
-- input_tokens,cache_creation_input_tokens,cache_read_input_tokens,
-- output_tokens,cost_vnd}). CHỈ theo dõi lượt qua Anthropic (Gemini route
-- riêng — khác cấu trúc giá, chưa có số, bỏ qua có chủ đích).
--
-- 'chat' là type DUY NHẤT mà /api/v1/chat + lib/channels/gate.ts ghi vào
-- credit_transactions cho MỌI lượt rail thật (kể cả có lá số) — nên bucket
-- cost 'chat' khớp thẳng bucket doanh thu thật để tính biên LN. Các bucket
-- theo scenario.type (tu-binh, xem-tuoi...) CHƯA có doanh thu tách riêng ở
-- tầng billing hiện tại (rail bill phẳng) → chỉ show cost, không suy margin.
-- LƯU Ý: "doanh thu" ở đây = Lượng ĐÃ TIÊU (type=chat, amount<0) quy đổi
-- ×2.500đ — CÙNG quy ước "revenue" đã dùng ở Tools Registry (spendCredits),
-- KHÔNG phải tiền mặt thật đổ vào lúc đó (amount_vnd chỉ có ở giao dịch
-- topup, không liên quan) — Lượng user tiêu ra từ số dư đã nạp trước đó.
--   • dashboard_margin(from,to) → JSON {chat_cost_vnd, chat_revenue_vnd,
--     chat_margin_pct, by_tool:[{tool_id,requests,cost_vnd}]}.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create or replace function public.dashboard_margin(p_from timestamptz, p_to timestamptz)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'chat_cost_vnd', (
      select coalesce(sum((meta->>'cost_vnd')::numeric), 0)
      from events
      where event_type = 'llm_usage' and tool_id = 'chat' and ts >= p_from and ts < p_to
    ),
    'chat_revenue_vnd', (
      select coalesce(sum(-amount), 0) * 2500
      from credit_transactions
      where type = 'chat' and amount < 0 and created_at >= p_from and created_at < p_to
    ),
    'by_tool', (
      select coalesce(json_agg(t order by t.cost_vnd desc), '[]'::json) from (
        select tool_id, count(*)::bigint as requests, sum((meta->>'cost_vnd')::numeric)::bigint as cost_vnd
        from events
        where event_type = 'llm_usage' and ts >= p_from and ts < p_to
        group by tool_id
      ) t
    )
  );
$$;

grant execute on function public.dashboard_margin(timestamptz, timestamptz) to service_role;
