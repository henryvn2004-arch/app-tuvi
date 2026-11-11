# Email — hạ tầng gửi (Resend)

Henry chốt (2026-09-14), 3 điểm:
1. **Một nhà cung cấp duy nhất — Resend** — cho MỌI loại email (OTP, hoá đơn,
   PDF luận giải, reminder, cross-sell, broadcast). KHÔNG thêm nền tảng
   marketing automation ngoài (Brevo/HubSpot...): điều kiện trigger (đã mua gì,
   số dư Lượng, lịch sử dùng tool) nằm sẵn trong Postgres của mình — đẩy ra CRM
   ngoài rồi đồng bộ ngược là thêm một nguồn sự thật thứ hai, đúng thứ codebase
   này luôn phải vá (xem các luật "nguồn DUY NHẤT" khác trong `CLAUDE.md`).
2. **OTP đăng ký đi qua Supabase Auth custom SMTP**, không tự viết lại luồng
   OTP — GoTrue đã có sẵn rate-limit + template hook, tự làm lại là tự rước bug
   bảo mật không cần thiết.
3. **Bảng `email_log`/`email_unsubscribes` mới** — xem
   `_patches/migration-email-infra.sql`.

## Vì sao 2 subdomain gửi tách riêng

`mail.tuviminhbao.com` (transactional: OTP/hoá đơn/PDF) và
`tin.tuviminhbao.com` (marketing: reminder/cross-sell/broadcast) là HAI domain
gửi khác nhau trên cùng một tài khoản Resend. Uy tín gửi (deliverability) được
các ISP tính theo domain/IP — gộp chung một domain thì một đợt broadcast bị
report spam (chuyện bình thường với marketing) kéo theo OTP/hoá đơn rơi vào
thư rác của TẤT CẢ người dùng, kể cả người chưa từng nhận marketing.

⚠️ Ở gói Free/Pro của Resend, IP gửi vẫn là **IP dùng chung** (dedicated IP chỉ
có ở gói Scale) — tách subdomain vẫn có tác dụng thật (DKIM alignment theo
domain, một số ISP như Gmail đã tính domain reputation riêng), nhưng không cô
lập 100% cho tới khi lên gói có dedicated IP.

## Kiến trúc

- `lib/email/send.ts` — cửa DUY NHẤT gọi Resend. `sendTransactionalEmail()` và
  `sendMarketingEmail()`, không có đường nào khác được `import { Resend }`.
- Mutex chống gửi trùng: `dedupeKey` phải ổn định giữa các lần gọi lại (cron
  chạy lại, double-click...). Cơ chế y hệt chống trùng đường tiền — chèn dòng
  `email_log` (`UNIQUE(dedupe_key)`, `Prefer: ignore-duplicates,return=
  representation`) TRƯỚC, gọi Resend SAU. Mảng trả về rỗng = đã có người claim
  trước, bỏ qua. **KHÔNG được đổi `return=representation` thành `return=
  minimal`** — mất khả năng phân biệt "vừa chèn" với "bị bỏ qua vì trùng".
- `sendMarketingEmail()` tự kiểm `email_unsubscribes` (fail-**closed**: lỗi hạ
  tầng hoặc không xác định được → coi như đã unsubscribe, KHÔNG gửi) và tự
  chèn footer + link huỷ vào cuối `html` — nơi gọi không cần tự nhớ.
  `sendTransactionalEmail()` không qua bộ lọc này (đây là email người dùng chủ
  động yêu cầu, không phải quảng cáo).
- `lib/email/unsub-token.ts` — ký/xác thực token HMAC cho link huỷ (không cần
  đăng nhập để bấm huỷ). Cùng một nguồn cho cả nơi dựng link (`send.ts`) lẫn
  nơi xác thực (`app/api/email/unsubscribe/route.ts`).
- Thiếu `EMAIL_UNSUB_SECRET` → `sendMarketingEmail()` luôn trả `not_configured`
  (từ chối gửi) thay vì gửi thiếu link huỷ — vi phạm Nghị định 91/2020/NĐ-CP
  về quảng cáo qua email nếu thiếu cơ chế từ chối nhận.

## `resend` bị PIN CỨNG ở `6.27.0`, không dùng `^`

`resend@6.28.0` nâng yêu cầu Node lên `>=22.12.0`; mọi bản `6.x` từ `6.5.0` đến
`6.27.0` chỉ cần `>=20`. CI (`lint.yml`/`unit-test.yml`/`next-build.yml`) chạy
**Node 20** — để `^6.27.0` trong `package.json` thì lần `npm install` kế tiếp
âm thầm kéo `6.28.0` và cắn engine mismatch không ai báo trước khi CI đỏ. Nâng
version thì phải nâng Node CI cùng lúc, không chỉ đổi số trong `package.json`.

## Việc tay Henry — ĐÃ XONG (2026-09-14)

Resend account + verify domain + 2 subdomain (`mail.`/`tin.`) + `RESEND_API_KEY`
+ `EMAIL_UNSUB_SECRET` trên Vercel + SMTP Supabase Dashboard đều đã cắm, test
OTP thật đã nhận được (xem `docs/nhat-ky/2026-09.md`). Còn `EMAIL_FROM_TRANSACTIONAL`/
`EMAIL_FROM_MARKETING`/`SITE_URL` là tuỳ chọn, mặc định đã hợp lý.

## 6 loại email đang có — nguồn nào gọi, template ở đâu

| Loại | Trigger | Gọi qua | Mặc định |
|---|---|---|---|
| OTP/confirm signup | Supabase Auth (đăng ký) | SMTP Resend, KHÔNG qua `send.ts` | LUÔN bật |
| Hoá đơn nạp Lượng | `settlePayPalTopup` + `bank-webhook`, chokepoint `credited` | `lib/email/invoice.ts` → `sendTransactionalEmail` | LUÔN bật |
| PDF luận giải | Nút "Gửi email" (`public/tools-shared/report-delivery.js`, dùng chung cho `app-luan-giai.html`/`app-chu-trinh-cuoc-doi.html` — `public/luan-giai.html` đã RETIRE, xem `docs/nhat-ky/2026-09.md` "Retire /luan-giai.html") | `app/api/luan-giai/email-pdf` → `lib/pdf/luan-giai.tsx` (react-pdf, KHÔNG Puppeteer) → `sendTransactionalEmail` (đính kèm) | Theo yêu cầu user |
| Reminder (còn Lượng, idle) | Cron tuần `email-reminder-idle` | `lib/marketing/email-reminder.ts` — dùng lại RPC `dashboard_at_risk` | **TẮT** — `app_config['marketing.email_reminder_idle'].enabledBudgetPerRun` = 0 |
| Cross-sell (tool liên quan) | Cron `email-cross-sell` **T6 + CN** 08:00 VN | `lib/marketing/email-cross-sell.ts` — RPC `cross_sell_candidates` (cặp tool tay chọn); **tối đa 1 thư/người/lượt ⇒ 2 thư/tuần** | **BẬT** sau khi PR lên prod — `_patches/migration-email-cross-sell-on.sql` (budget 100/lượt) |
| Broadcast (admin soạn tay) | `admin.html` → `handleAdminChannelBroadcast` (platform=email) | Nạp `email_broadcast_queue`, cron `email-broadcast-drain` (mỗi 15 phút) rút dần | Sẵn sàng, admin bấm mới gửi |

Reminder/cross-sell khoá TẮT theo đúng khuôn công tắc của autopilot
(`lib/marketing/autopilot.ts`) — Henry tự bật bằng SQL/app_config sau khi coi
số liệu `candidates`/`sent` trả về từ vài lượt chạy `dry` (budget=0 vẫn tính
được `candidates`, chỉ không gửi thật).

## `@react-pdf/renderer` — vì sao phải `serverExternalPackages`

Package này dựng font chuẩn qua subpath import map
(`#standard-fonts/Helvetica`, khai trong `package.json` của nó) — bundler của
Next (esbuild/webpack đều vậy) KHÔNG resolve đúng map này khi *bundle* code
vào route, ném `Cannot find module '#standard-fonts/Helvetica'` lúc chạy.
Node tự resolve đúng (đọc thẳng `exports` trong `package.json`), nên
`next.config.mjs` khai `serverExternalPackages: ['@react-pdf/renderer']` để
Next ĐỂ NGOÀI bundle — route `require()`/`import` thẳng lúc chạy như Node gọi
trực tiếp. Đã xác minh bằng bản dựng PDF thật (không bundle) trước khi merge.

## Guest checkout không có email — vì sao mời "Lưu tài khoản" NGAY lúc thanh toán xong

Guest checkout (Supabase Anonymous Sign-ins qua `requireCredits()`, xem luật
ở `CLAUDE.md`/`docs/luat/tien.md`) cho phép thanh toán và giữ Lượng mà KHÔNG
có email nào trong `auth.users`. Hoá đơn/reminder/cross-sell/broadcast đều
đã có sẵn kiểm `if (!email) continue` để không crash, nhưng đó là bỏ qua ÂM
THẦM — khách mất hoá đơn, không có cách nào bị nhắc lại nếu xoá cookie.

Modal "Lưu tài khoản" (`showClaimModal`, `public/auth.js` — nhận `opts`
{title, desc, submitLabel, callback}, PUT `/auth/v1/user` nâng cấp tại chỗ,
giữ nguyên `user_id`/Lượng/lịch sử) đã có từ trước nhưng chỉ nằm THỤ ĐỘNG
trong dropdown menu nav. Từ 2026-09-15 (PR #890), bật CHỦ ĐỘNG thêm ở 2 điểm
thanh toán thành công của guest:
- `public/tuvi-paywall.js` `_qrPoll` — QR-tại-chỗ trong trang tool, đường
  guest checkout CHÍNH (không rời trang).
- `public/topup.html` `checkBankPoll` — guest ghé thẳng trang nạp; chỉ mời
  khi `resumeToTool()` trả `false` (không có tool đang chờ resume), vì có
  thì trang điều hướng đi trong 400ms, mời lúc đó chỉ chớp qua vô ích.

`public/tools-shared/report-delivery.js` (nút "Gửi email" ở PDF luận giải)
đã tự làm đúng việc này từ trước — mở `showClaimModal` với `callback` để tự
gửi báo cáo ngay sau khi claim xong, không cần khách bấm lại.

## Broadcast email — vì sao TÁCH nạp/gửi qua hàng đợi

`app/api/payment` có `maxDuration=30s`. Gửi thẳng cho hàng nghìn user trong
MỘT request chắc chắn timeout giữa chừng — sổ `email_log` ghi `pending` cho
phần dở dang mà không ai chốt lại được. Route admin chỉ NẠP
`email_broadcast_queue` (snapshot email lúc bấm gửi — user đăng ký SAU không
nhận được, CỐ Ý: một chiến dịch cần tập nhận cố định để đếm "đã gửi/còn lại"
có nghĩa), cron `email-broadcast-drain` mới thật sự gửi, 200 người/lượt, mỗi
15 phút. Xem `_patches/migration-email-broadcast-queue.sql`.

## Ngôn ngữ email (W11, 2026-11) — vì sao lưu DB mà không đọc cookie lúc gửi

Khách mới là người Nhật · Hàn · Đài · Trung · Anh, nên cả 6 loại email phải đi bằng ngôn ngữ họ.
- **Chữ ở MỘT chỗ: `lib/email/i18n.ts`.** Nơi gọi chỉ truyền dữ liệu (`renderInvoice` · `renderPdfMail` ·
  `renderReminder` · `renderAbandoned` · `renderCrossSell`), KHÔNG tự nối chuỗi. Gửi vẫn qua `send.ts`
  (mutex `email_log`, link huỷ, fail-closed không đổi) — `send.ts` chỉ nhận thêm `locale` để đặt tên
  người gửi (明宝/명보/明寶/Minh Bao, trừ khi env `EMAIL_FROM_*` đặt tay) và footer huỷ đăng ký.
- **zh-cn SINH từ zh-tw bằng OpenCC**, cùng luật W4: sửa khối `'zh-tw'` rồi chạy
  `node scripts/check-email-i18n.mjs --write`. `npm run check:emaili18n` (CI) bắt lệch, thiếu tham số
  (`{credits}`…), thiếu chữ cho cặp cross-sell mới, và chữ "AI".
- **Ngôn ngữ lưu ở bảng `user_locale`** (`_patches/migration-user-locale.sql`, CHƯA chạy prod), ghi bởi
  `saveUserLocale` từ cookie `tvmb_locale` ở hai khoảnh khắc khách còn ngồi trước máy: tạo đơn nạp
  (`app/api/payment` `topup`) và gửi PDF (`email-pdf`, `resend-pdf`). Hoá đơn đi từ WEBHOOK PayPal và
  reminder/cross-sell/broadcast đi từ cron — không có cookie — nên PHẢI đọc từ bảng (`getUserLocale(s)`).
  Thứ tự: bảng `user_locale` (ngôn ngữ dùng gần nhất lúc mua/gửi PDF) → `user_metadata.locale`
  (W4b gắn lúc signUp/claimAccount trong `auth.js`) → tiếng Việt. Metadata đọc qua GoTrue admin API, chỉ cho
  người chưa có dòng trong bảng.
- **Hoá đơn hiện USD** khi có `amountUsd` (PayPal truyền `paidUsd`, số tiền thật PayPal đã thu); webhook
  ngân hàng/MoMo cũ không có USD ⇒ vẫn VNĐ. Tên gói (tiếng Việt) chỉ hiện ở bản `vi`.
- **Broadcast: nội dung do admin soạn** — tự lo ngôn ngữ (soạn riêng từng bản, gửi riêng từng danh sách);
  `locale` chỉ đổi footer + người gửi + trang huỷ. Link huỷ mang `&lang=` (KHÔNG nằm trong chữ ký HMAC).
- **Link trang theo người nhận (W18):** `send.ts` chạy `localizeSiteLinks` (`lib/email/links.ts`) trên MỌI thư có
  `locale` ⇒ `href` tới trang tuviminhbao.com thành `/<locale>/…` — kể cả broadcast admin soạn và `viewUrl`. Để nguyên
  `/api/…` (link huỷ), file tĩnh, link đã có tiền tố. Mẫu mới vẫn nên dùng `siteUrl(locale, …)`.
- **PDF đính kèm (W18):** khung (bìa/mục lục/nhãn phần) theo `locale` của thư, font CJK/Hangul nhúng (`lib/pdf/`);
  văn luận là thứ đã sinh — resend-pdf đọc `laso_public.luan_giai` (chỉ tiếng Việt).
- **Chưa phủ:** `lib/channels/email-link.ts` (mã gộp tài khoản — thuộc kênh chat, ngoài phạm vi W11),
  OTP đăng ký (Supabase Auth — việc tay, xem bên dưới).

### Việc tay Henry — OTP đa ngôn ngữ (code không làm thay được)
OTP đi qua Supabase Auth custom SMTP nên không đổi được bằng code. Dashboard → Authentication → Emails
→ Templates: Supabase chỉ có MỘT mẫu cho mỗi loại thư (Confirm signup, Magic link, Reset password…) — không có
mẫu theo ngôn ngữ. Hai cách: (a) viết mẫu SONG NGỮ một khối (tiếng Anh ở trên, 日本語/한국어/繁體中文 bên dưới,
mã `{{ .Token }}` dùng chung) — làm được ngay, không đổi code; (b) truyền ngôn ngữ vào `data` lúc `signUp`
(`options.data.locale`) rồi dùng `{{ if eq .Data.locale "ja" }}…{{ end }}` trong mẫu — cần sửa `public/auth.js`
(vùng W4) và bump `auth.js?v=` ở mọi trang. Khuyến nghị (a) trước, (b) khi đã có khách thật đăng ký.
Đặt tên người gửi SMTP (Sender name) là "Tử Vi Minh Bảo · 明宝 · 명보" cho hợp mọi ngôn ngữ.
