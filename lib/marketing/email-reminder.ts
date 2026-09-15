// lib/marketing/email-reminder.ts
// ============================================================
// Reminder qua EMAIL cho user còn Lượng chưa dùng, im lặng lâu ngày.
//
// VÌ SAO CẦN THÊM KÊNH NÀY: `notifyUserBestChannel` (autopilot.ts) chỉ có
// Telegram/Push — user CHƯA từng liên kết Telegram và CHƯA cài app/bật Push
// (đa số) nhận được 'none', tức KHÔNG có cách nào nhắc lại họ. Email là kênh
// DUY NHẤT chắc chắn có (địa chỉ dùng để đăng ký tài khoản).
//
// Dùng chung `dashboard_at_risk` với autopilot-nudge/-promo nhưng KHÔNG chia
// sẻ cooldown với hai cái đó — đây là kênh khác, và tự có cooldown riêng theo
// `email_log` (dedupe theo tháng) để không spam dù Telegram/Push đã bắn trước.
//
// Cùng khuôn công tắc với autopilot: mặc định TẮT (`enabledBudgetPerRun=0`),
// Henry tự bật qua `app_config['marketing.email_reminder_idle']` sau khi xem
// đủ log shadow-mode. Đây là email QUẢNG BÁ (nhắc quay lại dùng), không phải
// giao dịch, nên PHẢI qua `sendMarketingEmail` (tự chèn link huỷ).
//
// 🎟️ "Hồi sinh": `voucherEnabled` (mặc định TẮT, KHÁC KHOÁ với
// `enabledBudgetPerRun` ở trên) kèm thêm voucher `hoi-sinh-7d` vào đúng email
// này — tái dùng NGUYÊN segment `dashboard_at_risk` + budget/dedupe đã có,
// không dựng cron song song cho cùng một đối tượng. Tách khoá cố ý: bật email
// nhắc không tự động phát sinh chi phí thật (Lượng giảm giá) — Henry phải
// BẬT THÊM RIÊNG voucherEnabled mới có tiêu tiền, hai quyết định độc lập.
// Voucher chỉ cấp SAU khi email gửi thành công (result.ok) — gửi trượt thì
// không cấp; user vẫn nằm trong segment tuần sau, cấp được ở lượt kế tiếp
// (voucher_grant tự ON CONFLICT DO NOTHING nên không cấp trùng nếu đã cấp).
// ============================================================
import { callRpc, getConfig } from './autopilot';
import { sendMarketingEmail } from '../email/send';
import { voucherGrant } from '../billing/vouchers';

interface ReminderConfig {
  enabledBudgetPerRun: number; // số email tối đa gửi THẬT/lượt — 0 = tắt (mặc định)
  idleDays: number;
  minEvents: number;
  maxCandidatesPerRun: number;
  voucherEnabled: boolean; // kèm voucher "hoi-sinh-7d" vào email — mặc định TẮT
}

const REMINDER_DEFAULTS: ReminderConfig = {
  enabledBudgetPerRun: 0,
  idleDays: 14,
  minEvents: 3,
  maxCandidatesPerRun: 100,
  voucherEnabled: false,
};

// Khớp với `voucher_defs.id='hoi-sinh-7d'` (migration-voucher-hoi-sinh.sql) —
// CHỈ dùng để RENDER câu chữ trong email, không phải nguồn sự thật cho việc
// trừ tiền (nguồn thật là bảng, đọc bởi `pickBestVoucher()` lúc thanh toán).
const WINBACK_VOUCHER_ID = 'hoi-sinh-7d';
const WINBACK_PERCENT = 25;
const WINBACK_DAYS = 7;

interface AtRiskUser {
  user_id: string;
  email: string;
  balance: number;
  last_active: string;
  event_count: number;
}

function reminderHtml(balance: number, withVoucher: boolean): string {
  const idleDaysText = 'một thời gian';
  const voucherBlock = withVoucher
    ? `<p style="font-size:14px;color:#333;margin-top:14px">🎟️ Quà quay lại: giảm thêm <b>${WINBACK_PERCENT}%</b> cho lượt mua tiếp theo, có hiệu lực <b>${WINBACK_DAYS} ngày</b> — đã nằm sẵn trong tài khoản, tự động áp lúc thanh toán, không cần nhập mã.</p>`
    : '';
  return `<p style="font-size:15px;color:#061A2E">Tử Vi Minh Bảo nhớ bạn ghé lâu rồi chưa quay lại.</p>
<p style="font-size:14px;color:#333">Bạn đang còn <b>${balance} Lượng</b> chưa dùng trong tài khoản — vận trình mỗi ngày một khác, ghé xem lá số/vận hạn mới nhất của ${idleDaysText} qua nhé.</p>
${voucherBlock}
<p style="margin-top:20px"><a href="https://tuviminhbao.com/app" style="display:inline-block;background:#061A2E;color:#C9A84C;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:13px;letter-spacing:1px">Xem ngay →</a></p>`;
}

export interface EmailReminderResult {
  ran: boolean;
  sent: number;
  candidates: number;
}

/** Cron TUẦN — xem lib/ops/jobs.ts key `email-reminder-idle`. */
export async function runEmailReminderIdle(): Promise<EmailReminderResult> {
  const cfg = { ...REMINDER_DEFAULTS, ...(await getConfig<Partial<ReminderConfig>>('marketing.email_reminder_idle', {})) };
  if (cfg.enabledBudgetPerRun <= 0) return { ran: false, sent: 0, candidates: 0 };

  const segment = await callRpc<AtRiskUser[]>('dashboard_at_risk', {
    p_idle_days: cfg.idleDays,
    p_min_events: cfg.minEvents,
    p_limit: cfg.maxCandidatesPerRun,
  });

  let sent = 0;
  let budgetLeft = cfg.enabledBudgetPerRun;
  // Dedupe theo THÁNG (yyyy-MM) — mỗi user tối đa 1 email loại này/tháng, dù
  // cron chạy hằng tuần và user vẫn còn nằm trong segment tuần sau.
  const monthKey = new Date().toISOString().slice(0, 7);

  for (const u of segment) {
    if (budgetLeft <= 0) break;
    if (!u.email) continue;

    const result = await sendMarketingEmail({
      dedupeKey: `reminder-idle-${u.user_id}-${monthKey}`,
      template: 'reminder-idle-credits',
      to: u.email,
      subject: 'Bạn còn Lượng chưa dùng — Tử Vi Minh Bảo',
      html: reminderHtml(u.balance, cfg.voucherEnabled),
      userId: u.user_id,
    });
    if (result.ok) {
      sent++;
      budgetLeft--;
      // voucherGrant() tự best-effort (không throw, `null` gồm cả "đã cấp từ
      // trước" lẫn lỗi mạng — không phân biệt được, xem docstring vouchers.ts)
      // nên không cần try/catch hay log ở đây.
      if (cfg.voucherEnabled) await voucherGrant(u.user_id, WINBACK_VOUCHER_ID, 'idle_winback', new Date(Date.now() + WINBACK_DAYS * 86400000).toISOString());
    }
  }

  return { ran: true, sent, candidates: segment.length };
}
