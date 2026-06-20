// lib/tools/registry.ts
// ============================================================
// TOOL LAYER (Sprint 0.2) — các "tool" agent gọi, chạy in-process.
//
// LLM KHÔNG tự bịa số liệu: mọi con số/sao/điểm đều do engine
// deterministic hoặc RAG trả về qua các tool dưới đây.
//
//   lap_la_so        → tính lá số server-side (lib/engine/laso)
//   tinh_van_han     → tiểu vận một năm (cần lá số đã lập)
//   xem_ngay_tot     → ngày tốt theo việc/tháng (tuvi-engine)
//   tra_cuu_tri_thuc → RAG trên sách tử vi (OpenAI embed + Supabase)
// ============================================================

import {
  computeMonth,
  topDaysForActivity,
  ACTIVITY_META,
  ACTIVITY_LIST,
  type ActivityKey,
} from '../../tuvi-engine/dist/ngay-tot/index.js';
import { computeLaso, formatLasoContext, lasoSummary, type Laso } from '@/lib/engine/laso';

type Rec = Record<string, unknown>;

// Trạng thái dùng chung trong MỘT request (lá số đã lập được
// chia sẻ cho các tool sau như tinh_van_han).
export interface ToolContext {
  ls: Laso | null;
}

export function newToolContext(seedLs: Laso | null = null): ToolContext {
  return { ls: seedLs };
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
    {
      name: 'tinh_van_han',
      description:
        'Tra vận hạn (tiểu vận) của lá số ĐÃ LẬP cho một năm dương lịch cụ thể: điểm vận năm (0–10), xu hướng lên/xuống, cung tiểu hạn, cung lưu niên đại hạn, số sao cát/sát. Chỉ gọi sau khi đã lập lá số (lap_la_so).',
      input_schema: {
        type: 'object',
        properties: { nam: { type: 'integer', description: 'Năm dương lịch, ví dụ 2027' } },
        required: ['nam'],
      },
    },
    {
      name: 'xem_ngay_tot',
      description:
        'Tìm ngày tốt nhất trong một tháng để làm việc trọng đại, chấm theo 12 trực · 28 tú · sao hoàng/hắc đạo · ngày kỵ cổ truyền. Không cần lá số.',
      input_schema: {
        type: 'object',
        properties: {
          viec: {
            type: 'string',
            enum: ACTIVITY_LIST as readonly string[],
            description:
              'Loại việc: ' +
              (ACTIVITY_LIST as readonly string[])
                .map((k) => `${k}=${ACTIVITY_META[k as ActivityKey]?.name || k}`)
                .join(', '),
          },
          thang: { type: 'integer', description: 'Tháng 1–12' },
          nam: { type: 'integer', description: 'Năm dương lịch (2020–2036)' },
        },
        required: ['viec', 'thang', 'nam'],
      },
    },
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
  switch (name) {
    case 'lap_la_so':
      return execLapLaSo(input, ctx);
    case 'tinh_van_han':
      return { content: execTinhVanHan(input, ctx), label: 'Đang tra vận hạn...' };
    case 'xem_ngay_tot':
      return { content: execXemNgayTot(input), label: 'Đang xem ngày tốt...' };
    case 'tra_cuu_tri_thuc':
      return { content: await execTraCuu(input), label: 'Đang tra cứu sách cổ...' };
    default:
      return { content: 'Công cụ không tồn tại.', label: 'Công cụ lạ' };
  }
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

function execTinhVanHan(input: Rec, ctx: ToolContext): string {
  const nam = Number(input?.nam);
  if (!nam) return 'Thiếu tham số năm.';
  if (!ctx.ls) return 'Chưa có lá số. Hãy lập lá số (lap_la_so) trước khi tra vận hạn.';

  const ls = ctx.ls;
  const tvs = ls.tieuVanScores as Rec[] | undefined;
  if (!Array.isArray(tvs) || !tvs.length) {
    return 'Lá số này chưa có dữ liệu tiểu vận theo năm — hãy luận theo đại vận hiện tại trong dữ liệu lá số.';
  }
  const tv = tvs.find((t) => Number(t.nam) === nam);
  if (!tv) {
    const yrs = tvs.map((t) => Number(t.nam));
    return `Năm ${nam} ngoài phạm vi lá số (chỉ có ${Math.min(...yrs)}–${Math.max(...yrs)}).`;
  }
  const palaces = (ls.palaces as Rec[]) || [];
  const starsOf = (cungName: string): string => {
    const p = palaces.find((x) => x.cungName === cungName);
    if (!p) return '';
    const major = ((p.majorStars as Rec[]) || []).map((s) => s.ten).filter(Boolean).join(', ');
    return major || 'vô chính diệu';
  };
  const dir = tv.direction === 'up' ? 'xu hướng đi lên' : tv.direction === 'down' ? 'xu hướng đi xuống' : 'đi ngang';
  const dv = ((ls.daiVans as Rec[]) || [])[tv.dvIdx as number] as Rec | undefined;
  let out = `TIỂU VẬN NĂM ${nam} (tuổi ${tv.tuoi}):\n`;
  out += `- Điểm vận năm: ${tv.mainScore}/10, ${dir} (${tv.catCount} sao cát, ${tv.satCount} sao sát trong tổ hợp 3 cung hạn).\n`;
  out += `- Tiểu hạn nhập cung ${tv.tieuHanCung} — chính tinh: ${starsOf(String(tv.tieuHanCung)) || '?'}.\n`;
  out += `- Lưu niên đại hạn vào cung ${tv.luuNienCung} — chính tinh: ${starsOf(String(tv.luuNienCung)) || '?'}.\n`;
  if (dv) {
    const sc = dv.scoring as Rec | undefined;
    out += `- Thuộc đại vận ${dv.diaChi} (${dv.tuoiStart}–${dv.tuoiEnd} tuổi)${sc?.tong != null ? `, điểm đại vận ${sc.tong}/10 ${sc.flag || ''}` : ''}.\n`;
  }
  return out;
}

function execXemNgayTot(input: Rec): string {
  const key = String(input?.viec || '') as ActivityKey;
  const thang = Number(input?.thang);
  const nam = Number(input?.nam);
  if (!(ACTIVITY_LIST as readonly string[]).includes(key))
    return `Việc "${input?.viec}" không hỗ trợ. Các việc: ${(ACTIVITY_LIST as readonly string[]).join(', ')}.`;
  if (!(nam >= 2020 && nam <= 2036)) return `Năm ${nam} ngoài phạm vi (2020–2036).`;
  if (!(thang >= 1 && thang <= 12)) return `Tháng ${thang} không hợp lệ.`;
  const meta = ACTIVITY_META[key];
  const top = topDaysForActivity(computeMonth(nam, thang), key, 6);
  if (!top.length)
    return `Tháng ${thang}/${nam} không có ngày đạt điểm ≥6 để ${meta.name.toLowerCase()} — nên cân nhắc tháng khác.`;
  let out = `NGÀY TỐT để ${meta.name} — tháng ${thang}/${nam} (top ${top.length}):\n`;
  for (const { info, score } of top) {
    const gio = (info.gioHoangDao || []).map((g) => g.chi).slice(0, 4).join(', ');
    out += `- ${info.duongLich.day}/${info.duongLich.month} (${info.thuTrongTuan}, ÂL ${info.amLich.day}/${info.amLich.month}), can chi ${info.canChiNgay}, trực ${info.truc}: ${score.score}/10 ${score.level}`;
    if (score.reasons?.length) out += ` — ${score.reasons.slice(0, 2).join('; ')}`;
    if (gio) out += ` — giờ tốt: ${gio}`;
    out += '\n';
  }
  return out;
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
