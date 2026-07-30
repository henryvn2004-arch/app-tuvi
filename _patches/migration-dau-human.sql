-- _patches/migration-dau-human.sql
-- ============================================================
-- Cảnh báo "DAU sụt" đang so một phép chia sai với một phép chia sai khác.
--
-- Ba chỗ mục, đo được trên prod 29/07/2026:
--
-- 1. MẪU SỐ KHÔNG PHẢI NGƯỜI. PR #335 đo GA4 28 ngày: 78% "khách" đến từ 7 thành
--    phố data center, engagement trung bình 4 GIÂY, không một thành phố Việt Nam
--    nào trong top 7. Cột `events.is_bot` sinh ra từ đó. Cái đang gọi là "DAU"
--    lên xuống theo nhịp crawler chứ không theo nhịp người dùng.
--
-- 2. BASELINE NHIỄM CI. Cửa sổ 7 ngày gồm 22–24/07, giai đoạn Playwright còn
--    chạy thẳng vào prod: riêng 23/07 có 1.233 page_view / 123 uniq và 407
--    `topup_start` từ ĐÚNG 1 anon_id. Trung bình cộng của một tập có ngày phồng
--    thì bị kéo lên, nên mọi ngày bình thường sau đó trông như "sụt".
--
-- 3. MẪU QUÁ NHỎ. Chuỗi DAU 8 ngày: 21 · 123 · 64 · 86 · 98 · 111 · 74 · 47.
--    Ở cỡ vài chục lượt/ngày, ±50% là nhiễu thường ngày, không phải tín hiệu.
--
-- Hàm này chỉ lo phần (1): trả về CẢ HAI con số mỗi ngày để bên gọi tự chọn.
-- Phần (2) và (3) — median thay trung bình cộng, sàn mẫu tối thiểu — làm ở
-- lib/marketing/anomaly-alerts.ts vì đó là chỗ đang quyết định có bắn hay không.
--
-- ⚠️ CỐ Ý KHÔNG sửa `dashboard_engagement`. Đổi nó là đổi luôn con số trên panel
-- DAU/WAU/MAU của admin, tức một thay đổi sản phẩm (số hiển thị tụt ~20%) trộn
-- vào một bản vá cảnh báo. Hệ quả PHẢI BIẾT: từ giờ panel đếm cả bot, cảnh báo
-- đếm người → hai chỗ sẽ lệch nhau. Đó là nợ có ý thức, không phải sơ suất; câu
-- chữ cảnh báo nói rõ "người thật" để không ai đọc chéo hai bên rồi tưởng sai.
-- ============================================================

create or replace function public.dau_human_daily(p_days int default 8)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select date_trunc('day', (now() at time zone 'Asia/Ho_Chi_Minh'))::date as last_day,
           date_trunc('day', (now() at time zone 'Asia/Ho_Chi_Minh'))::date
             - (greatest(coalesce(p_days, 8), 1) - 1) as first_day
  ),
  -- generate_series để ngày KHÔNG có lượt nào vẫn ra một dòng dau=0. Thiếu nó
  -- thì một ngày site chết hẳn sẽ biến mất khỏi baseline thay vì kéo nó xuống —
  -- tức càng hỏng nặng, baseline càng đẹp.
  d as (
    select generate_series(b.first_day, b.last_day, interval '1 day')::date as day
    from bounds b
  ),
  e as (
    select (ev.ts at time zone 'Asia/Ho_Chi_Minh')::date as day,
           coalesce(ev.user_id::text, ev.anon_id) as who,
           -- coalesce vì mọi dòng ghi TRƯỚC khi cột is_bot tồn tại đều không
           -- phải "đã đo là người", chỉ là chưa đo. Bên gọi lo phần đó bằng
           -- app_config['ops.bot_flag_since'].
           coalesce(ev.is_bot, false) as is_bot
    from events ev, bounds b
    where ev.ts >= (b.first_day::timestamp at time zone 'Asia/Ho_Chi_Minh')
      and coalesce(ev.user_id::text, ev.anon_id) is not null
  )
  select jsonb_build_object(
    'days',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'day', to_char(x.day, 'YYYY-MM-DD'),
          'dau_all', x.dau_all,
          'dau_human', x.dau_human
        ) order by x.day
      ),
      '[]'::jsonb
    )
  )
  from (
    select d.day,
           count(distinct e.who) as dau_all,
           count(distinct e.who) filter (where not e.is_bot) as dau_human
    from d left join e on e.day = d.day
    group by d.day
  ) x;
$$;

-- REVOKE TRƯỚC, GRANT SAU — và revoke là phần bắt buộc, không phải cho đẹp.
-- Đo được trong migration-revoke-secdef-sweep.sql: Postgres cấp sẵn EXECUTE cho
-- PUBLIC trên mọi hàm mới, mà anon là thành viên của PUBLIC, nên viết `grant ...
-- to service_role` KHÔNG đóng cửa gì cả — nó chỉ thêm một quyền vốn đã có. Đây
-- đúng lối mà #336 và #337 vừa phải đi vá cho 2 hàm ra prod thiếu dòng này.
revoke all on function public.dau_human_daily(int) from public, anon, authenticated;
grant execute on function public.dau_human_daily(int) to service_role;

-- Mốc bắt đầu có dữ liệu `is_bot` THẬT. Dòng is_bot=true đầu tiên trên prod là
-- 18:39 giờ VN 29/07, nên 29/07 chỉ được đo có ~5 tiếng cuối ngày — dùng nó làm
-- baseline là so một ngày đã lọc bot với những ngày chưa lọc. 30/07 là ngày ĐẦY
-- ĐỦ đầu tiên.
--
-- Vì sao là config chứ không phải hằng số trong code: cảnh báo cần biết ngày nào
-- ĐÃ ĐO ĐƯỢC bot, mà điều đó không suy ra được từ dữ liệu — một ngày không có
-- dòng bot nào trông y hệt một ngày chưa hề đo bot.
insert into public.app_config (key, value)
values ('ops.bot_flag_since', to_jsonb('2026-07-30'::text))
on conflict (key) do nothing;
