// lib/pdf/signed-link.ts
// Link GET ký HMAC, sống ngắn, để trình duyệt NHÚNG trong app (Zalo/FB…) mở được
// file PDF bằng ĐIỀU HƯỚNG — ở đó không gắn được header Authorization, còn blob
// URL thì WebView Android không tải được. Dùng chung cho /api/luan-giai/pdf và
// /api/reports/pdf; `scope` tách hai loại link để chữ ký loại này không mở loại kia.
import { createHmac, timingSafeEqual } from 'crypto';

export const PDF_LINK_TTL_SEC = 15 * 60;
const KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const pdfLinkReady = (): boolean => !!KEY;

function sign(scope: string, ref: string, uid: string, exp: number): string {
  return createHmac('sha256', KEY).update(`${scope}|${ref}|${uid}|${exp}`).digest('base64url');
}

/** Query string `s&u&e&k` cho một link sống PDF_LINK_TTL_SEC. */
export function signPdfQuery(scope: string, ref: string, uid: string): string {
  const exp = Math.floor(Date.now() / 1000) + PDF_LINK_TTL_SEC;
  return new URLSearchParams({ s: ref, u: uid, e: String(exp), k: sign(scope, ref, uid, exp) }).toString();
}

/** Kiểm link: trả {ref, uid} hợp lệ, hoặc chuỗi lỗi + mã HTTP. */
export function verifyPdfQuery(
  scope: string,
  p: URLSearchParams,
): { ref: string; uid: string } | { error: string; status: number } {
  const ref = p.get('s') || '';
  const uid = p.get('u') || '';
  const exp = Number(p.get('e') || 0);
  const sig = p.get('k') || '';
  if (!KEY || !ref || !uid || !exp || !sig) return { error: 'Link không hợp lệ.', status: 403 };
  const want = Buffer.from(sign(scope, ref, uid, exp));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { error: 'Link không hợp lệ.', status: 403 };
  if (exp < Date.now() / 1000) {
    return { error: 'Link đã hết hạn — quay lại trang kết quả và bấm Lưu PDF lần nữa.', status: 410 };
  }
  return { ref, uid };
}

export function pdfResponse(data: Buffer, filename: string): Response {
  return new Response(new Uint8Array(data), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${filename}"`,
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export function textResponse(msg: string, status: number): Response {
  return new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
