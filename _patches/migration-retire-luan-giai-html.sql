-- ============================================================================
-- Retire /luan-giai.html (trang cũ 24 phần) — Henry, 2026-09-14 (xem plan
-- productize luận giải, docs/nhat-ky/2026-09.md). 301 (Next trả 308) sang
-- /app/luan-giai đã khai ở next.config.mjs.
--
-- `tool_pricing.page_path` ('/luan-giai.html' cho tool 'laso') ĐƯỢC ƯU TIÊN
-- HƠN `app_path` khi UI resolve URL (public/tool-prices.js:309 —
-- `row.page_path || row.app_path`) — /cong-cu.html và mọi nơi khác đọc URL
-- qua hàm đó vẫn đang trỏ THẲNG vào trang cũ, redirect chỉ vá được lớp
-- request, không vá được nguồn dữ liệu sinh ra link đó. Set NULL đúng theo
-- comment đã ghi sẵn trên cột này lúc tạo (migration-tool-groups.sql):
-- "NULL = chưa có ⇒ /cong-cu sẽ trỏ về app_path" — 'laso' nay không còn
-- trang ĐỘC LẬP nào nữa, chỉ còn app_path trong Luận Đường.
--
-- An toàn deploy độc lập: app_path='/app/luan-giai' đã sống từ trước (rewrite
-- có sẵn trong next.config.mjs), không phụ thuộc redirect mới có deploy hay
-- chưa — đổi NGAY không cần chờ thứ tự.
update public.tool_pricing
set page_path = null
where tool_id = 'laso' and page_path = '/luan-giai.html';
