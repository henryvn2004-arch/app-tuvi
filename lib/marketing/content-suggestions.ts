// lib/marketing/content-suggestions.ts
// ============================================================
// M0.5 (track Marketing Autopilot) — đề xuất content/campaign ADVISORY: LLM
// đọc lại 3 RPC marketing đã có (sources/campaigns/traffic), KHÔNG thêm RPC
// mới. Sinh ON-DEMAND khi admin bấm nút trong dashboard Marketing (không
// cron) — thuần tham khảo, KHÔNG tự thực thi campaign/nội dung nào.
// ============================================================

import { llmText } from '@/lib/llm/complete';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function callRpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`${fn}: ${await res.text()}`);
  return res.json();
}

const SYSTEM_PROMPT = `Bạn là cố vấn marketing (advisory) cho tuviminhbao.com (app Tử Vi Đẩu Số, Việt Nam).
Bạn nhận 1 snapshot dữ liệu (JSON: sources, campaigns, traffic) trong 1 khoảng ngày, và viết gợi ý
kênh/nội dung nên đầu tư. Yêu cầu:
- Tiếng Việt, thẳng vào trọng tâm, dưới 300 từ.
- 2 phần: "📊 Kênh nên đầu tư thêm / nên xem lại" (dựa trên signups·paid·revenue_credits mỗi kênh
  trong sources) và "✍️ Ý tưởng nội dung" (dựa trên top_paths/top_referrers trong traffic — trang
  nào đang kéo traffic tốt, nội dung dạng đó nên nhân bản/mở rộng).
- Nếu "campaigns" RỖNG — nói thẳng "chưa có chiến dịch nào gắn utm_campaign" thay vì bịa số.
- CHỈ dùng số có trong dữ liệu, KHÔNG bịa. Nếu dữ liệu quá ít để kết luận, nói "chưa đủ dữ liệu".
- CUỐI CÙNG luôn ghi rõ 1 dòng: đây là gợi ý tham khảo, không tự động chạy — người dùng tự quyết.`;

export async function generateContentSuggestions(from: string, to: string): Promise<string> {
  const [sources, campaigns, traffic] = await Promise.all([
    callRpc('marketing_sources', { p_from: from, p_to: to }),
    callRpc('marketing_campaigns', { p_from: from, p_to: to }),
    callRpc('marketing_traffic', { p_from: from, p_to: to }),
  ]);
  return llmText({
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify({ sources, campaigns, traffic }),
    maxTokens: 900,
  });
}
