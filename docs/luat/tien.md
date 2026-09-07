# Luật đường tiền — chi tiết

> Bản 1–3 dòng ở `CLAUDE.md`. Đây là phần "vì sao" và số đo.

## 💰 Giá Lượng: CHỈ sửa trong Admin — client KHÔNG được chép số (2026-08-01, PR #373)

Nguồn duy nhất: bảng `tool_pricing` + `credit_packages`, sửa trong **Tools
Registry** của trang Admin, không cần deploy. Client đọc qua
`public/tool-prices.js` (`ToolPrices.get/rows/packages/fillSlots`), cache
sessionStorage 2 phút. Hiện giá ở UI = `<span data-tvp-price="<tool_id>">…</span>`.

- **Đọc hụt → `null`, KHÔNG đoán.** Ô để `…`; paywall **từ chối chạy** và hiện
  "Chưa đọc được bảng giá" thay vì trừ Lượng ở một mức người dùng chưa từng thấy
  (hộp thoại xác nhận đã bỏ ở #366 nên số trên nút là thứ cuối cùng họ đọc).
- **Chỉ `admin.html` được fetch thẳng** hai bảng đó — nó là trang SỬA giá.
- `npm run check:prices` (chạy trong CI lint) chặn tái phát: chép số vào ô giá,
  hoặc tự fetch bảng giá. Bộ dò đã được KIỂM bằng cách tái tạo đúng hai lỗi cũ.
- **Vì sao gắt thế:** cùng một bệnh tái đi tái lại trong MỘT ngày — `/app` quảng
  cáo Luận Giải 150 khi trừ 25 · nút Diện Tướng ghi 5 mà trừ 8 · trang nạp hứa
  "64 lá số" khi mua được 16 · 9/10 trang `/tools/*` ghi sai (Phong Thủy 90 vs
  50, Xem Tuổi 50 vs 15) · và bản dự phòng trôi lại ngay trong PR đi sửa nó.
  Một con số CŨ nguy hiểm hơn hẳn một ô đang tải: ô đang tải thì người ta chờ,
  số cũ thì người ta tin.
- ⚠️ CỐ Ý không gom quà đăng ký / thưởng giới thiệu vào đây — chúng đến từ
  `app_config`, khác nguồn. Nhét chung vào bộ dò thì nó kêu suốt rồi bị tắt.

## Giá trị 1 Lượng: SUY TỪ BẢNG GÓI, không còn hằng số neo

**⚠️ `app_config['credits.vnd_per_credit']` ĐÃ BỊ GỠ** — đừng viết code đọc lại
khoá đó. Nguồn thật giờ là bảng `credit_packages`: đơn giá = **gói bậc hai**
(theo `sort_order`, tức mức phổ thông) = 399.000/600 = **665đ** (tăng giá
2026-08-30, xem `_patches/migration-credit-packages-reprice-2026-08.sql` —
trước đó là 199.000/240 = 829đ). Hai nơi cài CÙNG một quy tắc, phải sửa kèm
nhau:
- SQL `credit_vnd()` — cho các RPC báo cáo.
- `lib/billing/packages.ts` `vndPerCredit()` — cho route/rail. **Tự tính, KHÔNG
  gọi RPC** (rail là đường nóng), đổi lại phải giữ đúng cùng quy tắc.
- `lib/billing/packages.ts` `FALLBACK` — bản dự phòng khi DB đọc hụt, PHẢI
  đổi theo `credit_packages` mỗi lần sửa giá gói, nếu không rơi về fallback
  đúng lúc là tính tiền/cấp Lượng theo giá CŨ trong khi client đã hiện giá MỚI.

**Vì sao ghi hẳn cảnh báo:** đọc khoá đã chết KHÔNG ném lỗi, nó im lặng rơi về
mặc định `1000` trong khi giá thật là 665 (hoặc 829 tuỳ đợt giá) — sai hàng
chục % trên đúng con số đang hiện cho người dùng, và không có gì báo. Đã dính
đúng một lần.

**Ngoại lệ cố ý:** `coalesce(amount_vnd, amount * 2500)` cho dòng **topup lịch
sử** giữ nguyên 2500 — các giao dịch đó thật sự đã bán ở giá cũ, đổi là viết lại
lịch sử. Xem `_patches/migration-pricing-v2.sql`.

## Dùng thử rail cho khách CHƯA đăng nhập — cầu dao 3 lớp

`/api/v1/chat` KHÔNG còn 401 cứng khi thiếu token: khách vô danh được vài câu
dùng thử (`lib/billing/anon-trial.ts` + RPC `anon_rail_trial_consume`).
- **3 trần độc lập**, mỗi cái bịt một đường lách: `anon.rail_trial_turns` (trần
  ĐỜI theo `anon_id`) · `anon.rail_ip_daily_cap` (bịt xoá-localStorage, phải NỚI
  vì NAT nhà mạng) · `anon.rail_global_daily_cap` (cầu dao ngân sách).
  **Đặt bất kỳ trần nào = 0 là TẮT hẳn.**
- **Fail-CLOSED** — ngược `viral-budget.ts` (fail-OPEN) và ngược có lý do: cầu
  dao ảnh gác người ĐÃ TRẢ TIỀN, còn đây là khách vô danh chưa trả gì.
- **`client.anon_id` KHÔNG phải danh tính** — client tự khai. Đừng dùng cho
  quyền hạn/tính phí. Trần theo IP + toàn hệ thống mới là lớp chống lạm dụng.
- **Lượt anon CHẶN ảnh** (ảnh đội input token lên nhiều lần mà trần đếm theo
  LƯỢT) và **tiêu quota ngay khi cấp phép**, không đợi model xong — đếm sau khi
  thành công là mở đường gọi model rồi ngắt kết nối để khỏi bị tính.

## Guest checkout (Supabase Anonymous Sign-ins) — MỌI thưởng phải chặn `is_anonymous`

`requireCredits()` (`public/tuvi-paywall.js`) tự mở một phiên **ẩn danh** (âm
thầm, không hỏi gì — `Auth.signInAnonymously()`) cho khách CHƯA đăng nhập bấm
unlock, thay vì chặn bằng modal đăng ký. Phiên này là user **THẬT** trong
`auth.users` (`is_anonymous=true`), dùng được với mọi RPC/route hiện có; "Lưu
tài khoản" (`Auth.claimAccount()`) nâng cấp TẠI CHỖ cùng `user_id` — không
phải hợp nhất 2 tài khoản. Đây KHÁC hẳn `anon-trial.ts` ở trên (đó là
`anon_id` phía marketing cho vài câu chat miễn phí; đây là danh tính Auth thật
dùng để mua hàng) — đừng lẫn hai khái niệm "ẩn danh".

⚠️ **Vì tạo được bằng cách xoá cookie (không cần email/OTP), MỌI đường phát
thưởng phải tự kiểm `user.is_anonymous` trước khi cấp — thiếu một chỗ là cày
vô hạn.** Đã chặn ở `handle_new_user_signup()` (trigger quà chào mừng 20-40
Lượng), `handleOnboardingSync`, `handleReferralRegister`, `handlePromoRedeem`
(`app/api/payment/route.ts`). Thêm đường thưởng mới → nhớ thêm chốt này.
Xem `_patches/migration-anon-checkout-no-signup-bonus.sql`.

## Vì sao của từng dòng trong bảng LUẬT CỨNG (đường tiền)

- **Slug thanh toán PHẢI bắt đầu bằng đúng `tool_id`** — được dài hơn, CẤM ngắn
  hơn. `hasRecentToolPayment` lọc `slug=like.<tool_id>*`; slug ngắn hơn ⇒ lưới an
  toàn chết ⇒ trừ tiền xong vẫn 402 ⇒ user bấm lại ⇒ **trừ lần hai**.
  `nhat-ky/2026-08.md` "Duyên Nợ trừ tiền HAI LẦN".
- **Mọi GET Supabase phải `cache:'no-store'`** — Next bọc `fetch` toàn cục và
  nhớ kết quả kể cả khi `dynamic='force-dynamic'`. Đã cắn **3 lần**: bản chia sẻ
  đã gỡ vẫn render · bộ giám sát báo job "CHƯA HỀ chạy" · trừ tiền xong vẫn 402.
- **Chốt thanh toán đặt TRƯỚC bước tính/gọi model** — đặt sau là thu tiền rồi
  mới từ chối (mục "Hướng Nghiệp Sớm Cho Con").
- **Hoàn tiền qua RPC `add_credits`**, KHÔNG sửa thẳng `user_credits.balance` —
  sổ giao dịch phải giải thích được số dư (mục "Vận Hạn 12 Tháng").
- **Trần/cầu dao ngân sách hướng fail phải ngược nhau tuỳ vai** — gác NGÂN SÁCH
  → fail-**open** (`viral-budget.ts`); PHÁT tiền → fail-**closed**
  (`onboarding/tasks.ts`). Mục "M3 — Nhiệm vụ onboarding".
- **Chống trùng: dòng SỔ đi TRƯỚC làm mutex, cộng tiền SAU** — và mutex chỉ có
  thật khi có UNIQUE đỡ bên dưới. `Prefer: resolution=ignore-duplicates` KHÔNG
  làm gì nếu thiếu ràng buộc UNIQUE — đã im lặng vô hiệu từ đầu trên
  `paypal_order_id`. Và cộng tiền trước rồi ghi sổ sau thì lượt thua cuộc VẪN
  kịp cộng, chỉ trượt ở bước ghi ⇒ ví tăng hai lần, sổ một dòng.
  `paypal_settle_topup` · `bank_settle_topup` · `nhat-ky/2026-08.md` "Chuyển
  PayPal sang account công ty".
- **Chuỗi khai với cổng thanh toán và chuỗi bảo khách ghi phải là MỘT** — server
  quyết, client chỉ hiện lại. Hai nguồn cho cùng một đơn thì cái khách đọc không
  phải cái cổng biết. Sống sót được tới giờ chỉ vì PayOS khớp bằng SỐ TÀI KHOẢN
  ẢO; kênh nào khớp bằng nội dung CK là khách gõ đúng theo màn hình mà tiền
  không ai nhận. `handleCreateBank` trả `description` · `nhat-ky/2026-08.md`
  "Chốt đơn chuyển khoản nguyên tử".
- **Lỗi cổng thanh toán có HAI người đọc — đừng đưa cùng một chuỗi cho cả hai.**
  `message` của PayPal là MỘT câu chung chung cho mọi lỗi 422; lý do thật ở
  `details[0].issue` (+ `debug_id`). Nhưng trả thẳng `INSTRUMENT_DECLINED` cho
  khách cũng vô dụng ngang. Khách → câu tiếng Việt nói làm gì tiếp; mình → mã
  lỗi trong `console.error`. Đã trả giá: một lượt nạp hỏng vì thẻ hết tiền mà
  chính chủ site phải đi dò số dư mới hiểu. `humanIssueMessage()` ·
  `nhat-ky/2026-08.md` "PayPal live lượt đầu".

## 💾 Cache kết quả

- **Đổi CẤU TRÚC payload ⇒ BẮT BUỘC bump `SHAPE`.** `portrait_cache` khoá theo
  LÁ SỐ chứ không theo shape → dòng cũ được trả nguyên trạng **mãi mãi**, khối
  mới im lặng biến mất. Đã cắn **2 lần** (`day-con`, `huong-nghiep-tre`).
  Đổi CHỮ thì không cần bump. `npm run check:cacheshape`.
- **`cacheFor(toolId, shape)` là cửa DUY NHẤT** vào `portrait_cache`; 4 hàm cũ đã
  gỡ khỏi export. `_shape` **KHÔNG được vào `lasoKey`** — đổi khoá là mồ côi cả
  cache lẫn quyền sở hữu ⇒ người đã trả tiền bị tính lại.
- `free` phải xét **`cachedRaw`** (bản thô), không xét bản đã lọc.
- 5 tool chưa có `SHAPE` riêng đang ở mức 1 — lượt đổi payload đầu tiên phải bump.
