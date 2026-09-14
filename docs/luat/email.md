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

## Việc tay Henry (chưa làm thì infra này chưa gửi được gì thật)

1. Tạo tài khoản Resend, verify domain `tuviminhbao.com` (thêm DNS record
   SPF/DKIM/DMARC Resend cấp).
2. Tạo 2 subdomain gửi trong Resend: `mail.` và `tin.`.
3. Set env Vercel: `RESEND_API_KEY`, `EMAIL_UNSUB_SECRET` (chuỗi bí mật bất kỳ,
   dùng để ký link huỷ — KHÔNG dùng chung với secret khác).
   Tuỳ chọn: `EMAIL_FROM_TRANSACTIONAL`, `EMAIL_FROM_MARKETING`, `SITE_URL`
   (mặc định đã hợp lý, chỉ cần set nếu muốn đổi tên hiển thị người gửi).
4. Supabase Dashboard → Authentication → SMTP Settings: cắm SMTP relay của
   Resend (Resend cấp host/port/user/pass riêng cho SMTP, khác API key) — đây
   là đường OTP đăng ký đi, KHÔNG qua `lib/email/send.ts`.

## Chưa làm (cố ý, chờ Henry quyết cụ thể)

- Chưa có cron/trigger nào gọi `sendMarketingEmail` — bảng + gateway đã sẵn,
  nhưng nội dung/điều kiện cross-sell/reminder cụ thể (gửi lúc nào, cho ai,
  template gì) chưa được chốt nên chưa viết job. Thêm job mới thì nhớ ghi vào
  `lib/ops/jobs.ts` (sổ job) theo đúng quy ước sẵn có.
- Chưa có template hoá đơn/PDF luận giải cụ thể — `sendTransactionalEmail`
  nhận thẳng `html`, ai gọi tự dựng nội dung; chưa tách file template riêng vì
  chưa có tool nào gọi thật.
