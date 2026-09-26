# Audit & sửa toàn site bằng 3 bộ skill thiết kế — brainstorm + workplan

> Soạn 2026-09-26. **Chưa sửa code site.** File này bổ sung cho
> `docs/CHAT-FIRST-NAP-GOI-PLAN.md` (mô hình tiền + phễu, Henry chốt cùng ngày).
> Việc nào đã nằm bên đó thì ở đây chỉ trỏ sang, không làm lại. Làm tới đâu
> đánh dấu tới đó.
>
> Skill đã vendor ở `.claude/skills/`: xem `.claude/skills/VENDORED.md`.

## 0. Đích: một câu, ba con số

**Người mới vào là nói chuyện được với thầy ngay, không phải học cách dùng
site. Mỗi câu trả lời mở ra câu hỏi tiếp theo. Mỗi khi thầy thấy một report
đáng đọc thì mời đúng report đó, bằng một nút ghi sẵn số Lượng.**

| Mục tiêu | Chỉ số | Đo bằng | Mốc hiện có |
|---|---|---|---|
| Đơn giản, mượt | Thời gian và số lần chạm từ lúc vào trang tới câu trả lời đầu tiên có lá số | Playwright theo kịch bản (J1, J2) + `preview_shown` / `chat_reply` | Form 4 bước, khoảng 7–8 ô nhập, trước khi thấy giá trị (`tuvi-form.js:562-708`) |
| Giữ người ở lại chat | Số câu/người/ngày · % phiên có từ 3 câu trở lên · D1/D7 quay lại | `chat_msg`, `chat_reply` (đã có), thêm event cho chip (xem W0) | Người trả phí 60 ngày: trung vị **6 câu**, hoạt động **~3 ngày** rồi bỏ |
| Bán chéo | % người dùng từ 2 report trở lên trong 30 ngày · CTR thẻ gợi ý report · Lượng tiêu/người | `rail_suggest_*` (phải tách tool với report, xem W0) | Chưa đo được, vì hai loại gợi ý đang dùng chung một `slug` |

Ràng buộc từ `CHAT-FIRST-NAP-GOI-PLAN.md`: chỉ bán gói Lượng, **không** bundle
report, **không** mua lẻ. Vì vậy "bán chéo" ở đây nghĩa là **thầy mời chạy
report tiếp theo ngay trong chat**, không phải thêm gói sản phẩm.

---

## 1. Brainstorm: những gì đã thấy (đo 2026-09-26)

Nguồn: ảnh chụp prod ở 390px (`scripts/out/ux/shots/peek-*.png`), hai lượt
đọc code, và lượt đếm CSS ở buổi trước.

### A. Một sản phẩm nhưng có nhiều khuôn mặt (gây rối, nên sửa trước)
1. **Cửa chat có ít nhất 5 tên:** "Luận Đường" (83 chỗ), "Hỏi thầy/Hỏi Thầy"
   (26), "Trò chuyện" (14), "Trợ lý" (14), "Thầy Thái Hư tiếp chuyện". Thêm
   `tuvi-chat.html` bản cũ vẫn được `nav.js` link tới. Người dùng không biết
   đây là một hay nhiều thứ.
2. **Hai khung giao diện:**
   - Landing (`index-sample-v3`, `cong-cu`): hamburger nằm GIỮA logo và nút
     Đăng nhập, tab bar sáng.
   - `/app`: hamburger bên trái, tab bar nâu đậm, và nhãn "Trò chuyện" bị
     **gạch chân xanh như link mặc định** (bug).
   - `topup.html` rời hẳn khỏi khung, mất tab bar.
3. **Số công cụ tự mâu thuẫn:** "59+", "58", "53", "50", "50+", "46", "34",
   "28" công cụ ở các trang khác nhau. Tiêu đề `/cong-cu` ghi "50" trong khi
   `<title>` trang chủ ghi "59+".
4. **Mỗi tool có hai URL:**
   - Landing link `/app-luan-giai.html` thay vì `/app/luan-giai`
     (`index-sample-v3.html:293,306-321`).
   - 48/54 `public/tools/*.html` vẫn sống, **không có rail chat**
     (`shell.js` chỉ gắn vào 1 trong 54 trang), và chỉ 6 trang có 301 sang
     `/app/*`. Traffic SEO vào đó là **ngõ cụt với chat**.
5. **Trang mồ côi vẫn đang deploy:** `index-old`, `chat-v2`,
   `index-sample-v2`, `la-so-v2`, `upload`, `compare`, `profile` (trùng
   `app-tai-khoan`), cùng các `public/<hub>.html` đã bị `/api/tu-vi-hub` che.
6. Logo "Tử Vi Minh B…" và slogan "THUẬN …" bị cắt chữ ở header landing
   trên 390px.

### B. Giữ người ở lại chat
1. **Rail trống khi chưa có lá số.** Rail hiện "Chưa có lá số nào…" và ô nhập
   bị khoá. Người vừa hỏi ở trang chủ bị chuyển sang form thay vì được trả
   lời. (P3 bên plan kia đã nêu hướng; ở đây cần thêm thiết kế tương tác:
   thầy hỏi ngày sinh NGAY TRONG hội thoại.)
2. Chip gợi ý sau mỗi câu trả lời **đã có** (`SUGGEST:` → `renderSuggs`)
   nhưng **không được đo**: bấm chip gọi `ask()` mà không có event nào
   (`shell.js:4196`).
3. Không có lý do quay lại. Không có "vận hôm nay" chủ động trong rail, và
   push notification tách rời khỏi chat.
4. "Online · câu hỏi hôm nay" ở sidebar là **số giả** (`simulatePulse`,
   `shell.js:469-485`, `Math.random`). `public/conversion.js` (toast "ai đó
   vừa…" với tên và hành động bốc ngẫu nhiên) **đang chạy**: `nav.js:549`
   chèn nó vào mọi trang dùng `nav.js`. ⚠️ Rủi ro niềm tin **và** pháp lý
   (thông tin gây nhầm lẫn cho người tiêu dùng). **Henry quyết.**

### C. Bán chéo
1. `goi_y_san_pham` chỉ biết **2 report** (`laso`, `chu-trinh-cuoc-doi`,
   `lib/tools/suggest-tool.ts:133-170`), và chỉ được nối trên đường lá số.
   Khoảng **24 kịch bản rail** (Bát Tự, xem tuổi, Kỳ Môn…) không mời được
   report nào.
2. Upsell phía client (`maybeShowUpsell`, `shell.js:2648`) **luôn đẩy Luận
   Giải**, dù người dùng đang hỏi tình duyên, con cái hay công việc.
3. Các trang `/app/*` (trang có rail) có **0** khối "bước tiếp theo".
   `related-tools.js` chỉ gắn ở `/tools/*` cũ. Nhận report xong
   (`report-delivery.js`) là hết đường, không có gợi ý tiếp.
4. **Hội đồng 15 thầy chưa được dùng để bán:** thầy chỉ đổi avatar và giọng.
   Chưa có kiểu "câu này thuộc môn của thầy X, thầy X có bản luận Y".
5. Email bán chéo (`lib/marketing/email-cross-sell.ts`) đã xây xong nhưng
   **đang tắt** (`enabledBudgetPerRun=0`).

### D. Độ mượt: chuyển động và cảm giác chạm (Emil)
- 45/49 trang có `@keyframes` nhưng không tôn trọng `prefers-reduced-motion`.
- 148 chỗ `transition: all`, khoảng 320 transition không ghi easing, cả site
  chỉ có 12 `cubic-bezier`.
- 396 `:hover`, chỉ 1 chỗ bọc `@media (hover:hover)` ⇒ trên điện thoại hover
  bị "dính" sau khi chạm.
- Gần như không có phản hồi khi nhấn (`:active` chỉ ở tab bar).
- Font rơi về Arial ở 69 chỗ. 181 gradient và 233 box-shadow viết tay.
  `theme.css` chỉ có 15 token màu, không có token cho bóng, easing hay thời
  lượng.

---

## 2. Cách audit: "click từng nút" mà không đốt tiền

Có 98 + 54 trang HTML, khoảng 55 route `/app/*` và 45 route động. Chia hai
tầng:

**Tầng 1: máy quét tất định, rẻ, chạy hết mọi trang.**
Script `scripts/ux/crawl.mjs` (mới, dùng `scripts/ux/harness.mjs`) mở từng
URL ở 390px và 1440px. Với mỗi trang, nó:
- ghi lỗi console, JS và HTTP;
- liệt kê MỌI nút và link đang hiện, kèm chữ, đích và kích thước (tìm nút
  dưới 44px, link chết, link `.html` trần, link tới trang mồ côi);
- trích TOÀN BỘ chữ hiển thị ra `scripts/out/ux/copy/<trang>.txt` để soát
  wording;
- chụp màn đầu và cả trang;
- đếm CLS/LCP thô.

Kết quả là một bảng CSV (mỗi trang một dòng) làm input cho tầng 2. Không
bấm nút trả tiền.

**Tầng 2: agent đi theo HÀNH TRÌNH, không đi theo trang.**
Mỗi hành trình giao `ux-tester` click thật trên prod, rồi áp skill lên ảnh
chụp và mã nguồn:

| # | Hành trình | Skill áp |
|---|---|---|
| J1 | Trang chủ → gõ câu hỏi đầu (khách) → câu trả lời đầu tiên | impeccable `critique` + `clarify` · taste `redesign-skill` (màn đầu) |
| J2 | Lập lá số → bản free → hỏi rail 3 câu → tường hết lượt → modal đăng ký (DỪNG) | impeccable `audit` + `onboard` · Emil `review-animations` |
| J3 | Top 10 tool theo doanh thu/traffic, vào từ `/cong-cu` | impeccable `distill` (chọn tool) · `clarify` |
| J4 | Vào từ SEO (`/van-dap`, `/la-so/[slug]`, `/tools/*.html`) → có tới được chat không | impeccable `critique` · kiểm link |
| J5 | Đã đăng ký, thiếu Lượng → tờ nạp (DỪNG trước QR) | impeccable `harden` (trạng thái lỗi/rỗng) |
| J6 | Người quay lại: lá số đã lưu, lịch sử chat, hồ sơ | impeccable `critique` |
| J7 | Có report xong → bước tiếp theo (bán chéo) | impeccable `critique` + khung bán chéo mục 3 |
| J8 | Toàn khung (`shell.css`, `theme.css`, tab bar, header, rail) | Emil `improve-animations` + `mobile-native` · impeccable `polish` / `typeset` |

**Soát chữ** (mọi file `copy/*.txt`) theo `docs/BRAND-VOICE.md` và luật
`CLAUDE.md` (không emoji màu, không khoe "AI", giá). Ra một **bảng thuật
ngữ** duy nhất (Thầy · Lá số · Lượng · tên cửa chat · tên từng report) để mọi
PR sau dùng chung.

**Ghi kết quả** ở `docs/ux-audit/<J#>.md`. Mỗi phát hiện ghi mức P0–P3, ảnh,
`file:dòng` và cách sửa tối thiểu. Tách phần **đã xác nhận** với phần **nghi
ngờ**.

> Tầng 2 có thể chạy dạng workflow nhiều agent song song (8 hành trình ≈
> 8–10 agent). Chỉ chạy khi Henry gõ rõ "chạy workflow". Không thì chạy tuần
> tự từng hành trình trong phiên thường.

---

## 3. Khung bán chéo: "thầy mời đúng report tiếp theo"

Không thêm sản phẩm. Nối những thứ đã có thành một đường:

```
câu hỏi → luan-chu-de.ts nhận CHỦ ĐỀ (11 chủ đề, đã có)
        → bảng CHU_DE → REPORT (mới, một nguồn, đọc từ tool_pricing)
        → thầy phụ trách môn đó (masterForTool, đã có)
        → nút trong chat: "Thầy X luận kỹ chuyện này · N Lượng"
```

- **Một bảng ánh xạ chủ đề → report**, dựng từ `tool_pricing` (enabled +
  `app_path`). Không chép tay tên hay giá (luật giá). Ví dụ: tình duyên →
  xem tuổi vợ chồng / chân dung vợ chồng; con cái → dạy con / hướng nghiệp
  trẻ; công việc → công sở & hướng nghiệp; năm tới → vận hạn 12 tháng.
- `goi_y_san_pham` mở enum theo bảng đó, và được nối vào **mọi** kịch bản
  rail, không chỉ đường lá số.
- `maybeShowUpsell` đổi từ "luôn Luận Giải" sang lấy từ bảng.
- **Khối "Bước tiếp theo"** chung cho cuối mọi trang kết quả `/app/*` và cuối
  `report-delivery`: tối đa 2 thẻ (1 report liên quan + 1 câu hỏi mở cho
  chat). Thay hẳn `related-tools.js` khi gom `/tools/*` về `/app/*`.
- Giữ nguyên các chặn đang có: 1 thẻ/lượt ở server, 1 lần/phiên ở client,
  không tự chạy report tốn Lượng khi người dùng chưa bấm.

---

## 4. Workplan: sóng nhỏ, mỗi sóng một PR, đo xong mới sang sóng sau

Thứ tự tính theo **tác động / rủi ro**. Mọi PR đều phải qua `npm run check:*`,
lint và typecheck. Đổi `public/*.js` hay `*.css` thì bump `?v=` ở mọi nơi
nạp file đó.

### W0: Nền đo và bối cảnh (không đổi giao diện)
- [x] Click chip gợi ý: `cta_click` slug `rail_chip_ask`, `meta.src = static|suggest`, `meta.idx`.
- [x] `rail_suggest_*` mang `meta.kind = tool|report`. (`topic` + `master`: làm cùng W5.)
- [x] Viết `PRODUCT.md` + `DESIGN.md` cho impeccable, NHÁP từ
      `docs/BRAND-VOICE.md` + token hiện có. **Henry duyệt phần "sự thật sản
      phẩm"** (chân dung khách, điều không được hứa).
- [~] `scripts/ux/crawl.mjs` (tầng 1, quét tự động mọi trang) — **descope**:
      4 agent W1 phủ đủ 8 hành trình bằng live-click + code-review, không cần
      máy quét riêng để có mốc baseline. Làm lại nếu sau này cần đo lại diện
      rộng (vd sau W6).
- [x] Ghi vào `docs/QC.md` cách cho Chromium tin CA của proxy (certutil).
      Thiếu bước này harness báo `ERR_CERT_AUTHORITY_INVALID` với mọi host.

### W1: Audit (chỉ đọc, không sửa) — XONG 2026-09-26
- [x] Chạy J1–J8 (4 agent, mỗi agent 2 hành trình) → `docs/ux-audit/{J1-J2,J3-J4,J5,J6-J7,J8}.md`.
      Vài phát hiện P0 rõ ràng (đúng hard rule CLAUDE.md) đã sửa NGAY trong lúc
      audit thay vì chờ W2, xem mục 4.1 dưới.
- [x] Bảng thuật ngữ: không cần bảng riêng — "Hỏi Thầy" đã là tên DUY NHẤT sau
      W3 (mục 4 quyết định #1), 4 agent xác nhận không còn sót tên khác trong
      chữ hiển thị (chỉ còn ở comment nội bộ, không ảnh hưởng người dùng).

#### 4.1 Bảng ưu tiên P0–P3 (gộp từ 4 báo cáo, đã khử trùng lặp)

⚠️ **Một lớp phát hiện lặp lại ở CẢ 4 báo cáo không phải bug**: agent so `curl`
prod (chạy nhánh `main`) với repo trên nhánh PR này — dĩ nhiên lệch, vì **PR
#1085 chưa merge**. Tên "Trợ lý Luận Đường"/"Trò chuyện" agent thấy trên prod
sẽ tự hết ngay khi PR này lên `main` và deploy, không cần sửa gì thêm. Đã lược
khỏi bảng dưới, chỉ giữ các phát hiện THẬT về code/nội dung.

| # | Mức | Hành trình | Phát hiện | Trạng thái |
|---|---|---|---|---|
| 1 | P0 | J1/J2 | `hook-layer.js` nút mở khoá thiếu VNĐ (chỉ hiện Lượng) | **Đã sửa** (`public/tools-shared/hook-layer.js`, PR này) |
| 2 | P0 | J3/J4 | Bảng giá `/cong-cu` đảo ngược VNĐ/Lượng | **Đã sửa** (PR này) |
| 3 | P0 | J3/J4 | Số công cụ lệch 3 nơi (59+/53/50), thật là 50 | **Đã sửa** (PR này) |
| 4 | P1 | J1 | Tour onboarding ("BƯỚC 1/7") tự bật 2.4s sau khi vào `/app`, che câu trả lời đầu tiên trên mobile | Chưa sửa → **W2** |
| 5 | P1 | J5 | Reload giữa chừng form mất toàn bộ dữ liệu đã nhập, không cảnh báo/khôi phục | **Đã sửa** (PR này) — draft `sessionStorage`, nhảy thẳng tới bước dang dở |
| 6 | P1 | J3/J4 | `/tools/an-sao.html`, `/tools/tu-tru.html` (còn sống) không có rail chat — ngõ cụt SEO | **Đã sửa (PR này)** — không gộp về `/app/*` (2 tool này không có bản `/app/*` tương ứng), bọc thêm `shell.css`/`shell.js` + `#shell-rail` (SHELL_ACTIVE `'luan-giai'`/`'bat-tu'`), giữ nguyên form/kết quả cổ pháp |
| 7 | P1 | J3/J4 | `/la-so/[slug]` (~7.000 trang, loại SEO nhiều nhất) — HTML gốc không có CTA nào về chat | Chưa sửa → **W5** (khối "Bước tiếp theo") |
| 8 | ✓ Đã đọc, KHÔNG phải bug | J1/J2 | `tuvi-form.js` field trùng (ẩn + hiện) | Kiến trúc cố ý: `#birthPanel` (`TuviForm.render`) là form THẬT ẩn bằng `display:none` đúng chuẩn (`app-luan-giai.html:292`), `TuviForm.renderChat()` là hội thoại ghi vào form đó qua `setData()`. Trình duyệt tự loại `display:none` khỏi autofill/accessibility tree — không phải rò rỉ template. |
| 9 | P2 | J3/J4 | 2 kiểu form khác nhau giữa các tool cùng khung `/app/*` (wizard vs chat-first) | Ghi nhận, cần Henry xác nhận có chủ đích không trước khi đồng bộ |
| 10 | P2 | J8 | 5 `@keyframes` trong `shell.css` + 19/21 trang không tôn trọng `prefers-reduced-motion` | Chưa sửa → **W6** |
| 11 | P2 | J8 | `.shell{height:100vh}` nên là `100dvh` | Chưa sửa → **W6** |
| 12 | P1 | J8 | 0/3 CTA chính (`.send`/`.btn-go`/`.stm-btn`) có phản hồi khi nhấn | Chưa sửa → **W6** |
| 13 | P1 | J8 | 0/231 chỗ `:hover` được gate `@media(hover:hover)` | Chưa sửa → **W6** |
| 14 | Nhẹ | J6/J7 | `auth.js` menu avatar trỏ `/profile.html` đã xoá (có 308, chỉ dư 1 round-trip) | **Đã sửa** (PR này) |
| 15 | ✓ Đã đọc, KHÔNG phải bug | J1–J6 | `401 GET /api/auth/session` mỗi lượt tải trang khách | `public/auth.js` `initAuth()` gọi mù (không đọc được cookie HttpOnly từ JS — đó chính là lý do dùng HttpOnly, tránh ITP) mỗi khi KHÔNG có `localStorage`/cookie JS gợi ý có phiên. Guest mới thật sự không có phiên ⇒ 401 đúng REST. Không sửa được mà không bỏ lớp chống ITP; đây là chi phí kiến trúc, không phải lỗi. |
| 16 | Nghi ngờ | J1 | Trang chủ ghi "270.000+ lá số người thật" — không có trong `PRODUCT.md` Evidence on Hand | **Henry xác nhận nguồn số**, nếu không có thì bỏ |
| 17 | P3 | J1/J2/J3 | 2 lỗi 502 thoáng qua (font/ảnh), tab đăng ký wrap 2 dòng, banner PWA che footer mobile | Theo dõi, không chặn — **W2/W6** |

Điểm tốt xác nhận qua cả 4 báo cáo (không sửa nhầm): bản free luận giải là nội
dung thật theo lá số vừa nhập; tường hết lượt minh bạch số Lượng; modal đăng ký
mở đúng tab; chip gợi ý bám sát điểm số cung thật; `.tool-suggest` không hiện
giá; sidebar ẩn khối rỗng cho tới khi có dữ liệu; không emoji màu, không khoe
"AI" ở bất kỳ đâu đã kiểm.

### W2: Lỗi và niềm tin (P0)
- [x] Nhãn "Hỏi Thầy" bị gạch chân xanh ở tab bar `/app` — **đã re-verify sống**
      (static server cục bộ, Vercel preview yêu cầu đăng nhập nên không dùng
      được): `.tabbar .tab` có `text-decoration:none` nhưng `.tab-home` (nút
      tròn giữa) không được liệt vào — thiếu sót thật, không cố ý. **Đã sửa**
      (PR này, `shell.css`).
- [~] Logo/slogan header landing bị cắt ở 390px — **đã re-verify sống, vẫn
      còn, nhưng là đánh đổi CỐ Ý** (`nav.js` dòng ~309: `max-width:calc(100vw
      - 220px)` chừa đủ chỗ cho badge Lượng + avatar khi ĐÃ đăng nhập — rộng
      hơn cần thiết ở trạng thái khách, nhưng comment gốc giải thích rõ lý do
      "ước lượng RỘNG để không tái phạm khi nội dung auth đổi"). Không tự ý
      thu hẹp mà không đo lại rủi ro logo đè lên nút đăng nhập/badge — để lại
      cho W6 nếu muốn làm mức chừa chỗ tuỳ theo trạng thái đăng nhập.
- [x] `401 GET /api/auth/session` mỗi lượt tải trang khách — **đã đọc code,
      KHÔNG phải bug**: `auth.js` không đọc được cookie HttpOnly nên phải hỏi
      server để biết có phiên không; guest thật sự không có phiên thì 401 là
      đúng REST. Sửa sẽ phải bỏ lớp chống ITP (Safari xoá localStorage/cookie
      JS sau 7 ngày) — đánh đổi không đáng. Xem hàng #15 mục 4.1.
- [~] Số "online" giả + toast mua hàng giả: Henry quyết **để nguyên**.
- [x] Một con số "N công cụ", đọc từ catalog, không gõ tay — sửa `<title>`/
      meta tĩnh của `/cong-cu` và trang chủ khớp số thật (50), heading vốn đã
      tự cập nhật đúng bằng JS từ trước.
- [x] Tour onboarding ("BƯỚC 1/7", `app-home.html:2210`) che câu trả lời đầu
      tiên trên mobile — bỏ qua hẳn khi vào kèm `?q=` (người đã tự thao tác
      thành công, không cần dạy lại). Không `markSeen()` ở nhánh này (J1, P1).
- [x] Reload giữa chừng form mất toàn bộ dữ liệu đã nhập — lưu draft từng
      bước vào `sessionStorage` (`tuvi-form.js` `renderChat()`), nhảy thẳng
      tới bước dang dở khi mount lại, tự xoá khi hoàn tất. Đã verify sống
      qua static server cục bộ (J5, P1).
- [x] `tuvi-form.js` field trùng (ẩn + hiện) — **đã đọc code, KHÔNG phải
      bug**: kiến trúc cố ý (form thật ẩn `display:none` + chat ghi qua
      `setData()`). Xem hàng #8 mục 4.1.
- [ ] Trang chủ ghi "270.000+ lá số người thật" — không có trong `PRODUCT.md`
      Evidence on Hand. **Henry xác nhận nguồn số này có thật không**; nếu
      không kiểm chứng được thì bỏ hoặc đổi câu không cần số cụ thể (J1, P3).

### W3: Một sản phẩm, một khuôn mặt
- [x] Một tên cho cửa chat ở MỌI nơi: **"Hỏi Thầy"**. `tuvi-chat.html` xoá + 308.
- [x] Một khung header + tab bar cho landing lẫn `/app` (giữ
      `check:tabbar`). Hội tụ về style **`/app` (shell.js)** — nền hoạt động
      chính, nhiều traffic hơn: hamburger mobile của `nav.js` chuyển từ SAU
      logo/auth-area sang ĐẦU `.topnav` (khớp `.ws-top` của app-shell); tab bar
      dưới của `index-sample-v3.html` đổi nền trắng → nâu đậm
      `linear-gradient(#3D2818,#2B1B10)` + chữ/active theo `--sb-txt-dim`/
      `--gold`, khớp `.tabbar` của shell.css. Chỉ đổi màu/vị trí CSS, không
      đụng cấu trúc/hành vi — `check:tabbar` (chỉ khoá 5 nhãn, không khoá màu)
      vẫn xanh. `topup` nằm trong khung: `topup.html` vốn đã nạp `nav.js` full
      mode (có header) + đã tự vẽ tab bar nâu đậm riêng khi vào qua
      `/app/nap-luong?shellTab=1` (`.tvmb-shelltab`, làm từ đợt trước) — nay
      hamburger của header đó cũng đã về đúng vị trí bên trái theo cùng bản vá.
      `public/nav.js`, `public/index-sample-v3.html`.
- [x] (phần xoá/301) 301 các
      `/tools/*.html` còn trùng về `/app/*`. Gỡ hoặc 301 các trang mồ côi.
      ⚠️ Làm theo thứ tự: redirect trước, xoá file sau; kiểm sitemap và
      `seo_pages` không trỏ vào URL sắp chết.
- [x] 2 trang sót lại từ đợt 38 trang hôm nay: `/tools/an-sao.html`,
      `/tools/tu-tru.html` — xác nhận (J3/J4) vẫn trả 200 trực tiếp, không
      `SHELL_ACTIVE`, không rail chat. Không có bản `/app/*` tương ứng để gộp
      (2 công cụ miễn phí, không phải bản trùng) ⇒ tối thiểu: nạp
      `shell.css`/`shell.js` + `#shell-rail`, giữ nguyên form/kết quả cổ pháp.

### W4: Chat-first mượt (chi tiết tương tác cho P3 bên plan kia)
- [ ] Rail không bao giờ trống: **CHỈ đúng ở `/app` (app-home.html)** — trang
      này đã luôn mồi rail bằng kịch bản `hoang-dao` (chưa có lá số) hoặc lá
      số đã nhớ (`wire()`), không bao giờ để input khoá. **CHƯA đúng ở 8 trang
      tool dùng `SHELL_CHAT_INTAKE=true`** (`app-luan-giai.html`,
      `app-bat-tu.html`, `app-xem-tuoi.html`, `app-nguoi-khac.html`,
      `app-day-con.html`, `app-than-so-hoc.html`,
      `app-duyen-no-tien-kiep.html`, `app-chan-dung-vo-chong.html`): vào thẳng
      các trang này, `startIntake()` chạy TRƯỚC `Shell.setContext` nên `ctx`
      vẫn `null` và input vẫn khoá cho tới khi xong 3 bước — bấm gõ tự do
      không gửi được. Bỏ ngoài kỳ này: sửa an toàn cho cả 8 trang (đổi toolType
      gửi lên rail LLM khi chưa có birth, tránh xung đột với draft/sổ lá số/
      resume-flow đã có ở `TuviForm.renderChat`) là việc rộng hơn một bản vá
      ngoại lệ — cần bàn thiết kế riêng trước khi đụng 8 trang cùng lúc.
- [x] Câu hỏi từ trang chủ (`/app?q=`) phải ra câu trả lời, không dừng ở
      form. **Đã đúng từ trước** (không phải việc mới) — `app-home.html`
      `HOME_ASK` đọc `?q=`/`&thay=` rồi gọi thẳng `Shell.ask()` (qua
      `wire()`, dù có hay chưa có lá số nhớ trên máy), đi qua ĐÚNG pipeline
      `ask()`/`sendMsg()`/`/api/v1/chat` như gõ tay. Xác nhận bằng Playwright
      (mock `/api/v1/chat`, mở `/app-home.html?q=...&thay=...#chat`): request
      thật được gửi, không dừng ở form.
- [x] Chip sau mỗi câu: tối đa 3. `CHAT_SUGGEST_RULES` (`lib/agent/run.ts`)
      đã dặn model đúng 3 gợi ý và giờ xếp vai: gợi ý 1 "đào sâu" đúng chủ đề
      vừa luận, gợi ý 2 sang "chủ đề kế bên", gợi ý 3 tự do — cắt cứng
      `.slice(0,3)` ở cả server (`run.ts`) và client (`shell.js`, thay
      `slice(0,4)`) làm lưới an toàn khi model lỡ ghi thêm. Xác nhận bằng
      Playwright: server mock trả 4 gợi ý, rail chỉ render 3 chip.
- [x] Điểm quay lại: "vận hôm nay" làm tin nhắn đầu rail khi người dùng mở
      lại trong ngày. `app-home.html` `daysAway()`/`Shell.lastChatAt()` đã có
      sẵn (từ #507) nhưng chỉ phân biệt "chưa từng/≥1 ngày/≥3 ngày" — thêm
      nhánh `away===0` (đã hỏi trong CÙNG ngày, không phải lần đầu):
      `vanHomNayText()` dựng câu chào thẳng từ `v.caNhan` (cung nhật hạn +
      chính tinh + lĩnh vực, nguồn `computeVanNgayCaNhan` trong
      `lib/engine/van-ngay.ts`, đã tính sẵn trong `wire()` — KHÔNG gọi LLM).
      Rỗng khi thiếu tầng cá nhân thì rơi về câu chào chung như cũ (không
      crash, không hỏi lại "đã hỏi rồi"). Xác nhận bằng Playwright: mock
      `app_hist_v1_home` (chat 2 giờ trước, cùng ngày) + `app_birth` +
      `/api/van-ngay` POST trả `caNhan`, greeting đầu rail chứa đúng cung/sao
      từ mock.

### W5: Bán chéo (mục 3)
- [x] Bảng chủ đề (CUNG) → report + `maybeShowUpsell` theo chủ đề (2026-09-26):
      `public/shell.js` `TOPIC_REPORT_CANDIDATES`/`pickTopicReport` — thẻ mời
      giờ chọn đúng công cụ khớp CUNG vừa hỏi (đọc `ToolPrices.rows()`, đã lọc
      `enabled`+`app_path` thật), rơi về Luận Giải khi không có ứng viên riêng.
      Verify: Playwright mock (`/api/v1/chat` + tool_pricing), 3 câu "công việc"
      → thẻ ra đúng "Tử Vi Công Sở & Hướng Nghiệp"/`/app/cong-so`, không phải
      Luận Giải; gate 1 thẻ/phiên vẫn giữ (kiểm thêm 2 lượt, đếm lại = 1).
      **Chưa làm**: `goi_y_san_pham` (server, `lib/tools/suggest-tool.ts`) vẫn
      chỉ 2 mã cũ — bảng client ở trên CHƯA hợp nhất với bản server; xem mục d.
- [x] Khối "Bước tiếp theo" ở `/la-so/[slug]` (2026-09-26, ƯU TIÊN CAO NHẤT —
      ~7.000 trang, loại SEO nhiều nhất, trước đây 0 CTA chat): `buildIsrHTML`
      + `buildNextStepHTML`/`fetchNextStepTool`/`appChatHref` trong
      `app/la-so/[slug]/route.ts` — 2 thẻ cuối trang (trước khối "Đọc thêm từ
      nghiên cứu"): 1 báo cáo liên quan (đọc thẳng `tool_pricing`, hiện là
      "Chu Trình Cuộc Đời") + 1 mở Hỏi Thầy (`/app?...&auto=1`, `auto=1` ở đây
      chỉ tự chạy An Sao MIỄN PHÍ, không phải report trả phí). Đã qua
      `tsc --noEmit` + đọc kỹ JSX/template; **KHÔNG chạy được `next dev`/
      `next build` thật trong sandbox này** (cần `SUPABASE_SERVICE_KEY` +
      mạng ra Supabase mà môi trường hiện tại không có — xem `docs/QC.md`
      "Claude Code Remote environments") nên chưa xem trang render bằng mắt.
  - [ ] Chưa làm: khối tương tự cho `laso_public`/`laso_pregen` (hai nhánh cũ
        của cùng route, ít traffic hơn ISR) và cho các trang `/app/*` khác
        (item e) — hoãn để giữ đợt an toàn, nhỏ.
- [ ] `goi_y_san_pham` (server) mở rộng sang cả 24 kịch bản rail + hợp nhất
      một nguồn với bảng chủ đề→report ở trên (item c/d, hoãn — rủi ro chạm
      vào tool LLM đang chạy thật, cần đo riêng trước khi đổi enum).
- [ ] Khối "Bước tiếp theo" ở cuối `report-delivery.js` và các trang `/app/*`
      còn lại (item d/e, hoãn — diện rộng, để đợt sau).
- [x] Email bán chéo: T6 + CN, tối đa 1 thư/người/lượt. Bật budget sau deploy, đo 2 tuần.

### W6: Độ mượt và hệ thống thị giác (Emil + impeccable polish)

Số đo mốc (J8, `docs/ux-audit/J8.md`) — dùng để biết đã xong chưa, không đoán:

| Việc | Đo trước (2026-09-26) | Đích | Kết quả |
|---|---|---|---|
| `.send`/`.btn-go`/`.stm-btn` có `:active` | 0/3 | 3/3 | ✓ **3/3** — `scale(.97)` + `var(--ease-out)`, đã đo bằng Playwright (`matrix(0.98686,…)` giữa transition) |
| `:hover` được gate `@media(hover:hover)` | 0/231 | phần lớn 231 | ✓ `shell.css`: **33/33** (toàn bộ) — 231 rải ở `app-*.html` CHƯA đụng, xem lý do dưới |
| `@keyframes` tôn trọng `prefers-reduced-motion` | 1/6 (`shell.css`) · 2/21 (trang) | toàn bộ | ✓ `shell.css`: **6/6** (`sbpPulse`/`sbDotPulse`/`shBlink` tắt hẳn; `shFade`/`rr-spin` cố ý giữ — một lần/báo tải) — trang riêng CHƯA đụng |
| `.shell{height:100vh}` → `100dvh` | chưa | đã đổi | ✓ đổi, giữ `100vh` làm dự phòng trước dòng `100dvh` |

- [x] `theme.css`: thêm token `--ease-out`, `--ease-in-out`, `--dur-1/2/3`,
      `--shadow-1/2/3` (+ `--safe-top`/`--safe-bottom` giữ chỗ, xem mục dưới).
      Giá trị GHI LẠI số ĐA SỐ đang dùng thật (grep toàn repo): easing
      `cubic-bezier(.4,0,.2,1)` 8/9 chỗ, thời lượng `.15s`/`.2s` 65/109 chỗ.
- [x] `shell.css`:
  - khối `prefers-reduced-motion` toàn cục (tắt `sbpPulse`/`sbDotPulse`/`shBlink`)
    — 🪤 phải đặt ở CUỐI file, không phải cạnh `.shell`: cùng specificity với
    rule gốc thì rule đứng SAU trong nguồn thắng bất kể có `@media` hay
    không — đặt đầu file bị 3 rule animation (khai sau) đè ngược, đo bằng
    `getComputedStyle().animationName` vẫn ra tên keyframe cho tới khi dời
    xuống cuối;
  - `:hover` bọc `@media (hover:hover)` — 33/33 rule của `shell.css`. Một
    rule (`.rh-del` — nút xoá chỉ hiện khi hover) được tách: base ẩn
    (`opacity:0`) CHỈ áp trong `(hover:hover)`, còn `(hover:none)` (chạm)
    giữ luôn hiện — gate thẳng tay ở đây sẽ làm nút xoá biến mất vĩnh viễn
    trên di động;
  - phản hồi nhấn `scale(.97)` cho `.send`/`.btn-go`/`.stm-btn`, dùng
    `var(--ease-out)`/`var(--dur-1)` khai cục bộ trong `:root` của chính
    `shell.css` (không tham chiếu được `theme.css` — hai file không cùng
    nạp trên một trang, xem `app-*.html` chỉ có `<link shell.css>`);
    cubic-bezier(.23,1,.32,1) mà bản plan trước nhắc tới **không còn tồn
    tại trong repo** (đã kiểm bằng grep) — dùng lại `cubic-bezier(.2,.8,.2,1)`
    (khối `.tv-sheet-panel`, easing decelerate DUY NHẤT đang dùng thật);
  - `transition: all` → 0 chỗ trong `shell.css` (xác nhận lại, không cần sửa).
- [ ] Từng trang theo thứ tự traffic: bỏ Arial, gom gradient và shadow về
      token — **HOÃN đợt này**. Lý do: mục theme.css/shell.css (rủi ro cao vì
      chạm CSS dùng chung mọi trang) đã chiếm hết ngân sách review-an-toàn
      của đợt; sửa 85 chỗ `transition:all` + gradient/shadow rải trên
      53+ trang `app-*.html` là việc CẦN đo từng trang một (ảnh chụp trước/
      sau), không làm ẩu được trong cùng một lượt. Cũng là lý do 231 chỗ
      `:hover` ở `app-*.html` (ngoài `shell.css`) CHƯA gate — cùng một nhóm
      việc "diện rộng, từng trang", để đợt sau.
- [x] Emil `mobile-native`: `.shell` đổi `100vh`→`100dvh` (giữ `100vh` làm
      dự phòng); input <16px trong khung app đã đúng từ trước (media
      `@media(max-width:900px)` có sẵn, xác nhận lại — không có ô nào sót);
      `.send`/`.btn-go`/`.stm-btn` thêm `-webkit-tap-highlight-color:
      transparent` + `touch-action:manipulation` (mảng đã có sẵn ở `.tabbar
      .tab`/`.tab-home` từ trước); safe-area — `shell.css` gọi thẳng
      `env(safe-area-inset-*)` inline (không có token nào để "port" ra), nên
      thay vào đó `theme.css` được thêm HAI token mới (`--safe-top`/
      `--safe-bottom`) làm giữ chỗ cho trang ngoài app-shell, không đổi gì ở
      trang chưa dùng tới.

### W7: Đo lại và chốt
- [~] Chạy lại crawl, J1 và J2, so với baseline W0. Đọc 3 chỉ số mục 0 sau
      2 tuần. Ghi nhật ký `docs/nhat-ky/`. **Chỉ xong phần re-verify J1/J2 sống
      2026-09-26** (static server cục bộ + Playwright 390px, đối chiếu từng
      phát hiện P0/P1 ở `docs/ux-audit/J1-J2.md` — xem nhật ký "W7 — đo lại và
      chốt"): #1 giá thiếu VNĐ, #2 tour che câu trả lời đầu, #3 tên chat, tab
      bar gạch chân, draft form, rail an-sao/tu-tru, upsell theo chủ đề, CTA
      `/la-so/[slug]` — đều xác nhận đã sửa trong code hiện tại. **CHƯA xong
      phần đọc 3 chỉ số mục 0** — plan tự ghi rõ "sau 2 tuần", mà PR #1085 còn
      draft, chưa merge `main`, nên chưa có giờ nào chạy thật trên prod. Không
      bịa số. Addendum: **sau khi PR này merge + deploy, chờ đúng 2 tuần rồi
      đọc lại `chat_msg`/`chat_reply`/D1-D7 và `rail_suggest_*`/`cta_click`
      trong Supabase/analytics** để điền vào bảng mục 0, đóng hẳn dòng này.

---

## 5. Quyết định của Henry (2026-09-26)

| # | Câu hỏi | Chốt | Trạng thái |
|---|---|---|---|
| 1 | Tên cửa chat | **Một tên duy nhất: "Hỏi Thầy"** (bỏ cả "Luận Đường") | ✓ đổi toàn bộ chữ hiển thị, luật ghi vào `CLAUDE.md` |
| 2 | Số online giả + toast hoạt động | **Để đó, không sửa** | Bỏ khỏi W2 |
| 3 | Trang mồ côi + `/tools/*.html` trùng | **Xoá, dọn gọn** | ✓ 38 `/tools/*.html` → 308 về `/app/*`; 16 trang cũ xoá + 308 |
| 4 | Email bán chéo | **2 thư/tuần, vào T6 và CN** | ✓ code (cron T6+CN, tối đa 1 thư/người/lượt). Budget bật SAU deploy: `_patches/migration-email-cross-sell-on.sql` |
| 5 | `PRODUCT.md` | Khách: **dân văn phòng 22–65 tuổi, chủ yếu nữ** | ✓ `PRODUCT.md` + `DESIGN.md` ở gốc repo |

## 6. Không làm (để khỏi trôi phạm vi)
- Không redesign hay đổi phong cách (taste / impeccable chỉ chạy ở chế độ
  tinh chỉnh). Không đổi font thương hiệu.
- Không đụng mô hình giá hay gói (thuộc P2 bên plan kia). Không bundle
  report.
- Không chạy lại `gen-tool-avatars` / `gen-hero-banners`.
