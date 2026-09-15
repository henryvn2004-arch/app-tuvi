// lib/billing/pricing.ts
// ============================================================
// GIÁ TOOL — nguồn sự thật DUY NHẤT = bảng Supabase `tool_pricing`.
// Đọc server-side (service key), cache in-memory TTL ngắn. Dùng cho:
//   • /api/v1/chat  → giá rail mỗi tin (tool_id 'rail-message').
//   • /api/payment (deduct) → enforce giá theo tool, KHÔNG tin amount client.
//
// Không bao giờ throw — lỗi/đọc hụt trả null để nơi gọi tự fallback.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

interface PriceRow {
  credits: number;
  enabled: boolean;
  parts: number;
  creditsPerPart: number | null;
  saleCredits: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
}

const TTL_MS = 60_000;
let cache: { at: number; map: Record<string, PriceRow> } | null = null;

async function loadPricing(): Promise<Record<string, PriceRow>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.map;

  const map: Record<string, PriceRow> = {};
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/tool_pricing?select=tool_id,credits,enabled,parts,credits_per_part,sale_credits,sale_starts_at,sale_ends_at`,
        { cache: 'no-store',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
      if (res.ok) {
        const rows = (await res.json()) as {
          tool_id: string; credits: number; enabled: boolean;
          parts: number | null; credits_per_part: number | null;
          sale_credits: number | null; sale_starts_at: string | null; sale_ends_at: string | null;
        }[];
        for (const r of rows) {
          if (r && typeof r.tool_id === 'string') {
            map[r.tool_id] = {
              credits: Number(r.credits) || 0,
              enabled: r.enabled !== false,
              parts: Number(r.parts) || 1,
              creditsPerPart: r.credits_per_part != null ? Number(r.credits_per_part) : null,
              saleCredits: r.sale_credits != null ? Number(r.sale_credits) : null,
              saleStartsAt: r.sale_starts_at || null,
              saleEndsAt: r.sale_ends_at || null,
            };
          }
        }
      }
    } catch {
      /* fallback: map rỗng → nơi gọi tự xử lý */
    }
  }
  cache = { at: now, map };
  return map;
}

/**
 * Giá THẬT của 1 dòng `tool_pricing` NGAY LÚC NÀY — áp khuyến mãi nếu đang
 * trong khung `sale_starts_at`..`sale_ends_at` và `sale_credits` rẻ hơn giá
 * gốc. Đây là hàm DUY NHẤT quyết định "khuyến mãi có đang chạy hay không" —
 * `getToolPrice`/`getRailPrice` và mọi route trừ tiền đi qua nó, nên bulk-tắt
 * KM trong Admin (xoá `sale_credits`) có hiệu lực NGAY (trong TTL cache) trên
 * toàn bộ cổng thanh toán, không cần sửa từng route.
 */
function effectivePrice(row: PriceRow, now: number): number {
  if (row.saleCredits == null || row.saleCredits >= row.credits) return row.credits;
  if (row.saleStartsAt && Date.parse(row.saleStartsAt) > now) return row.credits;
  if (row.saleEndsAt && Date.parse(row.saleEndsAt) <= now) return row.credits;
  return row.saleCredits;
}

/**
 * Giá (Lượng) của 1 tool theo `tool_pricing`, ĐÃ áp khuyến mãi nếu đang chạy.
 * Trả null nếu tool không có trong bảng, bị tắt (enabled=false), hoặc đọc hụt
 * → nơi gọi fallback về giá mặc định của nó. Lưu ý: credits=0 trả về 0 (miễn phí
 * hợp lệ), KHÁC null.
 */
export async function getToolPrice(toolId: string): Promise<number | null> {
  const row = (await loadPricing())[toolId];
  if (!row || row.enabled === false) return null;
  return effectivePrice(row, Date.now());
}

export interface ToolParts {
  /** Tổng số phần độc lập của tool (2+, luôn >1 — parts=1 nghĩa là KHÔNG chia). */
  parts: number;
  /** Giá 1 phần lẻ. Có thể LỚN HƠN credits/parts của giá trọn — cố ý, thành
   *  chiết khấu gói tự nhiên (xem _patches/migration-tool-parts.sql). */
  creditsPerPart: number;
}

/**
 * Cấu trúc chia phần của một tool, đọc từ `tool_pricing.parts`/`credits_per_part`.
 * Trả null nếu tool KHÔNG chia phần (parts<=1), chưa set giá phần, tắt, hoặc
 * đọc hụt — nơi gọi coi như "bán nguyên bó", KHÔNG tự suy credits/parts.
 */
export async function getToolParts(toolId: string): Promise<ToolParts | null> {
  const row = (await loadPricing())[toolId];
  if (!row || row.enabled === false) return null;
  if (row.parts <= 1 || row.creditsPerPart == null || row.creditsPerPart <= 0) return null;
  return { parts: row.parts, creditsPerPart: row.creditsPerPart };
}

/**
 * Giá Lượng cho MỘT lượt rail, dùng chung cho MỌI kênh: web `/api/v1/chat` và
 * 3 bot Telegram / Messenger / WhatsApp.
 *
 * Nguồn thật = `tool_pricing['rail-message']` (admin sửa, không cần deploy).
 * `fallback` (app_config 'chat.cost') CHỈ dùng khi chưa có row hoặc đọc hụt.
 *
 * ⚠️ Trước đây web đọc bảng còn 3 bot đọc thẳng `cfg.cost`, hai đường chỉ tình
 * cờ bằng nhau ở mức 2 — đổi giá dưới bảng là bot lặng lẽ thu một giá khác.
 * Thêm kênh mới thì gọi hàm này, đừng đọc `cfg.cost` trực tiếp.
 */
export async function getRailPrice(fallback: number): Promise<number> {
  const p = await getToolPrice('rail-message');
  return p != null ? p : fallback;
}

/** Xoá cache (sau khi admin sửa giá, nếu cần áp ngay). */
export function invalidatePricing() {
  cache = null;
}
