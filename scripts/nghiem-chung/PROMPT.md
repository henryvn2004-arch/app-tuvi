# Viết hồ sơ Nghiệm Chứng (cho agent)

Bạn viết hồ sơ đối chiếu **lá số Tử Vi ↔ cuộc đời thật** của người nổi tiếng, bằng tiếng Việt,
cho trang `tuviminhbao.com/nghiem-chung/<slug>`. Làm gọn: đọc gói → chạy nam.ts → ghi nháp → validate
(ít lượt công cụ nhất có thể; KHÔNG đọc thêm file nào khác trong repo).

## Với MỖI slug được giao

1. Đọc gói `work/nghiem-chung/pack/<slug>.json`:
   - `wiki.text`: bài Wikipedia (tiếng Anh hoặc tiếng bản xứ) — **nguồn sự thật DUY NHẤT**.
   - `laSo`: bản kê engine. Mỗi câu có `id` (vd `C.Quan Lộc.y2`, `DV3.l0`). `daiVan[]` có `namTu/namDen`, `diem`, `hang` (tot/vua/xau).
   - `gioCanh` (nếu có): lá số của canh giờ bên cạnh vì giờ sinh sát ranh giới.
2. Đọc `wiki.text`, chọn 3–4 **năm bước ngoặt** có năm rõ ràng, rồi chạy:
   `npx tsx scripts/nghiem-chung/nam.ts <slug> <năm1> <năm2> …` → các câu `N<năm>.*`.
3. Ghi nháp `work/nghiem-chung/draft/<slug>.json` (định dạng bên dưới).
4. Chạy `npx tsx scripts/nghiem-chung/validate.ts <slug>`. Lỗi thì sửa nháp, chạy lại (tối đa 4 lần).
   Vẫn không qua → ghi nháp `{"loaiTru": "khong-dat: <lý do ngắn>"}` và chạy validate lần cuối.

## Khi nào LOẠI TRỪ (chỉ ghi `{"loaiTru": "<mã>: <lý do>"}`)
- `toi-pham` / `nan-nhan`: người được biết đến chủ yếu vì phạm tội hoặc là nạn nhân án mạng/thảm hoạ.
- `vi-thanh-nien`: dưới 18 tuổi.
- `thieu-nguon`: bài viết quá ít sự kiện có năm (không đủ 6 dòng bản mệnh + 3 đại vận + 2 năm mốc có trích dẫn).

## Định dạng nháp
```json
{
  "ngheNghiep": "Nhà vật lý thiên văn, nhà văn",
  "moTaNgan": "Một câu ≤200 ký tự: là ai, nổi tiếng vì gì",
  "sinh": { "noi": "Thành phố, quốc gia (tiếng Việt)" },
  "namMat": 1982,                         // BỎ trường này nếu còn sống
  "traLoiNgan": "2–3 câu trả lời 'Lá số Tử Vi của X đoán đúng đến đâu?' — nêu 2 điểm trúng nhất và chỗ trượt rõ nhất.",
  "tieuSu": ["2–4 đoạn, mỗi đoạn 120–1000 ký tự, dịch/tóm lược từ wiki.text"],
  "banMenh": [
    { "cung": "Quan Lộc", "laSoRef": ["C.Quan Lộc.y2"], "laSoNoi": "Diễn lại câu engine bằng lời tự nhiên",
      "doiThat": "Sự thật tương ứng (tiếng Việt)", "trich": "đoạn NGUYÊN VĂN chép từ wiki.text", "ketLuan": "khop" }
  ],
  "daiVan": [
    { "thuTu": 2, "laSoRef": ["DV2.diem", "DV2.l3"], "doiThat": "Việc chính trong khoảng namTu–namDen",
      "trich": "nguyên văn", "vi": "Một câu: điểm cao/thấp có khớp với giai đoạn này không", "ketLuan": "khop" }
  ],
  "namMoc": [
    { "nam": 1988, "laSoRef": ["N1988.tt", "N1988.b2"], "suKien": "...", "laSoNoi": "...", "trich": "nguyên văn", "ketLuan": "khop" }
  ],
  "gioRanhGioi": { "gioThay": 6, "soDaiVan": [2, 5], "lyDo": "...", "ketLuan": "..." },   // CHỈ khi gói có gioCanh
  "ketLuanBienTap": ["2–4 đoạn nhận xét: trúng ở đâu, trượt ở đâu, bài học về cách đọc lá số"],
  "faq": [{ "q": "Lá số tử vi của X có đúng không?", "a": "..." }]
}
```

## Luật chấm (công khai trên trang — phải nhất quán, chấm NGHIÊM)
Mục tiêu: tỷ lệ khớp phản ánh thật. Một hồ sơ toàn 100% là dấu hiệu chấm rộng tay — người đọc sẽ không tin.
- `khop`: câu lá số nói ĐÚNG điều bài viết ghi nhận, cả hướng lẫn nội dung chính. Câu chung chung kiểu
  "thông minh", "có tài", "gặp quý nhân" chỉ được `khop` khi bài có bằng chứng CỤ THỂ, nổi bật cho đúng điều đó.
- `mot-phan`: một vế đúng, một vế sai/không có. `doiThat` PHẢI nói rõ vế nào đúng, vế nào không
  (vd "… đúng phần X; phần Y thì bài không ghi / ngược lại"). Không có vế sai thì không phải `mot-phan`.
- `truot`: đời thật trái với câu lá số (lá số nói nghèo mà giàu, nói trắc trở mà suôn sẻ…). Gặp là ghi, không né.
- `chua-kiem-chung`: bài không nói gì về chuyện đó / thập niên đó trống — **không cố gán**,
  đừng chấm `mot-phan` cho chỗ không có dữ liệu (dòng chưa kiểm chứng không tính vào tỷ lệ).
- `dang-dien-ra`: chỉ đại vận hiện tại của người còn sống.
- Đại vận — so `hang` với thập niên đó TRONG CHÍNH ĐỜI NGƯỜI ẤY (không so với người khác):
  · `tot` khớp khi thập niên có thành tựu/bước tiến rõ; trượt khi đó là quãng sa sút, biến cố.
  · `xau` khớp khi thập niên có sa sút/biến cố/khó khăn rõ; trượt khi đó là quãng thăng hoa.
  · `vua` khớp khi thập niên lẫn lộn hoặc bình lặng; `mot-phan` nếu nghiêng hẳn một phía;
    trượt khi đó rõ ràng là đỉnh cao nhất hoặc đáy sâu nhất đời.
- **Không chọn lọc cho đẹp**: chọn câu lá số vì nó KIỂM CHỨNG ĐƯỢC (kể cả câu nguy cơ trượt), rồi chấm thật.
  Mỗi hồ sơ nên có cả câu "dễ trúng" lẫn câu cụ thể, dễ sai (tiền bạc, nhà cửa, cha mẹ, anh em, con cái…).
- Bản mệnh 8–12 dòng, rải nhiều cung (Mệnh, Quan Lộc, Tài Bạch, Thiên Di, Phúc Đức, Phụ Mẫu, Phu Thê, Tử Tức…).
  Bỏ qua câu engine không kiểm chứng được (nhà có ao giếng, chó đá, mồ mả…).
- Đại vận: MỌI đại vận đã bắt đầu (namTu ≤ năm nay/năm mất) phải có một dòng.
- Năm mốc: chọn năm theo ĐỜI THẬT (bước ngoặt lớn, cả tốt lẫn xấu) TRƯỚC, rồi mới xem lá số năm đó nói gì.

## Luật nội dung
- **Sự thật chỉ từ `wiki.text`.** Không thêm điều bạn "biết" mà bài không viết. `trich` chép đúng từng chữ
  (ngôn ngữ gốc, 15–300 ký tự, liền mạch; nối 2 đoạn bằng "…" nếu cần). Bộ kiểm tra dò nguyên văn.
- Người còn sống: KHÔNG nói về sức khỏe, cái chết, tù tội, tình ái, tự tử; KHÔNG trích câu engine có các chủ đề đó.
  Hôn nhân/con cái chỉ ghi khi bài nêu trung tính (vd "có hai con").
- Người đã mất: được nhắc năm mất và nguyên nhân nếu bài nêu, giọng trang trọng, không giật gân.
- Tiếng Việt tự nhiên, câu ngắn; tên tác phẩm giữ nguyên gốc kèm nghĩa tiếng Việt lần đầu.
  KHÔNG viết "AI"/"trí tuệ nhân tạo"; không viết "hội đồng"; không hứa hẹn/phán số mệnh người đọc.
- `gioRanhGioi`: so 2–3 đại vận giữa lá số chính và `gioCanh.laSo` với đời thật; nói lá số nào khớp hơn
  (trang luôn hiển thị lá số theo giờ ghi nhận). `lyDo` nêu giờ sinh cách ranh giới canh giờ bao nhiêu phút.

## Trả về
Một dòng cho mỗi slug: `<slug>: ✓ <tỷ lệ từ validate>` hoặc `<slug>: ⊘ <lý do>`.
