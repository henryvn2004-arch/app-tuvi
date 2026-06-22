// lib/channels/telegram.ts
// ============================================================
// Adapter Telegram ↔ "bộ não" (Contract v1, lib/agent/run).
// Chỉ là VỎ MỎNG: gọi Telegram Bot API + lưu phiên + gom text SSE.
// Không chứa logic nghiệp vụ tử vi (đã ở engine + agent loop).
// ============================================================

import type { ChatMessage } from '@/lib/contract/v1';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SB_HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY || '',
  Authorization: `Bearer ${SUPABASE_KEY || ''}`,
};

const TG_MSG_LIMIT = 4096; // giới hạn 1 tin Telegram
const HISTORY_KEEP = 12; // số message giữ lại cho slot-filling

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

export function splitText(s: string, max: number): string[] {
  if (s.length <= max) return [s];
  const out: string[] = [];
  let rest = s;
  while (rest.length > max) {
    // cắt ở newline gần nhất trước max để câu không gãy giữa chừng
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = max; // không có newline hợp lý → cắt cứng
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, '');
  }
  if (rest) out.push(rest);
  return out;
}

// ── Phiên hội thoại (bảng telegram_sessions) ────────────────
// chat_id text PK, messages jsonb (ChatMessage[]), updated_at.
export async function loadSession(chatId: number | string): Promise<ChatMessage[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_sessions?chat_id=eq.${encodeURIComponent(String(chatId))}&select=messages&limit=1`,
      { headers: SB_HEADERS },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as { messages?: ChatMessage[] }[];
    const msgs = rows[0]?.messages;
    return Array.isArray(msgs) ? msgs : [];
  } catch {
    return [];
  }
}

export async function saveSession(chatId: number | string, messages: ChatMessage[]): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const trimmed = messages.slice(-HISTORY_KEEP);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/telegram_sessions`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        chat_id: String(chatId),
        messages: trimmed,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function clearSession(chatId: number | string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/telegram_sessions?chat_id=eq.${encodeURIComponent(String(chatId))}`,
      { method: 'DELETE', headers: SB_HEADERS },
    );
  } catch {
    /* best-effort */
  }
}

// ── Gom event 'text' từ runAgent (send nhận chuỗi SSE) ──────
// runAgent gọi send(sse.text({delta})) / send(sse.error({...})). Ta bóc
// các delta thành 1 chuỗi, và bắt error nếu có.
export function createSSECollector(onStatus?: (status: string) => void) {
  let text = '';
  let error: string | null = null;
  let lastStatus = '';
  const send = (chunk: string) => {
    // mỗi chunk: "event: <name>\ndata: <json>\n\n"
    const nl = chunk.indexOf('\n');
    if (nl < 0) return;
    const name = chunk.slice(0, nl).replace(/^event:\s*/, '').trim();
    const dataLine = chunk.slice(nl + 1).replace(/^data:\s*/, '').trim();
    let data: unknown;
    try {
      data = JSON.parse(dataLine);
    } catch {
      return;
    }
    if (name === 'text') {
      text += (data as { delta?: string }).delta || '';
    } else if (name === 'status') {
      lastStatus = (data as { text?: string }).text || '';
      if (lastStatus && onStatus) onStatus(lastStatus);
    } else if (name === 'tool_call') {
      // Nhãn tool đã tới qua status kèm theo; tool_call để dành nếu cần.
    } else if (name === 'error') {
      error = (data as { message?: string }).message || 'Lỗi không xác định';
    }
  };
  return {
    send,
    getText: () => text,
    getError: () => error,
    getLastStatus: () => lastStatus,
  };
}
