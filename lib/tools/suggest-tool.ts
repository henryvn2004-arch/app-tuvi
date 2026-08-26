// lib/tools/suggest-tool.ts
// ============================================================
// BƯỚC 4 — gợi ý công cụ NGAY TRONG lúc trò chuyện.
//
// Model nhận ra câu hỏi cần một phép tính mà rail không có → gọi tool
// `goi_y_cong_cu`, server tra danh mục rồi trả về một thẻ có nút bấm.
//
// 🔑 VÌ SAO PHẢI LÀ TOOL, KHÔNG PHẢI ĐỂ MODEL VIẾT CHỮ:
// để model tự viết "bạn nên dùng tool Tử Vi Công Sở" thì (a) nó bịa ra tên
// tool không tồn tại, (b) không bấm được, (c) không đo được có ai bấm không.
// Đi qua đây thì tool_id được ĐỐI CHIẾU với `tool_pricing` — bịa là rơi.
//
// ⛔ CỐ Ý KHÔNG ĐỌC CỘT GIÁ và không trả giá về client (Henry chốt):
// người chat thường xuyên vốn đã mua gói, dán giá vào đúng lúc đang cần giúp
// biến một lời chỉ đường thành một lời chào hàng. Thẻ chỉ có TÊN + LÝ DO.
// (Cũng nhờ vậy không đụng `check:prices`: không có ô giá nào để mà lệch.)
// ============================================================

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

export interface ToolSuggestion {
  toolId: string;
  label: string;
  /**
   * Đường dẫn mở tool trong Luận Đường. KHÔNG cho phép null: tool thiếu
   * `app_path` thì `resolveToolSuggestion` trả null cả thẻ, chứ không dựng một
   * thẻ có nút bấm dẫn đi đâu không biết.
   */
  path: string;
  /** Một câu vì sao nó giúp được — do model viết, đã cắt trần. */
  lyDo: string;
}

const MAX_LY_DO = 140;

/**
 * Tra danh mục và dựng thẻ gợi ý. Trả null khi tool không tồn tại / đang tắt /
 * không có trang để mở — thà không gợi ý còn hơn dẫn người ta tới trang 404.
 *
 * `dangMo` = tool người dùng ĐANG đứng trong đó; gợi ý lại chính nó là vô nghĩa
 * và làm thẻ trông như quảng cáo mù.
 */
export async function resolveToolSuggestion(
  toolId: unknown,
  lyDo: unknown,
  dangMo?: string | null,
): Promise<ToolSuggestion | null> {
  const id = String(toolId || '').trim().toLowerCase();
  if (!id || !/^[a-z0-9-]{2,60}$/.test(id)) return null;
  if (dangMo && id === String(dangMo).toLowerCase()) return null;
  if (!SB_URL || !SB_KEY) return null;

  const why = String(lyDo || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LY_DO);
  if (!why) return null;

  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/tool_pricing?tool_id=eq.${encodeURIComponent(id)}` +
        `&enabled=eq.true&select=tool_id,label,app_path&limit=1`,
      {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { tool_id: string; label?: string; app_path?: string }[];
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;

    // Đường dẫn phải do DANH MỤC cấp, không tự ghép '/app/'+id: tool đổi route
    // là thẻ dẫn vào chỗ chết mà không có gì báo.
    const path = typeof row.app_path === 'string' && row.app_path.startsWith('/') ? row.app_path : null;
    if (!path) return null;

    return { toolId: row.tool_id, label: String(row.label || row.tool_id), path, lyDo: why };
  } catch {
    return null;
  }
}

// Mô tả tool — đây là chỗ luật "KHÉO THÔI" thật sự sống. Model đọc cái này để
// quyết khi nào im, nên nó phải nói rõ hơn về lúc KHÔNG gợi ý so với lúc gợi ý.
export const SUGGEST_TOOL_DEF = {
  name: 'goi_y_cong_cu',
  description:
    'Chỉ cho người dùng MỘT công cụ trên trang khi câu họ vừa hỏi cần một phép tính hoặc một bảng mà bạn KHÔNG tự làm ra được trong khung chat này. ' +
    'DÙNG RẤT DÈ: mặc định là KHÔNG gọi. Chỉ gọi khi cả bốn điều sau cùng đúng — ' +
    '(1) họ đang hỏi một việc cụ thể, không phải đang tâm sự; ' +
    '(2) câu trả lời tử tế cần dữ liệu bạn không có (vd chọn ngày cưới, xem tuổi hai người, chấm điểm tên, lá số của một người khác); ' +
    '(3) bạn đã trả lời họ tử tế TRƯỚC rồi mới chỉ đường, không dùng công cụ để né trả lời; ' +
    '(4) trong cả cuộc trò chuyện này bạn CHƯA gọi lần nào. ' +
    'TUYỆT ĐỐI KHÔNG gọi khi: người ta đang buồn/bế tắc/kể chuyện riêng · câu hỏi bạn đã trả lời trọn vẹn · chỉ để lấp chỗ trống · hoặc để bán hàng. ' +
    'Thà im lặng còn hơn chỉ đường sai lúc — người đang cần được nghe mà bị mời dùng công cụ thì thấy mình bị bán hàng. ' +
    'KHÔNG nhắc giá, KHÔNG nói "mua", KHÔNG nói "chỉ với N Lượng" — hệ thống tự lo phần đó. Cũng KHÔNG cần nhắc lại trong lời văn rằng bạn vừa gợi ý; thẻ tự hiện ra.',
  input_schema: {
    type: 'object',
    properties: {
      tool_id: {
        type: 'string',
        description:
          'Mã công cụ, vd "chon-ngay-tot", "xem-tuoi", "ngu-hanh-ten", "cong-so", "day-con". Sai mã thì hệ thống bỏ qua — đừng đoán bừa.',
      },
      ly_do: {
        type: 'string',
        description:
          'MỘT câu ngắn (tối đa 140 ký tự) nói công cụ đó giúp được gì cho ĐÚNG điều họ vừa hỏi. Viết như đang chỉ đường, không như quảng cáo.',
      },
    },
    required: ['tool_id', 'ly_do'],
  },
};
