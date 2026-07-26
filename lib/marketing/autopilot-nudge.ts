// lib/marketing/autopilot-nudge.ts
// ============================================================
// M0.6.4 (track Marketing Autopilot) — auto "campaign" nội bộ: KHÔNG có tích
// hợp nền tảng quảng cáo ngoài (Facebook/Google Ads API) nên "tự tạo
// campaign" ở đây nghĩa là chiến dịch NHẮC LẠI qua kênh sở hữu (Telegram/
// Push) tới 1 segment tự tính — không phải tạo quảng cáo trả tiền bên ngoài.
//
// Segment: "sắp im lặng SỚM HƠN" promo_grant — im lặng 7–13 ngày (còn
// promo_grant nhắm 14+ ngày, xem autopilot-promo.ts) — dùng lại CHÍNH
// dashboard_at_risk(idle_days=7) rồi lọc bớt phần đã ≥14 ngày (tránh trùng
// segment với promo). Message CỐ ĐỊNH (không LLM mỗi lượt — tránh chi phí +
// nội dung không kiểm soát được), CHỈ nhắc, KHÔNG tặng gì.
// ============================================================

import { callRpc, getConfig, isAutopilotEnabled, inCooldown, logAutopilotAction, notifyUserBestChannel } from './autopilot';

interface NudgeConfig {
  enabledBudgetPerRun: number; // số user tối đa được nhắc THẬT/lượt chạy — 0 = tắt (mặc định)
  cooldownDays: number;
  maxUsersPerRun: number;
  earlyIdleDays: number; // ngưỡng dưới (bắt đầu coi là "sắp rời bỏ" sớm)
  lateIdleDaysExclusive: number; // ngưỡng trên (loại trừ — đã thuộc segment promo_grant)
  minEvents: number;
}

const NUDGE_DEFAULTS: NudgeConfig = {
  enabledBudgetPerRun: 0,
  cooldownDays: 14,
  maxUsersPerRun: 20,
  earlyIdleDays: 7,
  lateIdleDaysExclusive: 14,
  minEvents: 3,
};

interface AtRiskUser {
  user_id: string;
  email: string;
  balance: number;
  last_active: string;
  event_count: number;
}

const NUDGE_TEXT =
  '👋 Tử Vi Minh Bảo nhớ bạn ghé lâu rồi chưa quay lại. Vận trình mỗi ngày một khác — ghé xem lá số/vận hạn mới nhất: https://www.tuviminhbao.com/app';

export interface NudgeAutopilotResult {
  ran: boolean;
  sent: number;
  proposals: string[];
}

export async function runSegmentNudgeAutopilot(): Promise<NudgeAutopilotResult> {
  const cfg = { ...NUDGE_DEFAULTS, ...(await getConfig<Partial<NudgeConfig>>('marketing.autopilot_segment_nudge', {})) };
  if (cfg.enabledBudgetPerRun <= 0) return { ran: false, sent: 0, proposals: [] };

  const wide = await callRpc<AtRiskUser[]>('dashboard_at_risk', {
    p_idle_days: cfg.earlyIdleDays,
    p_min_events: cfg.minEvents,
    p_limit: cfg.maxUsersPerRun * 4,
  });
  const cutoff = Date.now() - cfg.lateIdleDaysExclusive * 86_400_000;
  const segment = wide.filter((u) => new Date(u.last_active).getTime() >= cutoff); // idle earlyIdleDays..lateIdleDaysExclusive (loại phần đã thuộc promo_grant)

  const enabled = await isAutopilotEnabled();
  const proposals: string[] = [];
  let sent = 0;
  let budgetLeft = cfg.enabledBudgetPerRun;

  for (const u of segment) {
    if (proposals.length >= cfg.maxUsersPerRun) break;
    const cooling = await inCooldown('segment_nudge', u.user_id, cfg.cooldownDays);
    if (cooling) continue;

    const mode: 'shadow' | 'live' = enabled && budgetLeft > 0 ? 'live' : 'shadow';
    const reason = `Idle ${Math.round((Date.now() - new Date(u.last_active).getTime()) / 86_400_000)} ngày (giữa ${cfg.earlyIdleDays}-${cfg.lateIdleDaysExclusive}N), số dư ${u.balance} Lượng, ${u.event_count} lượt hoạt động trước đó.`;

    let channel: 'telegram' | 'push' | 'none' = 'none';
    if (mode === 'live') {
      channel = await notifyUserBestChannel(u.user_id, NUDGE_TEXT);
      if (channel !== 'none') {
        sent++;
        budgetLeft--;
      }
    }

    await logAutopilotAction({
      actionType: 'segment_nudge',
      mode,
      target: u.user_id,
      before: null,
      after: mode === 'live' ? { notified_via: channel } : null,
      reason,
      meta: { email: u.email },
    });

    const label = mode === 'live' ? (channel === 'none' ? 'KHÔNG có kênh (bỏ qua)' : `ĐÃ nhắc qua ${channel}`) : 'ĐỀ XUẤT nhắc';
    proposals.push(`${u.email || u.user_id.slice(0, 8)}: ${label} — ${reason}`);
  }

  return { ran: true, sent, proposals };
}
