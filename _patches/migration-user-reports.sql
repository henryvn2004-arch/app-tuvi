-- Đợt 2 (2026-09-25): bảng user_reports — CACHE HIỂN THỊ cho tab "Tủ Báo Cáo"
-- (danh sách report user đã có/có thể gen theo TỪNG lá số họ đã nhập).
--
-- ⚠️ KHÔNG PHẢI CỔNG THANH TOÁN. Cổng thật vẫn là hasSlugAccess/
-- hasAnySlugAccess/userOwnsLaso (lib/billing/credits.ts, lib/portraits/cache.ts)
-- — dòng ở đây thiếu/lỗi chỉ làm tab liệt kê thiếu một report, không mở khoá
-- nhầm thứ gì. Lý do tách riêng thay vì SELECT DISTINCT trực tiếp trên
-- credit_transactions + 7 bảng HISTORY_TABLE mỗi lần user mở tab: hai họ
-- nguồn có type/slug KHÔNG đồng nhất (laso dùng slug không tiền tố — ngoại lệ
-- legacy cố ý — 3 tool kia có Date.now() không tái dùng được), dựng lại logic
-- đó ở tầng đọc là trùng lặp và dễ lệch theo thời gian; ghi một lần lúc TẠO
-- report rẻ và ổn định hơn.
--
-- Nguồn ghi (CỬA DUY NHẤT: lib/reports/userReports.ts::recordUserReport):
--   - 7 tool "chân dung" (HISTORY_TABLE) → hook trong insertHistoryRow()
--   - 4 tool slug tất định (laso/tu-binh/chu-trinh-cuoc-doi/van-han-nam) →
--     hook trong handleDeduct() ngay sau logTransaction() thành công
-- Backfill bên dưới phủ dữ liệu ĐÃ CÓ trước khi hai hook trên tồn tại.

create table if not exists public.user_reports (
  user_id     uuid not null,
  tool_id     text not null,
  report_key  text not null,
  status      text not null default 'ready',
  slug        text,
  source      text not null default 'app',
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, tool_id, report_key)
);

create index if not exists user_reports_user_id_idx on public.user_reports (user_id, created_at desc);

alter table public.user_reports enable row level security;

drop policy if exists "user_reports_select" on public.user_reports;
create policy "user_reports_select" on public.user_reports
  for select using (auth.uid() = user_id);

-- Ghi CHỈ qua service_role (giống mẫu vừa vá cho credit_transactions) — client
-- không có đường ghi trực tiếp, mọi dòng đi qua recordUserReport() ở server.
revoke insert, update, delete, truncate on public.user_reports from anon, authenticated;

-- ── Backfill 1: 4 tool slug tất định qua credit_transactions ──
-- Chỉ nhận dòng amount<0 (lượt TRỪ tiền thật, không phải hoàn tiền/thưởng) và
-- có slug (một số dòng cũ ghi thiếu slug — bỏ qua, không đoán).
insert into public.user_reports (user_id, tool_id, report_key, slug, source, created_at, updated_at)
select
  ct.user_id,
  case ct.type
    when 'use_laso'                 then 'laso'
    when 'use_tubinh'                then 'tu-binh'
    when 'use_chu_trinh_cuoc_doi'    then 'chu-trinh-cuoc-doi'
    when 'use_van_han_nam'           then 'van-han-nam'
  end as tool_id,
  ct.slug as report_key,
  ct.slug,
  'backfill',
  min(ct.created_at),
  min(ct.created_at)
from public.credit_transactions ct
where ct.type in ('use_laso', 'use_tubinh', 'use_chu_trinh_cuoc_doi', 'use_van_han_nam')
  and ct.amount < 0
  and ct.slug is not null and ct.slug <> ''
  and ct.user_id is not null
group by ct.user_id, ct.type, ct.slug
on conflict (user_id, tool_id, report_key) do nothing;

-- ── Backfill 2: 7 tool chân dung qua HISTORY_TABLE (laso_key) ──
insert into public.user_reports (user_id, tool_id, report_key, source, created_at, updated_at)
select user_id, 'chan-dung-vo-chong', laso_key, 'backfill', min(created_at), min(created_at)
from public.spouse_portraits where user_id is not null and laso_key is not null
group by user_id, laso_key
on conflict (user_id, tool_id, report_key) do nothing;

insert into public.user_reports (user_id, tool_id, report_key, source, created_at, updated_at)
select user_id, 'chan-dung-tien-kiep', laso_key, 'backfill', min(created_at), min(created_at)
from public.past_life_portraits where user_id is not null and laso_key is not null
group by user_id, laso_key
on conflict (user_id, tool_id, report_key) do nothing;

insert into public.user_reports (user_id, tool_id, report_key, source, created_at, updated_at)
select user_id, 'duyen-no-tien-kiep', laso_key, 'backfill', min(created_at), min(created_at)
from public.past_life_bonds where user_id is not null and laso_key is not null
group by user_id, laso_key
on conflict (user_id, tool_id, report_key) do nothing;

insert into public.user_reports (user_id, tool_id, report_key, source, created_at, updated_at)
select user_id, 'nguoi-khac', laso_key, 'backfill', min(created_at), min(created_at)
from public.nguoi_khac_reports where user_id is not null and laso_key is not null
group by user_id, laso_key
on conflict (user_id, tool_id, report_key) do nothing;

insert into public.user_reports (user_id, tool_id, report_key, source, created_at, updated_at)
select user_id, 'day-con', laso_key, 'backfill', min(created_at), min(created_at)
from public.day_con_reports where user_id is not null and laso_key is not null
group by user_id, laso_key
on conflict (user_id, tool_id, report_key) do nothing;

insert into public.user_reports (user_id, tool_id, report_key, source, created_at, updated_at)
select user_id, 'nhan-mach', laso_key, 'backfill', min(created_at), min(created_at)
from public.nhan_mach_reports where user_id is not null and laso_key is not null
group by user_id, laso_key
on conflict (user_id, tool_id, report_key) do nothing;

insert into public.user_reports (user_id, tool_id, report_key, source, created_at, updated_at)
select user_id, 'huong-nghiep-tre', laso_key, 'backfill', min(created_at), min(created_at)
from public.huong_nghiep_tre_reports where user_id is not null and laso_key is not null
group by user_id, laso_key
on conflict (user_id, tool_id, report_key) do nothing;
