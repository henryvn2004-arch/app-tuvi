-- ============================================================
-- Tool "Hướng Nghiệp Sớm Cho Con"
--
-- Một bảng lịch sử + một dòng giá. `portrait_cache` KHÔNG phải sửa: nó khoá
-- theo (tool_id, phase, laso_key) nên tool mới dùng được ngay.
--
-- ⚠️ CỐ Ý `enabled=false`. `cong-cu.html` và `tuvi-paywall.js` đều lọc
-- `enabled=eq.true`; bật TRƯỚC khi deploy là người thật bấm vào một trang chưa
-- tồn tại. Câu bật nằm ở cuối file, chạy SAU khi prod đã phục vụ được trang.
-- Đây đúng bài học "DỮ LIỆU đi SAU giao diện" đã làm 58 công cụ rơi vào nhóm
-- "Khác" trong 4 phút.
-- ============================================================

create table if not exists public.huong_nghiep_tre_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  laso_key text,
  ten text,
  moi_lo text,
  moi_lo_label text,
  lop text,
  huong text,
  huong_ten text,
  created_at timestamptz not null default now()
);

create index if not exists huong_nghiep_tre_reports_user_idx
  on public.huong_nghiep_tre_reports (user_id, created_at desc);
create index if not exists huong_nghiep_tre_reports_key_idx
  on public.huong_nghiep_tre_reports (laso_key);
create index if not exists huong_nghiep_tre_reports_created_idx
  on public.huong_nghiep_tre_reports (created_at desc);

alter table public.huong_nghiep_tre_reports enable row level security;

-- Chỉ chủ sở hữu đọc được lịch sử của mình. CỐ Ý KHÔNG có policy cho admin:
-- đây là lá số CON của người khác, không phải dữ liệu vận hành.
drop policy if exists huong_nghiep_tre_reports_owner_read on public.huong_nghiep_tre_reports;
create policy huong_nghiep_tre_reports_owner_read on public.huong_nghiep_tre_reports
  for select using (auth.uid() = user_id);

-- ── Giá ─────────────────────────────────────────────────────
-- ⚠️ Cột tên là `label`, KHÔNG phải `title`.
-- 15 Lượng — ngang `day-con` và `nguoi-khac`: một lá số, một lượt LLM.
-- `need_tags = 'con-cai'` khớp nhóm "Con cái & nuôi dạy" đang bật trong
-- `tool_groups`; đặt sai khoá là tool rơi vào nhóm "Khác".
-- `app_path` là thứ dựng sidebar Luận Đường và lưới /cong-cu (master grouping
-- PR #441) — thiếu cột này thì tool tàng hình trong khu /app.
insert into public.tool_pricing
  (tool_id, label, credits, is_free, enabled, category, icon, sort_order,
   description, need_tags, question, app_path)
values
  ('huong-nghiep-tre', 'Hướng Nghiệp Sớm Cho Con', 15, false, false,
   'Luận Giải', 'compass', 66,
   'Nhập lá số của con — thiên hướng đọc từ lá số, hoạt động nên cho làm quen theo đúng lứa tuổi, và việc người lớn nên làm hay nên thôi. Định hướng để tham khảo, không chốt nghề cho con.',
   'con-cai', 'Nên cho con làm quen với thứ gì từ bây giờ?', '/app/huong-nghiep-tre')
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
      app_path = excluded.app_path,
      updated_at = now();

-- ── CHẠY SAU KHI DEPLOY XONG ────────────────────────────────
-- update public.tool_pricing set enabled = true, updated_at = now()
--  where tool_id = 'huong-nghiep-tre';
