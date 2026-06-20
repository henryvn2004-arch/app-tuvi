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

// Prompt mặc định — cũng là bản seed trong migration. Sửa ở DB để
// đổi văn phong/cổ pháp mà không động code.
export const DEFAULT_SYSTEM_PROMPT = `Bạn là chuyên gia Tử Vi Đẩu Số theo cổ pháp, văn phong trí thức Hà Nội xưa — điềm đạm, súc tích, sâu sắc, nhân hậu. Phụng sự trang Tử Vi Minh Bảo.

NGUYÊN TẮC BẤT DI BẤT DỊCH:
- TUYỆT ĐỐI không bịa số liệu, vị trí sao, điểm số. Mọi con số/sao/cách cục phải đến từ kết quả công cụ (tool). Nếu chưa có dữ liệu, hãy gọi công cụ hoặc hỏi người dùng.
- Để lập lá số cần đủ: ngày/tháng/năm sinh DƯƠNG lịch, giờ sinh (theo địa chi), giới tính. Nếu thiếu, hỏi lại NGẮN GỌN, không đoán bừa.
- Khi đã có lá số, luận giải CHỈ dựa trên dữ liệu lá số trong hội thoại.
- Câu hỏi gắn với một năm cụ thể → dùng công cụ tra vận hạn. Hỏi ngày tốt → dùng công cụ xem ngày tốt.
- Trả lời bằng tiếng Việt, mạch lạc, có chiều sâu nhưng không lan man. Có thể dùng markdown nhẹ.`;

export interface ChatConfig {
  /** System prompt cho agent */
  systemPrompt: string;
  /** Model Anthropic */
  model: string;
  /** Số vòng tool-use tối đa */
  maxRounds: number;
  /** max_tokens mỗi lượt */
  maxTokens: number;
  /** Giá Lượng trừ cho 1 lượt trả lời thành công (0 = miễn phí) */
  cost: number;
}

export const DEFAULTS: ChatConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  model: 'claude-sonnet-4-6',
  maxRounds: 4,
  maxTokens: 1500,
  cost: 0,
};

// Ánh xạ key trong DB → field. Thiếu key nào thì giữ default field đó.
const KEY_MAP: Record<string, keyof ChatConfig> = {
  'chat.system_prompt': 'systemPrompt',
  'chat.model': 'model',
  'chat.max_rounds': 'maxRounds',
  'chat.max_tokens': 'maxTokens',
  'chat.cost': 'cost',
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
  if (field === 'systemPrompt' || field === 'model') {
    if (typeof value === 'string' && value.trim()) cfg[field] = value;
    return;
  }
  // maxRounds | maxTokens | cost — số
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n >= 0) cfg[field] = n;
}

/** Xoá cache (dùng sau khi admin sửa config, nếu cần áp dụng ngay). */
export function invalidateChatConfig() {
  cache = null;
}
