// app/api/mcp/key/route.ts
// ============================================================
// SELF-SERVE MCP KEY — endpoint cho WEB (đã đăng nhập).
//   GET    → key riêng hiện tại của user + URL connector (null nếu chưa có).
//   POST   → tạo key nếu chưa có (idempotent) → trả key + URL.
//   DELETE → thu hồi key hiện tại (tạo lại bằng POST khi cần).
//
// Auth: Bearer access_token Supabase (đúng pattern route liên kết kênh).
// ============================================================

import { NextRequest } from 'next/server';
import { CORS_HEADERS, options } from '@/lib/cors';
import { extractToken, getUserFromToken } from '@/lib/billing/credits';
import { getUserKey, createUserKey, revokeUserKeys } from '@/lib/mcp/userKey';

export const runtime = 'nodejs';

// Domain public phục vụ MCP (prod chạy trên www).
const MCP_BASE = 'https://www.tuviminhbao.com';
const urlOf = (key: string) => `${MCP_BASE}/mcp/${key}`;

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
  const key = await getUserKey(user.id);
  return json({ key, url: key ? urlOf(key) : null });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError('unauthorized', 'Cần đăng nhập', 401);
  const key = await createUserKey(user.id);
  if (!key) return jsonError('internal', 'Không tạo được key, thử lại sau', 500);
  return json({ key, url: urlOf(key) });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError('unauthorized', 'Cần đăng nhập', 401);
  const ok = await revokeUserKeys(user.id);
  return json({ ok });
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
