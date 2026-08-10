// app/api/gio-sinh/route.ts
// POST /api/gio-sinh?preview=1  — TÍNH THỬ: 12 lá số khả nghi + câu hỏi đầu, KHÔNG thu tiền
// POST /api/gio-sinh            — khảo sát thích ứng + kết quả (đường trả tiền)
//
// Tool "Xác Định Giờ Sinh". 0 lượt LLM, toàn bộ tra bảng (~100ms/lượt).
//
// ── VÌ SAO KHÔNG DÙNG `portrait_cache` ───────────────────────
// Cache của các tool kia khoá theo LÁ SỐ vì cùng lá số ra cùng kết quả. Ở đây
// kết quả phụ thuộc BỘ TRẢ LỜI, mà bộ trả lời thì mỗi lượt một khác — khoá
// theo lá số là phục vụ lại kết quả của lượt trước cho một bộ trả lời mới.
// Và cache sinh ra để tiết kiệm lượt gọi model; tool này không gọi model nào.
// ⇒ Không cache, và vì thế cũng không nằm trong phạm vi `check:cacheshape`.
//
// ── VÌ SAO KHẢO SÁT NHIỀU LƯỢT MÀ CHỈ THU TIỀN MỘT LẦN ───────
// `toolPaymentDenied` là phép KIỂM chứ không phải phép THU: client trả một lần
// qua `action=deduct` với slug `gio-sinh-<khoá lá số>`, rồi mọi lượt hỏi sau
// đều qua cửa bằng `hasSlugAccess` trên CÙNG slug đó. Không có trạng thái phiên
// nào ở server — client gửi lại trọn bộ câu đã trả lời mỗi lượt.

export const maxDuration = 60;
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { toolPaymentDenied } from '@/lib/billing/credits';
import { withToolOutcome } from '@/lib/ops/tool-outcome';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { lasoKey } from '@/lib/portraits/cache';
import type { BirthParams } from '@/lib/contract/v1';
import {
  buildHypotheses,
  buildQuestionBank,
  nextQuestion,
  scoreHours,
  publicQuestion,
  CHI_GIO,
  KHUNG_GIO,
  type SurveyAnswer,
} from '@/lib/engine/gio-sinh';

const TOOL_ID = 'gio-sinh';

/** Trần câu hỏi. Đo được: thích ứng dùng TRUNG BÌNH 4,5 câu là chạm ngưỡng. */
const BUDGET = 8;

function validBirth(b: unknown): b is BirthParams {
  const x = b as BirthParams | undefined;
  return Boolean(x && Number(x.year) > 0 && Number(x.month) > 0 && Number(x.day) > 0);
}

/** Chuẩn hoá bộ trả lời client gửi lên — KHÔNG tin shape từ client. */
function cleanAnswers(raw: unknown): SurveyAnswer[] {
  if (!Array.isArray(raw)) return [];
  const out: SurveyAnswer[] = [];
  const seen = new Set<string>();
  for (const r of raw.slice(0, 20)) {
    const id = String((r as SurveyAnswer)?.id ?? '').slice(0, 40);
    const value = String((r as SurveyAnswer)?.value ?? '').slice(0, 40);
    if (!id || !value || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, value });
  }
  return out;
}

export function OPTIONS() {
  return options();
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  const birth = (body as { birth?: unknown })?.birth;
  if (!validBirth(birth)) return err('Thiếu ngày/tháng/năm sinh.', 400);

  const isPreview = req.nextUrl.searchParams.get('preview') === '1';

  // ── ĐƯỜNG TÍNH THỬ ────────────────────────────────────────
  // Rẽ nhánh NGAY tại đây, TRƯỚC `withToolOutcome`: lượt tính thử không phải
  // một lượt chạy tool, ghi nó vào sổ là thổi mẫu số tỉ lệ hỏng.
  // KHÔNG đòi đăng nhập — cả điểm của tính thử là bỏ tường trước khi người ta
  // thấy tool có đúng không, mà màn đăng nhập cũng là một bức tường.
  if (isPreview) return runPreview(birth);

  return withToolOutcome(TOOL_ID, async () => {
    const auth = await authUserFromRequest(req);
    if ('error' in auth) return err(auth.error, auth.status);
    const user = auth.user;

    const slug = `${TOOL_ID}-${lasoKey({ ...birth, hourBranch: 0 })}`;
    const denied = await toolPaymentDenied(TOOL_ID, user.id, slug);
    if (denied) return err(denied, 402);

    const set = buildHypotheses(birth);
    if (!set) return err('Không lập được lá số từ ngày sinh này.', 400);
    const bank = buildQuestionBank(set);
    const answers = cleanAnswers((body as { answers?: unknown })?.answers);

    const q = nextQuestion(bank, answers, { budget: BUDGET });
    if (q) {
      return ok({
        success: true,
        done: false,
        daHoi: answers.length,
        tongToiDa: Math.min(BUDGET, bank.length),
        question: publicQuestion(q),
      });
    }

    const ketQua = scoreHours(set, bank, answers);
    return ok({
      success: true,
      done: true,
      ketQua,
      // Bộ trả lời trả ngược về để client lưu kèm khi người dùng TỰ KHAI biết
      // chắc giờ sinh — nguyên liệu hiệu chuẩn, xem `SurveyOutcome`.
      answers,
    });
  });
}

/**
 * TÍNH THỬ: bày ĐÚNG cái chứng minh bài toán có thật — 12 lá số của cùng một
 * ngày sinh khác nhau tới đâu — rồi hỏi câu buổi sinh (câu rẻ nhất, cắt 12 → 6).
 *
 * CỐ Ý không chạy trọn khảo sát ở đây: phần trả tiền là bộ câu hỏi thích ứng
 * dựng riêng theo ngày sinh + xếp hạng có bằng chứng.
 */
function runPreview(birth: BirthParams) {
  const set = buildHypotheses(birth);
  if (!set) return err('Không lập được lá số từ ngày sinh này.', 400);
  const bank = buildQuestionBank(set);
  const buoi = bank.find((q) => q.id === 'buoi');

  return ok({
    success: true,
    preview: true,
    tuoi: set.tuoi,
    /** 12 giả thuyết — bày để người ta THẤY chúng khác nhau thật. */
    ungVien: set.hyps.map((h) => ({
      gioIdx: h.gioIdx,
      chi: h.chi,
      khung: h.khung,
      cuc: h.cuc,
      menhStars: h.menhStars,
      tatStars: h.tatStars,
    })),
    /** Số câu hỏi khảo sát dựng được RIÊNG cho ngày sinh này. */
    soCauHoi: Math.min(BUDGET, bank.length),
    question: buoi ? publicQuestion(buoi) : null,
    chiGio: CHI_GIO,
    khungGio: KHUNG_GIO,
  });
}
