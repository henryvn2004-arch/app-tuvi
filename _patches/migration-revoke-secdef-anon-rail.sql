-- _patches/migration-revoke-secdef-anon-rail.sql
-- ============================================================================
-- Vá 4 hàm SECURITY DEFINER còn hở cho `anon`: `anon_rail_trial_status`,
-- `anon_rail_trial_consume`, `anon_rail_hits_prune`, `credit_vnd`.
--
-- BỘ DÒ BẮT ĐƯỢC, KHÔNG PHẢI NGƯỜI — lượt thứ HAI liên tiếp: cảnh báo 3 giờ/lượt
-- của `security_audit()` (S6) nêu đích danh 4 hàm này ở mục `ham_ho_cho_anon`
-- lúc 10:00 VN 30/07, đúng một ngày sau khi nó bắt `marketing_signup_truth`
-- (`migration-revoke-signup-truth.sql`). Cùng một căn nguyên đã đo và ghi trong
-- `migration-revoke-secdef-sweep.sql`: quyền EXECUTE cho PUBLIC là DỰNG SẴN của
-- Postgres, `ALTER DEFAULT PRIVILEGES` không gỡ nổi → MỌI hàm mới đều sinh ra
-- hở, kể cả khi người viết không cấp quyền cho ai. Mặc định không phải hàng
-- phòng thủ; bộ dò chạy lại đều đặn mới là.
--
-- VÌ SAO LỌT: 4 hàm này KHÔNG có trong repo (quét cả `.ts/.js/.html/.sql/.json`
-- → 0 nơi gọi, 0 file migration). Chúng được tạo ad-hoc bằng Supabase MCP từ một
-- track khác đang dựng "rail dùng thử cho khách chưa đăng nhập" (bảng
-- `anon_rail_trial`/`anon_rail_hits` + 3 khoá `app_config` `anon.rail_*` đã có,
-- nhưng CẢ HAI BẢNG ĐỀU 0 DÒNG và không dòng code nào trên `main` gọi tới) →
-- không ai áp dòng `revoke` kết thúc theo quy ước.
--
-- MỨC ĐỘ THẬT (đã `set local role anon` chạy thử trên prod TRƯỚC khi vá,
-- trong transaction rồi rollback):
--   • credit_vnd()             → anon nhận về 1000. Chỉ là tỉ giá quy đổi Lượng
--     trong `app_config`, không phải dữ liệu ai — mức rò rỉ thấp nhất trong 4.
--   • anon_rail_trial_status() → anon nhận {cap:3, left:3, used:0} của BẤT KỲ
--     anon_id nào nó đoán được. Đọc hạn mức của người khác.
--   • anon_rail_trial_consume()→ hàm GHI, và là cái nguy hiểm thật: nó TIÊU
--     quota. Ai cũng gọi được nghĩa là ai cũng đốt được trần ngày toàn hệ thống
--     (`anon.rail_global_daily_cap` = 200) và trần theo IP (30) của người khác,
--     bằng vài dòng script với anon key vốn nằm sẵn trong mã nguồn trang. CÙNG
--     LOẠI với lỗ `rail_free_grant`/`viral_free_gen_gate` đã vá ở S0 và ở khối 1
--     của `migration-revoke-secdef-sweep.sql`.
--   • anon_rail_hits_prune()   → hàm GHI (DELETE): anon xoá được sổ đếm lượt
--     dùng thử, tức xoá luôn bằng chứng của cửa chặn lạm dụng.
--
-- AN TOÀN KHI THU QUYỀN — 3 vế đã kiểm, không suy đoán:
--   1. Prod KHÔNG có đường gọi nào: tính năng chưa deploy (không có trên `main`,
--      2 bảng rỗng). Track đang dựng nó gọi RPC ở đâu thì cũng phải đi qua route
--      server bằng service key như MỌI RPC khác của repo này — `service_role`
--      giữ nguyên quyền ở dưới, nên đường đó không đụng gì.
--      ⚠️ Nếu track đó ĐANG định gọi thẳng từ trình duyệt bằng anon key thì
--      thiết kế đó tự nó đã hỏng (đối số `p_anon_id` do client tự khai + `p_ip_hash`
--      không thể tính đúng ở client ⇒ trần nào cũng vượt được), phải đổi sang
--      gọi ở server chứ không phải mở lại quyền này.
--   2. `credit_vnd()` được gọi BÊN TRONG `dashboard_margin` và `viral_loop_funnel`
--      — cả hai đều SECURITY DEFINER thuộc `postgres`, nên lời gọi lồng nhau
--      chạy bằng quyền của CHỦ hàm, không phải của anon. Thu quyền không chạm.
--   3. KHÔNG có policy RLS nào và KHÔNG có view nào tham chiếu 4 hàm này (đã
--      quét `pg_policies` + `information_schema.views`) → không tái diễn cái bẫy
--      `is_admin()` mà `migration-revoke-secdef-sweep.sql` đã phải chừa lại.
--
-- Đã áp trực tiếp lên prod (project dciwkfdqhhddeymlisey) qua Supabase MCP.
-- File này ghi lại để repo phản ánh đúng thực trạng DB và để chạy lại được.
-- Idempotent. CỐ Ý KHÔNG `create or replace` lại 4 hàm: định nghĩa của chúng
-- thuộc track khác, chép vào đây sẽ thành bản thứ hai trôi khỏi bản thật.
-- ============================================================================

-- Ba đích `public, anon, authenticated` là BẮT BUỘC, không thừa — `public` là
-- grantee rỗng `=X/postgres` trong ACL; bỏ sót nó thì lệnh báo thành công mà
-- quyền còn nguyên (đúng cái bẫy đã mất một vòng chẩn đoán ở S0).
revoke execute on function public.credit_vnd()
  from public, anon, authenticated;
revoke execute on function public.anon_rail_trial_status(text)
  from public, anon, authenticated;
revoke execute on function public.anon_rail_trial_consume(text, text)
  from public, anon, authenticated;
revoke execute on function public.anon_rail_hits_prune()
  from public, anon, authenticated;

-- Đường đi thật của mọi lời gọi: route server bằng service key.
grant execute on function public.credit_vnd()                        to service_role;
grant execute on function public.anon_rail_trial_status(text)         to service_role;
grant execute on function public.anon_rail_trial_consume(text, text)  to service_role;
grant execute on function public.anon_rail_hits_prune()               to service_role;

-- ── Verify (đã chạy trên prod sau khi áp) ───────────────────────────────────
--   • ACL cả 4 còn đúng {postgres=X/postgres, service_role=X/postgres} — khớp y
--     hệt các hàm đã đóng ở S6 và ở migration-revoke-signup-truth.sql.
--   • `set local role anon` → cả 4 ném insufficient_privilege (kiểm bằng khối DO
--     bắt ngoại lệ cho từng hàm; không bắt được thì raise FAIL).
--   • service_role gọi vẫn ra kết quả bình thường (credit_vnd = 1000,
--     anon_rail_trial_status trả {cap,used,left}).
--   • `dashboard_margin` (hàm lồng credit_vnd) chạy bằng service_role vẫn OK.
--   • `security_audit()` → `ham_ho_cho_anon` RỖNG, cảnh báo đã tắt.
