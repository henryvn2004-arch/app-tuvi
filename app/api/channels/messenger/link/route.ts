// app/api/channels/messenger/link/route.ts
// ============================================================
// LIÊN KẾT TÀI KHOẢN ↔ Facebook Messenger — endpoint cho WEB (đã đăng nhập).
//
//   GET    → trạng thái: đã link Messenger nào chưa? (cho UI hiển thị)
//   POST   → sinh token 1 lần + deep link m.me/<PAGE_ID>?ref=<token>.
//            Web mở link → Messenger gửi ref qua webhook → gắn ví.
//   DELETE → hủy liên kết (xóa map của user này).
//
// Cùng khuôn app/api/channels/whatsapp/link/route.ts (đổi nền tảng).
// Auth: Bearer access_token Supabase. Map qua SERVICE KEY (messengerLink).
// ============================================================

import { NextRequest } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import { extractToken, getUserFromToken } from '@/lib/billing/credits';
import {
  createLinkToken,
  getLinkedMessengerId,
  unlinkMessenger,
} from '@/lib/channels/messengerLink';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return options();
}

async function requireUser(request: NextRequest) {
  const token = extractToken(request);
  if (!token) return null;
  return getUserFromToken(token);
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError('unauthorized', 'Cần đăng nhập', 401);
  const messengerId = await getLinkedMessengerId(user.id);
  return json({ linked: !!messengerId, messenger_id: messengerId });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError('unauthorized', 'Cần đăng nhập', 401);
  const res = await createLinkToken(user.id);
  if (!res) return jsonError('internal', 'Không tạo được liên kết, thử lại sau', 500);
  return json(res); // { token, url }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError('unauthorized', 'Cần đăng nhập', 401);
  const okDel = await unlinkMessenger(user.id);
  return json({ ok: okDel });
}

// ── helpers ──────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
function jsonError(code: string, message: string, status: number) {
  return json({ code, message }, status);
}
