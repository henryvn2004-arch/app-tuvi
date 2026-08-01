// lib/analytics/keyword-suggest.ts
// ============================================================
// NGHIÊN CỨU TỪ KHOÁ bằng Google Suggest (autocomplete).
//
// Vì sao có file này: đo GSC 28 ngày thì chỉ ĐỌC ĐƯỢC TÊN của đúng 10 truy vấn
// (842 hiển thị còn lại Google ẩn tên vì quá hiếm). Nguồn từ khoá nội bộ gần
// như bằng không → không đủ để đặt title cho 516 trang group, càng không đủ để
// chọn chủ đề content mới.
//
// Vì sao Suggest chứ không phải Keyword Planner: Ads API cần developer token
// phải xin duyệt, cần OAuth refresh token (KHÔNG dùng được service account như
// GA4/GSC), và tài khoản không chi tiêu thật thì Keyword Planner chỉ trả VOLUME
// DẠNG DẢI. Suggest thì miễn phí, không key, có ngay — đổi lại là không có
// volume. Chấp nhận: thứ đang thiếu là CÁCH NGƯỜI VIỆT GÕ, không phải con số.
//
// ⚠️ Endpoint này KHÔNG có tài liệu chính thức. Vì vậy:
//   - gọi TUẦN TỰ có nghỉ giữa các lượt, có trần cứng số lượt/lần chạy;
//   - mọi lỗi đều nuốt và đi tiếp, không bao giờ kéo sập cron;
//   - nếu Google đổi định dạng trả về thì parse trả rỗng chứ không throw.
//
// Chạy ở đâu: VERCEL. Container phiên Claude Code chặn mọi host ngoài (đã thử,
// suggestqueries.google.com → 403 qua proxy). Kết quả cất vào `keyword_ideas`
// làm ASSET để Claude đọc qua Supabase MCP và pipeline content đọc sinh topic.
// ============================================================

import { getConfigValue } from '@/lib/config/appConfig';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const ENDPOINT = 'https://suggestqueries.google.com/complete/search';

export interface KeywordSuggestConfig {
  enabled: boolean;
  hl: string;
  gl: string;
  maxRequests: number;
  delayMs: number;
  seeds: string[];
  expansions: string[];
}

const DEFAULTS: KeywordSuggestConfig = {
  enabled: true,
  hl: 'vi',
  gl: 'vn',
  maxRequests: 180,
  delayMs: 350,
  // Bộ gốc bám ĐÚNG thực trạng đo được, không phải bốc theo cảm tính:
  //  - 10 truy vấn GSC đọc được tên đều quanh kim lâu / ngày tốt / tử vi <can chi>;
  //  - "tử vi tuổi" / "tử vi năm" là đầu truy vấn của mọi trang đối thủ đang xếp
//    hạng, trong khi site đang đặt title bằng "vận hạn" — từ hẹp hơn nhiều.
  seeds: [
    'tử vi',
    'tử vi tuổi',
    'tử vi năm',
    'xem tử vi',
    'lá số tử vi',
    'vận hạn',
    'vận hạn tuổi',
    'sao chiếu mệnh',
    'hạn tam tai',
    'cúng sao',
    'kim lâu',
    'tuổi kim lâu',
    'xem ngày tốt',
    'ngày tốt',
    'xem ngày',
    'xem tuổi',
    'xem tuổi vợ chồng',
    'tuổi hợp làm ăn',
    'coi tuổi',
    'cung mệnh',
    'mệnh gì',
    'ngũ hành',
    'nạp âm',
    'tứ trụ',
    'bát tự',
    'phong thủy',
    'xem tướng',
    'đặt tên con',
  ],
  expansions: ['', '2026', '2027', 'là gì', 'có tốt không', 'cách tính', 'nam', 'nữ', 'theo ngày sinh', 'chi tiết'],
};

export interface KeywordHit {
  keyword: string;
  seed: string;
  position: number;
}

export interface SuggestRunResult {
  requests: number;
  failed: number;
  rawSuggestions: number;
  unique: number;
  inserted: number;
  updated: number;
  skipped: boolean;
}

// ── Chuẩn hoá ──────────────────────────────────────────────────────────────────

/**
 * Gộp mọi biến thể chỉ khác nhau ở khoảng trắng/hoa-thường về MỘT khoá.
 * CỐ Ý GIỮ NGUYÊN DẤU tiếng Việt: "tử vi" và "tu vi" là hai cách gõ khác nhau
 * của người dùng thật, bỏ dấu để gộp lại là xoá mất chính thông tin cần đo.
 */
function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Loại rác rõ ràng: quá ngắn, quá dài, hoặc lọt URL/ký tự lạ. */
function isUsable(kw: string): boolean {
  if (kw.length < 3 || kw.length > 120) return false;
  if (/https?:|www\.|@/.test(kw)) return false;
  return true;
}

// ── Gọi Suggest ────────────────────────────────────────────────────────────────

/**
 * Một lượt hỏi Suggest. Trả mảng gợi ý theo đúng thứ tự Google trả về
 * (vị trí 0 = gợi ý đầu tiên = phổ biến nhất theo Google).
 * KHÔNG BAO GIỜ throw — hỏng thì trả rỗng để vòng lặp đi tiếp.
 */
async function fetchSuggest(term: string, hl: string, gl: string): Promise<string[]> {
  const url = `${ENDPOINT}?${new URLSearchParams({ client: 'firefox', hl, gl, q: term }).toString()}`;
  try {
    const res = await fetch(url, {
      headers: {
        // Không giả dạng trình duyệt: nêu đúng đây là bot của site nào, để phía
        // Google chặn được nếu họ muốn. Giả UA để né chặn là đi quá giới hạn
        // của một endpoint mình không có quyền dùng chính thức.
        'User-Agent': 'tuviminhbao-keyword-research/1.0 (+https://www.tuviminhbao.com)',
        Accept: 'application/json,text/javascript,*/*',
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const text = await res.text();
    // Định dạng: ["<query>",["gợi ý 1","gợi ý 2",…], …]
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed) || !Array.isArray(parsed[1])) return [];
    return (parsed[1] as unknown[]).filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Thu thập ───────────────────────────────────────────────────────────────────

/**
 * Quét toàn bộ (seed × expansion) trong trần `maxRequests`.
 *
 * Giữ vị trí TỐT NHẤT của mỗi cụm qua mọi lượt hỏi: cùng một cụm có thể hiện ra
 * từ nhiều gốc khác nhau, và vị trí thấp nhất là tín hiệu mạnh nhất — đây là
 * thứ duy nhất thay được volume cho tới khi nối được Ads API.
 */
export async function collectSuggestions(cfg: KeywordSuggestConfig): Promise<{
  hits: Map<string, KeywordHit>;
  requests: number;
  failed: number;
  rawSuggestions: number;
}> {
  const hits = new Map<string, KeywordHit>();
  let requests = 0;
  let failed = 0;
  let rawSuggestions = 0;

  outer: for (const seed of cfg.seeds) {
    for (const exp of cfg.expansions) {
      if (requests >= cfg.maxRequests) break outer;
      const term = exp ? `${seed} ${exp}` : seed;
      requests++;
      const list = await fetchSuggest(term, cfg.hl, cfg.gl);
      if (!list.length) failed++;
      rawSuggestions += list.length;

      list.forEach((raw, i) => {
        const kw = normalize(raw);
        if (!isUsable(kw)) return;
        const prev = hits.get(kw);
        if (!prev || i < prev.position) hits.set(kw, { keyword: kw, seed, position: i });
      });

      if (cfg.delayMs > 0) await sleep(cfg.delayMs);
    }
  }

  return { hits, requests, failed, rawSuggestions };
}

// ── Ghi kho ────────────────────────────────────────────────────────────────────

/**
 * UPSERT vào `keyword_ideas`.
 *
 * Dòng đã có thì chỉ chạm `last_seen_at`, `times_seen`, và hạ `best_position`
 * nếu lần này thấy vị trí tốt hơn — KHÔNG ghi đè `first_seen_at` (mốc đó cho
 * biết cụm này mới nổi hay đã bền), và KHÔNG đụng `volume` (cột dành cho Ads
 * API, ghi đè bằng null là xoá mất dữ liệu của nguồn khác).
 */
async function upsertKeywords(hits: KeywordHit[]): Promise<{ inserted: number; updated: number }> {
  if (!SUPABASE_URL || !SUPABASE_KEY || !hits.length) return { inserted: 0, updated: 0 };

  const nowIso = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  // Chia lô để không gửi một body khổng lồ.
  const CHUNK = 200;
  for (let i = 0; i < hits.length; i += CHUNK) {
    const chunk = hits.slice(i, i + CHUNK);
    const keywords = chunk.map((h) => h.keyword);

    // Đọc trước những cụm đã tồn tại để (a) đếm mới/cũ cho báo cáo, (b) biết
    // times_seen và best_position cũ mà cộng dồn / lấy min.
    const q = keywords.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(',');
    let existing: Record<string, { times_seen: number; best_position: number | null }> = {};
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/keyword_ideas?keyword=in.(${encodeURIComponent(q)})&select=keyword,times_seen,best_position`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as { keyword: string; times_seen: number; best_position: number | null }[];
        existing = Object.fromEntries(rows.map((r) => [r.keyword, r]));
      }
    } catch {
      /* đọc hụt thì coi như toàn bộ là mới — chỉ sai con số báo cáo, không sai dữ liệu */
    }

    const body = chunk.map((h) => {
      const prev = existing[h.keyword];
      if (prev) updated++;
      else inserted++;
      return {
        keyword: h.keyword,
        seed: h.seed,
        source: 'suggest',
        best_position:
          prev?.best_position == null ? h.position : Math.min(prev.best_position, h.position),
        times_seen: (prev?.times_seen ?? 0) + 1,
        last_seen_at: nowIso,
      };
    });

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/keyword_ideas?on_conflict=keyword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          // merge-duplicates = UPSERT. Không gửi first_seen_at/volume nên hai cột
          // đó giữ nguyên giá trị cũ trên dòng đã tồn tại.
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.warn('[keyword-suggest] ghi lô hỏng:', (e as Error)?.message?.slice(0, 120));
    }
  }

  return { inserted, updated };
}

// ── Điểm vào ───────────────────────────────────────────────────────────────────

export async function loadKeywordSuggestConfig(): Promise<KeywordSuggestConfig> {
  const raw = await getConfigValue<Partial<KeywordSuggestConfig> | null>('seo.keyword_suggest', null);
  if (!raw || typeof raw !== 'object') return DEFAULTS;
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULTS.enabled,
    hl: typeof raw.hl === 'string' ? raw.hl : DEFAULTS.hl,
    gl: typeof raw.gl === 'string' ? raw.gl : DEFAULTS.gl,
    maxRequests:
      Number.isFinite(raw.maxRequests) && (raw.maxRequests as number) > 0
        ? (raw.maxRequests as number)
        : DEFAULTS.maxRequests,
    delayMs: Number.isFinite(raw.delayMs) && (raw.delayMs as number) >= 0 ? (raw.delayMs as number) : DEFAULTS.delayMs,
    seeds: Array.isArray(raw.seeds) && raw.seeds.length ? raw.seeds.filter((s) => typeof s === 'string') : DEFAULTS.seeds,
    expansions: Array.isArray(raw.expansions)
      ? raw.expansions.filter((s) => typeof s === 'string')
      : DEFAULTS.expansions,
  };
}

/**
 * Xoay danh sách gốc theo SỐ TUẦN.
 *
 * Cần thiết vì `seeds × expansions` (28×10 = 280) lớn hơn trần `maxRequests`
 * (180): quét theo đúng thứ tự khai thì 10 gốc cuối — tứ trụ, bát tự, phong
 * thủy, xem tướng, đặt tên con — KHÔNG BAO GIỜ tới lượt, tuần nào cũng vậy.
 * Xoay điểm bắt đầu mỗi tuần thì sau vài tuần mọi gốc đều được phủ, mà vẫn giữ
 * được trần gọi để không nện endpoint không chính thức của Google.
 */
export function rotateSeeds<T>(seeds: T[], weekIndex: number): T[] {
  if (seeds.length === 0) return seeds;
  const off = ((weekIndex % seeds.length) + seeds.length) % seeds.length;
  return [...seeds.slice(off), ...seeds.slice(0, off)];
}

/** Số tuần kể từ epoch — mốc xoay vòng, ổn định trong cùng một tuần. */
function currentWeekIndex(now = Date.now()): number {
  return Math.floor(now / (7 * 24 * 60 * 60 * 1000));
}

/** Chạy một lượt thu thập + ghi kho. Không bao giờ throw. */
export async function runKeywordSuggest(): Promise<SuggestRunResult> {
  const cfg = await loadKeywordSuggestConfig();
  if (!cfg.enabled) {
    return { requests: 0, failed: 0, rawSuggestions: 0, unique: 0, inserted: 0, updated: 0, skipped: true };
  }

  const rotated: KeywordSuggestConfig = { ...cfg, seeds: rotateSeeds(cfg.seeds, currentWeekIndex()) };
  const { hits, requests, failed, rawSuggestions } = await collectSuggestions(rotated);
  const list = [...hits.values()];
  const { inserted, updated } = await upsertKeywords(list);

  return { requests, failed, rawSuggestions, unique: list.length, inserted, updated, skipped: false };
}
