// app/api/cron/keyword-suggest/route.ts
// Bước 3 track "CMO skills" (AI SEO) — quét Google Suggest hằng tuần, đổ vào
// kho `keyword_ideas`. KHÔNG gửi Telegram: đây là job nuôi dữ liệu, chạy im
// lặng; muốn xem thì truy vấn bảng. Nhét thêm một tin nhắn tuần vào máy Henry
// cho một job không cần quyết định gì chỉ làm loãng mấy cảnh báo THẬT.
//
// Chạy THỨ BA 8h sáng VN (0 1 * * 2) — cố ý né T2/T4/T6 (3 autopilot), CN
// (content-pack) và các khung 1h–3h đang đông.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được —
// thiếu `force-dynamic` thì Next thử prerender lúc build rồi ghi lỗi GIẢ vào
// cron_runs (đúng lỗ hổng S0 track COO đã vá).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// ~180 lượt gọi × 350ms nghỉ ≈ 63s, cộng thời gian mạng. 300 = trần Node của
// Vercel Pro, để dư rộng vì Suggest thỉnh thoảng chậm.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runKeywordSuggest } from '@/lib/analytics/keyword-suggest';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('keyword-suggest', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await runKeywordSuggest();
  // `note` hiện thẳng trong panel "Cron & Jobs" của admin — nêu đủ số để nhìn
  // một dòng là biết lượt quét có lành mạnh không (failed cao = Google đang chặn).
  return NextResponse.json({
    ok: true,
    ...r,
    note: r.skipped
      ? 'đã tắt qua app_config'
      : `${r.requests} lượt hỏi · ${r.failed} hỏng · ${r.unique} cụm · +${r.inserted} mới / ${r.updated} cũ`,
  });
}
