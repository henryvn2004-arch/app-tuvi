// lib/media/webtoon-style.ts
// ============================================================
// NGUỒN DUY NHẤT cho phong cách webtoon (Minh Bảo, Ghibli/chibi) — Henry chốt
// 2026-09-16 ("style ghibli này cũng là style của website luôn nhé"). Mọi bộ
// sinh ảnh nhân vật (hero-banner-prompt.ts, và về sau tool-avatar-prompt.ts /
// illus-prompt.ts / que-image-prompt.ts khi tới lượt) import từ ĐÂY — không
// chép tay khối phong cách sang nơi khác, sửa một chỗ là sửa cả bộ.
//
// Nguồn gốc: `scripts/gen-webtoon-sample.mjs` (STYLE_LOCK_V2/CHARACTER_DNA_V2/
// NEGATIVE_V2) — sandbox thử phong cách, ảnh ra CHƯA commit (gitignored
// `.webtoon-sample/`). File này là bản NÂNG LÊN production sau khi Henry đã
// duyệt cả bộ ảnh (mascot/hero/corner/expressions/poses + 11 banner tool).
// ============================================================

/**
 * Ảnh NEO nhận diện Minh Bảo cho `images/edits` — nguồn DUY NHẤT, dùng chung
 * bởi `hero-banner-prompt.ts` VÀ `tool-avatar-prompt.ts` (đặt Ở ĐÂY thay vì
 * trong một trong hai file đó để tránh import vòng giữa chúng — hero-banner
 * đã import `TOOL_AVATAR_ALIAS` từ tool-avatar, nếu tool-avatar lại import
 * ngược từ hero-banner là circular import).
 */
export const ANCHOR_IMAGE_PATH = 'public/mascot/hero-scene-v2.webp';

/** Khối phong cách cố định — mọi ảnh Minh Bảo phải mở đầu bằng đúng khối này. */
export const STYLE_LOCK = `minimalist Vietnamese webtoon illustration, soft warm color palette (beige, brown, muted green), clean thin line art, soft shading, no harsh contrast, cute chibi proportion (big head ~60%, small body), peaceful countryside atmosphere, slightly nostalgic, gentle lighting, flat + light gradient shading, highly consistent character design, no hyper realism, no anime glossy rendering`;

/** Nhận diện nhân vật — chỉ cần khi KHÔNG neo ảnh (text-to-image thuần). Khi
 * đã neo (`images/edits` + ảnh mascot làm `from`) thì KHÔNG lặp lại khối này
 * bằng chữ — ảnh neo đã MANG sẵn hình hài, tả lại là thừa và đôi khi kéo
 * ngược tỉ lệ về ít chibi hơn (xem `edit2Prompt` bên dưới). */
export const CHARACTER_DNA = `Minh Bảo, Vietnamese boy, 7 years old, chibi style, round face, soft cheeks, small nose, big brown eyes, messy short dark hair, innocent and calm expression.
Outfit (default): brown rural shirt, dark rolled pants, barefoot OR simple sandals, straw hat (nón lá) optional, small woven bag.
Signature: often holding stick / book / grass / brush, relaxed posture, peaceful vibe.`;

export const NEGATIVE = `realistic face, 3D render, western style, anime glossy, over-detailed, messy background, text artifacts, extra fingers, Chinese characters, captions, letters`;

/**
 * Ghép prompt cho `images/edits` (CÓ ảnh neo mang sẵn hình hài Minh Bảo) —
 * chỉ cần tả THAY ĐỔI (tư thế/cảnh mới), không lặp lại CHARACTER_DNA bằng
 * chữ. Đây là kỹ thuật DUY NHẤT giữ được cùng một khuôn mặt giữa các bức —
 * tả bằng chữ mỗi lần thì model dựng lại từ đầu và TRÔI NHÂN VẬT (đã cắn ở
 * vòng 1 của cả bộ character bible lẫn 52 tool avatar cũ).
 */
export function edit2Prompt(body: string): string {
  return `${body}

STYLE:
${STYLE_LOCK}

Negative:
${NEGATIVE}
No text, letters, Chinese characters or captions anywhere in the image.`;
}

/**
 * Ghép prompt cho `images/generations` (KHÔNG có ảnh neo — cảnh không có
 * Minh Bảo, ví dụ phong cảnh thuần). Ít dùng hơn `edit2Prompt` từ khi có
 * ảnh neo mascot; giữ lại cho các cảnh không cần nhân vật.
 */
export function build2Prompt({
  mood,
  action,
  scene,
  env,
  light,
}: {
  mood: string;
  action: string;
  scene: string;
  env: string;
  light: string;
}): string {
  return `A ${mood} minimalist Vietnamese webtoon illustration.

Character:
${CHARACTER_DNA}
${action}

Scene:
${scene}

Environment details:
${env}

Lighting:
${light}

Composition:
centered character, clean background, lots of negative space, soft depth. No text, letters or captions anywhere in the image.

STYLE:
${STYLE_LOCK}

Negative:
${NEGATIVE}`;
}
