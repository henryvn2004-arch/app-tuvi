-- Đợt 2 pre-flight (2026-09-25): trong lúc dò credit_transactions để dựng
-- user_reports, phát hiện policy own_transactions cũ là `FOR ALL USING
-- (auth.uid()=user_id)` KHÔNG có WITH CHECK riêng — Postgres RLS dùng lại
-- USING cho cả INSERT/UPDATE/DELETE khi thiếu WITH CHECK. Cộng với GRANT mặc
-- định Supabase (anon+authenticated có đủ INSERT/UPDATE/DELETE ở cấp bảng),
-- kết quả là BẤT KỲ user đã đăng nhập nào cũng tự INSERT được một dòng giả
-- (user_id=chính mình, amount âm bất kỳ, slug bất kỳ) thẳng qua PostgREST
-- bằng anon key + JWT của họ — không đụng gì tới deduct_credits/user_credits
-- (RPC đó đã bị revoke từ trước), nhưng credit_transactions LẠI CHÍNH LÀ
-- nguồn duy nhất mà hasSlugAccess/hasAnySlugAccess/hasRecentToolPayment
-- (lib/billing/credits.ts) dựa vào để quyết "đã trả tiền chưa" — tức tự chèn
-- một dòng giả là mở khoá được BẤT KỲ report trả phí nào, miễn phí, không
-- giới hạn. Xác minh: rpc('deduct_credits')/logTransaction() và mọi API
-- route đọc/ghi bảng này đều dùng SUPABASE_SERVICE_KEY (bypass RLS hoàn
-- toàn) — duy nhất public/account-core.js:900 đọc bảng này từ client, và đó
-- là GET (xem lịch sử), không phải ghi. Vá bằng đúng mẫu đã dùng cho
-- report_links/cron_runs trong chính DB này: SELECT vẫn mở cho chủ dòng
-- (khách cần xem lịch sử giao dịch của mình), INSERT/UPDATE/DELETE thu hết
-- về service_role.
--
-- ĐÃ ÁP DỤNG TRỰC TIẾP lên Supabase project dciwkfdqhhddeymlisey lúc phát
-- hiện (2026-09-25) — file này chỉ để lưu lại lịch sử/đối chiếu, khớp quy
-- ước "mọi thay đổi schema nằm trong _patches/*.sql" của repo.
drop policy if exists "own_transactions" on public.credit_transactions;
create policy "own_transactions_select" on public.credit_transactions
  for select using (auth.uid() = user_id);

revoke insert, update, delete, truncate on public.credit_transactions from anon, authenticated;
