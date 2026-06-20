// lib/agent/prompts.ts
// ============================================================
// LÕI PROMPT + CONTEXT cho chat luận giải — trích nguyên từ
// app/api/lasotuvi/route.ts (KHÔNG đổi hành vi). Một bộ não:
// sửa văn phong / luật luận / context CHỈ Ở ĐÂY, mọi cổng ăn theo.
//
// buildChatContext(body) → { systemForCall, tools, maxTokens,
// lasoDataForTools } : nhận body (toolType + dữ liệu) trả về system
// prompt + tool defs phù hợp từng kịch bản (lá số / tương hợp /
// tử bình / sinh con / chọn ngày / đặt tên / general).
//
// Tool dùng chung từ lib/agent/tools.ts. Xem docs/KIEN-TRUC-VA-LO-TRINH.md.
// ============================================================

import { buildTools, TOOLS_INSTRUCTION } from "@/lib/agent/tools";

interface ChatContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  systemForCall: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: any[];
  maxTokens: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lasoDataForTools: any; // for execTraVanHan — null for non-laso tools
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildChatContext(body: any): ChatContext {
  const toolType    = body.toolType || 'laso';
  const docs        = body.docs as string | undefined;
  const authorName  = (body.authorName  as string | undefined) || '';
  const authorStyle = (body.authorStyle as string | undefined) || '';
  const persona     = authorName && authorStyle
    ? `Phong cách: Bạn đang thể hiện phong cách của ${authorName} — ${authorStyle}`
    : '';

  if (toolType === 'xem-tuoi' || toolType === 'xem-lam-an') {
    return {
      systemForCall:    CHAT_SYSTEM_COMPAT(extractCompatContext(body.compatData, toolType), toolType, docs, persona),
      tools:            buildTools(false),
      maxTokens:        1500,
      lasoDataForTools: null,
    };
  }

  if (toolType === 'tu-binh') {
    return {
      systemForCall:    CHAT_SYSTEM_TU_BINH(extractTuBinhContext(body.tuBinhData), docs, persona),
      tools:            buildTools(false),
      maxTokens:        1500,
      lasoDataForTools: null,
    };
  }

  if (toolType === 'xem-tuoi-sinh-con') {
    return {
      systemForCall:    CHAT_SYSTEM_SINH_CON(extractSinhConContext(body.sinhConData), docs, persona),
      tools:            buildTools(false),
      maxTokens:        1500,
      lasoDataForTools: null,
    };
  }

  if (toolType === 'chon-ngay-tot') {
    return {
      systemForCall:    CHAT_SYSTEM_CHON_NGAY(extractChonNgayContext(body.chonNgayData), docs, persona),
      tools:            buildTools(false),
      maxTokens:        1500,
      lasoDataForTools: null,
    };
  }

  if (toolType === 'dat-ten-con') {
    return {
      systemForCall:    CHAT_SYSTEM_DAT_TEN(extractDatTenContext(body.datTenData), docs, persona),
      tools:            buildTools(false),
      maxTokens:        1500,
      lasoDataForTools: null,
    };
  }

  // Default: laso / general
  const messages  = body.messages as { role: string; content: string }[] | undefined;
  const lasoData  = body.lasoData;
  const lastQ     = messages?.[messages.length - 1]?.content || '';
  const hasLaso   = !!(lasoData?.palaces?.length);

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
      { type: 'text', text: CHAT_RICH_RULES(persona) + TOOLS_INSTRUCTION(true) },
      { type: 'text', text: '=== DỮ LIỆU LÁ SỐ (hệ thống tính sẵn) ===\n' + laSoText.slice(0, 32000), cache_control: { type: 'ephemeral' } },
    ];
    maxTokens = 2000;
  } else {
    systemForCall = (hasLaso
      ? CHAT_SYSTEM_LASO(extractLasoContext(lasoData, lastQ), docs, persona)
      : CHAT_SYSTEM_GENERAL(docs, persona)) + TOOLS_INSTRUCTION(hasLaso);
  }

  return {
    systemForCall,
    tools:            buildTools(hasLaso || hasFullLaso),
    maxTokens,
    lasoDataForTools: lasoData,
  };
}

// ─── Chat handler ──────────────────────────────────────────────
const CHAT_SYSTEM_LASO = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

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

const CHAT_SYSTEM_GENERAL = (docs?: string, persona?: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}. Khi user hỏi "năm nay là năm mấy", "hôm nay là ngày mấy", hoặc tương tự — trả lời thẳng dựa vào thông tin này, KHÔNG nói "tôi không biết ngày hiện tại".

Nguyên tắc:
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- 200-400 từ cho câu thông thường, tối đa 600 từ cho câu phức tạp
- Dẫn chiếu nguyên lý cổ pháp, nêu ví dụ sao tinh cụ thể khi minh họa
- Không hứa hẹn tuyệt đối, không tiết lộ trường phái${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_COMPAT = (ctx: string, toolType: string, docs?: string, persona?: string) => `Bạn là chuyên gia phân tích tương hợp Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nhiệm vụ: Phân tích ${toolType === 'xem-lam-an' ? 'tương hợp hợp tác kinh doanh — tập trung Quan Lộc, Tài Bạch, điểm bổ trợ và xung khắc' : 'tương hợp tình duyên hôn nhân — tập trung Mệnh, Phu Thê, can chi, ngũ hành giữa hai người'}.

Nguyên tắc trả lời:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- 200-400 từ cho câu thông thường, tối đa 600 từ cho câu phức tạp
- Dẫn chứng cụ thể từ hai lá số: sao nào, cung nào, can chi gì
- Nói thẳng: hợp hay kỵ, điểm mạnh yếu cụ thể — cấm tâng bốc, cấm nước đôi né tránh
- Riêng dự đoán tương lai mới dùng ngôn ngữ xác suất

=== DỮ LIỆU HAI LÁ SỐ ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_SINH_CON = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia địa chi học, tư vấn tuổi sinh con theo cổ pháp Việt Nam.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN: Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Giải thích rõ quan hệ địa chi: Lục Hợp, Tam Hợp, Lục Xung, Tam Hình
- Nói thẳng năm nào tốt, năm nào kỵ và lý do cụ thể
- Không phán quyết tuyệt đối về tương lai, chỉ phân tích quan hệ địa chi

=== DỮ LIỆU TUỔI BỐ MẸ ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_CHON_NGAY = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia chọn ngày tốt theo Tử Vi Đẩu Số và cổ pháp, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN: Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Trả lời dựa trên kết quả phân tích ban đầu đã cung cấp
- Giải thích cụ thể: ngày nào tốt/kỵ và tại sao theo can chi, ngũ hành, tuổi người
- Nói thẳng, có ngày tốt thì nói rõ, không có thì cảnh báo

=== DỮ LIỆU PHÂN TÍCH NGÀY TỐT ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_DAT_TEN = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia đặt tên theo ngũ hành và cổ học Việt Nam, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN: Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Khi đặt thêm tên: đề xuất đủ 5 tên, giải thích ý nghĩa chữ từng tên
- Phân tích ngũ hành chữ trong tên hài hòa với bố mẹ và năm sinh con
- Không dùng tên quá cũ kỹ hoặc khó đọc

=== DỮ LIỆU ĐẶT TÊN CON ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_TU_BINH = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia Tử Bình Bát Tự (Tứ Trụ) theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nguyên tắc trả lời:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- 200-400 từ cho câu thông thường, tối đa 600 từ cho câu phức tạp
- Dẫn chứng cụ thể từ Tứ Trụ: Nhật Can, Dụng Thần, Cách Cục, Ngũ Hành
- Nói thẳng mạnh/yếu — cấm tâng bốc, cấm nước đôi né tránh
- Câu hỏi về ngày tốt → gọi tool xem_ngay_tot; không tự bịa số liệu vận hạn

=== DỮ LIỆU BÁT TỰ TỨ TRỤ ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

// Prompt dày cho chat khi có NGUYÊN lá-số-text (giống luận giải) — chống thảo mai, neo điểm
const CHAT_RICH_RULES = (persona?: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN (server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}. Khi user hỏi "năm nay/hôm nay là năm/ngày mấy" — trả lời thẳng theo đây.

Bạn được cấp NGUYÊN LÁ SỐ ở phần dưới: đủ 12 cung (chính tinh, phụ tinh, cách cục đặc biệt, patterns, điểm 6 chiều từng cung, tam phương tứ chính), 9 đại vận có scoring, điểm tổng toàn lá số. Đây là dữ liệu hệ thống đã tính sẵn — BẮT BUỘC bám sát, không tự bịa.

XÁC ĐỊNH PHẠM VI (câu hỏi của user thường NGẮN/MƠ HỒ — bạn PHẢI tự khoanh vùng cung, không được trả lời hời hợt):
- Map lĩnh vực → cung cần đọc: công việc/sự nghiệp/thăng tiến/làm sếp → Quan Lộc + Mệnh; tiền bạc/đầu tư/làm giàu → Tài Bạch + Phúc Đức; tình duyên/hôn nhân/vợ chồng → Phu Thê + Mệnh; con cái → Tử Tức; sức khỏe/bệnh → Tật Ách; nhà đất/bất động sản → Điền Trạch; tính cách/vận mệnh/tổng quan → Mệnh + Thân; cha mẹ/gia đạo → Phụ Mẫu + Phúc Đức; bạn bè/cấp dưới/quý nhân → Nô Bộc; đi xa/định cư/nước ngoài → Thiên Di; anh em → Huynh Đệ.
- Câu hỏi gắn với MỘT NĂM cụ thể ("năm nay/năm sau", "bao giờ", "năm X tuổi") → GỌI tra_tieu_van. Câu hỏi về HẠN THÁNG / nguyệt hạn ("tháng X/YYYY thế nào") → GỌI tra_nguyet_van. Câu hỏi về HẠN NGÀY / nhật hạn ("ngày X tháng Y") → GỌI tra_nhat_van. Ngày tốt làm việc lớn → GỌI xem_ngay_tot.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCompatContext(compatData: any, toolType: string): string {
  if (!compatData) return '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function fmtLs(ls: any, name: string): string {
    if (!ls?.palaces) return `${name}: Chưa có dữ liệu\n`;
    const palaces = ls.palaces || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menh    = palaces.find((p: any) => p.isMenh);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phuThe  = palaces.find((p: any) => p.cungName === 'Phu Thê');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quanLoc = palaces.find((p: any) => p.cungName === 'Quan Lộc');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taiBach = palaces.find((p: any) => p.cungName === 'Tài Bạch');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const starNames = (arr: any[]) => (arr || []).map((s: any) => (s.ten || '')).filter(Boolean).join(', ') || 'Vô chính diệu';

    let ctx = `--- ${name} (${ls.canChiNam || '?'}) ---\n`;
    ctx += `Can Chi: ${ls.canChiNam || ''}, Nạp Âm: ${ls.napAm || ''}, Bản Mệnh: ${ls.menhDC || ''}\n`;
    if (menh)    ctx += `Cung Mệnh (${menh.diaChi}): ${starNames(menh.majorStars)}\n`;
    if (toolType === 'xem-lam-an') {
      if (quanLoc) ctx += `Quan Lộc (${quanLoc.diaChi}): ${starNames(quanLoc.majorStars)}\n`;
      if (taiBach) ctx += `Tài Bạch (${taiBach.diaChi}): ${starNames(taiBach.majorStars)}\n`;
    } else {
      if (phuThe) ctx += `Phu Thê (${phuThe.diaChi}): ${starNames(phuThe.majorStars)}\n`;
    }
    const dvHT = ls.daiVanHienTai;
    if (dvHT) {
      ctx += `Đại Vận: ${dvHT.diaChi} (${dvHT.tuoiStart}–${dvHT.tuoiEnd}t)`;
      if (dvHT.scoring?.tong != null) ctx += ` — Điểm: ${dvHT.scoring.tong}/10`;
      ctx += '\n';
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = (ls.cachCuc || []).map((c: any) => (typeof c === 'object' ? c.ten : c)).filter(Boolean);
    if (cc.length) ctx += `Cách cục: ${cc.join(', ')}\n`;
    return ctx;
  }
  const { lsA, lsB, nameA, nameB } = compatData;
  return fmtLs(lsA, nameA || 'Người A') + '\n' + fmtLs(lsB, nameB || 'Người B');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTuBinhContext(tuBinhData: any): string {
  if (!tuBinhData) return '';
  let ctx = '';
  const tt = tuBinhData.tuTru;
  if (tt) {
    ctx += 'Tứ Trụ:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fmtTru = (t: any) => t ? `${t.can || ''}${t.chi || ''} (${t.hanh || ''})` : '?';
    ctx += `  Năm:   ${fmtTru(tt.nam)}\n`;
    ctx += `  Tháng: ${fmtTru(tt.thang)}\n`;
    ctx += `  Ngày:  ${fmtTru(tt.ngay)}\n`;
    ctx += `  Giờ:   ${fmtTru(tt.gio)}\n`;
  }
  if (tuBinhData.nhatCan)   ctx += `Nhật Can: ${tuBinhData.nhatCan} (${tuBinhData.nhatCanHanh || ''})\n`;
  if (tuBinhData.cuongNhuoc) ctx += `Cường/Nhược: ${tuBinhData.cuongNhuoc}\n`;
  if (tuBinhData.dungThan)  ctx += `Dụng Thần: ${tuBinhData.dungThan}\n`;
  if (tuBinhData.cachCuc)   ctx += `Cách Cục: ${tuBinhData.cachCuc}\n`;
  const nh = tuBinhData.nguHanh;
  if (nh) {
    const parts = ['Mộc','Hỏa','Thổ','Kim','Thủy'].map(k => nh[k] != null ? `${k}:${nh[k]}` : null).filter(Boolean);
    if (parts.length) ctx += `Ngũ Hành: ${parts.join(', ')}\n`;
  }
  const dvHT = tuBinhData.daiVanHienTai;
  if (dvHT) {
    ctx += `Đại Vận hiện tại: ${dvHT.can || ''}${dvHT.chi || ''} (${dvHT.tuoiStart ?? '?'}–${dvHT.tuoiEnd ?? '?'}t)\n`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thanSat = tuBinhData.thanSat;
  if (thanSat && typeof thanSat === 'object') {
    const parts = (Object.entries(thanSat) as [string, unknown][]).slice(0, 8).map(([k, v]) => `${k}:${v}`);
    if (parts.length) ctx += `Thần Sát: ${parts.join(', ')}\n`;
  }
  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSinhConContext(data: any): string {
  if (!data) return '';
  const d = data.sinhConData || data;
  let ctx = '';
  if (d.bo) ctx += `Bố: ${d.bo.canChi} (${d.bo.napAm})\n`;
  if (d.me) ctx += `Mẹ: ${d.me.canChi} (${d.me.napAm})\n`;
  if (Array.isArray(d.rows) && d.rows.length) {
    ctx += '\nBảng 15 năm tới:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d.rows.forEach((r: any) => {
      const ratingLabel = r.score >= 5 ? 'Rất Thuận' : r.score >= 2 ? 'Thuận' : r.score >= 0 ? 'Bình Thường' : 'Cần Lưu Ý';
      ctx += `  ${r.year} — ${r.canChi} (${r.hanh}): ${ratingLabel} [điểm ${r.score}]${r.reasons?.length ? ' — ' + r.reasons.join(', ') : ''}\n`;
    });
  }
  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractChonNgayContext(data: any): string {
  if (!data) return '';
  const d = data.chonNgayData || data;
  let ctx = '';
  if (d.suKien)      ctx += `Sự kiện: ${d.suKien}\n`;
  if (d.hoTen)       ctx += `Người xem: ${d.hoTen}\n`;
  if (d.canChi)      ctx += `Tuổi: ${d.canChi} (${d.napAm || ''})\n`;
  if (d.thangNum && d.namNum) ctx += `Tháng xem: ${d.thangNum}/${d.namNum} — Can chi: ${d.thangCanChi || ''}, năm ${d.namCanChi || ''}\n`;
  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDatTenContext(data: any): string {
  if (!data) return '';
  const d = data.datTenData || data;
  let ctx = '';
  if (d.ho)        ctx += `Họ: ${d.ho}\n`;
  if (d.gioiTinh)  ctx += `Giới tính: ${d.gioiTinh === 'nu' ? 'Nữ' : 'Nam'}\n`;
  if (d.canChiCon) ctx += `Năm sinh bé: ${d.canChiCon} (${d.napAmCon || ''})\n`;
  if (d.canChiBo)  ctx += `Bố: ${d.canChiBo} (${d.napAmBo || ''})\n`;
  if (d.canChiMe)  ctx += `Mẹ: ${d.canChiMe} (${d.napAmMe || ''})\n`;
  return ctx;
}
