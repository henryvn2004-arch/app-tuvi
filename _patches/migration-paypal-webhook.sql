-- _patches/migration-paypal-webhook.sql
-- ============================================================
-- Chốt chống cộng Lượng HAI LẦN cho cùng một đơn PayPal, và một cửa RPC
-- NGUYÊN TỬ để cả trình duyệt lẫn webhook cùng đi qua.
--
-- VÌ SAO CẦN BÂY GIỜ: trước đây chỉ trình duyệt gọi `?action=capture`, nên
-- hai lượt chốt cùng một đơn là chuyện hiếm và cửa chống trùng kiểu "SELECT
-- xem đã có chưa rồi INSERT" trong `handleCapture` tạm đủ. Thêm webhook
-- PayPal là thêm một đường chạy SONG SONG, chạm cùng một đơn trong cùng vài
-- mili-giây — khe hở giữa SELECT và INSERT trở thành đường cộng Lượng hai lần
-- cho một lần trả tiền.
--
-- ⚠️ Và `Prefer: resolution=ignore-duplicates` mà `logTransaction` vẫn gửi
-- kèm mỗi lượt ghi CHƯA TỪNG có tác dụng: không có ràng buộc UNIQUE nào trên
-- `paypal_order_id` để mà đụng vào. Một header trông y như lưới an toàn nhưng
-- không mắc vào đâu cả — kiểu hỏng im lặng khó thấy nhất, vì chỗ gọi đọc lên
-- vẫn thấy "đã chống trùng rồi".
-- ============================================================

-- ── 1) UNIQUE — chính nó là MUTEX của việc chốt đơn ─────────────────────
-- Partial vì mọi dòng KHÔNG phải PayPal (chuyển khoản, thưởng, trừ tiêu) đều
-- để NULL ở cột này, mà NULL trong btree unique không đụng nhau.
create unique index if not exists credit_txn_paypal_order_uidx
  on public.credit_transactions (paypal_order_id)
  where paypal_order_id is not null;

-- ── 2) Cửa DUY NHẤT để chốt một đơn topup PayPal ────────────────────────
-- Trả về `credited=false` khi đơn đã được ai đó chốt trước — phía gọi coi đó
-- là THÀNH CÔNG (đơn đã xong, Lượng đã cộng), không phải lỗi.
create or replace function public.paypal_settle_topup(
  p_order_id    text,
  p_user_id     uuid,
  p_amount      integer,
  p_description text,
  p_amount_vnd  integer
)
returns table (credited boolean, balance integer)
language plpgsql
security definer
-- `pg_temp` nêu tường minh và đặt SAU `public`: bỏ trống thì nó đứng đầu
-- đường tìm, và một bảng TẠM trùng tên che được bảng thật.
set search_path = public, pg_temp
as $$
declare
  v_txn_id  uuid;
  v_balance integer;
begin
  -- Dòng SỔ đi TRƯỚC, và chính nó là chỗ giành quyền: ai chèn được mới là
  -- người chốt đơn này. Làm ngược lại — cộng Lượng trước rồi mới ghi sổ — thì
  -- lượt thua cuộc vẫn kịp cộng Lượng, chỉ trượt ở bước ghi sổ, thành ra ví
  -- tăng hai lần mà sổ chỉ có một dòng: sai lệch KHÔNG tự lộ ra ở đâu cả.
  insert into credit_transactions
    (user_id, amount, type, description, paypal_order_id, amount_vnd, gateway)
  values
    (p_user_id, p_amount, 'topup', p_description, p_order_id, p_amount_vnd, 'paypal')
  on conflict (paypal_order_id) where paypal_order_id is not null
  do nothing
  returning credit_transactions.id into v_txn_id;

  if v_txn_id is null then
    -- Đã có người chốt. Trả số dư hiện tại để trang cảm ơn hiện đúng, thay vì
    -- rơi về 0 như nhánh `already_completed` cũ.
    select uc.balance into v_balance
      from user_credits uc
     where uc.user_id = p_user_id;
    return query select false, coalesce(v_balance, 0);
    return;
  end if;

  -- Vẫn qua `add_credits` chứ không UPDATE thẳng `user_credits.balance` —
  -- sổ giao dịch phải giải thích được số dư.
  v_balance := add_credits(p_user_id, p_amount);
  return query select true, v_balance;
end;
$$;

-- SECURITY DEFINER mới LUÔN sinh ra hở: EXECUTE cho PUBLIC là dựng sẵn của
-- Postgres. Hàm này cộng Lượng — chỉ service key được gọi.
revoke all on function public.paypal_settle_topup(text, uuid, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.paypal_settle_topup(text, uuid, integer, text, integer)
  to service_role;
