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

## Phạm vi hiện tại — 20/96 trang trong `SOFT_PAGES`

| Trang | Soft-nav? | Vì sao |
|---|---|---|
| Trang chủ, Các Thầy, Trò chuyện (Đợt 1) | ✅ | Test qua, không còn lỗi biết được |
| Kim Lâu, Nạp Âm, Số Đẹp, Bản Đồ Sao, Hoàng Đạo (Đợt 2) | ✅ | Miễn phí, không `tuvi-paywall.js`, không `setInterval` riêng, script double-run sạch, stress test 60 lượt/8 trang không lỗi |
| Bát Trạch, Lục Nhâm, Ngày Tốt, Thần Số Học (Đợt 3) | ✅ | Cùng tiêu chí Đợt 2, script double-run sạch, stress test 90 lượt/12 trang không lỗi |
| Kỳ Môn, Mai Hoa, Ngũ Hành Tên, Kinh Dịch (Đợt 4) | ✅ | Vá đúng nguyên nhân gốc — xem mục Đợt 4 bên dưới, không phải IIFE |
| Đặt Tên, Đặt Tên Doanh Nghiệp, Chọn Ngày, Công Sở (Đợt 5) | ✅ | CÓ `tuvi-paywall.js` nhưng module đã được vá (đợt audit trước) + 4 trang này không tự gọi thư viện có timer nào — xem mục Đợt 5 bên dưới |
| Nạp Lượng (`topup.html`) | ❌ full reload | Có `setInterval` chờ thanh toán + lịch sử bug đua nhau (`nhat-ky/2026-08.md` "Purchase từng bắn trùng"). Soft-nav không huỷ `document` → interval cũ có thể sống sót qua lượt chuyển tab. Rủi ro cao hơn lợi ích tốc độ trên đúng đường tiền. |
| Hồ Sơ (`account-core.js`, 1637 dòng, hàng chục hàm async: History/Ví/Kết nối Telegram-WhatsApp-Messenger/MCP key/Nhiệm vụ/Giới thiệu) | ❌ full reload | Không đủ thời gian dò hết — môi trường này không có Supabase/auth thật để bấm qua từng tab của trang mà đo. Một lỗi đã bắt được (`initProfile`) đã vá, nhưng đó chỉ là MỘT trong hàng chục hàm khả nghi cùng họ. |
| **31 trang còn lại có `tuvi-paywall.js`** | ❌ full reload | Module chung đã an toàn (đợt audit trước), nhưng mỗi trang vẫn cần audit RIÊNG — xem "Phát hiện mới: `AiLoadingSteps.mount()`" ở mục Đợt 5, nhiều trang trong nhóm này gọi thư viện có `setInterval` chưa có lưới an toàn soft-nav. |

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

**CHƯA làm:** 31 trang còn lại của nhóm `tuvi-paywall.js` — phần lớn gọi
`AiLoadingSteps.mount`/`mountWait` (mọi tool có bước chờ AI/vẽ ảnh) và
CẦN đợi module đó có lưới an toàn `tvmb:softnav` trước. Việc kế tiếp hợp
lý: vá `ai-loading-steps.js` (thêm registry các controller đang chạy +
listener `tvmb:softnav` gọi `stop()` tất cả), rồi mới mở tiếp nhóm này.
