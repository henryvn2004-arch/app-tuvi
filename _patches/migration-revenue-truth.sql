-- ============================================================
-- ĐO DOANH THU: lấy lại TIỀN THẬT, bỏ hằng số 2.500đ bịa
-- ============================================================
-- Đo trước khi sửa (prod, 2026-07-31):
--   • Báo cáo đang hiện          : 10.075.000đ
--   • Tiền thật chứng minh được  :  1.319.500đ  (4 đơn payOS, có amount_vnd)
--   • Không rõ                   :  5 giao dịch PayPal / 3.160 Lượng
-- Nghĩa là ~78% doanh thu đang báo cáo dựa trên `amount * 2500` — một hằng số
-- KHÔNG có trong bảng giá nào hiện hành. Đây là bảng giá CŨ: đơn đầu tiên
-- (24/04) là 122.500đ cho 50 Lượng = 2.450đ/Lượng, tức 2.500đ từng ĐÚNG cho
-- thời kỳ đó. Cái sai là đem nó áp cho Lượng của HÔM NAY (gói hiện bán
-- 624–990đ/Lượng), và để nó thành hằng số chép tay ở 3 nơi.
--
-- Ba việc, theo đúng thứ tự ưu tiên "sự thật > ước lượng > hằng số":
--   1. Backfill số tiền THẬT cho các giao dịch tra được (không ước lượng gì).
--   2. `credit_vnd()` suy từ `credit_packages` thay vì trả hằng số.
--   3. `marketing_revenue` tách rõ phần THẬT và phần ƯỚC LƯỢNG.
-- ============================================================

begin;

-- ── 1. Backfill tiền thật từ bank_orders ─────────────────────
-- Khớp theo user + số Lượng + nhãn + cửa sổ thời gian (đo được lệch 20–47 giây
-- giữa lúc tạo đơn và lúc ghi giao dịch). Chỉ đụng dòng đang NULL nên chạy lại
-- nhiều lần không hỏng gì.
update public.credit_transactions t
   set amount_vnd = b.amount_vnd,
       gateway    = coalesce(t.gateway, 'bank')
  from public.bank_orders b
 where t.type = 'topup'
   and t.amount_vnd is null
   and b.status = 'paid'
   and b.user_id = t.user_id
   and b.credits = t.amount
   and b.label   = t.description
   and t.created_at >= b.created_at
   and t.created_at <  b.created_at + interval '10 minutes';

-- ── 2. credit_vnd(): suy từ bậc gói, KHÔNG còn hằng số ───────
-- Trả về đơn giá của gói phổ biến (gói thứ hai theo sort_order) — cùng mốc mà
-- trang topup và trang Công Cụ dùng để quy đổi, nên ba nơi không thể lệch nhau.
-- `app_config['credits.vnd_per_credit']` vẫn ghi đè được nếu cần chốt cứng.
-- Trước đây hàm này trả mặc định 1000 (không phải 2500 — `dashboard_margin` đã
-- đi qua đây từ trước), lệch ~1,2 lần so với giá thật.
create or replace function public.credit_vnd()
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    -- (a) chốt cứng qua app_config nếu có
    (select (value #>> '{}')::numeric from app_config where key = 'credits.vnd_per_credit'),
    -- (b) đơn giá gói phổ biến (gói thứ 2 theo sort_order)
    (select round(amount_vnd::numeric / credits, 0)
       from credit_packages
      where enabled = true and credits > 0 and amount_vnd > 0
      order by sort_order
      offset 1 limit 1),
    -- (c) gói đầu tiên, nếu chỉ có một gói
    (select round(amount_vnd::numeric / credits, 0)
       from credit_packages
      where enabled = true and credits > 0 and amount_vnd > 0
      order by sort_order
      limit 1),
    -- (d) bảng gói rỗng → mức dự phòng cuối
    1000
  );
$function$;

-- Giữ nguyên chốt an ninh đã vá ở PR trước: hàm SECURITY DEFINER này KHÔNG mở
-- cho anon (EXECUTE cho PUBLIC là dựng sẵn của Postgres nên phải thu hồi tay).
revoke all on function public.credit_vnd() from public;
revoke all on function public.credit_vnd() from anon;
grant execute on function public.credit_vnd() to service_role;

-- Gỡ giá trị chốt cứng đang chặn nhánh suy-từ-gói. Prod đang có
-- `credits.vnd_per_credit = 1000` — một con số tròn ai đó đặt tay, khiến hàm
-- trên không bao giờ chạy tới nhánh đọc `credit_packages`. Giữ lại thì đúng y
-- bệnh cũ, chỉ khác con số. Cơ chế ghi đè VẪN CÒN: đặt lại khoá này là chốt
-- cứng được, chỉ là mặc định nay bám giá thật (829đ = gói Phổ Thông).
delete from public.app_config where key = 'credits.vnd_per_credit';

-- ── 3. marketing_revenue: tách THẬT vs ƯỚC LƯỢNG ─────────────
-- Bản cũ gộp cả hai vào `total_vnd` nên không ai biết bao nhiêu phần trăm con
-- số đó là tiền có thật. Nay trả thêm `real_vnd` / `estimated_vnd` /
-- `estimated_count` để giao diện nói thẳng ra.
create or replace function public.marketing_revenue(
  p_from timestamp with time zone,
  p_to   timestamp with time zone
)
returns json
language sql
security definer
set search_path to 'public'
as $function$
  with tx as (
    select amount, amount_vnd, gateway, created_at,
           coalesce(amount_vnd, amount * credit_vnd()) as vnd
      from credit_transactions
     where type = 'topup' and created_at >= p_from and created_at < p_to
  )
  select json_build_object(
    'total_vnd',       (select coalesce(sum(vnd), 0) from tx),
    -- Tiền ĐÃ ghi nhận thật (có amount_vnd) — con số đứng vững được.
    'real_vnd',        (select coalesce(sum(amount_vnd), 0) from tx where amount_vnd is not null),
    -- Phần suy ra từ đơn giá, KHÔNG phải tiền đã đối chiếu.
    'estimated_vnd',   (select coalesce(sum(vnd), 0) from tx where amount_vnd is null),
    'estimated_count', (select count(*) from tx where amount_vnd is null),
    'vnd_per_credit',  credit_vnd(),
    'by_gateway', (
      select coalesce(json_agg(g), '[]'::json) from (
        select coalesce(gateway, '(cũ)') as gateway,
               count(*)::bigint as count,
               coalesce(sum(vnd), 0)::bigint as vnd
          from tx group by 1 order by vnd desc
      ) g
    ),
    'by_day', (
      select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select (date_trunc('day', created_at))::date as day,
               coalesce(sum(vnd), 0)::bigint as vnd
          from tx group by 1
      ) d
    )
  );
$function$;

grant execute on function public.marketing_revenue(timestamptz, timestamptz) to service_role;

commit;
