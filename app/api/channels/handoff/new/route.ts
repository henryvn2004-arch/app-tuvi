// app/api/channels/handoff/new/route.ts
// POST { next, birth? } + Bearer — link một lần mở trang web ĐÃ đăng nhập đúng
// tài khoản này (cùng cơ chế nút "mở web" của kênh chat, lib/channels/handoff.ts).
// Zalo Mini App dùng để mở các công cụ chưa có bản trong app: webview của Zalo
// không chung phiên với Mini App, thiếu bước này là người dùng phải đăng nhập lại.
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { extractToken, getUserFromToken } from '@/lib/billing/credits';
import { createHandoffUrl } from '@/lib/channels/handoff';
import type { BirthParams } from '@/lib/contract/v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(extractToken(request));
  if (!user) return err('Cần đăng nhập', 401);
  const body = await parseBody(request);
  const birth = body.birth && typeof body.birth === 'object' ? (body.birth as BirthParams) : null;
  // `createHandoffUrl` tự lọc `next` (chỉ đường dẫn nội bộ) và chỉ giữ birth dương lịch hợp lệ.
  const url = await createHandoffUrl(user.id, String(body.next || '/app'), birth);
  if (!url) return err('Chưa mở được trang, thử lại sau giây lát', 503);
  return ok({ url });
}
