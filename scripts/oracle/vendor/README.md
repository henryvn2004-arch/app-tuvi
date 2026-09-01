# Oracle vendor

Thư mục này chứa mã nguồn của **"An Sao — Tử Vi Thiên Lương"**
(shareidea2020@gmail.com), một ứng dụng độc lập được tác giả chia sẻ công
khai để tham khảo. Repo này dùng nó làm **TRỌNG TÀI đối chiếu công thức**
trong lúc sửa `public/tuvi-ansao-engine.js` — không phải nguồn nhập của sản
phẩm, không được import vào bất kỳ route/trang nào của `tuviminhbao.com`.

## Vì sao commit thẳng vào git

Ban đầu file này bị gitignore (dùng cục bộ, không commit) vì đây là mã của
người khác chia sẻ để dùng thử, không kèm giấy phép mã nguồn mở tường minh —
"chia sẻ công khai" và "được phép chép vào repo thương mại" là hai chuyện
khác nhau. Chủ sản phẩm (Henry) đã xem xét và quyết định chấp nhận rủi ro
đó, cho commit thẳng — quyết định này thuộc về chủ sản phẩm, không phải kỹ
thuật. File `an-sao-thien-luong.js` trong thư mục này **là bản gốc, KHÔNG
sửa** (kiểm bằng đối chiếu công thức + benchmark thật trong quá trình tích
hợp Thiên Lương — xem `docs/nhat-ky/`).

## Phạm vi dùng

Chỉ dùng để SO SÁNH khi sửa công thức an sao. Không import vào `lib/`,
`app/`, hay `public/`. Không chép công thức của họ nguyên văn vào code sản
phẩm — công thức đã được viết lại độc lập dựa trên phần đối chiếu, trừ thuật
toán lịch âm Meeus/Hồ Ngọc Đức (kiến thức công khai, không phải tài sản
riêng của tác giả).

## Cách dùng

`scripts/oracle/load.mjs` tự dò `an-sao-thien-luong.js` (ưu tiên) hoặc
`an-sao-thien-luong.html` (bóc `<script>`) trong thư mục này.

- `npm run oracle:ansao` — quét vét cạn 518.400 tổ hợp an sao, so với engine
  hiện tại.
- `npm run oracle:lunar` — đối chiếu lịch âm theo quy tắc lịch sử VN.

Thiếu file → hai lệnh trên báo lỗi rõ ràng và thoát. `check:lasogolden`
(cổng CI chính) không phụ thuộc file này.
