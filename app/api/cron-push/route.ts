// app/api/cron-push/route.ts
// Vercel cron: 0 0 * * * (00:00 UTC = 07:00 VN) → gọi Supabase Edge Function
// send-daily-push (web-push, bảng push_subscriptions).
//
// Đây là kênh nhắc DUY NHẤT đang tới được người thật (kênh FCM
// `/api/cron/daily-push` có 0 token vì app native chưa phát hành).
//
// ============================================================
// 🔴 VÁ 07/08 — tin nhắc lặp lại NGUYÊN VĂN mỗi sáng
//
// Edge function tự dựng chữ từ một bảng CHÉP TAY 24 dòng tra theo CAN CHI NĂM
// SINH. Tức mỗi người nhận đúng MỘT câu, y hệt nhau, mỗi ngày, mãi mãi — và
// câu đó không nói gì về NGÀY HÔM NAY. Đo trên prod: người đăng ký từ 12/06 đã
// nhận cùng một câu ~56 lần.
//
// Nay route này DỰNG NỘI DUNG (qua `lib/push/daily-message.ts`, cùng nguồn với
// thẻ "Vận hôm nay") rồi giao cho edge function CHỈ đi phát. Lý do chia vai như
// vậy: engine ngày-tốt là TypeScript trong repo, edge function là Deno tách
// biệt — chép engine sang đó là dựng bản thứ hai rồi hai bên trôi khỏi nhau,
// đúng cái bẫy đã trả giá ở can chi ngày. Còn phần KÝ VAPID + mã hoá payload
// thì ngược lại: gói `web-push` đã chạy tốt bên Deno, tự cài lại bằng
// crypto thô trong Node là ~150 dòng ECDH dễ sai thầm lặng.
//
// Tương thích HAI CHIỀU (không có thứ tự deploy nào làm hỏng):
//   • edge bản CŨ nhận body mới → bỏ qua, vẫn gửi như trước.
//   • edge bản MỚI không nhận được body → tự lùi về một câu chung an toàn.
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
import { buildDailyPushMessage } from '@/lib/push/daily-message';

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
  const msg = buildDailyPushMessage();
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
      },
      body: JSON.stringify(msg),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, day: msg.canChi, ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
