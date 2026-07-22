-- migration-admin-config-access.sql
-- ============================================================
-- Cho trang admin ĐỌC app_config trực tiếp (khối "Khuyến mãi & Referral").
-- app_config bật RLS nhưng không có policy → deny-all cho anon/authenticated;
-- server đọc bằng service key (bypass). Thêm SELECT policy CHỈ cho admin JWT
-- (public/anon vẫn KHÔNG đọc được config — an toàn cho prompt/giá nội bộ).
-- Ghi app_config vẫn qua /api/payment admin-set-config (service key), không cần
-- write policy. Idempotent.
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_config' AND policyname='app_config_admin_read') THEN
    CREATE POLICY app_config_admin_read ON public.app_config FOR SELECT
      USING ((auth.jwt()->>'email') = 'admin@tuviminhbao.com');
  END IF;
END $$;
