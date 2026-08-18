-- ============================================================
-- MÃ KHUYẾN MÃI — bảng mã + sổ đã dùng + RPC đổi mã
--
-- Sinh ra để phục vụ clip TikTok: câu kết đọc "nhập mã TUVIMINHBAO nhận ngay
-- 100 lượng". Không có bảng này thì mã in trên clip là một lời hứa không có gì
-- đỡ ở phía sau.
--
-- 🔑 BA CHỐT CHẶN, đặt Ở TẦNG DB chứ không ở mã ứng dụng — đây là đường PHÁT
-- TIỀN, mà bài học lặp lại nhiều lần trong repo này là "để DB từ chối, đừng để
-- mã ứng dụng nhớ hộ" (cùng lối `portrait_cache`, `user_memory`,
-- `onboarding_tasks`):
--   1. UNIQUE trên `user_id` của `promo_redemptions` — MỘT tài khoản đổi được
--      ĐÚNG MỘT mã trọn đời, kể cả khi sau này có nhiều chiến dịch.
--   2. `max_uses` — trần tổng lượt đổi của từng mã, chốt ngay trong RPC.
--   3. `PROMO_MAX_CREDITS` — trần tuyệt đối mỗi lượt. Bảng sửa được bằng SQL
--      nên một lần gõ thừa số 0 là phát cả gia tài; chốt này làm lỗi đó dừng
--      lại TRƯỚC khi chạm ví.
--
-- ⚠️ Vì sao UNIQUE(user_id) chứ không phải UNIQUE(user_id, code): cho một
-- người gom nhiều mã là nhân bề mặt lạm dụng lên theo số chiến dịch. Nới một
-- ràng buộc về sau thì dễ; siết lại sau khi đã bị farm thì không.
-- ============================================================

-- ── Bảng mã ───────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  code            text primary key,
  credits         integer not null check (credits >= 0),
  enabled         boolean not null default true,
  -- null = không giới hạn. Đây là cần gạt ngân sách chính.
  max_uses        integer check (max_uses is null or max_uses >= 0),
  used_count      integer not null default 0,
  expires_at      timestamptz,
  -- Chỉ cho tài khoản mới (tính theo `auth.users.created_at`). null = không
  -- giới hạn tuổi tài khoản. Mặc định 30 ngày: đủ rộng cho luồng thật (xem
  -- clip → đăng ký → gõ mã, tính bằng phút) mà vẫn chặn được ca "mọi tài
  -- khoản cũ cùng lúc đổi mã".
  new_account_days integer check (new_account_days is null or new_account_days > 0),
  -- Bắt buộc đăng nhập bằng OAuth (Google/Facebook/…) mới đổi được mã.
  -- 🔑 Đây là chốt chống lạm dụng CHÍNH, thay cho trần lượt. Lý do chọn nó:
  -- đo trên 62 tài khoản thật thì 55 Google + 1 Facebook, chỉ 6 email và lượt
  -- email gần nhất cách 3 tháng ⇒ chốt này gần như KHÔNG chặn người thật, mà
  -- đẩy giá một tài khoản giả lên rất cao. Trần lượt thì ngược lại: nó chặn
  -- đúng phần tăng trưởng thật mình đang muốn.
  require_oauth   boolean not null default true,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Sổ đã dùng ────────────────────────────────────────────────────────────
create table if not exists public.promo_redemptions (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  code            text not null references public.promo_codes(code) on delete restrict,
  credits_granted integer not null,
  redeemed_at     timestamptz not null default now()
);
create index if not exists idx_promo_redemptions_code on public.promo_redemptions(code, redeemed_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────
-- `promo_codes` CÓ policy đọc cho mọi người: trang nạp Lượng cần hiện "mã X
-- tặng N Lượng" trước khi người ta gõ, và đó vốn là thông tin công khai (in
-- thẳng trên clip). Ghi thì chỉ admin.
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

drop policy if exists promo_codes_read on public.promo_codes;
create policy promo_codes_read on public.promo_codes
  for select using (enabled = true);

drop policy if exists promo_codes_admin_all on public.promo_codes;
create policy promo_codes_admin_all on public.promo_codes
  for all using ((auth.jwt() ->> 'email') = 'admin@tuviminhbao.com')
  with check ((auth.jwt() ->> 'email') = 'admin@tuviminhbao.com');

-- Sổ đã dùng: chủ sở hữu đọc dòng của chính mình. Ghi CHỈ qua RPC/service key.
drop policy if exists promo_redemptions_own on public.promo_redemptions;
create policy promo_redemptions_own on public.promo_redemptions
  for select using (auth.uid() = user_id);

drop policy if exists promo_redemptions_admin_read on public.promo_redemptions;
create policy promo_redemptions_admin_read on public.promo_redemptions
  for select using ((auth.jwt() ->> 'email') = 'admin@tuviminhbao.com');

-- ── RPC đổi mã ────────────────────────────────────────────────────────────
-- Gói TRỌN một giao dịch: kiểm mã → ghi dấu → cộng Lượng → ghi sổ giao dịch.
--
-- ⚠️ THỨ TỰ "ghi dấu TRƯỚC, cộng tiền SAU" là CỐ Ý, chép từ `onboarding_task_claim`:
-- hai chiều hỏng KHÔNG đối xứng. Cộng trước mà lỗi ⇒ cộng hai lần (phát không
-- tiền, không phát hiện được). Ghi dấu trước mà lỗi ⇒ thiếu một lần, và đối
-- soát được vì `promo_redemptions` còn dòng.
create or replace function public.promo_code_redeem(p_user_id uuid, p_code text)
returns table (ok boolean, reason text, credits integer, code text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  -- Trần tuyệt đối mỗi lượt đổi. Xem lý do ở đầu file.
  PROMO_MAX_CREDITS constant integer := 1000;
  v_code   text := upper(btrim(coalesce(p_code, '')));
  v_row    public.promo_codes%rowtype;
  v_rows   integer := 0;
  v_created timestamptz;
  v_has_oauth boolean;
begin
  if p_user_id is null or v_code = '' then
    return query select false, 'invalid_input', 0, v_code; return;
  end if;

  -- Khoá dòng mã lại: `used_count` bị hai lượt đổi song song đọc cùng lúc thì
  -- trần `max_uses` vượt được. Đây là dòng đơn lẻ nên khoá rất ngắn.
  select * into v_row from public.promo_codes where promo_codes.code = v_code for update;
  if not found then
    return query select false, 'not_found', 0, v_code; return;
  end if;
  if not v_row.enabled then
    return query select false, 'disabled', 0, v_code; return;
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    return query select false, 'expired', 0, v_code; return;
  end if;
  if v_row.max_uses is not null and v_row.used_count >= v_row.max_uses then
    return query select false, 'exhausted', 0, v_code; return;
  end if;
  if v_row.credits < 0 or v_row.credits > PROMO_MAX_CREDITS then
    -- Kiểm TRƯỚC bước chống-trùng: giá vô lý là lỗi cấu hình, phải kêu to chứ
    -- không được lặng lẽ đọc thành "đã dùng rồi".
    raise exception 'promo_code_redeem: credits ngoài khoảng cho phép (%)', v_row.credits;
  end if;

  if v_row.require_oauth then
    -- Từ chối khi provider DUY NHẤT là 'email'. Dò theo cách này chứ không
    -- allowlist ['google','facebook']: thêm Zalo/Apple sau này là tự chạy, và
    -- tài khoản email đã liên kết thêm Google vẫn qua (có thật 1 dòng như vậy).
    select exists (
      select 1 from auth.users u,
        lateral jsonb_array_elements_text(coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb)) p
       where u.id = p_user_id and p <> 'email'
    ) into v_has_oauth;
    if not coalesce(v_has_oauth, false) then
      return query select false, 'need_oauth', 0, v_code; return;
    end if;
  end if;

  if v_row.new_account_days is not null then
    select created_at into v_created from auth.users where id = p_user_id;
    if v_created is null or v_created < now() - make_interval(days => v_row.new_account_days) then
      return query select false, 'account_too_old', 0, v_code; return;
    end if;
  end if;

  -- Chống đổi hai lần — để KHOÁ CHÍNH từ chối, không kiểm bằng SELECT trước
  -- (kiểm-rồi-ghi có khe đua giữa hai lượt gọi cùng lúc).
  insert into public.promo_redemptions (user_id, code, credits_granted)
  values (p_user_id, v_code, v_row.credits)
  on conflict (user_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return query select false, 'already_redeemed', 0, v_code; return;
  end if;

  update public.promo_codes
     set used_count = used_count + 1, updated_at = now()
   where promo_codes.code = v_code;

  if v_row.credits > 0 then
    perform public.add_credits(p_user_id, v_row.credits);
    insert into public.credit_transactions (user_id, amount, type, description)
    values (p_user_id, v_row.credits, 'promo_code', 'Mã khuyến mãi: ' || v_code);
  end if;

  return query select true, 'ok', v_row.credits, v_code;
end;
$$;

-- 🔐 EXECUTE cho PUBLIC là DỰNG SẴN của Postgres — hàm SECURITY DEFINER mới
-- nào cũng sinh ra hở, `ALTER DEFAULT PRIVILEGES` không gỡ được. Đây là hàm
-- GHI (cộng Lượng) nên phải revoke tường minh, đúng lớp lỗi đã bắt hai lần ở
-- `anon_rail_*` và `marketing_signup_truth`.
revoke all on function public.promo_code_redeem(uuid, text) from public, anon, authenticated;
grant execute on function public.promo_code_redeem(uuid, text) to service_role;

-- ── Mã của chiến dịch clip TikTok ─────────────────────────────────────────
-- ⚠️ `max_uses = null` CÓ CHỦ Ý: càng nhiều người đăng ký càng tốt, nên không
-- đặt một con số chặn ngang tăng trưởng. Chống lạm dụng dựa vào `require_oauth`
-- (xem chú thích ở cột đó) chứ không dựa vào trần.
-- Con số để biết mình đang tiêu gì: 100 Lượng ≈ 4 lượt tool sinh ảnh ≈ 4.400đ
-- chi phí model THẬT (không phải 82.900đ giá bán lẻ). Muốn phanh gấp thì đặt
-- `max_uses` hoặc TẮT mã trong Admin — một cú bấm, không cần deploy.
insert into public.promo_codes (code, credits, max_uses, new_account_days, note)
values ('TUVIMINHBAO', 100, null, 30, 'Mã đọc trong clip TikTok/Reels demo công cụ')
on conflict (code) do nothing;
