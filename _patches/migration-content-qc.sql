-- migration-content-qc.sql  (bước 2 track "CMO skills" — BRAND-CHECK GATE)
-- ============================================================
-- Nhật ký của bước QC chạy TRƯỚC khi publish, cho 2 pipeline viết bài đang
-- chạy: cron-khao-luan (→ khao_luan) và cron-master-write (→ master_articles).
--
-- Vì sao cần bảng này chứ không chỉ log ra console: cả `khao_luan` lẫn
-- `master_articles` đều KHÔNG có cột publish_status — insert xong là bài LÊN
-- THẲNG trang. Nghĩa là gate chỉ có một lựa chọn khi bài trượt: KHÔNG insert.
-- Mà bài đó đã tốn tiền model để sinh ra (RAG + storyboard + 1.500 từ), nên
-- vứt đi là vừa mất tiền vừa mất luôn bằng chứng để chỉnh ngưỡng cho đúng.
-- Bài trượt vì vậy được cất NGUYÊN VĂN vào `payload`.
--
-- KHÔNG phải pipeline mới: không cron mới, không bảng nội dung mới. Đây thuần
-- là sổ ghi của một bước chèn vào giữa pipeline sẵn có.
--
-- RLS: ghi qua service key (2 route cron), đọc chỉ admin JWT — cùng pattern
-- events / user_attribution / autopilot_actions.
-- Idempotent. Chạy trong Supabase SQL Editor (project dciwkfdqhhddeymlisey).
-- ============================================================

create table if not exists public.content_qc_log (
  id         uuid primary key default gen_random_uuid(),
  ts         timestamptz not null default now(),
  -- 'khao-luan' | 'nghien-cuu' — hai BỀ MẶT khác định dạng, không phải hai
  -- mức nghiêm khắc của cùng một luật (xem comment profile trong brand-check.ts).
  surface    text not null,
  slug       text,
  title      text,
  passed     boolean not null,
  -- 'block' | 'warn' — ghi lại mode lúc chạy để về sau đọc log còn biết
  -- một dòng passed=true là "thật sự đạt" hay "đang chạy thử ở warn".
  mode       text not null default 'block',
  violations jsonb not null default '[]'::jsonb,
  fixed      jsonb not null default '[]'::jsonb,
  repaired   boolean not null default false,
  -- Nguyên văn bài BỊ CHẶN. NULL khi passed=true (bài đạt đã nằm ở bảng nội dung).
  payload    jsonb
);

create index if not exists idx_content_qc_log_ts on public.content_qc_log (ts desc);
create index if not exists idx_content_qc_log_surface on public.content_qc_log (surface, passed, ts desc);

alter table public.content_qc_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'content_qc_log' and policyname = 'content_qc_log_admin_read'
  ) then
    create policy content_qc_log_admin_read on public.content_qc_log for select
      using ((auth.jwt() ->> 'email') = 'admin@tuviminhbao.com');
  end if;
end $$;

-- ============================================================
-- Config gate — chỉnh ngưỡng / tắt bật KHÔNG cần deploy.
--
-- mode: 'block' chặn thật · 'warn' vẫn publish nhưng ghi đủ nhật ký · 'off' bỏ hẳn.
-- llmTier: tắt để tiết kiệm 1 lượt LLM/bài, chỉ còn tầng regex.
--
-- ⚠️ SEED LÀ 'warn', CÓ CHỦ ĐÍCH — theo tiền lệ shadow-mode của M0.6.
-- Ở 'warn' thì AUTOFIX VẪN ĐƯỢC ÁP (# → ##, tên cung sai, trật tự từ, bôi đậm)
-- vì autofix chạy trước khi phân nhánh mode; chỉ khác là lỗi cần phán đoán thì
-- ghi nhật ký thay vì chặn. Tức phần lớn giá trị đã có ngay, mà không có rủi ro
-- dây chuyền content đứng im vì một luật hiệu chỉnh sai.
-- Đọc log vài ngày rồi siết bằng ĐÚNG một câu:
--   update public.app_config
--      set value = jsonb_set(value, '{mode}', '"block"')
--    where key = 'content.brand_check';
--
-- Hai profile CỐ Ý khác nhau, đo trên prod ngày 2026-07-31:
--   khao_luan       324 bài — 6 bài dùng "tôi",   0 bài "quý vị"  → ngôi 3.
--   master_articles 306 bài — 300 bài dùng "tôi", 0 bài "quý vị"  → ngôi 1.
-- Tức tùy bút Nghiên Cứu vốn LÀ ngôi thứ nhất ký tên thầy; áp luật "không tự
-- xưng" của Khảo Luận sang đó sẽ chặn 98% output. Brand voice doc §3 mới định
-- nghĩa 4 bề mặt và chưa có bề mặt này — đây là chỗ cần Henry chốt lại (xem
-- mục CÒN LẠI trong PR).
-- ============================================================

insert into public.app_config (key, value)
values (
  'content.brand_check',
  '{
    "enabled": true,
    "mode": "warn",
    "llmTier": true,
    "profiles": {
      "khao-luan":  { "minLen": 1200, "maxLen": 1600, "lengthUnit": "chars",
                      "readerAddress": "none",   "allowSelfRef": false,
                      "requireBold": true, "banEmoji": true },
      "nghien-cuu": { "minLen": 900,  "maxLen": 1800, "lengthUnit": "words",
                      "readerAddress": "quy-vi", "allowSelfRef": true,
                      "requireBold": true, "banEmoji": true }
    }
  }'::jsonb
)
on conflict (key) do nothing;
