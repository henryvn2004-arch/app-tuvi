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
// Cùng khuôn công tắc với autopilot/email-reminder: mặc định TẮT
// (`app_config['marketing.email_cross_sell']`, budget=0), Henry tự bật.
// Là email QUẢNG BÁ nên qua `sendMarketingEmail`.
// ============================================================
import { getConfig } from './autopilot';
import { sendMarketingEmail } from '../email/send';

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
  toLabel: string;
  toUrl: string;
  reason: string;
}

const PAIRS: CrossSellPair[] = [
  { from: 'luan-giai', to: 'bat-tu', toLabel: 'Bát Tự (Tứ Trụ)',
    toUrl: 'https://tuviminhbao.com/bat-tu.html',
    reason: 'Bạn đã xem Tử Vi Đẩu Số — Bát Tự soi mệnh theo góc Can Chi Tứ Trụ, một lớp phân tích khác bổ trợ cho lá số vừa xem.' },
  { from: 'bat-tu', to: 'luan-giai', toLabel: 'Tử Vi Đẩu Số — Luận Giải',
    toUrl: 'https://tuviminhbao.com/app/luan-giai',
    reason: 'Bạn đã xem Bát Tự — Luận Giải Tử Vi Đẩu Số cho góc nhìn 12 cung/vận hạn chi tiết theo từng năm.' },
  { from: 'bat-trach', to: 'chon-ngay', toLabel: 'Chọn Ngày Tốt',
    toUrl: 'https://tuviminhbao.com/chon-ngay.html',
    reason: 'Bạn đã xem hướng nhà hợp mệnh — Chọn Ngày Tốt giúp chọn thời điểm động thổ/nhập trạch hợp mệnh luôn.' },
  { from: 'chan-dung-tien-kiep', to: 'duyen-no-tien-kiep', toLabel: 'Duyên Nợ Tiền Kiếp',
    toUrl: 'https://tuviminhbao.com/duyen-no-tien-kiep.html',
    reason: 'Bạn đã xem Chân Dung Tiền Kiếp — Duyên Nợ Tiền Kiếp soi thêm về các mối duyên gắn với kiếp trước.' },
  { from: 'day-con', to: 'huong-nghiep-tre', toLabel: 'Hướng Nghiệp Trẻ',
    toUrl: 'https://tuviminhbao.com/huong-nghiep-tre.html',
    reason: 'Bạn đã xem cách Dạy Con hợp mệnh — Hướng Nghiệp Trẻ gợi ý luôn định hướng ngành nghề phù hợp về sau.' },
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

function crossSellHtml(pair: CrossSellPair): string {
  return `<p style="font-size:15px;color:#061A2E">Gợi ý dành riêng cho bạn</p>
<p style="font-size:14px;color:#333">${pair.reason}</p>
<p style="margin-top:20px"><a href="${pair.toUrl}" style="display:inline-block;background:#061A2E;color:#C9A84C;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:13px;letter-spacing:1px">Xem ${pair.toLabel} →</a></p>`;
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

/** Cron TUẦN — xem lib/ops/jobs.ts key `email-cross-sell`. */
export async function runEmailCrossSell(): Promise<CrossSellResult> {
  const cfg = { ...CROSS_SELL_DEFAULTS, ...(await getConfig<Partial<CrossSellConfig>>('marketing.email_cross_sell', {})) };
  if (cfg.enabledBudgetPerRun <= 0) return { ran: false, sent: 0, pairs: [] };

  let sent = 0;
  let budgetLeft = cfg.enabledBudgetPerRun;
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

    for (const c of candidates) {
      if (budgetLeft <= 0) break;
      if (!c.email) continue;
      const result = await sendMarketingEmail({
        dedupeKey: `crosssell-${c.user_id}-${pair.from}-${pair.to}`,
        template: 'cross-sell',
        to: c.email,
        subject: `Gợi ý cho bạn: ${pair.toLabel} — Tử Vi Minh Bảo`,
        html: crossSellHtml(pair),
        userId: c.user_id,
      });
      if (result.ok) {
        sent++;
        budgetLeft--;
      }
    }
  }

  return { ran: true, sent, pairs: pairsReport };
}
