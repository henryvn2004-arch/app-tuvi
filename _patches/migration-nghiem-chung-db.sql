-- _patches/migration-nghiem-chung-db.sql
-- ============================================================
-- NGHIỆM CHỨNG — kho hồ sơ sinh bởi cron Vercel (app/api/cron/nghiem-chung).
--
-- VÌ SAO LÀ BẢNG: hồ sơ cũ là file .json.gz trong repo, trang đọc từ bundle lúc
-- deploy. Cron Vercel không ghi được vào repo, nên hồ sơ MỚI nằm ở đây; trang
-- (lib/nghiem-chung/store.ts) đọc file trước, thiếu thì đọc bảng này.
--
-- RLS bật, KHÔNG policy + REVOKE → chỉ service_role (route server) chạm được.
-- Migration an toàn (chỉ tạo bảng rỗng), chạy TRƯỚC deploy được.
-- ============================================================

CREATE TABLE IF NOT EXISTS nc_ho_so (
  slug        TEXT PRIMARY KEY,
  qid         TEXT NOT NULL,
  muc         TEXT NOT NULL CHECK (muc IN ('nghiem-chung', 'xac-dinh-gio-sinh')),
  ten         TEXT NOT NULL,
  nghe_nghiep TEXT NOT NULL DEFAULT '',
  nam_sinh    INT  NOT NULL,
  anh_commons TEXT,
  ty_le_bm    INT,
  ty_le_dv    INT,
  gio_doan    TEXT,
  indexed     BOOLEAN NOT NULL DEFAULT FALSE,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE nc_ho_so ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nc_ho_so FROM public, anon, authenticated;

CREATE TABLE IF NOT EXISTS nc_loai_tru (
  slug       TEXT PRIMARY KEY,
  qid        TEXT NOT NULL,
  ly_do      TEXT NOT NULL,
  muc        TEXT NOT NULL DEFAULT 'nghiem-chung',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Bảng đã tạo từ bản đầu (chưa có cột muc): bổ sung — cron tính trần ngày theo từng mục.
ALTER TABLE nc_loai_tru ADD COLUMN IF NOT EXISTS muc TEXT NOT NULL DEFAULT 'nghiem-chung';
ALTER TABLE nc_loai_tru ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nc_loai_tru FROM public, anon, authenticated;

-- Mutex chống hai lượt cron chạy đè cùng một người. PRIMARY KEY (slug) là UNIQUE
-- đỡ bên dưới — thiếu nó thì `ignore-duplicates` vô hiệu im lặng.
CREATE TABLE IF NOT EXISTS nc_claim (
  slug       TEXT PRIMARY KEY,
  trang_thai TEXT NOT NULL DEFAULT 'dang' CHECK (trang_thai IN ('dang', 'loi')),
  lan        INT  NOT NULL DEFAULT 1,
  loi        TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE nc_claim ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nc_claim FROM public, anon, authenticated;
