-- ============================================================
-- migration-growth-accounts.sql — Sổ TÀI KHOẢN & ENTITY (2026-08-23)
--
-- Henry: "entity social, tao chưa đăng ký trên medium, reddit... mày phải
-- list ra vào admin để tao monitor".
--
-- VÌ SAO LÀ BẢNG DB CHỨ KHÔNG PHẢI MỘT FILE DOC: danh sách nằm trong doc thì
-- đọc một lần rồi quên, và không có cách nào biết tài khoản còn sống hay đã
-- chết. Nằm trong bảng thì (a) admin thấy trạng thái từng nền tảng, (b) cron
-- tự ghé lại kiểm tra URL còn 200 không, (c) — quan trọng nhất — trường
-- `sameAs` trong JSON-LD của CẢ SITE tự sinh từ chính bảng này, nên đánh dấu
-- một dòng thành 'verified' là schema toàn site cập nhật, KHÔNG cần deploy.
--
-- Đo được trước khi làm (2026-08-23): schema `Person` ở /tac-gia/[slug] khai
-- `sameAs: []` RỖNG, còn `Organization` ở trang chủ KHÔNG có trường sameAs
-- nào — tức Google đang không biết thực thể này có mặt ở đâu khác. Đây là
-- lỗ hổng entity thật, không phải lo xa.
--
-- ⚠️ Bảng này KHÁC `backlink_prospects`: bên kia là NƠI NGƯỜI KHÁC SỞ HỮU mà
-- mình muốn có link từ đó; bảng này là TÀI KHOẢN CỦA CHÍNH MÌNH trên các nền
-- tảng. Một chỗ (vd Product Hunt) có thể xuất hiện ở cả hai với hai vai khác
-- nhau — cố ý, không phải trùng lặp.
--
-- 0 policy = chỉ service_role, cùng lối backlink_prospects/seeding_groups.
-- ============================================================

create table if not exists public.growth_accounts (
  id          uuid primary key default gen_random_uuid(),
  -- khoá ổn định do code đặt (vd 'wikidata', 'devto') — seed dựa vào đây để
  -- biết mục nào đã có, nên KHÔNG đổi tên platform của dòng đã seed.
  platform    text not null,
  label       text not null,
  -- 'entity'   → neo thực thể, Google Knowledge Graph đọc (Wikidata...)
  -- 'social'   → hồ sơ mạng xã hội
  -- 'web2'     → nền tảng tự xuất bản (Medium/Blogger/Dev.to)
  -- 'community'→ diễn đàn/cộng đồng (chỉ tham gia, không tự đăng)
  -- 'registry' → danh bạ sản phẩm/API/MCP
  category    text not null check (category in ('entity','social','web2','community','registry')),
  url         text,               -- hồ sơ THẬT sau khi đăng ký (null = chưa có)
  submit_url  text,               -- chỗ vào đăng ký
  handle      text,
  -- 'todo' → chưa làm · 'registered' → đã tạo, chưa xác minh · 'verified' →
  -- đã xác minh/hoạt động · 'rejected' → bị từ chối · 'skip' → cố ý bỏ.
  status      text not null default 'todo' check (status in ('todo','registered','verified','rejected','skip')),
  priority    smallint not null default 2 check (priority between 1 and 3),
  -- có đưa URL này vào JSON-LD sameAs không. CỐ Ý không suy từ category:
  -- sameAs nên là hồ sơ định danh chính chủ, không phải mọi chỗ có tên mình.
  same_as     boolean not null default false,
  automation  text,               -- ghi chú: tự động được tới đâu
  notes       text,
  -- cron kiểm tra sống ghi 3 cột dưới. last_ok = null khi chưa kiểm lần nào.
  last_checked_at timestamptz,
  last_ok     boolean,
  check_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint growth_accounts_platform_uniq unique (platform)
);

create index if not exists growth_accounts_category_idx on public.growth_accounts (category);
create index if not exists growth_accounts_status_idx   on public.growth_accounts (status);
-- Truy vấn nóng nhất: lấy URL cho sameAs (chạy mỗi lượt dựng schema).
create index if not exists growth_accounts_sameas_idx   on public.growth_accounts (same_as, status)
  where same_as and url is not null;

alter table public.growth_accounts enable row level security;
comment on table public.growth_accounts is
  'Sổ tài khoản/entity của CHÍNH site trên các nền tảng. Nguồn duy nhất sinh JSON-LD sameAs. 0 policy — chỉ service_role.';
