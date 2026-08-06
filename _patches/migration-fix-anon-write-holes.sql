-- Vá 2 lỗ RLS phát hiện qua báo cáo COO vận hành 2026-08-06:
-- anon/public đang có quyền GHI không giới hạn trên 2 bảng.

-- 1) van_dap — policy "anon full access for now" (ALL, qual=true, with_check=true)
--    cho phép BẤT KỲ AI (kể cả không đăng nhập) INSERT/UPDATE/DELETE mọi dòng
--    (137 dòng lúc phát hiện — kho Khảo Luận + pipeline video).
--    Đã soát code: admin.html/admin-content.html (sbFetch) ghi bảng này bằng
--    JWT CỦA CHÍNH ADMIN đăng nhập (Authorization: Bearer _token), KHÔNG phải
--    anon key trần → thay bằng policy is_admin() (đúng pattern tool_pricing_
--    admin_write) là an toàn, không đụng tính năng admin. Cron/pipeline ghi
--    qua service_role (bypass RLS) đã có "service_role full access" riêng.
--    "anon read published" (SELECT publish_status='published') giữ nguyên.
--
--    ✅ ĐÃ CHẠY prod 2026-08-06 qua Supabase MCP.
drop policy if exists "anon full access for now" on public.van_dap;

create policy "van_dap_admin_write" on public.van_dap
  for all
  using (is_admin((auth.jwt() ->> 'email'::text)))
  with check (is_admin((auth.jwt() ->> 'email'::text)));


-- 2) laso_public — policy "laso_public anon update" (UPDATE, qual=true, không
--    WITH CHECK) cho phép anon SỬA bất kỳ dòng cache lá số công khai nào (33
--    dòng lúc phát hiện — nội dung trang SEO công khai /la-so/*). Cộng thêm 2
--    policy INSERT trùng nhau ("API insert" + "laso_public anon insert") cũng
--    mở cho anon không giới hạn.
--
--    ⚠️ KHÁC van_dap: route DUY NHẤT còn ghi bảng này bằng anon key thật là
--    app/api/save-laso/route.ts (đã sửa sang SUPABASE_SERVICE_KEY trong PR đi
--    kèm migration này — xem commit cùng lúc). 2 route khác đụng laso_public
--    (upload-laso-image, history) ĐÃ dùng service key từ trước, không phụ
--    thuộc 3 policy này.
--
--    ⛔ CHỈ CHẠY SAU KHI code save-laso/route.ts đã DEPLOY LÊN PROD — chạy
--    trước sẽ làm route đó lỗi ("permission denied") cho tới lúc deploy xong,
--    vì code cũ (đang chạy) vẫn dùng anon key.
drop policy if exists "API insert" on public.laso_public;
drop policy if exists "laso_public anon insert" on public.laso_public;
drop policy if exists "laso_public anon update" on public.laso_public;
-- Giữ nguyên "Public read" + "laso_public anon select" (cả hai SELECT true,
-- vô hại — laso_public là cache công khai theo thiết kế) và "admin_read_laso".


-- 3) wardrobe-items (bucket storage, public=true) — CHƯA VÁ, cần quyết định:
--    không chỗ nào trong code cần bucket này public (ảnh chỉ hiện cho chính
--    chủ qua <img src>, AI stylist chỉ nhận text mô tả, tool try-on gửi ảnh
--    dạng base64 chứ không dùng URL) — khác hẳn `portraits`/`laso-images` vốn
--    CẦN public cho og:image/API ngoài. Nhưng chuyển sang private đòi sửa cả
--    client (loadWardrobe trong public/tools/xlook.html) lẫn server (cấp
--    signed URL thay vì public URL) — rủi ro hơn 2 mục trên, để riêng.
