// app/api/lasotuvi/route.ts
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody, CORS_HEADERS } from '@/lib/cors';
import {
  computeMonth, topDaysForActivity, ACTIVITY_META, ACTIVITY_LIST,
  type ActivityKey,
} from '../../../tuvi-engine/dist/ngay-tot/index.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

// ─── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là nhà luận giải Tử Vi Đẩu Số, phụng sự trang Tử Vi Minh Bảo.

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
- Điểm thấp (<5), hoặc có sát/bại tinh mạnh, hung cách → phải cảnh báo rõ, không bọc đường. Thà mất lòng còn hơn vô dụng.
- Mỗi nhận định tốt phải kèm BẰNG CHỨNG (sao nào, cách cục nào, điểm bao nhiêu). Hạn chế tính từ khen sáo rỗng (tuyệt vời, xuất chúng, rực rỡ).

PHÁN QUYẾT BẮT BUỘC — NEO VÀO ĐIỂM SỐ:
- Lá số có khối "=== ĐIỂM ĐÁNH GIÁ ===" với điểm 0–10 từng cung do hệ thống tính sẵn. Đây là xương sống.
- MỞ ĐẦU mỗi phần bằng MỘT câu phán quyết in đậm (**...**) neo vào con số đó. Ví dụ: "**Cung này thuộc loại khá — 6.4/10: mạnh về quý nhân nhưng nền tài chính bấp bênh.**"
- Phần thân giải thích VÌ SAO ra con số đó (sao gì, cách cục gì kéo lên/kéo xuống). KHÔNG được mâu thuẫn với điểm: cung 4/10 thì cấm viết như cung tốt.
- Phân biệt rõ: ĐÁNH GIÁ CẤU TRÚC lá số (mạnh/yếu) là chắc chắn — nói dứt khoát; chỉ DỰ ĐOÁN kết quả tương lai mới dùng ngôn ngữ xác suất. Đừng lấy "khiêm tốn về tương lai" làm cớ né đánh giá cấu trúc.

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
- Gọi ĐÍCH DANH cách cục đặc biệt trong [CÁCH CỤC] và khối === CÁCH CỤC & NHẬN ĐỊNH === (vd Sát Phá Tham, Quân thần khánh hội, Cự Nhật...), nói rõ nó là CÁT hay HUNG và kéo lá số lên hay xuống. Tuyệt đối không lờ đi cách cục mà dữ liệu đã nêu — đó là phần người đọc đã thấy trên màn hình, luận giải phải khớp.
- Không liệt kê lại tên sao, không mô tả lại dữ liệu thô.
- Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận.
- Quan hệ với Mệnh là ưu tiên: cung đang xét hỗ trợ hay khắc bản mệnh?
- Tổ hợp sao: nhiều sao tốt → xu hướng tốt, nhiều sao xấu → dễ vấn đề; sát tinh/bại tinh mạnh thì phải cảnh báo rõ.
- Cung rơi vào lĩnh vực nào thì chuyện xảy ra xoay quanh lĩnh vực đó.
- Check nền Phúc–Mệnh–Thân: 3 cung này tốt thì giảm xấu, xấu thì khuếch đại rủi ro.`;

// ─── Cung descriptions ─────────────────────────────────────────
const CUNG_BY_PHAN: Record<number, string> = {
  2:'Mệnh', 3:'Phụ Mẫu', 4:'Phúc Đức', 5:'Điền Trạch',
  6:'Quan Lộc', 7:'Nô Bộc', 8:'Thiên Di', 9:'Tật Ách',
  10:'Tài Bạch', 11:'Tử Tức', 12:'Phu Thê', 13:'Huynh Đệ',
};

const CUNG_DESC: Record<string, string> = {
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

// ─── Chat handler ──────────────────────────────────────────────
const CHAT_SYSTEM_LASO = (ctx: string, docs?: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}. Khi user hỏi "năm nay là năm mấy", "hôm nay là ngày mấy", hoặc tương tự — trả lời thẳng dựa vào thông tin này, KHÔNG nói "tôi không biết ngày hiện tại".

Nguyên tắc trả lời:
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- 200-400 từ cho câu thông thường, tối đa 600 từ cho câu phức tạp
- Dẫn chứng sao tinh, cung vị, can chi cụ thể từ lá số bên dưới
- Xét tam phương tứ chính, không đoán đơn sao
- Trả lời dứt khoát: cung/việc được hỏi tốt hay xấu, mạnh hay yếu — neo vào "Điểm cung X/10" nếu có. Cấm tâng bốc, cấm nước đôi né tránh; có điểm mạnh phải kèm điểm yếu cụ thể.
- Riêng kết quả tương lai mới dùng ngôn ngữ xác suất, không hứa hẹn tuyệt đối
- Nếu context ghi "Tiểu vận năm X không có trong dữ liệu", hãy luận từ đại vận đó, không được bịa tiểu vận
- Không tiết lộ trường phái hay tài liệu

=== DỮ LIỆU LÁ SỐ ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_GENERAL = (docs?: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}. Khi user hỏi "năm nay là năm mấy", "hôm nay là ngày mấy", hoặc tương tự — trả lời thẳng dựa vào thông tin này, KHÔNG nói "tôi không biết ngày hiện tại".

Nguyên tắc:
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- 200-400 từ cho câu thông thường, tối đa 600 từ cho câu phức tạp
- Dẫn chiếu nguyên lý cổ pháp, nêu ví dụ sao tinh cụ thể khi minh họa
- Không hứa hẹn tuyệt đối, không tiết lộ trường phái${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

// Prompt dày cho chat khi có NGUYÊN lá-số-text (giống luận giải) — chống thảo mai, neo điểm
const CHAT_RICH_RULES = () => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.

THÔNG TIN THỜI GIAN (server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}. Khi user hỏi "năm nay/hôm nay là năm/ngày mấy" — trả lời thẳng theo đây.

Bạn được cấp NGUYÊN LÁ SỐ ở phần dưới: đủ 12 cung (chính tinh, phụ tinh, cách cục đặc biệt, patterns, điểm 6 chiều từng cung, tam phương tứ chính), 9 đại vận có scoring, điểm tổng toàn lá số. Đây là dữ liệu hệ thống đã tính sẵn — BẮT BUỘC bám sát, không tự bịa.

XÁC ĐỊNH PHẠM VI (câu hỏi của user thường NGẮN/MƠ HỒ — bạn PHẢI tự khoanh vùng cung, không được trả lời hời hợt):
- Map lĩnh vực → cung cần đọc: công việc/sự nghiệp/thăng tiến/làm sếp → Quan Lộc + Mệnh; tiền bạc/đầu tư/làm giàu → Tài Bạch + Phúc Đức; tình duyên/hôn nhân/vợ chồng → Phu Thê + Mệnh; con cái → Tử Tức; sức khỏe/bệnh → Tật Ách; nhà đất/bất động sản → Điền Trạch; tính cách/vận mệnh/tổng quan → Mệnh + Thân; cha mẹ/gia đạo → Phụ Mẫu + Phúc Đức; bạn bè/cấp dưới/quý nhân → Nô Bộc; đi xa/định cư/nước ngoài → Thiên Di; anh em → Huynh Đệ.
- Câu hỏi gắn THỜI GIAN cụ thể (một năm/tháng, "bao giờ", "năm nay/năm sau") → GỌI tool tra_van_han; ngày tốt làm việc lớn → GỌI xem_ngay_tot.
- Câu hỏi mơ hồ → tự chọn cung/lĩnh vực hợp lý nhất rồi luận ĐẦY ĐỦ, đừng hỏi lại lòng vòng.

QUY TRÌNH LUẬN (bám sát như phần luận giải chuyên sâu — viết thành VĂN XUÔI liền mạch, KHÔNG đánh số, KHÔNG tiêu đề con):
1) MỞ ĐẦU bằng MỘT câu phán quyết in đậm (**...**), neo vào "Điểm cung X/10" và nhãn "Luận sao" của cung liên quan (tốt rõ/khá/trung bình/yếu/xấu rõ) + lý do một dòng.
2) Chính tinh tọa cung + trạng thái miếu/vượng/đắc/hãm — bản chất cốt lõi. Vô chính diệu thì mượn chính tinh cung xung chiếu để luận.
3) Cách cục đặc biệt ([CÁCH CỤC · ...]) và patterns ([Ý NGHĨA · chính tinh]/[Ý NGHĨA]) liên quan — gọi ĐÍCH DANH, nói rõ cát hay hung, kéo lá số lên hay xuống.
4) Tam phương tứ chính: sao ở cung tam hợp + cung xung chiếu hỗ trợ hay phá cách.
5) Điểm MẠNH và điểm YẾU cụ thể, ngang sức — neo vào 6 chiều điểm (Thiên Vận/Căn Cơ/May Mắn/Phù Trợ/Bình Yên/Bền Vững) của cung đó. Điểm <5 hoặc nhiều sát/bại tinh → CẢNH BÁO thẳng, không bọc đường.
6) KẾT LUẬN thực dụng: 1–2 câu tác động thật trong đời + gợi ý nhẹ nếu cần.

NGUYÊN TẮC: Cấm tâng bốc, cấm nước đôi né phán quyết, cấm khen sáo rỗng không bằng chứng. Đánh giá CẤU TRÚC lá số (mạnh/yếu) nói chắc; chỉ DỰ ĐOÁN tương lai mới dùng ngôn ngữ xác suất. Độ dài 250–500 từ (câu phức tạp tối đa 700). Tiếng Việt chuẩn mực, văn xuôi liền mạch, KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề con. Không tiết lộ trường phái hay tài liệu.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLasoContext(lasoData: any, question: string): string {
  if (!lasoData) return '';
  const q = (question || '').toLowerCase();
  const palaces = lasoData.palaces || [];

  const topics: Record<string, string[]> = {
    'tài chính|tài lộc|tiền|thu nhập|làm giàu|tài bạch': ['Tài Bạch', 'Phúc Đức'],
    'sự nghiệp|công việc|nghề|quan lộc|thăng tiến':       ['Quan Lộc', 'Mệnh'],
    'tình duyên|hôn nhân|vợ chồng|tình cảm|phu thê':      ['Phu Thê', 'Mệnh'],
    'con cái|con cháu|tử tức':                             ['Tử Tức'],
    'sức khỏe|bệnh|thân thể|tật ách':                     ['Tật Ách'],
    'nhà đất|bất động sản|điền trạch':                    ['Điền Trạch'],
    'anh em|huynh đệ':                                     ['Huynh Đệ'],
    'bạn bè|nô bộc|nhân viên':                            ['Nô Bộc'],
    'du lịch|di chuyển|thiên di|nước ngoài':               ['Thiên Di'],
    'cha mẹ|phụ mẫu':                                      ['Phụ Mẫu'],
    'đại vận|tiểu vận|vận hạn|vận trình':                 ['__daiVan__'],
  };

  const relevant = new Set(['Mệnh']);
  for (const [pattern, names] of Object.entries(topics)) {
    if (new RegExp(pattern, 'i').test(q)) names.forEach(n => relevant.add(n));
  }
  if (relevant.size === 1) ['Quan Lộc', 'Tài Bạch', 'Phu Thê'].forEach(n => relevant.add(n));

  const yearMatch = q.match(/năm\s*(\d{4})/i);
  if (yearMatch) relevant.add('__daiVan__');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const starFmt = (s: any): string => {
    if (!s) return '';
    if (typeof s !== 'object') return String(s);
    let t = s.ten || '';
    if (s.brightness) t += '(' + s.brightness + ')';
    if (s.hoa)        t += '[Hóa ' + s.hoa + ']';
    return t;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const starName = (s: any): string => (typeof s === 'object' ? s.ten || '' : s || '');

  let ctx = '';
  if (lasoData.canChiNam) ctx += 'Can Chi: ' + lasoData.canChiNam + '\n';
  if (lasoData.napAm)     ctx += 'Nạp Âm: ' + lasoData.napAm + ' (' + (lasoData.napAmHanh || '') + ')\n';
  if (lasoData.menhDC)    ctx += 'Mệnh DC: ' + lasoData.menhDC + '\n';
  if (lasoData.thanDC)    ctx += 'Thân DC: ' + lasoData.thanDC + '\n';
  if (lasoData.tuoiXem)   ctx += 'Tuổi xem: ' + lasoData.tuoiXem + '\n';

  if (lasoData.cachCuc?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = lasoData.cachCuc.map((c: any) =>
      typeof c === 'object' ? c.ten + (c.loai ? ` (${c.loai})` : '') : c
    ).filter(Boolean);
    if (cc.length) ctx += 'Cách cục: ' + cc.join(', ') + '\n';
  }

  if (lasoData.daiVanHienTai) {
    const dv = lasoData.daiVanHienTai;
    const dvCung = palaces[dv.cungIdx] || {};
    ctx += '\nĐại Vận hiện tại: ' + (dv.diaChi||'') + ' (' + (dv.tuoiStart||'') + '–' + (dv.tuoiEnd||'') + ' tuổi)';
    if (dvCung.cungName) ctx += ' — Cung ' + dvCung.cungName;
    const dvStars = (dvCung.tuChinhStars||dvCung.majorStars||[]).map(starName).filter(Boolean);
    if (dvStars.length) ctx += ' — Sao (tứ chính): ' + dvStars.join(', ');
    if (dv.scoring?.tong != null) ctx += ' — Điểm vận: ' + dv.scoring.tong + '/10 ' + (dv.scoring.flag||'');
    ctx += '\n';
  }

  if (yearMatch && lasoData.tuoiXem && lasoData.daiVans?.length) {
    const queriedYear = parseInt(yearMatch[1]);
    const NAM_XEM = 2027; // update annually
    const birthYear = (NAM_XEM - (lasoData.tuoiXem as number)) + 1;
    const ageInYear = (queriedYear - birthYear) + 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dvForYear = (lasoData.daiVans as any[]).find((dv: any) => ageInYear >= dv.tuoiStart && ageInYear <= dv.tuoiEnd);
    if (dvForYear) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dvP: any = palaces[dvForYear.cungIdx] || {};
      const dvStars = ((dvP.tuChinhStars || dvP.majorStars || []) as string[]).map(starName).filter(Boolean);
      ctx += `\nNăm ${queriedYear} (tuổi âm ${ageInYear}): thuộc Đại Vận ${dvForYear.diaChi} (${dvForYear.tuoiStart}–${dvForYear.tuoiEnd} tuổi)`;
      if (dvP.cungName) ctx += ` — Cung ${dvP.cungName}`;
      if (dvStars.length) ctx += ` — Sao: ${dvStars.join(', ')}`;
      if (dvForYear.scoring?.tong != null) ctx += ` — Điểm: ${dvForYear.scoring.tong}/10`;
      ctx += '\n';
      ctx += `(Tiểu vận năm ${queriedYear} không có trong dữ liệu — chỉ luận từ đại vận)\n`;
    } else {
      ctx += `\nNăm ${queriedYear} (tuổi âm ${ageInYear}): ngoài phạm vi đại vận trong dữ liệu.\n`;
    }
  }

  ctx += '\n=== CUNG LIÊN QUAN ===\n';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of palaces as any[]) {
    const pName = p.cungName || '';
    if (!relevant.has(pName) && !p.isMenh && !p.isThan) continue;
    ctx += '\nCung ' + pName + ' (' + (p.diaChi||'') + ')' + (p.isMenh?' ★MỆNH':'') + (p.isThan?' ◆THÂN':'') + ':\n';
    const sc = lasoData.cungScores?.[pName];
    if (sc) {
      const dims = ['thienVan','canCo','mayMan','phuTro','binhYen','benVung']
        .map(k => sc[k]).filter((v: number) => typeof v === 'number');
      if (dims.length) {
        const tot = sc.tong ?? Math.round(dims.reduce((a: number, b: number) => a + b, 0) / dims.length * 10) / 10;
        ctx += '  Điểm cung: ' + tot + '/10 (thiên vận ' + sc.thienVan + ', căn cơ ' + sc.canCo + ', may mắn ' + sc.mayMan + ', phù trợ ' + sc.phuTro + ', bình yên ' + sc.binhYen + ', bền vững ' + sc.benVung + ')\n';
      }
    }
    const chinh = (p.majorStars||[]).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '  Chính tinh: ' + chinh.join(', ') + '\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phu = (p.stars||[]).filter((s: any) => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(starFmt).filter(Boolean);
    if (phu.length) ctx += '  Phụ tinh: ' + phu.slice(0,8).join(', ') + '\n';
    // Sao tổ hợp tam phương tứ chính (đã loại Tuần/Triệt từ cung ngoài)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tptc = (p.tuChinhStars||[]).filter((s: any) => !p.stars?.includes(s)).map(starFmt).filter(Boolean);
    if (tptc.length) ctx += '  Tam phương tứ chính: ' + tptc.slice(0,12).join(', ') + '\n';
    if (p.cachCuc?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.cachCuc.forEach((c: any) => {
        const ten = c.ten || c;
        const mota = c.moTa ? ': ' + c.moTa : '';
        ctx += '  Cách cục — ' + ten + mota + '\n';
      });
    }
    // Ý nghĩa cung từ CACH_CUC_DATA matching (patterns Khốc Hư, Thiên Mã, v.v.)
    const ynItems: string[] = lasoData.cachCucTungCung?.[pName] || [];
    if (ynItems.length) {
      ctx += '  Ý nghĩa: ' + ynItems.slice(0, 6).join(' | ') + '\n';
    }
  }

  if (relevant.has('__daiVan__') && lasoData.daiVans?.length) {
    ctx += '\n=== ĐẠI VẬN ===\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lasoData.daiVans.slice(0, 9).forEach((dv: any, i: number) => {
      const dvP = palaces[dv.cungIdx] || {};
      const stars = (dvP.tuChinhStars||dvP.majorStars||[]).map(starName).filter(Boolean);
      ctx += 'ĐV' + (i+1) + ': ' + (dv.diaChi||'') + ' (' + dv.tuoiStart + '–' + dv.tuoiEnd + 't) cung=' + (dvP.cungName||'?');
      if (stars.length) ctx += ' sao=' + stars.join(',');
      if (dv.scoring?.tong != null) ctx += ' điểm=' + dv.scoring.tong + '/10';
      ctx += '\n';
    });
  }
  return ctx;
}

// ─── Agent tools ───────────────────────────────────────────────
const TOOLS_INSTRUCTION = (hasLaso: boolean) => `

CÔNG CỤ (tool) — DÙNG ĐÚNG LÚC, TUYỆT ĐỐI KHÔNG bịa số liệu thời gian:
${hasLaso ? '- Câu hỏi gắn với MỘT NĂM cụ thể (năm nay, năm sau, "bao giờ", một năm/tuổi nhất định) → GỌI tra_van_han để lấy điểm vận năm đó, tiểu hạn, lưu niên, sao cát/sát. Không tự đoán điểm/cung khi chưa gọi tool.\n' : ''}- Câu hỏi NGÀY TỐT để làm việc trọng đại (cưới hỏi, nhập trạch, khai trương, mua/bán nhà, khởi công, xuất hành...) trong một tháng → GỌI xem_ngay_tot.
Sau khi có kết quả tool, luận giải dứt khoát và neo vào đúng các con số tool trả về (điểm thấp/nhiều sát tinh phải cảnh báo rõ). Câu nào không cần tool thì trả lời thẳng.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTools(hasLaso: boolean): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = [];
  if (hasLaso) {
    tools.push({
      name: 'tra_van_han',
      description: 'Tra vận hạn (tiểu vận) của lá số đang xem cho MỘT NĂM dương lịch cụ thể: điểm vận năm (0–10), xu hướng lên/xuống, cung tiểu hạn, cung lưu niên đại hạn, số sao cát/sát. Dùng cho mọi câu hỏi gắn với một năm hoặc "bao giờ".',
      input_schema: {
        type: 'object',
        properties: { nam: { type: 'integer', description: 'Năm dương lịch cần tra, ví dụ 2027' } },
        required: ['nam'],
      },
    });
  }
  tools.push({
    name: 'xem_ngay_tot',
    description: 'Tìm các ngày tốt nhất trong một tháng để làm một việc trọng đại, chấm theo 12 trực · 28 tú · sao hoàng/hắc đạo · ngày kỵ cổ truyền.',
    input_schema: {
      type: 'object',
      properties: {
        viec: { type: 'string', enum: ACTIVITY_LIST as readonly string[], description: 'Loại việc: ' + (ACTIVITY_LIST as readonly string[]).map(k => `${k}=${ACTIVITY_META[k as ActivityKey]?.name || k}`).join(', ') },
        thang: { type: 'integer', description: 'Tháng 1–12' },
        nam: { type: 'integer', description: 'Năm dương lịch (2020–2036)' },
      },
      required: ['viec', 'thang', 'nam'],
    },
  });
  return tools;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function execTraVanHan(lasoData: any, input: any): string {
  const nam = Number(input?.nam);
  if (!nam) return 'Thiếu tham số năm.';
  const tvs = lasoData?.tieuVanScores;
  if (!Array.isArray(tvs) || !tvs.length) return 'Lá số này chưa có dữ liệu tiểu vận theo năm — hãy luận theo đại vận hiện tại trong dữ liệu lá số.';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tv = tvs.find((t: any) => Number(t.nam) === nam);
  if (!tv) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yrs = tvs.map((t: any) => Number(t.nam));
    return `Năm ${nam} ngoài phạm vi lá số (chỉ có ${Math.min(...yrs)}–${Math.max(...yrs)}).`;
  }
  const palaces = lasoData.palaces || [];
  const starsOf = (cungName: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = palaces.find((x: any) => x.cungName === cungName);
    if (!p) return '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const major = (p.majorStars || []).map((s: any) => s.ten).filter(Boolean).join(', ');
    return major || 'vô chính diệu';
  };
  const dir = tv.direction === 'up' ? 'xu hướng đi lên' : tv.direction === 'down' ? 'xu hướng đi xuống' : 'đi ngang';
  const dv = (lasoData.daiVans || [])[tv.dvIdx];
  let out = `TIỂU VẬN NĂM ${nam} (tuổi ${tv.tuoi}):\n`;
  out += `- Điểm vận năm: ${tv.mainScore}/10, ${dir} (${tv.catCount} sao cát, ${tv.satCount} sao sát trong tổ hợp 3 cung hạn).\n`;
  out += `- Tiểu hạn nhập cung ${tv.tieuHanCung} — chính tinh: ${starsOf(tv.tieuHanCung) || '?'}.\n`;
  out += `- Lưu niên đại hạn vào cung ${tv.luuNienCung} — chính tinh: ${starsOf(tv.luuNienCung) || '?'}.\n`;
  if (dv) out += `- Thuộc đại vận ${dv.diaChi} (${dv.tuoiStart}–${dv.tuoiEnd} tuổi)${dv.scoring?.tong != null ? `, điểm đại vận ${dv.scoring.tong}/10 ${dv.scoring.flag || ''}` : ''}.\n`;
  return out;
}

function execXemNgayTot(input: { viec?: string; thang?: number; nam?: number }): string {
  const key = String(input?.viec || '') as ActivityKey;
  const thang = Number(input?.thang), nam = Number(input?.nam);
  if (!(ACTIVITY_LIST as readonly string[]).includes(key)) return `Việc "${input?.viec}" không hỗ trợ. Các việc: ${(ACTIVITY_LIST as readonly string[]).join(', ')}.`;
  if (!(nam >= 2020 && nam <= 2036)) return `Năm ${nam} ngoài phạm vi (2020–2036).`;
  if (!(thang >= 1 && thang <= 12)) return `Tháng ${thang} không hợp lệ.`;
  const meta = ACTIVITY_META[key];
  const top = topDaysForActivity(computeMonth(nam, thang), key, 6);
  if (!top.length) return `Tháng ${thang}/${nam} không có ngày đạt điểm ≥6 để ${meta.name.toLowerCase()} — nên cân nhắc tháng khác.`;
  let out = `NGÀY TỐT để ${meta.name} — tháng ${thang}/${nam} (top ${top.length}):\n`;
  for (const { info, score } of top) {
    const gio = (info.gioHoangDao || []).map(g => g.chi).slice(0, 4).join(', ');
    out += `- ${info.duongLich.day}/${info.duongLich.month} (${info.thuTrongTuan}, ÂL ${info.amLich.day}/${info.amLich.month}), can chi ${info.canChiNgay}, trực ${info.truc}: ${score.score}/10 ${score.level}`;
    if (score.reasons?.length) out += ` — ${score.reasons.slice(0, 2).join('; ')}`;
    if (gio) out += ` — giờ tốt: ${gio}`;
    out += '\n';
  }
  return out;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callAnthropic(system: any, convo: any[], tools: any[], toolChoiceNone = false, maxTokens = 1500): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { model: 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages: convo };
  if (tools.length) {
    payload.tools = tools;
    if (toolChoiceNone) payload.tool_choice = { type: 'none' };
  }
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'prompt-caching-2024-07-31' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error('API error: ' + (await resp.text()).slice(0, 200));
  return resp.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textOf(content: any[]): string {
  return (content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChat(body: any): Promise<Response> {
  const { messages, lasoData, docs } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasLaso = !!(lasoData?.palaces?.length || lasoData?._lsA?.palaces?.length);

  // Ưu tiên NGUYÊN lá-số-text (giống luận giải, do client dựng bằng formatLaSoV2) nếu có;
  // không thì fallback context rút gọn theo từ khóa.
  const bodyLaSoText = (body as { laSoText?: string }).laSoText;
  const laSoText =
    (typeof lasoData?._laSoText === 'string' && lasoData._laSoText.length > 100) ? lasoData._laSoText :
    (typeof bodyLaSoText === 'string' && bodyLaSoText.length > 100) ? bodyLaSoText : '';
  const hasFullLaso = laSoText.length > 100;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let systemForCall: any;
  let maxTokens = 1500;
  if (hasFullLaso) {
    systemForCall = [
      { type: 'text', text: CHAT_RICH_RULES() + TOOLS_INSTRUCTION(true) },
      { type: 'text', text: '=== DỮ LIỆU LÁ SỐ (hệ thống tính sẵn) ===\n' + laSoText.slice(0, 32000), cache_control: { type: 'ephemeral' } },
    ];
    maxTokens = 2000;
  } else {
    systemForCall = (hasLaso
      ? CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ), docs)
      : CHAT_SYSTEM_GENERAL(docs)) + TOOLS_INSTRUCTION(hasLaso);
  }

  const tools = buildTools(hasLaso || hasFullLaso);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = messages.slice(-10).map((m: any) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const MAX_ROUNDS = 3;
  const toolsUsed: string[] = [];
  let finalText = '';
  const usage = { input_tokens: 0, output_tokens: 0, rounds: 0 };

  try {
    for (let round = 0; round <= MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS;
      const data = await callAnthropic(systemForCall, convo, tools, lastRound, maxTokens);
      const content = data.content || [];
      usage.input_tokens += data.usage?.input_tokens || 0;
      usage.output_tokens += data.usage?.output_tokens || 0;
      usage.rounds += 1;

      if (data.stop_reason === 'tool_use' && !lastRound) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolUses = content.filter((b: any) => b.type === 'tool_use');
        convo.push({ role: 'assistant', content });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = toolUses.map((tu: any) => {
          toolsUsed.push(tu.name);
          let resultText = '';
          try {
            if (tu.name === 'tra_van_han') resultText = execTraVanHan(lasoData, tu.input);
            else if (tu.name === 'xem_ngay_tot') resultText = execXemNgayTot(tu.input);
            else resultText = 'Công cụ không tồn tại.';
          } catch (e: unknown) { resultText = 'Lỗi chạy công cụ: ' + (e as Error).message; }
          return { type: 'tool_result', tool_use_id: tu.id, content: resultText };
        });
        convo.push({ role: 'user', content: results });
        continue;
      }

      finalText = textOf(content);
      break;
    }
  } catch (e: unknown) {
    return err((e as Error).message);
  }

  return ok({ answer: finalText || 'Xin lỗi, có lỗi xảy ra.', scenario: hasLaso ? 'laso' : 'general', toolsUsed, usage });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChatStream(body: any): Promise<Response> {
  const { messages, lasoData, docs } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const lastQ = messages[messages.length - 1]?.content || '';
  const hasLaso = !!(lasoData?.palaces?.length || lasoData?._lsA?.palaces?.length);

  const bodyLaSoText = (body as { laSoText?: string }).laSoText;
  const laSoText =
    (typeof lasoData?._laSoText === 'string' && lasoData._laSoText.length > 100) ? lasoData._laSoText :
    (typeof bodyLaSoText === 'string' && bodyLaSoText.length > 100) ? bodyLaSoText : '';
  const hasFullLaso = laSoText.length > 100;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let systemForCall: any;
  let maxTokens = 1500;
  if (hasFullLaso) {
    systemForCall = [
      { type: 'text', text: CHAT_RICH_RULES() + TOOLS_INSTRUCTION(true) },
      { type: 'text', text: '=== DỮ LIỆU LÁ SỐ (hệ thống tính sẵn) ===\n' + laSoText.slice(0, 32000), cache_control: { type: 'ephemeral' } },
    ];
    maxTokens = 2000;
  } else {
    systemForCall = (hasLaso
      ? CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ), docs)
      : CHAT_SYSTEM_GENERAL(docs)) + TOOLS_INSTRUCTION(hasLaso);
  }

  const tools = buildTools(hasLaso || hasFullLaso);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = messages.slice(-10).map((m: any) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  function send(obj: object) {
    writer.write(enc.encode('data: ' + JSON.stringify(obj) + '\n\n'));
  }

  (async () => {
    const MAX_ROUNDS = 3;
    const toolsUsed: string[] = [];

    try {
      for (let round = 0; round <= MAX_ROUNDS; round++) {
        const lastRound = round === MAX_ROUNDS;

        if (lastRound) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const payload: any = {
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            stream: true,
            system: systemForCall,
            messages: convo,
          };
          if (tools.length) {
            payload.tools = tools;
            payload.tool_choice = { type: 'none' };
          }
          const resp = await fetch(ANTHROPIC_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'prompt-caching-2024-07-31',
            },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            send({ type: 'error', message: 'API error: ' + (await resp.text()).slice(0, 200) });
            break;
          }
          const streamReader = resp.body!.getReader();
          const dec = new TextDecoder();
          let buf = '';
          while (true) {
            const { done, value } = await streamReader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const json = line.slice(6).trim();
              if (json === '[DONE]') continue;
              try {
                const evt = JSON.parse(json);
                if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                  send({ type: 'text', text: evt.delta.text });
                }
              } catch { /* ignore */ }
            }
          }
          break;
        }

        const data = await callAnthropic(systemForCall, convo, tools, false, maxTokens);
        const content = data.content || [];

        if (data.stop_reason === 'tool_use') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolUses = content.filter((b: any) => b.type === 'tool_use');
          convo.push({ role: 'assistant', content });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const results = toolUses.map((tu: any) => {
            toolsUsed.push(tu.name);
            const label = tu.name === 'tra_van_han' ? 'Đang tra vận hạn...' : 'Đang xem ngày tốt...';
            send({ type: 'tool', name: tu.name, label });
            let resultText = '';
            try {
              if (tu.name === 'tra_van_han') resultText = execTraVanHan(lasoData, tu.input);
              else if (tu.name === 'xem_ngay_tot') resultText = execXemNgayTot(tu.input);
              else resultText = 'Công cụ không tồn tại.';
            } catch (e: unknown) { resultText = 'Lỗi chạy công cụ: ' + (e as Error).message; }
            return { type: 'tool_result', tool_use_id: tu.id, content: resultText };
          });
          convo.push({ role: 'user', content: results });
          continue;
        }

        // Model answered without tools — emit the text we already have
        const text = textOf(content);
        if (text) send({ type: 'text', text });
        break;
      }
    } catch (e: unknown) {
      send({ type: 'error', message: (e as Error).message });
    }

    send({ type: 'done', toolsUsed });
    writer.close();
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      ...CORS_HEADERS,
    },
  });
}

// ─── Prompt builder ────────────────────────────────────────────
function buildPrompt(phan: number, laSoText: string, docs?: string): string {
  function trimLaSo(text: string, phan: number): string {
    if (!text) return text;
    const lines = text.split('\n');
    const dvIdx   = lines.findIndex(l => l.includes('=== 9 ĐẠI VẬN ==='));
    const ccIdx   = lines.findIndex(l => l.includes('=== CÁCH CỤC & NHẬN ĐỊNH'));
    const cungIdx = lines.findIndex(l => l.includes('=== 12 CUNG ==='));
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
        const block = endI > 0 ? cungLines.slice(startI, endI) : cungLines.slice(startI, startI + 30);
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

  const trimmedLaSo = trimLaSo(laSoText, phan);
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';
  const ctx = '=== LÁ SỐ ===\n' + trimmedLaSo + docsSection;

  if (phan === 1) return ctx + `

PHẦN 1 — TỔNG QUAN LÁ SỐ (220-280 từ)
Viết văn xuôi liền mạch, không dùng bullet, không đề cập đại vận trong phần này.
MỞ ĐẦU bằng câu phán quyết in đậm neo vào "Tổng quan toàn lá số: X/10" — lá số này thuộc hạng nào (mạnh/khá/trung bình/yếu), mạnh nhất ở đâu, yếu nhất ở đâu.

Cấu trúc gợi ý (không cần tiêu đề con):
① Bản mệnh & cục: Can chi năm sinh, nạp âm, cục — ý nghĩa thực tế với con người này là gì? Mệnh có thuận lý hay nghịch lý với cục?
② Cung Mệnh: Chính tinh, cách cục nổi bật — khí chất và điểm mạnh/yếu cốt lõi. Xét vị trí Tràng Sinh và vòng Lộc Tồn nếu có.
③ Nhóm Thái Tuế tại Mệnh vs Thân: Hai nhóm phản ánh hai chiều con người — bên trong và bên ngoài xã hội.
④ Một nhận định tổng: Điểm đặc biệt nhất của lá số này là gì?

Lưu ý: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] đã có — diễn giải, không liệt kê lại.`;

  if (phan === 2) return ctx + `

PHẦN 2 — CUNG MỆNH (220-280 từ)
${CUNG_DESC['Mệnh']}

MỞ ĐẦU bằng câu phán quyết in đậm neo vào dòng điểm cung Mệnh trong === ĐIỂM ĐÁNH GIÁ === (tốt/khá/trung bình/yếu + lý do một dòng).
Viết văn xuôi súc tích, đi thẳng vào tính cách và số phận:
① Chính tinh tại Mệnh: Bản chất cốt lõi — người này là kiểu người gì? Miếu/Hãm ảnh hưởng thế nào?
② Cách cục Mệnh: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] — đây là điểm sống còn của lá số, diễn giải thật rõ tác động thực tế.
③ Sao phụ nổi bật: Chỉ đề cập sao phụ thực sự ảnh hưởng (Văn Xương/Khúc, Tả/Hữu, Kình/Đà, Hỏa/Linh...).
④ Điểm mạnh và điểm cần cảnh giác trong con người và cuộc đời.

Xét thêm cung Thiên Di (xung chiếu Mệnh) — ảnh hưởng gì đến tính cách bên ngoài?`;

  if (phan >= 3 && phan <= 13) {
    const cung = CUNG_BY_PHAN[phan] || '';
    const cungDesc = CUNG_DESC[cung] || '';
    return ctx + `

PHẦN ${phan} — CUNG ${cung.toUpperCase()} (120-160 từ)
${cungDesc}

MỞ ĐẦU bằng câu phán quyết in đậm neo vào dòng "[${cung}] Tổng .../10" trong === ĐIỂM ĐÁNH GIÁ === (tốt/khá/trung bình/yếu + lý do ngắn). Cấm né tránh.
Viết 2-3 đoạn văn xuôi súc tích. Cấu trúc:
① Nhận định chính: Dựa trên [CÁCH CỤC] và [Ý NGHĨA] — đây là phần quan trọng nhất, diễn giải thật rõ.
② Tam phương: Xét sao ở cung tam hợp có hỗ trợ hay phá cách không?
③ Kết luận thực tế: 1-2 câu về tác động cụ thể trong cuộc đời người này.

Không liệt kê lại tên sao, không mô tả lại dữ liệu thô. Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận.`;
  }

  if (phan === 14) return ctx + `

PHẦN 14 — TỔNG QUAN CÁC ĐẠI VẬN

Dựa vào phần === 9 ĐẠI VẬN ===, tính điểm scoring cho TẤT CẢ 9 đại vận:
- TT (Thiên Thời) 0-5 | ĐL (Địa Lợi) 0-1 | NH (Nhân Hòa) 0-4
- Công thức: Tổng = NH + (NH/4)×ĐL + (NH/4)×TT (max 10)

Bảng tổng hợp ĐV1 đến ĐV9:
| ĐV | Tuổi | Cung | TT | ĐL | NH | Tổng | Flag |

JSON chart (BẮT BUỘC, đủ 9 điểm):
\`\`\`chartdata
{"labels":["ĐV1 x-y","ĐV2 x-y","ĐV3 x-y","ĐV4 x-y","ĐV5 x-y","ĐV6 x-y","ĐV7 x-y","ĐV8 x-y","ĐV9 x-y"],"scores":[s1,s2,s3,s4,s5,s6,s7,s8,s9]}
\`\`\`

Nhận xét tổng (120-160 từ): Giai đoạn đẹp nhất, khó khăn nhất, xu hướng tổng thể của cuộc đời theo vận trình. Nếu người đang trong đại vận nào thì nhận xét thêm về giai đoạn hiện tại.`;

  if (phan >= 15 && phan <= 23) {
    const dvNum = phan - 14;
    return ctx + `

PHẦN ${phan} — ĐẠI VẬN ${dvNum} (120-160 từ)
Tìm dòng "ĐV${dvNum}:" trong === 9 ĐẠI VẬN ===.

MỞ ĐẦU bằng câu phán quyết in đậm neo vào dòng "Scoring: ... Tổng=X" của đại vận này — giai đoạn này thuận hay nghịch, X/10. Nếu Tổng thấp phải nói thẳng là giai đoạn khó.
Viết văn xuôi, 2-3 đoạn:
① Tính chất vận: Điểm scoring nói lên điều gì về giai đoạn này?
② Nhận định chính: Dựa trên [LUẬN ĐOÁN] và [CẢNH BÁO] — diễn giải thực tế, không liệt kê lại.
③ Tam phương: Sao ở cung tam hợp của cung đại vận có hỗ trợ hay phá không?
④ Kết luận thực tế: 1-2 câu tác động cụ thể + gợi ý nhẹ nếu cần.`;
  }

  if (phan === 24) return ctx + `

PHẦN 24 — TIỂU VẬN & NĂM XEM (180-220 từ)
Quan sát 3 lớp hạn cùng lúc: gốc đại vận (10 năm) + tiểu hạn năm đó + lưu niên đại vận.
Dữ liệu có sẵn: Tiểu hạn (cung + sao), Lưu đại hạn (cung + sao), Đại vận hiện tại.

MỞ ĐẦU bằng câu phán quyết in đậm: năm xem này thuận hay nghịch, nên tiến hay nên thủ — kết luận dứt khoát rồi mới giải thích.
Viết văn xuôi, đi thẳng vào thực tế:
① Tổng hợp 3 lớp hạn: Đếm sao tốt/xấu trong cả 3 cung — xu hướng chung là thuận hay nghịch?
② Quan hệ với Mệnh: Cung tiểu hạn sinh hay khắc Mệnh? Sao nhập hạn hợp hay đối lập bản mệnh?
③ Đại hạn vs tiểu hạn: Đại hạn tốt thì tiểu hạn xấu cũng đỡ nặng; đại hạn xấu thì tiểu hạn tốt cũng bị giảm.
④ Cơ hội và rủi ro: 1-2 điểm thuận + 1-2 điểm cần cẩn thận cụ thể.
⑤ Lời khuyên ngắn cho năm này.

Lưu ý khi nhận định:
- Mệnh sinh cung hạn → hao tổn, dễ gặp vấn đề.
- Mệnh khắc cung hạn → căng thẳng, nguy hiểm.
- Có sao tốt hoặc Tuần/Triệt → giảm xấu (nhưng cũng giảm tốt).
- Sát/Bại tinh mạnh → phải cảnh báo rõ.

Không giải thích lý thuyết. Đi thẳng vào tác động với người này.`;

  return ctx + `\nPhần ${phan}: Luận giải theo lá số.`;
}

// ─── Route handlers ───────────────────────────────────────────
export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = await parseBody(request);

  if (action === 'chat') return body.stream ? handleChatStream(body) : handleChat(body);

  const { laSoText, phan, docs } = body as { laSoText?: string; phan?: number; docs?: string };
  if (!laSoText || !phan) return err('Thiếu dữ liệu', 400);

  let prompt: string;
  try { prompt = buildPrompt(Number(phan), laSoText, docs); }
  catch (e: unknown) { return err('buildPrompt error: ' + (e as Error).message); }

  try {
    const model = 'claude-sonnet-4-6';
    const maxTok = phan === 1 ? 2000 : phan === 14 ? 3000 : phan === 24 ? 1400
      : (phan >= 2 && phan <= 13) ? 1100 : (phan >= 15 && phan <= 23) ? 1100 : 1000;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model, max_tokens: maxTok,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }] }],
      }),
    });

    if (!resp.ok) return err('API error: ' + (await resp.text()).slice(0, 200));
    const data = await resp.json();
    if (data.error) return err(data.error.message);

    const text: string = data.content?.[0]?.text || '';
    let chartData = null;
    const chartMatch = text.match(/```chartdata\s*([\s\S]*?)```/);
    if (chartMatch) { try { chartData = JSON.parse(chartMatch[1].trim()); } catch { /* ignore */ } }
    const luanGiai = text.replace(/```chartdata[\s\S]*?```/, '').trim();
    return ok({ luanGiai, chartData, phan });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
