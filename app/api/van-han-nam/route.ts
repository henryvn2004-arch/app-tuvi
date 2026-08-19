// app/api/van-han-nam/route.ts
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { computeLaso, formatLaSoV2, type Laso } from '@/lib/engine/laso';
import { SYSTEM_PROMPT, buildPrompt, laSoContextFor } from '@/lib/agent/luan-giai-doc';
import { nguoiXemLine } from '@/lib/agent/prompts';
import { buildKhung12Thang, describeThangForLLM, addMonths, SO_THANG } from '@/lib/engine/van-han-12';
import { llmTextFull } from '@/lib/llm/complete';
import { logLlmUsage } from '@/lib/agent/usage';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import type { BirthParams } from '@/lib/contract/v1';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = Record<string, any>;

// ─── Bố cục 16 phần ────────────────────────────────────────────
// 4 phần đầu KHÔNG có prompt riêng — chúng gọi ĐÚNG `buildPrompt` của bản Luận
// Giải (lib/agent/luan-giai-doc.ts). Tool này là LÁT CẮT SÂU của bản luận đó,
// nên nói khác đi ở cùng một phần là hai bản trôi khỏi nhau.
//   1 → phần 1  Tổng quan lá số
//   2 → phần 14 Hành trình cuộc đời (9 đại vận)
//   3 → phần 14+n Đại vận HIỆN TẠI (n = số thứ tự đại vận đang đi)
//   4 → phần 24 Tiểu vận năm nay
//   5..16 → 12 nguyệt vận (MỚI — prompt ở `buildPromptThang` dưới)
const TONG_PHAN = 4 + SO_THANG;
const PHAN_THANG_DAU = 5;

/** Số thứ tự (1-based) của đại vận đang đi. Không tra được → 1 (đại vận đầu). */
function dvHienTaiSo(ls: Laso): number {
  const dvs = (ls.daiVans as AnyRec[]) || [];
  const cur = ls.daiVanHienTai as AnyRec | undefined;
  if (!cur) return 1;
  const i = dvs.findIndex((d) => d && d.cungIdx === cur.cungIdx && d.tuoiStart === cur.tuoiStart);
  // Bản luận chỉ có prompt cho ĐV1–ĐV9 (phần 15–23). Đại vận thứ 10+ (trên 90
  // tuổi) không có khối chấm điểm nên kẹp về 9 thay vì trỏ vào phần không tồn tại.
  return i >= 0 ? Math.min(i + 1, 9) : 1;
}

/** Nhãn 16 phần — client dựng mục lục từ đây (qua `action=khung`), KHÔNG chép
 *  tay bản thứ hai. CỐ Ý không `export`: Next App Router chỉ nhận GET/POST/… làm
 *  export của route file, thêm export lạ là gãy bản dựng. */
function phanLabels(ls: Laso | null, tuThang: number, tuNam: number): string[] {
  const dv = ls ? ((ls.daiVans as AnyRec[]) || [])[dvHienTaiSo(ls) - 1] : null;
  const L = [
    '',
    'Tổng quan lá số',
    'Hành trình cuộc đời',
    dv ? `Đại vận hiện tại (${dv.tuoiStart}–${dv.tuoiEnd}t)` : 'Đại vận hiện tại',
    'Tiểu vận năm nay',
  ];
  for (let i = 0; i < SO_THANG; i++) {
    const { thang, nam } = addMonths(tuThang, tuNam, i);
    L.push(`Tháng ${thang}/${nam}`);
  }
  return L;
}

// ─── Prompt phần THÁNG (phần MỚI duy nhất của tool này) ────────
function buildPromptThang(
  ls: Laso,
  thang: number,
  nam: number,
  stt: number,
  docs?: string,
): string {
  const khoiThang = describeThangForLLM(ls as AnyRec, thang, nam);
  // Lá số cắt theo khuôn phần 24 (tiểu vận & năm xem): đầu lá số + khối 9 đại
  // vận + cách cục — đúng thứ cần để đặt tháng vào khung năm, không kéo cả 12
  // cung vào cho loãng.
  const laSoCat = laSoContextFor(24, formatLaSoV2(ls));
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';

  return `${laSoCat}

${khoiThang}${docsSection}

PHẦN ${4 + stt} — NGUYỆT VẬN THÁNG ${thang}/${nam} (140-180 từ)
Đây là tháng thứ ${stt} trong 12 tháng tới. Người đọc đang xem một bản riêng về VẬN HẠN — họ cần biết tháng này NÊN LÀM GÌ và NÉ GÌ, không cần học lại lý thuyết.

⚠️ CĂN CỨ NỘI BỘ, BẮT BUỘC BÁM ĐÚNG (dùng để KHÔNG bịa, không phải để liệt kê hết cho người đọc):
- Cung nguyệt hạn + sao tọa thủ/xung chiếu/tam hợp của ĐÚNG khối "THÁNG ${thang}/${nam}" ở trên. TRỌNG SỐ: tọa thủ nặng nhất → xung chiếu → tam hợp. Cung vô chính diệu thì MƯỢN chính tinh tam hợp/xung để luận.
- Nếu khối trên có "TỔ HỢP SAO" thì ƯU TIÊN luận theo tổ hợp — ý nghĩa rõ hơn từng sao lẻ.
- Nếu tháng có 2 ĐOẠN thì PHẢI nói rõ mốc ngày và luận TÁCH BẠCH hai đoạn (nửa đầu / nửa sau khác nhau thế nào). Tuyệt đối KHÔNG gộp thành một hạn cho cả tháng.
- CẤM bịa "điểm tháng X/10" — chỉ ĐẠI VẬN mới có điểm/10 thật. Điểm đại vận chỉ dùng để chỉnh BIÊN ĐỘ: đại vận cao thì cái tốt bung rực rỡ và cái xấu đỡ nặng; đại vận thấp thì ngược lại.
- CẤM bịa sao/cách cục không có trong khối trên.

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (tháng này thuận hay chật, nên tiến hay nên giữ), KHÔNG mở đầu bằng tên cung/sao.
Xuống dòng rồi viết 1-2 đoạn ngắn, ngôn ngữ đời thường:
① Vì sao: dịch sao/cách cục của cung hạn thành chuyện đời thực (tiền bạc, công việc, người thân, sức khỏe, giấy tờ) — tên sao nếu nhắc thì để GỌN trong ngoặc, đứng sau câu nghĩa.
② Việc nên làm và việc nên hoãn trong tháng này — cụ thể, làm được ngay, không nói chung chung kiểu "hãy cẩn thận".

KHÔNG lặp lại phần tổng quan lá số hay đại vận (đã có phần riêng). Chỉ nói về THÁNG này.`;
}

// ─── Handlers ─────────────────────────────────────────────────
export async function OPTIONS() { return options(); }

function readBirth(b: AnyRec): BirthParams | null {
  const birth = b?.birth as AnyRec | undefined;
  if (!birth) return null;
  return {
    day: Number(birth.day), month: Number(birth.month), year: Number(birth.year),
    hourBranch: birth.hourBranch != null ? Number(birth.hourBranch) : undefined,
    gender: birth.gender === 'nu' ? 'nu' : 'nam',
    isLunar: !!birth.isLunar,
    name: birth.name ? String(birth.name) : undefined,
  } as BirthParams;
}

async function runPost(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const body = (await parseBody(request)) as AnyRec;

  const birth = readBirth(body);
  if (!birth) return err('Thiếu thông tin ngày sinh.', 400);
  const tuThang = Number(body.tuThang), tuNam = Number(body.tuNam);
  if (!(tuThang >= 1 && tuThang <= 12) || !(tuNam >= 1900 && tuNam <= 2100)) {
    return err('Thiếu hoặc sai tháng/năm bắt đầu.', 400);
  }
  // Năm xem = năm của THÁNG ĐANG XEM → đại vận/tiểu hạn "hiện tại" khớp đúng
  // thời điểm người dùng mở tool, không phải năm mặc định của engine.
  const r = computeLaso(birth, tuNam);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  const ls = r.ls;

  // ── Khung 12 tháng — DETERMINISTIC, MIỄN PHÍ, không cần đăng nhập ──
  // Cùng lý do với tầng tra bảng của các tool khác: 0 lượt LLM, 0đ. Tường chỉ
  // đứng trên phần CHỮ do AI viết.
  if (action === 'khung') {
    return ok({
      khung: buildKhung12Thang(ls as AnyRec, tuThang, tuNam),
      labels: phanLabels(ls, tuThang, tuNam),
      tongPhan: TONG_PHAN,
      dvHienTai: dvHienTaiSo(ls),
    });
  }

  const phan = Number(body.phan);
  if (!(phan >= 1 && phan <= TONG_PHAN)) return err('Phần không hợp lệ.', 400);
  const docs = body.docs ? String(body.docs) : undefined;

  let prompt: string;
  try {
    const nx = nguoiXemLine(birth.name, birth.gender);
    if (phan <= 4) {
      const map: Record<number, number> = { 1: 1, 2: 14, 3: 14 + dvHienTaiSo(ls), 4: 24 };
      prompt = (nx ? nx + '\n' : '') + buildPrompt(map[phan]!, formatLaSoV2(ls), docs);
    } else {
      const stt = phan - PHAN_THANG_DAU + 1;
      const { thang, nam } = addMonths(tuThang, tuNam, stt - 1);
      prompt = (nx ? nx + '\n' : '') + buildPromptThang(ls, thang, nam, stt, docs);
    }
  } catch (e: unknown) {
    return err('buildPrompt error: ' + (e as Error).message);
  }

  try {
    // Trần token mượn đúng mức của phần tương ứng bên Luận Giải; phần tháng
    // (140–180 từ) dùng chung mức của phần cung/đại vận.
    const maxTok = phan === 1 ? 2000 : phan === 2 ? 3000 : phan === 4 ? 1400 : 1200;
    const rr = await llmTextFull({ system: SYSTEM_PROMPT, prompt, maxTokens: maxTok });
    // tool_id = ĐÚNG `tool_pricing.tool_id` để bucket chi phí ghép được với
    // bucket doanh thu (xem tool_canon() trong CLAUDE.md).
    void logLlmUsage(
      'van-han-nam',
      rr.model,
      {
        input_tokens: rr.usage.input_tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: rr.usage.output_tokens,
      },
      rr.durationMs,
    );
    const luanGiai = rr.text.replace(/```chartdata[\s\S]*?```/, '').trim();
    return ok({ luanGiai, phan });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

export async function POST(request: NextRequest) {
  return withToolOutcome('van-han-nam', () => runPost(request));
}
