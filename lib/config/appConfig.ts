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
}

export const DEFAULTS: ChatConfig = {
  systemPrompt: '', // rỗng = dùng template chung lib/agent/prompts

  model: 'claude-sonnet-4-6',
  maxRounds: 4,
  maxTokens: 3000, // đủ cho câu luận sâu 1 phần (24-phần cho tới 3000); DB app_config 'chat.max_tokens' override được. Câu ngắn không tốn thêm (chỉ trả token thực sinh).
  cost: 5, // 5 Lượng / lượt — giá chuẩn; DB app_config 'chat.cost' override được (không cần deploy)
  standaloneProvider: 'gemini', // route standalone dùng Gemini, Anthropic tự backup
  // Gemini (2.5 Flash) cho MỌI kịch bản đủ điều kiện (prose + vision + bát tự)
  // qua '_default'. Các tool KHÔNG đủ điều kiện — laso (luận-giải/lá-số, dùng
  // function-calling cho vận hạn) — KHÔNG thuộc GEMINI_PROSE/VISION_SCENARIOS
  // nên tự động giữ Sonnet (chất cao nhất + paywall). Đổi route từng tool qua
  // app_config 'chat.provider_routes' — không deploy, revert tức thì.
  providerRoutes: {
    _default: 'gemini',
    // VƯƠNG MIỆN có paywall — MẶC ĐỊNH giữ Sonnet (chất cao nhất). Adapter
    // Gemini function-calling ĐÃ có nhưng NGỦ: flip 'laso'='gemini' qua
    // app_config để bật thử (revert 1 dòng, không deploy). Bao gồm cả luận-giải
    // lẫn lá-số (đều đi path 'laso').
    laso: 'anthropic',
  },
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
        {
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
  // maxRounds | maxTokens | cost — số
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n >= 0) (cfg as unknown as Record<string, unknown>)[field] = n;
}

/** Xoá cache (dùng sau khi admin sửa config, nếu cần áp dụng ngay). */
export function invalidateChatConfig() {
  cache = null;
}
