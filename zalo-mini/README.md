# Zalo Mini App — Tử Vi Minh Bảo

Vỏ mỏng chạy trong Zalo: **không tính gì ở client**, mọi số liệu lấy từ API của
web (`tuviminhbao.com`). Tách hẳn khỏi app Next.js ở gốc — lint/tsconfig/prettier
của gốc bỏ qua thư mục này (giống `remotion/`, `tuvi-engine/`).

## Có gì

| Tab | Gọi API | Ghi chú |
|---|---|---|
| **Hôm nay** | `GET/POST /api/van-ngay` | Miễn phí. Có "lá số của tôi" thì thêm tầng cá nhân (cung nhật hạn). |
| **Hỏi Thầy** | `POST /api/v1/chat` (SSE, `historyMode:'delta'`) | Tính Lượng y như web. Đổi người được hỏi ⇒ phiên mới. Nút máy ảnh: chụp/chọn ảnh (tướng mặt, chỉ tay, nhà cửa) gửi kèm. |
| **Công cụ** | `/api/v1/catalog` · `/api/channels/handoff/new` | Giá do server tính (VNĐ chính). Bấm ⇒ mở trang web của công cụ trong webview Zalo, đã đăng nhập + nạp sẵn "lá số của tôi". |
| **Của tôi** | `/api/payment` (balance · create-bank · check-bank) · `credit_packages` · `/api/reports` | Số dư, nạp Lượng qua link payOS (chờ webhook báo đã trả), đọc lại báo cáo đã có. |
| **Sổ lá số** | `/api/charts` (GET/POST/DELETE) · `/api/v1/laso-image` | Cùng bảng `user_charts` với web — lưu bên nào cũng hiện bên kia. Ảnh lá số: lưu về máy, chia sẻ vào chat Zalo. |

Đăng nhập: `getAccessToken()` → `POST /api/channels/zalo-mini/login` → `tokenHash`
→ Supabase `/auth/v1/verify` → phiên Supabase (`src/lib/session.ts`). Có phiên rồi
thì gọi API web bằng `Authorization: Bearer` như trình duyệt.

"Lá số của tôi" chỉ là id ghi nhớ trên máy (`nativeStorage`), giống web giữ
`app_birth` ở localStorage.

## Chạy / build

```bash
cd zalo-mini
npm ci
npm run typecheck
npm run build        # ra www/ (zmp-vite-plugin sinh www/app-config.json)
npm run dev          # xem trên trình duyệt; API Zalo không có ⇒ nativeStorage lùi về localStorage
```

Deploy (Mini App ID `685441626982830157`, gắn vào Zalo App cũ của OA):

```bash
npm run login        # zmp login --app-id …; quét QR bằng Zalo tài khoản Admin/Developer
npm run deploy       # Development = ghi đè, thử nhanh · Testing (-t) = có số, gửi duyệt được
```

`zmp login` ghi `APP_ID` + `ZMP_TOKEN` vào `zalo-mini/.env` — file đó đã bị
`.gitignore`, **không commit** (token là khoá deploy).

## Việc tay trước khi chạy thật

1. ~~Tạo Mini App~~ — đã tạo 2026-09-29, ID `685441626982830157`, dưới **Zalo App cũ
   của OA**. Việc còn lại: xác thực chủ sở hữu (bắt buộc trước khi gửi duyệt,
   3–5 ngày làm việc) · xin quyền **camera** ở Mini App Center → Quyền Mini App.
2. Vercel: **để trống** `ZALO_MINI_APP_SECRET` — Mini App nằm cùng Zalo App với OA
   nên route dùng `ZALO_APP_SECRET`. Chỉ đặt nếu sau này dời sang Zalo App khác.
3. Khai **domain được phép gọi** trong cấu hình Mini App: `tuviminhbao.com` và
   `dciwkfdqhhddeymlisey.supabase.co`. Thiếu là mọi `fetch` bị Zalo chặn.
4. Thử trên máy thật: đăng nhập có gộp được với tài khoản đã nhắn OA không
   (server log `[zalo-mini] API OA không trả user_id_by_app` nghĩa là không).
