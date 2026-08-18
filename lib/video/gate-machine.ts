// lib/video/gate-machine.ts
// ============================================================
// CỔNG 1 — tầng MÁY. Chạy trước mọi thứ khác vì nó **0đ và dưới 1 giây**.
//
// Nguyên tắc chọn luật cho tầng này: CHỈ nhận thứ đo được CHẮC CHẮN (độ dài,
// vị trí, có/không). Mọi thứ cần đọc hiểu — hook có gây tò mò không, clip có
// trả được lời hứa không — đẩy sang cổng 2. Nhét đánh giá chủ quan vào regex
// là con đường ngắn nhất tới một bộ dò kêu oan, mà **bộ dò kêu oan là bộ dò bị
// tắt đi** (bài học đã trả giá ở `check:motifs`, `check:publish-filter`).
//
// HAI MỨC, cố ý không gộp:
//   `block` — chặn thẳng. Đây là lỗi mà clip dính vào thì gần như chắc chắn
//             chìm, và máy biết chắc 100% là nó có dính.
//   `warn`  — ghi lại để người đọc biết, KHÔNG chặn. Dành cho luật mà vùng
//             xám đủ rộng để một kịch bản tốt vẫn có thể vi phạm hợp lệ.
//
// ⚠️ Cổng này chặn được clip CHẮC CHẮN KHÔNG NỔI. Nó không hứa — và không thể
// hứa — điều ngược lại. Đừng đọc một kết quả `pass` thành "clip này sẽ viral".
// ============================================================

import {
  type ScriptSpec,
  TTS_CHARS_PER_SECOND,
  budgetChars,
  estimateSpeechSeconds,
  estimateTotalSeconds,
  spokenCta,
  spokenSceneText,
} from './script-spec';

export interface GateIssue {
  level: 'block' | 'warn';
  /** Mã ngắn để tra ngược, không đổi khi sửa câu chữ. */
  code: string;
  /** Nói đích danh chỗ hỏng — người đọc phải sửa được ngay, không phải đi đoán. */
  message: string;
  /** Gợi ý sửa cụ thể, dùng luôn làm chỉ dẫn cho vòng LLM viết lại. */
  fix?: string;
}

export interface MachineGateResult {
  pass: boolean;
  issues: GateIssue[];
  metrics: {
    totalSeconds: number;
    hookSeconds: number;
    sceneCount: number;
    longestSceneSeconds: number;
    charsPerSecond: number;
  };
}

// ── Ngưỡng ────────────────────────────────────────────────────────────────
// Mọi con số dưới đây là QUY ƯỚC TỰ ĐẶT (trừ TTS_CHARS_PER_SECOND vốn là số
// đo). Khai rõ ở đây thay vì rải rác trong hàm, để sửa một chỗ.

export const THRESHOLDS = {
  /** Hook phải đọc xong trong ~5 giây. Quá đó là người ta đã lướt. */
  hookMaxSeconds: 5,
  /** Trên mức này thì tỉ lệ xem hết tụt mạnh. */
  totalMaxSeconds: 45,
  /** Dưới mức này thì chưa kịp nói gì có giá trị. */
  totalMinSeconds: 12,
  /** Khoảng đẹp — ngoài khoảng thì `warn`, không chặn. */
  totalSweetSpot: [18, 32] as const,
  /** Một cảnh dài hơn mức này là một chỗ để người xem lướt đi. */
  sceneMaxSeconds: 8,
  /** Phụ đề: một cảnh dài quá thì phải cắt nhỏ mới hiện kịp. */
  sceneMaxChars: 180,
  /** Ít hơn thì clip không có nhịp, chỉ là một đoạn đọc dài. */
  minScenes: 3,
} as const;

interface PacingLimits {
  maxSeconds: number;
  sweetSpot: readonly [number, number];
}

/**
 * Nới trần độ dài cho một lượt chạy.
 *
 * 🔑 VÌ SAO LÀ THAM SỐ chứ không phải sửa thẳng `THRESHOLDS`: 45 giây đúng cho
 * clip DEMO CÔNG CỤ — ở đó người xem chỉ cần thấy công cụ chạy, dài hơn là
 * thừa. Nhưng clip dạy một điều gì đó ("ba kiểu người khi bị tổn thương") thì
 * 25–30 giây mới đủ hook xong đã hết, người xem không học được gì và clip đọc
 * thành quảng cáo. Hai loại nội dung cần hai trần khác nhau.
 *
 * ⚠️ Nới trần KHÔNG phải nới chuẩn. Mọi luật còn lại (hook ≤5s, cảnh ≤8s,
 * ngôn ngữ danh tính, cấm giọng hướng dẫn) giữ nguyên — chỉ riêng câu hỏi
 * "clip được phép dài bao nhiêu" là quyết định vận hành, nên nó ra ngoài.
 */
export interface GateOptions {
  maxSeconds?: number;
  sweetSpot?: readonly [number, number];
}

/**
 * Năm dạng mở đầu đã biết là giữ được người xem. Kịch bản không thuộc dạng nào
 * thì gần như chắc chắn là một câu mô tả phẳng ("Đây là công cụ xem tuổi") —
 * loại mở đầu chìm nhanh nhất.
 *
 * Dò bằng dấu hiệu BỀ MẶT thôi; việc hook có thật sự gây tò mò hay không là
 * câu hỏi của cổng 2.
 */
const HOOK_PATTERNS: Array<{ id: string; test: (h: string) => boolean }> = [
  { id: 'cau-hoi', test: (h) => /\?/.test(h) },
  { id: 'con-so', test: (h) => /\d/.test(h) },
  {
    id: 'loi-cam',
    test: (h) => /\b(đừng|chớ|không nên|tuyệt đối không|dừng ngay)\b/i.test(h),
  },
  {
    id: 'goi-ten',
    test: (h) => /\b(ai |những ai|bạn nào|người tuổi|nếu bạn|ai đang)\b/i.test(h),
  },
  {
    id: 'nghich-ly',
    test: (h) =>
      /\b(hoá ra|hóa ra|tưởng|nhưng thật ra|ít ai biết|hầu hết|sai lầm|thật ra)\b/i.test(h),
  },
];

/** Mở đầu bằng mấy cụm này là ném đi 3 giây quý nhất của clip. */
const HOOK_BANNED_OPENERS =
  /^\s*(xin chào|chào (các )?(bạn|mọi người)|hôm nay|trong (video|clip) này|kính chào|chào mừng|mình là|tôi là)/i;

/**
 * 🔴 NGÔN NGỮ HƯỚNG DẪN THAO TÁC — dấu hiệu chắc chắn nhất của một clip chìm.
 *
 * Đây là luật đắt nhất trong file, rút từ một bản dựng thật bị chê "boring":
 * kịch bản khi đó là *"Gõ ngày sinh. Gõ họ tên. Cộng hết chữ số lại…"* — tức
 * một video HƯỚNG DẪN SỬ DỤNG đội lốt clip giải trí. Không ai lướt TikTok để
 * xem người khác điền form.
 *
 * Clip phải nói về ĐIỀU NGƯỜI XEM SẮP BIẾT VỀ CHÍNH MÌNH, còn công cụ chỉ là
 * đường để họ tự tra. Thao tác nếu có thì để HÌNH kể, đừng để lời đọc kể.
 */
/*
 * 🪤 `chọn` phải loại trừ mấy cụm DANH TỪ chứa nó. Lượt khảo sát 24 kịch bản
 * bắt được clip `kinh-dich` trượt hai vòng liền vì hook *"Bạn có đang mắc kẹt
 * trong một lựa chọn quan trọng?"* — "lựa chọn" ở đây là DANH TỪ (một quyết
 * định), không phải lời sai người xem đi bấm cái gì. Đúng lớp lỗi `\bcon\b`
 * khớp "con vật" đã ghi hai lần trong CLAUDE.md, nay là lần thứ ba.
 *
 * ⚠️ Nới bằng cách loại trừ ĐÍCH DANH ba cụm danh từ, KHÔNG bằng cách bỏ `chọn`
 * ra khỏi bảng: "chọn ngày rồi bấm xem" vẫn phải bị chặn.
 */
const HOW_TO_VERBS =
  /\b(gõ|bấm|nhập|điền|(?<!lựa )chọn(?! lựa| lọc)|kéo xuống|cuộn|ấn vào|nhấn|tải app|truy cập|đăng nhập)\b/i;

/**
 * Ngôn ngữ DANH TÍNH — thứ làm người xem thấy "đang nói đúng mình".
 *
 * Clip tử vi không có mấy chữ này gần như chắc chắn đang giảng giải kiến thức
 * thay vì nói về người xem. Đo bằng cách đếm chứ không chỉ có/không: một câu
 * "của bạn" duy nhất trong 20 giây là chưa đủ để tạo cảm giác đó.
 */
const IDENTITY_WORDS = /\b(bạn|mình|tôi|của bạn|bạn thuộc|vì sao bạn|tại sao bạn)\b/gi;

/**
 * Số lần tối thiểu phải nhắc tới người xem, suy từ số cảnh.
 *
 * 🔑 Export ra vì vòng viết lại cần biết con số này TRƯỚC khi viết, không phải
 * sau khi trượt. Lượt khảo sát có `kim-lau` và `bon-buoc-truoc-khi-roi-di` trượt
 * `viral.no-identity` ở đúng vòng cuối — model không có cách nào biết ngưỡng nếu
 * không ai nói, nên nó viết một bản gọn gàng rồi chết vì thiếu chữ "bạn".
 */
export function minIdentityHits(sceneCount: number): number {
  return Math.max(3, Math.ceil(sceneCount * 0.8));
}

/**
 * Lời mời tương tác — thứ đẻ ra comment/share, tín hiệu xếp hạng mạnh nhất.
 *
 * 🪤 Bản đầu chỉ có danh sách cụm cố định (`comment · bình luận · gửi cho…`) và
 * nó KÊU OAN 11/17 kịch bản: câu kết *"Bạn mệnh gì?"*, *"Bạn tuổi gì?"* đúng là
 * câu người xem trả lời được ngay trong ô bình luận, chỉ là không trúng cụm nào
 * trong bảng. Bộ dò kêu oan là bộ dò bị tắt đi — nên nới đúng chỗ nó đo hụt.
 *
 * ⚠️ Nới bằng một tính chất ĐO ĐƯỢC, không bằng cách thêm vài cụm nữa vào bảng:
 * *một câu HỎI NGẮN nói thẳng với người xem*. Giới hạn 40 ký tự giữa "bạn" và
 * dấu hỏi là để không nhận nhầm một đoạn văn dài tình cờ có cả hai thứ.
 */
const INVITE_WORDS =
  /\b(comment|bình luận|gửi cho|tag|nhắn cho|bạn số mấy|bạn thuộc|thử xem)\b|\bbạn\b[^.!?]{0,40}\?/i;

/**
 * Chuỗi kỹ thuật không bao giờ được lọt ra hình/tiếng. Lớp lỗi này đã cắn
 * repo nhiều lần ở bề mặt khác (khoá thô vào prompt, chữ Hán ra giao diện,
 * `[object Object]` trong bản đọc) — với video thì nó nằm vĩnh viễn trong file
 * đã đăng, không sửa được như một dòng DB.
 */
const LEAK_PATTERNS = [
  /\[object Object\]/,
  /\bundefined\b/,
  /\bNaN\b/,
  /\bnull\b/,
  /\{\{.*?\}\}/,
];

function checkHook(spec: ScriptSpec, issues: GateIssue[]): number {
  const hook = spec.hook.trim();
  const secs = estimateSpeechSeconds(hook);

  if (!hook) {
    issues.push({
      level: 'block',
      code: 'hook.missing',
      message: 'Không có câu mở đầu.',
      // Con số lấy từ `budgetChars`, KHÔNG ghi cứng: bản cũ ghi "60" trong khi
      // `hook.too-long` ngay dưới suy ra 62 — hai trần cho một ràng buộc, đúng
      // cái bẫy vừa tốn ba vòng viết lại của `ba-the-be-tac`. Hôm nay lệch 2 ký
      // tự nên vô hại, nhưng đổi `hookMaxSeconds` một lượt là nó cắn thật.
      fix: `Viết một câu mở đầu dưới ${budgetChars(THRESHOLDS.hookMaxSeconds)} ký tự, đặt câu hỏi hoặc nêu một con số cụ thể.`,
    });
    return 0;
  }

  if (secs > THRESHOLDS.hookMaxSeconds) {
    issues.push({
      level: 'block',
      code: 'hook.too-long',
      message: `Câu mở đầu đọc mất ${secs.toFixed(1)}s (trần ${THRESHOLDS.hookMaxSeconds}s) — người xem đã lướt trước khi nghe hết.`,
      fix: `Rút xuống dưới ${budgetChars(THRESHOLDS.hookMaxSeconds)} ký tự, giữ đúng ý gây tò mò.`,
    });
  }

  if (HOOK_BANNED_OPENERS.test(hook)) {
    issues.push({
      level: 'block',
      code: 'hook.banned-opener',
      message: 'Mở đầu bằng lời chào/giới thiệu — ba giây quý nhất của clip bị tiêu vào chỗ không mang thông tin.',
      fix: 'Bỏ hẳn lời chào. Vào thẳng điều bất ngờ hoặc câu hỏi.',
    });
  }

  const matched = HOOK_PATTERNS.filter((p) => p.test(hook)).map((p) => p.id);
  if (matched.length === 0) {
    // ⚠️ `warn` chứ KHÔNG phải `block`, và đây là một lần đặt nhầm tầng đã sửa:
    // "hook có thuộc dạng giữ chân không" là câu ĐỌC HIỂU, không phải thứ đo
    // được bằng regex. Bản đầu để `block` và nó chặn ngay hook đầu tiên —
    // "Ngày sinh của bạn giấu một con số." — vốn là một hook tốt (ngắn, nói
    // thẳng với người xem, gợi tò mò), chỉ vì chữ "con số" viết bằng chữ nên
    // `/\d/` không khớp. Kêu oan đúng một lần là đủ để thấy luật sai tầng:
    // việc thẩm định chất lượng hook thuộc về cổng 2, nơi có người xem giả lập
    // đọc nó. Ở đây chỉ giữ làm tín hiệu tham khảo.
    issues.push({
      level: 'warn',
      code: 'hook.no-pattern',
      message:
        'Câu mở đầu không khớp dạng nào trong năm dạng thường giữ được người xem (câu hỏi · con số · lời cấm · gọi tên đối tượng · nghịch lý) — cổng 2 sẽ soi kỹ chỗ này.',
    });
  }

  return secs;
}

function checkPacing(spec: ScriptSpec, issues: GateIssue[], limits: PacingLimits) {
  const total = estimateTotalSeconds(spec);

  if (total > limits.maxSeconds) {
    issues.push({
      level: 'block',
      code: 'length.too-long',
      message: `Clip dài ${total.toFixed(0)}s (trần ${limits.maxSeconds}s) — tỉ lệ xem hết tụt mạnh sau mốc này.`,
      fix: `Cắt bớt ~${Math.ceil((total - limits.maxSeconds) * TTS_CHARS_PER_SECOND)} ký tự lời đọc, bỏ cảnh ít giá trị nhất.`,
    });
  }
  if (total < THRESHOLDS.totalMinSeconds) {
    issues.push({
      level: 'block',
      code: 'length.too-short',
      message: `Clip chỉ ${total.toFixed(0)}s — chưa kịp nói điều gì đáng giá.`,
      fix: 'Thêm một cảnh nêu thông tin cụ thể dùng được.',
    });
  }
  const [lo, hi] = limits.sweetSpot;
  if (total >= THRESHOLDS.totalMinSeconds && (total < lo || total > hi)) {
    issues.push({
      level: 'warn',
      code: 'length.off-sweet-spot',
      message: `Clip ${total.toFixed(0)}s — ngoài khoảng ${lo}–${hi}s vốn giữ chân tốt nhất.`,
    });
  }

  if (spec.scenes.length < THRESHOLDS.minScenes) {
    issues.push({
      level: 'block',
      code: 'scenes.too-few',
      message: `Chỉ có ${spec.scenes.length} cảnh — clip không có nhịp, chỉ là một đoạn đọc dài.`,
      fix: `Chia thành ít nhất ${THRESHOLDS.minScenes} cảnh, mỗi cảnh đổi hình.`,
    });
  }

  spec.scenes.forEach((sc, i) => {
    const secs = sc.forceSeconds ?? estimateSpeechSeconds(spokenSceneText(sc));
    if (secs > THRESHOLDS.sceneMaxSeconds) {
      issues.push({
        level: 'block',
        code: 'scene.too-long',
        message: `Cảnh ${i + 1} kéo ${secs.toFixed(1)}s (trần ${THRESHOLDS.sceneMaxSeconds}s) — màn hình đứng quá lâu, đây là chỗ người xem lướt đi.`,
        // 🔴 Ô `fix` PHẢI TRỎ VÀO ĐÚNG CẦN GẠT LÀM ĐỔI PHÉP ĐO. Bản cũ ghi
        // *"tách cảnh làm hai, hoặc đổi hình giữa chừng"* — mà phép đo ngay
        // trên là `estimateSpeechSeconds(spokenSceneText)`, tức THUẦN ĐỘ DÀI
        // CHỮ: đổi hình không đổi một ký tự nào, còn tách cảnh thì tổng chữ
        // vẫn nguyên. Model làm đúng lời khuyên vẫn trượt lại y chỗ cũ —
        // `ba-kieu-ton-thuong` trượt `scene.too-long` CẢ BA vòng viết lại
        // (Actions 32125541824) đúng vì thế.
        //
        // Cùng họ với `hook.too-long` đã vá: nêu thẳng con số, và lấy từ
        // `budgetChars` DÙNG CHUNG với khối ngân sách của `viral-loop` — hai
        // nơi tự nhân trần một kiểu là model nhận hai con số cho một ràng buộc.
        fix:
          sc.forceSeconds !== undefined
            ? `Cảnh ${i + 1} đang khai cứng ${sc.forceSeconds}s — hạ xuống ≤${THRESHOLDS.sceneMaxSeconds}s, hoặc bỏ khai để độ dài đi theo lời đọc.`
            : `Rút lời đọc cảnh ${i + 1} xuống dưới ${budgetChars(THRESHOLDS.sceneMaxSeconds)} ký tự (đang ${spokenSceneText(sc).trim().length}). Đổi hình KHÔNG rút ngắn được — phép đo này chỉ tính chữ.`,
      });
    }
    if (sc.text.trim().length > THRESHOLDS.sceneMaxChars) {
      issues.push({
        level: 'warn',
        code: 'scene.subtitle-dense',
        message: `Cảnh ${i + 1} có ${sc.text.trim().length} ký tự — phụ đề sẽ phải chạy rất nhanh.`,
      });
    }
    if (!sc.text.trim()) {
      issues.push({
        level: 'block',
        code: 'scene.silent',
        message: `Cảnh ${i + 1} không có lời đọc — sẽ thành khoảng lặng không phụ đề.`,
        fix: 'Thêm lời đọc cho cảnh, hoặc bỏ hẳn cảnh này.',
      });
    }
  });
}

function checkCta(spec: ScriptSpec, issues: GateIssue[]) {
  const cta = spec.cta.trim();
  if (!cta) {
    issues.push({
      level: 'block',
      code: 'cta.missing',
      message: 'Không có lời mời hành động — clip xem xong không dẫn người ta đi đâu.',
      fix: 'Thêm một câu ngắn chỉ đúng một đường đi (ví dụ: tra thử tại tuviminhbao.com).',
    });
    return;
  }
  const secs = estimateSpeechSeconds(spokenCta(spec));
  if (secs > 6) {
    issues.push({
      level: 'warn',
      code: 'cta.too-long',
      message: `Lời mời hành động đọc mất ${secs.toFixed(1)}s — phần đuôi clip là chỗ người xem rơi nhiều nhất.`,
    });
  }
}

function checkLeaks(spec: ScriptSpec, issues: GateIssue[]) {
  // Quét CẢ hai bản chữ: rò rỉ trong bản đọc thì không thấy trên phụ đề nhưng
  // vẫn phát ra tiếng, và ngược lại. Bản nào cũng ra tới người xem.
  const all = [
    spec.hook,
    ...spec.scenes.flatMap((s) => [s.text, s.speech ?? '']),
    spec.cta,
    spec.ctaSpeech ?? '',
  ].join(' \n ');
  for (const re of LEAK_PATTERNS) {
    const m = all.match(re);
    if (m) {
      issues.push({
        level: 'block',
        code: 'leak.technical',
        message: `Lời đọc lọt chuỗi kỹ thuật: "${m[0]}".`,
        fix: 'Sửa nguồn dựng kịch bản — đừng vá bằng cách xoá tay, lần sau sẽ lọt lại.',
      });
      break;
    }
  }
}

/**
 * Luật "clip phải nói về NGƯỜI XEM, không phải về công cụ".
 *
 * Toàn bộ nhóm luật này rút từ bộ nguyên tắc Henry chốt cho kênh:
 *   STOP SCROLL → CURIOSITY → RETENTION → EMOTION → PAYOFF → SHARE
 * và từ luật riêng cho nội dung tử vi: *đừng giảng giải, hãy trả lời "tôi là
 * người thế nào / vì sao tôi lại vậy"*.
 */
function checkViralShape(spec: ScriptSpec, issues: GateIssue[]) {
  const narration = [spec.hook, ...spec.scenes.map((s) => s.text), spec.cta].join(' \n ');

  // 1. Hướng dẫn thao tác trong LỜI ĐỌC → clip thành video chỉ việc.
  const firstHalf = [spec.hook, ...spec.scenes.slice(0, Math.ceil(spec.scenes.length / 2)).map((s) => s.text)];
  for (const [i, t] of firstHalf.entries()) {
    const m = t.match(HOW_TO_VERBS);
    if (m) {
      issues.push({
        level: 'block',
        code: 'viral.how-to-voice',
        message: `${i === 0 ? 'Câu mở đầu' : `Cảnh ${i}`} nói thao tác ("${m[0]}") — clip thành video hướng dẫn dùng công cụ, không ai lướt TikTok để xem người khác điền form.`,
        fix: 'Bỏ câu thao tác khỏi lời đọc. Để HÌNH kể việc bấm; lời đọc phải nói điều người xem sắp biết về CHÍNH MÌNH.',
      });
      break;
    }
  }

  // 2. Ngôn ngữ danh tính — "đang nói đúng mình".
  const idHits = (narration.match(IDENTITY_WORDS) ?? []).length;
  const minId = minIdentityHits(spec.scenes.length);
  if (idHits < minId) {
    issues.push({
      level: 'block',
      code: 'viral.no-identity',
      message: `Chỉ ${idHits} lần nhắc tới người xem (cần ≥${minId}) — clip đang giảng giải kiến thức thay vì nói về họ.`,
      fix: 'Viết lại theo hướng "bạn là người thế nào / vì sao bạn lại vậy", đừng mô tả bộ môn.',
    });
  }

  // 3. Mời tương tác — comment/share là tín hiệu xếp hạng mạnh nhất.
  if (!INVITE_WORDS.test(spec.cta) && !INVITE_WORDS.test(spec.scenes[spec.scenes.length - 1]?.text ?? '')) {
    issues.push({
      level: 'warn',
      code: 'viral.no-invite',
      message: 'Đoạn kết không mời tương tác — mất cơ hội đẻ comment/share.',
      fix: 'Thêm một câu hỏi ngắn người xem trả lời được ngay ("Bạn số mấy?").',
    });
  }

  // 4. Hook phải mở ra một khoảng trống tò mò, không phải một lời giới thiệu.
  // Dò rất thô — chỉ bắt ca hook mô tả chính công cụ, thứ chắc chắn không hook.
  if (/\b(công cụ|tính năng|website|trang web|ứng dụng|app này)\b/i.test(spec.hook)) {
    issues.push({
      level: 'block',
      code: 'viral.hook-about-product',
      message: 'Câu mở đầu nói về SẢN PHẨM. Ở giây thứ nhất chưa ai quan tâm mình có công cụ gì.',
      fix: 'Mở bằng một điều bất thường về chính người xem.',
    });
  }
}

function checkSubtitleSafety(spec: ScriptSpec, issues: GateIssue[]) {
  // Phụ đề là bắt buộc với TikTok Việt (phần lớn xem không bật tiếng). Hợp đồng
  // ScriptSpec dùng CHÍNH `scene.text` làm phụ đề nên không thể thiếu — nhưng
  // cảnh không có lời đọc thì thành khoảng câm, đã bắt ở `scene.silent` trên.
  const hasScreen = spec.scenes.some((s) => s.visual.kind === 'screen');
  if (spec.sourceType === 'tool-demo' && !hasScreen) {
    issues.push({
      level: 'block',
      code: 'visual.no-screen',
      message: 'Clip demo công cụ mà không có cảnh nào quay màn hình thật.',
      fix: 'Thêm ít nhất một cảnh `visual.kind = "screen"`.',
    });
  }
}

/** Chạy toàn bộ luật tầng máy. Không gọi mạng, không tốn tiền. */
export function runMachineGate(spec: ScriptSpec, opts: GateOptions = {}): MachineGateResult {
  const issues: GateIssue[] = [];
  const limits: PacingLimits = {
    maxSeconds: opts.maxSeconds ?? THRESHOLDS.totalMaxSeconds,
    sweetSpot: opts.sweetSpot ?? THRESHOLDS.totalSweetSpot,
  };

  const hookSeconds = checkHook(spec, issues);
  checkPacing(spec, issues, limits);
  checkCta(spec, issues);
  checkLeaks(spec, issues);
  checkViralShape(spec, issues);
  checkSubtitleSafety(spec, issues);

  const totalSeconds = estimateTotalSeconds(spec);
  const sceneSecs = spec.scenes.map(
    (s) => s.forceSeconds ?? estimateSpeechSeconds(spokenSceneText(s))
  );
  const totalChars = [spec.hook, ...spec.scenes.map(spokenSceneText), spokenCta(spec)].join(
    ' '
  ).length;

  return {
    pass: !issues.some((i) => i.level === 'block'),
    issues,
    metrics: {
      totalSeconds: Number(totalSeconds.toFixed(2)),
      hookSeconds: Number(hookSeconds.toFixed(2)),
      sceneCount: spec.scenes.length,
      longestSceneSeconds: Number(Math.max(0, ...sceneSecs).toFixed(2)),
      charsPerSecond: totalSeconds > 0 ? Number((totalChars / totalSeconds).toFixed(2)) : 0,
    },
  };
}
