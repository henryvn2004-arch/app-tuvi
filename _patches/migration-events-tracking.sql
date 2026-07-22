-- migration-events-tracking.sql  (Marketing Sprint 0 — hạ tầng tracking)
-- ============================================================
-- Đo funnel marketing: traffic source → visit → signup → activated → paid → return.
--   • events: log hành vi APPEND-ONLY (page_view, tool_run, signup, topup...).
--     Mỗi hành động 1 dòng, kèm attribution phiên (utm/referrer) để bổ theo kênh.
--   • user_attribution: 1 dòng/user — first-touch + last-touch (UTM, referrer,
--     landing) + mốc signup. Snapshot lúc đăng nhập lần đầu (server /api/track).
--
-- GHI: chỉ server /api/track bằng service key (bypass RLS).
-- ĐỌC: chỉ admin JWT (email = admin@tuviminhbao.com) — client thường KHÔNG đọc.
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

-- ── EVENTS (append-only) ──
create table if not exists public.events (
  id           bigint generated always as identity primary key,
  ts           timestamptz not null default now(),
  event_type   text not null,
  anon_id      text,
  user_id      uuid,
  session_id   text,
  platform     text default 'web',
  tool_id      text,
  slug         text,
  path         text,
  referrer     text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  meta         jsonb
);

create index if not exists events_ts_idx      on public.events(ts desc);
create index if not exists events_type_ts_idx on public.events(event_type, ts desc);
create index if not exists events_user_idx    on public.events(user_id, ts desc);
create index if not exists events_anon_idx    on public.events(anon_id, ts desc);
create index if not exists events_utmsrc_idx  on public.events(utm_source, ts desc);

alter table public.events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='events' and policyname='events_admin_read') then
    create policy events_admin_read on public.events for select
      using ((auth.jwt()->>'email') = 'admin@tuviminhbao.com');
  end if;
end $$;

-- ── USER ATTRIBUTION (first + last touch) ──
create table if not exists public.user_attribution (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  anon_id            text,
  first_utm_source   text,
  first_utm_medium   text,
  first_utm_campaign text,
  first_utm_term     text,
  first_utm_content  text,
  first_referrer     text,
  first_landing_path text,
  first_seen_at      timestamptz,
  last_utm_source    text,
  last_utm_medium    text,
  last_utm_campaign  text,
  last_referrer      text,
  last_landing_path  text,
  signup_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists user_attribution_src_idx  on public.user_attribution(first_utm_source);
create index if not exists user_attribution_anon_idx on public.user_attribution(anon_id);

alter table public.user_attribution enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_attribution' and policyname='user_attribution_admin_read') then
    create policy user_attribution_admin_read on public.user_attribution for select
      using ((auth.jwt()->>'email') = 'admin@tuviminhbao.com');
  end if;
end $$;
