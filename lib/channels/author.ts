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

// ── Lời thầy tự giới thiệu (master_profiles.greeting + discipline) ──
// CÙNG nguồn với lời chào của web (`introThay`, public/shell.js) — Admin sửa
// bảng là cả web lẫn kênh chat đổi theo, không deploy. Đọc hụt → câu mặc định.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const INTRO_TTL_MS = 10 * 60_000;
let introCache: { at: number; map: Record<string, { greeting?: string; discipline?: string }> } | null = null;

async function masterIntros(): Promise<Record<string, { greeting?: string; discipline?: string }>> {
  if (introCache && Date.now() - introCache.at < INTRO_TTL_MS) return introCache.map;
  const map: Record<string, { greeting?: string; discipline?: string }> = {};
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/master_profiles?select=id,greeting,discipline`, {
        cache: 'no-store',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) {
        for (const r of (await res.json()) as { id: string; greeting?: string; discipline?: string }[]) {
          map[r.id] = { greeting: r.greeting || undefined, discipline: r.discipline || undefined };
        }
      } else {
        console.error('[author] đọc master_profiles lỗi', res.status);
      }
    } catch (e) {
      console.error('[author] đọc master_profiles lỗi mạng', e);
    }
  }
  // Đọc hụt thì không nhớ — lượt sau thử lại.
  if (Object.keys(map).length) introCache = { at: Date.now(), map };
  return map;
}

/** Lời thầy tự giới thiệu ngắn: câu chào của thầy + môn chuyên xem. */
export async function gioiThieuThay(t: Thay): Promise<string> {
  const m = (await masterIntros())[t.id];
  const chao = m?.greeting || `Thầy ${t.name} đây.`;
  return m?.discipline ? `${chao}\nThầy chuyên xem: ${m.discipline}.` : chao;
}

/** URL công khai chân dung chì THU NHỎ của thầy (public/authors/nho/<id>.jpg,
 *  96×96, ~3 KB — cắt từ bản gốc public/authors/<id>.jpg). App chat tự quyết
 *  cỡ hiển thị ảnh; ảnh gốc to bị bày ra gần kín màn hình. */
export const anhThay = (t: Thay) => `https://www.tuviminhbao.com/authors/nho/${t.id}.jpg`;
