-- migration-chan-dung-vo-chong.sql
-- ============================================================
-- Tool "Chân Dung Vợ Chồng" — vẽ chân dung người phối ngẫu suy từ cung Phu
-- Thê trong lá số (OpenAI gpt-image-1, text-to-image — KHÔNG cần ảnh gốc).
--   • Storage bucket 'portraits' (PUBLIC — ảnh hiển thị thẳng qua URL, không
--     chứa dữ liệu nhạy cảm nên public là ổn, giống pattern Replicate output
--     URL của các tool try-on/render hiện có).
--   • Bảng spouse_portraits: lưu lịch sử mỗi lần sinh ảnh (để user xem lại).
--
-- GHI: chỉ server (route dùng service key, bypass RLS) sau khi verify JWT
-- người dùng + đã trừ Lượng qua TuviPaywall (client-side, giống các tool
-- vision/render khác).
-- ĐỌC: user đọc ĐƯỢC lịch sử CỦA CHÍNH MÌNH (auth.uid() = user_id) + admin.
-- Chạy 1 lần trong Supabase SQL Editor (project dciwkfdqhhddeymlisey). Idempotent.
-- ============================================================

-- ── Storage bucket (public — ảnh chân dung không nhạy cảm) ──
insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', true)
on conflict (id) do nothing;

-- ── Bảng lịch sử sinh ảnh ──
create table if not exists public.spouse_portraits (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  user_gender   text,
  spouse_gender text,
  spouse_age    int,
  core_star     text,
  image_url     text not null,
  description   text
);

create index if not exists spouse_portraits_user_idx on public.spouse_portraits(user_id, created_at desc);

alter table public.spouse_portraits enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='spouse_portraits' and policyname='spouse_portraits_own_read') then
    create policy spouse_portraits_own_read on public.spouse_portraits for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='spouse_portraits' and policyname='spouse_portraits_admin_read') then
    create policy spouse_portraits_admin_read on public.spouse_portraits for select
      using ((auth.jwt()->>'email') = 'admin@tuviminhbao.com');
  end if;
end $$;

-- ── Giá Lượng (tool_pricing — nguồn giá thật cho paywall.js + server) ──
-- category='Luận Giải' để rơi vào tab "Tử Vi" trên /cong-cu (giống xem-tuoi,
-- xem-tuoi-sinh-con — CATEGORY_TO_TAB trong cong-cu.html không nhận 'vision').
-- Giá 20 Lượng (đã chỉnh từ 22 ban đầu — 2026-07-26, tròn số + đo chi phí thật
-- qua logLlmUsage/logImageUsage cho thấy biên lợi nhuận còn rất cao ở mức này).
INSERT INTO public.tool_pricing (tool_id, credits, label, enabled, category, is_free, sort_order, description, icon, updated_at)
VALUES ('chan-dung-vo-chong', 20, 'Chân Dung Vợ Chồng', true, 'Luận Giải', false, 60,
        'Vẽ chân dung người phối ngẫu suy từ cung Phu Thê (OpenAI gpt-image-1, text-to-image).', '🖼️', now())
ON CONFLICT (tool_id) DO UPDATE
  SET credits = EXCLUDED.credits, label = EXCLUDED.label, category = EXCLUDED.category,
      description = EXCLUDED.description, icon = EXCLUDED.icon, updated_at = now();
