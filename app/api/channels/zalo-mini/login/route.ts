// app/api/channels/zalo-mini/login/route.ts
// Đăng nhập Zalo Mini App (lib/channels/zalo-mini.ts).
//   POST { accessToken, idByOA? } → { tokenHash, viaOA }
//   Mini App tự đổi `tokenHash` lấy phiên: POST <SUPABASE_URL>/auth/v1/verify
//   { type:'magiclink', token_hash } — rồi gọi mọi API web bằng Bearer như thường.
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { mintLoginHash } from '@/lib/channels/handoff';
import { resolveMiniAppUser, verifyMiniAppToken, zaloMiniConfigured } from '@/lib/channels/zalo-mini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  if (!zaloMiniConfigured()) return err('Zalo Mini App chưa được cấu hình', 501);
  const body = await parseBody(request);
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
  if (!accessToken) return err('Thiếu accessToken', 400);

  const me = await verifyMiniAppToken(accessToken);
  // Kèm mã lỗi Zalo (không nhạy cảm) để chẩn đoán từ ảnh chụp màn hình người dùng gửi.
  if ('error' in me) return err(`Phiên Zalo không hợp lệ (${me.error}), mở lại Mini App`, 401);

  const acc = await resolveMiniAppUser(me.id, body.idByOA);
  if (!acc) return err('Chưa tạo được tài khoản, thử lại sau giây lát', 503);

  const tokenHash = await mintLoginHash(acc.userId);
  if (!tokenHash) return err('Chưa đăng nhập được, thử lại sau giây lát', 503);
  return ok({ tokenHash, viaOA: acc.viaOA });
}
