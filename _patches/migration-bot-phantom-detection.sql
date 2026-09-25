-- migration-bot-phantom-detection.sql
-- ============================================================
-- Traffic MA lọt lưới bot detection — không phải người thật, không phải bot
-- tự khai, cũng không phải "fleet" theo nghĩa cũ.
--
-- Henry hỏi thẳng (25/09/2026): "Cả ngàn người visit/ngày mà không lẽ không ai
-- signup?" — đo lại thì đúng, không phải người thật.
--
-- BẰNG CHỨNG (đo trên 7 ngày gần nhất lúc phát hiện):
--   • 83,8% (1.725/2.059) "visitors_human" chỉ có ĐÚNG 2 sự kiện, không hơn
--     không kém: 1 page_view + 1 tool_open (tự bắn khi mở tool_id='home', xác
--     nhận bằng đo riêng: 83,5% MỌI visitor toàn site đều tự bắn cặp này khi
--     đáp xuống trang chủ — đây là hành vi tracking BÌNH THƯỜNG, không phải
--     dấu hiệu bot một mình nó).
--   • 0/1.725 từng có referrer. 0/1.725 từng đăng nhập.
--   • 98% đáp THẲNG vào /app (không phải trang chủ, không phải /la-so/* SEO).
--   • 1.722/1.725 (99,8%) chỉ hoạt động ĐÚNG 1 NGÀY trong đời rồi biến mất
--     vĩnh viễn — loại trừ được giả thuyết "người dùng PWA cũ mở lại app"
--     (PWA thật sẽ relaunch nhiều lần, nhiều ngày).
--   • 97,7% dùng ĐÚNG 2 chuỗi UA generic (Chrome Windows 151 + Chrome Android
--     Pixel-5 151), byte-for-byte giống hệt trên hàng nghìn anon_id khác nhau
--     — traffic thật sẽ có hàng trăm biến thể thiết bị, không dồn vào 2 mẫu.
--   • Diễn ra đều mỗi ngày suốt 8 ngày liên tiếp (52–96% traffic "human" mỗi
--     ngày), không phải một đợt bùng rồi thôi.
--
-- CĂN NGUYÊN — vì sao bot_ua_fleets() không bắt được:
--   1. Ngưỡng tỉ lệ sự kiện/người < 1,1 — traffic ma luôn ra ĐÚNG 2,00, cao
--      hơn ngưỡng.
--   2. 'tool_open' không nằm trong ('page_view','other') nên điều kiện "0 sự
--      kiện ngoài page_view/other" của CẢ CỤM UA cũng fail — mà traffic ma
--      luôn có đúng 1 tool_open.
--   3. Quan trọng nhất: bot_ua_fleets() đánh giá ở GRAIN CỤM UA, còn 2 UA giả
--      này CŨNG được người thật dùng chung (Chrome Windows/Android là 2 UA
--      phổ biến nhất thế giới) — nới ngưỡng ratio trên bot_ua_fleets() sẽ
--      chặn OAN người thật đang chia sẻ cùng UA. Phải bắt ở grain anon_id.
--
-- Nặng hơn: trong traffic_quality() (nguồn CMO digest Telegram đang đọc),
-- 'tool_open' nằm sẵn trong danh sách "sự kiện tương tác thật" (n_interact)
-- → trước bản vá này, traffic ma còn bị xếp NHẦM vào bucket TỐT NHẤT
-- (engaged), không chỉ lọt lưới mà còn được tính là bằng chứng site có người
-- tương tác thật.
--
-- CÁCH VÁ:
--   1. bot_phantom_anon_ids(from, to, min_cluster=8) — hàm MỚI, đánh giá ở
--      grain ANON_ID (không gộp cả cụm UA). Một anon_id bị đánh dấu phantom
--      khi CHÍNH NÓ khớp đúng hình dạng đã chứng minh (2 sự kiện = 1 page_view
--      + 1 tool_open('home'), 0 referrer, 0 đăng nhập, 1 ngày) VÀ nằm trong
--      cụm ≥8 anon_id khác cùng UA cũng khớp hình dạng đó — mượn khái niệm
--      "fleet" của bot_ua_fleets() nhưng đặt đúng grain.
--   2. bot_anon_ids(from, to) — nối thêm nhánh OR gọi hàm trên. Đây là hàm
--      GỐC mà marketing_funnel/dashboard_engagement/dau_human_daily/
--      campaign_funnel_daily đều gọi → cả 4 RPC đó tự động ăn bản vá, không
--      cần sửa từng cái.
--   3. traffic_quality() — hàm DUY NHẤT bỏ qua bot_anon_ids() và gọi thẳng
--      bot_ua_fleets(), nên KHÔNG tự động ăn bản vá ở bước 2. Thêm bucket
--      MỚI 'phantom_bot' (nguồn bot_phantom_anon_ids), xếp TRƯỚC nhánh
--      'engaged' trong CASE để chặn đúng lỗi "tính nhầm vào engaged" ở trên.
--      Field cũ giữ nguyên tên/nghĩa — chỉ 'human' co lại đúng phần vừa vét
--      ra 'phantom_bot'.
--
-- KẾT QUẢ SAU VÁ (đo lại đúng khoảng 7 ngày nêu trên):
--   marketing_funnel:  visitors_human 2.059 → 377  (visitors_bot 2.076 → 3.777)
--   traffic_quality:   total 4.192, phantom_bot 1.703, human 389 (engaged 337
--                       + drive_by 18 + browsed 34 = 389, khớp phép cộng nội bộ)
--   signups/activated/paid/returned KHÔNG đổi — đúng kỳ vọng, các field đó
--   không phụ thuộc phân loại bot.
--
-- ⚠️ Số "human"/"visitors_human" ở MỌI dashboard sẽ TỤT MẠNH ngay sau khi áp
-- migration này. Đây là fix chạy đúng, không phải hồi quy/site sập.
--
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent
-- (CREATE OR REPLACE). Đã áp trên prod qua Supabase MCP 25/09/2026, verify
-- trong transaction rollback trước khi áp thật.
-- ============================================================

create or replace function public.bot_phantom_anon_ids(
  p_from timestamptz,
  p_to timestamptz,
  p_min_cluster integer default 8
)
returns setof text
language sql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
  with per_anon as (
    select
      e.anon_id,
      max(e.ua) as ua,
      count(*) as n_events,
      count(*) filter (where e.event_type = 'page_view') as n_pv,
      count(*) filter (where e.event_type = 'tool_open' and e.tool_id = 'home') as n_home_open,
      bool_or(e.referrer is not null and e.referrer <> '') as had_referrer,
      bool_or(e.user_id is not null) as ever_logged_in,
      count(distinct e.ts::date) as n_days
    from public.events e
    where e.ts >= p_from and e.ts < p_to
      and e.anon_id is not null
      and e.ua is not null and e.ua <> ''
    group by e.anon_id
  ),
  phantom_shape as (
    select anon_id, ua
    from per_anon
    where n_events = 2
      and n_pv = 1
      and n_home_open = 1
      and not had_referrer
      and not ever_logged_in
      and n_days = 1
  ),
  fleet_size as (
    select ua, count(*) as n
    from phantom_shape
    group by ua
  )
  select ps.anon_id
  from phantom_shape ps
  join fleet_size fs on fs.ua = ps.ua
  where fs.n >= p_min_cluster
$$;

-- ⚠️ REVOKE PHẢI ĐỨNG TRƯỚC GRANT, VÀ KHÔNG ĐƯỢC BỎ — Postgres cấp sẵn EXECUTE
-- cho PUBLIC trên mọi hàm mới, `anon` là thành viên của PUBLIC. Đúng lớp lỗi
-- security_audit() đã bắt ở traffic_quality/marketing_signup_truth trước đây,
-- và LẶP LẠI ngay trong migration này (bot_phantom_anon_ids tạo qua MCP thiếu
-- REVOKE ở lượt áp đầu tiên, bắt được bằng chính security_audit() rồi vá kèm
-- migration ACL riêng — gộp lại đây cho gọn).
revoke execute on function public.bot_phantom_anon_ids(timestamptz, timestamptz, integer)
  from public, anon, authenticated;

grant execute on function public.bot_phantom_anon_ids(timestamptz, timestamptz, integer)
  to service_role;

create or replace function public.bot_anon_ids(p_from timestamp with time zone, p_to timestamp with time zone)
 returns setof text
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select e.anon_id
    from public.events e
   where e.ts >= p_from and e.ts < p_to
     and e.anon_id is not null
   group by e.anon_id
  having bool_or(e.is_bot)
      or bool_or(e.ua in (select public.bot_ua_fleets()))
      or e.anon_id in (select public.bot_phantom_anon_ids(p_from, p_to))
$function$;

create or replace function public.traffic_quality(p_from timestamptz, p_to timestamptz)
returns json
language sql
security definer
set search_path = public, pg_temp
as $$
  with fleets as (select f as ua from public.bot_ua_fleets() f),
  phantoms as (select a as anon_id from public.bot_phantom_anon_ids(p_from, p_to) a),
  per_anon as (
    select
      e.anon_id,
      bool_or(e.is_bot) as known_bot,
      bool_or(e.ua in (select ua from fleets)) as fleet_bot,
      bool_or(e.anon_id in (select anon_id from phantoms)) as phantom_bot,
      count(*) as n_ev,
      count(*) filter (
        where e.event_type in (
          'tool_open', 'tool_run', 'tool_result', 'chat_msg', 'cta_click',
          'topup_start', 'topup_success', 'signup', 'login', 'share',
          'share_view', 'poster_download', 'referral_signup'
        )
      ) as n_interact,
      count(distinct (e.ts at time zone 'Asia/Ho_Chi_Minh')::date) as n_days
    from public.events e
    where e.ts >= p_from and e.ts < p_to and e.anon_id is not null
    group by e.anon_id
  ),
  bucketed as (
    select
      case
        when known_bot then 'known_bot'
        when fleet_bot then 'fleet_bot'
        when phantom_bot then 'phantom_bot'
        when n_interact > 0 or n_days > 1 then 'engaged'
        when n_ev = 1 then 'drive_by'
        else 'browsed'
      end as bucket
    from per_anon
  )
  select json_build_object(
    'total',       (select count(*) from per_anon),
    'known_bot',   (select count(*) from bucketed where bucket = 'known_bot'),
    'fleet_bot',   (select count(*) from bucketed where bucket = 'fleet_bot'),
    'phantom_bot', (select count(*) from bucketed where bucket = 'phantom_bot'),
    'engaged',     (select count(*) from bucketed where bucket = 'engaged'),
    'drive_by',    (select count(*) from bucketed where bucket = 'drive_by'),
    'browsed',     (select count(*) from bucketed where bucket = 'browsed'),
    'human',       (select count(*) from bucketed where bucket not in ('known_bot', 'fleet_bot', 'phantom_bot')),
    'fleet_uas',   (select coalesce(json_agg(ua), '[]'::json) from fleets),
    'ua_coverage', (
      select json_build_object(
        'with_ua', count(*) filter (where ua is not null and ua <> ''),
        'total',   count(*)
      )
      from public.events
      where ts >= p_from and ts < p_to
    )
  );
$$;

revoke execute on function public.traffic_quality(timestamptz, timestamptz)
  from public, anon, authenticated;

grant execute on function public.traffic_quality(timestamptz, timestamptz) to service_role;

-- ── Verify (đã chạy trên prod sau khi áp) ───────────────────────────────────
--   • marketing_funnel(now()-7d, now()): visitors_human 2.059 → 377.
--   • traffic_quality(now()-7d, now()): phantom_bot=1.703, human=389, và
--     engaged+drive_by+browsed=human (khớp phép cộng nội bộ).
--   • ACL của bot_phantom_anon_ids + traffic_quality còn đúng
--     {postgres=X/postgres, service_role=X/postgres} — set local role anon
--     gọi cả hai đều ném insufficient_privilege.
--   • security_audit(24,20,20).ham_ho_cho_anon = [] (rỗng, không hàm nào hở).
--   • dashboard_engagement / dau_human_daily / campaign_funnel_daily đều gọi
--     bot_anon_ids() nên tự động ăn bản vá, không cần sửa riêng.
