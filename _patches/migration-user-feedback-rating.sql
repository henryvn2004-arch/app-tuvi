-- ============================================================
-- GÓP Ý LỚP 1 — 👍/👎 gắn NGAY dưới từng bản luận giải
-- ============================================================
-- Bổ sung cho migration-user-feedback.sql (chạy SAU file đó). Additive: chỉ
-- THÊM cột/chỉ mục, không đụng dòng cũ, chạy trước deploy được.
--
-- Vì sao cần lớp này khi ĐÃ có hộp thư trong Tài khoản: hai thứ thu về hai
-- loại tín hiệu khác hẳn nhau. Hộp thư nhận "app hay lắm" / "sao đắt thế" —
-- đọc thì vui, sửa thì không biết sửa đâu. Cái nút đặt ngay cuối bản luận giải
-- nói được BẢN NÀO dở, vì nó tự mang theo tool_id + đúng URL của bản đó. Đây
-- mới là thứ xếp hạng được "tool nào đang bị chê nhất".
--
-- Ba cột mới:
--   rating  — 'up' | 'down'. NULL = góp ý viết tay (đường cũ, hộp thư).
--   source  — 'account' (hộp thư) | 'reading' (nút dưới bản luận giải).
--             Tách ra để panel admin lọc được, và để trần chống spam chỉ tính
--             đường VIẾT TAY (xem dưới).
--   Chỉ mục (tool_id, rating) cho bảng xếp hạng.
-- ============================================================

begin;

alter table public.user_feedback
  add column if not exists rating text,
  add column if not exists source text not null default 'account';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_feedback_rating_chk') then
    alter table public.user_feedback
      add constraint user_feedback_rating_chk check (rating is null or rating in ('up', 'down'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_feedback_source_chk') then
    alter table public.user_feedback
      add constraint user_feedback_source_chk check (source in ('account', 'reading'));
  end if;
end $$;

-- `message` phải cho phép RỖNG: một cú bấm 👍 không kèm chữ vẫn là tín hiệu
-- đáng lưu — và là loại tín hiệu ĐÔNG nhất. Bù lại, ràng buộc mức DÒNG bắt
-- mỗi dòng phải mang ít nhất một trong hai: một lá phiếu, hoặc một câu viết.
-- Không có ràng buộc này thì một lỗi phía route sẽ lặng lẽ đẻ ra dòng rỗng.
alter table public.user_feedback alter column message drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_feedback_nonempty_chk') then
    alter table public.user_feedback
      add constraint user_feedback_nonempty_chk
      check (rating is not null or coalesce(length(btrim(message)), 0) >= 5);
  end if;
end $$;

create index if not exists user_feedback_tool_rating_idx
  on public.user_feedback (tool_id, rating) where rating is not null;

-- MỘT người, MỘT bản luận giải ⇒ MỘT lá phiếu. Không có mốc này thì bấm đi
-- bấm lại (hoặc tải lại trang rồi bấm tiếp) thổi phồng đúng con số dùng để
-- xếp hạng tool. Route đọc mốc này rồi UPDATE thay vì INSERT.
-- Chỉ mục RIÊNG PHẦN (`where source='reading'`): đường hộp thư vẫn được gửi
-- nhiều dòng như cũ.
create unique index if not exists user_feedback_one_vote_idx
  on public.user_feedback (user_id, tool_id, coalesce(page_url, ''))
  where source = 'reading' and rating is not null;

-- ── Trần chống spam chỉ tính đường VIẾT TAY ───────────────────
-- Lá phiếu đã bị chặn bởi chỉ mục một-người-một-phiếu ở trên, nên đếm chúng
-- vào trần chỉ tổ khoá mất ô góp ý viết tay của người dùng thật sự tích cực.
create or replace function public.feedback_today_count(p_user_id uuid)
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
    from public.user_feedback
   where user_id = p_user_id
     and coalesce(length(btrim(message)), 0) >= 5
     and created_at >= (date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh')
                        at time zone 'Asia/Ho_Chi_Minh');
$$;

revoke all on function public.feedback_today_count(uuid) from public, anon, authenticated;
grant execute on function public.feedback_today_count(uuid) to service_role;

-- ── Bảng xếp hạng: tool nào đang bị chê nhất ──────────────────
-- PostgREST không gộp nhóm được, mà đây đúng là con số cả tính năng này sinh
-- ra để có. Trả luôn `down_rate` — xếp theo SỐ 👎 tuyệt đối thì tool đông
-- người dùng luôn đứng đầu dù tỉ lệ hài lòng cao hơn hẳn.
-- `min_votes` chặn ca 1/1 = 100% chê nhảy lên đầu bảng.
create or replace function public.feedback_tool_stats(p_min_votes int default 1)
returns table (tool_id text, up int, down int, total int, down_rate numeric)
language sql
security definer
set search_path = public, pg_temp
as $$
  select f.tool_id,
         count(*) filter (where f.rating = 'up')::int   as up,
         count(*) filter (where f.rating = 'down')::int as down,
         count(*)::int                                   as total,
         round(count(*) filter (where f.rating = 'down')::numeric
               / nullif(count(*), 0) * 100, 1)           as down_rate
    from public.user_feedback f
   where f.rating is not null
     and f.tool_id is not null
   group by f.tool_id
  having count(*) >= greatest(coalesce(p_min_votes, 1), 1)
   order by down_rate desc nulls last, down desc;
$$;

revoke all on function public.feedback_tool_stats(int) from public, anon, authenticated;
grant execute on function public.feedback_tool_stats(int) to service_role;

commit;
