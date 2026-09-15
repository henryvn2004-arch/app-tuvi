-- migration-cross-sell-candidates.sql
-- ============================================================
-- RPC cho email cross-sell (lib/marketing/email-cross-sell.ts): user đã dùng
-- tool A (event_type='tool_run') nhưng CHƯA từng dùng tool B — gợi ý B qua
-- email, gửi ĐÚNG MỘT LẦN cho mỗi cặp (dedupe ở lib/email/send.ts, không cần
-- cooldown lặp lại ở RPC này).
--
-- Index mới: (tool_id, event_type) — truy vấn lọc theo tool_id TRƯỚC (mỗi cặp
-- chỉ ~vài % tổng số dòng events), events_type_ts_idx sẵn có không phủ được
-- vế tool_id nên full scan theo event_type là chưa đủ.
-- ============================================================

create index if not exists events_tool_type_idx on public.events(tool_id, event_type);

create or replace function public.cross_sell_candidates(p_tool_from text, p_tool_to text, p_limit int default 50)
returns table(user_id uuid, email text, from_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select u.id, u.email, f.cnt
  from (
    select e.user_id, count(*) as cnt
    from events e
    where e.event_type = 'tool_run' and e.tool_id = p_tool_from and e.user_id is not null
    group by e.user_id
  ) f
  join auth.users u on u.id = f.user_id
  where not exists (
    select 1 from events e2
    where e2.event_type = 'tool_run' and e2.tool_id = p_tool_to and e2.user_id = f.user_id
  )
  order by f.cnt desc
  limit p_limit;
$$;

revoke all on function public.cross_sell_candidates(text, text, int) from public, anon, authenticated;
grant execute on function public.cross_sell_candidates(text, text, int) to service_role;
