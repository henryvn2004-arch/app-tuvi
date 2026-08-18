-- migration-referral-2tier.sql
-- ============================================================
-- REFERRAL 2 TẦNG — mạnh vòng lan:
--   • Tầng 1 (ĐĂNG KÝ): người giới thiệu nhận thưởng nhỏ NGAY khi người được mời
--     tạo tài khoản → thấy tín hiệu sớm, có động lực share. Có cap chống farm.
--   • Tầng 2 (NẠP): giữ nguyên process_referral_reward (30 mỗi bên) khi referee nạp
--     lần đầu — trigger_referral_check_on_topup KHÔNG đổi.
--
-- Số Lượng + cap do app_config quyết (đổi không cần deploy). Idempotent.
-- Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS signup_rewarded_at timestamptz;

INSERT INTO public.app_config (key, value, note) VALUES
  ('referral.signup_bonus_referrer', to_jsonb(10), 'Lượng thưởng NGAY cho người giới thiệu khi người được mời ĐĂNG KÝ (tầng 1). 0 = tắt.'),
  ('referral.signup_reward_cap', to_jsonb(20), 'Trần số lượt thưởng signup-tier / referrer / 30 ngày (chống farm).')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.process_referral_signup(p_referee_user_id uuid)
 RETURNS TABLE(rewarded boolean, referrer_user_id uuid, credits_granted integer)
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref    RECORD;
  v_amount int;
  v_cap    int;
  v_count  int;
BEGIN
  SELECT * INTO v_ref FROM referrals
   WHERE referee_user_id = p_referee_user_id AND status = 'pending' AND signup_rewarded_at IS NULL
   LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT FALSE, NULL::uuid, 0; RETURN; END IF;

  SELECT (value#>>'{}')::int INTO v_amount FROM app_config WHERE key='referral.signup_bonus_referrer';
  IF v_amount IS NULL THEN v_amount := 10; END IF;
  IF v_amount <= 0 THEN RETURN QUERY SELECT FALSE, v_ref.referrer_user_id, 0; RETURN; END IF;

  SELECT (value#>>'{}')::int INTO v_cap FROM app_config WHERE key='referral.signup_reward_cap';
  IF v_cap IS NULL THEN v_cap := 20; END IF;

  -- Anti-farm: cap số lượt thưởng signup / referrer / 30 ngày.
  -- 🔴 PHẢI ghi rõ `referrals.referrer_user_id`: RETURNS TABLE khai OUT param
  -- CÙNG TÊN với cột này, để trần thì Postgres ném 42702 "ambiguous" và CẢ HÀM
  -- chết ngay tại đây — tức không lượt thưởng nào từng trả được. Cùng lớp lỗi đã
  -- vấp ở `promo_code_redeem` (`where promo_codes.code = v_code`).
  SELECT COUNT(*) INTO v_count FROM referrals
   WHERE referrals.referrer_user_id = v_ref.referrer_user_id
     AND referrals.signup_rewarded_at > NOW() - INTERVAL '30 days';
  IF v_count >= v_cap THEN
    UPDATE referrals SET signup_rewarded_at = NOW() WHERE id = v_ref.id; -- đánh dấu đã xét
    RETURN QUERY SELECT FALSE, v_ref.referrer_user_id, 0; RETURN;
  END IF;

  UPDATE user_credits SET balance = balance + v_amount WHERE user_id = v_ref.referrer_user_id;
  INSERT INTO credit_transactions (user_id, amount, type, description, slug)
  VALUES (v_ref.referrer_user_id, v_amount, 'referral_signup',
          'Thưởng giới thiệu (đăng ký): 1 người vừa tạo tài khoản', 'referral-signup-' || v_ref.id);
  UPDATE referrals SET signup_rewarded_at = NOW() WHERE id = v_ref.id;

  RETURN QUERY SELECT TRUE, v_ref.referrer_user_id, v_amount;
END;
$function$;
