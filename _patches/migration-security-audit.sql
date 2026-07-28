-- _patches/migration-security-audit.sql
-- ============================================================================
-- S6 (track COO) — `security_audit()`: bộ DÒ định kỳ cho mảng bảo mật.
--
-- VÌ SAO PHẢI CÓ, thay vì tin vào việc "đã vá xong": migration kèm theo
-- (`migration-revoke-secdef-sweep.sql`) đã chứng minh bằng thực nghiệm rằng
-- KHÔNG thể chặn hở-mặc-định ở tầng Postgres trên Supabase — quyền EXECUTE cho
-- PUBLIC là dựng sẵn và ALTER DEFAULT PRIVILEGES không gỡ được. Nghĩa là mỗi
-- migration tương lai vẫn có thể đẻ ra một hàm hở, và cách duy nhất còn lại là
-- ĐO LẠI ĐỀU ĐẶN. Bộ dò này chạy cùng nhịp `anomaly-alerts` (3 giờ/lần).
--
-- Ngưỡng đặt CAO hơn nền thật đo được lúc viết (cao nhất 41 event/anon/24h;
-- 0 thiết bị nhiều tài khoản; 0 dòng referrals) — báo giả vài lần là cảnh báo
-- thật cũng bị bỏ qua theo, đúng bài học đã rút ở S4.
-- ============================================================================

create or replace function public.security_audit(
  p_flood_events    int default 500,   -- 1 anon_id bắn quá ngần này event/24h
  p_device_users    int default 3,     -- 1 thiết bị gắn với quá ngần này tài khoản
  p_referral_burst  int default 5      -- 1 người giới thiệu quá ngần này người/7 ngày
) returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_exposed   json;
  v_flood     json;
  v_device    json;
  v_referral  json;
  v_drift     json;
begin
  -- 1) Hàm SECURITY DEFINER nào đang cho `anon` gọi.
  --    `is_admin` nằm trong danh sách bỏ qua CÓ CHỦ ĐÍCH: nó được gọi bên
  --    trong 8 policy RLS gắn cho role `public`, thu quyền là khách vãng lai
  --    đọc `tool_pricing` cũng gãy. Rò rỉ còn lại chỉ là một boolean.
  select coalesce(json_agg(t.proname order by t.proname), '[]'::json) into v_exposed
  from (
    select p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname <> 'is_admin'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) t;

  -- 2) Bơm sự kiện giả vào `events`. Quan trọng vì chính bảng này nuôi số liệu
  --    mà autopilot M0.6 dựa vào để tự chỉnh giá/khuyến mãi — đầu độc được nó
  --    là lái được hành động thật của hệ thống.
  select coalesce(json_agg(json_build_object('anon_id', anon_id, 'events_24h', c)), '[]'::json)
    into v_flood
  from (select anon_id, count(*) c from events
         where ts > now() - interval '24 hours' and anon_id is not null
         group by anon_id having count(*) > p_flood_events
         order by 2 desc limit 20) f;

  -- 3) Cày Lượng bằng nhiều tài khoản trên CÙNG một thiết bị. `anon_id` nằm
  --    localStorage nên kẻ cày chỉ cần xoá là lách được — cái này bắt loại
  --    lười, không phải loại chuyên. Có còn hơn không, và chi phí gần bằng 0.
  select coalesce(json_agg(json_build_object('anon_id', anon_id, 'so_tai_khoan', c)), '[]'::json)
    into v_device
  from (select anon_id, count(distinct user_id) c from events
         where anon_id is not null and user_id is not null
         group by anon_id having count(distinct user_id) >= p_device_users
         order by 2 desc limit 20) d;

  -- 4) Một người giới thiệu ôm quá nhiều referee trong thời gian ngắn.
  select coalesce(json_agg(json_build_object('referrer', referrer_user_id, 'so_nguoi_7d', c)), '[]'::json)
    into v_referral
  from (select referrer_user_id, count(*) c from referrals
         where created_at > now() - interval '7 days'
         group by referrer_user_id having count(*) >= p_referral_burst
         order by 2 desc limit 20) r;

  -- 5) Số dư ví LỆCH khỏi tổng sổ giao dịch. Đây là tín hiệu trực tiếp nhất
  --    của loại lỗ đã vá ở S0 (gọi thẳng `add_credits` qua PostgREST): tiền tự
  --    sinh ra mà không có dòng giao dịch nào giải thích. Bằng 0 nghĩa là chưa
  --    ai khai thác; khác 0 là phải điều tra ngay, không bàn.
  select coalesce(json_agg(json_build_object(
           'user_id', user_id, 'so_du', balance, 'tong_so', ledger)), '[]'::json)
    into v_drift
  from (
    select uc.user_id, uc.balance,
           coalesce((select sum(amount) from credit_transactions ct where ct.user_id = uc.user_id), 0) as ledger
    from user_credits uc
  ) x
  where balance <> ledger
  limit 20;

  return json_build_object(
    'ham_ho_cho_anon', v_exposed,
    'bom_su_kien',     v_flood,
    'thiet_bi_cay',    v_device,
    'referral_bat_thuong', v_referral,
    'lech_so_du',      v_drift,
    'nguong', json_build_object(
      'flood_events', p_flood_events,
      'device_users', p_device_users,
      'referral_burst', p_referral_burst)
  );
end
$function$;

-- Quy ước repo (S3/S4): hàm mới PHẢI tự thu quyền. `from public` là bắt buộc —
-- thiếu nó thì lệnh báo thành công mà quyền còn nguyên (bẫy đã tốn một vòng
-- chẩn đoán ở S0).
revoke execute on function public.security_audit(int, int, int) from public, anon, authenticated;
grant  execute on function public.security_audit(int, int, int) to service_role;
