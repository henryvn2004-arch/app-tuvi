// lib/reports/userReports.ts
// ============================================================
// CỬA DUY NHẤT ghi vào user_reports — cache hiển thị cho tab "Tủ Báo Cáo"
// (danh sách report user đã có, gộp theo lá số họ từng nhập).
//
// ⚠️ KHÔNG PHẢI CỔNG THANH TOÁN. Cổng thật vẫn là hasSlugAccess/
// hasAnySlugAccess (lib/billing/credits.ts) và userOwnsLaso (lib/portraits/
// cache.ts) — ghi lỗi/thiếu ở đây chỉ làm tab liệt kê thiếu một report, không
// mở khoá nhầm thứ gì. Xem _patches/migration-user-reports.sql.
//
// BEST-EFFORT giống mọi cache khác trong repo: lỗi mạng/Supabase chớp thì bỏ
// qua im lặng, không chặn response chính (route trả kết quả cho user quan
// trọng hơn một dòng cache).
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

function ready(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/**
 * Ghi/cập nhật một dòng user_reports. Gọi ngay sau khi một report THẬT SỰ đã
 * sẵn sàng (đã trả tiền + đã gen xong) — không gọi trước, tránh liệt kê một
 * report chưa tồn tại.
 */
export function recordUserReport(params: {
  userId: string;
  toolId: string;
  reportKey: string;
  slug?: string;
}): void {
  if (!ready() || !params.userId || !params.toolId || !params.reportKey) return;
  void fetch(`${SUPABASE_URL}/rest/v1/user_reports`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: params.userId,
      tool_id: params.toolId,
      report_key: params.reportKey,
      slug: params.slug || null,
      source: 'app',
      updated_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}
