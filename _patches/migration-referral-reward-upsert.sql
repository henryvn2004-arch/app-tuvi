-- ============================================================================
-- THƯỞNG GIỚI THIỆU TẦNG 2 (khi referee NẠP lần đầu) — vá "thưởng ma"
-- ============================================================================
-- Cùng lớp lỗi vừa vá ở `process_referral_signup` (tầng 1), tìm ra bằng cách
-- quét MỌI hàm có ghi `user_credits`:
--
--   UPDATE user_credits SET balance = balance + ... WHERE user_id = ...
--
-- Không có dòng ví thì UPDATE ăn 0 dòng, NHƯNG hàm vẫn chạy tiếp xuống ghi ĐỦ
-- 2 dòng `credit_transactions` rồi đánh dấu `status='rewarded'`. Kết quả: sổ nói
-- đã trả cho cả hai bên, ví không bên nào tăng, không có gì báo.
--
-- 🔴 Đo được trên prod: 9 tài khoản THẬT (tạo 21/03–23/04, trước khi có trigger
-- quà đăng ký) đang KHÔNG có dòng `user_credits` ⇒ lỗ này chạm tới được, không
-- phải lo hão. Tầng 2 còn nguy hơn tầng 1 vì nó cộng cho HAI người.
--
-- Vá: upsert (người nhận có tiền thật kể cả khi thiếu dòng) + chốt số dòng
-- (khác 1 thì DỪNG HẲN, để referral còn `pending` mà thử lại, thay vì ghi sổ
-- khống). Ném ra thì phía gọi log lại được.
--
-- Kèm: thêm `SET search_path` — hàm SECURITY DEFINER để trống search_path là hở
-- đường tiêm; hàm anh em `process_referral_signup` đã có sẵn.
--
-- ⚠️ Thân hàm này TRƯỚC ĐÂY KHÔNG CÓ TRONG REPO (tạo ad-hoc, repo chỉ nhắc tên ở
-- `migration-revoke-credit-rpc.sql`). Nay chép trọn vào đây để bản chạy và bản
-- repo khớp nhau — đúng bài học đã trả giá với edge function `send-daily-push`.
--
-- ⚠️ CỐ Ý không `coalesce(credits_to_*, 0)`: giá trị NULL là lỗi cấu hình, để nó
-- ném ràng buộc NOT NULL còn hơn lặng lẽ trả 0 Lượng rồi đánh dấu đã thưởng.
--
-- Idempotent. Không đổi hợp đồng trả về, không đổi luật cap 10/30 ngày.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referee_user_id uuid)
 RETURNS TABLE(rewarded boolean, referrer_user_id uuid, credits_granted integer)
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referral RECORD;
  v_referrer_topups_this_month INT;
  v_rows INT;
BEGIN
  -- Tìm referral pending của referee
  SELECT * INTO v_referral FROM referrals
   WHERE referee_user_id = p_referee_user_id AND status = 'pending'
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0;
    RETURN;
  END IF;

  -- Anti-abuse: cap 10 referrals/month cho referrer
  SELECT COUNT(*) INTO v_referrer_topups_this_month FROM referrals
   WHERE referrals.referrer_user_id = v_referral.referrer_user_id
     AND status = 'rewarded'
     AND rewarded_at > NOW() - INTERVAL '30 days';

  IF v_referrer_topups_this_month >= 10 THEN
    UPDATE referrals SET status = 'rejected', rejection_reason = 'cap_10_per_month'
     WHERE id = v_referral.id;
    RETURN QUERY SELECT FALSE, v_referral.referrer_user_id, 0;
    RETURN;
  END IF;

  -- Grant credits cho cả 2 (atomic). UPSERT + chốt số dòng — xem đầu file.
  INSERT INTO user_credits (user_id, balance)
  VALUES (v_referral.referrer_user_id, v_referral.credits_to_referrer)
  ON CONFLICT (user_id) DO UPDATE SET balance = user_credits.balance + EXCLUDED.balance;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'process_referral_reward: cộng Lượng thất bại cho người giới thiệu % (rows=%)',
      v_referral.referrer_user_id, v_rows;
  END IF;

  INSERT INTO user_credits (user_id, balance)
  VALUES (v_referral.referee_user_id, v_referral.credits_to_referee)
  ON CONFLICT (user_id) DO UPDATE SET balance = user_credits.balance + EXCLUDED.balance;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'process_referral_reward: cộng Lượng thất bại cho người được mời % (rows=%)',
      v_referral.referee_user_id, v_rows;
  END IF;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, slug)
  VALUES
    (v_referral.referrer_user_id, v_referral.credits_to_referrer, 'referral_reward',
     'Thưởng giới thiệu: bạn đã refer thành công 1 người', 'referral-' || v_referral.id),
    (v_referral.referee_user_id,  v_referral.credits_to_referee,  'referral_bonus',
     'Bonus chào mừng từ người giới thiệu',                       'referral-' || v_referral.id);

  -- Mark rewarded
  UPDATE referrals
     SET status = 'rewarded', qualified_at = NOW(), rewarded_at = NOW()
   WHERE id = v_referral.id;

  RETURN QUERY SELECT TRUE, v_referral.referrer_user_id, v_referral.credits_to_referrer;
END;
$function$;

-- EXECUTE cho PUBLIC là dựng sẵn của Postgres — mọi hàm SECURITY DEFINER mới
-- (kể cả CREATE OR REPLACE) đều sinh lại hở, phải revoke tường minh.
REVOKE EXECUTE ON FUNCTION public.process_referral_reward(uuid) FROM public, anon, authenticated;

-- Verify: ACL phải chỉ còn {postgres, service_role}
-- select array_agg(distinct grantee order by grantee)
--   from information_schema.routine_privileges
--  where routine_name = 'process_referral_reward';
