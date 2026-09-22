// lib/engine/than-so-hoc.ts
// ============================================================
// Cầu nối SERVER cho Thần Số Học (Numerology Pythagoras).
//
// KHÔNG chép lại công thức. Nạp thẳng `public/tools-shared/than-so-hoc.js` —
// cùng một file mà trình duyệt đang chạy — theo đúng tiền lệ `lib/engine/
// laso.ts`/`lib/engine/kim-lau.ts`: readFileSync + new Function, không import
// trực tiếp (file nằm trong public/, là script trình duyệt).
//
// Dùng bởi tool `tra_nam_ca_nhan_than_so` (lib/tools/registry.ts) — recompute
// Năm Cá Nhân + chặng đỉnh cao/thử thách hiện tại cho một NĂM XEM khác, giữa
// hội thoại, thay vì bắt client tải lại trang.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

type Rec = Record<string, unknown>;

export interface ThanSoHocResult {
  ok: boolean;
  error?: string;
  data?: Rec;
}

interface ThanSoHocApi {
  compute(ngay: number, thang: number, nam: number, tenRaw: string, namXem?: number): ThanSoHocResult;
}

let cache: ThanSoHocApi | null = null;

function loadApi(): ThanSoHocApi {
  if (cache) return cache;
  const code = readFileSync(join(process.cwd(), 'public', 'tools-shared', 'than-so-hoc.js'), 'utf-8');
  // File tự phát hiện CommonJS: `if (typeof module !== 'undefined' && module.exports)`
  // → chỉ cần cấp cho nó một `module` là lấy được API.
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  cache = mod.exports as unknown as ThanSoHocApi;
  return cache;
}

/** data trả về PHẲNG tuyệt đối (xem ghi chú trong than-so-hoc.js) — an toàn cho extractGenericContext. */
export function computeThanSoHoc(ngay: number, thang: number, nam: number, tenRaw: string, namXem?: number): ThanSoHocResult {
  return loadApi().compute(ngay, thang, nam, tenRaw, namXem);
}
