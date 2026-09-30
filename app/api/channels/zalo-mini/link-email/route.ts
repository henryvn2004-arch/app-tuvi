// app/api/channels/zalo-mini/link-email/route.ts
// Gộp tài khoản web ngay trong Zalo Mini App — cùng luồng email + mã 6 số của
// kênh chat (lib/channels/email-link.ts), chỉ khác chỗ nhập là màn hình app.
//   POST { email } → { status: 'sent' }        (có hay không có tài khoản đều 'sent')
//   POST { code }  → { merged: true, email }   Mini App đăng nhập lại để lấy phiên tài khoản web
// Bearer = phiên Mini App (tài khoản bóng). (kênh, external_id) là id Mini App
// trỏ về tài khoản đó trong `chat_links`.
import { NextRequest } from 'next/server';
import { ok, err, options, parseBody } from '@/lib/cors';
import { authUserFromRequest } from '@/lib/api/tool-helpers';
import { isShadowUser, maskEmail, parseEmail, startEmailLink, verifyEmailLink } from '@/lib/channels/email-link';
import { chatGetLinkedExternalId, chatLinkAndMerge } from '@/lib/channels/store';
import { ZALO_MINI_PLATFORM } from '@/lib/channels/zalo-mini';
import { ZALO_PLATFORM } from '@/lib/channels/zalo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return options();
}

export async function POST(request: NextRequest) {
  const auth = await authUserFromRequest(request);
  if ('error' in auth) return err(auth.error, auth.status);
  const shadow = auth.user.id;
  if (!(await isShadowUser(shadow))) return err('Tài khoản này đã là tài khoản web', 409);

  const miniId = await chatGetLinkedExternalId(ZALO_MINI_PLATFORM, shadow);
  if (!miniId) return err('Chưa tìm thấy tài khoản Zalo, mở lại Mini App', 409);

  const body = await parseBody(request);
  if (typeof body.email === 'string') {
    const email = parseEmail(body.email);
    if (!email) return err('Email chưa đúng dạng', 400);
    const r = await startEmailLink(ZALO_MINI_PLATFORM, miniId, email);
    if (r === 'limited') return err('Bạn đã xin mã nhiều lần rồi — thử lại sau khoảng một giờ', 429);
    if (r === 'error') return err('Chưa gửi được mã, thử lại sau giây lát', 503);
    return ok({ status: 'sent' });
  }

  const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : '';
  if (code.length !== 6) return err('Mã gồm 6 chữ số', 400);
  const r = await verifyEmailLink(ZALO_MINI_PLATFORM, miniId, code);
  if (!r.ok) {
    const msg =
      r.reason === 'wrong'
        ? `Mã chưa đúng — còn ${r.left} lần thử`
        : r.reason === 'locked'
          ? 'Nhập sai quá nhiều lần. Gửi lại email để lấy mã mới'
          : r.reason === 'expired'
            ? 'Mã đã hết hạn. Gửi lại email để lấy mã mới'
            : 'Chưa gộp được, thử lại sau giây lát';
    return err(msg, r.reason === 'error' ? 503 : 400);
  }

  // Tài khoản bóng này có thể dùng chung với cuộc chat OA (đăng nhập Mini App
  // gộp theo idByOA — lib/channels/zalo-mini.ts). Link OA còn trỏ về tài khoản
  // bóng thì lần đăng nhập sau `resolveMiniAppUser` kéo Mini App NGƯỢC về đó ⇒
  // trỏ luôn link OA sang tài khoản web.
  const oaId = await chatGetLinkedExternalId(ZALO_PLATFORM, shadow);
  if (oaId && !(await chatLinkAndMerge(ZALO_PLATFORM, oaId, r.userId))) {
    console.error('[zalo-mini/link-email] trỏ link OA sang tài khoản web lỗi', oaId);
  }
  return ok({ merged: true, email: maskEmail(r.email) });
}
