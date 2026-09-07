-- "Khoe Kết Quả" — quest nộp bằng chứng đã đăng Facebook/Instagram/TikTok
-- (docs/QUEST-PLAN.md §3.5.1, Henry: "còn thiếu activity để user đăng
-- facebook/instagram" → "ok, làm luôn đi").
--
-- 🔑 GIỚI HẠN ĐÃ NGHIÊN CỨU TRƯỚC KHI THIẾT KẾ (xem QUEST-PLAN §3.5): không có
-- cách nào xác minh TỰ ĐỘNG một lượt đăng Story lên Facebook/Instagram —
-- Instagram không lộ dữ liệu screenshot/lượt xem qua bất kỳ API nào cho bên
-- thứ ba. Toàn ngành growth loop dừng ở đúng một mức: người dùng TỰ NỘP bằng
-- chứng, admin xác nhận bằng mắt. Bảng này + hàng đợi admin chính là mức đó.
--
-- Hai dạng bằng chứng:
--   - Bài đăng THƯỜNG (feed FB/IG, video TikTok) → có link công khai bền → cột `url`.
--   - Story (FB/IG, tự xoá sau 24h, KHÔNG có link bền) → chỉ còn ảnh chụp màn
--     hình → cột `screenshot_url`. Đây là đường DUY NHẤT chứng minh được Story.

create table if not exists public.social_post_submissions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  platform        text not null,               -- 'facebook' | 'instagram' | 'tiktok' | 'other'
  url             text,                        -- link công khai (bài thường)
  screenshot_url  text,                        -- ảnh chụp (Story) — bucket 'social-proof'
  tool_id         text,                        -- tool đang khoe lúc nộp (tuỳ, để admin đối chiếu)
  note            text,                        -- user tự ghi chú (tuỳ)
  status          text not null default 'pending', -- pending | approved | rejected
  reward_credits  integer not null default 0,
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     text,
  reject_reason   text,
  constraint social_post_submissions_has_proof
    check (url is not null or screenshot_url is not null),
  constraint social_post_submissions_status_chk
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists social_post_submissions_status_idx
  on public.social_post_submissions (status, submitted_at desc);
create index if not exists social_post_submissions_user_idx
  on public.social_post_submissions (user_id, platform, submitted_at desc);

-- Một link không được nộp hai lần (chặn 2 tài khoản cùng dán một link, hoặc
-- nộp lại chính link đó để farm). Partial index vì `url` có thể NULL (nhánh
-- Story dùng ảnh chụp).
create unique index if not exists social_post_submissions_url_uniq
  on public.social_post_submissions (url) where url is not null;

alter table public.social_post_submissions enable row level security;
-- 0 policy = chỉ service key chạm được — client không đọc/ghi thẳng bảng này,
-- luôn đi qua endpoint có auth (server tự gắn user_id từ token, không tin
-- user_id do client khai).

-- ── Bucket ảnh chụp Story ─────────────────────────────────────────────────
-- CÔNG KHAI, cùng mức rủi ro đã chấp nhận cho bucket `portraits` (đường dẫn
-- có user_id + mốc mili-giây nên không đoán được, admin cần mở thẳng URL để
-- duyệt mà không phải dựng thêm cơ chế signed-URL cho một tính năng ở quy mô
-- nhỏ). Trần 8MB — ảnh chụp màn hình điện thoại hiếm khi vượt vài MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-proof', 'social-proof', true, 8388608, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 🔐 KHÔNG tạo policy cho anon/authenticated — ghi qua route server (service
-- key), giống hệt lối `portraits`/`clips` đã đi.

-- ── RPC duyệt: nguyên tử trong MỘT transaction ─────────────────────────────
-- UPDATE ... WHERE status='pending' RETURNING là chốt chống duyệt hai lần —
-- duyệt lại một dòng đã approved/rejected thì UPDATE ăn 0 dòng, trả về 0,
-- không cộng thêm Lượng. Cùng khuôn `onboarding_task_claim`.
--
-- Trần 200 Lượng/lượt duyệt — cùng lý do `onboarding_task_claim` đã ghi:
-- `app_config`/tay admin gõ nhầm số 0 thì lỗi dừng ở đây, không đi thẳng vào ví.
create or replace function public.social_proof_approve(
  p_submission_id uuid,
  p_credits       integer,
  p_reviewer      text
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_rows    integer := 0;
begin
  if p_submission_id is null then
    return 0;
  end if;
  if p_credits < 0 or p_credits > 200 then
    raise exception 'social_proof_approve: credits ngoài khoảng cho phép (%)', p_credits;
  end if;

  update public.social_post_submissions
     set status         = 'approved',
         reward_credits = p_credits,
         reviewed_at    = now(),
         reviewed_by    = p_reviewer
   where id = p_submission_id
     and status = 'pending'
  returning user_id into v_user_id;

  get diagnostics v_rows = row_count;
  if v_rows = 0 or v_user_id is null then
    return 0;  -- không tồn tại, hoặc đã duyệt/từ chối trước đó
  end if;

  if p_credits > 0 then
    perform public.add_credits(v_user_id, p_credits);
    insert into public.credit_transactions (user_id, amount, type, description)
    values (
      v_user_id, p_credits, 'social_proof',
      'Khoe kết quả — duyệt bởi ' || coalesce(nullif(p_reviewer, ''), 'admin')
    );
  end if;

  return p_credits;
end;
$$;

revoke all on function public.social_proof_approve(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.social_proof_approve(uuid, integer, text) to service_role;

-- ── Mức thưởng + trần chống farm ────────────────────────────────────────────
-- Trong app_config để chỉnh bằng SQL, không cần deploy — cùng lối
-- `onboarding.task_rewards`. `reward_credits`: +20 Lượng — nặng hơn referral
-- (15) vì một bài đăng công khai có sức lan xa hơn một link mời riêng lẻ, và
-- việc này tốn công NGƯỜI đăng thật (không phải bấm nút) + có admin soát.
-- `cooldown_days`: 1 lượt/nền tảng/7 ngày — chặn nộp lại ảnh cũ mỗi tuần mà
-- không cấm hẳn (ai post thật nhiều lần thì vẫn được thưởng nhiều lần).
insert into public.app_config (key, value, note)
values (
  'social_proof.reward_credits', '20'::jsonb,
  'Khoe Kết Quả — Lượng thưởng mỗi lượt admin Duyệt. 0 = tắt hẳn cộng thưởng (form vẫn nhận nộp).'
), (
  'social_proof.cooldown_days', '7'::jsonb,
  'Khoe Kết Quả — số ngày chờ giữa 2 lượt NỘP cùng một nền tảng của cùng một user.'
)
on conflict (key) do nothing;
