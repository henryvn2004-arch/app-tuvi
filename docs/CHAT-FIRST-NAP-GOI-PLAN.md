# Chat-first + chỉ bán theo gói Lượng — userflow, điểm rơi, workplan

> Chốt hướng với Henry 2026-09-26, sau buổi test phễu thật trên prod (nhật ký
> `docs/nhat-ky/2026-09.md` → "Test phễu khách → đăng ký → trả tiền").
> **Chưa code.** File này là workplan; làm tới đâu đánh dấu tới đó.

## 0. Quyết định đã chốt (Henry, 2026-09-26)

1. **Giữ nguyên hệ Lượng.** Lượng vẫn là đơn vị, hệ thống vẫn trừ Lượng như
   trừ token. **Không** làm subscription, không hạn mức ngày/tuần.
2. **Giữ 4 gói hiện tại, tăng Lượng mỗi gói.** Gói Phổ Thông đổi giá thành
   **399.000đ**. Gói là để mua Lượng, không phải mua quyền dùng theo thời hạn.
3. **Bỏ mua lẻ từng report.** Không còn trả tiền riêng cho một report, không
   còn QR số tiền lẻ (`package_id='custom'`), không còn guest checkout theo
   từng tool. Muốn dùng thì **đăng ký → nạp gói → dùng**.
4. **Chat là cửa vào chính.** Report là thứ chạy ra trong/từ cuộc chat (như
   artifact): đủ Lượng thì **tự chạy, tự trừ**, có ghi số Lượng ngay từ đầu;
   không đủ thì mời nạp gói.
5. Số dư Lượng cũ giữ nguyên, không quy đổi gì.

| | Hiện tại | Đích |
|---|---|---|
| Mục tiêu | Doanh thu mỗi report | **Số người đăng ký** + **thời gian chat với thầy** |
| Thu tiền | Nút "Mở — 190 Lượng" từng report; thiếu thì QR số tiền lẻ, kể cả khách chưa đăng ký | **Chỉ bán gói Lượng**, chỉ cho người đã đăng ký |
| Report | Quầy bán riêng, có tường khoá theo cung | Chạy ra từ chat, đủ Lượng thì tự chạy, tự trừ |
| Nạp tiền | Nhiều lần nhỏ (~75k/đơn trung bình) | Ít lần, mỗi lần một gói (199k–999k) |

---

## 1. Userflow HIỆN TẠI + điểm rơi từng bước

Đo trên prod 2026-09-25 (mobile 390px, Luận Giải Lá Số), số liệu DB 60 ngày.
Ảnh: `scripts/out/ux/funnel/` (gitignore — chỉ có trên máy chạy test).

```
[B0 Trang chủ] → [B1 Chọn tool] → [B2 Form 4 bước] → [B3 Bản free + 12 cung khoá]
      → [B4 Chat 3 câu thử] → [B5 Tường hết lượt] → [B6 Modal đăng ký]
      → [B7 Xác nhận email] → [B8 Có 50 Lượng = 5 câu] → [B9 Thiếu Lượng]
      → [B10 QR / topup] → [B11 Trả xong, quay lại]
```

| Bước | Điểm rơi đã thấy | Số đo | Loại |
|---|---|---|---|
| B0 Trang chủ | Màn đầu không có nút nào — CTA đầu ở y=839, bị tab bar che. 59+ tool = quá nhiều lựa chọn. | — | UX |
| B1→B2 | Ổn. Form hội thoại từng bước mượt. | — | ✓ |
| B3 Bản free | 12 cung khoá chỉ là **khung xám**, không trích 1 câu thật nào. Nút đầu tiên sâu ~5.000px (~6 màn). Nút ghi "**190 Lượng**" — khách không biết Lượng là gì, không có VNĐ (`app-luan-giai.html:384`, `:1032`). Nút "Đang lập lá số…" kẹt vĩnh viễn. Nội dung lòi giữa ô chat và tab bar. Bảng 12 cung tràn mép phải. | — | Chuyển đổi + UI |
| B4 Chat thử | Chất lượng tốt (~24s/câu). Nhưng **không câu nào dẫn tiếp** — hết 3 câu là hết. | 26 người chat trả phí 60 ngày, trung vị **6 câu**, hoạt động **~3 ngày** rồi bỏ | Giữ chân |
| B5 Tường hết lượt | Rõ ràng, có số quà (50 Lượng = 5 câu). Nút lệch trái. | — | ✓ nhẹ |
| B6 Modal đăng ký | Bấm "Đăng ký miễn phí" mà mở **tab Đăng nhập** (`shell.js:2606` → `Auth.require` → `showAuthModal` mặc định `signin`, `auth.js:759`). | — | **Bug** |
| B7 Xác nhận email | Báo "Đã gửi email xác nhận" bằng **chữ đỏ như lỗi** (`auth.js:822` dùng `showAuthError`), modal đứng yên. `signUpEmail` không truyền `redirect_to` → link xác nhận nhiều khả năng rơi về trang mặc định, mất lá số đang xem (chưa bấm link thật để kiểm). | **5/16 = 31%** đăng ký email không bao giờ xác nhận. Google: 34/34 vào được | Chuyển đổi |
| B8 Sau đăng ký | 50 Lượng hết sau ~5 câu. Người dùng phải tự tính ví. | — | Mô hình |
| B9 Thiếu Lượng | **Đã đăng nhập** → bị đẩy sang `/topup.html` (rời lá số). **Khách ẩn danh** → QR tại chỗ. Tức là đăng ký xong lại **khó trả tiền hơn** (`tuvi-paywall.js` ~1338, điều kiện `_isAnonymous()`). | — | **Bug mô hình** |
| B10 QR | Giá hiện ~95.000đ (đơn giá 500đ/Lượng) nhưng QR tính mức nạp lẻ 199k/350 ≈ 569đ → **109.000đ**. Con số VNĐ đầu tiên khách thấy là ở màn QR, và cao hơn ~15%. | **106 người tạo QR → 20 trả** (60 ngày). Tuần 21/09: **39 → 5**. Đơn treo gần như toàn khách ẩn danh | **Điểm rơi lớn nhất** |
| B11 | Chưa test được (bị chặn quyền thao tác tiếp trên prod). | — | ? |


### Giá vốn — ràng buộc khi tăng Lượng mỗi gói

`events.llm_usage`, 30 ngày:

| | Giá vốn/lượt | Đang thu |
|---|---|---|
| Chat (`rail-message` = 10 Lượng, gemini-3.8-flash) | **~4.060đ** (p90 8.120đ) — vào **~193k token/lượt**, chỉ ~25k trúng cache | 10 Lượng = 3.700–5.690đ tuỳ gói |
| Report Luận Giải (`laso`, 190 Lượng) | ~300đ/phần × 13 phần ≈ **4–6k/bản** (ước, chưa gom theo lượt chạy) | 190 Lượng ≈ 70–108k → biên rất dày |
| Ảnh minh hoạ (`illus`) | ~1.100đ/ảnh | kèm report |

Một câu chat thu về bao nhiêu tuỳ khách mua gói nào:

| Gói hiện tại | Giá | Lượng | đ/Lượng | 1 câu chat thu về |
|---|---|---|---|---|
| Khởi Đầu | 199.000đ | 350 | 569 | 5.690đ |
| Phổ Thông | 400.000đ | 800 | 500 | 5.000đ |
| Cao Cấp | 699.000đ | 1.600 | 437 | 4.370đ |
| VIP | 999.000đ | 2.700 | 370 | **3.700đ < giá vốn 4.060đ** |

⇒ Khách gói VIP **đang chat lỗ ngay bây giờ**. Tăng Lượng mỗi gói (mỗi Lượng
rẻ đi) mà giữ chat 10 Lượng/câu thì mọi gói đều tiến về lỗ khi chat. Report thì
không có vấn đề (biên rất dày). ⇒ **P1 (hạ giá vốn chat) phải xong TRƯỚC hoặc
CÙNG LÚC với đợt tăng Lượng**, không được đi sau.

---

## 2. Userflow ĐÍCH

```
[Trang chủ = ô chat với thầy + nhập ngày sinh ngay trong ô]
   → thầy lập lá số + nói bản tổng quan (free) ngay trong chat
   → khách hỏi tiếp (chưa đăng ký: 3 câu thử, như hiện tại)
   → hết câu thử: "Đăng ký để giữ lá số, tặng 50 Lượng" (Google 1 chạm / mã OTP 6 số trong modal)
   → đã đăng ký: chat trừ 10 Lượng/câu, đồng hồ ví luôn hiện ở đầu khung chat
   → muốn report (thầy gợi ý hoặc khách bấm):
        đủ Lượng  → nút ghi rõ "Thầy luận 12 cung · 190 Lượng" → bấm là chạy, tự trừ
        thiếu     → tờ nạp gói ngay tại chỗ (4 gói, QR mở luôn) → trả xong tự chạy tiếp
   → hết Lượng khi đang chat → cùng tờ nạp gói, trả xong câu hỏi đang dở tự gửi lại
```

### Nguyên tắc UX
1. **Một cách trả tiền duy nhất: nạp gói.** Không nút nào mời trả tiền cho một
   report cụ thể nữa. Nút report chỉ ghi số Lượng sẽ trừ.
2. **Số Lượng hiện ngay trên nút, bấm là chạy.** Không hỏi xác nhận thêm khi
   ví đủ — giống bấm gửi trong Claude/ChatGPT. Trừ Lượng chỉ khi CHÍNH khách
   bấm/yêu cầu, thầy không tự chạy report tốn Lượng khi khách chưa bấm.
3. **Không rời cuộc chat để nạp.** Tờ nạp gói mở tại chỗ, QR mở luôn, trả
   xong việc đang dở tự chạy tiếp.
4. **Đăng ký là bước bắt buộc trước khi trả tiền**, nên nó phải gần như không
   ma sát: Google một chạm là lựa chọn chính, email dùng mã OTP trong modal.
5. **Đồng hồ ví luôn thấy được** ở đầu khung chat: "Còn 740 Lượng · khoảng 74 câu".

### Đổi tên nút (brainstorm)

| Chỗ | Hiện tại | Đề xuất |
|---|---|---|
| CTA trang chủ/tool | "Xem lá số của bạn →" | **"Hỏi thầy về lá số của bạn"** (mở thẳng chat) |
| Tool card | "~95.000đ mỗi lượt (190 Lượng)" | **"Miễn phí"** hoặc **"190 Lượng"** — không còn giá VNĐ theo lượt (VNĐ chỉ nằm ở tờ nạp gói) |
| Cung khoá, chưa đăng ký | "✦ Mở luận giải chuyên sâu — 190 Lượng →" | **"Đọc tiếp cung Mệnh →"** → mời đăng ký (tặng 50 Lượng) |
| Cung khoá, đã đăng ký, đủ Lượng | (như trên) | **"Thầy luận tiếp 12 cung · 190 Lượng"** → bấm là chạy |
| Cung khoá, đã đăng ký, thiếu Lượng | (như trên) → `/topup.html` | **"Thầy luận tiếp 12 cung · 190 Lượng"** → tờ nạp gói tại chỗ, dòng phụ "Ví còn 50, cần thêm 140" |
| Hộp "Chi phí sử dụng" | "Miễn phí — xem tổng quan & 1 phần trước…" | "Tổng quan miễn phí · bản đầy đủ 190 Lượng" |
| Rail meter | "Dùng thử: còn 3 câu" / "Còn N câu hỏi · Nạp thêm" | Chưa đăng ký: "Còn 3 câu thử" · Đã đăng ký: **"Ví: 740 Lượng (≈74 câu)"** + nút "Nạp" |
| Hết Lượng | "Nạp Lượng →" (sang /topup.html) | **"Nạp gói"** → tờ nạp tại chỗ |
| Nav | "Nạp Lượng" | giữ "Nạp Lượng" (hệ Lượng không đổi) |

> ⚠️ Đổi nhãn tool card từ "VNĐ chính, Lượng phụ" sang "chỉ Lượng" là **đảo
> luật** `CLAUDE.md` "VNĐ là giá CHÍNH ở mọi câu nói giá cho khách" (chốt
> 2026-09-20). Khi làm phải sửa luật đó cùng PR: VNĐ chỉ còn ở tờ nạp gói,
> vì khách không còn trả VNĐ cho từng việc nữa.

---

## 3. Pricing — gói Lượng mới (số để bàn, trừ giá Phổ Thông đã chốt)

### Luật đặt số
- **Sàn chat:** ở gói rẻ nhất tính theo Lượng (VIP), 10 Lượng phải ≥ **2× giá
  vốn một câu**. Với giá vốn hiện tại 4.060đ là ≥ 812đ/Lượng — tức là **không
  thể tăng Lượng chút nào** trước khi hạ giá vốn. Sau P1 (≤ 1.500đ/câu) sàn là
  ≥ 300đ/Lượng.
- **Bậc giảm dần theo gói lớn** để khách nạp gói lớn (ít lần, mỗi lần nhiều tiền).
- **Giá trị 1 Lượng suy từ gói thứ hai** (Phổ Thông) theo luật hiện tại —
  399.000đ/1.000 Lượng = **399đ**. Đổi gói phải sửa kèm cả ba: SQL `credit_vnd()`
  · `vndPerCredit()` · `FALLBACK` (`lib/billing/packages.ts`), xem `docs/luat/tien.md`.

### Đề xuất (áp dụng SAU khi P1 đạt ≤ 1.500đ/câu)

| Gói | Giá | Lượng cũ → mới | đ/Lượng | Quy ra | 1 câu chat thu về | Biên chat (giá vốn 1.500đ) |
|---|---|---|---|---|---|---|
| Khởi Đầu | 199.000đ | 350 → **450** (+29%) | 442 | 45 câu, hoặc 2 report 190 | 4.420đ | 2,9× |
| Phổ Thông | **399.000đ** | 800 → **1.000** (+25%) | 399 | 100 câu, hoặc 5 report | 3.990đ | 2,7× |
| Cao Cấp | 699.000đ | 1.600 → **2.000** (+25%) | 350 | 200 câu, hoặc 10 report | 3.500đ | 2,3× |
| VIP | 999.000đ | 2.700 → **3.200** (+19%) | 312 | 320 câu, hoặc 16 report | 3.120đ | 2,1× |

- Giá report giữ nguyên theo Lượng (190/150/610…) — biên vẫn dày dù Lượng rẻ đi.
- Quà đăng ký 50 Lượng = 5 câu: giữ, đủ để thấy chất lượng thầy.
- Nếu **P1 chưa xong** mà vẫn muốn tăng Lượng ngay: phải nâng chat lên
  **15 Lượng/câu** (`tool_pricing['rail-message']`) cùng lúc, nếu không gói
  VIP lỗ nặng hơn (312đ × 10 = 3.120đ < 4.060đ).

### Rủi ro phải đo khi bỏ mua lẻ
- **Khách ẩn danh đang là nguồn trả tiền chính:** 60 ngày, 14/20 người trả tiền
  là guest checkout (16/29 đơn đã trả). Bắt đăng ký trước khi trả có thể làm
  mất một phần nhóm này. Giảm rủi ro: tờ nạp gói có Google một chạm NGAY TRONG
  tờ đó (đăng ký + chọn gói + QR là một màn liên tục), không tách thành hai bước.
- **Vé vào cửa tăng:** đơn trung bình hiện ~75k (nạp lẻ), gói nhỏ nhất 199k.
  Đo tỷ lệ tạo QR → trả trước/sau; nếu tụt mạnh, cân nhắc một gói nhỏ hơn
  (vd. 99k) thay vì mở lại mua lẻ.

---

## 4. Workplan

Thứ tự: **P0 vá phễu đang chảy máu** → **P1 hạ giá vốn chat** (điều kiện để tăng
Lượng) → P2 đổi gói + bỏ mua lẻ → P3 chat-first + report tự chạy → P4 đo.

### P0 — Vá phễu hiện tại (nhỏ, làm được ngay)
- [ ] Nút "Đăng ký miễn phí" mở đúng tab Đăng ký (`openAnonSignupModal` → cần
      `showAuthModal` nhận tham số tab, `shell.js:2606`, `auth.js:562`).
- [ ] Đăng ký email: đổi sang mã OTP 6 số ngay trong modal (hoặc tắt Confirm
      email); nếu giữ link thì truyền `redirect_to` về đúng trang + báo thành
      công bằng màu trung tính, không dùng `showAuthError` (`auth.js:822`).
- [ ] Đẩy nút Google lên làm lựa chọn chính trong modal (68% đăng ký là Google).
- [ ] UI: nút "Đang lập lá số…" đổi thành trạng thái xong; nội dung lòi dưới
      ô chat; bảng 12 cung tràn phải; nút modal lệch trái; màn đầu trang chủ
      không có CTA.
> Các mục QR/giá lệch (95k vs 109k, người đăng nhập bị đẩy sang `/topup.html`)
> **không vá riêng** — P2 thay hẳn đường đó bằng tờ nạp gói.

### P1 — Hạ giá vốn một câu chat (điều kiện để tăng Lượng)
- [ ] Đo: 193k token vào/lượt gồm những gì (lá số text, tools, lịch sử, system).
- [ ] Đưa phần tĩnh (system + lá số) vào cache thật (Gemini explicit cache /
      Anthropic `cacheSystem`), cắt lịch sử dài bằng tóm tắt.
- [ ] Mục tiêu: **≤ 1.500đ/câu** trung bình, p90 ≤ 3.000đ.

### P2 — Gói mới + bỏ mua lẻ
- [ ] Cập nhật `credit_packages` (4 gói, Phổ Thông 399k) qua Admin; sửa kèm
      `credit_vnd()` · `vndPerCredit()` · `FALLBACK` theo luật `tien.md`.
- [ ] Bỏ QR số tiền lẻ: `_qrAmountFor` / `package_id='custom'` ở đường tool
      (`tuvi-paywall.js`), `create-bank` chỉ nhận `package_id` của gói.
- [ ] Bỏ guest checkout theo từng tool: `requireCredits()` không tự mở phiên ẩn
      danh để trả tiền nữa; chưa đăng ký → mời đăng ký (Google một chạm trong
      tờ nạp). ⚠️ Rà mọi đường phát thưởng vẫn chặn `is_anonymous` (luật guest checkout).
- [ ] **Tờ nạp gói tại chỗ** dùng chung cho mọi chỗ thiếu Lượng (report, chat):
      4 gói + QR mở luôn + trả xong tự chạy lại việc đang dở (tái dùng
      `returnUrl`/callback đang có ở `tuvi-paywall.js`).
- [ ] Người đã đăng nhập thiếu Lượng cũng dùng tờ này (thay `/topup.html`).
- [ ] Khách đang có đơn QR lẻ treo: để hết hạn tự nhiên, không huỷ tay.

### P3 — Chat-first + report tự chạy
- [ ] Trang chủ = ô chat + nhập ngày sinh trong ô.
- [ ] Đồng hồ ví ở đầu khung chat ("Ví: 740 Lượng ≈ 74 câu").
- [ ] Nút report ghi "· N Lượng", đủ ví thì bấm là chạy + trừ (giữ luật: chốt
      thanh toán đặt TRƯỚC bước gọi model; slug trừ tiền vẫn bắt đầu bằng `tool_id`).
- [ ] Thầy gợi ý report trong chat bằng một nút có sẵn số Lượng (không tự chạy).
- [ ] Đổi nhãn nút theo bảng mục 2; cung khoá hiện 1–2 câu trích thật thay khung xám.
- [ ] Sửa luật `CLAUDE.md` "VNĐ là giá CHÍNH…" cho khớp mô hình mới.

### P4 — Đo & chỉnh
- [ ] Dashboard: đăng ký/ngày, D1/D7 quay lại, câu chat/người/ngày, tỷ lệ đăng
      ký → nạp gói, gói nào bán chạy, ARPPU, giá vốn chat/người.
- [ ] So tỷ lệ tạo QR → trả trước/sau khi bỏ mua lẻ (rủi ro mục 3).
