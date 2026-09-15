-- migration-marketing-insights.sql
-- ============================================================
-- Bậc 5 (Tầng 4 — Phán đoán) của docs/GROWTH-DATA-PLAN.md. Bảng findings
-- có bằng chứng, đọc bởi lib/growth/findings.ts (viết) và cmo-digest /
-- anomaly-alerts / marketing orchestrator tương lai (đọc, chỉ IMPORT thẳng
-- trong code — KHÔNG qua API mới, xem §2 của plan).
--
-- primary key (run_date, finding_key) — cron chạy lại trong ngày (thủ công
-- hoặc retry) UPSERT đè đúng dòng, không đẻ trùng, giống khuôn
-- `ext_metrics_daily`/`content_metrics` đã có.
--
-- 🔴 An toàn (đúng §8 của plan): bảng này CHỈ CHỨA ĐỀ XUẤT
-- (`suggested_action`), không có cột nào để ai đó (kể cả orchestrator sau
-- này) THI HÀNH trực tiếp — mọi hành động chạm tiền/khách vẫn phải qua
-- `autopilot_actions` với công tắc + shadow-mode đã có (lib/marketing/autopilot.ts).
--
-- Cùng khuôn RLS với `ext_metrics_daily`: bật RLS, KHÔNG policy nào — chỉ
-- service_role (bypass RLS) đọc/ghi được, giống mọi bảng "chỉ Vercel cron +
-- admin backend chạm" khác trong repo.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create table if not exists public.marketing_insights (
  run_date         date not null,
  finding_key      text not null,      -- 'campaign_zero_conversion:24193406379'
  severity         text not null,      -- info | watch | act
  confidence       text not null,      -- solid | thin_sample | no_data
  headline         text not null,      -- 1 câu tiếng Việt, số đã chốt (LLM chỉ đọc lại, không tính)
  metrics          jsonb not null default '{}'::jsonb,  -- số KÈM mẫu số n
  evidence         jsonb not null default '{}'::jsonb,  -- nguồn + khoảng ngày + n
  suggested_action text,               -- vocabulary AutopilotActionType + 'pause_campaign'|'shift_budget'
  created_at       timestamptz not null default now(),
  primary key (run_date, finding_key)
);

create index if not exists marketing_insights_run_date_idx on public.marketing_insights(run_date desc);
create index if not exists marketing_insights_severity_idx on public.marketing_insights(run_date desc, severity);

alter table public.marketing_insights enable row level security;
