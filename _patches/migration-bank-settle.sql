-- _patches/migration-bank-settle.sql
-- ============================================================
-- Chốt đơn chuyển khoản (PayOS) NGUYÊN TỬ — thôi cộng Lượng hai lần khi
-- PayOS gửi lại webhook.
--
-- VÌ SAO CẦN: `app/api/bank-webhook/route.ts` chốt đơn bằng BỐN lượt gọi rời
-- nhau — SELECT dòng `pending` → PATCH sang `paid` → `add_credits` → INSERT
-- sổ. Giữa SELECT và PATCH là một khe hở thật: PayOS CÓ gửi lại webhook, và
-- hai lượt gửi lại chạy song song thì cả hai đều thấy `status='pending'`, cả
-- hai đều đi tiếp ⇒ ví tăng HAI lần cho một lần trả tiền.
--
-- Cùng họ bệnh, cùng cách chữa với `migration-paypal-webhook.sql` hôm 26/08.
-- Khác một điểm về CHỖ giành quyền: PayPal phải dựng UNIQUE mới trên
-- `credit_transactions.paypal_order_id` vì không có gì khác để đụng vào; ở
-- đây `bank_orders` đã sẵn một dòng cho mỗi đơn, có `bank_orders_order_code_key`
-- UNIQUE đỡ bên dưới — nên chính dòng đó làm mutex, không cần thêm ràng buộc.
--
-- ⚠️ Thứ tự trong thân hàm là phần KHÔNG được đảo. Bài học 26/08: kể cả khi
-- đã có mutex, nếu cộng Lượng TRƯỚC rồi mới giành quyền thì lượt thua cuộc
-- VẪN kịp cộng, chỉ trượt ở bước sau ⇒ ví tăng hai lần mà sổ một dòng, và sai
-- lệch đó không tự lộ ra ở đâu.
-- ============================================================

-- ── Cửa DUY NHẤT để chốt một đơn topup chuyển khoản ─────────────────────
-- `credited=false` KHÔNG phải lỗi: nghĩa là đơn đã có người chốt trước (hoặc
-- không đủ điều kiện chốt). `reason` chỉ để bên gọi ghi log cho đúng.
create or replace function public.bank_settle_topup(
  p_order_code text,
  p_amount_vnd integer
)
returns table (credited boolean, reason text, balance integer, credits integer)
language plpgsql
security definer
-- `pg_temp` nêu tường minh và đặt SAU `public`: bỏ trống thì nó đứng đầu
-- đường tìm, và một bảng TẠM trùng tên che được bảng thật.
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_credits integer;
  v_label   text;
  v_balance integer;
  v_status  text;
begin
  -- MUTEX: chính dòng `bank_orders` là chỗ giành quyền.
  -- `UPDATE … WHERE status='pending'` khoá dòng ở mức hàng; lượt thua cuộc
  -- chờ khoá nhả, đọc LẠI điều kiện (READ COMMITTED) và lúc đó thấy
  -- `status='paid'` ⇒ ăn 0 dòng ⇒ không đi tiếp được. Điều kiện số tiền nằm
  -- LUÔN trong câu này để không tồn tại trạng thái "đã chốt nhưng trả thiếu".
  --
  -- ⚠️ Mọi cột trong thân hàm RETURNS TABLE phải ghi kèm tên bảng: OUT param
  -- `credits`/`balance` trùng tên cột thật, để trần là 42702 và hàm chết hẳn
  -- (đã cắn 2 lần: promo_code_redeem, process_referral_signup).
  update bank_orders bo
     set status  = 'paid',
         paid_at = now()
   where bo.order_code = p_order_code
     and bo.status     = 'pending'
     and p_amount_vnd >= bo.amount_vnd
  returning bo.user_id, bo.credits, bo.label
       into v_user_id, v_credits, v_label;

  if not found then
    -- Không chốt được. Tách lý do CHỈ để bên gọi ghi log đúng chuyện gì đã
    -- xảy ra — cả ba nhánh đều trả `credited=false` như nhau.
    select bo.status into v_status
      from bank_orders bo
     where bo.order_code = p_order_code;

    if v_status is null then
      return query select false, 'not_found'::text, 0, 0;
    elsif v_status <> 'pending' then
      return query select false, ('already_' || v_status)::text, 0, 0;
    else
      return query select false, 'amount_mismatch'::text, 0, 0;
    end if;
    return;
  end if;

  -- Dòng SỔ đi trước khi cộng, và cả hai nằm trong CÙNG một transaction với
  -- lượt UPDATE ở trên ⇒ hoặc cả ba cùng có, hoặc không có gì.
  insert into credit_transactions
    (user_id, amount, type, description, amount_vnd, gateway)
  values
    (v_user_id, v_credits, 'topup',
     coalesce(v_label, 'Nạp credits chuyển khoản'), p_amount_vnd, 'bank');

  -- Vẫn qua `add_credits` chứ không UPDATE thẳng `user_credits.balance` —
  -- sổ giao dịch phải giải thích được số dư, và `add_credits` UPSERT nên
  -- tài khoản chưa có dòng ví vẫn nhận đúng (9 tài khoản thật đã dính lỗi
  -- "sổ nói đã trả, ví không tăng" vì UPDATE trần ăn 0 dòng).
  v_balance := add_credits(v_user_id, v_credits);
  return query select true, 'ok'::text, v_balance, v_credits;
end;
$$;

-- SECURITY DEFINER mới LUÔN sinh ra hở: EXECUTE cho PUBLIC là dựng sẵn của
-- Postgres, `ALTER DEFAULT PRIVILEGES` không gỡ được. Hàm này cộng Lượng —
-- chỉ service key được gọi.
revoke all on function public.bank_settle_topup(text, integer)
  from public, anon, authenticated;
grant execute on function public.bank_settle_topup(text, integer)
  to service_role;
