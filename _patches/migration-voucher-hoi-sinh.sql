-- migration-voucher-hoi-sinh.sql
-- ============================================================
-- HỒI SINH 7 NGÀY — trigger cấp tự động THỨ HAI cho Ví Ưu Đãi, sau "chào
-- sân 48h" (migration-voucher-welcome-48h.sql). Nhắm vào user CŨ đã im
-- lặng lâu ngày thay vì user MỚI đăng ký.
-- ============================================================
-- Cấp: gắn vào `runEmailReminderIdle()` đã có (lib/marketing/email-reminder.ts)
-- — tái dùng NGUYÊN segment `dashboard_at_risk` (còn Lượng > 0, đã hoạt động
-- đủ để không phải noise 1-lần-rồi-thôi, im lặng ≥ idle_days) + budget/dedupe
-- theo tháng đã có, không dựng cron song song cho cùng một đối tượng.
--
-- Gate TÁCH RIÊNG khỏi công tắc bật email (`enabledBudgetPerRun`): thêm
-- `voucherEnabled` (mặc định false) trong CÙNG khối JSON
-- `app_config['marketing.email_reminder_idle']` — bật email nhắc không tự
-- động phát sinh chi phí thật, Henry phải bật thêm RIÊNG mới có tiêu tiền.
--
-- 25%, trần 40 Lượng — thấp hơn một chút so với "chào sân" (30%, trần 50):
-- đối tượng này đã từng dùng sản phẩm nên rào cản chuyển đổi thấp hơn user
-- hoàn toàn mới, không cần khuyến mãi mạnh bằng. Hết hạn 7 ngày kể từ lúc
-- cấp — dài hơn 48h của welcome vì mốc kích hoạt ở đây là "vừa được nhắc
-- qua email" (có thể không đọc ngay), không phải "vừa đăng ký" (đang mở
-- app sẵn).
--
-- Idempotent: ON CONFLICT DO UPDATE. `voucher_grant()` tự ON CONFLICT DO
-- NOTHING (UNIQUE user_id+voucher_id) nên user quay lại nhiều tuần liền
-- trong segment cũng chỉ nhận ĐÚNG MỘT voucher hồi sinh, suốt đời — giống
-- chính sách "chào sân" (bắt đầu SIẾT, nới sau nếu cần thật).
-- ============================================================

INSERT INTO public.voucher_defs (
  id, label, kind, value, max_discount_credits, scope, tool_ids,
  enabled, starts_at, ends_at, max_redemptions_total, min_purchase_credits, note
) VALUES (
  'hoi-sinh-7d',
  'Hồi sinh — giảm 25% cho lượt mua tiếp theo (còn 7 ngày)',
  'percent', 25, 40, 'site', NULL,
  true, NULL, NULL, NULL, NULL,
  'Cấp tự động qua runEmailReminderIdle() (lib/marketing/email-reminder.ts) khi gửi email nhắc user còn Lượng, im lặng lâu — gate bằng app_config[''marketing.email_reminder_idle''].voucherEnabled, mặc định TẮT, tách khỏi công tắc bật email.'
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
