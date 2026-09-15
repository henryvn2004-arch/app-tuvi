-- ============================================================
-- BẬC 1 — docs/GROWTH-DATA-PLAN.md — kho snapshot nguồn ngoài (GA4/GSC/
-- Clarity/Meta Ads/Google Ads), thay Windsor.ai.
--
-- Cùng khuôn với `content_metrics` (migration-content-metrics.sql): snapshot
-- THEO NGÀY, khoá chính chặn ghi trùng khi cron chạy lại trong cùng ngày.
-- KHÔNG suy hiệu số tự động — cost/sessions của source quảng cáo là số CỦA
-- NGÀY ĐÓ (khác `content_metrics` là số LUỸ KẾ).
--
-- `source` hiện dùng ở bậc 1: 'ga4' (traffic theo source/medium) ·
-- 'ga4_ads' (campaign Google Ads, join qua GA4 — chỉ có số khi link GA4↔Ads
-- đã bật ở GA4 Admin, xem docs/GROWTH-DATA-PLAN.md §3 bậc 0) · 'gsc'.
-- 'clarity' / 'meta_ads' để dành cho bậc 2/3, CHƯA có cron ghi.
--
-- `entity`: '_total' cho dòng tổng của nguồn đó; nếu không thì là khoá thật
-- (source/medium, campaign id, url…) — LUÔN hiện rõ, dòng không nối được
-- vào phễu nội bộ ở tầng sau phải giữ nguyên entity gốc, KHÔNG âm thầm gộp
-- vào '_total'.
create table if not exists public.ext_metrics_daily (
  source     text        not null,
  entity     text        not null,
  stat_date  date        not null,
  -- Số: {sessions, users, cost_native, cost_vnd, clicks, impressions, ctr, position, ...}
  -- tuỳ theo `source`. Đọc field nào phải biết field đó thuộc source nào —
  -- xem lib/growth/collect-ext-metrics.ts để biết source nào ghi field gì.
  metrics    jsonb       not null default '{}'::jsonb,
  -- Chiều mô tả entity: {source_medium}/{campaign_name, campaign_id}/{url}...
  dims       jsonb       not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (source, entity, stat_date)
);

create index if not exists ext_metrics_daily_date_idx on public.ext_metrics_daily (stat_date desc);
create index if not exists ext_metrics_daily_source_date_idx on public.ext_metrics_daily (source, stat_date desc);

-- Bảng nội bộ, đọc/ghi qua service key (route cron + engine đọc sau này) —
-- bật RLS không policy nào = chặn anon/authenticated, service_role vẫn bypass
-- RLS theo mặc định Supabase. Đúng khuôn `migration-content-metrics.sql`.
alter table public.ext_metrics_daily enable row level security;
