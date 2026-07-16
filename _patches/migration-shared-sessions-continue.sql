-- migration-shared-sessions-continue.sql  (PR2 của tính năng Chia sẻ phiên Luận Đường)
-- Nối tiếp PR1 (migration-shared-sessions.sql). Thêm 2 thứ:
--   1. Cột `restore` jsonb — payload dựng lại KHUNG GIỮA (lá số/kịch bản) để người
--      nhận link BẤM "Hỏi thầy tiếp" là vào thẳng phiên với đúng lá số của người
--      chia sẻ, hỏi tiếp (giống "Continue this chat" của ChatGPT share). Chứa
--      { birth, scenario, form } — cùng shape với lịch sử hội thoại (app_hist).
--   2. RPC `incr_shared_counter(id, kind)` security-definer để +1 view_count /
--      signup_count (RLS chặn UPDATE từ client; đây là đường DUY NHẤT tăng đếm).
--      Đo hệ số lan truyền: view = lượt mở trang share, signup = lượt người nhận
--      nối phiên và hỏi thật (đã đăng nhập/đăng ký từ link).
--
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).

alter table public.shared_sessions
  add column if not exists restore jsonb;

create or replace function public.incr_shared_counter(p_id text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind = 'view' then
    update public.shared_sessions set view_count = coalesce(view_count, 0) + 1 where id = p_id;
  elsif p_kind = 'signup' then
    update public.shared_sessions set signup_count = coalesce(signup_count, 0) + 1 where id = p_id;
  end if;
end;
$$;

grant execute on function public.incr_shared_counter(text, text) to anon, authenticated, service_role;
