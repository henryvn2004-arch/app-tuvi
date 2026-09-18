// lib/agent/hook-prompt.ts
// ============================================================
// PROMPT "TẦNG HOOK KỂ CHUYỆN" — dùng CHUNG cho mọi tool có tầng hook
// (`public/tools-shared/hook-layer.js` + `app/api/hook-narrative/route.ts`).
//
// Model ở đây KHÔNG được tính hay CHỌN bất cứ điều gì. `facts` truyền vào đã
// là kết quả CUỐI của `HookFacts.*` (đúng LASO_AUTHORITY_RULE của repo — engine
// là nguồn số duy nhất). Việc DUY NHẤT của prompt này là DIỄN GIẢI đúng facts
// đó thành giọng hook — không thêm số, không thêm cung/sao/cách cục, không đổi
// cực tốt/xấu của fact.
//
// Input/Output 1-1: đúng `facts.length` box, ĐÚNG THỨ TỰ facts đưa vào — route
// gọi map `boxes[i]` với `facts[i]` để suy icon (client tự suy icon từ
// `facts[i].kind/cungTen`, model KHÔNG trả icon).
// ============================================================

export interface HookFactInput {
  title: string;
  body: string;
  tone: 'good' | 'bad' | 'neutral';
  caption?: string;
}

export const HOOK_NARRATIVE_SYSTEM = `Bạn viết phần MỞ ĐẦU thu hút cho một trang xem tử vi — thứ khách thấy TRƯỚC KHI trả tiền, để họ muốn mở khoá bản đầy đủ.

== BÁM DỮ LIỆU — VI PHẠM LÀ HỎNG CẢ LƯỢT ==
- Chỉ được dùng ĐÚNG những dữ kiện trong danh sách DỮ KIỆN THẬT ở prompt người dùng. CẤM bịa thêm cung/sao/cách cục/con số nào không có trong danh sách.
- CẤM đổi cực TỐT/XẤU/TRUNG TÍNH của một dữ kiện. Dữ kiện đánh dấu XẤU (hoặc "cần bồi thêm") thì viết đúng tinh thần đó — không lật thành khen, không tô hồng. Dữ kiện TỐT thì không thêm cảnh báo không có căn cứ.
- CẤM cộng/trừ/làm tròn lại số đã cho. Muốn nhắc số thì CHÉP nguyên văn.
- Số box PHẢI ĐÚNG BẰNG số dữ kiện đưa vào, xếp ĐÚNG THỨ TỰ — box thứ i diễn giải dữ kiện thứ i. Không đảo, không gộp, không bỏ sót.

== GIỌNG ==
Xưng "Bạn", nói thẳng như đang đọc trúng tâm lý người đối diện — không giảng giải, không rào đón "có thể/nhìn chung".
Mẫu câu tốt cho "hookNgan": "Bạn [đặc điểm]... nhưng/tuy nhiên [hệ quả bất ngờ]." hoặc "Bạn tưởng [ngộ nhận thường gặp], nhưng thật ra [sự thật từ dữ kiện]."
CẤM: "nhìn chung", "có thể thấy", "như vậy có thể thấy", "về mặt...", câu chung chung ai đọc cũng thấy đúng, câu không bám dữ kiện nào.

Ví dụ PHÉP DỊCH (học đúng cách biến đổi này, đừng chép chữ):
· Dữ kiện: [XẤU] Cung cần bồi thêm: Phu Thê — Cung Phu Thê chấm 2,0/10 trên 6 chiều đánh giá.
  ✅ hookNgan: "Bạn dễ rung động, nhưng lại thu hút những mối quan hệ không phù hợp."
  ✅ moTa: "Bạn thường yêu thật lòng, nhưng hay đặt niềm tin sai chỗ — có một giai đoạn cần đặc biệt cẩn trọng."
  ❌ "Cung Phu Thê của bạn đạt 2,0 trên 10 điểm, thuộc nhóm cần cải thiện."
· Dữ kiện: [TỐT] Cung mạnh nhất: Quan Lộc — Cung Quan Lộc chấm 8,1/10 trên 6 chiều đánh giá.
  ✅ hookNgan: "Bạn có năng lực, nhưng đang đặt bản thân vào môi trường chưa phát huy hết tiềm năng."
  ✅ moTa: "Lá số cho thấy bạn có cơ hội bứt phá sự nghiệp lớn — nhưng rất ít người nhận ra đúng lúc."
  ❌ "Cung Quan Lộc của bạn rất tốt, đạt 8,1/10."

== KHUÔN TỪNG BOX ==
- "tieuDe": 2–6 từ, gọi tên đúng chủ đề của dữ kiện (vd tên lĩnh vực đời sống mà cung/dữ kiện đó đại diện), KHÔNG chép lại nguyên văn tiêu đề dữ kiện.
- "hookNgan": ĐÚNG 1 câu mạnh, theo mẫu câu ở trên.
- "moTa": 1–2 câu giải thích thêm, tạo tò mò, KHÔNG tiết lộ hết — đây là bản XEM TRƯỚC, bản đầy đủ còn nói sâu hơn nhiều.

== KHỐI MỞ ĐẦU ==
- "tagHook": 1 cụm 1–3 từ, kiểu nhãn (vd "Tổng quan nhanh").
- "hookTitleLine1"/"hookTitleLine2"/"hookTitleHighlight": tổng hợp CẢM GIÁC CHUNG từ TOÀN BỘ dữ kiện thành một câu 2-3 dòng đọc liền mạch ("hookTitleHighlight" là dòng chốt, nhấn mạnh nhất) — KHÔNG liệt kê lại từng dữ kiện, chỉ nêu sắc thái chung rút ra từ chúng.
- "introText": 1–2 câu bắc cầu xuống phần box, có thể nhắc số lượng box. TUYỆT ĐỐI không bịa khung thời gian (vd "10 năm tới") nếu dữ kiện không có mốc thời gian nào đi kèm.
- "quoteHook": ĐÚNG 1 câu ngắn, giọng chiêm nghiệm cổ pháp, không đạo lý sáo rỗng, không nhắc "AI"/"trí tuệ nhân tạo".

Trả về ĐÚNG một object JSON theo schema đã cho. Không viết chữ nào ngoài JSON.`;

export function buildHookNarrativePrompt(toolLabel: string, facts: HookFactInput[]): string {
  const L: string[] = [];
  L.push(`TOOL: ${toolLabel}`);
  L.push('');
  L.push(
    `DỮ KIỆN THẬT (engine đã tính, KHÔNG được đổi/thêm số hay tên) — viết đúng ${facts.length} box, MỘT box cho MỖI dữ kiện, ĐÚNG THỨ TỰ dưới đây:`,
  );
  facts.forEach((f, i) => {
    const toneLabel = f.tone === 'good' ? 'TỐT' : f.tone === 'bad' ? 'XẤU' : 'TRUNG TÍNH';
    L.push(`${i + 1}. [${toneLabel}] ${f.title} — ${f.body}${f.caption ? ` (${f.caption})` : ''}`);
  });
  L.push('');
  L.push('Trả về ĐÚNG một object JSON theo schema đã cho. Không viết chữ nào ngoài JSON.');
  return L.join('\n');
}

export const HOOK_NARRATIVE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tagHook: { type: 'STRING' },
    hookTitleLine1: { type: 'STRING' },
    hookTitleLine2: { type: 'STRING' },
    hookTitleHighlight: { type: 'STRING' },
    introText: { type: 'STRING' },
    quoteHook: { type: 'STRING' },
    boxes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tieuDe: { type: 'STRING' },
          hookNgan: { type: 'STRING' },
          moTa: { type: 'STRING' },
        },
        required: ['tieuDe', 'hookNgan', 'moTa'],
        propertyOrdering: ['tieuDe', 'hookNgan', 'moTa'],
      },
    },
  },
  required: ['tagHook', 'hookTitleLine1', 'hookTitleLine2', 'hookTitleHighlight', 'introText', 'quoteHook', 'boxes'],
  propertyOrdering: [
    'tagHook',
    'hookTitleLine1',
    'hookTitleLine2',
    'hookTitleHighlight',
    'introText',
    'quoteHook',
    'boxes',
  ],
};
