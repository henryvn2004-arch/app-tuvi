-- ============================================================
-- HỘP THƯ GÓP Ý — bảng user_feedback
-- ============================================================
-- Vì sao làm hộp thư MỘT CHIỀU thay vì chatbot sản phẩm:
--   Bot trả lời tự động là kênh DẬP tín hiệu — người dùng hỏi, bot đáp, và
--   chỗ sản phẩm làm họ vấp không bao giờ đến được tay người vận hành. Với
--   sản phẩm một người vận hành, tín hiệu quý hơn "deflection". Hộp thư ghi
--   nguyên văn lời họ nói + ngữ cảnh máy tự đính kèm, tốn 0 token.
--
-- MỘT CHIỀU RƯỠI, không phải một chiều hẳn: `status` + `admin_reply` để người
-- góp ý quay lại tab Góp Ý thấy việc của họ đã được xử lý tới đâu. Đó là lý do
-- duy nhất khiến ai đó chịu góp ý lần thứ hai — mà vẫn không phải dựng hạ tầng
-- email hay hội thoại thời gian thực.
--
-- KHÔNG có policy nào cho anon/authenticated: bảng này chỉ chạm được bằng
-- service key qua /api/feedback (người dùng) và /api/admin/feedback (admin) —
-- cùng lối đã dùng cho portrait_cache và anon_rail_trial. Ít mặt tiếp xúc hơn
-- hẳn so với mở RLS rồi đọc thẳng bằng JWT.
-- ============================================================

begin;

create table if not exists public.user_feedback (
  id          bigserial primary key,
  user_id     uuid not null,
  email       text,                       -- chụp lại lúc gửi: user đổi email sau vẫn tra ngược được
  kind        text not null default 'khac'
              check (kind in ('bug', 'noi_dung', 'tinh_nang', 'thanh_toan', 'khac')),
  message     text not null,

  -- Ngữ cảnh MÁY tự đính kèm — người dùng chỉ gõ đúng MỘT ô.
  -- Góp ý "app lỗi" mà không kèm trang/thiết bị là góp ý không hành động được.
  page_url    text,
  user_agent  text,
  tool_id     text,                       -- công cụ liên quan, nếu suy được từ nơi gửi
  meta        jsonb not null default '{}'::jsonb,  -- {balance, recent_tools, screen, ...}

  -- Vòng đời — admin đổi trong panel Góp Ý
  status      text not null default 'moi'
              check (status in ('moi', 'dang_xu_ly', 'da_xu_ly', 'bo_qua')),
  admin_reply text,
  admin_email text,
  replied_at  timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.user_feedback is
  'Hộp thư góp ý trong tab Tài khoản > Góp Ý. Ghi qua /api/feedback (service key), admin đọc/trả lời qua /api/admin/feedback.';
comment on column public.user_feedback.meta is
  'Ngữ cảnh máy tự đính kèm lúc gửi (số dư, công cụ dùng gần đây, cỡ màn hình...). Người dùng không gõ.';

create index if not exists user_feedback_user_idx
  on public.user_feedback (user_id, created_at desc);
create index if not exists user_feedback_status_idx
  on public.user_feedback (status, created_at desc);
create index if not exists user_feedback_kind_idx
  on public.user_feedback (kind, created_at desc);

alter table public.user_feedback enable row level security;
-- Cố ý KHÔNG tạo policy: không ai chạm được bằng anon/authenticated key.

-- ── Trần chống spam (đổi không cần deploy) ────────────────────
-- Đặt về 0 là KHOÁ hẳn việc gửi góp ý.
--
-- HƯỚNG FAIL: OPEN. Ngược với anon-trial (fail-CLOSED) và ngược có lý do —
-- ở đây không có đồng nào chảy ra. Chặn oan một góp ý là mất vĩnh viễn một
-- tín hiệu (người ta không gửi lại lần hai), còn lọt oan vài dòng rác thì
-- admin xoá mất ba giây. Trần vẫn là trần CỨNG khi đọc được.
insert into public.app_config (key, value, note) values
  ('feedback.user_daily_cap', to_jsonb(5),
   'So gop y toi da moi nguoi moi ngay (gio VN). 0 = khoa han viec gui gop y.'),
  ('feedback.max_len', to_jsonb(2000),
   'Do dai toi da mot gop y (ky tu). Cat bot phia client lan server.')
on conflict (key) do nothing;   -- đã chỉnh tay thì giữ giá trị Henry đang dùng

-- ── RPC: đếm số góp ý HÔM NAY của một người ───────────────────
-- Route gọi cái này thay vì tự đếm để "hôm nay" luôn là NGÀY GIỜ VN — cùng
-- quy ước với mọi trần khác trong hệ thống, không lệch theo múi giờ của runtime.
create or replace function public.feedback_today_count(p_user_id uuid)
returns int
language sql
security definer
set search_path = public, pg_temp   -- nêu pg_temp TƯỜNG MINH: bỏ ra là nó đứng
                                     -- đầu và che được bảng thật bằng bảng TẠM
as $$
  select count(*)::int
    from public.user_feedback
   where user_id = p_user_id
     and created_at >= (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')
                        at time zone 'Asia/Ho_Chi_Minh');
$$;

-- SECURITY DEFINER mới LUÔN sinh ra hở: EXECUTE cho PUBLIC là dựng sẵn của
-- Postgres. Thu lại rồi cấp đúng vai cần.
revoke all on function public.feedback_today_count(uuid) from public, anon, authenticated;
grant execute on function public.feedback_today_count(uuid) to service_role;

-- ── updated_at tự cập nhật khi admin đổi trạng thái / trả lời ──
create or replace function public.user_feedback_touch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.user_feedback_touch() from public, anon, authenticated;

drop trigger if exists user_feedback_touch_trg on public.user_feedback;
create trigger user_feedback_touch_trg
  before update on public.user_feedback
  for each row execute function public.user_feedback_touch();

commit;
