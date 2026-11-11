// lib/analytics/keyword-suggest-i18n.ts
// ============================================================
// Quét từ khoá THEO NGÔN NGỮ (W10, đa ngôn ngữ) — Google Suggest hl=ja/ko/zh-TW/en
// cộng Naver autocomplete cho tiếng Hàn. Cùng kho `keyword_ideas`, thêm cột `lang`
// (`_patches/migration-i18n-seo.sql`) và `source` ('suggest' | 'naver').
//
// Hạt giống = THUẬT NGỮ BỘ MÔN BẢN ĐỊA (紫微斗数, 사주, BaZi…) × hậu tố, cộng
// TÊN NGƯỜI NỔI TIẾNG ĐỊA PHƯƠNG × vài thuật ngữ lõi. Vế sau để Suggest tự lộ ra cách
// người bản địa gõ "<người nổi tiếng> + <bộ môn>" — đúng mảng hồ sơ Nghiệm Chứng nhắm tới.
//
// Cùng luật với bản vi (`keyword-suggest.ts`): gọi TUẦN TỰ có nghỉ, trần cứng số lượt MỖI
// NGUỒN, lỗi nào cũng nuốt và đi tiếp. Naver `ac.search.naver.com` là endpoint không có tài
// liệu chính thức — định dạng đổi thì parse trả rỗng chứ không ném.
// ⚠️ Container phiên Claude Code bị chặn mọi host ngoài ⇒ CHƯA từng chạy thật; số liệu đầu tiên
// chỉ có sau lượt cron đầu trên Vercel (xem `note` của route).
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';
import {
  fetchSuggest,
  isUsable,
  normalize,
  rotateSeeds,
  sleep,
  upsertKeywords,
  type KeywordHit,
} from '@/lib/analytics/keyword-suggest';

export type KwEngine = 'google' | 'naver';

export interface KwTarget {
  /** Khoá `keyword_ideas.lang` (cùng bộ mã với `lib/i18n/locales.ts`). */
  lang: 'en' | 'ja' | 'ko' | 'zh-tw';
  engine: KwEngine;
  hl: string;
  gl: string;
  /** Thuật ngữ bộ môn bản địa. */
  terms: string[];
  /** Người nổi tiếng địa phương — ghép với `celebTerms`. */
  celebs: string[];
  /** Chỉ vài thuật ngữ lõi mới ghép với tên người (để khỏi nở tổ hợp). */
  celebTerms: string[];
  /** Hậu tố ghép vào mọi thuật ngữ ('' = hỏi trơn). */
  expansions: string[];
}

export const TARGETS: KwTarget[] = [
  {
    lang: 'ja', engine: 'google', hl: 'ja', gl: 'jp',
    terms: ['紫微斗数', '四柱推命', '八字', '命盤', '算命', '占い 生年月日', '九星気学', '干支 運勢'],
    celebs: ['大谷翔平', '羽生結弦', '宇多田ヒカル', '米津玄師'],
    celebTerms: ['四柱推命', '紫微斗数'],
    expansions: ['', '無料', '当たる', '2027', '相性', '仕事', '恋愛', '見方'],
  },
  {
    lang: 'ko', engine: 'google', hl: 'ko', gl: 'kr',
    terms: ['자미두수', '사주', '팔자', '명리학', '무료 사주', '궁합', '토정비결', '운세'],
    celebs: ['아이유', 'BTS', '정국', '손흥민'],
    celebTerms: ['사주', '자미두수'],
    expansions: ['', '무료', '2027', '보는법', '궁합', '직업', '연애', '용어'],
  },
  // Naver: cùng hạt giống tiếng Hàn — vị trí trên Naver là tín hiệu RIÊNG (khác Google).
  {
    lang: 'ko', engine: 'naver', hl: 'ko', gl: 'kr',
    terms: ['자미두수', '사주', '팔자', '명리학', '무료 사주', '궁합', '토정비결', '운세'],
    celebs: ['아이유', 'BTS', '정국', '손흥민'],
    celebTerms: ['사주', '자미두수'],
    expansions: ['', '무료', '2027', '보는법', '궁합', '직업', '연애', '용어'],
  },
  {
    lang: 'zh-tw', engine: 'google', hl: 'zh-TW', gl: 'tw',
    terms: ['紫微斗數', '八字', '命盤', '算命', '免費算命', '流年運勢', '八字排盤', '星座 紫微'],
    celebs: ['周杰倫', '蔡依林', '林俊傑', '張惠妹'],
    celebTerms: ['八字', '紫微斗數'],
    expansions: ['', '免費', '2027', '合婚', '事業', '感情', '怎麼看', '排盤'],
  },
  {
    lang: 'en', engine: 'google', hl: 'en', gl: 'us',
    terms: ['Zi Wei Dou Shu', 'BaZi', 'Four Pillars of Destiny', 'Chinese astrology', 'purple star astrology', 'Chinese birth chart', 'Ming Gong', 'Chinese zodiac fortune'],
    celebs: ['Taylor Swift', 'Elon Musk', 'BTS', 'Barack Obama'],
    celebTerms: ['BaZi', 'Zi Wei Dou Shu'],
    expansions: ['', 'free', 'calculator', '2027', 'compatibility', 'career', 'love', 'meaning'],
  },
];

export interface KwI18nConfig {
  enabled: boolean;
  /** Trần số lượt hỏi MỖI mục tiêu (ngôn ngữ × nguồn) mỗi lần chạy. */
  maxRequestsPerTarget: number;
  delayMs: number;
  /** Rỗng = tất cả `TARGETS`; hoặc danh sách `lang` để chỉ quét vài ngôn ngữ. */
  langs: string[];
}

const DEFAULTS: KwI18nConfig = { enabled: true, maxRequestsPerTarget: 60, delayMs: 350, langs: [] };

/** `app_config['seo.keyword_suggest_i18n']` — đổi không cần deploy. Thiếu khoá = mặc định. */
export async function loadKeywordSuggestI18nConfig(): Promise<KwI18nConfig> {
  const raw = await getConfigValue<Partial<KwI18nConfig> | null>('seo.keyword_suggest_i18n', null);
  if (!raw || typeof raw !== 'object') return DEFAULTS;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULTS.enabled,
    maxRequestsPerTarget:
      Number.isFinite(raw.maxRequestsPerTarget) && (raw.maxRequestsPerTarget as number) > 0
        ? (raw.maxRequestsPerTarget as number)
        : DEFAULTS.maxRequestsPerTarget,
    delayMs:
      Number.isFinite(raw.delayMs) && (raw.delayMs as number) >= 0 ? (raw.delayMs as number) : DEFAULTS.delayMs,
    langs: Array.isArray(raw.langs) ? raw.langs.filter((x) => typeof x === 'string') : DEFAULTS.langs,
  };
}

/**
 * Danh sách (gốc, nhãn) của một mục tiêu: thuật ngữ trơn trước, rồi người nổi tiếng × thuật
 * ngữ lõi. `seed` ghi vào cột `seed` là phần GỐC (chưa kèm hậu tố) để biết nhánh nào đẻ ra cụm.
 */
export function buildSeeds(t: KwTarget): string[] {
  const out = [...t.terms];
  for (const c of t.celebs) for (const w of t.celebTerms) out.push(`${c} ${w}`);
  return out;
}

/** Số tuần kể từ epoch — mốc xoay, ổn định trong cùng một tuần (cùng cách bản vi). */
function weekIndex(now = Date.now()): number {
  return Math.floor(now / (7 * 24 * 60 * 60 * 1000));
}

// ── Naver ──────────────────────────────────────────────────────────────────────

const NAVER_AC = 'https://ac.search.naver.com/nx/ac';

/**
 * Naver autocomplete. Trả `{"query":[…],"items":[[["gợi ý",…],["gợi ý",…],…]]}` — mỗi phần tử
 * của `items[0]` là một mảng, phần tử đầu là chuỗi gợi ý. Parse phòng thủ: sai hình dạng ⇒ [].
 */
export async function fetchNaver(term: string): Promise<string[]> {
  const url = `${NAVER_AC}?${new URLSearchParams({
    q: term, con: '1', frm: 'nv', ans: '2', r_format: 'json', r_enc: 'UTF-8', r_unicode: '0',
    t_koreng: '1', run: '2', rev: '4', q_enc: 'UTF-8', st: '100',
  }).toString()}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'tuviminhbao-keyword-research/1.0 (+https://www.tuviminhbao.com)', Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { items?: unknown };
    const first = Array.isArray(j.items) ? (j.items as unknown[])[0] : null;
    if (!Array.isArray(first)) return [];
    return first
      .map((x) => (Array.isArray(x) ? x[0] : x))
      .filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

// ── Chạy ───────────────────────────────────────────────────────────────────────

export interface KwTargetResult {
  lang: string;
  engine: KwEngine;
  requests: number;
  failed: number;
  unique: number;
  inserted: number;
  updated: number;
}

async function runTarget(t: KwTarget, cfg: KwI18nConfig): Promise<KwTargetResult> {
  const hits = new Map<string, KeywordHit>();
  let requests = 0;
  let failed = 0;
  const seeds = rotateSeeds(buildSeeds(t), weekIndex());

  outer: for (const seed of seeds) {
    for (const exp of t.expansions) {
      if (requests >= cfg.maxRequestsPerTarget) break outer;
      requests++;
      const term = exp ? `${seed} ${exp}` : seed;
      const list = t.engine === 'naver' ? await fetchNaver(term) : await fetchSuggest(term, t.hl, t.gl);
      if (!list.length) failed++;
      list.forEach((raw, i) => {
        const kw = normalize(raw);
        if (!isUsable(kw, 2)) return;
        const prev = hits.get(kw);
        if (!prev || i < prev.position) hits.set(kw, { keyword: kw, seed, position: i });
      });
      if (cfg.delayMs > 0) await sleep(cfg.delayMs);
    }
  }

  const list = [...hits.values()];
  const { inserted, updated } = await upsertKeywords(list, t.lang, t.engine === 'naver' ? 'naver' : 'suggest');
  return { lang: t.lang, engine: t.engine, requests, failed, unique: list.length, inserted, updated };
}

export interface KwI18nRun {
  skipped: boolean;
  results: KwTargetResult[];
}

/** Một lượt quét mọi mục tiêu. Không bao giờ ném — mỗi mục tiêu tự nuốt lỗi của nó. */
export async function runKeywordSuggestI18n(): Promise<KwI18nRun> {
  const cfg = await loadKeywordSuggestI18nConfig();
  if (!cfg.enabled) return { skipped: true, results: [] };
  const targets = TARGETS.filter((t) => !cfg.langs.length || cfg.langs.includes(t.lang));
  const results: KwTargetResult[] = [];
  for (const t of targets) results.push(await runTarget(t, cfg));
  return { skipped: false, results };
}
