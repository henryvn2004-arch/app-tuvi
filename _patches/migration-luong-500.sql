-- ============================================================
-- 1 LƯỢNG ≈ 500đ  (Pha 2 của hard paywall, Henry chốt 2026-09-06)
-- ============================================================
-- "Ko cần phải tạo gói mới. Nếu mắc quá thì tăng tỉ lệ lượng/VNĐ thôi.
--  Hiện giờ 1 lượng = 1,000VND thì mày chỉnh lại 1 lượng = 500VND là dc rồi."
--
-- ⚠️ ĐÍNH CHÍNH con số trong câu trên: 1 Lượng KHÔNG phải 1.000đ. Nó SUY từ
-- `credit_packages` (không phải hằng số ở đâu cả) — bậc vào cửa 199.000/250 =
-- 796đ, bậc hai 399.000/600 = 665đ. Số 1.000 là ĐƯỜNG RƠI của khoá
-- `credits.vnd_per_credit` đã gỡ, không phải giá đang chạy.
--
-- VÌ SAO ĐỔI: hard paywall đẩy khách quảng cáo tới cửa thanh toán đông hơn hẳn.
-- Đo 30 ngày: 22 người bấm mở khoá → 5 người mua. Bậc bấm-mở → mua (23%) không
-- tệ, nhưng giá thật của một bản Luận Giải (150 Lượng × 796đ = 119.400đ qua ô
-- nạp lẻ) là một quyết định lớn với người vừa gặp trang lần đầu.
--
-- CÁCH LÀM: GIỮ NGUYÊN giá tiền từng gói, chỉ NÂNG số Lượng.
--
--   gói          giá        cũ →  mới     đ/Lượng cũ → mới
--   Khởi Đầu     199.000    250 →  350       796,0 → 568,6
--   Phổ Thông    399.000    600 →  800       665,0 → 498,8   ← bậc hai
--   Cao Cấp      699.000   1200 → 1600       582,5 → 436,9
--   VIP          999.000   2000 → 2700       499,5 → 370,0
--
-- ⇒ `credit_vnd()` (bậc hai theo sort_order) = 499đ ≈ mức Henry chốt.
-- ⇒ Luận Giải 150 Lượng qua ô nạp lẻ: 120.000đ → **86.000đ**.
--
-- 🔑 VÌ SAO KHÔNG PHẢI 400/800/1400/2200 (bản đề xuất đầu): 400 Lượng ở 199.000đ
-- ra 497,5đ/Lượng — RẺ HƠN gói 399.000đ (498,8đ). Tức lật ngược thang "mua
-- nhiều rẻ hơn" ngay ở bậc đầu tiên, đúng lỗi đã chỉ ra khi để VIP ở 2000.
-- Bộ số dưới đây giữ thang đơn điệu giảm: 568,6 > 498,8 > 436,9 > 370,0.
--
-- 🔴 THỨ TỰ TRIỂN KHAI — CHẠY FILE NÀY **SAU** KHI CODE ĐÃ LÊN PROD.
-- Ngược với thói quen "migration an toàn chạy trước". Lý do: `FALLBACK` trong
-- `lib/billing/packages.ts` là đường dùng khi ĐỌC HỤT `credit_packages`, và nó
-- phải khớp bảng này.
--   • code trước, data sau  → khoảng giữa: DB trả số CŨ (đúng với thứ đang thu);
--     nếu DB đọc hụt thì FALLBACK cấp DƯ vài chục Lượng. Chịu được.
--   • data trước, code sau  → khoảng giữa: DB đọc hụt thì FALLBACK cấp HỤT cho
--     người VỪA TRẢ TIỀN (199.000đ nhận 250 thay vì 350). Không chịu được.
--
-- BỐN nơi phải khớp nhau (CLAUDE.md chỉ kể ba — `public/shell.js` là nơi thứ tư,
-- phát hiện 2026-09-06):
--   1. bảng `credit_packages`            ← file này
--   2. `credit_vnd()` nhánh dự phòng     ← file này
--   3. `FALLBACK` + `vndPerCredit()`     ← lib/billing/packages.ts
--   4. `_rc.vndPerCredit` + `|| 500`     ← public/shell.js (3 chỗ)
-- ⚠️ Ở (4) có một `/ 1000) * 1000` đứng ngay cạnh — đó là LÀM TRÒN NGHÌN của
-- đơn vị tiền, KHÔNG phải tỉ giá. Đừng thay nhầm.
--
-- KHÔNG đụng `tool_pricing`: giá tool tính bằng LƯỢNG giữ nguyên. Thứ rẻ đi là
-- giá VNĐ của một Lượng, nên mọi tool tự rẻ theo mà không phải sửa 45 dòng giá.
-- ============================================================

begin;

update public.credit_packages set credits =  350, updated_at = now() where package_id = '50';
update public.credit_packages set credits =  800, updated_at = now() where package_id = '120';
update public.credit_packages set credits = 1600, updated_at = now() where package_id = '350';
update public.credit_packages set credits = 2700, updated_at = now() where package_id = '800';

-- Nhánh dự phòng CUỐI của `credit_vnd()` (bảng gói rỗng hoàn toàn). Giữ 1000 sau
-- đợt này là báo giá 1 Lượng GẤP ĐÔI mức thật (499đ) cho mọi bảng quy đổi
-- Lượng→VNĐ ở admin — sai im lặng, và sai theo hướng thổi phồng doanh thu.
-- Ba nhánh trên nó giữ NGUYÊN: khoá chốt cứng `credits.vnd_per_credit` (đã gỡ
-- khỏi prod, để lại đường ghi đè), rồi suy từ `credit_packages` bậc hai, rồi bậc
-- đầu. Chỉ dòng cuối đổi.
create or replace function public.credit_vnd()
returns numeric
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    (select (value #>> '{}')::numeric from app_config where key = 'credits.vnd_per_credit'),
    (select round(amount_vnd::numeric / credits, 0)
       from credit_packages
      where enabled = true and credits > 0 and amount_vnd > 0
      order by sort_order
      offset 1 limit 1),
    (select round(amount_vnd::numeric / credits, 0)
       from credit_packages
      where enabled = true and credits > 0 and amount_vnd > 0
      order by sort_order
      limit 1),
    500
  );
$function$;

-- SECURITY DEFINER: `create or replace` KHÔNG giữ lại ACL đã thu hồi ở
-- migration-revoke-secdef-anon-rail.sql, nên phải thu lại tay. Thiếu bước này là
-- anon gọi được `credit_vnd()` — vô hại về dữ liệu, nhưng nó là một hàm
-- SECURITY DEFINER mở cho công chúng, đúng thứ CLAUDE.md cấm để lại.
revoke all on function public.credit_vnd() from public, anon, authenticated;
grant execute on function public.credit_vnd() to service_role;

commit;

-- ── KIỂM SAU KHI CHẠY (đọc ngược lại, đừng tin lệnh update là xong) ──────────
-- select package_id, label, amount_vnd, credits,
--        round(amount_vnd::numeric/credits,1) as vnd_per_luong
--   from credit_packages where enabled order by sort_order;
-- select public.credit_vnd();          -- kỳ vọng 499
