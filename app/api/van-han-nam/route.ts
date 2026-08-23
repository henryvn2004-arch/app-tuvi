// app/api/van-han-nam/route.ts
// 🔴 60 → 300 (2026-08-20, vá lỗi Henry báo: "chạy hơn 60s xong báo Lỗi phần 1:
// Unexpected token 'A', "An error o"... is not valid JSON"). Chuỗi Kimi K3
// primary → Opus 5 backup-1 → Gemini Flash backup-2 (llmTextFull) có thể thử
// TỚI 3 PROVIDER TUẦN TỰ trong một lượt (mỗi provider tự retry lỗi tạm thời
// trước khi coi là hỏng), cộng thêm trần token của phần 1/2 vừa nâng 50%
// (3000/4500) → tổng thời gian dễ vượt 60s. Vercel timeout ở mức hàm thì trả
// về trang lỗi NỀN TẢNG dạng text ("An error occurred with your deployment"),
// KHÔNG PHẢI JSON — client `JSON.parse` vỡ ngay chữ "A" đầu tiên, đúng thông
// điệp Henry dán lại. Đồng bộ với các route LLM nặng khác (300).
export const maxDuration = 300;

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { computeLaso, formatLaSoV2, makeLasoSlug, CHI_NAMES, type Laso } from '@/lib/engine/laso';
import { SYSTEM_PROMPT, buildPrompt, laSoContextFor } from '@/lib/agent/luan-giai-doc';
import { nguoiXemLine } from '@/lib/agent/prompts';
import {
  buildKhung12Thang, describeThangForLLM, spans12, nhanThangAL, nhanThangALDay, dmy, SO_THANG,
} from '@/lib/engine/van-han-12';
import type { LunarMonthSpan } from '@/lib/engine/van-ngay';
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
//   5..16 → 12 nguyệt vận theo THÁNG ÂM (MỚI — prompt ở `buildPromptThang` dưới)
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
function phanLabels(ls: Laso | null, spans: LunarMonthSpan[]): string[] {
  const dv = ls ? ((ls.daiVans as AnyRec[]) || [])[dvHienTaiSo(ls) - 1] : null;
  return [
    '',
    'Tổng quan lá số',
    'Hành trình cuộc đời',
    dv ? `Đại vận hiện tại (${dv.tuoiStart}–${dv.tuoiEnd}t)` : 'Đại vận hiện tại',
    'Tiểu vận năm nay',
    ...spans.map((s) => nhanThangALDay(s)),
  ];
}

// ─── Prompt phần THÁNG (phần MỚI duy nhất của tool này) ────────
function buildPromptThang(
  ls: Laso,
  span: LunarMonthSpan,
  stt: number,
  docs?: string,
): string {
  const khoiThang = describeThangForLLM(ls as AnyRec, span);
  const nhan = nhanThangAL(span);
  const dmyTu = dmy(span.tu), dmyDen = dmy(span.den);
  // Tháng NHUẬN dùng CÙNG cung nguyệt hạn với tháng chính (engine tra chung một
  // ô `nguyetVanScores`). Không dặn thì model viết lại gần y nguyên phần trước —
  // hai phần liền nhau đọc thành lặp.
  const luatNhuan = span.isLeap
    ? `\n- ⚠️ Đây là THÁNG NHUẬN: cung nguyệt hạn TRÙNG với tháng ${span.thangAL} ÂL ngay trước. ĐỪNG viết lại bản luận của tháng trước — hãy nói về phần TIẾP NỐI: việc dở dang của tháng trước nay có thêm một tháng nữa để xử lý, và điều gì đã khác đi so với đầu chu kỳ.`
    : '';
  // Lá số cắt theo khuôn phần 24 (tiểu vận & năm xem): đầu lá số + khối 9 đại
  // vận + cách cục — đúng thứ cần để đặt tháng vào khung năm, không kéo cả 12
  // cung vào cho loãng.
  const laSoCat = laSoContextFor(24, formatLaSoV2(ls));
  const docsSection = docs ? '\n\n=== TÀI LIỆU THAM KHẢO ===\n' + docs : '';

  return `${laSoCat}

${khoiThang}${docsSection}

PHẦN ${4 + stt} — NGUYỆT VẬN ${nhanThangALDay(span)} (140-180 từ)
Đây là tháng thứ ${stt} trong 12 tháng tới. Người đọc đang xem một bản riêng về VẬN HẠN — họ cần biết tháng này NÊN LÀM GÌ và NÉ GÌ, không cần học lại lý thuyết.

⚠️ CĂN CỨ NỘI BỘ, BẮT BUỘC BÁM ĐÚNG (dùng để KHÔNG bịa, không phải để liệt kê hết cho người đọc):
- Cung nguyệt hạn + sao tọa thủ/xung chiếu/tam hợp của ĐÚNG khối "${nhan}" ở trên. TRỌNG SỐ: tọa thủ nặng nhất → xung chiếu → tam hợp. Cung vô chính diệu thì MƯỢN chính tinh tam hợp/xung để luận.
- Nếu khối trên có "TỔ HỢP SAO" thì ƯU TIÊN luận theo tổ hợp — ý nghĩa rõ hơn từng sao lẻ.
- Tháng ÂM LỊCH này là MỘT khối liền: một cung nguyệt hạn, một nền tiểu hạn cho cả tháng. KHÔNG chẻ "nửa đầu tháng thế này, nửa sau thế kia" — không có căn cứ nào cho phép chẻ.
- 🗓 MỐC THỜI GIAN NÓI VỚI NGƯỜI ĐỌC PHẢI LÀ NGÀY DƯƠNG: họ sống theo lịch dương. Mở đầu hoặc trong câu đầu phải nhắc quãng ${dmyTu} – ${dmyDen}; muốn nói "đầu tháng" / "giữa tháng" / "cuối tháng" thì kèm ngày dương cụ thể nằm TRONG quãng đó. CẤM nêu ngày dương ngoài quãng này, và CẤM gọi nó là "tháng ${span.tu.m} dương lịch" (tháng âm không trùng tháng dương).
- CẤM bịa "điểm tháng X/10" — chỉ ĐẠI VẬN mới có điểm/10 thật. Điểm đại vận chỉ dùng để chỉnh BIÊN ĐỘ: đại vận cao thì cái tốt bung rực rỡ và cái xấu đỡ nặng; đại vận thấp thì ngược lại.
- CẤM bịa sao/cách cục không có trong khối trên.${luatNhuan}

MỞ ĐẦU bằng câu phán quyết NGẮN, in đậm, đứng riêng một dòng — nói bằng nghĩa đời thực (tháng này thuận hay chật, nên tiến hay nên giữ), KHÔNG mở đầu bằng tên cung/sao.
Xuống dòng rồi viết 1-2 đoạn ngắn, ngôn ngữ đời thường:
① Vì sao: dịch sao/cách cục của cung hạn thành chuyện đời thực (tiền bạc, công việc, người thân, sức khỏe, giấy tờ) — tên sao nếu nhắc thì để GỌN trong ngoặc, đứng sau câu nghĩa.
② Việc nên làm và việc nên hoãn trong tháng này — cụ thể, làm được ngay, không nói chung chung kiểu "hãy cẩn thận".

KHÔNG lặp lại phần tổng quan lá số hay đại vận (đã có phần riêng). Chỉ nói về THÁNG này.`;
}

// ─── Vá lỗ trùng: phần 1-4 = ĐÚNG 4 phần của Luận Giải 24 phần ──
// Đo được (CLAUDE.md, track Tối Ưu Chi Phí Opus): ai đã mua/xem bản Luận Giải
// cho CHÍNH lá số này ở CHÍNH năm xem này thì 4 phần đó ĐÃ NẰM SẴN trong
// `laso_public.luan_giai` — gọi LLM lại là trả tiền lần thứ hai cho một thứ
// đã có. Đọc lại thay vì gọi LLM: 0đ, không đụng một chữ prompt.
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

/**
 * Tra `laso_public` theo ĐÚNG slug lá số này (không tiền tố, tool 'laso') +
 * ĐÚNG năm xem (`nam_xem`) — một số phần (đặc biệt phần 24 "Tiểu vận & năm
 * xem") phụ thuộc năm xem nên KHÔNG được đoán, phải khớp tuyệt đối. Trả về
 * đúng văn bản của `phanLaso` (khoá số trong object `luan_giai`, 1..24) nếu
 * có; không có/không khớp/lỗi mạng → trả `null` (rơi về gọi LLM như cũ, KHÔNG
 * chặn lượt của người dùng vì bước này chỉ là tối ưu chi phí).
 */
async function readCachedLuanGiaiPhan(
  ls: Laso, birth: BirthParams, tuNam: number, phanLaso: number,
): Promise<string | null> {
  try {
    const gioChi = birth.hourBranch != null ? (CHI_NAMES[birth.hourBranch] || '') : '';
    const slug = makeLasoSlug(
      String((ls as AnyRec).canChiNam || ''),
      birth.gender === 'nu' ? 'nu' : 'nam',
      String(birth.day), String(birth.month), String(birth.year),
      gioChi,
    );
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/laso_public?slug=eq.${encodeURIComponent(slug)}` +
        '&select=nam_xem,luan_giai&limit=1',
      {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        cache: 'no-store',
      },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as AnyRec[];
    const row = rows?.[0];
    if (!row || row.nam_xem !== tuNam) return null;
    const store = row.luan_giai as Record<string, unknown> | null;
    const text = store ? store[String(phanLaso)] : null;
    return typeof text === 'string' && text.trim() ? text : null;
  } catch {
    return null;
  }
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
  // Mốc là NGÀY DƯƠNG người dùng đang đứng — phải có ngày, không chỉ tháng:
  // tháng âm đổi ở giữa tháng dương, nên hai ngày trong cùng một tháng dương có
  // thể thuộc hai tháng âm khác nhau ⇒ hai khung 12 tháng khác nhau.
  const tuNgay = Number(body.tuNgay), tuThang = Number(body.tuThang), tuNam = Number(body.tuNam);
  if (!(tuNgay >= 1 && tuNgay <= 31) || !(tuThang >= 1 && tuThang <= 12) || !(tuNam >= 1900 && tuNam <= 2100)) {
    return err('Thiếu hoặc sai ngày/tháng/năm bắt đầu.', 400);
  }
  // Năm xem = năm DƯƠNG người dùng đang đứng → đại vận/tiểu hạn "hiện tại" khớp
  // đúng thời điểm mở tool (cùng quy ước `currentNamXem()` của cả repo).
  const r = computeLaso(birth, tuNam);
  if (!r.ok || !r.ls) return err(r.error || 'Không lập được lá số.', 400);
  const ls = r.ls;

  // ── Khung 12 tháng — DETERMINISTIC, MIỄN PHÍ, không cần đăng nhập ──
  // Cùng lý do với tầng tra bảng của các tool khác: 0 lượt LLM, 0đ. Tường chỉ
  // đứng trên phần CHỮ do AI viết.
  if (action === 'khung') {
    return ok({
      khung: buildKhung12Thang(ls as AnyRec, tuNgay, tuThang, tuNam),
      labels: phanLabels(ls, spans12(tuNgay, tuThang, tuNam)),
      tongPhan: TONG_PHAN,
      dvHienTai: dvHienTaiSo(ls),
    });
  }

  const phan = Number(body.phan);
  if (!(phan >= 1 && phan <= TONG_PHAN)) return err('Phần không hợp lệ.', 400);
  const docs = body.docs ? String(body.docs) : undefined;

  // Phần 1-4 trùng Y HỆT 4 phần của Luận Giải — thử đọc lại trước khi gọi LLM.
  const laSoPhanMap: Record<number, number> = { 1: 1, 2: 14, 3: 14 + dvHienTaiSo(ls), 4: 24 };
  if (phan <= 4) {
    const cached = await readCachedLuanGiaiPhan(ls, birth, tuNam, laSoPhanMap[phan]!);
    if (cached) return ok({ luanGiai: cached, phan });
  }

  let prompt: string;
  try {
    const nx = nguoiXemLine(birth.name, birth.gender);
    if (phan <= 4) {
      prompt = (nx ? nx + '\n' : '') + buildPrompt(laSoPhanMap[phan]!, formatLaSoV2(ls), docs);
    } else {
      const stt = phan - PHAN_THANG_DAU + 1;
      // Chỉ cần bảng LỊCH để biết tháng âm thứ stt — không dựng cả khung (khớp
      // 958 cách cục × 12 tháng) chỉ để lấy một mốc.
      const span = spans12(tuNgay, tuThang, tuNam)[stt - 1]!;
      prompt = (nx ? nx + '\n' : '') + buildPromptThang(ls, span, stt, docs);
    }
  } catch (e: unknown) {
    return err('buildPrompt error: ' + (e as Error).message);
  }

  try {
    // Trần token mượn đúng mức của phần tương ứng bên Luận Giải; phần tháng
    // (140–180 từ) dùng chung mức của phần cung/đại vận.
    // Nâng 50% cùng đợt với lasotuvi/route.ts (Henry chốt 2026-08-20).
    const maxTok = phan === 1 ? 3000 : phan === 2 ? 4500 : phan === 4 ? 2100 : 1800;
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
