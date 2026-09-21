-- ============================================================
-- 1 LƯỢNG = 500đ CHÍNH XÁC (Henry chốt 2026-09-20, nối tiếp
-- migration-luong-500.sql — 06/09/2026 landed ở 499đ, không tròn)
-- ============================================================
-- "Mày quy đổi lại giá 1 lượng = 500đ chính xác đi. Để giá VNĐ nó tròn số
--  user dễ nhập khi thanh toán hơn."
--
-- HIỆN TRẠNG: `credit_vnd()`/`vndPerCredit()` suy từ bậc hai (Phổ Thông,
-- sort_order=2) — 399.000đ/800 Lượng = 499đ (làm tròn từ 498,75). Gần 500
-- nhưng không ĐÚNG 500, nên số VNĐ gợi ý cho QR chuyển khoản (vd 200 Lượng ×
-- 499 = 99.800đ) không tròn tuyệt đối — chỉ tình cờ tròn khi hàm hiển thị
-- ceil lên nghìn gần nhất che được sai số.
--
-- CÁCH LÀM: KHÔNG đụng Lượng (giữ 800, tròn), NÂNG GIÁ gói Phổ Thông
-- 399.000 → 400.000 ⇒ 400.000/800 = 500đ ĐÚNG TUYỆT ĐỐI, không cần làm tròn.
--
-- 🔑 VÌ SAO ĐỔI GIÁ THAY VÌ ĐỔI LƯỢNG (ngược cách làm của migration-luong-500.sql):
-- đổi Lượng 800→798 để khớp 500đ thì được số Lượng LẺ (798), xấu hơn hẳn số
-- gói đang quảng cáo (800) — mà đổi tiền +1.000đ (0,25%) thì cả hai số liên
-- quan (giá gói VÀ đơn giá suy ra) đều tròn. Ba gói còn lại (Khởi Đầu/Cao
-- Cấp/VIP) CỐ Ý không đổi — thang chiết khấu vẫn đơn điệu giảm:
--   568,57 (Khởi Đầu) > 500,00 (Phổ Thông) > 436,88 (Cao Cấp) > 370,00 (VIP)
--
-- BA nơi phải khớp nhau (CLAUDE.md liệt kê ba của lần trước — data-side này
-- CHỈ đụng (1), còn (2) credit_vnd() và (3) FALLBACK/vndPerCredit() tự suy
-- lại từ (1) nên KHÔNG cần sửa logic, chỉ cần FALLBACK khớp SỐ MỚI):
--   1. bảng `credit_packages`                    ← file này
--   2. `credit_vnd()`                            ← không đổi (đã suy từ (1))
--   3. `FALLBACK` — lib/billing/packages.ts       ← sửa NGAY TRONG PR này
--
-- KHÔNG đụng `tool_pricing`: giá tool tính bằng LƯỢNG giữ nguyên. VNĐ hiển
-- thị cạnh nó tự đổi theo qua `vndLabel()`, không cần sửa 45 dòng giá.
-- ============================================================

begin;

update public.credit_packages
   set amount_vnd = 400000, updated_at = now()
 where package_id = '120'
   and amount_vnd = 399000;

commit;

-- ── KIỂM SAU KHI CHẠY (đọc ngược lại, đừng tin lệnh update là xong) ──────────
-- select package_id, label, amount_vnd, credits,
--        round(amount_vnd::numeric/credits,2) as vnd_per_luong
--   from credit_packages where enabled order by sort_order;
-- select public.credit_vnd();          -- kỳ vọng ĐÚNG 500 (không phải 499)
