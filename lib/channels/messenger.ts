// lib/channels/messenger.ts
// ============================================================
// Adapter FACEBOOK MESSENGER ↔ "bộ não" (Contract v1) — VỎ MỎNG.
// Cài ChannelIO + SessionStore cho lib/channels/core.runConversation.
// Gửi/nhận qua Meta Graph Send API; phiên lưu generic (chat_sessions).
// ============================================================

import type { ChatImage, ChatMessage, BirthParams } from '@/lib/contract/v1';
import { graphPost, fetchGraphMedia } from './meta';
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

const PLATFORM = 'messenger';
const PAGE_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';
const MSG_LIMIT = 2000; // giới hạn 1 tin Messenger (~2000 ký tự)
const MAX_IMAGES = 3; // khớp MAX_IMAGES_PER_MSG trong runAgent

// ── Send API ────────────────────────────────────────────────
/** Gửi 1 tin văn bản (tự cắt nếu > giới hạn). messaging_type RESPONSE = trả
 *  lời trong cửa sổ 24h, không cần xin quyền message tag. */
export async function msgrSendText(psid: string, text: string): Promise<void> {
  if (!PAGE_TOKEN) return;
  for (const chunk of splitText(text || '…', MSG_LIMIT)) {
    await graphPost('me/messages', PAGE_TOKEN, {
      recipient: { id: psid },
      messaging_type: 'RESPONSE',
      message: { text: chunk },
    });
  }
}

/** Messenger: button template ≤3 nút, chữ ≤640; quick reply ≤13, nhãn ≤20. */
const TEMPLATE_TEXT_MAX = 640;
const MAX_URL_BUTTONS = 3;
const MAX_QUICK_REPLIES = 13;
const TITLE_MAX = 20;

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/**
 * Link → nút `web_url` của button template (mở ngay trong Messenger); câu soạn
 * sẵn → quick reply (bấm = gửi đúng chữ đó, webhook đọc `quick_reply.payload`).
 * Chữ dài hơn trần template → gửi chữ trước, template theo sau với câu ngắn.
 */
export async function msgrSendButtons(psid: string, text: string, buttons: ChatButton[]): Promise<void> {
  if (!PAGE_TOKEN) return;
  const urls = buttons.filter((b): b is { title: string; url: string } => 'url' in b).slice(0, MAX_URL_BUTTONS);
  const replies = buttons
    .filter((b): b is { title: string; reply: string } => 'reply' in b)
    .slice(0, MAX_QUICK_REPLIES);
  const quick = replies.length
    ? {
        quick_replies: replies.map((r) => ({
          content_type: 'text',
          title: short(r.title, TITLE_MAX),
          payload: r.reply.slice(0, 1000),
        })),
      }
    : {};

  if (!urls.length) {
    const parts = splitText(text || '…', MSG_LIMIT);
    for (const p of parts.slice(0, -1)) await msgrSendText(psid, p);
    await graphPost('me/messages', PAGE_TOKEN, {
      recipient: { id: psid },
      messaging_type: 'RESPONSE',
      message: { text: parts[parts.length - 1], ...quick },
    });
    return;
  }

  let head = text || '…';
  if (head.length > TEMPLATE_TEXT_MAX) {
    await msgrSendText(psid, head);
    head = '👇';
  }
  await graphPost('me/messages', PAGE_TOKEN, {
    recipient: { id: psid },
    messaging_type: 'RESPONSE',
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: head,
          buttons: urls.map((u) => ({ type: 'web_url', url: u.url, title: short(u.title, TITLE_MAX) })),
        },
      },
      ...quick,
    },
  });
}

/** Gửi ảnh theo URL công khai. */
export async function msgrSendImage(psid: string, url: string, caption?: string): Promise<void> {
  if (!PAGE_TOKEN) return;
  await graphPost('me/messages', PAGE_TOKEN, {
    recipient: { id: psid },
    messaging_type: 'RESPONSE',
    message: { attachment: { type: 'image', payload: { url, is_reusable: true } } },
  });
  if (caption) await msgrSendText(psid, caption);
}

/** Báo trạng thái (typing_on / mark_seen). Best-effort. */
async function msgrSenderAction(psid: string, action: 'typing_on' | 'mark_seen'): Promise<void> {
  if (!PAGE_TOKEN) return;
  await graphPost('me/messages', PAGE_TOKEN, { recipient: { id: psid }, sender_action: action });
}

// ── ChannelIO (Messenger không sửa được tin → sendProgress trả null) ──
// progressId null → core.deliver() gửi câu trả lời như tin MỚI; thanh tiến
// trình chỉ là 1 tin "đang xem…" gửi 1 lần (không edit theo status).
export const messengerIO: ChannelIO = {
  platform: PLATFORM,
  msgLimit: MSG_LIMIT,
  maxImages: MAX_IMAGES,
  typing: (chatId) => msgrSenderAction(String(chatId), 'typing_on'),
  sendText: (chatId, text) => msgrSendText(String(chatId), text),
  sendProgress: async (chatId, text) => {
    await msgrSendText(String(chatId), text);
    return null; // Messenger không edit tin → không có id tiến trình
  },
  editText: async () => {}, // không hỗ trợ (no-op; core không gọi khi progressId=null)
  fetchImage: (ref) => fetchGraphMedia(ref), // ref = URL CDN Meta cấp sẵn
  sendButtons: (chatId, text, buttons) => msgrSendButtons(String(chatId), text, buttons),
  sendImage: (chatId, url, caption) => msgrSendImage(String(chatId), url, caption),
  format: (t) => markdownToChat(t), // Messenger không hiểu markdown
};

// ── SessionStore (generic, platform='messenger') ────────────
export const messengerStore: SessionStore = {
  load: (chatId) => chatLoadSession(PLATFORM, chatId),
  save: (chatId, messages: ChatMessage[], birth: BirthParams | null) =>
    chatSaveSession(PLATFORM, chatId, messages, birth),
};

export const msgrClearSession = (psid: string) => chatClearSession(PLATFORM, psid);

// ── Sổ lá số (generic chat_profiles, platform='messenger') ──
export const messengerProfiles: ProfileStore = {
  list: (chatId) => chatListProfiles(PLATFORM, chatId),
  get: (chatId, name) => chatGetProfile(PLATFORM, chatId, name),
  save: (chatId, name, birth) => chatSaveProfile(PLATFORM, chatId, name, birth),
};

// re-export để route khỏi import lẻ
export type { ChatImage };
