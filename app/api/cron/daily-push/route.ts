// app/api/cron/daily-push/route.ts
// Cron gửi push "Vận hôm nay" cho app NATIVE (FCM) — kênh riêng, KHÔNG đụng
// web-push cũ (/api/cron-push → edge send-daily-push → push_subscriptions).
// Đọc push_tokens, tính can chi ngày (deterministic, đúng nguồn với thẻ web),
// gửi FCM HTTP v1 bằng service account trong FIREBASE_SERVICE_ACCOUNT.
//
// Trơ nếu chưa cấu hình: thiếu FIREBASE_SERVICE_ACCOUNT hoặc 0 token → no-op.
// Bảo vệ: chỉ chạy khi Vercel cron (Authorization: Bearer CRON_SECRET) hoặc
// header x-vercel-cron. Xem _patches/migration-push-tokens.sql.
export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCronLog } from '@/lib/cron/log';
import { parseFirebaseServiceAccount, sendFcmPush } from '@/lib/channels/push';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || '';
const FIREBASE_SA = process.env.FIREBASE_SERVICE_ACCOUNT || '';

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

// Can chi ngày dương lịch (JDN, anchor Giáp Tý) — cùng công thức HoangDaoTool.
function dayCanChi(y: number, m: number, d: number): string {
  const a = Math.floor((14 - m) / 12), yr = y + 4800 - a, mn = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mn + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
  const diff = ((jdn - 2434290) % 60 + 600) % 60;
  return CAN[diff % 10] + ' ' + CHI[diff % 12];
}
function todayVN(): { y: number; m: number; d: number } {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const mm = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (mm) return { y: +mm[1], m: +mm[2], d: +mm[3] };
  const t = new Date();
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

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

  const t = todayVN();
  const cc = dayCanChi(t.y, t.m, t.d);
  const title = 'Vận hôm nay ☾';
  const body = `Ngày ${cc}. Chạm để xem giờ tốt và luận vận riêng cho bạn.`;

  let result: Awaited<ReturnType<typeof sendFcmPush>>;
  try {
    result = await sendFcmPush(sa, tokens.map((row) => (row as { token: string }).token), title, body, { url: '/app', kind: 'daily' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
  if (result.dead.length) {
    await sb.from('push_tokens').update({ enabled: false }).in('token', result.dead);
  }
  return NextResponse.json({ ok: true, sent: result.sent, failed: result.failed, disabled: result.dead.length, day: cc });
}
