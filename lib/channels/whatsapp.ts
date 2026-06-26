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
import { splitText, type ChannelIO, type SessionStore, type ProfileStore } from './core';
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
/** Gửi 1 tin văn bản (tự cắt nếu > giới hạn). */
export async function waSendText(to: string, text: string): Promise<void> {
  if (!PHONE_NUMBER_ID || !WA_TOKEN) return;
  for (const chunk of splitText(text || '…', MSG_LIMIT)) {
    await graphPost(`${PHONE_NUMBER_ID}/messages`, WA_TOKEN, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: chunk, preview_url: false },
    });
  }
}

// ── Tải ảnh: media-id → url → bytes (base64) ────────────────
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
  sendText: (chatId, text) => waSendText(String(chatId), text),
  sendProgress: async (chatId, text) => {
    await waSendText(String(chatId), text);
    return null; // không edit được → tin tiến trình gửi 1 lần
  },
  editText: async () => {},
  fetchImage: (ref) => waFetchImage(ref),
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
