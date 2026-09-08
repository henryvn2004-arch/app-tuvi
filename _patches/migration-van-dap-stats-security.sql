-- _patches/migration-van-dap-stats-security.sql
-- ============================================================
-- Supabase advisor báo view `public.van_dap_stats` là "Security Definer View"
-- (mức ERROR, đã ghi ở docs/COO-ORCHESTRATOR-SCOPE.md). View chỉ đếm
-- draft/ready/published/tts/yt từ `van_dap`, được tạo tay ngoài migration
-- (owner postgres) nên chạy với quyền OWNER thay vì quyền người gọi → bỏ qua
-- RLS của `van_dap`. Đã cắn thêm một lỗ nữa: view này đang cấp full
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE cho CẢ anon lẫn authenticated, dù
-- không nơi nào trong code gọi nó qua PostgREST — chỉ dùng nội bộ (server/
-- SQL editor) qua service_role.
--
-- security_invoker=true (PG15+, project đang PG17) bắt view tôn trọng RLS +
-- quyền của người gọi thay vì của owner. Cùng lúc REVOKE anon/authenticated
-- để thu hẹp bề mặt lộ về đúng nhu cầu thật (chỉ service_role/postgres).
-- ============================================================

alter view public.van_dap_stats set (security_invoker = true);

revoke all on public.van_dap_stats from public, anon, authenticated;
grant select on public.van_dap_stats to service_role;
