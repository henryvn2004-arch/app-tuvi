-- ============================================================
-- W5 — BÁN BẰNG USD QUA PAYPAL, BỎ VNĐ Ở MỌI CHỖ KHÁCH THẤY (2026-11)
-- ============================================================
-- ✅ BẢNG GIÁ HENRY ĐÃ CHỐT (2026-11-11, qua session chỉ huy i18n).
--
-- "Lượng" vẫn là đơn vị nội bộ: `tool_pricing` (giá theo Lượng) và số dư của
-- người dùng KHÔNG đổi ⇒ không ai mất tiền, sổ không phải viết lại. Thứ đổi là
-- GIÁ BÁN của gói (`amount_usd`, PayPal thu cột này) và số Lượng của hai gói lớn.
--
--   gói         Lượng (cũ → mới)   USD (cũ → mới)    $/Lượng
--   Khởi Đầu      350              8.00 →  19.00    0.054286
--   Phổ Thông     800             16.00 →  39.00    0.048750  ← bậc hai
--   Cao Cấp      1600 → 1750      28.00 →  79.00    0.045143
--   VIP          2700 → 3800      40.00 → 159.00    0.041842
--
-- Thang "mua nhiều rẻ hơn" vẫn đơn điệu giảm. `credit_usd()` (bậc hai) =
-- 39/800 = $0.04875 ⇒ Luận Giải 150 Lượng = $7.3125 → nhãn "~$7.32" (làm tròn
-- LÊN cent). `credit_vnd()` không đổi (bậc hai vẫn 400.000/800).
-- Số dư cũ giữ nguyên; webhook/lượt chốt PayPal cấp Lượng theo gói đọc từ DB
-- (`getPackage`) ⇒ sau file này đơn Cao Cấp/VIP cấp 1750/3800.

-- 🔴 THỨ TỰ TRIỂN KHAI — DỮ LIỆU ĐI SAU GIAO DIỆN:
--   1. Merge + deploy code W5, đợi prod phục vụ bản mới.
--   2. Chạy file này NGAY SAU đó (đừng để khoảng giữa kéo dài).
--   3. Đọc ngược lại (khối KIỂM cuối file) rồi mới báo xong.
--
-- KHOẢNG GIỮA bước 1 và 2: DB vẫn là giá CŨ ⇒ web hiện và PayPal thu
-- 8/16/28/40 USD, cấp 350/800/1600/2700 Lượng — tự nhất quán (hiện gì thu nấy,
-- thu gì cấp nấy). Lệch CHỈ khi DB đọc hụt và rơi về `FALLBACK` (đã mang giá
-- MỚI): tạo đơn theo FALLBACK ($79) mà lượt chốt đọc lại được DB (1600 Lượng)
-- là khách trả giá mới nhận Lượng cũ. Hiếm (cần DB chớp đúng lúc tạo đơn) nhưng
-- có thật ⇒ lý do bước 2 phải theo sát bước 1.
--
-- Vì sao KHÔNG chạy data TRƯỚC code: code cũ đang chạy hiện giá VNĐ
-- (`amount_vnd` 699.000đ) trong khi PayPal thu `amount_usd` — chạy file này
-- trước là MỌI khách PayPal trong khoảng giữa thấy 699.000đ mà bị thu $79
-- (~2 triệu đồng). Lệch có hệ thống, tệ hơn hẳn rủi ro FALLBACK ở trên.
--
-- ⚠️ Rail VNĐ (QR payOS/MoMo) đọc `amount_vnd` — file này KHÔNG đổi cột đó,
-- nhưng tăng Lượng của Cao Cấp/VIP ⇒ 699.000đ mua 1750 Lượng, 999.000đ mua
-- 3800 (~3 lần rẻ hơn giá USD mới). Đang ẩn nên vô hại; muốn BẬT lại cờ ở khối
-- (3) thì phải định giá lại `amount_vnd` trước, nếu không khách Việt mua rẻ
-- hơn hẳn khách quốc tế cho cùng gói.
--
-- BA nơi cài cùng quy tắc "đơn giá = gói bậc hai", sửa kèm nhau:
--   1. SQL `credit_usd()`                       ← file này (mới)
--   2. `usdPerCredit()` + `FALLBACK.amountUsd`  ← lib/billing/packages.ts
--   3. `ToolPrices.usdPerCredit()`              ← public/tool-prices.js
-- `amount_vnd` KHÔNG đổi: chỉ còn dùng cho rail VNĐ (đang ẩn) và `credit_vnd()`
-- của báo cáo nội bộ.
-- ============================================================

begin;

-- (1) Giá bán USD + số Lượng (Cao Cấp, VIP tăng Lượng).
update public.credit_packages set credits =  350, amount_usd =  19.00, updated_at = now() where package_id = '50';
update public.credit_packages set credits =  800, amount_usd =  39.00, updated_at = now() where package_id = '120';
update public.credit_packages set credits = 1750, amount_usd =  79.00, updated_at = now() where package_id = '350';
update public.credit_packages set credits = 3800, amount_usd = 159.00, updated_at = now() where package_id = '800';

-- (2) Đơn giá 1 Lượng theo USD — bản USD của `credit_vnd()`, cùng quy tắc bậc
-- hai theo `sort_order`. Nhánh cuối 0.04875 = 39/800 (bảng gói rỗng
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
    0.04875
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
--   -- kỳ vọng credits 350/800/1750/3800 · usd 19/39/79/159, cột cuối giảm dần
-- select public.credit_usd();     -- kỳ vọng 0.048750
-- select public.credit_vnd();     -- kỳ vọng 500 (không đổi)
-- select value from app_config where key = 'billing.vnd_rails_enabled';  -- false
-- select has_function_privilege('anon', 'public.credit_usd()', 'execute');  -- false
