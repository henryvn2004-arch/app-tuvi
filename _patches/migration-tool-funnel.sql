-- ============================================================
-- D1 — PHỄU THEO TOOL: "tool nào có người xem mà không ai mua"
--
-- Ghép `events` (mở · tính thử · bấm mở) với `credit_transactions` (trả tiền
-- thật) theo tool. Trước đây hai bên nằm rời nên câu hỏi trên không trả lời
-- được, dù cả hai vế đều đã có dữ liệu.
-- ============================================================

-- Quy mọi biến thể tên tool về MỘT id chuẩn = `tool_pricing.tool_id`, vì đó là
-- id mà giá và nhãn treo vào.
--
-- 🔴 BA HỆ TÊN ĐANG LỆCH NHAU TRÊN PROD, và đây là phát hiện chính của D1:
--   khái niệm  | events.tool_id (shell) | tool_pricing | credit_transactions
--   Luận Giải  | luan-giai              | laso         | use_laso
--   Bát Tự     | bat-tu                 | tu-binh      | use_tubinh
--   Chọn Ngày  | chon-ngay              | chon-ngay-tot| use_chon_ngay_tot
--   Đặt Tên    | dat-ten                | dat-ten-con  | use_dat_ten_con
--   Màu sắc    | —                      | mau-sac-hop-menh | use_mau_sac
--   Đặt Tên DN | dat-ten-dn             | dat-ten-dn   | use_dat_ten_doanh_nghiep
-- Join thô thì `luan-giai` hiện ra "24 người mở, 0 người mua" trong khi
-- `use_laso` đã bán 1.500 Lượng cho 3 người. Đó là kết luận SAI dẫn tới quyết
-- định sai — đúng thứ D1 sinh ra để chặn.
--
-- ⚠️ Thêm tool mới mà tên ba nơi không khớp thì PHẢI thêm một dòng vào đây.
-- Bảng đối chứng ở cuối file bắt được ca đó.
create or replace function public.tool_canon(t text)
returns text language sql immutable as $$
  with n as (
    select replace(lower(regexp_replace(coalesce(t, ''), '^use_', '')), '_', '-') as v
  )
  select case (select v from n)
    when 'luan-giai'  then 'laso'
    when 'bat-tu'     then 'tu-binh'
    when 'tubinh'     then 'tu-binh'
    when 'chon-ngay'  then 'chon-ngay-tot'
    when 'dat-ten'    then 'dat-ten-con'
    when 'sinh-con'   then 'xem-tuoi-sinh-con'
    when 'mau-sac'    then 'mau-sac-hop-menh'
    -- Cái này do CHÍNH bộ dò ở cuối file bắt được ở lượt chạy đầu tiên.
    when 'dat-ten-doanh-nghiep' then 'dat-ten-dn'
    when 'tuvi-chat'  then 'rail-message'
    when 'chat'       then 'rail-message'
    else (select v from n)
  end;
$$;

create or replace function public.tool_funnel(p_from timestamptz, p_to timestamptz)
returns table (
  tool_id text,
  nhan text,
  gia int,
  mo bigint,
  chay bigint,
  thu bigint,
  bam_mo bigint,
  mua bigint,
  luot_mua bigint,
  luong bigint
)
language sql security definer set search_path = public as $$
  with ev as (
    select tool_canon(e.tool_id) as tool_id,
           e.event_type,
           coalesce(e.user_id::text, e.anon_id) as ai
      from events e
     where e.ts >= p_from and e.ts < p_to
       and e.tool_id is not null
       and coalesce(e.user_id::text, e.anon_id) is not null
       and e.event_type in ('tool_open', 'tool_run', 'preview_shown', 'unlock_click')
  ),
  tra as (
    select tool_canon(c.type) as tool_id, c.user_id::text as ai, c.amount
      from credit_transactions c
     where c.created_at >= p_from and c.created_at < p_to
       and c.amount < 0
       and (c.type like 'use\_%' or c.type = 'chat')
  ),
  -- CHỈ giữ những id thật sự là tool (có dòng trong bảng giá). `home`, `ho-so`,
  -- `van-ngay` cũng bắn `tool_open` nhưng chúng không bán gì — để lẫn vào là
  -- mỗi lần đọc phải tự lọc bằng mắt.
  ds as (
    select p.tool_id, p.label, p.credits
      from tool_pricing p
     where p.tool_id in (select tool_id from ev union select tool_id from tra)
  )
  select d.tool_id, d.label, d.credits,
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_open'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'tool_run'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'preview_shown'),
         (select count(distinct ai) from ev where ev.tool_id = d.tool_id and event_type = 'unlock_click'),
         (select count(distinct ai) from tra where tra.tool_id = d.tool_id),
         (select count(*) from tra where tra.tool_id = d.tool_id),
         (select coalesce(sum(-amount), 0)::bigint from tra where tra.tool_id = d.tool_id)
    from ds d
   order by 4 desc nulls last, 10 desc;
$$;

-- Bộ dò tên lệch: id nào có hoạt động thật mà KHÔNG có trong bảng giá thì hoặc
-- là tên lệch chưa khai ở `tool_canon`, hoặc là trang không bán gì. Panel admin
-- hiện thẳng danh sách này thay vì để nó chìm.
create or replace function public.tool_funnel_lac(p_from timestamptz, p_to timestamptz)
returns table (tool_id text, nguon text, so_luot bigint)
language sql security definer set search_path = public as $$
  select tool_canon(e.tool_id), 'events'::text, count(*)
    from events e
   where e.ts >= p_from and e.ts < p_to and e.tool_id is not null
     and e.event_type in ('tool_open','tool_run','preview_shown','unlock_click')
     and tool_canon(e.tool_id) not in (select tool_id from tool_pricing)
   group by 1
  union all
  select tool_canon(c.type), 'credit_transactions'::text, count(*)
    from credit_transactions c
   where c.created_at >= p_from and c.created_at < p_to and c.amount < 0
     and (c.type like 'use\_%' or c.type = 'chat')
     and tool_canon(c.type) not in (select tool_id from tool_pricing)
   group by 1
   order by 3 desc;
$$;

revoke all on function public.tool_funnel(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.tool_funnel_lac(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.tool_canon(text) from public, anon, authenticated;
grant execute on function public.tool_funnel(timestamptz, timestamptz) to service_role;
grant execute on function public.tool_funnel_lac(timestamptz, timestamptz) to service_role;
grant execute on function public.tool_canon(text) to service_role;
drop function if exists public.norm_tool(text);

-- ⚠️ Quy ước khoảng ngày: NỬA MỞ [p_from, p_to), và client truyền `p_to` đã
-- CỘNG SẴN một ngày — y hệt `marketing_funnel`/`marketing_sources`. Hai RPC
-- trên cùng một trang mà hiểu khác nhau về mốc cuối là hai bảng lệch nhau đúng
-- một ngày, kiểu lệch không ai nhìn ra.
