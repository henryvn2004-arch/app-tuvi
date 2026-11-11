// lib/marketing/email-cross-sell.ts
// ============================================================
// Gợi ý tool LIÊN QUAN qua email, cho user đã dùng tool A mà chưa từng đụng
// tool B trong một cặp đã biết là hợp nhau. GỬI ĐÚNG MỘT LẦN cho mỗi cặp
// (user_id, tool_to) — dedupe theo `email_log`, KHÔNG có cooldown lặp lại vì
// bản chất là "giới thiệu", lặp lại là spam chứ không phải nhắc.
//
// Danh sách cặp CỐ Ý ngắn và tay chọn (không suy tự động từ dữ liệu) — ghép
// sai cặp thành gợi ý vô nghĩa còn tệ hơn không gợi ý gì. `tool_id` phải khớp
// đúng `SHELL_ACTIVE` của từng trang (xem public/*.html).
//
// Nhịp: cron chạy T6 + CN (Henry chốt 2026-09-26: tối đa 2 thư/tuần/người) —
// mỗi lượt một người nhận TỐI ĐA MỘT thư dù khớp nhiều cặp (`sentTo`), cặp
// còn lại để lượt sau. Bỏ chặn này là một người khớp 3 cặp nhận 3 thư cùng sáng.
//
// Cùng khuôn công tắc với autopilot/email-reminder: mặc định TẮT
// (`app_config['marketing.email_cross_sell']`, budget=0), Henry tự bật.
// Là email QUẢNG BÁ nên qua `sendMarketingEmail`.
// ============================================================
import { getConfig } from './autopilot';
import { sendMarketingEmail } from '../email/send';
import { getUserLocales } from '../email/locale';
import { renderCrossSell } from '../email/i18n';
import { DEFAULT_LOCALE } from '../i18n/locales';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

interface CrossSellPair {
  from: string;
  to: string;
  /** Đường dẫn đích (không tiền tố ngôn ngữ). Nhãn + lý do từng cặp nằm ở lib/email/i18n.ts
   *  (khoá `${from}>${to}`) — thêm cặp mới phải thêm đủ 6 ngôn ngữ ở đó (`check:emaili18n`). */
  toPath: string;
}

const PAIRS: CrossSellPair[] = [
  { from: 'luan-giai', to: 'bat-tu', toPath: '/app/bat-tu' },
  { from: 'bat-tu', to: 'luan-giai', toPath: '/app/luan-giai' },
  { from: 'bat-trach', to: 'chon-ngay', toPath: '/app/chon-ngay' },
  { from: 'chan-dung-tien-kiep', to: 'duyen-no-tien-kiep', toPath: '/app/duyen-no-tien-kiep' },
  { from: 'day-con', to: 'huong-nghiep-tre', toPath: '/app/huong-nghiep-tre' },
];

interface Candidate { user_id: string; email: string; from_count: number }

async function fetchCandidates(pair: CrossSellPair, limit: number): Promise<Candidate[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cross_sell_candidates`, {
    method: 'POST',
    headers: SB_HEADERS,
    cache: 'no-store',
    body: JSON.stringify({ p_tool_from: pair.from, p_tool_to: pair.to, p_limit: limit }),
  });
  if (!res.ok) throw new Error(`cross_sell_candidates(${pair.from}->${pair.to}): ${await res.text()}`);
  return res.json();
}

interface CrossSellConfig {
  enabledBudgetPerRun: number; // tổng số email THẬT/lượt (gộp mọi cặp) — 0 = tắt (mặc định)
  maxCandidatesPerPair: number;
}

const CROSS_SELL_DEFAULTS: CrossSellConfig = {
  enabledBudgetPerRun: 0,
  maxCandidatesPerPair: 50,
};

export interface CrossSellResult {
  ran: boolean;
  sent: number;
  pairs: { from: string; to: string; candidates: number }[];
}

/** Cron T6 + CN — xem lib/ops/jobs.ts key `email-cross-sell`. */
export async function runEmailCrossSell(): Promise<CrossSellResult> {
  const cfg = { ...CROSS_SELL_DEFAULTS, ...(await getConfig<Partial<CrossSellConfig>>('marketing.email_cross_sell', {})) };
  if (cfg.enabledBudgetPerRun <= 0) return { ran: false, sent: 0, pairs: [] };

  let sent = 0;
  let budgetLeft = cfg.enabledBudgetPerRun;
  const sentTo = new Set<string>();
  const pairsReport: CrossSellResult['pairs'] = [];

  for (const pair of PAIRS) {
    if (budgetLeft <= 0) break;
    let candidates: Candidate[] = [];
    try {
      candidates = await fetchCandidates(pair, cfg.maxCandidatesPerPair);
    } catch (e) {
      console.error('[email-cross-sell]', e);
      continue;
    }
    pairsReport.push({ from: pair.from, to: pair.to, candidates: candidates.length });

    const locales = await getUserLocales(candidates.map((c) => c.user_id));
    for (const c of candidates) {
      if (budgetLeft <= 0) break;
      if (!c.email || sentTo.has(c.user_id)) continue;
      const locale = locales.get(c.user_id) ?? DEFAULT_LOCALE;
      const mail = renderCrossSell(locale, pair.from, pair.to, pair.toPath);
      const result = await sendMarketingEmail({
        dedupeKey: `crosssell-${c.user_id}-${pair.from}-${pair.to}`,
        template: 'cross-sell',
        to: c.email,
        subject: mail.subject,
        html: mail.html,
        userId: c.user_id,
        locale,
      });
      if (result.ok) {
        sentTo.add(c.user_id);
        sent++;
        budgetLeft--;
      }
    }
  }

  return { ran: true, sent, pairs: pairsReport };
}
