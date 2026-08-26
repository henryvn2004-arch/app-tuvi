# Cấp token TikTok cho đường đăng clip

Trang này chỉ nói về **token**. Ba điều kiện của TikTok (quyền `video.publish`,
xác minh miền, token) độc lập nhau — làm xong token mà chưa verify miền thì vẫn
không đăng được, và ngược lại. Xem `lib/media/publish.ts` (`publishTiktok`) cho
cả ba.

---

## 🔴 Vì sao TikTok phải làm khác YouTube và Facebook

| Nền tảng | Token | Cách giữ |
| --- | --- | --- |
| Facebook Page | **vĩnh viễn** | để yên trong env |
| YouTube | access 1h, **refresh CỐ ĐỊNH** | `YOUTUBE_REFRESH_TOKEN` trong env, dùng mãi |
| **TikTok** | access **24 giờ**, refresh **XOAY mỗi lượt làm mới** | phải LƯU ĐƯỢC lúc chạy ⇒ `app_config` |

🔑 Điểm khác biệt quyết định kiến trúc: **TikTok trả về một `refresh_token` MỚI
mỗi lần làm mới và vô hiệu hoá cái cũ.** Nên không thể để refresh token trong
env như YouTube — env không tự ghi lại được, lượt thứ hai sẽ gửi lên một chuỗi
đã chết. Cặp token vì thế nằm ở `app_config['tiktok.token']`, ghi bằng service
key (RLS của bảng đó chỉ cho admin đọc, client không chạm tới).

⚠️ **Chuỗi đứt là đứt hẳn.** Làm mới xong mà ghi không được thì cái cũ đã chết,
cái mới không ai giữ. Vì thế `lib/media/tiktok-token.ts` **ghi trước, dùng sau**,
và ghi hỏng thì báo lỗi to chứ không lặng lẽ dùng token trong bộ nhớ rồi để
ngày mai chết không rõ vì sao.

---

## Cấp lần đầu (việc tay, ~10 phút)

Chỉ phải làm **một lần**. Từ lượt sau hệ thống tự làm mới và tự lưu.

### 1. Lấy `client_key` + `client_secret`

TikTok Developer Portal → app của mình → **Manage apps** → phần *App details*.
Đặt lên Vercel:

```
TIKTOK_CLIENT_KEY=<client key>
TIKTOK_CLIENT_SECRET=<client secret>
```

⛔ Dán giá trị **THÔ** — không `;`, không dấu nháy, không xuống dòng, **mỗi biến
một dòng**. (Đã dính một lần với `PIXABAY_API_KEY`: hai khoá bị dán dính vào
nhau thành một dòng 89 ký tự.)

### 2. Khai `redirect_uri`

Trong cùng trang app, thêm một **Redirect URI**. Dùng gì cũng được miễn khớp
tuyệt đối ở cả hai bước dưới — kể cả một địa chỉ không có thật, vì mình chỉ cần
đọc tham số `code` trên thanh địa chỉ chứ không cần trang đó phản hồi:

```
https://www.tuviminhbao.com/tiktok-callback
```

### 3. Mở trang cho phép

Dán vào trình duyệt (thay `<CLIENT_KEY>`):

```
https://www.tiktok.com/v2/auth/authorize/
  ?client_key=<CLIENT_KEY>
  &scope=video.publish,video.upload
  &response_type=code
  &redirect_uri=https%3A%2F%2Fwww.tuviminhbao.com%2Ftiktok-callback
  &state=x
```

(Nối liền thành một dòng, bỏ hết xuống dòng.)

Đăng nhập bằng **đúng tài khoản TikTok sẽ đăng bài**. Cho phép xong, trình duyệt
nhảy tới `redirect_uri` kèm `?code=...` trên thanh địa chỉ. Trang có hiện 404
cũng không sao — **copy giá trị `code`**.

> 🪤 `code` sống rất ngắn (cỡ vài phút) và **chỉ dùng được MỘT lần**. Lỡ nhịp
> thì mở lại trang ở bước 3, đừng đi tìm nguyên nhân ở chỗ khác.

> 🪤 Nếu `code` có ký tự `%2A` hay `*` ở cuối thì giữ nguyên, đừng cắt.

### 4. Đổi `code` lấy `refresh_token`

```bash
curl -s -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_key=<CLIENT_KEY>' \
  --data-urlencode 'client_secret=<CLIENT_SECRET>' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'redirect_uri=https://www.tuviminhbao.com/tiktok-callback' \
  --data-urlencode 'code=<CODE>'
```

Trả về `{ access_token, refresh_token, expires_in, refresh_expires_in, ... }`.

### 5. Đặt mồi lên Vercel rồi Redeploy

```
TIKTOK_REFRESH_TOKEN=<refresh_token vừa nhận>
```

Xong. Lượt đăng đầu tiên sẽ dùng chuỗi này để làm mới, rồi **ghi cặp mới xuống
`app_config` và từ đó DB là nguồn duy nhất**. Sau lượt đó biến env này thành một
chuỗi chết — cứ để nguyên cũng không sao (code không đọc tới khi DB đã có), chỉ
đừng tưởng nó còn dùng được.

⛔ **Đừng gửi mấy giá trị này qua chat** — chat lưu lại, đúng lý do đã phải xoay
service key một lần.

---

## Kiểm sau khi đặt

Đợi lượt cron `media-build` (09:30 giờ VN) hoặc bấm **Chạy ngay** trong Admin.
Đọc bản tin Telegram:

| Thấy gì | Nghĩa là |
| --- | --- |
| Bài TikTok đăng được | xong |
| `Cửa chưa mở — … Thiếu env TIKTOK_CLIENT_KEY` | thiếu bước 1 |
| `Cửa chưa mở — … chưa có token` | thiếu bước 5 |
| `Cửa chưa mở — … invalid_grant` | chuỗi mồi sai/đã dùng — làm lại từ bước 3 |
| `url_ownership_unverified` | **không phải chuyện token** — xem mục dưới |

Mọi lỗi token đều mang tiền tố **`Cửa chưa mở`** ⇒ rơi vào nhóm CHẶN ⇒ dừng cả
kênh TikTok thay vì đánh hỏng từng bài. Đây là bài học từ kho YouTube: 84 dòng
`yt_error` giống hệt nhau là hậu quả của việc cứ thử mãi một cái cửa đã khoá.

---

## Hai thứ KHÔNG phải token (đừng đi sửa nhầm chỗ)

**`url_ownership_unverified`** — `PULL_FROM_URL` đòi miền chứa file phải được
xác minh sở hữu: Developer Portal → app → **URL properties** → thêm URL prefix
của host Supabase Storage (bucket `clips`) rồi làm bước xác minh. Cấp lại token
cho lỗi này là mất công vô ích.

**Quyền `video.publish` chưa duyệt** — trước khi TikTok duyệt, app ở chế độ
sandbox chỉ đăng được ở dạng **riêng tư** cho chính tài khoản dev. Token đúng
vẫn không ra bài công khai.

---

## Xoay token / đổi tài khoản

Làm lại bước 3–5. Cặp cũ trong `app_config` sẽ bị GHI ĐÈ ở lượt làm mới đầu
tiên. Muốn xoá sạch trước cho chắc:

```sql
delete from app_config where key = 'tiktok.token';
```

## Refresh token hết đời

Refresh token sống **365 ngày**. Còn dưới 14 ngày thì log in cảnh báo
(`[publish] TikTok: Refresh token TikTok còn N ngày…`) — làm lại bước 3–5 trước
khi hết. Để hết hẳn thì rơi vào `invalid_grant` và hàng đợi TikTok đứng lại tới
khi có người cấp lại.

---

## ⚠️ Phần CHƯA kiểm được ở đây

Container phát triển **chặn `open.tiktokapis.com`** ở tầng egress
(`curl: (56) CONNECT tunnel failed, response 403` — tức chưa chạm tới server
TikTok, không phải endpoint sai). Nên toàn bộ verify của
`lib/media/tiktok-token.ts` dừng ở tầng **stub**: 36 bất biến trên module thật,
chặn ở tầng `fetch`, đo đúng chuỗi gửi đi và thứ tự ghi/dùng.

Thứ **chưa** chứng minh được: tên trường chính xác trong phản hồi thật của
TikTok. Lượt cấp token đầu tiên chính là phép thử thật — nếu lệch thì chỗ phải
nhìn là `refresh()` trong `lib/media/tiktok-token.ts`, không phải chỗ khác.
