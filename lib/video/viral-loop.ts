// lib/video/viral-loop.ts
// ============================================================
// VÒNG LẶP: kịch bản → cổng 1 (máy) → cổng 2 (hội đồng) → trượt thì viết lại
// → quay lại cổng 1. Tối đa 3 vòng, hết vòng mà chưa qua thì BỎ clip.
//
// 🔑 Vì sao BỎ chứ không hạ chuẩn cho qua: cổng chỉ có giá trị đúng bằng mức
// nó dám chặn. Nới ngưỡng để "có clip mà đăng" là biến nó thành thủ tục trang
// trí — đúng vết xe của `check:motifs` từng kêu oan rồi bị tắt đi.
//
// THỨ TỰ CỔNG LÀ CÓ CHỦ ĐÍCH, đừng đảo:
//   cổng 1 chạy trước vì nó 0đ và dưới 1 giây. Đưa một kịch bản dài 90 giây
//   qua cổng 2 trước là đốt một lượt LLM để nghe lại đúng điều một phép trừ
//   đã nói được.
// ============================================================

import { llmTextFull } from '@/lib/llm/complete';
import { parseLlmJson } from '@/lib/api/tool-helpers';
import {
  type ScriptSpec,
  TTS_CHARS_PER_SECOND,
  budgetChars,
  estimateSpeechSeconds,
  estimateTotalSeconds,
  spokenCta,
  spokenSceneText,
} from './script-spec';
import {
  THRESHOLDS,
  minIdentityHits,
  runMachineGate,
  type GateIssue,
  type GateOptions,
  type MachineGateResult,
} from './gate-machine';
import { runAudienceGate, type AudienceGateResult } from './gate-audience';

export interface LoopRound {
  round: number;
  machine: MachineGateResult;
  audience: AudienceGateResult | null;
  /** Chỉ dẫn đã dùng để viết lại vòng sau. Rỗng ở vòng cuối. */
  rewriteHint: string;
}

export interface LoopResult {
  pass: boolean;
  /** Kịch bản cuối cùng — bản đã qua cổng, hoặc bản tốt nhất nếu hết vòng. */
  spec: ScriptSpec;
  rounds: LoopRound[];
  /** Gộp mọi lỗi còn lại ở vòng cuối, để log ra cho người đọc biết vì sao bỏ. */
  remainingIssues: GateIssue[];
}

export const MAX_ROUNDS = 3;

const REWRITE_SYSTEM = `Bạn viết lại kịch bản video ngắn (dọc 9:16) cho một trang
tử vi Việt Nam, để đăng TikTok/Reels.

Bạn nhận một kịch bản KHÔNG ĐẠT kèm danh sách lỗi cụ thể. Việc của bạn: sửa
ĐÚNG những lỗi đó, giữ nguyên mọi thứ khác.

LUẬT:
1. Bạn CHỈ được sửa CHỮ: câu mở đầu, và lời đọc của những cảnh KHÔNG đánh dấu
   [KHOÁ]. Không đổi số cảnh, không đổi thứ tự, không đụng phần hình.
   (Hình gắn với clip quay màn hình đã có — đổi nó là kịch bản nói một đằng,
   hình chiếu một nẻo.)
2. CÂU KẾT và cảnh [KHOÁ] KHÔNG CÓ CHỖ trong phần trả về. Chúng mang tên miền /
   mã khuyến mãi và có BẢN ĐỌC riêng gửi cho máy đọc; sửa chữ mà bản đọc giữ
   nguyên thì phụ đề một đằng, tiếng một nẻo — hỏng IM LẶNG, không lỗi nào bắn ra.
3. Giọng: người Việt nói chuyện tự nhiên, KHÔNG sáo rỗng, KHÔNG "các bạn thân
   mến", KHÔNG hô hào. Xưng "bạn" với người xem.
4. TUYỆT ĐỐI KHÔNG hứa chắc chắn về tương lai ("chắc chắn sẽ giàu", "nhất định
   gặp may"). Nói về xu hướng, gợi ý, điều đáng lưu tâm.
5. Tránh giọng mê tín cực đoan (định mệnh không đổi được, không xem là gặp hoạ)
   — vừa sai với tinh thần trang, vừa dễ bị nền tảng hạn chế phân phối.
6. NGÂN SÁCH KÝ TỰ là ràng buộc CỨNG, không phải lời khuyên. Vượt ngân sách là
   kịch bản trượt lại đúng cái cổng vừa trượt. Cần ngắn thì cắt CHỮ, đừng cắt Ý.

Trả về ĐÚNG JSON: {"hook": "...", "scenes": [{"so": 3, "text": "..."}]}
· \`so\` là SỐ CẢNH ghi trong kịch bản bên dưới (cảnh 1, cảnh 2…).
· CHỈ liệt kê những cảnh bạn THỰC SỰ sửa. Cảnh không nhắc tới thì giữ nguyên.
· Không đưa cảnh [KHOÁ] và không đưa câu kết vào mảng này.`;

/**
 * 🔑 Trả về theo SỐ CẢNH chứ không theo VỊ TRÍ trong mảng — và đây là bản vá
 * của một lỗi đo được trên lượt khảo sát 24 kịch bản đầu tiên.
 *
 * Hợp đồng cũ là một mảng phẳng "đúng thứ tự, đúng số lượng". Model nhìn bảng
 * kịch bản thấy hook + N cảnh + câu kết, rồi trả về **N+1** phần tử — nó tính
 * câu kết là một cảnh, vì trong clip render ra thì đúng là vậy. Sai số cảnh ⇒
 * bỏ nguyên bản viết lại ⇒ **20/24 clip mất trắng lượt sửa**, và vòng lặp 3
 * vòng chưa từng chạy quá vòng 1.
 *
 * Đánh số thì con số KHÔNG THỂ lệch: câu kết và cảnh [KHOÁ] không có ô để điền,
 * mục thừa bị bỏ RIÊNG nó thay vì kéo cả bản viết lại đi theo, và mục thiếu thì
 * cảnh đó giữ nguyên chữ cũ. Cùng lối "chốt ở chỗ không phụ thuộc model" đã
 * dùng cho phần ép giữ câu kết bên dưới.
 */
const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    hook: { type: 'string' },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { so: { type: 'number' }, text: { type: 'string' } },
        required: ['so', 'text'],
      },
    },
  },
  required: ['hook', 'scenes'],
};

/**
 * Cảnh có BẢN ĐỌC riêng (`speech`) thì KHÔNG cho viết lại.
 *
 * 🔑 `speech` chỉ tồn tại cho đúng ba lớp chuỗi — tên miền, mã viết HOA, chữ số
 * — tức những chuỗi mà chữ VIẾT và chữ ĐỌC cố ý khác nhau. Để model sửa chữ
 * viết trong khi bản đọc nằm im là tạo ra đúng loại lệch không ai nhìn ra: clip
 * render thành công, phụ đề đúng, tiếng nói một câu khác.
 */
const khoa = (s: ScriptSpec['scenes'][number]) => Boolean(s.speech?.trim());

/**
 * Ngân sách KÝ TỰ giao cho model, suy từ CHÍNH ngưỡng mà cổng 1 sẽ chấm.
 *
 * 🔑 Lỗi thứ hai đo được ở lượt khảo sát: 4/4 clip có bản viết lại được nhận đều
 * trượt lại cổng 1 ngay vòng sau — `hook.too-long` 8,2s trên trần 5s,
 * `length.too-long` 57s trên trần 45s. Prompt cũ chỉ nói "13,6 ký tự = 1 giây"
 * mà KHÔNG bao giờ nói trần là bao nhiêu, nên model viết cho hay rồi vượt.
 * Giao bằng KÝ TỰ vì đó là thứ model điều khiển trực tiếp; giao bằng giây là
 * bắt nó tự quy đổi rồi tự sai.
 *
 * ⚠️ Trừ phần [KHOÁ] ra khỏi tổng trước khi giao. Câu kết đọc mất 6–9 giây và
 * model không sửa được nó — giao nguyên trần thì nó cắt đủ theo trần mà tổng
 * vẫn vượt.
 */
/*
 * 🔑 Biên an toàn 8% nay nằm trong `budgetChars` (`script-spec.ts`) — DÙNG CHUNG
 * với `gate-machine.ts`. Trước đây mỗi bên tự nhân một kiểu: ô `fix` của cổng 1
 * nói "rút xuống dưới 67 ký tự" còn khối NGÂN SÁCH ở dưới nói "tối đa 62", và
 * cả hai cùng vào MỘT prompt. Model nhận hai trần cho một ràng buộc thì nó theo
 * cái lớn hơn — đúng chuỗi làm `ba-the-be-tac` trượt cả 3 vòng vì `hook.too-long`.
 */
function nganSachKyTu(spec: ScriptSpec, gate?: GateOptions) {
  const kyTu = budgetChars;
  const giayKhoa =
    estimateSpeechSeconds(spokenCta(spec)) +
    spec.scenes
      .filter(khoa)
      .reduce((t, sc) => t + (sc.forceSeconds ?? estimateSpeechSeconds(spokenSceneText(sc))), 0);
  return {
    hook: kyTu(THRESHOLDS.hookMaxSeconds),
    canh: kyTu(THRESHOLDS.sceneMaxSeconds),
    conLai: Math.max(0, kyTu((gate?.maxSeconds ?? THRESHOLDS.totalMaxSeconds) - giayKhoa)),
  };
}

async function rewriteSpec(
  spec: ScriptSpec,
  issues: GateIssue[],
  hint: string,
  gate?: GateOptions
): Promise<ScriptSpec | null> {
  const loi = issues
    .filter((i) => i.level === 'block')
    .map((i, n) => `${n + 1}. [${i.code}] ${i.message}${i.fix ? `\n   → CÁCH SỬA: ${i.fix}` : ''}`)
    .join('\n');
  const ns = nganSachKyTu(spec, gate);

  const res = await llmTextFull({
    system: REWRITE_SYSTEM,
    prompt:
      `KỊCH BẢN HIỆN TẠI (dài ${estimateTotalSeconds(spec).toFixed(1)}s):\n` +
      `hook: "${spec.hook}"\n` +
      spec.scenes
        .map(
          (s, i) =>
            `cảnh ${i + 1}${khoa(s) ? ' [KHOÁ — không sửa, không trả về]' : ''}: "${s.text}"`
        )
        .join('\n') +
      `\ncâu kết [KHOÁ — không sửa, không trả về]: "${spec.cta}"\n\n` +
      `NGÂN SÁCH KÝ TỰ (${TTS_CHARS_PER_SECOND} ký tự đọc mất 1 giây):\n` +
      `· hook: tối đa ${ns.hook} ký tự\n` +
      `· mỗi cảnh: tối đa ${ns.canh} ký tự\n` +
      (ns.conLai >= 100
        ? `· tổng hook + toàn bộ cảnh sửa được: tối đa ${ns.conLai} ký tự (đã trừ phần [KHOÁ])\n`
        : '') +
      // Ngưỡng này máy biết trước, nên phải nói TRƯỚC. Không nói thì model viết
      // một bản gọn gàng rồi chết vì thiếu chữ "bạn" — đúng ca `kim-lau` và
      // `bon-buoc-truoc-khi-roi-di` trượt ở vòng cuối trong lượt khảo sát.
      `· toàn bộ lời đọc phải nhắc tới người xem ("bạn", "của bạn"…) ít nhất ` +
      `${minIdentityHits(spec.scenes.length)} lần — clip phải nói VỀ HỌ, không giảng bài.\n` +
      `\nLỖI PHẢI SỬA:\n${loi}\n` +
      (hint ? `\nCHỈ DẪN TỪ HỘI ĐỒNG NGƯỜI XEM:\n${hint}\n` : '') +
      `\nTrả về hook mới, và CHỈ những cảnh bạn sửa (kèm số cảnh).`,
    json: true,
    jsonSchema: REWRITE_SCHEMA,
    maxTokens: 1600,
    temperature: 0.8,
  });

  // 🔑 Mọi đường trả `null` đều phải NÓI RA. Lượt chạy thật đầu tiên trên
  // Actions dừng sau đúng 1 vòng trong khi trần là 3, và không dòng nào cho
  // biết vì sao — người đọc log chỉ thấy câu "đã thử viết lại" mà không biết
  // bản viết lại có tồn tại hay không. Bỏ clip thì được, bỏ mà im thì không.
  const p = parseLlmJson(res.text) as
    | { hook?: string; scenes?: Array<{ so?: number; text?: string }> }
    | null;
  if (!p?.hook || !Array.isArray(p.scenes)) {
    console.error(
      `[viral-loop] bỏ bản viết lại: không bóc được JSON hợp lệ ` +
        `(hook=${p?.hook ? 'có' : 'thiếu'}, scenes=${Array.isArray(p?.scenes) ? 'có' : 'thiếu'}). ` +
        `Bản thô ${res.text.length} ký tự, mở đầu: ${JSON.stringify(res.text.slice(0, 160))}`
    );
    return null;
  }

  // Ghép theo SỐ CẢNH. Mục hỏng bị bỏ RIÊNG nó — không kéo cả bản viết lại đi
  // theo như hợp đồng mảng phẳng cũ. Cảnh không được nhắc tới thì giữ chữ cũ:
  // đó là một kịch bản hợp lệ (nửa cũ nửa mới), và cổng 1 vẫn chấm lại từ đầu.
  const moi = new Map<number, string>();
  const boQua: string[] = [];
  for (const muc of p.scenes) {
    const i = Number(muc?.so) - 1;
    const chu = typeof muc?.text === 'string' ? muc.text.trim() : '';
    if (!Number.isInteger(i) || i < 0 || i >= spec.scenes.length) {
      boQua.push(`số cảnh ${JSON.stringify(muc?.so)} ngoài phạm vi 1–${spec.scenes.length}`);
    } else if (khoa(spec.scenes[i])) {
      // Ép ở tầng mã chứ không chỉ dặn trong prompt. Dặn là mong model nghe lời;
      // ép là điều kiện luôn đúng — và đây đúng là chỗ hỏng IM LẶNG (phụ đề đổi
      // mà bản đọc gửi máy đọc thì không).
      boQua.push(`cảnh ${i + 1} [KHOÁ]`);
    } else if (!chu) {
      boQua.push(`cảnh ${i + 1} rỗng`);
    } else {
      moi.set(i, chu);
    }
  }
  if (boQua.length) {
    console.error(
      `[viral-loop] bỏ ${boQua.length} mục không hợp lệ trong bản viết lại: ${boQua.join(' · ')}`
    );
  }

  // Bản viết lại không đổi gì ⇒ vòng sau chấm lại y hệt rồi trượt y hệt. Dừng
  // sớm còn hơn đốt thêm hai lượt model để nhận lại đúng câu trả lời cũ.
  if (moi.size === 0 && p.hook.trim() === spec.hook.trim()) {
    console.error(
      '[viral-loop] bỏ bản viết lại: hook không đổi và không cảnh nào được sửa — ' +
        'vòng sau sẽ ra kết quả y hệt.'
    );
    return null;
  }

  return {
    ...spec,
    hook: p.hook.trim() || spec.hook,
    scenes: spec.scenes.map((sc, i) => (moi.has(i) ? { ...sc, text: moi.get(i)! } : sc)),
  };
}

/** Số lần sửa THÊM tại chỗ khi bản viết lại chưa lọt cổng 1. */
const THU_LAI_CONG_1 = 2;

/**
 * Viết lại RỒI TỰ SOI bằng cổng 1 trước khi giao lại cho vòng lặp.
 *
 * 🔑 Lỗi thứ ba đo được ở lượt khảo sát, và là lỗi tốn tiền nhất: một bản viết
 * lại trượt cổng 1 sẽ ĐỐT MẤT NGUYÊN MỘT VÒNG. Cụ thể `ngay-tot` · `luc-nham` ·
 * `ky-mon` · `an-sao` · `tarot` · `kinh-dich` · `xem-tuoi-sinh-con` đều đi đúng
 * hình này:
 *
 *      vòng 1: hội đồng chấm → trượt
 *      vòng 2: cổng 1 trượt — hook.too-long      ← không hỏi hội đồng lần nào
 *      vòng 3: cổng 1 trượt — hook.too-long      ← cũng vậy
 *
 * Ba vòng mà chỉ được MỘT lượt chấm thật. Trong khi cổng 1 là phép trừ, chạy
 * dưới một giây và 0đ — không có lý gì để nó ăn một vòng của cổng đắt tiền.
 *
 * Nên: sửa xong thì tự chấm ngay tại chỗ, chưa lọt thì sửa tiếp (tối đa
 * `THU_LAI_CONG_1` lần) với ĐÚNG số đo vừa đo được. Vòng của vòng lặp từ nay
 * chỉ tiêu vào cổng 2.
 *
 * ⚠️ Bỏ `hint` của hội đồng ở các lần sửa sau là CỐ Ý: bản đầu đã ngấm lời
 * khuyên đó rồi, việc còn lại thuần là cắt cho vừa trần. Giữ nguyên lời khuyên
 * là mời model viết dài lại đúng chỗ vừa bị cắt.
 */
async function vietLaiChoQuaCong1(
  spec: ScriptSpec,
  issues: GateIssue[],
  hint: string,
  gate?: GateOptions
): Promise<ScriptSpec | null> {
  let hienTai = spec;
  let loi = issues;
  let goiY = hint;
  let banCuoi: ScriptSpec | null = null;

  for (let lan = 0; lan <= THU_LAI_CONG_1; lan++) {
    const next = await rewriteSpec(hienTai, loi, goiY, gate);
    // Không viết lại được nữa ⇒ trả bản gần nhất còn dùng được (có thể là null
    // ở lần đầu). Vòng lặp bên ngoài tự quyết định dừng hay chấm tiếp.
    if (!next) return banCuoi;
    banCuoi = next;

    const soi = runMachineGate(next, gate);
    if (soi.pass) return next;

    const ma = [...new Set(soi.issues.filter((i) => i.level === 'block').map((i) => i.code))];
    console.error(
      `[viral-loop] bản viết lại lần ${lan + 1} còn trượt cổng 1 (${ma.join(', ')}) — ` +
        (lan < THU_LAI_CONG_1
          ? 'sửa tiếp TẠI CHỖ, không tiêu một vòng của hội đồng.'
          : 'hết lượt sửa tại chỗ, giao nguyên trạng cho vòng sau.')
    );
    hienTai = next;
    loi = soi.issues;
    goiY = '';
  }
  return banCuoi;
}

/**
 * Chạy vòng lặp kiểm–sửa.
 *
 * @param opts.skipAudience bỏ cổng 2 (không gọi LLM) — dùng khi chạy thử tại
 *   chỗ hoặc khi chưa có khoá model. Cổng 1 vẫn chạy đủ.
 * @param opts.gate ngưỡng cho cổng 1. ⚠️ BẮT BUỘC truyền đúng ngưỡng mà phía
 *   gọi đang dùng: clip insight chạy 80–92s với `maxSeconds: 240` /
 *   `sweetSpot: [45, 120]`, còn mặc định của cổng là khung 18–32s của clip
 *   demo tool. Bỏ trống thì vòng lặp chấm clip insight bằng thước của loại
 *   khác rồi bắt viết lại một lỗi không có thật — và mỗi vòng như vậy đốt hai
 *   lượt LLM.
 */
export async function runViralLoop(
  input: ScriptSpec,
  opts: { skipAudience?: boolean; maxRounds?: number; gate?: GateOptions } = {}
): Promise<LoopResult> {
  const maxRounds = opts.maxRounds ?? MAX_ROUNDS;
  const rounds: LoopRound[] = [];
  let spec = input;

  /*
   * ── GIỮ BẢN TỐT NHẤT ──────────────────────────────────────────────────────
   *
   * 🔴 Bản trước trả về `spec` = bản CUỐI CÙNG, trong khi chính interface ghi
   * "bản đã qua cổng, hoặc bản TỐT NHẤT nếu hết vòng" — tài liệu nói một đằng,
   * code làm một nẻo.
   *
   * Đo được trên `ba-the-be-tac`: vòng 1 **3/4 xem hết**, vòng 2 model viết lại
   * làm hỏng còn **0/4**, vòng 3 lấy bản hỏng đó làm nền rồi trượt luôn cổng 1.
   * Ba vòng đi LÙI, và thứ giao ra là bản tệ nhất trong ba.
   *
   * 🔑 Viết lại KHÔNG đơn điệu — model có thể làm tệ đi. Vòng lặp vì thế phải
   * là "thử rồi giữ cái tốt hơn", không phải "cứ thay bằng cái mới nhất".
   *
   * Điểm xếp theo thứ tự người xem thật sự quan tâm: xem hết → muốn lưu → muốn
   * gửi. Vòng trượt cổng 1 (chưa tới hội đồng) tính 0 — chưa có bằng chứng nào
   * nói nó tốt hơn.
   */
  let bestSpec = input;
  let bestScore = -1;
  let bestRound: LoopRound | null = null;
  const diem = (a: AudienceGateResult | null) =>
    a ? a.soXemHetTrongTep * 1000 + a.tiLeMuonLuu * 10 + a.tiLeMuonChiaSe : 0;

  for (let round = 1; round <= maxRounds; round++) {
    const machine = runMachineGate(spec, opts.gate);

    // Cổng 1 trượt ⇒ chưa tốn lượt LLM nào cho cổng 2.
    if (!machine.pass) {
      const hint = '';
      rounds.push({ round, machine, audience: null, rewriteHint: hint });
      if (round === maxRounds) break;
      const next = await vietLaiChoQuaCong1(spec, machine.issues, hint, opts.gate);
      if (!next) break;
      spec = next;
      continue;
    }

    if (opts.skipAudience) {
      rounds.push({ round, machine, audience: null, rewriteHint: '' });
      return { pass: true, spec, rounds, remainingIssues: machine.issues.filter((i) => i.level === 'warn') };
    }

    // 🔑 Giao ngân sách ký tự CHO CẢ HỘI ĐỒNG, không chỉ cho người viết lại.
    // Lỗi nặng nhất của lượt khảo sát nằm đúng ở đây: hội đồng đề nghị những
    // câu mở đầu 70–100 ký tự (*"Bản đồ sao: Hơn cả cung hoàng đạo, khám phá
    // con người thật của bạn qua Mặt Trăng, Cung Mọc và 12 nhà!"*), người viết
    // lại nghe theo đúng nguyên văn, rồi cổng 1 giết vì `hook.too-long`. Hai
    // cổng cùng một hệ thống mà ra lệnh ngược nhau — 22/24 clip dính ít nhất
    // một vòng vì chuyện này.
    const nsCong2 = nganSachKyTu(spec, opts.gate);
    const audience = await runAudienceGate(spec, {
      hookMaxChars: nsCong2.hook,
      sceneMaxChars: nsCong2.canh,
    });
    const thisRound: LoopRound = {
      round,
      machine,
      audience,
      rewriteHint: audience.pass ? '' : audience.goiYSua,
    };
    rounds.push(thisRound);

    // Chốt bản tốt nhất NGAY SAU khi chấm, trước khi vòng sau ghi đè `spec`.
    const d = diem(audience);
    if (d > bestScore) {
      bestScore = d;
      bestSpec = spec;
      bestRound = thisRound;
    }

    if (audience.pass) {
      return {
        pass: true,
        spec,
        rounds,
        remainingIssues: [...machine.issues, ...audience.issues].filter((i) => i.level === 'warn'),
      };
    }

    /*
     * ── DỪNG NGAY khi lời chê là về HÌNH ────────────────────────────────────
     *
     * 🔑 `rewriteSpec` CHỈ sửa CHỮ — luật 1 của nó ghi thẳng "không đụng phần
     * hình". Đưa cho nó một lỗi về phần nhìn là ra lệnh cho một cái máy làm
     * việc nó không có tay để làm: nó sẽ viết lại lời, cổng chấm lại, và người
     * xem bỏ đi ở đúng giây cũ vì đúng lý do cũ.
     *
     * Đo trên `ba-the-be-tac`: ba bản × ~9 vòng, kết quả PHẲNG (0/4 → 1/4 →
     * 0/5). Mỗi vòng thừa đốt hai lượt LLM (hội đồng + người viết lại) để nhận
     * lại nguyên văn lời chê cũ.
     *
     * ⇒ Thấy `visual.format` thì dừng và NÓI ĐÚNG việc phải làm. Đây là kết
     * luận về ĐỊNH DẠNG, và định dạng là quyết định của người, không phải thứ
     * vòng lặp này có cần gạt để chỉnh.
     */
    if (audience.issues.some((i) => i.code === 'visual.format' && i.level === 'block')) {
      console.error(
        '[viral-loop] DỪNG SỚM: lời chê nằm ở PHẦN NHÌN, không phải ở lời. ' +
          'Vòng viết lại chỉ sửa được CHỮ nên chạy tiếp là đốt lượt model để nhận lại ' +
          'đúng lời chê này. Đổi ĐỊNH DẠNG cảnh rồi chạy lại.'
      );
      break;
    }

    if (round === maxRounds) break;
    const next = await vietLaiChoQuaCong1(spec, audience.issues, audience.goiYSua, opts.gate);
    if (!next) break;
    spec = next;
  }

  // ⚠️ Lỗi còn lại phải MÔ TẢ ĐÚNG BẢN GIAO RA. Lấy của vòng cuối trong khi
  // giao bản vòng 1 là in ra lý do của một kịch bản khác — đúng lớp lỗi "đo
  // một đằng, báo một nẻo" đã ghi trong CLAUDE.md. Chưa vòng nào tới được hội
  // đồng thì mới rơi về vòng cuối (lúc đó bestSpec = bản gốc, và lỗi cổng 1
  // của vòng cuối là thứ gần nhất nói được vì sao không đi tiếp).
  const nguon = bestRound ?? rounds[rounds.length - 1];
  return {
    pass: false,
    // Hết vòng mà chưa qua ⇒ giao bản TỐT NHẤT đã chấm, không phải bản cuối.
    spec: bestSpec,
    rounds,
    remainingIssues: [
      ...(nguon?.machine.issues ?? []),
      ...(nguon?.audience?.issues ?? []),
    ].filter((i) => i.level === 'block'),
  };
}
