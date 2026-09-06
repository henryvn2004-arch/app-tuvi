-- ============================================================
-- seo_pages — cờ đánh dấu ĐÃ viết lại bằng viral-core
-- ============================================================
-- Henry: gộp nợ kỹ thuật "seo_pages chưa nhận viral-core" (CLAUDE.md, mục Sổ
-- nợ). 7.080/8.958 dòng seo_pages (category tuong-hop-hon-nhan · tuong-hop-lam-an)
-- đang được sinh bởi `scripts/rewrite-tuvi-compat.mjs` — một bộ TEMPLATE tất
-- định (không LLM), có tiêu đề con/đánh số mục — TRÁI với luật giọng
-- `lib/content/viral-core.ts` (không tiêu đề con, mở bằng hook, có twist, chốt
-- hành động). Cron mới `/api/cron/viral-seo-pages` viết lại bằng LLM theo đúng
-- arc đó; cột này là con trỏ TIẾN ĐỘ để cron không viết lại dòng đã xong, và để
-- rải việc ra nhiều ngày thay vì đụng cả 7.080 dòng `updated_at` một lượt (sẽ
-- làm `lastmod` toàn site nhảy — xem CLAUDE.md §Cache/SEO).
--
-- ⚠️ ÁP DỤNG PATCH NÀY TRƯỚC KHI DEPLOY route mới — thiếu cột thì PATCH của
-- cron sẽ lỗi 400 (unknown column) ngay lượt chạy đầu tiên.
-- ============================================================

alter table public.seo_pages
  add column if not exists viral_applied boolean not null default false;

-- Cron lọc theo category IN (...) + viral_applied=false mỗi lượt chạy — index
-- một phần (chỉ hàng CHƯA xử lý) giữ bảng quét nhỏ dần theo tiến độ thay vì
-- quét nguyên 8.958 dòng mỗi lần.
create index if not exists idx_seo_pages_viral_pending
  on public.seo_pages (category, id)
  where viral_applied = false;

-- Toàn bộ dòng NGOÀI 2 category tương hợp không thuộc phạm vi việc này (chưa
-- có kế hoạch viết lại) — đánh dấu SẴN là 'true' để cron không vô tình quét
-- nhầm vào chúng nếu sau này category filter bị nới lỏng.
update public.seo_pages
  set viral_applied = true
  where category not in ('tuong-hop-hon-nhan', 'tuong-hop-lam-an');
