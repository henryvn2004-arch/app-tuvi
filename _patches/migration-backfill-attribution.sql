-- migration-backfill-attribution.sql  (Marketing — backfill attribution cho user cũ)
-- ============================================================
-- user_attribution chỉ ghi từ lúc Sprint 0 (2026-07-22) → 56/56 user hiện có
-- (đăng ký 2026-03-21 → 2026-07-21) đều THIẾU dòng attribution → Funnel
-- "signups", biểu đồ Acquisition, Cohort, Doanh Thu Theo Nội Dung gần như trống
-- dù chọn khoảng ngày nào (không phải bug — đơn giản là chưa có dòng để đọc).
--
-- Backfill 1 dòng/user cũ: signup_at = auth.users.created_at (ngày đăng ký THẬT),
-- nhưng KHÔNG bịa kênh/UTM/referrer — đánh dấu first_utm_source='legacy' +
-- first_landing_path='(trước khi có tracking)' để tách bạch rõ với 'direct'/kênh
-- thật (users đăng ký sau khi có tracking). Idempotent: left join where NULL,
-- chạy lại không insert trùng, không đụng user nào đã có dòng attribution.
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

insert into public.user_attribution (
  user_id, first_utm_source, first_referrer, first_landing_path,
  first_seen_at, signup_at
)
select
  u.id,
  'legacy',
  null,
  '(trước khi có tracking)',
  u.created_at,
  u.created_at
from auth.users u
left join public.user_attribution ua on ua.user_id = u.id
where ua.user_id is null;
