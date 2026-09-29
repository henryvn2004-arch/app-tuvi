// app/api/v1/laso-image/route.ts
// POST { birth } + Bearer → { url } — link ẢNH lưới 12 cung (/api/og/la-so-anh) đã
// ký HMAC, cho client không phải web (Zalo Mini App: xem, lưu về máy, chia sẻ).
// Ký ở server vì khoá chỉ server có (lib/og/laso-image.ts). Bắt đăng nhập: link ký
// cho người lạ là biến route ảnh thành máy vẽ lá số miễn phí — đúng thứ chữ ký chặn.
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { extractToken, getUserFromToken } from '@/lib/billing/credits';
import { lasoImageUrl } from '@/lib/og/laso-image';
import { currentNamXem } from '@/lib/engine/namxem';
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
  const url = lasoImageUrl(birth, currentNamXem());
  if (!url) return err('Thiếu ngày sinh hoặc giờ sinh để vẽ lá số', 400);
  return ok({ url });
}
