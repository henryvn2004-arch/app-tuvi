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
| PDF luận giải | Nút "Gửi PDF qua email" (`public/luan-giai.html`) | `app/api/luan-giai/email-pdf` → `lib/pdf/luan-giai.tsx` (react-pdf, KHÔNG Puppeteer) → `sendTransactionalEmail` (đính kèm) | Theo yêu cầu user |
| Reminder (còn Lượng, idle) | Cron tuần `email-reminder-idle` | `lib/marketing/email-reminder.ts` — dùng lại RPC `dashboard_at_risk` | **TẮT** — `app_config['marketing.email_reminder_idle'].enabledBudgetPerRun` = 0 |
| Cross-sell (tool liên quan) | Cron tuần `email-cross-sell` | `lib/marketing/email-cross-sell.ts` — RPC `cross_sell_candidates` (cặp tool tay chọn) | **TẮT** — `app_config['marketing.email_cross_sell'].enabledBudgetPerRun` = 0 |
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

## Broadcast email — vì sao TÁCH nạp/gửi qua hàng đợi

`app/api/payment` có `maxDuration=30s`. Gửi thẳng cho hàng nghìn user trong
MỘT request chắc chắn timeout giữa chừng — sổ `email_log` ghi `pending` cho
phần dở dang mà không ai chốt lại được. Route admin chỉ NẠP
`email_broadcast_queue` (snapshot email lúc bấm gửi — user đăng ký SAU không
nhận được, CỐ Ý: một chiến dịch cần tập nhận cố định để đếm "đã gửi/còn lại"
có nghĩa), cron `email-broadcast-drain` mới thật sự gửi, 200 người/lượt, mỗi
15 phút. Xem `_patches/migration-email-broadcast-queue.sql`.
