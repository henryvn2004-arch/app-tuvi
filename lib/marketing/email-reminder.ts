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
// ============================================================
import { callRpc, getConfig } from './autopilot';
import { sendMarketingEmail } from '../email/send';

interface ReminderConfig {
  enabledBudgetPerRun: number; // số email tối đa gửi THẬT/lượt — 0 = tắt (mặc định)
  idleDays: number;
  minEvents: number;
  maxCandidatesPerRun: number;
}

const REMINDER_DEFAULTS: ReminderConfig = {
  enabledBudgetPerRun: 0,
  idleDays: 14,
  minEvents: 3,
  maxCandidatesPerRun: 100,
};

interface AtRiskUser {
  user_id: string;
  email: string;
  balance: number;
  last_active: string;
  event_count: number;
}

function reminderHtml(balance: number): string {
  const idleDaysText = 'một thời gian';
  return `<p style="font-size:15px;color:#061A2E">Tử Vi Minh Bảo nhớ bạn ghé lâu rồi chưa quay lại.</p>
<p style="font-size:14px;color:#333">Bạn đang còn <b>${balance} Lượng</b> chưa dùng trong tài khoản — vận trình mỗi ngày một khác, ghé xem lá số/vận hạn mới nhất của ${idleDaysText} qua nhé.</p>
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
      html: reminderHtml(u.balance),
      userId: u.user_id,
    });
    if (result.ok) {
      sent++;
      budgetLeft--;
    }
  }

  return { ran: true, sent, candidates: segment.length };
}
