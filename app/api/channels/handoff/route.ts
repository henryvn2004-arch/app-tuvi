// app/api/channels/handoff/route.ts
// POST { token } — tiêu link một lần chat → web, trả mã đăng nhập một lần
// (trình duyệt tự đổi lấy phiên) + trang đích + lá số (lib/channels/handoff.ts).
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { redeemHandoff } from '@/lib/channels/handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const b = (await parseBody(request)) as Record<string, unknown>;
  const r = await redeemHandoff(String(b.token || ''));
  if (!r) return err('Link đã hết hạn hoặc đã dùng', 410);
  return ok({ tokenHash: r.tokenHash, next: r.next, birth: r.birth });
}
