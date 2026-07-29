-- migration-signup-truth.sql
-- ============================================================
-- Số ĐĂNG KÝ THẬT (ground truth) + vá lịch sử cho user thiếu attribution.
--
-- VÌ SAO CẦN: `marketing_funnel.signups` đếm `user_attribution.signup_at`, mà
-- dòng `user_attribution` CHỈ được ghi khi /api/track nhận đúng một event
-- 'login'/'signup'. Đường đăng nhập Google đã mù suốt (vá ở #332), nên tài
-- khoản thật tạo 2026-07-24 KHÔNG có dòng attribution → mọi dashboard và bản
-- CMO digest sáng 29/7 đọc thành "0 đăng ký", rồi kết luận nhầm là hỏng sản
-- phẩm. Sai kiểu này nguy hiểm hơn thiếu số: nó IM LẶNG và trông y hệt tin xấu
-- có thật.
--
-- Sửa gốc nằm ở app/api/track (tạo attribution cho MỌI event đã đăng nhập).
-- File này lo hai việc còn lại:
--   • marketing_signup_truth(from,to) — đếm thẳng auth.users, KHÔNG qua
--     attribution, để digest luôn có một mỏ neo không phụ thuộc beacon client.
--   • Vá lịch sử: dựng attribution cho user thiếu dòng, first-touch suy từ
--     chính events của anon_id họ dùng lúc đăng nhập.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

-- accounts     = số tài khoản auth.users tạo trong cửa sổ (SỰ THẬT).
-- attributed   = trong số đó, bao nhiêu có dòng user_attribution (tức bao nhiêu
--                được funnel/dashboard nhìn thấy). accounts > attributed nghĩa
--                là ĐANG ĐO HỤT, không phải người dùng biến mất.
-- tracking_since = event sớm nhất từng ghi. KHÔNG phụ thuộc cửa sổ — dùng để
--                biết một mốc so sánh có nằm trước ngày bật tracking hay không;
--                nằm trước thì mọi phép so "tuần này vs tuần trước" trên số suy
--                từ events là so với số 0 giả, đọc thành tăng trưởng là sai.
create or replace function public.marketing_signup_truth(p_from timestamptz, p_to timestamptz)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'accounts', (
      select count(*) from auth.users
      where created_at >= p_from and created_at < p_to
    ),
    'attributed', (
      select count(*) from auth.users u
      join user_attribution ua on ua.user_id = u.id
      where u.created_at >= p_from and u.created_at < p_to
    ),
    'tracking_since', (select min(ts) from events)
  );
$$;

grant execute on function public.marketing_signup_truth(timestamptz, timestamptz) to service_role;

-- ── Vá lịch sử ────────────────────────────────────────────────────────────
-- Chỉ dựng dòng cho user CÓ BẰNG CHỨNG trong events (2 lateral join đều LIMIT 1;
-- user không có event nào thì bị loại luôn khỏi kết quả — cố ý, thà thiếu còn
-- hơn bịa nguồn). first-touch lấy từ event SỚM NHẤT của chính anon_id mà họ
-- dùng lúc đăng nhập, tức trước cả lúc bấm đăng nhập.
-- Referrer nội bộ bị bỏ: `marketing_sources` xếp "có referrer" thành kênh
-- 'referral', nên giữ lại https://www.tuviminhbao.com/ là tự khai khách tự tìm
-- đến thành khách do trang khác giới thiệu.
insert into public.user_attribution (
  user_id, anon_id,
  first_utm_source, first_utm_medium, first_utm_campaign,
  first_referrer, first_landing_path, first_seen_at,
  signup_at, updated_at
)
select
  u.id, a.anon_id,
  f.utm_source, f.utm_medium, f.utm_campaign,
  case
    when f.referrer ~* '^https?://(www\.)?tuviminhbao\.com' then null
    else nullif(f.referrer, '')
  end,
  f.path, f.ts,
  u.created_at, now()
from auth.users u
left join public.user_attribution ua on ua.user_id = u.id
cross join lateral (
  select e.anon_id from public.events e
  where e.user_id = u.id and e.anon_id is not null
  order by e.ts limit 1
) a
cross join lateral (
  select e.path, e.referrer, e.utm_source, e.utm_medium, e.utm_campaign, e.ts
  from public.events e
  where e.anon_id = a.anon_id
  order by e.ts limit 1
) f
where ua.user_id is null;
