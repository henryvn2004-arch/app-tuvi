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

// ── Lời thầy tự giới thiệu ──
// Chỉ chào + tên. KHÔNG kèm môn chuyên/câu chào riêng (master_profiles): trên kênh
// chat thầy nào cũng luận được mọi thứ, mặc định là Tử Vi — nêu "sở trường" chỉ
// làm khách tưởng phải chọn đúng thầy (Henry chốt 2026-09-29).
export async function gioiThieuThay(t: Thay): Promise<string> {
  return `Chào con, ta là Thầy ${t.name}.`;
}

/** URL công khai chân dung chì cho kênh chat (public/authors/chat/<id>.jpg — trọn
 *  tranh, cạnh dài 640px, ~60 KB, sinh từ bản gốc authors/<id>.png). App chat tự kéo
 *  ảnh ra gần hết bề ngang: bản 96×96 cũ bị phóng to thành mờ (Henry 2026-09-29).
 *  Đổi ảnh thì đổi cả THƯ MỤC — Zalo nhớ ảnh theo URL. */
export const anhThay = (t: Thay) => `https://www.tuviminhbao.com/authors/chat/${t.id}.jpg`;
