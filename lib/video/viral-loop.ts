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
import { type ScriptSpec, estimateTotalSeconds } from './script-spec';
import {
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
1. Giữ nguyên \`sourceType\`, \`sourceId\`, số lượng cảnh và phần \`visual\` của
   từng cảnh. Bạn CHỈ được sửa chữ: \`hook\` và \`scenes[].text\`.
   (Phần \`visual\` gắn với clip quay màn hình đã có — đổi nó là kịch bản nói
   một đằng, hình chiếu một nẻo.)
2. CÂU KẾT và mọi cảnh đánh dấu [KHOÁ] là BẤT BIẾN — không sửa, không trả về.
   Chúng mang tên miền / mã khuyến mãi và có BẢN ĐỌC riêng gửi cho máy đọc;
   sửa chữ mà bản đọc giữ nguyên thì phụ đề một đằng, tiếng một nẻo — hỏng IM
   LẶNG, không lỗi nào bắn ra.
3. Giọng: người Việt nói chuyện tự nhiên, KHÔNG sáo rỗng, KHÔNG "các bạn thân
   mến", KHÔNG hô hào. Xưng "bạn" với người xem.
4. TUYỆT ĐỐI KHÔNG hứa chắc chắn về tương lai ("chắc chắn sẽ giàu", "nhất định
   gặp may"). Nói về xu hướng, gợi ý, điều đáng lưu tâm.
5. Tránh giọng mê tín cực đoan (định mệnh không đổi được, không xem là gặp hoạ)
   — vừa sai với tinh thần trang, vừa dễ bị nền tảng hạn chế phân phối.
6. Mỗi ký tự đều tốn thời gian đọc: khoảng 13,6 ký tự = 1 giây. Cần cắt ngắn
   thì cắt CHỮ, đừng cắt ý.

Trả về ĐÚNG JSON: {"hook": "...", "scenes": ["...", "..."]}
với \`scenes\` là mảng lời đọc theo đúng thứ tự cảnh cũ, đúng số lượng — cảnh
[KHOÁ] thì chép nguyên văn vào đúng vị trí của nó.`;

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    hook: { type: 'string' },
    scenes: { type: 'array', items: { type: 'string' } },
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

async function rewriteSpec(spec: ScriptSpec, issues: GateIssue[], hint: string): Promise<ScriptSpec | null> {
  const loi = issues
    .filter((i) => i.level === 'block')
    .map((i, n) => `${n + 1}. [${i.code}] ${i.message}${i.fix ? `\n   → CÁCH SỬA: ${i.fix}` : ''}`)
    .join('\n');

  const res = await llmTextFull({
    system: REWRITE_SYSTEM,
    prompt:
      `KỊCH BẢN HIỆN TẠI (dài ${estimateTotalSeconds(spec).toFixed(1)}s):\n` +
      `hook: "${spec.hook}"\n` +
      spec.scenes
        .map((s, i) => `cảnh ${i + 1}${khoa(s) ? ' [KHOÁ]' : ''}: "${s.text}"`)
        .join('\n') +
      `\nCÂU KẾT (bất biến, không sửa): "${spec.cta}"\n\n` +
      `LỖI PHẢI SỬA:\n${loi}\n` +
      (hint ? `\nCHỈ DẪN TỪ HỘI ĐỒNG NGƯỜI XEM:\n${hint}\n` : '') +
      `\nViết lại, giữ đúng ${spec.scenes.length} cảnh.`,
    json: true,
    jsonSchema: REWRITE_SCHEMA,
    maxTokens: 1600,
    temperature: 0.8,
  });

  const p = parseLlmJson(res.text) as { hook?: string; scenes?: string[] } | null;
  if (!p?.hook || !Array.isArray(p.scenes)) return null;

  // Sai số cảnh ⇒ BỎ bản viết lại. Ghép bừa sẽ làm lời đọc lệch khỏi hình đang
  // chiếu — kiểu hỏng im lặng, không lỗi nào bắn ra, chỉ có clip vô nghĩa.
  if (p.scenes.length !== spec.scenes.length) return null;

  // Câu kết và cảnh [KHOÁ] giữ nguyên — ÉP ở đây chứ không chỉ dặn trong prompt.
  // Dặn là mong model nghe lời; ép là điều kiện luôn đúng. Với thứ hỏng im lặng
  // thì phải chốt ở chỗ không phụ thuộc model.
  return {
    ...spec,
    hook: p.hook,
    scenes: spec.scenes.map((sc, i) => (khoa(sc) ? sc : { ...sc, text: p.scenes![i] })),
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
      const next = await rewriteSpec(spec, machine.issues, hint);
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
    const next = await rewriteSpec(spec, audience.issues, audience.goiYSua);
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
