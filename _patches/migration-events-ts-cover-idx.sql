-- migration-events-ts-cover-idx.sql  (2026-11-11, W2) — ĐÃ THỬ TRÊN PROD, ĐÃ GỠ, ĐỪNG ÁP LẠI
--
-- KẾT QUẢ ĐO (prod, 2026-11-11): index 44 MB, plan thành Index Only Scan và riêng lượt
-- gom `ud` còn 1,3 s (trước ~9 s) — NHƯNG cả `dashboard_engagement(14)` KHÔNG nhanh hơn:
-- 12,6 s trước vs 15,6 / 16,1 s sau (mỗi lượt vẫn read ~20k trang). Phần tốn còn lại là
-- `bot_anon_ids` (quét theo events_anon_idx, dòng rộng có `ua`) mà index này không phủ.
-- Không có lợi ích đo được mà vẫn gánh mọi lượt ghi vào `events` ⇒ đã `drop index
-- concurrently`. Giữ file làm hồ sơ; muốn thử lại thì phải có cách phủ cả `bot_anon_ids`.
--
--
-- VÌ SAO: `dashboard_engagement` quét `events` 60 ngày chỉ để lấy (ts, user_id,
-- anon_id) nhưng `events_ts_idx` không chứa hai cột kia ⇒ Index Scan phải nhảy vào
-- heap cho từng dòng (EXPLAIN 2026-11-11: 725.715 dòng, 606k buffer hit + 7,5k read).
-- Index phủ cho phép Index Only Scan, bỏ hẳn lượt đọc heap đó.
--
-- ⚠️ CHƯA ĐO được (chỉ đọc prod, không tạo index) — phần giảm thời gian là DỰ ĐOÁN.
-- Index Only Scan chỉ thật sự bỏ heap khi visibility map sạch; `events` chỉ-chèn nên
-- thường ổn sau autovacuum. Chạy xong PHẢI `EXPLAIN` lại (xem "Kiểm"); nếu plan vẫn
-- là "Index Scan" hoặc `Heap Fetches` lớn thì `drop index` — đừng để lại index vô dụng
-- gánh mọi lượt ghi event.
--
-- `CONCURRENTLY` KHÔNG chạy được trong transaction: dán vào SQL editor của Supabase
-- (mỗi lệnh một lượt chạy), đừng bọc BEGIN/COMMIT. Kích thước ước ~50 MB (ts + anon_id
-- + user_id, ~755k dòng). Hoàn tác: `drop index concurrently events_ts_cover_idx;`

create index concurrently if not exists events_ts_cover_idx
  on public.events (ts) include (anon_id, user_id);

-- ── Kiểm ────────────────────────────────────────────────────────────────────
--   vacuum (analyze) public.events;
--   explain (analyze, buffers, timing off)
--     select count(*) from (select ts::date, coalesce(user_id::text, anon_id)
--       from public.events where ts >= current_date - 59 and ts < current_date + 1
--       group by 1, 2) t;
--   -- kỳ vọng: "Index Only Scan using events_ts_cover_idx", Heap Fetches ≈ 0.
