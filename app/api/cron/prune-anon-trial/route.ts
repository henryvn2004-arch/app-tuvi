// app/api/cron/prune-anon-trial/route.ts
// Dọn nhật ký lượt DÙNG THỬ của khách vô danh — nay là BA bảng:
//   · `anon_rail_hits`      — lượt rail dùng thử (từ 2026-07)
//   · `anon_preview_hits`   — lượt sinh bản luận xem trước (hard paywall 2026-09)
//   · `luan_preview_cache`  — chính bản xem trước đã sinh, giữ 30 ngày
//
// Gộp vào ĐÚNG job này thay vì đẻ cron mới: cùng mục đích (dọn rác đếm-theo-
// ngày), cùng nhịp, và `lib/ops/jobs.ts` giữ nguyên một dòng thay vì ba. Thêm
// cron mới còn tốn một suất trong trần cron của Vercel cho một việc 20ms.
//
// Bảng đó chỉ tồn tại để đếm "bao nhiêu lượt trong NGÀY HÔM NAY" theo IP và
// theo toàn hệ thống — tức mọi dòng quá 2 ngày là rác thuần. Không dọn thì nó
// phình vô hạn theo lưu lượng, và chính hai truy vấn đếm ấy chậm dần đúng vào
// đường nóng của mỗi lượt hỏi.
//
// GIỮ NGUYÊN `anon_rail_trial` (trần ĐỜI theo anon_id) — xoá bảng đó là cấp lại
// quota dùng thử cho mọi trình duyệt cũ, tức tự tay mở đường farm.
//
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được;
// thiếu dòng dưới thì Next 14 vẫn thử prerender lúc build → withCronLog bắt
// "Dynamic server usage" rồi ghi hàng trăm dòng lỗi GIẢ vào cron_runs mỗi lần
// deploy, chôn vùi lỗi thật (S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';

const CRON_SECRET = process.env.CRON_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export async function GET(request: NextRequest) {
  return withCronLog('prune-anon-trial', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ok: true, skipped: 'missing supabase env' });
  }

  // Chạy TUẦN TỰ và ném ở lượt hỏng ĐẦU TIÊN: `withCronLog` ghi status=error,
  // đúng thứ cần thấy. Gom lỗi rồi báo cuối là biến "một bảng không dọn được"
  // thành một dòng log lẫn giữa hai bảng đã dọn xong.
  const prune = async (fn: string): Promise<number> => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: '{}',
      cache: 'no-store',
    });
    if (!res.ok) {
      // Ném lên cho withCronLog ghi status=error — im lặng nuốt lỗi ở đây là biến
      // một cron chết thành một cron "chạy tốt mà chẳng dọn gì".
      throw new Error(`${fn} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return Number(await res.json()) || 0;
  };

  const deleted = await prune('anon_rail_hits_prune');
  const previewHits = await prune('anon_preview_hits_prune');
  const previewCache = await prune('luan_preview_cache_prune');
  // `deleted` giữ NGUYÊN tên và ý nghĩa cũ (chỉ `anon_rail_hits`) — panel vận
  // hành và mọi dòng cron_runs cũ đọc khoá này; đổi nghĩa nó là làm lệch im
  // lặng mọi con số đã ghi trước đây.
  return NextResponse.json({ ok: true, deleted, previewHits, previewCache });
}
