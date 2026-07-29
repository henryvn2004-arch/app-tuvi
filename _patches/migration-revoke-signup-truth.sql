-- _patches/migration-revoke-signup-truth.sql
-- ============================================================================
-- Vá lỗ SECURITY DEFINER còn hở cho `anon` — hàm `marketing_signup_truth`.
--
-- BỘ DÒ BẮT ĐƯỢC, KHÔNG PHẢI NGƯỜI: cảnh báo 3 giờ/lượt của `security_audit()`
-- (`_patches/migration-security-audit.sql`, S6) nêu đích danh hàm này ở mục
-- `ham_ho_cho_anon`. Đây đúng là kịch bản mà S6 đã dự liệu khi viết
-- `migration-revoke-secdef-sweep.sql`: quy ước thì người ta quên, bộ dò thì không.
--
-- VÌ SAO LỌT: hàm được tạo ad-hoc bằng Supabase MCP trong một phiên chẩn đoán
-- (đối chiếu số tài khoản `auth.users` với số dòng `user_attribution` khi lần ra
-- vì sao phễu đăng ký hụt), KHÔNG đi qua file migration nào trong repo — nên
-- không có ai áp dòng `revoke` kết thúc theo quy ước. Và như khối 2 của
-- `migration-revoke-secdef-sweep.sql` đã đo và ghi lại: `ALTER DEFAULT
-- PRIVILEGES` KHÔNG gỡ được quyền EXECUTE dựng sẵn của Postgres cho PUBLIC, nên
-- mọi hàm mới vẫn sinh ra với `=X/postgres` trong ACL. `anon` là thành viên của
-- PUBLIC → gọi được. Mặc định không phải hàng phòng thủ.
--
-- MỨC ĐỘ THẬT (đã `set local role anon` chạy thử trên prod TRƯỚC khi vá):
--   anon gọi được và nhận về {accounts, attributed, tracking_since} — tức tổng
--   số tài khoản đã đăng ký của site. Không rò email hay dữ liệu cá nhân (hàm
--   chỉ `count(*)`), nhưng vẫn là số liệu kinh doanh nội bộ phát cho bất kỳ ai
--   mở trang web, vì anon key nằm sẵn trong mã nguồn trang.
--
-- AN TOÀN KHI THU QUYỀN: quét toàn repo (`.ts/.js/.html/.sql/.json`) → KHÔNG
-- một nơi nào gọi hàm này, cả client lẫn route server. Nó thuần công cụ chẩn
-- đoán, chạy tay qua service key. Giữ lại (không DROP) vì còn dùng để đối chiếu
-- số đăng ký; chỉ đóng cửa cho khách vãng lai.
--
-- Đã áp trực tiếp lên prod (project dciwkfdqhhddeymlisey) qua Supabase MCP.
-- File này ghi lại để repo phản ánh đúng thực trạng DB và để chạy lại được.
-- Idempotent.
-- ============================================================================

-- Định nghĩa hàm — chép đúng bản đang chạy trên prod (`pg_get_functiondef`),
-- để file tự đủ nghĩa nếu ai đó dựng lại DB từ repo.
create or replace function public.marketing_signup_truth(
  p_from timestamptz,
  p_to   timestamptz
)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'accounts', (select count(*) from auth.users where created_at >= p_from and created_at < p_to),
    'attributed', (select count(*) from auth.users u join user_attribution ua on ua.user_id = u.id
                   where u.created_at >= p_from and u.created_at < p_to),
    'tracking_since', (select min(ts) from events)
  );
$$;

-- Ba đích `public, anon, authenticated` là BẮT BUỘC, không thừa — `public` là
-- grantee rỗng `=X/postgres` trong ACL; bỏ sót nó thì lệnh báo thành công mà
-- quyền còn nguyên (đúng cái bẫy đã mất một vòng chẩn đoán ở S0).
revoke execute on function public.marketing_signup_truth(timestamptz, timestamptz)
  from public, anon, authenticated;

-- Đường đi thật của mọi lời gọi: route server bằng service key.
grant execute on function public.marketing_signup_truth(timestamptz, timestamptz)
  to service_role;

-- ── Verify (đã chạy trên prod sau khi áp) ───────────────────────────────────
--   • ACL còn đúng {postgres=X/postgres, service_role=X/postgres} — khớp y hệt
--     12 hàm marketing_*/dashboard_* đã đóng ở S6.
--   • `set local role anon` → gọi ném insufficient_privilege (kiểm bằng khối DO
--     bắt ngoại lệ; không bắt được thì raise FAIL).
--   • service_role gọi vẫn ra kết quả bình thường.
--   • `security_audit(24,20,20)` → `ham_ho_cho_anon` rỗng, cảnh báo đã tắt.
