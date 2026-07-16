-- migration-signup-signals.sql  (PR4b — theo dõi IP/thiết bị + cap thưởng Lượng theo thiết bị)
-- ============================================================
-- Phần 2/2 chống lạm dụng thưởng Lượng (hướng NHẸ + theo dõi).
--   • Bảng signup_signals: mỗi user 1 dòng — ip_hash (băm, KHÔNG lưu IP thô, riêng
--     tư) + device_id (fingerprint client, localStorage) + bonus_amount + clawed.
--     IP chỉ để THEO DÕI (không cap vì CGNAT di động dễ dính oan nhiều người 1 IP).
--   • CAP theo THIẾT BỊ: quá N lần nhận thưởng từ CÙNG device_id trong 24h → thu hồi
--     (claw-back) quà của lần vượt. device_id per-browser → ít dính oan hơn IP.
--     Cap đọc từ app_config 'credits.signup_bonus_device_cap' (mặc định 5; 0 = tắt).
--   • RPC revoke_signup_bonus: trừ Lượng an toàn (FOR UPDATE, floor 0) + ghi giao dịch
--     'signup_bonus_revoked'. Chỉ endpoint server (service key) gọi.
--
-- Endpoint POST /api/signup-signal (client gọi sau đăng nhập/đăng ký) ghi tín hiệu +
-- áp cap. Idempotent theo user_id.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

create table if not exists public.signup_signals (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  ip_hash      text,
  device_id    text,
  bonus_amount int,
  clawed       boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists signup_signals_device_idx on public.signup_signals(device_id, created_at desc);
create index if not exists signup_signals_ip_idx     on public.signup_signals(ip_hash, created_at desc);

-- RLS bật, KHÔNG policy client → chỉ service key (endpoint) đọc/ghi.
alter table public.signup_signals enable row level security;

insert into public.app_config (key, value, note) values
  ('credits.signup_bonus_device_cap', '5'::jsonb, 'Số lần tối đa nhận thưởng/thiết bị/24h; vượt thì thu hồi. 0 = tắt.')
on conflict (key) do nothing;

-- Thu hồi quà đăng ký an toàn: khoá dòng, trừ tối đa tới 0, ghi giao dịch âm.
create or replace function public.revoke_signup_bonus(p_user uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal int;
  v_ded int;
begin
  select balance into v_bal from public.user_credits where user_id = p_user for update;
  if v_bal is null then return 0; end if;
  v_ded := least(greatest(coalesce(p_amount, 0), 0), v_bal);
  if v_ded <= 0 then return 0; end if;
  update public.user_credits set balance = balance - v_ded where user_id = p_user;
  insert into public.credit_transactions (user_id, amount, type, description, created_at)
    values (p_user, -v_ded, 'signup_bonus_revoked', 'Thu hồi quà đăng ký (vượt giới hạn thiết bị)', now());
  return v_ded;
end;
$$;

grant execute on function public.revoke_signup_bonus(uuid, int) to service_role;
