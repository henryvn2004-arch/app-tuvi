// app/api/cron-push/route.ts
// Vercel cron: 0 0 * * * (00:00 UTC = 07:00 VN) → gọi Supabase Edge Function
// send-daily-push (web-push, bảng push_subscriptions).
//
// ============================================================
// 🐞 VÁ 30/07 — route này CHẠY MỖI LẦN BUILD và AI GỌI CŨNG ĐƯỢC
//
// Đo trên prod: **315 dòng `cron_runs` trong 7 ngày** (~45 lượt/ngày) cho một
// job lịch NGÀY, mỗi dòng `note = 'sent=2 · failed=0'` — tức mỗi lượt đã đẩy
// thật 2 thông báo tới thiết bị người dùng. Nghĩa là người đăng ký nhận thông
// báo bị dội hàng chục lần/ngày thay vì một lần/sáng.
//
// HAI KHUYẾT CỘNG LẠI:
//   1. `export async function GET()` KHÔNG nhận `request` và không đọc API động
//      nào → Next 14 coi đây là route TĨNH và THỰC THI nó ngay trong `next build`
//      để lấy kết quả đem cache. Mỗi push (kể cả preview build của mỗi PR) là
//      một lượt gửi push thật + một dòng log rác. Đây là mặt còn lại của cái bug
//      đã sinh ra 519 dòng `error` ở 6 route khác: chúng đọc `request.headers`
//      nên ném DynamicServerError lúc build, còn route này thì chạy TRỌN VẸN.
//   2. KHÔNG có bước xác thực nào — khác hẳn mọi cron còn lại
//      (`cron-khao-luan`, `cron-master-write`, `cron/daily-push`, 5 route
//      `cron/*` mới đều kiểm `Bearer CRON_SECRET`). Bất kỳ ai biết URL đều
//      broadcast được thông báo tới toàn bộ subscriber.
//
// `dynamic = 'force-dynamic'` vá (1) — cùng dòng, cùng lý do đã ghi ở 5 route
// `app/api/cron/*`. Kiểm `CRON_SECRET` vá (2), và tự nó cũng là tuyến hai cho
// (1) vì đọc header làm route không thể prerender.
//
// Tương thích: Vercel cron TỰ gắn `Authorization: Bearer <CRON_SECRET>` khi
// CRON_SECRET có trong env, và nút "Chạy ngay" của panel Vận Hành cũng gửi đúng
// header đó (`CRON_TRIGGERS` trong app/api/payment/route.ts) → không đường gọi
// hợp lệ nào bị chặn.
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';

const EDGE_URL    = `${process.env.SUPABASE_URL}/functions/v1/send-daily-push`;
const CRON_SECRET = process.env.CRON_SECRET ?? '';

export async function GET(request: NextRequest) {
  return withCronLog('cron-push', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  // `!CRON_SECRET` cũng chặn: thiếu secret thì KHÔNG có cách nào phân biệt cron
  // thật với người lạ, và mở cửa cho tất cả là lựa chọn tệ hơn bỏ một lượt gửi.
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
