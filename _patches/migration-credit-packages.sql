-- migration-credit-packages.sql
-- ============================================================
-- Đưa GÓI NẠP (PayPal USD + payOS VNĐ) vào DB để admin sửa credits/giá/nhãn
-- không cần deploy. Server /api/payment đọc qua lib/billing/packages.getPackages();
-- fallback hardcode trong module nếu DB đọc hụt (an toàn cho luồng thanh toán).
-- Idempotent. Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.credit_packages (
  package_id  text PRIMARY KEY,
  credits     integer NOT NULL,
  amount_vnd  integer NOT NULL,
  amount_usd  numeric(10,2) NOT NULL,
  label       text NOT NULL,
  bonus_label text,
  enabled     boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.credit_packages (package_id, credits, amount_vnd, amount_usd, label, bonus_label, sort_order) VALUES
  ('50',  50,  99000,  4.00,  'Khởi Đầu',  '+25%',  1),
  ('120', 120, 199000, 8.00,  'Phổ Thông', '+50%',  2),
  ('350', 350, 499000, 20.00, 'Cao Cấp',   '+75%',  3),
  ('800', 800, 999000, 40.00, 'VIP',       '+100%', 4)
ON CONFLICT (package_id) DO NOTHING;

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='credit_packages' AND policyname='credit_packages_read') THEN
    CREATE POLICY credit_packages_read ON public.credit_packages FOR SELECT USING (true);
  END IF;
END $$;
