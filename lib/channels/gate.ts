// lib/channels/gate.ts
// ============================================================
// CỔNG TÍNH PHÍ (Lượng) DÙNG CHUNG cho các kênh webhook.
//
// Logic giống hệt nhau giữa Telegram/Messenger/WhatsApp:
//   • paywall tắt hoặc cost=0 → free, không đếm.
//   • external_id đã LIÊN KẾT tài khoản → trừ Lượng trên ví chung với web
//     (lib/billing/credits). Hết Lượng → từ chối kèm lời mời nạp.
//   • CHƯA link → cho freeCap lượt free/ngày (chống đốt token); hết → từ chối.
//
// commit() chỉ gọi SAU khi trả lời THÀNH CÔNG (core.runConversation) — trừ
// Lượng nếu đã link, hoặc tăng lượt free nếu chưa. Lỗi giữa chừng KHÔNG tính.
// ============================================================

import { paywallDisabled, getBalance, deductCredits, logTransaction } from '@/lib/billing/credits';
import { chatResolveLinkedUser, chatGetFreeUsageToday, chatIncrFreeUsage } from './store';
import type { AccessGate } from './core';

export interface GateOptions {
  platform: string;
  externalId: string;
  cost: number;
  freeCap: number;
  /** Câu từ chối khi hết lượt free/ngày (user chưa link). */
  freeCapMsg: string;
  /** Câu từ chối khi ví đã link nhưng không đủ Lượng. */
  noBalanceMsg: (balance: number, cost: number) => string;
  /** Mô tả giao dịch ghi vào lịch sử ví. */
  txDescription: string;
}

export async function buildAccessGate(opts: GateOptions): Promise<AccessGate> {
  const { platform, externalId, cost, freeCap } = opts;

  // Tắt paywall hoặc giá 0 → free, không đếm.
  if (paywallDisabled() || cost <= 0) return { allowed: true };

  const userId = await chatResolveLinkedUser(platform, externalId);
  if (userId) {
    // Đã liên kết → dùng ví Lượng chung với web.
    const balance = await getBalance(userId);
    if (balance < cost) return { allowed: false, message: opts.noBalanceMsg(balance, cost) };
    return {
      allowed: true,
      commit: async () => {
        const newBal = await deductCredits(userId, cost);
        if (newBal != null) {
          await logTransaction({ userId, amount: -cost, type: 'chat', description: opts.txDescription });
        }
      },
    };
  }

  // Chưa liên kết → cap lượt free/ngày.
  const used = await chatGetFreeUsageToday(platform, externalId);
  if (used >= freeCap) return { allowed: false, message: opts.freeCapMsg };
  return { allowed: true, commit: async () => void (await chatIncrFreeUsage(platform, externalId)) };
}
