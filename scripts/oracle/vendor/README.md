# Oracle vendor — KHÔNG commit vào git

Thư mục này chứa (cục bộ, gitignore) mã nguồn của **"An Sao — Tử Vi Thiên
Lương"** (shareidea2020@gmail.com), một ứng dụng độc lập được chia sẻ để tham
khảo. Repo này dùng nó làm **TRỌNG TÀI đối chiếu công thức** trong lúc sửa
`public/tuvi-ansao-engine.js` — không phải nguồn nhập của sản phẩm, không
được import vào bất kỳ route/trang nào.

## Vì sao KHÔNG commit

Đây là mã của người khác. Dùng nội bộ để đối chiếu là một chuyện; chép nguyên
514KB vào lịch sử git của một sản phẩm thương mại là chuyện khác — kể cả khi
chỉ dùng trong test. Nên: file `.js`/`.html` trong thư mục này bị `.gitignore`
chặn (`/scripts/oracle/vendor/*.js`, `*.html`); chỉ file `README.md` này được
commit.

**Kết quả đối chiếu (số liệu, vị trí sao, ngày âm) không bị chặn** — đó là dữ
kiện tính toán, không phải mã nguồn của họ. `scripts/oracle/fixtures/*.json`
được commit bình thường.

## Cách lấy file để chạy oracle cục bộ

1. Xin lại link Google Drive gốc (chủ sở hữu đã chia sẻ công khai), hoặc liên
   hệ `shareidea2020@gmail.com`.
2. Tải file `.html`, đặt tại `scripts/oracle/vendor/an-sao-thien-luong.html`
   **hoặc** bóc riêng phần `<script>…</script>` ra
   `scripts/oracle/vendor/an-sao-thien-luong.js`.
3. `scripts/oracle/load.mjs` tự dò cả hai tên file, ưu tiên `.js` nếu có cả
   hai (đỡ phải bóc `<script>` mỗi lần).

Thiếu file → các script `check:oracle-*` báo lỗi rõ ràng và thoát, **không**
báo đỏ IM LẶNG như thiếu dữ liệu thật. `check:laso-golden` (đối chiếu với
fixture đã đóng băng của CHÍNH engine mình) không cần file này — đó là bộ dò
CI chính, chạy được ở mọi máy không có file oracle.

## Phạm vi dùng

Chỉ dùng để SO SÁNH khi sửa công thức an sao (xem `docs/nhat-ky/` mục tích
hợp Thiên Lương). Không import vào `lib/`, `app/`, hay `public/`. Không chép
công thức của họ nguyên văn vào code sản phẩm — công thức đã được viết lại
độc lập dựa trên phần đối chiếu, trừ thuật toán lịch âm Meeus/Hồ Ngọc Đức
(kiến thức công khai).
