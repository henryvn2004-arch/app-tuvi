// lib/celeb/photo.ts
// ============================================================
// Cầu nối SERVER cho chuỗi rơi ảnh người nổi tiếng.
//
// KHÔNG chép lại chuỗi rơi. Nạp thẳng `public/tools-shared/celeb-photo.js` —
// cùng một file mà `scripts/sync-celeb-photos.mjs` đang chạy — nên route API
// và script đồng bộ không thể trôi khỏi nhau.
//
// 🔴 Vì sao gắt ở đúng chỗ này: nếu hai bên ghép URL riêng và trôi khỏi nhau,
// triệu chứng GIỐNG HỆT triệu chứng của "ảnh chưa kịp đồng bộ" — thẻ vẫn hiện,
// chỉ là hiện avatar chữ cái. Không lỗi, không log, không đổi màu CI.
//
// Cách nạp theo đúng tiền lệ `lib/engine/kim-lau.ts`: readFileSync +
// new Function, không import trực tiếp (file nằm trong public/, là script
// trình duyệt). Có memo — đường này là đường nóng của mọi bản luận giải.
// ============================================================

import { readFileSync } from 'fs';
import { join } from 'path';

export type NguonAnh = 'storage' | 'commons' | null;

interface CelebPhotoApi {
  BUCKET: string;
  THUMB_W: number;
  WARM_PER_KEY: number;
  commonsThumb(file: string | null, width?: number): string | null;
  commonsFilePage(file: string | null): string | null;
  storageKey(qid: string, ext?: string): string;
  storageUrl(supabaseUrl: string, key: string): string;
  anhCho(row: { image_url?: string | null; image_file?: string | null }): {
    url: string | null;
    nguon: NguonAnh;
  };
}

let cache: CelebPhotoApi | null = null;

export function celebPhoto(): CelebPhotoApi {
  if (cache) return cache;
  const code = readFileSync(
    join(process.cwd(), 'public', 'tools-shared', 'celeb-photo.js'),
    'utf-8'
  );
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  cache = mod.exports as unknown as CelebPhotoApi;
  return cache;
}
