# Brand Voice — Tử Vi Minh Bảo

**Phiên bản:** 1.0 · **Ngày:** 2026-07-31
**Nguồn:** trích từ 20 bài `khao_luan` chất lượng nhất (2 bài/chuyên mục × 10 chuyên mục),
đối chiếu số liệu trên toàn bộ 324 bài.
**Phạm vi áp dụng:** mọi chữ người dùng đọc — bài Khảo Luận / Vấn Đáp, prose do 47 tool
sinh ra lúc chạy, rail chat, mô tả sản phẩm, email, kịch bản video.

> Tài liệu này là ASSET design-time. Pipeline run-time chỉ ĐỌC, không sinh lại.

---

## 0. Vì sao có tài liệu này

Đo trên corpus thật trước khi viết, không suy đoán:

| Hạng mục | Kết quả đo | Kết luận |
|---|---|---|
| Lỗi encoding (893 dòng, 5 bảng) | **0** | Corpus SẠCH. Lỗi encoding nếu có là ở tầng render/run-time, không phải dữ liệu lưu. |
| Bài trộn ≥2 đại từ xưng hô | **5/324** | Corpus KHÔNG lộn xộn. 248/324 (76,5%) không xưng hô với người đọc. |
| Tên cung Tử Tức | Tử Tức 12 · Tử Nữ 8 · Tử Tôn 1 | **3 tên cho 1 cung** — lỗi thật. |
| Tên cung Nô Bộc | Nô Bộc 11 · Giao Hữu 3 | **2 tên cho 1 cung** — lỗi thật. |
| Trật tự từ | `cung X` 135 · `X cung` 66 | Không có quy ước. |
| Cấp tiêu đề mở bài | `##` 269 · `#` 19 · không có 36 | **19 bài phát 2 thẻ H1** — lỗi SEO thật. |

**Điều chỉnh quan trọng so với giả định ban đầu:** "xưng hô lộn xộn" và "lỗi encoding"
KHÔNG nằm trong corpus `khao_luan`. Chúng nằm ở **tầng prompt run-time** (prose do 47 tool
sinh). Tài liệu này vì vậy phải viết sao cho **cưỡng chế được ở tầng prompt**, không chỉ
để đọc tham khảo.

---

## 1. Định vị giọng

Một câu: **luận giải cổ pháp cho vấn đề đương đại, giọng bậc thầy điềm đạm, không phán số phận.**

Nước đi đặc trưng của thương hiệu — có mặt ở gần như mọi bài tốt: **lấy một nỗi lo rất hiện đại,
soi bằng lăng kính Tử Vi cổ, rồi trả về một hành động cụ thể.** Sa thải hàng loạt, bố mẹ trực thăng,
giấu thu nhập với vợ/chồng, AI cướp việc, mua nhà hay thuê — đều được đọc qua cung và sao.

Giữ nước đi này. Nó là thứ khiến `khao_luan` không giống mọi trang tử vi khác trên mạng.

---

## 2. Năm đặc trưng giọng

### 2.1 Ngôi thứ ba, phi cá nhân
Không xưng "tôi". Không gọi người đọc là "bạn" trong bài khảo luận.
Chủ ngữ dùng: *người ta · con người · ta · đương số · người trí · cha mẹ · song thân*.

✅ "Người trí biết giữ căn bản, không vay mượn lung tung khiến gia đạo bất an."
❌ "Bạn nên giữ căn bản và đừng vay mượn lung tung nhé."

### 2.2 Ngữ vực Hán-Việt cổ
Đây là chữ ký của thương hiệu. Dùng thành ngữ, dẫn lời người xưa, đặt trong ngoặc kép.

Mẫu thật trong corpus: *"đối cảnh sinh tâm, nhân thời chế nghi"* · *"dĩ nhu khắc cương"* ·
*"cầu đồng tồn dị"* · *"vô sự đãi hữu sự"* · *"họa vô đơn chí"* · *"khí tán thần ly"* ·
*"gia hòa vạn sự hưng"*.

Quy tắc: **mỗi bài ít nhất 1, nhiều nhất 3.** Quá 3 thành sáo, đọc như văn dịch.
Dẫn thành ngữ phải kèm nguồn mờ — "người xưa dạy", "cổ ngữ" — không bịa tên tác giả cụ thể.

### 2.3 Thuật ngữ luôn viết hoa và đứng đúng chỗ
Tên cung và tên sao là danh từ riêng. Viết hoa. Không in nghiêng. Dùng `**đậm**` khi lần đầu
xuất hiện trong một mạch luận.

### 2.4 Bắt buộc có ví dụ cụ thể
Mọi bài phải có ít nhất một trường hợp thật hoặc dựng có chi tiết: tên gọi, tuổi, nghề, con số.

✅ "Thí dụ bà Nguyệt, 52 tuổi, được chẩn đoán ung thư giai đoạn ba…"
✅ "Anh Minh, nhân viên công nghệ năm 2023, thấy công ty sa thải nhiều đợt…"
❌ "Ví dụ có người gặp khó khăn về tài chính…"

Dẫn được vụ việc công khai thì càng tốt (Cocobay Đà Nẵng, Lý Gia Thành) — nhưng **chỉ nêu
sự kiện đã công bố rộng rãi, tuyệt đối không gán lá số hay luận mệnh cho người thật đang sống.**

### 2.5 Kết bằng thế chủ động, không bằng định mệnh
Tử Vi ở đây để người ta hành động sớm hơn, không phải để buông xuôi.

✅ "Hiểu vận trình là bước đầu, hành động phòng ngừa mới là yếu chốt."
✅ "An phận tùy duyên nhưng không bỏ cuộc."
❌ "Số đã định như vậy, không thể cưỡng cầu."

---

## 3. Xưng hô — luật cứng

Đây là lỗi #1 cần chặn ở tầng prompt.

| Bối cảnh | Gọi người đọc | Tự xưng |
|---|---|---|
| Bài Khảo Luận / Vấn Đáp | **không gọi** (ngôi 3: *đương số, người ta, ta*) | không tự xưng |
| Prose kết quả tool (lá số, luận giải) | **quý vị** | không tự xưng |
| Rail chat (có persona thầy) | **quý vị** | **tôi** |
| Kịch bản video / TikTok | **quý vị** | không tự xưng |

**Cấm tuyệt đối:**
- Trộn 2 cách gọi trong cùng một bài/một lượt trả lời.
- "bạn" ở bất cứ bề mặt nào — quá suồng sã so với ngữ vực Hán-Việt đã chọn.
- "mình", "anh/chị", "con", "cụ", "gia chủ" làm đại từ gọi người đọc.
- Mở bài bằng "Kính thưa quý vị" — sáo, và hiện đang lệch hẳn giọng phần còn lại của corpus
  (chỉ 1 bài dùng, đọc như văn tế).

---

## 4. Giới tính trong prose — luật cứng

Lỗi này gây mất niềm tin ngay lập tức: gọi sai giới tính người đang trả tiền.

1. **Đã biết giới tính** (form có trường `gioiTinh`, lá số có `gender`): dùng đúng, nhất quán
   toàn bài. Nam → *ông, người đàn ông, nam nhân*. Nữ → *bà, người phụ nữ, nữ nhân*.
2. **Chưa biết giới tính**: dùng từ trung tính — *đương số · người này · người có lá số này*.
   **KHÔNG mặc định nam.**
3. **Nói về người thứ ba chưa rõ giới** (bạn đời tương lai, con cái chưa sinh, đối tác):
   luôn trung tính, trừ khi cung/sao đã xác định rõ.
4. Danh xưng nghề nghiệp: có bản nam/nữ thì chọn đúng theo `gender`; không có thì để trung tính.
   Không tự thêm "Nữ" vào trước danh xưng khi chưa biết.

**Không bao giờ suy giới tính từ tên riêng.**

---

## 5. Từ vựng chuẩn hoá

### 5.1 Tên 12 cung — mỗi cung ĐÚNG MỘT tên

| Chuẩn | Cấm dùng |
|---|---|
| cung **Mệnh** | bản mệnh (khi chỉ cung) |
| cung **Phụ Mẫu** | — |
| cung **Phúc Đức** | — |
| cung **Điền Trạch** | cung Điền |
| cung **Quan Lộc** | cung Sự Nghiệp |
| cung **Nô Bộc** | ~~Giao Hữu~~, ~~Bằng Hữu~~ |
| cung **Thiên Di** | — |
| cung **Tật Ách** | cung Bệnh |
| cung **Tài Bạch** | cung Tài |
| cung **Tử Tức** | ~~Tử Nữ~~, ~~Tử Tôn~~ |
| cung **Phu Thê** | cung Hôn Nhân |
| cung **Huynh Đệ** | — |

### 5.2 Trật tự từ: **"cung X"**, không phải "X cung"

✅ cung Phúc Đức · cung Tài Bạch
❌ Phúc Đức cung · Tài Bạch cung

Lý do: 135/66 đã dùng dạng này, và "X cung" là lối dịch sát Hán văn, đọc cứng trong câu Việt.

### 5.3 Tên sao
Viết đủ và đúng: *Tử Vi · Thiên Phủ · Vũ Khúc · Thiên Tướng · Thiên Lương · Thất Sát ·
Phá Quân · Tham Lang · Cự Môn · Thiên Cơ · Thái Dương · Thái Âm · Liêm Trinh · Thiên Đồng*.

Sát tinh: *Kình Dương · Đà La · Hỏa Tinh · Linh Tinh · Địa Không · Địa Kiếp*.
Tứ Hóa: *Hóa Lộc · Hóa Quyền · Hóa Khoa · Hóa Kỵ*.

**Cấm bịa tên sao.** Trong corpus đã lọt "Văn Khoa" (không tồn tại — là *Văn Xương* / *Văn Khúc*
hoặc *Hóa Khoa*) và "Cứu Tỉnh sao" (vô nghĩa). Sao nào không chắc thì không nhắc.

---

## 6. Cấu trúc bài

1. **Mở bằng `##`, KHÔNG BAO GIỜ dùng `#`.**
   Lý do kỹ thuật, không phải thẩm mỹ: cả `public/khao-luan.html:109` lẫn
   `app/api/khao-luan/route.ts:136` đã phát `<h1>` từ `title`; markdown `#` bị đổi tiếp thành
   `<h1>` (`route.ts:17`) ⇒ **trang có 2 thẻ H1**. Hiện 19 bài đang dính.
2. Độ dài: **1.200–1.600 ký tự** (corpus: trung bình 1.380, cao nhất 2.858).
3. 4–6 đoạn, mỗi đoạn 2–5 câu. Không đoạn một câu.
4. `**đậm**` cho tên cung/sao lần đầu và cho 2–4 khái niệm chốt. Không đậm cả câu.
5. Ví dụ cụ thể đặt ở đoạn áp chót.
6. Câu chốt cuối bài, mở bằng: *Vậy nên · Tóm lại · Yếu chỉ là · Khuyên rằng · Kết*.

---

## 7. Cấm

- **Rule-dump thô.** Không đổ nguyên bảng tra, danh sách sao, hay điểm số vào prose.
  Số liệu engine dùng để LUẬN, không để in ra. Người đọc cần nghĩa, không cần bảng.
- **Bịa trích dẫn cổ thư.** Dẫn Tân Biên / Vương Đình Chi thì phải có trong RAG (`tuvi_docs`).
  Không chắc thì diễn đạt bằng "người xưa dạy", đừng gán tên sách.
- **Bịa số.** Không nêu điểm/10, phần trăm, hay mốc năm dương lịch mà engine không cấp.
- **Hứa chắc chắn.** Không "chắc chắn sẽ giàu", "nhất định tai qua nạn khỏi".
- **Doạ.** Không đẩy sợ hãi để bán. Hung tinh nêu kèm đường hóa giải.
- **Y khoa / pháp lý / đầu tư cụ thể.** Không chẩn bệnh, không khuyên mua mã nào, không tư vấn
  pháp lý. Được nói về thái độ và chuẩn bị.
- **Emoji trong prose khảo luận.** (UI thì theo hệ icon Lucide, không phải việc của văn bản.)
- **Lỗi chính tả Hán-Việt.** Corpus đang có "Diểm" (→ *Điểm*) và "Di kim mãn yíng"
  (→ *Di kim mãn doanh*, 遺金滿籝). Sai chữ Hán-Việt phá thẳng uy tín bậc thầy.

---

## 8. Checklist QC — dùng cho brand-check gate (bước 2)

Chạy trước khi publish. Mục ❌ nào cũng đủ để chặn.

**Tự động kiểm được (regex/SQL):**
- [ ] Không mở bằng `# ` (chỉ `##`)
- [ ] Không chứa: `Tử Nữ`, `Tử Tôn`, `Giao Hữu`, `Bằng Hữu`, `Văn Khoa`
- [ ] Không chứa dạng `X cung` (phải là `cung X`)
- [ ] Không chứa `\mbạn\M`, `\mmình\M`, `anh/chị` làm đại từ gọi người đọc
- [ ] Chỉ dùng **một** cách xưng hô trong toàn bài
- [ ] Không mojibake: `â€`, `Ã¡`, `ï¿½`, `Æ°`, `Ä‘`
- [ ] Độ dài 1.200–1.600 ký tự
- [ ] Có ít nhất một `**đậm**`

**Cần người/LLM đọc:**
- [ ] Có nước đi "vấn đề đương đại × lăng kính cổ pháp"
- [ ] Có 1–3 thành ngữ Hán-Việt, không quá 3
- [ ] Có ví dụ cụ thể kèm chi tiết (tên/tuổi/nghề/số)
- [ ] Giới tính nhất quán, không mặc định nam khi chưa biết
- [ ] Kết bằng thế chủ động, không định mệnh
- [ ] Không rule-dump, không bịa sao, không bịa trích dẫn
- [ ] Tên sao có thật

---

## 9. Mẫu vàng

Trích nguyên văn từ corpus, dùng làm few-shot khi cần.

**Mở bài — bắc cầu cổ/kim:**
> Khi thiên mệnh giáng hoạn, người xưa dạy phải "đối cảnh sinh tâm, nhân thời chế nghi".
> Theo Tử Vi Đẩu Số, việc đối diện bệnh nan y cần có phương thức chu toàn cả tài lực lẫn tâm niệm.

**Thân bài — luận qua cung, có nghĩa chứ không có bảng:**
> Những người có Thiên Cơ hay Thái Âm tọa thủ Tài Bạch thường cẩn trọng, muốn giữ kín để bảo toàn
> quyền quyết định. Đây không hẳn là thiếu tin tưởng, mà là bản năng tự bảo vệ trước biến động
> trong quan hệ quyền lực.

**Ví dụ — cụ thể, có số:**
> Anh Minh, nhân viên công nghệ năm 2023, thấy công ty sa thải nhiều đợt. Nhìn lại lá số thấy
> Quan Lộc gặp Địa Không, anh chủ động dành 30% lương mỗi tháng, học thêm kỹ năng mới.

**Kết — chủ động:**
> Vậy nên, hiểu vận trình là bước đầu, hành động phòng ngừa mới là yếu chốt.

**Phản mẫu — đúng thứ cần tránh:**
> ❌ "Kính thưa quý vị, xét theo thiên văn học…" — lệch giọng, sáo.
> ❌ "Bạn nên tiết kiệm 6 tháng lương nhé!" — sai xưng hô, sai ngữ vực.
> ❌ "Mệnh: Cự Môn (đắc). Điểm: 7.3/10. Tài Bạch: Vũ Khúc…" — rule-dump.
