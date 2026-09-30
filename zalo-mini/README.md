# Zalo Mini App — Tử Vi Minh Bảo

Vỏ mỏng chạy trong Zalo: **không tính gì ở client**, mọi số liệu lấy từ API của
web (`tuviminhbao.com`). Tách hẳn khỏi app Next.js ở gốc — lint/tsconfig/prettier
của gốc bỏ qua thư mục này (giống `remotion/`, `tuvi-engine/`).

## Có gì

| Tab | Gọi API | Ghi chú |
|---|---|---|
| **Hôm nay** | `GET/POST /api/van-ngay` | Miễn phí. Có "lá số của tôi" thì thêm tầng cá nhân (cung nhật hạn). |
| **Hỏi Thầy** | `POST /api/v1/chat` (SSE, `historyMode:'delta'`) | Tính Lượng y như web. Đổi người được hỏi ⇒ phiên mới. Nút máy ảnh: chụp/chọn ảnh (tướng mặt, chỉ tay, nhà cửa) gửi kèm. |
| **Công cụ** | — (tính ngay trong app) | Kinh Dịch, Kim Lâu, Bát Trạch, Nạp Âm, Sinh Con, Thần Số Học chạy bằng CHÍNH `public/tools-shared/*.js` của web, CSS kết quả đọc lúc build từ `public/app-<trang>.html` (`web-tools-vite.mts`). Bấm "Hỏi Thầy…" ⇒ tab Hỏi Thầy kèm `scenario` như rail web. KHÔNG mở trang web. |
| **Của tôi** | `/api/payment?action=balance` · `/api/reports` · `/api/channels/zalo-mini/link-email` | Số dư (dùng chung web), đọc lại báo cáo đã có, **gộp tài khoản web** (email + mã 6 số, cùng luồng `lib/channels/email-link.ts` của kênh chat). KHÔNG bán gói nạp. |
| **Sổ lá số** | `/api/charts` (GET/POST/DELETE) · `/api/v1/laso-image` | Cùng bảng `user_charts` với web — lưu bên nào cũng hiện bên kia. Ảnh lá số: lưu về máy, chia sẻ vào chat Zalo. |

Đăng nhập: `getAccessToken()` → `POST /api/channels/zalo-mini/login` → `tokenHash`
→ Supabase `/auth/v1/verify` → phiên Supabase (`src/lib/session.ts`). Có phiên rồi
thì gọi API web bằng `Authorization: Bearer` như trình duyệt.

"Lá số của tôi" chỉ là id ghi nhớ trên máy (`nativeStorage`), giống web giữ
`app_birth` ở localStorage.

## Chính sách Zalo định hình app (đọc trước khi thêm tính năng)

Duyệt Mini App từ chối: **nạp tiền vào ví/tài khoản trong app** (Lượng là ví nội bộ)
và **dẫn người dùng ra website ngoài** (chỉ trang chính sách/điều khoản được mở).
Nên Mini App chỉ HIỆN + TIÊU số dư chung, không có nút nạp, không `openWebview`
sang trang công cụ. Công cụ muốn có trong app thì phải chạy trong app (xem tab
Công cụ). Bán trong app (nếu cần) phải qua Zalo Checkout SDK — chưa làm.

Web sửa `public/tools-shared/*.js` hay CSS kết quả của các trang công cụ trên ⇒
build + deploy lại Mini App mới có bản mới (code đóng gói lúc build).

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
npm run deploy       # deploy.mjs: vite build rồi đẩy www/ · hỏi Development (ghi đè) hay Testing (có số, gửi duyệt)
npm run deploy -- -p -m "mô tả"   # không hỏi gì, đẩy bản Development
```

Deploy xong CLI in QR + link `https://zalo.me/s/685441626982830157/?env=DEVELOPMENT&version=zdev-…`
— mỗi lần deploy Development ra `version` MỚI, link cũ không còn đúng bản.

`zmp login` ghi `APP_ID` + `ZMP_TOKEN` vào `zalo-mini/.env` — file đó đã bị
`.gitignore`, **không commit** (token là khoá deploy).

## Trạm chuyển tiếp ở Việt Nam (BẮT BUỘC cho đăng nhập)

Zalo trả `-501` ("IP address not inside Vietnam") khi server đọc id người dùng
(`graph.zalo.me/v2.0/me`) từ IP ngoài VN. Vercel chạy ở Mỹ ⇒ phải đi qua trạm Caddy
trên VPS VN (FastByte, IP `103.195.237.45`, 59k/tháng, gia hạn hằng tháng):

- Cài/cài lại: `scripts/zalo-relay-setup.sh` (đầu file có lệnh một dòng).
- Vercel: `ZALO_GRAPH_RELAY_URL=https://103-195-237-45.sslip.io` +
  `ZALO_GRAPH_RELAY_KEY` (khớp khoá truyền cho script). Thiếu hai biến ⇒ gọi thẳng
  graph.zalo.me ⇒ `-501`.
- VPS hết hạn / đổi IP ⇒ đăng nhập Mini App chết, câu lỗi hiện `(trạm HTTP …)` hoặc
  `(lỗi mạng tới Zalo)`.

## Việc tay trước khi chạy thật

1. ~~Tạo Mini App~~ — đã tạo 2026-09-29, ID `685441626982830157`, dưới **Zalo App cũ
   của OA**. Việc còn lại: xác thực chủ sở hữu (bắt buộc trước khi gửi duyệt,
   3–5 ngày làm việc) · xin quyền **camera** ở Mini App Center → Quyền Mini App.
2. Vercel: **để trống** `ZALO_MINI_APP_SECRET` — Mini App nằm cùng Zalo App với OA
   nên route dùng `ZALO_APP_SECRET`. Chỉ đặt nếu sau này dời sang Zalo App khác.
3. Khai **domain được phép gọi** trong cấu hình Mini App: `www.tuviminhbao.com` (KHÔNG apex — apex 307 sang www, không kèm CORS) và
   `dciwkfdqhhddeymlisey.supabase.co`. Thiếu là mọi `fetch` bị Zalo chặn.
4. Thử trên máy thật: đăng nhập có gộp được với tài khoản đã nhắn OA không
   (server log `[zalo-mini] API OA không trả user_id_by_app` nghĩa là không).
