# Chữ hiển thị — thương hiệu, giọng viết UI

## KHÔNG nhắc "AI" như điểm nổi bật

Henry chốt (2026-09-06): sản phẩm có dùng AI thật (Anthropic Claude cho luận
giải, Replicate cho render ảnh, MediaPipe cho đo mặt/tay...), nhưng **AI không
phải Point Of Difference**. Tự khoe "AI" trong tên công cụ/tagline/badge là tự
xếp mình vào cùng rổ với hàng trăm app bói toán "AI" khác — không thuyết phục,
và che mất điểm khác biệt THẬT: **engine tất định theo cổ pháp**, cho cùng một
đầu vào luôn ra cùng một kết quả, kiểm chứng lại được bằng sách.

Nguyên tắc khi viết chữ mới: nói về **cổ pháp / engine / hệ thống làm gì**,
đừng nói về **công nghệ đứng sau**. "Luận giải chuyên sâu 24 phần" đúng hơn
"Luận giải AI 24 phần"; "hệ thống phân tích Bát Trạch" đúng hơn "AI phân tích
Bát Trạch".

## Bộ từ đã dùng (PR #717 · #723 · #726 — 129 file, 605 dòng)

| Ngữ cảnh cũ | Thay bằng |
|---|---|
| `X AI` (tên công cụ: Diện Tướng AI, Khí Sắc AI, Personal Color AI…) | `X` — bỏ hẳn hậu tố |
| `trợ lý AI` | `trợ lý Luận Đường` |
| `luận giải bằng AI` · `luận giải AI` | `luận giải chuyên sâu` |
| `AI phân tích/chấm điểm/đọc/vẽ/render…` (AI làm chủ ngữ) | `hệ thống …` (viết hoa nếu đầu câu) |
| `AI đang …` (nhãn tiến trình) | `Đang …` |
| `gửi tới AI để phân tích` | `gửi tới máy chủ để phân tích` |
| `Lỗi AI…` · `kết quả AI` | `Lỗi hệ thống…` · `kết quả trả về` |
| badge `AI Vision/Analysis/Fashion/Audio/Tư Vấn/Gợi Ý` | `Nhận Diện Ảnh` · `Phân Tích` · `Thời Trang` · `Giọng Nói` · `Tư Vấn` · `Gợi Ý` |
| `Không Cần AI` (ý: miễn phí, không tốn Lượng) | `Không Tốn Lượng` |
| `(AI try-on)` | `(thử ảo)` |
| `bằng trí tuệ nhân tạo` / `kết hợp trí tuệ nhân tạo` | bỏ hẳn |
| `"AI" · Ma Y Thần Tướng` (tiền tố trong subtitle) | bỏ tiền tố, giữ phần sau |

## Ngoại lệ CỐ Ý — không đụng

- **Ba trang pháp lý**: `public/chinh-sach-bao-mat.html` ·
  `public/dieu-khoan-dich-vu.html` · `public/mien-tru-trach-nhiem.html`. Đó là
  khai báo pháp lý về xử lý dữ liệu tự động và bên thứ ba (Anthropic là data
  processor) — gỡ chữ AI ở đây là khai sai, khác hẳn chữ tiếp thị. (Lượt máy
  đầu ở #717 lỡ sửa và làm câu vỡ nghĩa — đã revert nguyên ba file.)
- **Chú thích trong mã** (`// AI …`, `/* AI … */`) và `public/samples/*.json`
  — chỉ đội ngũ đọc, không phải chữ người dùng thấy.
- **Tên file / URL / class / id** (`/tools/kieu-toc-ai.html`, `da-lieu-ai`,
  `ai-loading-text`, `claude-content`…) — đổi là gãy route đang index và gãy
  hook JS đang chạy. Không thuộc phạm vi "chữ hiển thị".
- **Tên thật của bên ngoài** (thư mục backlink "There's An AI For That", tính
  năng "AI Overview" của Google…) và **prompt gửi cho model** (tiếng Anh, dựng
  ảnh) — không phải chữ của mình để đổi.

## Bẫy đã vấp khi thay hàng loạt bằng regex

- Hai luật chồng lên nhau trên cùng một câu → `luận giải chuyên sâu 24 phần
  chuyên sâu`. Luôn `grep` lại chuỗi đích SAU khi áp cả loạt regex, đừng tin
  từng regex chạy đúng một mình là đủ.
- `slice(0,-3)` cắt hậu tố ăn mất luôn dấu cách đứng trước nó → `24
  phầnluận giải`.
- `AI` đứng đầu câu thành `hệ thống` bị hạ thành chữ thường khi thay trực
  tiếp trong chuỗi HTML (`<p>hệ thống đọc…`) — phải quét lại `>hệ thống ` và
  `. hệ thống ` để viết hoa lại.
- Cùng một chuỗi con giữ hai vai trò khác nhau ở hai nơi: `AI Vision` là
  **badge** (danh từ, viết hoa) ở trang này nhưng là **chủ ngữ trong câu**
  (`AI Vision quét bàn làm việc…`) ở trang khác — không thay đồng loạt bằng
  một map 1-1.

Diễn biến đầy đủ, kèm số liệu quét prod: `docs/nhat-ky/2026-09.md`, mục
`🪧 Gỡ "AI" khỏi toàn bộ chữ hiển thị`.
