// lib/marketing/autopilot-promo.ts
// ============================================================
// M0.6.3 (track Marketing Autopilot) — auto khuyến mãi giữ chân: cấp Lượng
// bonus (bounded budget/lượt chạy) cho user "sắp rời bỏ" (dashboard_at_risk,
// CÙNG RPC dùng cho bảng At-Risk D1 + nút nhắc tay M0.4). Khác M0.4 (admin
// tự soạn/gửi TAY) — đây là autopilot THẬT, nên khoá 2 lớp: công tắc tổng
// (marketing.autopilot_enabled) + budget/lượt (marketing.autopilot_promo,
// mặc định budgetCreditsPerRun=0 = TẮT, Henry phải tự đặt số dương mới bật).
// Cooldown 30N/user (đọc lại autopilot_actions, KHÔNG phụ thuộc cooldown
// nhắc tay M0.4 — 2 cơ chế độc lập, tự soạn tay không tính vào đây).
// ============================================================

import { callRpc, getConfig, isAutopilotEnabled, inCooldown, logAutopilotAction, notifyUserBestChannel, SB_HEADERS } from './autopilot';

const SUPABASE_URL = process.env.SUPABASE_URL!;

interface PromoConfig {
  budgetCreditsPerRun: number; // tổng Lượng tối đa cấp MỖI LẦN CHẠY — 0 = tắt (mặc định)
  grantAmount: number; // Lượng cấp mỗi user
  cooldownDays: number;
  maxUsersPerRun: number;
  idleDays: number;
  minEvents: number;
}

const PROMO_DEFAULTS: PromoConfig = {
  budgetCreditsPerRun: 0,
  grantAmount: 5,
  cooldownDays: 30,
  maxUsersPerRun: 5,
  idleDays: 14,
  minEvents: 3,
};

interface AtRiskUser {
  user_id: string;
  email: string;
  balance: number;
  last_active: string;
  event_count: number;
}

async function grantCredits(userId: string, amount: number): Promise<void> {
  await callRpc('add_credits', { p_user_id: userId, p_amount: amount });
  await fetch(`${SUPABASE_URL}/rest/v1/credit_transactions`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      amount,
      type: 'autopilot_promo',
      description: 'Tự động: khuyến mãi giữ chân (autopilot)',
      created_at: new Date().toISOString(),
    }),
  });
}

export interface PromoAutopilotResult {
  ran: boolean;
  granted: number;
  proposals: string[];
}

export async function runPromoAutopilot(): Promise<PromoAutopilotResult> {
  const cfg = { ...PROMO_DEFAULTS, ...(await getConfig<Partial<PromoConfig>>('marketing.autopilot_promo', {})) };
  if (cfg.budgetCreditsPerRun <= 0 || cfg.grantAmount <= 0) return { ran: false, granted: 0, proposals: [] };

  const candidates = await callRpc<AtRiskUser[]>('dashboard_at_risk', {
    p_idle_days: cfg.idleDays,
    p_min_events: cfg.minEvents,
    p_limit: cfg.maxUsersPerRun * 3, // over-fetch, lọc cooldown rồi mới chốt danh sách
  });

  const enabled = await isAutopilotEnabled();
  const proposals: string[] = [];
  let granted = 0;
  let budgetLeft = cfg.budgetCreditsPerRun;

  for (const u of candidates) {
    if (proposals.length >= cfg.maxUsersPerRun) break; // trần số user/lượt — áp cho CẢ shadow lẫn live
    const cooling = await inCooldown('promo_grant', u.user_id, cfg.cooldownDays);
    if (cooling) continue;

    // Còn budget thật mới LIVE; hết budget (dù đã bật autopilot) → rơi về shadow
    // cho phần còn lại của lượt chạy, KHÔNG chặn cứng cả lượt.
    const mode: 'shadow' | 'live' = enabled && budgetLeft >= cfg.grantAmount ? 'live' : 'shadow';
    const reason = `At-risk: số dư ${u.balance} Lượng, im lặng từ ${new Date(u.last_active).toLocaleDateString('vi-VN')}, ${u.event_count} lượt hoạt động trước đó.`;

    let channel: 'telegram' | 'push' | 'none' = 'none';
    if (mode === 'live') {
      await grantCredits(u.user_id, cfg.grantAmount);
      channel = await notifyUserBestChannel(
        u.user_id,
        `🎁 Tử Vi Minh Bảo tặng bạn ${cfg.grantAmount} Lượng để dùng thử lại — mở app xem vận mới nhé: https://www.tuviminhbao.com/app`,
      );
      budgetLeft -= cfg.grantAmount;
      granted++;
    }

    await logAutopilotAction({
      actionType: 'promo_grant',
      mode,
      target: u.user_id,
      before: { balance: u.balance },
      after: mode === 'live' ? { balance: u.balance + cfg.grantAmount, notified_via: channel } : null,
      reason,
      meta: { email: u.email, grant_amount: cfg.grantAmount },
    });

    proposals.push(`${u.email || u.user_id.slice(0, 8)}: ${mode === 'live' ? `ĐÃ tặng ${cfg.grantAmount} Lượng (báo qua ${channel === 'none' ? 'không có kênh' : channel})` : `ĐỀ XUẤT tặng ${cfg.grantAmount} Lượng`} — ${reason}`);
  }

  return { ran: true, granted, proposals };
}
