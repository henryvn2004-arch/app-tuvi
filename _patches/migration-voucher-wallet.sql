-- ============================================================
-- VÍ ƯU ĐÃI — voucher_defs + user_vouchers — M1 track marketing "kiểu Shopee"
-- ============================================================
-- Henry chốt xây "Ví Ưu Đãi", bắt đầu bằng bảng. File này CHỈ dựng schema +
-- 3 RPC lõi (cấp/tiêu/liệt kê) — CHƯA nối vào `/api/payment` (handleDeduct)
-- và CHƯA có cơ chế cấp tự động (48h chào sân, đơn rơi, hồi sinh…). Đó là
-- bước kế tiếp, cố tình để riêng.
--
-- ── Vì sao TÁCH khỏi `promo_codes` (đã có, migration-promo-codes.sql) ──
-- `promo_codes` là "nhập mã nhận thẳng Lượng" (cộng tiền vào ví, không gắn
-- với một đơn hàng cụ thể). Voucher ở đây là "giảm giá cho ĐÚNG một lượt
-- mua tool" — khác bản chất, không dùng chung bảng để khỏi ép một schema
-- gánh hai nghĩa.
--
-- ── Thiết kế theo đúng 3 luật Postgres đã ghi trong CLAUDE.md ──
--  1. `user_vouchers` UNIQUE(user_id, voucher_id) — CHỐT CHẶN Ở DB, không để
--     mã ứng dụng tự nhớ "đã cấp chưa" (đúng bài học `promo_redemptions`).
--     Bắt đầu SIẾT (1 voucher/người/campaign, suốt đời) — nới sau nếu cần
--     thật, không phát dư luôn từ đầu để tránh phải siết lại khi đã bị farm.
--  2. `voucher_consume` là UPDATE NGUYÊN TỬ (WHERE redeemed_at IS NULL) —
--     cùng khuôn `rail_free_consume` đã có, chống tiêu trùng khi 2 tab cùng
--     bấm. KHÔNG tin `discount_credits` từ caller — hàm tự tính TRẦN giảm từ
--     CHÍNH `voucher_defs` (kind/value/max_discount_credits), giống chốt
--     `PROMO_MAX_CREDITS` của promo_codes.
--  3. SECURITY DEFINER mới → REVOKE ALL FROM public/anon/authenticated +
--     SET search_path — cả 3 RPC dưới đây đều có ngay từ đầu, không đợi vá.
--
-- `max_redemptions_total` (trần suất/campaign) tính bằng COUNT thô, KHÔNG
-- khoá dòng — cùng cách `anon_rail_trial_consume` đã chấp nhận cho trần
-- NGÂN SÁCH mềm (lệch 1-2 suất dưới tải đồng thời cao là chấp nhận được,
-- khác hẳn UNIQUE per-user là chốt CỨNG chống double-grant).
-- ============================================================

begin;

-- ── Bảng ĐỊNH NGHĨA voucher (campaign) ─────────────────────────────────
create table if not exists public.voucher_defs (
  id                    text primary key,  -- slug, vd 'chao-san-48h', 'sale-tet-2026'
  label                 text not null,     -- tên hiển thị Admin/client
  kind                  text not null check (kind in ('percent','flat_credits')),
  -- percent: 1-100 (giảm %, có thể kèm trần). flat_credits: số Lượng giảm thẳng.
  value                 int  not null check (value > 0),
  -- Trần giảm (Lượng) khi kind='percent' — % không giới hạn dễ vượt kiểm soát
  -- trên đơn to. null = không trần (chỉ dùng cho campaign đã cân nhắc kỹ).
  max_discount_credits  int  check (max_discount_credits is null or max_discount_credits > 0),
  scope                 text not null check (scope in ('site','tool')),
  -- Khi scope='tool': danh sách tool_id áp dụng. null/rỗng khi scope='site'.
  -- `scope` CŨNG là nhóm STACK — quy tắc "tối đa 1 voucher sàn + 1 voucher
  -- tool" tính bằng đúng cột này ở tầng gọi (chưa áp dụng trong PR này).
  tool_ids              text[],
  enabled               boolean not null default true,
  starts_at             timestamptz,
  ends_at               timestamptz,
  max_redemptions_total int check (max_redemptions_total is null or max_redemptions_total > 0),
  min_purchase_credits  int check (min_purchase_credits is null or min_purchase_credits > 0),
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint voucher_defs_percent_range check (kind <> 'percent' or value <= 100)
);

comment on table public.voucher_defs is
  'Định nghĩa MỘT campaign voucher (Admin sửa, không cần deploy). Không phải nơi lưu ai đang giữ voucher — xem user_vouchers.';

-- ── Bảng voucher ĐÃ CẤP cho từng user ───────────────────────────────────
create table if not exists public.user_vouchers (
  id                        bigserial primary key,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  voucher_id                text not null references public.voucher_defs(id),
  granted_at                timestamptz not null default now(),
  -- Trigger nào cấp — cho báo cáo sau này: 'signup_48h' | 'preview_abandon' |
  -- 'purchase_bonus' | 'winback' | 'admin_manual' | 'birthday' | ...
  granted_reason            text not null,
  -- Hạn RIÊNG của lượt cấp này — có thể NGẮN hơn `voucher_defs.ends_at`
  -- (vd "chào sân 48h" tính từ lúc đăng ký, không phải từ lúc campaign mở).
  expires_at                timestamptz,
  redeemed_at               timestamptz,
  redeemed_slug             text,   -- slug đơn hàng đã tiêu — đối chiếu credit_transactions.slug
  redeemed_discount_credits int,
  unique (user_id, voucher_id)
);

comment on table public.user_vouchers is
  'Voucher đã CẤP cho một user cụ thể. UNIQUE(user_id,voucher_id): mỗi user tối đa 1 lượt cấp/campaign, suốt đời — chốt CỨNG chống double-grant, không phải chỗ ứng dụng tự nhớ.';

create index if not exists user_vouchers_user_avail_idx on public.user_vouchers (user_id) where redeemed_at is null;
create index if not exists user_vouchers_voucher_idx    on public.user_vouchers (voucher_id);

alter table public.voucher_defs  enable row level security;
alter table public.user_vouchers enable row level security;

-- Catalog công khai (đã bật) — cùng cách tool_pricing cho client đọc thẳng
-- qua anon key để hiện UI, không cần route riêng.
drop policy if exists voucher_defs_public_read on public.voucher_defs;
create policy voucher_defs_public_read on public.voucher_defs
  for select using (enabled = true);

-- Mỗi user chỉ đọc được voucher CỦA CHÍNH MÌNH — cùng khuôn rail_free_turns.
drop policy if exists user_vouchers_self_read on public.user_vouchers;
create policy user_vouchers_self_read on public.user_vouchers
  for select using (auth.uid() = user_id);

-- ── RPC 1: CẤP một voucher cho user ─────────────────────────────────────
-- Idempotent theo (user_id, voucher_id): gọi lại không cấp thêm, không lỗi.
-- Trả về id dòng MỚI nếu cấp thành công; null nếu đã có từ trước / campaign
-- tắt / ngoài khung ngày / hết suất.
create or replace function public.voucher_grant(
  p_user_id     uuid,
  p_voucher_id  text,
  p_reason      text,
  p_expires_at  timestamptz default null
) returns bigint
language plpgsql security definer set search_path = 'public' as $$
declare
  v_def        record;
  v_total_used int;
  v_new_id     bigint;
begin
  select * into v_def from voucher_defs where id = p_voucher_id;
  if not found or v_def.enabled = false then return null; end if;
  if v_def.starts_at is not null and now() < v_def.starts_at then return null; end if;
  if v_def.ends_at   is not null and now() >= v_def.ends_at   then return null; end if;

  if v_def.max_redemptions_total is not null then
    select count(*) into v_total_used from user_vouchers where voucher_id = p_voucher_id;
    if v_total_used >= v_def.max_redemptions_total then return null; end if;
  end if;

  insert into user_vouchers (user_id, voucher_id, granted_reason, expires_at)
       values (p_user_id, p_voucher_id, p_reason, p_expires_at)
  on conflict (user_id, voucher_id) do nothing
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke execute on function public.voucher_grant(uuid, text, text, timestamptz) from public, anon, authenticated;
grant  execute on function public.voucher_grant(uuid, text, text, timestamptz) to service_role;

-- ── RPC 2: TIÊU một voucher cho đúng đơn đang thanh toán ────────────────
-- Server (TypeScript) tính GIÁ THẬT trước (effectivePrice) rồi truyền
-- p_price_credits vào đây; hàm tự tính TRẦN giảm từ CHÍNH voucher_defs —
-- KHÔNG tin discount do caller tự khai. UPDATE nguyên tử (WHERE redeemed_at
-- IS NULL) chống tiêu trùng.
create or replace function public.voucher_consume(
  p_user_id          uuid,
  p_user_voucher_id  bigint,
  p_price_credits    int,
  p_slug             text
) returns jsonb
language plpgsql security definer set search_path = 'public' as $$
declare
  v_row      record;
  v_discount int;
begin
  select uv.redeemed_at, uv.expires_at,
         vd.kind, vd.value, vd.max_discount_credits,
         vd.enabled as def_enabled, vd.starts_at as def_starts_at, vd.ends_at as def_ends_at
    into v_row
    from user_vouchers uv
    join voucher_defs  vd on vd.id = uv.voucher_id
   where uv.id = p_user_voucher_id and uv.user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.redeemed_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  end if;
  if v_row.expires_at is not null and now() >= v_row.expires_at then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if v_row.def_enabled = false then
    return jsonb_build_object('ok', false, 'reason', 'campaign_disabled');
  end if;
  if v_row.def_starts_at is not null and now() < v_row.def_starts_at then
    return jsonb_build_object('ok', false, 'reason', 'not_started');
  end if;
  if v_row.def_ends_at is not null and now() >= v_row.def_ends_at then
    return jsonb_build_object('ok', false, 'reason', 'campaign_ended');
  end if;

  if v_row.kind = 'percent' then
    v_discount := floor(p_price_credits * v_row.value / 100.0);
    if v_row.max_discount_credits is not null then
      v_discount := least(v_discount, v_row.max_discount_credits);
    end if;
  else
    v_discount := v_row.value;
  end if;
  v_discount := greatest(0, least(v_discount, p_price_credits));

  update user_vouchers
     set redeemed_at = now(), redeemed_slug = p_slug, redeemed_discount_credits = v_discount
   where id = p_user_voucher_id and user_id = p_user_id and redeemed_at is null;

  if not found then
    -- Lượt gọi song song khác đã tiêu mất giữa lúc SELECT và UPDATE ở trên.
    return jsonb_build_object('ok', false, 'reason', 'race_lost');
  end if;

  return jsonb_build_object('ok', true, 'discount_credits', v_discount);
end;
$$;

revoke execute on function public.voucher_consume(uuid, bigint, int, text) from public, anon, authenticated;
grant  execute on function public.voucher_consume(uuid, bigint, int, text) to service_role;

-- ── RPC 3: LIỆT KÊ voucher đang dùng được của một user ───────────────────
-- Chỉ đọc — cho UI "Ví Ưu Đãi" sau này. Lọc sẵn: chưa tiêu, chưa hết hạn
-- (cả hạn RIÊNG của lượt cấp lẫn khung ngày của campaign), campaign còn bật.
create or replace function public.voucher_list_active(p_user_id uuid)
returns jsonb
language sql security definer set search_path = 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_voucher_id',      uv.id,
    'voucher_id',           uv.voucher_id,
    'label',                vd.label,
    'kind',                 vd.kind,
    'value',                vd.value,
    'max_discount_credits', vd.max_discount_credits,
    'scope',                vd.scope,
    'tool_ids',             vd.tool_ids,
    'min_purchase_credits', vd.min_purchase_credits,
    'expires_at',           uv.expires_at
  ) order by uv.expires_at nulls last), '[]'::jsonb)
  from user_vouchers uv
  join voucher_defs  vd on vd.id = uv.voucher_id
 where uv.user_id = p_user_id
   and uv.redeemed_at is null
   and (uv.expires_at is null or uv.expires_at > now())
   and vd.enabled = true
   and (vd.starts_at is null or now() >= vd.starts_at)
   and (vd.ends_at   is null or now() <  vd.ends_at);
$$;

revoke execute on function public.voucher_list_active(uuid) from public, anon, authenticated;
grant  execute on function public.voucher_list_active(uuid) to service_role;

commit;
