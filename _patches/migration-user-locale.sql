-- ============================================================
-- migration-user-locale.sql — ngôn ngữ ưa thích của người dùng (W11, đa ngôn ngữ)
--
-- Vì sao: email (hoá đơn, PDF, reminder, cross-sell, broadcast) phải gửi bằng
-- đúng ngôn ngữ khách. Hoá đơn được gửi từ WEBHOOK PayPal (không có cookie của
-- trình duyệt), cron thì không có request nào cả — nên ngôn ngữ phải nằm ở DB,
-- không đọc được từ cookie `tvmb_locale` lúc gửi. Cookie chỉ được đọc lúc khách
-- còn ngồi trước máy (mua hàng / gửi PDF) rồi ghi vào đây bởi
-- `lib/email/locale.ts::saveUserLocale`.
--
-- Bảng riêng thay vì cột trên `auth.users`/metadata: không đụng schema `auth`,
-- không cần quyền admin GoTrue để ghi, và đọc theo lô cho cron bằng một câu
-- `user_id=in.(...)`.
--
-- ⚠️ CHƯA CHẠY trên prod. Henry chạy trong Supabase SQL editor. Thiếu bảng thì
-- code vẫn chạy: đọc hụt → tiếng Việt như trước (xem getUserLocale), ghi hụt →
-- console.error rồi bỏ qua. An toàn chạy TRƯỚC hoặc SAU deploy code.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_locale (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale     text        NOT NULL CHECK (locale IN ('vi','en','ja','ko','zh-tw','zh-cn')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_locale IS
  'Ngôn ngữ ưa thích (khớp lib/i18n/locales.ts) — nguồn để gửi email đúng ngôn ngữ. Ghi từ cookie tvmb_locale lúc mua/gửi PDF.';

-- RLS bật, CỐ Ý không có policy: chỉ service_role (route/cron server) chạm được.
ALTER TABLE public.user_locale ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_locale FROM anon, authenticated;
