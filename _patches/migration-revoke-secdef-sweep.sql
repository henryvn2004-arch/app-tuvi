-- _patches/migration-revoke-secdef-sweep.sql
-- ============================================================================
-- S6 (track COO) — RÀ QUYỀN RPC: đóng nốt lớp hàm SECURITY DEFINER đang mở
-- cho `anon` (tức cho BẤT KỲ AI mở trang web, vì anon key nằm sẵn trong mã
-- nguồn trang).
--
-- VÌ SAO CÒN SÓT SAU S0: S0 chỉ vá 4 hàm ví Lượng đã biết. Căn nguyên thì
-- nằm sâu hơn — `pg_default_acl` của schema `public` khai
--     ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO anon, authenticated
-- nên MỌI hàm mới sinh ra đều tự động hở, không cần ai cấp quyền cả. Vá từng
-- hàm là dập ngọn; khối 2 dưới đây mới là dập gốc.
--
-- MỨC ĐỘ THẬT (đã đóng vai `anon` chạy thử trên prod trước khi viết file này):
--   • dashboard_at_risk  → trả về EMAIL khách hàng.
--   • marketing_revenue  → trả về tổng doanh thu.
--   • rail_free_grant    → hàm GHI: tự cấp lượt chat miễn phí cho user bất kỳ.
--   • viral_free_gen_gate→ hàm GHI: đốt sạch ngân sách ảnh free trong ngày.
--   Ba cái sau cùng loại với lỗ đã vá ở S0, chỉ là sinh sau nên lọt lưới.
--
-- ⚠️ HAI THỨ CỐ Ý KHÔNG ĐỤNG — thu quyền mù sẽ làm hỏng prod:
--
--   1. `is_admin(text)` GIỮ NGUYÊN quyền cho anon + authenticated.
--      Nó được gọi BÊN TRONG 8 policy RLS (admin_users, app_config, events,
--      laso_public, purchases, spouse_portraits, tool_pricing, user_attribution),
--      và cả 8 đều gắn cho role `public`. Postgres đánh giá biểu thức policy
--      bằng quyền của NGƯỜI ĐANG TRUY VẤN, nên thu quyền là mọi truy vấn chạm
--      các bảng đó ném "permission denied for function is_admin" — kể cả khách
--      vãng lai đọc `tool_pricing` để hiện trang /cong-cu. Rò rỉ còn lại chỉ là
--      "email này có phải admin không" → trả boolean, chấp nhận được.
--
--   2. Nhóm pgvector (vector_*, halfvec_*, l2_distance…) không nằm trong danh
--      sách: chúng thuộc extension, KHÔNG phải SECURITY DEFINER, và chỉ là toán
--      tử thuần trên kiểu dữ liệu — không đọc được gì của ai.
--
-- ĐÃ ĐỐI CHỨNG TRƯỚC KHI ÁP: quét toàn bộ `public/` → KHÔNG một RPC nào được
-- gọi từ trình duyệt; mọi lời gọi đều qua route server bằng service key. Riêng
-- `incr_shared_counter` từng đi bằng anon key ở `app/api/share-session/track`
-- — đã đổi route đó sang service key TRONG CÙNG PR, nên thu quyền an toàn.
-- Diễn tập trong transaction rồi rollback: sau khi thu quyền, anon vẫn đọc
-- được tool_pricing (51 dòng) / laso_public / shared_results bình thường.
-- ============================================================================

-- ── Khối 1: thu quyền trên các hàm ĐANG tồn tại ─────────────────────────────
-- Ba đích `public, anon, authenticated` là BẮT BUỘC, không thừa:
--   • `public`        — mặc định của Postgres (hiện trong ACL dưới dạng grantee
--                       rỗng `=X/postgres`). Bỏ sót cái này thì lệnh chạy xong
--                       vẫn báo thành công mà quyền còn nguyên — đúng cái bẫy
--                       đã mất một vòng chẩn đoán ở S0.
--   • anon/authenticated — cấp tường minh bởi ALTER DEFAULT PRIVILEGES.

-- Ví Lượng & phần thưởng (hàm GHI — nguy hiểm nhất)
revoke execute on function public.rail_free_grant(uuid, integer)        from public, anon, authenticated;
revoke execute on function public.rail_free_consume(uuid)               from public, anon, authenticated;
revoke execute on function public.viral_free_gen_gate(uuid, text)       from public, anon, authenticated;
revoke execute on function public.process_referral_signup(uuid)         from public, anon, authenticated;
revoke execute on function public.get_credit_balance(uuid)              from public, anon, authenticated;

-- Hạn mức dùng thử (GHI — kẻ xấu có thể đốt quota của người khác)
revoke execute on function public.chat_incr_free_usage(text, text, date) from public, anon, authenticated;
revoke execute on function public.tg_incr_free_usage(text, date)         from public, anon, authenticated;

-- Bộ đếm chia sẻ (GHI — thổi phồng số liệu phễu viral)
revoke execute on function public.incr_shared_counter(text, text)        from public, anon, authenticated;
revoke execute on function public.incr_shared_result_view(text)          from public, anon, authenticated;

-- Số liệu kinh doanh & vận hành (ĐỌC — rò doanh thu, chi phí, email khách)
revoke execute on function public.admin_seo_stats()                                             from public, anon, authenticated;
revoke execute on function public.channel_error_rate(integer)                                   from public, anon, authenticated;
revoke execute on function public.dashboard_at_risk(integer, integer, integer)                  from public, anon, authenticated;
revoke execute on function public.dashboard_content_revenue(timestamptz, timestamptz)           from public, anon, authenticated;
revoke execute on function public.dashboard_engagement(integer)                                 from public, anon, authenticated;
revoke execute on function public.dashboard_margin(timestamptz, timestamptz)                    from public, anon, authenticated;
revoke execute on function public.marketing_acquisition(timestamptz, timestamptz)               from public, anon, authenticated;
revoke execute on function public.marketing_campaigns(timestamptz, timestamptz)                 from public, anon, authenticated;
revoke execute on function public.marketing_cohorts(integer)                                    from public, anon, authenticated;
revoke execute on function public.marketing_funnel(timestamptz, timestamptz)                    from public, anon, authenticated;
revoke execute on function public.marketing_revenue(timestamptz, timestamptz)                   from public, anon, authenticated;
revoke execute on function public.marketing_sources(timestamptz, timestamptz)                   from public, anon, authenticated;
revoke execute on function public.marketing_traffic(timestamptz, timestamptz)                   from public, anon, authenticated;
revoke execute on function public.viral_loop_funnel(timestamptz, timestamptz)                   from public, anon, authenticated;

-- Hàm trigger — không ai gọi trực tiếp, nhưng để hở thì không có lý do gì.
-- (Postgres kiểm quyền EXECUTE lúc CREATE TRIGGER, không phải lúc trigger nổ,
--  nên thu quyền KHÔNG làm hỏng trigger đang chạy.)
revoke execute on function public.handle_new_user_credits()          from public, anon, authenticated;
revoke execute on function public.handle_new_user_signup()           from public, anon, authenticated;
revoke execute on function public.trigger_referral_check_on_topup()  from public, anon, authenticated;

-- Bảo đảm service_role (đường đi thật của mọi route server) vẫn gọi được.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- ── Khối 2: siết mặc định — CÓ TÁC DỤNG MỘT PHẦN, đọc kỹ trước khi tin ──────
-- Ý định ban đầu là dập gốc: chỉnh `ALTER DEFAULT PRIVILEGES` để hàm sinh sau
-- này không tự hở nữa. THỰC TẾ ĐO ĐƯỢC KHÁC — và đây là chỗ dễ tự huyễn hoặc
-- nhất, nên ghi lại rõ:
--
--   Đã thử BA cách viết (có/không `FOR ROLE`, `FUNCTIONS`/`ROUTINES`,
--   `REVOKE EXECUTE`/`REVOKE ALL`), mỗi lần tạo một hàm canary rồi đo lại.
--   Kết quả cả ba lần y hệt nhau — ACL của hàm mới là:
--       {=X/postgres, postgres=X/postgres, service_role=X/postgres}
--   Mục `=X/postgres` (grantee rỗng = PUBLIC) là quyền EXECUTE DỰNG SẴN của
--   Postgres cho mọi hàm, và nó KHÔNG bị gỡ bởi ALTER DEFAULT PRIVILEGES ở
--   đây. `anon` là thành viên của PUBLIC → vẫn gọi được.
--
-- Vậy khối này được cái gì? Nó gỡ hai lượt cấp TƯỜNG MINH cho anon và
-- authenticated mà Supabase đặt sẵn. Hàm mới từ nay có 1 đường hở (PUBLIC)
-- thay vì 3. Đó là siết bớt, KHÔNG PHẢI đóng.
--
-- ⇒ HỆ QUẢ THIẾT KẾ: không được coi mặc định là hàng phòng thủ. Hai thứ thật
--   sự giữ trận địa là:
--     (a) mỗi migration tạo hàm mới PHẢI tự kết bằng
--         `revoke execute on function <ten> from public, anon, authenticated;`
--         — vốn đã là quy ước của repo từ S3/S4;
--     (b) bộ DÒ ĐỊNH KỲ (`security_audit()`, cùng PR này) — chạy mỗi 3 giờ,
--         hàm nào hở cho anon là báo ngay. Quy ước thì người ta quên; bộ dò
--         thì không.
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
