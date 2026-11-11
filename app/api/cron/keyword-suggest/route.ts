// app/api/cron/keyword-suggest/route.ts
// Bước 3 track "CMO skills" (AI SEO) — quét Google Suggest hằng tuần, đổ vào
// kho `keyword_ideas`. KHÔNG gửi Telegram: đây là job nuôi dữ liệu, chạy im
// lặng; muốn xem thì truy vấn bảng. Nhét thêm một tin nhắn tuần vào máy Henry
// cho một job không cần quyết định gì chỉ làm loãng mấy cảnh báo THẬT.
//
// Chạy THỨ BA 10h sáng VN (20 3 * * 2). Đợt đa ngôn ngữ (W10): quét theo NGÔN NGỮ — Google
// Suggest ja/ko/zh-TW/en + Naver (ko), xem lib/analytics/keyword-suggest-i18n.ts. Bản tiếng Việt
// chỉ chạy khi gọi tay `?vi=1` (đã gỡ lịch ở W1 để dồn sức đa ngôn ngữ).
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được —
// thiếu `force-dynamic` thì Next thử prerender lúc build rồi ghi lỗi GIẢ vào
// cron_runs (đúng lỗ hổng S0 track COO đã vá).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 5 mục tiêu × 60 lượt × 350ms nghỉ ≈ 105s (+ vi 300 lượt ≈ 105s khi gọi tay), cộng thời gian mạng. 300 = trần Node của
// Vercel Pro, để dư rộng vì Suggest thỉnh thoảng chậm.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runKeywordSuggest } from '@/lib/analytics/keyword-suggest';
import { runKeywordSuggestI18n } from '@/lib/analytics/keyword-suggest-i18n';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: NextRequest) {
  return withCronLog('keyword-suggest', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const i18n = await runKeywordSuggestI18n();
  const vi = request.nextUrl.searchParams.get('vi') === '1' ? await runKeywordSuggest() : null;
  // `note` hiện thẳng trong panel "Cron & Jobs" của admin — nêu đủ số để nhìn một dòng là biết
  // lượt quét có lành mạnh không (failed cao = Google/Naver đang chặn).
  const note = i18n.skipped
    ? 'đã tắt qua app_config'
    : i18n.results
        .map((x) => `${x.lang}/${x.engine === 'naver' ? 'naver' : 'google'} ${x.requests} hỏi · ${x.failed} hỏng · ${x.unique} cụm · +${x.inserted}/${x.updated}`)
        .join(' | ') + (vi ? ` | vi ${vi.requests} hỏi · +${vi.inserted}/${vi.updated}` : '');
  return NextResponse.json({ ok: true, i18n, vi, note });
}
