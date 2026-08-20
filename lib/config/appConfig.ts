// lib/config/appConfig.ts
// ============================================================
// CONFIG RUNTIME — đọc cấu hình chat từ bảng Supabase `app_config`
// (Sprint 0.3). Mục tiêu: chỉnh prompt / model / giá Lượng ở MỘT
// chỗ (DB) mà KHÔNG cần deploy lại — mọi client tự ăn theo.
//
// Cơ chế: đọc 1 lần, cache in-memory theo TTL ngắn. Nếu bảng
// chưa có / lỗi mạng → fallback về DEFAULTS (an toàn, không sập).
//
// Bảng: app_config(key TEXT PK, value JSONB). value đã là JSON
// nên Supabase REST trả về đúng kiểu (string/number) — không cần parse.
//
// Xem _patches/migration-app-config.sql + docs/KIEN-TRUC-VA-LO-TRINH.md.
// ============================================================

import { COMPANION_DEFAULTS, type CompanionConfig, type CrisisLine } from '@/lib/agent/companion';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Prompt agent mặc định = TEMPLATE chung trong lib/agent/prompts.ts
// (CHAT_SYSTEM_LASO / CHAT_SYSTEM_GENERAL) — MỘT nguồn với /api/lasotuvi.
// chat.system_prompt trong app_config là OVERRIDE tuỳ chọn: để trống =
// dùng template chung; điền giá trị = admin ghi đè qua DB (không deploy).

export interface ChatConfig {
  /** Override prompt từ DB. Rỗng = dùng template chung lib/agent/prompts. */
  systemPrompt: string;
  /** Model Anthropic */
  model: string;
  /** Số vòng tool-use tối đa */
  maxRounds: number;
  /** max_tokens mỗi lượt */
  maxTokens: number;
  /** Giá Lượng trừ cho 1 lượt trả lời thành công (0 = miễn phí) */
  cost: number;
  /**
   * Provider cho các route STANDALONE (không qua runAgent): cron, /api/lasotuvi,
   * tuong-mat, phong-thuy, tubinh, xem-tuoi. 'gemini' (mặc định) hoặc 'anthropic'.
   * Đây là provider CHÍNH; helper llm luôn thử provider kia làm BACKUP nếu lỗi.
   * Đổi qua app_config 'chat.standalone_provider' — không deploy.
   */
  standaloneProvider: string;
  /**
   * Định tuyến provider LLM theo từng kịch bản (toolType) → 'gemini' | 'anthropic'.
   * Key '_default' áp cho kịch bản không liệt kê. Chỉ có tác dụng cho các kịch
   * bản prose-thuần an toàn (xem GEMINI_PROSE_SCENARIOS); laso/luận-giải/bát-tự
   * và vision LUÔN dùng Anthropic bất kể cấu hình. Sửa `chat.provider_routes`
   * trong app_config để bật/tắt từng tool — KHÔNG cần deploy.
   */
  providerRoutes: Record<string, string>;
  /**
   * Tầng 1 của rail — cách hành xử khi người dùng đang tâm sự (lib/agent/
   * companion.ts). Đọc CÙNG lượt fetch với các khoá chat.* khác để không thêm
   * một vòng mạng vào đường nóng của rail.
   * `enabled:false` → rail quay lại đúng hành vi cũ; khối NGUY CẤP vẫn giữ.
   */
  companion: CompanionConfig;
}

export const DEFAULTS: ChatConfig = {
  systemPrompt: '', // rỗng = dùng template chung lib/agent/prompts

  // Chốt Henry 2026-08-20: "Kimi K3 primary, back up 1 là opus 5, back up 2
  // là gemini flash". Kimi K3 (lib/agent/providers/kimi.ts) thử TRƯỚC MỌI
  // kịch bản trong run.ts — KHÔNG đọc providerRoutes (model hỗ trợ native cả
  // vision lẫn tool-calling nên không cần eligibility gate). Model dưới đây
  // là backup-1 (Opus 5, qua Anthropic Messages API).
  model: 'claude-opus-5',
  maxRounds: 4,
  maxTokens: 3000, // đủ cho câu luận sâu 1 phần (24-phần cho tới 3000); DB app_config 'chat.max_tokens' override được. Câu ngắn không tốn thêm (chỉ trả token thực sinh).
  cost: 5, // 5 Lượng / lượt — giá chuẩn; DB app_config 'chat.cost' override được (không cần deploy)
  // Route STANDALONE (lib/llm/complete.ts: cron, /api/lasotuvi, tuong-mat,
  // phong-thuy, tubinh, xem-tuoi). 'anthropic' làm primary CHỈ khi Kimi chưa
  // cấu hình hoặc bị admin ép qua giá trị này — bình thường Kimi luôn đi
  // trước (complete.ts tự chèn 'kimi' lên đầu chuỗi bất kể giá trị ở đây).
  standaloneProvider: 'anthropic',
  // Chuỗi backup SAU KHI Kimi lỗi (rail chat, run.ts): '_default'='anthropic'
  // → mọi kịch bản (kể cả 'laso' — vương miện có paywall) rơi vào loop
  // Anthropic/Opus 5 TRƯỚC, Gemini chỉ còn là lưới đỡ khẩn cấp bên trong loop
  // đó (geminiProseCapable/geminiToolsCapable, backup-2) — đúng thứ tự Henry
  // chốt. Đổi 'gemini' ở đây để bật lại Gemini làm backup-1 cho một scenario
  // cụ thể (qua app_config 'chat.provider_routes', không deploy).
  providerRoutes: {
    _default: 'anthropic',
    laso: 'anthropic',
  },
  companion: COMPANION_DEFAULTS,
};

// Ánh xạ key trong DB → field. Thiếu key nào thì giữ default field đó.
const KEY_MAP: Record<string, keyof ChatConfig> = {
  'chat.system_prompt': 'systemPrompt',
  'chat.model': 'model',
  'chat.max_rounds': 'maxRounds',
  'chat.max_tokens': 'maxTokens',
  'chat.cost': 'cost',
  'chat.provider_routes': 'providerRoutes',
  'chat.standalone_provider': 'standaloneProvider',
  'chat.companion': 'companion',
};

const TTL_MS = 60_000;
let cache: { at: number; cfg: ChatConfig } | null = null;

/**
 * Lấy cấu hình chat (cache TTL 60s). Không bao giờ throw —
 * lỗi/đọc hụt đều rơi về DEFAULTS để route vẫn chạy.
 */
export async function getChatConfig(): Promise<ChatConfig> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.cfg;

  const cfg: ChatConfig = { ...DEFAULTS };

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const keys = Object.keys(KEY_MAP)
        .map((k) => `"${k}"`)
        .join(',');
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/app_config?key=in.(${encodeURIComponent(keys)})&select=key,value`,
        { cache: 'no-store',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          // Cấu hình không cần fresh tuyệt đối; cache tầng fetch cũng ok.
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as { key: string; value: unknown }[];
        for (const row of rows) {
          const field = KEY_MAP[row.key];
          if (!field || row.value == null) continue;
          applyField(cfg, field, row.value);
        }
      }
    } catch {
      /* fallback DEFAULTS */
    }
  }

  cache = { at: now, cfg };
  return cfg;
}

// Gán value (đã coerce kiểu) vào đúng field, bỏ qua kiểu sai.
function applyField(cfg: ChatConfig, field: keyof ChatConfig, value: unknown) {
  if (field === 'systemPrompt' || field === 'model' || field === 'standaloneProvider') {
    if (typeof value === 'string' && value.trim()) cfg[field] = value;
    return;
  }
  if (field === 'providerRoutes') {
    // Object map { toolType: 'gemini'|'anthropic', _default?: ... }. Chỉ nhận
    // giá trị chuỗi; DB ghi đè TOÀN BỘ map (không merge) để dễ suy luận.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const routes: Record<string, string> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'string') routes[k] = v;
      }
      cfg.providerRoutes = routes;
    }
    return;
  }
  if (field === 'companion') {
    // ⚠️ MERGE theo từng khoá, KHÔNG ghi đè cả object như providerRoutes.
    // Lý do khác nhau: ghi `{"enabled":false}` để tắt tạm mà xoá luôn danh
    // sách số nguy cấp thì đúng lúc cần nhất lại không có số nào. Khoá nào
    // khai thì đổi khoá đó, còn lại giữ mặc định.
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const v = value as Record<string, unknown>;
    const next: CompanionConfig = { ...COMPANION_DEFAULTS };
    if (typeof v.enabled === 'boolean') next.enabled = v.enabled;
    if (Array.isArray(v.crisis_lines)) {
      // Chỉ nhận dòng có ĐỦ tên + số dạng chuỗi. Dòng khuyết bị bỏ chứ không
      // rơi vào prompt thành "undefined — undefined".
      const lines = (v.crisis_lines as unknown[]).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const r = raw as Record<string, unknown>;
        const ten = typeof r.ten === 'string' ? r.ten.trim() : '';
        const so = typeof r.so === 'string' ? r.so.trim() : '';
        if (!ten || !so) return [];
        const gio = typeof r.gio === 'string' && r.gio.trim() ? r.gio.trim() : undefined;
        return [{ ten, so, gio } as CrisisLine];
      });
      // Mảng rỗng/toàn dòng hỏng → GIỮ mặc định (115) thay vì để trắng.
      if (lines.length) next.crisisLines = lines;
    }
    cfg.companion = next;
    return;
  }
  // maxRounds | maxTokens | cost — số
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n >= 0) (cfg as unknown as Record<string, unknown>)[field] = n;
}

/** Xoá cache (dùng sau khi admin sửa config, nếu cần áp dụng ngay). */
export function invalidateChatConfig() {
  cache = null;
}

/**
 * Đọc MỘT khoá `app_config` bất kỳ (ngoài bộ khoá `chat.*` của ChatConfig).
 *
 * Ở đây thay vì trong module nghiệp vụ nào đó vì nhiều mảng đều cần
 * (marketing autopilot, cầu dao ngân sách viral…) — để mỗi nơi tự viết lại một
 * bản `fetch app_config` là kiểu trùng lặp chắc chắn sẽ trôi lệch nhau.
 * KHÔNG cache: các khoá này được đọc thưa, và đọc số cũ ở đây (trần ngân sách,
 * công tắc) nguy hiểm hơn nhiều so với tốn thêm một lượt mạng.
 * Không bao giờ throw — lỗi/thiếu khoá đều trả `fallback`.
 */
export async function getConfigValue<T>(key: string, fallback: T): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return fallback;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' },
    );
    if (!res.ok) return fallback;
    const rows = (await res.json()) as { value?: unknown }[];
    const v = rows?.[0]?.value;
    return v == null ? fallback : (v as T);
  } catch {
    return fallback;
  }
}
