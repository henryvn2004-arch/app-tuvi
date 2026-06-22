-- _patches/migration-signup-bonus.sql
-- ============================================================
-- Quà chào mừng: tặng 25 Lượng cho MỖI user mới đăng ký.
--
-- ⚠️ THỰC TẾ PROD (rà 2026-06-22): grant này ĐÃ TỒN TẠI sẵn — trigger
--    `on_auth_user_created` trên auth.users gọi hàm `handle_new_user_signup()`.
--    Vì vậy KHÔNG tạo trigger/hàm mới (sẽ thành trigger thứ 2 → cấp 2 lần).
--    Cách đúng = CREATE OR REPLACE hàm CŨ, chỉ đổi số tặng. Đó là nội dung dưới.
--
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- Idempotent: chạy lại an toàn (CREATE OR REPLACE).
--
-- Kiểm trigger/hàm hiện trạng trước khi đổi:
--   SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
--   WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--   SELECT pg_get_functiondef('public.handle_new_user_signup'::regproc);
-- ============================================================

-- Đổi số tặng signup → 25 Lượng. Giữ nguyên logic "chỉ tặng lần đầu"
-- (ON CONFLICT DO UPDATE ... WHERE balance = 0) và ghi credit_transactions.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 25)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + 25
    WHERE public.user_credits.balance = 0; -- chỉ tặng lần đầu

  INSERT INTO public.credit_transactions (user_id, amount, type, description, created_at)
  VALUES (NEW.id, 25, 'signup_bonus', 'Tặng 25 lượng khi đăng ký tài khoản', now());

  RETURN NEW;
END;
$function$;

-- Trigger `on_auth_user_created` đã trỏ sẵn vào hàm này → KHÔNG cần tạo lại.
-- ============================================================
-- (TÙY CHỌN) Đổi số sau này: sửa cả 3 chỗ 25 + dòng mô tả rồi chạy lại.
-- (TÙY CHỌN) Backfill user CŨ chưa có Lượng nào — BỎ comment nếu muốn:
--    INSERT INTO public.user_credits (user_id, balance)
--    SELECT id, 25 FROM auth.users
--    ON CONFLICT (user_id) DO NOTHING;
-- ============================================================
