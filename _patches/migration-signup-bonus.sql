-- _patches/migration-signup-bonus.sql
-- ============================================================
-- Quà chào mừng: tặng 25 Lượng cho MỖI user mới đăng ký.
-- Cấp tự động qua trigger trên auth.users (Supabase Auth).
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
--
-- ⚠️ TRƯỚC KHI CHẠY — kiểm tra đã có trigger grant cũ (vd tặng 10) chưa,
--    để khỏi cấp 2 lần (10 + 25). Chạy query này xem các trigger trên auth.users:
--
--    SELECT tgname, pg_get_triggerdef(oid)
--    FROM pg_trigger
--    WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
--
--    Nếu thấy trigger grant cũ tên KHÁC 'on_auth_user_created_credits',
--    DROP nó trước (DROP TRIGGER <ten> ON auth.users;) rồi mới chạy phần dưới.
-- ============================================================

-- Hàm cấp 25 Lượng cho user mới. SECURITY DEFINER để ghi được vào public.user_credits.
-- ON CONFLICT DO NOTHING: nếu đã có dòng credits thì không cộng đè (tránh double-grant).
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, updated_at)
  VALUES (NEW.id, 25, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 25, 'signup_bonus', 'Quà chào mừng thành viên mới');

  RETURN NEW;
END;
$$;

-- Gắn trigger (drop bản cũ cùng tên nếu có → idempotent, chạy lại an toàn).
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- ============================================================
-- (TÙY CHỌN) Đổi số 25 sau này: sửa số trong hàm trên rồi chạy lại CREATE OR REPLACE.
-- (TÙY CHỌN) Backfill cho user CŨ chưa có Lượng nào — BỎ comment nếu muốn:
--    INSERT INTO public.user_credits (user_id, balance)
--    SELECT id, 25 FROM auth.users
--    ON CONFLICT (user_id) DO NOTHING;
-- ============================================================
