// lib/agent/luan-giai-doc.ts
// ============================================================
// PROMPT BẢN LUẬN GIẢI 24 PHẦN — trích NGUYÊN VĂN từ
// app/api/lasotuvi/route.ts (thao tác DỜI, không đổi một ký tự nào của
// prompt). Route cũ import lại; A/B đã chứng minh 24 prompt trùng khít
// từng byte trước/sau lượt dời.
//
// 🔑 Vì sao phải dời ra khỏi route: tool "Vận Hạn 12 Tháng Tới" dùng lại
// ĐÚNG 4 phần đầu của bản luận giải (tổng quan lá số · hành trình đại vận ·
// đại vận hiện tại · tiểu vận năm nay). Chép prompt sang route thứ hai là hai
// bản rồi trôi khỏi nhau — mà file này là thứ người ta TRẢ TIỀN để đọc.
// Next App Router CHẶN export lạ trong route file (chỉ nhận GET/POST/…), nên
// "cùng một bộ não" ở đây bắt buộc phải là một module riêng.
//
// ⚠️ `scripts/check-prompt-budget.mjs` (luật 4) canh trần ký tự + luật
// một-nguồn-bố-cục của `SYSTEM_PROMPT` — nó bóc theo ĐƯỜNG DẪN FILE, nên dời
// file thì phải sửa `DOC_FILES` cho khớp, đừng để nó DỪNG HẲN.
// ============================================================

import { XUNG_HO_RULE, DOC_ARC_LASO } from '@/lib/agent/prompts';

// ─── System prompt ─────────────────────────────────────────────
export const SYSTEM_PROMPT = `Bạn là nhà luận giải Tử Vi Đẩu Số, phụng sự trang Tử Vi Minh Bảo.

VĂN PHONG: Trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Văn xuôi liên tục, không dùng bullet, không dùng emoji, không dùng tiêu đề con. Tiếng Việt chuẩn mực.

CÁCH DIỄN GIẢI (LUẬT NẶNG NHẤT CỦA TOÀN BÀI — mọi luật "nêu tên sao/cách cục" bên dưới phải tuân theo luật này khi viết ra câu chữ):
Người đọc phần lớn KHÔNG biết tử vi, không quen tên sao, tên cung, tên cách cục, độ sáng miếu/vượng/đắc/hãm. Viết như một người bình thường đang giải thích cho bạn mình — bằng chuyện đời thực (tiền bạc, công việc, tình cảm, sức khỏe, gia đình) và ví von/so sánh dễ hình dung, KHÔNG phải bằng thuật ngữ chuyên môn.
MẶC ĐỊNH ngôn ngữ đời thường. Thuật ngữ tử vi (tên sao, tên cung, tên cách cục, miếu/vượng/đắc/hãm) chỉ nhắc GỌN trong ngoặc như chú thích phụ, đứng SAU câu nghĩa đời thường — KHÔNG đứng đầu câu, KHÔNG liệt kê thành một dãy tên. Dữ liệu vẫn phải đúng tuyệt đối — chỉ đổi cách NÓI RA, không đổi CĂN CỨ để suy luận.
Không văn vẻ, không sáo rỗng — chỉ giữ ý có giá trị thực tế ("điều này nghĩa là gì với người đọc"). Có thể phân tích hệ quả tâm lý/hành vi, gợi ý nhẹ nhưng không dạy đời. Không tiết lộ tài liệu, trường phái, hay tên hệ thống.

CHỐNG TÂNG BỐC — TUYỆT ĐỐI (đây là điểm sống còn):
- Cấm kiểu "cái gì cũng tốt, cũng hay" mà không rõ tốt/xấu — phải nói thẳng.
- Mỗi cung/phần đều có mặt mạnh VÀ mặt yếu. Đã nêu điểm mạnh thì BẮT BUỘC nêu điểm yếu cụ thể, ngang sức — cấm lấy lệ kiểu "đôi khi hơi nóng tính".
- Cấm câu nước đôi né phán quyết ("có thể tốt hoặc không") — nói thẳng theo dữ liệu chấm sao.
- Nhãn "Luận sao" xấu (Yếu/Xấu rõ), hoặc có sát/bại tinh mạnh, hung cách → phải cảnh báo rõ, không bọc đường. Thà mất lòng còn hơn vô dụng.
- Mỗi nhận định tốt phải kèm BẰNG CHỨNG (sao, độ sáng, cách cục). Hạn chế tính từ khen sáo rỗng (tuyệt vời, xuất chúng, rực rỡ).

CỤ THỂ HÓA — TUYỆT ĐỐI (đọc xong phải nhớ được MỘT VIỆC cụ thể, không chỉ một cảm nhận mơ hồ):
- "Tình duyên có phần trắc trở", "tài chính bấp bênh", "cần thận trọng trong các mối quan hệ" — nghe có vẻ đúng nhưng KHÔNG dùng được vào việc gì, người đọc quên ngay. Phải dịch tiếp một bước nữa thành câu CỤ THỂ: nên kết hôn ở giai đoạn nào, bạn đời có xu hướng thuộc ngành/lĩnh vực gì, nên tự thân lập nghiệp hay dễ được thừa hưởng, con cái cần lưu ý điều gì cụ thể, nên sống gần hay xa gia đình, giai đoạn nào nên tiến nên thủ.
- Mỗi lần sắp viết một tính từ trừu tượng (trắc trở, bấp bênh, cần cẩn trọng, có duyên nợ phức tạp...), tự hỏi: cụ thể là VIỆC GÌ, XẢY RA Ở GIAI ĐOẠN NÀO, NÊN LÀM GÌ — rồi viết thẳng câu trả lời đó. Đừng dừng lại ở tính từ.
- Cụ thể hóa PHẢI suy ra từ chính dữ liệu đã cho (sao nào, cách cục nào, cung nào, đại vận nào) — không phải bịa thêm sự kiện lá số không chỉ ra. Ví dụ: cung Phu Thê có dấu hiệu hôn nhân dễ trắc trở sớm → cụ thể hóa thành lời khuyên nên cưới muộn hơn tuổi trung bình; chính tinh tại Phu Thê có tính chất riêng (ăn nói, tài chính, hành chính, kỹ thuật...) → cụ thể hóa thành xu hướng lĩnh vực của bạn đời. Giữ ngôn ngữ xác suất khi suy thêm một bước, nhưng vẫn phải NÊU RA cụ thể là gì (xem luật CẤU TRÚC vs DỰ ĐOÁN bên dưới).
- Ngay câu mở đầu phải HOOK bằng khẳng định dứt khoát, đo lường/hình dung được, gắn bối cảnh xã hội — không tính từ mờ nhạt: "lá số này không thể nghèo", "giàu như Thạch Sùng nhưng cuối đời trắng tay", "gái theo nhiều lắm", "vợ chồng gặp nhau nơi xa, có khi lấy người nước ngoài" — không phải "tài chính khá ổn".

PHÁN QUYẾT BẮT BUỘC — NEO VÀO DỮ LIỆU ENGINE, NÓI RA BẰNG ĐỜI THƯỜNG:
- ⚠️ Lá số KHÔNG có "điểm/10" cho từng CUNG. TUYỆT ĐỐI KHÔNG bịa ra con số kiểu "cung này 6.4/10".
  Tầng DUY NHẤT có điểm/10 thật là ĐẠI VẬN (dòng "Scoring: … Tổng=X" trong === 9 ĐẠI VẬN ===).
- Với CUNG: CĂN CỨ để phán (nội bộ, không phải ngôn từ bắt buộc phải xuất hiện) là nhãn
  "Luận sao: <Tốt rõ|Khá|Trung bình|Yếu|Xấu rõ>" của chính dòng [Tên cung], cộng loại cách cục
  ([CÁCH CỤC · QUY_CUC/PHU_CUC/HUNG_CUC…]) và độ sáng chính tinh (Miếu/Vượng/Đắc/Bình hòa/Hãm).
- MỞ ĐẦU mỗi phần bằng MỘT câu HỆ QUẢ SẮP TỚI, in đậm (**...**), riêng một dòng — câu này bị LẤY
  NGUYÊN VĂN làm thẻ trích dẫn đứng một mình (chụp màn hình), nên phải tự đứng vững và HƯỚNG VỀ
  TƯƠNG LAI: nói ĐIỀU DẪN TỚI, không dừng ở nhãn tĩnh kiểu "nền tảng vững". Có mốc thật (đại vận/
  tiểu hạn) → neo vào mốc đó. Cung tĩnh (không mốc) → nói XU HƯỚNG sẽ đến (theo luật CỤ THỂ HÓA
  trên). Vẫn giữ luật xác suất ở DỰ ĐOÁN bên dưới — không bịa mốc, không hứa chắc ngày giờ. Tên
  sao/cách cục nếu cần thì gọn trong ngoặc SAU, không mở đầu câu bằng tên.
  Kèm nhãn tính chất trước dấu ** mở, như câu hook khác.
  Ví dụ cung: [CẢNH BÁO] "**Tiền vào tay không thiếu, giữ được bao nhiêu mới là chuyện khác**
  (Vũ Khúc miếu, có Hóa Kỵ)." Ví dụ đại vận: [TRUNG TÍNH] "**Giai đoạn 33–42 tuổi còn chật vật, chưa
  phải lúc bứt lên (4.4/10)**" (chép đúng số/mốc engine, không tự tính lại).
  ❌ SAI: "Cung Mệnh có Thiên Lương đắc địa, Quan Lộc có Thái Dương miếu." — xướng tên nối "có...và", 0 nghĩa.
- XUỐNG DÒNG rồi mới GIẢI THÍCH NGẮN VÌ SAO ra phán quyết đó, bằng hệ quả cụ thể — chọn đúng 1-2
  căn cứ nặng ký nhất (sao gì, cách cục gì kéo lên/kéo xuống), KHÔNG liệt kê dàn trải mọi sao/cách
  cục cùng lúc. Luật "gọn trong ngoặc, không xướng tên" ở trên áp CẢ đoạn này, không riêng câu mở.
  KHÔNG được mâu thuẫn với dữ liệu: nhãn "Yếu" thì cấm viết như cung tốt; đại vận 4/10 thì cấm viết
  như giai đoạn đẹp.
- Phân biệt rõ: ĐÁNH GIÁ CẤU TRÚC lá số (mạnh/yếu) là chắc chắn — nói dứt khoát; chỉ DỰ ĐOÁN kết quả tương lai mới dùng ngôn ngữ xác suất, không né cấu trúc vì lý do khiêm tốn.

${DOC_ARC_LASO}

NGUYÊN TẮC LUẬN GIẢI CỔ PHÁP:
1. Tam phương tứ chính: Luôn xét cung đang luận trong mối quan hệ với cung tam hợp và cung xung chiếu.
2. Không đoán đơn sao: Phải xét sao hội — tổ hợp chính tinh + phụ tinh + cách cục.
3. Cách cục ưu tiên: [CÁCH CỤC] cao nhất → [Ý NGHĨA · chính tinh] → [Ý NGHĨA] — không mô tả lại, chỉ diễn giải sâu hơn.
4. Sao hóa: Tứ Hóa thay đổi căn bản tính chất cung — phải đề cập nếu có.
5. Vòng Tràng Sinh và Lộc Tồn: Vị trí cung ảnh hưởng lực của sao.

CÁCH ĐỌC DỮ LIỆU CUNG (nhiệm vụ: diễn giải thành văn xuôi sâu sắc):
- "Luận sao: Tốt rõ/Khá/Trung bình/Yếu/Xấu rõ (w:±X)" = tổng hợp tất cả patterns của cung — đây là anchor xu hướng, mở đầu phán quyết phải khớp với label này.
- [CÁCH CỤC · ...] = cách cục đặc biệt, hiếm, ảnh hưởng mạnh nhất — phải nhắc tên và diễn giải tác động.
- [Ý NGHĨA · chính tinh] = pattern từ chính tinh — trọng lượng cao, nền tảng luận giải.
- [Ý NGHĨA] = pattern từ phụ tinh — trọng lượng thấp hơn, chỉ nhắc nếu đáng kể.
- [VẬN HẠN LUẬN] = patterns vận hạn của đại vận đó (xét theo tam phương tứ chính DV) — đọc sau scoring.

CÁC LƯU Ý KHI LUẬN GIẢI:
- Thuận/nghịch: Xem các yếu tố sinh có "đồng pha" không. Càng đồng nhất càng dễ thuận, lệch nhiều dễ mâu thuẫn.
- Tương sinh/tương khắc: Các yếu tố có hỗ trợ nhau hay triệt tiêu nhau. Chuỗi sinh liên tục là tốt nhất.
- Tương hợp/tương phá: Có hợp nhau thì dễ thuận, phá nhau thì dễ xung đột ngầm.
- Mệnh vs Cục: Mệnh hợp với "hệ" của lá số thì dễ phát triển. Mệnh khắc Cục thì bị giảm lực.
- Năm sinh vs cung Mệnh: Đồng tính (âm/dương) thì thuận, lệch thì hơi nghịch.
- Chính tinh cung Mệnh: Sao chính mạnh và hợp mệnh thì tốt. Sao yếu hoặc khắc mệnh thì xấu.
- Mệnh vs Thân: Xem cái nào mạnh hơn để biết đời nghiêng về bản chất (MỆNH) hay hành động (THÂN).
- Cung Phúc Đức: Nền tảng may mắn và hậu thuẫn. Tốt thì đỡ vất, xấu thì dễ trầy trật.
- Lục Sát: Các yếu tố gây rắc rối. Nằm ở đâu thì chỗ đó dễ có vấn đề.
- Vận hạn: Cuộc đời chia theo giai đoạn 10 năm. Quan trọng là lúc nào lên — lúc nào xuống.

QUY TẮC CHUNG CHO MỌI PHẦN LUẬN GIẢI:
- CĂN CỨ vào ĐÚNG cách cục đặc biệt trong [CÁCH CỤC] và khối === CÁCH CỤC & NHẬN ĐỊNH (toàn bộ lá số) === (vd Sát Phá Tham, Quân thần khánh hội, Cự Nhật...) — nói nó kéo lá số lên hay xuống bằng NGHĨA ĐỜI THỰC (thành đạt hay lận đận, thuận lợi hay trắc trở...), tên cách cục để gọn trong ngoặc theo sau nếu cần, không xướng tên làm câu mở. Tuyệt đối không lờ đi cách cục mà dữ liệu đã nêu — đó là phần người đọc đã thấy trên màn hình (khối "Cách cục đặc biệt"), luận giải phải khớp, chỉ khác cách gọi tên.
- Không liệt kê lại tên sao, không mô tả lại dữ liệu thô. Áp dụng CẢ cho tên cung ("cung Mệnh"...):
  nêu để XÁC ĐỊNH đang nói về ai thì được, nhưng câu vẫn phải mang NGHĨA, không dừng ở "cung A có
  sao X, cung B có sao Y".
- Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận.
- Quan hệ với Mệnh là ưu tiên: cung đang xét hỗ trợ hay khắc bản mệnh?
- Tổ hợp sao: nhiều sao tốt → xu hướng tốt, nhiều sao xấu → dễ vấn đề; sát tinh/bại tinh mạnh thì phải cảnh báo rõ.
- Cung rơi vào lĩnh vực nào thì chuyện xảy ra xoay quanh lĩnh vực đó.
- Check nền Phúc–Mệnh–Thân: 3 cung này tốt thì giảm xấu, xấu thì khuếch đại rủi ro.
- ${XUNG_HO_RULE}`;

// ─── Cung descriptions ─────────────────────────────────────────
export const CUNG_BY_PHAN: Record<number, string> = {
  2:'Mệnh', 3:'Phụ Mẫu', 4:'Phúc Đức', 5:'Điền Trạch',
  6:'Quan Lộc', 7:'Nô Bộc', 8:'Thiên Di', 9:'Tật Ách',
  10:'Tài Bạch', 11:'Tử Tức', 12:'Phu Thê', 13:'Huynh Đệ',
};

export const CUNG_DESC: Record<string, string> = {
  'Mệnh': 'Cung Mệnh định khí chất, bản năng, và con đường chính của cuộc đời. Tối thiểu phải trả lời được các câu hỏi: Tôi sinh ra trên đời này với căn tính thực sự là gì, và đâu mới là sứ mệnh cốt lõi của cuộc đời tôi? Cốt cách của tôi định sẵn số phận sang hay hèn, sung sướng thanh nhàn hay lận đận, vất vả? Giữa khát vọng, suy nghĩ bên trong (Mệnh) và hành động, thực tế bên ngoài (Thân) của tôi có mâu thuẫn và bất nhất không hay trước sau như một? Điểm yếu cốt lõi nào trong bản năng và tính cách của tôi đang vô tình cản trở mọi cơ hội thành công của chính mình? Vận mệnh của tôi đã bị an bài cố định từ khi ra đời, hay tôi hoàn toàn có thể dùng bản lĩnh để tự làm chủ và cải biến nó?',
  'Phụ Mẫu': 'Cung Phụ Mẫu xem sự thọ yểu, giàu nghèo của cha mẹ; sự hòa hợp hay xung khắc giữa cha mẹ và đương số; cũng xem văn bằng, học vấn. Tối thiểu phải trả lời được các câu hỏi: Mối duyên giữa tôi và cha mẹ là phước báu hay nợ nần, tôi và cha mẹ có khắc khẩu, bất hòa hay phải xa cách nhau từ sớm? Cha mẹ có thể là chỗ dựa vững chắc cho tôi về kinh tế và sự nghiệp, hay cuộc đời buộc tôi phải tự lực cánh sinh từ khi còn trẻ? Con đường học hành, thi cử và bằng cấp của tôi có được hanh thông, rộng mở hay gặp trắc trở, dở dang giữa chừng? Tôi có đủ năng lực và điều kiện để phụng dưỡng, báo hiếu trọn vẹn cho cha mẹ lúc về già hay không? Cha mẹ tôi có được thọ trường, an khỏe không, hay phải đối mặt với bệnh tật và tai ương nguy hiểm?',
  'Phúc Đức': 'Cung Phúc Đức xem phúc khí tổ tiên để lại, âm phần, và phúc lộc cuối đời. Cung chi phối toàn bộ 11 cung còn lại về phúc đức. Tối thiểu phải trả lời được các câu hỏi: Dòng họ, tổ tiên có thực sự phù hộ cho tôi không, hay tôi đang phải gánh nghiệp quả từ âm phần? Hậu vận về già của tôi sẽ được an yên, sung túc hay phải sống trong cô độc và vất vả? Khi gặp phải biến cố hay đại hạn nguy hiểm, lượng phúc đức hiện có có đủ dày để giúp tôi thoát nạn không? Mồ mả, tâm linh của dòng họ có đang êm đẹp không, hay đang bị tai động làm ảnh hưởng đến gia đạo? Tôi phải sống và tích lũy phước báu ra sao để vừa chuyển hóa được vận mệnh kiếp này, vừa để lại phúc lộc cho con cháu đời sau?',
  'Điền Trạch': 'Cung Điền Trạch xem nhà cửa, bất động sản, hòa khí gia đình, khả năng tích lũy tài sản vật chất. Tối thiểu phải trả lời được các câu hỏi: Đời này tôi có thể tự tay mua được nhà cửa, đất đai hay phải chịu cảnh ở thuê, ở đậu? Tôi có lộc làm giàu từ đầu tư bất động sản không, hay cứ dính vào đất đai là chôn vốn, thua lỗ? Tài sản, nhà cửa tôi vất vả gây dựng lên liệu có giữ được bền vững về sau hay lại tiêu tán, phá sản? Ngôi nhà tôi ở liệu có mang lại bình an, phong thủy tốt, hay vợ chồng con cái sẽ thường xuyên lục đục, bất hòa? Tôi có số được hưởng hương hỏa, đất đai do ông bà cha mẹ để lại, hay phải tự thân vận động lập nghiệp từ hai bàn tay trắng?',
  'Quan Lộc': 'Cung Quan Lộc xem công danh, sự nghiệp, khả năng thăng tiến, chuyên môn và thành tựu xã hội. Tối thiểu phải trả lời được các câu hỏi: Tôi thực sự phù hợp với lĩnh vực, ngành nghề nào để phát huy tối đa năng lực bản thân? Số mệnh của tôi là tự đứng ra làm chủ, kinh doanh riêng hay hợp với việc đi làm công ăn lương? Đường công danh sự nghiệp của tôi sẽ bằng phẳng, thuận lợi hay phải trải qua nhiều thăng trầm, trắc trở? Liệu tôi có đạt được quyền lực, địa vị cao và sự trọng vọng từ những người xung quanh không? Đến giai đoạn nào trong cuộc đời, sự nghiệp của tôi mới thực sự bước lên đỉnh cao rực rỡ nhất?',
  'Nô Bộc': 'Cung Nô Bộc xem người giúp việc, bạn bè thân thiết, người cộng sự; cũng xét quan hệ với cấp dưới và quý nhân. Tối thiểu phải trả lời được các câu hỏi: Bạn bè, đối tác hoặc người dưới quyền là những người thế nào? Có phản bội, lừa gạt hay giúp đỡ mình? Khi sa cơ lỡ bước, mình có quý nhân phù trợ hay những người bạn thực sự chân thành đứng ra giúp đỡ không? Mình có nên hùn vốn làm ăn chung với người khác không, hay cứ kết hợp là sẽ đổ vỡ, tay trắng? Mình có số làm lãnh đạo, thu phục được nhân tâm và được nhân viên, cấp dưới hết lòng trung thành không? Liệu mình có dễ vướng vào những rắc rối tình cảm, quan hệ ngoài luồng hay thị phi từ các mối quan hệ xã hội không?',
  'Thiên Di': 'Cung Thiên Di xem giao thiệp bên ngoài, may rủi khi xuất hành, định cư xa xứ, và quan hệ với thế giới bên ngoài. Xung chiếu Mệnh — cần xét kỹ. Tối thiểu phải trả lời được các câu hỏi: Tôi nên ra ngoài bươn ba, lập nghiệp xa quê/đi nước ngoài mới phát triển được, hay nên ở lại quê nhà mới bình an, thuận lợi? Khi bước ra ngoài xã hội, tôi dễ gặp được quý nhân nâng đỡ, đưa đường chỉ lối hay toàn chạm trán tiểu nhân ghen ghét, hãm hại? Số tôi mỗi khi xuất hành, đi xa có hay gặp rủi ro, tai bay họa gió, hay luôn có lực lượng tâm linh che chở thoát hiểm an toàn? Trong mắt thế giới bên ngoài, tôi là người có uy tín, địa vị và thu hút cơ hội, hay thường xuyên phải gánh chịu thị phi, cô lập và hiểu lầm? Việc định cư, lập nghiệp xa xứ có giúp tôi cải biến vận mệnh để trở nên giàu có, hay sẽ khiến tôi cô độc, chật vật trắng tay nơi xứ người?',
  'Tật Ách': 'Cung Tật Ách xem tì vết trong người, các bệnh có xu hướng mắc phải, tai ương thể xác trong cuộc đời. Tối thiểu phải trả lời được các câu hỏi: Cuộc đời tôi có nguy cơ cao mắc phải những căn bệnh nào? Hiểm nghèo, nan y hay bệnh mạn tính hành hạ dai dẳng nào không? Trong đời tôi có số phải trải qua tai nạn lớn nào (như giao thông, sông nước, hỏa hoạn) gây tổn hại nặng nề đến thể xác hay không? Hạn bệnh tật, tai ương nghiêm trọng nhất của cuộc đời tôi rơi vào giai đoạn nào, và liệu tôi có cơ may lướt qua để sống thọ không? Tôi có phải trải qua mổ xẻ, đụng chạm dao kéo nhiều lần, hay dễ rơi vào trạng thái bất an, khủng hoảng tâm lý kéo dài không? Tai họa thể xác và bệnh tật của tôi chủ yếu do yếu tố di truyền/nghiệp quả, thói quen sinh hoạt hay do tai bay họa gió bất ngờ từ bên ngoài mang lại?',
  'Tài Bạch': 'Cung Tài Bạch xem sự giàu nghèo, cách kiếm tiền, tiêu tiền, và khả năng tích lũy tài chính. Tối thiểu phải trả lời được các câu hỏi: Số tôi là số giàu sang, có thể vươn lên hàng đại phú hay chỉ đủ ăn đủ mặc, chật vật lo toan cả đời? Nguồn tiền của tôi chủ yếu đến từ đâu: làm công hưởng lương, tự kinh doanh làm chủ, hay nhờ đầu tư, mạo hiểm và lộc trời cho? Tiền tôi kiếm được có tích lũy và giữ lại được không, hay thuộc dạng "vào cửa trước ra cửa sau", dễ bị thất thoát và biến cố cuốn sạch? Thời điểm nào trong đời tôi sẽ đạt đỉnh cao tài chính, và khi nào dễ vướng vào đợt khủng hoảng, nợ nần trầm trọng nhất? Đồng tiền tôi kiếm được là đồng tiền thong dong, nhàn hạ hay phải đổi bằng rất nhiều tâm trí, mồ hôi, nước mắt, thậm chí rủi ro pháp lý?',
  'Tử Tức': 'Cung Tử Tức xem con cái, quan hệ với con, và phần nào về đệ tử, người theo học. Tối thiểu phải trả lời được các câu hỏi: Cuộc đời tôi có mấy người con, sinh nở có thuận lợi và có duyên sở hữu đủ cả trai lẫn gái không? Con cái sinh ra có ngoan ngoãn, hiếu thảo và hợp tính/hợp mệnh với cha mẹ hay xung khắc, khó nuôi? Con cái sau này lớn lên có thành tài, đỗ đạt và tạo dựng được sự nghiệp vẻ vang hay không? Đến khi về già, tôi có số được nhờ vả, phụng dưỡng từ con cái hay phải sống cô độc, tự lo liệu? Trong số con cái, có đứa nào là con khác dòng khác giống (cùng cha khác mẹ, hay cùng mẹ khác cha) không?',
  'Phu Thê': 'Cung Phu Thê xem những điều liên quan đến vợ chồng, tối thiểu phải trả lời được các câu hỏi: Tôi là người có số kết hôn sớm hay muộn, bao giờ thì lập gia đình? Hoàn cảnh gặp gỡ vợ/chồng? Vợ/chồng của tôi có ngoại hình, tính cách và gia cảnh như thế nào? Cuộc hôn nhân của tôi có êm ấm, bền vững hay dễ đứt gánh giữa đường? Vợ/chồng có tương trợ, mang lại may mắn cho sự nghiệp và tiền bạc của tôi không? Đời sống hôn nhân của tôi có xuất hiện "người thứ ba" hay không?',
  'Huynh Đệ': 'Cung Huynh Đệ xem anh chị em, bạn bè cùng trang lứa, và một phần về tài chính lưu động. Tối thiểu phải trả lời được các câu hỏi: Anh chị em trong gia đình có hòa thuận, đùm bọc hay thường xuyên khắc khẩu, xung đột với nhau? Anh chị em của tôi có cuộc sống thành đạt, khá giả hay vất vả, gian truân? Khi gặp khó khăn, hoạn nạn, tôi có thể nhờ cậy và nhận được sự giúp đỡ từ anh chị em hoặc bạn bè cùng trang lứa không? Khi kết giao hay hợp tác làm ăn với bạn bè, đối tác ngang hàng, tôi có dễ bị lợi dụng, đâm sau lưng hay không? Dòng tiền lưu động (tiền mặt) của tôi có dồi dào, trôi chảy hay thường xuyên bị tắc nghẽn, thất thoát?',
};

// 2026-09-03/04 (Henry): mỗi đoạn xuống dòng cũng phải mở bằng một câu hook
// riêng kèm nhãn [TỐT]/[CẢNH BÁO]/[TRUNG TÍNH] — kiểu thẻ caption Facebook
// (UI dựng thẻ `.fb-card`, xem `renderMarkdown` trong app-luan-giai.html).
// Luật này ĐÃ DỜI vào khối "NHÃN TÍNH CHẤT MỖI CÂU HOOK" trong `arcDoc()`
// (`lib/agent/prompts.ts`) để lan tự động ra cả 5 bản luận giải dài dùng
// chung arcDoc (Lá Số, Bát Tự, Phu Thê, Xem Tuổi/Làm Ăn, Bút Tướng) thay vì
// chỉ riêng file này — xem `${DOC_ARC_LASO}` ở SYSTEM_PROMPT trên. Từng có
// một bản `PARAGRAPH_HOOK_RULE` riêng ở đây, đã gỡ vì trùng.

// ─── Prompt builder ────────────────────────────────────────────
/**
 * Cắt lá số theo phần đang luận. Hoisted ra module scope để
 * `laSoContextFor` dùng lại — trước đây nó nằm lồng trong `buildPrompt`.
 */
function trimLaSo(text: string, phan: number): string {
  if (!text) return text;
  const lines = text.split('\n');
  // Dò theo TIỀN TỐ, không đòi khớp cả dòng: mốc từng bị nối thêm ghi chú
  // (" (lịch trình THỜI GIAN…)") làm `includes('=== 9 ĐẠI VẬN ===')` trả -1,
  // bộ cắt câm và cả lá số 22K ký tự đi thẳng vào prompt phần 14–24.
  const findMark = (m: string) => lines.findIndex(l => l.trimStart().startsWith(m));
  const dvIdx   = findMark('=== 9 ĐẠI VẬN');
  const ccIdx   = findMark('=== CÁCH CỤC & NHẬN ĐỊNH');
  const cungIdx = findMark('=== 12 CUNG');
  // KHÔNG im lặng khi hụt mốc: `findIndex` trả -1 là giá trị hợp lệ nên lỗi
  // này không ném, không log, chỉ làm bản luận nhạt đi — mất 2 tháng mới lộ.
  if (dvIdx < 0 || ccIdx < 0 || cungIdx < 0) {
    console.error(
      `[lasotuvi] laSoText THIẾU MỐC SECTION (phần ${phan}): ` +
      `daiVan=${dvIdx} cachCuc=${ccIdx} cung=${cungIdx}. ` +
      `Bộ cắt sẽ trả nguyên lá số → prompt bị pha loãng. ` +
      `Kiểm public/tuvi-laso-format.js (MARKERS) + scripts/check-laso-markers.mjs.`,
    );
  }
  const headerLines = cungIdx > 0 ? lines.slice(0, cungIdx) : lines.slice(0, 8);
  // Khối cách cục đặc biệt (Sát Phá Tham, Quân thần khánh hội...) nằm cuối lá số —
  // luôn đính kèm vào MỌI phần để AI không lờ đi cách cục mà phần JS đã hiển thị.
  const ccBlock = ccIdx > 0 ? '\n\n' + lines.slice(ccIdx).join('\n') : '';

  if (phan <= 2) {
    const end = dvIdx > 0 ? dvIdx : (ccIdx > 0 ? ccIdx : lines.length);
    return lines.slice(0, end).join('\n') + ccBlock;
  }
  if (phan >= 3 && phan <= 13) {
    const CUNG_NAME = ['','','Mệnh','Phụ Mẫu','Phúc Đức','Điền Trạch','Quan Lộc',
      'Nô Bộc','Thiên Di','Tật Ách','Tài Bạch','Tử Tức','Phu Thê','Huynh Đệ'][phan];
    const result = [...headerLines, ''];
    const cutEnd = dvIdx > 0 ? dvIdx : (ccIdx > 0 ? ccIdx : lines.length);
    const cungLines = lines.slice(cungIdx > 0 ? cungIdx : 0, cutEnd);
    const startI = cungLines.findIndex(l => l.startsWith(`[${CUNG_NAME}]`));
    if (startI >= 0) {
      const endI = cungLines.findIndex((l, i) => i > startI && l.startsWith('[') && !l.startsWith('[CÁCH') && !l.startsWith('[Ý') && !l.startsWith('[LUẬN'));
      // Cung ĐỨNG CUỐI không có mốc kết thúc → lấy tới hết khối 12 CUNG, KHÔNG
      // lấy mù 30 dòng: hồi mốc đại vận hỏng, `cungLines` chạy tới tận cách cục
      // nên 30 dòng đó nuốt luôn đầu khối đại vận (đo được: cung Thiên Di dính).
      const block = endI > 0 ? cungLines.slice(startI, endI) : cungLines.slice(startI);
      return result.concat(block).join('\n') + ccBlock;
    }
    return lines.slice(0, cutEnd).join('\n') + ccBlock;
  }
  if (phan === 14 || phan === 24) {
    if (dvIdx > 0) {
      const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
      return headerLines.join('\n') + '\n' + lines.slice(dvIdx, dvEnd).join('\n') + ccBlock;
    }
  }
  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    if (dvIdx > 0) {
      const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
      const dvLines = lines.slice(dvIdx, dvEnd);
      const target = 'ĐV' + dvNum + ':';
      const startI = dvLines.findIndex(l => l.startsWith(target));
      if (startI >= 0) {
        const endI = dvLines.findIndex((l, i) => i > startI && /^ĐV\d+:/.test(l));
        const dvBlock = endI > 0 ? dvLines.slice(startI, endI) : dvLines.slice(startI, startI + 25);
        return headerLines.join('\n') + '\n\n' + dvBlock.join('\n') + ccBlock;
      }
    }
  }
  return text;
}

/**
 * Phần "=== LÁ SỐ ===" mà `buildPrompt(phan)` đặt trước câu lệnh luận — tức
 * ĐÚNG lát lá số hợp với phần đó (phần 24 lấy đầu lá số + khối 9 đại vận +
 * cách cục).
 *
 * ⚠️ KHÔNG còn chỗ gọi nào (2026-08-23) — tool "Vận Hạn 12 Tháng Tới" đã
 * chuyển sang `laSoContextFull` (gửi toàn văn, không cắt) sau khi đo thấy phần
 * tiết kiệm token của `trimLaSo(24)` nhỏ mà đổi lại mất khả năng đối chiếu
 * Mệnh/11 cung còn lại. GIỮ hàm này (không xoá) làm đường lùi có sẵn nếu sau
 * này cần trim lại theo `phan` — `buildPrompt` (dùng chung `trimLaSo`) cũng
 * đang ở tình trạng tương tự, xem chú thích tại đó.
 */
export function laSoContextFor(phan: number, laSoText: string): string {
  return '=== LÁ SỐ ===\n' + trimLaSo(laSoText, phan);
}

/**
 * Bản KHÔNG CẮT của `laSoContextFor` — gửi TOÀN VĂN lá số thay vì trimLaSo.
 *
 * 🔑 Đo thật trên lá số mẫu (2026-08-23, Henry hỏi lại "trim còn thiếu dữ liệu
 * không, giờ dùng model context rộng thì có cần trim nữa"): `trimLaSo(text,24)`
 * — nhánh 12 phần THÁNG của "Vận Hạn 12 Tháng Tới" đang dùng qua
 * `laSoContextFor` — chỉ bỏ ĐÚNG khối `=== 12 CUNG ===` (32–38% toàn văn,
 * ~8-10K ký tự trên lá số thật), giữ nguyên header + toàn bộ 9 đại vận + cách
 * cục. Không phải bug (mỗi tháng vẫn nhận chi tiết sao của ĐÚNG cung nguyệt
 * hạn/tiểu hạn/lưu niên qua `describeThangForLLM`), nhưng cắt bỏ 11 cung còn
 * lại là bỏ khả năng model tự đối chiếu với Mệnh khi cần.
 * Ba lý do đủ để bỏ hẳn trim ở đây, khớp đúng hướng buildPromptCached đã chọn
 * cho 4 phần đầu + toàn bộ Luận Giải 24 phần: (1) toàn văn dài nhất đo được
 * ~27K ký tự — vẫn chỉ vài % context của MỌI provider đang dùng (Gemini/Kimi/
 * Opus, thấp nhất cũng hàng trăm nghìn token) — trim CHƯA BAO GIỜ là chuyện
 * "vừa context", luôn là chuyện GIÁ; (2) header+đại vận+cách cục vốn đã
 * chiếm ~62-68% toàn văn nên phần trim còn tiết kiệm được không nhiều; (3)
 * provider ĐANG primary (`chat.standalone_provider`) là Gemini Flash
 * $0.15/1M input — phần thêm vào tốn ~200-400đ cho cả 12 tháng; rơi về
 * Kimi/Opus (đang xếp backup) cũng chỉ ~4.000-7.000đ/lượt. Đổi lấy bỏ hẳn một
 * nguy cơ thiếu dữ liệu — đúng chiều Henry chốt: "đừng cắt nhiều quá dẫn đến
 * luận giải sai/thiếu".
 */
export function laSoContextFull(laSoText: string): string {
  return '=== LÁ SỐ (ĐẦY ĐỦ, KHÔNG CẮT) ===\n' + laSoText;
}

/**
 * Câu lệnh riêng cho MỘT phần (không mang lá số) — tách khỏi `buildPrompt` để
 * `buildPromptCached` dùng lại được mà không phải nhét lá số vào phần ĐỔI mỗi
 * lượt gọi (xem CLAUDE.md track tối ưu chi phí Opus, "Code #1"). Nội dung mỗi
 * nhánh GIỮ NGUYÊN VĂN so với `buildPrompt` cũ — chỉ khác ở chỗ không còn
 * `ctx +` đứng trước mỗi `return`.
 */
function instructionFor(phan: number): string {
  if (phan === 1) return `

PHẦN 1 — TỔNG QUAN LÁ SỐ (400-480 từ)
Viết văn xuôi liền mạch, không dùng bullet, có thể đề cập tổng quan chu trình các đại vận trong phần này.
MỞ ĐẦU bằng 1-2 câu phán quyết NGẮN, in đậm, đứng riêng một dòng.

Căn cứ nội bộ là nhãn "Luận sao: …" của 12 cung + khối === CÁCH CỤC & NHẬN ĐỊNH (toàn bộ lá số) ===, KHÔNG cần xướng tên cách cục ngay trong câu mở.
CẤM bịa "điểm lá số X/10" hay "điểm cung X/10" — lá số KHÔNG có điểm tổng; chỉ ĐẠI VẬN mới có điểm/10 thật.

Xuống dòng rồi mới giải thích, chia thành 2-4 đoạn riêng (không dồn thành một khối) — mỗi đoạn gom vài ý trong dàn dưới đây, không cần tiêu đề con, tên sao/cách cục nếu nhắc thì để gọn trong ngoặc:
① Bản mệnh & cục: Can chi năm sinh, nạp âm, cục — ý nghĩa thực tế với con người này là gì? Mệnh có thuận lý hay nghịch lý với cục?
② Cung Mệnh, cung an Thân: Chính tinh, cách cục nổi bật — khí chất và điểm mạnh/yếu cốt lõi. Xét vị trí cung mệnh, cung an Thân trong vòng Tràng Sinh và vòng Lộc Tồn để suy ra ý nghĩa.
③ Nhóm Thái Tuế tại Mệnh vs Thân: Hai nhóm phản ánh hai chiều con người — bên trong và bên ngoài xã hội.
④ Một nhận định tổng: Điểm đặc biệt nhất của lá số này là gì?

Lưu ý: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — diễn giải, không liệt kê lại.
Tối thiểu phải trả lời được các câu hỏi: Cuộc đời tôi nhìn tổng thể là lá số sung sướng hay lận đận, và tôi sinh ra trên đời này để đóng vai trò hay sứ mệnh gì? Đâu là giai đoạn vận hạn đỉnh cao nhất để tôi bứt phá, và đâu là những mốc thời điểm giông bão nhất mà tôi phải trải qua trong suốt cuộc đời? Trong 12 cung trong lá số, đâu mới là "vũ khí mạnh nhất" giúp tôi gặt hái thành công, và đâu là "mắt xích yếu nhất" dễ khiến tôi sụp đổ? Giới hạn hay ngưỡng thành công tối đa mà lá số cho phép tôi chạm tới là đâu, tôi có số đổi đời bứt phá hay chỉ dừng lại ở mức bình ổn? Bài học hoặc nghiệp quả lớn nhất mà cuộc đời bắt buộc tôi phải đối mặt và giải quyết là gì để đạt được sự viên mãn trọn vẹn ở hậu vận?`;

  if (phan === 2) return `

PHẦN 2 — CUNG MỆNH (220-280 từ)
${CUNG_DESC['Mệnh']}

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (khí chất người này thế nào, đường đời thuận hay trắc trở). Căn cứ nội bộ (không cần xướng ngay trong câu mở): nhãn "Luận sao: …" của dòng [Mệnh] + cách cục + độ sáng chính tinh.
CẤM bịa "điểm cung X/10" — lá số KHÔNG có điểm cho từng cung, chỉ ĐẠI VẬN mới có điểm/10 thật.
Xuống dòng rồi viết văn xuôi súc tích, chia 2-4 đoạn riêng, đi thẳng vào tính cách và số phận bằng ngôn ngữ đời thường (tên sao/cách cục nếu nhắc thì gọn trong ngoặc):
① Bản chất cốt lõi: người này là kiểu người gì, dựa trên chính tinh tại Mệnh và cách cục ([CÁCH CỤC], [Ý NGHĨA]) — đây là điểm sống còn của lá số, diễn giải thật rõ tác động thực tế.
② Sao phụ, chỉ khi thực sự ảnh hưởng: dịch thẳng ra hệ quả (dễ có quý nhân giúp, dễ vướng thị phi, hay trắc trở đường học vấn...), không cần liệt kê hết tên.
③ Điểm mạnh và điểm cần cảnh giác trong con người và cuộc đời.

Xét thêm cung Thiên Di (xung chiếu Mệnh) — ảnh hưởng gì đến tính cách bên ngoài?`;

  if (phan >= 3 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan] || '';
    const cungDesc = CUNG_DESC[cung] || '';
    return `

PHẦN ${phan} — CUNG ${cung.toUpperCase()} (350-400 từ)
${cungDesc}

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (tốt/khá/trung bình/yếu ở lĩnh vực này là thế nào), tên sao/cách cục KHÔNG mở đầu câu, để gọn trong ngoặc nếu cần. Căn cứ nội bộ: nhãn "Luận sao: …" của dòng [${cung}] + cách cục + độ sáng chính tinh. Cấm né tránh.
CẤM bịa "điểm cung X/10" — lá số KHÔNG có điểm cho từng cung, chỉ ĐẠI VẬN mới có điểm/10 thật.
Xuống dòng rồi viết 2-4 đoạn riêng (đủ chỗ trả lời hết bộ câu hỏi trọng tâm ở trên, mỗi đoạn đào sâu 1-2 câu, không nhồi hết vào một đoạn):
① Nhận định chính: dựa trên [CÁCH CỤC] và [Ý NGHĨA] — dịch ra hệ quả cụ thể, đây là phần quan trọng nhất.
② Đào sâu các câu hỏi trọng tâm còn lại bằng dẫn chứng cụ thể từ dữ liệu — không bịa thêm sự kiện lá số không chỉ ra.
③ Kết luận thực tế: 1-2 câu về tác động cụ thể trong cuộc đời người này (chỉ nhắc tam phương tứ chính khi nó thật sự đổi kết quả).

Không liệt kê lại tên sao, không mô tả lại dữ liệu thô. Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận (không cần nhắc chữ "xung chiếu" nếu diễn được bằng câu thường).`;
  }

  if (phan === 14) return `

PHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN

ĐỌC phần === 9 ĐẠI VẬN ===. Mỗi ĐV đã có sẵn dòng "Scoring: TT=… ĐL=… NH=… Tổng=…"
do engine tính — CHÉP ĐÚNG con số đó, TUYỆT ĐỐI KHÔNG tự tính lại và không làm tròn khác.
(TT = Thiên Thời 0–5 · ĐL = Địa Lợi 0–1 · NH = Nhân Hòa 0–4 · Tổng 0–10.)

Bảng tổng hợp ĐV1 đến ĐV9:
| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |

JSON chart (BẮT BUỘC, đủ 9 điểm):
\`\`\`chartdata
{"labels":["ĐV1 x-y","ĐV2 x-y","ĐV3 x-y","ĐV4 x-y","ĐV5 x-y","ĐV6 x-y","ĐV7 x-y","ĐV8 x-y","ĐV9 x-y"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}
\`\`\`

Nhận xét tổng (120-160 từ), viết bằng ngôn ngữ đời thường, đọc là hiểu ngay: giai đoạn nào dễ thở nhất, giai đoạn nào chật vật nhất, xu hướng chung của cuộc đời theo thời gian. Nếu người đang trong đại vận nào thì nhận xét thêm về giai đoạn hiện tại. Không cần liệt kê lại số liệu đã có trong bảng.`;

  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return `

PHẦN ${phan} — ĐẠI VẬN ${dvNum} (120-160 từ)
Khối "ĐV${dvNum}:" trong === 9 ĐẠI VẬN === là dữ liệu DUY NHẤT được dùng cho phần này —
mọi dòng của nó đều đã hiện trên màn hình người đọc, nên bỏ sót là họ thấy ngay.

⚠️ CĂN CỨ NỘI BỘ, BẮT BUỘC BÁM ĐÚNG (đây là lỗi hay gặp nhất — luận chay theo tên
chính tinh rồi lờ đi phần engine đã chấm; dùng để KHÔNG bịa, KHÔNG phải để liệt kê
hết ra cho người đọc — chọn 1-2 điểm nặng ký nhất mà dịch ra chuyện đời thực):
- "[LUẬN ĐOÁN - TỐT/TRUNG/XẤU]" và "[CẢNH BÁO]" của ĐV${dvNum} là gốc để phán — nêu
  cả mặt thuận lẫn mặt nghịch nếu cả hai đều có, đừng chỉ chọn một chiều. "[CẢNH BÁO]"
  là mức nặng nhất → phải nói thẳng bằng hệ quả cụ thể, không được nuốt.
- "[TAM PHƯƠNG TỨ CHÍNH · CÁT/SÁT/BẠI]", "[TUẦN/TRIỆT án ngữ]", "[CÁCH CỤC LIÊN
  QUAN]" chỉ dùng KHI nó thật sự đổi kết luận (đỡ được gì / phá chỗ nào) — không
  phải liệt kê đủ cho có, và không tự suy tam hợp ngoài khối này.
- CẤM bịa sao/luận đoán không có trong khối này.

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời
thực (giai đoạn này dễ thở hay chật vật, nên tiến hay nên giữ), không mở đầu bằng
thuật ngữ. Căn cứ: dòng "Scoring: … Tổng=X" của ĐV${dvNum} (chép đúng số, không tự
tính lại; số thấp thì nói thẳng là giai đoạn khó, không né).
Xuống dòng rồi viết 1-2 đoạn giải thích ngắn, dễ hiểu, bằng ngôn ngữ đời thường:
① Vì sao: dịch "[LUẬN ĐOÁN]"/"[CẢNH BÁO]" thành chuyện đời thực — không liệt kê lại nguyên văn, không xướng tên sao/cách cục trừ khi cần cho rõ nghĩa (thì để gọn trong ngoặc).
② Kết luận thực tế: 1-2 câu tác động cụ thể + gợi ý nhẹ nếu cần.`;
  }

  if (phan === 24) return `

PHẦN 24 — TIỂU VẬN & NĂM XEM (180-220 từ)
Quan sát 3 lớp hạn cùng lúc (căn cứ nội bộ, không phải thứ phải liệt kê tên cho
người đọc): gốc đại vận (10 năm) + tiểu hạn năm đó + lưu niên đại vận. Dữ liệu có
sẵn: Tiểu hạn (cung + sao), Lưu đại hạn (cung + sao), Đại vận hiện tại.

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng: năm xem này thuận
hay nghịch, nên tiến hay nên thủ — kết luận dứt khoát bằng nghĩa đời thường, không
mở đầu bằng tên cung/sao.
Xuống dòng rồi viết 1-2 đoạn giải thích ngắn, đi thẳng vào thực tế:
① Vì sao: xu hướng chung của 3 lớp hạn (thuận hay nghịch) và quan hệ với Mệnh —
dịch ra hệ quả cụ thể, không cần liệt kê từng cung/sao đã xét, tên riêng nếu nhắc
thì để gọn trong ngoặc. Đại hạn tốt thì cái xấu của tiểu hạn cũng đỡ nặng, ngược
lại đại hạn xấu thì cái tốt của tiểu hạn cũng giảm bớt — phản ánh đúng chiều đó.
② Cơ hội và rủi ro: 1-2 điểm thuận + 1-2 điểm cần cẩn thận cụ thể, rồi một câu khuyên ngắn cho năm này.

Không giải thích lý thuyết. Đi thẳng vào tác động với người này.`;

  return `\nPhần ${phan}: Luận giải theo lá số.`;
}

/**
 * Preamble "=== LÁ SỐ ===" (đã cắt theo `phan`) + tài liệu tham khảo. ĐÂY là
 * phần đổi CHỮ theo từng `phan` (mỗi phan một lát cắt lá số khác nhau) — vì
 * thế KHÔNG dùng được làm breakpoint cache của `buildPromptCached` (breakpoint
 * cache đòi prefix giống hệt byte-for-byte giữa các lượt gọi).
 */
function promptCtx(phan: number, laSoText: string, docs?: string): string {
  const trimmedLaSo = trimLaSo(laSoText, phan);
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';
  return '=== LÁ SỐ ===\n' + trimmedLaSo + docsSection;
}

export function buildPrompt(phan: number, laSoText: string, docs?: string): string {
  return promptCtx(phan, laSoText, docs) + instructionFor(phan);
}

/**
 * Bỏ CHI TIẾT của khối `=== 9 ĐẠI VẬN ===`, GIỮ nguyên phần đầu khối (tiêu đề
 * + dòng ghi chú cấm-dùng-điểm-ĐV-để-chấm-cung) và dòng `ĐVn:` + `Scoring:`
 * của cả 9 đại vận. Mọi khối khác của lá số giữ nguyên từng byte.
 *
 * 🔑 VÌ SAO: hai tool đã TÁCH từ 2026-08 (phần 1–13 = "Luận Giải Lá Số", phần
 * 14–24 = "Chu Trình Cuộc Đời") nhưng INPUT thì chưa — `cachedSystemFor` vẫn
 * gửi toàn văn cho cả hai. Đo trên lá số thật `nham-than-26-03-1992-nu-gio-hoi`:
 * khối 9 đại vận chi tiết là 14.016/29.403 ký tự = **47,7% cả lá số**, mà
 * `instructionFor(1..13)` không hề nhắc tới nó — 13 lượt gọi cùng ghi rồi đọc
 * lại một khối không ai đọc. Cắt còn dòng điểm: 29.403 → 16.071 ký tự.
 *
 * ⚠️ GIỮ dòng điểm, đừng cắt sạch: bản luận ĐANG BÁN có trích số thật của đại
 * vận trong phần cung (phần 12 viết "đoạn căng nhất… (3.8/10), qua 36 mới dịu")
 * — cắt hết là mất đúng thứ làm bản luận có mốc thời gian.
 * ⚠️ GIỮ dòng ghi chú ngay dưới tiêu đề: nó chính là luật "TUYỆT ĐỐI KHÔNG
 * dùng điểm đại vận để chấm hay làm điểm yếu của một CUNG". Bỏ điểm-mà-giữ-luật
 * thì thừa; giữ điểm-mà-bỏ-luật thì model lấy 3.8/10 chấm luôn cho cung.
 *
 * Hụt mốc thì TRẢ NGUYÊN lá số + `console.error` — không im lặng (cùng lớp bẫy
 * `findIndex` trả -1 đã làm bộ cắt câm 2 tháng, xem `trimLaSo` ngay trên).
 */
export function stripDaiVanDetail(laSoText: string): string {
  if (!laSoText) return laSoText;
  const lines = laSoText.split('\n');
  const findMark = (m: string) => lines.findIndex((l) => l.trimStart().startsWith(m));
  const dvIdx = findMark('=== 9 ĐẠI VẬN');
  if (dvIdx < 0) {
    console.error(
      '[luan-giai-doc] stripDaiVanDetail: KHÔNG thấy mốc "=== 9 ĐẠI VẬN" → trả NGUYÊN lá số ' +
        '(phần 1-13 sẽ tốn token như cũ, không sai kết quả). Kiểm public/tuvi-laso-format.js (MARKERS).',
    );
    return laSoText;
  }
  const ccIdx = findMark('=== CÁCH CỤC & NHẬN ĐỊNH');
  const dvEnd = ccIdx > dvIdx ? ccIdx : lines.length;
  const dvLines = lines.slice(dvIdx, dvEnd);
  // Phần đầu khối = từ tiêu đề tới ngay trước dòng "ĐV1:" (gồm dòng ghi chú).
  const firstDv = dvLines.findIndex((l) => /^ĐV\d+:/.test(l));
  if (firstDv < 0) {
    console.error(
      '[luan-giai-doc] stripDaiVanDetail: có mốc "=== 9 ĐẠI VẬN" nhưng KHÔNG có dòng "ĐVn:" nào → ' +
        'trả NGUYÊN lá số. Kiểm định dạng khối đại vận trong public/tuvi-laso-format.js.',
    );
    return laSoText;
  }
  const keep = dvLines
    .slice(firstDv)
    .filter((l) => /^ĐV\d+:/.test(l) || l.trimStart().startsWith('Scoring:'));
  return [
    ...lines.slice(0, dvIdx),
    ...dvLines.slice(0, firstDv),
    '(Bản này CHỈ giữ điểm từng đại vận để neo mốc thời gian. Chi tiết sao, luận đoán và',
    'cảnh báo của từng đại vận KHÔNG thuộc phần đang luận — đừng nhắc tới thứ không có ở đây.)',
    ...keep,
    ...lines.slice(dvEnd),
  ].join('\n');
}

/**
 * `system` DÙNG CHUNG CACHE — SYSTEM_PROMPT + lá số, KHÔNG phụ thuộc
 * `docs`. Đây là phần BẤT BIẾN THEO NGƯỜI (không theo phần đang luận)
 * nên MỌI lượt gọi của CÙNG một lá số — 24 phần Luận Giải LẪN 16 phần "Vận
 * Hạn 12 Tháng Tới" (4 phần đầu QUA `buildPromptCached`, 12 phần tháng qua
 * `buildPromptThang` ở `app/api/van-han-nam/route.ts`) — PHẢI dùng
 * đúng chuỗi này làm `system` khi bật `cacheSystem`. Tách hàm riêng để hai
 * nơi gọi không tự tay ghép lại chuỗi hai lần rồi trôi khỏi nhau — lệch một
 * byte là Anthropic coi là prefix khác, cache miss, mất hết lợi ích chia sẻ
 * (xem CLAUDE.md track tối ưu chi phí Opus, "Code #1" + phần vá "Vận Hạn 12
 * Tháng Tới").
 *
 * `phan` quyết định lá số gửi kèm là bản NÀO — và vì thế quyết định luôn CỤM
 * CACHE. Cùng một cụm thì mọi lượt phải truyền `phan` cùng nhóm:
 *   · `phan` 1–13  → lá số đã bỏ chi tiết đại vận (`stripDaiVanDetail`).
 *                    Đúng một cụm cho cả 13 phần của tool "Luận Giải Lá Số".
 *   · `phan` 14–24 → TOÀN VĂN. Một cụm cho 11 phần "Chu Trình Cuộc Đời".
 *   · KHÔNG truyền → TOÀN VĂN. Đây là đường của `buildPromptThang`
 *                    (`app/api/van-han-nam/route.ts`, 12 phần tháng) — nó
 *                    phải khớp cụm với phần 2/3/4 của chính tool đó, mà 3
 *                    phần ấy map sang `phan` 14 / 14+n / 24 nên là TOÀN VĂN.
 * Hướng mặc định CỐ Ý là toàn văn: quên truyền `phan` thì tốn token, KHÔNG
 * thiếu dữ liệu — hỏng về phía đắt chứ không hỏng về phía sai.
 *
 * ⚠️ Hệ quả đã cân nhắc: `van-han-nam` phần 1 map sang `phan` 1 nên nay dùng
 * bản đã cắt, GIỐNG HỆT phần 1 của Luận Giải — hai tool vẫn không trôi khỏi
 * nhau ở cùng một phần (đúng luật ghi ở đầu `van-han-nam/route.ts`), đổi lại
 * tool đó có 2 cụm cache thay vì 1. Thực tế gần như không tốn thêm: phần 1
 * của nó hầu hết đọc thẳng từ `laso_public.luan_giai` qua
 * `readCachedLuanGiaiPhan`, không gọi LLM.
 */
export function cachedSystemFor(laSoText: string, phan?: number): string {
  // Nhãn phải nói ĐÚNG thứ đang gửi. Để nguyên "(ĐẦY ĐỦ, KHÔNG CẮT)" trên bản
  // đã cắt là tự dạy model rằng phần đại vận vốn chỉ có bấy nhiêu — nó sẽ luận
  // như thể lá số THIẾU dữ liệu thay vì hiểu là phần đó không thuộc bài này.
  if (phan != null && phan <= 13) {
    return (
      SYSTEM_PROMPT +
      '\n\n=== LÁ SỐ (đủ 12 cung + cách cục; khối đại vận CHỈ có điểm) ===\n' +
      stripDaiVanDetail(laSoText)
    );
  }
  return SYSTEM_PROMPT + '\n\n' + laSoContextFull(laSoText);
}

/**
 * Bản DÙNG CHUNG CACHE của `buildPrompt` — xem CLAUDE.md track tối ưu chi phí
 * Opus, "Code #1". Khác `buildPrompt` ở HAI chỗ:
 *   1. Lá số KHÔNG cắt theo `trimLaSo` (bộ cắt đó ra một lát khác nhau cho
 *      TỪNG `phan` → phá cache ngay lượt thứ hai; Anthropic khớp prefix TUYỆT
 *      ĐỐI, lệch một byte là miss cả khối). Chỉ có đúng MỘT phép cắt được
 *      phép ở đây: `stripDaiVanDetail` cho `phan` 1-13 — nó cho ra chuỗi
 *      GIỐNG HỆT NHAU ở cả 13 phần nên vẫn là một prefix duy nhất. Xem
 *      `cachedSystemFor`.
 *   2. Lá số dời sang `system` (bất biến theo NGƯỜI, không theo `phan`) — chỉ
 *      `system` mới được đóng dấu `cache_control` (xem `buildAnthropicBody`
 *      trong `lib/llm/complete.ts`). `prompt` trả về CHỈ còn phần đổi theo
 *      từng lượt gọi: tài liệu RAG (khác nhau mỗi `phan`, không cache được)
 *      + câu lệnh riêng của phần đó.
 * Caller PHẢI gọi `llmTextFull({..., cacheSystem:true})` với `system` lấy từ
 * đây — thiếu cờ đó thì Anthropic nhận `system` dạng chuỗi thường (không có
 * `cache_control`) và vẫn tính tiền y như không cache (không hỏng, chỉ không
 * tiết kiệm được gì).
 */
export function buildPromptCached(
  phan: number,
  laSoText: string,
  docs?: string,
): { system: string; prompt: string } {
  const docsSection = docs ? '=== TÀI LIỆU THAM KHẢO ===\n' + docs + '\n\n' : '';
  return {
    // Truyền `phan` để phần 1-13 nhận lá số đã bỏ chi tiết đại vận — xem
    // `cachedSystemFor`. Bỏ tham số này là quay về gửi toàn văn cho mọi phần.
    system: cachedSystemFor(laSoText, phan),
    prompt: docsSection + instructionFor(phan),
  };
}
