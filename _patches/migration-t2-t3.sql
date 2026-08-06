-- ============================================================
-- T2 "Dạy Con Theo Lá Số" + T3 "Sổ Nhân Mạch"
--
-- Hai bảng lịch sử + hai dòng giá. `portrait_cache` KHÔNG phải sửa: nó khoá
-- theo (tool_id, phase, laso_key) nên tool mới dùng được ngay.
--
-- ⚠️ CỐ Ý `enabled=false`. `cong-cu.html` và `tuvi-paywall.js` đều lọc
-- `enabled=eq.true`; bật TRƯỚC khi deploy là người thật bấm vào trang chưa tồn
-- tại. Câu bật nằm ở cuối file, chạy SAU khi prod đã phục vụ được 2 trang.
-- ============================================================

-- ── T2 ──────────────────────────────────────────────────────
create table if not exists public.day_con_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  laso_key text,
  ten text,
  moi_lo text,
  moi_lo_label text,
  kieu text,
  kieu_ten text,
  created_at timestamptz not null default now()
);

create index if not exists day_con_reports_user_idx on public.day_con_reports (user_id, created_at desc);
create index if not exists day_con_reports_key_idx on public.day_con_reports (laso_key);
create index if not exists day_con_reports_created_idx on public.day_con_reports (created_at desc);

alter table public.day_con_reports enable row level security;

-- Chỉ chủ sở hữu đọc được lịch sử của mình. CỐ Ý KHÔNG có policy cho admin:
-- đây là lá số CON của người khác, không phải dữ liệu vận hành.
drop policy if exists day_con_reports_owner_read on public.day_con_reports;
create policy day_con_reports_owner_read on public.day_con_reports
  for select using (auth.uid() = user_id);

-- ── T3 ──────────────────────────────────────────────────────
create table if not exists public.nhan_mach_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  laso_key text,
  so_nguoi int,
  ten_nguoi text,
  thieu_kieu text,
  created_at timestamptz not null default now()
);

create index if not exists nhan_mach_reports_user_idx on public.nhan_mach_reports (user_id, created_at desc);
create index if not exists nhan_mach_reports_key_idx on public.nhan_mach_reports (laso_key);
create index if not exists nhan_mach_reports_created_idx on public.nhan_mach_reports (created_at desc);

alter table public.nhan_mach_reports enable row level security;

drop policy if exists nhan_mach_reports_owner_read on public.nhan_mach_reports;
create policy nhan_mach_reports_owner_read on public.nhan_mach_reports
  for select using (auth.uid() = user_id);

-- ── Giá ─────────────────────────────────────────────────────
-- ⚠️ Cột tên là `label`, KHÔNG phải `title` — lượt chạy đầu tiên đã đỏ vì chỗ
-- này. `need_tags` quyết định tool rơi vào nhóm nỗi lo nào trên /cong-cu
-- (danh sách hợp lệ nằm ở `NEED_GROUPS` trong `public/cong-cu.html`).
--
-- 15 Lượng cho Dạy Con (một lá số, một lượt LLM — ngang `nguoi-khac`).
-- 20 Lượng cho Sổ Nhân Mạch: một lượt đọc tới 8 lá số, prompt dài gấp nhiều
-- lần, và đó là tool nhắm đúng nhóm chịu chi nhất (quản lý, người bán hàng).
insert into public.tool_pricing
  (tool_id, label, credits, is_free, enabled, category, icon, sort_order, description, need_tags, question)
values
  ('day-con', 'Dạy Con Theo Lá Số', 15, false, false, 'Luận Giải', '👶', 64,
   'Nhập lá số của con — con tiếp thu kiểu nào, ra bài thế nào thì chịu làm, kiểu kỷ luật nào phản tác dụng, và chỗ cha mẹ với con hay va nhau.',
   'tinh-duyen,hieu-minh', 'Dạy đứa này kiểu nào thì con mới nghe?'),
  ('nhan-mach', 'Sổ Nhân Mạch', 20, false, false, 'Luận Giải', '👥', 65,
   'Đưa cả đội hoặc danh sách khách vào một chỗ: nhóm thiếu kiểu người nào, ai với ai dễ giẫm chân, tuần này nên gặp ai trước.',
   'cong-viec', 'Đội của tôi đang thiếu kiểu người nào?')
on conflict (tool_id) do update
  set label = excluded.label,
      credits = excluded.credits,
      is_free = excluded.is_free,
      category = excluded.category,
      icon = excluded.icon,
      sort_order = excluded.sort_order,
      description = excluded.description,
      need_tags = excluded.need_tags,
      question = excluded.question,
      updated_at = now();

-- ── CHẠY SAU KHI DEPLOY XONG ────────────────────────────────
-- update public.tool_pricing set enabled = true, updated_at = now()
--  where tool_id in ('day-con', 'nhan-mach');
