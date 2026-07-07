// lib/mcp/auth.ts
// ============================================================
// Validate key MCP + đọc tier/quota từ bảng mcp_keys (Supabase, SERVICE KEY).
// Route dùng phía server, KHÔNG expose ra client. Best-effort: lỗi cấu hình
// → trả lỗi rõ ràng bằng tiếng Việt để user biết đường lấy key.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

export interface McpKeyInfo {
  key: string;
  tier: 'free' | 'paid' | 'master' | string;
  label: string | null;
  charts_allowed: number;
  backtest_years: number; // -1 = vô hạn
  future_years: number;
  active: boolean;
}

export interface ValidateResult {
  ok: boolean;
  info?: McpKeyInfo;
  /** Thông điệp tiếng Việt hiển thị cho user khi sai/hết hạn key. */
  error?: string;
}

const GET_KEY_URL = (kToLower: string) =>
  `${SUPABASE_URL}/rest/v1/mcp_keys?key=eq.${encodeURIComponent(kToLower)}&select=*&limit=1`;

/** Thông điệp mời lấy key khi sai/không có key. */
export const HUONG_DAN_LAY_KEY =
  'Key MCP không hợp lệ hoặc đã bị khoá. Lấy key của bạn tại https://tuviminhbao.com/mcp rồi cập nhật lại đường dẫn kết nối dạng https://tuviminhbao.com/mcp/<key>.';

export async function validateKey(key: string): Promise<ValidateResult> {
  const k = String(key || '').trim();
  if (!k) return { ok: false, error: HUONG_DAN_LAY_KEY };
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { ok: false, error: 'Máy chủ chưa cấu hình kết nối dữ liệu. Vui lòng thử lại sau.' };
  }
  try {
    const res = await fetch(GET_KEY_URL(k), { headers: SB_HEADERS });
    if (!res.ok) return { ok: false, error: HUONG_DAN_LAY_KEY };
    const rows = (await res.json()) as McpKeyInfo[];
    const info = rows[0];
    if (!info || info.active === false) return { ok: false, error: HUONG_DAN_LAY_KEY };
    return { ok: true, info };
  } catch {
    return { ok: false, error: 'Không kết nối được máy chủ dữ liệu. Vui lòng thử lại sau.' };
  }
}
