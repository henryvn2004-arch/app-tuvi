// lib/channels/zalo.ts
// ============================================================
// Adapter ZALO OFFICIAL ACCOUNT ↔ "bộ não" (Contract v1) — VỎ MỎNG.
// Cài ChannelIO + SessionStore + ProfileStore cho core.runConversation.
// Gửi qua OA API v3 (tin tư vấn `message/cs`); phiên lưu generic
// (chat_sessions, platform='zalo-oa').
//
// Khác các kênh Meta ở HAI chỗ:
//   • Chữ ký webhook KHÔNG phải HMAC: header `X-ZEvent-Signature: mac=<hex>`
//     với mac = sha256(app_id + RAW body + timestamp + OA Secret Key).
//   • Access token sống ~25h và refresh token DÙNG MỘT LẦN (mỗi lần làm mới
//     Zalo trả cặp mới, vô hiệu cái cũ) → cặp token nằm ở bảng
//     `zalo_oa_tokens` (_patches/migration-zalo-oa.sql), không ở env.
//     Cron `/api/cron/zalo-token` làm mới mỗi ngày để refresh token (hạn ~3
//     tháng) không bao giờ chết vì OA vắng khách.
//
// Tin tư vấn chỉ gửi được trong khung 48h sau lần cuối người dùng nhắn OA —
// bot chỉ TRẢ LỜI nên luôn nằm trong khung.
// ============================================================

import { createHash, timingSafeEqual } from 'crypto';
import type { ChatMessage, BirthParams } from '@/lib/contract/v1';
import { fetchGraphMedia } from './meta';
import {
  splitText,
  type ChannelIO,
  type ChatButton,
  type SessionStore,
  type ProfileStore,
} from './core';
import { markdownToChat } from './format';
import {
  chatLoadSession,
  chatSaveSession,
  chatClearSession,
  chatListProfiles,
  chatGetProfile,
  chatSaveProfile,
} from './store';

export const ZALO_PLATFORM = 'zalo-oa';
const APP_ID = process.env.ZALO_APP_ID || '';
const APP_SECRET = process.env.ZALO_APP_SECRET || '';
const OA_SECRET_KEY = process.env.ZALO_OA_SECRET_KEY || '';
const MSG_LIMIT = 2000; // giới hạn 1 tin văn bản Zalo OA
const MAX_IMAGES = 3; // khớp MAX_IMAGES_PER_MSG trong runAgent

const SEND_URL = 'https://openapi.zalo.me/v3.0/oa/message/cs';
const TOKEN_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';
const EXPIRY_SKEW_MS = 5 * 60_000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

/** Đủ env để chạy kênh (dashboard "Sức khỏe kênh" đọc cờ này). */
export const zaloConfigured = () => !!(APP_ID && APP_SECRET && OA_SECRET_KEY);

// ── Chữ ký webhook ──────────────────────────────────────────
/**
 * mac = sha256(app_id + rawBody + timestamp + OA Secret Key), header dạng
 * `mac=<hex>`. app_id/timestamp lấy từ CHÍNH body (đã parse), rawBody là chuỗi
 * thô chưa parse lại. Thiếu secret/sig/app_id lệch → false (từ chối an toàn).
 */
export function verifyZaloSignature(rawBody: string, header: string | null): boolean {
  if (!OA_SECRET_KEY || !APP_ID || !header) return false;
  let body: { app_id?: unknown; timestamp?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return false;
  }
  if (String(body.app_id ?? '') !== APP_ID || body.timestamp == null) return false;
  const expected = createHash('sha256')
    .update(APP_ID + rawBody + String(body.timestamp) + OA_SECRET_KEY, 'utf8')
    .digest('hex');
  const got = header.trim().replace(/^mac=/, '').toLowerCase();
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Token OA (bảng zalo_oa_tokens, 1 dòng) ──────────────────
interface TokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function readTokenRow(): Promise<TokenRow | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/zalo_oa_tokens?id=eq.1&select=access_token,refresh_token,expires_at&limit=1`,
      { cache: 'no-store', headers: SB_HEADERS },
    );
    if (!res.ok) {
      console.error('[zalo] đọc zalo_oa_tokens lỗi', res.status, await res.text().catch(() => ''));
      return null;
    }
    const rows = (await res.json()) as TokenRow[];
    return rows[0] || null;
  } catch (e) {
    console.error('[zalo] đọc zalo_oa_tokens lỗi', e);
    return null;
  }
}

/**
 * Đổi refresh token lấy cặp mới rồi ghi lại. Trả access token mới, hoặc null.
 *
 * Hai lượt cùng làm mới một lúc (cron + webhook) thì lượt thua bị Zalo từ chối
 * vì refresh token đã bị lượt thắng tiêu → đọc lại bảng: dòng đã đổi nghĩa là
 * lượt kia xong, dùng token của nó.
 */
export async function refreshZaloToken(): Promise<string | null> {
  const row = await readTokenRow();
  if (!row) {
    console.error('[zalo] chưa có dòng zalo_oa_tokens — nạp cặp token đầu tiên (xem _patches/migration-zalo-oa.sql)');
    return null;
  }
  if (!APP_ID || !APP_SECRET) {
    console.error('[zalo] thiếu ZALO_APP_ID/ZALO_APP_SECRET — không làm mới được token');
    return null;
  }
  let data: { access_token?: string; refresh_token?: string; expires_in?: string | number; error?: number; error_name?: string; error_description?: string };
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: APP_SECRET },
      body: new URLSearchParams({ refresh_token: row.refresh_token, app_id: APP_ID, grant_type: 'refresh_token' }),
    });
    data = await res.json();
  } catch (e) {
    console.error('[zalo] gọi làm mới token lỗi mạng', e);
    return null;
  }
  const expiresIn = Number(data.expires_in);
  if (!data.access_token || !data.refresh_token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    const again = await readTokenRow();
    if (again && again.refresh_token !== row.refresh_token) return again.access_token;
    console.error('[zalo] làm mới token THẤT BẠI', data.error, data.error_name, data.error_description);
    return null;
  }
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/zalo_oa_tokens?id=eq.1`, {
      method: 'PATCH',
      headers: SB_HEADERS,
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  } catch (e) {
    // Refresh token cũ đã bị Zalo tiêu, cái mới chỉ còn nằm trong bộ nhớ. Không
    // in token ra log (log là nơi lộ bí mật); đường cứu là cấp lại cặp token từ
    // API Explorer rồi chạy lại câu INSERT trong migration.
    console.error('[zalo] ĐÃ làm mới nhưng KHÔNG ghi được token — phải cấp lại từ API Explorer:', e);
  }
  return next.access_token;
}

async function getAccessToken(): Promise<string | null> {
  const row = await readTokenRow();
  if (row && Date.parse(row.expires_at) - EXPIRY_SKEW_MS > Date.now()) return row.access_token;
  return refreshZaloToken();
}

// ── Gửi tin ─────────────────────────────────────────────────
// Mã lỗi Zalo cho token hết hạn/không hợp lệ → làm mới một lần rồi gửi lại.
const TOKEN_ERRORS = new Set([-216, -124]);

async function postMessage(userId: string, message: Record<string, unknown>): Promise<void> {
  let token = await getAccessToken();
  for (let attempt = 0; token && attempt < 2; attempt++) {
    try {
      const res = await fetch(SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: token },
        body: JSON.stringify({ recipient: { user_id: userId }, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: number; message?: string };
      if (data.error === 0) return;
      if (attempt === 0 && TOKEN_ERRORS.has(Number(data.error))) {
        token = await refreshZaloToken();
        continue;
      }
      console.error('[zalo] gửi tin lỗi', res.status, data.error, data.message);
      return;
    } catch (e) {
      console.error('[zalo] gửi tin lỗi mạng', e);
      return;
    }
  }
}

/** Gửi 1 tin văn bản (tự cắt nếu > giới hạn). */
export async function zaloSendText(userId: string, text: string): Promise<void> {
  for (const chunk of splitText(text || '…', MSG_LIMIT)) {
    await postMessage(userId, { text: chunk });
  }
}

/** Số nút tối đa mỗi tin tư vấn (Zalo không ghi rõ trần — giữ gọn 5). */
const MAX_BUTTONS = 5;

/**
 * Tin tư vấn kèm nút: `oa.open.url` mở link ngay trong Zalo, `oa.query.show`
 * gửi lại chữ soạn sẵn thành tin của người dùng (webhook nhận như tin gõ tay).
 * Chữ dài hơn trần 1 tin → gửi phần đầu thành tin thường, nút gắn vào đoạn cuối.
 */
export async function zaloSendButtons(userId: string, text: string, buttons: ChatButton[]): Promise<void> {
  const parts = splitText(text || '…', MSG_LIMIT);
  for (const p of parts.slice(0, -1)) await postMessage(userId, { text: p });
  await postMessage(userId, {
    text: parts[parts.length - 1],
    attachment: {
      type: 'template',
      payload: {
        buttons: buttons.slice(0, MAX_BUTTONS).map((b) =>
          'url' in b
            ? { title: b.title.slice(0, 100), type: 'oa.open.url', payload: { url: b.url } }
            : { title: b.title.slice(0, 100), type: 'oa.query.show', payload: b.reply.slice(0, 1000) },
        ),
      },
    },
  });
}

/** Tin tư vấn đính kèm ảnh (theo URL công khai). */
export async function zaloSendImage(userId: string, url: string, caption?: string): Promise<void> {
  await postMessage(userId, {
    ...(caption ? { text: caption.slice(0, MSG_LIMIT) } : {}),
    attachment: {
      type: 'template',
      payload: { template_type: 'media', elements: [{ media_type: 'image', url }] },
    },
  });
}

// ── ChannelIO (Zalo không sửa được tin, không có API "đang soạn") ──
export const zaloIO: ChannelIO = {
  platform: ZALO_PLATFORM,
  msgLimit: MSG_LIMIT,
  maxImages: MAX_IMAGES,
  typing: async () => {},
  sendText: (chatId, text) => zaloSendText(String(chatId), text),
  sendProgress: async (chatId, text) => {
    await zaloSendText(String(chatId), text);
    return null; // không edit được → core gửi câu trả lời thành tin mới
  },
  editText: async () => {},
  fetchImage: (ref) => fetchGraphMedia(ref), // ref = URL CDN Zalo cấp sẵn, không cần token
  sendButtons: (chatId, text, buttons) => zaloSendButtons(String(chatId), text, buttons),
  sendImage: (chatId, url, caption) => zaloSendImage(String(chatId), url, caption),
  format: (t) => markdownToChat(t), // Zalo hiện chữ thô — ** và ## lộ nguyên
};

// ── SessionStore / ProfileStore (generic, platform='zalo-oa') ──
export const zaloStore: SessionStore = {
  load: (chatId) => chatLoadSession(ZALO_PLATFORM, chatId),
  save: (chatId, messages: ChatMessage[], birth: BirthParams | null) =>
    chatSaveSession(ZALO_PLATFORM, chatId, messages, birth),
};

export const zaloClearSession = (userId: string) => chatClearSession(ZALO_PLATFORM, userId);

export const zaloProfiles: ProfileStore = {
  list: (chatId) => chatListProfiles(ZALO_PLATFORM, chatId),
  get: (chatId, name) => chatGetProfile(ZALO_PLATFORM, chatId, name),
  save: (chatId, name, birth) => chatSaveProfile(ZALO_PLATFORM, chatId, name, birth),
};
