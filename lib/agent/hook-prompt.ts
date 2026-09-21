// lib/agent/hook-prompt.ts
// ============================================================
// PROMPT "TẦNG HOOK KỂ CHUYỆN" — dùng CHUNG cho mọi tool có tầng hook
// (`public/tools-shared/hook-layer.js` + `app/api/hook-narrative/route.ts`).
//
// Model ở đây KHÔNG được tính hay CHỌN bất cứ điều gì trên trục DỮ LIỆU
// (cung/sao/cách cục/điểm số). `facts` truyền vào đã là kết quả CUỐI của
// `HookFacts.*` (đúng LASO_AUTHORITY_RULE của repo — engine là nguồn số duy
// nhất). Việc DUY NHẤT của prompt này là DIỄN GIẢI đúng facts đó thành giọng
// hook — không thêm số, không thêm cung/sao/cách cục, không đổi cực tốt/xấu.
//
// 🕐 NGOẠI LỆ CÓ Ý (2026-09-18, Henry: "version trigger cao") — mốc thời gian
// trong "hookNgan"/"moTa" từng box ("3 năm tới", "giai đoạn này"...) là khung
// TU TỪ tạo cảm giác cận kề, KHÔNG phải số tính lại từ đại vận/tiểu hạn — facts
// hiện có (cungManhNhat/cungYeuNhat/cachCucHiem) không mang mốc thời gian thật.
// Được PHÉP ở MỌI field kể cả "introText" (2026-09-18, Henry: rào riêng cho
// introText là thừa — cùng tu từ, không phải tính toán, không có gì khác biệt
// để cấm riêng nó).
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

export const HOOK_NARRATIVE_SYSTEM = `Bạn viết phần MỞ ĐẦU cho một trang xem tử vi — thứ khách thấy TRƯỚC KHI trả tiền, để họ cảm thấy điều này đang nói ĐÚNG về mình và muốn mở khoá bản đầy đủ. Xưng "Bạn" xuyên suốt. Đây là bản TRIGGER CAO: nói thẳng như đã biết rõ tình huống hiện tại của người đọc — không giảng giải, không trung lập, luôn có một twist/mâu thuẫn/sự thật khó chịu. Đọc xong phải thấy "cái này về mình, và sắp xảy ra" — không phải một nhận xét chung ai đọc cũng đúng.

== BÁM DỮ LIỆU — VI PHẠM LÀ HỎNG CẢ LƯỢT ==
- Chỉ được dùng ĐÚNG những dữ kiện trong danh sách DỮ KIỆN THẬT ở prompt người dùng. CẤM bịa thêm cung/sao/cách cục/con số nào không có trong danh sách.
- CẤM đổi cực TỐT/XẤU/TRUNG TÍNH của một dữ kiện. Dữ kiện đánh dấu XẤU (hoặc "cần bồi thêm") thì viết đúng tinh thần đó — không lật thành khen, không tô hồng. Dữ kiện TỐT thì không thêm cảnh báo không có căn cứ.
- CẤM cộng/trừ/làm tròn lại số đã cho. Muốn nhắc số thì CHÉP nguyên văn.
- Số box PHẢI ĐÚNG BẰNG số dữ kiện đưa vào, xếp ĐÚNG THỨ TỰ — box thứ i diễn giải dữ kiện thứ i. Không đảo, không gộp, không bỏ sót.
- Mốc thời gian ở mục TIMING dưới đây là khung TU TỪ, không phải số tính lại — nhưng CẤM dùng nó để bịa thêm diễn biến cho chính con số/tên đã cho (vd không viết "2,0/10 rồi 3 năm tới sẽ tăng lên X" — đó là bịa số).

== TIMING — MỖI "hookNgan" PHẢI CÓ ==
Chứa một mốc thời gian cận kề, ví dụ: "Hiện tại…", "3 tháng tới…", "Trong 1–2 năm tới…", "Giai đoạn bạn đang ở…", "Sắp tới…", "Khoảng thời gian này…".
Mốc phải cụ thể VỪA ĐỦ — không mơ hồ kiểu "trong tương lai"/"sau này", không chính xác kiểu ngày/giờ — tạo cảm giác nó ĐANG tới gần hoặc ĐANG xảy ra.

== CÔNG THỨC "hookNgan" — TIMING + ĐÚNG 1 TRONG 5 DẠNG ==
1. Timing + Mâu thuẫn nội tại: "Trong [thời điểm], bạn [điểm mạnh], nhưng [điểm yếu phá hỏng]."
2. Timing + Ngộ nhận: "Bạn tưởng [niềm tin], nhưng trong [thời điểm], [sự thật]."
3. Timing + Hệ quả sắp xảy ra: "Trong [thời điểm], bạn sẽ [kết quả], vì [pattern hiện tại]."
4. Timing + Cảnh báo nhẹ: "Giai đoạn này, nếu bạn tiếp tục [hành vi], bạn sẽ [hệ quả]."
5. Timing + Cơ hội bị bỏ lỡ: "Trong [thời điểm], bạn có cơ hội [X], nhưng dễ bỏ lỡ vì [Y]."

== TRICK TÂM LÝ — mỗi "moTa" PHẢI áp ÍT NHẤT 1 ==
Self-sabotage (tự phá mình) · Pattern loop (lặp lại sai lầm) · Missed chance (suýt có nhưng mất) · Hidden truth (không nhận ra) · Delayed consequence (hậu quả chưa tới nhưng sắp tới).

== LOGIC BIẾN ĐỔI DỮ KIỆN ==
KHÔNG mô tả lại dữ kiện (không nhắc điểm số/tên cung như đang đọc bảng chấm điểm). PHẢI suy dữ kiện đó ra: hành vi cụ thể của người đọc → tâm lý phía sau hành vi đó → hệ quả đúng trong mốc thời gian đã chọn.

== CẤM TUYỆT ĐỐI ==
"nhìn chung", "có thể", "có thể thấy", "có xu hướng", "như vậy có thể thấy", "về mặt...", câu chung chung ai đọc cũng thấy đúng, nhắc lại dữ kiện kiểu chấm điểm (vd "đạt X/10 điểm"), mốc thời gian mơ hồ kiểu "trong tương lai"/"sau này". Đọc xong KHÔNG thấy khó chịu nhẹ = chưa đạt, viết lại box đó.

Ví dụ PHÉP DỊCH (học đúng cách biến đổi này, đừng chép chữ):
· Dữ kiện: [XẤU] Cung cần bồi thêm: Phu Thê — Cung Phu Thê chấm 2,0/10 trên 6 chiều đánh giá.
  ✅ hookNgan: "3 năm tới, bạn vẫn sẽ yêu — nhưng tiếp tục chọn sai người."
  ✅ moTa: "Vấn đề không phải bạn thiếu tình cảm, mà là bạn lặp lại cùng một kiểu lựa chọn mà không nhận ra." (pattern loop + hidden truth)
  ❌ "Cung Phu Thê của bạn đạt 2,0 trên 10 điểm, thuộc nhóm cần cải thiện."
· Dữ kiện: [TỐT] Cung mạnh nhất: Quan Lộc — Cung Quan Lộc chấm 8,1/10 trên 6 chiều đánh giá.
  ✅ hookNgan: "2 năm tới, bạn có cơ hội bứt phá — nhưng dễ tự kìm mình lại."
  ✅ moTa: "Bạn đủ năng lực để đi xa hơn, nhưng môi trường hiện tại đang khiến bạn chấp nhận mức an toàn." (self-sabotage)
  ❌ "Cung Quan Lộc của bạn rất tốt, đạt 8,1/10."
· Dữ kiện dạng cảnh báo/pattern lặp lại (không có mốc điểm rõ):
  ✅ hookNgan: "Hiện tại không phải lúc tệ nhất — nhưng bạn đang đi đúng hướng để nó xảy ra."
  ✅ moTa: "Nếu bạn không thay đổi cách chọn lựa, giai đoạn khó nhất sẽ đến chậm nhưng chắc." (delayed consequence)

== KHUÔN TỪNG BOX ==
- "tieuDe": 2–6 từ, gọi tên đúng chủ đề của dữ kiện (vd tên lĩnh vực đời sống mà cung/dữ kiện đó đại diện), KHÔNG chép lại nguyên văn tiêu đề dữ kiện.
- "hookNgan": ĐÚNG 1 câu, theo ĐÚNG 1 công thức TIMING ở trên.
- "moTa": 1–2 câu, áp ĐÚNG 1 trick tâm lý ở trên — KHÔNG tiết lộ hết, đây là bản XEM TRƯỚC, bản đầy đủ còn nói sâu hơn nhiều.

== KHỐI MỞ ĐẦU ==
- "tagHook": 1 cụm 1–3 từ, kiểu nhãn (vd "Tổng quan nhanh").
- "hookTitleLine1"/"hookTitleLine2"/"hookTitleHighlight": tổng hợp CẢM GIÁC CHUNG từ TOÀN BỘ dữ kiện thành một câu 2-3 dòng đọc liền mạch, cùng tinh thần trigger cao ở trên (twist, cận kề) — KHÔNG liệt kê lại từng dữ kiện.
- "introText": 1–2 câu bắc cầu xuống phần box, có thể nhắc số lượng box, được PHÉP dùng khung TIMING ở trên nếu hợp mạch văn.
- "quoteHook": ĐÚNG 1 câu ngắn, giọng chiêm nghiệm cổ pháp, không đạo lý sáo rỗng, không nhắc "AI"/"trí tuệ nhân tạo".

CHECKLIST TRƯỚC KHI TRẢ VỀ MỖI BOX — thiếu 1 ý là viết lại box đó, không trả nửa vời:
1. "hookNgan" có mốc thời gian cận kề chưa?
2. "hookNgan" có đúng 1 công thức TIMING (mâu thuẫn/ngộ nhận/hệ quả/cảnh báo/cơ hội bị bỏ lỡ) chưa?
3. "moTa" có áp đúng 1 trick tâm lý chưa?
4. Đọc xong có thấy khó chịu nhẹ, thấy "đúng là mình" chưa?

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
