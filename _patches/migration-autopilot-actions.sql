-- migration-autopilot-actions.sql  (M0.6, track "Marketing Autopilot + CMO
-- Orchestrator Quân Sư" — autopilot THỰC THI THẬT: tự chỉnh giá/khuyến mãi/
-- nhắc segment. RỦI RO CAO nên bảng này là NHẬT KÝ DUY NHẤT mọi hành động
-- autopilot từng tính/từng làm — dùng để (a) hiện panel admin, (b) cooldown
-- giữa các lần cron (không lặp lại hành động cùng loại/target quá gần nhau).
-- ============================================================
-- mode: 'shadow' = chỉ TÍNH TOÁN + LOG, KHÔNG áp dụng thật (mặc định khi
--   app_config['marketing.autopilot_enabled'] != true). 'live' = đã áp dụng
--   thật (update tool_pricing / cấp credit / gửi tin nhắn).
-- action_type: 'price_adjust' | 'promo_grant' | 'segment_nudge'.
-- target: tool_id (price_adjust) hoặc user_id (promo_grant/segment_nudge).
-- RLS: ghi qua service key (cron routes), đọc chỉ admin JWT — giống pattern
-- events/user_attribution (migration-events-tracking.sql).
-- Idempotent. Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

create table if not exists public.autopilot_actions (
  id          uuid primary key default gen_random_uuid(),
  ts          timestamptz not null default now(),
  action_type text not null,
  mode        text not null check (mode in ('shadow', 'live')),
  target      text,
  before      jsonb,
  after       jsonb,
  reason      text,
  meta        jsonb
);

create index if not exists idx_autopilot_actions_ts on public.autopilot_actions (ts desc);
create index if not exists idx_autopilot_actions_type_target on public.autopilot_actions (action_type, target, ts desc);

alter table public.autopilot_actions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'autopilot_actions' and policyname = 'autopilot_actions_admin_read'
  ) then
    create policy autopilot_actions_admin_read on public.autopilot_actions for select
      using ((auth.jwt() ->> 'email') = 'admin@tuviminhbao.com');
  end if;
end $$;
