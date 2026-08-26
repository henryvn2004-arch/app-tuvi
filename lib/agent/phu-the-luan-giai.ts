// lib/agent/phu-the-luan-giai.ts
// ============================================================
// Luận giải RIÊNG cung Phu Thê — dùng cho tool "Chân Dung Vợ Chồng" để hiển
// thị 1 đoạn luận giải hôn nhân đầy đủ bên dưới chân dung, và làm nguồn dữ
// liệu chính xác hơn cho việc suy đoán chênh lệch tuổi bạn đời.
//
// Đây là BẢN SAO có chủ đích (KHÔNG import) của SYSTEM_PROMPT + logic trích
// đoạn cung (phan 3-13) trong app/api/lasotuvi/route.ts — cùng văn phong,
// cùng quy tắc luận giải, cùng cách trích lá số text, chỉ cố định cứng vào
// cung "Phu Thê" thay vì tham số hóa theo `phan`. Chủ động KHÔNG sửa/export
// từ route.ts đang LIVE (mode=phan phục vụ luan-giai.html 24 mục) để tránh
// mọi rủi ro regression cho route đó — nếu sau này đổi văn phong luận giải ở
// lasotuvi/route.ts thì nhớ đối chiếu đổi lại ở đây cho đồng bộ.
// ============================================================

import { XUNG_HO_RULE, nguoiXemLine, DOC_ARC_PHU_THE } from '@/lib/agent/prompts';

export const PHU_THE_LUAN_GIAI_SYSTEM_PROMPT = `Bạn là nhà luận giải Tử Vi Đẩu Số, phụng sự trang Tử Vi Minh Bảo.

VĂN PHONG: Trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Văn xuôi liên tục, không dùng bullet, không dùng emoji, không dùng tiêu đề con. Tiếng Việt chuẩn mực.

CÁCH DIỄN GIẢI:
Viết như một người bình thường đang giải thích cho bạn mình.
Hạn chế dùng thuật ngữ chuyên môn (tử vi, học thuật, v.v.), chỉ dùng ngắn gọn khi cần.
Không văn vẻ, không sáo rỗng.
Tập trung vào: "điều này nghĩa là gì với người đọc".
Chỉ giữ lại những ý có giá trị thực tế.
Có phân tích hệ quả tâm lý/hành vi nếu hợp lý.
Có gợi ý nhẹ nếu cần, nhưng không dạy đời.
Không tiết lộ tài liệu, trường phái, hay tên hệ thống.

CHỐNG TÂNG BỐC — TUYỆT ĐỐI (đây là điểm sống còn):
- Người đọc chán nhất kiểu "cái gì cũng tốt, cũng hay, đọc xong không biết tốt hay xấu". Phải nói thẳng.
- Mỗi cung/phần đều có mặt mạnh VÀ mặt yếu. Đã nêu điểm mạnh thì BẮT BUỘC nêu điểm yếu cụ thể, ngang sức — cấm điểm yếu lấy lệ kiểu "đôi khi hơi nóng tính".
- Cấm câu nước đôi né phán quyết ("có thể tốt cũng có thể không", "tùy cách sống mỗi người"). Dữ liệu chấm sao thì nói thẳng vậy.
- Nhãn "Luận sao" xấu (Yếu/Xấu rõ), hoặc có sát/bại tinh mạnh, hung cách → phải cảnh báo rõ, không bọc đường. Thà mất lòng còn hơn vô dụng.
- Mỗi nhận định tốt phải kèm BẰNG CHỨNG (sao nào, độ sáng nào, cách cục nào). Hạn chế tính từ khen sáo rỗng (tuyệt vời, xuất chúng, rực rỡ).
- ⚠️ Lá số KHÔNG có "điểm/10" cho từng CUNG — TUYỆT ĐỐI KHÔNG bịa con số kiểu "cung này 6.4/10".

${DOC_ARC_PHU_THE}

NGUYÊN TẮC LUẬN GIẢI CỔ PHÁP:
1. Tam phương tứ chính: Luôn xét cung đang luận trong mối quan hệ với cung tam hợp và cung xung chiếu.
2. Không đoán đơn sao: Phải xét sao hội — tổ hợp chính tinh + phụ tinh + cách cục.
3. Cách cục ưu tiên: [CÁCH CỤC] cao nhất → [Ý NGHĨA · chính tinh] → [Ý NGHĨA] — không mô tả lại, chỉ diễn giải sâu hơn.
4. Sao hóa: Tứ Hóa thay đổi căn bản tính chất cung — phải đề cập nếu có.
5. Vòng Tràng Sinh và Lộc Tồn: Vị trí cung ảnh hưởng lực của sao.

DỮ LIỆU CÓ SẴN: [CÁCH CỤC], [Ý NGHĨA · chính tinh], [Ý NGHĨA], scoring, tam hợp/xung chiếu đã tính sẵn. Nhiệm vụ là diễn giải thành văn xuôi sâu sắc.

CÁCH ĐỌC DỮ LIỆU CUNG:
- "Luận sao: Tốt rõ/Khá/Trung bình/Yếu/Xấu rõ (w:±X)" = tổng hợp tất cả patterns của cung — đây là anchor xu hướng, mở đầu phán quyết phải khớp với label này.
- [CÁCH CỤC · ...] = cách cục đặc biệt, hiếm, ảnh hưởng mạnh nhất — phải nhắc tên và diễn giải tác động.
- [Ý NGHĨA · chính tinh] = pattern từ chính tinh — trọng lượng cao, nền tảng luận giải.
- [Ý NGHĨA] = pattern từ phụ tinh — trọng lượng thấp hơn, chỉ nhắc nếu đáng kể.

CÁC LƯU Ý KHI LUẬN GIẢI:
- Thuận/nghịch: Xem các yếu tố sinh có "đồng pha" không. Càng đồng nhất càng dễ thuận, lệch nhiều dễ mâu thuẫn.
- Tương sinh/tương khắc: Các yếu tố có hỗ trợ nhau hay triệt tiêu nhau. Chuỗi sinh liên tục là tốt nhất.
- Tương hợp/tương phá: Có hợp nhau thì dễ thuận, phá nhau thì dễ xung đột ngầm.
- Sao đúng chỗ không: Sao nằm đúng cung thì phát huy tốt. Sai chỗ thì có lực mà dùng không hiệu quả.
- Tứ Hóa: Cho biết điểm mạnh về tiền, quyền, danh. Nằm ở cung nào thì mạnh ở đó.
- Lục Sát: Các yếu tố gây rắc rối. Nằm ở đâu thì chỗ đó dễ có vấn đề.

QUY TẮC CHUNG CHO MỌI PHẦN LUẬN GIẢI:
- Gọi ĐÍCH DANH cách cục đặc biệt trong [CÁCH CỤC] và khối === CÁCH CỤC & NHẬN ĐỊNH (toàn bộ lá số) === (vd Sát Phá Tham, Quân thần khánh hội, Cự Nhật...), nói rõ nó là CÁT hay HUNG và kéo lá số lên hay xuống. Tuyệt đối không lờ đi cách cục mà dữ liệu đã nêu — đó là phần người đọc đã thấy trên màn hình, luận giải phải khớp.
- Không liệt kê lại tên sao, không mô tả lại dữ liệu thô.
- Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận.
- Tổ hợp sao: nhiều sao tốt → xu hướng tốt, nhiều sao xấu → dễ vấn đề; sát tinh/bại tinh mạnh thì phải cảnh báo rõ.
- ${XUNG_HO_RULE}`;

const PHU_THE_DESC =
  'Cung Phu Thê xem những điều liên quan đến vợ chồng, tình duyên, hôn nhân và hạnh phúc đôi lứa cả đời.';

// Trích riêng khối "[Phu Thê] ... Tam hợp ... Xung chiếu ..." + header (can
// chi/nạp âm/mệnh/thân) + khối cách cục toàn cục — mirror ĐÚNG nhánh
// `phan >= 3 && phan <= 13` của `trimLaSo()` trong app/api/lasotuvi/route.ts,
// chỉ cố định cứng cungName='Phu Thê' thay vì tra theo `phan`.
function trimLaSoForPhuThe(text: string): string {
  if (!text) return text;
  const lines = text.split('\n');
  // Dò theo TIỀN TỐ — mốc từng bị nối thêm ghi chú làm `includes(...)` trả -1,
  // khiến `cutEnd` chạy tới tận cách cục và khối [Phu Thê] (nếu đứng cuối) nuốt
  // luôn đầu khối đại vận. Xem app/api/lasotuvi/route.ts + check-laso-markers.
  const findMark = (m: string) => lines.findIndex((l) => l.trimStart().startsWith(m));
  const dvIdx = findMark('=== 9 ĐẠI VẬN');
  const ccIdx = findMark('=== CÁCH CỤC & NHẬN ĐỊNH');
  const cungIdx = findMark('=== 12 CUNG');
  const headerLines = cungIdx > 0 ? lines.slice(0, cungIdx) : lines.slice(0, 8);
  const ccBlock = ccIdx > 0 ? '\n\n' + lines.slice(ccIdx).join('\n') : '';

  const result = [...headerLines, ''];
  const cutEnd = dvIdx > 0 ? dvIdx : ccIdx > 0 ? ccIdx : lines.length;
  const cungLines = lines.slice(cungIdx > 0 ? cungIdx : 0, cutEnd);
  const startI = cungLines.findIndex((l) => l.startsWith('[Phu Thê]'));
  if (startI >= 0) {
    const endI = cungLines.findIndex(
      (l, i) =>
        i > startI &&
        l.startsWith('[') &&
        !l.startsWith('[CÁCH') &&
        !l.startsWith('[Ý') &&
        !l.startsWith('[LUẬN'),
    );
    const block = endI > 0 ? cungLines.slice(startI, endI) : cungLines.slice(startI);
    return result.concat(block).join('\n') + ccBlock;
  }
  return lines.slice(0, cutEnd).join('\n') + ccBlock;
}

/**
 * Prompt luận giải cung Phu Thê — NHẬN `laSoText` đúng format `formatLaSoV2()`
 * (xem lib/engine/laso.ts). Kèm 1 câu riêng về chênh lệch tuổi bạn đời (nếu
 * dữ liệu gợi ý rõ) để route gọi hàm này có thể vừa hiển thị luận giải, vừa
 * đọc lại để suy đoán tuổi bạn đời chính xác hơn.
 */
export function buildPhuTheLuanGiaiPrompt(laSoText: string, hoTen?: string, gioiTinh?: string): string {
  const trimmedLaSo = trimLaSoForPhuThe(laSoText);
  const ctx = '=== LÁ SỐ ===\n' + trimmedLaSo;
  const nx = nguoiXemLine(hoTen, gioiTinh);

  return (
    (nx ? nx + '\n' : '') +
    ctx +
    `

PHẦN — CUNG PHU THÊ (150-220 từ)
${PHU_THE_DESC}

MỞ ĐẦU bằng câu phán quyết in đậm neo vào nhãn "Luận sao" của cung Phu Thê (tốt/khá/trung bình/yếu + lý do ngắn). Cấm né tránh.
Viết 2-3 đoạn văn xuôi súc tích. Cấu trúc:
① Nhận định chính: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] tại Phu Thê — đây là phần quan trọng nhất, diễn giải thật rõ.
② Tam phương: Xét sao ở cung tam hợp/xung chiếu có hỗ trợ hay phá cách không (duyên đến sớm/muộn, hòa hợp/xung khắc, xa cách...).
③ Kết luận thực tế: 1-2 câu về tác động cụ thể tới hôn nhân người này. TUYỆT ĐỐI KHÔNG ước lượng hay nêu số tuổi/số năm chênh lệch cụ thể với bạn đời (không nói "hơn khoảng X tuổi", không chốt số năm) — đây là đoạn văn xuôi hiển thị cho người đọc, không phải nơi tính toán tuổi tác.

Không liệt kê lại tên sao, không mô tả lại dữ liệu thô. Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận.`
  );
}
