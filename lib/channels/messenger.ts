// lib/channels/messenger.ts
// ============================================================
// Adapter FACEBOOK MESSENGER ↔ "bộ não" (Contract v1) — VỎ MỎNG.
// Cài ChannelIO + SessionStore cho lib/channels/core.runConversation.
// Gửi/nhận qua Meta Graph Send API; phiên lưu generic (chat_sessions).
// ============================================================

import type { ChatImage, ChatMessage, BirthParams } from '@/lib/contract/v1';
import { graphPost, fetchGraphMedia } from './meta';
import { splitText, type ChannelIO, type SessionStore } from './core';
import { chatLoadSession, chatSaveSession, chatClearSession } from './store';

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
};

// ── SessionStore (generic, platform='messenger') ────────────
export const messengerStore: SessionStore = {
  load: (chatId) => chatLoadSession(PLATFORM, chatId),
  save: (chatId, messages: ChatMessage[], birth: BirthParams | null) =>
    chatSaveSession(PLATFORM, chatId, messages, birth),
};

export const msgrClearSession = (psid: string) => chatClearSession(PLATFORM, psid);

// re-export để route khỏi import lẻ
export type { ChatImage };
