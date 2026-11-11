-- ============================================================
-- W5 — BÁN BẰNG USD QUA PAYPAL, BỎ VNĐ Ở MỌI CHỖ KHÁCH THẤY (2026-11)
-- ============================================================
-- ⛔ CHỜ HENRY DUYỆT BẢNG GIÁ — KHÔNG CHẠY trước khi Henry chốt số.
--
-- "Lượng" vẫn là đơn vị nội bộ: `tool_pricing` (giá theo Lượng) và số dư của
-- người dùng KHÔNG đổi ⇒ không ai mất tiền, sổ không phải viết lại. Thứ đổi là
-- GIÁ BÁN của gói: từ nay PayPal thu `credit_packages.amount_usd`.
--
-- Giá USD đề xuất = quy đổi giá VNĐ đang chạy ở ~26.300đ/USD rồi làm tròn .99:
--
--   gói         Lượng   VNĐ hiện tại   ÷26.300   USD cũ   → USD mới   $/Lượng
--   Khởi Đầu      350      199.000       7,57      8.00   →    7.99    0,02283
--   Phổ Thông     800      400.000      15,21     16.00   →   14.99    0,01874  ← bậc hai
--   Cao Cấp      1600      699.000      26,58     28.00   →   26.99    0,01687
--   VIP          2700      999.000      37,98     40.00   →   37.99    0,01407
--
-- Thang "mua nhiều rẻ hơn" vẫn đơn điệu giảm (0,02283 > 0,01874 > 0,01687 >
-- 0,01407). `credit_usd()` (bậc hai) = 14.99/800 = $0,018738 ⇒ Luận Giải
-- 150 Lượng ≈ $2.82 trên nhãn giá.
--
-- 🔴 THỨ TỰ TRIỂN KHAI — DỮ LIỆU ĐI SAU GIAO DIỆN:
--   1. Merge + deploy code W5. Ngay lúc đó web đã hiện USD (đọc `amount_usd`
--      đang có: 8/16/28/40) và ẨN rail VNĐ (khoá cờ chưa có ⇒ đọc ra `false`).
--      PayPal đang chạy live sẵn nên không có khoảng hở thanh toán.
--   2. Henry duyệt bảng giá ở trên → chạy file này.
--   3. Đọc ngược lại (khối KIỂM cuối file) rồi mới báo xong.
-- Vì sao code TRƯỚC: `FALLBACK` (lib/billing/packages.ts) đã mang giá MỚI. Code
-- trước data ⇒ khoảng giữa, DB đọc hụt thì FALLBACK thu RẺ hơn vài cent cho
-- cùng số Lượng (lệch về phía khách, chịu được). Data trước code ⇒ không lệch
-- gì về tiền, nhưng trang cũ còn hiện VNĐ ⇒ cũng không hại; thứ tự này chỉ để
-- giữ đúng luật "dữ liệu đi sau giao diện".
--
-- ⚠️ Muốn GIỮ rail VNĐ (QR payOS/MoMo) cho khách Việt trong lúc chuyển: chạy
-- riêng câu `update app_config … true` ở khối (3) TRƯỚC khi deploy — câu đó
-- chỉ HIỆN lại rail đã có sẵn, an toàn chạy trước.
--
-- BA nơi cài cùng quy tắc "đơn giá = gói bậc hai", sửa kèm nhau:
--   1. SQL `credit_usd()`                       ← file này (mới)
--   2. `usdPerCredit()` + `FALLBACK.amountUsd`  ← lib/billing/packages.ts
--   3. `ToolPrices.usdPerCredit()`              ← public/tool-prices.js
-- `amount_vnd` KHÔNG đổi: chỉ còn dùng cho rail VNĐ (đang ẩn) và `credit_vnd()`
-- của báo cáo nội bộ.
-- ============================================================

begin;

-- (1) Giá bán USD.
update public.credit_packages set amount_usd =  7.99, updated_at = now() where package_id = '50';
update public.credit_packages set amount_usd = 14.99, updated_at = now() where package_id = '120';
update public.credit_packages set amount_usd = 26.99, updated_at = now() where package_id = '350';
update public.credit_packages set amount_usd = 37.99, updated_at = now() where package_id = '800';

-- (2) Đơn giá 1 Lượng theo USD — bản USD của `credit_vnd()`, cùng quy tắc bậc
-- hai theo `sort_order`. Nhánh cuối 0.0187 = 14.99/800 làm tròn (bảng gói rỗng
-- hoàn toàn — gần như không xảy ra; vẫn phải bám thang đang chạy).
create or replace function public.credit_usd()
returns numeric
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    (select round(amount_usd::numeric / credits, 6)
       from credit_packages
      where enabled = true and credits > 0 and amount_usd > 0
      order by sort_order
      offset 1 limit 1),
    (select round(amount_usd::numeric / credits, 6)
       from credit_packages
      where enabled = true and credits > 0 and amount_usd > 0
      order by sort_order
      limit 1),
    0.0187
  );
$function$;

-- SECURITY DEFINER mới LUÔN sinh ra hở — thu quyền ngay trong cùng file nguồn.
revoke all on function public.credit_usd() from public, anon, authenticated;
grant execute on function public.credit_usd() to service_role;

-- (3) Cờ rail VNĐ — `false` = ẩn QR chuyển khoản + MoMo khỏi giao diện web.
-- Code đọc thiếu khoá cũng ra `false`; ghi hẳn ra đây để Admin nhìn thấy và
-- lật được (`update public.app_config set value = 'true'::jsonb where key = …`).
-- `do nothing`: chạy lại file không được đè quyết định Henry đã lật tay.
insert into public.app_config (key, value, note)
values ('billing.vnd_rails_enabled', 'false'::jsonb,
        'W5: true = hiện lại rail VNĐ (QR payOS + MoMo) trên web. false = chỉ PayPal USD.')
on conflict (key) do nothing;

commit;

-- ── KIỂM SAU KHI CHẠY (đọc ngược lại, đừng tin lệnh update là xong) ──────────
-- select package_id, label, credits, amount_usd,
--        round(amount_usd::numeric / credits, 5) as usd_per_luong
--   from credit_packages where enabled order by sort_order;
--   -- kỳ vọng 7.99 / 14.99 / 26.99 / 37.99, cột cuối giảm dần
-- select public.credit_usd();     -- kỳ vọng 0.018738
-- select value from app_config where key = 'billing.vnd_rails_enabled';  -- false
-- select has_function_privilege('anon', 'public.credit_usd()', 'execute');  -- false
