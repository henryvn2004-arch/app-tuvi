-- migration-voucher-welcome-48h.sql
-- ============================================================
-- CHÀO SÂN 48H — trigger cấp tự động đầu tiên cho Ví Ưu Đãi (PR #879:
-- voucher_defs/user_vouchers + voucher_grant/consume/list_active).
-- ============================================================
-- Mọi user đăng ký THẬT (không ẩn danh, không domain email tạm) được cấp
-- NGAY 1 voucher giảm 30% cho lượt mua tool bất kỳ, hết hạn sau 48 giờ kể
-- từ lúc đăng ký — tạo cửa sổ khẩn cấp mua ngay, đúng cơ chế Shopee đã bàn.
--
-- Vì sao gắn vào `handle_new_user_signup()` thay vì cron quét `auth.users`:
-- hàm này đã là trigger AFTER INSERT trên auth.users — bắt đúng mốc "vừa
-- đăng ký" mà không cần thêm route/cron mới; ĐÃ tự chặn is_anonymous (dòng
-- 37-39 bản gốc, xem migration-anon-checkout-no-signup-bonus.sql) và ĐÃ có
-- sẵn cờ `v_blocked` cho domain email tạm — tái dùng, không phát minh lại.
--
-- Idempotent kép: CREATE OR REPLACE (sửa hàm chạy lại vô hại) + chính
-- `voucher_grant()` đã ON CONFLICT (user_id, voucher_id) DO NOTHING — trùng
-- người trùng voucher không cấp lần hai dù hàm này có chạy lại thế nào.
--
-- ACL: hàm ĐÃ REVOKE ALL FROM public/anon/authenticated từ trước (chỉ
-- postgres/service_role) — CREATE OR REPLACE giữ nguyên ACL, không cần vá.
-- ============================================================

BEGIN;

INSERT INTO public.voucher_defs (
  id, label, kind, value, max_discount_credits, scope, tool_ids,
  enabled, starts_at, ends_at, max_redemptions_total, min_purchase_credits, note
) VALUES (
  'chao-san-48h',
  'Chào sân — giảm 30% cho lượt mua đầu tiên (còn 48 giờ)',
  'percent', 30, 50, 'site', NULL,
  true, NULL, NULL, NULL, NULL,
  'Cấp tự động qua handle_new_user_signup() khi đăng ký thật (không ẩn danh, không domain email tạm). Trần 50 Lượng ~ 30% của tool 150 Lượng (nhóm giá phổ biến nhất).'
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  kind = EXCLUDED.kind,
  value = EXCLUDED.value,
  max_discount_credits = EXCLUDED.max_discount_credits,
  scope = EXCLUDED.scope,
  enabled = EXCLUDED.enabled,
  note = EXCLUDED.note,
  updated_at = now();

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

  IF NOT v_blocked THEN
    PERFORM public.voucher_grant(NEW.id, 'chao-san-48h', 'signup_welcome', now() + interval '48 hours');
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
