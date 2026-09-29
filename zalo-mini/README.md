# Zalo Mini App — Tử Vi Minh Bảo

Vỏ mỏng chạy trong Zalo: **không tính gì ở client**, mọi số liệu lấy từ API của
web (`tuviminhbao.com`). Tách hẳn khỏi app Next.js ở gốc — lint/tsconfig/prettier
của gốc bỏ qua thư mục này (giống `remotion/`, `tuvi-engine/`).

## Có gì

| Tab | Gọi API | Ghi chú |
|---|---|---|
| **Hôm nay** | `GET/POST /api/van-ngay` | Miễn phí. Có "lá số của tôi" thì thêm tầng cá nhân (cung nhật hạn). |
| **Hỏi Thầy** | `POST /api/v1/chat` (SSE, `historyMode:'delta'`) | Tính Lượng y như web. Đổi người được hỏi ⇒ phiên mới. |
| **Công cụ** | `/api/v1/catalog` · `/api/channels/handoff/new` | Giá do server tính (VNĐ chính). Bấm ⇒ mở trang web của công cụ trong webview Zalo, đã đăng nhập + nạp sẵn "lá số của tôi". |
| **Sổ lá số** | `/api/charts` (GET/POST/DELETE) | Cùng bảng `user_charts` với web — lưu bên nào cũng hiện bên kia. |

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

Deploy: `npx zmp-cli login` rồi `npm run deploy` (cần App ID Mini App).

## Việc tay trước khi chạy thật

1. Tạo Mini App trên Zalo Developers, liên kết với OA.
2. Vercel: đặt `ZALO_MINI_APP_SECRET` = App Secret của Zalo App chứa Mini App
   (bỏ trống nếu cùng app với OA — route dùng `ZALO_APP_SECRET`).
3. Khai **domain được phép gọi** trong cấu hình Mini App: `tuviminhbao.com` và
   `dciwkfdqhhddeymlisey.supabase.co`. Thiếu là mọi `fetch` bị Zalo chặn.
4. Thử trên máy thật: đăng nhập có gộp được với tài khoản đã nhắn OA không
   (server log `[zalo-mini] API OA không trả user_id_by_app` nghĩa là không).
