-- _patches/migration-backlinks-multisource.sql
-- Mở rộng track backlink từ MỘT nguồn (Brave Search, cần key trả phí) sang
-- BỐN nguồn — ba nguồn mới không cần một đồng nào để chạy (xem
-- lib/backlinks/{seed-list,alerts-rss,broken-links,bing-webmaster}.ts).
--
-- CHỈ đổi CHECK constraint của backlink_prospects.source — cột `kind` đã có
-- sẵn 'broken_link' và 'unlinked_mention' từ migration gốc, không cần đụng.
--
-- `backlink_links` KHÔNG cần migration: Bing Webmaster chỉ INSERT bằng cột
-- đã có sẵn (source_url/target_url/anchor_text/rel/status/notes), không
-- thêm cột hay giá trị enum mới nào.
begin;

alter table public.backlink_prospects
  drop constraint if exists backlink_prospects_source_check;

alter table public.backlink_prospects
  add constraint backlink_prospects_source_check
  check (source = any (array[
    'manual',            -- Henry tự thêm tay trong admin
    'search',            -- Brave Search API (tuỳ chọn, cần BRAVE_SEARCH_API_KEY)
    'seed_list',          -- Danh sách tĩnh đã vét (lib/backlinks/seed-list.ts)
    'alert_rss',           -- Google Alerts RSS — nhắc tên chưa gắn link
    'broken_link_scan'     -- Quét outbound link chết trên trang roundup
  ]));

commit;
