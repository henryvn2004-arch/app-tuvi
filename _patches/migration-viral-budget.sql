-- ============================================================
-- migration-viral-budget.sql  (Viral Loop V2.2 — sửa số + cầu dao ngân sách)
--
-- 1) Bộ số Henry đã chốt (bảng trong CLAUDE.md, track Viral Loop):
--      quà đăng ký      25 Lượng CỐ ĐỊNH (dừng A/B [20,30,40])
--      thưởng mời bạn   15 Lượng  (cố ý THẤP hơn giá tool để ép mời nhiều)
--      trần lượt mời    15        (= tối đa 225 Lượng/người)
-- 2) Cầu dao ngân sách ảnh free — $15/tháng ≈ 6 lượt gen/ngày.
-- 3) Tặng lượt rail miễn phí sau khi vẽ xong (vá "tension" đã flag: quà 25 −
--    giá tiền kiếp 25 = 0 Lượng, mà rail tốn 5/lượt → user mới không hỏi được
--    nhân vật câu nào, trong khi rail chính là móc upsell của tool).
-- ============================================================

-- ── 1. Bộ số đã chốt ────────────────────────────────────────
INSERT INTO public.app_config (key, value) VALUES
  ('credits.signup_bonus_variants', '[25]'::jsonb),
  ('referral.signup_bonus_referrer', '15'::jsonb),
  ('referral.signup_reward_cap',     '15'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── 2. Cấu hình cầu dao (đổi không cần deploy) ───────────────
-- free_gen_daily_cap: suy từ $15/tháng ÷ ~$0.09/lượt ÷ 30 ngày ≈ 6.
-- free_gen_tools: CHỈ các tool sinh ảnh đắt tiền mới bị đo — tool chữ rẻ hơn
--   hai bậc, chặn chúng chỉ làm hỏng trải nghiệm mà không tiết kiệm bao nhiêu.
-- free_gen_monthly_usd: ghi lại để biết con số 6 suy ra từ đâu (không code nào đọc).
INSERT INTO public.app_config (key, value) VALUES
  ('viral.free_gen_daily_cap',  '6'::jsonb),
  ('viral.free_gen_tools',      '["chan-dung-tien-kiep","chan-dung-vo-chong"]'::jsonb),
  ('viral.free_gen_monthly_usd','15'::jsonb),
  ('viral.free_rail_turns',     '2'::jsonb)
ON CONFLICT (key) DO NOTHING;   -- đã chỉnh tay thì giữ nguyên

-- ── 3. Cầu dao: đếm lượt gen FREE toàn hệ thống trong NGÀY ───
-- "Free" = lượt của người CHƯA TỪNG NẠP TIỀN THẬT. Lượng của họ 100% là quà
-- (signup bonus + thưởng giới thiệu) nên mỗi lượt gen là tiền túi mình bỏ ra.
-- Người đã nạp thì đang tiêu tiền của chính họ → KHÔNG bao giờ bị chặn.
--
-- Đếm theo credit_transactions vì đó là nơi lượt dùng được ghi TRƯỚC khi gọi
-- model (client trừ Lượng rồi mới gọi route) → chặn được trước khi tốn tiền.
-- Khớp cả `slug` (generateToolSlug luôn dựng '<tool_id>-...') LẪN `type` cả 2
-- biến thể gạch-ngang/gạch-dưới — lịch sử có cả `use_chan_dung_vo_chong` lẫn
-- `use_chan-dung-tien-kiep`, bỏ sót một dạng là đếm hụt.
CREATE OR REPLACE FUNCTION public.viral_free_gen_gate(p_user_id uuid, p_tool_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cap   int;
  v_tools text[];
  v_used  int;
  v_paid  boolean;
BEGIN
  SELECT (value#>>'{}')::int INTO v_cap FROM app_config WHERE key = 'viral.free_gen_daily_cap';
  IF v_cap IS NULL THEN v_cap := 6; END IF;

  SELECT array(SELECT jsonb_array_elements_text(value)) INTO v_tools
    FROM app_config WHERE key = 'viral.free_gen_tools';
  IF v_tools IS NULL THEN v_tools := ARRAY['chan-dung-tien-kiep','chan-dung-vo-chong']; END IF;

  -- Trần ≤ 0 = TẮT cầu dao (cho Henry mở van nhanh mà không cần sửa code).
  IF v_cap <= 0 OR NOT (p_tool_id = ANY(v_tools)) THEN
    RETURN json_build_object('allowed', true, 'reason', 'not_metered', 'cap', v_cap);
  END IF;

  SELECT EXISTS (SELECT 1 FROM credit_transactions WHERE user_id = p_user_id AND type = 'topup')
    INTO v_paid;
  IF v_paid THEN
    RETURN json_build_object('allowed', true, 'reason', 'paying_user', 'cap', v_cap);
  END IF;

  SELECT count(*) INTO v_used
    FROM credit_transactions ct
   WHERE ct.amount < 0
     AND (ct.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
       = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     AND EXISTS (
       SELECT 1 FROM unnest(v_tools) t
        WHERE ct.slug LIKE t || '-%'
           OR ct.type = 'use_' || t
           OR ct.type = 'use_' || replace(t, '-', '_')
     )
     AND NOT EXISTS (
       SELECT 1 FROM credit_transactions p
        WHERE p.user_id = ct.user_id AND p.type = 'topup'
     );

  RETURN json_build_object(
    'allowed', v_used < v_cap,
    'used',    v_used,
    'cap',     v_cap,
    'reason',  CASE WHEN v_used < v_cap THEN 'ok' ELSE 'daily_cap' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.viral_free_gen_gate(uuid, text) TO service_role;

-- ── 4. Lượt rail miễn phí sau khi vẽ xong ───────────────────
-- CỐ Ý KHÔNG tặng bằng Lượng: Lượng tiêu được vào bất cứ đâu, nên tặng 10 Lượng
-- (=2 lượt rail) sau MỖI lần vẽ là mở đường tích góp thành một lượt vẽ free nữa.
-- Quầy đếm riêng chỉ tiêu được ở rail, không quy đổi ngược.
CREATE TABLE IF NOT EXISTS public.rail_free_turns (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  remaining     int  NOT NULL DEFAULT 0,
  granted_total int  NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rail_free_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rail_free_turns_self_read ON public.rail_free_turns;
CREATE POLICY rail_free_turns_self_read ON public.rail_free_turns
  FOR SELECT USING (auth.uid() = user_id);

-- ĐẶT (không CỘNG DỒN) về mức p_n: vẽ 3 lần không thành 6 lượt rail free.
CREATE OR REPLACE FUNCTION public.rail_free_grant(p_user_id uuid, p_n int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_left int;
BEGIN
  IF p_n IS NULL OR p_n <= 0 THEN
    RETURN coalesce((SELECT remaining FROM rail_free_turns WHERE user_id = p_user_id), 0);
  END IF;
  INSERT INTO rail_free_turns (user_id, remaining, granted_total, updated_at)
  VALUES (p_user_id, p_n, p_n, now())
  ON CONFLICT (user_id) DO UPDATE
    SET remaining     = greatest(rail_free_turns.remaining, p_n),
        granted_total = rail_free_turns.granted_total
                        + greatest(0, p_n - rail_free_turns.remaining),
        updated_at    = now()
  RETURNING remaining INTO v_left;
  RETURN v_left;
END;
$$;

-- Tiêu 1 lượt, ATOMIC (UPDATE ... WHERE remaining > 0). true = đã tiêu được.
CREATE OR REPLACE FUNCTION public.rail_free_consume(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_left int;
BEGIN
  UPDATE rail_free_turns
     SET remaining = remaining - 1, updated_at = now()
   WHERE user_id = p_user_id AND remaining > 0
  RETURNING remaining INTO v_left;
  RETURN v_left IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rail_free_grant(uuid, int)  TO service_role;
GRANT EXECUTE ON FUNCTION public.rail_free_consume(uuid)     TO service_role;
