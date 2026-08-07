// lib/mcp/usage.ts
// ============================================================
// Ghi log usage vào mcp_usage + đếm distinct năm đã tra van_han (cho quota
// free tier). Tất cả best-effort: lỗi → không ném (không chặn tool chạy),
// nhưng đếm quota FAIL-CLOSED (coi như đã dùng hết) để tránh lách quota.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};
const ready = () => !!(SUPABASE_URL && SUPABASE_KEY);

/** Ghi 1 dòng usage. Best-effort, không ném. */
export async function logUsage(key: string, tool: string, input: unknown): Promise<void> {
  if (!ready()) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/mcp_usage`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({ key, tool, input: input ?? {} }),
    });
  } catch {
    /* nuốt lỗi: log usage không được chặn nghiệp vụ */
  }
}

/**
 * Tập các năm (nam_xem) mà key này ĐÃ tra van_han (distinct). Dùng để áp quota
 * backtest_years cho free tier. Trả null nếu không truy vấn được → gọi bên
 * ngoài fail-closed.
 */
export async function distinctVanHanYears(key: string): Promise<Set<number> | null> {
  if (!ready()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mcp_usage?key=eq.${encodeURIComponent(key)}&tool=eq.van_han&select=input`,
      { cache: 'no-store', headers: SB_HEADERS },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { input?: { nam_xem?: number } }[];
    const s = new Set<number>();
    for (const r of rows) {
      const y = Number(r?.input?.nam_xem);
      if (Number.isFinite(y)) s.add(y);
    }
    return s;
  } catch {
    return null;
  }
}
