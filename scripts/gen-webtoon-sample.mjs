#!/usr/bin/env node
/**
 * Sinh ẢNH MẪU cho reskin webtoon — vòng KHOÁ PHONG CÁCH.
 *
 * Mục đích DUY NHẤT: đưa Henry 4 bức để chốt "đúng style chưa". Chốt xong thì
 * khối `STYLE_LOCK` dưới đây được nâng lên `lib/media/webtoon-style.ts` và mọi
 * bộ prompt ảnh (tool-avatar-prompt · illus-prompt · hero-banner-prompt ·
 * gen-que-images) cùng import nó — MỘT nguồn phong cách, không chép tay.
 * Trước khi chốt thì CHƯA đụng vào 4 bộ đó.
 *
 *   node scripts/gen-webtoon-sample.mjs            # 4 bức mẫu
 *   node scripts/gen-webtoon-sample.mjs --dry-run  # chỉ in prompt, KHÔNG gọi API
 *   node scripts/gen-webtoon-sample.mjs --only mascot,hero
 *
 * Cờ: --out <thư mục> (mặc định `.webtoon-sample/`) · --quality low|medium|high
 * (mặc định medium) · --force vẽ đè bức đã có.
 *
 * ⚠️ MODEL: `gpt-image-2`. Guideline của Henry ghi tiêu đề "GPT-IMAGE-1" nhưng
 * tin nhắn đầu nói "dùng gpt-image 2", và OpenAI TẮT gpt-image-1 ngày
 * 23/10/2026 — chọn bản còn sống. Cùng luật đã ghi ở `lib/image/openai-image.ts`.
 *
 * Script này CỐ Ý không dùng `lib/image/openai-image.ts`: file đó là đường sinh
 * ảnh của 2 tool ĐANG BÁN, không kéo nó vào một lượt thử phong cách.
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const KEY = process.env.OPENAI_API_KEY || '';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const flag = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const OUT = flag('--out', join(ROOT, '.webtoon-sample'));
const QUALITY = flag('--quality', 'medium');
const DRY = has('--dry-run');
const FORCE = has('--force');

// ════════════════════════════════════════════════════════════════════════
// STYLE LOCK — chép NGUYÊN VĂN từ guideline "MASTER PROMPT STYLE" của Henry.
// Mọi bức trong bộ reskin phải mở đầu bằng đúng khối này, không diễn giải lại.
// Sửa ở đây = sửa cả bộ; đó là điểm của nó.
// ════════════════════════════════════════════════════════════════════════
const STYLE_LOCK = `A soft watercolor illustration in East Asian traditional style, combined with modern Korean webtoon aesthetics.
Warm neutral background, light ink wash mountains, soft sunlight, minimal details, airy composition.
Character drawn in chibi anime style with gentle expression, soft shadows, rounded shapes.
Color palette: cream, muted green, soft brown, warm gold.
No harsh contrast, no realistic photography.`;

/** Bảng màu UI của guideline — nêu thẳng mã màu để ảnh ăn khớp với nền trang. */
const PALETTE = `The illustration must sit naturally on a #F6F3EE cream page background.
Use these colors and no others: cream #F6F3EE, deep ink blue #0F2A3D, warm gold #C8A96A, muted green #7FA7A3, soft terracotta #C46A5E.`;

/** Chống hai bệnh gpt-image đã cắn ở bộ tool-avatar: chữ Hán bịa và vignette. */
const GUARDS = `Do NOT render any text, letters, Chinese characters or captions anywhere in the image — the model fabricates unreadable glyphs.
No vignette, no dark corners, no photographic glow halo, no heavy black outlines.
Leave generous empty space; the composition must read clearly at 400px wide on a phone.`;

const build = (body) => `${STYLE_LOCK}\n\n${PALETTE}\n\nSUBJECT:\n${body}\n\n${GUARDS}`;

const SAMPLES = {
  // Prompt nhân vật — chép từ guideline §8.3, thêm ràng buộc nhận diện để các
  // bức sau tái dựng được cùng một cậu bé.
  mascot: {
    size: '1024x1024',
    prompt:
      build(`A chibi Vietnamese boy around 8 years old wearing a traditional conical hat (nón lá), sitting on the back of a water buffalo, smiling gently, holding a small bamboo stick.
Old Vietnamese countryside: rice paddies, a bamboo grove, a village gate far behind, peaceful late-afternoon light.
CHARACTER LOCK — keep these exact traits in every future image: round face, soft dark hair peeking under the hat, large expressive dark eyes, a simple indigo-brown tunic, bare feet, a small warm smile. Full body, centered, facing the viewer at a slight three-quarter angle.`),
  },

  // Bảng biểu cảm §3.4 — một tấm 4 ô để 4 trạng thái chắc chắn CÙNG một nhân vật.
  // Vẽ rời 4 lượt thì gpt-image trôi mặt, đã cắn ở bộ tool-avatar.
  expressions: {
    size: '1536x1024',
    prompt:
      build(`A character expression sheet: the SAME chibi Vietnamese boy repeated four times in a single horizontal row, evenly spaced on a plain cream background, bust-up portraits only.
He wears a conical hat and an indigo-brown tunic; round face, soft dark hair, large expressive dark eyes.
Left to right, the four expressions are:
1. lightly cheerful and welcoming, eyes bright, small open smile
2. focused and attentive, slight lean forward, gentle concentration
3. thoughtful and contemplative, eyes half-lowered, hand near chin
4. calm and serious, steady direct gaze, no smile
All four must be unmistakably the same character with identical proportions, hair and clothing. No frames, no borders, no dividing lines between them.`),
  },

  // §8.4
  hero: {
    size: '1536x1024',
    prompt:
      build(`A peaceful East Asian landscape: layered ink-wash mountains fading into soft haze, a small Vietnamese village of tiled roofs nestled at their foot, rice terraces, a flock of birds crossing a wide pale sky, warm low sunlight.
No human figures. Wide, calm, spiritual mood with a large area of open sky in the upper third that text can sit over.`),
  },

  // §8.5
  paywall: {
    size: '1536x1024',
    prompt:
      build(`The same East Asian mountain landscape at dusk, quieter and more mysterious: drifting mist between the ridges, the far mountains dissolving into deep blue-grey, a single soft warm glow of lantern light low in the valley.
No human figures. Still watercolor and still airy — deeper in tone but never harsh, never black.`),
  },
};

// ── chạy ───────────────────────────────────────────────────────────────────
const only = flag('--only', '');
const pick = only ? only.split(',').map((s) => s.trim()) : Object.keys(SAMPLES);

const unknown = pick.filter((k) => !SAMPLES[k]);
if (unknown.length) {
  console.error(`Không có mẫu tên: ${unknown.join(', ')}. Có: ${Object.keys(SAMPLES).join(', ')}`);
  process.exit(1);
}

if (!DRY && !KEY) {
  console.error('Thiếu OPENAI_API_KEY.');
  process.exit(1);
}
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

let made = 0;
for (const name of pick) {
  const { size, prompt } = SAMPLES[name];
  const dest = join(OUT, `${name}.png`);

  if (DRY) {
    console.log(`\n${'═'.repeat(70)}\n${name}  (${size})\n${'═'.repeat(70)}\n${prompt}`);
    continue;
  }
  if (existsSync(dest) && !FORCE) {
    console.log(`⏭  ${name} — đã có, bỏ qua (dùng --force để vẽ đè)`);
    continue;
  }

  process.stdout.write(`🎨 ${name} (${size}, ${QUALITY})… `);
  const t0 = Date.now();
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size,
      quality: QUALITY,
      output_format: 'png',
      n: 1,
    }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    console.log('✗');
    // Lỗi CHẶN (quota/auth/rate) thì dừng CẢ LƯỢT — thử tiếp chỉ đốt thêm thời
    // gian cho cùng một lỗi. Cùng cách gen-illus.mjs đã làm.
    console.error(`\n❌ ${r.status}: ${body.slice(0, 400)}`);
    process.exit(1);
  }

  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!b64) {
    console.log('✗');
    console.error('API không trả ảnh.');
    process.exit(1);
  }
  writeFileSync(dest, Buffer.from(b64, 'base64'));
  made++;
  console.log(`✓ ${((Date.now() - t0) / 1000).toFixed(1)}s → ${dest}`);
}

if (!DRY) console.log(`\nXong ${made} bức trong ${OUT}`);
