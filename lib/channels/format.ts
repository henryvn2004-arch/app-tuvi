// lib/channels/format.ts
// Tiện ích TRÌNH BÀY dùng chung mọi kênh chat — tách khỏi core.ts (không kéo
// theo runAgent) để adapter lẫn bài kiểm dùng nhẹ.
import type { ChannelIO, ChatButton } from './core';

/**
 * Gửi tin kèm nút. Kênh có `sendButtons` thì dựng nút thật; không có thì lùi
 * về chữ: link in thẳng ra, câu soạn sẵn thành dòng "nhắn: …".
 */
export async function sendMenu(
  io: ChannelIO,
  chatId: number | string,
  text: string,
  buttons: ChatButton[],
): Promise<void> {
  const btns = buttons.filter((b) => b.title);
  if (!btns.length) return io.sendText(chatId, text);
  if (io.sendButtons) return io.sendButtons(chatId, text, btns);
  return io.sendText(chatId, `${text}\n\n${buttonsAsText(btns)}`);
}

/** Nút → dòng chữ: link in thẳng ra, câu soạn sẵn thành "nhắn: …". */
export function buttonsAsText(buttons: ChatButton[]): string {
  return buttons.map((b) => ('url' in b ? `• ${b.title}: ${b.url}` : `• ${b.title} — nhắn "${b.reply}"`)).join('\n');
}

/**
 * Markdown của LLM → chữ thường cho app chat không hiểu markdown (Zalo,
 * Messenger). `bold` = ký hiệu đậm của nền tảng ('*' cho WhatsApp), rỗng = bỏ.
 * Chỉ đụng CÚ PHÁP markdown chắc chắn (tiêu đề #, **đậm**, gạch đầu dòng, link,
 * `code`) — không đoán dấu * đơn lẻ vì nó hay là chữ thật.
 */
export function markdownToChat(md: string, bold = ''): string {
  return md
    .replace(/^#{1,6}\s+(.+?)\s*#*$/gm, (_m, t: string) => (bold ? `${bold}${t}${bold}` : t))
    .replace(/\*\*(.+?)\*\*/g, (_m, t: string) => (bold ? `${bold}${t}${bold}` : t))
    .replace(/__(.+?)__/g, (_m, t: string) => (bold ? `${bold}${t}${bold}` : t))
    .replace(/^(\s*)[-*+]\s+/gm, '$1• ')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1 ($2)')
    .replace(/`([^`\n]+)`/g, '$1');
}

