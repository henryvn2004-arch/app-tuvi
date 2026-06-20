// lib/tools/registry.ts
// ============================================================
// TOOL LAYER cho /api/v1/chat. Nhóm vận-hạn/ngày-tốt DÙNG CHUNG
// lõi lib/agent/tools.ts (một bộ não — xem docs). Chỉ còn 2 tool
// đặc thù cổng v1 định nghĩa tại đây:
//
//   lap_la_so        → tính lá số SERVER-SIDE từ birth (lib/engine/laso)
//   tra_cuu_tri_thuc → RAG sách tử vi (OpenAI embed + Supabase)
//
// Nhóm dùng chung (từ lib/agent/tools):
//   tra_tieu_van · tra_nguyet_van · tra_nhat_van · xem_ngay_tot
// ============================================================

import { computeLaso, formatLasoContext, lasoSummary, type Laso } from '@/lib/engine/laso';
import { buildTools, execLasoTool, toolLabel } from '@/lib/agent/tools';

type Rec = Record<string, unknown>;

// Trạng thái dùng chung trong MỘT request (lá số đã lập được
// chia sẻ cho các tool sau như tra_tieu_van).
export interface ToolContext {
  ls: Laso | null;
}

export function newToolContext(seedLs: Laso | null = null): ToolContext {
  return { ls: seedLs };
}

// Các tool cần lá số đã lập (guard nếu chưa có).
const LASO_TOOLS = new Set(['tra_tieu_van', 'tra_nguyet_van', 'tra_nhat_van']);

function currentYearVN(): number {
  return Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()),
  );
}

// ── Định nghĩa tool (Anthropic tool-use schema) ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildToolDefs(): any[] {
  return [
    {
      name: 'lap_la_so',
      description:
        'Lập lá số Tử Vi Đẩu Số từ ngày sinh DƯƠNG lịch. Gọi tool này NGAY khi đã biết đủ ngày/tháng/năm sinh dương lịch, giờ sinh và giới tính. Trả về toàn bộ 12 cung, sao, điểm, cách cục, đại vận — dùng làm cơ sở luận giải. Nếu còn thiếu thông tin thì HỎI người dùng trước, không được đoán.',
      input_schema: {
        type: 'object',
        properties: {
          day: { type: 'integer', description: 'Ngày sinh dương lịch (1–31)' },
          month: { type: 'integer', description: 'Tháng sinh dương lịch (1–12)' },
          year: { type: 'integer', description: 'Năm sinh dương lịch, ví dụ 1998' },
          hourBranch: {
            type: 'integer',
            description:
              'Giờ sinh theo địa chi: 0=Tý(23–1h) 1=Sửu(1–3h) 2=Dần(3–5h) 3=Mão(5–7h) 4=Thìn(7–9h) 5=Tỵ(9–11h) 6=Ngọ(11–13h) 7=Mùi(13–15h) 8=Thân(15–17h) 9=Dậu(17–19h) 10=Tuất(19–21h) 11=Hợi(21–23h)',
          },
          gender: { type: 'string', enum: ['nam', 'nu'], description: 'Giới tính' },
        },
        required: ['day', 'month', 'year', 'hourBranch', 'gender'],
      },
    },
    // Nhóm vận-hạn/ngày-tốt: dùng CHUNG lõi lib/agent (hasLaso=true).
    ...buildTools(true),
    {
      name: 'tra_cuu_tri_thuc',
      description:
        'Tra cứu tri thức tử vi từ thư viện sách cổ (ý nghĩa sao, cách cục, luận đoán). Dùng khi cần dẫn chứng học thuật hoặc giải thích sâu một khái niệm.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Câu truy vấn tri thức, ví dụ "Cự Môn hóa Kỵ tại Mệnh"' },
        },
        required: ['query'],
      },
    },
  ];
}

// ── Kết quả 1 lần chạy tool ─────────────────────────────────
export interface ToolRunResult {
  /** text trả lại model (đưa vào tool_result) */
  content: string;
  /** nhãn ngắn hiển thị cho client (event status) */
  label: string;
}

// ── Dispatcher ──────────────────────────────────────────────
export async function executeTool(name: string, input: Rec, ctx: ToolContext): Promise<ToolRunResult> {
  if (name === 'lap_la_so') return execLapLaSo(input, ctx);
  if (name === 'tra_cuu_tri_thuc') {
    return { content: await execTraCuu(input), label: 'Đang tra cứu sách cổ...' };
  }

  // Nhóm dùng chung lõi lib/agent.
  if (name === 'xem_ngay_tot' || LASO_TOOLS.has(name)) {
    if (LASO_TOOLS.has(name) && !ctx.ls) {
      return { content: 'Chưa có lá số. Hãy lập lá số (lap_la_so) trước khi tra vận hạn.', label: toolLabel(name) };
    }
    // Lưới an toàn: tra_tieu_van thiếu năm → mặc định năm hiện tại (VN).
    const arg = name === 'tra_tieu_van' && !input?.nam ? { ...input, nam: currentYearVN() } : input;
    return { content: execLasoTool(name, ctx.ls, arg), label: toolLabel(name) };
  }

  return { content: 'Công cụ không tồn tại.', label: 'Công cụ lạ' };
}

function execLapLaSo(input: Rec, ctx: ToolContext): ToolRunResult {
  const res = computeLaso({
    day: Number(input.day),
    month: Number(input.month),
    year: Number(input.year),
    hourBranch: Number(input.hourBranch),
    gender: input.gender === 'nu' ? 'nu' : 'nam',
  });
  if (!res.ok || !res.ls) {
    return { content: 'Không lập được lá số: ' + (res.error || 'lỗi không rõ'), label: 'Lỗi lập lá số' };
  }
  ctx.ls = res.ls;
  return {
    content: 'ĐÃ LẬP LÁ SỐ. Dữ liệu (chỉ luận trên đây, không bịa thêm):\n\n' + formatLasoContext(res.ls),
    label: 'Đang lập lá số — ' + (lasoSummary(res.ls) || '...'),
  };
}

// RAG: OpenAI embeddings + Supabase pgvector rpc (port từ app/api/search)
async function execTraCuu(input: Rec): Promise<string> {
  const query = String(input?.query || '').slice(0, 1000);
  if (!query) return 'Thiếu câu truy vấn.';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return 'Tra cứu tri thức tạm thời không khả dụng (thiếu cấu hình).';
  }
  try {
    const embResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ input: query, model: 'text-embedding-3-small', dimensions: 1024 }),
    });
    if (!embResp.ok) throw new Error('OpenAI error');
    const embedding = (await embResp.json()).data[0].embedding;

    const searchResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_tuvi_docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ query_embedding: embedding, match_count: 6, match_threshold: 0.55 }),
    });
    if (!searchResp.ok) throw new Error('Supabase error');
    const results = (await searchResp.json()) as { source: string; content: string }[];
    if (!results.length) return 'Không tìm thấy tài liệu liên quan trong thư viện.';
    return results.map((r) => `[${r.source}]\n${r.content}`).join('\n\n---\n\n');
  } catch (e) {
    return 'Lỗi tra cứu: ' + (e instanceof Error ? e.message : 'không rõ');
  }
}
