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
import { createSign } from 'crypto';

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

// ── FCM HTTP v1: JWT (RS256) → OAuth token → messages:send ──
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function fcmAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  const signed = createSign('RSA-SHA256').update(header + '.' + claim).sign(sa.private_key);
  const jwt = header + '.' + claim + '.' + b64url(signed);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('OAuth token failed: ' + JSON.stringify(j));
  return j.access_token as string;
}

export async function GET(request: NextRequest) {
  // Chỉ cho cron (Vercel gắn Authorization: Bearer CRON_SECRET) hoặc header cron.
  const auth = request.headers.get('authorization') || '';
  const isVercelCron = request.headers.get('x-vercel-cron') != null;
  if (CRON_SECRET && auth !== 'Bearer ' + CRON_SECRET && !isVercelCron) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!FIREBASE_SA) return NextResponse.json({ ok: true, skipped: 'no FIREBASE_SERVICE_ACCOUNT' });

  let sa: { client_email: string; private_key: string; project_id: string };
  try {
    sa = JSON.parse(FIREBASE_SA);
    if (!sa.client_email || !sa.private_key || !sa.project_id) throw new Error('missing fields');
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

  let accessToken: string;
  try { accessToken = await fcmAccessToken(sa); }
  catch (e) { return NextResponse.json({ ok: false, error: String(e) }, { status: 500 }); }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  let sent = 0, failed = 0;
  const dead: string[] = [];
  for (const row of tokens) {
    const token = (row as { token: string }).token;
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: { url: '/app', kind: 'daily' },
            android: { priority: 'high', notification: { sound: 'default' } },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
      });
      if (r.ok) { sent++; }
      else {
        failed++;
        // Token chết (app gỡ) → tắt để lần sau bỏ qua.
        if (r.status === 404 || r.status === 400) dead.push(token);
      }
    } catch { failed++; }
  }
  if (dead.length) {
    await sb.from('push_tokens').update({ enabled: false }).in('token', dead);
  }
  return NextResponse.json({ ok: true, sent, failed, disabled: dead.length, day: cc });
}
