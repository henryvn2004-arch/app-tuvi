// lib/engine/bat-trach.ts
// ============================================================
// Cầu nối SERVER cho bảng Du Niên Bát Trạch (Sinh Khí/Thiên Y/…).
//
// KHÔNG chép lại bảng. Nạp thẳng `public/tools-shared/bat-trach.js` — cùng
// một file mà trình duyệt đang chạy — nên `app/api/phong-thuy/route.ts` và
// 4 trang Vision phong thủy không thể trôi khỏi nhau lần nữa (repo từng có
// 3 bản chép tay mâu thuẫn nhau, xem ghi chú đầu file .js).
//
// Cách nạp theo đúng tiền lệ `lib/engine/kim-lau.ts`: readFileSync + new
// Function, không import trực tiếp (file nằm trong public/, là script trình
// duyệt, tự phát hiện CommonJS qua `if (typeof module !== 'undefined' …)`).
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

export type Huong = 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';

interface BatTrachApi {
  getCungMenh(nam: number, gioitinh: string): number;
  duNienStars(cung: number): { good: Record<string, Huong>; bad: Record<string, Huong> };
  CUNG_NAME: string[];
  CUNG_HANH: string[];
}

let cache: BatTrachApi | null = null;

function loadApi(): BatTrachApi {
  if (cache) return cache;
  const code = readFileSync(join(process.cwd(), 'public', 'tools-shared', 'bat-trach.js'), 'utf-8');
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  cache = mod.exports as unknown as BatTrachApi;
  return cache;
}

/** Cung mệnh (1-9, không có 5) theo năm sinh dương lịch + giới tính. */
export function getCungMenh(nam: number, gioitinh: string): number {
  return loadApi().getCungMenh(nam, gioitinh);
}

/** Bảng Du Niên đầy đủ cho một cung: 4 sao cát + 4 sao hung → hướng. */
export function duNienStars(cung: number): { good: Record<string, Huong>; bad: Record<string, Huong> } {
  return loadApi().duNienStars(cung);
}

/** { name, elem, good, bad } cho một cung — shape tương thích ngược với
 * hằng số `GUA`/`GUA_DATA` cũ, để các call site không phải sửa gì thêm. */
export function guaOf(cung: number): { name: string; elem: string; good: Record<string, Huong>; bad: Record<string, Huong> } {
  const api = loadApi();
  const { good, bad } = api.duNienStars(cung);
  return { name: api.CUNG_NAME[cung], elem: api.CUNG_HANH[cung], good, bad };
}

/** Toàn bộ 8 cung (1-4, 6-9) — dùng để dựng bảng tra hoặc kiểm chứng. */
export function allGua(): Record<number, { name: string; elem: string; good: Record<string, Huong>; bad: Record<string, Huong> }> {
  const out: Record<number, ReturnType<typeof guaOf>> = {};
  for (const c of [1, 2, 3, 4, 6, 7, 8, 9]) out[c] = guaOf(c);
  return out;
}
