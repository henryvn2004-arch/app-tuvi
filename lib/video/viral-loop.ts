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
  estimateSpeechSeconds,
  estimateTotalSeconds,
  spokenCta,
  spokenSceneText,
} from './script-spec';
import {
  THRESHOLDS,
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
function nganSachKyTu(spec: ScriptSpec, gate?: GateOptions) {
  const kyTu = (giay: number) => Math.floor(giay * TTS_CHARS_PER_SECOND);
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

  for (let round = 1; round <= maxRounds; round++) {
    const machine = runMachineGate(spec, opts.gate);

    // Cổng 1 trượt ⇒ chưa tốn lượt LLM nào cho cổng 2.
    if (!machine.pass) {
      const hint = '';
      rounds.push({ round, machine, audience: null, rewriteHint: hint });
      if (round === maxRounds) break;
      const next = await rewriteSpec(spec, machine.issues, hint, opts.gate);
      if (!next) break;
      spec = next;
      continue;
    }

    if (opts.skipAudience) {
      rounds.push({ round, machine, audience: null, rewriteHint: '' });
      return { pass: true, spec, rounds, remainingIssues: machine.issues.filter((i) => i.level === 'warn') };
    }

    const audience = await runAudienceGate(spec);
    rounds.push({ round, machine, audience, rewriteHint: audience.pass ? '' : audience.goiYSua });

    if (audience.pass) {
      return {
        pass: true,
        spec,
        rounds,
        remainingIssues: [...machine.issues, ...audience.issues].filter((i) => i.level === 'warn'),
      };
    }

    if (round === maxRounds) break;
    const next = await rewriteSpec(spec, audience.issues, audience.goiYSua, opts.gate);
    if (!next) break;
    spec = next;
  }

  const last = rounds[rounds.length - 1];
  return {
    pass: false,
    spec,
    rounds,
    remainingIssues: [...(last?.machine.issues ?? []), ...(last?.audience?.issues ?? [])].filter(
      (i) => i.level === 'block'
    ),
  };
}
