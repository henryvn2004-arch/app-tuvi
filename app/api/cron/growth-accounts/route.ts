// app/api/cron/growth-accounts/route.ts
// Tuần một lần: (1) nạp nền tảng mới vào sổ Tài Khoản & Entity, (2) ghé lại
// hồ sơ đã đăng ký xem còn sống không. Nguồn logic: lib/growth/accounts.ts.
//
// Bước (2) là thứ giữ cho JSON-LD `sameAs` khỏi trỏ vào trang 404 — schema
// sinh thẳng từ bảng này, không kiểm thì hỏng im lặng.
//
// KHÔNG tự đăng ký tài khoản ở đâu. Đăng ký là việc tay.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { withCronLog } from '@/lib/cron/log';
import { runGrowthAccounts, formatAccountsReport } from '@/lib/growth/accounts';
import { tgSendMessage } from '@/lib/channels/telegram';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TG_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';

export async function GET(request: NextRequest) {
  return withCronLog('growth-accounts', 'vercel', () => handle(request));
}

async function handle(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  if (!CRON_SECRET || auth !== 'Bearer ' + CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const r = await runGrowthAccounts();

  // Im lặng khi không có gì mới và không hồ sơ nào chết — bản tin tuần nào
  // cũng "vẫn ổn" thì hôm hỏng thật cũng bị lướt qua.
  const msg = formatAccountsReport(r);
  if (TG_CHAT_ID && msg) await tgSendMessage(TG_CHAT_ID, msg);

  return NextResponse.json({ ok: true, ...r });
}
