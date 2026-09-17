-- ============================================================
-- migration-report-links.sql — permalink riêng tư cho báo cáo luận giải
-- (Pha 5b productize luận giải, 2026-09-17)
--
-- Henry chọn mô hình "token ngẫu nhiên trong URL" (magic link) cho việc gửi
-- link xem báo cáo qua email: KHÔNG cần đăng nhập để mở (mở trên điện thoại
-- khác máy đã đăng ký vẫn xem được), nhưng KHÔNG đoán được URL (khác hẳn
-- `/la-so/<slug>` — trang SEO công khai có sẵn, slug là hàm thuần của ngày
-- sinh, KHÔNG có gì bí mật, ai biết ngày giờ sinh + giới tính của một người
-- ĐÃ từng luận giải cũng tính ra được slug và đọc trọn nội dung).
--
-- 🔑 KHÔNG lưu token vào cột mới trên `laso_public` — bảng đó có policy
-- "Public read" (qual:true) cho role `public`, tức MỌI cột đều lộ qua REST
-- API bằng anon key kể cả không qua route nào của mình. Bảng RIÊNG, RLS bật
-- KHÔNG có policy — chỉ service_role (route server) đọc được, đúng khuôn
-- `email_log`/`shared_results` đã có.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.report_links (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token      text        NOT NULL,          -- random 32+ ký tự url-safe, sinh ở route (crypto.randomBytes)
  slug       text        NOT NULL,          -- laso_public.slug báo cáo này mở khoá
  tool_id    text        NOT NULL,          -- 'laso' | 'chu-trinh-cuoc-doi' — tránh suy lại từ tiền tố slug ở trang xem
  user_id    uuid        NOT NULL,          -- chủ sở hữu tại thời điểm sinh token, chỉ để tra cứu/thống kê
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token),
  UNIQUE (slug)            -- một slug tối đa MỘT token sống — gọi lại route sinh token thì TRẢ LẠI token cũ, không đẻ thêm
);

COMMENT ON TABLE public.report_links IS
  'Magic link xem báo cáo luận giải qua email — token ngẫu nhiên KHÔNG đoán được, khác /la-so/<slug> (slug suy được từ ngày sinh, công khai). RLS bật, không policy: chỉ service_role (app/api/luan-giai/resend-pdf, app/ket-qua-laso/[token]) chạm được.';

ALTER TABLE public.report_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_report_links_user ON public.report_links (user_id, created_at DESC);
