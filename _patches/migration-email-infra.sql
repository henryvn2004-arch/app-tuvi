-- ============================================================
-- migration-email-infra.sql — hạ tầng email (Resend, nguồn DUY NHẤT)
--
-- Henry chốt (2026-09-14): Resend cho MỌI loại email (transactional lẫn
-- marketing), KHÔNG dùng thêm nền tảng marketing automation ngoài (Brevo/
-- HubSpot...) — điều kiện trigger cross-sell/reminder nằm sẵn trong Postgres
-- của mình (lịch sử mua, user_credits...), đẩy ra CRM ngoài rồi đồng bộ ngược
-- là thêm một nguồn sự thật thứ hai, đúng thứ codebase này luôn phải vá.
--
-- Hai bảng dưới phục vụ `lib/email/send.ts`:
--   1. email_log — dòng SỔ đi TRƯỚC làm mutex (giống chống trùng đường tiền:
--      UNIQUE (dedupe_key) chặn gửi lặp khi cron/route bị gọi lại). Cũng là
--      nơi DUY NHẤT trả lời "email này đã gửi chưa, gửi thành công không".
--   2. email_unsubscribes — bắt buộc theo Nghị định 91/2020/NĐ-CP (quảng cáo
--      qua email phải có cơ chế từ chối nhận). `sendMarketingEmail()` PHẢI
--      kiểm bảng này trước khi gửi; `sendTransactionalEmail()` (OTP/hoá đơn/
--      PDF luận giải) KHÔNG kiểm — đây là email người dùng chủ động yêu cầu,
--      không phải quảng cáo.
-- ============================================================

-- ── 1. Sổ gửi email (mutex chống gửi trùng) ─────────────────
CREATE TABLE IF NOT EXISTS public.email_log (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dedupe_key  text        NOT NULL,          -- vd 'invoice-<txn_id>' | 'pdf-<slug>' | 'crosssell-<user_id>-<tool_id>-<ngày>'
  kind        text        NOT NULL,          -- 'transactional' | 'marketing'
  template    text        NOT NULL,          -- 'invoice' | 'pdf-luan-giai' | 'reminder' | 'cross-sell' | 'broadcast' ...
  to_email    text        NOT NULL,
  user_id     uuid,                          -- NULL nếu người nhận chưa có tài khoản (khách vãng lai)
  provider_id text,                          -- id Resend trả về, để tra ngược khi có khiếu nại
  status      text        NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed' | 'skipped_unsubscribed'
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dedupe_key)
);

COMMENT ON TABLE public.email_log IS
  'Sổ MỌI email đã gửi qua lib/email/send.ts. UNIQUE(dedupe_key) là mutex chống gửi trùng — chèn dòng nháp TRƯỚC khi gọi Resend, giống chống trùng đường tiền.';

-- RLS bật, CỐ Ý không có policy: chỉ service_role (route/cron server) chạm
-- được, không có gì ở đây client cần đọc trực tiếp.
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_log_user ON public.email_log (user_id, created_at DESC);

-- ── 2. Từ chối nhận email quảng bá ───────────────────────────
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email          text        PRIMARY KEY,
  user_id        uuid,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  reason         text
);

COMMENT ON TABLE public.email_unsubscribes IS
  'Email đã từ chối nhận thư quảng bá. sendMarketingEmail() BẮT BUỘC kiểm bảng này trước khi gửi (Nghị định 91/2020/NĐ-CP). Không áp dụng cho email transactional (OTP/hoá đơn/PDF).';

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
