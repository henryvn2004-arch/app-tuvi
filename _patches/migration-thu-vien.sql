-- ============================================================
-- THƯ VIỆN TỬ VI & HUYỀN HỌC — kiến trúc dữ liệu.
-- ============================================================
-- Bối cảnh: rà `tu_dien` trước khi tạo bảng mới phát hiện nó ĐÃ CÓ 88 mục
-- `sao-tu-vi` + ĐỦ 12 mục `cung-tu-vi` (khớp 1:1 với `TEN_CUNG` trong
-- `tuvi-ansao-engine.js`). Tạo bảng mới cho sao+cung sẽ là "hai nguồn cho
-- một thứ" — đúng bẫy CLAUDE.md cấm nhiều lần. Nên:
--
--   MỞ RỘNG `tu_dien` (thêm cột) cho: sao (111, đối chiếu engine bên dưới)
--                                     và cung (12, đã đủ, chỉ thêm cột).
--   BẢNG MỚI `thu_vien_muc` chỉ cho 3 bộ sưu tập THẬT SỰ MỚI, không trùng gì
--   đang có: sao×cung (168, nguồn CÁCH_CUC_DATA nhúng thẳng vào `xuong`,
--   KHÔNG tách URL riêng cho cách cục — 748 dòng cách cục không đủ dày để
--   đứng riêng, và tách ra là index bloat) · khái niệm (~70, rút từ
--   keyword_ideas) · nạp âm (30, KHÔNG phải 60 — xem chú thích cột).
--
-- Đối chiếu 88 sao hiện có ↔ 111 sao STAR_DATA (chạy
-- `scripts/gen-thu-vien-index.mjs`, báo cáo đầy đủ ở PR mô tả):
--   75 khớp tên hẳn · 3 nghi trùng CHỈ KHÁC CHÍNH TẢ (Lực Sĩ/Lực Sỹ,
--   Hỉ Thần/Hỷ Thần, Bác Sĩ/Bác Sỹ — không tự gộp, để Henry xác nhận) ·
--   33 mới thật (an toàn insert) · 10 mục tu_dien không khớp gì (nhóm/khái
--   niệm như "12 Sao Trường Sinh", hoặc "Tả Phù"/"Thiên Diêu" — khác hẳn từ
--   với "Tả Phụ"/"Thiên Riêu" của engine, KHÔNG phải lỗi dấu, giữ nguyên).
--
-- 🔴 NGUỒN NGAY TRONG STAR_DATA CÓ 4 KHOÁ TRÙNG (đọc bằng regex trên văn bản,
-- object literal JS đã âm thầm đè bản đầu khi eval): "Lưu Hà" và "Lộc Tồn"
-- vô hại (dữ liệu giống hệt) nhưng "Thiên Quan" và "Thiên Phúc" có TYPE KHÁC
-- NHAU giữa hai lần khai ('phụ tinh' → 'phúc tinh') — KHÔNG sửa mò, việc tay
-- Henry cần làm trước khi tin dữ liệu 2 sao này (xem CLAUDE.md "KHÔNG sửa mò
-- một công thức cổ pháp").
-- ============================================================

-- ── 1. Mở rộng tu_dien: Hán tự + dữ kiện tất định từ engine ────────────────
alter table public.tu_dien
  add column if not exists ten_han text,
  add column if not exists xuong jsonb;

comment on column public.tu_dien.ten_han is
  'Hán tự + phiên âm (vd "紫微 — Tử Vi"). Cầu nối GEO cho LLM đối chiếu tri thức Hán văn sẵn có. NULL = chưa điền, KHÔNG suy từ trí nhớ, phải đối chiếu nguồn.';
comment on column public.tu_dien.xuong is
  'Dữ kiện TẤT ĐỊNH từ STAR_DATA/TEN_CUNG (tuvi-ansao-engine.js) — nguồn DUY NHẤT cho số liệu hiện trên trang. LLM chỉ được BỌC VĂN quanh xuong, không tự tính lại. NULL = mục chưa gắn xương (bài viết tay cũ, hoặc mục nhóm/khái niệm không có xương đơn).';

-- ── 2. Bảng mới — CHỈ 3 bộ sưu tập thật sự mới ──────────────────────────────
create table if not exists public.thu_vien_muc (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  bo_suu_tap    text not null,   -- 'sao-cung' | 'khai-niem' | 'nap-am'
  ten           text not null,
  ten_han       text,
  xuong         jsonb not null default '{}'::jsonb,
  tra_loi_ngan  text,            -- đoạn 40-60 từ ngay dưới H1 — thứ LLM trích dẫn
  than          text,            -- văn luận đầy đủ
  hoi_dap       jsonb,           -- [{cau_hoi, tra_loi}] từ keyword_ideas thật, → FAQPage
  lien_quan     text[],
  publish_status text not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'thu_vien_muc_bst_chk') then
    alter table public.thu_vien_muc add constraint thu_vien_muc_bst_chk
      check (bo_suu_tap in ('sao-cung', 'khai-niem', 'nap-am'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'thu_vien_muc_publish_chk') then
    alter table public.thu_vien_muc add constraint thu_vien_muc_publish_chk
      check (publish_status in ('published', 'draft', 'hidden'));
  end if;
end $$;

comment on table public.thu_vien_muc is
  'Thư viện — 3 bộ sưu tập SINH TỪ ENGINE, không trùng nội dung với tu_dien: sao×cung (168, gồm cách cục nhúng trong xuong), khái niệm (~70, rút từ keyword_ideas), nạp âm (30). MẶC ĐỊNH draft — chỉ published khi qua cửa chất lượng ở cron đắp văn (đủ dữ kiện xuong, có tra_loi_ngan). Xem scripts/gen-thu-vien-index.mjs.';
comment on column public.thu_vien_muc.publish_status is
  'draft (mặc định — chờ cron đắp văn + cửa chất lượng) | published (lên trang công khai) | hidden (gỡ). KHÁC quy ước khao_luan/master_articles (mặc định published): ở đây nội dung CHƯA TỪNG tồn tại, không phải nội dung cũ cần giữ nguyên khi migrate.';

create index if not exists thu_vien_muc_bst_idx
  on public.thu_vien_muc (bo_suu_tap, publish_status, created_at desc);

-- 🔑 KHÔNG dùng policy `using true` kiểu tu_dien: bảng đó không có
-- publish_status (mọi dòng coi như đã đăng), còn ở đây mặc định là `draft`.
-- `using true` sẽ để lộ nháp CHƯA QUA CỬA CHẤT LƯỢNG thẳng qua REST công khai
-- của Supabase, vòng qua hẳn bộ lọc publish_status trong route — đúng lỗ hổng
-- `check:publish` được dựng ra để chặn, chỉ là ở TẦNG DB thay vì tầng route.
alter table public.thu_vien_muc enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy where polname = 'public read published' and polrelid = 'public.thu_vien_muc'::regclass
  ) then
    create policy "public read published" on public.thu_vien_muc
      for select
      to anon, authenticated
      using (publish_status = 'published');
  end if;
end $$;

revoke all on public.thu_vien_muc from anon, authenticated;
grant select on public.thu_vien_muc to anon, authenticated;
grant all    on public.thu_vien_muc to service_role;
grant usage, select on sequence public.thu_vien_muc_id_seq to service_role;
