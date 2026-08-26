# Cổ pháp Bút Tướng (筆相) — nguồn cho tool "Đánh Giá Chữ Ký"

> Tài liệu THAM CHIẾU cho `app/api/but-tuong/route.js` (system prompt) và
> `public/tools-shared/but-tuong.js` (công thức đo). KHÔNG tự sửa công thức
> đo hay lời luận mà không đối chiếu lại file này trước — đúng luật
> "KHÔNG sửa mò một công thức cổ pháp" ở CLAUDE.md. Chỗ nào tao chưa chắc
> nguồn, đánh dấu **[CẦN TRA THÊM]** — đừng viết chắc như đinh vào prompt.

## 1. Vì sao KHÔNG dùng nguyên bản đề xuất của ChatGPT

Bản gốc (`Flow/Direction/Strength/Balance`, `Size/Legibility/Slant`,
`Ending Stroke/Balance`) là **graphology phương Tây** dịch sang tiếng Việt,
không có cổ pháp đứng sau, và tự thú lớp 3 là "tạo ý nghĩa may mắn để user
tin + thích" — tức viết để chiều lòng chứ không phải để đúng. Repo này đã có
`SP_DIEN`/`SP_NHAN` (`app/api/tuong-mat/route.js`) dẫn Ma Y Thần Tướng, Liễu
Trang Thần Tướng đàng hoàng — tool chữ ký lỏng hơn thì lộ ngay.

## 2. 花押 (hoa áp) — cổ pháp chữ ký thật

Khởi từ đời Đường, thịnh ở Tống: quan lại dùng "hoa áp"/"áp tự" (畫押) ký
trên văn thư, chữ cách điệu tới mức không đọc ra chữ gốc. Nhật gọi
**kaō (花押)**, dùng liên tục tới hết thời Edo. Ba yêu cầu cổ của hoa áp là
khung lý luận chính của tool này:

- **一筆連成** (nhất bút liên thành) — viết một mạch, ít nhấc bút. → trục **Khí**.
- **不可摹** (bất khả mô) — người khác không nhái lại được, kể cả khi có bản
  mẫu trước mắt. → cơ sở cho "độ ổn định" (so nhiều lần ký của CHÍNH mình).
- **藏鋒** (tàng phong) — giấu mũi nhọn, không phô trương lộ liễu. Liên quan
  tới cách đọc trục Cốt: quá nhiều góc gãy sắc = lộ, không phải mạnh.

**[CẦN TRA THÊM]** — chữ ký/hoa áp trong sử Việt (thời Lê–Nguyễn, ấn triện
và hoa áp trên văn bản hành chính). Chưa có nguồn đủ chắc để đưa vào prompt.

## 3. 蘇軾《論書》— ngũ yếu, xương sống của 6 trục đo

> 書必有神、氣、骨、肉、血,五者闕一,不為成書也。
> *(Chữ phải có thần, khí, cốt, nhục, huyết; thiếu một thì không thành chữ.)*
> — Tô Đông Pha (蘇軾), 論書

Đây là 5/6 trục engine đo. Trục thứ 6 (**Thế** 勢 — xu hướng đường chân chữ)
lấy từ khái niệm **筆勢** (bút thế) phổ biến trong lý luận thư pháp cổ nói
chung, không quy về một tác giả cụ thể.

| Trục | Hán | Nghĩa cổ | Cách đo (`but-tuong.js`) |
|---|---|---|---|
| Thần | 神 | sinh khí, hồn của chữ | 1 lần ký: độ mượt (jerk thấp). ≥2 lần ký: độ NHẤT QUÁN giữa các lần — đúng tinh thần "bất khả mô" ở §2 |
| Khí | 氣 | mạch bút liền lạc | tỉ lệ độ dài nét liền dài nhất / tổng độ dài, trừ điểm theo số lần nhấc bút |
| Cốt | 骨 | khung xương, dứt khoát | mật độ khúc gãy góc rõ (không quá mềm = vô cốt, không quá vụn = loạn cốt) |
| Nhục | 肉 | đầy đặn, có lực | lực nhấn thật nếu thiết bị có pressure; không thì suy từ tốc độ (chậm = dày, vội = mảnh) |
| Huyết | 血 | lưu chuyển | độ đều của tốc độ dọc nét (hệ số biến thiên), trừ điểm mỗi chỗ "trệ" (đọng bút giữa chừng) |
| Thế | 勢 | xu hướng | hồi quy tuyến tính đường chân chữ; góc lý tưởng ước lệ ~6° hất lên |

## 4. 《筆陣圖》Vệ phu nhân (衛夫人) — kho ẩn dụ cho lời luận

Bảy nét cơ bản kèm hình tượng lực — dùng làm CHẤT LIỆU VĂN, không phải công
thức đo:

- 橫 (ngang) như *"ngàn dặm mây trải"* (千里陣雲)
- 點 (chấm) như *"đá rơi từ vách cao"* (高峰墜石)
- 撇 (phẩy) như *"ngà voi, sừng tê bị bẻ gãy"* (陸斷犀象)
- 豎 (sổ dọc) như *"dây leo vạn năm"* (萬歲枯藤)
- 捺 (mác) như *"sóng vỗ nổi sấm"* (崩浪雷奔)
- 勾 (móc) như *"cây nỏ giương cứng"* (勁弩筋節)

Cộng thêm **永字八法** (側勒努趯策掠啄磔 — 8 nét chuẩn rút từ chữ 永) làm bộ
phân loại nét khi cần nói cụ thể "nét nào".

## 5. 孫過庭《書譜》— cái phanh đạo đức có gốc cổ

> 五合: thư thái, hứng khởi, dụng cụ tốt, thời tiết đẹp, tri kỷ ở bên → chữ đẹp.
> 五乖: bức bối, gượng ép, dụng cụ dở, thời tiết xấu, một mình → chữ xấu.

**Dùng câu này để mở bài luận**: chữ ký chỉ chụp được TRẠNG THÁI lúc ký,
không phải định mệnh cố định. Đây là lời cổ nhân, không phải disclaimer
luật sư — thuyết phục hơn nhiều mà vẫn đúng sự thật.

## 6. 五行筆勢 — ngũ hành nét (cầu nối sang dụng thần bát tự)

Cách gán ngũ hành cho hình dạng nét là quy ước phổ biến trong mệnh lý dân
gian (chiết tự, bút tướng), gán theo HÌNH DẠNG chứ không theo một văn bản
cổ cụ thể — coi đây là **quy ước công cụ**, không phải kinh điển:

| Hành | Đặc điểm hình |
|---|---|
| Mộc | nét dựng đứng, thẳng |
| Hỏa | nét hất nhọn, đổi hướng gấp |
| Thổ | nét ngang, vuông, chậm |
| Kim | nét tròn/móc khép kín |
| Thủy | nét cong lượn, liền mạch |

Khi user có ngày sinh: đối chiếu % ngũ hành nét với **dụng thần** đọc từ
`lib/bazi/phan-tich.ts` (`dungThan.nen` / `dungThan.ky`, tính bằng
`mingyu-core`, ĐÃ đối chiếu khớp 100% với `tubinh-ansao-engine.js` — xem
header file đó). Chỉ NÊU hành nào đang thiếu so với dụng thần, KHÔNG tự
bịa thêm quy tắc hợp/khắc ngoài bảng ngũ hành tương sinh tương khắc chuẩn.

## 7. Hai thứ PHẢI ghi rõ nguồn gốc — không được đóng vai "cổ pháp"

- **姓名學 五格剖象** (thiên/nhân/địa/ngoại/tổng cách, 81 số lý) do
  **Kumazaki Kenou (熊崎健翁)** người Nhật lập ra **thập niên 1920** — KHÔNG
  phải cổ pháp Trung Hoa. Repo có sẵn `tools-shared/ngu-hanh-ten.js` để tính
  số nét chữ Hán nếu sau này muốn thêm lớp chiết tự tên người ký — làm thì
  phải ghi rõ "cận đại, nguồn Nhật Bản", không được gắn mác cổ pháp.
- **Graphology phương Tây** (Jean-Hippolyte Michon đặt tên 1871, phát triển
  bởi Ludwig Klages) — các meta-analysis học thuật (vd. Dean 1992, tổng
  hợp >200 nghiên cứu) kết luận KHÔNG có bằng chứng graphology dự đoán được
  tính cách đáng tin cậy hơn ngẫu nhiên. Dùng làm lớp ĐỐI CHIẾU phụ (kích
  thước chữ, độ nghiêng — vẫn là quan sát thị giác hợp lý) thì được, nhưng
  **không được để nó dẫn dắt bài luận**, và nếu nhắc tới phải nói rõ đây là
  quan sát phổ thông, không phải khoa học đã kiểm chứng.

## 8. Điều CẤM trong system prompt

- Không chấm điểm bằng lời (LLM chỉ diễn giải SỐ đã có, không tự phán số mới).
- Không hứa tài lộc cụ thể, không dự đoán tai hoạ, không phán bệnh.
- Không khẳng định "chữ ký xấu = vận xấu" một chiều — luôn đi kèm 五合五乖
  (trạng thái, không phải định mệnh).
- Không tự nhận dạng danh tính người ký hay đối chiếu với chữ ký thật khác
  (không phải công cụ giám định).

## 9. Rủi ro pháp lý / quyết định thiết kế bắt buộc tuân theo

Chữ ký là dữ liệu có hiệu lực pháp lý (ngân hàng, hợp đồng). Vì vậy:

- **Toạ độ nét (client) / pixel ảnh KHÔNG rời trình duyệt.** Toàn bộ phép đo
  chạy trong `tools-shared/but-tuong.js` ở client; server chỉ nhận OBJECT
  KẾT QUẢ (số + nhãn), không nhận stroke thô, không nhận ảnh gốc độ phân
  giải đầy đủ để lưu trữ.
- Không lưu ảnh/nét trong bất kỳ bảng nào của repo. Nếu sau này cần cache
  kết quả luận (`portrait_cache`), khoá theo HASH của object số đo, không
  theo hình học.
- UI phải hiện câu: "Chữ ký của bạn không được lưu — chỉ giữ lại các chỉ số
  đo được."
- Kết bài cổ pháp: **"Thư giả, tâm hoạ dã"** (chữ là hoạ đồ của tâm — phỏng
  theo 揚雄《法言》*"書,心畫也"*), không dùng câu "Tướng tùy tâm sinh" của
  các tool tướng mặt/tay khác (khác môn, không lặp).

## 10. Việc CHƯA làm ở v1 (ghi để khỏi quên, đừng âm thầm bỏ qua)

- Chưa có bản "chữ ký gợi ý vẽ lại" (SVG trước/sau) — v1 chỉ đưa gợi ý bằng
  LỜI, bám vào trục điểm thấp nhất (`but-tuong.js` → `pickGoiY`).
- Chưa cắm `poster.js`/`qr.js` cho ảnh chia sẻ 9:16.
- Chưa có lớp chiết tự tên (ngu-hanh-ten.js) — xem §7, làm thì phải ghi rõ nguồn Nhật.
