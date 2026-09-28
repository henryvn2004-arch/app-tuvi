// app/api/channels/zalo/link/route.ts
// ============================================================
// LIÊN KẾT TÀI KHOẢN ↔ Zalo OA — endpoint cho WEB (đã đăng nhập).
//
//   GET    → trạng thái: đã link Zalo nào chưa? + `available` (kênh đã cấu
//            hình chưa — web ẩn thẻ Zalo khi false, tránh mời liên kết một
//            OA chưa trả lời).
//   POST   → sinh mã 1 lần + link mở OA. Người dùng nhắn "/link <mã>" cho OA.
//   DELETE → hủy liên kết.
//
// Cùng khuôn app/api/channels/messenger/link/route.ts (đổi nền tảng).
// ============================================================

import { NextRequest } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import { extractToken, getUserFromToken } from '@/lib/billing/credits';
import { createLinkToken, getLinkedZaloId, unlinkZalo } from '@/lib/channels/zaloLink';
import { zaloConfigured } from '@/lib/channels/zalo';

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
  const zaloId = await getLinkedZaloId(user.id);
  return json({ available: zaloConfigured(), linked: !!zaloId, zalo_id: zaloId });
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
  const okDel = await unlinkZalo(user.id);
  return json({ ok: okDel });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
function jsonError(code: string, message: string, status: number) {
  return json({ code, message }, status);
}
