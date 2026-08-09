// lib/marketing/autopilot-price.ts
// ============================================================
// M0.6.2 (track Marketing Autopilot) — auto price adjustment BỊ THU HẸP CÓ
// CHỦ ĐÍCH. Lý do: dashboard_margin (D3) chỉ có margin THẬT (doanh thu khớp
// chi phí) cho bucket 'chat' (rail-message) — mọi bucket theo scenario.type
// khác CHỈ có cost, KHÔNG có doanh thu riêng (billing rail phẳng theo tin
// nhắn, xem migration-dashboard-margin.sql). Tự chỉnh giá dựa trên số liệu
// KHÔNG khớp doanh thu thật là bịa — nên M0.6.2 CHỈ áp cho tool_id
// 'rail-message', KHÔNG mở rộng tuỳ tiện sang tool khác.
//
// Hành động DUY NHẤT: TĂNG giá khi margin ÂM đủ lâu (tự vệ — ngăn lỗ tiếp),
// KHÔNG BAO GIỜ tự giảm giá (tối ưu tăng trưởng bằng hạ giá là quyết định
// cần con người, rủi ro/lợi ích không đối xứng — sai thì mất doanh thu ngay,
// đúng thì lợi ích chậm/khó đo). Có bounds cứng (app_config, tool PHẢI được
// khai báo rõ mới đủ điều kiện) + cooldown 14 ngày/tool.
// ============================================================

import { callRpc, getConfig, isAutopilotEnabled, inCooldown, logAutopilotAction, SB_HEADERS } from './autopilot';

const SUPABASE_URL = process.env.SUPABASE_URL!;

interface PriceBound {
  max: number; // trần giá (Lượng) — KHÔNG được vượt dù margin âm bao nhiêu
  step: number; // bước tăng mỗi lần (Lượng)
}

// Chỉ 'rail-message' có margin thật — map RỖNG nghĩa là chưa tool nào đủ
// điều kiện; Henry khai bound cho tool_id trong app_config để bật.
type PriceBoundsConfig = Record<string, PriceBound>;

const MARGIN_FLOOR_VND = 200_000; // mẫu tối thiểu 7N để tránh nhiễu số nhỏ
const COOLDOWN_DAYS = 14;
const ELIGIBLE_TOOL_ID = 'rail-message';

interface ToolPricingRow {
  tool_id: string;
  credits: number;
}

async function getToolPricing(toolId: string): Promise<ToolPricingRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tool_pricing?tool_id=eq.${encodeURIComponent(toolId)}&select=tool_id,credits&limit=1`,
    { cache: 'no-store', headers: SB_HEADERS },
  );
  if (!res.ok) return null;
  const rows: ToolPricingRow[] = await res.json();
  return rows[0] || null;
}

async function updateToolPricing(toolId: string, credits: number): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/tool_pricing?tool_id=eq.${encodeURIComponent(toolId)}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ credits, updated_at: new Date().toISOString() }),
  });
}

export interface PriceAutopilotResult {
  ran: boolean;
  proposal: string | null;
  mode: 'shadow' | 'live' | null;
}

export async function runPriceAutopilot(): Promise<PriceAutopilotResult> {
  const bounds = await getConfig<PriceBoundsConfig>('marketing.autopilot_price_bounds', {});
  const bound = bounds[ELIGIBLE_TOOL_ID];
  if (!bound || !bound.max || !bound.step) {
    return { ran: false, proposal: null, mode: null }; // chưa cấu hình bound → không làm gì
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const margin = await callRpc<{ chat_cost_vnd: number; chat_revenue_vnd: number }>('dashboard_margin', {
    p_from: weekAgo.toISOString(),
    p_to: now.toISOString(),
  });
  if (margin.chat_revenue_vnd < MARGIN_FLOOR_VND) {
    return { ran: false, proposal: null, mode: null }; // mẫu quá nhỏ, chưa đủ tin cậy
  }
  const marginVnd = margin.chat_revenue_vnd - margin.chat_cost_vnd;
  if (marginVnd >= 0) {
    return { ran: true, proposal: `Margin rail-message dương (${marginVnd.toLocaleString('vi-VN')}đ/7N) — không cần tăng giá.`, mode: null };
  }

  const pricing = await getToolPricing(ELIGIBLE_TOOL_ID);
  if (!pricing) return { ran: false, proposal: null, mode: null };

  const current = pricing.credits;
  const proposed = Math.min(current + bound.step, bound.max);
  if (proposed <= current) {
    return {
      ran: true,
      proposal: `Margin rail-message ÂM (${marginVnd.toLocaleString('vi-VN')}đ/7N) nhưng giá đã ở trần cấu hình (${bound.max} Lượng) — cần Henry xem lại bound hoặc chi phí model.`,
      mode: null,
    };
  }

  const enabled = await isAutopilotEnabled();
  const cooling = enabled && (await inCooldown('price_adjust', ELIGIBLE_TOOL_ID, COOLDOWN_DAYS));
  const mode: 'shadow' | 'live' = enabled && !cooling ? 'live' : 'shadow';
  const reason = `Margin rail-message ÂM ${marginVnd.toLocaleString('vi-VN')}đ trong 7 ngày qua (doanh thu ${margin.chat_revenue_vnd.toLocaleString('vi-VN')}đ, chi phí ${margin.chat_cost_vnd.toLocaleString('vi-VN')}đ).`;

  if (mode === 'live') {
    await updateToolPricing(ELIGIBLE_TOOL_ID, proposed);
  }

  await logAutopilotAction({
    actionType: 'price_adjust',
    mode,
    target: ELIGIBLE_TOOL_ID,
    before: { credits: current },
    after: { credits: proposed },
    reason,
    meta: { chat_cost_vnd: margin.chat_cost_vnd, chat_revenue_vnd: margin.chat_revenue_vnd, cooling },
  });

  const verb = mode === 'live' ? 'ĐÃ tăng' : cooling ? 'ĐỀ XUẤT (đang cooldown 14N, chưa áp)' : 'ĐỀ XUẤT (đang tắt autopilot)';
  return {
    ran: true,
    proposal: `${verb} giá rail-message: ${current} → ${proposed} Lượng. ${reason}`,
    mode,
  };
}
