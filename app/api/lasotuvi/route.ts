// app/api/lasotuvi/route.ts
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody, CORS_HEADERS } from '@/lib/cors';
// Lõi dùng chung — trích sang lib/agent (một bộ não).
import { execLasoTool, toolLabel } from '@/lib/agent/tools';
import { buildChatContext, XUNG_HO_RULE, nguoiXemLine } from '@/lib/agent/prompts';
// LLM Gemini-primary + Anthropic-backup (provider từ app_config
// 'chat.standalone_provider'). callLLMTools trả shape Anthropic → giữ nguyên
// vòng lặp tool bên dưới; llmTextFull cho luận 24 phần (phan) — bản `Full` để
// lấy được usage + thời lượng, xem chú thích tại chỗ gọi.
import { llmTextFull, callLLMTools } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { withToolOutcome } from '@/lib/ops/tool-outcome';

// ─── System prompt ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là nhà luận giải Tử Vi Đẩu Số, phụng sự trang Tử Vi Minh Bảo.

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

// ─── LLM client (Gemini-primary + Anthropic-backup) ────────────
// Trả shape Anthropic ({content, stop_reason, usage}) dù provider nào → vòng
// lặp tool phía dưới KHÔNG đổi.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callLLM(system: any, convo: any[], tools: any[], toolChoiceNone = false, maxTokens = 1500): Promise<any> {
  return callLLMTools(system, convo, tools, toolChoiceNone, maxTokens);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textOf(content: any[]): string {
  return (content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

// ─── Cộng dồn chi phí một LƯỢT chat (kể cả các vòng tool-use) ──
// Đường rail cũ này đi qua callLLMTools trong VÒNG LẶP, nên phải cộng dồn rồi
// ghi MỘT dòng cuối lượt — y như runAgent (lib/agent/run.ts) làm cho /api/v1/chat.
// Ghi từng vòng thì một câu hỏi của người dùng nở ra 2–4 dòng `llm_usage`, đếm
// "số lượt" ở panel Biên LN thành vô nghĩa.
class ChatUsageTally {
  private readonly t0 = Date.now();
  private model = '';
  private readonly u = { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };
  private rounds = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(data: any): void {
    if (!data) return;
    // Giữ model của vòng GẦN NHẤT: fallback provider có thể xảy ra giữa chừng.
    if (data.model) this.model = data.model;
    this.u.input_tokens += data.usage?.input_tokens || 0;
    this.u.output_tokens += data.usage?.output_tokens || 0;
    this.u.cache_creation_input_tokens += data.usage?.cache_creation_input_tokens || 0;
    this.u.cache_read_input_tokens += data.usage?.cache_read_input_tokens || 0;
    this.rounds += 1;
  }

  get plain() {
    return { input_tokens: this.u.input_tokens, output_tokens: this.u.output_tokens, rounds: this.rounds };
  }

  /** Lượt hỏng trước khi gọi được provider nào → KHÔNG ghi dòng chi phí 0đ. */
  flush(toolId: string): void {
    if (!this.rounds || !this.model) return;
    void logLlmUsage(toolId, this.model, this.u, Date.now() - this.t0);
  }
}

// Bucket chi phí của lượt rail. CỐ Ý *không* dùng 'laso' cho lượt chat có lá số:
// 'laso' là tool_id của Luận Giải 24 phần (1.500 Lượng) — trộn vào là bóp méo
// đúng con số biên LN vừa vá. Lượt rail thu tiền qua `credit_transactions
// .type='chat'`, nên bucket chi phí phải là 'chat' thì hai vế mới ghép được.
// Kịch bản phi-lá-số giữ nguyên tên tool (mirror `scenario?.type` của run.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chatUsageToolId(body: any, hasLaso: boolean): string {
  const t = body?.toolType;
  return hasLaso || !t || t === 'laso' ? 'chat' : String(t);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChat(body: any): Promise<Response> {
  const { messages } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const { systemForCall, tools, maxTokens, lasoDataForTools } = buildChatContext(body);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convo: any[] = messages.slice(-10).map((m: any) => ({
    role: m.role,
    content: String(m.content).slice(0, 2000),
  }));

  const MAX_ROUNDS = 3;
  const toolsUsed: string[] = [];
  let finalText = '';
  const tally = new ChatUsageTally();
  const hasLaso = !!(lasoDataForTools?.palaces?.length);
  const usageToolId = chatUsageToolId(body, hasLaso);

  try {
    for (let round = 0; round <= MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS;
      const data = await callLLM(systemForCall, convo, tools, lastRound, maxTokens);
      const content = data.content || [];
      tally.add(data);

      if (data.stop_reason === 'tool_use' && !lastRound) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolUses = content.filter((b: any) => b.type === 'tool_use');
        convo.push({ role: 'assistant', content });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = toolUses.map((tu: any) => {
          toolsUsed.push(tu.name);
          const resultText = execLasoTool(tu.name, lasoDataForTools, tu.input);
          return { type: 'tool_result', tool_use_id: tu.id, content: resultText };
        });
        convo.push({ role: 'user', content: results });
        continue;
      }

      finalText = textOf(content);
      break;
    }
  } catch (e: unknown) {
    // Token của các vòng ĐÃ chạy là chi phí thật dù lượt hỏng — vẫn ghi sổ.
    tally.flush(usageToolId);
    return err((e as Error).message);
  }

  tally.flush(usageToolId);
  const toolType = body.toolType || 'laso';
  return ok({
    answer: finalText || 'Xin lỗi, có lỗi xảy ra.',
    scenario: hasLaso ? 'laso' : toolType,
    toolsUsed,
    usage: tally.plain,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleChatStream(body: any): Promise<Response> {
  const { messages } = body;
  if (!messages?.length) return err('Missing messages', 400);

  const { systemForCall, tools, maxTokens, lasoDataForTools } = buildChatContext(body);

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

  const tally = new ChatUsageTally();
  const usageToolId = chatUsageToolId(body, !!(lasoDataForTools?.palaces?.length));

  (async () => {
    const MAX_ROUNDS = 3;
    const toolsUsed: string[] = [];

    try {
      for (let round = 0; round <= MAX_ROUNDS; round++) {
        const lastRound = round === MAX_ROUNDS;

        if (lastRound) {
          // Vòng chốt: buộc trả text (không tool). Gemini generateContent không
          // stream token-by-token qua đây → gửi 1 khối text (frontend cộng dồn
          // như thường). Giữ đúng shape event {type:'text'} / {type:'error'}.
          try {
            const data = await callLLM(systemForCall, convo, tools, true, maxTokens);
            tally.add(data);
            const text = textOf(data.content || []);
            if (text) send({ type: 'text', text });
          } catch (e: unknown) {
            send({ type: 'error', message: (e as Error).message });
          }
          break;
        }

        const data = await callLLM(systemForCall, convo, tools, false, maxTokens);
        tally.add(data);
        const content = data.content || [];

        if (data.stop_reason === 'tool_use') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolUses = content.filter((b: any) => b.type === 'tool_use');
          convo.push({ role: 'assistant', content });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const results = toolUses.map((tu: any) => {
            toolsUsed.push(tu.name);
            send({ type: 'tool', name: tu.name, label: toolLabel(tu.name) });
            const resultText = execLasoTool(tu.name, lasoDataForTools, tu.input);
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

    // Ghi TRƯỚC khi đóng stream, và ở đường chung của cả nhánh lỗi lẫn nhánh
    // thành công — đặt trong `try` là lượt hỏng giữa chừng mất hết dấu chi phí.
    tally.flush(usageToolId);
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

  const trimmedLaSo = trimLaSo(laSoText, phan);
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';
  const ctx = '=== LÁ SỐ ===\n' + trimmedLaSo + docsSection;

  if (phan === 1) return ctx + `

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

  if (phan === 2) return ctx + `

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
    return ctx + `

PHẦN ${phan} — CUNG ${cung.toUpperCase()} (120-160 từ)
${cungDesc}

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (tốt/khá/trung bình/yếu ở lĩnh vực này là thế nào), tên sao/cách cục KHÔNG mở đầu câu, để gọn trong ngoặc nếu cần. Căn cứ nội bộ: nhãn "Luận sao: …" của dòng [${cung}] + cách cục + độ sáng chính tinh. Cấm né tránh.
CẤM bịa "điểm cung X/10" — lá số KHÔNG có điểm cho từng cung, chỉ ĐẠI VẬN mới có điểm/10 thật.
Xuống dòng rồi viết 1-2 đoạn giải thích ngắn, dễ hiểu — không liệt kê dàn trải:
① Nhận định chính: dựa trên [CÁCH CỤC] và [Ý NGHĨA] — dịch ra hệ quả cụ thể, đây là phần quan trọng nhất.
② Kết luận thực tế: 1-2 câu về tác động cụ thể trong cuộc đời người này (chỉ nhắc tam phương tứ chính khi nó thật sự đổi kết quả).

Không liệt kê lại tên sao, không mô tả lại dữ liệu thô. Nếu cung vô chính diệu thì nói rõ phải mượn cung xung chiếu để luận (không cần nhắc chữ "xung chiếu" nếu diễn được bằng câu thường).`;
  }

  if (phan === 14) return ctx + `

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
    return ctx + `

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

  if (phan === 24) return ctx + `

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

  return ctx + `\nPhần ${phan}: Luận giải theo lá số.`;
}

// ─── Route handlers ───────────────────────────────────────────
export async function OPTIONS() { return options(); }

async function runPost(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = await parseBody(request);

  if (action === 'chat') return body.stream ? handleChatStream(body) : handleChat(body);

  const { laSoText, phan, docs, hoTen, gioiTinh } = body as { laSoText?: string; phan?: number; docs?: string; hoTen?: string; gioiTinh?: string };
  if (!laSoText || !phan) return err('Thiếu dữ liệu', 400);

  let prompt: string;
  try {
    // "Người xem: <tên> (giới tính)" lên đầu prompt → xưng hô đúng (client gửi hoTen/gioiTinh).
    const nx = nguoiXemLine(hoTen, gioiTinh);
    prompt = (nx ? nx + '\n' : '') + buildPrompt(Number(phan), laSoText, docs);
  }
  catch (e: unknown) { return err('buildPrompt error: ' + (e as Error).message); }

  try {
    const maxTok = phan === 1 ? 2000 : phan === 14 ? 3000 : phan === 24 ? 1400
      : (phan >= 2 && phan <= 13) ? 1100 : (phan >= 15 && phan <= 23) ? 1100 : 1000;

    // Prompt + dữ liệu GIỮ NGUYÊN; chỉ đổi backend provider (Gemini-primary,
    // Anthropic-backup). Bỏ cache_control (tối ưu riêng Anthropic; Gemini cache ngầm).
    //
    // Dùng llmTextFull thay llmText để LẤY ĐƯỢC usage + thời lượng: trước đây
    // route này KHÔNG ghi một dòng `llm_usage` nào, nên Luận Giải — tool bán
    // chạy nhất (1.500 Lượng / 3 người) — hoàn toàn vô hình trong panel Biên
    // Lợi Nhuận, và cũng không có số nào để đặt ETA cho 24 phần.
    const r = await llmTextFull({ system: SYSTEM_PROMPT, prompt, maxTokens: maxTok });
    const text = r.text;
    // tool_id 'laso' = ĐÚNG `tool_pricing.tool_id` của Luận Giải (events dùng
    // 'luan-giai', giao dịch dùng 'use_laso' — ba hệ tên lệch nhau, xem
    // tool_canon() trong CLAUDE.md). Ghi theo id mà GIÁ treo vào thì bucket chi
    // phí mới ghép được với bucket doanh thu.
    void logLlmUsage(
      'laso',
      r.model,
      {
        input_tokens: r.usage.input_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: r.usage.output_tokens,
      },
      r.durationMs,
    );

    let chartData = null;
    const chartMatch = text.match(/```chartdata\s*([\s\S]*?)```/);
    if (chartMatch) { try { chartData = JSON.parse(chartMatch[1].trim()); } catch { /* ignore */ } }
    const luanGiai = text.replace(/```chartdata[\s\S]*?```/, '').trim();
    return ok({ luanGiai, chartData, phan });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

// S1 (track COO) — bọc để tự ghi lượt chạy thành công/hỏng vào `events`.
// Chỉ QUAN SÁT: ngoại lệ vẫn ném lại nguyên vẹn, Response trả về không đổi.
export async function POST(request: NextRequest) {
  return withToolOutcome('lasotuvi', () => runPost(request));
}
