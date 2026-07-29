-- migration-traffic-quality.sql
-- ============================================================
-- Phân loại chất lượng lưu lượng — tách bot khỏi người thật.
--
-- VÌ SAO CẦN: GA4 28 ngày (1-28/7) cho thấy 78% "khách" đến từ 7 thành phố
-- data center (San Jose, Flint Hill, Chicago, Phoenix, Des Moines, Urumqi,
-- Moses Lake), KHÔNG có một thành phố Việt Nam nào trong top 7, với thời gian
-- tương tác trung bình 4 GIÂY và bounce rate 95-100% đều khắp. Đối chiếu dữ
-- liệu nội bộ: 367/370 anon_id chỉ xuất hiện đúng một ngày rồi biến mất, ~99%
-- chỉ mở đúng trang `/`. Bốn dấu hiệu độc lập cùng chỉ một chỗ: phần lớn con số
-- trên dashboard đang đo máy, không đo người.
--
-- Hệ quả: mọi tỉ lệ chuyển đổi đang bị pha loãng ~30:1. Không lọc thì không thể
-- dùng dashboard để quyết định bất cứ điều gì.
--
-- NGUYÊN TẮC: ĐÁNH DẤU, KHÔNG VỨT. `/api/track` vẫn ghi đủ mọi lượt, chỉ thêm
-- cờ. Lý do: luật phân loại chắc chắn còn phải chỉnh, mà dữ liệu đã vứt thì
-- không lấy lại được. Đánh dấu thì sửa luật xong chạy lại là ra số mới.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

-- `ua` = User-Agent thô. Trước đây KHÔNG hề được lưu — đó chính là lý do câu
-- hỏi "bot hay người" tra mãi không ra: thiếu hẳn giác quan để trả lời.
alter table public.events add column if not exists ua text;

-- Chỉ bật khi User-Agent KHỚP MẪU bot đã biết (xem app/api/track/route.ts).
-- Độ chính xác cao / độ phủ thấp có chủ đích: bot giả dạng trình duyệt thật sẽ
-- KHÔNG bị bắt ở đây — chúng rơi vào bucket 'drive_by' của traffic_quality().
alter table public.events add column if not exists is_bot boolean not null default false;

-- Index riêng cho phần lưu lượng SẠCH, vì đó mới là thứ dashboard hỏi tới
-- thường xuyên. Partial index nên nhỏ, không gánh thêm phần bot.
create index if not exists idx_events_real_ts on public.events (ts) where is_bot = false;

-- ── traffic_quality(from, to) ─────────────────────────────────────────────
-- Chia khách (theo anon_id) thành 4 nhóm để NHÌN THẤY tỉ lệ thay vì đoán:
--   known_bot — User-Agent tự khai là bot. Chắc chắn nhất.
--   engaged   — có ít nhất 1 hành vi thật (mở tool/chat/bấm CTA/đăng nhập...)
--               HOẶC quay lại ngày khác. Đây là con số đáng gọi là "người".
--   drive_by  — đúng 1 event duy nhất rồi biến mất. Không phân biệt được với
--               bot, VÀ cũng vô giá trị với phễu — hai lý do cùng dẫn tới loại.
--   browsed   — xem vài trang trong một ngày nhưng không tương tác gì. Vùng xám
--               thật sự; tách riêng để không nhét bừa vào bên nào.
--
-- ua_coverage nói bao nhiêu event đã có User-Agent. TRƯỚC KHI deploy thì trường
-- này = 0 và known_bot cũng = 0 — phải đọc là "chưa đo được", TUYỆT ĐỐI không
-- đọc thành "không có bot nào".
create or replace function public.traffic_quality(p_from timestamptz, p_to timestamptz)
returns json
language sql
security definer
set search_path = public
as $$
  with per_anon as (
    select
      e.anon_id,
      bool_or(e.is_bot) as known_bot,
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
        when n_interact > 0 or n_days > 1 then 'engaged'
        when n_ev = 1 then 'drive_by'
        else 'browsed'
      end as bucket
    from per_anon
  )
  select json_build_object(
    'total', (select count(*) from per_anon),
    'known_bot', (select count(*) from bucketed where bucket = 'known_bot'),
    'engaged', (select count(*) from bucketed where bucket = 'engaged'),
    'drive_by', (select count(*) from bucketed where bucket = 'drive_by'),
    'browsed', (select count(*) from bucketed where bucket = 'browsed'),
    'ua_coverage', (
      select json_build_object(
        'with_ua', count(*) filter (where ua is not null),
        'total', count(*)
      )
      from public.events
      where ts >= p_from and ts < p_to
    )
  );
$$;

grant execute on function public.traffic_quality(timestamptz, timestamptz) to service_role;
