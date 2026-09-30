// lib/channels/zalo-mini.ts
// ============================================================
// ĐĂNG NHẬP ZALO MINI APP → phiên Supabase (cùng tài khoản với web/OA).
//
// Luồng (app/api/channels/zalo-mini/login):
//   1. Mini App gọi `getAccessToken()` (zmp-sdk) rồi POST token lên server.
//   2. Server hỏi Zalo `/v2.0/me` kèm `appsecret_proof` = HMAC-SHA256(token,
//      app secret) ⇒ biết CHẮC id người dùng theo app (không tin id client khai).
//   3. Chọn tài khoản:
//      • Đã có map `zalo-mini` → dùng luôn.
//      • Client gửi `idByOA` (getUserInfo) VÀ server kiểm được id đó đúng là
//        của người này (API OA trả `user_id_by_app` khớp id ở bước 2) ⇒ dùng
//        tài khoản của kênh OA (`zalo-oa`, tạo nếu chưa có) — một người, một ví.
//        Kiểm hụt/không khớp ⇒ KHÔNG gộp (fail-closed): tin `idByOA` trần là
//        cho phép ai cũng nhận ví OA của người khác.
//      • Còn lại → tài khoản bóng riêng `zalo-mini` (lib/channels/account.ts).
//   4. `mintLoginHash` → Mini App tự đổi ở Supabase `/auth/v1/verify` lấy phiên
//      (đổi ở client — Supabase giới hạn /verify THEO IP, xem handoff.ts).
// ============================================================

import { createHmac } from 'crypto';
import { ensureChatUser } from './account';
import { chatLinkAndMerge, chatResolveLinkedUser } from './store';
import { ZALO_PLATFORM, getAccessToken as zaloOaToken } from './zalo';

export const ZALO_MINI_PLATFORM = 'zalo-mini';

// Mini App thuộc một Zalo App; nếu khác app của OA thì đặt secret riêng.
const APP_SECRET = process.env.ZALO_MINI_APP_SECRET || process.env.ZALO_APP_SECRET || '';

// CHỈ `id`: token lấy không hỏi người dùng (zmp-sdk ≥2.35) chỉ đọc được id.
// ⚠️ Zalo trả `-501` ("IP address not inside Vietnam") cho MỌI lượt đọc thông tin
// người dùng từ IP ngoài VN — Vercel chạy ở Mỹ ⇒ đi qua trạm Caddy trên VPS VN
// (scripts/zalo-relay-setup.sh): ZALO_GRAPH_RELAY_URL + ZALO_GRAPH_RELAY_KEY.
const GRAPH_BASE = process.env.ZALO_GRAPH_RELAY_URL || 'https://graph.zalo.me';
const RELAY_KEY = process.env.ZALO_GRAPH_RELAY_KEY || '';
const ME_URL = `${GRAPH_BASE.replace(/\/+$/, '')}/v2.0/me?fields=id`;
const OA_USER_URL = 'https://openapi.zalo.me/v3.0/oa/user/detail';

export const zaloMiniConfigured = () => !!APP_SECRET;

/** id Zalo chỉ gồm chữ số — chặn chuỗi lạ chui vào khoá/email tổng hợp. */
const isZaloId = (s: unknown): s is string => typeof s === 'string' && /^\d{5,32}$/.test(s);

/** Token Mini App → id người dùng theo app (đã Zalo xác nhận), hoặc `{ error }` kèm mã lỗi Zalo. */
export async function verifyMiniAppToken(accessToken: string): Promise<{ id: string } | { error: string }> {
  if (!APP_SECRET || !accessToken) return { error: 'thiếu token' };
  const proof = createHmac('sha256', APP_SECRET).update(accessToken).digest('hex');
  try {
    // Token + proof đi QUERY, không đi header: header `access_token` (có gạch dưới)
    // bị rơi khi qua trạm Caddy ⇒ Zalo trả 100 "Invalid parameter access_token".
    // Gọi thẳng graph.zalo.me thì hai cách như nhau (đã đo: cùng ra 452 với token giả).
    const qs = `&access_token=${encodeURIComponent(accessToken)}&appsecret_proof=${proof}`;
    const res = await fetch(ME_URL + qs, {
      headers: RELAY_KEY ? { 'X-Relay-Key': RELAY_KEY } : {},
      cache: 'no-store',
    });
    const d = (await res.json().catch(() => ({}))) as { id?: string; error?: number; message?: string };
    if (d.error || !isZaloId(d.id)) {
      console.error('[zalo-mini] /me từ chối token', d.error, d.message);
      return { error: d.error ? `Zalo ${d.error}` : res.ok ? 'Zalo không trả id' : `trạm HTTP ${res.status}` };
    }
    return { id: d.id };
  } catch (e) {
    console.error('[zalo-mini] /me lỗi mạng', e);
    return { error: 'lỗi mạng tới Zalo' };
  }
}

/** `idByOA` client khai có đúng là của người mang id-app `appUserId` không. */
async function oaIdBelongsTo(idByOA: string, appUserId: string): Promise<boolean> {
  const token = await zaloOaToken();
  if (!token) return false;
  try {
    const url = `${OA_USER_URL}?data=${encodeURIComponent(JSON.stringify({ user_id: idByOA }))}`;
    const res = await fetch(url, { headers: { access_token: token }, cache: 'no-store' });
    const d = (await res.json().catch(() => ({}))) as {
      error?: number;
      message?: string;
      data?: { user_id?: string; user_id_by_app?: string };
    };
    if (d.error) {
      console.error('[zalo-mini] tra người dùng OA lỗi', d.error, d.message);
      return false;
    }
    const byApp = d.data?.user_id_by_app;
    if (!byApp) console.error('[zalo-mini] API OA không trả user_id_by_app — không gộp được với tài khoản OA');
    return !!byApp && byApp === appUserId && d.data?.user_id === idByOA;
  } catch (e) {
    console.error('[zalo-mini] tra người dùng OA lỗi mạng', e);
    return false;
  }
}

/**
 * Tài khoản Supabase cho người dùng Mini App (đã xác thực `appUserId`).
 * `idByOA` là gợi ý của client — chỉ dùng khi server kiểm khớp. null khi lỗi.
 */
export async function resolveMiniAppUser(
  appUserId: string,
  idByOA: unknown,
): Promise<{ userId: string; viaOA: boolean } | null> {
  const linked = await chatResolveLinkedUser(ZALO_MINI_PLATFORM, appUserId);

  if (isZaloId(idByOA) && (await oaIdBelongsTo(idByOA, appUserId))) {
    const oaUser = await ensureChatUser(ZALO_PLATFORM, idByOA);
    if (oaUser) {
      if (linked === oaUser) return { userId: oaUser, viaOA: true };
      // Trỏ id Mini App về tài khoản OA; tài khoản bóng `zalo-mini` cũ (nếu có,
      // do đăng nhập trước khi quan tâm OA) được gộp ví + sổ lá số vào.
      if (await chatLinkAndMerge(ZALO_MINI_PLATFORM, appUserId, oaUser)) return { userId: oaUser, viaOA: true };
    }
  }

  if (linked) return { userId: linked, viaOA: false };
  const own = await ensureChatUser(ZALO_MINI_PLATFORM, appUserId);
  return own ? { userId: own, viaOA: false } : null;
}
