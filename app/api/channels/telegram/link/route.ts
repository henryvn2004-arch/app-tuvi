// app/api/channels/telegram/link/route.ts
// ============================================================
// LIÊN KẾT TÀI KHOẢN ↔ TELEGRAM — endpoint cho WEB (đã đăng nhập).
//
//   GET    → trạng thái: đã link Telegram nào chưa? (cho UI hiển thị)
//   POST   → sinh token 1 lần + deep link t.me/<bot>?start=<token>.
//            Web mở link → bot nhận /start <token> → gắn ví.
//   DELETE → hủy liên kết (xóa map của user này).
//
// Auth: Bearer access_token Supabase (đúng pattern lib/billing/credits).
// Sinh/đọc map qua SERVICE KEY (lib/channels/telegramLink).
// ============================================================

import { NextRequest } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import { extractToken, getUserFromToken } from '@/lib/billing/credits';
import {
  createLinkToken,
  getLinkedTelegramId,
  unlinkTelegram,
} from '@/lib/channels/telegramLink';

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
  const telegramUserId = await getLinkedTelegramId(user.id);
  return json({ linked: !!telegramUserId, telegram_user_id: telegramUserId });
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
  const okDel = await unlinkTelegram(user.id);
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
