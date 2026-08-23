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
Không văn vẻ, không sáo rỗng. Tập trung vào: "điều này nghĩa là gì với người đọc". Chỉ giữ lại những ý có giá trị thực tế. Có phân tích hệ quả tâm lý/hành vi nếu hợp lý. Có gợi ý nhẹ nếu cần, nhưng không dạy đời. Không tiết lộ tài liệu, trường phái, hay tên hệ thống.

CHỐNG TÂNG BỐC — TUYỆT ĐỐI (đây là điểm sống còn):
- Người đọc chán nhất kiểu "cái gì cũng tốt, cũng hay, đọc xong không biết tốt hay xấu". Phải nói thẳng.
- Mỗi cung/phần đều có mặt mạnh VÀ mặt yếu. Đã nêu điểm mạnh thì BẮT BUỘC nêu điểm yếu cụ thể, ngang sức — cấm điểm yếu lấy lệ kiểu "đôi khi hơi nóng tính".
- Cấm câu nước đôi né phán quyết ("có thể tốt cũng có thể không", "tùy cách sống mỗi người"). Dữ liệu chấm sao thì nói thẳng vậy.
- Nhãn "Luận sao" xấu (Yếu/Xấu rõ), hoặc có sát/bại tinh mạnh, hung cách → phải cảnh báo rõ, không bọc đường. Thà mất lòng còn hơn vô dụng.
- Mỗi nhận định tốt phải kèm BẰNG CHỨNG (sao nào, độ sáng nào, cách cục nào). Hạn chế tính từ khen sáo rỗng (tuyệt vời, xuất chúng, rực rỡ).

CỤ THỂ HÓA — TUYỆT ĐỐI (đọc xong phải nhớ được MỘT VIỆC cụ thể, không chỉ một cảm nhận mơ hồ):
- "Tình duyên có phần trắc trở", "tài chính bấp bênh", "cần thận trọng trong các mối quan hệ" — nghe có vẻ đúng nhưng KHÔNG dùng được vào việc gì, người đọc quên ngay. Phải dịch tiếp một bước nữa thành câu CỤ THỂ: nên kết hôn ở giai đoạn nào, bạn đời có xu hướng thuộc ngành/lĩnh vực gì, nên tự thân lập nghiệp hay dễ được thừa hưởng, con cái cần lưu ý điều gì cụ thể, nên sống gần hay xa gia đình, giai đoạn nào nên tiến nên thủ.
- Mỗi lần sắp viết một tính từ trừu tượng (trắc trở, bấp bênh, cần cẩn trọng, có duyên nợ phức tạp...), tự hỏi: cụ thể là VIỆC GÌ, XẢY RA Ở GIAI ĐOẠN NÀO, NÊN LÀM GÌ — rồi viết thẳng câu trả lời đó. Đừng dừng lại ở tính từ.
- Cụ thể hóa PHẢI suy ra từ chính dữ liệu đã cho (sao nào, cách cục nào, cung nào, đại vận nào) — không phải bịa thêm sự kiện lá số không chỉ ra. Ví dụ: cung Phu Thê có dấu hiệu hôn nhân dễ trắc trở sớm → cụ thể hóa thành lời khuyên nên cưới muộn hơn tuổi trung bình; chính tinh tại Phu Thê có tính chất riêng (ăn nói, tài chính, hành chính, kỹ thuật...) → cụ thể hóa thành xu hướng lĩnh vực của bạn đời. Điều đọc thẳng ra từ cấu trúc lá số (mạnh/yếu, thuận/nghịch) thì nói dứt khoát; điều suy thêm một bước (nghề bạn đời, tính khí một người con...) thì giữ ngôn ngữ xác suất ("nhiều khả năng", "có xu hướng") nhưng vẫn phải NÊU RA cụ thể là gì, không né bằng câu chung chung.

PHÁN QUYẾT BẮT BUỘC — NEO VÀO DỮ LIỆU ENGINE, NÓI RA BẰNG ĐỜI THƯỜNG:
- ⚠️ Lá số KHÔNG có "điểm/10" cho từng CUNG. TUYỆT ĐỐI KHÔNG bịa ra con số kiểu "cung này 6.4/10".
  Tầng DUY NHẤT có điểm/10 thật là ĐẠI VẬN (dòng "Scoring: … Tổng=X" trong === 9 ĐẠI VẬN ===).
- Với CUNG: CĂN CỨ để phán (nội bộ, không phải ngôn từ bắt buộc phải xuất hiện) là nhãn
  "Luận sao: <Tốt rõ|Khá|Trung bình|Yếu|Xấu rõ>" của chính dòng [Tên cung], cộng loại cách cục
  ([CÁCH CỤC · QUY_CUC/PHU_CUC/HUNG_CUC…]) và độ sáng chính tinh (Miếu/Vượng/Đắc/Bình hòa/Hãm).
- MỞ ĐẦU mỗi phần bằng MỘT câu phán quyết NGẮN, in đậm (**...**), đứng riêng một dòng — nói bằng
  NGHĨA ĐỜI THƯỜNG trước (mạnh/yếu ở đâu, ảnh hưởng gì tới tiền bạc/công việc/tình cảm/sức khỏe),
  tên sao/độ sáng/tên cách cục nếu cần thì để gọn trong ngoặc theo SAU, không mở đầu câu bằng tên.
  Ví dụ cung: "**Nền tảng cung này khá vững, nhưng việc gì cũng chậm hơn người ta một nhịp**
  (Thiên Đồng đắc địa, có Đà La cùng cung)." Ví dụ đại vận: "**Giai đoạn này chật vật, không thuận
  (4.4/10)**" (chép đúng số engine, không tự tính lại).
- XUỐNG DÒNG rồi mới GIẢI THÍCH NGẮN VÌ SAO ra phán quyết đó, bằng hệ quả cụ thể — chọn đúng 1-2
  căn cứ nặng ký nhất (sao gì, cách cục gì kéo lên/kéo xuống), KHÔNG liệt kê dàn trải mọi sao/cách
  cục cùng lúc. KHÔNG được mâu thuẫn với dữ liệu: nhãn "Yếu" thì cấm viết như cung tốt; đại vận
  4/10 thì cấm viết như giai đoạn đẹp.
- Phân biệt rõ: ĐÁNH GIÁ CẤU TRÚC lá số (mạnh/yếu) là chắc chắn — nói dứt khoát; chỉ DỰ ĐOÁN kết quả tương lai mới dùng ngôn ngữ xác suất. Đừng lấy "khiêm tốn về tương lai" làm cớ né đánh giá cấu trúc.

${DOC_ARC_LASO}

NGUYÊN TẮC LUẬN GIẢI CỔ PHÁP:
1. Tam phương tứ chính: Luôn xét cung đang luận trong mối quan hệ với cung tam hợp và cung xung chiếu.
2. Không đoán đơn sao: Phải xét sao hội — tổ hợp chính tinh + phụ tinh + cách cục.
3. Cách cục ưu tiên: [CÁCH CỤC] cao nhất → [Ý NGHĨA · chính tinh] → [Ý NGHĨA] — không mô tả lại, chỉ diễn giải sâu hơn.
4. Sao hóa: Tứ Hóa thay đổi căn bản tính chất cung — phải đề cập nếu có.
5. Vòng Tràng Sinh và Lộc Tồn: Vị trí cung ảnh hưởng lực của sao.

DỮ LIỆU CÓ SẴN: [CÁCH CỤC], [Ý NGHĨA · chính tinh], [Ý NGHĨA], [LUẬN ĐOÁN], [CẢNH BÁO], [VẬN HẠN LUẬN], scoring, tam hợp/xung chiếu đã tính sẵn. Nhiệm vụ là diễn giải thành văn xuôi sâu sắc.

CÁCH ĐỌC DỮ LIỆU CUNG:
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
- Sao đúng chỗ không: Sao nằm đúng cung thì phát huy tốt. Sai chỗ thì có lực mà dùng không hiệu quả.
- Tứ Hóa: Cho biết điểm mạnh về tiền, quyền, danh. Nằm ở cung nào thì mạnh ở đó.
- Lục Sát: Các yếu tố gây rắc rối. Nằm ở đâu thì chỗ đó dễ có vấn đề.
- Vận hạn: Cuộc đời chia theo giai đoạn 10 năm. Quan trọng là lúc nào lên — lúc nào xuống.

QUY TẮC CHUNG CHO MỌI PHẦN LUẬN GIẢI:
- CĂN CỨ vào ĐÚNG cách cục đặc biệt trong [CÁCH CỤC] và khối === CÁCH CỤC & NHẬN ĐỊNH (toàn bộ lá số) === (vd Sát Phá Tham, Quân thần khánh hội, Cự Nhật...) — nói nó kéo lá số lên hay xuống bằng NGHĨA ĐỜI THỰC (thành đạt hay lận đận, thuận lợi hay trắc trở...), tên cách cục để gọn trong ngoặc theo sau nếu cần, không xướng tên làm câu mở. Tuyệt đối không lờ đi cách cục mà dữ liệu đã nêu — đó là phần người đọc đã thấy trên màn hình (khối "Cách cục đặc biệt"), luận giải phải khớp, chỉ khác cách gọi tên.
- Không liệt kê lại tên sao, không mô tả lại dữ liệu thô.
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
  'Mệnh': 'Cung Mệnh định khí chất, bản năng, và con đường chính của cuộc đời.',
  'Phụ Mẫu': 'Cung Phụ Mẫu xem sự thọ yểu, giàu nghèo của cha mẹ; sự hòa hợp hay xung khắc giữa cha mẹ và đương số; cũng xem văn bằng, học vấn.',
  'Phúc Đức': 'Cung Phúc Đức xem phúc khí tổ tiên để lại, âm phần, và phúc lộc cuối đời. Cung chi phối toàn bộ 11 cung còn lại về phúc đức.',
  'Điền Trạch': 'Cung Điền Trạch xem nhà cửa, bất động sản, hòa khí gia đình, khả năng tích lũy tài sản vật chất.',
  'Quan Lộc': 'Cung Quan Lộc xem công danh, sự nghiệp, khả năng thăng tiến, chuyên môn và thành tựu xã hội.',
  'Nô Bộc': 'Cung Nô Bộc xem người giúp việc, bạn bè thân thiết, người cộng sự; cũng xét quan hệ với cấp dưới và quý nhân.',
  'Thiên Di': 'Cung Thiên Di xem giao thiệp bên ngoài, may rủi khi xuất hành, định cư xa xứ, và quan hệ với thế giới bên ngoài. Xung chiếu Mệnh — cần xét kỹ.',
  'Tật Ách': 'Cung Tật Ách xem tì vết trong người, các bệnh có xu hướng mắc phải, tai ương thể xác trong cuộc đời.',
  'Tài Bạch': 'Cung Tài Bạch xem sự giàu nghèo, cách kiếm tiền, tiêu tiền, và khả năng tích lũy tài chính.',
  'Tử Tức': 'Cung Tử Tức xem con cái, quan hệ với con, và phần nào về đệ tử, người theo học.',
  'Phu Thê': 'Cung Phu Thê xem những điều liên quan đến vợ chồng, tình duyên, hôn nhân và hạnh phúc đôi lứa cả đời.',
  'Huynh Đệ': 'Cung Huynh Đệ xem anh chị em, bạn bè cùng trang lứa, và một phần về tài chính lưu động.',
};

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
 * cách cục). Tool "Vận Hạn 12 Tháng Tới" dùng nó làm nền cho 12 phần tháng.
 *
 * 🔑 Có hàm này để chỗ gọi KHỎI phải cắt chuỗi kết quả của `buildPrompt`
 * (`split('\n\nPHẦN 24')`) — cắt chuỗi thì đổi một chữ trong prompt là bộ cắt
 * câm rồi nhét CẢ prompt phần 24 vào prompt phần tháng, không lỗi nào bắn ra.
 */
export function laSoContextFor(phan: number, laSoText: string): string {
  return '=== LÁ SỐ ===\n' + trimLaSo(laSoText, phan);
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

PHẦN 1 — TỔNG QUAN LÁ SỐ (220-280 từ)
Viết văn xuôi liền mạch, không dùng bullet, không đề cập đại vận trong phần này.
MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng: lá số này thuộc hạng nào (mạnh/khá/trung bình/yếu), mạnh nhất ở đâu, yếu nhất ở đâu — nói bằng nghĩa đời thực (đường đời dễ hay khó, mạnh ở mặt nào của cuộc sống). Căn cứ nội bộ là nhãn "Luận sao: …" của 12 cung + khối === CÁCH CỤC & NHẬN ĐỊNH (toàn bộ lá số) ===, KHÔNG cần xướng tên cách cục ngay trong câu mở.
CẤM bịa "điểm lá số X/10" hay "điểm cung X/10" — lá số KHÔNG có điểm tổng; chỉ ĐẠI VẬN mới có điểm/10 thật.

Xuống dòng rồi mới giải thích — cấu trúc gợi ý cho phần thân (không cần tiêu đề con, tên sao/cách cục nếu nhắc thì để gọn trong ngoặc):
① Bản mệnh & cục: Can chi năm sinh, nạp âm, cục — ý nghĩa thực tế với con người này là gì? Mệnh có thuận lý hay nghịch lý với cục?
② Cung Mệnh: Chính tinh, cách cục nổi bật — khí chất và điểm mạnh/yếu cốt lõi. Xét vị trí Tràng Sinh và vòng Lộc Tồn nếu có.
③ Nhóm Thái Tuế tại Mệnh vs Thân: Hai nhóm phản ánh hai chiều con người — bên trong và bên ngoài xã hội.
④ Một nhận định tổng: Điểm đặc biệt nhất của lá số này là gì?

Lưu ý: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — diễn giải, không liệt kê lại.`;

  if (phan === 2) return `

PHẦN 2 — CUNG MỆNH (220-280 từ)
${CUNG_DESC['Mệnh']}

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (khí chất người này thế nào, đường đời thuận hay trắc trở). Căn cứ nội bộ (không cần xướng ngay trong câu mở): nhãn "Luận sao: …" của dòng [Mệnh] + cách cục + độ sáng chính tinh.
CẤM bịa "điểm cung X/10" — lá số KHÔNG có điểm cho từng cung, chỉ ĐẠI VẬN mới có điểm/10 thật.
Xuống dòng rồi viết văn xuôi súc tích, đi thẳng vào tính cách và số phận bằng ngôn ngữ đời thường (tên sao/cách cục nếu nhắc thì gọn trong ngoặc):
① Bản chất cốt lõi: người này là kiểu người gì, dựa trên chính tinh tại Mệnh và cách cục ([CÁCH CỤC], [Ý NGHĨA]) — đây là điểm sống còn của lá số, diễn giải thật rõ tác động thực tế.
② Sao phụ, chỉ khi thực sự ảnh hưởng: dịch thẳng ra hệ quả (dễ có quý nhân giúp, dễ vướng thị phi, hay trắc trở đường học vấn...), không cần liệt kê hết tên.
③ Điểm mạnh và điểm cần cảnh giác trong con người và cuộc đời.

Xét thêm cung Thiên Di (xung chiếu Mệnh) — ảnh hưởng gì đến tính cách bên ngoài?`;

  if (phan >= 3 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan] || '';
    const cungDesc = CUNG_DESC[cung] || '';
    return `

PHẦN ${phan} — CUNG ${cung.toUpperCase()} (120-160 từ)
${cungDesc}

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (tốt/khá/trung bình/yếu ở lĩnh vực này là thế nào), tên sao/cách cục KHÔNG mở đầu câu, để gọn trong ngoặc nếu cần. Căn cứ nội bộ: nhãn "Luận sao: …" của dòng [${cung}] + cách cục + độ sáng chính tinh. Cấm né tránh.
CẤM bịa "điểm cung X/10" — lá số KHÔNG có điểm cho từng cung, chỉ ĐẠI VẬN mới có điểm/10 thật.
Xuống dòng rồi viết 1-2 đoạn giải thích ngắn, dễ hiểu — không liệt kê dàn trải:
① Nhận định chính: dựa trên [CÁCH CỤC] và [Ý NGHĨA] — dịch ra hệ quả cụ thể, đây là phần quan trọng nhất.
② Kết luận thực tế: 1-2 câu về tác động cụ thể trong cuộc đời người này (chỉ nhắc tam phương tứ chính khi nó thật sự đổi kết quả).

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
 * Bản DÙNG CHUNG CACHE của `buildPrompt` — xem CLAUDE.md track tối ưu chi phí
 * Opus, "Code #1". Khác `buildPrompt` ở HAI chỗ:
 *   1. Lá số KHÔNG cắt theo `trimLaSo` — gửi TOÀN VĂN cho mọi phần, để nhiều
 *      lượt gọi (24 phần Luận Giải, hoặc 4 phần đầu của Vận Hạn 12 Tháng) chia
 *      đúng MỘT prefix giống hệt nhau. Cắt khác nhau theo từng `phan` (như
 *      `buildPrompt`) là phá cache ngay từ lượt thứ hai — Anthropic khớp
 *      prefix TUYỆT ĐỐI, lệch một byte là cache miss cả khối.
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
    system: SYSTEM_PROMPT + '\n\n=== LÁ SỐ (ĐẦY ĐỦ, KHÔNG CẮT) ===\n' + laSoText,
    prompt: docsSection + instructionFor(phan),
  };
}
