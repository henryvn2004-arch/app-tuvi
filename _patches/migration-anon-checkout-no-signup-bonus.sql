-- migration-anon-checkout-no-signup-bonus.sql
-- ============================================================
-- Chuẩn bị cho "guest checkout" (Supabase Anonymous Sign-ins): khách bấm mở
-- khoá mà CHƯA từng đăng nhập được cấp một PHIÊN ẨN DANH âm thầm (không hỏi
-- gì) để trả tiền và đọc kết quả ngay — chỉ khi quay lại/muốn giữ mới bị mời
-- "Lưu tài khoản" (thêm email/mật khẩu, NÂNG CẤP TẠI CHỖ cùng user_id, không
-- mất Lượng/lịch sử).
--
-- 🔴 TRƯỚC KHI bật Anonymous Sign-ins trong Supabase Dashboard (Authentication
-- → Sign In / Up → Anonymous), PHẢI vá lỗ này trước — nếu không mỗi phiên ẩn
-- danh (tạo được bằng cách xoá cookie/mở tab ẩn danh, KHÔNG cần email/OTP) sẽ
-- tự động ăn quà chào mừng 20-40 Lượng qua trigger `on_auth_user_created` →
-- `handle_new_user_signup()`, tức cày Lượng miễn phí vô hạn, không giới hạn.
--
-- `is_anonymous` chỉ đúng ở thời điểm INSERT (trigger là AFTER INSERT) — lúc
-- khách "Lưu tài khoản" (linkIdentity/updateUser thêm email+mật khẩu) là một
-- UPDATE trên auth.users, KHÔNG bắn lại trigger này, nên khách claim xong vẫn
-- không tự nhận được quà chào mừng qua đường này (đúng ý: quà chỉ dành cho ai
-- ĐĂNG KÝ THẬT ngay từ đầu, không phải ai "nâng cấp" từ ẩn danh).
--
-- Idempotent — CREATE OR REPLACE, chạy lại vô hại.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_cfg      jsonb;
  v_variants int[];
  v_amount   int;
  v_domain   text;
  v_blocked  boolean := false;
BEGIN
  IF NEW.is_anonymous THEN
    RETURN NEW;
  END IF;

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
    WHERE public.user_credits.balance = 0;

  INSERT INTO public.credit_transactions (user_id, amount, type, description, created_at)
  VALUES (NEW.id, v_amount, 'signup_bonus',
          CASE WHEN v_blocked THEN 'Đăng ký tài khoản (email tạm — không tặng Lượng)'
               ELSE 'Quà chào mừng khi đăng ký' END,
          now());

  RETURN NEW;
END;
$function$;
