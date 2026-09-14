-- ============================================================
-- Pha 1a (vá phễu conversion 2026-09) — hạ giá vào QR của laso và
-- chu-trinh-cuoc-doi từ 250 → 100 Lượng (~139.000đ → ~50.000đ ở đơn giá
-- hiện hành 499đ/Lượng, bậc hai `credit_packages`).
--
-- Số đo 30 ngày trước khi đổi (Pha 0): QR 143.000đ có 46 người mở, 2 người
-- trả (4%). QR 50–57.000đ (giá của các tool khác đã ở sàn 50k) có 10 người
-- mở, 7 người trả (70%). Doanh thu/lượt bấm mở: 6.200đ so với 40.000đ.
-- Chênh lệch quá lớn để không phải giá là nguyên nhân chính ở bậc này.
--
-- KHÔNG đụng `credits_per_part` (chu-trinh-cuoc-doi=23, laso=null) — bán
-- theo phần đã bị gỡ khỏi UI từ trước (không còn `data-tvp-price-part` nào
-- trong public/*.html), giữ nguyên giá trị cũ không ảnh hưởng gì tới người
-- dùng, đổi nó chỉ thêm rủi ro cho một đường đã chết.
--
-- Cổng đo: 2 tuần ở giá mới. QR mở → trả phải ≥ 20% (nền 4%). Nếu không đạt,
-- lùi bằng đúng câu ngược lại (update ... set credits = 250).
-- ============================================================

update tool_pricing
   set credits = 100
 where tool_id in ('laso', 'chu-trinh-cuoc-doi')
   and credits = 250;
