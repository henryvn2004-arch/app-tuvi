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
import { runMachineGate, type GateIssue, type MachineGateResult } from './gate-machine';
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
   từng cảnh. Bạn CHỈ được sửa chữ: \`hook\`, \`scenes[].text\`, \`cta\`.
   (Phần \`visual\` gắn với clip quay màn hình đã có — đổi nó là kịch bản nói
   một đằng, hình chiếu một nẻo.)
2. Giọng: người Việt nói chuyện tự nhiên, KHÔNG sáo rỗng, KHÔNG "các bạn thân
   mến", KHÔNG hô hào. Xưng "bạn" với người xem.
3. TUYỆT ĐỐI KHÔNG hứa chắc chắn về tương lai ("chắc chắn sẽ giàu", "nhất định
   gặp may"). Nói về xu hướng, gợi ý, điều đáng lưu tâm.
4. Tránh giọng mê tín cực đoan (định mệnh không đổi được, không xem là gặp hoạ)
   — vừa sai với tinh thần trang, vừa dễ bị nền tảng hạn chế phân phối.
5. Mỗi ký tự đều tốn thời gian đọc: khoảng 13,6 ký tự = 1 giây. Cần cắt ngắn
   thì cắt CHỮ, đừng cắt ý.

Trả về ĐÚNG JSON: {"hook": "...", "scenes": ["...", "..."], "cta": "..."}
với \`scenes\` là mảng lời đọc theo đúng thứ tự cảnh cũ, đúng số lượng.`;

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    hook: { type: 'string' },
    scenes: { type: 'array', items: { type: 'string' } },
    cta: { type: 'string' },
  },
  required: ['hook', 'scenes', 'cta'],
};

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
      spec.scenes.map((s, i) => `cảnh ${i + 1}: "${s.text}"`).join('\n') +
      `\ncta: "${spec.cta}"\n\n` +
      `LỖI PHẢI SỬA:\n${loi}\n` +
      (hint ? `\nCHỈ DẪN TỪ HỘI ĐỒNG NGƯỜI XEM:\n${hint}\n` : '') +
      `\nViết lại, giữ đúng ${spec.scenes.length} cảnh.`,
    json: true,
    jsonSchema: REWRITE_SCHEMA,
    maxTokens: 1600,
    temperature: 0.8,
  });

  const p = parseLlmJson(res.text) as { hook?: string; scenes?: string[]; cta?: string } | null;
  if (!p?.hook || !Array.isArray(p.scenes) || !p.cta) return null;

  // Sai số cảnh ⇒ BỎ bản viết lại. Ghép bừa sẽ làm lời đọc lệch khỏi hình đang
  // chiếu — kiểu hỏng im lặng, không lỗi nào bắn ra, chỉ có clip vô nghĩa.
  if (p.scenes.length !== spec.scenes.length) return null;

  return {
    ...spec,
    hook: p.hook,
    cta: p.cta,
    scenes: spec.scenes.map((sc, i) => ({ ...sc, text: p.scenes![i] })),
  };
}

/**
 * Chạy vòng lặp kiểm–sửa.
 *
 * @param opts.skipAudience bỏ cổng 2 (không gọi LLM) — dùng khi chạy thử tại
 *   chỗ hoặc khi chưa có khoá model. Cổng 1 vẫn chạy đủ.
 */
export async function runViralLoop(
  input: ScriptSpec,
  opts: { skipAudience?: boolean; maxRounds?: number } = {}
): Promise<LoopResult> {
  const maxRounds = opts.maxRounds ?? MAX_ROUNDS;
  const rounds: LoopRound[] = [];
  let spec = input;

  for (let round = 1; round <= maxRounds; round++) {
    const machine = runMachineGate(spec);

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
