-- _patches/migration-i18n-seo.sql  (W10 — SEO/GEO quốc tế)
-- ============================================================
-- Hai thay đổi, cả hai idempotent. KHÔNG chạy trên prod từ phiên Claude: Henry chạy trong
-- Supabase SQL editor.
--
-- THỨ TỰ: chạy file này TRƯỚC deploy. Cron `keyword-suggest` bản mới ghi
-- `on_conflict=keyword,lang,source` — thiếu ràng buộc đó là mọi lô ghi bị 4xx (đã có
-- console.error, không ghi âm thầm). Cron cũ (vi) đã gỡ lịch từ W1 nên bỏ ràng buộc
-- UNIQUE(keyword) không làm vỡ gì đang chạy.
-- ============================================================

-- 1) keyword_ideas theo NGÔN NGỮ + NGUỒN.
--    `lang`  : 'vi' | 'en' | 'ja' | 'ko' | 'zh-tw' (dòng cũ = 'vi' nhờ default).
--    `source`: 'suggest' (Google) | 'naver' — cùng một cụm hiện ở cả hai nguồn là hai dòng,
--              vì `best_position` của hai nguồn không so được với nhau.
alter table public.keyword_ideas add column if not exists lang text not null default 'vi';

-- UNIQUE(keyword) cũ do `create table … keyword text not null unique` sinh ra. Trên prod nó là
-- UNIQUE INDEX tên `keyword_ideas_keyword_key` (không có dòng nào trong pg_constraint) nên PHẢI
-- `drop index`; `drop constraint` giữ lại cho môi trường mà nó là constraint. Còn sót unique
-- (keyword) thì upsert cùng keyword ở ngôn ngữ khác lỗi 23505.
alter table public.keyword_ideas drop constraint if exists keyword_ideas_keyword_key;
drop index if exists public.keyword_ideas_keyword_key;

create unique index if not exists keyword_ideas_keyword_lang_source_uidx
  on public.keyword_ideas (keyword, lang, source);
create index if not exists idx_keyword_ideas_lang_seen on public.keyword_ideas (lang, last_seen_at desc);

-- 2) Sổ URL đã gửi IndexNow — nhớ để cron idempotent.
--    `content_hash`: băm nội dung ĐÃ GỬI (bản dịch trang tĩnh / `updated_at` của hồ sơ). Cùng
--    URL, cùng hash ⇒ không gửi lại; đổi hash ⇒ gửi lại (URL "đã đổi").
--    RLS bật, không policy + REVOKE ⇒ chỉ service_role chạm được.
create table if not exists public.indexnow_sent (
  url          text primary key,
  content_hash text not null,
  sent_at      timestamptz not null default now()
);
create index if not exists indexnow_sent_at_idx on public.indexnow_sent (sent_at desc);
alter table public.indexnow_sent enable row level security;
revoke all on public.indexnow_sent from public, anon, authenticated;

-- 3) KIỂM — phải ra đúng: unique_keyword_only = 0 · unique_keyword_lang_source = 1 · indexnow_sent = 1.
select
  (select count(*) from pg_indexes
     where schemaname = 'public' and tablename = 'keyword_ideas'
       and indexdef ilike '%unique%' and indexdef ~* '\(keyword\)')                       as unique_keyword_only,
  (select count(*) from pg_indexes
     where schemaname = 'public' and indexname = 'keyword_ideas_keyword_lang_source_uidx') as unique_keyword_lang_source,
  (select count(*) from pg_constraint
     where conrelid = 'public.keyword_ideas'::regclass and contype = 'u')                  as unique_constraints_left,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'indexnow_sent')                       as indexnow_sent;
