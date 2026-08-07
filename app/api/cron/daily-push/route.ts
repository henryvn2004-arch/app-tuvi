// app/api/cron/daily-push/route.ts
// Cron gửi push "Vận hôm nay" cho app NATIVE (FCM). Đọc push_tokens, gửi FCM
// HTTP v1 bằng service account trong FIREBASE_SERVICE_ACCOUNT.
//
// ⚠️ HIỆN ĐANG NO-OP: `push_tokens` = 0 dòng và job này CHƯA GHI ĐƯỢC MỘT LƯỢT
// NÀO vào `cron_runs` kể từ lúc ship. Token FCM chỉ sinh ra trong app Capacitor
// (`registerNativePush` ở shell.js trả về ngay khi không có window.Capacitor),
// mà app native thì chưa phát hành. Đường ĐANG PHỤC VỤ người thật là web-push:
// /api/cron-push → edge `send-daily-push` → push_subscriptions.
//
// KÊNH riêng, NHƯNG NỘI DUNG DÙNG CHUNG với web-push qua
// `lib/push/daily-message.ts` — nếu app native ra mắt thì hai kênh vẫn nói đúng
// một câu về cùng một ngày.
//
// Trơ nếu chưa cấu hình: thiếu FIREBASE_SERVICE_ACCOUNT hoặc 0 token → no-op.
// Bảo vệ: chỉ chạy khi Vercel cron (Authorization: Bearer CRON_SECRET) hoặc
// header x-vercel-cron. Xem _patches/migration-push-tokens.sql.
// Route đọc request.headers (auth CRON_SECRET) nên KHÔNG prerender tĩnh được.
// Thiếu dòng này, Next 14 vẫn thử prerender lúc build → withCronLog bắt được
// lỗi "Dynamic server usage" rồi ghi vào cron_runs, sinh hàng trăm dòng lỗi
// GIẢ mỗi lần deploy và chôn vùi lỗi thật (S0 track COO).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronLog } from '@/lib/cron/log';
import { parseFirebaseServiceAccount, sendFcmPush } from '@/lib/channels/push';
import { buildDailyPushMessage } from '@/lib/push/daily-message';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || '';
const FIREBASE_SA = process.env.FIREBASE_SERVICE_ACCOUNT || '';

// Can chi + tính chất ngày lấy CHUNG một nguồn với thẻ "Vận hôm nay"
// (lib/engine/van-ngay.ts → engine ngày-tốt). Trước đây file này chép riêng
// công thức JDN và todayVN — hai bản của cùng một phép tính.

export async function GET(request: NextRequest) {
  return withCronLog('cron-daily-push', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  // Chỉ cho cron (Vercel gắn Authorization: Bearer CRON_SECRET) hoặc header cron.
  const auth = request.headers.get('authorization') || '';
  // Chỉ chạy khi có Bearer CRON_SECRET — Vercel cron TỰ gắn header này khi
  // CRON_SECRET có trong env (cũng dùng khi bấm "Run" thủ công trên dashboard).
  // KHÔNG tin x-vercel-cron (client ngoài giả được) → fail closed.
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!FIREBASE_SA) return NextResponse.json({ ok: true, skipped: 'no FIREBASE_SERVICE_ACCOUNT' });

  let sa: ReturnType<typeof parseFirebaseServiceAccount>;
  try {
    sa = parseFirebaseServiceAccount(FIREBASE_SA);
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Bad FIREBASE_SERVICE_ACCOUNT: ' + String(e) }, { status: 500 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: tokens, error } = await sb.from('push_tokens').select('token').eq('enabled', true);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!tokens || !tokens.length) return NextResponse.json({ ok: true, sent: 0, note: 'no tokens' });

  // Nội dung lấy từ NGUỒN DUY NHẤT dùng chung với web-push (lib/push/
  // daily-message.ts) — hai kênh mà dựng chữ riêng thì sớm muộn nói khác nhau
  // về cùng một ngày, và không ai phát hiện vì hiếm khi có người nhận cả hai.
  const msg = buildDailyPushMessage();

  let result: Awaited<ReturnType<typeof sendFcmPush>>;
  try {
    result = await sendFcmPush(sa, tokens.map((row) => (row as { token: string }).token), msg.title, msg.body, { url: msg.url, kind: 'daily' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
  if (result.dead.length) {
    await sb.from('push_tokens').update({ enabled: false }).in('token', result.dead);
  }
  return NextResponse.json({ ok: true, sent: result.sent, failed: result.failed, disabled: result.dead.length, day: msg.canChi });
}
