-- migration-signup-bonus-abtest.sql  (PR4a — thưởng Lượng config-driven + A/B + chặn email tạm)
-- ============================================================
-- Nâng cấp trigger quà chào mừng `handle_new_user_signup()`:
--   1. SỐ TẶNG do CONFIG quyết (app_config 'credits.signup_bonus_variants',
--      mảng JSON) → đổi/khoá A/B KHÔNG cần deploy. Mặc định A/B 3 nhánh [20,30,40];
--      random mỗi lần đăng ký. Cột `amount` của credit_transactions CHÍNH LÀ nhãn
--      biến thể → đo conversion sau này chỉ cần GROUP BY amount (không cần cột mới).
--      Khoá về 1 số sau khi có kết quả: UPDATE app_config value='[30]'.
--   2. CHẶN EMAIL DÙNG-MỘT-LẦN (disposable): domain nằm trong blocked_email_domains
--      → vẫn tạo tài khoản nhưng KHÔNG tặng Lượng (amount 0). Chống farming vặt.
--
-- Giữ nguyên: SECURITY DEFINER, "chỉ tặng lần đầu" (ON CONFLICT ... WHERE balance=0),
-- ghi credit_transactions type='signup_bonus'. Trigger on_auth_user_created KHÔNG đổi.
-- Idempotent. Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

-- 1. Danh sách domain email tạm (mở rộng được: chỉ cần INSERT thêm, không deploy).
CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  domain text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.blocked_email_domains (domain) VALUES
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamailblock.com'), ('sharklasers.com'),
  ('10minutemail.com'), ('10minutemail.net'), ('tempmail.com'), ('temp-mail.org'), ('temp-mail.io'),
  ('yopmail.com'), ('throwawaymail.com'), ('getnada.com'), ('nada.email'), ('trashmail.com'),
  ('maildrop.cc'), ('mailnesia.com'), ('dispostable.com'), ('fakeinbox.com'), ('mailcatch.com'),
  ('tempinbox.com'), ('spamgourmet.com'), ('mytemp.email'), ('tempr.email'), ('moakt.com'),
  ('emailondeck.com'), ('mohmal.com'), ('minuteinbox.com'), ('mailtemp.net'), ('inboxkitten.com'),
  ('discard.email'), ('spam4.me'), ('grr.la'), ('trbvm.com'), ('tmpmail.org'), ('burnermail.io')
ON CONFLICT (domain) DO NOTHING;

-- 2. Config biến thể A/B (mảng JSON các mức Lượng). Đổi ở DB → có hiệu lực ngay.
INSERT INTO public.app_config (key, value, note) VALUES
  ('credits.signup_bonus_variants', '[20,30,40]'::jsonb, 'A/B mức Lượng tặng khi đăng ký (random). Khoá 1 số = [30].')
ON CONFLICT (key) DO NOTHING;

-- 3. Trigger mới.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg      jsonb;
  v_variants int[];
  v_amount   int;
  v_domain   text;
  v_blocked  boolean := false;
BEGIN
  -- Mức tặng: đọc mảng biến thể từ config, random 1 nhánh. Fallback [20,30,40].
  SELECT value INTO v_cfg FROM public.app_config WHERE key = 'credits.signup_bonus_variants';
  BEGIN
    IF v_cfg IS NOT NULL AND jsonb_typeof(v_cfg) = 'array' AND jsonb_array_length(v_cfg) > 0 THEN
      SELECT array_agg((e)::int) INTO v_variants FROM jsonb_array_elements_text(v_cfg) e;
    END IF;
  EXCEPTION WHEN others THEN
    v_variants := NULL;
  END;
  IF v_variants IS NULL OR array_length(v_variants, 1) IS NULL THEN
    v_variants := ARRAY[20, 30, 40];
  END IF;
  v_amount := v_variants[1 + floor(random() * array_length(v_variants, 1))::int];

  -- Chặn email dùng-một-lần: tạo tài khoản nhưng KHÔNG tặng (amount 0).
  v_domain := lower(split_part(coalesce(NEW.email, ''), '@', 2));
  IF v_domain <> '' THEN
    SELECT EXISTS(SELECT 1 FROM public.blocked_email_domains WHERE domain = v_domain) INTO v_blocked;
  END IF;
  IF v_blocked THEN
    v_amount := 0;
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, v_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + v_amount
    WHERE public.user_credits.balance = 0; -- chỉ tặng lần đầu

  INSERT INTO public.credit_transactions (user_id, amount, type, description, created_at)
  VALUES (NEW.id, v_amount, 'signup_bonus',
          CASE WHEN v_blocked THEN 'Đăng ký tài khoản (email tạm — không tặng Lượng)'
               ELSE 'Quà chào mừng khi đăng ký' END,
          now());

  RETURN NEW;
END;
$function$;
