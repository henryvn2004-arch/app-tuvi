# Chat-first + Gói tháng — userflow, điểm rơi, workplan

> Chốt hướng với Henry 2026-09-26, sau buổi test phễu thật trên prod (nhật ký
> `docs/nhat-ky/2026-09.md` → "Test phễu khách → đăng ký → trả tiền").
> **Chưa code.** File này là workplan; làm tới đâu đánh dấu tới đó.

## 0. Mục tiêu đổi

| | Hiện tại | Đích |
|---|---|---|
| Thước đo chính | Doanh thu mỗi report (trả theo lượt) | **Số người đăng ký** + **thời gian chat với thầy** |
| Cách thu tiền | Mỗi report một nút "Mở — 190 Lượng", thiếu thì nạp | **Mua gói** (tuần/tháng/năm), trong gói chat + report **tự chạy, tự trừ hạn mức** |
| Report | Sản phẩm bán riêng, có tường khoá | **Artifact** thầy viết ra trong lúc chat — hiện hạn mức sẽ dùng ngay lúc đầu, rồi chạy luôn |
| Giới hạn | Số dư Lượng (người dùng tự tính) | **Thanh hạn mức** ngày/tuần như Claude/ChatGPT — người dùng không phải tính gì |
| Nạp tiền | Nhiều lần nhỏ (~75k/đơn trung bình) | Ít lần, mỗi lần lớn hơn (gói tháng/quý/năm) |

Không cố đẩy cross-sell qua report nữa. Report vẫn có, nhưng là thứ thầy
**đưa ra trong cuộc chat**, không phải một quầy bán riêng.

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

### Giá vốn — lý do mô hình hiện tại không bán gói được ngay

`events.llm_usage`, 30 ngày:

| | Giá vốn/lượt | Đang thu |
|---|---|---|
| Chat (`chat`, gemini-3.8-flash) | **~4.060đ** (p90 8.120đ) — vào **~193k token/lượt**, chỉ ~25k trúng cache | 5–10 Lượng = **2.500–5.000đ** → biên ≈ 0 hoặc âm |
| Report Luận Giải (`laso`) | ~300đ/phần × 13 phần ≈ **4–6k/bản** (ước, chưa gom theo lượt chạy) | 190 Lượng ≈ 95–109k → biên rất dày |
| Ảnh minh hoạ (`illus`) | ~1.100đ/ảnh | kèm report |

⇒ Hiện tại **report nuôi chat**. Chuyển sang "chat là trung tâm, gói tháng"
mà không hạ giá vốn chat trước là **lỗ theo độ chăm chỉ của khách** — người
chat càng nhiều càng lỗ. **P1 là điều kiện tiên quyết.**

---

## 2. Userflow ĐÍCH (kiểu Claude/ChatGPT)

```
[Trang chủ = ô chat với thầy + nhập ngày sinh ngay trong ô]
   → thầy lập lá số + nói bản tổng quan (free) ngay trong chat
   → khách hỏi tiếp (ẩn danh: N câu)
   → hết câu ẩn danh: "Đăng ký để giữ lá số & hỏi tiếp" (Google 1 chạm / mã OTP 6 số trong modal)
   → gói Miễn phí: thanh hạn mức ngày (vd. 3 câu/ngày), đủ để quay lại mỗi ngày
   → chạm hạn mức: tờ nâng cấp 1 màn: Gói Tuần / Tháng / Năm, QR tại chỗ, trả xong chat tiếp ngay
   → trong gói: chat + report tự chạy; report hiện "dùng ~X% hạn mức tuần" trước khi viết, rồi chạy
   → gần hết hạn mức: gợi ý "nâng gói" hoặc "mua thêm lượt" (extra usage)
   → gần hết hạn gói: email/Zalo nhắc gia hạn (QR không tự gia hạn được)
```

### Nguyên tắc UX
1. **Một chỗ duy nhất để tiêu tiền: thanh hạn mức.** Không nút nào ghi giá
   theo từng việc nữa. Cái người dùng cần biết là "còn bao nhiêu", không phải
   "cái này bao nhiêu".
2. **Report = artifact.** Thầy đề xuất ("Để thầy viết bản luận 12 cung cho
   con nhé — dùng khoảng 15% hạn mức tuần") → người dùng bấm "Viết đi" → chạy,
   tự trừ. Report nặng hơn một ngưỡng (vd. >25% tuần) mới cần bấm xác nhận;
   dưới ngưỡng thì cứ chạy.
3. **Không bao giờ rời cuộc chat để trả tiền.** QR mở ngay trong tờ nâng cấp,
   trả xong câu hỏi đang dở tự gửi lại.
4. **Đăng ký không được làm việc trả tiền khó hơn** (ngược với B9 hiện tại).

### Đổi tên nút (brainstorm)

| Chỗ | Hiện tại | Đề xuất |
|---|---|---|
| CTA trang chủ/tool | "Xem lá số của bạn →" | **"Hỏi thầy về lá số của bạn"** (mở thẳng chat) |
| Cung đang khoá (free) | "✦ Mở luận giải chuyên sâu — 190 Lượng →" | **"Đọc tiếp cung Mệnh →"** → tờ nâng cấp: "Gói Tháng: mở cả 12 cung + hỏi thầy mỗi ngày" |
| Cung đang khoá (trong gói) | (như trên) | **"Thầy luận tiếp 12 cung"** + chữ nhỏ "~15% hạn mức tuần" |
| Hộp "Chi phí sử dụng" | "Miễn phí — xem tổng quan & 1 phần trước…" | Bỏ. Thay bằng thanh hạn mức ở đầu rail |
| Tool card | Giá theo lượt | Nhãn **"Miễn phí"** / **"Trong gói"** |
| Rail meter | "Dùng thử: còn 3 câu" / "Còn N câu hỏi · Nạp thêm" | Thanh progress: **"Hôm nay: ▓▓▓░░ 60%"** + "Tuần: 35%" |
| Hết hạn mức | "Nạp Lượng →" (sang /topup.html) | **"Nâng gói"** / **"Chờ tới 0h"** / **"Mua thêm lượt"** — tại chỗ |
| Nav "Nạp Lượng" | Nạp Lượng | **"Gói của tôi"** |

---

## 3. Pricing — brainstorm (CHƯA chốt, cần Henry quyết)

### Ràng buộc thị trường VN
- **QR chuyển khoản không tự gia hạn được.** "Gói tháng" ở VN thực chất là
  **vé trả trước theo thời hạn** (7/30/90/365 ngày) + nhắc gia hạn. Tự gia
  hạn chỉ có ở PayPal/thẻ (và MoMo sau này nếu đăng ký recurring).
- Khách hiện tại hoạt động **~3 ngày** rồi bỏ ⇒ vé **7 ngày** khớp đúng hành
  vi, làm cửa vào; gói tháng/năm là bậc trên.

### Khung đề xuất (số để bàn, dựa trên giá vốn SAU P1)

Giả định sau P1: chat ≤ **1.500đ/câu**, report 13 phần ≈ 5.000đ.
Luật tính: **người dùng kịch trần tuần mọi tuần thì cùng lắm hoà vốn**; lãi
đến từ việc đa số dùng dưới trần (trung vị hiện tại chỉ 6 câu cả vòng đời) —
đúng cách Claude/ChatGPT định trần. Trần NGÀY để rải việc dùng ra, trần TUẦN
là cái giữ giá vốn.

| Gói | Giá | Hạn mức (quy ra câu chat) | Giá vốn nếu kịch trần | Ghi chú |
|---|---|---|---|---|
| Miễn phí (đã đăng ký) | 0 | 3 câu/ngày, **8/tuần**; tổng quan lá số free | ~52k/tháng/người | Lý do quay lại mỗi ngày — chi phí marketing, không phải sản phẩm |
| Vé Tuần | 59k | 10 câu/ngày, **30/tuần** | ~45k | Cửa vào, khớp hành vi ~3 ngày |
| Gói Tháng | 199k | 15 câu/ngày, **30/tuần** (~130/tháng) | ~195k (hoà) | Bậc chính |
| Gói Năm | 1.49–1.99tr | như Tháng | ~2.3tr (lỗ nếu kịch trần cả năm — hiếm) | ≈ 7–10 tháng giá; thu tiền lớn một lần |

Nếu P1 hạ được xuống ~800đ/câu thì mọi trần tuần **nhân đôi** với cùng giá —
đây là đòn bẩy lớn nhất để gói "đáng tiền" hơn, lớn hơn cả việc tăng giá.

- Report không có giá riêng: trừ vào hạn mức theo **giá vốn thật** (vd. 1 bản
  Luận Giải ≈ 4 câu chat). Hạn mức đo bằng một đơn vị nội bộ (có thể vẫn gọi
  "Lượng" cho quen, nhưng khách chỉ thấy %).
- **Mua thêm lượt** (extra usage) khi chạm trần, giá theo giá vốn + biên.
- **Số dư Lượng cũ**: giữ làm ví "lượt thêm", dùng khi chạm trần gói; hoặc
  quy đổi ra ngày gói. Không được làm mất tiền người đã nạp.
- Vé đắt hơn đơn trung bình hiện tại (~75k/đơn) ⇒ rủi ro tụt tỉ lệ trả. Đo
  song song: Vé Tuần phải kéo được tỷ lệ QR→trả lên trên mức hiện tại (19%).

### Câu hỏi cần Henry chốt
1. Giá 3 bậc (Tuần/Tháng/Năm) và hạn mức free mỗi ngày.
2. Giữ tên "Lượng" làm đơn vị hạn mức, hay bỏ hẳn (khách chỉ thấy %)?
3. Số dư Lượng cũ: ví lượt thêm hay quy đổi ra ngày?
4. Report nặng nhất (combo trọn bộ, chân dung ảnh) có nằm trong gói, hay là
   "extra usage" riêng?

---

## 4. Workplan

Thứ tự có chủ đích: **P0 sửa phễu đang chảy máu** (không phụ thuộc mô hình mới) →
**P1 hạ giá vốn** (điều kiện để bán gói) → P2–P4 dựng mô hình mới → P5 đo.

### P0 — Vá phễu hiện tại (nhỏ, làm được ngay, không đợi pricing)
- [ ] Nút "Đăng ký miễn phí" mở đúng tab Đăng ký (`openAnonSignupModal` → cần
      `showAuthModal` nhận tham số tab, `shell.js:2606`, `auth.js:562`).
- [ ] Người đã đăng nhập thiếu Lượng cũng được QR tại chỗ (bỏ điều kiện
      `_isAnonymous()` ở `tuvi-paywall.js` ~1338).
- [ ] Đăng ký email: đổi sang mã OTP 6 số ngay trong modal (hoặc tắt Confirm
      email); nếu giữ link thì truyền `redirect_to` về đúng trang + báo thành
      công bằng màu trung tính, không dùng `showAuthError`.
- [ ] Đẩy nút Google lên làm lựa chọn chính trong modal (68% đăng ký là Google).
- [ ] Nút cung khoá có VNĐ; **giá hiển thị = giá QR** (hoặc QR tính đúng giá đã
      hiện, hoặc hiện đúng 109k). Chạm `tool-prices.js` → bump `?v=` mọi nơi.
- [ ] UI: nút "Đang lập lá số…" đổi thành trạng thái xong; nội dung lòi dưới
      ô chat; bảng 12 cung tràn phải; nút modal lệch trái; màn đầu trang chủ
      không có CTA.
> P0 vẫn đáng làm dù sẽ chuyển mô hình: P2–P4 mất nhiều tuần, phễu đang rơi mỗi ngày.

### P1 — Hạ giá vốn một câu chat (điều kiện tiên quyết)
- [ ] Đo: 193k token vào/lượt gồm những gì (lá số text, tools, lịch sử, system).
- [ ] Đưa phần tĩnh (system + lá số) vào cache thật (Gemini explicit cache /
      Anthropic `cacheSystem`), cắt lịch sử dài bằng tóm tắt.
- [ ] Mục tiêu: **≤ 1.500đ/câu** trung bình, p90 ≤ 3.000đ. Chưa đạt thì không
      mở gói không giới hạn theo lượt.

### P2 — Engine hạn mức (metering)
- [ ] Sổ tiêu dùng theo đơn vị nội bộ (tái dùng `credit_transactions` làm sổ,
      thêm cửa sổ trượt ngày/tuần).
- [ ] Cấu hình hạn mức theo gói trong `app_config` (sửa không cần deploy).
- [ ] Chặn ở server (`/api/v1/chat` + mọi route report) — client chỉ hiện lại.
- [ ] API trả trạng thái thanh hạn mức (additive vào `lib/contract/v1.ts`).
- [ ] Giá report quy theo giá vốn thật từ `llm_usage`, không gõ tay.

### P3 — Gói & thanh toán
- [ ] Bảng `subscriptions` (user, plan, starts_at, ends_at, nguồn thanh toán) —
      migration theo luật `docs/luat/postgres.md` (REVOKE, search_path, UPSERT).
- [ ] Mua vé qua QR (payOS/bank) + PayPal; cửa chốt dùng chung kiểu
      `settlePayPalTopup` (chịu được gọi trùng).
- [ ] Nhắc hết hạn (email transactional qua `lib/email/send.ts` + push).
- [ ] Chuyển đổi số dư Lượng cũ theo quyết định ở mục 3.
- [ ] Guest checkout: gói gắn vào phiên ẩn danh → bắt buộc "Lưu tài khoản" sau khi trả.

### P4 — UX chat-first
- [ ] Trang chủ = ô chat + nhập ngày sinh trong ô.
- [ ] Thanh hạn mức ở đầu rail (thay "Dùng thử: còn N câu" / hộp "Chi phí sử dụng").
- [ ] Report thành artifact: thầy đề xuất trong chat → chạy → trừ hạn mức; bỏ
      tường khoá theo từng cung cho người trong gói.
- [ ] Tờ nâng cấp một màn (3 gói + QR tại chỗ), mở từ: hết câu ẩn danh, chạm
      hạn mức, bấm cung khoá.
- [ ] Đổi toàn bộ nhãn nút theo bảng mục 2; nav "Nạp Lượng" → "Gói của tôi".
- [ ] Cung khoá (người free) hiện 1–2 câu trích thật thay khung xám.

### P5 — Đo & chỉnh
- [ ] Dashboard: đăng ký/ngày, D1/D7 quay lại, câu chat/người/ngày, free→trả,
      ARPPU, giá vốn/người trả, % người chạm trần.
- [ ] Chỉnh hạn mức theo phân phối dùng thật (đừng đoán) — trần sai là lỗ âm thầm.

### Luật sẽ phải sửa khi làm P2–P4
`CLAUDE.md` mục 💸 Đường tiền đang giả định mô hình **trả theo lượt**
(`tool_pricing`, slug thanh toán theo `tool_id`, `hasRecentToolPayment`…).
Đổi mô hình thì phải cập nhật các luật đó cùng PR, không để luật cũ chỉ sai.
