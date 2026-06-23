// lib/channels/meta.ts
// ============================================================
// TIỆN ÍCH CHUNG META GRAPH (Messenger + WhatsApp Cloud API — cùng nền Graph).
//
//   • verifyMetaSignature  — xác thực POST webhook bằng X-Hub-Signature-256
//                            (HMAC-SHA256 RAW body bằng App Secret).
//   • verifyWebhookChallenge — xác thực GET đăng ký webhook (hub.challenge).
//   • graphPost            — POST tới graph.facebook.com/<ver>/<path>.
//   • fetchGraphMedia      — tải media (đã có URL) → ChatImage base64.
//
// Trung lập kênh: Messenger/WhatsApp adapter import từ đây, không chép lại.
// ============================================================

import { createHmac, timingSafeEqual } from 'crypto';
import type { ChatImage } from '@/lib/contract/v1';

/** Phiên bản Graph API. Có thể override bằng env META_GRAPH_VERSION. */
export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const MEDIA_MAX = 5 * 1024 * 1024; // 5MB — chặn payload phình + chi phí

/**
 * Xác thực chữ ký webhook Meta: header `X-Hub-Signature-256: sha256=<hex>` là
 * HMAC-SHA256 của RAW body (chuỗi thô, KHÔNG parse lại) với App Secret.
 * So sánh hằng-thời-gian. Thiếu secret/sig → false (từ chối an toàn).
 */
export function verifyMetaSignature(appSecret: string, rawBody: string, header: string | null): boolean {
  if (!appSecret || !header) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Xác thực GET đăng ký webhook: Meta gọi với hub.mode=subscribe &
 * hub.verify_token=<token bạn đặt> & hub.challenge=<chuỗi>. Khớp token →
 * trả về challenge (echo) để hoàn tất đăng ký; sai → null.
 */
export function verifyWebhookChallenge(url: URL, verifyToken: string): string | null {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && verifyToken && token === verifyToken) return challenge || '';
  return null;
}

/** POST JSON tới Graph API. Trả Response (caller tự đọc nếu cần message_id). */
export async function graphPost(path: string, accessToken: string, body: unknown): Promise<Response | null> {
  if (!accessToken) return null;
  try {
    return await fetch(`${GRAPH_BASE}/${path}?access_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

/**
 * Tải media người dùng gửi → ChatImage {data(base64, KHÔNG tiền tố), mediaType}.
 * url: link tải trực tiếp (Messenger cung cấp sẵn; WhatsApp phải GET media-id
 * lấy url trước — xem whatsapp.ts). accessToken: chỉ cần cho host yêu cầu auth
 * (WhatsApp), Messenger CDN không cần. Giới hạn 5MB.
 */
export async function fetchGraphMedia(url: string, accessToken?: string): Promise<ChatImage | null> {
  if (!url) return null;
  try {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const r = await fetch(url, { headers });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > MEDIA_MAX) return null;
    const ct = (r.headers.get('content-type') || '').split(';')[0].trim();
    return { data: buf.toString('base64'), mediaType: normalizeImageType(ct) };
  } catch {
    return null;
  }
}

function normalizeImageType(ct: string): string {
  if (ct === 'image/png' || ct === 'image/webp' || ct === 'image/gif' || ct === 'image/jpeg') return ct;
  return 'image/jpeg';
}
