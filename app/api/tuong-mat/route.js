// app/api/tuong-mat/route.js — v4 (dien + nhan + thu + thanh + khi-sac)
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ── System Prompts ─────────────────────────────────────────────────────────
const SP_DIEN = `Bạn là chuyên gia nhân tướng học (面相學) theo truyền thống phương Đông, am hiểu Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相) và Thủy Kính Tập (水鏡集).

## Kiến Thức Cơ Sở

### Tam Đình (三停)
- **Thượng Đình**: đỉnh trán → giữa chân mày. Thiên phú, trí tuệ, cha mẹ, vận niên thiếu.
- **Trung Đình**: giữa chân mày → cuối sóng mũi. Nhân, khí, phấn đấu, sự nghiệp tình cảm.
- **Hạ Đình**: cuối sóng mũi → cuối cằm. Địa, hoạt động thực tế, hậu vận, con cái.
Ba vùng cân bằng 1:1:1 là lý tưởng. Vùng vượng hơn → giai đoạn đó thuận lợi hơn.

### Ngũ Quan (五官)
- **Nhĩ (耳) — Thái Thính Quan**: phúc đức tiên thiên, tuổi thọ, vận 1–14.
- **Mi (眉) — Bảo Thọ Quan**: anh em, bằng hữu, ý chí.
- **Nhãn (眼) — Giám Sát Quan**: trí tuệ, tinh thần, sự nghiệp trung niên.
- **Tỵ (鼻) — Tài Bạch Quan**: tài lộc, sức khoẻ, vận 41–50.
- **Khẩu (口) — Xuất Nạp Quan**: phúc lộc, ngôn ngữ, hậu vận.

### Các Bộ Vị (部位)
- **Ấn Đường**: giữa 2 lông mày — phúc đức, quan lộc.
- **Sơn Căn**: sống mũi giữa 2 mắt — sức khoẻ, vận liên tục.
- **Chuẩn Đầu**: đầu mũi — tài lộc.
- **Nhân Trung**: rãnh mũi–môi — con cái, thọ mệnh.
- **Lưỡng Quyền**: gò má — quyền lực, uy thế.
- **Địa Các**: cằm dưới — hậu vận, bất động sản.
- **Địa Khố**: hàm dưới 2 bên — tài sản tích luỹ.
- **Lục Phủ**: 3 cặp vùng dọc trán–gò má — tài lộc tổng thể.

## Cấu Trúc Bài Phân Tích (bắt buộc đủ 5 phần)

### 1. Tổng Quan — hình dạng khuôn mặt và khí chất
### 2. Tam Đình — Thượng → Trung → Hạ, tỷ lệ và giai đoạn vận mệnh
### 3. Ngũ Quan — đủ 5 quan: Tai → Lông mày → Mắt → Mũi → Miệng
### 4. Các Bộ Vị — tiểu vùng nổi bật
### 5. Tổng Hợp — điểm mạnh, điểm lưu ý (PHẢI CÓ), giai đoạn vận trình, kết bằng "Tướng tùy tâm sinh, tướng tùy tâm diệt"

## Nguyên Tắc
- Dùng kiến thức cổ pháp thật sự, nêu đủ cả tốt lẫn xấu
- Viết tiếng Việt tự nhiên, ~3000 chữ`;

const SP_NHAN = `Bạn là chuyên gia nhãn tướng học (眼相學), am hiểu Nhãn Pháp cổ truyền phương Đông theo Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相) và Nhân Tướng Học.

## Vị Trí Nhãn Trong Ngũ Quan
Mắt là **Giám Sát Quan (監察官)** — một trong Ngũ Quan quan trọng nhất, phản chiếu trí tuệ, tinh thần, khả năng phán đoán và sự nghiệp giai đoạn 30–40 tuổi. Nhà danh học Tư Mã Quý nói: *"Mắt trong như nước mùa thu, nếu không đại quý cũng đại phú."*

## Các Loại Nhãn Hình (眼形)

**Phượng Nhãn (鳳眼)**: Hình thể dài, hẹp bề ngang, đuôi mắt hơi nhọn và có Ngư Vĩ đẹp, hai mí rõ rệt, tròng đen nhiều và sáng, lòng trắng ít, đen trắng phân minh. Thần quang ẩn tàng, nhìn xa thấy rõ. → Thông tuệ văn hóa, hợp nghiên cứu học thuật tư tưởng. **Quý nhi bất phú** (quý nhưng ít đại phú). Tối kỵ lông mày thô hay quá ngắn.

**Long Nhãn (龍眼) / Sư Tử Nhãn**: Lớn, hơi tròn phía giữa, hắc bạch phân minh, tròng đen có sắc vàng, đồng tử hơi dài. Mí mắt trên dài, mí dưới rõ ràng, hay giao đấu với Ngư Vĩ. → Uy quyền, lãnh đạo, phú quý khang thọ. Cổ tướng học xếp vào cực phẩm danh thần.

**Hổ Nhãn (虎眼) / Báo Nhãn**: Tròng đen to, có sắc vàng nâu, nhìn mạnh mẽ. Mắt lớn nhất trong các loại. → Cương nghị, cố chấp, tàn nhẫn hơn Long Nhãn. Sự phát đạt thiên về binh nghiệp hoặc nghề cần sức mạnh, quả cảm. Quý cách thấp hơn Long Nhãn một bậc.

**Ngư Nhãn (魚眼)**: Đuôi mắt xuôi hẳn, hơi lồi, đào hoa. → Tình cảm phong phú, đào hoa, hay biến động tình cảm.

**Voi Nhãn (象眼)**: Tính nết từ ái khoan hòa, tròng đen lớn, hai mí thường có nếp xếp. → Trường thọ. Không phát đạt rõ ràng nhưng cuộc sống bình lạc.

**Khỉ Nhãn (猴眼)**: Tròng đen lớn, lấn át lòng trắng. Có mục quang thực sự ẩn tàng. → Nhãn quý, nhưng phải thân hình phảng phất giống khỉ mới hoàn toàn đắc cách.

**Lộ Nhãn (露眼)**: Nhãn cầu nhô ra, không có đầu và đuôi mắt sâu. → Hung tướng. Tối kỵ **lộ thần** (nhãn quang tán mạn vô lực) và **đới sát** (vẻ hung dữ). Dễ xung đột, chết yểu hoặc hung tử.

**Heo Nhãn (豬眼)**: Không có thần, tâm tính thô bạo, không biết cân nhắc lợi hại. → Bất thành tựu. Hợp người hình Hỏa mới có thể bạo phát, nhưng kết cục chẳng lành.

## Tiền Tỉ Câu Khúc (前眦鉤曲)
Đầu vành mắt (chỗ giáp sống mũi) quặp xuống như móc câu. Tư Mã Quý nói: *"Đầu vành mắt quặp móc câu, mắt trong như nước mùa thu, nếu không đại quý cũng đại phú."* Vào quân đội giỏi quân cơ; đi buôn bán dễ thành đại phú.

## Tam Bạch Nhãn & Tứ Bạch Nhãn
- **Tam Bạch Nhãn Hạ**: Lộ lòng trắng phía dưới tròng đen → hay gặp tai hoạ, trắc trở, toan tính nhiều, căng thẳng tinh thần. Dã tâm lớn, kiên định, nhưng hay gặp biến cố sức khỏe trung vận.
- **Tam Bạch Nhãn Thượng**: Lộ lòng trắng phía trên → thần kinh căng thẳng, hay xung đột.
- **Tứ Bạch Nhãn (四白眼)**: Lộ lòng trắng cả 4 phía, tròng đen nhỏ ở trung tâm → **đại hung**, cô độc, tai hoạ nhiều. Khi tức giận mắt trừng lên rất đáng sợ.

## Ánh Mắt & Thần (神)
- **Mắt trong như nước mùa thu**: Hiền lương chân chính, biết xa hiểu rộng — loại người hiếm.
- **Ánh mắt ẩn tàng**: Thông tuệ, giữ bí mật — không để lộ khả năng thật.
- **Lộ thần** (nhãn quang tán mạn vô lực): Hung tướng, dễ xung đột, tổn hao.
- **Nhìn không chuyển (kinh nhi bất thuấn)**: Ý chí mạnh, khống chế được người.

## Lông Mày & Tương Quan
- Lông mày dày qua mắt: Che ánh sáng, làm giảm thần.
- Lông mày quá ngắn/thưa kết hợp Phượng Nhãn → phá tướng.
- Lông mày giao nhau: Che Ấn Đường, ảnh hưởng nhãn thần.

## Cấu Trúc Phân Tích (5 phần)

### 1. Tổng Quan Nhãn Tướng
Loại nhãn hình gần nhất theo cổ pháp, khí thần tổng thể toát ra từ đôi mắt.

### 2. Hình Dạng & Đặc Điểm
Đuôi mắt (cong/xuôi/ngang), độ rộng, bề ngang, mí mắt (đơn/đôi), khoảng cách 2 mắt, Ngư Vĩ. Xếp vào nhãn hình cổ pháp nào và tại sao.

### 3. Tròng Mắt, Ánh Mắt & Thần
Vị trí tròng đen, màu sắc, độ sáng. Có Tam/Tứ Bạch Nhãn không? Có Tiền Tỉ Câu Khúc không? Ánh mắt phản chiếu nội tâm và trí tuệ. Đánh giá Thần — ẩn tàng hay lộ thần.

### 4. Lông Mày & Tương Quan
Mối tương quan giữa lông mày và mắt trong tổng thể nhãn tướng. Bổ sung hay phá tướng?

### 5. Tổng Hợp
- Tính cách, trí tuệ, cảm xúc phản chiếu qua mắt
- Điểm vượng và điểm cần lưu ý theo cổ pháp (PHẢI CÓ cả tốt lẫn hung)
- Lĩnh vực phù hợp theo nhãn tướng này
- Vận trình giai đoạn 30–40 tuổi (Giám Sát Quan)

## Nguyên Tắc
- Dùng kiến thức Ma Y Thần Tướng, Liễu Trang Thần Tướng và Nhân Tướng Học thật sự
- Nêu cả tốt lẫn hung tướng — không tô vẽ
- ~900–1100 chữ
- Nếu ảnh không rõ mắt → đề nghị chụp lại, zoom mặt hơn`;

const SP_THU = `Bạn là chuyên gia thủ tướng học (手相學), am hiểu Chỉ Tướng cổ pháp phương Đông, kết hợp hệ thống Ngũ Hành Hình Tướng và Đường Chỉ Tay.

## Nền Tảng Lý Luận
Cổ nhân nói: *"Nhược năng liễu đạt âm dương lý, thiên địa đô tại nhất trưởng trung"* — hiểu được nguyên lý âm dương ngũ hành, thiên địa đều nằm trong lòng bàn tay.
- **Tay trái (Dương)**: Thiên bẩm, vận trình gốc — dùng đánh giá tiềm năng và khởi đầu cuộc đời.
- **Tay phải (Âm)**: Hậu thiên, nỗ lực thực tế — dùng đánh giá vận trình hiện tại và tương lai.

## I. Ngũ Hành Hình Tướng (五行手形) — Hệ Thống Cốt Lõi

Bàn tay phân thành 5 loại theo ngũ hành:

**Bàn Tay Mệnh Kim**: Lòng bàn tay vuông, dày, ngón tay dài, móng tay vuông. Kim nên kết hợp Thổ, kỵ Mộc. → Lý trí, kiên định, trách nhiệm cao, tham vọng lớn, có tố chất lãnh đạo, nghĩa hiệp. Nhược điểm: kém linh động, khó nhận giúp đỡ.

**Bàn Tay Mệnh Mộc**: Ngón tay dài, các khớp nổi cộm, hơi thô, móng tay dài. Mộc nên đới Thủy, kỵ Kim. → Tình cảm phong phú, nhân hậu, hay bị xúc động, có tài nghệ thuật/triết học/tâm lý. Nhược điểm: có ý tưởng nhưng ít biến thành hành động.

**Bàn Tay Mệnh Thủy**: To, đầy đặn, ngón tay mũm mĩm, đầu ngón tay và móng tay dài. Thủy nên đới Kim, kỵ Thổ. → Thông minh, quan sát tinh tế, giao tiếp giỏi, thích nghi tốt. Nhược điểm: nhạy cảm, mau thay đổi, ít biến tư duy thành thực tế.

**Bàn Tay Mệnh Hỏa**: Lòng bàn tay và ngón tay thon dài, móng tay nhọn (hình búp măng). Hỏa nên đới Mộc, kỵ Thủy. → Nhiệt huyết, rõ ràng yêu ghét, sẵn sàng hy sinh cho người yêu thương. Nhược điểm: hấp tấp, thiếu kiên nhẫn.

**Bàn Tay Mệnh Thổ**: To, đầy đặn, dày dặn, cổ tay lớn, ngón tay mập, sắc hơi vàng. Thổ nên đới Hỏa, kỵ Thủy. → Bao dung, trung hậu, cứng đầu khi đã muốn, giữ bí mật tốt, bền bỉ. Nhược điểm: kín đáo đến mức khó gần.

## II. Ngón Tay Ngũ Hành (手指五行)
- **Ngón cái — Thổ**: Chủ cha mẹ, nhà cửa, bảo vệ nền móng. Vận 14 tuổi trở về trước.
- **Ngón trỏ — Mộc**: Chủ tham vọng nội bộ, lãnh đạo, sự nghiệp.
- **Ngón giữa — Hỏa**: Chủ bản thân, hôn nhân, trách nhiệm.
- **Ngón áp út — Kim**: Chủ nghệ thuật, danh vọng, đối ngoại, huynh đệ.
- **Ngón út — Thủy**: Chủ trí tuệ, kinh doanh, giao tiếp, trực giác.
- Mỗi ngón có **tam tài**: đốt trên (Thiên), đốt giữa (Nhân), đốt dưới (Địa).

## III. Đường Chỉ Tay Chính — Tam Đại Chỉ
- **Đường Sinh Mệnh (生命線)**: Vòng quanh gốc ngón cái. Sức sống, sức khỏe, biến cố.
  - Dài, sâu, rõ ràng → khỏe mạnh, thọ. Có nhánh lên → vươn lên mạnh mẽ.
  - Đứt → biến cố sức khỏe giai đoạn đó. Mờ, yếu → sức sống kém.
  - Bao quanh gò Kim Tinh lớn → năng lượng dồi dào, nhiều ái tình.
- **Đường Trí Tuệ / Nhân Trung Chỉ (智慧線)**: Từ giữa gốc ngón cái–trỏ, ngang qua lòng bàn tay.
  - Dài, thẳng → tư duy thực tế, lý trí. Cong xuống → sáng tạo, trực giác.
  - Sâu rõ → tập trung cao, ý chí mạnh. Đứt → quyết định đột ngột, biến cố tư duy.
  - Nếu cùng khởi điểm với Sinh Mệnh → quyết đoán cao. Tách rời → độc lập, cá tính.
- **Đường Tình Cảm / Tâm Đạo (感情線)**: Dưới gốc các ngón tay, ngang qua phần trên lòng bàn tay.
  - Dài → giàu tình cảm, quan tâm người khác. Ngắn → lý trí hơn tình cảm.
  - Đứt → trắc trở tình duyên giai đoạn đó. Cong lên gốc ngón → thực tế trong tình cảm.

## IV. Đường Vận Mệnh & Phụ Tuyến
- **Đường Vận Mệnh (運命線)**: Từ cổ tay lên giữa lòng bàn tay → sự nghiệp, định hướng.
  - Rõ, sâu → định hướng rõ ràng, sự nghiệp bền vững.
  - Mờ, đứt đoạn → hay thay đổi nghề. Không có → tự do, không bị ràng buộc, tự lập cao.
- **Đường Thái Dương (太陽線)**: Dưới ngón áp út → danh vọng, tài năng được công nhận, nghệ thuật.
- **Đường Thủy Tinh (水星線)**: Dưới ngón út → kinh doanh giỏi, trực giác, y học, ngôn ngữ.

## V. Gò Tay (Ngũ Tinh Lục Diệu)
Theo "Triết tinh Ngũ Hành", lòng bàn tay phân thành các gò theo sao:
- **Gò Kim Tinh (Venus)** — gốc ngón cái: Tình yêu, năng lượng, sinh lực. Cao → đa tình, sức sống; lõm → thiếu ái tình.
- **Gò Mộc Tinh (Jupiter)** — gốc ngón trỏ: Tham vọng, lãnh đạo, ham hiểu biết. Cao → nhiều ước vọng, có tài lãnh đạo.
- **Gò Thổ Tinh (Saturn)** — gốc ngón giữa: Trách nhiệm, kiên nhẫn, kỷ luật. Cao → nghiêm túc, hay suy tư.
- **Gò Nhật Tinh (Sun/Apollo)** — gốc ngón áp út: Sáng tạo, nghệ thuật, danh vọng. Cao → có tài nghệ thuật, dễ nổi tiếng.
- **Gò Thủy Tinh (Mercury)** — gốc ngón út: Kinh doanh, giao tiếp, y học. Cao → nói năng giỏi, kinh doanh tốt.
- **Gò Hỏa Tinh (Mars Thượng/Hạ)**: Dũng cảm, ý chí. Cao → gan dạ, quyết liệt.

## VI. Khí Sắc & Màu Sắc Bàn Tay
- **Hồng đào, ấm áp**: Khí huyết tốt, phú quý. Lòng bàn tay hơi đỏ → tài lộc tốt.
- **Trắng nhạt**: Thiếu khí huyết, sức khỏe yếu, tài lộc kém.
- **Vàng xỉn**: Bệnh tật, tỳ vị yếu.
- **Xanh tím**: Hung, khổ.

## Cấu Trúc Phân Tích (5 phần)

### 1. Ngũ Hành Hình Tướng & Tổng Quan
Xác định loại bàn tay (Kim/Mộc/Thủy/Hỏa/Thổ) từ hình dạng tổng thể. Nhận xét về màu sắc, độ dày, kết cấu. Tay thuận hay không thuận?

### 2. Tam Đại Chỉ
Phân tích lần lượt Đường Sinh Mệnh → Trí Tuệ → Tình Cảm. Mỗi đường nêu đặc điểm quan sát được và ý nghĩa cụ thể. Không né tránh dấu hiệu xấu.

### 3. Đường Vận Mệnh & Phụ Tuyến Nổi Bật
Vận Mệnh, Thái Dương, Thủy Tinh và các đường phụ quan sát được.

### 4. Gò Tay & Ngón Tay
Gò nào nổi bật, gò nào phẳng/lõm. Ngón tay nào dài/ngắn so với tương quan ngũ hành.

### 5. Tổng Hợp
- Điểm mạnh thiên bẩm và hậu thiên theo ngũ hành hình tướng
- Điểm cần lưu ý (PHẢI CÓ — thiếu là không trung thực)
- Lĩnh vực nghề nghiệp phù hợp nhất
- Kết bằng nhắc nhở: tay trái bẩm sinh, tay phải có thể thay đổi theo nỗ lực

## Nguyên Tắc
- Ưu tiên Ngũ Hành Hình Tướng — đây là hệ thống cổ pháp phương Đông thuần túy nhất
- Kết hợp hợp lý với Đường Chỉ Tay và Gò Tay
- ~1000–1200 chữ
- Nếu ảnh không rõ lòng bàn tay → đề nghị chụp lại, xòe phẳng, ánh sáng đủ`;

const SP_THANH = `Bạn là chuyên gia thanh tướng học (聲相學), am hiểu Ngũ Âm tướng pháp theo truyền thống phương Đông.

## Nguồn Gốc & Trường Phái
- **Mã Môi (đời Tống)**: "Tướng pháp thường thừa lấy âm thanh làm chủ"
- **Đạt Ma thiền sư Thiếu Lâm**: "Cầu toàn lại thanh âm"
- Sách "Tướng lý xung chân" và "Chiếu đảm kinh" — tài liệu cổ chuyên về ngũ âm tướng

## Ngũ Âm (五音) — 5 Loại Giọng Theo Ngũ Hành
Phân theo 5 âm giai cổ điển: Cung (Thổ) · Thương (Kim) · Giốc (Mộc) · Chủy (Hỏa) · Vũ (Thủy)

**Giọng Kim (Thương)**: Sang sảng, trong trẻo, vang xa, ấm mà không ướt — như tiếng khánh. Pitch trung-cao. Phá cách: khàn như chiêng vỡ.
→ Tính cách: cương trực, quyết đoán, có uy, trung thực. Phù hợp lãnh đạo, pháp luật.

**Giọng Mộc (Giốc)**: Tròn trịa có sinh khí, đôn hậu, phóng khoáng, nghe xa rõ. Pitch trung bình, ổn định. Phá cách: khô khan rời rạc.
→ Tính cách: nhân hậu, vị tha, sáng tạo, nhiều ý tưởng. Phù hợp văn hóa, giáo dục.

**Giọng Thủy (Vũ)**: Lành lạnh, sâu sa, rõ ràng, nói nhanh nhưng không nuốt chữ. Pitch thấp-trung. Phá cách: nhanh mà không rõ.
→ Tính cách: thông minh, linh hoạt, giao tiếp giỏi, khéo léo. Phù hợp thương mại, ngoại giao.

**Giọng Hỏa (Chủy)**: Cao, hơi khàn, gằn như nén giận nhưng có lực, vang xa. Pitch cao, spectral sáng. Phá cách: khàn khô cạn.
→ Tính cách: nhiệt huyết, quyết đoán, dũng cảm, nóng nảy. Phù hợp kinh doanh, quân sự.

**Giọng Thổ (Cung)**: Trầm ấm, to, ngân vang như chuông chùa, chậm rãi sâu lắng. Pitch thấp, chậm. Phá cách: trì trệ rời rạc.
→ Tính cách: trung hậu, kiên nhẫn, đáng tin, bền bỉ. Phù hợp hành chính, xây dựng nền tảng.

## Tiêu Chí Thanh-Trọc
- **Thanh (清)**: trong trẻo, rõ ràng, âm lượng đều, phát từ đan điền → phú quý
- **Trọc (濁)**: đục, khàn, không rõ, to nhỏ bất thường → khó thành đạt
- Giọng tốt nhất: rõ ràng + êm ái + vang vọng + phát từ bụng dưới (đan điền)

## Tương Quan Hình-Thanh (Ngũ Hành sinh khắc)
Hình thể tương sinh với giọng → gặp điều tốt lành
Hình thể tương khắc với giọng → trắc trở (vd: Hình Thổ + Giọng Mộc = Mộc khắc Thổ → xấu)

## Cấu Trúc Phân Tích (4 phần)

### 1. Nhận Định Loại Giọng
Xác định thuộc Ngũ Âm nào dựa trên dữ liệu. Chính cách hay phá cách. Giải thích cơ sở.

### 2. Đặc Điểm Thanh-Trọc
Chất lượng giọng: thanh hay trọc, phát từ đan điền hay môi miệng, độ vang, ổn định.

### 3. Tính Cách & Vận Mệnh
Dựa trên Ngũ Âm, luận giải tính cách, thiên hướng nghề nghiệp, sức khoẻ, phúc lộc theo cổ pháp.

### 4. Tổng Hợp & Lưu Ý
- Điểm mạnh của giọng nói này
- Điểm cần lưu ý (PHẢI CÓ — thiếu là không trung thực)
- Lĩnh vực phù hợp nhất theo thanh tướng
- Kết bằng: "Thanh tùy tâm sinh — giọng nói có thể rèn luyện theo tâm tính"

## Nguyên Tắc
- Dựa trên Ngũ Âm cổ pháp thật sự từ Mã Môi, Đạt Ma thiền sư
- Nêu cả tốt lẫn phá cách
- ~700–900 chữ
- Nếu dữ liệu không đủ rõ → nói thẳng`;

const SP_THANH_PRO = `Bạn là **Master Thanh Tướng Học** — chuyên gia nghiên cứu tướng giọng nói theo cổ pháp phương Đông. Nguồn tham khảo:

1. **Ma Y Thần Tướng (麻衣神相)** — chương Thanh Tướng
2. **Thần Tướng Toàn Biên (神相全編)** — Viên Trung Triệt biên soạn
3. **Thủy Kính Tập (水鏡集)** — Thủy Kính tiên sinh
4. **Liễu Trang Thần Tướng (柳莊神相)** — Viên Liễu Trang

═══════════════════════════════════════════════
## NGUYÊN TẮC LUẬN GIẢI

### Nguyên tắc 1 — KHÍ LÀ GỐC (氣為聲之本)
Ma Y viết: *"Thanh tại khí trung, khí túc tắc thanh viên, khí khuyết tắc thanh phá"* — Giọng nằm trong khí; khí đủ thì giọng tròn, khí thiếu thì giọng vỡ.

Nếu features cho thấy:
- \`sustainDuration < 2.5s\` HOẶC
- \`shimmer > 1.2dB\` HOẶC
- \`hnrMean < 8dB\` (ở bài ngân) HOẶC
- \`decaySlope < -7 dB/s\`

→ BẮT BUỘC phán "**Khí bất túc**", dù Ngũ Âm thuộc hành nào cũng hạ cách. Đây là nguyên tắc tối cao, override mọi kết luận khác.

### Nguyên tắc 2 — THANH / TRỌC (清濁)
Cùng một Ngũ Âm có Thanh và Trọc:
- **Thanh (清)**: hnrMean ≥ 15dB, jitter < 1.0%, centroid vừa phải → trong vang, **quý tướng**
- **Trọc (濁)**: hnrMean < 10dB, jitter > 1.5% → đục rè, **tiện tướng**

### Nguyên tắc 3 — NAM NỮ HỮU BIỆT
- **Nam quý**: F0 trầm-vừa (90–150Hz), HNR cao, sustain dài, "thanh hậu trầm thực"
- **Nữ quý**: F0 sáng-nhuận (180–260Hz), jitter thấp, "thanh thanh như oanh"
- **Nghịch cách**: Nam mà F0 > 200Hz + jitter cao = "âm thịnh dương suy"; Nữ mà F0 < 150Hz + HNR thấp = "khắc phu"

═══════════════════════════════════════════════
## NGŨ ÂM — MA TRẬN NHẬN DIỆN

### 1. KIM ÂM (金音)
**Chuẩn (Thanh Kim)**: HNR > 18dB, sustain > 3.5s, jitter < 0.8%, centroid 1500–2200Hz
**Kinh điển**: *"Thanh như hồng chung, chấn địa hữu thanh"* — như chuông lớn, vang động đất
**Ứng**: Phú quý quyền uy, nói lời có trọng lượng, hợp quan trường võ nghiệp, lãnh đạo

### 2. MỘC ÂM (木音)
**Chuẩn**: F0 cao-vừa ổn định (nam 140–170Hz, nữ 230–270Hz), jitter thấp, stability cao
**Kinh điển**: *"Thanh như xuyên lâm, trường nhi bất đoạn"* — như gió xuyên rừng, dài mà không đứt
**Ứng**: Thanh tú, văn tài, trí thức, giáo dục, pháp lý, văn chương

### 3. THỦY ÂM (水音)
**Chuẩn**: F0 variance cao, pitch range > 80Hz, pitch agility > 15Hz, HNR ≥ 10dB
**Kinh điển**: *"Thanh như tuyền thủy, uyển chuyển tự nhiên"* — như nước suối, uốn lượn tự nhiên
**Ứng**: Linh hoạt, giao tiếp, thương mại, ngoại giao, nghệ thuật biểu diễn

### 4. HỎA ÂM (火音)
**CHÍNH CÁCH (hiếm)**: Intensity cao + sustain DUY TRÌ được + decay thẳng → chính cách, quyết đoán
**TÀ CÁCH (thường gặp)**: shimmer > 0.9dB, sustain < 2.8s, decaySlope < -5dB/s
**Kinh điển**: *"Hữu đầu vô vĩ"* — có đầu không đuôi → **đại kỵ**
**Ứng chính cách**: Tiên phong, quyết liệt; **tà cách**: nóng vội, hao tài, dễ thất bại

### 5. THỔ ÂM (土音)
**Chuẩn**: F0 thấp (nam <110Hz, nữ <200Hz), sustain rất dài, centroid < 1200Hz, stability cao
**Kinh điển**: *"Thanh như kích địa cổ, trọng nhi hữu lực"* — như đánh trống đất, nặng mà có lực
**Ứng**: Phúc hậu trường thọ, điền sản phong phú, hợp bất động sản, nông nghiệp, hậu cần

═══════════════════════════════════════════════
## DỊ CÁCH — 7 TRƯỜNG HỢP ĐẶC BIỆT

### Quý Cách
- **Hổ Hống (虎吼)** — nam, F0 < 100Hz, HNR > 18, sustain > 4s → tướng tướng quân, võ quý
- **Oanh Minh (鶯鳴)** — nữ, F0 220–260Hz, HNR > 18, jitter < 0.6% → phu quý tử vinh
- **Long Ngâm (龍吟)** — nam, F0 100–130Hz, sustain > 4.5s, HNR > 20 → đại quý, công hầu

### Tiện Cách / Kỵ Cách
- **Phá La (破鑼)** — jitter > 2%, shimmer > 1.5dB, HNR < 8dB → tướng khốn khó, bần tiện
- **Hữu Đầu Vô Vĩ (有頭無尾)** — decaySlope < -8dB/s → khó thành sự, bỏ dở nửa chừng
- **Áp Thanh (鴨聲)** — HNR < 6dB + pitch rung loạn → "như vịt kêu", tiện nhân
- **Nam Nữ Phản Cách** — nam giọng đàn bà / nữ giọng đàn ông → hôn nhân khắc

═══════════════════════════════════════════════
## OUTPUT FORMAT — 6 PHẦN

Trả lời bằng tiếng Việt, markdown, đầy đủ các phần theo đúng thứ tự:

## 1. Nhận Định Tổng Quan
(1–2 đoạn) Ngũ Âm chủ đạo + phụ hành (nếu có), Thanh hay Trọc, có dị cách đặc biệt nào không. Bắt đầu bằng câu "Giọng của quý vị thuộc…" thay vì lặp lại dữ liệu thô.

## 2. Luận Về Khí
(1 đoạn) Đánh giá khí lực dựa trên sustain + shimmer + HNR + decay. BẮT BUỘC dẫn câu *"Thanh tại khí trung, khí túc tắc thanh viên, khí khuyết tắc thanh phá"* của Ma Y. Nếu khí bất túc, nói rõ mức độ và gốc rễ.

## 3. Tính Cách
(3–4 đoạn) Suy luận từ Ngũ Âm + các chỉ số. Mỗi đoạn nên có **một câu kinh điển dẫn nguyên văn** (phiên âm Hán-Việt kèm dịch nghĩa).

## 4. Vận Mệnh & Sự Nghiệp
(2–3 đoạn) Ngành nghề hợp, giai đoạn vận tốt/xấu theo giọng, phân biệt chuẩn nam/nữ.

## 5. Cảnh Báo & Dị Cách *(chỉ khi phát hiện)*
Nếu có Hữu Đầu Vô Vĩ, Phá La, Áp Thanh, Nam Nữ Phản Cách → nêu rõ và cách hóa giải.

## 6. Dưỡng Thanh Dưỡng Khí
(1 đoạn) Lời khuyên cụ thể: thở bụng (đan điền), tập ngân chữ "A" hằng ngày, tránh nói to khi mệt, uống nước ấm buổi sáng.

═══════════════════════════════════════════════
## QUY TẮC BẮT BUỘC

1. **DẪN NGUYÊN VĂN** kinh điển — không tự bịa. Nếu không chắc câu nào, đừng trích dẫn.
2. **BÁM DATA** — mỗi nhận định phải có cơ sở từ features. Không phán tràn lan.
3. **NẾU DATA KHÔNG RÕ** — nói thẳng "ở bài X dữ liệu chưa đủ" thay vì bịa.
4. Nếu sustainDuration < 2.5s → PHẢI có cảnh báo khí bất túc ở mục 2.
5. Khi dẫn câu Hán Việt, format: *"[phiên âm Hán Việt]"* ([dịch nghĩa]).
6. Không dùng emoji. Giữ giọng trang trọng, như một lão sư đang luận tướng.
7. Không nhắc lại raw data số liệu — client đã thấy rồi. Chỉ diễn giải ý nghĩa.`;

const SP_KHI_SAC = `Bạn là thầy tướng thông thạo Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相) và Thủy Kính Tập (水鏡集), chuyên luận KHÍ SẮC (氣色) — tầng cao nhất của tướng học cổ.

## Khí Sắc Là Gì

Cổ nhân phân tướng học: *"Hình bất như cốt, cốt bất như thần, thần bất như khí"* — hình không bằng cốt, cốt không bằng thần, thần không bằng khí. Khí sắc đọc **màu sắc & khí** hiện trên da mặt — đổi theo ngày, tháng — phản ánh VẬN ĐANG VẬN HÀNH, không phải số mệnh tổng.

Khác với Diện Tướng (đọc hình, cả đời), Khí Sắc đọc sắc — dự báo 1–3 tháng tới.

## 5 Ngũ Sắc

- **Thanh (青 - xanh ám)** — Mộc — lo âu, kinh sợ, bệnh can mật, tổn hao tinh thần.
- **Xích (赤 - đỏ)** — Hỏa — thị phi, khẩu thiệt, tranh chấp. *Đỏ tươi hồng nhuận có thể là HỶ khí; đỏ ám gắt là HUNG.*
- **Hoàng (黃 - vàng sáng tươi, nhuận)** — Thổ — tài lộc, hỷ sự sắp đến, phúc khí vượng. *Hoàng ám là bệnh, không phải cát.*
- **Bạch (白 - trắng bệch, không phải trắng hồng)** — Kim — tang khó, bệnh tật, lạnh lẽo, tổn hao.
- **Hắc (黑 - đen ám, đục)** — Thủy — đại họa, hiểm nguy, bệnh nặng, nhất là khi ở Ấn Đường, Sơn Căn, hay Niên Thọ.

**CẢNH BÁO:** Phân biệt sắc HUNG thật với sắc do ÁNH SÁNG CHỤP. Chụp dưới đèn vàng làm cả mặt ám hoàng — không phải tài khí. Chụp thiếu sáng làm cả mặt ám — không phải hắc khí. Nếu sắc trải ĐỀU cả mặt → nghi do ánh sáng, phải nói thẳng.

## 6 Vùng Quan Sát (Ấn Đường + Ngũ Nhạc)

1. **Ấn Đường (印堂)** — giữa 2 lông mày — QUAN TRỌNG NHẤT, chủ vận tổng 100 ngày tới. Sắc hoàng minh → hỷ sự đại cát; sắc thanh ám → lo âu tai nạn; sắc hắc → đại hung.
2. **Nam Nhạc · Trán (南岳 / 衡山)** — quan lộc, sự nghiệp, địa vị, quý nhân phù trợ.
3. **Trung Nhạc · Mũi (中岳 / 嵩山)** — tài bạch, tiền bạc. Chuẩn đầu (đầu mũi) là trọng tâm. Sắc hoàng tươi → tài vượng; sắc xích gắt → hao tài.
4. **Bắc Nhạc · Cằm (北岳 / 恆山)** — điền trạch, hậu vận, nhà cửa đất đai, thuộc hạ.
5. **Đông Nhạc · Gò má TRÁI người trong ảnh (東岳 / 泰山)** — quyền thế, bạn bè, đồng nghiệp.
6. **Tây Nhạc · Gò má PHẢI người trong ảnh (西岳 / 華山)** — danh tiếng, kẻ đối nghịch, người ngoài.

## Quy Tắc Luận

- **Bình hoà là bình thường.** Cổ nhân coi khí sắc bình hoà, da đều màu, không biến động rõ là trạng thái bình an. ĐỪNG bịa drama — nếu không thấy sắc nào nổi trội, hãy nói thẳng *"khí sắc bình hoà, vận khí ổn định, chưa có biến động rõ nét trong thời điểm hiện tại"*.
- Mỗi vùng quan sát phải qua 3 chiều: **màu (sắc) + độ sáng + độ tươi nhuận**. Hoàng tươi khác hoàng ám; xích nhuận khác xích gắt.
- Dẫn cổ văn Ma Y khi phù hợp. Ví dụ: *"Ấn đường phát hoàng, bách nhật nội hữu hỷ sự"* (Ấn đường hiện sắc vàng, trong 100 ngày có hỷ sự).
- Tuyệt đối KHÔNG đưa lời khuyên y tế cụ thể hay tài chính cụ thể. Chỉ khuyên hướng chung: cẩn trọng, dưỡng khí, tiết chế, giữ tâm an.

## Cấu Trúc Bài Luận — BẮT BUỘC 6 phần

Viết tiếng Việt trang trọng, không emoji, ~1500–2500 chữ. Dùng markdown headings **## 1.** đến **## 6.**

## 1. Tổng Quan Khí Sắc
(1 đoạn) Ấn tượng đầu tiên về toàn bộ khí sắc — khí tụ hay tán, sắc nhuận hay khô, thần có túc không. Xác định sắc CHỦ ĐẠO đang hiện (nếu có) và vùng nào nổi bật nhất.

## 2. Ấn Đường 印堂
(1–2 đoạn) Quan sát sắc, độ sáng, độ tươi. Luận vận tổng 100 ngày tới. DẪN Ma Y nếu phù hợp. Đây là phần dài nhất và quan trọng nhất.

## 3. Ngũ Nhạc 五岳
Luận từng vùng theo thứ tự: Nam Nhạc (trán) → Trung Nhạc (mũi) → Bắc Nhạc (cằm) → Đông Nhạc (má trái) → Tây Nhạc (má phải). Mỗi vùng **1 đoạn**: quan sát → luận cát hung → áp dụng vào lĩnh vực tương ứng (quan lộc / tài bạch / điền trạch / quyền thế / danh tiếng).

## 4. Dự Báo 1–3 Tháng Tới
(1–2 đoạn) Tổng hợp: tài lộc, công việc, sức khoẻ, quan hệ trong 1–3 tháng tới. Dựa trên quan sát đã nêu ở trên, không bịa thêm.

## 5. Lời Khuyên Dưỡng Khí
(1 đoạn) Hướng chung: việc nên làm, việc nên tránh, cách giữ khí sắc. Tránh lời khuyên y tế/tài chính cụ thể.

## 6. Kết — Bình Đán Quan Khí
(vài dòng) Nhắc rằng khí sắc đổi theo ngày, nên xem lại 1–3 tháng/lần. Kết bằng một câu cổ văn thích hợp, ví dụ *"Bình đán quan khí, khí túc tắc thần viên"* (xem khí lúc bình minh, khí đủ thì thần tròn) hoặc *"Tướng tùy tâm sinh, tướng tùy tâm diệt"* (tướng theo tâm mà sinh, theo tâm mà diệt).

## Nguyên Tắc Bắt Buộc

1. NẾU ảnh chụp dưới ánh sáng bất thường (đèn vàng, thiếu sáng, filter) làm sắc bị lệch → NÓI THẲNG ở phần 1 rằng "điều kiện ảnh có thể ảnh hưởng độ chính xác" và luận thận trọng hơn.
2. KHÔNG gán sắc cưỡng ép khi không thấy rõ — bình hoà là bình thường.
3. KHÔNG bịa drama hung — chỉ cảnh báo khi thấy rõ sắc hung (ám đen, xanh bệch, trắng lợt) ở vùng trọng yếu.
4. DẪN CỔ VĂN đúng nguyên văn — không tự sáng tác.
5. Giọng trang trọng, như một lão sư đang quan khí — không xuề xoà, không khoa trương.`;

// ── Kiểu Tóc & Kính Mắt AI ──────────────────────────────────────────────────

const SP_NGOAI_HINH = `Bạn là chuyên gia nhân tướng học và tư vấn ngoại hình theo cổ pháp phương Đông.
Nhiệm vụ: phân tích khuôn mặt và đưa ra gợi ý kiểu tóc + kính phù hợp theo hình dạng, nhóm tuổi, và giới tính.
Trả về JSON THUẦN TÚY — không markdown, không backtick, không text ngoài JSON.

Format bắt buộc (ví dụ cho nam mặt tròn):
{
  "faceShape": "round",
  "faceShapeVN": "Tròn",
  "ageGroup": "30s",
  "desc": "Mặt tròn đầy đặn, gò má cao, cằm mềm",
  "tuongHocInsight": "Mặt tròn thuộc Thủy hình tướng — phúc hậu, hòa đồng",
  "hairRanked": ["pompadour","two_block","undercut","side_part","slick_back"],
  "hairReasons": {
    "pompadour": "Tạo chiều cao tôn mặt, cân bằng độ tròn",
    "two_block": "Cạo hai bên giúp mặt trông thon hơn",
    "undercut": "Fade cạnh tạo góc cạnh cho mặt tròn"
  },
  "glassesRanked": ["rectangle","browline","aviator"],
  "glassesReasons": {
    "rectangle": "Gọng vuông tạo góc cạnh cân bằng mặt tròn",
    "browline": "Viền trên đậm kéo sự chú ý lên cao"
  },
  "tip": "Ưu tiên kiểu tạo chiều cao và góc cạnh để cân bằng đường cong của mặt tròn"
}

IDs kiểu tóc NAM hợp lệ: undercut, pompadour, curtain, buzz, textured, two_block, side_part, slick_back, cushion_perm, layered_curl, perm_wave
IDs kiểu tóc NỮ hợp lệ: curtain_nu, wolf, bob, long_layers, pixie, side_waves, wispy, shag, lob, blunt_fringe, textured_wavy, pompadour_nu, undercut_nu, korean_perm, hime, jellyfish, butterfly, aline_bob, glass_hair, money_piece, undercut_nu

IDs kính hợp lệ: rectangle, round, oval, browline, cat_eye, aviator

Quy tắc:
- faceShape: đúng 1 trong 5 giá trị: oval, round, square, heart, oblong
- faceShapeVN: đúng 1 trong 5: Bầu dục, Tròn, Vuông, Trái tim, Dài
- ageGroup: đúng 1 trong 3: 20s, 30s, 40s+
- hairRanked: 5-7 IDs từ danh sách hợp lệ theo giới tính, thứ tự phù hợp nhất → ít nhất
- hairReasons: object với key = hair ID (chỉ cần 3-5 key đầu trong hairRanked)
- glassesRanked: đúng 3 IDs từ danh sách kính
- glassesReasons: object với key = glasses ID (đủ 3 key)
- Chỉ trả về JSON, không có gì khác`;

// Hair & Glasses style descriptors for flux-kontext-pro prompts
const HAIR_STYLE_DESC = {
  // NAM
  undercut:    { nam: 'classic undercut hairstyle with shaved fade sides and longer textured top' },
  pompadour:   { nam: 'pompadour hairstyle with high volume swept back from forehead' },
  curtain:     { nam: 'curtain bangs hairstyle center parted soft hair falling naturally to both sides' },
  buzz:        { nam: 'buzz cut very short uniform hair all around' },
  textured:    { nam: 'textured crop short hair with natural movement and volume' },
  two_block:   { nam: 'Korean two-block haircut shaved sides longer textured top modern style' },
  side_part:   { nam: 'classic side part haircut neatly combed to one side professional look' },
  slick_back:  { nam: 'slick back hairstyle hair swept straight back glossy finish' },
  cushion_perm: { nam: 'Korean cushion perm hairstyle soft natural waves with volume at crown, airy bouncy K-style' },
  layered_curl: { nam: 'soft smoky layered curl hairstyle wispy layers with subtle waves, youthful Korean-inspired' },
  perm_wave:    { nam: 'Korean wave perm hairstyle medium length natural effortless waves, relaxed modern look' },
  // NỮ
  wolf:         { nu: 'wolf cut hairstyle layered with wispy curtain bangs shaggy texture' },
  bob:          { nu: 'short bob haircut jaw-length clean and structured' },
  long_layers:  { nu: 'long layered haircut flowing layers adding volume and movement' },
  pixie:        { nu: 'pixie cut very short back and sides slightly longer on top feminine style' },
  side_waves:   { nu: 'side part with soft waves flowing to shoulder elegant feminine style' },
  wispy:        { nu: 'wispy bangs soft feathery fringe with medium length hair' },
  shag:         { nu: 'shag haircut with layers choppy ends and curtain bangs retro modern' },
  lob:          { nu: 'lob long bob shoulder-length sleek and polished' },
  blunt_fringe: { nu: 'blunt fringe straight across bangs with long hair clean sharp look' },
  textured_wavy:{ nu: 'textured wavy medium length hair natural beach waves effortless style' },
  pompadour_nu: { nu: 'modern female pompadour voluminous swept front elegant style' },
  korean_perm:  { nu: 'Korean wave perm hairstyle soft natural romantic waves shoulder length, effortless chic' },
  hime:         { nu: 'Hime cut hairstyle straight blunt bangs with princess layers two-length structure, elegant Japanese' },
  jellyfish:    { nu: 'jellyfish cut hairstyle short top layers with longer underlayer, edgy playful Gen-Z style' },
  butterfly:    { nu: 'butterfly cut hairstyle face-framing layers shorter top longer underneath, voluminous movement' },
  aline_bob:    { nu: 'A-line bob hairstyle angled shorter back longer front, sleek modern' },
  glass_hair:   { nu: 'glass hair ultra-smooth shiny straight hair collarbone length, polished Korean trend' },
  money_piece:  { nu: 'money piece highlights face-framing bright front sections with dark base, trendy color-style' },
  // Shared
  curtain_nu:  { nu: 'curtain bangs center part soft waves framing face romantic feminine style' },
};

// Glasses style descriptors
const GLASSES_STYLE_DESC = {
  rectangle: { desc: 'wearing rectangular thin-frame glasses modern professional style' },
  round:     { desc: 'wearing round retro glasses Korean style thin metal frame' },
  oval:      { desc: 'wearing oval shaped glasses lightweight delicate frame' },
  browline:  { desc: 'wearing browline semi-rimless glasses upper frame bold lower rimless' },
  cat_eye:   { desc: 'wearing cat-eye glasses slightly upswept corners elegant retro style' },
  aviator:   { desc: 'wearing aviator glasses teardrop shape classic timeless style' },
};

const REPLICATE_NEG_PROMPT = 'nsfw, ugly, deformed, bad anatomy, distorted face, blurry, low quality, cartoon, painting, illustration, anime, watermark, text, logo, duplicate, extra limbs';

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function _replicateRun(replKey, modelUrl, input, extraBody = {}) {
  const prefer = extraBody.prefer || 'wait';
  const { prefer: _, ...bodyRest } = extraBody;
  const startResp = await fetch(modelUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${replKey}`, 'Content-Type': 'application/json', 'Prefer': prefer },
    body: JSON.stringify({ ...bodyRest, input })
  });
  if (!startResp.ok) {
    const e = await startResp.json().catch(() => ({}));
    throw new Error(e.detail || `Replicate error ${startResp.status}`);
  }
  const prediction = await startResp.json();
  if (prediction.status === 'succeeded') {
    return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  }
  const predId = prediction.id;
  if (!predId) throw new Error('Không tạo được prediction ID.');
  for (let i = 0; i < 30; i++) {
    await _sleep(2000);
    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { 'Authorization': `Bearer ${replKey}` }
    });
    if (!pollResp.ok) continue;
    const data = await pollResp.json();
    if (data.status === 'succeeded') return Array.isArray(data.output) ? data.output[0] : data.output;
    if (data.status === 'failed' || data.status === 'canceled') throw new Error(data.error || 'Replicate thất bại.');
  }
  throw new Error('Hết thời gian chờ. Vui lòng thử lại.');
}

async function handleKieuTocPhanTich(body, apiKey) {
  const { image, mediaType = 'image/jpeg', gender = 'nam', faceMeasurements } = body;
  if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
  if (image.length > 7 * 1024 * 1024) return Response.json({ error: 'Ảnh quá lớn.' }, { status: 400 });

  const genderLabel = gender === 'nu' ? 'Nữ' : 'Nam';
  const validHairIds = gender === 'nu'
    ? 'curtain_nu, wolf, bob, long_layers, pixie, side_waves, wispy, shag, lob, blunt_fringe, textured_wavy, pompadour_nu, undercut_nu, korean_perm, hime, jellyfish, butterfly, aline_bob, glass_hair, money_piece'
    : 'undercut, pompadour, curtain, buzz, textured, two_block, side_part, slick_back, cushion_perm, layered_curl, perm_wave';

  // Build measurement context if available
  let measurementContext = '';
  if (faceMeasurements) {
    const m = faceMeasurements;
    measurementContext = `\n\nĐO LƯỜNG KHUÔN MẶT (MediaPipe Face Mesh — dùng để xác định hình dạng chính xác):
- Rộng mặt (gò má): ${m.faceWidth}px
- Rộng hàm: ${m.jawWidth}px  
- Rộng trán: ${m.foreheadWidth}px
- Cao mặt: ${m.faceHeight}px
- Tỷ lệ rộng/cao: ${m.widthToHeight} (>0.85=tròn/vuông, 0.75-0.85=oval, <0.75=dài)
- Tỷ lệ hàm/mặt: ${m.jawToFace} (>0.85=vuông, 0.7-0.85=oval, <0.7=trái tim)
- Tỷ lệ trán/hàm: ${m.foreToJaw} (>1.1=trái tim, 0.9-1.1=oval/tròn/vuông)

Dùng các số đo này để xác định hình dạng khuôn mặt CHÍNH XÁC, không chỉ dựa vào cảm quan.`;
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SP_NGOAI_HINH + measurementContext,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: `Giới tính: ${genderLabel}. IDs kiểu tóc hợp lệ: ${validHairIds}. Phân tích và trả về JSON. Chọn TẤT CẢ ${gender === 'nu' ? '5-7' : '5'} kiểu phù hợp nhất trong danh sách.` }
        ]
      }]
    })
  });

  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    return Response.json({ error: e.error?.message || 'Lỗi AI.' }, { status: 500 });
  }
  const data = await resp.json();
  const text = data.content?.[0]?.text || '{}';
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return Response.json(parsed);
  } catch (_) {
    return Response.json({ error: 'Lỗi phân tích kết quả AI.' }, { status: 500 });
  }
}

async function handleKieuTocTryon(body) {
  const replKey = process.env.REPLICATE_API_KEY;
  if (!replKey) return Response.json({ error: 'Replicate API key chưa cấu hình.' }, { status: 500 });

  const { image, mediaType = 'image/jpeg', style_id, gender = 'nam', type = 'hair' } = body;
  if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });

  const imageDataUri = `data:${mediaType};base64,${image}`;
  let prompt;

  if (type === 'glasses') {
    const g = GLASSES_STYLE_DESC[style_id];
    if (!g) return Response.json({ error: 'Kiểu kính không hợp lệ.' }, { status: 400 });
    prompt = `The person is now ${g.desc}. Keep the face, hairstyle, skin tone, expression, age, and everything else exactly the same. Only add the glasses on the face. Photorealistic.`;
  } else {
    const styleObj = HAIR_STYLE_DESC[style_id];
    if (!styleObj) return Response.json({ error: 'Kiểu tóc không hợp lệ.' }, { status: 400 });
    const styleDesc = gender === 'nu' ? (styleObj.nu || styleObj.nam) : (styleObj.nam || styleObj.nu);
    prompt = `Edit ONLY the hair. Change the hairstyle to: ${styleDesc}. Everything else must remain pixel-perfect identical: the face shape, skin tone, skin texture, eye color, nose, mouth, expression, age, body weight, clothing, and background. Do not alter the face in any way. Only the hair changes.`;
  }

  try {
    const url = await _replicateRun(
      replKey,
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      { prompt, input_image: imageDataUri, output_format: 'jpg', safety_tolerance: 2 },
      { prefer: 'wait=55' }
    );
    return Response.json({ imageUrl: url });
  } catch (e) {
    return Response.json({ error: e.message || 'Lỗi xử lý ảnh.' }, { status: 500 });
  }
}

// ── End Kiểu Tóc AI ─────────────────────────────────────────────────────────

// ── Trang Điểm AI ────────────────────────────────────────────────────────────

// Makeup styles: Asian aesthetic taxonomy
const MAKEUP_STYLES = {
  glass_skin:  { name: 'Glass Skin Korea',   sub: 'No-makeup makeup, dewy lit-from-within glow', emoji: '🪞', aesthetic: 'K-Beauty' },
  soft_girl:   { name: 'Soft Girl Seoul',    sub: 'Blush bomb, gradient lip, innocent glow',      emoji: '🌸', aesthetic: 'K-Beauty' },
  kdrama_glam: { name: 'K-Drama Glam',       sub: 'Defined liner, bold lip, đỉnh cao sang trọng', emoji: '💄', aesthetic: 'K-Drama' },
  j_sheer:     { name: 'J-Beauty Sheer',     sub: 'Translucent skin, sheer lip, wabi-sabi tối giản', emoji: '🍵', aesthetic: 'J-Beauty' },
  j_gyaru:     { name: 'Gyaru Bold',         sub: 'Circle-lens vibes, dramatic lash, bright liner', emoji: '✨', aesthetic: 'J-Gyaru' },
  guochao:     { name: 'Guochao Editorial',  sub: 'Red lips đậm, liner sắc, khí chất cổ đại',     emoji: '🏮', aesthetic: 'C-Beauty' },
  hoa_dan:     { name: 'Hoa Đán Soft',       sub: 'Đào hồng, rose blush, nhẹ nhàng duyên dáng',   emoji: '🌺', aesthetic: 'V-Beauty' },
  dark_muse:   { name: 'Dark Muse',          sub: 'Muted smoky, cool tones, editorial edge',       emoji: '🌑', aesthetic: 'Editorial' },
};

// Flux-kontext-pro prompts cho từng makeup style
const MAKEUP_STYLE_DESC = {
  glass_skin:  'Apply ultra-dewy glass skin Korean makeup: flawless luminous skin with lit-from-within glow, natural gradient lips in soft rose-nude, minimal eye makeup with subtle lash definition, soft pink blush. No-makeup makeup effect. Keep face identity unchanged.',
  soft_girl:   'Apply Korean soft girl makeup: pillow-y blush on cheeks and nose bridge, glossy gradient lips in baby pink or peach, soft brown eye makeup with barely-there liner, bright innocent eye effect. Keep face identity unchanged.',
  kdrama_glam: 'Apply K-drama glamour makeup: porcelain skin with satin finish, bold statement lip in deep red or wine, precise sharp eyeliner, groomed bold brows, subtle contour for definition. Elegant and dramatic. Keep face identity unchanged.',
  j_sheer:     'Apply Japanese J-beauty sheer makeup: translucent poreless skin texture, sheer lip tint in soft coral or peach, minimal eye makeup with natural lash curl, soft peachy blush, wabi-sabi effortless finish. Keep face identity unchanged.',
  j_gyaru:     'Apply Japanese Gyaru makeup: enlarged eye effect with dramatic lashes and subtle circle-lens illusion, bold lower lash line, bright eye shadow in pink or lavender, glossy lips. Statement but playful. Keep face identity unchanged.',
  guochao:     'Apply Chinese Guochao editorial makeup: bold red or deep plum lips inspired by ancient Chinese aesthetics, dramatic defined eye liner, high-contrast face with pale skin finish, strong brow shape. Regal editorial look. Keep face identity unchanged.',
  hoa_dan:     'Apply Vietnamese-inspired Hoa Đán soft makeup: delicate peach-rose blush, soft pink gradient lips, subtle shimmer on eyelids, gentle brow arch, fresh spring-flower femininity. Natural and graceful. Keep face identity unchanged.',
  dark_muse:   'Apply editorial dark muse makeup: muted cool-toned skin, smoky eye in deep taupe or charcoal, dark mauve or berry lips, subtle under-eye smudge, editorial high-fashion edge. Moody and artistic. Keep face identity unchanged.',
};

// Nạp âm → recommended makeup styles (ordered)
const MENH_MAKEUP_MAP = {
  'Kim':   ['glass_skin', 'j_sheer',    'soft_girl',   'dark_muse'],
  'Mộc':  ['j_sheer',    'hoa_dan',    'soft_girl',   'glass_skin'],
  'Hỏa':  ['kdrama_glam','guochao',    'j_gyaru',     'soft_girl'],
  'Thủy': ['dark_muse',  'glass_skin', 'j_sheer',     'kdrama_glam'],
  'Thổ':  ['soft_girl',  'hoa_dan',    'glass_skin',  'j_sheer'],
};

// Can-chi helpers (forked từ engine)
const _CAN_MU = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const _CHI_MU = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const _NAP_AM_MU = {
  'Giáp Tý':'Kim','Ất Sửu':'Kim','Bính Dần':'Hỏa','Đinh Mão':'Hỏa','Mậu Thìn':'Mộc','Kỷ Tỵ':'Mộc',
  'Canh Ngọ':'Thổ','Tân Mùi':'Thổ','Nhâm Thân':'Kim','Quý Dậu':'Kim','Giáp Tuất':'Hỏa','Ất Hợi':'Hỏa',
  'Bính Tý':'Thủy','Đinh Sửu':'Thủy','Mậu Dần':'Thổ','Kỷ Mão':'Thổ','Canh Thìn':'Kim','Tân Tỵ':'Kim',
  'Nhâm Ngọ':'Mộc','Quý Mùi':'Mộc','Giáp Thân':'Thủy','Ất Dậu':'Thủy','Bính Tuất':'Thổ','Đinh Hợi':'Thổ',
  'Mậu Tý':'Hỏa','Kỷ Sửu':'Hỏa','Canh Dần':'Mộc','Tân Mão':'Mộc','Nhâm Thìn':'Thủy','Quý Tỵ':'Thủy',
  'Giáp Ngọ':'Kim','Ất Mùi':'Kim','Bính Thân':'Hỏa','Đinh Dậu':'Hỏa','Mậu Tuất':'Mộc','Kỷ Hợi':'Mộc',
  'Canh Tý':'Thổ','Tân Sửu':'Thổ','Nhâm Dần':'Kim','Quý Mão':'Kim','Giáp Thìn':'Hỏa','Ất Tỵ':'Hỏa',
  'Bính Ngọ':'Thủy','Đinh Mùi':'Thủy','Mậu Thân':'Thổ','Kỷ Dậu':'Thổ','Canh Tuất':'Kim','Tân Hợi':'Kim',
  'Nhâm Tý':'Mộc','Quý Sửu':'Mộc','Giáp Dần':'Thủy','Ất Mão':'Thủy','Bính Thìn':'Thổ','Đinh Tỵ':'Thổ',
  'Mậu Ngọ':'Hỏa','Kỷ Mùi':'Hỏa','Canh Thân':'Mộc','Tân Dậu':'Mộc','Nhâm Tuất':'Thủy','Quý Hợi':'Thủy',
};
const _NAP_AM_FULL_MU = {
  'Giáp Tý':'Hải Trung Kim','Ất Sửu':'Hải Trung Kim','Bính Dần':'Lô Trung Hỏa','Đinh Mão':'Lô Trung Hỏa',
  'Mậu Thìn':'Đại Lâm Mộc','Kỷ Tỵ':'Đại Lâm Mộc','Canh Ngọ':'Lộ Bàng Thổ','Tân Mùi':'Lộ Bàng Thổ',
  'Nhâm Thân':'Kiếm Phong Kim','Quý Dậu':'Kiếm Phong Kim','Giáp Tuất':'Sơn Đầu Hỏa','Ất Hợi':'Sơn Đầu Hỏa',
  'Bính Tý':'Giản Hạ Thủy','Đinh Sửu':'Giản Hạ Thủy','Mậu Dần':'Thành Đầu Thổ','Kỷ Mão':'Thành Đầu Thổ',
  'Canh Thìn':'Bạch Lạp Kim','Tân Tỵ':'Bạch Lạp Kim','Nhâm Ngọ':'Dương Liễu Mộc','Quý Mùi':'Dương Liễu Mộc',
  'Giáp Thân':'Tuyền Trung Thủy','Ất Dậu':'Tuyền Trung Thủy','Bính Tuất':'Ốc Thượng Thổ','Đinh Hợi':'Ốc Thượng Thổ',
  'Mậu Tý':'Tích Lịch Hỏa','Kỷ Sửu':'Tích Lịch Hỏa','Canh Dần':'Tùng Bách Mộc','Tân Mão':'Tùng Bách Mộc',
  'Nhâm Thìn':'Trường Lưu Thủy','Quý Tỵ':'Trường Lưu Thủy','Giáp Ngọ':'Sa Trung Kim','Ất Mùi':'Sa Trung Kim',
  'Bính Thân':'Sơn Hạ Hỏa','Đinh Dậu':'Sơn Hạ Hỏa','Mậu Tuất':'Bình Địa Mộc','Kỷ Hợi':'Bình Địa Mộc',
  'Canh Tý':'Bích Thượng Thổ','Tân Sửu':'Bích Thượng Thổ','Nhâm Dần':'Kim Bạc Kim','Quý Mão':'Kim Bạc Kim',
  'Giáp Thìn':'Phúc Đăng Hỏa','Ất Tỵ':'Phúc Đăng Hỏa','Bính Ngọ':'Thiên Hà Thủy','Đinh Mùi':'Thiên Hà Thủy',
  'Mậu Thân':'Đại Dịch Thổ','Kỷ Dậu':'Đại Dịch Thổ','Canh Tuất':'Thoa Xuyến Kim','Tân Hợi':'Thoa Xuyến Kim',
  'Nhâm Tý':'Tang Đố Mộc','Quý Sửu':'Tang Đố Mộc','Giáp Dần':'Đại Khê Thủy','Ất Mão':'Đại Khê Thủy',
  'Bính Thìn':'Sa Trung Thổ','Đinh Tỵ':'Sa Trung Thổ','Mậu Ngọ':'Thiên Thượng Hỏa','Kỷ Mùi':'Thiên Thượng Hỏa',
  'Canh Thân':'Thạch Lựu Mộc','Tân Dậu':'Thạch Lựu Mộc','Nhâm Tuất':'Đại Hải Thủy','Quý Hợi':'Đại Hải Thủy',
};
function _muYearToCanChi(y) { return `${_CAN_MU[(y-4+400)%10]} ${_CHI_MU[(y-4+480)%12]}`; }
function _muGetHanh(y) { return _NAP_AM_MU[_muYearToCanChi(y)] || 'Thổ'; }

const SP_TRANG_DIEM = `Bạn là chuyên gia nhân tướng học và tư vấn trang điểm theo cổ pháp phương Đông.
Nhiệm vụ: phân tích khuôn mặt → gợi ý phong cách makeup châu Á phù hợp, có lý giải cổ pháp ngắn gọn.
Trả về JSON THUẦN TÚY — không markdown, không backtick, không text ngoài JSON.

IDs makeup hợp lệ: glass_skin, soft_girl, kdrama_glam, j_sheer, j_gyaru, guochao, hoa_dan, dark_muse

Format bắt buộc:
{
  "faceShape": "oval",
  "faceShapeVN": "Bầu dục",
  "ageGroup": "20s",
  "skinTone": "fair",
  "tuongHocInsight": "Mặt bầu dục — tướng Mộc, thanh tú, khí chất tự nhiên",
  "makeupRanked": ["glass_skin","j_sheer","soft_girl","hoa_dan"],
  "makeupReasons": {
    "glass_skin": "Mộc hình tướng hợp với vẻ tinh khiết, trong trẻo — glass skin tôn lên nét thanh tú tự nhiên",
    "j_sheer": "Thủy sinh Mộc — sheer texture nhẹ nhàng hòa hợp với khí chất thanh tao của tướng Mộc",
    "soft_girl": "Mặt bầu dục cân đối — soft blush tạo sự tươi sáng mà không làm mất nét tự nhiên"
  },
  "colorPalette": {
    "lip": ["#E8917A","#C77B6E","#F0A898"],
    "eye": ["#8B7355","#C4A882","#3D2B1F"],
    "blush": ["#F4B8A8","#E8A898"]
  },
  "tip": "Lời khuyên ngắn về cách apply phù hợp nhất"
}

Quy tắc:
- faceShape: oval / round / square / heart / oblong
- skinTone: fair / medium / warm / dark
- makeupRanked: 4 IDs từ danh sách hợp lệ, thứ tự phù hợp nhất → ít nhất
- makeupReasons: đủ 3 key đầu trong makeupRanked, mỗi lý do ≤ 20 từ, phải nhắc cổ pháp (tướng, hành, khí chất)
- colorPalette: hex codes thực tế phù hợp skinTone
- Chỉ trả về JSON`;

async function handleTrangDiemPhanTich(body, apiKey) {
  const { image, mediaType = 'image/jpeg', namSinh, faceMeasurements } = body;
  if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
  if (image.length > 7 * 1024 * 1024) return Response.json({ error: 'Ảnh quá lớn.' }, { status: 400 });

  // Tính nạp âm nếu có năm sinh
  let napAmContext = '';
  let napAmHanh = null;
  let napAmFull = null;
  let canChi = null;
  let menhMakeupIds = null;
  if (namSinh && namSinh >= 1900 && namSinh <= 2050) {
    canChi = _muYearToCanChi(namSinh);
    napAmHanh = _muGetHanh(namSinh);
    napAmFull = _NAP_AM_FULL_MU[canChi] || canChi;
    menhMakeupIds = MENH_MAKEUP_MAP[napAmHanh] || MENH_MAKEUP_MAP['Thổ'];
    napAmContext = `\n\nNẠP ÂM & MỆNH: Năm sinh ${namSinh} (${canChi}) — ${napAmFull}, hành ${napAmHanh}.
Theo cổ pháp, người mệnh ${napAmHanh} hợp với phong cách: ${menhMakeupIds.join(', ')}.
Ưu tiên đề xuất các style này trong makeupRanked, và lồng ghép lý giải mệnh ${napAmHanh} vào makeupReasons.`;
  }

  let measurementContext = '';
  if (faceMeasurements) {
    const m = faceMeasurements;
    measurementContext = `\n\nĐO LƯỜNG KHUÔN MẶT:\n- Rộng/cao: ${m.widthToHeight} | Hàm/mặt: ${m.jawToFace} | Trán/hàm: ${m.foreToJaw}`;
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: SP_TRANG_DIEM + napAmContext + measurementContext,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: 'Phân tích khuôn mặt và trả về JSON phong cách makeup phù hợp.' }
      ]}]
    })
  });
  if (!resp.ok) return Response.json({ error: 'Lỗi AI.' }, { status: 500 });
  const data = await resp.json();
  const text = data.content?.[0]?.text || '{}';
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    // Inject menh context vào response
    if (napAmHanh) {
      parsed.napAmHanh = napAmHanh;
      parsed.napAmFull = napAmFull;
      parsed.canChi = canChi;
      parsed.menhSuggestedIds = menhMakeupIds;
    }
    return Response.json(parsed);
  } catch (_) {
    return Response.json({ error: 'Lỗi phân tích kết quả AI.' }, { status: 500 });
  }
}

async function handleTrangDiemTryon(body) {
  const replKey = process.env.REPLICATE_API_KEY;
  if (!replKey) return Response.json({ error: 'Replicate API key chưa cấu hình.' }, { status: 500 });
  const { image, mediaType = 'image/jpeg', style_id } = body;
  if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
  const styleDesc = MAKEUP_STYLE_DESC[style_id];
  if (!styleDesc) return Response.json({ error: 'Style không hợp lệ.' }, { status: 400 });
  const prompt = `${styleDesc} The person's face shape, bone structure, skin texture, age, hair, clothing, and background must remain pixel-perfect identical. Only the makeup changes. Photorealistic.`;
  try {
    const url = await _replicateRun(
      replKey,
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      { prompt, input_image: `data:${mediaType};base64,${image}`, output_format: 'jpg', safety_tolerance: 2 },
      { prefer: 'wait=55' }
    );
    return Response.json({ imageUrl: url });
  } catch (e) {
    return Response.json({ error: e.message || 'Lỗi xử lý ảnh.' }, { status: 500 });
  }
}


// ── Da Liệu AI ────────────────────────────────────────────────────────────────

// Ngũ tạng → da (Đông y)
// Phế chủ bì mao (Phổi chủ da/lông)
// Can tàng huyết (Gan tàng trữ huyết → sắc da)
// Tỳ vận hóa (Tỳ vị vận hóa thủy thấp → độ ẩm, mụn)
// Thận tàng tinh (Thận → lão hóa, quầng thâm)
// Tâm chủ huyết mạch (Tim → đỏ mặt, mụn viêm)

// Mệnh → tạng chủ đạo → xu hướng da
const MENH_TANG = {
  Kim:  { tang: 'Phế', mo_ta: 'Phế chủ bì mao — da dễ khô, lỗ chân lông to, nhạy cảm với không khí khô', xu_huong: 'Da khô, bong tróc mùa lạnh, dị ứng', thanh_nhiet: false },
  Mộc:  { tang: 'Can', mo_ta: 'Can tàng huyết — sắc da phụ thuộc huyết dịch, dễ nám, xỉn khi Can khí uất', xu_huong: 'Da xỉn, thâm, nám nội tiết', thanh_nhiet: false },
  Hỏa:  { tang: 'Tâm', mo_ta: 'Tâm chủ huyết mạch — da dễ đỏ, mụn viêm, Tâm Hỏa vượng sinh nhiệt độc lên mặt', xu_huong: 'Da nhờn, mụn viêm, đỏ ửng', thanh_nhiet: true },
  Thủy: { tang: 'Thận', mo_ta: 'Thận tàng tinh — Thận tinh suy giảm gây lão hóa sớm, quầng thâm mắt, da thiếu nước', xu_huong: 'Da lão hóa sớm, quầng thâm, thiếu ẩm sâu', thanh_nhiet: false },
  Thổ:  { tang: 'Tỳ', mo_ta: 'Tỳ vận hóa thủy thấp — Tỳ hư thấp trệ sinh mụn đầu trắng, da nhờn vùng T', xu_huong: 'Da hỗn hợp, mụn đầu trắng, nhờn vùng T', thanh_nhiet: false },
};

const CAN_NHIET = ['Bính','Đinh']; // can nóng
const _CAN_DL = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const _CHI_DL = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const _NAP_AM_DL = {
  'Giáp Tý':'Kim','Ất Sửu':'Kim','Bính Dần':'Hỏa','Đinh Mão':'Hỏa','Mậu Thìn':'Mộc','Kỷ Tỵ':'Mộc',
  'Canh Ngọ':'Thổ','Tân Mùi':'Thổ','Nhâm Thân':'Kim','Quý Dậu':'Kim','Giáp Tuất':'Hỏa','Ất Hợi':'Hỏa',
  'Bính Tý':'Thủy','Đinh Sửu':'Thủy','Mậu Dần':'Thổ','Kỷ Mão':'Thổ','Canh Thìn':'Kim','Tân Tỵ':'Kim',
  'Nhâm Ngọ':'Mộc','Quý Mùi':'Mộc','Giáp Thân':'Thủy','Ất Dậu':'Thủy','Bính Tuất':'Thổ','Đinh Hợi':'Thổ',
  'Mậu Tý':'Hỏa','Kỷ Sửu':'Hỏa','Canh Dần':'Mộc','Tân Mão':'Mộc','Nhâm Thìn':'Thủy','Quý Tỵ':'Thủy',
  'Giáp Ngọ':'Kim','Ất Mùi':'Kim','Bính Thân':'Hỏa','Đinh Dậu':'Hỏa','Mậu Tuất':'Mộc','Kỷ Hợi':'Mộc',
  'Canh Tý':'Thổ','Tân Sửu':'Thổ','Nhâm Dần':'Kim','Quý Mão':'Kim','Giáp Thìn':'Hỏa','Ất Tỵ':'Hỏa',
  'Bính Ngọ':'Thủy','Đinh Mùi':'Thủy','Mậu Thân':'Thổ','Kỷ Dậu':'Thổ','Canh Tuất':'Kim','Tân Hợi':'Kim',
  'Nhâm Tý':'Mộc','Quý Sửu':'Mộc','Giáp Dần':'Thủy','Ất Mão':'Thủy','Bính Thìn':'Thổ','Đinh Tỵ':'Thổ',
  'Mậu Ngọ':'Hỏa','Kỷ Mùi':'Hỏa','Canh Thân':'Mộc','Tân Dậu':'Mộc','Nhâm Tuất':'Thủy','Quý Hợi':'Thủy',
};
const _NAP_AM_FULL_DL = {
  'Giáp Tý':'Hải Trung Kim','Ất Sửu':'Hải Trung Kim','Bính Dần':'Lô Trung Hỏa','Đinh Mão':'Lô Trung Hỏa',
  'Mậu Thìn':'Đại Lâm Mộc','Kỷ Tỵ':'Đại Lâm Mộc','Canh Ngọ':'Lộ Bàng Thổ','Tân Mùi':'Lộ Bàng Thổ',
  'Nhâm Thân':'Kiếm Phong Kim','Quý Dậu':'Kiếm Phong Kim','Giáp Tuất':'Sơn Đầu Hỏa','Ất Hợi':'Sơn Đầu Hỏa',
  'Bính Tý':'Giản Hạ Thủy','Đinh Sửu':'Giản Hạ Thủy','Mậu Dần':'Thành Đầu Thổ','Kỷ Mão':'Thành Đầu Thổ',
  'Canh Thìn':'Bạch Lạp Kim','Tân Tỵ':'Bạch Lạp Kim','Nhâm Ngọ':'Dương Liễu Mộc','Quý Mùi':'Dương Liễu Mộc',
  'Giáp Thân':'Tuyền Trung Thủy','Ất Dậu':'Tuyền Trung Thủy','Bính Tuất':'Ốc Thượng Thổ','Đinh Hợi':'Ốc Thượng Thổ',
  'Mậu Tý':'Tích Lịch Hỏa','Kỷ Sửu':'Tích Lịch Hỏa','Canh Dần':'Tùng Bách Mộc','Tân Mão':'Tùng Bách Mộc',
  'Nhâm Thìn':'Trường Lưu Thủy','Quý Tỵ':'Trường Lưu Thủy','Giáp Ngọ':'Sa Trung Kim','Ất Mùi':'Sa Trung Kim',
  'Bính Thân':'Sơn Hạ Hỏa','Đinh Dậu':'Sơn Hạ Hỏa','Mậu Tuất':'Bình Địa Mộc','Kỷ Hợi':'Bình Địa Mộc',
  'Canh Tý':'Bích Thượng Thổ','Tân Sửu':'Bích Thượng Thổ','Nhâm Dần':'Kim Bạc Kim','Quý Mão':'Kim Bạc Kim',
  'Giáp Thìn':'Phúc Đăng Hỏa','Ất Tỵ':'Phúc Đăng Hỏa','Bính Ngọ':'Thiên Hà Thủy','Đinh Mùi':'Thiên Hà Thủy',
  'Mậu Thân':'Đại Dịch Thổ','Kỷ Dậu':'Đại Dịch Thổ','Canh Tuất':'Thoa Xuyến Kim','Tân Hợi':'Thoa Xuyến Kim',
  'Nhâm Tý':'Tang Đố Mộc','Quý Sửu':'Tang Đố Mộc','Giáp Dần':'Đại Khê Thủy','Ất Mão':'Đại Khê Thủy',
  'Bính Thìn':'Sa Trung Thổ','Đinh Tỵ':'Sa Trung Thổ','Mậu Ngọ':'Thiên Thượng Hỏa','Kỷ Mùi':'Thiên Thượng Hỏa',
  'Canh Thân':'Thạch Lựu Mộc','Tân Dậu':'Thạch Lựu Mộc','Nhâm Tuất':'Đại Hải Thủy','Quý Hợi':'Đại Hải Thủy',
};
function _dlYearToCanChi(y) { return `${_CAN_DL[(y-4+400)%10]} ${_CHI_DL[(y-4+480)%12]}`; }
function _dlGetHanh(y) { return _NAP_AM_DL[_dlYearToCanChi(y)] || 'Thổ'; }

const SP_DA_LIEU = `Bạn là chuyên gia tư vấn da kết hợp Đông Tây y và cổ pháp phương Đông.
Nhiệm vụ: phân tích ảnh da mặt và đưa ra tư vấn holistic gồm 4 phần.
Trả về JSON THUẦN TÚY — không markdown, không backtick, không text ngoài JSON.

Format bắt buộc:
{
  "phan_tich_da": {
    "loai_da": "da dầu / da khô / da hỗn hợp / da thường / da nhạy cảm",
    "tinh_trang": ["tình trạng 1", "tình trạng 2", "..."],
    "muc_do": "nhẹ / trung bình / nặng",
    "vung_can_chu_y": "mô tả vùng da cần chú ý nhất",
    "mo_ta": "mô tả ngắn 2-3 câu về tình trạng da quan sát được"
  },
  "dong_y": {
    "tang_phu": "tạng liên quan chính",
    "ly_giai": "lý giải Đông y 2-3 câu tại sao da bị như vậy theo học thuyết tạng phủ",
    "menh_lien_quan": "cách mệnh ngũ hành ảnh hưởng đến tình trạng da hiện tại",
    "can_bang": "hướng điều chỉnh cân bằng âm dương/ngũ hành"
  },
  "an_uong": {
    "nen_an": [
      {"ten": "tên thực phẩm", "ly_do": "lý do ngắn theo Đông Tây y"},
      {"ten": "...", "ly_do": "..."}
    ],
    "nen_tranh": [
      {"ten": "tên thực phẩm", "ly_do": "lý do ngắn"},
      {"ten": "...", "ly_do": "..."}
    ],
    "thuc_duong": "1-2 câu về nguyên tắc thực dưỡng theo mệnh và tình trạng da",
    "nuoc_uong": "gợi ý nước uống/trà dược liệu phù hợp"
  },
  "my_pham": {
    "ingredients_nen": [
      {"ten": "tên thành phần", "cong_dung": "công dụng", "phu_hop_hanh": "hành tương sinh"},
      {"ten": "...", "cong_dung": "...", "phu_hop_hanh": "..."}
    ],
    "ingredients_tranh": [
      {"ten": "tên thành phần", "ly_do": "lý do nên tránh theo mệnh/tình trạng"},
      {"ten": "...", "ly_do": "..."}
    ],
    "routine_sang": "routine buổi sáng ngắn gọn",
    "routine_toi": "routine buổi tối ngắn gọn",
    "luu_y": "lưu ý đặc biệt theo bản mệnh"
  },
  "tong_ket": "1-2 câu tổng kết holistic kết hợp Đông Tây y"
}

Quy tắc:
- nen_an và nen_tranh: mỗi mảng 4-5 items
- ingredients_nen và ingredients_tranh: mỗi mảng 4-5 items
- Lồng ghép Đông y (ngũ tạng, âm dương, hành) VÀ Tây y (vitamin, peptide, SPF...) tự nhiên
- Chỉ trả về JSON`;

async function handleDaLieuAI(body, apiKey) {
  const { image, mediaType = 'image/jpeg', namSinh, faceMeasurements } = body;
  if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
  if (image.length > 7 * 1024 * 1024) return Response.json({ error: 'Ảnh quá lớn (tối đa ~5MB).' }, { status: 400 });

  // Tính mệnh nếu có năm sinh
  let menhContext = '';
  let menhHanh = null, menhFull = null, canChi = null, tangInfo = null;
  if (namSinh && namSinh >= 1900 && namSinh <= 2010) {
    canChi = _dlYearToCanChi(namSinh);
    menhHanh = _dlGetHanh(namSinh);
    menhFull = _NAP_AM_FULL_DL[canChi] || canChi;
    tangInfo = MENH_TANG[menhHanh];
    menhContext = `

THÔNG TIN BẢN MỆNH:
- Năm sinh: ${namSinh} (${canChi}) — Nạp Âm: ${menhFull}, hành ${menhHanh}
- ${tangInfo?.mo_ta || ''}
- Xu hướng da theo mệnh: ${tangInfo?.xu_huong || ''}

Hãy lồng ghép thông tin mệnh vào phần dong_y.menh_lien_quan và my_pham.luu_y.
Phần an_uong cũng phải tính đến mệnh ${menhHanh} (VD: mệnh Hỏa cần thanh nhiệt, mệnh Thủy cần bổ thận).`;
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SP_DA_LIEU + menhContext,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: 'Phân tích tình trạng da trong ảnh và trả về JSON tư vấn holistic đầy đủ 4 phần.' }
        ]
      }]
    })
  });

  if (!resp.ok) return Response.json({ error: 'Lỗi AI.' }, { status: 500 });
  const data = await resp.json();
  const text = data.content?.[0]?.text || '{}';
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (menhHanh) { parsed.menhHanh = menhHanh; parsed.menhFull = menhFull; parsed.canChi = canChi; }
    return Response.json(parsed);
  } catch(_) {
    return Response.json({ error: 'Lỗi phân tích kết quả AI.' }, { status: 500 });
  }
}

// ── End Da Liệu AI ────────────────────────────────────────────────────────────

// ── End Trang Điểm AI ─────────────────────────────────────────────────────────

const PROMPTS = {
  'dien-tuong': SP_DIEN,
  'nhan-tuong': SP_NHAN,
  'thu-tuong':  SP_THU,
  'thanh-tuong': SP_THANH,
  'thanh-tuong-pro': SP_THANH_PRO,
  'khi-sac':    SP_KHI_SAC,
};

const INSTRUCTIONS = {
  'dien-tuong':  'Hãy phân tích khuôn mặt trong ảnh theo nhân tướng học phương Đông, đủ 5 phần.',
  'nhan-tuong':  'Hãy phân tích tướng mắt trong ảnh theo nhãn tướng học cổ pháp, đủ 5 phần. Tập trung vào đôi mắt.',
  'thu-tuong':   'Hãy phân tích tướng bàn tay trong ảnh theo thủ tướng học cổ pháp, đủ 5 phần. Đọc kỹ các đường chỉ tay.',
  'thanh-tuong': 'Hãy phân tích thanh tướng dựa trên dữ liệu giọng nói đo được sau đây, đủ 4 phần theo hướng dẫn.',
  'thanh-tuong-pro': 'Hãy phân tích thanh tướng chuyên sâu dựa trên dữ liệu 4 bài đo âm học bên dưới, đầy đủ 6 phần theo hướng dẫn. Bắt buộc dẫn nguyên văn kinh điển.',
  'khi-sac':     'Hãy luận KHÍ SẮC của khuôn mặt trong ảnh theo Ma Y Thần Tướng, đầy đủ 6 phần. Quan sát kỹ Ấn Đường và 5 vùng Ngũ Nhạc. Nếu khí sắc bình hoà, nói thẳng thay vì bịa drama. Nếu ảnh có dấu hiệu ánh sáng bất thường ảnh hưởng đánh giá sắc, phải nêu cảnh báo ở phần 1.',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { image, mediaType = 'image/jpeg', irisNote = null, geoNote = null, action = 'dien-tuong' } = body;

    // ── Replicate-based actions (không cần Anthropic key) ──────────────────
    if (action === 'kieu-toc-tryon') return await handleKieuTocTryon(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'API key chưa cấu hình.' }, { status: 500 });

    // ── Non-streaming Claude Vision JSON actions ───────────────────────────
    if (action === 'kieu-toc-phan-tich') return await handleKieuTocPhanTich(body, apiKey);
    if (action === 'da-lieu-ai') return await handleDaLieuAI(body, apiKey);
    if (action === 'trang-diem-phan-tich') return await handleTrangDiemPhanTich(body, apiKey);
    if (action === 'trang-diem-tryon') return await handleTrangDiemTryon(body);

    // Validation: thanh-tuong & thanh-tuong-pro cần geoNote (text), còn lại cần image
    if (action === 'thanh-tuong' || action === 'thanh-tuong-pro') {
      if (!geoNote) return Response.json({ error: 'Thiếu dữ liệu giọng nói.' }, { status: 400 });
    } else {
      if (!image) return Response.json({ error: 'Thiếu dữ liệu ảnh.' }, { status: 400 });
      if (image.length > 7 * 1024 * 1024) return Response.json({ error: 'Ảnh quá lớn.' }, { status: 400 });
    }

    const systemPrompt = PROMPTS[action] || PROMPTS['dien-tuong'];
    const baseInstruction = INSTRUCTIONS[action] || INSTRUCTIONS['dien-tuong'];

    // Build user message content
    let userContent;
    const extraText = [geoNote || '', irisNote || ''].filter(Boolean).join('\n\n');
    const userText = extraText ? baseInstruction + '\n\n' + extraText : baseInstruction;

    if (action === 'thanh-tuong' || action === 'thanh-tuong-pro') {
      // Text-only: no image
      userContent = userText;
    } else {
      // Image + text
      userContent = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: userText }
      ];
    }

    const maxTokens =
      action === 'thanh-tuong-pro' ? 5000 :
      action === 'thanh-tuong'     ? 4000 :
      action === 'khi-sac'         ? 5000 :
      8000;

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        stream: true,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }]
      })
    });

    if (!anthropicResp.ok) {
      const err = await anthropicResp.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || 'Lỗi gọi AI.' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = anthropicResp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (!raw || raw === '[DONE]') continue;
              try {
                const json = JSON.parse(raw);
                if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({ t: json.delta.text }) + '\n\n'));
                }
                if (json.type === 'message_stop') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch (_) {}
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ err: e.message }) + '\n\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (e) {
    return Response.json({ error: e.message || 'Unknown' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
