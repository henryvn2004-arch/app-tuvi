// app/api/cron/prune-anon-trial/route.ts
// Dọn nhật ký lượt rail DÙNG THỬ của khách vô danh (`anon_rail_hits`).
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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/anon_rail_hits_prune`, {
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
    throw new Error(`anon_rail_hits_prune HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const deleted = Number(await res.json()) || 0;
  return NextResponse.json({ ok: true, deleted });
}
