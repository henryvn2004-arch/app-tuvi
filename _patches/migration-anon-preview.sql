-- ============================================================
-- CẦU DAO BẢN LUẬN XEM TRƯỚC (hard paywall)
-- ============================================================
-- Vì sao có file này:
--   Hard paywall đảo ngược thứ tự cũ. Trước: trả tiền rồi mới gọi model. Nay:
--   gọi model THẬT cho 2 phần đầu ngay khi khách bấm chạy, cho đọc miễn phí,
--   rồi mới dựng tường. Nghĩa là MỖI CÚ CLICK TỪ QUẢNG CÁO đều tiêu tiền model
--   trước khi có một đồng doanh thu nào.
--
--   Vốn thật một lượt xem trước (đo `events.meta.cost_vnd`, gemini-3.8-flash,
--   2026-09): 243đ/phần × 2 phần ≈ 486đ. Nhân với Internet là tốn thật.
--
--   Tệ hơn: `/api/lasotuvi` phần 1 vốn ĐÃ miễn phí và KHÔNG đòi đăng nhập
--   (`if (phanNum !== 1 && !paywallDisabled())`) — tức hôm nay đã có thể curl
--   thẳng route đó sinh phần 1 vô hạn, không trần nào. Chưa ai khai thác vì
--   client chưa bao giờ gọi nó trước khi trả tiền; hard paywall biến đúng
--   đường đó thành ĐƯỜNG CHÍNH. Phải bịt cùng lượt, không được để sau.
--
-- BA LỚP TRẦN, sao chép nguyên tắc đã chạy của `anon_rail_trial_consume`
-- (_patches/migration-anon-rail-trial.sql) — mỗi lớp bịt một đường lách khác:
--   1. theo `p_key` — trần ĐỜI. `p_key` = user_id nếu đã đăng nhập, ngược lại
--      anon_id do client khai. Đây là lớp tạo áp lực chuyển đổi.
--   2. theo `ip_hash`/NGÀY — bịt đường xoá localStorage lấy anon_id mới.
--      Nới tay vì NAT nhà mạng gộp nhiều người thật vào một IP.
--   3. TOÀN HỆ THỐNG/NGÀY — cầu dao ngân sách, chốt cuối.
--
-- HƯỚNG FAIL: CLOSED. Cùng lý lẽ với anon_rail_trial (KHÁC viral_free_gen_gate
-- fail-OPEN): ở đây đối tượng là khách chưa trả gì và thứ đang phát là TIỀN
-- MODEL. Chặn oan thì họ thấy đúng tấm tường vốn sẽ thấy, chỉ mất phần chữ mời;
-- cho qua oan là rò tiền cho bất kỳ ai trên Internet.
--
-- ⚠️ Cache lá số (`laso_public`) làm lượt chạy LẠI cùng một lá số không tốn gì.
-- Nơi gọi vì thế chỉ được tiêu quota khi SẮP THẬT SỰ gọi model — tra cache
-- TRƯỚC, xin quota SAU. Tiêu quota cho một lượt đọc cache là tự bóp phễu của
-- chính mình bằng con số không có thật.
-- ============================================================

begin;

create table if not exists public.anon_preview_trial (
  key           text primary key,               -- user_id (đã đăng nhập) hoặc anon_id
  ip_hash       text,
  runs          int  not null default 0,        -- tổng ĐỜI của key này
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

comment on table public.anon_preview_trial is
  'Đếm lượt sinh bản luận XEM TRƯỚC miễn phí (hard paywall). runs = trần ĐỜI theo key; ip_hash chặn xoá-localStorage-lấy-quota-mới.';

create table if not exists public.anon_preview_hits (
  id      bigserial primary key,
  ts      timestamptz not null default now(),
  key     text,
  ip_hash text,
  tool_id text
);

create index if not exists anon_preview_hits_ts_idx    on public.anon_preview_hits (ts desc);
create index if not exists anon_preview_hits_ip_ts_idx on public.anon_preview_hits (ip_hash, ts desc);

-- Chỉ service key chạm được (route server). Không policy nào = không ai đọc qua
-- anon/authenticated key — cùng cách đã dùng cho portrait_cache/anon_rail_trial.
alter table public.anon_preview_trial enable row level security;
alter table public.anon_preview_hits  enable row level security;

-- ── Cấu hình (đổi bằng SQL, không cần deploy) ─────────────────
-- Đặt BẤT KỲ trần nào về 0 là TẮT hẳn phần xem trước — lúc đó tool quay về
-- hành vi cũ: không có chữ AI nào trước khi trả tiền.
insert into public.app_config (key, value, note) values
  ('preview.free_runs', to_jsonb(3),
   'Số lá số được sinh bản luận xem trước MIỄN PHÍ, trần ĐỜI theo user_id/anon_id. 0 = tắt hẳn xem trước.'),
  ('preview.ip_daily_cap', to_jsonb(40),
   'Trần lượt xem trước theo ip_hash mỗi ngày (giờ VN). Nới tay vì NAT nhà mạng gộp nhiều người thật vào 1 IP.'),
  ('preview.global_daily_cap', to_jsonb(400),
   'Cầu dao ngân sách: tổng lượt xem trước toàn hệ thống mỗi ngày. 400 x ~486d/luot ~ 194.000d/ngay ~ 5,8tr/thang. NÂNG khi mở van quảng cáo, HẠ khi muốn siết.')
on conflict (key) do nothing;   -- đã set rồi thì giữ giá trị Henry đang dùng

-- ── RPC: xin MỘT lượt xem trước (nguyên tử) ───────────────────
-- Trả jsonb {allowed, reason, left}. reason: 'ok' | 'disabled' | 'key_cap'
-- | 'ip_cap' | 'global_cap'.
--
-- Tăng đếm NGAY khi cấp phép, KHÔNG đợi model trả xong: lượt đã gọi model là đã
-- tốn tiền kể cả khi model lỗi sau đó. Đếm sau khi thành công là mở đường gọi
-- model rồi tự ngắt kết nối để khỏi bị tính.
create or replace function public.anon_preview_consume(
  p_key     text,
  p_ip_hash text,
  p_tool_id text
) returns jsonb
language plpgsql security definer set search_path = 'public', 'pg_temp' as $$
declare
  v_key_cap    int;
  v_ip_cap     int;
  v_global_cap int;
  v_day_start  timestamptz;
  v_used_key   int;
  v_used_ip    int;
  v_used_glob  int;
begin
  if p_key is null or length(p_key) < 6 then
    return jsonb_build_object('allowed', false, 'reason', 'disabled', 'left', 0);
  end if;

  select coalesce((value #>> '{}')::int, 0) into v_key_cap    from app_config where key = 'preview.free_runs';
  select coalesce((value #>> '{}')::int, 0) into v_ip_cap     from app_config where key = 'preview.ip_daily_cap';
  select coalesce((value #>> '{}')::int, 0) into v_global_cap from app_config where key = 'preview.global_daily_cap';
  v_key_cap    := coalesce(v_key_cap, 0);
  v_ip_cap     := coalesce(v_ip_cap, 0);
  v_global_cap := coalesce(v_global_cap, 0);

  if v_key_cap <= 0 or v_ip_cap <= 0 or v_global_cap <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'disabled', 'left', 0);
  end if;

  -- Ngày theo GIỜ VN, không phải UTC — cùng quy ước với hai cầu dao đã có.
  v_day_start := (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')) at time zone 'Asia/Ho_Chi_Minh';

  -- ⚠️ `anon_preview_trial.runs` phải ghi rõ TÊN BẢNG: `runs` cũng là tên biến
  -- OUT của nhiều hàm khác trong repo và `RETURNS TABLE` từng chết vì
  -- 42702 ambiguous (xem docs/luat/postgres.md).
  select coalesce(t.runs, 0) into v_used_key
    from anon_preview_trial t where t.key = p_key;
  v_used_key := coalesce(v_used_key, 0);
  if v_used_key >= v_key_cap then
    return jsonb_build_object('allowed', false, 'reason', 'key_cap', 'left', 0);
  end if;

  select count(*) into v_used_glob from anon_preview_hits h where h.ts >= v_day_start;
  if v_used_glob >= v_global_cap then
    return jsonb_build_object('allowed', false, 'reason', 'global_cap', 'left', v_key_cap - v_used_key);
  end if;

  if p_ip_hash is not null then
    select count(*) into v_used_ip
      from anon_preview_hits h where h.ip_hash = p_ip_hash and h.ts >= v_day_start;
    if v_used_ip >= v_ip_cap then
      return jsonb_build_object('allowed', false, 'reason', 'ip_cap', 'left', v_key_cap - v_used_key);
    end if;
  end if;

  insert into anon_preview_trial (key, ip_hash, runs)
       values (p_key, p_ip_hash, 1)
  on conflict (key) do update
     set runs = anon_preview_trial.runs + 1,
         ip_hash = coalesce(excluded.ip_hash, anon_preview_trial.ip_hash),
         last_seen_at = now();

  insert into anon_preview_hits (key, ip_hash, tool_id) values (p_key, p_ip_hash, p_tool_id);

  return jsonb_build_object(
    'allowed', true, 'reason', 'ok',
    'left', v_key_cap - (v_used_key + 1)
  );
end;
$$;

-- SECURITY DEFINER mới LUÔN sinh ra hở nếu không thu quyền: mặc định Postgres
-- cấp EXECUTE cho PUBLIC, tức `anon` key gọi thẳng được và tự tiêu quota của
-- người khác. Thu trước rồi mới cấp cho service_role (xem CLAUDE.md ⛔ Postgres).
revoke all on function public.anon_preview_consume(text, text, text) from public, anon, authenticated;
grant execute on function public.anon_preview_consume(text, text, text) to service_role;

-- ── CACHE bản luận xem trước ─────────────────────────────────
-- Vì sao KHÔNG dùng lại hai kho có sẵn:
--   • `portrait_cache` (qua `cacheFor`) buộc chặt vào `PortraitToolId` + bảng
--     lịch sử riêng của từng tool + `userOwnsLaso` — toàn bộ ngữ nghĩa "ai đã
--     TRẢ TIỀN cho lá số này". Bản xem trước thì ngược hẳn: chưa ai trả gì.
--   • `laso_public` là bảng CÓ MẶT ĐỐI NGOẠI (trang công khai, Lịch sử). Ghi
--     vào đó cho một lá số chưa ai mua là đẻ ra bản ghi người dùng không hề
--     yêu cầu.
-- Nên: một bảng riêng, nhỏ, chỉ đường xem trước đụng tới.
--
-- 🔑 KHOÁ gồm cả TÊN người xem: prompt có dòng "Người xem: <tên> (giới tính)"
-- nên lời luận xưng hô theo tên. Bỏ tên khỏi khoá là trả bản gọi "chị Lan" cho
-- một anh Nam — sai kiểu im lặng và rất khó lần ra. Đổi lại tỉ lệ trúng cache
-- thấp hơn; chấp nhận, vì việc chính của cache này là để LƯỢT TẢI LẠI TRANG
-- không đốt thêm một lượt model VÀ một suất quota của chính người đó.
create table if not exists public.luan_preview_cache (
  key        text primary key,          -- sha256(laSoText|phan|namXem|gioiTinh|hoTen)
  tool_id    text not null,
  phan       int  not null,
  noi_dung   text not null,
  created_at timestamptz not null default now(),
  hit_count  int not null default 0,
  last_hit_at timestamptz
);

comment on table public.luan_preview_cache is
  'Bản luận XEM TRƯỚC miễn phí (hard paywall), khoá theo nội dung lá số + phần + năm xem + tên người xem. Không phải kho quyền sở hữu — xem portrait_cache/laso_public cho việc đó.';

alter table public.luan_preview_cache enable row level security;

-- Đếm lượt trúng cache. Hàm riêng thay vì UPDATE thẳng từ route: bảng đang bật
-- RLS không policy, và một RPC nhỏ rẻ hơn một round-trip PATCH có điều kiện.
create or replace function public.luan_preview_cache_touch(p_key text)
returns void language sql security definer set search_path = 'public', 'pg_temp' as $$
  update luan_preview_cache
     set hit_count = luan_preview_cache.hit_count + 1, last_hit_at = now()
   where luan_preview_cache.key = p_key;
$$;

revoke all on function public.luan_preview_cache_touch(text) from public, anon, authenticated;
grant execute on function public.luan_preview_cache_touch(text) to service_role;

-- Dọn bản xem trước cũ: đây là kho TẠM để chặn chi phí lặp trong một phiên, giữ
-- vô hạn là phình một bảng không ai đọc lại. 30 ngày dư sức cho mục đích đó.
create or replace function public.luan_preview_cache_prune()
returns int language sql security definer set search_path = 'public', 'pg_temp' as $$
  with d as (delete from luan_preview_cache where created_at < now() - interval '30 days' returning 1)
  select count(*)::int from d;
$$;

revoke all on function public.luan_preview_cache_prune() from public, anon, authenticated;
grant execute on function public.luan_preview_cache_prune() to service_role;

-- Dọn nhật ký cũ: chỉ cần 2 ngày để đếm theo ngày, giữ lâu hơn là phình vô ích.
create or replace function public.anon_preview_hits_prune()
returns int language sql security definer set search_path = 'public', 'pg_temp' as $$
  with d as (delete from anon_preview_hits where ts < now() - interval '2 days' returning 1)
  select count(*)::int from d;
$$;

revoke all on function public.anon_preview_hits_prune() from public, anon, authenticated;
grant execute on function public.anon_preview_hits_prune() to service_role;

commit;
