-- migration-credit-revenue.sql  (Admin R3 — doanh thu TIỀN THẬT)
-- ============================================================
-- Lưu số tiền thật + cổng thanh toán trên từng giao dịch topup, thay vì chỉ suy
-- từ credits×2500đ. Cột NULLABLE, không phá dữ liệu cũ; báo cáo dùng
-- coalesce(amount_vnd, amount*2500) để row cũ vẫn có số ước lượng.
--   • credit_transactions += amount_vnd int, gateway text.
--   • RPC marketing_revenue(from,to) → JSON {total_vnd, by_gateway[], by_day[]}.
-- Ghi: /api/payment handleCapture (gateway=paypal, amount_vnd từ gói) +
--       app/api/bank-webhook (gateway=bank, amount_vnd = tiền chuyển thật).
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

alter table public.credit_transactions
  add column if not exists amount_vnd int,
  add column if not exists gateway    text;

create index if not exists credit_txn_gateway_idx
  on public.credit_transactions(gateway) where gateway is not null;

-- Doanh thu tiền thật theo cửa sổ ngày: tổng + theo cổng + theo ngày.
-- coalesce fallback ×2500đ cho giao dịch cũ chưa có amount_vnd.
create or replace function public.marketing_revenue(p_from timestamptz, p_to timestamptz)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'total_vnd', (
      select coalesce(sum(coalesce(amount_vnd, amount * 2500)), 0)
      from credit_transactions
      where type = 'topup' and created_at >= p_from and created_at < p_to
    ),
    'by_gateway', (
      select coalesce(json_agg(g), '[]'::json) from (
        select coalesce(gateway, '(cũ)') as gateway,
          count(*)::bigint as count,
          coalesce(sum(coalesce(amount_vnd, amount * 2500)), 0)::bigint as vnd
        from credit_transactions
        where type = 'topup' and created_at >= p_from and created_at < p_to
        group by 1 order by vnd desc
      ) g
    ),
    'by_day', (
      select coalesce(json_agg(d order by d.day), '[]'::json) from (
        select (date_trunc('day', created_at))::date as day,
          coalesce(sum(coalesce(amount_vnd, amount * 2500)), 0)::bigint as vnd
        from credit_transactions
        where type = 'topup' and created_at >= p_from and created_at < p_to
        group by 1
      ) d
    )
  );
$$;

grant execute on function public.marketing_revenue(timestamptz, timestamptz) to service_role;
