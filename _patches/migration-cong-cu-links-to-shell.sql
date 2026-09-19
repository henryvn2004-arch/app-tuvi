-- ============================================================================
-- /cong-cu: card link cho từng tool đọc qua public/tool-prices.js::pagePath()
-- = `page_path || app_path` (cong-cu.html:584 `ToolPrices.pagePath(t)`) — ưu
-- tiên page_path nên card đang trỏ THẲNG vào trang standalone cũ
-- (`/tools/<slug>.html`) thay vì bản shell (`/app/<slug>`), dù shell đã có.
-- Henry yêu cầu route toàn bộ traffic tool trên /cong-cu về shell.
--
-- Set NULL đúng theo comment sẵn trên cột lúc tạo (migration-tool-groups.sql):
-- "NULL = chưa có ⇒ /cong-cu sẽ trỏ về app_path". Chỉ null những tool ĐANG
-- hiện trên /cong-cu (enabled=true) và ĐÃ có app_path (shell) để thay — null
-- một tool chưa có app_path sẽ làm card mất link hẳn.
--
-- CHỪA LẠI 'kim-lau': page_path='/kim-lau' là trang trụ hợp nhất (công cụ +
-- công thức + bảng tra + hoá giải), quyết định GIỮ standalone đã ghi rõ ở
-- migration-retire-luan-giai-html.sql / docs/nhat-ky — không phải bản trùng
-- lặp cần gộp.
--
-- LƯU Ý: 'tu-binh', 'xem-tuoi', 'xem-lam-an' vẫn còn bản standalone RIÊNG,
-- giàu nội dung (own engine, own paywall/funnel, có test Playwright riêng
-- test.spec nhắm thẳng .html) — patch này CHỈ đổi link trên card /cong-cu,
-- KHÔNG xoá/redirect các trang .html đó, nên các đường dẫn cứng khác
-- (conversion.js, account-core.js, testimonials.js, nav.spec.ts, sitemap)
-- không bị ảnh hưởng và vẫn trỏ .html như cũ.
update public.tool_pricing
set page_path = null
where enabled = true
  and app_path is not null
  and page_path is not null
  and tool_id <> 'kim-lau';
