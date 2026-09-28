// lib/channels/author.ts
// ============================================================
// THẦY TIẾP CHUYỆN cho kênh chat webhook — tương đương `pickAuthor/setAuthor`
// của web (public/shell.js), nhưng lưu ở chat_sessions.author_id thay vì
// localStorage. Danh sách thầy lấy thẳng từ `PERSONAS` (lib/agent/personas.ts)
// — một nguồn với khoá `authorId` mà runAgent tra để đổi giọng.
// ============================================================

import { createHash } from 'crypto';
import { PERSONAS } from '@/lib/agent/personas';
import { chatGetAuthor, chatSetAuthor } from './store';

export interface Thay {
  id: string;
  name: string;
}

export const THAY_LIST: Thay[] = Object.values(PERSONAS).map((p) => ({ id: p.id, name: p.name }));

const boDau = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** Thầy mặc định CỐ ĐỊNH theo cuộc trò chuyện (băm chatId) — web bốc ngẫu nhiên
 *  rồi nhớ; kênh không có nơi nhớ trước lượt đầu nên băm cho ổn định. */
function thayMacDinh(platform: string, chatId: string): Thay {
  const h = createHash('sha256').update(`${platform}:${chatId}`).digest();
  return THAY_LIST[h.readUInt32BE(0) % THAY_LIST.length];
}

/** Thầy đang tiếp chuyện: đã chọn (DB) → mặc định theo chatId. */
export async function thayCuaChat(platform: string, chatId: string): Promise<Thay> {
  const id = await chatGetAuthor(platform, chatId);
  return THAY_LIST.find((t) => t.id === id) || thayMacDinh(platform, chatId);
}

/** "3" (số thứ tự trong danh sách) hoặc "Tâm Kính"/"tam kinh"/"tam-kinh". */
export function timThay(arg: string): Thay | null {
  const a = boDau(arg).replace(/^thay\s+/, '');
  if (!a) return null;
  const n = Number(a);
  if (Number.isInteger(n) && n >= 1 && n <= THAY_LIST.length) return THAY_LIST[n - 1];
  return THAY_LIST.find((t) => boDau(t.name) === a || t.id === a.replace(/\s+/g, '-')) || null;
}

export const chonThay = (platform: string, chatId: string, t: Thay) => chatSetAuthor(platform, chatId, t.id);

export function danhSachThay(dangChon: Thay): string {
  const dong = THAY_LIST.map((t, i) => `${i + 1}. Thầy ${t.name}${t.id === dangChon.id ? ' (đang tiếp chuyện)' : ''}`);
  return `Nhóm Minh Bảo có ${THAY_LIST.length} thầy:\n${dong.join('\n')}\n\nĐổi thầy: nhắn /thay <số hoặc tên>, vd "/thay 3" hoặc "/thay Tâm Kính".`;
}
