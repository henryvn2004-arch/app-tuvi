// lib/channels/telegram.ts
// ============================================================
// Adapter Telegram ↔ "bộ não" (Contract v1, lib/agent/run).
// Chỉ là VỎ MỎNG: gọi Telegram Bot API + lưu phiên + gom text SSE.
// Không chứa logic nghiệp vụ tử vi (đã ở engine + agent loop).
// ============================================================

import type { ChatMessage, BirthParams, ChatImage } from '@/lib/contract/v1';
import { splitText } from './core';
import {
  chatLoadSession,
  chatSaveSession,
  chatClearSession,
  chatListProfiles,
  chatGetProfile,
  chatSaveProfile,
  type ChatSession,
} from './store';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

const TG_MSG_LIMIT = 4096; // giới hạn 1 tin Telegram

/** Nền tảng cho lớp lưu trữ generic (chat_sessions/chat_links… cột platform). */
const PLATFORM = 'telegram';

// ── Telegram Bot API ────────────────────────────────────────
export async function tgSendChatAction(chatId: number | string, action = 'typing'): Promise<void> {
  if (!TG_TOKEN) return;
  try {
    await fetch(`${TG_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {
    /* best-effort */
  }
}

/** Gửi tin nhắn, tự cắt nếu vượt 4096 ký tự. Plain text (không parse_mode
 *  để tránh lỗi 400 khi markdown của LLM không hợp lệ với Telegram). */
export async function tgSendMessage(chatId: number | string, text: string): Promise<void> {
  if (!TG_TOKEN) return;
  const chunks = splitText(text || '…', TG_MSG_LIMIT);
  for (const chunk of chunks) {
    try {
      await fetch(`${TG_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: chunk, disable_web_page_preview: true }),
      });
    } catch {
      /* best-effort */
    }
  }
}

/** Gửi tin nhắn, TRẢ VỀ message_id để edit dần (tiến trình / câu trả lời). */
export async function tgSendMessageReturnId(chatId: number | string, text: string): Promise<number | null> {
  if (!TG_TOKEN) return null;
  try {
    const r = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: (text || '…').slice(0, TG_MSG_LIMIT), disable_web_page_preview: true }),
    });
    const j = (await r.json()) as { result?: { message_id?: number } };
    return j?.result?.message_id ?? null;
  } catch {
    return null;
  }
}

/** Sửa nội dung 1 tin nhắn (dùng cho thanh tiến trình + chốt câu trả lời). */
export async function tgEditMessage(chatId: number | string, messageId: number, text: string): Promise<void> {
  if (!TG_TOKEN || !messageId) return;
  try {
    await fetch(`${TG_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: (text || '…').slice(0, TG_MSG_LIMIT), disable_web_page_preview: true }),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Đăng ẢNH kèm chữ vào một chat/kênh (M3 — adapter Telegram channel).
 *
 * Gửi `photo` dạng URL để Telegram tự tải: ảnh do `/api/og/social` render
 * on-demand, không có file nhị phân nào để upload. Trả `{messageId, username}`
 * để dựng link `t.me/<username>/<id>` — kênh riêng tư không có username thì
 * `username` rỗng và bài vẫn đăng bình thường, chỉ là không có link công khai.
 *
 * KHÁC `tgSendMessage`: hàm này KHÔNG nuốt lỗi. Nó là một bước đăng bài, lỗi
 * phải nổi lên để `publishQueue` đánh dấu đúng trạng thái thay vì báo thành
 * công cho một bài chưa hề lên kênh.
 */
export async function tgSendPhoto(
  chatId: number | string,
  photoUrl: string,
  caption: string,
): Promise<{ messageId: number; username: string }> {
  if (!TG_TOKEN) throw new Error('Thiếu env TELEGRAM_BOT_TOKEN');
  const r = await fetch(`${TG_API}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Trần caption của sendPhoto là 1024 ký tự — người gọi đã cắt sẵn, đây chỉ
    // là lưới an toàn cuối để một chuỗi dài bất ngờ không làm hỏng cả lượt.
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption: (caption || '').slice(0, 1024) }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
    result?: { message_id?: number; chat?: { username?: string } };
  };
  if (!j.ok || !j.result?.message_id) {
    throw new Error(j.description || `Telegram HTTP ${r.status}`);
  }
  return { messageId: j.result.message_id, username: j.result.chat?.username || '' };
}

// ── Tải ẢNH người dùng gửi → base64 (cho runAgent luận nhân tướng/phong thủy) ──
// Telegram 2 bước: getFile(file_id) → file_path; rồi tải nội dung từ
// api.telegram.org/file/bot<token>/<path>. Trả ChatImage {data(base64,
// KHÔNG tiền tố), mediaType} đúng shape Contract v1. Giới hạn 5MB để
// chặn payload phình + chi phí.
const TG_FILE_MAX = 5 * 1024 * 1024;

export async function tgFetchImage(fileId: string): Promise<ChatImage | null> {
  if (!TG_TOKEN || !fileId) return null;
  try {
    const r = await fetch(`${TG_API}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });
    const j = (await r.json()) as { result?: { file_path?: string; file_size?: number } };
    const path = j?.result?.file_path;
    if (!path) return null;
    if ((j.result?.file_size || 0) > TG_FILE_MAX) return null;
    const fr = await fetch(`https://api.telegram.org/file/bot${TG_TOKEN}/${path}`);
    if (!fr.ok) return null;
    const buf = Buffer.from(await fr.arrayBuffer());
    if (buf.length > TG_FILE_MAX || buf.length === 0) return null;
    return { data: buf.toString('base64'), mediaType: mediaTypeFromPath(path) };
  } catch {
    return null;
  }
}

function mediaTypeFromPath(p: string): string {
  const ext = (p.toLowerCase().split('.').pop() || '').trim();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

// ── Phiên hội thoại (generic chat_sessions, platform='telegram') ────
// Lưu trữ đã gộp về lib/channels/store (đa-nền-tảng). Giữ nguyên các tên
// hàm/chữ ký cũ để route Telegram không phải đổi.
export type TgSession = ChatSession;

export const loadSession = (chatId: number | string) => chatLoadSession(PLATFORM, chatId);

export const saveSession = (chatId: number | string, messages: ChatMessage[], birth: BirthParams | null = null) =>
  chatSaveSession(PLATFORM, chatId, messages, birth);

export const clearSession = (chatId: number | string) => chatClearSession(PLATFORM, chatId);

// ── Sổ lá số (generic chat_profiles, platform='telegram') ───
export const listProfiles = (chatId: number | string) => chatListProfiles(PLATFORM, chatId);
export const getProfile = (chatId: number | string, name: string) => chatGetProfile(PLATFORM, chatId, name);
export const saveProfile = (chatId: number | string, name: string, birth: BirthParams) =>
  chatSaveProfile(PLATFORM, chatId, name, birth);
