// lib/engine/kim-lau.ts
// ============================================================
// Cầu nối SERVER cho công thức Kim Lâu.
//
// KHÔNG chép lại công thức. Nạp thẳng `public/tools-shared/kim-lau.js` — cùng
// một file mà trình duyệt đang chạy — nên trang trụ /kim-lau, trang công cụ và
// rail chat không thể trôi khỏi nhau. Repo vừa mất một PR vì hai họ URL nói hai
// điều khác nhau (#358); hai bản công thức Kim Lâu còn tệ hơn nhiều, vì lệch
// nhau ở đây là nói sai với người đang định chọn ngày làm nhà.
//
// Cách nạp theo đúng tiền lệ `lib/engine/laso.ts`: readFileSync + new Function,
// không import trực tiếp (file nằm trong public/, là script trình duyệt).
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

export type KimLauLoai = 'Thân' | 'Thê' | 'Tử' | 'Lục Súc';

interface KimLauApi {
  vnYear(): number;
  kimLauLoai(tuoiTa: number): KimLauLoai | null;
  compute(namSinh: number, namXem?: number): unknown;
}

let cache: KimLauApi | null = null;

function loadApi(): KimLauApi {
  if (cache) return cache;
  const code = readFileSync(join(process.cwd(), 'public', 'tools-shared', 'kim-lau.js'), 'utf-8');
  // File tự phát hiện CommonJS: `if (typeof module !== 'undefined' && module.exports)`
  // → chỉ cần cấp cho nó một `module` là lấy được API.
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  cache = mod.exports as unknown as KimLauApi;
  return cache;
}

/** Tên loại Kim Lâu theo TUỔI ÂM (tuổi ta), hoặc null nếu không phạm. */
export function kimLauLoai(tuoiTa: number): KimLauLoai | null {
  return loadApi().kimLauLoai(tuoiTa);
}

/** Năm hiện tại theo giờ VN — cùng nguồn với bản chạy ở trình duyệt. */
export function kimLauNamHienTai(): number {
  return loadApi().vnYear();
}

/** Ai/cái gì bị ảnh hưởng theo từng loại — dùng cho bảng tra và FAQ. */
export const KIM_LAU_HAI: Record<KimLauLoai, string> = {
  Thân: 'chính gia chủ',
  Thê: 'người vợ',
  Tử: 'con cái',
  'Lục Súc': 'vật nuôi, tài sản',
};

/** Số dư mod 9 ứng với từng loại — hiện trong bảng "cách tính". */
export const KIM_LAU_DU: Record<KimLauLoai, number> = {
  Thân: 1,
  Thê: 3,
  Tử: 6,
  'Lục Súc': 8,
};
