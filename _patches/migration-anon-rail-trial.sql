-- ============================================================
-- ANON RAIL TRIAL — cho khách CHƯA ĐĂNG KÝ hỏi rail vài câu
-- ============================================================
-- Vì sao:
--   Đo prod 30 ngày: 618 khách ghé → 6 đăng ký (0,97%). Quà đăng ký 25 Lượng
--   (= 12 câu rail ở giá mới) là đủ dùng thử — NHƯNG nó nằm SAU cửa đăng ký, mà
--   99% người ghé không bao giờ mở cửa đó. `/api/v1/chat` đang trả 401 CỨNG khi
--   không có token: khách an sao xong (miễn phí) muốn hỏi MỘT câu cũng không được.
--   Benchmark 2026: cho dùng thử ngay trên trang, không cần tài khoản → tỉ lệ
--   đăng ký từ organic 16,7% (so với 0,97% hiện tại).
--
-- Vốn thật một lượt rail: 35đ (đo từ events.meta.cost_vnd). Nên cho không vài
-- câu gần như không tốn gì — nhưng "gần như không tốn gì" × Internet = tốn thật,
-- nên phải có cầu dao.
--
-- BA LỚP TRẦN ĐỘC LẬP (mỗi lớp bịt một đường lách khác nhau):
--   1. theo `anon_id`  — trần ĐỜI (không phải theo ngày): mỗi trình duyệt được
--      N câu, hết là mời đăng ký. Đây là lớp tạo áp lực chuyển đổi.
--   2. theo `ip_hash`/NGÀY — bịt đường xoá localStorage để lấy anon_id mới.
--      Phải NỚI vì NAT nhà mạng/công ty gộp nhiều người thật vào một IP.
--   3. TOÀN HỆ THỐNG/NGÀY — cầu dao ngân sách, chốt cuối. Ai lách được 1 và 2
--      thì vẫn không thể vượt tổng chi mỗi ngày.
--
-- Lưu `ip_hash` (sha256 + salt) chứ KHÔNG lưu IP thô — không cần IP thật để
-- đếm, mà giữ IP thô là tự tạo thêm dữ liệu cá nhân phải bảo vệ.
--
-- HƯỚNG FAIL: CLOSED (chặn). Ngược với `viral_free_gen_gate` (fail-OPEN) — và
-- ngược có lý do: cầu dao ảnh gác người ĐÃ TRẢ TIỀN, chặn oan họ vì Supabase
-- chớp một nhịp thì tệ hơn lỡ vài lượt. Ở đây đối tượng là khách VÔ DANH chưa
-- trả gì; chặn oan thì họ thấy đúng lời mời đăng ký vốn sẽ thấy, còn cho qua oan
-- là rò tiền cho bất kỳ ai trên Internet.
-- ============================================================

begin;

create table if not exists public.anon_rail_trial (
  anon_id       text primary key,
  ip_hash       text,
  turns         int  not null default 0,          -- tổng ĐỜI của anon_id này
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

comment on table public.anon_rail_trial is
  'Đếm lượt rail dùng thử của khách chưa đăng ký. turns = trần ĐỜI theo anon_id; ip_hash để chặn xoá-localStorage-lấy-quota-mới.';

-- Đếm theo IP/ngày và theo ngày toàn hệ thống — nhật ký từng lượt, giữ ngắn hạn.
create table if not exists public.anon_rail_hits (
  id      bigserial primary key,
  ts      timestamptz not null default now(),
  anon_id text,
  ip_hash text
);

create index if not exists anon_rail_hits_ts_idx      on public.anon_rail_hits (ts desc);
create index if not exists anon_rail_hits_ip_ts_idx   on public.anon_rail_hits (ip_hash, ts desc);

-- Chỉ service key chạm được (route server). Không policy nào = không ai đọc qua
-- anon/authenticated key — cùng cách đã dùng cho portrait_cache.
alter table public.anon_rail_trial enable row level security;
alter table public.anon_rail_hits  enable row level security;

-- ── Cấu hình (đổi không cần deploy) ───────────────────────────
-- Đặt bất kỳ trần nào về 0 là TẮT hẳn tính năng dùng thử.
insert into public.app_config (key, value, note) values
  ('anon.rail_trial_turns', to_jsonb(3),
   'Số câu rail cho khách CHƯA đăng ký, trần ĐỜI theo anon_id. 0 = tắt hẳn dùng thử.'),
  ('anon.rail_ip_daily_cap', to_jsonb(30),
   'Trần lượt rail dùng thử theo ip_hash mỗi ngày (giờ VN). Nới tay vì NAT nhà mạng gộp nhiều người thật vào 1 IP.'),
  ('anon.rail_global_daily_cap', to_jsonb(200),
   'Cầu dao ngân sách: tổng lượt rail dùng thử toàn hệ thống mỗi ngày. 200 x ~35d/luot ~ 7.000d/ngay ~ 210.000d/thang.')
on conflict (key) do nothing;   -- ĐÃ set rồi thì giữ giá trị Henry đang dùng

-- ── RPC: xin MỘT lượt dùng thử (nguyên tử) ────────────────────
-- Trả jsonb {allowed, reason, left, used_anon, used_ip, used_global}.
-- `reason`: 'ok' | 'disabled' | 'anon_cap' | 'ip_cap' | 'global_cap'
--
-- Tăng đếm NGAY khi cấp phép (không đợi câu trả lời xong): lượt đã gọi model là
-- đã tốn tiền, dù sau đó model có lỗi. Đếm sau khi thành công là mở đường gọi
-- model rồi tự ngắt kết nối để không bị tính.
create or replace function public.anon_rail_trial_consume(
  p_anon_id text,
  p_ip_hash text
) returns jsonb
language plpgsql security definer set search_path = 'public' as $$
declare
  v_turns_cap  int;
  v_ip_cap     int;
  v_global_cap int;
  v_day_start  timestamptz;
  v_used_anon  int;
  v_used_ip    int;
  v_used_glob  int;
begin
  if p_anon_id is null or length(p_anon_id) < 6 then
    return jsonb_build_object('allowed', false, 'reason', 'disabled', 'left', 0);
  end if;

  select coalesce((value #>> '{}')::int, 0) into v_turns_cap  from app_config where key = 'anon.rail_trial_turns';
  select coalesce((value #>> '{}')::int, 0) into v_ip_cap     from app_config where key = 'anon.rail_ip_daily_cap';
  select coalesce((value #>> '{}')::int, 0) into v_global_cap from app_config where key = 'anon.rail_global_daily_cap';
  v_turns_cap  := coalesce(v_turns_cap, 0);
  v_ip_cap     := coalesce(v_ip_cap, 0);
  v_global_cap := coalesce(v_global_cap, 0);

  if v_turns_cap <= 0 or v_ip_cap <= 0 or v_global_cap <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'disabled', 'left', 0);
  end if;

  -- Ngày theo GIỜ VN, không phải UTC — cùng quy ước với cầu dao ảnh.
  v_day_start := (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')) at time zone 'Asia/Ho_Chi_Minh';

  select coalesce(turns, 0) into v_used_anon from anon_rail_trial where anon_id = p_anon_id;
  v_used_anon := coalesce(v_used_anon, 0);
  if v_used_anon >= v_turns_cap then
    return jsonb_build_object('allowed', false, 'reason', 'anon_cap', 'left', 0, 'used_anon', v_used_anon);
  end if;

  select count(*) into v_used_glob from anon_rail_hits where ts >= v_day_start;
  if v_used_glob >= v_global_cap then
    return jsonb_build_object('allowed', false, 'reason', 'global_cap', 'left', v_turns_cap - v_used_anon);
  end if;

  if p_ip_hash is not null then
    select count(*) into v_used_ip from anon_rail_hits where ip_hash = p_ip_hash and ts >= v_day_start;
    if v_used_ip >= v_ip_cap then
      return jsonb_build_object('allowed', false, 'reason', 'ip_cap', 'left', v_turns_cap - v_used_anon);
    end if;
  end if;

  insert into anon_rail_trial (anon_id, ip_hash, turns)
       values (p_anon_id, p_ip_hash, 1)
  on conflict (anon_id) do update
     set turns = anon_rail_trial.turns + 1,
         ip_hash = coalesce(excluded.ip_hash, anon_rail_trial.ip_hash),
         last_seen_at = now();

  insert into anon_rail_hits (anon_id, ip_hash) values (p_anon_id, p_ip_hash);

  return jsonb_build_object(
    'allowed', true, 'reason', 'ok',
    'left', v_turns_cap - (v_used_anon + 1),
    'used_anon', v_used_anon + 1
  );
end;
$$;

grant execute on function public.anon_rail_trial_consume(text, text) to service_role;

-- ── RPC: XEM trạng thái, KHÔNG tiêu lượt ──────────────────────
-- Cho đồng hồ "còn N câu dùng thử" hiện được ngay khi mở rail.
create or replace function public.anon_rail_trial_status(p_anon_id text)
returns jsonb language sql security definer set search_path = 'public' as $$
  select jsonb_build_object(
    'cap',  coalesce((select (value #>> '{}')::int from app_config where key = 'anon.rail_trial_turns'), 0),
    'used', coalesce((select turns from anon_rail_trial where anon_id = p_anon_id), 0),
    'left', greatest(0,
              coalesce((select (value #>> '{}')::int from app_config where key = 'anon.rail_trial_turns'), 0)
              - coalesce((select turns from anon_rail_trial where anon_id = p_anon_id), 0))
  );
$$;

grant execute on function public.anon_rail_trial_status(text) to service_role;

-- Dọn nhật ký cũ: chỉ cần 2 ngày để đếm theo ngày, giữ lâu hơn là phình vô ích.
create or replace function public.anon_rail_hits_prune()
returns int language sql security definer set search_path = 'public' as $$
  with d as (delete from anon_rail_hits where ts < now() - interval '2 days' returning 1)
  select count(*)::int from d;
$$;

grant execute on function public.anon_rail_hits_prune() to service_role;

commit;
