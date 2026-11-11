-- _patches/migration-nghiem-chung-i18n.sql
-- ============================================================
-- NGHIỆM CHỨNG đa ngôn ngữ (W6) — bảng dịch + cache Wikidata.
--
-- THỨ TỰ CHẠY (xem PR): file này chỉ TẠO BẢNG RỖNG ⇒ an toàn chạy TRƯỚC deploy.
-- Route hồ sơ đọc `nc_ho_so_i18n`; thiếu bảng thì route trả 404 cho mọi ngôn ngữ
-- ngoài `vi` (không 500, không lùi về chữ Việt) — nên deploy trước/sau đều không vỡ vi.
-- KHÔNG chạy trên prod từ phiên này: Henry chạy trong Supabase SQL editor.
--
-- RLS bật, KHÔNG policy + REVOKE ⇒ chỉ service_role (route server + scripts/nc-i18n.mjs)
-- chạm được — cùng kiểu `nc_ho_so`.
-- ============================================================

-- Bản dịch văn xuôi của một hồ sơ. `data` CHỈ chứa các trường văn xuôi đã dịch
-- ({ "f": { "tieuSu.0": "...", "banMenh.2.doiThat": "..." } }); số liệu engine, điểm,
-- kết luận khớp/trượt, nguồn, ngày... luôn đọc từ bản gốc `nc_ho_so.data`.
-- `source_hash` = băm phần văn xuôi gốc LÚC dịch: khác băm hiện tại ⇒ hồ sơ đã sửa ⇒
-- tự hiện lại trong hàng đợi (scripts/nc-i18n.mjs next). Không cần cron/trigger.
CREATE TABLE IF NOT EXISTS nc_ho_so_i18n (
  slug          TEXT NOT NULL REFERENCES nc_ho_so(slug) ON DELETE CASCADE,
  locale        TEXT NOT NULL CHECK (locale IN ('en', 'ja', 'ko', 'zh-tw', 'zh-cn')),
  ten           TEXT NOT NULL,
  nghe_nghiep   TEXT NOT NULL DEFAULT '',
  data          JSONB NOT NULL,
  source_hash   TEXT NOT NULL,
  -- 'ok' = đã kiểm (save) và được render; 'review' = đã lưu nhưng chờ duyệt, KHÔNG render.
  status        TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'review')),
  translated_by TEXT NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (slug, locale)
);
-- Hub/sitemap theo ngôn ngữ chỉ cần các dòng 'ok'.
CREATE INDEX IF NOT EXISTS nc_ho_so_i18n_locale_ok_idx ON nc_ho_so_i18n (locale) WHERE status = 'ok';
ALTER TABLE nc_ho_so_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nc_ho_so_i18n FROM public, anon, authenticated;

-- Cache Wikidata theo QID (0 token): nhãn tên theo ngôn ngữ + sitelinks → điểm ưu tiên.
-- Nạp bằng `node scripts/nc-wikidata.mjs` (idempotent, nạp bù chỗ còn thiếu).
--   labels    : { "en": "...", "ja": "...", "ko": "...", "zh-tw": "...", "zh-cn": "..." }
--   sitelinks : { "en": "Title", "ja": "Title", ... } — khoá là ngôn ngữ của MÌNH, giá trị là tiêu đề bài
--               (có bài enwiki/jawiki/kowiki/zhwiki ⇒ người đó được biết ở ngôn ngữ ấy).
--   score     : { "en": 0..n, ... } — số sitelink toàn Wikidata + thưởng nếu có bài ở wiki của ngôn ngữ đó.
CREATE TABLE IF NOT EXISTS nc_wikidata (
  qid         TEXT PRIMARY KEY,
  labels      JSONB NOT NULL DEFAULT '{}'::jsonb,
  sitelinks   JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_links INT   NOT NULL DEFAULT 0,
  score       JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE nc_wikidata ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nc_wikidata FROM public, anon, authenticated;
