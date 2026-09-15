-- migration-abandoned-checkout.sql
-- ============================================================
-- ĐƠN RƠI — trigger cấp tự động THỨ BA cho Ví Ưu Đãi, sau "chào sân 48h"
-- (migration-voucher-welcome-48h.sql) và "hồi sinh 7 ngày"
-- (migration-voucher-hoi-sinh.sql). Nhắm vào user đã CÓ Ý ĐỊNH mua (bấm mở
-- khoá) nhưng chưa hoàn tất, khác "hồi sinh" (user CŨ, im lặng lâu — không
-- cần vừa có hành vi mua).
-- ============================================================
-- Segment: RPC MỚI `dashboard_abandoned_checkout` — chưa có RPC nào ở mức
-- TỪNG NGƯỜI cho việc này. `tool_funnel()` (migration-tool-funnel.sql) chỉ
-- đếm TỔNG theo tool (bao nhiêu người bấm mở vs bao nhiêu người mua), không
-- trả danh sách user_id cụ thể để cấp thưởng — không dùng trực tiếp được.
--
-- Tái dùng `tool_canon()` (đã có, migration-tool-funnel.sql) để so khớp
-- `events.tool_id` (tên shell) với `credit_transactions.type` (tên khác
-- hẳn, vd `luan-giai` ↔ `use_laso`) — bài học D1: join thô ra "0 người mua"
-- sai hoàn toàn. Neo mốc "có ý định" ở `unlock_click` (bắn ở CẢ 2 nhánh: đủ
-- Lượng lẫn thiếu Lượng phải nạp thêm) — bao trùm hơn `qr_shown`/`qr_close`
-- (chỉ áp dụng nhánh thiếu Lượng).
--
-- `p_min_gap_minutes` (mặc định 60): chỉ tính unlock_click CŨ HƠN mốc này —
-- tránh nhắc ngay khi giao dịch có thể vẫn đang xử lý (mạng chậm, chưa kịp
-- deduct). `p_max_age_hours` (mặc định 72): unlock_click CŨ HƠN mốc này bị
-- loại — quá cũ thì không còn là "đơn rơi" mới, để "hồi sinh" xử lý sau.
--
-- Voucher `don-roi-24h`: percent 15%, trần 25 Lượng — THẤP NHẤT trong 3
-- voucher (chào sân 30%/50, hồi sinh 25%/40): đối tượng này có Ý ĐỊNH MUA
-- CAO NHẤT (đã bấm mở khoá), cần ít thuyết phục nhất, khuyến mãi mạnh hơn
-- là lãng phí biên lợi nhuận cho một lượt đằng nào cũng gần chốt. Hết hạn
-- 24 giờ — ngắn nhất trong 3 (khẩn cấp "gần xong rồi, hoàn tất ngay").
--
-- CỐ Ý scope='site' (không riêng cho ĐÚNG tool họ bỏ dở) — xem chú thích
-- đầy đủ ở lib/marketing/email-abandoned-checkout.ts. Giữ ĐƠN GIẢN, tái
-- dùng nguyên voucher TĨNH như 2 trigger trước, không đổi `voucher_consume`
-- để enforce scope='tool' (chưa ai cần voucher scope='tool' thật).
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_abandoned_checkout(
  p_min_gap_minutes int DEFAULT 60,
  p_max_age_hours   int DEFAULT 72,
  p_limit           int DEFAULT 100
)
RETURNS TABLE (user_id uuid, email text, tool_id text, tool_label text, last_click timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH clicks AS (
    SELECT e.user_id AS uid, tool_canon(e.tool_id) AS tid, max(e.ts) AS last_click
      FROM events e
     WHERE e.event_type = 'unlock_click'
       AND e.user_id IS NOT NULL
       AND e.ts >= now() - (p_max_age_hours || ' hours')::interval
       AND e.ts <  now() - (p_min_gap_minutes || ' minutes')::interval
     GROUP BY e.user_id, tool_canon(e.tool_id)
  )
  SELECT c.uid, u.email, c.tid, p.label, c.last_click
    FROM clicks c
    JOIN auth.users u ON u.id = c.uid
    JOIN tool_pricing p ON p.tool_id = c.tid
   WHERE NOT EXISTS (
     SELECT 1 FROM credit_transactions ct
      WHERE ct.user_id = c.uid
        AND ct.amount < 0
        AND tool_canon(ct.type) = c.tid
   )
   ORDER BY c.last_click DESC
   LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.dashboard_abandoned_checkout(int, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_abandoned_checkout(int, int, int) TO service_role;

INSERT INTO public.voucher_defs (
  id, label, kind, value, max_discount_credits, scope, tool_ids,
  enabled, starts_at, ends_at, max_redemptions_total, min_purchase_credits, note
) VALUES (
  'don-roi-24h',
  'Hoàn tất ngay — giảm 15% (còn 24 giờ)',
  'percent', 15, 25, 'site', NULL,
  true, NULL, NULL, NULL, NULL,
  'Cấp tự động qua runEmailAbandonedCheckout() (lib/marketing/email-abandoned-checkout.ts) khi gửi email nhắc user đã bấm mở khoá một tool nhưng chưa mua — gate bằng app_config[''marketing.email_abandoned_checkout''].voucherEnabled, mặc định TẮT.'
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

COMMIT;
