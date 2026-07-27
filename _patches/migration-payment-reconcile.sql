-- ============================================================================
-- S3 (track COO) — ĐỐI SOÁT trừ-Lượng ↔ giao-hàng
-- ============================================================================
-- Khớp TỪNG lượt trừ Lượng với bản ghi kết quả sinh ra sau nó (cửa sổ 30 phút).
--
-- CỐ Ý KHÔNG so tổng-với-tổng. Cách đó không bao giờ chỉ ra được LƯỢT NÀO hỏng,
-- và từng khiến chính bản audit mở màn track này kết luận nhầm "5 user mất
-- tiền ~250k đ" — thực tế là 2 lượt hỏng của đúng một tài khoản (chủ site, lúc
-- test). Có RPC này thì câu hỏi đó tra ra trong một câu lệnh thay vì suy đoán.
--
-- `credits_at_risk` = Lượng đã thu mà chưa giao và cũng chưa hoàn — đây là con
-- số cần bằng 0.
-- ============================================================================
create or replace function public.payment_reconcile(p_days int default 30)
returns table(
  tool_id      text,
  charges      bigint,
  delivered    bigint,
  undelivered  bigint,
  refunded     bigint,
  credits_at_risk bigint
)
language sql
security definer
set search_path = public
as $$
  with tools(tool_id, tbl) as (
    values ('chan-dung-tien-kiep','past_life'), ('chan-dung-vo-chong','spouse')
  ),
  ch as (
    select
      case
        when ct.slug like 'chan-dung-tien-kiep%' then 'chan-dung-tien-kiep'
        when ct.slug like 'chan-dung-vo-chong%'  then 'chan-dung-vo-chong'
      end as tool_id,
      ct.user_id, ct.slug, ct.created_at, abs(ct.amount) as credits
    from credit_transactions ct
    where ct.amount < 0
      and ct.created_at >= now() - (p_days || ' days')::interval
      and (ct.slug like 'chan-dung-tien-kiep%' or ct.slug like 'chan-dung-vo-chong%')
  ),
  m as (
    select ch.*,
      case ch.tool_id
        when 'chan-dung-tien-kiep' then exists (
          select 1 from past_life_portraits p
           where p.user_id = ch.user_id
             and p.created_at >= ch.created_at
             and p.created_at <= ch.created_at + interval '30 min')
        else exists (
          select 1 from spouse_portraits s
           where s.user_id = ch.user_id
             and s.created_at >= ch.created_at
             and s.created_at <= ch.created_at + interval '30 min')
      end as got,
      exists (select 1 from credit_transactions r
               where r.slug = ch.slug and r.type = 'refund') as was_refunded
    from ch
  )
  select
    t.tool_id,
    count(m.slug)::bigint,
    count(*) filter (where m.got)::bigint,
    count(*) filter (where not m.got and not m.was_refunded)::bigint,
    count(*) filter (where m.was_refunded)::bigint,
    coalesce(sum(m.credits) filter (where not m.got and not m.was_refunded), 0)::bigint
  from tools t
  left join m on m.tool_id = t.tool_id
  group by t.tool_id
  order by 6 desc;
$$;

-- Phải revoke đủ CẢ BA: PUBLIC (mặc định Postgres) và anon/authenticated
-- (ALTER DEFAULT PRIVILEGES của schema public). Xem migration-tool-health.sql.
revoke execute on function public.payment_reconcile(int) from public, anon, authenticated;
grant  execute on function public.payment_reconcile(int) to service_role;

-- ĐÃ CHẠY PROD 2026-07-27. Kiểm chứng: anon=false, authenticated=false,
-- service_role=true. Kết quả 90 ngày: vo-chong 34 lượt/32 giao/2 treo/44 Lượng,
-- tien-kiep 15/15/0 — khớp đúng bản đính chính thủ công ở PR #309.
