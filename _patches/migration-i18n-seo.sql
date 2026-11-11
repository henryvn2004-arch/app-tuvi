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

-- Ràng buộc cũ UNIQUE(keyword) do `create table … keyword text not null unique` sinh ra.
alter table public.keyword_ideas drop constraint if exists keyword_ideas_keyword_key;

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
