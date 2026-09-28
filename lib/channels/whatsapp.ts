// lib/channels/whatsapp.ts
// ============================================================
// Adapter WHATSAPP CLOUD API ↔ "bộ não" (Contract v1) — VỎ MỎNG.
// Cài ChannelIO + SessionStore cho lib/channels/core.runConversation.
//
// Lưu ý WhatsApp:
//   • Trả lời FREE-FORM chỉ trong CỬA SỔ 24h kể từ tin user (đủ cho bot trả
//     lời tin đến). Ngoài 24h phải dùng template duyệt trước → không lo ở đây.
//   • Không có "typing…" tổng quát → typing = no-op.
//   • Ảnh: user gửi media-id → GET media-id lấy url → tải url KÈM bearer token.
// ============================================================

import type { ChatImage, ChatMessage, BirthParams } from '@/lib/contract/v1';
import { GRAPH_BASE, graphPost, fetchGraphMedia } from './meta';
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

const PLATFORM = 'whatsapp';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WA_TOKEN = process.env.WHATSAPP_TOKEN || '';
const MSG_LIMIT = 4096; // giới hạn body text WhatsApp
const MAX_IMAGES = 3;

// ── Send API ────────────────────────────────────────────────
/** Gửi 1 tin văn bản (tự cắt nếu > giới hạn). Trả `true` chỉ khi Meta nhận
 *  ĐỦ mọi đoạn (không throw — cảnh báo admin dùng chung hàm này). */
export async function waSendText(to: string, text: string): Promise<boolean> {
  if (!PHONE_NUMBER_ID || !WA_TOKEN) return false;
  for (const chunk of splitText(text || '…', MSG_LIMIT)) {
    const res = await graphPost(`${PHONE_NUMBER_ID}/messages`, WA_TOKEN, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: chunk, preview_url: false },
    });
    if (!res?.ok) {
      console.error('[whatsapp] gửi tin lỗi', res?.status ?? 'network', await res?.text().catch(() => ''));
      return false;
    }
  }
  return true;
}

// Gửi cho luồng hội thoại: hỏng thì NÉM LỖI để core không gọi LLM / không chốt
// phí khi người dùng không nhận được gì.
async function waSendOrThrow(to: string, text: string): Promise<void> {
  if (!(await waSendText(to, text))) throw new Error('[whatsapp] gửi tin thất bại');
}

// ── Tải ảnh: media-id → url → bytes (base64) ────────────────
// Giới hạn tin tương tác của WhatsApp Cloud API.
const BODY_MAX = 1024;
const REPLY_BUTTONS_MAX = 3;
const BUTTON_TITLE_MAX = 20;
const LIST_ROWS_MAX = 10;
const ROW_TITLE_MAX = 24;
const ROW_DESC_MAX = 72;
const ID_MAX = 256;

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

async function waPost(payload: Record<string, unknown>): Promise<void> {
  if (!PHONE_NUMBER_ID || !WA_TOKEN) return;
  await graphPost(`${PHONE_NUMBER_ID}/messages`, WA_TOKEN, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    ...payload,
  });
}

/**
 * Link → tin `cta_url` (WhatsApp cho đúng MỘT nút link mỗi tin). Câu soạn sẵn
 * → nút trả lời (≤3, nhãn ≤20) hoặc danh sách (≤10 dòng, mô tả ≤72) khi nhiều
 * hơn/dài hơn. Bấm = webhook nhận `interactive.*_reply.id` = chính câu đó.
 */
export async function waSendButtons(to: string, text: string, buttons: ChatButton[]): Promise<void> {
  const urls = buttons.filter((b): b is { title: string; url: string } => 'url' in b);
  const replies = buttons.filter((b): b is { title: string; reply: string } => 'reply' in b);

  let body = text || '…';
  if (body.length > BODY_MAX) {
    await waSendText(to, body);
    body = '👇';
  }

  for (const u of urls) {
    await waPost({
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: body },
        action: { name: 'cta_url', parameters: { display_text: short(u.title, BUTTON_TITLE_MAX), url: u.url } },
      },
    });
    body = '👇';
  }
  if (!replies.length) return;

  const fitsButtons =
    replies.length <= REPLY_BUTTONS_MAX && replies.every((r) => r.title.length <= BUTTON_TITLE_MAX);
  if (fitsButtons) {
    await waPost({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: urls.length ? 'Hoặc chọn nhanh:' : body },
        action: {
          buttons: replies.map((r) => ({ type: 'reply', reply: { id: r.reply.slice(0, ID_MAX), title: r.title } })),
        },
      },
    });
    return;
  }
  await waPost({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: urls.length ? 'Hoặc chọn nhanh:' : body },
      action: {
        button: 'Chọn',
        sections: [
          {
            rows: replies.slice(0, LIST_ROWS_MAX).map((r) => ({
              id: r.reply.slice(0, ID_MAX),
              title: short(r.title, ROW_TITLE_MAX),
              ...(r.title.length > ROW_TITLE_MAX ? { description: short(r.title, ROW_DESC_MAX) } : {}),
            })),
          },
        ],
      },
    },
  });
}

/** Gửi ảnh theo URL công khai. */
export async function waSendImage(to: string, url: string, caption?: string): Promise<void> {
  await waPost({ to, type: 'image', image: { link: url, ...(caption ? { caption: caption.slice(0, BODY_MAX) } : {}) } });
}

/**
 * Gửi file (PDF): tải lên `<phone-id>/media` lấy media id rồi gửi tin
 * `document` — không cần URL công khai. Hỏng thì NÉM LỖI.
 */
export async function waSendFile(to: string, data: Buffer, filename: string, caption?: string): Promise<void> {
  if (!PHONE_NUMBER_ID || !WA_TOKEN) throw new Error('[whatsapp] chưa cấu hình');
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([new Uint8Array(data)], { type: 'application/pdf' }), filename);
  const up = await fetch(`${GRAPH_BASE}/${PHONE_NUMBER_ID}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
    body: form,
  });
  const j = (await up.json().catch(() => ({}))) as { id?: string };
  if (!up.ok || !j.id) throw new Error(`[whatsapp] tải file lỗi HTTP ${up.status}`);
  const res = await graphPost(`${PHONE_NUMBER_ID}/messages`, WA_TOKEN, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'document',
    document: { id: j.id, filename, ...(caption ? { caption: caption.slice(0, BODY_MAX) } : {}) },
  });
  if (!res?.ok) throw new Error(`[whatsapp] gửi file lỗi HTTP ${res?.status ?? 'mạng'}`);
}

async function waFetchImage(mediaId: string): Promise<ChatImage | null> {
  if (!WA_TOKEN || !mediaId) return null;
  try {
    // Bước 1: GET media-id → { url, mime_type }
    const r = await fetch(`${GRAPH_BASE}/${encodeURIComponent(mediaId)}?access_token=${encodeURIComponent(WA_TOKEN)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { url?: string };
    if (!j?.url) return null;
    // Bước 2: tải url KÈM bearer token (host Meta yêu cầu auth).
    return await fetchGraphMedia(j.url, WA_TOKEN);
  } catch {
    return null;
  }
}

// ── ChannelIO (WhatsApp không sửa tin & không typing → giống Messenger) ──
export const whatsappIO: ChannelIO = {
  platform: PLATFORM,
  msgLimit: MSG_LIMIT,
  maxImages: MAX_IMAGES,
  typing: async () => {}, // WhatsApp Cloud API không có typing tổng quát
  sendText: (chatId, text) => waSendOrThrow(String(chatId), text),
  sendProgress: async (chatId, text) => {
    await waSendOrThrow(String(chatId), text);
    return null; // không edit được → tin tiến trình gửi 1 lần
  },
  editText: async () => {},
  fetchImage: (ref) => waFetchImage(ref),
  sendButtons: (chatId, text, buttons) => waSendButtons(String(chatId), text, buttons),
  sendImage: (chatId, url, caption) => waSendImage(String(chatId), url, caption),
  sendFile: (chatId, data, filename, caption) => waSendFile(String(chatId), data, filename, caption),
  format: (t) => markdownToChat(t, '*'), // WhatsApp đậm bằng *một* sao
};

// ── SessionStore (generic, platform='whatsapp') ─────────────
export const whatsappStore: SessionStore = {
  load: (chatId) => chatLoadSession(PLATFORM, chatId),
  save: (chatId, messages: ChatMessage[], birth: BirthParams | null) =>
    chatSaveSession(PLATFORM, chatId, messages, birth),
};

export const waClearSession = (waId: string) => chatClearSession(PLATFORM, waId);

// ── Sổ lá số (generic chat_profiles, platform='whatsapp') ───
export const whatsappProfiles: ProfileStore = {
  list: (chatId) => chatListProfiles(PLATFORM, chatId),
  get: (chatId, name) => chatGetProfile(PLATFORM, chatId, name),
  save: (chatId, name, birth) => chatSaveProfile(PLATFORM, chatId, name, birth),
};
