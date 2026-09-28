-- migration-chat-accounts.sql
-- ============================================================
-- TÀI KHOẢN TỪ KÊNH CHAT (Zalo OA · Messenger · WhatsApp · Telegram).
--
-- Người nhắn tin lần đầu qua kênh chat được tạo NGAY một tài khoản thật trong
-- auth.users ("tài khoản bóng" — email tổng hợp `<kênh>.<id>@chat.tuviminhbao.com`,
-- không hộp thư, lib/channels/account.ts). Vì là INSERT thường, KHÔNG ẩn danh,
-- trigger `on_auth_user_created` → `handle_new_user_signup()` tự cấp quà chào
-- mừng y hệt người đăng ký trên web — marketing chỉ chỉnh một chỗ
-- (`credits.signup_bonus_variants`) là áp cho mọi kênh.
--
-- File này thêm:
--   1. chat_user_id_by_email(email)  — tra lại user bóng khi createUser báo trùng
--      email (hai webhook cùng lúc, hoặc lượt trước chết giữa chừng).
--   2. chat_shadow_merges + chat_merge_shadow(shadow, real) — người đã có tài
--      khoản web bấm "Liên kết" ⇒ gộp tài khoản bóng vào tài khoản chính.
--   3. chat_handoff_tokens — link dùng một lần từ chat sang web, tự đăng nhập.
--   4. chat_login_codes — đăng nhập web bằng cách nhắn mã 6 số cho OA/Page.
--
-- Chạy TRƯỚC khi deploy code (code đọc/ghi các bảng này; thiếu bảng thì mọi
-- đường mới rơi về hành vi cũ — lượt free/ngày — chứ không sập kênh).
-- Idempotent: chạy lại vô hại.
-- ============================================================

-- 1. Tra user bóng theo email -------------------------------------------------
create or replace function public.chat_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id from auth.users u
  where lower(u.email) = lower(p_email)
    and lower(u.email) like '%@chat.tuviminhbao.com'
  limit 1;
$$;
revoke all on function public.chat_user_id_by_email(text) from public, anon, authenticated;

-- 2. Gộp tài khoản bóng vào tài khoản chính ----------------------------------
-- Dòng SỔ đi trước làm mutex (PRIMARY KEY đỡ bên dưới) ⇒ gọi trùng/đồng thời
-- chỉ một lượt chuyển tiền.
create table if not exists public.chat_shadow_merges (
  shadow_user_id uuid primary key references auth.users(id) on delete cascade,
  real_user_id   uuid not null references auth.users(id) on delete cascade,
  moved_credits  integer not null default 0,
  merged_at      timestamptz not null default now()
);
alter table public.chat_shadow_merges enable row level security;

-- Quà chào mừng chỉ tặng MỘT lần mỗi người: phần quà còn lại trong ví bóng
-- KHÔNG chuyển sang (tài khoản chính đã nhận quà của nó). Coi như quà được
-- tiêu TRƯỚC — tiền khách tự nạp luôn được chuyển đủ.
create or replace function public.chat_merge_shadow(p_shadow uuid, p_real uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows      integer;
  v_bal       integer;
  v_bonus     integer;
  v_spent     integer;
  v_bonus_left integer;
  v_move      integer;
begin
  if p_shadow is null or p_real is null or p_shadow = p_real then
    return 0;
  end if;
  -- Chỉ gộp tài khoản BÓNG — không bao giờ rút ví một tài khoản thật.
  if not exists (
    select 1 from auth.users u
    where u.id = p_shadow and lower(u.email) like '%@chat.tuviminhbao.com'
  ) then
    return 0;
  end if;

  insert into public.chat_shadow_merges (shadow_user_id, real_user_id)
  values (p_shadow, p_real)
  on conflict (shadow_user_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 0; -- đã gộp rồi
  end if;

  select uc.balance into v_bal
  from public.user_credits uc
  where uc.user_id = p_shadow
  for update;
  v_bal := coalesce(v_bal, 0);

  select coalesce(sum(ct.amount) filter (where ct.type = 'signup_bonus'), 0),
         coalesce(-sum(ct.amount) filter (where ct.amount < 0), 0)
    into v_bonus, v_spent
  from public.credit_transactions ct
  where ct.user_id = p_shadow;

  v_bonus_left := greatest(0, greatest(v_bonus, 0) - v_spent);
  v_move := greatest(0, v_bal - v_bonus_left);

  if v_move > 0 then
    update public.user_credits uc
      set balance = uc.balance - v_move
      where uc.user_id = p_shadow;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'chat_merge_shadow: không trừ được ví bóng %', p_shadow;
    end if;

    insert into public.user_credits (user_id, balance)
    values (p_real, v_move)
    on conflict (user_id) do update
      set balance = public.user_credits.balance + excluded.balance;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'chat_merge_shadow: không cộng được ví chính %', p_real;
    end if;

    insert into public.credit_transactions (user_id, amount, type, description, created_at)
    values
      (p_shadow, -v_move, 'chat_merge_out', 'Chuyển Lượng sang tài khoản chính khi liên kết', now()),
      (p_real,    v_move, 'chat_merge_in',  'Nhận Lượng từ tài khoản chat khi liên kết', now());
  end if;

  update public.chat_shadow_merges m
    set moved_credits = v_move
    where m.shadow_user_id = p_shadow;

  -- Sổ lá số đi theo người.
  insert into public.user_charts (user_id, label, birth, chart_key, relation, created_at, updated_at, last_used_at)
  select p_real, c.label, c.birth, c.chart_key, c.relation, c.created_at, now(), c.last_used_at
  from public.user_charts c
  where c.user_id = p_shadow
  on conflict (user_id, chart_key) do nothing;

  -- Kênh khác đang trỏ về tài khoản bóng → trỏ về tài khoản chính.
  update public.chat_links cl
    set user_id = p_real
    where cl.user_id = p_shadow;

  return v_move;
end;
$$;
revoke all on function public.chat_merge_shadow(uuid, uuid) from public, anon, authenticated;

-- 3. Link dùng một lần từ chat sang web --------------------------------------
create table if not exists public.chat_handoff_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  next_path  text not null default '/app',
  birth      jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists chat_handoff_tokens_expires_idx on public.chat_handoff_tokens (expires_at);
alter table public.chat_handoff_tokens enable row level security;

-- 4. Đăng nhập web bằng mã nhắn qua chat --------------------------------------
-- `code` (6 số) người dùng nhắn cho OA/Page; `poll_key` (bí mật, chỉ trình
-- duyệt tạo mã giữ) để lấy phiên khi mã đã được nhận — biết mã thôi không đủ.
create table if not exists public.chat_login_codes (
  code       text primary key,
  poll_key   text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_id    uuid references auth.users(id) on delete cascade,
  platform   text,
  claimed_at timestamptz,
  used_at    timestamptz
);
create index if not exists chat_login_codes_expires_idx on public.chat_login_codes (expires_at);
alter table public.chat_login_codes enable row level security;
