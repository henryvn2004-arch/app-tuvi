// lib/marketing/tool-profit.ts
// ============================================================
// SỔ LỢI NHUẬN THEO TOOL — bổ sung vế DOANH THU mà `dashboard_margin`
// (RPC, _patches/migration-pricing-v2.sql) còn thiếu.
//
// `dashboard_margin.by_tool` CHỈ có chi phí (`cost_vnd` từ `events.meta`) —
// tự nó đã ghi rõ lý do: billing rail tính PHẲNG theo tin nhắn, không tách
// theo scenario, nên không có RPC nào suy ra doanh thu riêng cho từng
// `tool_id`. Kết quả: admin thấy "Chu Trình Cuộc Đời tốn 203K/tháng" mà
// KHÔNG BIẾT nó có lãi hay lỗ — đúng lỗ hổng chặn mọi quyết định giá/khuyến
// mãi theo tool (voucher đặt vào tool nào cũng là đoán mò nếu không có vế
// này).
//
// File này KHÔNG đụng RPC cũ (giữ nguyên `dashboard_margin`, tránh sửa lại
// một SECURITY DEFINER đang chạy) — chỉ CỘNG THÊM doanh thu bằng cách đọc
// thẳng `credit_transactions` (nguồn sự thật duy nhất của Lượng đã TIÊU) rồi
// suy `tool_id` từ cột `type` — KHÔNG dùng `slug`: một số tool (vd `laso`)
// ghi slug từ can-chi-ngày-sinh, KHÔNG bắt đầu bằng tool_id (khác luật
// `docs/luat/tien.md` mô tả cho slug THANH TOÁN lúc khởi tạo đơn — đây là
// slug đã LƯU SỔ sau khi trừ tiền, hai giai đoạn khác nhau).
//
// Quy đổi Lượng→VNĐ dùng ĐÚNG MỘT hàm `vndPerCredit()` (billing/packages.ts)
// — cùng đơn giá "gói thứ hai" mà `credit_vnd()` (Postgres) và mọi RPC báo
// cáo khác đang dùng. KHÔNG tự chế hằng số ở đây.
//
// ⚠️ "Doanh thu" = Lượng đã TIÊU × đơn giá bình quân hiện hành — CÙNG quy ước
// với `dashboard_margin.chat_revenue_vnd` đang chạy (không phải tiền mặt nạp
// ĐÚNG lúc mua Lượng đó). Không phải sai số mới, là quy ước đã có sẵn.
//
// Toàn bộ là BÁO CÁO — không throw, lỗi từng nguồn trả rỗng cho đúng phần đó,
// không chặn phần còn lại của trang admin (đi CÙNG Promise.all trong
// handleAdminDashboardV2).
// ============================================================

import { vndPerCredit } from '@/lib/billing/packages';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

export interface ToolProfitRow {
  toolId: string;
  spendCredits: number;
  spendCount: number;
  revenueVnd: number;
}

/**
 * `credit_transactions.type` của lượt CHI TIÊU khớp `tool_id` sau khi chuẩn
 * hoá: bỏ tiền tố `use_`, đổi `_` → `-`. Đã đối chiếu TAY với toàn bộ giá trị
 * `type` thật trên prod (2026-09-15) — khớp đúng mọi `tool_id` có trên
 * `tool_pricing` (vd `use_day_con`→`day-con`, `use_huong_nghiep_tre`→
 * `huong-nghiep-tre`, `use_chu-trinh-cuoc-doi` giữ nguyên vì tool_id đã có
 * gạch ngang sẵn). `type==='chat'` là CA RIÊNG bắt buộc ánh xạ tay: rail
 * chat ghi `type:'chat'` trong `credit_transactions` NHƯNG giá của nó nằm ở
 * `tool_pricing.tool_id='rail-message'` (xem `getRailPrice()` — cùng khoảng
 * lệch tên mà `pricing.ts` đã cảnh báo).
 *
 * Trả `null` cho `topup`/`signup_bonus`/`admin_grant`/`referral_*`/
 * `onboarding_task`/... — các dòng CỘNG tiền hoặc không gắn với một tool cụ
 * thể, không phải chi tiêu cho tool nào.
 */
function normalizeToolType(type: string): string | null {
  if (type === 'chat') return 'rail-message';
  if (!type.startsWith('use_')) return null;
  return type.slice(4).replace(/_/g, '-');
}

async function fetchSpend(sinceIso: string): Promise<{ type: string; amount: number }[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/credit_transactions?select=type,amount&amount=lt.0&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=20000`,
      { cache: 'no-store', headers: SB_HEADERS },
    );
    if (!res.ok) return [];
    return (await res.json()) as { type: string; amount: number }[];
  } catch {
    return []; // báo cáo — im lặng trả rỗng, KHÔNG chặn phần dashboard còn lại
  }
}

/**
 * Doanh thu (Lượng tiêu quy đổi VNĐ) gộp theo `tool_id`, `sinceIso` → nay.
 * Ghép với `dashboard_margin.by_tool` (cost-only, đã có sẵn) ở nơi gọi —
 * hàm này CHỈ trả vế doanh thu, tránh tính lại chi phí đã có RPC audit rồi.
 */
export async function getToolRevenue(sinceIso: string): Promise<Map<string, ToolProfitRow>> {
  const [rows, vpc] = await Promise.all([
    fetchSpend(sinceIso),
    vndPerCredit().catch(() => 500),
  ]);

  const map = new Map<string, ToolProfitRow>();
  for (const r of rows) {
    const toolId = normalizeToolType(String(r.type || ''));
    if (!toolId) continue;
    const credits = -Number(r.amount) || 0;
    const cur = map.get(toolId) || { toolId, spendCredits: 0, spendCount: 0, revenueVnd: 0 };
    cur.spendCredits += credits;
    cur.spendCount += 1;
    map.set(toolId, cur);
  }
  for (const row of map.values()) {
    row.revenueVnd = Math.round(row.spendCredits * vpc);
  }
  return map;
}
