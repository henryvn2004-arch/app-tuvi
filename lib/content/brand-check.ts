// lib/content/brand-check.ts
// ============================================================
// BRAND-CHECK GATE — bước QC chạy TRƯỚC khi publish một bài.
//
// Vì sao có file này: `khao_luan` và `master_articles` KHÔNG có cột
// publish_status — insert xong là bài LÊN THẲNG trang. Nên chỗ duy nhất
// còn chặn được là ngay trước lệnh POST của 2 cron viết bài.
//
// Kiến trúc (theo đúng nguyên tắc đã chốt): tài liệu brand voice là ASSET
// DESIGN-TIME nằm trong Supabase (`brand_voice_docs`), file này chỉ ĐỌC.
// KHÔNG sinh lại tài liệu, KHÔNG dựng pipeline mới — chỉ thêm một bước
// vào pipeline đang chạy.
//
// HAI TẦNG, cố ý tách:
//   1. Tầng AUTO (regex) — KHÔNG gọi mạng, luôn chạy được kể cả khi Supabase
//      hay LLM chết. Luật nằm sẵn trong DEFAULT_RULES; app_config chỉ GHI ĐÈ.
//      Đây là lý do tầng này không có nhánh fail-open: nó không có gì để hỏng.
//   2. Tầng LLM (1 lượt) — bắt mấy thứ regex không thấy (bịa sao, rule-dump
//      trá hình, giới tính lệch). Hỏng thì FAIL-OPEN: chặn sạch nội dung chỉ
//      vì Gemini chớp một nhịp thì tệ hơn là lọt một bài chưa soi kỹ.
//
// TRÌNH TỰ: autofix (sửa máy móc) → check auto → check LLM → nếu còn lỗi thì
// MỘT vòng nhờ LLM viết lại → check auto lại. Vẫn hỏng thì chặn + cất bài vào
// `content_qc_log` (không vứt đi — chữ đã tốn tiền sinh ra rồi).
// ============================================================

import { llmText } from '@/lib/llm/complete';
import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Kiểu ───────────────────────────────────────────────────────────────────────

/**
 * Bề mặt nội dung. MỖI bề mặt một profile vì chúng là hai định dạng KHÁC HẲN
 * nhau, không phải hai mức độ nghiêm khắc của cùng một luật:
 *  - `khao-luan`       → bài Vấn Đáp ~1.400 ký tự, ngôi thứ BA, không tự xưng.
 *  - `khao-luan-tamly` → CÙNG định dạng `khao-luan` (Vấn Đáp, ngôi 3, cùng
 *    bảng `khao_luan`), khác ở ĐỀ TÀI: tâm lý/xã hội (tinh-cach/quan-he/
 *    benh-tat) — chạm tới cảm xúc/quan hệ/áp lực sống nên thêm 2 luật an
 *    toàn riêng (xem `checkLlm`) và MẶC ĐỊNH `mode:'block'` bất kể cấu hình
 *    chung — nội dung MỚI, chưa ai đọc qua, và rủi ro (chẩn đoán tâm lý qua
 *    lá số, framing khủng hoảng) nặng hơn hẳn 2 bề mặt kia.
 *  - `nghien-cuu`      → tùy bút 1.200–1.500 TỪ của persona thầy, ngôi thứ
 *    NHẤT, ký tên cuối bài. Đo trên prod: 300/306 bài dùng "tôi" — đó là
 *    ĐỊNH DẠNG, không phải lỗi trôi. Áp luật `khao-luan` sang đây sẽ chặn
 *    ~100% output.
 */
export type BrandProfile = 'khao-luan' | 'khao-luan-tamly' | 'nghien-cuu';

export interface BrandViolation {
  /** slug luật, để lọc/thống kê về sau */
  rule: string;
  severity: 'block' | 'warn';
  /** trích đúng chỗ sai để người đọc log biết sửa gì */
  detail: string;
  tier: 'auto' | 'llm';
}

export interface BrandCheckResult {
  pass: boolean;
  /** nội dung SAU autofix (+ sau vòng viết lại nếu có) — dùng cái này để lưu */
  content: string;
  /** danh sách autofix đã áp, để log */
  fixed: string[];
  violations: BrandViolation[];
  /** có phải đã tốn thêm 1 lượt LLM viết lại không */
  repaired: boolean;
  mode: GateMode;
}

type GateMode = 'block' | 'warn' | 'off';

interface ProfileRules {
  /** dải độ dài; đơn vị theo `lengthUnit` */
  minLen: number;
  maxLen: number;
  lengthUnit: 'chars' | 'words';
  /**
   * 'none'   = không được gọi người đọc (ngôi 3)
   * 'quy-vi' = gọi "quý vị", cấm "bạn"
   * 'free'   = KHÔNG ép ngôi nào — chỉ còn cấm TRỘN hai lối trong một bài.
   *
   * 🔵 Vì sao có 'free' (Henry chốt 2026-08-18): viral core là luật về NỘI DUNG
   * (mở bằng gì, hành vi, câu lật, chốt), không phải luật về đại từ. Hai luật
   * `reader-address` cũ lại cấm THẲNG việc nói với người đọc — mà "khiến người
   * đọc thấy đúng mình" thì thường phải gọi họ. Nới đúng chỗ cản, không nới bừa:
   * `allowSelfRef` GIỮ NGUYÊN vì viral core không đòi tự xưng "tôi".
   */
  readerAddress: 'none' | 'quy-vi' | 'free';
  /** cho phép tự xưng "tôi" không (tùy bút persona thì có) */
  allowSelfRef: boolean;
  requireBold: boolean;
  /** cấm emoji trong prose */
  banEmoji: boolean;
  /**
   * Ghi đè `BrandCheckConfig.mode` CHUNG cho riêng profile này. Không khai
   * → dùng mode chung. Dùng khi một bề mặt cần khác hẳn mức nghiêm khắc so
   * với phần còn lại — vd `khao-luan-tamly` phải chặn cứng ngay từ đầu,
   * không thể chờ "đọc log vài ngày rồi mới siết" như 2 bề mặt kia đã làm,
   * vì rủi ro nội dung (chẩn đoán tâm lý, framing khủng hoảng) nặng hơn.
   */
  mode?: GateMode;
}

interface BrandCheckConfig {
  enabled: boolean;
  mode: GateMode;
  /** bật/tắt tầng LLM riêng — tắt để tiết kiệm khi cần */
  llmTier: boolean;
  profiles: Record<BrandProfile, ProfileRules>;
}

// ── Luật mặc định (bản TS = nguồn dự phòng, app_config ghi đè) ──────────────────
// CỐ Ý để đủ luật ở đây thay vì bắt buộc đọc DB: tầng auto phải chạy được cả khi
// Supabase không với tới. app_config chỉ dùng để Henry nới/siết mà không deploy.

const DEFAULT_CONFIG: BrandCheckConfig = {
  enabled: true,
  // 'warn' chứ không 'block': chặn thật là quyết định của Henry, bật bằng
  // app_config (xem migration-content-qc.sql). Autofix vẫn áp ở mode này —
  // nên phần máy móc có hiệu lực ngay, phần cần phán đoán thì chỉ ghi sổ.
  mode: 'warn',
  llmTier: true,
  profiles: {
    'khao-luan': {
      minLen: 1200,
      maxLen: 1600,
      lengthUnit: 'chars',
      readerAddress: 'free',
      allowSelfRef: false,
      requireBold: true,
      banEmoji: true,
    },
    'khao-luan-tamly': {
      // Cùng hình dạng `khao-luan` — cùng bảng, cùng độ dài, cùng ngôi. Chỉ
      // khác `mode`: chặn cứng ngay từ đầu (xem giải thích ở `ProfileRules.mode`
      // và `BrandProfile`), không đợi Henry đọc log vài ngày như 2 bề mặt kia.
      minLen: 1200,
      maxLen: 1600,
      lengthUnit: 'chars',
      readerAddress: 'free',
      allowSelfRef: false,
      requireBold: true,
      banEmoji: true,
      mode: 'block',
    },
    'nghien-cuu': {
      // Prompt cron-master-write nhắm 1.200–1.500 từ; nới hai đầu để một bài
      // hay mà hơi dài/ngắn không bị chặn oan.
      minLen: 900,
      maxLen: 1800,
      lengthUnit: 'words',
      readerAddress: 'free',
      allowSelfRef: true,
      requireBold: true,
      banEmoji: true,
    },
  },
};

/** 12 cung — mỗi cung ĐÚNG MỘT tên (brand voice §5.1). */
const CUNG_NAMES = [
  'Mệnh',
  'Phụ Mẫu',
  'Phúc Đức',
  'Điền Trạch',
  'Quan Lộc',
  'Nô Bộc',
  'Thiên Di',
  'Tật Ách',
  'Tài Bạch',
  'Tử Tức',
  'Phu Thê',
  'Huynh Đệ',
];

/** 14 chính tinh + sát tinh + tứ hóa — dùng để chọn chỗ bôi đậm khi bài thiếu. */
const STAR_NAMES = [
  'Tử Vi',
  'Thiên Phủ',
  'Vũ Khúc',
  'Thiên Tướng',
  'Thiên Lương',
  'Thất Sát',
  'Phá Quân',
  'Tham Lang',
  'Cự Môn',
  'Thiên Cơ',
  'Thái Dương',
  'Thái Âm',
  'Liêm Trinh',
  'Thiên Đồng',
  'Kình Dương',
  'Đà La',
  'Hỏa Tinh',
  'Linh Tinh',
  'Địa Không',
  'Địa Kiếp',
  'Hóa Lộc',
  'Hóa Quyền',
  'Hóa Khoa',
  'Hóa Kỵ',
];

/**
 * Thay thế máy móc, an toàn tuyệt đối (1-1, không đổi nghĩa câu).
 * Phân biệt HOA/thường có chủ đích: "bằng hữu" viết thường là danh từ chung
 * hợp lệ ("bằng hữu tương trợ"), chỉ "Bằng Hữu" viết hoa mới là tên cung sai.
 */
const ALIAS_FIXES: { from: RegExp; to: string; label: string }[] = [
  { from: /Tử Nữ/g, to: 'Tử Tức', label: 'Tử Nữ → Tử Tức' },
  { from: /Tử Tôn/g, to: 'Tử Tức', label: 'Tử Tôn → Tử Tức' },
  { from: /Giao Hữu/g, to: 'Nô Bộc', label: 'Giao Hữu → Nô Bộc' },
  { from: /Bằng Hữu/g, to: 'Nô Bộc', label: 'Bằng Hữu → Nô Bộc' },
  { from: /cung Sự Nghiệp/g, to: 'cung Quan Lộc', label: 'cung Sự Nghiệp → cung Quan Lộc' },
  { from: /cung Hôn Nhân/g, to: 'cung Phu Thê', label: 'cung Hôn Nhân → cung Phu Thê' },
  { from: /cung Bệnh(?![\p{L}])/gu, to: 'cung Tật Ách', label: 'cung Bệnh → cung Tật Ách' },
  // Lookahead chặn "cung Điền Trạch" bị nối thành "cung Điền Trạch Trạch".
  { from: /cung Điền(?! Trạch)(?![\p{L}])/gu, to: 'cung Điền Trạch', label: 'cung Điền → cung Điền Trạch' },
  { from: /cung Tài(?! Bạch)(?![\p{L}])/gu, to: 'cung Tài Bạch', label: 'cung Tài → cung Tài Bạch' },
  // Lỗi chính tả Hán-Việt đã bắt được trong corpus (brand voice §7).
  { from: /(?<![\p{L}])Diểm(?![\p{L}])/gu, to: 'Điểm', label: 'Diểm → Điểm' },
  { from: /Di kim mãn yíng/g, to: 'Di kim mãn doanh', label: 'Di kim mãn yíng → Di kim mãn doanh' },
];

/** Sao KHÔNG tồn tại, đã lọt vào corpus. Không autofix vì thay bằng gì là mơ hồ. */
const FAKE_STARS = ['Văn Khoa', 'Cứu Tỉnh'];

const RE_MOJIBAKE = /â€|Ã¡|ï¿½|Æ°|Ä‘/;
const RE_H1 = /^# .+$/m;
// Điểm/10 và "Điểm:" là dấu hiệu rule-dump. CỐ Ý KHÔNG bắt dấu `%`: mẫu vàng
// của chính brand voice có "dành 30% lương mỗi tháng" — bắt % là chặn nhầm.
const RE_SCORE_DUMP = /\d+(?:[.,]\d+)?\s*\/\s*10(?![\p{L}\d])|Điểm\s*:\s*\d/u;
const RE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

// Đại từ: dùng lookaround Unicode vì `\b` của JS không hiểu chữ có dấu tiếng Việt.
// Loại trừ các DANH TỪ hợp lệ — "bạn đời", "bạn bè", "người bạn" là từ vựng bình
// thường của bài tử vi, đếm chúng là đại từ thì gate báo động giả tràn lan
// (đo thử: 98/324 bài "sai" → lọc đúng còn 14).
// ⚠️ `(?![\p{L}])` SAU nhóm loại trừ là bắt buộc, không phải thừa: thiếu nó thì
// nhánh `cũ` khớp luôn tiền tố của "cũng" ⇒ mọi câu "bạn cũng…" lọt gate. Bắt
// được lúc test, và "bạn cũng" là cụm cực phổ biến nên đây là lỗ thật sự rộng.
const RE_BAN =
  /(?<!(?:người|các|những|đôi|một)\s)(?<![\p{L}])bạn(?!\s*(?:bè|đời|hàng|thân|học|cũ|gái|trai|đồng|đọc)(?![\p{L}]))(?![\p{L}])/giu;
const RE_MINH = /(?<!(?:chính|tự|bản thân|gia đình|của|riêng)\s)(?<![\p{L}])mình(?![\p{L}])/giu;
const RE_QUY_VI = /(?<![\p{L}])quý vị(?![\p{L}])/giu;
const RE_TOI = /(?<![\p{L}])tôi(?![\p{L}])/giu;
const RE_ANH_CHI = /(?<![\p{L}])anh\s*\/\s*chị(?![\p{L}])/giu;
const RE_KINH_THUA = /^\s*(?:#+\s*)?Kính thưa quý vị/im;

// ── Đọc asset + config ─────────────────────────────────────────────────────────

let docCache: { at: number; doc: string } | null = null;
const DOC_TTL_MS = 10 * 60_000; // asset design-time, đổi rất thưa

/**
 * Đọc tài liệu brand voice (asset bước 1) để nạp vào tầng LLM.
 * `cache:'no-store'` là BẮT BUỘC — Next bọc `fetch` toàn cục và nhớ kết quả
 * kể cả trong route động; repo đã dính đúng lỗi này một lần ở `/ket-qua/[id]`
 * và một lần ở bộ dò cron.
 */
async function loadBrandDoc(): Promise<string> {
  const now = Date.now();
  if (docCache && now - docCache.at < DOC_TTL_MS) return docCache.doc;
  if (!SUPABASE_URL || !SUPABASE_KEY) return '';
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/brand_voice_docs?kind=eq.full&select=content&order=created_at.desc&limit=1`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return '';
    const rows = (await res.json()) as { content?: string }[];
    const doc = rows?.[0]?.content || '';
    if (doc) docCache = { at: now, doc };
    return doc;
  } catch {
    return '';
  }
}

/** Config gate. Ghi đè từng phần — thiếu khoá nào thì giữ mặc định khoá đó. */
async function loadConfig(): Promise<BrandCheckConfig> {
  const raw = await getConfigValue<Partial<BrandCheckConfig> | null>('content.brand_check', null);
  if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG;
  const profiles = { ...DEFAULT_CONFIG.profiles };
  for (const key of Object.keys(profiles) as BrandProfile[]) {
    const over = raw.profiles?.[key];
    if (over && typeof over === 'object') profiles[key] = { ...profiles[key], ...over };
  }
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_CONFIG.enabled,
    mode: raw.mode === 'warn' || raw.mode === 'off' || raw.mode === 'block' ? raw.mode : DEFAULT_CONFIG.mode,
    llmTier: typeof raw.llmTier === 'boolean' ? raw.llmTier : DEFAULT_CONFIG.llmTier,
    profiles,
  };
}

// ── Autofix ────────────────────────────────────────────────────────────────────

/**
 * Sửa máy móc những lỗi CHỈ CÓ MỘT cách sửa đúng. Cố ý không đụng tới bất cứ
 * thứ gì cần phán đoán (xưng hô, độ dài, bịa sao) — mấy thứ đó để vòng viết lại.
 */
export function autoFix(input: string): { content: string; fixed: string[] } {
  let out = input;
  const fixed: string[] = [];

  // 1. `# ` → `## `. Không phải chuyện thẩm mỹ: cả 2 trang đã phát <h1> từ
  //    `title`, markdown `#` thành <h1> thứ hai ⇒ trang 2 thẻ H1, hỏng SEO.
  if (RE_H1.test(out)) {
    out = out.replace(/^# (.+)$/gm, '## $1');
    fixed.push('# → ## (tránh 2 thẻ H1)');
  }

  // 2. Tên cung sai / lỗi chính tả Hán-Việt.
  for (const f of ALIAS_FIXES) {
    if (f.from.test(out)) {
      out = out.replace(f.from, f.to);
      fixed.push(f.label);
    }
    f.from.lastIndex = 0;
  }

  // 3. Trật tự từ "X cung" → "cung X" (brand voice §5.2).
  for (const name of CUNG_NAMES) {
    const re = new RegExp(`(?<![\\p{L}])${name} cung(?![\\p{L}])`, 'gu');
    if (re.test(out)) {
      out = out.replace(re, `cung ${name}`);
      fixed.push(`${name} cung → cung ${name}`);
    }
  }

  return { content: out, fixed };
}

/**
 * Bôi đậm lần xuất hiện ĐẦU TIÊN của một tên cung/sao khi cả bài chưa có `**`.
 * Tách khỏi `autoFix` vì chỉ chạy khi profile yêu cầu. Làm được máy móc nhờ
 * brand voice §2.3 đã quy định đúng chỗ cần đậm là "lần đầu trong mạch luận"
 * — nhờ vậy khỏi tốn một lượt LLM chỉ để thêm hai dấu sao (39% bài Khảo Luận
 * lịch sử thiếu đậm, để LLM sửa thì tốn thêm gần 4 lượt/10 bài).
 */
function autoBold(input: string): { content: string; fixed: string[] } {
  if (input.includes('**')) return { content: input, fixed: [] };

  // Chọn tên xuất hiện SỚM NHẤT TRONG BÀI, không phải tên đứng đầu danh sách —
  // "lần đầu xuất hiện" là nói về vị trí trong văn bản.
  let best: { name: string; index: number } | null = null;
  for (const name of [...STAR_NAMES, ...CUNG_NAMES]) {
    // "Tử Vi Đẩu Số" là TÊN BỘ MÔN, không phải sao Tử Vi — bôi đậm ở đó là sai chỗ.
    const guard = name === 'Tử Vi' ? '(?! Đẩu Số)' : '';
    const re = new RegExp(`(?<![\\p{L}*])${name}${guard}(?![\\p{L}*])`, 'u');
    const m = re.exec(input);
    if (m && (!best || m.index < best.index)) best = { name, index: m.index };
  }
  if (!best) return { content: input, fixed: [] };
  return {
    content: input.slice(0, best.index) + `**${best.name}**` + input.slice(best.index + best.name.length),
    fixed: [`bôi đậm lần đầu "${best.name}"`],
  };
}

// ── Tầng AUTO ──────────────────────────────────────────────────────────────────

function countWords(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function firstMatch(re: RegExp, s: string): string | null {
  re.lastIndex = 0;
  const m = re.exec(s);
  return m ? m[0] : null;
}

/** Trích một mẩu ngữ cảnh quanh chỗ sai, để log đọc được mà không phải mở bài. */
function snippet(s: string, term: string, span = 40): string {
  const i = s.indexOf(term);
  if (i < 0) return term;
  return '…' + s.slice(Math.max(0, i - span), i + term.length + span).replace(/\s+/g, ' ') + '…';
}

/**
 * Mở bài kiểu GIÁO TRÌNH — luật viral core: câu đầu phải đánh thẳng vào việc của
 * người đọc, không được đi giới thiệu bộ môn.
 *
 * Danh sách CỐ Ý HẸP và chỉ soi ~250 ký tự đầu. Bắt rộng hơn ("Trong ", "Theo ")
 * sẽ đá vào chính luật mở-in-medias-res của `cron-master-write`, nơi câu đầu rất
 * hay là một cảnh hoặc một câu thoại — mà một bộ dò kêu oan là một bộ dò sắp bị
 * tắt đi (bài học `check:motifs`, `check:railfields`).
 */
const RE_MO_BAI_GIAO_TRINH =
  /(Tử Vi Đẩu Số là|Tử Vi là một|là một hệ thống|là một bộ môn|Trong tử vi|Trong Tử Vi|Trong hành trình|Từ xa xưa|Từ ngàn xưa|Tự cổ chí kim|Theo quan niệm)/u;

/** Bỏ dòng tiêu đề markdown để soi đúng CÂU MỞ của thân bài. */
function moBai(content: string): string {
  return content
    .split('\n')
    .filter((l) => !/^\s*#{1,6}\s/.test(l) && l.trim())
    .join(' ')
    .slice(0, 250);
}

export function checkAuto(content: string, rules: ProfileRules): BrandViolation[] {
  const v: BrandViolation[] = [];
  const add = (rule: string, detail: string, severity: 'block' | 'warn' = 'block') =>
    v.push({ rule, severity, detail, tier: 'auto' });

  if (RE_H1.test(content)) add('h1-markdown', 'Còn dòng mở bằng "# " → trang sẽ có 2 thẻ H1');

  if (RE_MOJIBAKE.test(content)) add('mojibake', `Ký tự hỏng: ${firstMatch(RE_MOJIBAKE, content)}`);

  for (const star of FAKE_STARS) {
    if (content.includes(star)) add('fake-star', `Sao không tồn tại: "${star}" — ${snippet(content, star)}`);
  }

  // Tên cung sai còn sót sau autofix (chỉ xảy ra nếu autofix bị tắt/bỏ qua).
  for (const f of ALIAS_FIXES) {
    f.from.lastIndex = 0;
    if (f.from.test(content)) add('cung-alias', `Sai từ vựng chuẩn: ${f.label}`);
    f.from.lastIndex = 0;
  }

  for (const name of CUNG_NAMES) {
    const re = new RegExp(`(?<![\\p{L}])${name} cung(?![\\p{L}])`, 'u');
    if (re.test(content)) add('word-order', `Trật tự từ: "${name} cung" phải là "cung ${name}"`);
  }

  if (RE_SCORE_DUMP.test(content))
    add('rule-dump', `Đổ số liệu engine vào prose: ${firstMatch(RE_SCORE_DUMP, content)}`);

  if (rules.banEmoji && RE_EMOJI.test(content)) add('emoji', `Emoji trong prose: ${firstMatch(RE_EMOJI, content)}`);

  if (RE_KINH_THUA.test(content)) add('kinh-thua', 'Mở bài "Kính thưa quý vị" — sáo, lệch giọng corpus');

  // ── Xưng hô ──
  const ban = firstMatch(RE_BAN, content);
  const minh = firstMatch(RE_MINH, content);
  const quyVi = firstMatch(RE_QUY_VI, content);
  const toi = firstMatch(RE_TOI, content);
  const anhChi = firstMatch(RE_ANH_CHI, content);

  // 'free' → hết cấm gọi người đọc. Giữ nguyên hai nhánh cũ cho profile nào còn
  // khai 'none'/'quy-vi', để nới ở đây không xoá mất luật của bề mặt khác.
  if (ban && rules.readerAddress !== 'free')
    add('reader-address', `Gọi người đọc là "bạn" — ${snippet(content, ban)}`);
  // "mình" chỉ WARN, không chặn — cố ý. Soi 6 mẩu thật trong corpus lọt bộ lọc
  // này thì CẢ 6 đều là "mình" phản thân hợp lệ ("thu mình lại", "một mình phá
  // vây", "lập lá số cho mình"), không mẩu nào gọi người đọc. Regex không tách
  // được hai nghĩa đó; chặn cứng chỉ đẻ ra báo động giả rồi làm cả gate mất
  // tin. Để warn cho Henry đọc log, ai đó nhìn ra mẫu thật thì siết sau.
  if (minh) add('reader-address', `Dùng "mình" — kiểm xem có phải đang gọi người đọc: ${snippet(content, minh)}`, 'warn');
  if (anhChi && rules.readerAddress !== 'free')
    add('reader-address', `Dùng "anh/chị" làm đại từ gọi người đọc`);

  if (rules.readerAddress === 'none' && quyVi)
    add('reader-address', 'Bài khảo luận không gọi người đọc — bỏ "quý vị", dùng ngôi 3 (đương số, người ta)', 'warn');

  // GIỮ kể cả ở 'free': cho phép chọn lối nào cũng được KHÔNG có nghĩa là được
  // đổi lối giữa bài. Đây là lỗi đọc ra ngay, không liên quan viral core.
  if (ban && quyVi) add('mixed-address', 'Trộn hai cách gọi "bạn" và "quý vị" trong cùng một bài');

  if (!rules.allowSelfRef && toi) add('self-reference', `Bài khảo luận không tự xưng — ${snippet(content, toi)}`);

  // ── Hình thức ──
  const len = rules.lengthUnit === 'words' ? countWords(content) : content.length;
  const unit = rules.lengthUnit === 'words' ? 'từ' : 'ký tự';
  if (len < rules.minLen || len > rules.maxLen)
    add('length', `Độ dài ${len} ${unit}, ngoài dải ${rules.minLen}–${rules.maxLen}`);

  if (rules.requireBold && !content.includes('**')) add('no-bold', 'Không có chỗ nào **đậm**');

  // ── Viral core ──
  // severity 'block' là CỐ Ý dù gate đang chạy mode='warn': ở warn nó chỉ ghi sổ,
  // và chính cái sổ đó là thứ để đọc trước khi quyết có bật 'block' hay không.
  const moBaiXau = firstMatch(RE_MO_BAI_GIAO_TRINH, moBai(content));
  if (moBaiXau)
    add(
      'mo-bai-giao-trinh',
      `Mở bài đi giới thiệu bộ môn thay vì chạm vào việc của người đọc: "${moBaiXau}"`,
    );

  return v;
}

// ── Tầng LLM ───────────────────────────────────────────────────────────────────

interface LlmVerdict {
  pass: boolean;
  violations: { rule: string; detail: string }[];
}

/**
 * Bảy mục "cần người/LLM đọc" ở checklist §8 của brand voice doc, cộng thêm
 * HAI mục an toàn RIÊNG cho `khao-luan-tamly` (xem `BrandProfile`).
 * FAIL-OPEN: mọi lỗi (mạng, JSON hỏng, LLM chết) đều trả rỗng = coi như đạt.
 */
async function checkLlm(content: string, profile: BrandProfile, doc: string): Promise<BrandViolation[]> {
  const surface =
    profile === 'nghien-cuu'
      ? 'tùy bút Nghiên Cứu do một persona thầy viết (ngôi thứ nhất "tôi" LÀ ĐÚNG định dạng, ký tên cuối bài, 1.200–1.500 từ)'
      : profile === 'khao-luan-tamly'
        ? 'bài Khảo Luận/Vấn Đáp nhánh TÂM LÝ/XÃ HỘI (ngôi thứ ba, không tự xưng, ~1.400 ký tự) — đề tài chạm cảm xúc/quan hệ/áp lực sống, cần soi thêm 2 mục an toàn'
        : 'bài Khảo Luận/Vấn Đáp (ngôi thứ ba, không tự xưng, ~1.400 ký tự)';

  const isTamLy = profile === 'khao-luan-tamly';
  // 🔴 Hai mục này KHÔNG phải luật văn phong — chúng gác một rủi ro có hại
  // thật: bài phán một chẩn đoán tâm thần y khoa qua lá số, hoặc nhắc một
  // khủng hoảng thật (ý định tự hại) mà không chỉ đường ra. Chỉ thêm cho
  // đúng profile này; 2 bề mặt kia không chạm đề tài này nên không cần.
  const sensitiveItems = isTamLy
    ? `
8. chan-doan-y-khoa: bài có GÁN một chẩn đoán tâm thần/y khoa CỤ THỂ (trầm cảm,
   rối loạn lo âu, rối loạn lưỡng cực, PTSD, tâm thần phân liệt...) cho người
   đọc/đương số NHƯ MỘT SỰ THẬT rút ra từ lá số không? Nói "cung X dễ mang tâm
   trạng nặng nề, dễ suy nghĩ nhiều" là NGÔN NGỮ TỬ VI BÌNH THƯỜNG, ĐƯỢC. Gán
   thẳng TÊN một bệnh cụ thể làm chẩn đoán ("bạn đang bị trầm cảm") là SAI.
9. khung-hoang-that: bài có nhắc ý định tự hại/tự tử, hoặc một khủng hoảng
   ĐANG diễn ra, mà KHÔNG kèm câu hướng người đọc tới chỗ cần đến (người
   thân, chuyên gia tâm lý, số 115) — hoặc tệ hơn, NGẦM Ý rằng lá số/tử vi
   thay được sự giúp đỡ đó? Bàn về nỗi buồn, mất mát, áp lực sống, xung đột
   gia đình như đề tài đời thường thì KHÔNG sai — đó CHÍNH LÀ mảng bài này
   viết. Chỉ sai khi có DẤU HIỆU KHỦNG HOẢNG THẬT mà bài không hề chỉ đường ra.`
    : '';

  const prompt = `Bạn là biên tập viên kiểm tra bài trước khi xuất bản, đối chiếu với tài liệu brand voice dưới đây.

=== TÀI LIỆU BRAND VOICE ===
${doc.slice(0, 9000)}
=== HẾT TÀI LIỆU ===

BÀI CẦN KIỂM (bề mặt: ${surface}):
---
${content.slice(0, 8000)}
---

Chỉ kiểm ĐÚNG ${isTamLy ? 9 : 7} mục sau (mục khác đã có máy kiểm bằng regex, bỏ qua):
1. nuoc-di: có nước đi "vấn đề đương đại × lăng kính cổ pháp" không?
2. thanh-ngu: thành ngữ / chữ Hán-Việt cổ — 0–2 lần là ĐẠT, >2 là sai. Và nếu có,
   nó CHỈ được nằm ở phần GIẢI THÍCH: xuất hiện trong 1–2 câu MỞ ĐẦU là sai (mở bài
   bằng chữ cổ làm mất người đọc trước khi họ kịp thấy mình trong bài). Lời thoại của
   nhân vật KHÔNG tính là vi phạm.
3. vi-du: có ví dụ cụ thể kèm chi tiết (tên/tuổi/nghề/số) không? Ví dụ chung chung là sai.
4. gioi-tinh: giới tính có nhất quán không? Có mặc định "nam" khi chưa biết giới không?
5. ket-chu-dong: kết có nêu ÍT NHẤT MỘT việc người đọc làm được không? Kết bằng định
   mệnh buông xuôi, hoặc bằng lời khuyên chung chung ("nên cân nhắc kỹ", "cần giữ bình
   tĩnh") đều là sai.
6. bia-dan: có bịa trích dẫn cổ thư (gán tên sách/tác giả cụ thể) không?
7. sao-that: mọi tên sao nhắc tới có THẬT trong Tử Vi Đẩu Số không?
${sensitiveItems}

QUAN TRỌNG: chỉ báo lỗi khi CHẮC CHẮN. Nghi ngờ thì cho qua — chặn nhầm một bài đạt
tệ hơn lọt một bài hơi yếu.${isTamLy ? ' NGOẠI LỆ: với mục 8 và 9, nghi ngờ thì BÁO — an toàn người đọc quan trọng hơn một lượt chặn nhầm.' : ''}

Trả JSON thuần một dòng, KHÔNG backtick:
{"pass":true|false,"violations":[{"rule":"nuoc-di|thanh-ngu|vi-du|gioi-tinh|ket-chu-dong|bia-dan|sao-that${isTamLy ? '|chan-doan-y-khoa|khung-hoang-that' : ''}","detail":"nêu ngắn gọn chỗ sai"}]}`;

  try {
    const raw = (await llmText({ prompt, maxTokens: 1050 })) // Nâng 50% (Henry chốt 2026-08-20)
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const parsed = JSON.parse(raw) as LlmVerdict;
    if (!Array.isArray(parsed.violations)) return [];
    return parsed.violations
      .filter((x) => x && typeof x.rule === 'string')
      .map((x) => ({
        rule: x.rule,
        severity: 'block' as const,
        detail: String(x.detail || '').slice(0, 300),
        tier: 'llm' as const,
      }));
  } catch (e) {
    // Fail-open, nhưng PHẢI để lại dấu vết: im lặng thì tầng này chết hàng
    // tháng mà không ai biết (đúng lỗi GA4 base64 đã dính).
    console.warn('[brand-check] tầng LLM bỏ qua:', (e as Error)?.message?.slice(0, 120));
    return [];
  }
}

// ── Vòng viết lại ──────────────────────────────────────────────────────────────

/** Nhờ LLM sửa đúng những lỗi đã nêu, giữ nguyên nội dung. Hỏng → trả bản cũ. */
async function repair(content: string, violations: BrandViolation[], profile: BrandProfile): Promise<string> {
  const list = violations.map((v, i) => `${i + 1}. [${v.rule}] ${v.detail}`).join('\n');
  // 'nghien-cuu' là bề mặt DUY NHẤT khác — 'khao-luan' và 'khao-luan-tamly'
  // cùng định dạng (Vấn Đáp ngôi 3, không tự xưng) nên chia theo phủ định
  // của bề mặt lẻ loi, không liệt kê từng profile giống nhau.
  const surfaceRule =
    profile !== 'nghien-cuu'
      ? `- KHÔNG tự xưng "tôi" (đây là bài ghi chép, không phải tùy bút ký tên).
  - Cách gọi người đọc: giữ NGUYÊN lối bài đang dùng, chỉ sửa nếu bài TRỘN hai lối
    ("bạn" lẫn "quý vị") — lúc đó chọn một lối và thống nhất cả bài.`
      : `- Giữ ngôi thứ NHẤT ("tôi") và chữ ký cuối bài — đó là đúng định dạng tùy bút này.
  - Cách gọi người đọc: giữ NGUYÊN lối bài đang dùng, chỉ sửa nếu bài TRỘN hai lối.`;

  const prompt = `Sửa bài viết dưới đây cho hết các lỗi được liệt kê. Giữ NGUYÊN ý, nguyên mạch
lập luận, nguyên ví dụ — chỉ sửa đúng chỗ sai.

LỖI CẦN SỬA:
${list}

LUẬT BẮT BUỘC:
${surfaceRule}
- Tên cung/sao viết hoa, đúng chuẩn: cung Tử Tức (không phải Tử Nữ), cung Nô Bộc (không phải Giao Hữu).
- Trật tự "cung X", không phải "X cung".
- KHÔNG mở đầu dòng bằng "# " (dùng "## ").
- KHÔNG đổ điểm số/bảng tra vào bài.
- Kết bằng thế chủ động, không buông xuôi định mệnh.

BÀI GỐC:
---
${content}
---

Chỉ trả về nội dung markdown đã sửa. KHÔNG giải thích, KHÔNG bọc JSON, KHÔNG backtick ngoài.`;

  try {
    const raw = (await llmText({ prompt, maxTokens: 9000 })).trim(); // Nâng 50% (Henry chốt 2026-08-20)
    const cleaned = raw.startsWith('```')
      ? raw
          .replace(/^```(?:markdown)?\s*/i, '')
          .replace(/```\s*$/, '')
          .trim()
      : raw;
    // Bản sửa mà ngắn hơn nửa bản gốc thì gần như chắc chắn LLM trả lời cụt
    // hoặc trả lời giải thích thay vì nội dung → thà giữ bản cũ.
    return cleaned.length > content.length * 0.5 ? cleaned : content;
  } catch (e) {
    console.warn('[brand-check] vòng viết lại hỏng:', (e as Error)?.message?.slice(0, 120));
    return content;
  }
}

// ── Nhật ký ────────────────────────────────────────────────────────────────────

/**
 * Ghi lại MỌI lượt kiểm (đạt lẫn không). Bài bị chặn được cất NGUYÊN VĂN vào
 * `payload` — chữ đã tốn tiền model sinh ra, vứt đi rồi thì vừa mất tiền vừa
 * mất luôn bằng chứng để chỉnh ngưỡng.
 */
async function logQc(row: {
  surface: BrandProfile;
  slug: string | null;
  title: string | null;
  passed: boolean;
  mode: GateMode;
  violations: BrandViolation[];
  fixed: string[];
  repaired: boolean;
  payload: unknown;
}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/content_qc_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        surface: row.surface,
        slug: row.slug,
        title: row.title,
        passed: row.passed,
        mode: row.mode,
        violations: row.violations,
        fixed: row.fixed,
        repaired: row.repaired,
        // Chỉ giữ nguyên văn khi BỊ CHẶN — bài đạt đã nằm trong bảng nội dung rồi.
        payload: row.passed ? null : row.payload,
      }),
    });
  } catch {
    /* nhật ký hỏng không được phép chặn bài */
  }
}

// ── Cổng chính ─────────────────────────────────────────────────────────────────

export interface BrandCheckInput {
  content: string;
  title?: string;
  slug?: string;
  profile: BrandProfile;
  /** payload đầy đủ để cất lại nếu bị chặn (không mất chữ đã sinh) */
  payload?: unknown;
}

/**
 * Chạy gate. KHÔNG BAO GIỜ throw — pipeline gọi nó không được sập vì QC.
 *
 * `pass=false` chỉ xảy ra khi mode='block' VÀ còn lỗi severity='block' sau khi
 * đã autofix và đã cho một vòng viết lại. mode='warn' luôn trả pass=true nhưng
 * vẫn ghi nhật ký đầy đủ — dùng để chạy thử trên prod trước khi siết.
 */
export async function brandCheck(input: BrandCheckInput): Promise<BrandCheckResult> {
  const cfg = await loadConfig();
  const rules = cfg.profiles[input.profile];
  // Mode HIỆU LỰC cho lượt này: profile tự khai `mode` riêng thì dùng nó,
  // không thì rơi về mode CHUNG. `!cfg.enabled` vẫn là công tắc tổng, tắt
  // được TẤT CẢ kể cả profile đã tự ghim 'block'.
  const mode: GateMode = rules.mode ?? cfg.mode;

  if (!cfg.enabled || mode === 'off') {
    return { pass: true, content: input.content, fixed: [], violations: [], repaired: false, mode: 'off' };
  }

  // 1. Autofix máy móc
  const fx = autoFix(input.content);
  let content = fx.content;
  const fixed = [...fx.fixed];
  if (rules.requireBold) {
    const b = autoBold(content);
    content = b.content;
    fixed.push(...b.fixed);
  }

  // 2. Tầng auto + tầng LLM (song song — tầng LLM đọc bản đã autofix)
  const doc = cfg.llmTier ? await loadBrandDoc() : '';
  const [autoV, llmV] = await Promise.all([
    Promise.resolve(checkAuto(content, rules)),
    cfg.llmTier && doc ? checkLlm(content, input.profile, doc) : Promise.resolve([] as BrandViolation[]),
  ]);
  let violations = [...autoV, ...llmV];
  let repaired = false;

  // 3. Còn lỗi chặn → MỘT vòng viết lại rồi soi lại.
  //    Bình thường CHỈ soi lại tầng auto (cố ý không gọi lại tầng LLM: tốn
  //    thêm một lượt cho mức lợi mỏng — 7 mục chất lượng văn phong sai sót
  //    không nguy hiểm, đếm hụt vài lần cũng không sao).
  //
  //    🔴 `khao-luan-tamly` PHẢI soi lại CẢ tầng LLM: 2 luật an toàn của nó
  //    (chan-doan-y-khoa, khung-hoang-that) CHỈ tầng LLM phát hiện được —
  //    `checkAuto` không bao giờ sinh ra 2 rule đó nên phép đếm dưới đây sẽ
  //    LUÔN đọc ra "giảm" (0 < ≥1) dù bản viết lại vẫn còn nguyên nội dung
  //    nguy hiểm. Tốn thêm một lượt LLM cho profile này là cái giá chấp nhận
  //    được — batch cron, không phải rail tương tác nhạy độ trễ.
  if (mode === 'block' && violations.some((v) => v.severity === 'block')) {
    const rewritten = await repair(content, violations, input.profile);
    if (rewritten !== content) {
      repaired = true;
      const fx2 = autoFix(rewritten);
      let c2 = fx2.content;
      if (rules.requireBold) {
        const b2 = autoBold(c2);
        c2 = b2.content;
        fx2.fixed.push(...b2.fixed);
      }
      const after =
        input.profile === 'khao-luan-tamly' && cfg.llmTier && doc
          ? [...checkAuto(c2, rules), ...(await checkLlm(c2, input.profile, doc))]
          : checkAuto(c2, rules);
      // Chỉ nhận bản viết lại nếu nó THỰC SỰ đỡ hơn — LLM sửa lỗi này đẻ lỗi kia
      // là chuyện có thật, giữ bản xấu hơn thì vòng sửa thành phản tác dụng.
      if (after.filter((x) => x.severity === 'block').length < violations.filter((x) => x.severity === 'block').length) {
        content = c2;
        fixed.push(...fx2.fixed, 'LLM viết lại 1 vòng');
        violations = after;
      }
    }
  }

  const blocking = violations.filter((v) => v.severity === 'block');
  const pass = mode !== 'block' || blocking.length === 0;

  await logQc({
    surface: input.profile,
    slug: input.slug || null,
    title: input.title || null,
    passed: pass,
    mode,
    violations,
    fixed,
    repaired,
    payload: input.payload ?? { content },
  });

  return { pass, content, fixed, violations, repaired, mode };
}
