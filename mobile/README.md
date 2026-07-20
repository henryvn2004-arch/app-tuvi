# tuvi-mobile — vỏ native (Capacitor)

Vỏ **Android/iOS** cho Luận Đường. Thiết kế **thin shell**: app tải thẳng
`https://www.tuviminhbao.com/app` (đặt trong `capacitor.config.json` →
`server.url`). Nghĩa là **sửa web = app đổi ngay**, không cần build lại / nộp
store lại (trừ khi đổi phần native: icon, quyền, push, IAP).

> Thư mục này **tách biệt** app Next.js ở gốc repo — có `package.json`,
> `node_modules` riêng, **không đụng** tới build/CI của web.

## Dựng lần đầu (cần Node + Android Studio; iOS cần thêm máy Mac + Xcode)

```bash
cd mobile
npm install
npx cap add android      # sinh thư mục android/
npx cap add ios          # sinh thư mục ios/ (chỉ chạy được trên macOS)
npx cap sync             # đồng bộ config + plugin vào native
```

- **Android:** `npx cap open android` → Android Studio → gắn `google-services.json`
  (từ Firebase) vào `android/app/` → Run.
- **iOS:** `npx cap open ios` → Xcode → chọn Team, bật capability **Push
  Notifications** + **Background Modes › Remote notifications** → Run.

## Lý do làm native (thay vì chỉ PWA)
**Push notification thật.** Web push trên iOS gần như vô dụng (chỉ chạy khi
user "Add to Home Screen"). Native = push mỗi sáng "Vận hôm nay" → động cơ giữ
chân số 1.

## Các bước còn lại
Xem **`../docs/NATIVE-APP-SETUP.md`** — checklist tài khoản/credentials phải
có + phần code push (web glue + backend + cron) làm sau khi có Firebase.
