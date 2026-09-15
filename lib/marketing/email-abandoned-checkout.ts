// lib/marketing/email-abandoned-checkout.ts
// ============================================================
// "Đơn rơi" — nhắc user đã bấm mở khoá MỘT tool nhưng CHƯA hoàn tất mua,
// kèm voucher `don-roi-24h` để thúc hoàn tất sớm.
//
// Segment: RPC `dashboard_abandoned_checkout` (migration-abandoned-checkout.sql)
// — user_id có `unlock_click` cho một tool trong khung [minGapMinutes,
// maxAgeHours] TRƯỚC bây giờ mà CHƯA từng có `credit_transactions` thành
// công cho ĐÚNG tool đó (so theo `tool_canon()` — tránh 3 hệ tên lệch nhau,
// bài học D1/`tool_funnel()`, xem migration-tool-funnel.sql).
//
// Cùng khuôn công tắc TÁCH RIÊNG email/voucher như "hồi sinh"
// (email-reminder.ts) — bật email không tự phát sinh chi phí thật.
//
// Voucher `don-roi-24h` CỐ Ý scope='site' (không riêng cho ĐÚNG tool họ bỏ
// dở) — giữ ĐƠN GIẢN, tái dùng nguyên cơ chế voucher TĨNH của 2 trigger
// trước (chào sân/hồi sinh), không dựng voucher_defs ĐỘNG theo từng tool.
// Mục tiêu chỉ là "kéo họ hoàn tất MỘT giao dịch nào đó" — không bắt buộc
// ĐÚNG tool đã bỏ dở, nên scope='tool' là thiết kế cho một yêu cầu chưa ai
// đặt ra, để dành cho lượt sau nếu thật sự cần.
//
// Dedupe THEO NGÀY (không phải THÁNG như "hồi sinh") — đơn rơi khẩn cấp
// giờ/ngày, không phải tuần; segment tự giới hạn qua `maxAgeHours` nên
// không cần cooldown dài. MỖI USER TỐI ĐA 1 EMAIL/NGÀY dù bỏ dở nhiều tool
// (rút gọn segment về 1 dòng mới nhất/user trước khi gửi — 3 email cùng
// ngày cho 3 tool khác nhau là spam, không phải nhắc).
// ============================================================
import { callRpc, getConfig } from './autopilot';
import { sendMarketingEmail } from '../email/send';
import { voucherGrant } from '../billing/vouchers';

interface AbandonedConfig {
  enabledBudgetPerRun: number; // số email tối đa gửi THẬT/lượt — 0 = tắt (mặc định)
  minGapMinutes: number;
  maxAgeHours: number;
  maxCandidatesPerRun: number;
  voucherEnabled: boolean; // kèm voucher "don-roi-24h" — mặc định TẮT
}

const ABANDONED_DEFAULTS: AbandonedConfig = {
  enabledBudgetPerRun: 0,
  minGapMinutes: 60,
  maxAgeHours: 72,
  maxCandidatesPerRun: 100,
  voucherEnabled: false,
};

// Khớp với `voucher_defs.id='don-roi-24h'` (migration-abandoned-checkout.sql)
// — CHỈ dùng để RENDER câu chữ trong email, không phải nguồn sự thật cho
// việc trừ tiền (nguồn thật là bảng, đọc bởi `pickBestVoucher()` lúc thanh toán).
const WINBACK_VOUCHER_ID = 'don-roi-24h';
const WINBACK_PERCENT = 15;
const WINBACK_HOURS = 24;

interface AbandonedUser {
  user_id: string;
  email: string;
  tool_id: string;
  tool_label: string | null;
  last_click: string;
}

function abandonedHtml(toolLabel: string, withVoucher: boolean): string {
  const voucherBlock = withVoucher
    ? `<p style="font-size:14px;color:#333;margin-top:14px">🎟️ Hoàn tất trong <b>${WINBACK_HOURS} giờ</b> tới để được giảm thêm <b>${WINBACK_PERCENT}%</b> — đã nằm sẵn trong tài khoản, tự động áp lúc thanh toán, không cần nhập mã.</p>`
    : '';
  return `<p style="font-size:15px;color:#061A2E">Bạn vừa xem <b>${toolLabel}</b> nhưng chưa hoàn tất mở khoá.</p>
<p style="font-size:14px;color:#333">Kết quả vẫn đang chờ — quay lại hoàn tất để đọc trọn bản luận nhé.</p>
${voucherBlock}
<p style="margin-top:20px"><a href="https://tuviminhbao.com/app" style="display:inline-block;background:#061A2E;color:#C9A84C;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:13px;letter-spacing:1px">Quay lại →</a></p>`;
}

export interface AbandonedResult {
  ran: boolean;
  sent: number;
  candidates: number;
}

/** Cron NGÀY — xem lib/ops/jobs.ts key `email-abandoned-checkout`. */
export async function runEmailAbandonedCheckout(): Promise<AbandonedResult> {
  const cfg = {
    ...ABANDONED_DEFAULTS,
    ...(await getConfig<Partial<AbandonedConfig>>('marketing.email_abandoned_checkout', {})),
  };
  if (cfg.enabledBudgetPerRun <= 0) return { ran: false, sent: 0, candidates: 0 };

  const rawSegment = await callRpc<AbandonedUser[]>('dashboard_abandoned_checkout', {
    p_min_gap_minutes: cfg.minGapMinutes,
    p_max_age_hours: cfg.maxAgeHours,
    p_limit: cfg.maxCandidatesPerRun,
  });

  // RPC trả về theo (user_id, tool_id), sắp `last_click desc` — rút về 1
  // dòng MỚI NHẤT/user để không gửi nhiều email cùng ngày cho cùng một user.
  const seen = new Set<string>();
  const segment = rawSegment.filter((u) => {
    if (seen.has(u.user_id)) return false;
    seen.add(u.user_id);
    return true;
  });

  let sent = 0;
  let budgetLeft = cfg.enabledBudgetPerRun;
  const dayKey = new Date().toISOString().slice(0, 10);

  for (const u of segment) {
    if (budgetLeft <= 0) break;
    if (!u.email) continue;

    const toolLabel = u.tool_label || u.tool_id;
    const result = await sendMarketingEmail({
      dedupeKey: `abandoned-${u.user_id}-${dayKey}`,
      template: 'reminder-abandoned-checkout',
      to: u.email,
      subject: `Bạn còn dở "${toolLabel}" — Tử Vi Minh Bảo`,
      html: abandonedHtml(toolLabel, cfg.voucherEnabled),
      userId: u.user_id,
    });
    if (result.ok) {
      sent++;
      budgetLeft--;
      // voucherGrant() tự best-effort (không throw), xem lib/billing/vouchers.ts.
      if (cfg.voucherEnabled) await voucherGrant(u.user_id, WINBACK_VOUCHER_ID, 'abandoned_checkout', new Date(Date.now() + WINBACK_HOURS * 3600000).toISOString());
    }
  }

  return { ran: true, sent, candidates: segment.length };
}
