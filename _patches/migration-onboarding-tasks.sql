-- M3 — nhiệm vụ onboarding chia nhỏ (backlog đối thủ, mục M3)
--
-- BỐI CẢNH ĐO ĐƯỢC TRƯỚC KHI VIẾT (07/08): 48 người đã nhận 25 Lượng quà đăng
-- ký (1.200 Lượng phát ra). Đổi lại, sau 4 tháng: 3 liên kết kênh chat · 2 lượt
-- bật thông báo · 2 dòng `user_charts` của ĐÚNG 1 người · **0 dòng `referrals`**.
-- Phát tiền mà không hỏi lại gì thì không nhận lại gì.
--
-- 🔑 QUYẾT ĐỊNH: **KHÔNG cắt 25 Lượng quà đăng ký ra chia cho từng nhiệm vụ.**
-- Cắt ra thì người mới cầm 5 Lượng và không chạy nổi tool nào (rẻ nhất 5, phần
-- lớn 15–30) — đó là siết đầu phễu vốn đã hỏng (60 tài khoản → 3 người trả
-- tiền). Nhiệm vụ là phần CỘNG THÊM. Lượng không phải tiền mặt: chi phí thật là
-- lượt gọi model lúc họ tiêu, mà làm cho họ tiêu chính là mục đích. Cầu dao ảnh
-- free (`viral.free_gen_daily_cap`) vẫn gác phần đắt tiền nên đúc thêm Lượng
-- không thủng ngân sách.

-- ── Bảng ────────────────────────────────────────────────────────────────────
-- 🔑 KHOÁ CHÍNH `(user_id, task_key)` CHÍNH LÀ chốt chống nhận hai lần. Không
-- dựng cờ riêng rồi tự đi kiểm — cùng mẹo đã dùng ở `portrait_cache`: để DB từ
-- chối, đừng để mã ứng dụng nhớ hộ.
create table if not exists public.onboarding_tasks (
  user_id  uuid        not null references auth.users(id) on delete cascade,
  task_key text        not null,
  credits  integer     not null default 0,
  done_at  timestamptz not null default now(),
  primary key (user_id, task_key)
);

create index if not exists onboarding_tasks_done_idx on public.onboarding_tasks (done_at desc);

-- RLS bật, **0 policy** = chỉ service key chạm được. Trang không đọc thẳng bảng
-- này; nó đi qua endpoint có auth (`action=onboarding-sync`) vì phần thưởng là
-- tiền — client tự khai "tôi làm rồi" không phải bằng chứng.
alter table public.onboarding_tasks enable row level security;

-- ── RPC nhận thưởng ─────────────────────────────────────────────────────────
-- Nguyên tử trong MỘT transaction: chèn dấu → chỉ khi CHÈN ĐƯỢC mới cộng Lượng
-- và ghi sổ giao dịch. Trả về số Lượng vừa cộng, hoặc 0 nếu đã nhận trước đó.
--
-- ⚠️ Thứ tự chèn-dấu-TRƯỚC là CỐ Ý. Hai chiều hỏng không đối xứng: cộng tiền
-- trước rồi chèn dấu mà lỗi ⇒ cộng hai lần (phát không tiền); chèn dấu trước mà
-- lỗi ⇒ thiếu một lần (đọc `onboarding_tasks` ra là đối soát được). Ở đây cả
-- hai nằm trong một transaction nên không rơi vào ca nào, nhưng thứ tự vẫn giữ
-- đúng chiều an toàn phòng khi sau này ai tách ra.
--
-- Ghi `credit_transactions` là BẮT BUỘC, không phải cho đẹp: sổ giao dịch phải
-- giải thích được số dư (đúng luật đã áp lúc hoàn 30 Lượng cho Duyên Nợ).
create or replace function public.onboarding_task_claim(
  p_user_id  uuid,
  p_task_key text,
  p_credits  integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  if p_user_id is null or coalesce(p_task_key, '') = '' then
    return 0;
  end if;
  -- Trần an toàn: một nhiệm vụ không bao giờ đáng quá 200 Lượng. `app_config`
  -- sửa được bằng SQL nên một cú gõ nhầm số 0 là phát cả gia tài; chốt ở đây để
  -- lỗi đó dừng lại ở tầng DB thay vì đi thẳng vào ví.
  if p_credits < 0 or p_credits > 200 then
    raise exception 'onboarding_task_claim: credits ngoài khoảng cho phép (%)', p_credits;
  end if;

  insert into public.onboarding_tasks (user_id, task_key, credits)
  values (p_user_id, p_task_key, p_credits)
  on conflict (user_id, task_key) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 0;               -- đã nhận trước đó
  end if;

  if p_credits > 0 then
    perform public.add_credits(p_user_id, p_credits);
    insert into public.credit_transactions (user_id, amount, type, description)
    values (p_user_id, p_credits, 'onboarding_task', 'Nhiệm vụ: ' || p_task_key);
  end if;

  return p_credits;
end;
$$;

revoke all on function public.onboarding_task_claim(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.onboarding_task_claim(uuid, text, integer) to service_role;

-- ── Mức thưởng ──────────────────────────────────────────────────────────────
-- Để trong `app_config` để chỉnh bằng SQL, không cần deploy — cùng lối với
-- `credits.signup_bonus_variants` / `referral.signup_bonus_referrer`.
-- Đặt mức 10 mỗi việc: làm đủ 3 = +30 Lượng ≈ THÊM MỘT LƯỢT Dạy Con (15) hoặc
-- Lá Số Người Khác (15). Câu chữ trên trang nói thẳng con số đó — hứa lửng lơ
-- kiểu "làm nhiệm vụ để nhận thưởng" là mất niềm tin ngay lần đầu (luật đã chốt
-- ở V2.3). Đặt một khoá về 0 là TẮT hẳn nhiệm vụ đó.
-- 🪤 Cột chú thích của `app_config` tên là **`note`**, không phải `description`
-- (cột `description` là của `credit_transactions`). Hai bảng đứng cạnh nhau
-- trong cùng file này nên rất dễ gõ nhầm — lượt chạy đầu đỏ đúng chỗ đó.
insert into public.app_config (key, value, note)
values (
  'onboarding.task_rewards',
  '{"luu_la_so": 10, "bat_thong_bao": 10, "lien_ket_kenh": 10}'::jsonb,
  'M3 — Lượng thưởng cho mỗi nhiệm vụ onboarding. Đặt 0 để tắt một nhiệm vụ.'
)
on conflict (key) do nothing;
