-- /cong-cu dựng thẻ "Render Phòng Phong Thủy" từ tool_pricing.page_path =
-- '/tools/phong-thuy-render.html' — trang đó CHƯA từng tồn tại ⇒ 404 cho khách
-- (đóng vai khách bắt được 2026-09-25). Tính năng render nằm trong công cụ
-- Phong Thủy Cửa Hàng & VP (app-cua-hang-phong-thuy.html, product
-- 'phong-thuy-render') ⇒ trỏ thẻ về đó. Chỉ đổi đường dẫn, không đụng giá/enabled.
-- app_path để NULL: '/app/cua-hang-phong-thuy' đã là app_path của
-- 'cua-hang-phong-thuy', trùng thì `masterForTool` tra nhầm dòng.
update public.tool_pricing
   set page_path = '/app/cua-hang-phong-thuy'
 where tool_id = 'phong-thuy-render'
   and page_path = '/tools/phong-thuy-render.html';
