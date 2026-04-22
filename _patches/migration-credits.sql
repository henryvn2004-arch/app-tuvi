-- ============================================================
-- CREDIT SYSTEM MIGRATION — chạy trong Supabase SQL Editor
-- ============================================================

-- 1. Bảng số dư credits của từng user
CREATE TABLE IF NOT EXISTS user_credits (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_credits" ON user_credits FOR ALL USING (auth.uid() = user_id);

-- 2. Bảng lịch sử giao dịch credits
CREATE TABLE IF NOT EXISTS credit_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount           INTEGER NOT NULL,   -- dương = nạp, âm = dùng
  type             TEXT NOT NULL,      -- 'topup' | 'use_laso' | 'use_xem_tuoi' | 'use_xem_lam_an'
  description      TEXT,
  slug             TEXT,               -- slug của tool đã dùng (để check re-access)
  paypal_order_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_transactions" ON credit_transactions FOR ALL USING (auth.uid() = user_id);

-- 3. Hàm atomic: nạp credits
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_bal INTEGER;
BEGIN
  INSERT INTO user_credits (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = user_credits.balance + p_amount, updated_at = NOW()
  RETURNING balance INTO new_bal;
  RETURN new_bal;
END;
$$;

-- 4. Hàm atomic: trừ credits (thất bại nếu không đủ)
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_bal INTEGER;
BEGIN
  UPDATE user_credits
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO new_bal;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;
  RETURN new_bal;
END;
$$;
