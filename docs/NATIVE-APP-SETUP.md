# App Native (Android + iOS) — Kế hoạch & Checklist

> Hướng đã chốt: **Route A — Capacitor + push thật (APNs/FCM)**. Android trước,
> iOS sau (hợp thị trường VN + Play Store thoáng hơn). Ưu tiên #1: **discovery**.

## 1. Kiến trúc (vì sao rẻ)

App là **thin shell**: tải thẳng `https://www.tuviminhbao.com/app` qua
`mobile/capacitor.config.json`. Cùng "một bộ não" server + engine đã có.

| Tầng | Sửa 1 chỗ → cập nhật đâu | Cần build/nộp store lại? |
|---|---|---|
| Nội dung, logic, giá, AI (server) | Web + mọi bot + app | ❌ Không |
| Giao diện (`public/*`, shell) | Web + app (vì app tải web) | ❌ Không |
| Vỏ native (push, icon, quyền, IAP) | Chỉ app | ✅ Có |

→ 90% việc thường ngày **không** cần đụng store. Chỉ phần push/icon/IAP mới cần.

## 2. ⚠️ Việc CHỈ Henry làm được (mua/đăng ký trước) — critical path

Đây là nút cổ chai thật của route A. Code đã sẵn sàng chờ mấy thứ này:

- [ ] **Google Play Console** — 25 USD một lần. (Android — ưu tiên #1.)
- [ ] **Apple Developer Program** — 99 USD/năm. (iOS + APNs. Làm sau cũng được.)
- [ ] **Firebase project** (miễn phí) — lấy **FCM** để gửi push Android; tải
      `google-services.json`. (Firebase cũng cầu nối được APNs cho iOS.)
- [ ] **Máy Mac + Xcode** — bắt buộc để build **iOS**. Android build được trên
      Linux/Windows bằng Android Studio. (Không có Mac → dùng dịch vụ build cloud
      như Codemagic/EAS, tính sau.)
- [ ] **APNs Auth Key (.p8)** từ Apple Developer → Keys (chỉ cho iOS). Ghi lại
      **Key ID** + **Team ID**.
- [ ] Chốt **App ID / Bundle ID**: hiện đặt `com.tuviminhbao.app` (đổi được).

> Sandbox của Claude là Linux, **không** build/test được app native (không có
> Xcode/Android Studio). Phần build + test push phải chạy trên máy Henry.

## 3. Dựng app (sau khi có mục 2)

```bash
cd mobile
npm install
npx cap add android
npx cap add ios          # chỉ trên macOS
npx cap sync
```
- Android Studio: gắn `google-services.json` vào `android/app/` → Run thử trên
  máy thật (emulator không nhận push).
- Xcode: bật capability **Push Notifications** + **Background Modes › Remote
  notifications**; nạp APNs key lên Firebase (Cloud Messaging → Apple app config).

## 4. Phần CODE push

### ✅ ĐÃ XONG (không cần Firebase, đã verify) — trong PR native
1. **Web glue đăng ký push** — nằm trong `public/shell.js` (`registerNativePush()`,
   gọi lúc boot). **TRƠ** ở trình duyệt thường; trong app native: xin quyền → lấy
   device token → `POST /api/push/register`. (Verify Playwright: browser thường
   không gọi; giả lập `window.Capacitor` → POST token đúng.)
2. **Endpoint lưu token** — `app/api/push/register/route.ts`: upsert token vào
   `push_tokens` (gắn user nếu có Bearer). Dùng `SUPABASE_SERVICE_KEY` sẵn có.
3. **Bảng** — `_patches/migration-push-tokens.sql` (Henry chạy trong Supabase).

### ⏳ CÒN LẠI (Claude làm sau khi có Firebase + 1 device token thật để test)
4. **Cron gửi sáng** `POST /api/cron/daily-push` + `vercel.json` cron (~0h UTC =
   7h VN): đọc `push_tokens` → tính **Vận hôm nay** (dùng `HoangDaoTool`/engine,
   đúng nguồn với thẻ web) → gửi FCM. Cá nhân hoá nếu token có `birth`.
   - **Env cần** (Vercel): `FIREBASE_SERVICE_ACCOUNT` (JSON service account, để
     gửi FCM v1). iOS đi qua Firebase→APNs nên không cần .p8 trực tiếp.
   - Để sau vì gửi FCM cần verify đầu-cuối bằng máy thật — không ship mù.

**Kiểm tra nhanh khi Henry build xong (trước cả bước 4):** cài app → mở → vào
Supabase xem bảng `push_tokens` có dòng token mới không. Có = luồng đăng ký chạy
đúng; lúc đó mới làm bước 4 (gửi).

Nội dung push: *"Vận hôm nay đã sẵn sàng ☾ — Ngày <can chi>, giờ đẹp <…>. Chạm
để xem."* Deterministic, không bịa số — **giữ nguyên** nguyên tắc engine.

## 5. Ghi chú App Store / Play

- **Apple guideline 4.2** (minimum functionality): app "chỉ là web bọc" dễ bị
  soi. Có **push + splash native** + (tùy chọn) vài màn native giảm rủi ro.
  Đây là lý do ra **Android trước** (Play thoáng hơn), iOS sau khi app dày dặn.
- **IAP 30%** (đã chấp nhận): bán Lượng trong app iOS phải qua Apple IAP. Wiring
  IAP là một mảng riêng, làm sau khi app chạy + push ổn.

## 6. Sau khi ship

- **OTA update** (Capacitor Live Update / Capgo): đẩy sửa UI xuống app không cần
  nộp store lại — cộng hưởng với thin-shell (thực ra thin-shell đã tự cập nhật
  vì tải web prod; OTA cần khi chuyển sang bundle assets).
- **ASO**: tên + ảnh store tiếng Việt (phục vụ discovery — ưu tiên #1).

## Thứ tự đề xuất
1. Henry: mở **Google Play Console** + **Firebase project** (Android trước).
2. Claude: viết web glue + backend + cron push (khi có Firebase để test).
3. Test push Android trên máy thật → chỉnh.
4. Henry: **Apple Developer** + Mac/Xcode → thêm iOS.
5. IAP + ASO + phát hành.
