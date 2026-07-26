-- migration-chan-dung-tien-kiep.sql
-- ============================================================
-- Tool "Chân Dung Tiền Kiếp" — phóng chiếu lá số vào bối cảnh Trung Hoa cổ:
-- chức phận suy từ chính tinh cung Quan Lộc, hình thể suy từ cung Mệnh, dòng
-- đời 5 hồi suy từ 9 đại vận (điểm cao nhất = đỉnh cao, thấp nhất = biến cố).
--
--   • DÙNG LẠI storage bucket 'portraits' đã tạo ở migration-chan-dung-vo-chong
--     (ảnh lưu trong thư mục con <user_id>/past-life/ nên không lẫn 2 tool).
--     Câu insert bucket dưới đây giữ lại cho trường hợp chạy trên môi trường
--     chưa từng chạy migration tool vợ chồng — idempotent, vô hại.
--   • Bảng past_life_portraits: lịch sử mỗi lần sinh ảnh.
--
-- GHI: chỉ server (route dùng service key, bypass RLS) sau khi verify JWT
-- người dùng + đã trừ Lượng qua TuviPaywall.
-- ĐỌC: user đọc lịch sử CỦA CHÍNH MÌNH (auth.uid() = user_id) + admin.
--
-- ✅ ĐÃ CHẠY PROD (project dciwkfdqhhddeymlisey) qua Supabase MCP — verify:
-- past_life_portraits 8 cột, 2 index, 2 policy, RLS bật; bucket 'portraits'
-- public; row tool_pricing 25 Lượng nhưng ĐANG enabled=false (xem ghi chú ở
-- cuối file — bật sau khi deploy). Idempotent, chạy lại vô hại.
-- ============================================================

-- ── Storage bucket (đã có sẵn từ tool Chân Dung Vợ Chồng) ──
insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', true)
on conflict (id) do nothing;

-- ── Bảng lịch sử sinh ảnh ──
create table if not exists public.past_life_portraits (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  gender           text,
  occupation_title text,
  occupation_star  text,
  portrait_age     int,
  image_url        text not null
);

create index if not exists past_life_portraits_user_idx
  on public.past_life_portraits(user_id, created_at desc);

alter table public.past_life_portraits enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='past_life_portraits' and policyname='past_life_portraits_own_read') then
    create policy past_life_portraits_own_read on public.past_life_portraits for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='past_life_portraits' and policyname='past_life_portraits_admin_read') then
    create policy past_life_portraits_admin_read on public.past_life_portraits for select
      using ((auth.jwt()->>'email') = 'admin@tuviminhbao.com');
  end if;
end $$;

-- ── Giá Lượng (tool_pricing — nguồn giá thật cho paywall.js + server) ──
-- 25 Lượng: nặng hơn Chân Dung Vợ Chồng (22) vì mỗi lượt tốn 2 lượt LLM (truyện
-- dài + mô tả ảnh) cộng 1 lượt sinh ảnh gpt-image-1.
-- category='Luận Giải' để rơi vào tab "Tử Vi" trên /cong-cu (CATEGORY_TO_TAB
-- trong cong-cu.html không nhận 'vision').
--
-- ⚠️ enabled=false CÓ CHỦ ĐÍCH. `/cong-cu` (cong-cu.html) và tuvi-paywall.js
-- đều đọc tool_pricing với bộ lọc `enabled=eq.true`. Nếu bật ngay lúc chạy
-- migration thì tool hiện trên trang Công Cụ TRƯỚC khi
-- /tools/chan-dung-tien-kiep.html được deploy → người dùng thật bấm vào ra 404.
-- Sau khi PR merge + Vercel deploy xong, bật bằng đúng 1 câu:
--     UPDATE public.tool_pricing SET enabled = true, updated_at = now()
--      WHERE tool_id = 'chan-dung-tien-kiep';
INSERT INTO public.tool_pricing (tool_id, credits, label, enabled, category, is_free, sort_order, description, icon, updated_at)
VALUES ('chan-dung-tien-kiep', 25, 'Chân Dung Tiền Kiếp', false, 'Luận Giải', false, 61,
        'Phóng chiếu lá số vào bối cảnh Trung Hoa cổ — chân dung + câu chuyện một đời qua 9 đại vận.', '🏯', now())
ON CONFLICT (tool_id) DO UPDATE
  SET credits = EXCLUDED.credits, label = EXCLUDED.label, category = EXCLUDED.category,
      description = EXCLUDED.description, icon = EXCLUDED.icon, updated_at = now();
