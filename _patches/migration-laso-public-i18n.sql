-- ============================================================
-- migration-laso-public-i18n.sql — bản luận lá số theo NGÔN NGỮ (i18n W17, 2026-11)
--
-- `laso_public.luan_giai` khoá theo SLUG, không có cột ngôn ngữ, và CHỈ giữ
-- tiếng Việt (CLAUDE.md "Ngôn ngữ đầu ra LLM"). Khách /ja /ko /zh-* /en sinh luận
-- bằng ngôn ngữ của họ — trước bảng này bản đó KHÔNG được lưu ở đâu (save-laso bỏ
-- chữ luận khi locale ≠ vi), nên quay lại là sinh lại, còn trang đọc cache thì
-- trả bản VIỆT dưới giao diện Nhật.
--
-- 🔑 ADDITIVE, không di chuyển dữ liệu: bản `vi` ở NGUYÊN cột cũ, không ai đổi
-- byte nào của nó. Bảng này chỉ chứa ngôn ngữ ≠ vi, một dòng mỗi (slug, locale).
--
-- Vì sao BẢNG CON chứ không cột jsonb `{ja:{…}}` trên laso_public:
--   • laso_public có policy "Public read" (qual:true) và nhiều chỗ `select=*`
--     (la-so.html, /api/get-laso, /la-so/<slug>) ⇒ cột mới lộ qua anon key và
--     làm phình mọi payload đọc lá số với đủ 5 ngôn ngữ.
--   • Ghi luận là read-modify-write theo SỐ PHẦN; hai ngôn ngữ chung một ô jsonb
--     thì lượt lưu của ja và ko tranh nhau ghi đè cả ô (lost update).
--   • Bảng riêng: RLS bật KHÔNG policy (chỉ service_role, như report_links/
--     email_log), gỡ được bằng DROP mà không đụng laso_public.
--
-- Không FK sang laso_public(slug): repo không chứa định nghĩa bảng đó nên không
-- chứng minh được slug có UNIQUE — FK sai thì cả migration ĐỔ. Code luôn ghi
-- laso_public TRƯỚC (save-laso) rồi mới ghi bảng này; laso_public không có đường
-- xoá dòng nào trong code nên không sinh dòng mồ côi.
--
-- Idempotent: chạy lại an toàn. Code chịu được lúc bảng/hàm CHƯA tồn tại (đọc
-- hụt ⇒ sinh như cũ, ghi hỏng ⇒ console.error, không 500) ⇒ chạy TRƯỚC hay SAU
-- deploy đều được; trước thì đỡ một khoảng các bản ja/ko… sinh ra mà không lưu.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.laso_public_i18n (
  slug       text        NOT NULL,          -- = laso_public.slug (cùng makeLasoSlug)
  locale     text        NOT NULL,          -- en | ja | ko | zh-tw | zh-cn — KHÔNG có vi (vi ở laso_public)
  luan_giai  jsonb       NOT NULL DEFAULT '{}'::jsonb, -- khoá theo SỐ PHẦN, cùng hình laso_public.luan_giai
  nam_xem    integer,                       -- năm xem của các phần phụ thuộc năm (phần 24, Vận Hạn 12 Tháng)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT laso_public_i18n_pk PRIMARY KEY (slug, locale),
  CONSTRAINT laso_public_i18n_locale_chk CHECK (locale IN ('en', 'ja', 'ko', 'zh-tw', 'zh-cn')),
  CONSTRAINT laso_public_i18n_obj_chk CHECK (jsonb_typeof(luan_giai) = 'object')
);

COMMENT ON TABLE public.laso_public_i18n IS
  'Bản luận lá số theo ngôn ngữ ≠ vi (i18n W17). vi ở laso_public.luan_giai. RLS bật, không policy: chỉ service_role (lib/laso/luan-i18n.ts) chạm được. Quyền sở hữu vẫn theo SLUG (credit_transactions), không theo ngôn ngữ.';

ALTER TABLE public.laso_public_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.laso_public_i18n FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.laso_public_i18n TO service_role;

-- Gộp NÔNG theo khoá phần, NGUYÊN TỬ (một câu INSERT … ON CONFLICT) — cùng ngữ
-- nghĩa merge của save-laso nhưng không có khe read-modify-write giữa hai lượt
-- lưu song song. nam_xem: lượt lưu không kèm năm thì giữ năm cũ.
-- SECURITY INVOKER (mặc định) — chỉ service_role gọi, RLS không chặn role đó.
CREATE OR REPLACE FUNCTION public.laso_public_i18n_merge(
  p_slug text,
  p_locale text,
  p_luan_giai jsonb,
  p_nam_xem integer DEFAULT NULL
) RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.laso_public_i18n AS t (slug, locale, luan_giai, nam_xem)
  VALUES (
    p_slug,
    p_locale,
    CASE WHEN jsonb_typeof(p_luan_giai) = 'object' THEN p_luan_giai ELSE '{}'::jsonb END,
    p_nam_xem
  )
  ON CONFLICT (slug, locale) DO UPDATE
    SET luan_giai  = t.luan_giai || EXCLUDED.luan_giai,
        nam_xem    = COALESCE(EXCLUDED.nam_xem, t.nam_xem),
        updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.laso_public_i18n_merge(text, text, jsonb, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.laso_public_i18n_merge(text, text, jsonb, integer) TO service_role;

-- PostgREST nhận bảng/hàm mới ngay (không thì PGRST205/PGRST202 tới lượt reload kế).
NOTIFY pgrst, 'reload schema';
