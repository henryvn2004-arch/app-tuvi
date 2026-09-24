# SPA-hoá tốc độ — Đợt 1-2 (2026-09-24)

Henry test thật trên điện thoại: "bấm nút chậm" (mỗi lần chuyển tab app-shell
là một lượt tải trang HTML đầy đủ). Yêu cầu: SPA-hoá **toàn bộ 96 trang**.
Không làm được toàn bộ trong một lượt — mở rộng dần theo đợt, lý do và ranh
giới hiện tại ghi ở đây (cập nhật mỗi đợt, đừng tạo file mới).

## Kiến trúc

`sidebar`/`tabbar`/`rail`/`backdrop` của app-shell **hoàn toàn do JS dựng**
(`shell.js` `renderSidebar`/`renderTabbar`/`renderRail`) — HTML tĩnh của mỗi
`app-*.html` chỉ có `<aside id="shell-sidebar"></aside>` RỖNG. Nghĩa là
chrome không đổi giữa các trang app-shell → soft-nav chỉ cần thay
`<main id="ws">` + chạy lại script riêng trang, KHÔNG cần dựng lại chrome,
KHÔNG cần chạm `shell.js`.

`public/tools-shared/shell-soft-nav.js`: bắt click `<a>` trong whitelist →
`fetch()` trang đích → thay `#ws` + `<style>` riêng trang (mỗi `app-*.html`
có ĐÚNG MỘT khối `<style>` trong `<head>`, đè vài rule `shell.css`) → chạy
lại các `<script>` không-có-`src` của trang đích (script dùng chung như
`shell.js`/`nav.js`/`auth.js` được nhận diện bằng chính URL đã nạp, không
nạp lại — nạp lại là DOUBLE-BOOT: đăng ký trùng listener `document`/`window`,
dựng trùng DOM). Lỗi bất kỳ → `location.href` (full reload, hành vi CŨ).

## Bẫy đã ĐO ĐƯỢC (không phải đoán) — "callback trễ chạm DOM đã biến mất"

Test cục bộ (Playwright, static server giả rewrite) bắt được THẬT hai lỗi
cùng họ ngay ở lượt đầu:

1. `account-core.js` `initProfile()` — đợi auth tối đa 1.5s rồi
   `document.getElementById('authLoading').style.display=…` KHÔNG kiểm null.
   Soft-nav rời trang TRONG lúc đợi → `#ws` đã đổi nội dung khi hàm tỉnh dậy.
2. `app-thay.html` `render()` — `ToolPrices.load().then(...)` gọi
   `document.getElementById('thayGrid').innerHTML=…`, cùng lỗi.

**Nguyên nhân gốc:** mọi script hiện có được viết với giả định "trang chỉ
rời đi bằng reload thật" (destroy toàn bộ JS context). Soft-nav phá giả định
đó — bất kỳ `Promise`/`setTimeout` nào tỉnh dậy sau khi người dùng đã chuyển
tab đều có thể ném lỗi kiểu `Cannot read properties of null`.

**Vá ở ĐÂU:** không vá từng chỗ (vô hạn — mỗi trang mới thêm vào phase sau
lại phải dò lại hàng chục hàm async). Vá TẬP TRUNG trong `shell-soft-nav.js`:
thay vì XOÁ `#ws` cũ, DỜI con của nó sang một khối `display:none` vẫn gắn
trong `document` ("nghĩa địa"), giữ 15 giây rồi mới gỡ. Callback trễ gọi
`getElementById` vẫn ra phần tử THẬT (vô hình, vô hại) thay vì `null`.
Nghĩa địa luôn `appendChild` SAU `#ws` trong `<body>` → trùng id thật (hiếm)
thì `getElementById` (khớp ĐẦU TIÊN theo document order) vẫn ưu tiên đúng
phần tử SỐNG.

Đã vá thêm 1 chỗ cụ thể (`initProfile`, null-safe) vì tiện tay tìm thấy —
nhưng đây là vá hú hoạ, không phải audit đầy đủ (xem "CHƯA làm" bên dưới).

## Verify

Playwright cục bộ (server Node giả các rewrite `/app/*`, không qua Next.js
vì môi trường build ở đây thiếu `SUPABASE_URL`): Đợt 1 — 40 lượt bấm ngẫu
nhiên xen kẽ 3 trang, độ trễ ngẫu nhiên 10-160ms (cố tình đua) — 0 lần
reload, 0 lỗi. Đợt 2 — mở rộng lên 60 lượt xen kẽ đủ 8 trang, cùng kịch
bản — vẫn 0 lần reload, 0 lỗi. Nút Back/Forward trình duyệt hoạt động đúng
(soft-nav qua `popstate`).

## Phạm vi hiện tại — 8/96 trang trong `SOFT_PAGES`

| Trang | Soft-nav? | Vì sao |
|---|---|---|
| Trang chủ, Các Thầy, Trò chuyện (Đợt 1) | ✅ | Test qua, không còn lỗi biết được |
| Kim Lâu, Nạp Âm, Số Đẹp, Bản Đồ Sao, Hoàng Đạo (Đợt 2) | ✅ | Miễn phí, không `tuvi-paywall.js`, không `setInterval` riêng, script double-run sạch, stress test 60 lượt/8 trang không lỗi |
| Nạp Lượng (`topup.html`) | ❌ full reload | Có `setInterval` chờ thanh toán + lịch sử bug đua nhau (`nhat-ky/2026-08.md` "Purchase từng bắn trùng"). Soft-nav không huỷ `document` → interval cũ có thể sống sót qua lượt chuyển tab. Rủi ro cao hơn lợi ích tốc độ trên đúng đường tiền. |
| Hồ Sơ (`account-core.js`, 1637 dòng, hàng chục hàm async: History/Ví/Kết nối Telegram-WhatsApp-Messenger/MCP key/Nhiệm vụ/Giới thiệu) | ❌ full reload | Không đủ thời gian dò hết — môi trường này không có Supabase/auth thật để bấm qua từng tab của trang mà đo. Một lỗi đã bắt được (`initProfile`) đã vá, nhưng đó chỉ là MỘT trong hàng chục hàm khả nghi cùng họ. |
| **Mọi trang có `tuvi-paywall.js`** (`public/tuvi-paywall.js` — bản thật, KHÔNG phải file `tuvi-paywall.js` ở gốc repo, đã lỗi thời/không được serve) | ❌ full reload | Module này có `_qrTimer`/`_qrPoll` — CÙNG HỌ `setInterval` chờ thanh toán như `topup.html`. Rủi ro y hệt trên MỌI trang dùng module này, không chỉ Nạp Lượng — loại trừ cả nhóm cho tới khi có đợt audit riêng cho luồng trả-tại-chỗ bằng QR. |

## CHƯA làm — cố ý, không phải thiếu sót

- **88 trang còn lại** (đa số có `tuvi-paywall.js` — lá số, xem tướng, phong
  thủy, Bát Tự…) — mỗi trang/nhóm cần cùng một vòng kiểm — dò `setInterval`/
  polling, dò hàm async có thể chạm DOM sau khi rời trang, test thật bằng
  Playwright — trước khi thêm vào whitelist `SOFT_PAGES`. Cơ chế nghĩa địa
  giảm rủi ro nhưng KHÔNG loại bỏ hoàn toàn (không cứu được `setInterval`
  polling thật, chỉ cứu callback một lần chạm DOM).
- **View Transitions + prefetch-on-intent** (đã làm, xem `public/nav.js`,
  phủ 91/96 trang) là lớp NỀN riêng, áp dụng được cho MỌI trang kể cả 88
  trang chưa SPA-hoá — không phụ thuộc việc mở rộng `SOFT_PAGES`.
- **Chưa đo hiệu năng thật trước/sau** bằng Lighthouse — môi trường build ở
  đây không có mạng ổn định ra `tuviminhbao.com` (đã ghi trong `CLAUDE.md`)
  để chạy so sánh đáng tin; cần chạy `npm run lhci` hoặc Lighthouse CI thật
  trên PR để có số đo chính thức.

## Khi mở rộng `SOFT_PAGES` sang trang mới

1. Trang đích PHẢI có `<main id="ws">` (mọi `app-*.html` đều có).
2. Dò trang đó có `setInterval`/polling không tự dừng — có thì KHÔNG thêm
   vào whitelist cho tới khi trang đó có cơ chế dừng khi rời đi.
3. Test bằng kịch bản giống Đợt 1: bấm nhanh, ngẫu nhiên, độ trễ đua nhau,
   bắt `page.on('pageerror')`.
4. Nghĩa địa giúp giảm rủi ro nhưng không phải giấy phép bỏ qua bước 2-3.
