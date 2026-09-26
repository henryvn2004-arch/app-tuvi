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
- [ ] Event cho click chip gợi ý: `chat_chip_click` với `{source: static|suggest, idx}`.
- [ ] Tách `rail_suggest_*` thành `tool` và `report`, thêm `topic` + `master`.
- [ ] Viết `PRODUCT.md` + `DESIGN.md` cho impeccable, NHÁP từ
      `docs/BRAND-VOICE.md` + token hiện có. **Henry duyệt phần "sự thật sản
      phẩm"** (chân dung khách, điều không được hứa).
- [ ] `scripts/ux/crawl.mjs` (tầng 1) + chạy lần đầu làm mốc (baseline).
- [ ] Ghi vào `docs/QC.md` cách cho Chromium tin CA của proxy (certutil).
      Thiếu bước này harness báo `ERR_CERT_AUTHORITY_INVALID` với mọi host.

### W1: Audit (chỉ đọc, không sửa)
- [ ] Chạy J1–J8 → `docs/ux-audit/`. Tổng hợp một bảng P0–P3.
- [ ] Bảng thuật ngữ + danh sách chữ cần đổi (trích từ `copy/*.txt`).

### W2: Lỗi và niềm tin (P0)
- [ ] Nhãn "Trò chuyện" bị gạch chân xanh ở tab bar `/app`. Logo và slogan
      bị cắt trên header landing 390px.
- [ ] Lỗi console, 401 và `ERR_FAILED` khi tải trang (mục đích của từng
      request lấy từ crawl). `[cong-cu] thiếu page_path/app_path, đã ẩn:
      rail-message`.
- [ ] Số "online" giả + toast mua hàng giả: **gỡ, hoặc thay bằng số thật**
      (tuỳ Henry quyết).
- [ ] Một con số "N công cụ", đọc từ catalog, không gõ tay.

### W3: Một sản phẩm, một khuôn mặt
- [ ] Một tên cho cửa chat ở MỌI nơi (Henry chọn, xem mục 5). Gỡ link tới
      `tuvi-chat.html`.
- [ ] Một khung header + tab bar cho landing lẫn `/app` (giữ
      `check:tabbar`). `topup` nằm trong khung (khớp P2 bên plan kia: tờ nạp
      tại chỗ).
- [ ] Link nội bộ dùng `/app/<tool>`, không dùng `.html` trần. 301 các
      `/tools/*.html` còn trùng về `/app/*`. Gỡ hoặc 301 các trang mồ côi.
      ⚠️ Làm theo thứ tự: redirect trước, xoá file sau; kiểm sitemap và
      `seo_pages` không trỏ vào URL sắp chết.

### W4: Chat-first mượt (chi tiết tương tác cho P3 bên plan kia)
- [ ] Rail không bao giờ trống: chưa có lá số thì thầy vẫn trả lời câu
      chung, rồi hỏi ngày sinh **bằng form nhỏ ngay trong bong bóng chat**
      (tái dùng `TuviForm.renderChat`).
- [ ] Câu hỏi từ trang chủ (`/app?q=`) phải ra câu trả lời, không dừng ở
      form.
- [ ] Chip sau mỗi câu: tối đa 3, ưu tiên một chip "đào sâu" và một chip
      "chủ đề kế bên".
- [ ] Điểm quay lại: "vận hôm nay" làm tin nhắn đầu rail khi người dùng mở
      lại trong ngày (nguồn `lib/engine/van-ngay.ts`, engine, không LLM).

### W5: Bán chéo (mục 3)
- [ ] Bảng chủ đề → report, `goi_y_san_pham` mở rộng và nối mọi kịch bản,
      `maybeShowUpsell` theo chủ đề.
- [ ] Khối "Bước tiếp theo" ở cuối kết quả `/app/*` và cuối report-delivery.
- [ ] Email bán chéo: bật với ngân sách nhỏ (**Henry quyết**), đo 2 tuần.

### W6: Độ mượt và hệ thống thị giác (Emil + impeccable polish)
- [ ] `theme.css`: thêm token `--ease-out`, `--ease-in-out`, `--dur-1/2/3`,
      `--shadow-1/2/3`.
- [ ] `shell.css`:
  - khối `prefers-reduced-motion` toàn cục;
  - `:hover` bọc `@media (hover:hover)`;
  - phản hồi nhấn `scale(.97)` cho nút chính;
  - đổi `transition: all` sang thuộc tính cụ thể.
- [ ] Từng trang theo thứ tự traffic: bỏ Arial, gom gradient và shadow về
      token. Không đổi bố cục (tinh chỉnh, không redesign). Giữ luật CLS.
- [ ] Emil `mobile-native`: `100dvh`, input không zoom (≥16px), tắt tap
      highlight, safe-area.

### W7: Đo lại và chốt
- [ ] Chạy lại crawl, J1 và J2, so với baseline W0. Đọc 3 chỉ số mục 0 sau
      2 tuần. Ghi nhật ký `docs/nhat-ky/`.

---

## 5. Cần Henry quyết (chặn việc)

1. **Tên cửa chat:** "Hỏi Thầy" · "Luận Đường" · "Trò chuyện"? Đề xuất
   **"Hỏi Thầy"**: động từ, rõ việc, khớp với hội đồng 15 thầy. "Luận Đường"
   để làm tên thương hiệu phụ nếu muốn giữ.
2. **Số online giả + toast mua hàng giả:** gỡ hẳn, hay thay bằng số thật
   (có thể nhỏ)?
3. **Trang mồ côi, `/tools/*.html` cũ, `profile.html`:** được phép 301 hoặc
   xoá không?
4. **Email bán chéo:** bật lại với ngân sách bao nhiêu thư mỗi tuần?
5. **`PRODUCT.md`:** duyệt bản nháp chân dung khách và những điều không được
   hứa.

## 6. Không làm (để khỏi trôi phạm vi)
- Không redesign hay đổi phong cách (taste / impeccable chỉ chạy ở chế độ
  tinh chỉnh). Không đổi font thương hiệu.
- Không đụng mô hình giá hay gói (thuộc P2 bên plan kia). Không bundle
  report.
- Không chạy lại `gen-tool-avatars` / `gen-hero-banners`.
