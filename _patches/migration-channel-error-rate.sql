-- migration-channel-error-rate.sql  (Dashboard v2 — Sức Khỏe Kênh)
-- ============================================================
-- Log MỖI lượt hội thoại (thành công lẫn lỗi) vào events (event_type='bot_reply',
-- meta={ok,reason}) — ghi ở lib/channels/store.ts chatLogOutcome(), gọi từ
-- lib/channels/core.ts runConversation() (onOutcome callback, best-effort,
-- KHÔNG chặn trả lời) cho telegram/messenger/whatsapp + trực tiếp trong
-- app/api/v1/chat/route.ts cho web. KHÔNG dùng chat_usage làm mẫu số — bảng
-- đó chỉ đếm free-tier (user đã link ví không qua đó) → thiếu số.
--   • channel_error_rate(hours): total/errors/error_rate% mỗi kênh trong
--     cửa sổ giờ gần nhất. Luôn trả đủ 4 kênh (kể cả 0 lượt) để UI có card.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create or replace function public.channel_error_rate(p_hours int default 24)
returns table(platform text, total bigint, errors bigint, error_rate numeric)
language sql
security definer
set search_path = public
as $$
  with plats(platform) as (
    values ('telegram'), ('web'), ('messenger'), ('whatsapp')
  ),
  agg as (
    select platform,
      count(*) as total,
      count(*) filter (where (meta->>'ok') = 'false') as errors
    from events
    where event_type = 'bot_reply' and ts >= now() - (p_hours || ' hours')::interval
    group by platform
  )
  select
    p.platform,
    coalesce(a.total, 0)::bigint as total,
    coalesce(a.errors, 0)::bigint as errors,
    case when coalesce(a.total, 0) > 0
      then round(coalesce(a.errors, 0)::numeric / a.total * 100, 1)
      else 0
    end as error_rate
  from plats p
  left join agg a using (platform)
  order by p.platform;
$$;

grant execute on function public.channel_error_rate(int) to service_role;
