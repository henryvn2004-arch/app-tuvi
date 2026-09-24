# SPA-hoá tốc độ — Đợt 1-3 (2026-09-24)

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
bản — vẫn 0 lần reload, 0 lỗi. Đợt 3 — 90 lượt xen kẽ đủ 12 trang; ở độ
trễ CỰC ĐOAN (10-160ms) thấy ~89/90 "hard reload" — ĐÂY LÀ ĐÚNG THIẾT KẾ,
không phải bug: cờ `inflight` trong `go()` cố ý rớt về full reload khi một
cú bấm mới tới trong lúc lượt trước còn đang fetch, tránh chồng hai lượt
điều hướng lên nhau; không con người nào bấm nhanh cỡ đó. Đo lại ở độ trễ
150-350ms (khoảng double-tap thực tế) và 500ms cố định — cả hai đều 0 lần
reload, 0 lỗi trên đủ 12 trang. Nút Back/Forward trình duyệt hoạt động đúng
(soft-nav qua `popstate`).

## Phạm vi hiện tại — 51/96 trang trong `SOFT_PAGES` (54 route, `/app/la-so`+`/app/luan-giai` chung file)

| Trang | Soft-nav? | Vì sao |
|---|---|---|
| Trang chủ, Các Thầy, Trò chuyện (Đợt 1) | ✅ | Test qua, không còn lỗi biết được |
| Kim Lâu, Nạp Âm, Số Đẹp, Bản Đồ Sao, Hoàng Đạo (Đợt 2) | ✅ | Miễn phí, không `tuvi-paywall.js`, không `setInterval` riêng, script double-run sạch, stress test 60 lượt/8 trang không lỗi |
| Bát Trạch, Lục Nhâm, Ngày Tốt, Thần Số Học (Đợt 3) | ✅ | Cùng tiêu chí Đợt 2, script double-run sạch, stress test 90 lượt/12 trang không lỗi |
| Kỳ Môn, Mai Hoa, Ngũ Hành Tên, Kinh Dịch (Đợt 4) | ✅ | Vá đúng nguyên nhân gốc — xem mục Đợt 4 bên dưới, không phải IIFE |
| Đặt Tên, Đặt Tên Doanh Nghiệp, Chọn Ngày, Công Sở (Đợt 5) | ✅ | CÓ `tuvi-paywall.js` nhưng module đã được vá (đợt audit trước) + 4 trang này không tự gọi thư viện có timer nào — xem mục Đợt 5 bên dưới |
| Nhân Mạch, Giờ Sinh, Hướng Nghiệp Trẻ, Bút Tướng (Đợt 7) | ✅ | 2/4 gọi `AiLoadingSteps` (giờ an toàn nhờ Đợt 6) — xem mục Đợt 7 bên dưới |
| Khí Sắc, Trang Điểm, Vận Hạn Năm, Xem Tuổi/Xem Làm Ăn/Tương Hợp (Đợt 8) | ✅ | Phát hiện + vá một bug thật ĐÃ SỐNG từ Đợt 5/7 (lệch `?v=` của `tuvi-ansao-engine.js`) — xem mục Đợt 8 bên dưới |
| 23 trang còn lại của nhóm `tuvi-paywall.js` (Đợt 9) | ✅ | Hết cả nhóm — xem mục Đợt 9 bên dưới. Cố ý loại `thanh-tuong-pro` (bug rò mic có sẵn, không liên quan soft-nav) |
| Nạp Lượng (`topup.html`) | ❌ full reload | Có `setInterval` chờ thanh toán + lịch sử bug đua nhau (`nhat-ky/2026-08.md` "Purchase từng bắn trùng"). Soft-nav không huỷ `document` → interval cũ có thể sống sót qua lượt chuyển tab. Rủi ro cao hơn lợi ích tốc độ trên đúng đường tiền. |
| Hồ Sơ (`account-core.js`, 1637 dòng, hàng chục hàm async: History/Ví/Kết nối Telegram-WhatsApp-Messenger/MCP key/Nhiệm vụ/Giới thiệu) | ❌ full reload | Không đủ thời gian dò hết — môi trường này không có Supabase/auth thật để bấm qua từng tab của trang mà đo. Một lỗi đã bắt được (`initProfile`) đã vá, nhưng đó chỉ là MỘT trong hàng chục hàm khả nghi cùng họ. |
| Thầy Tướng Chuyên Sâu (`thanh-tuong-pro.html`) | ❌ full reload | Bug rò tài nguyên có sẵn, ĐỘC LẬP với soft-nav — mic (`state.stream`) không bao giờ `.getTracks().forEach(t=>t.stop())` ở BẤT KỲ luồng nào, kể cả xong việc bình thường. Vá riêng, đợt sau. |

## CHƯA làm — cố ý, không phải thiếu sót

- **84 trang còn lại** (đa số có `tuvi-paywall.js` — lá số, xem tướng, phong
  thủy, Bát Tự…) — mỗi trang/nhóm cần cùng một vòng kiểm — dò `setInterval`/
  polling, dò hàm async có thể chạm DOM sau khi rời trang, test thật bằng
  Playwright — trước khi thêm vào whitelist `SOFT_PAGES`. Cơ chế nghĩa địa
  giảm rủi ro nhưng KHÔNG loại bỏ hoàn toàn (không cứu được `setInterval`
  polling thật, chỉ cứu callback một lần chạm DOM). Đang có một audit riêng
  (worktree khác, nhánh `claude/audit-tuvi-paywall-softnav`) soát cụ thể
  module `tuvi-paywall.js` để mở khoá nhóm trang trả-tại-chỗ bằng QR — xem
  PR nhánh đó khi xong, đừng audit trùng.
- **View Transitions + prefetch-on-intent** (đã làm, xem `public/nav.js`,
  phủ 91/96 trang) là lớp NỀN riêng, áp dụng được cho MỌI trang kể cả 84
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
5. **So `?v=` của MỌI `<script src>` dùng chung với trang đích, đối chiếu
   toàn bộ trang ĐÃ có trong `SOFT_PAGES`** (không chỉ so với các trang
   thêm CÙNG đợt) — lệch version cho MỘT script KHÔNG bọc IIFE (không chỉ
   `tuvi-paywall.js`) là double-load + `SyntaxError` redeclare khi soft-nav
   giữa hai trang lệch version, dù cả hai trang RIÊNG LẺ đều double-run
   sạch. Phát hiện ở Đợt 8: `tuvi-ansao-engine.js` (không IIFE, khai
   `const _CAN`/`_CHI` top-level) đã sống 2 version khác nhau
   (`?v=1` ở Công Sở/Hướng Nghiệp Trẻ từ Đợt 5/7, không hậu tố ở
   Hoàng Đạo/Mai Hoa/Ngày Tốt từ Đợt 2-4) NGAY TRONG `SOFT_PAGES` — bug
   THẬT đã sống từ Đợt 5, chỉ lộ ra khi stress test Đợt 8 mở rộng đủ tổ
   hợp trang để chạm đúng cặp lệch version. Script CÓ bọc IIFE (kiểm bằng
   mắt: mở đầu bằng `(function() {`/`(function(root){`) thì double-load
   vô hại, không cần đồng bộ version.
6. **Đổi `let`/`const` top-level → `var` thì soát TÊN BIẾN trùng với MỌI
   script dùng chung đang có trong `SOFT_PAGES`**, không chỉ double-run
   sạch chính trang đó — `var`/`const` không cho trộn cùng tên trong
   cùng scope dù script nào khai trước. Phát hiện ở Đợt 9:
   `trang-phuc-theo-ngay.html` đổi `_CAN`/`_CHI` sang `var` xong vẫn vỡ
   vì `tuvi-ansao-engine.js` (nhiều trang khác đã nạp) khai `const` cùng
   tên. `node --check` nhân đôi KHÔNG bắt được va chạm chéo này.

## Audit `public/tuvi-paywall.js` (2026-09-24) — module bị loại trừ ở Đợt 1-2

Đợt 1-2 loại trừ NGUYÊN nhóm 40+ trang dùng module này (không phải file
`tuvi-paywall.js` ở gốc repo, đã lỗi thời/không được serve — bản thật ở
`public/`) khỏi `SOFT_PAGES` vì `_qrTimer`/`_qrPoll` — cùng họ `setInterval`
chờ thanh toán như `topup.html` — nhưng không kịp audit trong đợt đó. Việc
này audit riêng module đó (không mở `SOFT_PAGES` — đó là quyết định của một
đợt sau).

**Vòng đời poll:** `_openBankQr` → `setInterval(…,3000)` (`_qrTimer`) gọi
`_qrPoll` mỗi 3s + `visibilitychange` gọi thêm khi quay lại tab. Thành công
thì tự `clearInterval`/null `_qrOrderCode` rồi chạy `requireCredits(slug,
callback)` — `slug`/`callback` là CLOSURE của trang lúc mở QR. Đường huỷ khi
khách tự đóng modal/Esc: `_closeQr()`.

**Đã vá:** `document.addEventListener('tvmb:softnav', …)` gọi ĐÚNG
`_closeQr()` khi `_qrOrderCode` đang có giá trị — TÁI DÙNG, không viết đường
huỷ thứ hai. Không vá thì soft-nav không destroy `document` → interval sống
sót qua lượt chuyển trang → `check-bank` báo `paid` đúng lúc khách đã sang
tool khác sẽ chạy `requireCredits` của TRANG CŨ trên bối cảnh trang MỚI —
đúng họ rủi ro đã loại trừ cả nhóm để tránh. Trang không nạp
`shell-soft-nav.js` (topup.html, ngoài `/app/*`) không bao giờ bắn sự kiện
này nên không đổi gì hành vi ở đó.

**Phần còn lại của file — audit "callback trễ chạm DOM null" (họ lỗi đã vá ở
`account-core.js`/`app-thay.html`):** mọi `getElementById` (29 lần) đều nhắm
phần tử module TỰ TẠO, gắn vào `document.body`/`document.head` (modal QR,
banner, refund modal, script nạp lười) — KHÔNG nằm trong `#ws`, không bị
`#ws.innerHTML=` của soft-nav xoá mất, nên KHÔNG cùng họ rủi ro null như các
script trang riêng. Các hàm ghi vào phần tử DO TRANG TRUYỀN VÀO
(`lockPreview(host)`, `mountCostHints`, `_softLock`/`_hintAnchors`) đã tự
kiểm bằng đúng kiểu codebase dùng (`document.body.contains(veil)`,
`afterEl.parentNode`, `_visible()`) — nghĩa địa của `shell-soft-nav.js` giữ
các phần tử này SỐNG (vô hình) đủ lâu nên await dang dở ghi vào đó không ném
lỗi, chỉ ghi vô hại vào DOM đã chôn. **Không tìm thấy thêm lỗi null-crash nào
cần vá** trong lượt audit này.

**IIFE + double-run:** `const TuviPaywall = (() => {...})()` — IIFE thật,
không rò biến ngoài `window.TuviPaywall`. `node --check` trên bản NHÂN ĐÔI
báo lỗi redeclare, NHƯNG file nạp qua `<script src="/tuvi-paywall.js?v=NN">`
(không phải script rời trong `body`) — `shell-soft-nav.js` chỉ chạy lại
script KHÔNG `src`, script CÓ `src` bị bỏ qua nếu URL đã nạp (`loadedSrc`).
🪤 **Cờ cần nhớ nếu mở `SOFT_PAGES` cho nhóm này:** mọi trang cùng một đợt
PHẢI cùng `?v=` của `tuvi-paywall.js` — lệch version thì soft-nav coi là
"chưa nạp", chèn `<script>` thứ hai, IIFE thứ hai ném `SyntaxError` lúc parse
(không chạy — `TuviPaywall` cũ còn nguyên — nhưng xả lỗi console).

**Verify:** harness Playwright riêng (server Node tĩnh + trang nạp CHÍNH
`public/tuvi-paywall.js`, stub `Auth`/`ToolPrices`/`fetch`) chạy thật
`requireCredits → _insufficient → _openBankQr`, xác nhận poll chạy thật rồi
bắn `tvmb:softnav` → modal ẩn NGAY + 0 lượt `check-bank` thêm trong 9.5s +
callback trang cũ không bao giờ chạy. Red-team: bỏ bản vá chạy lại — fail
đúng ở bước "modal ẩn" (poll vẫn sống).

**CHƯA làm:** không thêm trang nào vào `SOFT_PAGES` (quyết định của đợt sau).

## Đợt 4: 4 trang bị loại ở Đợt 3 — vá bằng `var`, KHÔNG bọc IIFE (2026-09-24)

Đợt 3 loại Kỳ Môn/Mai Hoa/Ngũ Hành Tên/Kinh Dịch vì double-run báo
`SyntaxError` trên `let _b`/`let _mode, _r`/`let _syls`/`let currentLines,
step, isFlipping` — và ghi nợ "cần bọc IIFE". Nhìn lại: **bọc IIFE là thừa
và rủi ro hơn cần thiết.**

**Vì sao không cần IIFE:** nguyên nhân duy nhất của `SyntaxError` là
`let`/`const`/`class` khai Ở TOP-LEVEL của một `<script>` không cho phép
đứng tên trùng với chính nó ở lượt chạy lại (spec ES2015, lexical
declaration). `var` và `function` khai ở top-level thì KHÔNG bị luật này —
chạy lại chỉ gán/định nghĩa lại, không ném lỗi, giữ nguyên hành vi (biến về
giá trị khởi tạo — đúng thứ một trang "mới mở" cần). Bốn trang này CHỈ hỏng
đúng ở các biến trạng thái top-level đó (`_b`, `_mode`, `_r`, `_syls`,
`currentLines`, `step`, `isFlipping`) — mọi hàm khác đều là `function`
(không tự đứt) và các nút bấm dùng `onclick="tenHam()"` (đọc hàm từ `window`,
không đứng trong closure riêng). Đổi `let`/`const` → `var` cho ĐÚNG các biến
đó là vá tận gốc, 1 dòng/biến, không đụng gì khác.

Nếu bọc IIFE thay vào đó: mọi hàm hiện đang là global (`lapBan`, `gieo`,
`calculate`, `toss`, `reset`, …) sẽ biến mất khỏi `window`, làm **mọi**
`onclick="..."` trên 4 trang này câm — phải tự expose lại từng hàm ra
`window.tenHam = tenHam` hoặc viết lại toàn bộ `onclick` thành
`addEventListener`, đúng khối lượng sửa mà Đợt 3 đã né vì áp lực thời gian.
`var` đạt cùng mục tiêu an toàn mà không đụng tới bất kỳ `onclick` nào.

**Phát hiện thêm khi audit Kinh Dịch — timer bounded cũng cần lưới an toàn:**
`toss()` chạy `setInterval` hoạt ảnh tung xu, tối đa 600ms rồi tự
`clearInterval` — khác họ poll-vô-hạn của `tuvi-paywall.js`, nhưng vẫn CÓ
cửa sổ rủi ro thật: bấm chuyển tab đúng lúc đang tung HÀO THỨ 6 (hào cuối) →
soft-nav không destroy `document` → interval cũ sống hết 600ms trên trang
MỚI → tự gọi `showResult()` → `Shell.setContext({scenario:{type:'kinh-dich'
,...}})` ĐÈ rail context của trang khách đang đứng, dù URL đã đổi.

**Đã đo được bằng red-team (không phải suy đoán):** dựng lại đúng kịch bản —
set `step=5` (giả 5 hào đã gieo), gọi `toss()` gieo hào thứ 6, chờ 150ms
(giữa hoạt ảnh), bấm sang trang khác, patch `Shell.setContext` để bắt cuộc
gọi lạ. KHÔNG có bản vá: tại mốc ~1100ms (sau khi rời trang ~800ms),
`Shell.setContext` bị gọi với `scenario.type: 'kinh-dich'` trong khi
`location.pathname` đã là trang khác — xác nhận đúng lỗi ngờ tới, không phải
tưởng tượng. CÓ bản vá: `step` giữ nguyên ở 5 (interval bị `clearInterval`
giữa chừng), `stray` luôn `null` suốt 2s theo dõi.

**Đã vá:** thêm `document.addEventListener('tvmb:softnav', …)` gọi
`clearInterval(_tossInterval)` + `isFlipping = false` — tái dùng đúng biến
`_tossInterval` (nâng từ biến cục bộ `interval` trong `toss()` lên top-level
`var` để handler ngoài với tới), không viết đường huỷ thứ hai.

**Verify:** Playwright cục bộ (server Node giả rewrite `/app/*`, không qua
Next thật):
- 60 lượt bấm ngẫu nhiên xen kẽ ĐỦ 8 trang (Đợt 1-3 + 4 trang mới), đo bằng
  marker `window.__marker__` sống/chết qua điều hướng (KHÔNG dùng sự kiện
  `framenavigated` của Playwright để suy hard-reload — `history.pushState`
  CŨNG bắn `framenavigated`, dùng nó ra kết quả dương tính giả 100% ở lượt đo
  đầu tiên, đã tự vấp rồi tự sửa ngay trong đợt này, ghi lại ở bẫy bên dưới):
  0 hard-reload, 0 `pageerror`.
- Kịch bản tung xu giữa chừng (150ms sau `toss()`, gieo hào BẤT KỲ, không
  riêng hào cuối) rồi chuyển trang: 0 hard-reload, 0 lỗi.
- 4 trang mới bấm sang Nạp Lượng/Hồ Sơ: vẫn full reload đúng như cũ (cơ chế
  loại trừ theo đích, không phụ thuộc nguồn).
- `node --check` trên bản mỗi trang NHÂN ĐÔI: sạch cả 4 (trước đây báo lỗi).
- `npm run lint` (0 lỗi) · `npx prettier@3.9.6 --check` sạch · toàn bộ
  `npm run check:*` (50 bộ) qua hết, kể cả `check:terms`/`check:payossig`
  (khác PR audit tuvi-paywall.js trước đó — môi trường lần này build sẵn
  `tuvi-engine/dist` từ đầu, không hụt package).

🪤 **Bẫy tự vấp trong đợt này — `framenavigated` không phân biệt được
soft-nav với hard-reload:** Playwright bắn sự kiện `framenavigated` cho CẢ
điều hướng cùng tài liệu (`history.pushState`/`replaceState`, đúng cơ chế
`shell-soft-nav.js` dùng) LẪN điều hướng thật. Đếm số lần `framenavigated`
để suy "có reload không" cho ra 100% dương tính giả — kể cả cặp trang đã
CHỨNG MINH an toàn từ Đợt 1-3. Phép đo đúng: đặt một biến đánh dấu trên
`window` TRƯỚC khi bấm, đọc lại SAU — biến còn sống nghĩa là JS context
không bị huỷ (soft-nav), biến mất/`page.evaluate` ném lỗi context-destroyed
nghĩa là hard-reload thật.

**CHƯA làm:** 84 trang còn lại (đa số `tuvi-paywall.js`) không đổi; nhóm
`tuvi-paywall.js` giờ đã có bản vá riêng (PR audit) nhưng CHƯA trang nào
trong nhóm đó được thêm vào `SOFT_PAGES` — vẫn là quyết định của một đợt
sau.

## Đợt 5: mở `SOFT_PAGES` cho 4 trang ĐẦU TIÊN của nhóm `tuvi-paywall.js` (2026-09-24)

Module `tuvi-paywall.js` đã được vá an toàn cho soft-nav (đợt audit trước,
merge trước đợt này) — việc còn lại là audit TỪNG TRANG trong nhóm ~35
trang dùng module đó, đúng quy trình đã lập (double-run + không
`setInterval` riêng + stress test). Đợt này chọn 4 trang đơn giản nhất
theo tiêu chí đó: **Đặt Tên, Đặt Tên Doanh Nghiệp, Chọn Ngày, Công Sở**
(0 top-level `let`/`const`, 0 `setInterval`/`setTimeout` TRONG SCRIPT
RIÊNG của trang, cùng `?v=37` của `tuvi-paywall.js`).

**Phát hiện mới — quy trình cũ bỏ sót timer khởi bằng THƯ VIỆN DÙNG
CHUNG:** `grep setInterval` trên script RIÊNG của trang không bắt được
timer mà trang khởi qua một hàm thư viện — cụ thể `public/tools-shared/
ai-loading-steps.js` (`AiLoadingSteps.mount()`/`mountWait()`) tự chạy
`setInterval` đếm giây + `setTimeout` chuyển bước bên trong module, trang
gọi nó chỉ truyền `containerId`. Kiểm tra ban đầu định đưa **Nhân Mạch**
vào đợt này (0 `setInterval` trong chính script của nó) — soát kỹ hơn lộ
ra nó gọi `AiLoadingSteps.mount('loadingSteps', …)`, và hàm `tickElapsed`
bên trong tra lại phần tử bằng CHUỖI ID (`document.getElementById(el.id +
'-elapsed')`), không giữ tham chiếu — nếu soft-nav sang một trang KHÁC
cũng dùng cùng quy ước ID `loadingSteps` (rất nhiều trang trong nhóm này
dùng chung thư viện) trong lúc interval còn sống, nó ghi "Đã chờ N giây"
nhầm vào khung loading của TOOL MỚI. Module `ai-loading-steps.js` hiện
CHƯA có lưới an toàn `tvmb:softnav` (khác `tuvi-paywall.js`/Kinh Dịch đã
vá) — cần vá RIÊNG module đó (theo dõi mọi controller đang `start()`, gọi
`stop()` hàng loạt khi soft-nav) trước khi mở `SOFT_PAGES` cho bất kỳ
trang nào gọi `AiLoadingSteps.mount`/`mountWait`. Đã loại Nhân Mạch khỏi
đợt này vì lý do đó — không phải audit sai, mà audit ĐÚNG hơn quy trình cũ.

**Đã vá:** thêm `<script src="/tools-shared/shell-soft-nav.js?v=1">` ngay
sau `shell.js` trên cả 4 trang; thêm 4 route vào `SOFT_PAGES`. Không cần
sửa mã nào khác — cả 4 đã sạch sẵn.

**Verify:** Playwright cục bộ (server Node giả rewrite, mở rộng route
map) — 70 lượt bấm ngẫu nhiên xen kẽ 10 trang (Đợt 1-4 + 4 trang mới): 0
hard-reload, 0 `pageerror`. 4 trang mới bấm sang Nạp Lượng/Hồ Sơ: vẫn full
reload đúng như cũ. `node --check` bản NHÂN ĐÔI: sạch cả 4. `npm run lint`
(0 lỗi) · `npx prettier@3.9.6 --check` sạch · toàn bộ `npm run check:*`
(50 bộ) qua hết.

**CHƯA làm (lúc viết mục này):** 31 trang còn lại của nhóm `tuvi-paywall.js`
— phần lớn gọi `AiLoadingSteps.mount`/`mountWait` và cần đợi module đó có
lưới an toàn `tvmb:softnav` trước. Việc kế tiếp: vá `ai-loading-steps.js`
— xem mục Đợt 6 bên dưới (đã làm xong).

## Đợt 6: vá `ai-loading-steps.js` — lưới an toàn `tvmb:softnav` cho registry controller (2026-09-24)

Module dùng chung `public/tools-shared/ai-loading-steps.js`
(`AiLoadingSteps.mount()`/`mountWait()`) tự chạy `setInterval`/`setTimeout`
BÊN TRONG chính nó — trang gọi chỉ truyền `containerId`, nên `grep
setInterval` trên script riêng của trang (quy trình Đợt 1-5) không bắt
được rủi ro này (phát hiện khi audit Nhân Mạch cho Đợt 5).

**Cơ chế lỗi đã ĐO ĐƯỢC (không phải suy đoán):** `tickElapsed()`/`paint()`
tra lại phần tử bằng CHUỖI ID (`document.getElementById(el.id +
'-elapsed')`) mỗi tick, không giữ tham chiếu cố định. Rất nhiều trang
dùng CHUNG quy ước container `id="loadingSteps"` — nếu soft-nav sang một
trang KHÁC cũng dùng ID đó trong lúc interval của trang CŨ còn sống,
`getElementById` (theo THỨ TỰ TÀI LIỆU, không theo script nào gọi) trả về
phần tử SỐNG của trang MỚI — interval cũ ghi đè lên tiến trình của tool
MỚI đang chạy.

**Đã vá:** thêm `var _active = []` cấp module + MỘT
`document.addEventListener('tvmb:softnav', …)` ở top-level gọi `stop()`
(tái dùng, không viết đường huỷ thứ hai) trên MỌI controller đang `start()`
rồi xoá registry — đúng khuôn mẫu đã dùng cho `tuvi-paywall.js`. `mount()`
đăng ký `controller` vào `_active` trong `start()`, gỡ trong `finish()` VÀ
`stop()` (cả hai nhánh thoát). `mountWait()` đăng ký trong `start()`, gỡ
trong `stop()`.

**Verify — red-team định lượng (không chỉ nhìn có/không lỗi):** dựng
harness Playwright (trang tĩnh nạp CHÍNH `ai-loading-steps.js`) mô phỏng
ĐÚNG cơ chế nghĩa địa của `shell-soft-nav.js`: bury container CŨ (đã
`start()` sẵn, interval đang chạy) vào một `<div data-softnav-grave>` nối
SAU trong document order, chèn container MỚI cùng `id="loadingSteps"`
TRƯỚC nghĩa địa, rồi để trang B tự `mount().start()` như thật. Đếm số lần
`MutationObserver` bắt được ghi vào `#loadingSteps-elapsed` (phần tử SỐNG
của trang B) trong 4.5s:
- KHÔNG bắn `tvmb:softnav` (red-team, tái hiện lỗi CŨ): **6 lần ghi** — gần
  gấp đôi một nguồn đơn (interval A còn sống VÀ ghi chồng lên B).
- CÓ bắn `tvmb:softnav` (bản vá): **2 lần ghi** — khớp đúng một nguồn duy
  nhất (chỉ B).

Regression: `finish()`/`stop()` ở nhánh thành công gỡ registry đúng —
bắn `tvmb:softnav` SAU khi đã `finish()` không còn gì để dừng, không ném
lỗi. Bắn `tvmb:softnav` liên tiếp hai lần khi registry rỗng cũng không
lỗi. `node --check` sạch · `npm run lint` (0 lỗi) · `npx prettier@3.9.6
--check` sạch · toàn bộ `npm run check:*` (50 bộ) qua hết.

**CHƯA làm:** chưa thêm trang nào trong nhóm `tuvi-paywall.js` gọi
`AiLoadingSteps` vào `SOFT_PAGES` — module giờ AN TOÀN HƠN để làm vậy,
nhưng mỗi trang vẫn cần audit riêng (double-run + stress test) theo đúng
quy trình, việc của một đợt sau.

## Đợt 7: 4 trang đầu tiên gọi `AiLoadingSteps` vào `SOFT_PAGES` (2026-09-24)

Đợt 6 vá `ai-loading-steps.js` — đợt này là lượt MỞ KHOÁ đầu tiên: chọn
4 trang trong nhóm `tuvi-paywall.js` còn lại, theo đúng quy trình cũ
(double-run + không `setInterval` RIÊNG ngoài `AiLoadingSteps` + stress
test), cố ý trộn cả trang CÓ và KHÔNG gọi thư viện đó để phủ cả hai
nhánh: **Nhân Mạch, Hướng Nghiệp Trẻ** (gọi `AiLoadingSteps.mount`) ·
**Giờ Sinh, Bút Tướng** (không gọi, script riêng sạch sẵn).

**Đã vá:** Nhân Mạch và Hướng Nghiệp Trẻ đã sạch top-level `let`/`const`
từ trước — chỉ thêm script tag + route. Giờ Sinh (`TOOL_ID`,
`_birth/_answers/_pub/_lastResult/_slug`, `GS_RESUME_KEY`/
`GS_RESUME_TTL_MS`, `_lastPreview`) và Bút Tướng (`_strokeSets`,
`_curStrokes`, `_curStroke`, `_drawing`, `_t0`, `_metrics`, `_birth`,
`_signedWord`, `_currentSlug`, `canvas`, `ctx`, `_uploadedImg`,
`_previewObjUrl`, `HOOK_TAG_CLASS`) đổi `let`/`const` top-level → `var`,
đúng khuôn mẫu Đợt 4.

🪤 **Bẫy mới — checker payment-safety đọc CÚ PHÁP KEYWORD, không chỉ giá
trị:** `npm run check:slug` (canh luật "slug thanh toán PHẢI bắt đầu
bằng đúng tool_id", đã cắn thật vụ Duyên Nợ trừ tiền hai lần) đỏ ngay
sau khi đổi Giờ Sinh — bộ dò regex CỨNG `const\s+TOOL_ID\s*=\s*['"]...`
để đọc giá trị `TOOL_ID`, và `var` không khớp cú pháp đó dù giá trị y
hệt. Đây KHÔNG phải lý do bỏ đổi `var` hay bỏ trang khỏi đợt — sửa
ĐÚNG chỗ: nới regex của `scripts/check-slug.mjs` chấp nhận CẢ
`const`/`var` (an toàn được kiểm — resolved value phải bắt đầu bằng
tool_id — giữ nguyên hệt, chỉ nới cú pháp nhận diện). Đổi kiểu này khác
với "làm nhẹ bộ dò": không bộ nào ĐANG bắt được lỗi thật bị tắt hay thu
hẹp, chỉ dạy nó nhận thêm MỘT cách khai báo hợp lệ mới mà chính đợt này
tạo ra. Nhắc cho đợt sau: bất kỳ trang nào khác trong `CHECKS` của
`check-slug.mjs` (`day-con`, `nguoi-khac`, `chan-dung-tien-kiep`,
`chan-dung-vo-chong`) đổi `TOOL_ID` sang `var` để vào `SOFT_PAGES` đều
đã được bộ dò nhận, không cần sửa gì thêm.

**Verify:** Playwright cục bộ — 80 lượt bấm ngẫu nhiên xen kẽ 12 trang
(Đợt 1-5 + 4 trang mới): 0 hard-reload, 0 `pageerror`. 4 trang mới bấm
sang Nạp Lượng/Hồ Sơ: vẫn full reload đúng như cũ. Riêng thêm: bắt đầu
một `AiLoadingSteps.mount().start()` giả trên Nhân Mạch/Hướng Nghiệp
Trẻ rồi soft-nav đi giữa chừng — không hard-reload, không lỗi (đúng
nhờ lưới an toàn Đợt 6). `node --check` bản NHÂN ĐÔI: sạch cả 4. `npm
run lint` (0 lỗi) · `npx prettier@3.9.6 --check` sạch · toàn bộ `npm
run check:*` (50 bộ, sau khi vá `check:slug`) qua hết.

**CHƯA làm:** 27 trang còn lại của nhóm `tuvi-paywall.js` — việc của
một đợt sau, cùng quy trình.

## Đợt 8: 4 trang mới + phát hiện bug THẬT đã sống từ Đợt 5 (2026-09-24)

Chọn 4 trang tiếp theo theo đúng quy trình: **Khí Sắc, Trang Điểm**
(vá `let`/`const` top-level → `var`, không gọi `AiLoadingSteps`) ·
**Vận Hạn Năm, Xem Tuổi** (script riêng sạch sẵn, CÓ gọi
`AiLoadingSteps`). `app-xem-tuoi.html` phục vụ BA route
(`/app/xem-tuoi`, `/app/xem-lam-an`, `/app/tuong-hop`, cùng file, tự
chọn nhánh bằng `location.pathname` đọc ở top-level) — cả ba đều phải
vào `SOFT_PAGES` cùng lúc.

**Bug THẬT phát hiện trong lúc audit — đã sống từ Đợt 5, không phải lỗi
mới:** stress test mở rộng lộ `SyntaxError: Identifier '_CAN' has
already been declared` khi soft-nav QUA LẠI giữa các trang KHÔNG cùng
đợt. Truy ra: `public/tuvi-ansao-engine.js` (engine an sao — "nguồn số
DUY NHẤT", theo CLAUDE.md — KHÔNG được sửa nội dung) khai `const
_CAN`/`_CHI` Ở TOP-LEVEL, KHÔNG bọc IIFE. Công Sở (Đợt 5) và Hướng
Nghiệp Trẻ (Đợt 7) nạp `tuvi-ansao-engine.js?v=1`, trong khi Hoàng Đạo
(Đợt 2), Mai Hoa/Ngày Tốt (Đợt 4) nạp KHÔNG hậu tố `?v=`. Hai URL khác
nhau ⇒ `loadedSrc` (cơ chế dedup của `shell-soft-nav.js`) coi là HAI
script riêng biệt ⇒ soft-nav từ Hoàng Đạo sang Công Sở (hoặc ngược lại)
NẠP LẠI file, `const _CAN` khai lần hai ⇒ `SyntaxError` giữa chừng.

**Vì sao lọt qua audit của cả Đợt 5 lẫn Đợt 7:** quy trình cũ chỉ so
`?v=` của SCRIPT ĐANG THÊM với CÁC TRANG CÙNG ĐỢT (đúng bài học đã ghi
ở audit `tuvi-paywall.js`: "mọi trang cùng một đợt PHẢI cùng `?v=`"),
không so với TOÀN BỘ `SOFT_PAGES` đã có sẵn từ các đợt TRƯỚC — Công Sở
(Đợt 5) không soft-nav thử với Hoàng Đạo (Đợt 2) vì hai đợt cách nhau,
và bộ `PAGES` trong mỗi lần stress test trước đó không đủ rộng để tình
cờ chạm đúng cặp lệch version. Đợt 8 mở rộng danh sách trang trong
stress test (đưa Kim Lâu/Kỳ Môn/Kinh Dịch/Bát Trạch VÀO CHUNG một lượt
với Công Sở/Nhân Mạch/Bút Tướng) mới tình cờ chạm phải.

**Đã vá:** đổi `<script src="/tuvi-ansao-engine.js?v=1">` → không hậu
tố ở `app-cong-so.html`, `app-huong-nghiep-tre.html`, VÀ
`app-day-con.html` (chưa vào `SOFT_PAGES` nhưng cùng lỗi tiềm ẩn, vá
luôn cho gọn — tránh đợt sau giẫm lại) — khớp với đa số (11/14 trang
đang dùng file này không có hậu tố). KHÔNG đụng vào nội dung
`tuvi-ansao-engine.js` — đúng luật "không sửa mò công thức cổ pháp".

**Quét chéo các script dùng chung khác:** cùng phương pháp phát hiện
thêm 3 mismatch nữa (`poster.js` `?v=5` vs `?v=4` ở Công Sở,
`tools-shared/bat-trach.js` `?v=2` vs `?v=1`, `tools-shared/kinh-dich.js`
`?v=1` vs `?v=5`, `tools-shared/illus-match.js` `?v=1` vs `?v=2`) —
kiểm cả 4 đều bọc IIFE (`(function(){...})()`/`(function(root){...})(...)`)
nên double-load vô hại, KHÔNG cần vá. Chỉ file KHÔNG bọc IIFE mới cần
đồng bộ `?v=`.

**Verify:** Playwright cục bộ — 90 lượt bấm ngẫu nhiên xen kẽ 16 trang
(mở rộng có chủ đích để phủ tổ hợp cũ×mới, không chỉ 4 trang mới): sau
khi vá, 0 `pageerror`. Soft-nav qua lại 3 route CÙNG FILE
(`tuong-hop` ↔ `xem-lam-an` ↔ `xem-tuoi`): `MODE_KEY` (đọc
`location.pathname` ở top-level) cập nhật đúng mỗi lần. 4 trang mới bấm
sang Nạp Lượng/Hồ Sơ: vẫn full reload đúng như cũ. `node --check` bản
NHÂN ĐÔI: sạch cả 4. `npm run lint` (0 lỗi) · `npx prettier@3.9.6
--check` sạch · toàn bộ `npm run check:*` (50 bộ) qua hết.

🪤 **Bẫy tự vấp rồi tự sửa trong đợt này (thứ hai) — helper test tái
dùng CÙNG một `id` cho link giả mà không xoá link cũ:** `clickTo()` tạo
`<a id="__test_link__">` gắn thẳng vào `document.body` (KHÔNG bị nghĩa
địa chôn, vì nghĩa địa chỉ chôn con của `#ws`) — click lần hai tạo thêm
một `<a>` CÙNG id mà không xoá cái cũ, `getElementById` trả về phần tử
ĐẦU TIÊN trong document order (bản CŨ, href cũ) chứ không phải bản vừa
thêm. Bài kiểm tưởng đã bấm sang trang mới nhưng thực ra bấm lại đúng
link cũ — dương tính giả kiểu "không điều hướng được". Sửa: xoá link
test cũ (nếu có) trước khi tạo link mới. Không phải lỗi sản phẩm — lỗi
trong chính bài kiểm.

🪤 **CDN bên ngoài trong sandbox — `net::ERR_CERT_AUTHORITY_INVALID`
đọc thành soft-nav lỗi nếu không truy tận gốc:** trang Vận Hạn Năm nạp
Chart.js từ `cdn.jsdelivr.net` — sandbox chặn TLS (cùng họ lỗi đã gặp
với Supabase, xem `CLAUDE.md`), request đó fail trong Playwright dù
`curl` cùng URL trả `200` (proxy dùng CA khác nhau cho hai công cụ).
Load thất bại ⇒ `catch` của `go()` hợp lệ fallback `location.href` —
ĐÚNG THIẾT KẾ "NGUYÊN TẮC AN TOÀN", không phải bug. Xác nhận bằng cách
gắn tạm `console.error` vào nhánh `catch`/`inflight` của
`shell-soft-nav.js` (gỡ ngay sau khi xác nhận, không commit bản có log)
để đọc ĐÚNG lý do trước khi kết luận — tưởng là hard-reload ngẫu nhiên
nhưng có nguyên nhân xác định được.

**Cố ý CHƯA làm:** 23 trang còn lại của nhóm `tuvi-paywall.js` — việc
của một đợt sau. Khuyến nghị mạnh: đợt sau BẮT BUỘC làm bước 5 mới
(kiểm `?v=` với TOÀN BỘ `SOFT_PAGES`, không chỉ trang cùng đợt) trước
khi thêm bất kỳ trang nào.

## Đợt 9: hết nhóm `tuvi-paywall.js` (23 trang) + bug cấu trúc thật ở tầng điều phối (2026-09-24)

Henry: "Làm nốt luôn đi" — gộp cả 23 trang còn lại của nhóm
`tuvi-paywall.js` vào MỘT đợt (khác các đợt trước, mỗi lần 4 trang):
Bàn Làm Việc, Bát Tự, Bói Bài Tây, Chân Dung Tiền Kiếp, Chân Dung Vợ
Chồng, Chu Trình Cuộc Đời, Cửa Hàng Phong Thuỷ, Da Liễu AI, Dạy Con,
Diện Tướng, Duyên Nợ Tiền Kiếp, Kiểu Tóc, Lá Số/Luận Giải (chung file
`app-luan-giai.html`, hai route), Màu Sắc Hợp Mệnh, Người Khác, Nhân
Tướng, Oracle, Personal Color, Phong Thuỷ, Tarot, Thần Tướng, Thủ
Tướng, Trang Phục Theo Ngày. Cố ý LOẠI `thanh-tuong-pro.html` — xem
mục riêng bên dưới.

**Vá theo nhóm rủi ro, không phải một khuôn cho tất cả:**
- 16 trang có `let`/`const` top-level → đổi `var` (khuôn Đợt 4/7).
- `trang-phuc-theo-ngay.html`: đổi `var _CAN`/`_CHI` xong VẪN vỡ ở
  stress test diện rộng — va với chính `const _CAN`/`_CHI` top-level
  của `tuvi-ansao-engine.js` (nhiều trang khác trong `SOFT_PAGES` đã
  nạp file đó). Khác họ lỗi Đợt 8 (đó là lệch `?v=` của CÙNG một
  script) — đây là HAI SCRIPT KHÁC NHAU tình cờ trùng tên biến
  top-level, và `var`/`const` không cho phép trộn tên trong cùng một
  scope dù ai khai trước. Vá: đổi tên biến riêng của trang
  (`_CAN`/`_CHI` → `_TPTN_CAN`/`_TPTN_CHI`), không đụng gì khác.
  **Bài học cho đợt sau:** đổi `let`/`const`→`var` không chỉ cần double-run
  sạch CHÍNH trang đó — còn phải soát tên biến top-level không trùng
  với bất kỳ script DÙNG CHUNG nào khác đang có mặt trong `SOFT_PAGES`.
- Diện Tướng, Nhân Tướng, Thủ Tướng, Thần Tướng: dùng camera
  (`getUserMedia`) — soft-nav không destroy `document` nên đèn camera
  không tự tắt khi rời trang nếu không vá. `stopCamera()`/`resetTool()`
  có sẵn của từng trang KHÔNG dùng được trực tiếp (đụng thẳng nhiều id
  UI riêng không kiểm null, ném lỗi nếu trang đích không cùng cấu
  trúc) — vá bằng listener `tvmb:softnav` TỐI GIẢN, CHỈ dừng
  `MediaStream`/`AudioContext`/timer, không đụng DOM.
- Duyên Nợ Tiền Kiếp: preview trực tiếp (debounce input, không phải
  form submit) ghi kết quả `fetch` trễ vào `#hookHost` — id DÙNG CHUNG
  hàng chục trang khác. Cùng họ lỗi `ai-loading-steps.js` (Đợt 6) nhưng
  ở mã BESPOKE của một trang, không phải thư viện dùng chung — vá bằng
  cờ `_hookLeftPage` set ở `tvmb:softnav`, continuation của `fetch`
  kiểm cờ trước khi ghi DOM.
- `thanh-tuong-pro.html`: soát `getTracks()`/`.stop()` toàn file — **0
  kết quả**. Mic không được dừng ở BẤT KỲ nhánh nào, kể cả lúc xong
  việc bình thường — bug ĐỘC LẬP với soft-nav, không phải thứ một vá
  `tvmb:softnav` sửa trọn vẹn. Loại khỏi đợt này, để việc riêng.

**Bug cấu trúc thật — race ở CHÍNH tầng điều phối `shell-soft-nav.js`,
không phải ở trang nào:** stress test 200 lượt/47 trang bắt được
`TypeError: Cannot read properties of null (reading 'style')` (và
`'appendChild'`) ở NHIỀU trang khác nhau, kể cả trang đã shipped từ
Đợt 1-8 — tức không phải lỗi RIÊNG của 23 trang mới, mà lỗi CÓ SẴN
trong cơ chế dùng chung, chỉ cần đủ trang + đủ tần suất bấm mới lộ.

*Cơ chế đã đo được:* `go()` khi thấy `inflight` (soft-nav trước còn
đang fetch) thì rớt về `fullReload()` (`location.href=…`) — ĐÚNG THIẾT
KẾ. Nhưng gán `location.href` KHÔNG lập tức huỷ JS đang chạy của tài
liệu hiện tại; có một khoảng ngắn tài liệu CŨ vẫn "sống" trong khi
trình duyệt đang tháo dỡ nó để nạp trang mới. Nếu một cú bấm KHÁC (tới
một trang thứ ba) diễn ra sát đúng lúc đó, promise chain của `go()` cho
cú bấm đó có thể chạy hết `fetch` + `runPageScripts` NGAY TRÊN tài liệu
đang bị tháo dỡ — `runInlineScript()` của trang thứ ba thực thi
`initXxx()` gọi `Shell.setContext()` đúng khoảnh khắc `#shell-rail`
(chứa `railCtx`/`chat`/`railInput`… — dựng ĐÚNG MỘT LẦN ở `boot()`,
không bao giờ dựng lại) đã bị trình duyệt gỡ khỏi DOM cùng phần còn lại
của tài liệu cũ → `getElementById` ra `null` giữa chừng. Vì `#chat`
cũng nằm trong `#shell-rail`, bất kỳ trang nào tự vẽ trực tiếp vào
`#chat` (như `chatStepMoiLo()` ở Dạy Con) mắc đúng họ lỗi này.

**Đã vá — hai lớp, không phải một:**
1. `shell-soft-nav.js`: thêm cờ `navigating`, bật NGAY trong
   `fullReload()` trước khi gán `location.href`; MỌI bước còn lại của
   MỌI chain `go()` đang treo (đầu vào, sau khi `fetch` resolve, trước
   mỗi script trong `runPageScripts`, trước bước cuối) tự kiểm cờ này
   trước khi đụng DOM. Giảm tần suất đáng kể nhưng KHÔNG triệt để (thí
   nghiệm đo lại vẫn thấy lỗi lọt qua — cửa sổ đủ hẹp để né được vài
   điểm kiểm nhưng không phải TẤT CẢ, giữa lúc `runInlineScript()`
   đang thực thi và lúc trình duyệt thật sự tháo DOM là JS đơn luồng
   nên không chèn được kiểm tra ở giữa).
2. **Vá thật (chặn đứng) — null-guard ngay tại `Shell.setContext()`**
   (chokepoint DUY NHẤT mọi trang gọi để gắn rail): nếu `railCtx`/
   `railCtxTxt` không có (nghĩa là `#shell-rail` đã mất, bất kể vì lý
   do gì) thì `return` ngay, không vẽ tiếp — cùng khuôn mẫu ĐÃ CÓ SẴN
   trong chính file này cho `initProfile()`/`authLoading` (Hồ Sơ). Đây
   mới là lưới chặn TẬN GỐC — lớp 1 chỉ giảm khả năng chạm phải, lớp 2
   làm cho CHẠM PHẢI cũng an toàn. `chatStepMoiLo()` (Dạy Con) vá
   riêng bằng null-guard `chat` cùng lý do.

**Vì sao chỉ vá `setContext()` mà không audit hết mọi hàm ghi vào
`#shell-rail`:** đúng nguyên tắc "vá TẬN GỐC một lần" đã dùng cho
nghĩa địa (Đợt 1) và `ai-loading-steps.js` (Đợt 6) — `setContext()` là
chokepoint mọi trang gọi để bắt đầu phiên rail, chặn ở đó phủ được
TUYỆT ĐẠI ĐA SỐ đường vào. `chatStepMoiLo()` là ngoại lệ ĐÃ BẮT ĐƯỢC
bằng stress test nên vá theo, không phải audit đầy đủ mọi hàm DÙNG
`#chat` trực tiếp trên 50+ trang — nợ tương tự nợ đã ghi ở Hồ Sơ.

**Verify:** Playwright cục bộ, server giả có thêm ĐỘ TRỄ NGẪU NHIÊN
30-220ms cho fetch trang (mô phỏng mạng thật, mở rộng cửa sổ đua —
không có độ trễ này thì race gần như không lộ trên local) — 200 lượt
bấm ngẫu nhiên/47 trang, lặp lại 8+ lần liên tiếp SAU khi vá lớp 2:
0 `pageerror` mọi lần, kể cả lượt có 20-40 hard-reload thật. TRƯỚC khi
vá lớp 2 (chỉ có lớp 1): vẫn thấy lỗi lọt ở khoảng nửa số lượt chạy —
xác nhận lớp 2 mới là lưới chặn thật. `node --check` bản NHÂN ĐÔI: sạch
cả 24 file (23 mới + Dạy Con). `npm run lint` (0 lỗi, chỉ cảnh báo cũ
không liên quan) · `npx prettier@3.9.6 --check` sạch mọi file đã sửa ·
`npm run check:slug`/`check:shellboot`/`check:navph`/`check:groups`/
`check:webdriver` qua hết.

🪤 **Bẫy tự vấp trong đợt này — double-run sạch từng file KHÔNG chứng
minh hết va chạm biến top-level:** `node --check` nhân đôi MỘT file chỉ
bắt được redeclare TRONG chính file đó, không bắt được va chạm CHÉO
với script khác đang cùng có mặt trong phiên SPA (`_CAN`/`_CHI` ở
`trang-phuc-theo-ngay.html` vs `tuvi-ansao-engine.js`). Đợt sau đổi
`let`/`const`→`var` phải thêm bước: liệt kê toàn bộ tên biến top-level
CỦA MỌI script dùng chung ĐANG có trong `SOFT_PAGES`, đối chiếu tên
mới định đổi.

🪤 **Bẫy thứ hai — race ở tầng điều phối không lộ khi test riêng từng
trang, chỉ lộ khi test đủ RỘNG (nhiều trang) và đủ TRỄ (mạng chậm):**
tám lượt chạy đầu KHÔNG có độ trễ nhân tạo cho thấy 0 lỗi dù cùng bộ
trang/cùng số lượt bấm — thêm độ trễ 30-220ms cho fetch trang mới lộ
race ổn định. Kết luận "0 lỗi" từ một môi trường local NHANH HƠN mạng
thật là kết luận vội — bài học chung: race phụ thuộc TIMING cần test ở
tốc độ mạng THẬT hoặc mô phỏng trễ, không chỉ tốc độ localhost.

**Cố ý CHƯA làm:** `thanh-tuong-pro.html` — cần vá đúng vòng đời
`MediaStream` (dừng ở MỌI nhánh thoát, không riêng lúc soft-nav) trước
khi đủ điều kiện vào `SOFT_PAGES`, việc của một đợt sau. Toàn bộ 96
trang app-shell giờ chỉ còn `topup.html`, `Hồ Sơ`, và
`thanh-tuong-pro.html` ngoài `SOFT_PAGES`.
