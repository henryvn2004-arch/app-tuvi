// app/api/channels/login/route.ts
// Đăng nhập web bằng tin nhắn (lib/channels/login.ts).
//   POST            → { code, pollKey, expiresIn, channels[] }
//   GET ?poll=<key> → { status:'pending'|'expired' } | { status:'ok', tokenHash }
//                     (trình duyệt tự đổi tokenHash lấy phiên — lib/channels/handoff)
import { NextRequest } from 'next/server';
import { ok, err, options } from '@/lib/cors';
import { createLoginCode, takeLoginSession } from '@/lib/channels/login';
import { chatHomes } from '@/lib/channels/chat-home';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return options();
}

export async function POST() {
  const c = await createLoginCode();
  if (!c) return err('Chưa tạo được mã, thử lại sau giây lát', 503);
  return ok({ ...c, channels: chatHomes(c.code) });
}

export async function GET(request: NextRequest) {
  const poll = new URL(request.url).searchParams.get('poll') || '';
  const r = await takeLoginSession(poll);
  if (r.status !== 'ok') return ok({ status: r.status });
  return ok({ status: 'ok', tokenHash: r.tokenHash });
}
