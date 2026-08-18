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
}

const TTL_MS = 60_000;
let cache: { at: number; map: Record<string, PriceRow> } | null = null;

async function loadPricing(): Promise<Record<string, PriceRow>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.map;

  const map: Record<string, PriceRow> = {};
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/tool_pricing?select=tool_id,credits,enabled`, { cache: 'no-store',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) {
        const rows = (await res.json()) as { tool_id: string; credits: number; enabled: boolean }[];
        for (const r of rows) {
          if (r && typeof r.tool_id === 'string') {
            map[r.tool_id] = { credits: Number(r.credits) || 0, enabled: r.enabled !== false };
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
 * Giá (Lượng) của 1 tool theo `tool_pricing`.
 * Trả null nếu tool không có trong bảng, bị tắt (enabled=false), hoặc đọc hụt
 * → nơi gọi fallback về giá mặc định của nó. Lưu ý: credits=0 trả về 0 (miễn phí
 * hợp lệ), KHÁC null.
 */
export async function getToolPrice(toolId: string): Promise<number | null> {
  const row = (await loadPricing())[toolId];
  if (!row || row.enabled === false) return null;
  return row.credits;
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
