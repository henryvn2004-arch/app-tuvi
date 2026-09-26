# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Khách chính (Henry chốt 2026-09-26):** dân văn phòng, 22–65 tuổi, **chủ yếu là nữ**.
  Họ dùng điện thoại trong giờ nghỉ hoặc buổi tối. Họ đang vướng một chuyện rất đời
  thường (tình duyên, công việc, tiền bạc, con cái, chọn ngày, đặt tên) và muốn một
  câu trả lời theo đúng lá số của mình, không phải bài đọc chung chung.
- Họ không rành thuật ngữ Tử Vi và không muốn phải học cách dùng site. Việc cần làm
  là: hỏi, được trả lời, hỏi tiếp.
- Mobile ~390px là màn chính. Desktop là màn phụ.

## Product Purpose

- Tử Vi Minh Bảo (tuviminhbao.com) luận mệnh lý theo cổ pháp: Tử Vi Đẩu Số, Bát Tự,
  xem tuổi, chọn ngày, đặt tên, phong thủy, tướng học, cùng khoảng 50 công cụ khác.
- Cửa vào chính là **Hỏi Thầy**: một cuộc trò chuyện với hội đồng 15 thầy, luận trên
  lá số thật của người hỏi. Report (bản luận dài, PDF) chạy ra từ cuộc trò chuyện
  đó.
- **Thành công** gồm ba chỉ số:
  - người mới hỏi được câu đầu tiên và nhận trả lời có lá số trong ít lần chạm nhất;
  - người dùng ở lại chat, hỏi nhiều câu, quay lại sau 1 và 7 ngày;
  - người dùng chạy thêm report thứ hai, thứ ba khi thầy mời đúng lúc.
- Chỉ số và workplan: `docs/UX-AUDIT-PLAN.md`, `docs/CHAT-FIRST-NAP-GOI-PLAN.md`.

## Positioning

- Mọi con số (cung, sao, tứ hóa, đại vận, điểm) do **engine cổ pháp tất định** tính.
  Lời luận chỉ diễn giải trên số đó, không tự tính lại.
- Người luận là **hội đồng 15 thầy có thật** (`master_profiles`), mỗi thầy một môn,
  không phải một chatbot vô danh.

## Operating Context

- Tiền tệ trong app là **Lượng**, bán theo gói. Chat trừ Lượng mỗi câu. Report ghi
  sẵn số Lượng trên nút.
- Khách chưa đăng nhập được hỏi thử 3 câu. Tới tường hết lượt thì mời đăng ký, tặng
  Lượng.
- Kênh ngoài web: Telegram · Messenger · WhatsApp, và MCP cho trợ lý chat ngoài,
  dùng chung một ví.

## Capabilities and Constraints

- Tên gọi (luật trong `CLAUDE.md`):
  - cửa chat chỉ có một tên, **"Hỏi Thầy"**;
  - người luận là **"Thầy"**;
  - đơn vị tiền là **"Lượng"**.
- Chữ hiển thị **không khoe "AI"**. Viết theo cổ pháp, engine, hệ thống.
- **Không emoji màu** trong giao diện. Icon lấy từ bộ dùng chung `public/nav.js`.
- **Giá không chép tay ở client.** Nguồn là `tool_pricing` + `credit_packages`.
- Web tĩnh (`public/*.html` + `shell.js`/`shell.css`) chạy trên Next.js 16 + Supabase +
  Vercel. Đổi JS/CSS dùng chung phải bump `?v=`.
- Còn mở:
  - bảng giá gói Lượng mới (tính lại sau);
  - số liệu "online" và toast hoạt động trên site giữ nguyên (Henry quyết
    2026-09-26: để đó, không sửa).

## Brand Commitments

- Tên: **Tử Vi Minh Bảo**. Slogan: **"Tri mệnh lý – Thuận thế hành"**. Có ấn triện
  đỏ 紫微明寶.
- Giọng: bậc thầy điềm đạm, luận cổ pháp cho chuyện đương đại, **không phán số
  phận**, luôn trả về một việc làm được ngay. Nguồn: `docs/BRAND-VOICE.md`.
- Chân dung thầy vẽ chì (`/authors/<id>.jpg`), mỗi người đúng một kiểu vẽ. Hình
  công cụ là đồ vật (`tool-avatars/`).

## Evidence on Hand

- 15 hồ sơ thầy trong `master_profiles`.
- Hơn 300 bài Khảo Luận / Vấn Đáp.
- Khoảng 7.000 trang SEO lá số/tương hợp.
- **Không có** lời chứng thực hay số khách hàng đã kiểm chứng. Không được bịa.

## Product Principles

1. **Hỏi trước, học sau.** Không bắt người mới hiểu bộ môn hay chọn công cụ trước khi
   được trả lời.
2. **Một cửa, một tên.** Mọi lối vào dẫn về Hỏi Thầy. Không để hai URL hay hai tên
   cho cùng một thứ.
3. **Mỗi câu trả lời mở ra câu tiếp theo.** Chip gợi ý, câu hỏi ngược, lời mời
   report đúng chủ đề.
4. **Mời, không chào hàng.** Thầy trả lời tử tế trước, rồi mới gợi ý report. Số
   Lượng nằm trên nút, không nằm trong lời văn.
5. **Số từ engine, lời từ thầy.** Không một con số nào do lời luận tự nghĩ ra.

## Accessibility & Inclusion

- Người đọc 22–65 tuổi: chữ thân ≥16px trên mobile, tương phản đạt WCAG AA ở cả
  sáng lẫn tối.
- Tôn trọng `prefers-reduced-motion`. Vùng chạm ≥44px.
- Tiếng Việt có dấu: font phải phủ đủ subset Vietnamese.
