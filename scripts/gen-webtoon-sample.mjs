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
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
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

// ════════════════════════════════════════════════════════════════════════
// STYLE LOCK V2 — Henry gửi guideline THỨ HAI (2026-09-16, cũng do ChatGPT
// soạn — "MINH BẢO IMAGE ENGINE"), chê bộ ảnh V1 chưa đủ cute/Ghibli. Chép
// NGUYÊN VĂN "STYLE" + "CHARACTER" của guideline này, KHÔNG trộn với
// STYLE_LOCK ở trên — để so sánh cạnh nhau, không ai đè ai cho tới khi
// Henry chốt bản nào. `build2()` dùng riêng cho các mẫu `*V2`.
// ════════════════════════════════════════════════════════════════════════
const STYLE_LOCK_V2 = `minimalist Vietnamese webtoon illustration, soft warm color palette (beige, brown, muted green), clean thin line art, soft shading, no harsh contrast, cute chibi proportion (big head ~60%, small body), peaceful countryside atmosphere, slightly nostalgic, gentle lighting, flat + light gradient shading, highly consistent character design, no hyper realism, no anime glossy rendering`;

const CHARACTER_DNA_V2 = `Minh Bảo, Vietnamese boy, 7 years old, chibi style, round face, soft cheeks, small nose, big brown eyes, messy short dark hair, innocent and calm expression.
Outfit (default): brown rural shirt, dark rolled pants, barefoot OR simple sandals, straw hat (nón lá) optional, small woven bag.
Signature: often holding stick / book / grass / brush, relaxed posture, peaceful vibe.`;

const NEGATIVE_V2 = `realistic face, 3D render, western style, anime glossy, over-detailed, messy background, text artifacts, extra fingers, Chinese characters, captions, letters`;

/**
 * `mood`/`action`/`scene`/`env`/`light` ghép đúng khung "PROMPT ENGINE
 * TEMPLATE" của guideline — KHÔNG viết lại prompt tự do mỗi lần (đúng mục
 * 6 "không rewrite prompt mỗi lần").
 */
const build2 = ({
  mood,
  action,
  scene,
  env,
  light,
}) => `A ${mood} minimalist Vietnamese webtoon illustration.

Character:
${CHARACTER_DNA_V2}
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
${STYLE_LOCK_V2}

Negative:
${NEGATIVE_V2}`;

/**
 * Cho `images/edits` (có `from`, đã có ẢNH neo mang sẵn hình hài) — chỉ cần
 * tả THAY ĐỔI (tư thế/cảnh mới), không lặp lại CHARACTER_DNA_V2 bằng chữ:
 * ảnh neo đã LÀ hình hài đó, tả lại bằng chữ là thừa và có khi kéo ngược
 * tỉ lệ về ít chibi hơn (chữ "7 years old boy" một mình không ép được tỉ lệ
 * đầu 60% bằng một tấm ảnh tham chiếu thật).
 */
const edit2 = (body) => `${body}

STYLE:
${STYLE_LOCK_V2}

Negative:
${NEGATIVE_V2}
No text, letters, Chinese characters or captions anywhere in the image.`;

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

  // Bảng biểu cảm §3.4.
  //
  // 🪤 Vòng 1 vẽ text-to-image thuần → TRÔI NHÂN VẬT: áo đổi từ chàm sang nâu,
  // mặt già hơn bức `mascot`, và hai ô cuối gần như trùng nhau. Chữa bằng cách
  // đưa CHÍNH bức đã duyệt vào `images/edits` làm neo nhận diện (`from`), thay
  // vì tả lại nhân vật bằng chữ và hy vọng model dựng đúng. Tả bằng chữ không
  // neo được khuôn mặt — đây là cùng bệnh bộ tool-avatar đã cắn.
  //
  // Bốn trạng thái bám bảng §3.4: Hero=vui nhẹ · Form=tập trung ·
  // Analysis=suy tư · Paywall=nghiêm túc. Vòng 1 ra ô 3 và 4 trùng nhau nên
  // lần này tả TÁCH BẠCH bằng dấu hiệu nhìn thấy được, không bằng tính từ.
  expressions: {
    size: '1536x1024',
    from: 'mascot.png',
    prompt:
      build(`Draw a character expression sheet using the boy in the provided image. Keep his face, hair, conical hat, indigo tunic and proportions EXACTLY as they are — same character, no redesign, no aging.
Remove the buffalo and the landscape. Place four bust-up portraits of him in a single horizontal row, evenly spaced, on a plain flat cream background.
Left to right:
1. cheerful greeting — eyes wide and bright, open smile, one hand raised in a small wave
2. focused — leaning slightly forward, eyebrows drawn in, both hands resting on an unseen table, mouth a small straight line
3. pondering — head tilted up and away, eyes looking off to the upper left, one finger tapping his cheek, mouth slightly pursed
4. solemn — squared shoulders, chin level, steady direct gaze at the viewer, lips closed and flat, no smile at all
The four must differ clearly at a glance. No frames, no borders, no dividing lines, no shadows between them.`),
  },

  // §8.4
  hero: {
    size: '1536x1024',
    prompt:
      build(`A peaceful East Asian landscape: layered ink-wash mountains fading into soft haze, a small Vietnamese village of tiled roofs nestled at their foot, rice terraces, a flock of birds crossing a wide pale sky, warm low sunlight.
No human figures. Wide, calm, spiritual mood with a large area of open sky in the upper third that text can sit over.`),
  },

  // Sprint 1 — corner-Bảo: bản nhỏ, NỀN TRONG SUỐT, neo góc rail/sidebar.
  // Bắt buộc phải có: cột `.ws` desktop chỉ còn ~360px sau khi trừ sidebar
  // 246 + rail 336 (shell.css) — nhét bức mascot lớn (có trâu, có cảnh) vào
  // đó là ăn hết chỗ nội dung. Cần bản bán thân, không cảnh, không trâu.
  corner: {
    size: '1024x1024',
    from: 'mascot.png',
    transparent: true,
    prompt:
      build(`Redraw ONLY the boy from the provided image as a half-body (waist-up) portrait, facing slightly to the side as if listening attentively, one hand raised near his chin in a thinking gesture.
Keep his face, hair, conical hat and indigo tunic EXACTLY as shown — same character.
Remove the buffalo and the entire landscape completely. The background must be fully transparent — no cream color, no ground, no sky, nothing behind him at all.
Leave soft empty margin on all sides so the figure can be placed in a small corner of a page.`),
  },

  // Sprint 1 — bảng 4 dáng cho khung minh hoạ (guideline: chỉ tay, cầm thẻ
  // tre, chống cằm, vẫy tay). Cùng kỹ thuật neo như expressions.
  poses: {
    size: '1536x1024',
    from: 'mascot.png',
    prompt:
      build(`Draw a character pose sheet using the boy in the provided image. Keep his face, hair, conical hat, indigo tunic and proportions EXACTLY as they are — same character, no redesign.
Remove the buffalo. Place four full-body poses of him in a single horizontal row, evenly spaced, standing on a plain flat cream background with only a hint of ground shadow beneath his feet.
Left to right:
1. pointing forward with one hand, as if showing the way, body turned slightly toward the viewer
2. holding up a small bamboo slip (thẻ tre) with both hands, looking down at it as if reading
3. sitting cross-legged, one elbow resting on his knee, chin resting on his hand, thoughtful
4. waving with one raised hand, cheerful, mid-step as if walking toward the viewer
No frames, no borders, no dividing lines between them.`),
  },

  // Homepage v3 — Henry gửi mockup tay (hero cưỡi trâu giữa cảnh núi+nắng+
  // chim, không sidebar/rail). Hai bức composite NHÂN VẬT + CẢNH, khác
  // `mascot` (cảnh tre gần, không có núi/nắng) và khác `hero` (cảnh không
  // người). Neo vào mascot.png để giữ đúng khuôn mặt/áo/trâu đã duyệt.
  heroScene: {
    size: '1536x1024',
    from: 'mascot.png',
    prompt:
      build(`Take the boy riding the water buffalo from the provided image and repaint him into a wider, more open landscape. Keep him, his conical hat, indigo tunic, the bamboo stick and the buffalo EXACTLY as shown — same character, same pose, no redesign.
Replace the close-up bamboo grove background with: soft layered ink-wash mountains far in the background on the left, a warm golden sun with a small flock of birds flying in a diagonal formation in the open sky on the right, and a tiny cluster of tiled-roof village houses nestled in the mid-ground.
Leave a large area of open pale sky in the upper-right third of the image with nothing in it — no birds, no mountains, no houses there — so text and a speech bubble can be placed over it later.
Wide horizontal composition, the buffalo walking gently toward the right side of the frame.`),
  },
  dailyScene: {
    size: '1536x1024',
    from: 'mascot.png',
    prompt:
      build(`Redraw ONLY the boy from the provided image standing on the ground next to the buffalo, in a cheerful mid-step walking pose, holding a small blank rolled bamboo scroll in both hands in front of his chest as if about to show it. Keep his face, hair, conical hat and indigo tunic EXACTLY as shown — same character.
The scroll must be completely BLANK — no text, no writing, no symbols on it.
Background: a few small tiled-roof village houses and soft rolling hills, gentle daylight, calm mood.
Leave open empty space above and to one side of him so a speech bubble and a small card can be placed there later.`),
  },

  // Test STYLE_LOCK_V2 — đúng ví dụ "Chăn trâu" trong guideline thứ hai,
  // KHÔNG neo `from` (thử xem chữ mô tả CHARACTER_DNA_V2 một mình có đủ
  // sức vẽ ra một Minh Bảo nhất quán hay không, trước khi quyết có đổi
  // ảnh neo mascot.png hiện tại sang bản chibi đầu-to hơn không).
  chanTrauV2: {
    size: '1536x1024',
    prompt: build2({
      mood: 'joyful',
      action: 'Minh Bảo sitting on a water buffalo, smiling, holding a small stick.',
      scene: 'rice field countryside, wide open paddies',
      env: 'a few birds in the sky, small tiled-roof houses in the distance, a narrow river',
      light: 'golden hour, warm low sunlight',
    }),
  },

  // Henry chốt STYLE_LOCK_V2 (2026-09-16), xin thêm 1 bức test cảnh KHÁC hẳn
  // chanTrauV2 (nhiều người, kiến trúc, ngồi trong nhà) trước khi regen cả
  // bộ nhân vật gốc — kiểm xem style có đứng vững khi cảnh phức tạp hơn.
  dinhLangV2: {
    size: '1536x1024',
    prompt: build2({
      mood: 'warm, respectful',
      action:
        'Minh Bảo sitting cross-legged on a wooden floor, hands resting on his knees, talking cheerfully and listening attentively to a small group of three elderly village men (village elders) sitting around him in a loose circle.',
      scene:
        'inside an open-sided đình làng (traditional Vietnamese communal house) — wooden pillars, a tiled roof, low wooden platform floor',
      env: 'a low wooden tea table with a few small teacups between them, the elders wearing simple long tunics in muted colors with white or grey hair and beards, a big old banyan tree visible through the open side of the building',
      light: 'soft midday light filtering through the open sides, gentle and calm',
    }),
  },

  // ══════════════════════════════════════════════════════════════════════
  // BỘ V2 THẬT — Henry đã chốt STYLE_LOCK_V2 làm style CHUNG của cả site
  // (2026-09-16: "style ghibli này cũng là style của website luôn nhé").
  // `chanTrauV2` (đã duyệt) trở thành ẢNH NEO nhận diện MỚI, thay mascot.png
  // cũ — copy sang mascotV2.png trước khi chạy (script tự kiểm tồn tại).
  // Các bức dưới đây đều `from: 'mascotV2.png'`, dùng `edit2()` (giữ đúng
  // STYLE_LOCK_V2 + Negative, không lặp lại toàn bộ CHARACTER_DNA_V2 vì ảnh
  // neo đã MANG sẵn hình hài đó — lặp lại bằng chữ là thừa, đôi khi còn kéo
  // ngược về tỉ lệ ít chibi hơn).
  // ══════════════════════════════════════════════════════════════════════
  cornerV2: {
    size: '1024x1024',
    from: 'mascotV2.png',
    transparent: true,
    prompt:
      edit2(`Redraw ONLY the boy from the provided image as a half-body (waist-up) portrait, facing slightly to the side as if listening attentively, one hand raised near his chin in a thinking gesture.
Keep his exact face, hair, conical hat and outfit as shown — same character, same big-head chibi proportion.
Remove the buffalo and the entire background completely. The background must be fully transparent — no color, no ground, no sky, nothing behind him.
Leave soft empty margin on all sides so the figure can be placed in a small corner of a page.`),
  },
  heroSceneV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Take the boy riding the water buffalo from the provided image and repaint the background into a wider, more open landscape. Keep him, his hat, outfit, the stick and the buffalo EXACTLY as shown — same character, same pose, same big-head chibi proportion, no redesign.
Background: soft layered hills far away on the left, a warm golden sun with a small flock of birds flying in a diagonal formation in the open sky on the right, a tiny cluster of tiled-roof village houses nestled in the mid-ground.
Leave a large area of open pale sky in the upper-right third of the image with nothing in it — no birds, no hills, no houses there — so text and a speech bubble can be placed over it later.
Wide horizontal composition, the buffalo walking gently toward the right side of the frame.`),
  },
  dailySceneV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Redraw ONLY the boy from the provided image standing on the ground next to the buffalo, in a cheerful mid-step walking pose, holding a small blank rolled scroll in both hands in front of his chest as if about to show it. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion.
The scroll must be completely BLANK — no text, no writing, no symbols on it.
Background: a few small tiled-roof village houses and soft rolling hills, gentle daylight, calm mood.
Leave open empty space above and to one side of him so a speech bubble and a small card can be placed there later.`),
  },
  libraryV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Redraw ONLY the boy from the provided image sitting cross-legged on a wooden floor, surrounded by tall stacks of old bound books and rolled scrolls on simple wooden shelves behind him. He holds one open book on his lap, looking down at it with quiet curiosity. Keep his exact face, hair and outfit — same character, same big-head chibi proportion (he may set the hat beside him since he is sitting indoors, but keep the same hair and face).
The books and scrolls must be completely BLANK on their spines and pages — no text, no writing, no symbols anywhere.
Background: a small quiet study nook with warm wooden tones, soft light from one side. No buffalo, no outdoor landscape.`),
  },
  articlesV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Redraw ONLY the boy from the provided image sitting under a large shady tree, leaning against the trunk, writing on a small wooden tablet resting on his knees with a brush. Keep his exact face, hair and outfit — same character, same big-head chibi proportion.
The tablet must be completely BLANK — no text, no writing, no symbols on it.
Background: a peaceful garden corner with a few soft green plants and a low stone, gentle daylight. No buffalo, no wide landscape, no village.`),
  },
  communityV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Redraw ONLY the boy from the provided image sitting together with two or three other village children around a small warm lantern on the ground at night, all smiling and chatting. Keep his exact face, hair and outfit — same character, same big-head chibi proportion; the other children should look distinct from him (different hair, different simple outfit colors) but drawn in the exact same style.
Background: a calm night sky with a soft moon and a few stars, silhouettes of bamboo far behind. The lantern glow is the brightest point in the frame. No text, no signs, no banners anywhere.`),
  },

  // Bảng biểu cảm — regen theo STYLE_LOCK_V2, neo mascotV2.png (thay bản
  // `expressions` cũ neo mascot.png). Cùng 4 trạng thái §3.4, giữ nguyên nội
  // dung mô tả (đã kiểm không trôi nhân vật ở bản V1) — chỉ đổi ẢNH NEO.
  expressionsV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Draw a character expression sheet using the boy in the provided image. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign, no aging.
Remove the buffalo and the landscape. Place four bust-up portraits of him in a single horizontal row, evenly spaced, on a plain flat cream background.
Left to right:
1. cheerful greeting — eyes wide and bright, open smile, one hand raised in a small wave
2. focused — leaning slightly forward, eyebrows drawn in, both hands resting on an unseen table, mouth a small straight line
3. pondering — head tilted up and away, eyes looking off to the upper left, one finger tapping his cheek, mouth slightly pursed
4. solemn — squared shoulders, chin level, steady direct gaze at the viewer, lips closed and flat, no smile at all
The four must differ clearly at a glance. No frames, no borders, no dividing lines, no shadows between them.`),
  },

  // Bảng 4 dáng — regen theo STYLE_LOCK_V2, neo mascotV2.png (thay bản
  // `poses` cũ). Cùng 4 dáng đã duyệt ở bản V1.
  posesV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Draw a character pose sheet using the boy in the provided image. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.
Remove the buffalo. Place four full-body poses of him in a single horizontal row, evenly spaced, standing on a plain flat cream background with only a hint of ground shadow beneath his feet.
Left to right:
1. pointing forward with one hand, as if showing the way, body turned slightly toward the viewer
2. holding up a small bamboo slip (thẻ tre) with both hands, looking down at it as if reading
3. sitting cross-legged, one elbow resting on his knee, chin resting on his hand, thoughtful
4. waving with one raised hand, cheerful, mid-step as if walking toward the viewer
No frames, no borders, no dividing lines between them.`),
  },

  // §8.5 — "a darker version of the SAME style".
  //
  // 🪤 Vòng 1 vẽ rời → ra tranh thuỷ mặc Tàu cổ điển, KHÁC hẳn bức `hero`, và
  // tông lại SÁNG hơn hero chứ không tối hơn. "Cùng một cảnh, khác giờ trong
  // ngày" là quan hệ giữa HAI bức, mà text-to-image không thấy bức kia.
  // ⇒ neo bằng `from: hero.png` rồi chỉ yêu cầu ĐỔI ÁNH SÁNG.
  paywall: {
    size: '1536x1024',
    from: 'hero.png',
    prompt:
      build(`Take the provided landscape and repaint it at dusk. Keep the SAME composition, the same mountain silhouettes, the same village and rice terraces in the same positions — only the light changes.
Lower the overall value so it reads clearly darker than the original: mist gathering between the ridges, far mountains dissolving into deep blue-grey, the sky drained to a dim warm grey, the village rooftops in shadow.
Add one small warm lantern glow in the village, the single brightest point in the frame.
No human figures. Still soft watercolor, still airy — deeper and quieter, but never harsh and never pure black.`),
  },

  // Bản V2 của `paywall` — VÒNG 2 (Henry, sau khi xem bản "trâu một mình lúc
  // hoàng hôn"): đổi HẲN không khí — "phải vui tươi, nắng sớm bình minh, cả
  // làng vui vẻ, giữ lại Minh Bảo, không khí vui như Tết". Ngược hẳn ý ban
  // đầu V1 (hoàng hôn, không nhân vật, tĩnh lặng) — không còn là "cùng cảnh
  // hero đổi giờ" nữa mà là một CẢNH MỚI hẳn, chỉ giữ đúng nhân vật Minh Bảo
  // + tông màu chung của bộ. Neo `heroSceneV2.png` để GIỮ ĐÚNG mặt/tóc/áo
  // Minh Bảo (đang cưỡi trâu) — không neo để giữ bố cục cảnh nữa vì cảnh đổi
  // hoàn toàn (bình minh + đông người, khác hẳn cánh đồng vắng của hero gốc).
  paywallV2: {
    size: '1536x1024',
    from: 'heroSceneV2.png',
    prompt:
      edit2(`Use the boy riding the water buffalo from the provided image, keeping his exact face, hair, hat, outfit and pose — same character, same big-head chibi proportion, no redesign. Move him into a brand new, much livelier scene:
Early sunrise over the village — a warm golden sun just rising over the hills, soft pastel pink-and-gold sky, gentle morning mist low over the rice fields catching the light.
The whole village is awake and cheerful: several villagers visible in the mid-ground going about a joyful morning — a couple of kids playing, someone sweeping their front yard, someone carrying a basket, a few chickens — all small and simple in the chibi style, not the main focus, just filling the scene with life.
Give the scene a festive, Tết (Lunar New Year)-like mood: a few branches of blooming yellow hoa mai (apricot blossom) near the houses, a red paper lantern or two hanging by a doorway, colorful little flags strung between two houses — cheerful and warm, not literal fireworks or crowds, just a joyful festive village morning.
Keep the same flat cel-shaded webtoon rendering style as the reference — flat color fields, thin clean outlines, simple soft gradient shading, no photorealistic lighting, no painterly brushwork.
Leave a large open area of plain warm sky in the upper-right third of the frame with nothing in it — so text can be placed over it later.`),
  },

  // ── Banner trang tool (`.intro-card`/`.intro-photo`) — Henry 2026-09-16:
  // "gen lại hết cho phù hợp style ghibli", bức thử đầu tiên cho nhóm `laso`
  // (Tử Vi Đẩu Số). Thay hẳn nhân vật "đạo sĩ già" cũ (hero-banner-prompt.ts,
  // tranh thuỷ mặc) bằng Minh Bảo, đúng luật đã chốt ở PLAN.md §1.3 ("Tool
  // cảm xúc → Minh Bảo dẫn dắt, tương tác với khách"). Giữ khổ 1536×1024 —
  // ĐÚNG khổ mọi cảnh V2 khác đã dùng (hero/daily/library/...) và khớp sẵn
  // `.intro-card .intro-photo{aspect-ratio:1536/1024}` trong shell.css, nên
  // không cần sửa CSS. Giữ bố cục gốc: nhân vật lệch phải, khoảng trống
  // trên-trái để đè chữ hook — đúng vai trò banner cần.
  banerLasoV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Redraw ONLY the boy from the provided image seated cross-legged at a low wooden table on the right side of the frame, in the middle of reading a fortune. A long scroll lies open flat on the table in front of him, showing a faint circular chart divided into twelve sections with a few soft glowing dots scattered across it — no readable text, letters or symbols on it. One of his hands hovers just above the chart, pointing gently at one section; he looks up and to his left with a warm, knowing little smile, as if mid-explanation to someone listening. Keep his exact face, hair, hat and outfit — same character, same big-head chibi proportion, no redesign.
Add a second, secondary figure seated across the table facing him: a village woman seen mostly from behind/the side, simple rural clothing, her face turned away or softly shadowed so no distinct facial detail is needed — she is clearly listening, not the focus of the image.
Background: warm late-afternoon village scene behind them — soft rolling hills, two or three small tiled-roof houses, gentle golden light.
Leave a large open area of plain warm sky in the upper-left third of the frame — no hills, houses or clutter there — so hook text can be placed over it later.`),
  },

  // Henry (ảnh tham khảo, 2026-09-16): thích BỐI CẢNH thư phòng ấm cúng hơn
  // cảnh làng ngoài trời — bàn gỗ, sách chất đống, biểu đồ treo tường, mèo
  // ngủ, đèn dầu. GIỮ nguyên thiết kế nhân vật đã chốt (CHARACTER_DNA_V2/
  // STYLE_LOCK_V2), chỉ đổi BỐI CẢNH sang trong nhà — không chép phong cách
  // vẽ chi tiết/tỉ lệ đầu nhỏ hơn của ảnh tham khảo đó (khác hẳn chibi đã
  // duyệt). Gáy sách/biểu đồ tường CỐ Ý không có chữ đọc được — GUARDS đã
  // cắn việc gpt-image bịa chữ Hán vô nghĩa (xem đầu file).
  banerLasoIndoorV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Redraw ONLY the boy from the provided image seated at a low wooden desk inside a cozy traditional study room, on the right side of the frame, in the middle of reading a fortune. Remove the hat for this indoor scene (hang it on a peg nearby if natural). A long scroll lies open flat on the desk in front of him, showing a faint circular chart divided into twelve sections with a few soft glowing dots — no readable text, letters or symbols on it. One hand rests on the scroll, the other holds a small writing brush; he looks down at the chart with a warm, focused little smile.
Behind him on the wall, a large hanging scroll displays a soft circular astrological diagram with faint dot-and-line patterns — no readable text or symbols.
To one side, a short stack of old bound books sits on the desk or a low shelf, their spines and covers completely blank — no text, letters or symbols anywhere on them.
A small cream-and-orange cat is curled up asleep near the books. A small warm oil lamp glows on the desk, its light the brightest point in the frame. Optionally one small potted plant in a corner.
Warm wooden tones throughout, soft lamp light, cozy and quiet mood, evening atmosphere.
Leave a large open area of plain, softly lit wall or empty space in the upper-left third of the frame — no shelves, scrolls or clutter there — so hook text can be placed over it later.`),
  },

  // Henry 2026-09-16: thêm KHÁCH rõ mặt — "chị gái tầm 30 tuổi đang ngồi
  // nghe rất chăm chú" — khác bản làng (phụ nữ quay lưng, không rõ mặt) và
  // bản thư phòng gốc (không có khách). Giữ nguyên bối cảnh thư phòng vừa
  // duyệt, thêm khách ngồi ĐỐI DIỆN, rõ mặt, biểu cảm chăm chú — không phải
  // trang phục làng quê như Minh Bảo (khách là NGƯỜI HIỆN ĐẠI đến xem, đối
  // lập có chủ ý với không gian cổ của Minh Bảo).
  banerLasoIndoorGuestV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Redraw ONLY the boy from the provided image seated at a low wooden desk inside a cozy traditional study room, on the right side of the frame. Remove the hat for this indoor scene (hang it on a peg nearby if natural). A long scroll lies open flat on the desk between him and the guest, showing a faint circular chart divided into twelve sections with a few soft glowing dots — no readable text, letters or symbols on it. One of his hands points gently at a section of the chart; he looks up toward the guest with a warm, confident little smile, mid-explanation. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
Add a second figure seated across the low desk, facing him and the viewer at a three-quarter angle: a woman in her early thirties, gentle friendly face clearly visible, simple modern casual outfit (soft blouse or sweater, no traditional robe — she is a present-day visitor, a deliberate contrast to Minh Bảo's old-fashioned study), sitting attentively with a focused, listening expression, leaning slightly toward the scroll, hands resting together in her lap or near the desk.
Behind them on the wall, a large hanging scroll displays a soft circular astrological diagram with faint dot-and-line patterns — no readable text or symbols. A short stack of old bound books sits on a low shelf to one side, spines and covers completely blank — no text or symbols anywhere on them. A small cream-and-orange cat is curled up asleep nearby. A small warm oil lamp glows on the desk, its light the brightest point in the frame.
Warm wooden tones throughout, soft lamp light, cozy and quiet mood, evening atmosphere.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no shelves or clutter there — so hook text can be placed over it later.`),
  },

  // Henry 2026-09-16: đổi vai — "ông lão bạc phơ xem lá số cho chị gái chăm
  // chú nghe, còn Minh Bảo thì ngồi chơi với con mèo". Ông lão là nhân vật
  // MỚI, KHÔNG có ảnh neo (chưa từng vẽ) — tả bằng chữ, chấp nhận độ trôi
  // nhận diện cao hơn Minh Bảo (chỉ là bản thử, không phải nhân vật lặp lại
  // nhiều nơi như Minh Bảo nên chưa cần neo riêng). Minh Bảo lùi thành nhân
  // vật PHỤ — vẫn neo mascotV2.png để giữ đúng nhận diện.
  banerLasoOldManV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting on the floor near a sleeping-turned-awake cream-and-orange cat, gently playing with it (dangling a bit of string or scratching behind its ears), cheerful and relaxed, clearly enjoying himself and not part of the fortune-reading conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elderly VIETNAMESE man with a warm, kind, round "phúc hậu" face (gentle smiling eyes, soft rosy cheeks, benevolent expression), short neatly trimmed white beard and moustache (not a long dramatic wizard beard), white hair mostly covered by a simple dark khăn đóng (traditional Vietnamese turban-style headwrap), wearing a simple dark brown áo the (traditional Vietnamese long tunic) — a distinctly Vietnamese scholar look, not Chinese. He is seated cross-legged at a low wooden desk in the center-right of the frame. A long scroll lies open flat on the desk, showing a faint circular chart divided into twelve sections with a few soft glowing dots — no readable text, letters or symbols on it. He points gently at the chart with one hand, calm and warmly wise expression.
Facing him across the desk, a woman in her early thirties sits attentively, simple modern casual outfit (soft blouse or sweater), leaning in slightly, listening closely with a focused, engaged expression.
Setting: the same cozy traditional study room — a large hanging scroll on the wall behind the desk showing a faint circular astrological diagram (no readable text), a short stack of old bound books on a low shelf with completely blank spines, a small warm oil lamp glowing on the desk as the brightest point in the frame.
Minh Bảo and the cat form a small charming vignette off to the side, visually separate from the old man and the woman at the desk.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no shelves or clutter there — so hook text can be placed over it later.`),
  },

  // Henry 2026-09-16: hệ thống hoá — Minh Bảo CỐ ĐỊNH (đổi hoạt động phụ tuỳ
  // cảnh), còn THẦY/CÔ luận giải + khách + bối cảnh đổi theo NHÓM tool.
  // Ví dụ 1: tool 1 người (Tử Vi) → ông lão, 1 khách, phòng sách+thư pháp,
  // Minh Bảo chơi mèo (banerLasoOldManV2 ở trên). Ví dụ 2 (bức này): tool
  // 2 người (xem tuổi vợ chồng, nhóm sẽ map vào "laso" — `chan-dung-vo-chong`)
  // → CÔ khác (không phải ông lão), 2 khách (vợ chồng/người yêu), Minh Bảo
  // đổi hoạt động sang đọc sách.
  banerVoChongV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting cross-legged on the floor with an open picture book on his lap, quietly reading it with a calm, absorbed little smile, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a warm, kind-faced elderly VIETNAMESE woman in her sixties, full white hair neatly tied back, a gentle motherly "phúc hậu" expression, wearing a simple dark indigo traditional áo dài — old-fashioned in style, visually distinct from an old man (different gender, different room, different props). She sits at a low round wooden table, gently gesturing with one open hand toward a long scroll lying flat on the table, showing a faint circular chart divided into twelve sections with a few soft glowing dots — no readable text, letters or symbols on it.
Facing her across the table, a young couple sits close together, both attentive and listening closely: a woman in her late twenties in simple modern casual clothing, and a man of similar age beside her in simple modern casual clothing, their shoulders gently touching, both leaning in toward the scroll with warm, hopeful expressions.
Setting: a cozy traditional room, warmer and softer than a scholar's study — simple woven mats, a small vase of fresh flowers on the table, soft morning light through a paper window, a small warm lantern glowing nearby.
Minh Bảo and his book form a small charming vignette off to the side, visually separate from the woman and the couple at the table.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  // Ví dụ 3: nhóm "Thần Số Học" (than-so-hoc). Henry chốt LẠI (sau khi xem
  // bản "ông chú trẻ"): thầy/cô xem PHẢI già, tóc bạc, người Việt, phong
  // cách xưa — thống nhất ở CẢ 11 nhóm, không có nhân vật trẻ tuổi. Phân
  // biệt nhóm bằng GIỚI TÍNH/trang phục/đạo cụ/phòng, không bằng tuổi tác.
  banerThanSoHocV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting on a low stool, quietly stacking a few small smooth wooden number tiles into a little tower, focused and cheerful, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elderly Vietnamese man in his seventies, full white hair combed neatly back, a short trimmed white moustache, a warm attentive "phúc hậu" expression, wearing a simple dark grey traditional Vietnamese áo the — old-fashioned in style, not modern clothing. He sits at a low wooden desk, one hand resting on an abacus-like wooden counting frame with a few beads glowing faintly, the other pointing at a sheet of paper showing a few soft glowing numeral marks arranged in a simple grid — no readable digits or text.
Facing him across the desk, a woman in her early thirties sits attentively, simple modern casual outfit, leaning in slightly, listening closely with a focused, curious expression.
Setting: a tidy study corner — a small shelf with a few blank-covered notebooks stacked neatly, a potted plant, soft daytime light through a window.
Minh Bảo and his number tiles form a small charming vignette off to the side, visually separate from the old man and the woman at the desk.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no shelves or clutter there — so hook text can be placed over it later.`),
  },

  // ── 8 nhóm còn lại — cùng nguyên tắc: Minh Bảo cố định (đổi hoạt động
  // phụ), thầy/cô + khách + phòng đổi theo TỪNG NHÓM, phân biệt rõ tuổi/
  // giới/trang phục để 11 banner không lặp nhau. `menh-ly` (có tool
  // `tuong-hop` — xem hợp tuổi) dùng LẠI banerVoChongV2 đã duyệt (2 khách),
  // không vẽ thêm — đúng nhóm chứa tool 2 người.

  // Nhóm còn sót lại — Bát Tự/Tử Bình (tu-binh). Cùng "họ" với laso (tính
  // vận từ ngày sinh) nên phân biệt bằng ĐẠO CỤ (4 thẻ tre Tứ Trụ, không
  // phải cuộn lá số) + trang phục/tông màu, không cần đổi hẳn không khí.
  banerTuBinhV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, arranging four small smooth wooden blocks into his own little row, mimicking the old man's gesture, focused and pleased with himself, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elderly Vietnamese man in his seventies, full white hair and a short trimmed white beard, a warm dignified "phúc hậu" expression, wearing a simple dark forest-green traditional Vietnamese áo the — old-fashioned in style, visually distinct in color from other elderly men in the set. He sits at a low wooden table, carefully arranging four tall bamboo slips upright in a row side by side (representing the Four Pillars), one hand placing a small round yin-yang token beside them.
Facing him across the table, a woman in her early thirties sits attentively, simple modern casual outfit, watching the bamboo slips with a focused, curious expression.
Setting: a quiet study room — a small plain tapestry with a faint bagua (eight-trigram) circular pattern on the wall behind him (no readable text or symbols), a stack of blank-spined books on a low shelf, soft warm daylight through a window.
Minh Bảo and his wooden blocks form a small charming vignette off to the side, visually separate from the old man and his guest.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  banerKinhDichV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, lying on his stomach on the floor, chin in his hands, watching three fireflies glow softly in a small glass jar beside him, quietly delighted, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a calm, mysterious elderly Vietnamese woman in her sixties, full white hair loosely tied back in a low bun, a serene knowing expression, wearing a simple deep indigo-purple traditional áo dài — old-fashioned in style. She sits at a low table, in the middle of casting three small bronze coins onto its surface — one coin still spinning — while a faint hexagram of six soft glowing horizontal lines (broken and unbroken) hovers gently above the table, no readable text or symbols.
Facing her across the table, a woman in her early thirties sits attentively, simple modern casual outfit, watching the coins with a focused, curious expression.
Setting: a quiet dim room at night, a single small candle providing warm flickering light, faint incense smoke curling upward, a plain dark wall behind her.
Minh Bảo and the firefly jar form a small charming vignette off to the side, visually separate from the woman and her guest.
Leave a modest open area of plain, dim wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  banerPhongThuyV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, kneeling beside a small wooden toy house, carefully placing a tiny toy tree next to it with a proud little smile, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a confident, practical-looking elderly Vietnamese man in his sixties, full white hair combed neatly back, a warm reassuring smile, wearing a simple dark grey traditional Vietnamese áo the — old-fashioned in style, not modern clothing. He sits at a low table, holding a round wooden Luo Pan compass out before him with both hands, studying its dial closely. On the table beside him sits a small simple architectural model of a tiled-roof house, no readable text anywhere.
Facing him across the table, a woman in her early thirties sits attentively, simple modern casual outfit, leaning in to look at the compass with a focused, curious expression.
Setting: a bright, practical daytime room — a small potted bamboo in the corner, a rolled-up house blueprint leaning against the wall (blank, no readable lines or text), soft late-morning light through a window.
Minh Bảo and his toy house form a small charming vignette off to the side, visually separate from the man and his guest.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  banerXemTuongV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting cross-legged, holding up a small round hand-mirror, making a silly face at his own reflection and giggling, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a warm elderly Vietnamese woman ("bà") in her sixties, kind round "phúc hậu" face, silver hair neatly rolled into a small bun, wearing a simple soft brown áo bà ba. She sits close to her guest, gently holding the guest's open palm in both of her hands, studying its lines with a knowing, gentle smile.
The guest: a woman in her early thirties, simple modern casual outfit, sitting attentively, palm resting in the old woman's hands, watching her face with a curious, slightly nervous smile.
Setting: a small warm sitting room — an antique standing mirror in the corner reflecting soft light, a woven basket of dried herbs, a small tray with two teacups on the low table beside them, soft afternoon light.
Minh Bảo and his hand-mirror form a small charming vignette off to the side, visually separate from the old woman and her guest.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  banerChiemTinhTayV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, lying on his back on a soft rug, pointing up at a few small glow-in-the-dark star stickers on the ceiling, eyes wide with wonder, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: an elegant elderly Vietnamese woman in her sixties, full white hair swept back neatly, a calm dreamy expression, wearing a simple flowing dark teal traditional áo dài with subtle star-like embroidery — old-fashioned in style. She sits at a small round table, holding an antique brass astrolabe up toward a faint circular zodiac wheel of soft glowing stars hovering above the table — no readable text or symbols.
Facing her across the table, a woman in her late twenties sits attentively, simple modern casual outfit, gazing up at the glowing star wheel with a delighted, curious expression.
Setting: a cozy room at night, a large window behind them showing a deep blue night sky scattered with a few faint stars, a small brass telescope standing in the corner, soft warm lamp light mixing with cool moonlight.
Minh Bảo and his ceiling stars form a small charming vignette off to the side, visually separate from the woman and her guest.
Leave a modest open area of plain night-sky or wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  banerDatTenLichV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, kneeling at a tiny low stool, carefully dipping a small brush into a bowl of water and "painting" happily on a wet slate that leaves no lasting mark, tongue peeking out in concentration, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a plump, warm-faced Vietnamese grandmother in her sixties, silver hair in a simple bun, a cheerful "phúc hậu" smile, wearing a simple soft brown áo bà ba — visually distinct from the other older characters (rounder, softer, cheerier). She sits at a low desk, brush lifted just above an open scroll, about to write the very first stroke — the scroll paper is COMPLETELY BLANK, not one mark on it yet. A small calendar page with a few soft glowing dots rests nearby — no readable text or symbols anywhere on the desk.
Facing her across the desk, a woman in her late twenties sits attentively, simple modern casual outfit, watching the brush with a hopeful, curious expression, perhaps gently cradling a small wrapped gift (implying a baby-naming visit) in her lap.
Setting: a warm, tidy room — a small shelf of blank-spined books, a vase of fresh flowers, soft daytime light through a paper window.
Minh Bảo and his wet-slate painting form a small charming vignette off to the side, visually separate from the grandmother and her guest.
Leave a modest open area of plain, softly lit wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  banerPhongCachAiV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, standing on tiptoe, draping a colorful silk ribbon over his own shoulder like a little cape, admiring himself with a playful grin, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a warm elderly Vietnamese woman in her sixties, full white hair neatly rolled into a small bun, a friendly encouraging smile, wearing a simple soft brown áo dài — old-fashioned in style, with a keen eye for what suits people. She stands beside a tall standing mirror, gently holding up a few soft fabric swatches and ribbons of different warm colors next to her guest's reflection, comparing them thoughtfully.
The guest: a woman in her mid-twenties, simple modern casual outfit, standing in front of the mirror, looking at her own reflection with a hopeful, curious smile.
Setting: a bright, airy modern room — a small clothes rack with a few plain, unlabeled garments, a vase of fresh flowers, large soft daylight through a window.
Minh Bảo and his ribbon form a small charming vignette off to the side, visually separate from the stylist and her guest.
Leave a modest open area of plain, brightly lit wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
  },

  banerBoiBaiV2: {
    size: '1536x1024',
    from: 'mascotV2.png',
    prompt:
      edit2(`Use the boy from the provided image as Minh Bảo, but make him a SECONDARY figure this time — off to one side of the room, sitting cross-legged, carefully building a small house of playing cards, holding his breath in concentration, not part of the conversation nearby. Keep his exact face, hair and outfit — same character, same big-head chibi proportion, no redesign.
The MAIN FOCUS of the scene is a different character: a striking elderly Vietnamese woman in her sixties, full white hair partly wrapped in a dark patterned headscarf, warm mysterious eyes, wearing a flowing dark red and gold shawl over simple traditional clothing — a distinctive, old-fashioned fortune-teller look. She sits at a small round table, fanning out a small hand of ornate but blank-faced cards, one card just being drawn and turned face-up (its face a soft glowing abstract pattern, no readable symbols or text).
Facing her across the table, a woman in her late twenties sits attentively, simple modern casual outfit, watching the drawn card with a hopeful, slightly nervous smile.
Setting: a cozy dim room, a single candle burning on the table as the brightest point, a richly patterned but plain-colored cloth draped over the table, soft shadows.
Minh Bảo and his card house form a small charming vignette off to the side, visually separate from the woman and her guest.
Leave a modest open area of plain, dim wall in the upper portion of the frame — no clutter there — so hook text can be placed over it later.`),
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

  // `from` ⇒ đi đường images/EDITS (đưa bức đã duyệt vào làm neo nhận diện)
  // thay vì images/generations. Đây là cách DUY NHẤT giữ được cùng một khuôn
  // mặt / cùng một cảnh giữa các bức: tả bằng chữ thì model dựng lại từ đầu
  // mỗi lượt và trôi. Bức neo phải tồn tại — thiếu thì dừng, KHÔNG lặng lẽ lùi
  // về text-to-image (lùi lặng lẽ là ra bức trôi mà không ai biết vì sao).
  const from = SAMPLES[name].from;
  if (from && !existsSync(join(OUT, from))) {
    console.error(`❌ ${name} cần bức neo "${from}" trong ${OUT} — chạy nó trước.`);
    process.exit(1);
  }

  process.stdout.write(`🎨 ${name} (${size}, ${QUALITY}${from ? `, neo: ${from}` : ''})… `);
  const t0 = Date.now();

  const transparent = !!SAMPLES[name].transparent;

  let r;
  if (from) {
    const fd = new FormData();
    fd.append('model', MODEL);
    fd.append('prompt', prompt);
    fd.append('size', size);
    fd.append('quality', QUALITY);
    fd.append('n', '1');
    // background:transparent CHỈ có tác dụng khi output PNG (mặc định của
    // images/edits đã là png, không có output_format riêng để khai như
    // generations) — bỏ qua với ảnh có cảnh phía sau (mascot/hero/paywall).
    if (transparent) fd.append('background', 'transparent');
    fd.append('image', new Blob([readFileSync(join(OUT, from))], { type: 'image/png' }), from);
    r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      // KHÔNG tự đặt Content-Type: boundary do FormData sinh, gõ tay là hỏng.
      headers: { Authorization: `Bearer ${KEY}` },
      body: fd,
    });
  } else {
    r = await fetch('https://api.openai.com/v1/images/generations', {
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
  }

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
