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
import { LASO_AUTHORITY_RULE } from "@/lib/engine/laso";
import { currentNamXem } from "@/lib/engine/namxem";
import { matchVanHanCombos, formatComboLines, type LayerCung } from "@/lib/agent/vanHanCombos";

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

  if (toolType === 'xem-tuoi' || toolType === 'xem-lam-an' || toolType === 'tuong-hop') {
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

  if (toolType === 'dat-ten-dn') {
    return {
      systemForCall:    CHAT_SYSTEM_DAT_TEN_DN(extractDatTenDnContext(body.datTenDnData), docs, persona),
      tools:            buildTools(false),
      maxTokens:        1500,
      lasoDataForTools: null,
    };
  }

  // ── Batch 2: Mệnh Lý / Huyền Học (nhẹ, deterministic seed + rail luận) ──
  if (toolType === 'nap-am') {
    return { systemForCall: CHAT_SYSTEM_NAP_AM(extractGenericContext(body.napAmData), docs, persona), tools: buildTools(false), maxTokens: 1500, lasoDataForTools: null };
  }
  if (toolType === 'kim-lau') {
    return { systemForCall: CHAT_SYSTEM_KIM_LAU(extractKimLauContext(body.kimLauData), docs, persona), tools: buildTools(false), maxTokens: 1500, lasoDataForTools: null };
  }
  if (toolType === 'ngu-hanh-ten') {
    return { systemForCall: CHAT_SYSTEM_NGU_HANH_TEN(extractGenericContext(body.nguHanhTenData), docs, persona), tools: buildTools(false), maxTokens: 1500, lasoDataForTools: null };
  }
  if (toolType === 'than-so-hoc') {
    return { systemForCall: CHAT_SYSTEM_THAN_SO(extractGenericContext(body.thanSoData), docs, persona), tools: buildTools(false), maxTokens: 1500, lasoDataForTools: null };
  }
  if (toolType === 'bat-trach') {
    return { systemForCall: CHAT_SYSTEM_BAT_TRACH(extractGenericContext(body.batTrachData), docs, persona), tools: buildTools(false), maxTokens: 1500, lasoDataForTools: null };
  }
  if (toolType === 'kinh-dich') {
    return { systemForCall: CHAT_SYSTEM_KINH_DICH(extractKinhDichContext(body.kinhDichData), docs, persona), tools: buildTools(false), maxTokens: 1500, lasoDataForTools: null };
  }

  if (toolType === 'xem-tuong') {
    return {
      systemForCall:    CHAT_SYSTEM_XEM_TUONG(docs, persona),
      tools:            buildTools(false),
      maxTokens:        1500,
      lasoDataForTools: null,
    };
  }

  if (toolType === 'phong-thuy') {
    return {
      systemForCall:    CHAT_SYSTEM_PHONG_THUY(docs, persona),
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
export const CHAT_SYSTEM_LASO = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}. Khi user hỏi "năm nay là năm mấy", "hôm nay là ngày mấy", hoặc tương tự — trả lời thẳng dựa vào thông tin này, KHÔNG nói "tôi không biết ngày hiện tại".

Nguyên tắc trả lời (đây là CHAT, không phải bài luận — ngắn gọn, có nhịp):
- Tiếng Việt chuẩn mực, không dùng bullet, không dùng emoji
- ĐỘ DÀI: mặc định 130–200 từ, câu phức tạp tối đa 280, lượt follow-up 80–140
- HÌNH DẠNG 3 lớp: (1) MỘT câu phán quyết in đậm (**...**) neo vào CẤU TRÚC THẬT của cung liên quan — chính tinh tọa cung (miếu/vượng/đắc/hãm), cách cục đặc biệt, mức cát/sát — nói thẳng tốt/xấu mạnh/yếu (TUYỆT ĐỐI không bịa "điểm cung X/10"); (2) một mạch dẫn chứng cốt lõi — sao/cách cục NẶNG KÝ NHẤT cho câu hỏi kèm 1 điểm mạnh và 1 điểm yếu cụ thể, KHÔNG liệt kê dàn trải; (3) MỞ NÚT: nêu đích danh MỘT chi tiết CÓ THẬT trong lá số chưa luận, mời mở ra bằng ĐÚNG 1 câu hỏi (cấm mời chung chung "còn hỏi gì không")
- Dẫn chứng sao tinh, cung vị, can chi cụ thể từ lá số bên dưới; xét tam phương tứ chính, không đoán đơn sao
- CÁCH HÓA GIẢI là MODIFIER: cung có "Triệt Đáo Kim Cung"/"Tuần Lâm Hỏa Địa"/Tuần-Triệt án ngữ thì PHẢI đối chiếu khi nêu điểm yếu — cách này hóa giải sát khí, giảm tính xấu sát tinh; CẤM nêu sát tinh (Kình Đà Không Kiếp, Bạch Hổ, Phi Liêm...) như điểm yếu nguyên vẹn nếu cung đang được hóa giải
- TÁCH BẠCH cung vs đại vận: hỏi BẢN CHẤT một cung (nhà đất, tiền bạc, hôn nhân... nói chung) → CHỈ luận theo sao + cách cục của CHÍNH cung đó; KHÔNG kéo "đại vận đi qua cung này" vào, KHÔNG lấy điểm đại vận chấm tốt/xấu cho cung (đại vận chỉ mượn cung đứng, không đổi cách cục cung). Điểm đại vận chỉ dùng khi hỏi về THỜI GIAN/vận hạn
- Cấm tâng bốc, cấm nước đôi né tránh; có điểm mạnh phải kèm điểm yếu cụ thể
- Riêng kết quả tương lai mới dùng ngôn ngữ xác suất, không hứa hẹn tuyệt đối
- VẬN HẠN — đại vận GIỚI HẠN BIÊN ĐỘ, KHÔNG áp theme: CHỈ đại vận có điểm/10 thật. TIỂU vận (năm), NGUYỆT vận, NHẬT vận KHÔNG có điểm — luận theo CÁCH CỤC + sao của CHÍNH cung hạn, giữ ĐÚNG tốt/xấu của nó (cung hạn có cát tinh/cách tốt → vận TỐT dù đại vận xấu; có sát tinh/cách xấu → vận XẤU dù đại vận tốt). Điểm đại vận chỉ chỉnh BIÊN ĐỘ: đại vận thấp thì cái tốt vẫn tốt nhưng bị kìm, không rực rỡ (cái xấu nặng thêm); đại vận cao thì cái tốt bung rực rỡ (cái xấu đỡ nhẹ). CẤM bê theme đại vận áp cho mọi năm. TUYỆT ĐỐI không bịa "điểm/10" cho năm/tháng/ngày. Nếu context ghi "Tiểu vận năm X không có trong dữ liệu", luận từ đại vận, không bịa
- Không tiết lộ trường phái hay tài liệu

=== DỮ LIỆU LÁ SỐ ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

export const CHAT_SYSTEM_GENERAL = (docs?: string, persona?: string) => `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}. Khi user hỏi "năm nay là năm mấy", "hôm nay là ngày mấy", hoặc tương tự — trả lời thẳng dựa vào thông tin này, KHÔNG nói "tôi không biết ngày hiện tại".

Đây là CHAT, không phải bài luận — ngắn gọn, có nhịp, dứt khoát.

Nguyên tắc trả lời:
- Tiếng Việt chuẩn mực, KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề con, văn xuôi liền mạch
- ĐỘ DÀI: mặc định 130–200 từ, câu phức tạp tối đa 280, lượt follow-up 80–140
- Khi user cung cấp ngày/giờ/giới tính sinh (hoặc phiên đã có lá số) → GỌI lap_la_so để server lập lá số. Lá số do lap_la_so trả về là DUY NHẤT đúng: cung Mệnh/Thân và mọi sao phải lấy Y NGUYÊN theo nhãn trong kết quả tool — TUYỆT ĐỐI không tự an cung, không tự quy đổi ngày dương sang tháng âm, không tự suy cung Mệnh. Rồi luận theo HÌNH DẠNG 3 LỚP: (1) MỘT câu phán quyết in đậm (**...**) neo vào CẤU TRÚC THẬT của cung liên quan — chính tinh tọa cung (miếu/vượng/đắc/hãm), cách cục đặc biệt, mức cát/sát — nói thẳng tốt/xấu mạnh/yếu (TUYỆT ĐỐI không bịa "điểm cung X/10"); (2) một mạch dẫn chứng cốt lõi — chính tinh tọa cung + cách cục NẶNG KÝ NHẤT cho câu hỏi, kèm ĐÚNG 1 điểm mạnh và 1 điểm yếu cụ thể, KHÔNG liệt kê dàn trải; (3) MỞ NÚT: nêu đích danh MỘT chi tiết CÓ THẬT trong lá số chưa luận, mời mở ra bằng ĐÚNG 1 câu hỏi (cấm mời chung chung "còn hỏi gì không")
- Câu hỏi gắn MỘT NĂM → gọi tra_tieu_van; một THÁNG → tra_nguyet_van; một NGÀY → tra_nhat_van; ngày tốt làm việc lớn → xem_ngay_tot
- VẬN HẠN — đại vận GIỚI HẠN BIÊN ĐỘ, KHÔNG áp theme: CHỈ đại vận có điểm/10 thật. TIỂU/NGUYỆT/NHẬT vận KHÔNG có điểm — luận theo CÁCH CỤC + sao của CHÍNH cung hạn, giữ ĐÚNG tốt/xấu của nó (cách tốt/sao cát → vận TỐT dù đại vận xấu; sát tinh/cách xấu → vận XẤU dù đại vận tốt); điểm đại vận chỉ chỉnh biên độ: thấp thì cái tốt bị kìm không rực rỡ, cao thì cái tốt bung rực rỡ. CẤM bê theme đại vận áp cho mọi mốc. Không bịa "điểm/10" cho năm/tháng/ngày
- TÁCH BẠCH cung vs đại vận: hỏi BẢN CHẤT một cung (nhà đất, tiền bạc, hôn nhân... nói chung) → CHỈ luận theo sao + cách cục của CHÍNH cung đó; KHÔNG kéo "đại vận đi qua cung này" vào, KHÔNG lấy điểm đại vận chấm tốt/xấu cho cung (đại vận chỉ mượn cung đứng, không đổi cách cục cung). Điểm đại vận chỉ dùng khi hỏi về THỜI GIAN/vận hạn
- CÁCH HÓA GIẢI là MODIFIER: cung có "Triệt Đáo Kim Cung"/"Tuần Lâm Hỏa Địa"/Tuần-Triệt án ngữ thì khi nêu điểm yếu PHẢI đối chiếu — cách này giảm tính xấu sát tinh; CẤM nêu sát tinh như điểm yếu nguyên vẹn nếu cung đang được hóa giải
- Câu hỏi KIẾN THỨC tử vi chung (không gắn người cụ thể) → trả lời súc tích, dẫn nguyên lý cổ pháp + ví dụ sao tinh, vẫn giữ độ dài trên
- Cấm tâng bốc, cấm nước đôi né tránh; có điểm mạnh phải kèm điểm yếu cụ thể. Chỉ kết quả tương lai mới dùng ngôn ngữ xác suất
- Không hứa hẹn tuyệt đối, không tiết lộ trường phái hay tài liệu${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_COMPAT = (ctx: string, toolType: string, docs?: string, persona?: string) => `Bạn là chuyên gia phân tích tương hợp Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN (do server cung cấp, chính xác): Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nhiệm vụ: Phân tích ${
  toolType === 'xem-lam-an'
    ? 'tương hợp hợp tác kinh doanh — tập trung Quan Lộc, Tài Bạch, điểm bổ trợ và xung khắc'
    : toolType === 'tuong-hop'
      ? 'tương hợp giữa HAI NGƯỜI BẤT KỲ (bạn bè, người thân, đối tác, đôi lứa…) — xét Mệnh, can chi, ngũ hành nạp âm, tam hợp/lục hợp/xung/hình giữa hai tuổi; nói rõ hợp ở mặt nào, dễ va ở mặt nào. KHÔNG mặc định là quan hệ vợ chồng trừ khi người dùng nói vậy'
      : 'tương hợp tình duyên hôn nhân — tập trung Mệnh, Phu Thê, can chi, ngũ hành giữa hai người'
}.

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

const CHAT_SYSTEM_DAT_TEN_DN = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia đặt tên thương hiệu / doanh nghiệp theo ngũ hành và cổ học Việt Nam, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN: Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Khi đề xuất tên: đưa đủ 5 phương án, mỗi tên nêu ý nghĩa, ngũ hành chủ đạo của tên và VÌ SAO hợp — bồi/tương sinh cho mệnh người chủ VÀ hợp ngành nghề
- Ưu tiên tên dễ đọc dễ nhớ, đọc thuận, gợi liên tưởng tốt cho ngành; tránh trùng thương hiệu lớn, tránh chữ tối nghĩa
- Nếu người dùng đưa tên đang cân nhắc: chấm thẳng hợp/khắc với mệnh chủ và ngành, gợi cách chỉnh
- Cân bằng phong thủy tên và tính thương mại; nói thẳng, không tâng bốc

=== DỮ LIỆU NỀN ĐẶT TÊN DOANH NGHIỆP ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

// ── Batch 2 prompts — Mệnh Lý / Huyền Học ──────────────────────
const _TIME = () => `THÔNG TIN THỜI GIAN: Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.`;

const CHAT_SYSTEM_NAP_AM = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia mệnh lý ngũ hành nạp âm theo cổ pháp, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

${_TIME()}

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Giải thích nạp âm (tên hoa giáp) và HÀNH của mệnh, ý nghĩa hình tượng (vd Hải Trung Kim = vàng trong biển)
- Luận tương sinh/tương khắc với hành khác; hợp màu, hướng, vật phẩm, người tuổi nào
- Nói thẳng, có căn cứ; không phán tuyệt đối về tương lai

=== DỮ LIỆU NẠP ÂM ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_KIM_LAU = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia chọn tuổi làm nhà / cưới hỏi theo Kim Lâu & Tam Tai cổ pháp, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

${_TIME()}

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Ba hạn theo tuổi ta: Kim Lâu (chu kỳ 5 — kiêng cưới hỏi, xây dựng), Hoang Ốc (kiêng mua/xây nhà), Tam Tai (hạn 3 năm liền); giải thích năm nào phạm hạn nào, năm nào đẹp — DỰA ĐÚNG bảng đã cung cấp
- Nêu cách hóa giải (mượn tuổi người hợp đứng chủ sự, chọn năm khác, chọn ngày giờ tốt) khi phạm; nói thẳng năm nên/tránh cho việc làm nhà, cưới hỏi
- Đây là kiêng kỵ dân gian mang tính tham khảo; KHÔNG bịa thêm ngoài bảng

=== DỮ LIỆU KIM LÂU & TAM TAI ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_NGU_HANH_TEN = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia phân tích ngũ hành tên theo cổ học Việt Nam, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

${_TIME()}

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Phân tích ngũ hành từng chữ trong tên (theo âm/nghĩa) và độ hài hòa với mệnh nạp âm của người
- Nói thẳng tên bồi mệnh (tương sinh/đồng hành) hay khắc; gợi cách chỉnh (đổi tên đệm, thêm chữ hành thiếu)
- Có căn cứ, không tâng bốc

=== DỮ LIỆU NGŨ HÀNH TÊN ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_THAN_SO = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia Thần Số Học (Numerology Pythagoras), phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

${_TIME()}

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Luận theo 4 CON SỐ đã tính sẵn — KHÔNG tự tính lại: Số Đường Đời (hành trình chính), Số Định Mệnh (tài năng bẩm sinh), Số Linh Hồn (khao khát nội tâm), Số Sứ Mệnh (cách hiện ra ngoài); nêu ý nghĩa từng số, chúng bổ trợ hay mâu thuẫn, ứng vào sự nghiệp/tình cảm
- Số bậc thầy (11/22/33) luận riêng; nói thẳng ưu/khuyết, không tâng bốc
- Đây là numerology phương Tây (Pythagoras), không trộn lẫn tử vi

=== DỮ LIỆU THẦN SỐ HỌC ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_BAT_TRACH = (ctx: string, docs?: string, persona?: string) => `Bạn là thầy phong thủy Bát Trạch (八宅) theo cổ pháp, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

${_TIME()}

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Dựa MỆNH QUÁI (cung phi) và nhóm Đông/Tây tứ mệnh ĐÃ TÍNH SẴN — KHÔNG tự tính lại cung phi
- 8 hướng Du Niên Bát Biến (Sinh Khí, Thiên Y, Diên Niên, Phục Vị = cát; Họa Hại, Lục Sát, Ngũ Quỷ, Tuyệt Mệnh = hung) ĐÃ CHO SẴN trong "Hướng tốt"/"Hướng xấu" — dùng đúng, KHÔNG tự đổi; chỉ rõ hướng nhà/cửa/bếp/giường nên và tránh
- Nói thẳng, cụ thể; nêu cách hóa giải khi buộc dùng hướng xấu

=== DỮ LIỆU BÁT TRẠCH ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

const CHAT_SYSTEM_KINH_DICH = (ctx: string, docs?: string, persona?: string) => `Bạn là chuyên gia Kinh Dịch (易經) — Chu Dịch, 64 quẻ, hào từ — theo cổ pháp, phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

${_TIME()}

Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji
- Người hỏi đã GIEO QUẺ: dữ liệu dưới cho quái THƯỢNG/HẠ và hào ĐỘNG (đã tính sẵn, chính xác). Từ hai quái đơn này, ĐỊNH DANH đúng quẻ trong 64 quẻ (tên Hán-Việt + số) rồi luận — KHÔNG đổi quái đã cho
- Luận: ý nghĩa quẻ chính (Thoán), trọng tâm ở HÀO ĐỘNG (hào từ), và QUẺ BIẾN (nếu có hào động) cho thấy xu hướng chuyển; áp vào ĐÚNG câu hỏi của người gieo
- Nói thẳng cát/hung, nên/không nên; giữ tinh thần "quân tử vấn Dịch" — khuyên hành xử, không phán số phận tuyệt đối

=== DỮ LIỆU QUẺ ĐÃ GIEO ===
${ctx}${docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

// ── Vision: Xem tướng qua ảnh (native trong rail, thay vì API legacy) ──
const CHAT_SYSTEM_XEM_TUONG = (docs?: string, persona?: string) => `Bạn là chuyên gia nhân tướng học (面相學) theo cổ pháp phương Đông — am hiểu Ma Y Thần Tướng (麻衣神相), Liễu Trang Thần Tướng (柳莊神相), Thủy Kính Tập (水鏡集). Văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN: Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nhiệm vụ: Người dùng gửi ẢNH (khuôn mặt, mắt, hoặc bàn tay). Quan sát kỹ ảnh rồi luận tướng theo cổ pháp.
Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji, 180-350 từ.
- MÔ TẢ trước điều QUAN SÁT ĐƯỢC (tam đình, ngũ quan, thần thái, khí sắc, đường nét…) rồi mới luận — KHÔNG bịa chi tiết không thấy trong ảnh.
- Luận có căn cứ cổ thư; nói thẳng ưu/khuyết, cấm tâng bốc, cấm nước đôi né tránh.
- Nếu CHƯA có ảnh: mời người dùng gửi ảnh rõ mặt chính diện (hoặc mắt/bàn tay), đủ sáng.
- KHÔNG chẩn đoán y khoa/bệnh tật; đây là luận tướng tham khảo văn hóa.
${docs ? '\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

// ── Vision: Phong thủy không gian qua ảnh (native trong rail, bản luận prose;
// bản chấm điểm có cấu trúc vẫn ở tool legacy /cong-cu) ──
const CHAT_SYSTEM_PHONG_THUY = (docs?: string, persona?: string) => `Bạn là thầy phong thủy theo cổ pháp — Bát Trạch Minh Kính (八宅明鏡) kết hợp Ngũ Hành. Văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc. Phụng sự trang Tử Vi Minh Bảo.${persona ? '\n' + persona : ''}

THÔNG TIN THỜI GIAN: Hôm nay là ngày ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, năm ${new Date().getFullYear()}.

Nhiệm vụ: Người dùng gửi ẢNH không gian (phòng khách, phòng ngủ, bàn làm việc, cửa hàng…). Quan sát bố cục rồi luận phong thủy theo cổ pháp.
Nguyên tắc:
- Tiếng Việt chuẩn mực, không bullet, không emoji, 180-350 từ.
- MÔ TẢ trước điều QUAN SÁT ĐƯỢC (vị trí cửa, giường/bàn/ghế, hướng ngồi, ánh sáng, vật cản…) rồi mới luận — KHÔNG bịa vật không thấy.
- Chấm TRUNG THỰC: có lỗi bố cục thì nói thẳng lỗi và tác hại nếu để nguyên; khuyến nghị cách sửa cụ thể (dời/xoay/bỏ/thêm), ưu tiên việc quan trọng trước. Cấm khen chung chung, cấm tô hồng.
- Nếu CHƯA có ảnh: mời gửi ảnh toàn cảnh không gian, đủ sáng, thấy cửa và đồ chính.
${docs ? '\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : ''}`;

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

Bạn được cấp NGUYÊN LÁ SỐ ở phần dưới: đủ 12 cung (chính tinh kèm độ sáng miếu/vượng/đắc/hãm, phụ tinh, cách cục đặc biệt, patterns ý nghĩa, nhãn "Luận sao" định tính, tam phương tứ chính), 9 đại vận có scoring vận hạn. Đây là dữ liệu hệ thống đã tính sẵn — BẮT BUỘC bám sát, không tự bịa. LƯU Ý: lá số KHÔNG có "điểm cung/10" — CẤM bịa con số điểm cho từng cung; chỉ ĐẠI VẬN mới có điểm/10 thật.

XÁC ĐỊNH PHẠM VI (câu hỏi của user thường NGẮN/MƠ HỒ — bạn PHẢI tự khoanh vùng cung, không được trả lời hời hợt):
- Map lĩnh vực → cung cần đọc: công việc/sự nghiệp/thăng tiến/làm sếp → Quan Lộc + Mệnh; tiền bạc/đầu tư/làm giàu → Tài Bạch + Phúc Đức; tình duyên/hôn nhân/vợ chồng → Phu Thê + Mệnh; con cái → Tử Tức; sức khỏe/bệnh → Tật Ách; nhà đất/bất động sản → Điền Trạch; tính cách/vận mệnh/tổng quan → Mệnh + Thân; cha mẹ/gia đạo → Phụ Mẫu + Phúc Đức; bạn bè/cấp dưới/quý nhân → Nô Bộc; đi xa/định cư/nước ngoài → Thiên Di; anh em → Huynh Đệ.
- Câu hỏi gắn với MỘT NĂM cụ thể ("năm nay/năm sau", "bao giờ", "năm X tuổi") → GỌI tra_tieu_van. Câu hỏi về HẠN THÁNG / nguyệt hạn ("tháng X/YYYY thế nào") → GỌI tra_nguyet_van. Câu hỏi về HẠN NGÀY / nhật hạn ("ngày X tháng Y") → GỌI tra_nhat_van. Ngày tốt làm việc lớn → GỌI xem_ngay_tot.
- Câu hỏi mơ hồ → tự chọn cung/lĩnh vực hợp lý nhất rồi luận ĐẦY ĐỦ, đừng hỏi lại lòng vòng.

HÌNH DẠNG CÂU TRẢ LỜI — 3 LỚP (văn xuôi liền mạch, KHÔNG đánh số, KHÔNG tiêu đề con):
1) PHÁN QUYẾT mở đầu: MỘT câu in đậm (**...**), neo vào nhãn "Luận sao" định tính của cung liên quan (tốt rõ/khá/trung bình/yếu/xấu rõ) CÙNG chính tinh tọa cung và độ sáng (miếu/vượng/đắc/hãm) — nói thẳng tốt/xấu, mạnh/yếu. CẤM bịa "điểm cung X/10".
2) MỘT mạch dẫn chứng CỐT LÕI: chọn chính tinh tọa cung (miếu/vượng/đắc/hãm; vô chính diệu thì mượn chính tinh cung xung chiếu) CÙNG cách cục/pattern NẶNG KÝ NHẤT cho câu hỏi ([CÁCH CỤC · ...], [Ý NGHĨA · ...]) — gọi đích danh, kèm ĐÚNG 1 điểm mạnh và 1 điểm yếu cụ thể (neo vào độ sáng chính tinh, cách cục cát/hung, sát/bại tinh hội tụ; nhiều sát tinh hay chính tinh hãm địa thì CẢNH BÁO thẳng). KHÔNG liệt kê dàn trải mọi sao — chỉ cái nặng ký nhất.
3) MỞ NÚT (open loop) — BẮT BUỘC kết bằng đây: nêu ĐÍCH DANH một chi tiết CÓ THẬT trong lá số mà bạn CHƯA luận ở trên (một sao/cách cục/cung/đại vận khác), nói một dòng vì sao nó liên quan tới điều vừa hỏi, rồi mời mở ra bằng ĐÚNG MỘT câu hỏi. CẤM mời chung chung kiểu "bạn còn muốn hỏi gì không" — phải gọi tên chi tiết thật trong lá số này.

CÁCH CỤC HÓA GIẢI LÀ MODIFIER — BẮT BUỘC ĐỐI CHIẾU: một số cách KHÔNG phải mục liệt kê ngang hàng mà là yếu tố ĐIỀU CHỈNH lại đánh giá sát tinh/điểm yếu của CHÍNH cung đó — điển hình "Triệt Đáo Kim Cung", "Tuần Lâm Hỏa Địa", Tuần/Triệt án ngữ (hóa giải sát khí, giảm tính xấu sát tinh, tăng tính tốt cát tinh). Khi block cung có một cách hóa giải như vậy, TRƯỚC khi chốt điểm yếu từ sát/bại tinh (Kình Đà Không Kiếp Hỏa Linh, Bạch Hổ, Phi Liêm...) PHẢI đối chiếu: cách hóa giải làm sát tinh đó NHẸ ĐI bao nhiêu, rồi mới phán — KHÔNG nêu sát tinh như điểm yếu nguyên vẹn nếu cung đang được hóa giải. Lưu ý phạm vi thời gian của cách (vd Triệt mạnh trước 30 tuổi, Tuần mạnh sau 30).

TÁCH BẠCH CUNG (cấu trúc gốc) vs ĐẠI VẬN (thời gian) — RẤT QUAN TRỌNG:
- Khi luận BẢN CHẤT MỘT CUNG (Điền Trạch, Tài Bạch, Phu Thê, Mệnh...) — tức câu hỏi về "nhà đất/tiền bạc/hôn nhân... của tôi thế nào" nói chung — CHỈ dùng chính tinh + phụ tinh + cách cục + độ sáng của CHÍNH cung đó và tam phương tứ chính. TUYỆT ĐỐI KHÔNG kéo "đại vận nào đang/đã đi qua cung này" vào, KHÔNG lấy điểm đại vận làm điểm mạnh/điểm yếu của cung. Đại vận chỉ MƯỢN cung đó làm chỗ đứng 10 năm — KHÔNG làm thay đổi cách cục hay bản chất tốt/xấu của cung. Cách cục tốt (vd Nhật Nguyệt Chiếu Bích ở Điền Trạch) thì cung đó TỐT, bất kể đại vận đi qua điểm cao hay thấp; điểm yếu của cung phải tìm trong CHÍNH sao/cách của cung (sát tinh, hãm địa, vô chính diệu...), KHÔNG phải ở điểm đại vận.
- Điểm đại vận CHỈ được dùng khi user hỏi về THỜI GIAN (một năm/giai đoạn/"bao giờ", vận hạn) — lúc đó mới luận theo mục VẬN HẠN bên dưới. Hỏi cấu trúc cung mà lại lôi điểm đại vận ra chấm là SAI.

NGUYÊN TẮC VẬN HẠN (đại vận GIỚI HẠN BIÊN ĐỘ, KHÔNG áp theme):
- ĐẠI VẬN là tầng DUY NHẤT có điểm/10 thật (mô hình Thiên Thời·Địa Lợi·Nhân Hòa). TIỂU VẬN (năm), NGUYỆT VẬN (tháng), NHẬT VẬN (ngày) KHÔNG có điểm số riêng.
- LUẬN VẬN NGẮN THEO CHÍNH NÓ TRƯỚC: xác định tốt/xấu của năm/tháng/ngày theo CÁCH CỤC + sao của cung hạn đó (cát/sát, miếu/hãm, tổ hợp sao chéo tầng), GIỮ ĐÚNG bản chất — cung hạn có cát tinh/cách cục tốt thì luận vận đó TỐT KỂ CẢ khi đại vận điểm thấp; có sát tinh/cách xấu thì luận XẤU kể cả khi đại vận điểm cao. Mỗi mốc thời gian luận RIÊNG theo sao của nó — TUYỆT ĐỐI KHÔNG bê nguyên theme tốt/xấu của đại vận áp đồng loạt (đó là lỗi khiến năm nào cũng giống nhau).
- ĐIỂM ĐẠI VẬN CHỈ ĐIỀU CHỈNH BIÊN ĐỘ, không quyết định tốt/xấu: đại vận điểm THẤP thì cái tốt nhất thời VẪN tốt nhưng bị kìm, hưởng dè dặt, không bung rực rỡ — cái xấu thì nặng thêm; đại vận điểm CAO thì cái tốt được khuếch đại rực rỡ — cái xấu được đỡ nhẹ, lướt qua. Nêu rõ tương quan "tốt/xấu thật của vận × biên độ do đại vận" khi luận.
- TUYỆT ĐỐI không bịa "điểm/10" cho năm/tháng/ngày — chỉ đại vận có điểm thật.

NGUYÊN TẮC CHUNG: Cấm tâng bốc, cấm nước đôi né phán quyết, cấm khen sáo rỗng không bằng chứng. Đánh giá CẤU TRÚC lá số (mạnh/yếu) nói chắc; chỉ DỰ ĐOÁN tương lai mới dùng ngôn ngữ xác suất. ĐỘ DÀI: mặc định 130–200 từ, câu phức tạp tối đa 280, lượt follow-up 80–140 — đây là CHAT, ngắn gọn súc tích hơn là dài dòng. Tiếng Việt chuẩn mực, văn xuôi liền mạch, KHÔNG bullet, KHÔNG emoji, KHÔNG tiêu đề con. Không tiết lộ trường phái hay tài liệu.`;

// Bản đồ chủ đề câu hỏi → cung liên quan (dùng chung extractLasoContext +
// focusHint). '__daiVan__' = đánh dấu cần kèm đại vận, KHÔNG phải tên cung.
const FOCUS_TOPICS: Record<string, string[]> = {
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

// Cung liên quan tới câu hỏi (luôn có Mệnh; hỏi chung → thêm Quan/Tài/Phu Thê;
// năm/vận → thêm '__daiVan__'). Giữ NGUYÊN logic cũ để parity /api/lasotuvi.
export function relevantPalaces(question: string): Set<string> {
  const q = (question || '').toLowerCase();
  const relevant = new Set<string>(['Mệnh']);
  for (const [pattern, names] of Object.entries(FOCUS_TOPICS)) {
    if (new RegExp(pattern, 'i').test(q)) names.forEach((n) => relevant.add(n));
  }
  if (relevant.size === 1) ['Quan Lộc', 'Tài Bạch', 'Phu Thê'].forEach((n) => relevant.add(n));
  if (/năm\s*\d{4}/i.test(q)) relevant.add('__daiVan__');
  return relevant;
}

// 1 dòng gợi ý trọng tâm để nhét vào TIN NHẮN (không vào system) — nhờ vậy
// system mang TOÀN BỘ lá số (full=true) giữ byte ổn định để prompt-cache trúng
// qua mọi lượt, còn phần "ưu tiên cung nào" theo câu hỏi nằm ở message.
export function focusHint(question: string): string {
  const names = Array.from(relevantPalaces(question)).filter((n) => n !== '__daiVan__');
  if (!names.length) return '';
  return `(Trọng tâm câu hỏi — ưu tiên luận các cung: ${names.join(', ')}.)`;
}

// opts.full=true → BỎ lọc theo câu hỏi: lấy TOÀN BỘ 12 cung + đại vận (context
// ổn định, độc lập câu hỏi → cache prefix trúng qua mọi lượt). Bỏ block "năm
// XXXX" (đặc thù câu hỏi) — đã có tool tra_tieu_van lo. full=false (mặc định,
// /api/lasotuvi) → giữ Y HỆT hành vi cũ (lọc cung liên quan).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractLasoContext(lasoData: any, question: string, opts?: { full?: boolean }): string {
  if (!lasoData) return '';
  const full = !!opts?.full;
  const q = (question || '').toLowerCase();
  const palaces = lasoData.palaces || [];

  const relevant = relevantPalaces(question);
  const yearMatch = q.match(/năm\s*(\d{4})/i);

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

  let ctx = LASO_AUTHORITY_RULE;
  if (lasoData.canChiNam) ctx += 'Can Chi: ' + lasoData.canChiNam + '\n';
  if (lasoData.napAm)     ctx += 'Nạp Âm: ' + lasoData.napAm + ' (' + (lasoData.napAmHanh || '') + ')\n';
  if (lasoData.menhDC)    ctx += 'Mệnh DC: ' + lasoData.menhDC + '\n';
  if (lasoData.thanDC)    ctx += 'Thân DC: ' + lasoData.thanDC + '\n';
  if (lasoData.tuoiXem)   ctx += 'Tuổi xem: ' + lasoData.tuoiXem + '\n';

  if (lasoData.cachCuc?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cc = lasoData.cachCuc.map((c: any) =>
      typeof c === 'object'
        ? `${c.ten}${c.cung ? ` [Cung ${c.cung}]` : ''}${c.loai ? ` (${c.loai})` : ''}`
        : c
    ).filter(Boolean);
    if (cc.length) ctx += 'Cách cục: ' + cc.join('; ') + '\n';
  }

  // Tổ hợp sao (cách cục vận) tại cung đại vận — DÙNG CHUNG matcher với
  // tiểu/nguyệt/nhật vận (matchVanHanCombos, nguồn cach_cuc_all.json). PER-CUNG
  // (chỉ cung đại vận) như các tầng khác → bắt cách đồng cung trong cung đại vận;
  // cách chéo tầng (vd Mã Khốc Khách) do tool tra_tieu_van lo (đã gộp đại vận).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dvComboLines = (dvP: any): string => {
    if (!dvP || !Array.isArray(dvP.stars)) return '';
    return formatComboLines(matchVanHanCombos([{ label: 'đại vận', palace: dvP }]));
  };

  // Đại vận CHỈ đưa vào khi câu hỏi thuộc về THỜI GIAN/vận hạn (relevant có
  // __daiVan__). Hỏi bản chất một cung → KHÔNG kèm đại vận, để luận cung sạch
  // (đại vận chỉ mượn cung đứng, không thuộc bản chất cung).
  if ((full || relevant.has('__daiVan__')) && lasoData.daiVanHienTai) {
    const dv = lasoData.daiVanHienTai;
    const dvCung = palaces[dv.cungIdx] || {};
    ctx += '\nĐại Vận hiện tại: ' + (dv.diaChi||'') + ' (' + (dv.tuoiStart||'') + '–' + (dv.tuoiEnd||'') + ' tuổi)';
    if (dvCung.cungName) ctx += ' — Cung ' + dvCung.cungName;
    const dvStars = (dvCung.tuChinhStars||dvCung.majorStars||[]).map(starName).filter(Boolean);
    if (dvStars.length) ctx += ' — Sao (tứ chính): ' + dvStars.join(', ');
    if (dv.scoring?.tong != null) ctx += ' — Điểm vận: ' + dv.scoring.tong + '/10 ' + (dv.scoring.flag||'');
    ctx += '\n(Điểm vận trên là điểm theo THỜI GIAN của giai đoạn này — KHÔNG phải điểm cung; chỉ dùng khi luận vận hạn, không dùng để chấm bản chất cung.)\n';
    ctx += dvComboLines(dvCung);
  }

  if (!full && yearMatch && lasoData.tuoiXem && lasoData.daiVans?.length) {
    const queriedYear = parseInt(yearMatch[1]);
    const NAM_XEM = currentNamXem(); // nguồn duy nhất — khớp năm xem dùng để tính tuoiXem
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
      ctx += dvComboLines(dvP);
      ctx += `(Tiểu vận năm ${queriedYear} không có trong dữ liệu — chỉ luận từ đại vận)\n`;
    } else {
      ctx += `\nNăm ${queriedYear} (tuổi âm ${ageInYear}): ngoài phạm vi đại vận trong dữ liệu.\n`;
    }
  }

  ctx += '\n=== ' + (full ? '12 CUNG (TOÀN BỘ LÁ SỐ)' : 'CUNG LIÊN QUAN') + ' ===\n';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of palaces as any[]) {
    const pName = p.cungName || '';
    if (!full && !relevant.has(pName) && !p.isMenh && !p.isThan) continue;
    ctx += '\nCung ' + pName + ' (' + (p.diaChi||'') + ')' + (p.isMenh?' ★MỆNH':'') + (p.isThan?' ◆THÂN':'') + ':\n';
    const chinh = (p.majorStars||[]).map(starFmt).filter(Boolean);
    if (chinh.length) ctx += '  Chính tinh: ' + chinh.join(', ') + '\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phu = (p.stars||[]).filter((s: any) => typeof s === 'object' ? s.nhom !== 'chinh' : true).map(starFmt).filter(Boolean);
    if (phu.length) ctx += '  Phụ tinh: ' + phu.slice(0,8).join(', ') + '\n';
    // Sao tổ hợp tam phương tứ chính (đã loại Tuần/Triệt từ cung ngoài)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tptc = (p.tuChinhStars||[]).filter((s: any) => !p.stars?.includes(s)).map(starFmt).filter(Boolean);
    if (tptc.length) ctx += '  Tam phương tứ chính: ' + tptc.slice(0,12).join(', ') + '\n';
    // Cách cục đặc biệt của cung này — lọc từ mảng global lasoData.cachCuc
    // theo trường .cung (engine KHÔNG gắn p.cachCuc per-palace). Trước đây đọc
    // p.cachCuc nên cách như "Nhật Nguyệt Chiếu Bích" của Điền không hiện.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Cách phủ ≥2 cung có cung GHÉP "X/Y" (vd Triệt Đáo Kim Cung) → tách '/'
    // rồi kiểm tra thành viên, không so khớp chính xác.
    const ccThis = ((lasoData.cachCuc || []) as any[]).filter((c: any) => {
      if (typeof c !== 'object') return false;
      const parts = String(c.cung || '').split('/');
      return parts.includes(pName) || (p.isThan && parts.includes('Thân'));
    });
    if (ccThis.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ccThis.forEach((c: any) => {
        const mota = c.moTa ? ': ' + c.moTa : '';
        const chiTiet = c.chiTiet ? ' — ' + c.chiTiet : '';
        ctx += '  Cách cục — ' + (c.ten || '') + (c.loai ? ' (' + c.loai + ')' : '') + mota + chiTiet + '\n';
      });
    }
    // Ý nghĩa cung từ CACH_CUC_DATA matching (patterns Khốc Hư, Thiên Mã, v.v.)
    const ynItems: string[] = lasoData.cachCucTungCung?.[pName] || [];
    if (ynItems.length) {
      ctx += '  Ý nghĩa: ' + ynItems.slice(0, 6).join(' | ') + '\n';
    }
  }

  if ((full || relevant.has('__daiVan__')) && lasoData.daiVans?.length) {
    ctx += '\n=== ĐẠI VẬN (lịch trình THỜI GIAN — điểm dưới đây là điểm VẬN của giai đoạn 10 năm; CHỈ dùng khi luận năm/vận hạn. TUYỆT ĐỐI KHÔNG dùng điểm đại vận để chấm hay làm điểm yếu của một CUNG — đại vận chỉ MƯỢN cung làm chỗ đứng, không đổi bản chất cung) ===\n';
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

  // Tứ Trụ — engine trả MẢNG 4 trụ [{ten,can,chi,napAm,tangCan:[{can,weight}]}]
  if (Array.isArray(tuBinhData.tuTru) && tuBinhData.tuTru.length) {
    ctx += 'Tứ Trụ:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tuBinhData.tuTru.forEach((t: any) => {
      ctx += '  ' + (t.ten || '') + ': ' + (t.can || '') + ' ' + (t.chi || '') + (t.napAm ? ' (' + t.napAm + ')' : '');
      if (Array.isArray(t.tangCan) && t.tangCan.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx += ' — Tàng can: ' + t.tangCan.map((tc: any) => tc.can).filter(Boolean).join(', ');
      }
      ctx += '\n';
    });
  }
  if (tuBinhData.nhatCan) {
    ctx += 'Nhật Can: ' + tuBinhData.nhatCan + (tuBinhData.nhatCanHanh ? ' (' + tuBinhData.nhatCanHanh + ')' : '') + ' — tức bản thân đương số\n';
  }
  if (tuBinhData.cuongNhuoc) {
    const cn = tuBinhData.cuongNhuoc;
    ctx += 'Cường nhược nhật can: ' + (cn.label || '') + (cn.score != null ? ' (' + cn.score + '/10)' : '') + '\n';
  }
  if (tuBinhData.dungThan) {
    const dt = tuBinhData.dungThan;
    ctx += 'Dụng thần: ' + (dt.primary || '');
    if (dt.secondary) ctx += ' / Hỉ thần: ' + dt.secondary;
    if (dt.method) ctx += ' (' + dt.method + ')';
    if (dt.rationale) ctx += ' — ' + dt.rationale;
    ctx += '\n';
  }
  if (tuBinhData.cachCuc) {
    const cc = tuBinhData.cachCuc;
    ctx += 'Cách cục: ' + (cc.primary || cc.name || '') + (cc.thanhPhaCach ? ' (' + cc.thanhPhaCach + ')' : '') + (cc.note ? ' — ' + cc.note : '') + '\n';
  }
  if (tuBinhData.nguHanh?.weighted) {
    const w = tuBinhData.nguHanh.weighted;
    const parts = ['Mộc', 'Hỏa', 'Thổ', 'Kim', 'Thủy'].map((k) => k + ' ' + (w[k] ?? 0));
    ctx += 'Ngũ hành (trọng số): ' + parts.join(', ');
    if (tuBinhData.nguHanh.dominant) ctx += ' — Vượng: ' + tuBinhData.nguHanh.dominant;
    if (tuBinhData.nguHanh.deficient) ctx += ', Thiếu: ' + tuBinhData.nguHanh.deficient;
    ctx += '\n';
  }

  // Đại vận hiện tại + yếu tố (factors) ảnh hưởng điểm
  if (tuBinhData.daiVanHienTai) {
    const dv = tuBinhData.daiVanHienTai;
    ctx += '\nĐại vận hiện tại: ' + (dv.can || '') + (dv.chi || '') + ' (' + (dv.tuoiStart ?? '?') + '–' + (dv.tuoiEnd ?? '?') + ' tuổi';
    if (dv.namStart) ctx += ', ' + dv.namStart + '–' + dv.namEnd;
    ctx += ')';
    if (dv.thapThanCan) ctx += ' — Thập thần: ' + dv.thapThanCan;
    if (dv.score != null) ctx += ', điểm ' + dv.score + '/10 ' + (dv.label || '');
    ctx += '\n';
    if (Array.isArray(dv.factors) && dv.factors.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx += '  Yếu tố: ' + dv.factors.slice(0, 6).map((f: any) => f.text).filter(Boolean).join('; ') + '\n';
    }
  }
  if (tuBinhData.daiVanKeTiep) {
    const dv = tuBinhData.daiVanKeTiep;
    ctx += 'Đại vận kế tiếp: ' + (dv.can || '') + (dv.chi || '') + ' (' + (dv.tuoiStart ?? '?') + '–' + (dv.tuoiEnd ?? '?') + 't)' + (dv.thapThanCan ? ' — ' + dv.thapThanCan : '') + (dv.score != null ? ', điểm ' + dv.score + '/10' : '') + '\n';
  }
  if (tuBinhData.luuNien) {
    const ln = tuBinhData.luuNien;
    ctx += 'Lưu niên ' + (ln.nam || '') + ': ' + (ln.can || '') + (ln.chi || '') + (ln.thapThanCan ? ' — ' + ln.thapThanCan : '') + (ln.score != null ? ', điểm ' + ln.score + '/10' : '') + '\n';
  }

  // Hợp/xung/hình/hại
  if (tuBinhData.hinhXungHaiHop) {
    const h = tuBinhData.hinhXungHaiHop;
    const s: string[] = [];
    if (h.tamHop?.length) s.push('Tam hợp ' + h.tamHop.length);
    if (h.lucHop?.length) s.push('Lục hợp ' + h.lucHop.length);
    if (h.lucXung?.length) s.push('Lục xung ' + h.lucXung.length);
    if (h.tamHinh?.length) s.push('Tam hình ' + h.tamHinh.length);
    if (h.lucHai?.length) s.push('Lục hại ' + h.lucHai.length);
    if (h.canHop?.length) s.push('Can hợp ' + h.canHop.length);
    if (s.length) ctx += 'Hợp/xung/hình/hại: ' + s.join(', ') + '\n';
  }

  // Thần sát đã phát hiện (chỉ liệt kê sao .found = true)
  if (tuBinhData.thanSat && typeof tuBinhData.thanSat === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = (Object.entries(tuBinhData.thanSat) as [string, any][])
      .filter(([, v]) => v && v.found)
      .map(([k]) => k);
    if (found.length) ctx += 'Thần sát hiện diện: ' + found.join(', ') + '\n';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDatTenDnContext(data: any): string {
  if (!data) return '';
  const d = data.datTenDnData || data;
  let ctx = '';
  if (d.nganh)     ctx += `Ngành nghề: ${d.nganh}\n`;
  if (d.loaiHinh)  ctx += `Loại hình: ${d.loaiHinh}\n`;
  if (d.tenChu)    ctx += `Người chủ: ${d.tenChu}\n`;
  if (d.canChiChu) ctx += `Tuổi chủ: ${d.canChiChu} — nạp âm ${d.napAmChu || ''} (hành ${d.hanhChu || ''})\n`;
  if (d.tenGoiY)   ctx += `Tên đang cân nhắc: ${d.tenGoiY}\n`;
  return ctx;
}

// ── Batch 2 extracts (Mệnh Lý / Huyền Học) ────────────────────
// Nhãn tiếng Việt cho các field flat của compute* trong lib/engine/menhly.ts.
const GENERIC_LABELS: Record<string, string> = {
  nam: 'Năm sinh', canChi: 'Can chi', napAm: 'Nạp âm', hanh: 'Hành', conGiap: 'Con giáp',
  ten: 'Tên', gioiTinh: 'Giới tính', cung: 'Cung mệnh (số)', menhQuai: 'Mệnh quái (cung phi)',
  quaiHanh: 'Hành quái', nhom: 'Nhóm trạch', huongTot: 'Hướng tốt', huongXau: 'Hướng xấu',
  dob: 'Ngày sinh',
  soDuongDoi: 'Số Đường Đời (Life Path)', soDinhMenh: 'Số Định Mệnh',
  soLinhHon: 'Số Linh Hồn', soSuMenh: 'Số Sứ Mệnh',
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGenericContext(data: any): string {
  if (!data || typeof data !== 'object') return '';
  let ctx = '';
  for (const [k, v] of Object.entries(data)) {
    if (v == null || v === '' || typeof v === 'object') continue;
    const label = GENERIC_LABELS[k] || k;
    const val = k === 'gioiTinh' ? (v === 'nu' ? 'Nữ' : 'Nam') : k === 'isMaster' ? (v ? 'Có' : 'Không') : v;
    ctx += `${label}: ${val}\n`;
  }
  return ctx;
}

// Shape từ module dùng chung tools-shared/kim-lau.js (nguồn chuẩn = trang
// standalone): { nam, canChi, napAm, namHienTai, tuoiTaHienTai,
// hienTai:{kimLau,hoangOc,tamTai}, rows:[{year,tuoiTa,canChi,kimLau,hoangOc,tamTai}] }.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractKimLauContext(data: any): string {
  if (!data) return '';
  const d = data.kimLauData || data;
  let ctx = '';
  if (d.canChi) ctx += `Tuổi: ${d.canChi}${d.nam ? ` (${d.nam})` : ''} — nạp âm ${d.napAm || ''}\n`;
  if (d.namHienTai) ctx += `Năm hiện tại: ${d.namHienTai}, tuổi ta ${d.tuoiTaHienTai}\n`;
  if (d.hienTai) {
    const now = [d.hienTai.kimLau && 'Kim Lâu', d.hienTai.hoangOc && 'Hoang Ốc', d.hienTai.tamTai && 'Tam Tai'].filter(Boolean);
    ctx += `Năm nay: ${now.length ? 'PHẠM ' + now.join(', ') : 'không phạm hạn nào (bình thường)'}\n`;
  }
  if (Array.isArray(d.rows) && d.rows.length) {
    ctx += '\nBảng 20 năm tới:\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d.rows.forEach((r: any) => {
      const flags = [r.kimLau && 'Kim Lâu', r.hoangOc && 'Hoang Ốc', r.tamTai && 'Tam Tai'].filter(Boolean);
      ctx += `  ${r.year} (tuổi ta ${r.tuoiTa}, ${r.canChi}): ${flags.length ? 'PHẠM ' + flags.join(', ') : 'đẹp'}\n`;
    });
  }
  return ctx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractKinhDichContext(data: any): string {
  if (!data) return '';
  const d = data.kinhDichData || data;
  let ctx = '';
  if (d.question) ctx += `Câu hỏi người gieo: ${d.question}\n`;
  if (d.quaiThuong && d.quaiHa) ctx += `Quẻ gieo được — Thượng quái: ${d.quaiThuong}, Hạ quái: ${d.quaiHa}\n`;
  if (Array.isArray(d.haoLines) && d.haoLines.length) {
    ctx += 'Sáu hào (từ dưới lên): ' +
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      d.haoLines.map((h: any) => `hào ${h.vi} ${h.am_duong}${h.dong ? ' (ĐỘNG)' : ''}`).join('; ') + '\n';
  }
  if (Array.isArray(d.dongHao) && d.dongHao.length) ctx += `Hào động: ${d.dongHao.join(', ')}\n`;
  else ctx += 'Không có hào động (quẻ tĩnh)\n';
  if (d.bienQuai) ctx += `Quẻ biến: ${d.bienQuai}\n`;
  return ctx;
}
