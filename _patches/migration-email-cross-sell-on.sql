-- Bật email bán chéo (Henry chốt 2026-09-26): cron T6 + CN, mỗi người tối đa
-- MỘT thư/lượt ⇒ tối đa 2 thư/tuần (chặn nằm trong lib/marketing/email-cross-sell.ts).
--
-- ⚠️ THỨ TỰ DEPLOY: chạy SAU khi PR đổi lịch T6+CN + chặn 1 thư/người/lượt đã lên
-- prod. Bật trước là bản cũ (T5, không chặn, link .html đã xoá) gửi thật.
--
-- Mốc 2026-09-26: 56 người đủ điều kiện trên 5 cặp (luan-giai→bat-tu chiếm 48).
-- Mỗi cặp chỉ gửi MỘT lần/người (dedupe email_log) nên 100/lượt là trần an toàn.

update app_config
   set value = '{"enabledBudgetPerRun": 100, "maxCandidatesPerPair": 50}'::jsonb
 where key = 'marketing.email_cross_sell';
insert into app_config(key, value)
  select 'marketing.email_cross_sell', '{"enabledBudgetPerRun": 100, "maxCandidatesPerPair": 50}'::jsonb
 where not exists (select 1 from app_config where key = 'marketing.email_cross_sell');

-- Verify: SELECT value FROM app_config WHERE key = 'marketing.email_cross_sell';
--   → {"enabledBudgetPerRun": 100, "maxCandidatesPerPair": 50}
-- Tắt lại: đặt enabledBudgetPerRun = 0.
